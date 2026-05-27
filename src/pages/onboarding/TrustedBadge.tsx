import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Clock, MessageCircle, Sparkles, ChevronLeft, ChevronRight, Check,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

// 4 swipe cards + completion screen. ~2 minutes total. Awards the
// Trusted Badge to the tradesperson via POST /onboarding/trusted-badge/complete.
// Spec: docs/TradesOn Trusted Badge.docx.

interface CardSpec {
  icon: React.ReactNode;
  heading: string;
  subheading?: string;
  bullets?: string[];
  body?: React.ReactNode;
  footer?: string;
}

const CARDS: CardSpec[] = [
  {
    icon: <Sparkles size={36} color="var(--primary)" />,
    heading: 'Welcome to TradesOn Trusted',
    body: (
      <>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.5, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          Customers don't just remember the repair.
        </p>
        <p style={{ fontSize: '1.05rem', lineHeight: 1.5, color: 'var(--text-primary)', fontWeight: 600 }}>
          They remember the experience.
        </p>
      </>
    ),
    footer: 'Complete this quick onboarding to earn your TradesOn Trusted Badge.',
  },
  {
    icon: <Clock size={36} color="var(--primary)" />,
    heading: 'Show Up Professionally',
    bullets: [
      'Arrive on time',
      'If delayed, send a quick message',
      'Wear clean work clothes',
      'Introduce yourself confidently',
    ],
    footer: 'Professionalism builds trust fast.',
  },
  {
    icon: <MessageCircle size={36} color="var(--primary)" />,
    heading: 'First Impressions Matter',
    body: (
      <>
        <p style={{ fontSize: '1rem', lineHeight: 1.55, color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          When you arrive, smile and greet the customer.
        </p>
        <div style={{
          background: 'var(--bg-base)', borderLeft: '3px solid var(--primary)',
          padding: 'var(--space-3) var(--space-4)', borderRadius: '4px',
          fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.5,
        }}>
          "Hi, I'm James from TradesOn. Let me take a look and I'll talk you through it."
        </div>
      </>
    ),
    footer: 'Clear communication reduces stress instantly.',
  },
  {
    icon: <ShieldCheck size={36} color="var(--primary)" />,
    heading: 'Respect the Property',
    bullets: [
      'Keep the work area clean',
      'Remove shoes when appropriate',
      'Wear shoe covers when needed',
      'Protect floors and surfaces',
      'Clean up before leaving',
    ],
    footer: 'Customers notice the small details. Professional habits build trust and repeat business.',
  },
];

export default function TrustedBadge() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [cardIndex, setCardIndex] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const touchStartX = useRef<number | null>(null);

  const totalCards = CARDS.length;
  const card = CARDS[cardIndex];

  const goNext = () => {
    setError('');
    if (cardIndex < totalCards - 1) {
      setCardIndex((i) => i + 1);
    } else {
      setShowCompletion(true);
    }
  };

  const goBack = () => {
    setError('');
    if (showCompletion) {
      setShowCompletion(false);
      return;
    }
    if (cardIndex > 0) setCardIndex((i) => i - 1);
  };

  const handleUnlock = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      await api.completeTrustedBadge();
      await refreshProfile();
      localStorage.setItem('trustedBadgeEarned', 'true');
      navigate('/dashboard/tradesperson');
    } catch (err: any) {
      // Non-fatal: still navigate. Profile will sync next refresh.
      console.warn('Trusted Badge API error (non-blocking):', err?.message);
      localStorage.setItem('trustedBadgeEarned', 'true');
      navigate('/dashboard/tradesperson');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard/tradesperson');
  };

  // Mobile swipe handlers
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 50) {
      dx < 0 ? goNext() : goBack();
    }
    touchStartX.current = null;
  };

  // Completion screen
  if (showCompletion) {
    return (
      <div className="page-container" style={pageStyles}>
        <Card elevated className="animate-slideUp" style={cardStyles}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 96, height: 96, margin: '0 auto var(--space-4)',
              borderRadius: '50%', background: 'var(--primary-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldCheck size={52} color="var(--primary)" strokeWidth={2.4} />
            </div>
            <p style={{
              fontSize: '0.7rem', fontWeight: 700, color: 'var(--primary)',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)',
            }}>
              Badge Unlocked
            </p>
            <h2 style={{ fontSize: '1.6rem', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
              Congratulations.
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
              You've earned your:
            </p>
            <p style={{
              fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)',
              marginBottom: 'var(--space-5)',
            }}>
              TradesOn Trusted Badge
            </p>

            <div style={{
              background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
              padding: 'var(--space-4)', marginBottom: 'var(--space-5)', textAlign: 'left',
            }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                You're now recognized as:
              </p>
              {['Customer Ready', 'Trusted on Platform', 'Committed to Professional Service'].map((t) => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Check size={16} color="var(--success)" />
                  <span style={{ fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 500 }}>{t}</span>
                </div>
              ))}
            </div>

            {error && (
              <div style={errorBoxStyles}>{error}</div>
            )}

            <Button
              variant="primary" size="lg" fullWidth
              onClick={handleUnlock} loading={isSubmitting}
            >
              Unlock Badge
            </Button>

            <button
              onClick={goBack}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: 'var(--space-3)',
                fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
              }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Swipe card
  return (
    <div className="page-container" style={pageStyles}>
      {/* Header with progress dots */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        maxWidth: 400, margin: '0 auto var(--space-4)', width: '100%',
      }}>
        <button
          onClick={goBack}
          disabled={cardIndex === 0}
          style={{
            background: 'transparent', border: 'none', cursor: cardIndex === 0 ? 'default' : 'pointer',
            padding: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: cardIndex === 0 ? 'transparent' : 'var(--text-secondary)',
          }}
          aria-label="Previous card"
        >
          <ChevronLeft size={22} />
        </button>

        <div style={{ display: 'flex', gap: 6 }}>
          {CARDS.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === cardIndex ? 22 : 6, height: 6, borderRadius: 3,
                background: i <= cardIndex ? 'var(--primary)' : 'var(--border)',
                transition: 'width 200ms ease',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleSkip}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600,
            fontFamily: 'inherit', padding: 8,
          }}
        >
          Skip
        </button>
      </div>

      <Card
        elevated
        className="animate-slideUp"
        style={cardStyles}
        key={cardIndex}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div style={{
          width: 76, height: 76, margin: '0 auto var(--space-4)',
          borderRadius: '50%', background: 'var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {card.icon}
        </div>

        <h2 style={{
          textAlign: 'center', fontSize: '1.5rem', marginBottom: 'var(--space-2)',
          color: 'var(--text-primary)', fontWeight: 700,
        }}>
          {card.heading}
        </h2>

        {card.subheading && (
          <p style={{
            textAlign: 'center', color: 'var(--text-secondary)',
            marginBottom: 'var(--space-4)', fontSize: '0.9rem',
          }}>
            {card.subheading}
          </p>
        )}

        <div style={{ marginBottom: 'var(--space-5)', minHeight: 120 }}>
          {card.body}
          {card.bullets && (
            <div>
              {card.bullets.map((b) => (
                <div key={b} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginBottom: 12, fontSize: '0.98rem', color: 'var(--text-primary)',
                  lineHeight: 1.4,
                }}>
                  <Check size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} strokeWidth={2.5} />
                  <span>{b}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {card.footer && (
          <p style={{
            textAlign: 'center', color: 'var(--text-secondary)',
            fontSize: '0.9rem', fontStyle: 'italic',
            marginBottom: 'var(--space-5)',
          }}>
            {card.footer}
          </p>
        )}

        <Button variant="primary" size="lg" fullWidth onClick={goNext}>
          {cardIndex === totalCards - 1 ? 'Earn My Badge' : 'Continue'}
          <ChevronRight size={18} style={{ marginLeft: 6 }} />
        </Button>
      </Card>
    </div>
  );
}

const pageStyles: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  background: 'var(--bg-base)',
  padding: 'var(--space-4)',
};

const cardStyles: React.CSSProperties = {
  maxWidth: 400,
  margin: '0 auto',
  width: '100%',
  padding: 'var(--space-5)',
};

const errorBoxStyles: React.CSSProperties = {
  padding: 'var(--space-3)',
  background: 'rgba(255, 74, 107, 0.1)',
  border: '1px solid var(--danger)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--danger)',
  fontSize: '0.85rem',
  marginBottom: 'var(--space-4)',
};
