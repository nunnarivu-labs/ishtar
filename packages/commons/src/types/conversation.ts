import type { PresetThinkingCapacity } from './ai-models.ts';

export type ChatSettings = {
  systemInstruction: string | null;
  temperature: number;
  model: string;
  enableThinking: boolean;
  thinkingCapacity: number | PresetThinkingCapacity | null;
  enableMultiTurnConversation: boolean;
};

export type Role = 'user' | 'model' | 'system';

type TextContent = { type: 'text'; text: string };

export type FileContent = {
  type: 'file';
  fileId: string;
};

export type LocalFileContent = {
  type: 'localFile';
  file: File;
};

export type Content = TextContent | FileContent | LocalFileContent;

export type Message = {
  id: string;
  role: Role;
  contents: Content[];
  timestamp: Date;
  isSummary: boolean;
  isDeleted: boolean;
};

export type Conversation = {
  id: string;
  createdAt: Date;
  lastUpdated: Date;
  title: string;
  isDeleted: boolean;
  summarizedMessageId: string | null;
  textTokenCountSinceLastSummary: number;
  chatSettings: ChatSettings;
  inputTokenCount: number;
  outputTokenCount: number;
};

export type DraftConversation = Omit<Conversation, 'id'>;
export type DraftMessage = Omit<Message, 'id'>;
