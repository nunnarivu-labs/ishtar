import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { DocumentData } from 'firebase/firestore';
import admin from 'firebase-admin';
import { FileData } from '@ishtar/commons/types';

export const fileConverter = {
  toFirestore: (file: FileData): DocumentData => {
    return {
      originalFileName: file.originalFileName,
      storagePath: file.storagePath,
      type: file.type,
      url: file.url,
      createdAt:
        file.createdAt instanceof Date
          ? admin.firestore.Timestamp.fromDate(file.createdAt)
          : file.createdAt,
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<FileData>): FileData => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      originalFileName: data.originalFileName,
      storagePath: data.storagePath,
      type: data.type,
      url: data.url,
      createdAt: (
        data.createdAt as unknown as admin.firestore.Timestamp
      ).toDate(),
    };
  },
};
