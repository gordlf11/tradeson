/**
 * List all Firestore threads + their messages so we can find Kevin's reply
 * (or confirm it never arrived).
 */
import admin from 'firebase-admin';
admin.initializeApp({ projectId: 'tradeson-491518' });
const db = admin.firestore();

const threads = await db.collection('threads').get();
console.log(`Total threads: ${threads.size}\n`);

for (const t of threads.docs) {
  const d = t.data();
  const jobTitle = d.jobTitle || '(no title)';
  console.log(`THREAD ${t.id}`);
  console.log(`  jobId: ${d.jobId}`);
  console.log(`  jobTitle: ${jobTitle}`);
  console.log(`  participants: ${JSON.stringify(d.participants)}`);
  console.log(`  participantNames: ${JSON.stringify(d.participantNames)}`);
  console.log(`  lastMessage: ${d.lastMessage}`);
  console.log(`  lastMessageAt: ${d.lastMessageAt?.toDate?.()?.toISOString?.() ?? d.lastMessageAt}`);

  const msgs = await db.collection('threads').doc(t.id).collection('messages').orderBy('createdAt').get();
  console.log(`  messages (${msgs.size}):`);
  for (const m of msgs.docs) {
    const md = m.data();
    const ts = md.createdAt?.toDate?.()?.toISOString?.() ?? '(no ts)';
    console.log(`    [${ts}] ${md.senderName || md.senderId}: ${md.text}`);
  }
  console.log();
}
process.exit(0);
