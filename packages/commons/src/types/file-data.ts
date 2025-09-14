export type FileData = {
  id: string;
  originalFileName: string;
  storagePath: string;
  url: string;
  type: string;
  createdAt: Date;
};

export type DraftFileData = Omit<FileData, 'id' | 'createdAt' | 'tokens'>;
