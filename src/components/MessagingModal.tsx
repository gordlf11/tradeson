/**
 * MessagingModal.tsx
 * In-platform messaging between a job poster and a tradesperson.
 * Only available on accepted jobs.
 * Powered by Firebase Firestore (real-time).
 */

import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import {
  subscribeToMessages,
  sendMessage,
  ensureThread,
  type Message,
} from '../services/messagingService';

interface MessagingModalProps {
  jobId: string;
  jobTitle: string;
  currentUserId: string;
  currentUserName: string;
  currentUserRole: string;
  otherUserId: string;
  otherUserName: string;
  onClose: () => void;
}

export default function MessagingModal({
  jobId,
  jobTitle,
  currentUserId,
  currentUserName,
  currentUserRole,
  otherUserId,
  otherUserName,
  onClose,
}: MessagingModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [threadId, setThreadId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [firebaseError, setFirebaseError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Determine customer vs tradesperson
  const isTradeRole = currentUserRole === 'licensed-trade' || currentUserRole === 'non-licensed-trade';
  const customerId = isTradeRole ? otherUserId : currentUserId;
  const customerName = isTradeRole ? otherUserName : currentUserName;
  const tradespersonId = isTradeRole ? currentUserId : otherUserId;
  const tradespersonName = isTradeRole ? currentUserName : otherUserName;

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    ensureThread(jobId, jobTitle, customerId, customerName, tradespersonId, tradespersonName)
      .then((tid) => {
        setThreadId(tid);
        unsubscribe = subscribeToMessages(tid, setMessages);
      })
      .catch(() => {
        // Firebase may not be configured yet — fall back to local mock
        setFirebaseError(true);
      });

    return () => { unsubscribe?.(); };
  }, [jobId, jobTitle, customerId, customerName, tradespersonId, tradespersonName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setSending(true);
    const draft = text.trim();
    setText('');

    if (firebaseError || !threadId) {
      // Local fallback for demo when Firebase isn't wired up
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        senderId: currentUserId,
        senderName: currentUserName,
        text: draft,
        createdAt: new Date(),
        read: false,
      }]);
      setSending(false);
      return;
    }

    try {
      await sendMessage(threadId, currentUserId, currentUserName, draft);
    } catch {
      // Re-add to input if send fails
      setText(draft);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,28,60,0.65)', zIndex: 600,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        width: '100%', maxWidth: '428px',
        height: '75vh', maxHeight: '600px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.18)',
      }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', background: 'var(--border)', borderRadius: '2px' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 16px 12px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', background: 'var(--primary-light)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <MessageCircle size={18} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                {otherUserName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>re: {jobTitle}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg-base)', border: '1px solid var(--border)',
            borderRadius: '50%', width: '32px', height: '32px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', flexShrink: 0,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem', marginTop: '32px' }}>
              No messages yet — send the first one!
            </div>
          )}
          {messages.map(msg => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '80%' }}>
                  {!isMine && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginBottom: '3px', paddingLeft: '4px' }}>
                      {msg.senderName}
                    </div>
                  )}
                  <div style={{
                    background: isMine ? 'var(--primary)' : 'var(--bg-base)',
                    color: isMine ? 'white' : 'var(--text-primary)',
                    borderRadius: isMine
                      ? '16px 16px 4px 16px'
                      : '16px 16px 16px 4px',
                    padding: '10px 14px',
                    fontSize: '0.9rem',
                    lineHeight: '1.45',
                    border: isMine ? 'none' : '1px solid var(--border)',
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-tertiary)', marginTop: '3px', textAlign: isMine ? 'right' : 'left', paddingLeft: '4px', paddingRight: '4px' }}>
                    {formatTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 16px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          borderTop: '1px solid var(--border)',
          display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0,
          background: 'var(--bg-surface)',
        }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..."
            rows={3}
            style={{
              flex: 1, padding: '12px 14px',
              border: '1.5px solid var(--border)',
              borderRadius: '16px', fontSize: '0.9rem',
              fontFamily: 'inherit', resize: 'none',
              color: 'var(--text-primary)', background: 'var(--bg-base)',
              lineHeight: '1.45', outline: 'none',
              minHeight: '52px',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: text.trim() ? 'var(--primary)' : 'var(--border)',
              border: 'none', cursor: text.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'background 0.15s ease',
            }}
          >
            <Send size={18} color="white" />
          </button>
        </div>
      </div>
    </div>
  );
}
