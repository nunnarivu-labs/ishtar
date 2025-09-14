import admin from 'firebase-admin';

admin.initializeApp();

export const db = admin.firestore();

export * from './functions/ai-function';
export * from './functions/auth-function';
export * from './functions/conversation-delete-listener';
export * from './functions/clean-up-deleted-conversations';
export * from './functions/clean-up-expired-file-cache';
