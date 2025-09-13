import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * A scheduled function that runs daily to clean up conversations marked for deletion.
 */
export const cleanupDeletedConversations = onSchedule(
  {
    schedule: 'every day 08:30',
    timeZone: 'Asia/Kolkata',
    timeoutSeconds: 300,
    retryCount: 0,
  },
  async () => {
    await doCleanUpConversations();
  },
);

const doCleanUpConversations = async () => {
  logger.log('Starting scheduled job: cleanupDeletedConversations');
  const db = getFirestore();

  let totalDeletedCount = 0;

  try {
    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
      logger.log('No users found. Exiting job.');
      return;
    }

    for (const userDoc of usersSnapshot.docs) {
      const conversationsQuery = userDoc.ref
        .collection('conversations')
        .where('isDeleted', '==', true);

      const conversationsToDelete = await conversationsQuery.get();

      if (conversationsToDelete.empty) {
        logger.log(`No conversations to delete for user: ${userDoc.id}`);
        continue;
      }

      for (const convDoc of conversationsToDelete.docs) {
        logger.log(
          `Deleting conversation ${convDoc.id} for user ${userDoc.id}`,
        );

        await recursiveDelete(convDoc.ref);

        totalDeletedCount++;
      }
    }

    logger.log(
      `Job finished. Total conversations deleted: ${totalDeletedCount}`,
    );
  } catch (error) {
    logger.error('Error during cleanupDeletedConversations job:', error);
  }
};

async function recursiveDelete(docRef: FirebaseFirestore.DocumentReference) {
  const db = getFirestore();
  const collections = await docRef.listCollections();

  for (const collection of collections) {
    const snapshot = await collection.get();

    if (snapshot.size === 0) {
      continue;
    }

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.log(
      `Deleted ${snapshot.size} documents from subcollection: ${collection.id}`,
    );
  }

  await docRef.delete();
}
