import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  status: 'open' | 'quoted' | 'accepted' | 'expired' | 'pending_confirmation';
  likelihoodScore: number; // 0-100
  intake_answers?: Record<string, unknown>; // structured intake from JobCreation
  sub_service?: string;
  auto_release_at?: string; // ISO — 3-hour countdown for pending_confirmation jobs
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
  if (v === 'pending_confirmation')                   return 'pending_confirmation';
  if (v === 'accepted' || v === 'scheduled' ||
      v === 'confirmed' || v === 'in_progress' ||
      v === 'completed')                              return 'accepted';
  return 'open';
}

function timeUntilRelease(iso: string | undefined): string {
  if (!iso) return 'soon';
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return 'any moment';
  const hrs = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hrs > 0) return `in ${hrs}h ${mins}m`;
  return `in ${mins}m`;
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
    auto_release_at: row.auto_release_at || undefined,
  };
}

// ── Local jobs (created in this session, stored in localStorage) ───────────

function localJobToBoard(j: any): Job {
  const category = j.category || 'General';
  return {
    id: j.id,
    title: j.title,
    category,
    tradeId: category.toLowerCase().replace(/\s+/g, '-'),
    severity: mapSeverity(j.severity),
    distance: 0,
    postedAt: 'just now',
    expiresInHours: 24,
    description: j.description || '',
    room: j.room || '—',
    jobNature: j.job_nature || '—',
    photos: 0,
    quotes: [],
    verified: true,
    clientName: 'You',
    clientAddress: localStorage.getItem('locationStreet') || '—',
    status: 'open',
    likelihoodScore: 0,
  };
}

// ── Fallback mock data (shown when API is unavailable) ─────────────────────

const FALLBACK_JOBS: Job[] = [
  {
    id: 'demo-1', title: 'Kitchen Faucet Leaking — Replacement Needed',
    category: 'Plumbing', tradeId: 'plumbing', severity: 'moderate',
    distance: 2.4, postedAt: '2 hrs ago', expiresInHours: 22,
    description: 'Kitchen faucet has been dripping for weeks. Need a full replacement with a modern fixture.',
    room: 'Kitchen', jobNature: 'Repair', photos: 2, quotes: [],
    verified: true, clientName: 'Sarah M.', clientAddress: '142 Maple Ave, Toronto, ON',
    status: 'open', likelihoodScore: 88,
  },
  {
    id: 'demo-2', title: 'Electrical Panel Upgrade — 100A to 200A',
    category: 'Electrical', tradeId: 'electrical', severity: 'urgent',
    distance: 4.1, postedAt: '5 hrs ago', expiresInHours: 19,
    description: 'Older home needs panel upgrade to support new EV charger. Must be ESA-certified.',
    room: 'Basement', jobNature: 'Upgrade', photos: 3,
    quotes: [
      { id: 'q1', tradespersonId: 'tp-1', tradespersonName: 'Volt Masters Electric', rating: 4.9, reviewCount: 47, totalPrice: 1850, estimatedHours: 8, hourlyOverage: 75, message: 'ESA-certified with 12 years of panel work. Can pull permits same week. Price includes labour and materials.', submittedAt: '1 hr ago', verified: true },
      { id: 'q2', tradespersonId: 'tp-2', tradespersonName: 'PowerPro Electrical', rating: 4.6, reviewCount: 31, totalPrice: 2100, estimatedHours: 10, hourlyOverage: 65, message: 'Licensed master electrician, fully insured. 200A panel with full inspection included. Flexible scheduling.', submittedAt: '2 hrs ago', verified: true },
      { id: 'q3', tradespersonId: 'tp-3', tradespersonName: 'Bright Spark Solutions', rating: 4.4, reviewCount: 19, totalPrice: 1620, estimatedHours: 7, hourlyOverage: 80, message: 'Competitive pricing, ESA permit handled. Work guaranteed for 2 years.', submittedAt: '3 hrs ago', verified: false },
    ],
    verified: true, clientName: 'James K.', clientAddress: '87 Oak St, Mississauga, ON',
    status: 'quoted', likelihoodScore: 76,
  },
  {
    id: 'demo-3', title: 'HVAC Annual Maintenance + Filter Replacement',
    category: 'HVAC', tradeId: 'hvac', severity: 'routine',
    distance: 1.8, postedAt: '1 hr ago', expiresInHours: 23,
    description: 'Annual furnace tune-up and A/C inspection. Replace filters, check refrigerant, clean coils.',
    room: 'Utility Room', jobNature: 'Maintenance', photos: 0, quotes: [],
    verified: false, clientName: 'Linda P.', clientAddress: '34 Pine Cres, Brampton, ON',
    status: 'open', likelihoodScore: 92,
  },
  {
    id: 'demo-4', title: 'Deck Pressure Wash + Stain — 400 sq ft',
    category: 'General Repairs', tradeId: 'general', severity: 'routine',
    distance: 6.3, postedAt: '3 hrs ago', expiresInHours: 21,
    description: 'Cedar deck needs pressure wash and two coats of semi-transparent stain before winter.',
    room: 'Exterior', jobNature: 'Maintenance', photos: 4, quotes: [],
    verified: true, clientName: 'Robert T.', clientAddress: '209 Willow Ln, Oakville, ON',
    status: 'open', likelihoodScore: 65,
  },
  {
    id: 'demo-5', title: 'Deep Clean — 3BR/2BA Before Move-Out',
    category: 'Cleaning', tradeId: 'cleaning', severity: 'routine',
    distance: 3.2, postedAt: '6 hrs ago', expiresInHours: 18,
    description: 'Full deep clean before tenant move-out inspection. Oven, fridge, bathrooms, all surfaces.',
    room: 'Entire Home', jobNature: 'Cleaning', photos: 1, quotes: [],
    verified: false, clientName: 'Maria G.', clientAddress: '501 King St W, Toronto, ON',
    status: 'open', likelihoodScore: 81,
  },
  {
    id: 'demo-6', title: 'Snow Removal Contract — Seasonal',
    category: 'Snow Removal', tradeId: 'snow-removal', severity: 'routine',
    distance: 0.9, postedAt: '12 hrs ago', expiresInHours: 12,
    description: 'Looking for reliable seasonal snow removal. Double driveway + front walkway. On-call within 2hrs.',
    room: 'Exterior', jobNature: 'Contract', photos: 0, quotes: [],
    verified: true, clientName: 'David W.', clientAddress: '77 Birch Rd, Etobicoke, ON',
    status: 'open', likelihoodScore: 73,
  },
  {
    id: 'demo-7', title: 'Lawn Care + Spring Cleanup',
    category: 'Landscaping', tradeId: 'landscaping', severity: 'routine',
    distance: 2.1, postedAt: '8 hrs ago', expiresInHours: 16,
    description: 'Lawn mowing, edging, garden bed cleanup, and leaf removal. Approx 5,000 sq ft lot.',
    room: 'Exterior', jobNature: 'Maintenance', photos: 2, quotes: [],
    verified: true, clientName: 'Priya S.', clientAddress: '88 Elm Dr, Vaughan, ON',
    status: 'quoted', likelihoodScore: 70,
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
  onSubmit: (quote: { price: number; hours: number; overage: number; message: string; availability: Availability[] }) => Promise<void>;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_SLOTS = ['7 AM – 10 AM', '10 AM – 1 PM', '1 PM – 4 PM', '4 PM – 7 PM'];

const MOCK_REVIEWS = [
  { reviewer: 'Sarah M.', rating: 5, text: 'Fantastic work, arrived on time and left the place spotless.', date: 'Oct 2024' },
  { reviewer: 'Tom Chen', rating: 5, text: 'Fixed a tricky leak quickly and the price was fair.', date: 'Sep 2024' },
  { reviewer: 'Linda Ross', rating: 4, text: 'Good communication and solid workmanship overall.', date: 'Aug 2024' },
  { reviewer: 'James O.', rating: 5, text: 'Would absolutely hire again — professional and efficient.', date: 'Jul 2024' },
];

interface ToolItem {
  id: string;
  name: string;
  providerHas: boolean;
}

function QuoteSubmissionModal({ job, onClose, onSubmit }: QuoteModalProps) {
  const [price, setPrice] = useState('');
  const [hours, setHours] = useState('');
  const [overage, setOverage] = useState('');
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [newToolName, setNewToolName] = useState('');

  const tradespersonData = JSON.parse(localStorage.getItem('tradespersonData') || '{}');
  const serviceArea = [tradespersonData.serviceCity, tradespersonData.serviceState].filter(Boolean).join(', ')
    || (tradespersonData.primaryTrades?.length ? `${tradespersonData.serviceRadius || 25} mi radius` : '');
  const rating = 4.8;
  const reviewCount = 47;

  const addTool = () => {
    const name = newToolName.trim();
    if (!name) return;
    setTools(prev => [...prev, { id: `t${Date.now()}`, name, providerHas: true }]);
    setNewToolName('');
  };

  const toggleToolOwner = (id: string) =>
    setTools(prev => prev.map(t => t.id === id ? { ...t, providerHas: !t.providerHas } : t));

  const removeTool = (id: string) => setTools(prev => prev.filter(t => t.id !== id));

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

            {/* Structured intake answers — gives tradespeople the facts before quoting */}
            {job.intake_answers && Object.keys(job.intake_answers).length > 0 && (
              <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: 'var(--space-2)' }}>
                  Job Details
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                  {Object.entries(job.intake_answers).map(([key, val]) => {
                    if (!val || (Array.isArray(val) && val.length === 0)) return null;
                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                    const display = Array.isArray(val) ? (val as string[]).join(', ') : String(val);
                    return (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontWeight: '500', flexShrink: 0 }}>{label}</span>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '600', textAlign: 'right' }}>{display}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* My profile preview */}
            <Card style={{ padding: 'var(--space-3)', background: 'var(--primary-light)', border: '1px solid var(--primary)', marginBottom: 'var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: reviewsExpanded ? 'var(--space-3)' : 0 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {tradespersonData.businessName || tradespersonData.fullName || 'Your Business'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <StarRow rating={rating} />
                    <button
                      onClick={() => setReviewsExpanded(e => !e)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', fontFamily: 'inherit' }}
                    >
                      {reviewCount} reviews {reviewsExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                  </div>
                  {serviceArea ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={11} />
                      <span>Services: {serviceArea}</span>
                    </div>
                  ) : null}
                </div>
                <Badge variant="success" size="sm">Verified</Badge>
              </div>

              {reviewsExpanded && (
                <div style={{ borderTop: '1px solid var(--primary)', paddingTop: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {MOCK_REVIEWS.map((r, i) => (
                    <div key={i} style={{ paddingBottom: i < MOCK_REVIEWS.length - 1 ? 'var(--space-3)' : 0, borderBottom: i < MOCK_REVIEWS.length - 1 ? '1px solid rgba(var(--primary-rgb,247,107,38),0.2)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.78rem', color: 'var(--text-primary)' }}>{r.reviewer}</span>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>{r.date}</span>
                      </div>
                      <StarRow rating={r.rating} />
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>{r.text}</p>
                    </div>
                  ))}
                </div>
              )}
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

            {/* Tools & services checklist */}
            <div style={{ marginTop: 'var(--space-4)' }}>
              <label style={{ display: 'block', fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Required Tools & Equipment
              </label>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                List the tools needed. Toggle who provides each — the customer will see this when reviewing your quote.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <input
                  type="text"
                  placeholder="e.g. Pipe wrench, ladder…"
                  value={newToolName}
                  onChange={e => setNewToolName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTool(); } }}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit', fontSize: '0.85rem', color: 'var(--text-primary)', background: 'var(--bg-surface)' }}
                />
                <button onClick={addTool} style={{ padding: '8px 14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'inherit' }}>Add</button>
              </div>
              {tools.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {tools.map(tool => (
                    <div key={tool.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px 10px', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: '500' }}>{tool.name}</span>
                      <button
                        onClick={() => toggleToolOwner(tool.id)}
                        style={{
                          padding: '3px 10px', border: 'none', borderRadius: 'var(--radius-full)',
                          background: tool.providerHas ? 'var(--success)' : 'var(--warning)',
                          color: 'white', fontSize: '0.68rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                        }}
                      >
                        {tool.providerHas ? 'I have it' : 'Client provides'}
                      </button>
                      <button onClick={() => removeTool(tool.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center' }}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,28,60,0.65)',
        zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          width: '100%', maxWidth: '600px', padding: '24px 20px 32px', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px' }}>Compare Quotes</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>{job.title} · {job.quotes.length} quote{job.quotes.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '8px', margin: '-8px',
              minWidth: '44px', minHeight: '44px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
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
  const location = useLocation();
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
  const [confirmingJobId, setConfirmingJobId] = useState<string | null>(null);
  const [refetchKey, setRefetchKey] = useState(0);
  const autoCompareHandled = useRef(false);

  // Prefer the server-truth role from Postgres (AuthContext.getMe); fall back
  // to the legacy localStorage flag for signed-out dev sessions.
  const userRole = userProfile?.role || localStorage.getItem('userRole') || 'homeowner';
  const isTradeUser = userRole === 'licensed-trade' || userRole === 'non-licensed-trade'
    || userRole === 'licensed_tradesperson' || userRole === 'non_licensed_tradesperson';

  useEffect(() => {
    // Demo mode: skip API call and profile check — show mock data immediately
    if (localStorage.getItem('demoMode') === 'true') {
      const localJobs = JSON.parse(localStorage.getItem('localJobs') || '[]').map(localJobToBoard);
      setJobs([...localJobs, ...FALLBACK_JOBS]);
      setJobsLoading(false);
      return;
    }

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
        const localJobs = JSON.parse(localStorage.getItem('localJobs') || '[]').map(localJobToBoard);
        setJobs(rows.length > 0 ? [...localJobs, ...rows.map(toBoardJob)] : [...localJobs, ...FALLBACK_JOBS]);
      })
      .catch(() => {
        if (cancelled) return;
        const localJobs = JSON.parse(localStorage.getItem('localJobs') || '[]').map(localJobToBoard);
        setJobs([...localJobs, ...FALLBACK_JOBS]);
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });

    return () => { cancelled = true; };
  }, [userProfile, refetchKey]);

  // Auto-open comparison modal once when navigated from the Dashboard "Compare Quotes" button
  useEffect(() => {
    const state = location.state as { autoCompare?: boolean } | null;
    if (state?.autoCompare && jobs.length > 0 && !autoCompareHandled.current) {
      const jobWithQuotes = jobs.find(j => j.quotes.length > 0);
      if (jobWithQuotes) {
        autoCompareHandled.current = true;
        setCompareModalJob(jobWithQuotes);
      }
    }
  }, [jobs, location.state]);

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

  const handleAcceptQuote = async (jobId: string, quoteId: string) => {
    await api.acceptQuote(quoteId);
    // Attempt pre-auth hold; non-blocking if tradesperson hasn't set up Stripe yet
    try {
      await api.authorizeJobPayment(jobId, quoteId);
    } catch (err) {
      console.warn('Pre-auth skipped (will fall back to manual payout):', err);
    }
    setRefetchKey(k => k + 1);
  };

  const handleConfirmComplete = async (jobId: string) => {
    setConfirmingJobId(jobId);
    try {
      await api.confirmJobComplete(jobId);
      setRefetchKey(k => k + 1);
    } catch (err) {
      console.error('Confirm complete failed:', err);
    } finally {
      setConfirmingJobId(null);
    }
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
      <TopNav title={isTradeUser ? 'Job Board' : 'Jobs I Posted'} />

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
                      <>
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

                        {/* Structured intake answers — only shown when present */}
                        {job.intake_answers && Object.keys(job.intake_answers).length > 0 && (
                          <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                            <p style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--primary)', marginBottom: 'var(--space-2)' }}>
                              Job Details
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                              {Object.entries(job.intake_answers).map(([key, val]) => {
                                if (!val || (Array.isArray(val) && val.length === 0)) return null;
                                const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                                const display = Array.isArray(val) ? (val as string[]).join(', ') : String(val);
                                return (
                                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-3)', fontSize: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-secondary)', fontWeight: '500', flexShrink: 0 }}>{label}</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: '600', textAlign: 'right' }}>{display}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </>
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
                      // Customer view
                      job.status === 'pending_confirmation' ? (
                        // Tradesperson marked done — show 3-hour confirmation window
                        <div style={{
                          background: 'rgba(52,199,89,0.08)', border: '2px solid var(--success)',
                          borderRadius: 'var(--radius-md)', padding: 'var(--space-4)',
                          display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <CheckCircle size={18} color="var(--success)" />
                            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                              Job marked complete by tradesperson
                            </span>
                          </div>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                            Confirm to release payment to your tradesperson. If you take no action, payment auto-releases {timeUntilRelease(job.auto_release_at)}.
                          </p>
                          <Button
                            variant="primary"
                            fullWidth
                            style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                            icon={<CheckCircle size={16} />}
                            loading={confirmingJobId === job.id}
                            onClick={() => handleConfirmComplete(job.id)}
                          >
                            Confirm & Release Payment
                          </Button>
                        </div>
                      ) : job.quotes.length > 0 ? (
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
