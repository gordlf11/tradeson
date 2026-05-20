/**
 * Aggressive Firebase Auth cleanup.
 * Deletes every UID listed in /tmp/uids_to_delete.json, batched in groups of
 * 1000 (Admin SDK max). Preserves only the two admin emails:
 *   - larryfgordon89@gmail.com
 *   - kevinbradfo@gmail.com
 *
 * Uses Application Default Credentials. Run from tradeson root so it picks up
 * the firebase-admin install.
 */
import admin from 'firebase-admin';
import { readFileSync } from 'fs';

admin.initializeApp({ projectId: 'tradeson-491518' });

const uids = JSON.parse(readFileSync('/tmp/uids_to_delete.json', 'utf-8'));
console.log(`Loaded ${uids.length} UIDs to delete.`);

const BATCH = 1000;
let totalOk = 0;
let totalFail = 0;
for (let i = 0; i < uids.length; i += BATCH) {
  const slice = uids.slice(i, i + BATCH);
  const result = await admin.auth().deleteUsers(slice);
  totalOk += result.successCount;
  totalFail += result.failureCount;
  if (result.errors.length) {
    for (const e of result.errors) {
      console.error(`  FAIL uid=${slice[e.index]} :: ${e.error.message}`);
    }
  }
}
console.log(`\nDeleted: ${totalOk}  Failed: ${totalFail}`);

// Re-list to confirm only admins remain
console.log('\nRemaining users:');
let next;
let count = 0;
do {
  const page = await admin.auth().listUsers(1000, next);
  for (const u of page.users) {
    console.log(`  ${(u.email || '(no email)').padEnd(35)}  uid=${u.uid}`);
    count++;
  }
  next = page.pageToken;
} while (next);
console.log(`\nTotal remaining: ${count}`);
process.exit(totalFail > 0 ? 1 : 0);
