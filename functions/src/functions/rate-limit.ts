import admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';
import { db } from '../index';

const GUEST_RATE_LIMIT_COLLECTION = 'guest_rate_limits';
const GUEST_RATE_LIMIT_COUNT = 10;

/**
 * Checks if a guest user's IP is within the daily request limit.
 * Throws an HttpsError if the limit is exceeded.
 * @param ip The user's IP address.
 */
export async function checkGuestRateLimit(ip: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const docRef = db.collection(GUEST_RATE_LIMIT_COLLECTION).doc(ip);

  try {
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);

      if (!doc.exists || doc.data()?.day !== today) {
        transaction.set(docRef, {
          count: 1,
          day: today,
        });

        return;
      }

      const data = doc.data();
      const currentCount = data?.count || 0;

      if (currentCount >= GUEST_RATE_LIMIT_COUNT) {
        throw new HttpsError(
          'resource-exhausted',
          `You have exceeded the daily limit of ${GUEST_RATE_LIMIT_COUNT} requests.`,
        );
      } else {
        transaction.update(docRef, { count: admin.firestore.FieldValue.increment(1) });
        return;
      }
    });
  } catch (error) {
    if (error instanceof HttpsError) {
      console.warn(`Rate limit exceeded for guest IP: ${ip}`);
      throw error;
    }

    console.error('Error during rate limit transaction:', error);
    throw new HttpsError(
      'internal',
      'Could not process rate limit check. Please try again.',
    );
  }
}
