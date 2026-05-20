/**
 * testPubsub.mjs — publish test events to the tradeson-events topic.
 *
 * Verifies the publisher → topic → fan-out function path end-to-end.
 * Larry watches Cloud Function logs (`fcm-fanout`) to confirm each
 * event was consumed and FCM send was attempted.
 *
 * Usage:
 *   node scripts/testPubsub.mjs                # publish one of each event
 *   node scripts/testPubsub.mjs --uid=<fbUID>  # target a real Firebase UID
 *
 * Without --uid, events use a sentinel UID. The fan-out function will
 * log "no fcmToken for user — skipping push" rather than actually
 * sending. That's fine — we're testing the topic + function wiring,
 * not delivery.
 *
 * Auth: uses Application Default Credentials (your `gcloud auth
 * application-default login` user, which typically has Project Owner
 * and therefore pubsub.publisher). Pass --use-key to use the
 * Firebase Admin SDK service account key instead — but note that
 * SA needs roles/pubsub.publisher granted explicitly first.
 */

import { PubSub } from '@google-cloud/pubsub';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'tradeson-491518';
const TOPIC = 'tradeson-events';

const args = Object.fromEntries(
  process.argv.slice(2).map(a => a.startsWith('--') ? a.slice(2).split('=') : [a, true])
);
const targetUid = args.uid || 'TEST-UID-no-fcm-token-expected';

// Default to ADC (your gcloud user account — has Project Owner / publish rights).
// Opt into the Firebase Admin SA key with --use-key, but it needs pubsub.publisher
// granted explicitly first.
let pubsub;
if (args['use-key']) {
  const keyPath = join(__dirname, 'serviceAccountKey.json');
  if (!existsSync(keyPath)) {
    console.error(`--use-key: ${keyPath} not found`);
    process.exit(1);
  }
  pubsub = new PubSub({ projectId: PROJECT_ID, keyFilename: keyPath });
  console.log(`auth: service account key (${keyPath})`);
} else {
  pubsub = new PubSub({ projectId: PROJECT_ID });
  console.log('auth: Application Default Credentials (~/.config/gcloud/application_default_credentials.json)');
}

// Match the publisher's payload shape exactly so the fan-out function
// processes them the same way as a real Cloud Run publish.
const events = [
  {
    event: 'job.created',
    targetUserId: targetUid,
    title: 'Your job is live',
    body: '[TEST] Looking for a kitchen sink leak repair — waiting for quotes.',
    data: { jobId: 'test-job-001', category: 'plumbing' },
  },
  {
    event: 'quote.submitted',
    targetUserId: targetUid,
    title: 'New Quote Received',
    body: '[TEST] Bob the Plumber submitted a quote for $250',
    data: { jobId: 'test-job-001', quoteId: 'test-quote-001', type: 'quote_received' },
  },
  {
    event: 'quote.accepted',
    targetUserId: targetUid,
    title: 'Bid Accepted!',
    body: '[TEST] Larry G. accepted your quote for $250',
    data: { jobId: 'test-job-001', quoteId: 'test-quote-001', type: 'quote_accepted' },
  },
  {
    event: 'job.status_changed',
    targetUserId: targetUid,
    title: 'Job status updated',
    body: '[TEST] Your job is now in_progress',
    data: { jobId: 'test-job-001', from: 'scheduled', to: 'in_progress' },
  },
];

const topic = pubsub.topic(TOPIC);

console.log(`\nPublishing ${events.length} test events to ${PROJECT_ID}/topics/${TOPIC}\n`);

let ok = 0;
let failed = 0;
for (const evt of events) {
  try {
    const messageId = await topic.publishMessage({
      data: Buffer.from(JSON.stringify(evt)),
      attributes: { event: evt.event },
    });
    console.log(`  ✓ ${evt.event.padEnd(22)} messageId=${messageId}`);
    ok++;
  } catch (err) {
    console.error(`  ✗ ${evt.event.padEnd(22)} ${err.code ?? ''} ${err.message}`);
    if (err.code === 7) {
      console.error('    hint: PERMISSION_DENIED — the service account needs roles/pubsub.publisher on the project.');
    }
    if (err.code === 5) {
      console.error('    hint: NOT_FOUND — confirm the topic exists: gcloud pubsub topics describe tradeson-events');
    }
    failed++;
  }
}

console.log(`\nResult: ${ok} published, ${failed} failed.`);
console.log('\nNext: check Cloud Function logs to see if fcm-fanout consumed each event:');
console.log('  gcloud functions logs read fcm-fanout --region us-central1 --limit 20');
console.log('  (or in console: Cloud Functions → fcm-fanout → Logs)');

process.exit(failed > 0 ? 1 : 0);
