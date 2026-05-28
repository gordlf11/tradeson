/**
 * inviteAdmin.mjs
 * Creates a Firebase Auth user (if missing), grants admin: true custom
 * claim, and generates a password-reset link so the invitee can set
 * their own password without ever sharing one with us.
 *
 * Useful when the admin account is a Google Workspace email that has
 * never signed into the app — setAdminClaim.mjs requires the user to
 * exist already.
 *
 * Usage:
 *   node scripts/inviteAdmin.mjs <email>
 *
 * Example:
 *   node scripts/inviteAdmin.mjs contact@tradeson.io
 *
 * Prints a URL — paste into the browser (or email yourself) to set
 * the password. Link is single-use and expires per Firebase defaults.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { randomBytes } from 'crypto';

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

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/inviteAdmin.mjs <email>');
  process.exit(1);
}

async function getOrCreateUser(email) {
  try {
    const user = await auth.getUserByEmail(email);
    console.log(`✓ User already exists — uid: ${user.uid}`);
    return { user, created: false };
  } catch (err) {
    if (err.code !== 'auth/user-not-found') throw err;
    const tempPassword = randomBytes(24).toString('base64');
    const user = await auth.createUser({
      email,
      password: tempPassword,
      emailVerified: false,
    });
    console.log(`✓ Created new user — uid: ${user.uid}`);
    return { user, created: true };
  }
}

try {
  const { user, created } = await getOrCreateUser(email);

  const existing = user.customClaims || {};
  if (existing.admin === true) {
    console.log(`✓ admin claim already set`);
  } else {
    await auth.setCustomUserClaims(user.uid, { ...existing, admin: true });
    console.log(`✓ admin claim GRANTED — claims: ${JSON.stringify({ ...existing, admin: true })}`);
  }

  // Use Firebase's default password-reset landing page. Pointing the
  // continueUrl at app.tradeson.io requires that domain be in the
  // Firebase Console authorized-domains allowlist (Auth → Settings →
  // Authorized domains). If you add it, you can pass:
  //   { url: 'https://app.tradeson.io/login', handleCodeInApp: false }
  const link = await auth.generatePasswordResetLink(email);

  console.log('');
  console.log('───────────────────────────────────────────────────────────');
  console.log('Password-reset link (single-use, valid ~1 hour):');
  console.log('');
  console.log(link);
  console.log('───────────────────────────────────────────────────────────');
  console.log('');
  console.log(`Next steps:`);
  console.log(`  1. Open the link above in your browser`);
  console.log(`  2. Set a new password for ${email}`);
  console.log(`  3. Sign in at https://app.tradeson.io/login`);
  console.log(`  4. (Token won't carry admin:true until next sign-in)`);
  if (created) {
    console.log('');
    console.log('Note: this account is new and has no PG profile row.');
    console.log('After first sign-in it will land on /role-selection');
    console.log('like any new user. That is fine for admin use.');
  }
  process.exit(0);
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
