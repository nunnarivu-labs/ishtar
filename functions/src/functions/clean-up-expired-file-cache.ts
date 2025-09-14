import { onSchedule } from 'firebase-functions/v2/scheduler';
import { logger } from 'firebase-functions';
import { getFirestore } from 'firebase-admin/firestore';

export const cleanUpExpiredFileCache = onSchedule(
  {
    schedule: 'every day 09:30',
    timeZone: 'Asia/Kolkata',
    timeoutSeconds: 300,
    retryCount: 0,
  },
  async () => {
    await doCleanUpExpiredFileCache();
  },
);

const doCleanUpExpiredFileCache = async () => {
  logger.log('Starting scheduled job: doCleanUpExpiredFileCache');
  const db = getFirestore();

  try {
    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
      logger.log('No users found. Exiting job.');
      return;
    }

    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - 45);

    for (const userDoc of usersSnapshot.docs) {
      const conversationsQuery = userDoc.ref.collection('conversations');
      const conversationsSnapshot = await conversationsQuery.get();

      if (conversationsSnapshot.empty) {
        logger.log(`No conversations for user: ${userDoc.id}`);
        continue;
      }

      for (const convDoc of conversationsSnapshot.docs) {
        const fileCacheQuery = convDoc.ref
          .collection('fileCache')
          .where('createdAt', '<=', cutoff);
        const fileCacheSnapshot = await fileCacheQuery.get();

        if (fileCacheSnapshot.empty) {
          logger.log(
            `No file cache to delete in conversation ${convDoc.id} for user ${userDoc.id}`,
          );
        }

        const batch = db.batch();
        const cacheCount = fileCacheSnapshot.size;

        fileCacheSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });

        await batch.commit();

        logger.log(
          `Removed ${cacheCount} cached files in conversation ${convDoc.id} for user ${userDoc.id}`,
        );
      }
    }

    logger.log('Job finished');
  } catch (error) {
    logger.error('Error during doCleanUpExpiredFileCache job:', error);
  }
};

// setTimeout(() => doCleanUpExpiredFileCache(), 1000);
