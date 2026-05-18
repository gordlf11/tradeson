import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, DollarSign, Star, AlertTriangle, Calendar,
  Clock, ChevronRight, CheckCircle, TrendingUp, Shield,
  MessageCircle, X,
} from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import MessagingModal from '../components/MessagingModal';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface ActiveJob {
  id: string;
  title: string;
  client: string;
  clientId: string;
  address: string;
  status: 'confirmed' | 'en-route' | 'in-progress' | 'completed';
  scheduledDate: string;
  estimatedValue: number;
  category?: string;
  subService?: string;
}

// Postgres row shape returned from GET /api/v1/jobs (snake_case).
// Kept local — see api/src/routes/jobs.ts for the authoritative schema.
interface ApiJobRow {
  id: string;
  homeowner_user_id: string;
  assigned_tradesperson_id?: string | null;
  title: string;
  description?: string | null;
  category?: string | null;
  room?: string | null;
  severity?: string | null;
  sub_service?: string | null;
  status: string;
  created_at: string;
  expires_at?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  budget_min?: number | string | null;
  budget_max?: number | string | null;
  quote_count?: number | string;
  customer_name?: string | null;
  tradesperson_name?: string | null;
}

// Map Postgres job status → the dashboard's ActiveJob status variants.
function timeUntil(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function mapStatus(pgStatus: string): ActiveJob['status'] {
  switch (pgStatus) {
    case 'in_progress': return 'in-progress';
    case 'en_route':    return 'en-route';
    case 'completed':   return 'completed';
    case 'accepted':
    case 'scheduled':
    case 'confirmed':
    default:            return 'confirmed';
  }
}

function toActiveJob(row: ApiJobRow): ActiveJob {
  const budgetMax = row.budget_max != null ? Number(row.budget_max) : 0;
  const budgetMin = row.budget_min != null ? Number(row.budget_min) : 0;
  // Prefer max budget as "estimated value" proxy until a real quote total is wired.
  const estimatedValue = budgetMax || budgetMin || 0;
  const addressLine = [row.address, row.city].filter(Boolean).join(', ') || '—';
  return {
    id: row.id,
    title: row.title,
    client: row.customer_name || 'Customer',
    clientId: row.homeowner_user_id,
    address: addressLine,
    status: mapStatus(row.status),
    scheduledDate: row.expires_at
      ? new Date(row.expires_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '—',
    estimatedValue,
    category: row.category || undefined,
    subService: row.sub_service || undefined,
  };
}

interface PendingQuote {
  id: string;
  jobTitle: string;
  client: string;
  quotedPrice: number;
  submittedAt: string;
  expiresIn: string;
  bidsTotal: number;
}

interface ComplianceAlert {
  id: string;
  type: 'license' | 'insurance' | 'id';
  label: string;
  expiresOn: string;
  daysLeft: number;
}

const FALLBACK_ACTIVE_JOBS: ActiveJob[] = [
  {
    id: 'demo-aj-1', title: 'Kitchen Faucet Replacement',
    client: 'Sarah M.', clientId: 'demo-client-1',
    address: '142 Maple Ave, Toronto, ON',
    status: 'confirmed', scheduledDate: 'Oct 21', estimatedValue: 285,
  },
  {
    id: 'demo-aj-2', title: 'Basement Flood Cleanup',
    client: 'Linda Ross', clientId: 'demo-client-2',
    address: '55 Elm St, Mississauga, ON',
    status: 'in-progress', scheduledDate: 'Oct 19', estimatedValue: 1200,
  },
];

const FALLBACK_PENDING_QUOTES: PendingQuote[] = [
  { id: 'q1', jobTitle: 'Water Heater Replacement', client: 'Tom Chen', quotedPrice: 850, submittedAt: '3 hrs ago', expiresIn: '21h 14m', bidsTotal: 3 },
  { id: 'q2', jobTitle: 'Basement Flood Cleanup', client: 'Linda Ross', quotedPrice: 1200, submittedAt: '8 hrs ago', expiresIn: '40h 02m', bidsTotal: 2 },
];

const mockAlerts: ComplianceAlert[] = [
  { id: 'a1', type: 'insurance', label: 'Liability Insurance', expiresOn: 'Jun 15, 2025', daysLeft: 71 },
  { id: 'a2', type: 'license', label: 'General Contractor License', expiresOn: 'Sep 30, 2025', daysLeft: 178 },
];

const statusConfig: Record<ActiveJob['status'], { label: string; variant: 'success' | 'warning' | 'primary' | 'neutral'; color: string }> = {
  confirmed:   { label: 'Confirmed',   variant: 'primary',   color: 'var(--primary)' },
  'en-route':  { label: 'En Route',    variant: 'warning',   color: 'var(--warning)' },
  'in-progress': { label: 'In Progress', variant: 'success', color: 'var(--success)' },
  completed:   { label: 'Completed',   variant: 'neutral', color: 'var(--text-secondary)' },
};

// ── Reviews Modal ────────────────────────────────────────────────────────────

interface ReviewRow {
  id: string;
  reviewer_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

function ReviewsModal({ userId, displayName, onClose }: {
  userId: string;
  displayName: string;
  onClose: () => void;
}) {
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.listReviews(userId)
      .then((res) => setReviews(Array.isArray(res) ? res : []))
      .catch(() => setReviews([]))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        width: '100%', maxWidth: '428px', maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: 'var(--space-4)', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
              Reviews
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {displayName}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {loading && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', padding: 'var(--space-6) 0' }}>
              Loading reviews…
            </p>
          )}
          {!loading && reviews.length === 0 && (
            <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
              <Star size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No reviews yet.</p>
            </div>
          )}
          {reviews.map((r) => (
            <div key={r.id} style={{
              background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', padding: 'var(--space-4)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{r.reviewer_name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {new Date(r.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={13} fill={s <= r.rating ? '#F76B26' : 'none'} color={s <= r.rating ? '#F76B26' : 'var(--border)'} />
                  ))}
                </div>
              </div>
              {r.comment && (
                <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Canonical taxonomy — trade → sub-services (mirrors onboarding dropdowns)
const TRADE_SERVICES: Record<string, string[]> = {
  'Plumbing':           ['Drain cleaning','Leak repair','Toilet repair','Faucet / sink','Water heater','New install'],
  'Electrical':         ['Outlet / switch','Light fixture install','Ceiling fan','Panel work','EV charger','Troubleshooting'],
  'HVAC':               ['Furnace repair','AC repair','Maintenance / tune-up','Duct cleaning','Thermostat install','New install'],
  'General Repairs':    ['Furniture assembly','TV mounting','Picture / shelf hanging','Door repair','Drywall patch','Caulking','Curtain / blind install','Childproofing'],
  'Handyman':           ['Furniture assembly','TV mounting','Picture / shelf hanging','Door repair','Drywall patch','Caulking','Curtain / blind install','Childproofing'],
  'Cleaning':           ['Standard','Deep clean','Move-in / Move-out','Post-construction','Carpet cleaning','Window cleaning','Junk removal'],
  'Landscaping':        ['Lawn mowing','Yard cleanup','Tree / shrub trimming','Garden design / planting','Mulching','Aeration / overseeding','Sod install'],
  'Snow Removal':       ['Driveway','Sidewalks / walkways','Steps / entryways','Parking area','Roof','Patio or deck','Mailbox or curb access','Salting / de-icing'],
  'Roofing':            ['Inspection','Leak repair','Shingle replacement','Gutter cleaning','Gutter repair'],
  'Carpentry':          ['Custom builds','Trim / molding','Decking','Framing','Cabinet install'],
  'Masonry':            ['Concrete repair','Driveway / walkway','Brick / stone','Patio install'],
};

const TRADE_COLORS: Record<string, string> = {
  'Plumbing': '#2196F3', 'Electrical': '#F76B26', 'HVAC': '#9C27B0',
  'General Repairs': '#4CAF50', 'Handyman': '#4CAF50', 'Cleaning': '#00BCD4',
  'Landscaping': '#8BC34A', 'Snow Removal': '#90CAF9', 'Roofing': '#795548',
  'Carpentry': '#FF9800', 'Masonry': '#607D8B',
};

function ServiceMixSection({ offeredServices, primaryTrades, completedJobs }: {
  offeredServices: string[];
  primaryTrades: string[];
  completedJobs: ActiveJob[];
}) {
  // Group offered services by parent trade
  const byTrade: { trade: string; services: string[]; jobCount: number }[] = primaryTrades.map(trade => {
    const canonical = TRADE_SERVICES[trade] || [];
    const offered = offeredServices.filter(s => canonical.includes(s));
    const jobCount = completedJobs.filter(j =>
      j.category?.toLowerCase().includes(trade.toLowerCase()) ||
      trade.toLowerCase().includes(j.category?.toLowerCase() || '__')
    ).length;
    return { trade, services: offered.length > 0 ? offered : canonical, jobCount };
  });

  // If no onboarding data, show a placeholder
  if (byTrade.length === 0) {
    return (
      <div>
        {sectionHeader('Service Mix', 'Your expertise breakdown')}
        <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Complete your trade onboarding to see your service breakdown here.
          </p>
        </Card>
      </div>
    );
  }

  const totalServices = byTrade.reduce((s, t) => s + t.services.length, 0);
  const totalJobs = completedJobs.length;

  return (
    <div>
      {sectionHeader('Service Mix', totalJobs > 0
        ? `${totalJobs} completed job${totalJobs !== 1 ? 's' : ''} across ${byTrade.length} trade${byTrade.length !== 1 ? 's' : ''}`
        : `${totalServices} services across ${byTrade.length} trade${byTrade.length !== 1 ? 's' : ''}`
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {byTrade.map(({ trade, services, jobCount }) => {
          const color = TRADE_COLORS[trade] || 'var(--primary)';
          const pct = totalServices > 0 ? Math.round((services.length / totalServices) * 100) : 0;
          return (
            <Card key={trade} style={{ padding: 'var(--space-4)', borderLeft: `3px solid ${color}` }}>
              {/* Trade header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{trade}</span>
                  {totalJobs > 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: '700', color, background: `${color}18`, padding: '2px 7px', borderRadius: 'var(--radius-full)' }}>
                      {jobCount} job{jobCount !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {services.length} service{services.length !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Breadth bar */}
              <div style={{ height: '5px', background: 'var(--border)', borderRadius: '3px', marginBottom: 'var(--space-3)', overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s ease' }} />
              </div>

              {/* Sub-service chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {services.map(svc => {
                  const svcJobs = completedJobs.filter(j =>
                    j.title?.toLowerCase().includes(svc.toLowerCase()) ||
                    j.subService?.toLowerCase() === svc.toLowerCase()
                  ).length;
                  return (
                    <div key={svc} style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      background: 'var(--bg-base)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-full)', padding: '3px 10px',
                      fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '500',
                    }}>
                      <span>{svc}</span>
                      {totalJobs > 0 && (
                        <span style={{ fontWeight: '700', color: svcJobs > 0 ? color : 'var(--text-tertiary)', fontSize: '0.7rem' }}>
                          {svcJobs}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

const sectionHeader = (title: string, sub?: string) => (
  <div style={{ marginBottom: 'var(--space-3)' }}>
    <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
    {sub && <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{sub}</p>}
  </div>
);

export default function TradespersonDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const userRole = userProfile?.role || 'licensed_tradesperson';
  const displayName = userProfile?.full_name || 'Tradesperson';
  const userId = userProfile?.id || '';
  const tpProfile = userProfile?.profile as any;
  // rating removed from header — kept for future use in reviews modal
  // const rating = tpProfile?.rating ? parseFloat(tpProfile.rating) : null;
  const reviewCount = tpProfile?.review_count ?? tpProfile?.jobs_completed ?? 0;
  const jobsCompleted = tpProfile?.jobs_completed ?? 0;

  const [showReviews, setShowReviews] = useState(false);
  const [messagingJob, setMessagingJob] = useState<ActiveJob | null>(null);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(true);

  useEffect(() => {
    // Demo mode: show mock data only
    if (localStorage.getItem('demoMode') === 'true') {
      setActiveJobs(FALLBACK_ACTIVE_JOBS);
      setPendingQuotes(FALLBACK_PENDING_QUOTES);
      setJobsLoading(false);
      setQuotesLoading(false);
      return;
    }

    if (!userProfile) return;

    let cancelled = false;

    // Fetch assigned (active) jobs
    setJobsLoading(true);
    api.listJobs({ acceptedTradespersonId: userProfile.id })
      .then((res) => {
        if (cancelled) return;
        const rows = (res as { jobs?: ApiJobRow[] }).jobs || [];
        setActiveJobs(rows.map(toActiveJob));
      })
      .catch(() => {
        if (!cancelled) setJobsError('Could not load active jobs');
      })
      .finally(() => { if (!cancelled) setJobsLoading(false); });

    // Fetch pending quotes submitted by this tradesperson
    setQuotesLoading(true);
    api.listMyQuotes()
      .then((res) => {
        if (cancelled) return;
        const rows = (res as { quotes?: any[] }).quotes || [];
        setPendingQuotes(rows
          .filter((q) => q.status === 'pending')
          .map((q) => ({
            id: q.id,
            jobTitle: q.job_title,
            client: q.client_name,
            quotedPrice: parseFloat(q.price),
            submittedAt: new Date(q.created_at).toLocaleDateString(),
            expiresIn: q.expires_at ? timeUntil(q.expires_at) : '—',
            bidsTotal: parseInt(q.bids_total) || 1,
          }))
        );
      })
      .catch(() => { /* non-fatal — quotes section stays empty */ })
      .finally(() => { if (!cancelled) setQuotesLoading(false); });

    return () => { cancelled = true; };
  }, [userProfile]);

  if (!userProfile && localStorage.getItem('demoMode') !== 'true') {
    return (
      <>
        <TopNav title="Dashboard" />
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading your dashboard…</div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav title="Dashboard" />

      {showReviews && userId && (
        <ReviewsModal
          userId={userId}
          displayName={displayName}
          onClose={() => setShowReviews(false)}
        />
      )}

      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '90px' }}>

        {/* Hero Header — Navy */}
        <div style={{ background: 'var(--navy)', padding: 'var(--space-6) var(--space-4) var(--space-8)' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '0 0 4px', fontWeight: '500' }}>
            {(userRole === 'licensed-trade' || userRole === 'licensed_tradesperson') ? 'Licensed Tradesperson' : 'Service Provider'}
          </p>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', margin: '0 0 var(--space-3)', letterSpacing: '-0.03em' }}>
            {displayName}
          </h1>
          {/* Reviews chip */}
          <div style={{ marginBottom: 'var(--space-4)' }}>
            <button
              onClick={() => setShowReviews(true)}
              style={{
                background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 'var(--radius-full)', padding: '5px 14px',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Star size={13} fill="#F76B26" color="#F76B26" />
              <span style={{ color: 'white', fontWeight: '700', fontSize: '0.82rem' }}>
                {reviewCount > 0 ? `${reviewCount} review${reviewCount !== 1 ? 's' : ''}` : 'No reviews yet'}
              </span>
              <ChevronRight size={13} color="rgba(255,255,255,0.5)" />
            </button>
          </div>

          {/* Stats Cards — row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            {[
              { label: 'Jobs Done', value: String(jobsCompleted), icon: <CheckCircle size={14} />, sub: 'all time' },
              { label: 'Active', value: String(activeJobs.filter(j => j.status !== 'completed').length), icon: <TrendingUp size={14} />, sub: 'in progress' },
              { label: 'Pending', value: String(pendingQuotes.length), icon: <Clock size={14} />, sub: 'quotes out' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)', textAlign: 'center',
              }}>
                <div style={{ color: 'var(--primary)', marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
                <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.02em' }}>{stat.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginTop: '2px' }}>{stat.label}</div>
                <div style={{ color: 'var(--primary)', fontSize: '0.65rem' }}>{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Earnings Cards — row 2 (real zeros until payment history is wired) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            {[
              { label: 'This Month', value: '$0', icon: <TrendingUp size={14} />, sub: 'earned' },
              { label: 'Pending Payout', value: '$0', icon: <Clock size={14} />, sub: 'awaiting' },
              { label: 'Lifetime', value: '$0', icon: <DollarSign size={14} />, sub: 'total' },
              { label: 'Avg Per Job', value: '$0', icon: <DollarSign size={14} />, sub: 'all time' },
            ].map(stat => (
              <div key={stat.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', textAlign: 'center' }}>
                <div style={{ color: 'var(--primary)', marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
                <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.02em' }}>{stat.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginTop: '2px' }}>{stat.label}</div>
                <div style={{ color: 'var(--primary)', fontSize: '0.65rem' }}>{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Compliance Alerts */}
        {mockAlerts.some(a => a.daysLeft < 90) && (
          <div style={{ padding: 'var(--space-3) var(--space-4) 0', position: 'relative', zIndex: 10, marginTop: '-12px' }}>
            {mockAlerts.filter(a => a.daysLeft < 90).map(alert => (
              <button
                key={alert.id}
                onClick={() => navigate('/insurance-upload')}
                style={{
                  width: '100%', background: alert.daysLeft < 30 ? 'var(--danger-light)' : 'rgba(255,149,0,0.12)',
                  border: `1.5px solid ${alert.daysLeft < 30 ? 'var(--danger)' : 'var(--warning)'}`,
                  borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-2)',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                }}
              >
                <AlertTriangle size={18} color={alert.daysLeft < 30 ? 'var(--danger)' : 'var(--warning)'} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{alert.label} Expiring</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Expires {alert.expiresOn} · {alert.daysLeft} days left — Tap to upload</div>
                </div>
                <ChevronRight size={16} color={alert.daysLeft < 30 ? 'var(--danger)' : 'var(--warning)'} />
              </button>
            ))}
          </div>
        )}

        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Active & Upcoming Jobs */}
          <div>
            {sectionHeader('Active & Upcoming Jobs', `${activeJobs.length} assignments`)}
            {jobsLoading ? (
              <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Loading jobs…</p>
              </Card>
            ) : jobsError ? (
              <Card style={{ padding: 'var(--space-4)', borderLeft: '3px solid var(--danger)' }}>
                <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>Could not load jobs</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '4px 0 0' }}>{jobsError}</p>
              </Card>
            ) : activeJobs.length === 0 ? (
              <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <Briefcase size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No active jobs yet. Browse the job board to submit quotes.</p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {activeJobs.map(job => {
                  const sc = statusConfig[job.status];
                  return (
                    <Card key={job.id} style={{ padding: 'var(--space-4)' }}>
                      <div
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)', cursor: 'pointer' }}
                        onClick={() => navigate('/job-execution')}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{job.title}</div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{job.client} · {job.address}</div>
                        </div>
                        <Badge variant={sc.variant} size="sm">{sc.label}</Badge>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                          <Clock size={13} />
                          {job.scheduledDate}
                        </div>
                        <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--primary)' }}>${job.estimatedValue}</div>
                      </div>
                      {/* Messaging — available on accepted/confirmed jobs */}
                      <div style={{ paddingTop: 'var(--space-2)', borderTop: '1px solid var(--border)' }}>
                        <button
                          onClick={() => setMessagingJob(job)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'var(--primary-light)', border: '1px solid var(--primary)',
                            borderRadius: 'var(--radius-sm)', padding: '6px 12px',
                            color: 'var(--primary)', fontSize: '0.78rem', fontWeight: '700',
                            cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          <MessageCircle size={14} />
                          Message {job.client}
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pending Quotes */}
          <div>
            {sectionHeader('Pending Quotes', 'Awaiting customer selection')}
            {quotesLoading ? (
              <Card style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Loading quotes…</p>
              </Card>
            ) : pendingQuotes.length === 0 ? (
              <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <Briefcase size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No pending quotes. Browse the job board to submit new quotes.</p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {pendingQuotes.map(q => (
                  <Card key={q.id} style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{q.jobTitle}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{q.client} · Submitted {q.submittedAt}</div>
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--primary)' }}>${q.quotedPrice}</div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                          <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Expires in {q.expiresIn}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>{q.bidsTotal} bids total</div>
                      </div>
                      <Badge variant="warning" size="sm">Pending</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Service Mix */}
          <ServiceMixSection
            offeredServices={((userProfile?.profile as any)?.offered_services as string[]) || []}
            primaryTrades={((userProfile?.profile as any)?.primary_trades as string[]) || []}
            completedJobs={activeJobs.filter(j => j.status === 'completed')}
          />

          {/* Verification Status */}
          <div>
            {sectionHeader('Verification Status')}
            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[
                  { label: 'Identity Verified', done: true, icon: <Shield size={16} /> },
                  { label: 'License Uploaded', done: true, icon: <CheckCircle size={16} /> },
                  { label: 'Insurance Verified', done: true, icon: <CheckCircle size={16} /> },
                  { label: 'Stripe Payout Connected', done: false, icon: <DollarSign size={16} /> },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div style={{ color: item.done ? 'var(--success)' : 'var(--text-tertiary)' }}>{item.icon}</div>
                    <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: '500' }}>{item.label}</span>
                    {item.done
                      ? <Badge variant="success" size="sm">Done</Badge>
                      : <Badge variant="neutral" size="sm">Pending</Badge>
                    }
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            {sectionHeader('Quick Actions')}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Button variant="primary" fullWidth onClick={() => navigate('/job-board')} icon={<Briefcase size={16} />}>Browse Jobs</Button>
              <Button variant="outline" fullWidth onClick={() => navigate('/scheduling')} icon={<Calendar size={16} />}>My Schedule</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Messaging Modal */}
      {messagingJob && (
        <MessagingModal
          jobId={messagingJob.id}
          jobTitle={messagingJob.title}
          currentUserId={userId}
          currentUserName={displayName}
          currentUserRole={userRole}
          otherUserId={messagingJob.clientId}
          otherUserName={messagingJob.client}
          onClose={() => setMessagingJob(null)}
        />
      )}
    </>
  );
}
