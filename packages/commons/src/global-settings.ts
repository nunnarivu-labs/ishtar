import type { ModelConfig } from './ai-models.ts';

export type GlobalSettings = {
  models: Record<string, ModelConfig>;
  defaultModelId: string;
  supportedModelIds: string[];
  temperature: number;
};
