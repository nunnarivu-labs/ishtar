import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import admin from 'firebase-admin';

export const conversationDeleteListener = onDocumentDeleted(
  {
    document: 'users/{currentUserUid}/conversations/{conversationId}',
    timeoutSeconds: 300,
    retry: false,
  },
  async (event) => {
    const { currentUserUid, conversationId } = event.params;

    const bucket = admin.storage().bucket();
    const prefix = `userFiles/${currentUserUid}/${conversationId}`;

    try {
      await bucket.deleteFiles({
        prefix,
      });

      console.log(`Storage data in folder ${prefix} deleted successfully.`);
    } catch (e) {
      console.error(`Error deleting storage data with prefix: ${prefix}`, e);
    }
  },
);
