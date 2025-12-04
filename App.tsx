
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, GenerateContentResponse } from "@google/genai";
import { Language, CallStatus, BotStatus, Message, SensitivityLevel } from './types';
import { LANGUAGES, UI_TEXT, SYSTEM_PROMPTS, VOICE_PREVIEW_SAMPLES, SENSITIVITY_GAIN_LEVELS, EXAMPLE_PROMPTS, SCRIPT_GENERATOR_PROMPT, SUMMARY_PROMPT, TRANSCRIPTION_SYSTEM_PROMPT } from './constants';
import { PhoneIcon, EndCallIcon, MicIcon, SpinnerIcon, VolumeUpIcon, MicOffIcon, MenuIcon, RecordIcon, RefreshIcon } from './components/icons';
import MessageBubble from './components/MessageBubble';
import SideMenu from './components/SideMenu';
import ScriptGeneratorModal from './components/ScriptGeneratorModal';
import TranscriptionModal from './components/TranscriptionModal';
import CallSummary from './components/CallSummary';

// --- Audio Utility Functions ---

// Decode base64 string to Uint8Array
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Encode Uint8Array to base64 string
function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Decode raw PCM audio data into an AudioBuffer
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Create a Blob object for the Live API from Float32Array microphone data
function createBlob(data: Float32Array): GenaiBlob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

// Downsample an audio buffer from one sample rate to another
function downsampleBuffer(buffer: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return buffer;
    const sampleRateRatio = fromRate / toRate;
    const newLength = Math.round(buffer.length / sampleRateRatio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
        let accum = 0;
        let count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = count > 0 ? accum / count : 0;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

// Define interfaces locally to ensure type safety
interface GenaiBlob {
  data: string; // base64 encoded string
  mimeType: string;
}
interface LiveSession {
  close(): void;
  sendRealtimeInput(input: { media: GenaiBlob }): void;
}


const App: React.FC = () => {
    // App State
    const [language, setLanguage] = useState<Language>(() => localStorage.getItem('appLanguage') as Language || Language.EN);
    const [selectedVoice, setSelectedVoice] = useState<string>(() => localStorage.getItem('appVoice') || 'Zephyr');
    const [sensitivity, setSensitivity] = useState<SensitivityLevel>(() => localStorage.getItem('appSensitivity') as SensitivityLevel || SensitivityLevel.MEDIUM);
    const [outputVolume, setOutputVolume] = useState<number>(() => parseFloat(localStorage.getItem('appOutputVolume') || '1'));
    const [autoStartCall, setAutoStartCall] = useState<boolean>(() => localStorage.getItem('appAutoStartCall') === 'true');
    const [isRecordingEnabled, setIsRecordingEnabled] = useState<boolean>(() => localStorage.getItem('appIsRecordingEnabled') === 'true');
    const [participants, setParticipants] = useState<string[]>(() => JSON.parse(localStorage.getItem('appParticipants') || '["User"]'));
    const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.IDLE);
    const [botStatus, setBotStatus] = useState<BotStatus>(BotStatus.IDLE);
    const [messages, setMessages] = useState<Message[]>(() => JSON.parse(localStorage.getItem('conversationHistory') || '[]'));
    const [error, setError] = useState<string | null>(null);
    const [isMicOn, setIsMicOn] = useState(true);
    const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
    const [callSummary, setCallSummary] = useState<string | null>(null);
    const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
    const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
    
    // UI State
    const [isSideMenuOpen, setSideMenuOpen] = useState(false);
    const [isScriptGeneratorOpen, setScriptGeneratorOpen] = useState(false);
    const [isTranscriptionModalOpen, setTranscriptionModalOpen] = useState(false);

    // Transcription State
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [transcriptionText, setTranscriptionText] = useState('');

    // Refs
    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const callStartIndexRef = useRef<number>(0);
    const inputStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const outputGainNodeRef = useRef<GainNode | null>(null);
    const nextAudioStartTimeRef = useRef<number>(0);
    const audioPlaybackSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const errorClearTimer = useRef<number | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const mixedStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    
    // Tracking refs for callbacks to avoid stale closures
    const isMicOnRef = useRef(isMicOn);
    const callStatusRef = useRef(callStatus);

    const uiText = UI_TEXT[language];

    const getAiClient = useCallback(() => {
        if (!process.env.API_KEY) {
            setError(uiText.errors.apiKeyNotConfigured || "API key is not configured.");
            return null;
        }
        try {
            return new GoogleGenAI({ apiKey: process.env.API_KEY });
        } catch (e) {
            console.error("Failed to initialize AI client:", e);
            setError(uiText.errors.aiInitializationFailed || "Failed to initialize AI. Check API Key and network.");
            return null;
        }
    }, [uiText]);
    
    // --- Effects for Local Storage Persistence ---
    useEffect(() => { localStorage.setItem('conversationHistory', JSON.stringify(messages)); }, [messages]);
    useEffect(() => { localStorage.setItem('appLanguage', language); }, [language]);
    useEffect(() => { localStorage.setItem('appVoice', selectedVoice); }, [selectedVoice]);
    useEffect(() => { localStorage.setItem('appSensitivity', sensitivity); }, [sensitivity]);
    useEffect(() => { localStorage.setItem('appOutputVolume', String(outputVolume)); }, [outputVolume]);
    useEffect(() => { localStorage.setItem('appAutoStartCall', String(autoStartCall)); }, [autoStartCall]);
    useEffect(() => { localStorage.setItem('appIsRecordingEnabled', String(isRecordingEnabled)); }, [isRecordingEnabled]);
    useEffect(() => { localStorage.setItem('appParticipants', JSON.stringify(participants)); }, [participants]);
    
    // Sync refs
    useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);
    useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
    
    // --- UI Effects ---
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Lifecycle and Auto-Start Effects ---
    useEffect(() => {
      if (autoStartCall && localStorage.getItem('hasCalledBefore') === 'true' && callStatus === CallStatus.IDLE) {
        handleStartCall();
      }
    }, [autoStartCall]);

    useEffect(() => {
      return () => {
        if (errorClearTimer.current) clearTimeout(errorClearTimer.current);
        if (callStatus === CallStatus.ACTIVE || callStatus === CallStatus.CONNECTION_LOST) handleEndCall();
        if (isTranscribing) handleStopTranscription();
      }
    }, []);


    // --- Core Audio and Call Logic ---
    const cleanupAudio = useCallback((isTranscription = false) => {
        if (!isTranscription) {
            audioPlaybackSourcesRef.current.forEach(source => source.stop());
            audioPlaybackSourcesRef.current.clear();
            nextAudioStartTimeRef.current = 0;
            outputGainNodeRef.current?.disconnect();
            outputGainNodeRef.current = null;
        }
        
        inputStreamRef.current?.getTracks().forEach(track => track.stop());
        inputStreamRef.current = null;
        
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;
        gainNodeRef.current?.disconnect();
        gainNodeRef.current = null;
        mediaStreamSourceRef.current?.disconnect();
        mediaStreamSourceRef.current = null;
        mixedStreamDestinationRef.current?.disconnect();
        mixedStreamDestinationRef.current = null;

        if (audioContextRef.current?.state !== 'closed') {
          audioContextRef.current?.close().catch(console.error);
        }
        audioContextRef.current = null;
    }, []);
    
    const handleGenerateSummary = useCallback(async () => {
        const ai = getAiClient();
        const currentCallMessages = messages.slice(callStartIndexRef.current);
        if (!ai || currentCallMessages.length === 0) return;

        setIsSummarizing(true);
        setCallSummary(null);

        try {
            const transcript = currentCallMessages
                .filter(m => !m.isError)
                .map(m => `${m.sender === 'user' ? 'User' : 'Gemini'}: ${m.text}`)
                .join('\n');
            
            if (!transcript.trim()) {
                setIsSummarizing(false);
                return;
            }

            const prompt = SUMMARY_PROMPT[language](transcript);

            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });

            setCallSummary(response.text);

        } catch (err) {
            console.error("Summary generation failed:", err);
            setCallSummary(uiText.errors.summaryError);
        } finally {
            setIsSummarizing(false);
        }
    }, [getAiClient, messages, language, uiText.errors.summaryError]);
    
    const handleConnectionLost = useCallback((error: any) => {
        console.error("Live session connection lost:", error);
        
        // Prevent duplicate handling if already ended
        if (callStatusRef.current === CallStatus.ENDED) return;

        setCallStatus(CallStatus.CONNECTION_LOST);
        setError(uiText.errors.connectionLost);
        
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.pause();
        }
        // Partial cleanup
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close()).catch(console.error);
            sessionPromiseRef.current = null;
        }
        // Stop capturing mic to prevent errors
        inputStreamRef.current?.getTracks().forEach(track => track.stop());
        scriptProcessorRef.current?.disconnect();
        mediaStreamSourceRef.current?.disconnect();
    }, [uiText.errors.connectionLost]);

    const handleEndCall = useCallback(() => {
        if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];

        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close()).catch(console.error);
            sessionPromiseRef.current = null;
        }
        cleanupAudio();
        setCallStatus(CallStatus.ENDED);
        setBotStatus(BotStatus.IDLE);
        setIsMicOn(true);
        handleGenerateSummary();
    }, [cleanupAudio, handleGenerateSummary]);

    const playWelcomeMessage = useCallback(async () => {
        const ai = getAiClient();
        if (!ai || !audioContextRef.current || !outputGainNodeRef.current) return;
        
        try {
            setBotStatus(BotStatus.SPEAKING);
            const welcomeText = uiText.welcome;
            
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: welcomeText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            
            if (base64Audio && audioContextRef.current && outputGainNodeRef.current) {
                const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextRef.current, 24000, 1);
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(outputGainNodeRef.current);
                source.start();
                
                setMessages(prev => {
                    const newMessages = [...prev];
                    if (newMessages.slice(callStartIndexRef.current).length === 0) {
                        newMessages.push({
                            id: `bot-${Date.now()}`,
                            text: welcomeText,
                            sender: 'bot',
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            isPartial: false
                        });
                    }
                    return newMessages;
                });
                
                source.onended = () => {
                    setBotStatus(BotStatus.LISTENING);
                };
            } else {
                setBotStatus(BotStatus.LISTENING);
            }
        } catch (err) {
            console.error("Failed to play welcome message:", err);
            handleConnectionLost(err);
        }
    }, [getAiClient, selectedVoice, uiText, handleConnectionLost]);

    const handleStartCall = useCallback(async () => {
        const ai = getAiClient();
        if (!ai) return;

        const isRetry = callStatus === CallStatus.CONNECTION_LOST;
        
        if (!isRetry) {
          setError(null);
          setRecordingUrl(null);
          callStartIndexRef.current = messages.length;
          setCallSummary(null);
        } else {
          setError(null);
        }
        
        setSideMenuOpen(false);
        setIsMicOn(true); // Resets UI, but ref will update in effect
        setCallStatus(CallStatus.ACTIVE);
        setBotStatus(BotStatus.CONNECTING);
        
        if (!isRetry) {
          localStorage.setItem('hasCalledBefore', 'true');
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            inputStreamRef.current = stream;
        } catch (err) {
            console.error("Microphone access error:", err);
            setError(uiText.errors.micPermissionDenied);
            setCallStatus(CallStatus.IDLE);
            setBotStatus(BotStatus.IDLE);
            return;
        }

        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        if (!outputGainNodeRef.current) {
            outputGainNodeRef.current = audioContextRef.current.createGain();
            outputGainNodeRef.current.gain.value = outputVolume;
            outputGainNodeRef.current.connect(audioContextRef.current.destination);
        } else {
            outputGainNodeRef.current.gain.value = outputVolume;
        }

        // Recording setup: We record the mixed output if enabled
        if (isRecordingEnabled && !isRetry) {
            mixedStreamDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
            // Connect the bot's output to the mix
            outputGainNodeRef.current.connect(mixedStreamDestinationRef.current);
            mediaRecorderRef.current = new MediaRecorder(mixedStreamDestinationRef.current.stream);

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) recordedChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setRecordingUrl(url);
                recordedChunksRef.current = [];
            };
            mediaRecorderRef.current.start();
        }

        let currentInputId: string | null = null;
        let currentOutputId: string | null = null;
        
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    if (!isRetry) {
                      playWelcomeMessage();
                    } else {
                      setBotStatus(BotStatus.LISTENING);
                      if (isRecordingEnabled && mediaRecorderRef.current?.state === 'paused') {
                          mediaRecorderRef.current.resume();
                      }
                    }

                    const source = audioContextRef.current!.createMediaStreamSource(inputStreamRef.current!);
                    mediaStreamSourceRef.current = source;
                    
                    if (!gainNodeRef.current) {
                      gainNodeRef.current = audioContextRef.current!.createGain();
                    }
                    gainNodeRef.current.gain.value = SENSITIVITY_GAIN_LEVELS[sensitivity];

                    // If recording, connect microphone (gainNode) to mixed destination so we record both sides
                    if (isRecordingEnabled && mixedStreamDestinationRef.current) {
                        gainNodeRef.current.connect(mixedStreamDestinationRef.current);
                    }

                    const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
                    scriptProcessorRef.current = scriptProcessor;
                    
                    // Use refs inside callback to avoid stale closures
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        if (!isMicOnRef.current) return;
                        
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const downsampledData = downsampleBuffer(inputData, 24000, 16000);
                        const pcmBlob = createBlob(downsampledData);
                        
                        sessionPromiseRef.current?.then((session) => {
                            // STABILITY FIX: Only send if the call is technically active
                            if (callStatusRef.current === CallStatus.ACTIVE || callStatusRef.current === CallStatus.CONNECTION_LOST) {
                                try {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                } catch (e) {
                                    console.warn("Send realtime input error:", e);
                                }
                            }
                        }).catch(err => {
                             // Don't immediately kill the call on a single frame error, 
                             // but log it. If widespread, the onerror callback will trigger.
                             console.warn("Failed to send audio frame (promise rejected):", err);
                        });
                    };
                    source.connect(gainNodeRef.current);
                    gainNodeRef.current.connect(scriptProcessor);
                    scriptProcessor.connect(audioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    try {
                        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        if (message.serverContent?.inputTranscription) {
                            const text = message.serverContent.inputTranscription.text;
                            setMessages(prev => {
                                if (!currentInputId) {
                                    currentInputId = `user-${Date.now()}`;
                                    return [...prev, { id: currentInputId, text, sender: 'user', isPartial: true, timestamp }];
                                }
                                return prev.map(m => m.id === currentInputId ? { ...m, text: m.text + text } : m);
                            });
                        }
                        if (message.serverContent?.outputTranscription) {
                             setBotStatus(BotStatus.SPEAKING);
                            const text = message.serverContent.outputTranscription.text;
                             setMessages(prev => {
                                if (!currentOutputId) {
                                    currentOutputId = `bot-${Date.now()}`;
                                    return [...prev, { id: currentOutputId, text, sender: 'bot', isPartial: true, timestamp }];
                                }
                                return prev.map(m => m.id === currentOutputId ? { ...m, text: m.text + text } : m);
                            });
                        }
                        if (message.serverContent?.turnComplete) {
                            setMessages(prev => prev.map(m => (m.id === currentInputId || m.id === currentOutputId) ? { ...m, isPartial: false } : m));
                            currentInputId = null;
                            currentOutputId = null;
                            setBotStatus(BotStatus.LISTENING);
                        }

                        const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (audioData && audioContextRef.current && outputGainNodeRef.current) {
                            nextAudioStartTimeRef.current = Math.max(nextAudioStartTimeRef.current, audioContextRef.current.currentTime);
                            const audioBuffer = await decodeAudioData(decode(audioData), audioContextRef.current, 24000, 1);
                            const source = audioContextRef.current.createBufferSource();
                            source.buffer = audioBuffer;
                            source.connect(outputGainNodeRef.current);
                            source.addEventListener('ended', () => audioPlaybackSourcesRef.current.delete(source));
                            source.start(nextAudioStartTimeRef.current);
                            nextAudioStartTimeRef.current += audioBuffer.duration;
                            audioPlaybackSourcesRef.current.add(source);
                        }
                        if (message.serverContent?.interrupted) {
                            audioPlaybackSourcesRef.current.forEach(source => source.stop());
                            audioPlaybackSourcesRef.current.clear();
                            nextAudioStartTimeRef.current = 0;
                        }
                    } catch (e) {
                        console.error("Error processing message:", e);
                    }
                },
                onerror: (e: ErrorEvent) => handleConnectionLost(e),
                onclose: () => {},
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: selectedVoice } } },
                systemInstruction: SYSTEM_PROMPTS[language](participants),
                inputAudioTranscription: {},
                outputAudioTranscription: {},
            },
        }).catch(err => {
            handleConnectionLost(err);
            return Promise.reject(err);
        });

    }, [getAiClient, language, selectedVoice, uiText, sensitivity, outputVolume, isRecordingEnabled, playWelcomeMessage, messages, callStatus, handleConnectionLost, participants]);

    // --- Transcription Logic ---
    const handleStartTranscription = useCallback(async () => {
      const ai = getAiClient();
      if (!ai || isTranscribing) return;
      
      setError(null);
      setIsTranscribing(true);
      setTranscriptionText('');

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        inputStreamRef.current = stream;
      } catch (err) {
        console.error("Microphone access error:", err);
        setError(uiText.errors.micPermissionDenied);
        setIsTranscribing(false);
        return;
      }

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            const source = audioContextRef.current!.createMediaStreamSource(inputStreamRef.current!);
            mediaStreamSourceRef.current = source;
            const gainNode = audioContextRef.current!.createGain();
            gainNode.gain.value = SENSITIVITY_GAIN_LEVELS[sensitivity];
            gainNodeRef.current = gainNode;

            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const downsampledData = downsampleBuffer(inputData, 24000, 16000);
              const pcmBlob = createBlob(downsampledData);
              sessionPromiseRef.current?.then((session) => {
                try {
                    session.sendRealtimeInput({ media: pcmBlob });
                } catch (e) {
                    console.error(e);
                }
              }).catch(err => {
                 console.error("Session promise rejected on send:", err);
                 // Don't stop completely on one frame error for transcription either
              });
            };
            source.connect(gainNode);
            gainNode.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const text = message.serverContent.inputTranscription.text;
              setTranscriptionText(prev => prev + text);
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('Live session error for transcription:', e);
            setError(uiText.errors.liveError);
            handleStopTranscription();
          },
          onclose: () => { cleanupAudio(true); },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: TRANSCRIPTION_SYSTEM_PROMPT[language],
          inputAudioTranscription: {},
        },
      }).catch(err => {
          console.error("Failed to connect to Live API for transcription:", err);
          setError(uiText.errors.liveError);
          handleStopTranscription();
          return Promise.reject(err);
      });

    }, [getAiClient, isTranscribing, uiText.errors.micPermissionDenied, uiText.errors.liveError, sensitivity, language]);

    const handleStopTranscription = useCallback(() => {
      if (sessionPromiseRef.current) {
        sessionPromiseRef.current.then(session => session.close()).catch(console.error);
        sessionPromiseRef.current = null;
      }
      cleanupAudio(true);
      setIsTranscribing(false);
    }, [cleanupAudio]);

    // --- Event Handlers ---
    const handleLanguageChange = (lang: Language) => setLanguage(lang);

    const playVoicePreview = useCallback(async (voiceName: string) => {
        const ai = getAiClient();
        if (callStatus !== CallStatus.IDLE || !ai || isPreviewPlaying) return;
        setIsPreviewPlaying(true);
        try {
            const previewText = VOICE_PREVIEW_SAMPLES[language][voiceName];
            if (!previewText) return;

            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash-preview-tts",
                contents: [{ parts: [{ text: previewText }] }],
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
                },
            });
            const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (base64Audio) {
                const previewAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                const gainNode = previewAudioContext.createGain();
                gainNode.gain.value = outputVolume;
                gainNode.connect(previewAudioContext.destination);
                const audioBuffer = await decodeAudioData(decode(base64Audio), previewAudioContext, 24000, 1);
                const source = previewAudioContext.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(gainNode);
                source.start();
                source.onended = () => { previewAudioContext.close().catch(console.error); };
            }
        } catch (err) {
            console.error("Failed to play voice preview:", err);
        } finally {
            setIsPreviewPlaying(false);
        }
    }, [getAiClient, callStatus, language, isPreviewPlaying, outputVolume]);
    
    const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newVoice = event.target.value;
        setSelectedVoice(newVoice);
        playVoicePreview(newVoice);
    };

    const handleSensitivityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newSensitivity = event.target.value as SensitivityLevel;
        setSensitivity(newSensitivity);
        if (gainNodeRef.current && (callStatus === CallStatus.ACTIVE || isTranscribing) && audioContextRef.current) {
            gainNodeRef.current.gain.setTargetAtTime(SENSITIVITY_GAIN_LEVELS[newSensitivity], audioContextRef.current.currentTime, 0.1);
        }
    };

    const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(event.target.value);
        setOutputVolume(newVolume);
        if (outputGainNodeRef.current) { outputGainNodeRef.current.gain.value = newVolume; }
    };
    
    const handleAddParticipant = (name: string) => {
        setParticipants(prev => [...prev, name]);
    };

    const handleRemoveParticipant = (index: number) => {
        setParticipants(prev => {
            if (prev.length <= 1) return prev; // Keep at least one
            const newParticipants = [...prev];
            newParticipants.splice(index, 1);
            return newParticipants;
        });
    };

    const handleMicToggle = () => setIsMicOn(prev => !prev);
    const handleClearHistory = useCallback(() => setMessages([]), []);
    const handleAutoStartToggle = () => setAutoStartCall(prev => !prev);
    const handleRecordingToggle = () => setIsRecordingEnabled(prev => !prev);

    const handleDismissSummary = () => {
        setCallSummary(null);
        setIsSummarizing(false);
        setCallStatus(CallStatus.IDLE);
        if (recordingUrl) {
            URL.revokeObjectURL(recordingUrl);
            setRecordingUrl(null);
        }
    };
    
    const handleGenerateScript = useCallback(async (topic: string) => {
        const ai = getAiClient();
        if (!ai) return Promise.reject(new Error("AI Client not available."));
        try {
            const prompt = SCRIPT_GENERATOR_PROMPT[language](topic);
            const response: GenerateContentResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt
            });
            return response.text;
        } catch (error) {
            console.error("Script generation failed:", error);
            return Promise.reject(new Error(uiText.errors.scriptError));
        }
    }, [getAiClient, language, uiText.errors.scriptError]);

    const StatusIndicator = () => {
        let text, Icon;
        if (callStatus === CallStatus.CONNECTION_LOST) {
          text = uiText.status.connectionLost;
          Icon = <RefreshIcon className="w-5 h-5 mr-2" />;
          return <div className="flex items-center justify-center text-sm text-amber-400 h-6 font-semibold">{Icon}{text}</div>
        }
        
        switch(botStatus) {
            case BotStatus.CONNECTING: text = uiText.status.connecting; Icon = <SpinnerIcon className="w-5 h-5 mr-2 animate-spin text-blue-400" />; break;
            case BotStatus.LISTENING: text = uiText.status.listening; Icon = <MicIcon className="w-5 h-5 mr-2 text-green-400" />; break;
            case BotStatus.SPEAKING: text = uiText.status.speaking; Icon = <VolumeUpIcon className="w-5 h-5 mr-2 animate-pulse text-yellow-400" />; break;
            default:
                if (isSummarizing) {
                    text = uiText.summary.generating;
                    Icon = <SpinnerIcon className="w-5 h-5 mr-2 animate-spin text-blue-400" />;
                } else if (callStatus === CallStatus.ENDED) {
                    text = uiText.status.ended;
                } else if (callStatus === CallStatus.ACTIVE && !isMicOn) {
                    text = uiText.status.micOff;
                    Icon = <MicOffIcon className="w-5 h-5 mr-2 text-slate-400" />;
                } else {
                    text = uiText.status.idle;
                }
        }
        return <div className="flex items-center justify-center text-sm text-slate-400 h-6">{Icon}{text}</div>
    }

    return (
        <div className="flex items-center justify-center min-h-screen font-sans">
            <div className="w-full max-w-sm h-[700px] max-h-[90vh] bg-slate-800 rounded-3xl shadow-2xl flex flex-col p-4 border-4 border-slate-700">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 relative">
                     <div className="flex items-center space-x-2">
                        <button onClick={() => setSideMenuOpen(true)} className="p-2 -ml-2 rounded-full hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800" aria-label="Open Menu">
                            <MenuIcon className="w-6 h-6 text-white"/>
                        </button>
                        <h1 className="text-xl font-bold text-white">{uiText.title}</h1>
                        {isRecordingEnabled && callStatus === CallStatus.ACTIVE && (
                            <div className="flex items-center space-x-1 bg-red-900/50 text-red-400 rounded-full px-2 py-0.5 text-xs font-semibold animate-pulse">
                               <RecordIcon className="w-2.5 h-2.5" />
                               <span>REC</span>
                            </div>
                        )}
                     </div>
                </div>
                
                {/* Main Content */}
                <div className="flex-1 bg-slate-900 rounded-2xl p-4 flex flex-col overflow-hidden">
                   {callStatus === CallStatus.ENDED ? (
                        <CallSummary 
                            isSummarizing={isSummarizing}
                            summaryText={callSummary}
                            onDismiss={handleDismissSummary}
                            uiText={uiText.summary}
                            recordingUrl={recordingUrl}
                        />
                    ) : (callStatus === CallStatus.IDLE && messages.length === 0) ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-full px-4">
                                <h2 className="text-lg font-semibold text-slate-300 mb-4">{uiText.suggestions.heading}</h2>
                                <div className="space-y-3">
                                    {EXAMPLE_PROMPTS[language].map((prompt, index) => (
                                        <button 
                                            key={index}
                                            onClick={() => handleStartCall()}
                                            className="w-full bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded-lg p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {error && <p className="mt-6 text-sm text-red-400 px-4">{error}</p>}
                        </div>
                    ) : (
                        <>
                            {(error && callStatus !== CallStatus.ACTIVE) && (
                                <div className="mb-4 text-center">
                                    <p className="text-sm text-red-400 p-2 bg-red-900/50 rounded-lg inline-block">{error}</p>
                                </div>
                            )}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                                <div className="space-y-4">
                                    {messages.map(msg => (
                                        <MessageBubble key={msg.id} message={msg} />
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-4">
                    <div className="h-6 mb-4">
                      {(callStatus !== CallStatus.IDLE) && <StatusIndicator />}
                    </div>
                    <div className="flex items-center justify-center">
                        {callStatus === CallStatus.IDLE || callStatus === CallStatus.ENDED ? (
                            <button 
                                onClick={handleStartCall} 
                                disabled={callStatus === CallStatus.ENDED}
                                className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform disabled:bg-slate-600 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-green-400 focus-visible:ring-opacity-75"
                                aria-label={uiText.buttons.start}
                            >
                                <PhoneIcon className="w-8 h-8 text-white" />
                            </button>
                        ) : callStatus === CallStatus.ACTIVE ? (
                            <div className="w-full flex justify-center items-center space-x-6">
                                <div className="w-14 h-14" /> {/* Spacer */}
                                <button 
                                    onClick={handleEndCall} 
                                    className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-red-500 focus-visible:ring-opacity-75"
                                    aria-label={uiText.buttons.end}
                                >
                                    <EndCallIcon className="w-8 h-8 text-white" />
                                </button>
                                <button
                                    onClick={handleMicToggle}
                                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-opacity-75 ${isMicOn ? 'bg-slate-600 hover:bg-slate-500 focus-visible:ring-slate-400' : 'bg-slate-700 hover:bg-slate-600 focus-visible:ring-slate-500'}`}
                                    aria-label={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
                                >
                                    {isMicOn ? <MicIcon className="w-6 h-6 text-white" /> : <MicOffIcon className="w-6 h-6 text-slate-300" />}
                                </button>
                            </div>
                        ) : callStatus === CallStatus.CONNECTION_LOST ? (
                             <div className="w-full flex justify-center items-center space-x-4">
                                <button
                                    onClick={handleEndCall}
                                    className="px-6 py-3 bg-slate-600 rounded-lg flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-500 focus-visible:ring-opacity-75 text-white font-semibold"
                                    aria-label={uiText.buttons.end}
                                >
                                    <EndCallIcon className="w-5 h-5 mr-2" />
                                    <span>{uiText.buttons.end}</span>
                                </button>
                                <button
                                    onClick={handleStartCall}
                                    className="px-6 py-4 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 text-white font-bold"
                                    aria-label={uiText.buttons.retry}
                                >
                                    <RefreshIcon className="w-5 h-5 mr-2" />
                                    <span>{uiText.buttons.retry}</span>
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
            <SideMenu 
                isOpen={isSideMenuOpen} 
                onClose={() => setSideMenuOpen(false)}
                onOpenScriptGenerator={() => {
                    setSideMenuOpen(false);
                    setScriptGeneratorOpen(true);
                }}
                onOpenTranscriptionModal={() => {
                    setSideMenuOpen(false);
                    setTranscriptionModalOpen(true);
                }}
                uiText={uiText.sideMenu}
                language={language}
                onLanguageChange={handleLanguageChange}
                selectedVoice={selectedVoice}
                onVoiceChange={handleVoiceChange}
                isPreviewPlaying={isPreviewPlaying}
                sensitivity={sensitivity}
                onSensitivityChange={handleSensitivityChange}
                outputVolume={outputVolume}
                onVolumeChange={handleVolumeChange}
                autoStartCall={autoStartCall}
                onAutoStartToggle={handleAutoStartToggle}
                isRecordingEnabled={isRecordingEnabled}
                onRecordingToggle={handleRecordingToggle}
                onClearHistory={handleClearHistory}
                messageCount={messages.length}
                sensitivityLevels={uiText.sensitivityLevels}
                callStatus={callStatus}
                participants={participants}
                onAddParticipant={handleAddParticipant}
                onRemoveParticipant={handleRemoveParticipant}
            />
            <ScriptGeneratorModal 
                isOpen={isScriptGeneratorOpen}
                onClose={() => setScriptGeneratorOpen(false)}
                onGenerate={handleGenerateScript}
                uiText={uiText.scriptGenerator}
            />
            <TranscriptionModal
                isOpen={isTranscriptionModalOpen}
                onClose={() => setTranscriptionModalOpen(false)}
                onStart={handleStartTranscription}
                onStop={handleStopTranscription}
                isTranscribing={isTranscribing}
                transcriptionText={transcriptionText}
                onClear={() => setTranscriptionText('')}
                uiText={uiText.transcriptionModal}
                error={error}
            />
        </div>
    );
};

export default App;
