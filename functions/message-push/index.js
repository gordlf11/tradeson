/**
 * message-push — Firestore-triggered FCM push for new chat messages.
 *
 * Messaging lives entirely in Firestore (see CLAUDE.md "Architecture"), so —
 * unlike quote/job/compliance events, which go through Postgres → Pub/Sub →
 * `fcm-fanout` — message pushes are driven directly off the Firestore write.
 *
 * Trigger: a new doc at threads/{threadId}/messages/{messageId}.
 * Each message doc carries `recipientUID`, `senderName`, `text` (written by
 * src/services/messagingService.ts → sendMessage), so the recipient and copy
 * are available with no extra read.
 *
 * Delivery: look up users/{recipientUID}.fcmToken (Firebase-UID-keyed, same
 * collection fcm-fanout uses) and send. recipientUID is always the OTHER
 * participant, so there's no self-notification.
 *
 * Isolated codebase `message-push` in firebase.json so it deploys WITHOUT
 * touching the gcloud-managed fcm-fanout:
 *   firebase deploy --only functions:message-push --project tradeson-491518
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

if (!admin.apps.length) admin.initializeApp();

// Compute region within the nam5 (US multi-region) Firestore location.
setGlobalOptions({ region: 'us-central1' });

exports.messagePush = onDocumentCreated(
  'threads/{threadId}/messages/{messageId}',
  async (event) => {
    const snap = event.data;
    if (!snap) return;
    const msg = snap.data() || {};

    const recipientUID = msg.recipientUID;
    if (!recipientUID) {
      console.info(`[message-push] no recipientUID on ${event.params.messageId} — skipping`);
      return;
    }

    // Token lookup — same Firestore users/{firebaseUid}.fcmToken contract as fcm-fanout.
    let token;
    try {
      const userSnap = await admin.firestore().collection('users').doc(recipientUID).get();
      token = userSnap.exists ? userSnap.data().fcmToken : null;
    } catch (err) {
      console.error(`[message-push] token lookup failed for ${recipientUID}:`, err);
      throw err; // retryable — Firestore hiccup
    }
    if (!token) {
      console.info(`[message-push] no fcmToken for ${recipientUID} — skipping push`);
      return;
    }

    const title = (msg.senderName || 'New message').slice(0, 65);
    const body = (msg.text || '').slice(0, 140);

    try {
      const messageId = await admin.messaging().send({
        token,
        notification: { title, body },
        data: {
          type: 'message',
          threadId: String(event.params.threadId),
          messageId: String(event.params.messageId),
        },
      });
      console.info(`[message-push] sent to ${recipientUID} (messageId=${messageId})`);
    } catch (err) {
      // Stale/invalid token → clear it, don't retry.
      if (err && (err.code === 'messaging/registration-token-not-registered'
                || err.code === 'messaging/invalid-registration-token')) {
        console.warn(`[message-push] stale token for ${recipientUID} — clearing`);
        await admin.firestore().collection('users').doc(recipientUID)
          .update({ fcmToken: null }).catch(() => {});
        return;
      }
      console.error(`[message-push] FCM send failed for ${recipientUID}:`, err);
      throw err; // retryable
    }
  }
);
