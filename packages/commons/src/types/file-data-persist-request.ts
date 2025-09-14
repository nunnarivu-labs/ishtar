import type { DraftFileData } from './file-data';

export type FileDataPersistRequest = {
  conversationId: string;
  files: DraftFileData[];
};

export type FileDataPersistResponse = { fileIds: string[] };
