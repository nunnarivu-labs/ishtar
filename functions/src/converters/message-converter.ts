import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { DocumentData } from 'firebase/firestore';
import admin from 'firebase-admin';
import { Message } from '../commons';

export const chatMessageConverter = {
  toFirestore: (message: Message): DocumentData => {
    return {
      role: message.role,
      contents: message.contents,
      timestamp:
        message.timestamp instanceof Date
          ? admin.firestore.Timestamp.fromDate(message.timestamp)
          : message.timestamp,
      isSummary: message.isSummary,
      isDeleted: message.isDeleted ?? false,
    };
  },
  fromFirestore: (snapshot: QueryDocumentSnapshot<Message>): Message => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      role: data.role,
      contents: data.contents,
      timestamp: (
        data.timestamp as unknown as admin.firestore.Timestamp
      ).toDate(),
      isSummary: data.isSummary,
      isDeleted: data.isDeleted ?? false,
    };
  },
};
