import { useEffect, useState } from 'react';
import { MapPin, Clock, Camera, DollarSign, Users, Star, X, CheckCircle, ChevronDown, ChevronUp, SortAsc, Filter } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface Availability {
  day: string;
  slots: string[];
}

interface Quote {
  id: string;
  tradespersonId: string;
  tradespersonName: string;
  rating: number;
  reviewCount: number;
  totalPrice: number;
  estimatedHours: number;
  hourlyOverage: number;
  message: string;
  submittedAt: string;
  verified: boolean;
  availability?: Availability[];
}

interface Job {
  id: string;
  title: string;
  category: string;
  tradeId: string;
  severity: 'routine' | 'moderate' | 'urgent';
  distance: number;
  postedAt: string;
  expiresInHours: number;
  description: string;
  room: string;
  jobNature: string;
  photos: number;
  quotes: Quote[];
  verified: boolean;
  clientName: string;
  clientAddress: string;
  status: 'open' | 'quoted' | 'accepted' | 'expired';
  likelihoodScore: number; // 0-100
}

// Jobs arrive with an empty quotes[] from listJobs(); quotes are lazy-loaded
// via api.getJob(id) when the customer opens the comparison modal.
// TODO: wire that getJob call when expanding a job card.

// ── API → component Job mapping ────────────────────────────────────────────
// The API returns Postgres rows (snake_case); the UI expects the rich Job type
// defined above. Keep the mapping local and permissive — many UI fields don't
// exist in the list endpoint yet and are TODO'd until the backend grows them.

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  const mins = Math.max(0, Math.round(diffMs / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function hoursUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 0;
  const diffMs = then - Date.now();
  return Math.max(0, diffMs / 3600000);
}

function mapSeverity(s: string | null | undefined): Job['severity'] {
  switch ((s || '').toLowerCase()) {
    case 'urgent':   return 'urgent';
    case 'moderate': return 'moderate';
    case 'routine':  return 'routine';
    default:         return 'routine';
  }
}

function mapJobStatus(s: string | null | undefined): Job['status'] {
  const v = (s || '').toLowerCase();
  if (v === 'quoted')                                 return 'quoted';
  if (v === 'expired' || v === 'closed')              return 'expired';
  if (v === 'accepted' || v === 'scheduled' ||
      v === 'confirmed' || v === 'in_progress' ||
      v === 'completed')                              return 'accepted';
  return 'open';
}

function toBoardJob(row: any): Job {
  const category = row.category || 'General';
  return {
    id: String(row.id),
    title: row.title || 'Untitled Job',
    category,
    tradeId: String(category).toLowerCase(), // TODO: replace with a real trade-slug lookup when backend adds it
    severity: mapSeverity(row.severity),
    distance: 0, // TODO: not in API; wire geodistance when backend adds lat/lng + user location
    postedAt: relativeTime(row.created_at),
    expiresInHours: hoursUntil(row.expires_at),
    description: row.description || '',
    room: row.room || '—',
    jobNature: row.job_nature || '—',
    photos: 0, // TODO: not in list endpoint; populate from api.getJob(id) on expand
    quotes: [], // TODO: load on demand via api.getJob(id) when a card is expanded
    verified: true, // TODO: derive from customer KYC once backend exposes it
    clientName: row.customer_name || 'Customer',
    clientAddress: row.address || '—',
    status: mapJobStatus(row.status),
    likelihoodScore: 0, // TODO: AI match-score integration planned
  };
}

const SORT_OPTIONS = ['Likelihood Match', 'Newest', 'Closest', 'Expiring Soon'] as const;
type SortOption = typeof SORT_OPTIONS[number];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatExpiry(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m left`;
  if (hours < 24) return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}m left`;
  return `${Math.floor(hours / 24)}d ${Math.round(hours % 24)}h left`;
}

function expiryColor(hours: number) {
  if (hours < 6) return 'var(--danger)';
  if (hours < 24) return 'var(--warning)';
  return 'var(--text-secondary)';
}

function severityBadge(severity: Job['severity']) {
  const map = { routine: { variant: 'success' as const, label: 'Routine' }, moderate: { variant: 'warning' as const, label: 'Moderate' }, urgent: { variant: 'danger' as const, label: 'URGENT' } };
  return map[severity];
}

function StarRow({ rating, count }: { rating: number; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      {[1,2,3,4,5].map(s => (
        <Star key={s} size={12} fill={s <= Math.floor(rating) ? '#F76B26' : 'none'} color={s <= Math.floor(rating) ? '#F76B26' : 'var(--border)'} />
      ))}
      <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-primary)', marginLeft: '4px' }}>{rating}</span>
      {count !== undefined && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>({count})</span>}
    </div>
  );
}

// ── Quote Submission Modal (Tradesperson view) ─────────────────────────────

interface QuoteModalProps {
  job: Job;
  onClose: () => void;
  onSubmit: (quote: { price: number; hours: number; overage: number; message: string; availability: Availability[] }) => Promise<void>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = ['7 AM – 10 AM', '10 AM – 1 PM', '1 PM – 4 PM', '4 PM – 7 PM'];

function QuoteSubmissionModal({ job, onClose, onSubmit }: QuoteModalProps) {
  const [price, setPrice] = useState('');
  const [hours, setHours] = useState('');
  const [overage, setOverage] = useState('');
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const tradespersonData = JSON.parse(localStorage.getItem('tradespersonData') || '{}');
  const rating = 4.8;
  const reviewCount = 47;

  const isValid = price && hours && overage && message.trim().length >= 10 && availability.length > 0;

  const toggleDay = (day: string) => {
    setAvailability(prev => {
      if (prev.find(a => a.day === day)) return prev.filter(a => a.day !== day);
      return [...prev, { day, slots: [] }];
    });
  };

  const toggleSlot = (day: string, slot: string) => {
    setAvailability(prev => prev.map(a => {
      if (a.day !== day) return a;
      const slots = a.slots.includes(slot) ? a.slots.filter(s => s !== slot) : [...a.slots, slot];
      return { ...a, slots };
    }));
  };

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        price: parseFloat(price),
        hours: parseFloat(hours),
        overage: parseFloat(overage),
        message,
        availability,
      });
      setSubmitted(true);
      setTimeout(onClose, 1800);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit quote. Please try again.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,28,60,0.65)',
      zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        width: '100%', maxWidth: '600px', padding: '24px 20px 32px', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px' }}>Submit Quote</h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>{job.title}</p>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }}>
                <X size={22} />
              </button>
            </div>

            {/* My profile preview */}
            <Card style={{ padding: 'var(--space-3)', background: 'var(--primary-light)', border: '1px solid var(--primary)', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    {tradespersonData.businessName || tradespersonData.fullName || 'Your Business'}
                  </div>
                  <StarRow rating={rating} count={reviewCount} />
                </div>
                <Badge variant="success" size="sm">Verified</Badge>
              </div>
            </Card>

            {/* Price */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                  Total Price to Complete the Job ($) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 250"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Flat rate to complete the full scope as described. Overages are handled separately.</p>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                  Estimated Time to Complete (hours) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 2.5"
                  value={hours}
                  onChange={e => setHours(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                  Hourly Rate if Job Exceeds Estimated Time ($/hr) <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 75"
                  value={overage}
                  onChange={e => setOverage(e.target.value)}
                />
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>This rate applies per hour beyond your estimated completion time.</p>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                  Message to Customer <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  placeholder="Describe your approach, availability, and anything specific about how you'd tackle this job..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%', padding: 'var(--space-3)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem',
                    color: 'var(--text-primary)', background: 'var(--bg-surface)', resize: 'vertical',
                  }}
                />
              </div>

              {/* Availability */}
              <div>
                <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                  Your Weekly Availability <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                  Select the days and time windows you're available. The customer will pick from these.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {DAYS.map(day => {
                    const dayEntry = availability.find(a => a.day === day);
                    const selected = !!dayEntry;
                    return (
                      <div key={day}>
                        <button
                          onClick={() => toggleDay(day)}
                          style={{
                            width: '100%', padding: '8px 12px', textAlign: 'left',
                            border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
                            borderRadius: 'var(--radius-sm)',
                            background: selected ? 'var(--primary-light)' : 'var(--bg-surface)',
                            color: selected ? 'var(--primary)' : 'var(--text-secondary)',
                            fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          {selected ? '✓' : '+'} {day}
                        </button>
                        {selected && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '8px 4px 4px' }}>
                            {TIME_SLOTS.map(slot => {
                              const slotSelected = dayEntry.slots.includes(slot);
                              return (
                                <button
                                  key={slot}
                                  onClick={() => toggleSlot(day, slot)}
                                  style={{
                                    padding: '4px 10px',
                                    border: slotSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                                    borderRadius: 'var(--radius-full)',
                                    background: slotSelected ? 'var(--primary)' : 'var(--bg-surface)',
                                    color: slotSelected ? 'white' : 'var(--text-secondary)',
                                    fontSize: '0.72rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                                  }}
                                >
                                  {slot}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {availability.length === 0 && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '6px' }}>Select at least one available day to submit your quote.</p>
                )}
              </div>
            </div>

            {/* Expiry notice */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 'var(--space-4) 0', fontSize: '0.75rem', color: expiryColor(job.expiresInHours) }}>
              <Clock size={13} />
              This job expires in {formatExpiry(job.expiresInHours)}
            </div>

            {submitError && (
              <div style={{
                padding: 'var(--space-3)',
                background: 'var(--danger-light)',
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-3)',
              }}>
                <p style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>
                  Could not submit quote
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '4px 0 0' }}>
                  {submitError}
                </p>
              </div>
            )}

            {submitted ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'center',
                padding: 'var(--space-3)', background: 'var(--success)', borderRadius: 'var(--radius-md)',
              }}>
                <CheckCircle size={18} color="white" />
                <span style={{ color: 'white', fontWeight: '700' }}>Quote Submitted</span>
              </div>
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                loading={isSubmitting}
              >
                {isSubmitting ? 'Submitting…' : 'Submit Quote'}
              </Button>
            )}
          </>
      </div>
    </div>
  );
}

// ── Quote Comparison Modal (Customer view) ────────────────────────────────

interface ComparisonModalProps {
  job: Job;
  onClose: () => void;
  onAccept: (quoteId: string) => Promise<void>;
}

function QuoteComparisonModal({ job, onClose, onAccept }: ComparisonModalProps) {
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | null>(null);
  const [schedulingStep, setSchedulingStep] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; slot: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const handleAccept = async (qid: string) => {
    if (isAccepting) return;
    const quote = job.quotes.find(q => q.id === qid);
    setAcceptError(null);

    // If the quote has availability, enter the scheduling step first; the
    // API call fires after the customer picks a slot. Otherwise accept now.
    if (quote?.availability && quote.availability.length > 0) {
      setAcceptedId(qid);
      setAcceptedQuote(quote);
      setSchedulingStep(true);
      return;
    }

    setIsAccepting(true);
    try {
      await onAccept(qid);
      setAcceptedId(qid);
      setAcceptedQuote(quote ?? null);
      setTimeout(() => { onClose(); }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to accept quote. Please try again.';
      setAcceptError(msg);
    } finally {
      setIsAccepting(false);
    }
  };

  const handleConfirmSlot = async () => {
    if (!selectedSlot || !acceptedId || isAccepting) return;
    setAcceptError(null);
    setIsAccepting(true);
    try {
      await onAccept(acceptedId);
      setConfirmed(true);
      // Store confirmed schedule in localStorage for dashboard display
      const confirmed_jobs = JSON.parse(localStorage.getItem('confirmedSchedules') || '{}');
      confirmed_jobs[job.id] = {
        jobTitle: job.title,
        tradespersonName: acceptedQuote?.tradespersonName,
        price: acceptedQuote?.totalPrice,
        day: selectedSlot.day,
        slot: selectedSlot.slot,
      };
      localStorage.setItem('confirmedSchedules', JSON.stringify(confirmed_jobs));
      setTimeout(() => { onClose(); }, 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to accept quote. Please try again.';
      setAcceptError(msg);
    } finally {
      setIsAccepting(false);
    }
  };

  const sorted = [...job.quotes].sort((a, b) => b.rating - a.rating);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,28,60,0.65)',
      zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        width: '100%', maxWidth: '600px', padding: '24px 20px 32px', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px' }}>Compare Quotes</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>{job.title} · {job.quotes.length} quote{job.quotes.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <X size={22} />
          </button>
        </div>

        {/* Expiry */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          padding: 'var(--space-2) var(--space-3)', background: job.expiresInHours < 24 ? 'var(--danger-light)' : 'rgba(255,149,0,0.08)',
          borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', border: `1px solid ${job.expiresInHours < 24 ? 'var(--danger)' : 'var(--warning)'}`,
        }}>
          <Clock size={14} color={expiryColor(job.expiresInHours)} />
          <span style={{ fontSize: '0.78rem', fontWeight: '600', color: expiryColor(job.expiresInHours) }}>
            Job expires in {formatExpiry(job.expiresInHours)} — select a quote before it closes.
          </span>
        </div>

        {/* Scheduling step — shown after accepting a quote with availability */}
        {schedulingStep && acceptedQuote && (
          <div>
            {confirmed ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
                <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto var(--space-4)' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Appointment Confirmed!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {acceptedQuote.tradespersonName} is booked for <strong>{selectedSlot?.day}</strong> during <strong>{selectedSlot?.slot}</strong>. You can message them from your dashboard.
                </p>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: 'var(--space-3)', background: 'rgba(52,199,89,0.08)',
                  border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)',
                }}>
                  <CheckCircle size={18} color="var(--success)" />
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      Quote Accepted — {acceptedQuote.tradespersonName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Now pick an available time slot below.
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
                  Select a Time Slot
                </h4>

                {(acceptedQuote.availability ?? []).map(avail => (
                  <div key={avail.day} style={{ marginBottom: 'var(--space-3)' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px' }}>{avail.day}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {avail.slots.map(slot => {
                        const isSelected = selectedSlot?.day === avail.day && selectedSlot?.slot === slot;
                        return (
                          <button
                            key={slot}
                            onClick={() => setSelectedSlot({ day: avail.day, slot })}
                            style={{
                              padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                              border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                              background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                              color: isSelected ? 'white' : 'var(--text-primary)',
                              fontWeight: '600', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit',
                            }}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {acceptError && (
                  <div style={{
                    padding: 'var(--space-3)',
                    background: 'var(--danger-light)',
                    border: '1px solid var(--danger)',
                    borderRadius: 'var(--radius-md)',
                    marginTop: 'var(--space-3)',
                  }}>
                    <p style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>
                      Could not accept quote
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '4px 0 0' }}>
                      {acceptError}
                    </p>
                  </div>
                )}

                <Button
                  variant="primary" size="lg" fullWidth
                  onClick={handleConfirmSlot}
                  disabled={!selectedSlot || isAccepting}
                  loading={isAccepting}
                  style={{ marginTop: 'var(--space-4)' }}
                >
                  {isAccepting ? 'Accepting…' : 'Confirm This Time Slot'}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Inline error banner for the quote-list path */}
        {!schedulingStep && acceptError && (
          <div style={{
            padding: 'var(--space-3)',
            background: 'var(--danger-light)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-3)',
          }}>
            <p style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 700, margin: 0 }}>
              Could not accept quote
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '4px 0 0' }}>
              {acceptError}
            </p>
          </div>
        )}

        {/* Quote cards */}
        {!schedulingStep && <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {sorted.map((q, idx) => (
            <Card key={q.id} style={{
              padding: 'var(--space-4)',
              border: idx === 0 ? '2px solid var(--primary)' : '1px solid var(--border)',
              position: 'relative',
            }}>
              {idx === 0 && (
                <div style={{
                  position: 'absolute', top: '-12px', left: 'var(--space-4)',
                  background: 'var(--primary)', color: 'white', fontSize: '0.65rem', fontWeight: '800',
                  padding: '3px 10px', borderRadius: 'var(--radius-full)', letterSpacing: '0.05em',
                }}>
                  TOP RATED
                </div>
              )}

              {/* Provider info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {q.tradespersonName}
                    {q.verified && <CheckCircle size={13} color="var(--success)" style={{ display: 'inline', marginLeft: '6px', verticalAlign: 'middle' }} />}
                  </div>
                  <button
                    onClick={() => {}}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--primary)', textDecoration: 'underline' }}>{q.reviewCount} reviews</span>
                  </button>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', fontSize: '1.4rem', color: 'var(--primary)', lineHeight: 1 }}>${q.totalPrice}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>flat rate</div>
                </div>
              </div>

              {/* Quote details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                {[
                  { label: 'Est. Time', value: `${q.estimatedHours} hr${q.estimatedHours !== 1 ? 's' : ''}` },
                  { label: 'Overage Rate', value: `$${q.hourlyOverage}/hr` },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                    <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Message */}
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 var(--space-3)', fontStyle: 'italic' }}>
                "{q.message}"
              </p>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>Submitted {q.submittedAt}</div>

              {/* Accept button */}
              {acceptedId === q.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', justifyContent: 'center', padding: 'var(--space-3)', background: 'var(--success)', borderRadius: 'var(--radius-md)' }}>
                  <CheckCircle size={18} color="white" />
                  <span style={{ color: 'white', fontWeight: '700' }}>Job Accepted — ${acceptedQuote?.totalPrice}</span>
                </div>
              ) : (
                <Button
                  variant={idx === 0 ? 'primary' : 'outline'}
                  fullWidth
                  onClick={() => handleAccept(q.id)}
                  disabled={!!acceptedId || isAccepting}
                  loading={isAccepting && acceptedId === null}
                >
                  {isAccepting && acceptedId === null ? 'Accepting…' : 'Accept This Quote'}
                </Button>
              )}
            </Card>
          ))}
        </div>}
      </div>
    </div>
  );
}

// ── Main Job Board ─────────────────────────────────────────────────────────

export default function JobBoardEnhanced() {
  const { userProfile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('Likelihood Match');
  const [distanceFilter, setDistanceFilter] = useState<number>(60);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [quoteModalJob, setQuoteModalJob] = useState<Job | null>(null);
  const [compareModalJob, setCompareModalJob] = useState<Job | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);

  // Prefer the server-truth role from Postgres (AuthContext.getMe); fall back
  // to the legacy localStorage flag for signed-out dev sessions.
  const userRole = userProfile?.role || localStorage.getItem('userRole') || 'homeowner';
  const isTradeUser = userRole === 'licensed-trade' || userRole === 'non-licensed-trade'
    || userRole === 'licensed_tradesperson' || userRole === 'non_licensed_tradesperson';

  useEffect(() => {
    if (!userProfile) return;

    let cancelled = false;
    setJobsLoading(true);
    setJobsError(null);

    // The API auto-filters by the signed-in user's role:
    //   tradespeople → open jobs on the board
    //   homeowners / property managers / realtors → jobs they've posted
    api.listJobs()
      .then((res) => {
        if (cancelled) return;
        const payload = (res as { jobs?: any[] }) || {};
        const rows = payload.jobs || [];
        setJobs(rows.map(toBoardJob));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load jobs';
        setJobsError(msg);
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });

    return () => { cancelled = true; };
  }, [userProfile, refetchKey]);

  const categories = [
    { id: 'all', label: 'All', count: jobs.length },
    { id: 'plumbing', label: 'Plumbing', count: jobs.filter(j => j.tradeId === 'plumbing').length },
    { id: 'electrical', label: 'Electrical', count: jobs.filter(j => j.tradeId === 'electrical').length },
    { id: 'hvac', label: 'HVAC', count: jobs.filter(j => j.tradeId === 'hvac').length },
    { id: 'general', label: 'General Repairs', count: jobs.filter(j => j.tradeId === 'general').length },
    { id: 'cleaning', label: 'Cleaning', count: jobs.filter(j => j.tradeId === 'cleaning').length },
    { id: 'landscaping', label: 'Landscaping', count: jobs.filter(j => j.tradeId === 'landscaping').length },
    { id: 'snow-removal', label: 'Snow Removal', count: jobs.filter(j => j.tradeId === 'snow-removal').length },
  ];

  const filteredJobs = jobs
    .filter(j => selectedCategory === 'all' || j.tradeId === selectedCategory)
    .filter(j => j.distance <= distanceFilter)
    .sort((a, b) => {
      if (sortBy === 'Likelihood Match') return b.likelihoodScore - a.likelihoodScore;
      if (sortBy === 'Newest') return a.postedAt.localeCompare(b.postedAt);
      if (sortBy === 'Closest') return a.distance - b.distance;
      if (sortBy === 'Expiring Soon') return a.expiresInHours - b.expiresInHours;
      return 0;
    });

  const handleAcceptQuote = async (_jobId: string, quoteId: string) => {
    // Hit the Cloud Run API. The backend writes PG + fans out FCM to the
    // tradesperson; we just refetch the job list on success.
    await api.acceptQuote(quoteId);
    setRefetchKey(k => k + 1);
  };

  const handleSubmitQuote = async (jobId: string, quote: { price: number; hours: number; overage: number; message: string; availability: Availability[] }) => {
    // TODO: `availability` is captured in the modal but not yet accepted by
    // the API. Once the backend adds an availability payload we can pass
    // `quote.availability` through as well.
    void quote.availability;

    await api.submitQuote(jobId, {
      price: quote.price,
      estimated_hours: quote.hours,
      hourly_overage_rate: quote.overage,
      message: quote.message,
    });
    setRefetchKey(k => k + 1);
  };

  return (
    <>
      <TopNav title={isTradeUser ? 'Job Board' : 'My Jobs'} />

      {/* Quote Modals */}
      {quoteModalJob && (
        <QuoteSubmissionModal
          job={quoteModalJob}
          onClose={() => setQuoteModalJob(null)}
          onSubmit={q => handleSubmitQuote(quoteModalJob.id, q)}
        />
      )}
      {compareModalJob && (
        <QuoteComparisonModal
          job={compareModalJob}
          onClose={() => setCompareModalJob(null)}
          onAccept={qid => handleAcceptQuote(compareModalJob.id, qid)}
        />
      )}

      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '90px' }}>
        <div style={{ padding: 'var(--space-4)' }}>

          {/* Controls row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} />
              {isTradeUser ? 'Your service area' : 'Your posted jobs'}
            </div>
            {isTradeUser && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', position: 'relative' }}>
                {/* Sort */}
                <button onClick={() => setShowSortMenu(v => !v)} style={{
                  padding: '5px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '600',
                  background: 'var(--bg-surface)', color: 'var(--text-secondary)',
                  border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                  <SortAsc size={12} /> Sort
                </button>
                {showSortMenu && (
                  <div style={{
                    position: 'absolute', top: '36px', right: 0, background: 'var(--bg-surface)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                    zIndex: 50, minWidth: '180px', overflow: 'hidden',
                  }}>
                    {SORT_OPTIONS.map(opt => (
                      <button key={opt} onClick={() => { setSortBy(opt); setShowSortMenu(false); }} style={{
                        display: 'block', width: '100%', padding: 'var(--space-3) var(--space-4)',
                        background: sortBy === opt ? 'var(--primary-light)' : 'transparent',
                        color: sortBy === opt ? 'var(--primary)' : 'var(--text-primary)',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        fontSize: '0.85rem', fontWeight: sortBy === opt ? '700' : '500', fontFamily: 'inherit',
                      }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Distance slider — visible for both roles */}
          <div style={{ marginBottom: 'var(--space-3)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={12} /> Distance
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary)' }}>
                {distanceFilter === 60 ? 'Any distance' : `Within ${distanceFilter} mi`}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              value={distanceFilter}
              onChange={e => setDistanceFilter(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              <span>1 mi</span>
              <span>60 mi</span>
            </div>
          </div>

          {/* Category filter dropdown */}
          <div style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Filter size={14} color="var(--text-secondary)" />
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--text-secondary)', marginRight: 'var(--space-2)' }}>
                Filter by trade:
              </label>
            </div>
            <div style={{ position: 'relative', marginTop: 'var(--space-2)' }}>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%', padding: 'var(--space-3) var(--space-4)',
                  paddingRight: '40px',
                  border: selectedCategory !== 'all' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: selectedCategory !== 'all' ? 'var(--primary-light)' : 'var(--bg-surface)',
                  color: selectedCategory !== 'all' ? 'var(--primary)' : 'var(--text-primary)',
                  fontSize: '0.875rem', fontWeight: '600', fontFamily: 'inherit',
                  cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none',
                }}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({cat.count})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} style={{
                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                color: selectedCategory !== 'all' ? 'var(--primary)' : 'var(--text-secondary)',
                pointerEvents: 'none',
              }} />
            </div>
          </div>

          {/* Job Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {jobsLoading && (
              <Card style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Loading jobs…</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  Fetching the latest from the board.
                </p>
              </Card>
            )}

            {!jobsLoading && jobsError && (
              <Card style={{ padding: 'var(--space-4)', borderLeft: '3px solid var(--danger)' }}>
                <p style={{ color: 'var(--danger)', fontSize: '0.9rem', margin: 0, fontWeight: 700 }}>
                  Could not load jobs
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: '4px 0 0' }}>
                  {jobsError}
                </p>
              </Card>
            )}

            {!jobsLoading && !jobsError && filteredJobs.map(job => {
              const sb = severityBadge(job.severity);
              const isExpanded = expandedJobId === job.id;

              return (
                <Card key={job.id} padding="none" style={{ overflow: 'hidden' }}>
                  {/* Urgency stripe */}
                  {job.severity === 'urgent' && (
                    <div style={{ height: '4px', background: 'var(--danger)' }} />
                  )}

                  {/* Header */}
                  <div style={{
                    padding: 'var(--space-4)',
                    borderBottom: '1px solid var(--border)',
                    background: job.severity === 'urgent' ? 'rgba(255,59,48,0.03)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                        <Badge variant={sb.variant} size="sm">{sb.label}</Badge>
                        {job.verified && <Badge variant="primary" size="sm">Verified</Badge>}
                        {isTradeUser && (
                          <Badge variant={job.likelihoodScore > 80 ? 'success' : 'neutral'} size="sm">
                            {job.likelihoodScore}% match
                          </Badge>
                        )}
                      </div>
                      <span style={{ fontSize: '0.72rem', color: expiryColor(job.expiresInHours), display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600', flexShrink: 0 }}>
                        <Clock size={11} />
                        {formatExpiry(job.expiresInHours)}
                      </span>
                    </div>

                    <h3 style={{ margin: '0 0 6px', fontSize: '1.05rem', fontWeight: '700', color: 'var(--text-primary)' }}>{job.title}</h3>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={12} /> {job.distance} mi
                      </span>
                      <span>{job.category}</span>
                      {job.photos > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Camera size={12} /> {job.photos} photo{job.photos > 1 ? 's' : ''}
                        </span>
                      )}
                      {job.quotes.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Users size={12} /> {job.quotes.length} quote{job.quotes.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expandable body */}
                  <div style={{ padding: 'var(--space-4)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.55', margin: '0 0 var(--space-3)', WebkitLineClamp: isExpanded ? 'unset' : 3, overflow: 'hidden', display: '-webkit-box', WebkitBoxOrient: 'vertical' as const }}>
                      {job.description}
                    </p>

                    {/* Job metadata */}
                    {isExpanded && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                        {[
                          { label: 'Room', value: job.room },
                          { label: 'Nature', value: job.jobNature },
                          { label: 'Client', value: job.clientName },
                          { label: 'Area', value: job.clientAddress },
                        ].map(item => (
                          <div key={item.label} style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)' }}>
                            <div style={{ fontSize: '0.62rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</div>
                            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-primary)' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button onClick={() => setExpandedJobId(isExpanded ? null : job.id)} style={{
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)',
                      fontSize: '0.78rem', fontWeight: '700', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '4px', marginBottom: 'var(--space-3)',
                    }}>
                      {isExpanded ? <><ChevronUp size={14} /> Show less</> : <><ChevronDown size={14} /> View full details</>}
                    </button>

                    {/* Action row */}
                    {isTradeUser ? (
                      // Tradesperson: submit quote
                      <Button
                        variant="primary"
                        fullWidth
                        onClick={() => setQuoteModalJob(job)}
                        icon={<DollarSign size={16} />}
                        disabled={job.status === 'accepted'}
                        style={job.status === 'accepted' ? { background: 'var(--success)', borderColor: 'var(--success)', opacity: 1, cursor: 'default' } : undefined}
                      >
                        {job.status === 'accepted' ? 'Job Accepted' : 'Submit Quote'}
                      </Button>
                    ) : (
                      // Customer: compare quotes or waiting
                      job.quotes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'var(--primary-light)', borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-2) var(--space-3)', marginBottom: 'var(--space-1)',
                          }}>
                            <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--primary)' }}>
                              {job.quotes.length} quote{job.quotes.length > 1 ? 's' : ''} received
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              From ${Math.min(...job.quotes.map(q => q.totalPrice))} – ${Math.max(...job.quotes.map(q => q.totalPrice))}
                            </span>
                          </div>
                          <Button
                            variant="primary"
                            fullWidth
                            onClick={() => setCompareModalJob(job)}
                            icon={<Users size={16} />}
                            disabled={job.status === 'accepted'}
                            style={job.status === 'accepted' ? { background: 'var(--success)', borderColor: 'var(--success)', opacity: 1, cursor: 'default' } : undefined}
                          >
                            {job.status === 'accepted' ? 'Job Accepted' : 'Compare & Accept Quotes'}
                          </Button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
                          <Clock size={14} color="var(--text-secondary)" />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Waiting for quotes · {formatExpiry(job.expiresInHours)} remaining</span>
                        </div>
                      )
                    )}
                  </div>
                </Card>
              );
            })}

            {!jobsLoading && !jobsError && filteredJobs.length === 0 && (
              <Card style={{ padding: '4rem 2rem', textAlign: 'center' }}>
                <Clock size={40} style={{ margin: '0 auto 1rem', opacity: 0.25 }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>No Jobs Found</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  {isTradeUser ? 'Try adjusting your distance filter or check back soon.' : 'Post your first job to get started.'}
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
