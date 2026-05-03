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

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Date;
  read: boolean;
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
  text: string,
): Promise<void> {
  const messagesRef = collection(db, 'threads', threadId, 'messages');
  await addDoc(messagesRef, {
    senderId,
    senderName,
    text,
    createdAt: serverTimestamp(),
    read: false,
  });
  // Update thread summary
  const threadRef = doc(db, 'threads', threadId);
  await updateDoc(threadRef, {
    lastMessage: text,
    lastMessageAt: serverTimestamp(),
  });
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
        text: data.text,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
        read: data.read,
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

/** Write a review to Firestore. */
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
  const reviewsRef = collection(db, 'reviews');
  await addDoc(reviewsRef, {
    ...review,
    createdAt: serverTimestamp(),
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
