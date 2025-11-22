export type GlobalSettings = {
  defaultModel: string;
  supportedModels: string[];
  temperature: number;
  enableThinking: boolean;
  enableMultiTurnConversation: boolean;
  thinkingBudget: number | null;
};
