/**
 * setAdminClaim.mjs
 * Sets `admin: true` as a Firebase Auth custom claim on a given user.
 * Firestore rules check request.auth.token.admin == true — this is
 * what flips admin access on for that account.
 *
 * Usage:
 *   node scripts/setAdminClaim.mjs <email>
 *   node scripts/setAdminClaim.mjs --unset <email>
 *   node scripts/setAdminClaim.mjs --list
 *
 * Examples:
 *   node scripts/setAdminClaim.mjs larryfgordon89@gmail.com
 *   node scripts/setAdminClaim.mjs --list
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
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
const auth = getAuth();

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/setAdminClaim.mjs <email>');
  console.error('       node scripts/setAdminClaim.mjs --unset <email>');
  console.error('       node scripts/setAdminClaim.mjs --list');
  process.exit(1);
}

async function setAdmin(email, admin) {
  const user = await auth.getUserByEmail(email);
  const existing = user.customClaims || {};
  const next = admin
    ? { ...existing, admin: true }
    : Object.fromEntries(Object.entries(existing).filter(([k]) => k !== 'admin'));
  await auth.setCustomUserClaims(user.uid, next);
  console.log(`✓ ${email} (${user.uid}) — admin ${admin ? 'GRANTED' : 'REVOKED'}`);
  console.log(`  claims: ${JSON.stringify(next)}`);
  console.log(`  note: user must sign out + back in (or force token refresh) for the claim to take effect.`);
}

async function listAdmins() {
  let pageToken;
  const admins = [];
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const u of page.users) {
      if (u.customClaims?.admin === true) {
        admins.push({ uid: u.uid, email: u.email });
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  if (admins.length === 0) {
    console.log('No users have admin: true.');
  } else {
    console.log(`${admins.length} admin(s):`);
    for (const a of admins) console.log(`  ${a.email}  (${a.uid})`);
  }
}

try {
  if (args[0] === '--list') {
    await listAdmins();
  } else if (args[0] === '--unset') {
    if (!args[1]) { console.error('--unset requires an email'); process.exit(1); }
    await setAdmin(args[1], false);
  } else {
    await setAdmin(args[0], true);
  }
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
