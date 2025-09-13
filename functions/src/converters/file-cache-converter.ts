import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { DocumentData } from 'firebase/firestore';
import admin from 'firebase-admin';
import { FileCache } from '@ishtar/commons/types';

export const fileCacheConverter = {
  toFirestore: (fileCache: FileCache): DocumentData => {
    return {
      fileId: fileCache.fileId,
      name: fileCache.name,
      uri: fileCache.uri,
      mimeType: fileCache.mimeType,
      createdAt:
        fileCache.createdAt instanceof Date
          ? admin.firestore.Timestamp.fromDate(fileCache.createdAt)
          : fileCache.createdAt,
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<FileCache>): FileCache => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      fileId: data.fileId,
      name: data.name,
      uri: data.uri,
      mimeType: data.mimeType,
      createdAt: (
        data.createdAt as unknown as admin.firestore.Timestamp
      ).toDate(),
    };
  },
};
