/**
 * messagingService.ts
 * Firestore-backed in-platform messaging between job posters and tradespersons.
 *
 * Firestore schema:
 *   threads/{threadId}
 *     jobId: string
 *     jobTitle: string
 *     participants: [userId1, userId2]
 *     participantNames: { [userId]: string }
 *     createdAt: Timestamp
 *     lastMessage: string
 *     lastMessageAt: Timestamp
 *     jobStatus: 'accepted' | 'completed'
 *
 *   threads/{threadId}/messages/{messageId}
 *     senderId: string
 *     senderName: string
 *     text: string
 *     createdAt: Timestamp
 *     read: boolean
 */

import {
  collection,
  doc,
  addDoc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import api from './api';

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  recipientUID: string;
  text: string;
  createdAt: Date;
  readAt: Date | null;
}

export interface Thread {
  id: string;
  jobId: string;
  jobTitle: string;
  participants: string[];
  participantNames: Record<string, string>;
  lastMessage: string;
  lastMessageAt: Date;
  jobStatus: string;
}

/** Build a deterministic thread ID from jobId + two participant IDs. */
export function buildThreadId(jobId: string, userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort().join('_');
  return `${jobId}__${sorted}`;
}

/** Create or fetch a messaging thread for an accepted job. */
export async function ensureThread(
  jobId: string,
  jobTitle: string,
  customerId: string,
  customerName: string,
  tradespersonId: string,
  tradespersonName: string,
): Promise<string> {
  const threadId = buildThreadId(jobId, customerId, tradespersonId);
  const threadRef = doc(db, 'threads', threadId);
  await setDoc(
    threadRef,
    {
      jobId,
      jobTitle,
      participants: [customerId, tradespersonId],
      participantNames: {
        [customerId]: customerName,
        [tradespersonId]: tradespersonName,
      },
      createdAt: serverTimestamp(),
      lastMessage: '',
      lastMessageAt: serverTimestamp(),
      jobStatus: 'accepted',
    },
    { merge: true },
  );
  return threadId;
}

/** Send a message into a thread. */
export async function sendMessage(
  threadId: string,
  senderId: string,
  senderName: string,
  recipientUID: string,
  text: string,
): Promise<void> {
  const messagesRef = collection(db, 'threads', threadId, 'messages');
  await addDoc(messagesRef, {
    senderId,
    senderName,
    recipientUID,
    text,
    createdAt: serverTimestamp(),
    readAt: null,
  });
  const threadRef = doc(db, 'threads', threadId);
  await updateDoc(threadRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
  });
}

/** Mark all unread messages addressed to this user in a thread as read. */
export async function markThreadRead(threadId: string, currentUID: string): Promise<void> {
  const messagesRef = collection(db, 'threads', threadId, 'messages');
  const q = query(messagesRef, where('recipientUID', '==', currentUID), where('readAt', '==', null));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { readAt: serverTimestamp() })));
}

/** Subscribe to the count of unread messages for a user across all their threads. */
export function subscribeToUnreadCount(
  userId: string,
  callback: (count: number) => void,
): () => void {
  // Listen to all threads this user participates in, then count unread messages.
  const threadsRef = collection(db, 'threads');
  const threadsQ = query(threadsRef, where('participants', 'array-contains', userId));

  const threadUnsubs: Array<() => void> = [];

  const unsubThreads = onSnapshot(threadsQ, (threadsSnap) => {
    // Clear old message listeners when thread list changes.
    threadUnsubs.forEach(fn => fn());
    threadUnsubs.length = 0;

    if (threadsSnap.empty) { callback(0); return; }

    const counts = new Map<string, number>();

    threadsSnap.docs.forEach(threadDoc => {
      const messagesRef = collection(db, 'threads', threadDoc.id, 'messages');
      const unreadQ = query(
        messagesRef,
        where('recipientUID', '==', userId),
        where('readAt', '==', null),
      );
      const unsub = onSnapshot(unreadQ, snap => {
        counts.set(threadDoc.id, snap.size);
        callback(Array.from(counts.values()).reduce((a, b) => a + b, 0));
      });
      threadUnsubs.push(unsub);
    });
  });

  return () => {
    unsubThreads();
    threadUnsubs.forEach(fn => fn());
  };
}

/** Subscribe to messages in a thread (real-time). Returns unsubscribe fn. */
export function subscribeToMessages(
  threadId: string,
  callback: (messages: Message[]) => void,
): () => void {
  const messagesRef = collection(db, 'threads', threadId, 'messages');
  const q = query(messagesRef, orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = snapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        senderId: data.senderId,
        senderName: data.senderName,
        recipientUID: data.recipientUID ?? '',
        text: data.text,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        readAt: data.readAt instanceof Timestamp ? data.readAt.toDate() : null,
      };
    });
    callback(messages);
  });
}

/** Get all threads for a user (by participant ID). */
export async function getUserThreads(userId: string): Promise<Thread[]> {
  const threadsRef = collection(db, 'threads');
  const q = query(threadsRef, where('participants', 'array-contains', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      jobId: data.jobId,
      jobTitle: data.jobTitle,
      participants: data.participants,
      participantNames: data.participantNames,
      lastMessage: data.lastMessage,
      lastMessageAt: data.lastMessageAt instanceof Timestamp ? data.lastMessageAt.toDate() : new Date(),
      jobStatus: data.jobStatus,
    };
  });
}

/** Submit a review — writes to Postgres via the API (not Firestore). */
export async function submitReview(review: {
  jobId: string;
  jobTitle: string;
  tradespersonId: string;
  tradespersonName: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  rating: number;
  comment: string;
}): Promise<void> {
  await api.submitReview({
    job_id: review.jobId,
    reviewee_id: review.tradespersonId,
    rating: review.rating,
    comment: review.comment || undefined,
  });
}

/** Write an admin audit log entry. */
export async function logAdminAction(entry: {
  adminId: string;
  adminEmail: string;
  actionType: string;
  targetUserId: string;
  targetUserEmail: string;
  reason: string;
}): Promise<void> {
  const auditRef = collection(db, 'audit_log');
  await addDoc(auditRef, {
    ...entry,
    timestamp: serverTimestamp(),
  });
}

// ── Support Tickets ────────────────────────────────────────────────────────

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: string;
  category: string;
  subject: string;
  description: string;
  relatedJobId?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  team: 'account' | 'technical' | 'unassigned';
  owner: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function submitSupportTicket(
  ticket: Omit<SupportTicket, 'id' | 'status' | 'priority' | 'team' | 'owner' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'support_tickets'), {
    ...ticket,
    status: 'open',
    priority: 'medium',
    team: 'unassigned',
    owner: 'unassigned',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getSupportTickets(maxTickets = 200): Promise<SupportTicket[]> {
  const q = query(
    collection(db, 'support_tickets'),
    orderBy('createdAt', 'desc'),
    limit(maxTickets),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      userId: data.userId ?? '',
      userEmail: data.userEmail ?? '',
      userName: data.userName ?? '',
      userRole: data.userRole ?? '',
      category: data.category ?? '',
      subject: data.subject ?? '',
      description: data.description ?? '',
      relatedJobId: data.relatedJobId,
      status: data.status ?? 'open',
      priority: data.priority ?? 'medium',
      team: data.team ?? 'unassigned',
      owner: data.owner ?? 'unassigned',
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
    };
  });
}

export async function updateSupportTicket(
  ticketId: string,
  updates: Partial<Pick<SupportTicket, 'status' | 'priority' | 'team' | 'owner'>>
): Promise<void> {
  const ref = doc(db, 'support_tickets', ticketId);
  await updateDoc(ref, { ...updates, updatedAt: serverTimestamp() });
}

// ── Audit Log ──────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  adminEmail: string;
  actionType: string;
  targetUserId: string;
  targetUserEmail: string;
  reason: string;
  timestamp: Date;
}

/** Read the most recent admin audit log entries from Firestore. */
export async function getAuditLog(maxEntries = 100): Promise<AuditLogEntry[]> {
  const q = query(
    collection(db, 'audit_log'),
    orderBy('timestamp', 'desc'),
    limit(maxEntries),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      adminEmail: data.adminEmail ?? '',
      actionType: data.actionType ?? '',
      targetUserId: data.targetUserId ?? '',
      targetUserEmail: data.targetUserEmail ?? '',
      reason: data.reason ?? '',
      timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
    };
  });
}

/** Live subscription to audit log entries. Returns unsubscribe fn. */
export function subscribeToAuditLog(
  callback: (entries: AuditLogEntry[], updatedAt: Date) => void,
  maxEntries = 100,
): () => void {
  const q = query(
    collection(db, 'audit_log'),
    orderBy('timestamp', 'desc'),
    limit(maxEntries),
  );
  return onSnapshot(q, snapshot => {
    const entries: AuditLogEntry[] = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        adminEmail: data.adminEmail ?? '',
        actionType: data.actionType ?? '',
        targetUserId: data.targetUserId ?? '',
        targetUserEmail: data.targetUserEmail ?? '',
        reason: data.reason ?? '',
        timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
      };
    });
    callback(entries, new Date());
  });
}

/** Live subscription to support tickets. Returns unsubscribe fn. */
export function subscribeToSupportTickets(
  callback: (tickets: SupportTicket[], updatedAt: Date) => void,
  maxTickets = 200,
): () => void {
  const q = query(
    collection(db, 'support_tickets'),
    orderBy('createdAt', 'desc'),
    limit(maxTickets),
  );
  return onSnapshot(q, snapshot => {
    const tickets: SupportTicket[] = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.userId ?? '',
        userEmail: data.userEmail ?? '',
        userName: data.userName ?? '',
        userRole: data.userRole ?? '',
        category: data.category ?? '',
        subject: data.subject ?? '',
        description: data.description ?? '',
        relatedJobId: data.relatedJobId,
        status: data.status ?? 'open',
        priority: data.priority ?? 'medium',
        team: data.team ?? 'unassigned',
        owner: data.owner ?? 'unassigned',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(),
      };
    });
    callback(tickets, new Date());
  });
}
