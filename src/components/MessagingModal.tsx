/**
 * MessagingModal.tsx
 * In-platform messaging between a job poster and a tradesperson.
 * Only available on accepted jobs.
 * Powered by Firebase Firestore (real-time).
 */

import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle } from 'lucide-react';
import { Button } from './ui/Button';
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
        width: '100%', maxWidth: '600px', height: '80vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageCircle size={20} color="var(--primary)" />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {otherUserName}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>re: {jobTitle}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }}>
            <X size={22} />
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem', marginTop: '40px' }}>
              No messages yet. Send the first message!
            </div>
          )}
          {messages.map(msg => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '75%' }}>
                  {!isMine && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '3px', paddingLeft: '4px' }}>
                      {msg.senderName}
                    </div>
                  )}
                  <div style={{
                    background: isMine ? 'var(--primary)' : 'var(--bg-base)',
                    color: isMine ? 'white' : 'var(--text-primary)',
                    borderRadius: isMine
                      ? 'var(--radius-md) var(--radius-md) 4px var(--radius-md)'
                      : 'var(--radius-md) var(--radius-md) var(--radius-md) 4px',
                    padding: '10px 14px',
                    fontSize: '0.875rem',
                    lineHeight: '1.4',
                    border: isMine ? 'none' : '1px solid var(--border)',
                  }}>
                    {msg.text}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', marginTop: '3px', textAlign: isMine ? 'right' : 'left', paddingLeft: '4px', paddingRight: '4px' }}>
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
          padding: '12px 20px 20px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0,
        }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Type a message..."
            rows={2}
            style={{
              flex: 1, padding: '10px 12px', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
              fontFamily: 'inherit', resize: 'none', color: 'var(--text-primary)',
              background: 'var(--bg-base)', lineHeight: '1.4',
            }}
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            loading={sending}
            disabled={!text.trim()}
            icon={<Send size={16} />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
