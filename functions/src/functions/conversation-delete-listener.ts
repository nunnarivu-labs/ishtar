import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import admin from 'firebase-admin';

export const conversationDeleteListener = onDocumentDeleted(
  {
    document: 'users/{currentUserUid}/conversations/{conversationId}',
    timeoutSeconds: 300,
    retry: false,
  },
  async (event) => {
    const { conversationId } = event.params;

    const bucket = admin.storage().bucket();
    const prefix = `userFiles/${conversationId}`;

    try {
      await bucket.deleteFiles({
        prefix,
      });

      console.log(`Storage data with prefix ${prefix} deleted successfully.`);
    } catch (e) {
      console.error(`Error deleting storage data with prefix: ${prefix}`, e);
    }
  },
);
