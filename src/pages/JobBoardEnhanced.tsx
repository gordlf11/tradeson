import { useState } from 'react';
import { MapPin, Clock, Camera, DollarSign, Users, Star, X, CheckCircle, ChevronDown, ChevronUp, SortAsc, Filter } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

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

// ── Mock data ─────────────────────────────────────────────────────────────

const mockQuotes: Quote[] = [
  { id: 'q1', tradespersonId: 'tp1', tradespersonName: 'Maria Plumbing LLC', rating: 4.9, reviewCount: 87, totalPrice: 195, estimatedHours: 2, hourlyOverage: 75, message: 'I can fix this today. P-trap replacement and reseal — have parts on the truck.', submittedAt: '22 min ago', verified: true },
  { id: 'q2', tradespersonId: 'tp2', tradespersonName: 'Pipe Masters Inc.', rating: 4.6, reviewCount: 52, totalPrice: 175, estimatedHours: 3, hourlyOverage: 65, message: 'Likely a P-trap or drain seal issue. Will inspect and quote on-site if scope changes.', submittedAt: '1 hr ago', verified: true },
  { id: 'q3', tradespersonId: 'tp3', tradespersonName: 'QuickFix Plumbing', rating: 4.2, reviewCount: 31, totalPrice: 220, estimatedHours: 2.5, hourlyOverage: 80, message: 'Available tomorrow morning. Will bring full toolkit.', submittedAt: '2 hrs ago', verified: false },
];

const mockJobs: Job[] = [
  {
    id: '1', title: 'Kitchen Sink Leak Repair', category: 'Plumbing', tradeId: 'plumbing',
    severity: 'moderate', distance: 2.4, postedAt: '5 hrs ago', expiresInHours: 67,
    description: 'Pipe under the kitchen sink is leaking when water is run. Started about 2 days ago and is getting worse. The cabinet below is starting to show water damage.',
    room: 'Kitchen', jobNature: 'Repair / Fix', photos: 3, quotes: mockQuotes, verified: true,
    clientName: 'Sarah J.', clientAddress: '842 Maple Ave', status: 'quoted', likelihoodScore: 92,
  },
  {
    id: '2', title: 'Bathroom Light Fixture Install', category: 'Electrical', tradeId: 'electrical',
    severity: 'routine', distance: 3.1, postedAt: '12 min ago', expiresInHours: 71,
    description: 'Need to replace old vanity light fixture in the master bathroom. New fixture already purchased. Simple wiring swap expected.',
    room: 'Bathroom', jobNature: 'Renovation', photos: 2, quotes: [], verified: true,
    clientName: 'James P.', clientAddress: '310 Elm St', status: 'open', likelihoodScore: 78,
  },
  {
    id: '3', title: 'AC Unit Not Cooling — Emergency', category: 'HVAC', tradeId: 'hvac',
    severity: 'urgent', distance: 1.8, postedAt: '18 min ago', expiresInHours: 70,
    description: 'AC unit stopped cooling completely. House is at 89°F. No visible ice build-up on the unit. Thermostat shows it is running but no cold air coming out.',
    room: 'Whole House', jobNature: 'Repair / Fix', photos: 1, quotes: [], verified: false,
    clientName: 'Tom C.', clientAddress: '57 Oak Drive', status: 'open', likelihoodScore: 85,
  },
  {
    id: '4', title: 'Deck Boards Replacement', category: 'Carpentry', tradeId: 'carpentry',
    severity: 'routine', distance: 4.5, postedAt: '2 days ago', expiresInHours: 22,
    description: 'Several deck boards are rotting and need to be replaced before summer. Approximately 12 linear feet of boards.',
    room: 'Outdoor / Yard', jobNature: 'Renovation', photos: 4, quotes: [mockQuotes[1]], verified: true,
    clientName: 'Linda R.', clientAddress: '1410 Oak Lane', status: 'quoted', likelihoodScore: 60,
  },
];

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
  onSubmit: (quote: { price: number; hours: number; overage: number; message: string; availability: Availability[] }) => void;
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

  const handleSubmit = () => {
    if (!isValid) return;
    onSubmit({ price: parseFloat(price), hours: parseFloat(hours), overage: parseFloat(overage), message, availability });
    setSubmitted(true);
    setTimeout(onClose, 1800);
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
        {submitted ? (
          <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
            <CheckCircle size={48} color="var(--success)" style={{ margin: '0 auto var(--space-4)' }} />
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>Quote Submitted!</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>The customer will be notified and can accept your quote within the 72-hour window.</p>
          </div>
        ) : (
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

            <Button variant="primary" size="lg" fullWidth onClick={handleSubmit} disabled={!isValid}>
              Submit Quote
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Quote Comparison Modal (Customer view) ────────────────────────────────

interface ComparisonModalProps {
  job: Job;
  onClose: () => void;
  onAccept: (quoteId: string) => void;
}

function QuoteComparisonModal({ job, onClose, onAccept }: ComparisonModalProps) {
  const [acceptedId, setAcceptedId] = useState<string | null>(null);
  const [acceptedQuote, setAcceptedQuote] = useState<Quote | null>(null);
  const [schedulingStep, setSchedulingStep] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: string; slot: string } | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleAccept = (qid: string) => {
    const quote = job.quotes.find(q => q.id === qid);
    setAcceptedId(qid);
    setAcceptedQuote(quote ?? null);
    // If the quote has availability, go to scheduling step
    if (quote?.availability && quote.availability.length > 0) {
      setSchedulingStep(true);
    } else {
      setTimeout(() => { onAccept(qid); onClose(); }, 2000);
    }
  };

  const handleConfirmSlot = () => {
    if (!selectedSlot || !acceptedId) return;
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
    setTimeout(() => { onAccept(acceptedId); onClose(); }, 2000);
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

                <Button
                  variant="primary" size="lg" fullWidth
                  onClick={handleConfirmSlot}
                  disabled={!selectedSlot}
                  style={{ marginTop: 'var(--space-4)' }}
                >
                  Confirm This Time Slot
                </Button>
              </>
            )}
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
                  <StarRow rating={q.rating} count={q.reviewCount} />
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
                <Button variant={idx === 0 ? 'primary' : 'outline'} fullWidth onClick={() => handleAccept(q.id)} disabled={!!acceptedId}>
                  Accept This Quote
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
  const [jobs, setJobs] = useState<Job[]>(mockJobs);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState<SortOption>('Likelihood Match');
  const [distanceFilter, setDistanceFilter] = useState<number | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [quoteModalJob, setQuoteModalJob] = useState<Job | null>(null);
  const [compareModalJob, setCompareModalJob] = useState<Job | null>(null);

  const userRole = localStorage.getItem('userRole') || 'homeowner';
  const isTradeUser = userRole === 'licensed-trade' || userRole === 'non-licensed-trade';

  const categories = [
    { id: 'all', label: 'All', count: jobs.length },
    { id: 'plumbing', label: 'Plumbing', count: jobs.filter(j => j.tradeId === 'plumbing').length },
    { id: 'electrical', label: 'Electrical', count: jobs.filter(j => j.tradeId === 'electrical').length },
    { id: 'hvac', label: 'HVAC', count: jobs.filter(j => j.tradeId === 'hvac').length },
    { id: 'carpentry', label: 'Carpentry', count: jobs.filter(j => j.tradeId === 'carpentry').length },
  ];

  const filteredJobs = jobs
    .filter(j => selectedCategory === 'all' || j.tradeId === selectedCategory)
    .filter(j => distanceFilter === null || j.distance <= distanceFilter)
    .sort((a, b) => {
      if (sortBy === 'Likelihood Match') return b.likelihoodScore - a.likelihoodScore;
      if (sortBy === 'Newest') return a.postedAt.localeCompare(b.postedAt);
      if (sortBy === 'Closest') return a.distance - b.distance;
      if (sortBy === 'Expiring Soon') return a.expiresInHours - b.expiresInHours;
      return 0;
    });

  const handleAcceptQuote = (jobId: string, _quoteId: string) => {
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, status: 'accepted' as const } : j
    ));
  };

  const handleSubmitQuote = (jobId: string, quote: { price: number; hours: number; overage: number; message: string; availability: Availability[] }) => {
    const tpData = JSON.parse(localStorage.getItem('tradespersonData') || '{}');
    const newQuote: Quote = {
      id: Date.now().toString(),
      tradespersonId: 'me',
      tradespersonName: tpData.businessName || tpData.fullName || 'Your Business',
      rating: 4.8, reviewCount: 47,
      totalPrice: quote.price, estimatedHours: quote.hours, hourlyOverage: quote.overage,
      message: quote.message, submittedAt: 'just now', verified: true,
      availability: quote.availability,
    };
    setJobs(prev => prev.map(j =>
      j.id === jobId ? { ...j, quotes: [...j.quotes, newQuote], status: 'quoted' as const } : j
    ));
  };

  return (
    <>
      <TopNav title={isTradeUser ? 'Job Board' : 'My Jobs'} />

      {/* Quote Modals */}
      {quoteModalJob && (
        <QuoteSubmissionModal
          job={quoteModalJob}
          onClose={() => setQuoteModalJob(null)}
          onSubmit={q => { handleSubmitQuote(quoteModalJob.id, q); }}
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
            <div style={{ display: 'flex', gap: 'var(--space-2)', position: 'relative' }}>
              {isTradeUser && (
                <>
                  {/* Distance filter */}
                  {[5, 10, 25].map(d => (
                    <button key={d} onClick={() => setDistanceFilter(distanceFilter === d ? null : d)} style={{
                      padding: '5px 10px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: '600',
                      background: distanceFilter === d ? 'var(--primary)' : 'var(--bg-surface)',
                      color: distanceFilter === d ? 'white' : 'var(--text-secondary)',
                      border: `1px solid ${distanceFilter === d ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      {d}mi
                    </button>
                  ))}
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
                </>
              )}
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
            {filteredJobs.map(job => {
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

            {filteredJobs.length === 0 && (
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
