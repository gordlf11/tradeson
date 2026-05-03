import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, CheckCircle, AlertCircle,
  Wrench, Flag, MessageCircle, Zap, HelpCircle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { submitSupportTicket } from '../services/messagingService';

const CATEGORIES = [
  {
    id: 'job_issue',
    label: 'Issue with a Job',
    description: 'Problems with an active or completed job',
    icon: <Wrench size={20} />,
  },
  {
    id: 'job_poster',
    label: 'Report a User',
    description: 'Report inappropriate or fraudulent behaviour',
    icon: <Flag size={20} />,
  },
  {
    id: 'platform',
    label: 'Platform Feedback',
    description: 'Suggestions or general product feedback',
    icon: <MessageCircle size={20} />,
  },
  {
    id: 'troubleshooting',
    label: 'Technical Troubleshooting',
    description: 'App errors, login issues, or bugs',
    icon: <Zap size={20} />,
  },
  {
    id: 'chat',
    label: 'Talk with Support',
    description: 'Connect with a customer support agent',
    icon: <HelpCircle size={20} />,
  },
];

export default function ContactSupport() {
  const navigate = useNavigate();
  const userEmail = localStorage.getItem('userEmail') || '';
  const userName  = localStorage.getItem('userName')  || '';
  const userRole  = localStorage.getItem('userRole')  || '';

  const [category, setCategory]         = useState('');
  const [subject, setSubject]           = useState('');
  const [description, setDescription]   = useState('');
  const [relatedJobId, setRelatedJobId] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState('');

  const canSubmit = category && subject.trim() && description.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      await submitSupportTicket({
        userId:    userEmail,
        userEmail,
        userName:  userName || userEmail,
        userRole,
        category,
        subject:   subject.trim(),
        description: description.trim(),
        ...(relatedJobId.trim() ? { relatedJobId: relatedJobId.trim() } : {}),
      });
      setSubmitted(true);
    } catch {
      setError('Failed to submit your ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        <div style={{
          background: 'var(--navy)', padding: 'var(--space-4)',
          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          paddingTop: 'max(var(--space-4), env(safe-area-inset-top))',
        }}>
          <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', padding: '4px' }}>
            <ChevronLeft size={24} />
          </button>
          <h1 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Contact Support</h1>
        </div>
        <div style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 'var(--space-4)' }}>
          <CheckCircle size={56} color="var(--success)" />
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', textAlign: 'center', margin: 0 }}>
            Ticket Submitted
          </h2>
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.9rem', maxWidth: '280px', margin: 0 }}>
            Our support team will review your request and follow up at <strong>{userEmail}</strong> within 24 hours.
          </p>
          <Button variant="primary" onClick={() => navigate('/settings')}>
            Back to Settings
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: 'var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        paddingTop: 'max(var(--space-4), env(safe-area-inset-top))',
      }}>
        <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', padding: '4px' }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Contact Support</h1>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', paddingBottom: '60px' }}>

        {/* Category */}
        <div>
          <p style={{ fontSize: '0.78rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            What do you need help with?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  padding: 'var(--space-4)',
                  border: category === cat.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: category === cat.id ? 'var(--primary-light)' : 'var(--bg-surface)',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: category === cat.id ? 'var(--primary)' : 'var(--bg-base)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: category === cat.id ? 'white' : 'var(--text-secondary)',
                }}>
                  {cat.icon}
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: category === cat.id ? 'var(--primary)' : 'var(--text-primary)' }}>
                    {cat.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {cat.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        {category && (
          <Card style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Subject"
              placeholder="Brief summary of your issue"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              required
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                Description <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={5}
                placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, or relevant context."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical',
                  color: 'var(--text-primary)', background: 'var(--bg-surface)',
                }}
              />
            </div>
            {(category === 'job_issue' || category === 'job_poster') && (
              <Input
                label="Related Job ID (optional)"
                placeholder="Paste the job ID or title if applicable"
                value={relatedJobId}
                onChange={e => setRelatedJobId(e.target.value)}
              />
            )}
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)' }}>
              Submitting as <strong>{userEmail}</strong>. Our team typically responds within 24 hours.
            </div>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger)', fontSize: '0.85rem' }}>
                <AlertCircle size={16} />
                {error}
              </div>
            )}
            <Button
              variant="primary"
              fullWidth
              loading={submitting}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              Submit Support Ticket
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
