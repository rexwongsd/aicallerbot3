export enum Language {
  EN = 'en-US',
  CN = 'zh-CN',
  BM = 'ms-MY',
}

export enum CallStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  ENDED = 'ended',
  CONNECTION_LOST = 'connection_lost',
}

export enum BotStatus {
  IDLE = 'idle',
  LISTENING = 'listening', // Will represent the "connected and listening" state
  THINKING = 'thinking', // Kept for potential future use, but less prominent
  SPEAKING = 'speaking',
  CONNECTING = 'connecting',
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
  isError?: boolean;
  isPartial?: boolean;
}

export enum SensitivityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}