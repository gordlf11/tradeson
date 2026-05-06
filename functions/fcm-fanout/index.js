/**
 * FCM fan-out Cloud Function (Gen 2).
 *
 * Subscribes to Pub/Sub topic `tradeson-events` (published by Cloud Run
 * `tradeson-api` via `api/src/services/pubsub.ts`). For each event:
 *
 *   1. Read the recipient's FCM token from Firestore `users/{targetUserId}.fcmToken`.
 *   2. Send the notification via `admin.messaging().send()`.
 *
 * Idempotency: Pub/Sub may deliver the same message more than once. Pushes
 * with the same notification body are tolerable (mobile OSes coalesce
 * adjacent identical pushes within seconds), so no dedup table.
 *
 * Failure handling: token missing or stale → log + ack (no retry). Any other
 * exception → throw → Pub/Sub retries with exponential backoff. Cap is set
 * by the subscription config (deploy script uses 5 attempts).
 *
 * Deploy:
 *   gcloud pubsub topics create tradeson-events
 *   gcloud functions deploy fcm-fanout \
 *     --gen2 --region us-central1 --runtime nodejs20 \
 *     --entry-point fanout \
 *     --trigger-topic tradeson-events \
 *     --source functions/fcm-fanout
 */

const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    // Cloud Functions auto-resolve credentials from the runtime service account.
    projectId: 'tradeson-491518',
  });
}

const messaging = admin.messaging();
const firestore = admin.firestore();

functions.cloudEvent('fanout', async (cloudEvent) => {
  const messageData = cloudEvent.data?.message?.data;
  if (!messageData) {
    console.warn('Pub/Sub event had no data; skipping.');
    return;
  }

  let evt;
  try {
    evt = JSON.parse(Buffer.from(messageData, 'base64').toString('utf8'));
  } catch (err) {
    console.error('Could not parse Pub/Sub payload as JSON:', err);
    return; // ack — bad payload is not retryable
  }

  const { event, targetUserId, title, body, data } = evt;
  if (!targetUserId || !title) {
    console.warn(`[${event}] missing targetUserId or title — skipping`);
    return;
  }

  // Look up FCM token from Firestore. The client writes this on auth state
  // change in AuthContext.tsx (commit d026489).
  let token;
  try {
    const snap = await firestore.collection('users').doc(targetUserId).get();
    token = snap.exists ? snap.data().fcmToken : null;
  } catch (err) {
    console.error(`[${event}] firestore lookup failed for ${targetUserId}:`, err);
    throw err; // retryable — Firestore hiccup
  }

  if (!token) {
    console.info(`[${event}] no fcmToken for user ${targetUserId} — skipping push`);
    return;
  }

  try {
    const messageId = await messaging.send({
      token,
      notification: { title, body: body || '' },
      data: data || {},
    });
    console.info(`[${event}] push sent to ${targetUserId} (messageId=${messageId})`);
  } catch (err) {
    // unregistered / invalid token → don't retry (the user just needs a fresh token)
    if (err?.code === 'messaging/registration-token-not-registered'
        || err?.code === 'messaging/invalid-registration-token') {
      console.warn(`[${event}] stale token for ${targetUserId} — clearing`);
      await firestore.collection('users').doc(targetUserId).update({ fcmToken: null }).catch(() => {});
      return;
    }
    console.error(`[${event}] FCM send failed for ${targetUserId}:`, err);
    throw err; // retryable — Pub/Sub will redeliver
  }
});
