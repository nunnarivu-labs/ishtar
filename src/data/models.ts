import type { ModelDetail } from '@ishtar/commons/types';

export const modelIds = {
  GEMINI_2_5_PRO: '972410fa-58f2-48a5-866e-0535dff3ae96',
  NANO_BANANA: '1b579c85-1a86-4cef-a13d-9cc9ad13b568',
  GEMINI_2_5_FLASH: '39e333be-2b16-4de3-bb4e-78061a753e94',
  GEMINI_2_5_FLASH_LITE: 'fa27f1b4-ea4d-4b62-9884-fa69c5276cb1',
};

export const models: ModelDetail[] = [
  {
    id: modelIds.GEMINI_2_5_PRO,
    title: 'Gemini 2.5 Pro',
    model: 'gemini-2.5-pro',
  },
  {
    id: modelIds.NANO_BANANA,
    title: 'Gemini 2.5 Flash Image (Nano Banana)',
    model: 'gemini-2.5-flash-image-preview',
  },
  {
    id: modelIds.GEMINI_2_5_FLASH,
    title: 'Gemini 2.5 Flash',
    model: 'gemini-2.5-flash',
  },
  {
    id: modelIds.GEMINI_2_5_FLASH_LITE,
    title: 'Gemini 2.5 Flash Lite',
    model: 'gemini-2.5-flash-lite',
  },
];

export const modelsObject: Record<string, ModelDetail> = Object.fromEntries(
  models.map((model) => [model.id, model]),
);
