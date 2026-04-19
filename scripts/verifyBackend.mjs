/**
 * verifyBackend.mjs
 * Prints a snapshot of Firestore state so you can show data flow during the
 * demo. For Postgres stats, paste the SQL from docs/DEMO_RUNBOOK.md into
 * Cloud SQL Studio — Postgres credentials are not available from this
 * workstation.
 *
 * Usage:
 *   node scripts/verifyBackend.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = join(__dirname, 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch {
  console.error(`Missing ${keyPath}. See CLAUDE.md.`);
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const fmt = (ts) => ts instanceof Timestamp ? ts.toDate().toISOString() : ts;

async function count(collection) {
  const snap = await db.collection(collection).count().get();
  return snap.data().count;
}

async function latest(collection, n = 3, orderBy = 'createdAt') {
  try {
    const snap = await db.collection(collection).orderBy(orderBy, 'desc').limit(n).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await db.collection(collection).limit(n).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }
}

function row(label, value) {
  console.log(`  ${label.padEnd(24)} ${value}`);
}

function header(text) {
  console.log(`\n${'─'.repeat(60)}\n${text}\n${'─'.repeat(60)}`);
}

async function main() {
  header('TradesOn — Firestore snapshot');
  console.log(`Project: ${serviceAccount.project_id}`);
  console.log(`Time:    ${new Date().toISOString()}`);

  header('Collection counts');
  for (const c of ['threads', 'reviews', 'audit_log', 'jobs', 'quotes', 'users',
                   'compliance_submissions', 'flagged_accounts', 'platform_metrics']) {
    try {
      row(c, await count(c));
    } catch (err) {
      row(c, `(error: ${err.message})`);
    }
  }

  header('Most recent threads (last 3)');
  const threads = await latest('threads', 3, 'lastMessageAt');
  if (threads.length === 0) {
    console.log('  (no threads yet)');
  } else {
    for (const t of threads) {
      console.log(`  • thread ${t.id}`);
      row('  jobTitle', t.jobTitle || '(none)');
      row('  participants', (t.participants || []).join(', '));
      row('  lastMessage', (t.lastMessage || '').slice(0, 60));
      row('  lastMessageAt', fmt(t.lastMessageAt));

      // Peek at messages subcollection
      const msgs = await db.collection('threads').doc(t.id).collection('messages')
        .orderBy('createdAt', 'desc').limit(2).get();
      row('  message count', msgs.size);
      for (const m of msgs.docs) {
        const d = m.data();
        console.log(`    ↳ ${fmt(d.createdAt)} — ${d.senderName || d.senderId}: ${(d.text || '').slice(0, 50)}`);
      }
    }
  }

  header('Most recent reviews (last 3)');
  const reviews = await latest('reviews', 3, 'createdAt');
  if (reviews.length === 0) {
    console.log('  (no reviews yet)');
  } else {
    for (const r of reviews) {
      console.log(`  • ${r.rating}/5 — ${r.reviewerName || r.reviewerId} on ${r.tradespersonName || r.tradespersonId}`);
      row('  jobTitle', r.jobTitle || '(none)');
      row('  body', (r.body || '').slice(0, 60));
      row('  createdAt', fmt(r.createdAt));
    }
  }

  header('Next steps');
  console.log('  1. Run the SQL from docs/DEMO_RUNBOOK.md in Cloud SQL Studio.');
  console.log('  2. Watch counts move as you exercise the flow.');
  console.log('');
  process.exit(0);
}

main().catch(err => {
  console.error('verifyBackend error:', err);
  process.exit(1);
});
