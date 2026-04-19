/**
 * seedFirestore.mjs
 * Seeds Firestore with 2-3 rows per collection to match the app's synthetic data.
 *
 * Usage:
 *   node scripts/seedFirestore.mjs
 *
 * Prerequisites:
 *   1. Download a service account key from Firebase Console:
 *      Project Settings → Service Accounts → Generate new private key
 *   2. Save as: scripts/serviceAccountKey.json
 *   3. npm install firebase-admin  (one-time)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let serviceAccount;
try {
  serviceAccount = JSON.parse(
    readFileSync(join(__dirname, 'serviceAccountKey.json'), 'utf8')
  );
} catch {
  console.error('❌  Missing scripts/serviceAccountKey.json');
  console.error('   Download from: Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ── Helpers ───────────────────────────────────────────────────────────────

const now = Timestamp.now();
const daysAgo = (n) => Timestamp.fromMillis(Date.now() - n * 86_400_000);
const hoursAgo = (n) => Timestamp.fromMillis(Date.now() - n * 3_600_000);

async function upsertCollection(collectionName, docs) {
  console.log(`\n📂  Seeding: ${collectionName}`);
  for (const doc of docs) {
    const { id, ...data } = doc;
    await db.collection(collectionName).doc(id).set(data, { merge: true });
    console.log(`   ✓  ${id}`);
  }
}

// ── Collection: users ─────────────────────────────────────────────────────

const users = [
  {
    id: 'user-homeowner-1',
    fullName: 'Sarah Mitchell',
    email: 'sarah.mitchell@example.com',
    role: 'homeowner',
    phone: '+1-310-555-0101',
    address: '742 Evergreen Terrace, Beverly Hills, CA 90210',
    serviceRadius: '25',
    serviceInterests: ['Plumbing', 'Electrical', 'HVAC'],
    hasOnboarded: true,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },
  {
    id: 'user-tradesperson-1',
    fullName: 'Carlos Rivera',
    email: 'carlos@plumb.co',
    businessName: 'Rivera Plumbing LLC',
    role: 'licensed-trade',
    primaryTrade: 'Plumbing',
    phone: '+1-310-555-0202',
    licenseNumber: 'PL-99123',
    licenseState: 'CA',
    licenseExpiry: '2026-08-01',
    insuranceCoverage: '$1,000,000',
    insuranceExpiry: '2025-12-31',
    serviceRadius: '20',
    areasServed: ['90210', '90211', '90212'],
    rating: 4.9,
    reviewCount: 87,
    jobsCompleted: 143,
    isVerified: true,
    isActive: true,
    hasOnboarded: true,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },
  {
    id: 'user-tradesperson-2',
    fullName: 'Amy Watts',
    email: 'amy@watts-electric.com',
    businessName: 'Watts Electric',
    role: 'licensed-trade',
    primaryTrade: 'Electrical',
    phone: '+1-310-555-0303',
    licenseNumber: 'EL-44021',
    licenseState: 'CA',
    licenseExpiry: '2025-09-15',
    insuranceCoverage: '$500,000',
    insuranceExpiry: '2025-07-01',
    serviceRadius: '30',
    areasServed: ['90210', '90211'],
    rating: 4.6,
    reviewCount: 52,
    jobsCompleted: 78,
    isVerified: false, // pending compliance
    isActive: true,
    hasOnboarded: true,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(0),
  },
  {
    id: 'user-property-manager-1',
    fullName: 'Diana Chen',
    email: 'diana@apexproperties.com',
    companyName: 'Apex Property Management',
    role: 'property-manager',
    phone: '+1-310-555-0404',
    serviceRadius: '40',
    propertiesManaged: 12,
    hasOnboarded: true,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(5),
  },
];

// ── Collection: jobs ──────────────────────────────────────────────────────

const jobs = [
  {
    id: 'job-001',
    customerId: 'user-homeowner-1',
    customerName: 'Sarah Mitchell',
    title: 'Kitchen Sink Leak Repair',
    description: 'Pipe under the kitchen sink is leaking when water is run. Started about 2 days ago and is getting worse. The cabinet below is starting to show water damage.',
    category: 'Plumbing',
    tradeId: 'plumbing',
    severity: 'urgent',
    jobNature: 'Repair / Fix',
    address: '742 Evergreen Terrace, Beverly Hills, CA 90210',
    status: 'open',
    expiresInHours: 18,
    distance: 2.1,
    estimatedCost: [150, 300],
    aiSummary: 'P-trap failure or drain seal issue. Likely requires P-trap replacement and resealing. Parts and labour 1.5–2 hrs.',
    likelihoodScore: 92,
    photos: [],
    quotesCount: 2,
    createdAt: hoursAgo(3),
    updatedAt: hoursAgo(1),
  },
  {
    id: 'job-002',
    customerId: 'user-homeowner-1',
    customerName: 'Sarah Mitchell',
    title: 'Bathroom Light Fixture Install',
    description: 'Need to replace the existing bathroom vanity light fixture with a new one I purchased. The old one has been flickering for months.',
    category: 'Electrical',
    tradeId: 'electrical',
    severity: 'moderate',
    jobNature: 'Routine Maintenance',
    address: '742 Evergreen Terrace, Beverly Hills, CA 90210',
    status: 'open',
    expiresInHours: 36,
    distance: 3.8,
    estimatedCost: [120, 200],
    aiSummary: 'Vanity fixture swap. Standard installation — existing wiring likely compatible. 1 hr labour.',
    likelihoodScore: 78,
    photos: [],
    quotesCount: 1,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: 'job-003',
    customerId: 'user-property-manager-1',
    customerName: 'Diana Chen',
    title: 'AC Unit Not Cooling — Unit 4B',
    description: 'Central AC stopped cooling 2 days ago. Outside temperature is 95°F. Tenant has elderly resident. Emergency response requested.',
    category: 'HVAC',
    tradeId: 'hvac',
    severity: 'urgent',
    jobNature: 'Repair / Fix',
    address: '8800 Wilshire Blvd #4B, Beverly Hills, CA 90211',
    status: 'accepted',
    acceptedQuoteId: 'quote-003a',
    acceptedTradespersonId: 'user-tradesperson-2',
    scheduledDate: '2026-04-14',
    scheduledTime: '09:00',
    expiresInHours: 0,
    distance: 1.4,
    estimatedCost: [300, 600],
    aiSummary: 'Likely refrigerant leak or compressor fault. Full HVAC inspection required. 2–4 hr job.',
    likelihoodScore: 95,
    photos: [],
    quotesCount: 3,
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(6),
  },
];

// ── Collection: quotes ────────────────────────────────────────────────────

const quotes = [
  {
    id: 'quote-001a',
    jobId: 'job-001',
    tradespersonId: 'user-tradesperson-1',
    tradespersonName: 'Rivera Plumbing LLC',
    isVerified: true,
    reviewCount: 87,
    totalPrice: 195,
    estimatedHours: 2,
    hourlyOverage: 75,
    message: 'I can fix this today. P-trap replacement and reseal — have parts on the truck.',
    submittedAt: hoursAgo(1),
    status: 'pending',
    createdAt: hoursAgo(1),
  },
  {
    id: 'quote-001b',
    jobId: 'job-001',
    tradespersonId: 'user-tradesperson-2',
    tradespersonName: 'Watts Electric',
    isVerified: true,
    reviewCount: 52,
    totalPrice: 175,
    estimatedHours: 3,
    hourlyOverage: 65,
    message: 'Likely a P-trap or drain seal issue. Will inspect and quote on-site if scope changes.',
    submittedAt: hoursAgo(2),
    status: 'pending',
    createdAt: hoursAgo(2),
  },
  {
    id: 'quote-003a',
    jobId: 'job-003',
    tradespersonId: 'user-tradesperson-2',
    tradespersonName: 'Watts Electric',
    isVerified: true,
    reviewCount: 52,
    totalPrice: 420,
    estimatedHours: 3,
    hourlyOverage: 90,
    message: 'Will do full refrigerant check and compressor diagnostics. Available tomorrow 9 AM.',
    submittedAt: daysAgo(1),
    status: 'accepted',
    createdAt: daysAgo(1),
  },
];

// ── Collection: compliance_submissions ───────────────────────────────────

const complianceSubmissions = [
  {
    id: 'cs-001',
    tradespersonId: 'user-tradesperson-1',
    tradespersonName: 'Carlos Rivera',
    email: 'carlos@plumb.co',
    tradeType: 'Plumbing',
    licenseNumber: 'PL-99123',
    licenseState: 'CA',
    licenseExpiry: '2026-08-01',
    insuranceCoverage: '$1,000,000',
    insuranceExpiry: '2025-12-31',
    hasGovId: true,
    hasLicenseDoc: true,
    hasInsuranceDoc: true,
    status: 'pending',
    adminNote: '',
    submittedAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
  },
  {
    id: 'cs-002',
    tradespersonId: 'user-tradesperson-2',
    tradespersonName: 'Amy Watts',
    email: 'amy@watts-electric.com',
    tradeType: 'Electrical',
    licenseNumber: 'EL-44021',
    licenseState: 'CA',
    licenseExpiry: '2025-09-15',
    insuranceCoverage: '$500,000',
    insuranceExpiry: '2025-07-01',
    hasGovId: true,
    hasLicenseDoc: false,
    hasInsuranceDoc: true,
    status: 'more_docs',
    adminNote: 'Missing professional license document.',
    submittedAt: hoursAgo(5),
    updatedAt: hoursAgo(4),
  },
  {
    id: 'cs-003',
    tradespersonId: 'user-tradesperson-3',
    tradespersonName: 'Dave Nguyen',
    email: 'dave@nguyenfix.com',
    tradeType: 'HVAC',
    licenseNumber: 'HV-20847',
    licenseState: 'CA',
    licenseExpiry: '2027-03-01',
    insuranceCoverage: '$2,000,000',
    insuranceExpiry: '2026-06-30',
    hasGovId: true,
    hasLicenseDoc: true,
    hasInsuranceDoc: true,
    status: 'approved',
    adminNote: '',
    submittedAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

// ── Collection: flagged_accounts ─────────────────────────────────────────

const flaggedAccounts = [
  {
    id: 'flag-001',
    userId: 'user-tradesperson-fake-1',
    name: 'Mike Johnson',
    email: 'mike.j@handyman.co',
    role: 'Tradesperson',
    flagReason: 'Open payment dispute filed by client',
    flagType: 'dispute',
    severity: 'high',
    flaggedAt: daysAgo(1),
    resolved: false,
    createdAt: daysAgo(1),
  },
  {
    id: 'flag-002',
    userId: 'user-tradesperson-fake-2',
    name: 'Lisa Torres',
    email: 'lisa.t@fixes.com',
    role: 'Tradesperson',
    flagReason: 'Average rating below 2.5 over last 30 days',
    flagType: 'poor_reviews',
    severity: 'medium',
    reviewCount: 8,
    avgRating: 2.3,
    flaggedAt: daysAgo(3),
    resolved: false,
    createdAt: daysAgo(3),
  },
  {
    id: 'flag-003',
    userId: 'user-tradesperson-fake-3',
    name: 'Bob Clark',
    email: 'bob@clarkhvac.com',
    role: 'Tradesperson',
    flagReason: 'Insurance certificate expired 14 days ago',
    flagType: 'expired_insurance',
    severity: 'high',
    flaggedAt: daysAgo(14),
    resolved: false,
    createdAt: daysAgo(14),
  },
];

// ── Collection: audit_log ─────────────────────────────────────────────────

const auditLog = [
  {
    id: 'audit-001',
    adminEmail: 'admin@tradeson.com',
    actionType: 'Account Approved',
    targetUser: 'Dave Nguyen',
    targetEmail: 'dave@nguyenfix.com',
    targetUserId: 'user-tradesperson-3',
    reason: 'All documents verified and valid.',
    timestamp: daysAgo(3),
    createdAt: daysAgo(3),
  },
  {
    id: 'audit-002',
    adminEmail: 'admin@tradeson.com',
    actionType: 'More Docs Requested',
    targetUser: 'Amy Watts',
    targetEmail: 'amy@watts-electric.com',
    targetUserId: 'user-tradesperson-2',
    reason: 'Missing professional license document.',
    timestamp: daysAgo(3),
    createdAt: daysAgo(3),
  },
  {
    id: 'audit-003',
    adminEmail: 'admin@tradeson.com',
    actionType: 'Temporary Suspension',
    targetUser: 'Mike Johnson',
    targetEmail: 'mike.j@handyman.co',
    targetUserId: 'user-tradesperson-fake-1',
    reason: 'Payment dispute unresolved for 7 days. Account suspended pending resolution.',
    suspendedUntil: '2026-04-21',
    timestamp: daysAgo(4),
    createdAt: daysAgo(4),
  },
];

// ── Collection: threads (messaging) ──────────────────────────────────────
// Schema matches src/services/messagingService.ts — participants array,
// not the customerId/tradespersonId columns used in the PG schema.

function buildThreadId(jobId, userId1, userId2) {
  const sorted = [userId1, userId2].sort().join('_');
  return `${jobId}__${sorted}`;
}

const threads = [
  {
    id: buildThreadId('job-003', 'user-property-manager-1', 'user-tradesperson-2'),
    jobId: 'job-003',
    jobTitle: 'AC Unit Not Cooling — Unit 4B',
    participants: ['user-property-manager-1', 'user-tradesperson-2'],
    participantNames: {
      'user-property-manager-1': 'Diana Chen',
      'user-tradesperson-2': 'Amy Watts',
    },
    lastMessage: 'See you tomorrow at 9 AM!',
    lastMessageAt: hoursAgo(4),
    createdAt: hoursAgo(6),
    jobStatus: 'accepted',
  },
];

// ── Collection: reviews ───────────────────────────────────────────────────

const reviews = [
  {
    id: 'review-001',
    jobId: 'job-003',
    reviewerId: 'user-homeowner-1',
    reviewerName: 'Sarah Mitchell',
    tradespersonId: 'user-tradesperson-1',
    tradespersonName: 'Rivera Plumbing LLC',
    rating: 5,
    body: 'Carlos was fantastic — showed up on time, fixed the leak quickly, and cleaned up everything. Highly recommend!',
    jobTitle: 'Kitchen Sink Leak Repair',
    createdAt: daysAgo(10),
  },
  {
    id: 'review-002',
    jobId: 'job-002',
    reviewerId: 'user-property-manager-1',
    reviewerName: 'Diana Chen',
    tradespersonId: 'user-tradesperson-1',
    tradespersonName: 'Rivera Plumbing LLC',
    rating: 5,
    body: 'Excellent work replacing the plumbing in Unit 2A. Professional, no mess, done in half the time quoted.',
    jobTitle: 'Unit 2A Plumbing Replacement',
    createdAt: daysAgo(20),
  },
  {
    id: 'review-003',
    jobId: 'job-004',
    reviewerId: 'user-homeowner-1',
    reviewerName: 'Sarah Mitchell',
    tradespersonId: 'user-tradesperson-2',
    tradespersonName: 'Watts Electric',
    rating: 4,
    body: 'Great work on the panel upgrade. Took a bit longer than expected but the result is perfect.',
    jobTitle: 'Electrical Panel Upgrade',
    createdAt: daysAgo(15),
  },
];

// ── Collection: platform_metrics ─────────────────────────────────────────

const platformMetrics = [
  {
    id: 'metrics-current',
    period: '2026-04',
    users: {
      homeowners: 1842,
      propertyManagers: 394,
      realtors: 218,
      tradespersons: 631,
      total: 3085,
    },
    mau: { total: 1240, homeowners: 720, tradespersons: 390, others: 130 },
    jobs: { open: 87, inProgress: 143, completed: 2104 },
    revenue: { gross: 184320, net: 156672, platformFee: 27648, opex: 24000 },
    activationRate: 0.78,
    updatedAt: now,
  },
];

// ── Run all seeds ─────────────────────────────────────────────────────────

async function main() {
  console.log('🌱  TradesOn — Firestore Seed Script');
  console.log('    Project: tradeson-491518\n');

  await upsertCollection('users', users);
  await upsertCollection('jobs', jobs);
  await upsertCollection('quotes', quotes);
  await upsertCollection('compliance_submissions', complianceSubmissions);
  await upsertCollection('flagged_accounts', flaggedAccounts);
  await upsertCollection('audit_log', auditLog);
  await upsertCollection('threads', threads);

  // Delete the stranded doc from the legacy messaging_threads collection,
  // if an earlier seed placed it there.
  try {
    await db.collection('messaging_threads').doc('thread-job003-001').delete();
    console.log('   ✓  removed legacy messaging_threads/thread-job003-001');
  } catch {
    // Already absent — nothing to do
  }
  await upsertCollection('reviews', reviews);
  await upsertCollection('platform_metrics', platformMetrics);

  console.log('\n✅  Seed complete! All collections populated.');
  console.log('\n📋  Collections seeded:');
  console.log('    • users (4 docs)');
  console.log('    • jobs (3 docs)');
  console.log('    • quotes (3 docs)');
  console.log('    • compliance_submissions (3 docs)');
  console.log('    • flagged_accounts (3 docs)');
  console.log('    • audit_log (3 docs)');
  console.log('    • threads (1 doc)');
  console.log('    • reviews (3 docs)');
  console.log('    • platform_metrics (1 doc)');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
