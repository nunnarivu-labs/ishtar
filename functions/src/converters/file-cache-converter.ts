import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { DocumentData } from 'firebase/firestore';
import admin from 'firebase-admin';
import { FileCache } from '@ishtar/commons';

export const fileCacheConverter = {
  toFirestore: (fileCache: Omit<FileCache, 'id'>): DocumentData => {
    return {
      name: fileCache.name,
      uri: fileCache.uri,
      mimeType: fileCache.mimeType,
      createdAt: admin.firestore.Timestamp.fromDate(fileCache.createdAt),
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<FileCache>): FileCache => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name,
      uri: data.uri,
      mimeType: data.mimeType,
      createdAt: (
        data.createdAt as unknown as admin.firestore.Timestamp
      ).toDate(),
    };
  },
};
