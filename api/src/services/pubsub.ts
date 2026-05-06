import { PubSub } from '@google-cloud/pubsub';

/**
 * Best-effort Pub/Sub publisher for cross-service events.
 *
 * Cloud Run routes call publish() after a user-facing PG write to trigger
 * downstream consumers (FCM fan-out, BigQuery sync, future workflows).
 * Per CLAUDE.md → "Architecture": every Cloud Run write should emit an
 * event so consumers can attach later without retrofitting routes.
 *
 * Failures are swallowed and logged. The user-facing write must NEVER be
 * blocked by a publish failure — that would couple two SLOs together for
 * no real benefit (the push is an enhancement, not the contract).
 *
 * Topic: `tradeson-events`. One topic for everything; consumers filter by
 * the `event` attribute. Cheap, simple, easy to add new event types.
 */

const TOPIC_NAME = process.env.PUBSUB_TOPIC ?? 'tradeson-events';

// Lazy-init so local dev (no GCP credentials) doesn't crash the API on boot.
let _pubsub: PubSub | null = null;
function client(): PubSub {
  if (!_pubsub) _pubsub = new PubSub({ projectId: 'tradeson-491518' });
  return _pubsub;
}

export type EventName =
  | 'job.created'
  | 'job.status_changed'
  | 'quote.submitted'
  | 'quote.accepted'
  | 'message.sent'
  | 'compliance.decided'
  | 'resolution.applied';

export interface FcmEvent {
  /** Stable event identifier — consumers filter on this. */
  event: EventName;
  /** Recipient firebase_uid. The fan-out function looks up users/{uid}.fcmToken. */
  targetUserId: string;
  /** Push notification title (≤ 65 chars renders well on iOS/Android). */
  title: string;
  /** Push notification body (≤ 240 chars). */
  body: string;
  /** Arbitrary key/value pairs the client can read in onMessage. All values must be strings. */
  data?: Record<string, string>;
}

export async function publish(evt: FcmEvent): Promise<void> {
  try {
    const topic = client().topic(TOPIC_NAME);
    const payload = Buffer.from(JSON.stringify(evt));
    await topic.publishMessage({ data: payload, attributes: { event: evt.event } });
  } catch (err: any) {
    // Don't throw — the user-facing write already succeeded.
    console.warn(`[pubsub] publish ${evt.event} failed (non-blocking):`, err?.message ?? err);
  }
}
