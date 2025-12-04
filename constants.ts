
import { Language, SensitivityLevel } from './types';

export const LANGUAGES = [
  { code: Language.EN, name: 'English' },
  { code: Language.CN, name: '中文 (Chinese)' },
  { code: Language.BM, name: 'Bahasa Malaysia' },
];

export const LIVE_VOICES = [
    { name: 'Zephyr', label: 'Zephyr (Default)' },
    { name: 'Puck', label: 'Puck' },
    { name: 'Charon', label: 'Charon' },
    { name: 'Kore', label: 'Kore' },
    { name: 'Fenrir', label: 'Fenrir' },
];

export const VOICE_PREVIEW_SAMPLES: Record<Language, Record<string, string>> = {
  [Language.EN]: {
    Zephyr: 'Hello, this is the Zephyr voice.',
    Puck: 'Greetings from Puck.',
    Charon: 'Testing the Charon voice now.',
    Kore: 'This is a sample from Kore.',
    Fenrir: 'You are listening to Fenrir.',
  },
  [Language.CN]: {
    Zephyr: '你好，这是西风的声音。',
    Puck: '来自帕克的问候。',
    Charon: '现在测试卡戎的声音。',
    Kore: '这是来自科里的样本。',
    Fenrir: '您正在收听芬里尔的声音。',
  },
  [Language.BM]: {
    Zephyr: 'Helo, ini suara Zephyr.',
    Puck: 'Salam dari Puck.',
    Charon: 'Menguji suara Charon sekarang.',
    Kore: 'Ini adalah sampel daripada Kore.',
    Fenrir: 'Anda sedang mendengar suara Fenrir.',
  },
};

export const SENSITIVITY_GAIN_LEVELS: Record<SensitivityLevel, number> = {
  [SensitivityLevel.LOW]: 0.7,
  [SensitivityLevel.MEDIUM]: 1.0,
  [SensitivityLevel.HIGH]: 1.3,
};

export const EXAMPLE_PROMPTS = {
  [Language.EN]: [
    "What's the weather like in London?",
    "Tell me a fun fact about space.",
    "Help me brainstorm ideas for a birthday party.",
    "Translate 'good morning' to Spanish.",
  ],
  [Language.CN]: [
    "伦敦的天气怎么样？",
    "告诉我一个关于太空的有趣事实。",
    "帮我集思思益生日派对的点子。",
    "把'早上好'翻译成西班牙语。",
  ],
  [Language.BM]: [
    "Apakah cuaca di London?",
    "Beritahu saya fakta menarik tentang angkasa.",
    "Bantu saya sumbang saran idea untuk majlis hari jadi.",
    "Terjemahkan 'selamat pagi' ke bahasa Sepanyol.",
  ],
};

export const UI_TEXT = {
  [Language.EN]: {
    title: 'AI Caller Bot',
    welcome: "Hi, I am your personal caller bot. You can ask me anything. How can I help you today?",
    status: {
      listening: 'Connected',
      thinking: 'Thinking...',
      speaking: 'Speaking...',
      micOff: 'Microphone Off',
      idle: 'Ready for a call',
      ended: 'Call Ended',
      connecting: 'Connecting...',
      connectionLost: 'Connection Lost',
      recording: 'Recording',
    },
    buttons: {
      start: 'Start Call',
      end: 'End Call',
      retry: 'Retry Call',
    },
    sideMenu: {
      title: 'Menu',
      callSettings: 'Call Settings',
      participants: 'Participants',
      addParticipantPlaceholder: 'Add name...',
      appSettings: 'App Settings',
      businessTools: 'Business Tools',
      language: 'Language',
      voice: 'Voice',
      sensitivity: 'Mic Sensitivity',
      volume: 'Output Volume',
      autoStart: 'Auto-start call on load',
      recordCall: 'Record Call',
      callNumber: 'Call Number',
      whatsApp: 'WhatsApp Business',
      scriptGenerator: 'AI Script Generator',
      transcribeAudio: 'Transcribe Audio',
      clearHistory: 'Clear History',
    },
    scriptGenerator: {
      title: 'AI Script Generator',
      placeholder: 'e.g., A follow-up call for a sales quote...',
      generate: 'Generate',
      generating: 'Generating...',
      close: 'Close',
    },
    transcriptionModal: {
      title: 'Audio Transcription',
      start: 'Start Recording',
      stop: 'Stop Recording',
      copy: 'Copy Text',
      copied: 'Copied!',
      clear: 'Clear',
      placeholder: 'Your transcribed text will appear here...',
      instructions: 'Click "Start Recording" and begin speaking.',
      recording: 'Recording... speak now',
      close: 'Close',
    },
    summary: {
      title: 'Call Summary',
      generating: 'Generating summary...',
      dismiss: 'New Call',
      downloadRecording: 'Download Recording',
    },
    suggestions: {
      heading: 'Try saying...',
    },
    sensitivityLevels: {
        low: 'Low',
        medium: 'Medium',
        high: 'High',
    },
    errors: {
      unsupported: 'Your browser does not support the necessary Web Audio APIs.',
      micPermissionDenied: 'Microphone access was denied. Please allow microphone access in your browser settings to continue.',
      micNotAvailable: 'Microphone not available. Please check your connection and ensure it is not used by another app.',
      liveError: 'A connection error occurred. Please try again.',
      connectionLost: 'Connection was lost. Please check your network and retry.',
      unknown: 'An unexpected error occurred. Please try again.',
      geminiError: "I'm sorry, I couldn't process that. Please try again.",
      geminiRetryError: "I'm sorry, that didn't work either. Please check your network connection or try again later.",
      scriptError: 'Could not generate script. Please try again.',
      summaryError: 'Could not generate summary.',
      apiKeyNotConfigured: "API key is not configured.",
      aiInitializationFailed: "Failed to initialize AI. Check API Key and network.",
    }
  },
  [Language.CN]: {
    title: '人工智能通话机器人',
    welcome: "你好！我是你的个人通话机器人，你可以问我任何事情。今天我能怎么帮你？",
    status: {
      listening: '已连接',
      thinking: '正在思考...',
      speaking: '正在说话...',
      micOff: '麦克风已关闭',
      idle: '准备通话',
      ended: '通话结束',
      connecting: '连接中...',
      connectionLost: '连接已断开',
      recording: '录音中',
    },
    buttons: {
      start: '开始通话',
      end: '结束通话',
      retry: '重试通话',
    },
    sideMenu: {
      title: '菜单',
      callSettings: '通话设置',
      participants: '参与者',
      addParticipantPlaceholder: '添加姓名...',
      appSettings: '应用设置',
      businessTools: '商务工具',
      language: '语言',
      voice: '语音',
      sensitivity: '麦克风灵敏度',
      volume: '输出音量',
      autoStart: '加载时自动开始通话',
      recordCall: '通话录音',
      callNumber: '呼叫号码',
      whatsApp: 'WhatsApp Business',
      scriptGenerator: 'AI 脚本生成器',
      transcribeAudio: '音频转录',
      clearHistory: '清除历史记录',
    },
    scriptGenerator: {
      title: 'AI 脚本生成器',
      placeholder: '例如：一个销售报价的跟进电话...',
      generate: '生成',
      generating: '生成中...',
      close: '关闭',
    },
    transcriptionModal: {
        title: '音频转录',
        start: '开始录音',
        stop: '停止录音',
        copy: '复制文本',
        copied: '已复制！',
        clear: '清除',
        placeholder: '您的转录文本将显示在这里...',
        instructions: '点击“开始录音”并开始说话。',
        recording: '录音中... 现在请说话',
        close: '关闭',
    },
    summary: {
      title: '通话摘要',
      generating: '正在生成摘要...',
      dismiss: '新通话',
      downloadRecording: '下载录音',
    },
    suggestions: {
      heading: '试试说...',
    },
    sensitivityLevels: {
        low: '低',
        medium: '中',
        high: '高',
    },
    errors: {
        unsupported: '您的浏览器不支持所需的 Web Audio API。',
        micPermissionDenied: '麦克风访问被拒绝。请在浏览器设置中允许麦克风访问以继续。',
        micNotAvailable: '麦克风不可用。请检查您的连接并确保它没有被其他应用使用。',
        liveError: '发生连接错误。请再试一次。',
        connectionLost: '连接已断开。请检查您的网络并重试。',
        unknown: '发生意外错误。请再试一次。',
        geminiError: '抱歉，我无法处理该请求。请再试一次。',
        geminiRetryError: '抱歉，重试也失败了。请检查您的网络连接或稍后再试。',
        scriptError: '无法生成脚本。请再试一次。',
        summaryError: '无法生成摘要。',
        apiKeyNotConfigured: "API 密钥未配置。",
        aiInitializationFailed: "AI 初始化失败。请检查 API 密钥和网络。",
    }
  },
  [Language.BM]: {
    title: 'Bot Pemanggil AI',
    welcome: "Hai, saya bot pemanggil peribadi anda. Anda boleh tanya saya apa sahaja. Apa yang boleh saya bantu anda hari ini?",
    status: {
      listening: 'Disambungkan',
      thinking: 'Berfikir...',
      speaking: 'Bercakap...',
      micOff: 'Mikrofon Dimatikan',
      idle: 'Sedia untuk panggilan',
      ended: 'Panggilan Ditamatkan',
      connecting: 'Menyambung...',
      connectionLost: 'Sambungan Terputus',
      merakam: 'Merakam',
      recording: 'Merakam',
    },
    buttons: {
      start: 'Mula Panggilan',
      end: 'Tamatkan Panggilan',
      retry: 'Cuba Semula Panggilan',
    },
    sideMenu: {
      title: 'Menu',
      callSettings: 'Tetapan Panggilan',
      participants: 'Peserta',
      addParticipantPlaceholder: 'Tambah nama...',
      appSettings: 'Tetapan Aplikasi',
      businessTools: 'Alat Perniagaan',
      language: 'Bahasa',
      voice: 'Suara',
      sensitivity: 'Sensitiviti Mikrofon',
      volume: 'Kelantangan Output',
      autoStart: 'Auto-mula panggilan semasa muat',
      recordCall: 'Rakam Panggilan',
      callNumber: 'Nombor Panggilan',
      whatsApp: 'WhatsApp Business',
      scriptGenerator: 'Penjana Skrip AI',
      transcribeAudio: 'Transkripsi Audio',
      clearHistory: 'Padam Sejarah',
    },
    scriptGenerator: {
      title: 'Penjana Skrip AI',
      placeholder: 'cth., Panggilan susulan untuk sebut harga jualan...',
      generate: 'Jana',
      generating: 'Menjana...',
      close: 'Tutup',
    },
    transcriptionModal: {
      title: 'Transkripsi Audio',
      start: 'Mula Rakaman',
      stop: 'Hentikan Rakaman',
      copy: 'Salin Teks',
      copied: 'Disalin!',
      clear: 'Padam',
      placeholder: 'Teks transkripsi anda akan muncul di sini...',
      instructions: 'Klik "Mula Rakaman" dan mula bercakap.',
      recording: 'Merakam... sila bercakap sekarang',
      close: 'Tutup',
    },
    summary: {
      title: 'Ringkasan Panggilan',
      generating: 'Menjana ringkasan...',
      dismiss: 'Panggilan Baru',
      downloadRecording: 'Muat Turun Rakaman',
    },
    suggestions: {
      heading: 'Cuba sebut...',
    },
    sensitivityLevels: {
        low: 'Rendah',
        medium: 'Sederhana',
        high: 'Tinggi',
    },
    errors: {
        unsupported: 'Pelayar anda tidak menyokong API Audio Web yang diperlukan.',
        micPermissionDenied: 'Akses mikrofon telah ditolak. Sila benarkan akses mikrofon dalam tetapan pelayar anda untuk meneruskan.',
        micNotAvailable: 'Mikrofon tidak tersedia. Sila periksa sambungan anda dan pastikan ia tidak digunakan oleh aplikasi lain.',
        liveError: 'Ralat sambungan berlaku. Sila cuba lagi.',
        connectionLost: 'Sambungan terputus. Sila periksa rangkaian anda dan cuba lagi.',
        unknown: 'Berlaku ralat yang tidak dijangka. Sila cuba lagi.',
        geminiError: 'Maaf, saya tidak dapat memproses permintaan itu. Sila cuba lagi.',
        geminiRetryError: 'Maaf, percubaan semula juga gagal. Sila periksa sambungan rangkaian anda atau cuba lagi nanti.',
        scriptError: 'Tidak dapat menjana skrip. Sila cuba lagi.',
        summaryError: 'Tidak dapat menjana ringkasan.',
        apiKeyNotConfigured: "Kunci API tidak dikonfigurasikan.",
        aiInitializationFailed: "Gagal memulakan AI. Periksa Kunci API dan rangkaian.",
    }
  },
};

export const SYSTEM_PROMPTS = {
  [Language.EN]: (participants: string[]) => `You are a friendly and helpful AI assistant named Gemini on a phone call. You are speaking with: ${participants.join(', ')}. Keep your responses concise and conversational. Respond in English. If multiple people speak, try to address them appropriately based on context.`,
  [Language.CN]: (participants: string[]) => `你是一个友好且乐于助人的人工智能助手，名叫Gemini，正在通电话。你正在与以下人员交谈：${participants.join(', ')}。请保持回答简洁和对话化。请用中文回应。如果有多人说话，请尝试根据上下文适当地称呼他们。`,
  [Language.BM]: (participants: string[]) => `Anda ialah pembantu AI yang mesra dan sedia membantu bernama Gemini dalam panggilan telefon. Anda bercakap dengan: ${participants.join(', ')}. Pastikan respons anda ringkas dan bersifat perbualan. Sila balas dalam Bahasa Malaysia. Jika berbilang orang bercakap, cuba sapa mereka dengan sewajarnya berdasarkan konteks.`,
};

export const TRANSCRIPTION_SYSTEM_PROMPT = {
  [Language.EN]: 'You are a highly accurate and fast transcription service. Listen to the user and transcribe their speech into text. Do not generate any conversational responses or replies.',
  [Language.CN]: '你是一个高精度、快速的转录服务。请听用户说话并将其语音转录为文字。不要生成任何对话式回应或回复。',
  [Language.BM]: 'Anda adalah perkhidmatan transkripsi yang sangat tepat dan pantas. Dengar pengguna dan transkripsikan ucapan mereka ke dalam teks. Jangan jana sebarang respons atau balasan perbualan.',
};

export const SUMMARY_PROMPT = {
    [Language.EN]: (transcript: string) => `Based on the following call transcript, provide a concise summary in a few bullet points highlighting the key points and any outcomes or action items.\n\nTranscript:\n${transcript}`,
    [Language.CN]: (transcript: string) => `根据以下通话记录，提供一个简明的摘要，用几个要点突出关键点和任何结果或行动项目。\n\n记录：\n${transcript}`,
    [Language.BM]: (transcript: string) => `Berdasarkan transkrip panggilan berikut, berikan ringkasan padat dalam beberapa perkara utama yang menonjolkan perkara penting dan sebarang hasil atau item tindakan.\n\nTranskrip:\n${transcript}`,
};

export const SCRIPT_GENERATOR_PROMPT = {
    [Language.EN]: (topic: string) => `Generate a short, professional, and conversational call script for the following topic: "${topic}". The script should have two roles: "Agent" and "Customer". Format the output clearly with each role's dialogue.`,
    [Language.CN]: (topic: string) => `请为以下主题生成一个简短、专业且对话式的通话脚本：“${topic}”。脚本应包含两个角色：“客服”和“客户”。请清晰地格式化输出，标明每个角色的对话。`,
    [Language.BM]: (topic: string) => `Hasilkan skrip panggilan yang pendek, profesional dan perbualan untuk topik berikut: "${topic}". Skrip harus mempunyai dua peranan: "Ejen" dan "Pelanggan". Formatkan output dengan jelas dengan dialog setiap peranan.`,
};
