import type { Model, OpenAIModel, OpenAIReasoningEffort } from './ai-models.ts';

export type ChatSettings = {
  systemInstruction: string | null;
  temperature: number | null;
  model: Model | OpenAIModel | null;
  enableThinking: boolean | null;
  thinkingCapacity: number | OpenAIReasoningEffort | null;
  enableMultiTurnConversation: boolean | null;
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
  tokenCount: number | null;
  isSummary: boolean;
};

export type Conversation = {
  id: string;
  createdAt: Date;
  lastUpdated: Date;
  title: string;
  isDeleted: boolean;
  summarizedMessageId: string | null;
  chatSettings: ChatSettings | null;
  inputTokenCount: number | null;
  outputTokenCount: number | null;
};

export type DraftConversation = Omit<Conversation, 'id'>;
export type DraftMessage = Omit<Message, 'id'>;
