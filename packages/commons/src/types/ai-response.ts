import type { Message } from './conversation.ts';

export type AiResponse = {
  promptMessageId: string;
  conversationId: string;
  modelMessage: Message;
};
