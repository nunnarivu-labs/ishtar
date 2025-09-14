import type { FileData } from '@ishtar/commons/types';
import { converter } from './converters.ts';
import { Timestamp } from 'firebase/firestore';

export const fileConverter = converter<FileData>({
  toFirestore: (file) => ({
    originalFileName: file.originalFileName,
    storagePath: file.storagePath,
    type: file.type,
    createdAt:
      file.createdAt instanceof Date
        ? Timestamp.fromDate(file.createdAt)
        : file.createdAt,
  }),

  fromFirestore: (id, file) => ({
    id,
    originalFileName: file.originalFileName,
    storagePath: file.storagePath,
    type: file.type,
    createdAt: (file.createdAt as unknown as Timestamp).toDate(),
  }),
});
