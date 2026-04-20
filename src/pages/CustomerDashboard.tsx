import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Clock, CheckCircle, Star,
  Home, Building2, Users, Bell, Briefcase, AlertCircle,
  MessageCircle, Calendar
} from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import MessagingModal from '../components/MessagingModal';
import ReviewModal from '../components/ReviewModal';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface ActiveJob {
  id: string;
  title: string;
  property: string;
  status: 'open' | 'quotes-in' | 'scheduled' | 'in-progress' | 'completed';
  tradeType: string;
  postedAt: string;
  quotesCount: number;
  expiresIn?: string;
  acceptedProvider?: string;
  acceptedProviderId?: string;
  acceptedPrice?: number;
  confirmedDay?: string;
  confirmedSlot?: string;
}

interface QuoteNotification {
  id: string;
  jobTitle: string;
  providerName: string;
  rating: number;
  price: number;
  timeAgo: string;
}

interface HistoryItem {
  id: string;
  title: string;
  provider: string;
  providerId: string;
  completedOn: string;
  paid: number;
  rating: number;
  reviewed: boolean;
}

// ── API row → view model ───────────────────────────────────────────────────

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
  tradesperson_name?: string | null;
}

// Map Postgres job status → the dashboard's ActiveJob status variants.
function mapStatus(pgStatus: string, quoteCount: number): ActiveJob['status'] {
  switch (pgStatus) {
    case 'in_progress': return 'in-progress';
    case 'completed':   return 'completed';
    case 'accepted':
    case 'scheduled':
    case 'confirmed':   return 'scheduled';
    case 'open':
    default:            return quoteCount > 0 ? 'quotes-in' : 'open';
  }
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function expiresInLabel(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const diffMs = new Date(iso).getTime() - Date.now();
  if (diffMs <= 0) return 'expired';
  const totalMinutes = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return `${hrs}h ${mins.toString().padStart(2, '0')}m`;
}

function toActiveJob(row: ApiJobRow): ActiveJob {
  const quotesCount = Number(row.quote_count ?? 0);
  const addressLine = [row.address, row.city].filter(Boolean).join(', ') || '—';
  const budgetMax = row.budget_max != null ? Number(row.budget_max) : 0;
  const budgetMin = row.budget_min != null ? Number(row.budget_min) : 0;
  const acceptedPrice = budgetMax || budgetMin || undefined;
  return {
    id: row.id,
    title: row.title,
    property: addressLine,
    status: mapStatus(row.status, quotesCount),
    tradeType: row.category || 'General',
    postedAt: relativeTime(row.created_at),
    quotesCount,
    expiresIn: expiresInLabel(row.expires_at),
    acceptedProvider: row.tradesperson_name || undefined,
    acceptedProviderId: row.assigned_tradesperson_id || undefined,
    acceptedPrice,
  };
}

// ── Fallback jobs (shown when API is unavailable) ─────────────────────────

const FALLBACK_JOBS: ActiveJob[] = [
  {
    id: 'demo-job-1', title: 'Kitchen Faucet Replacement',
    property: '142 Maple Ave, Toronto', status: 'scheduled', tradeType: 'Plumbing',
    postedAt: '2 days ago', quotesCount: 3,
    acceptedProvider: "Mike's Plumbing Co.", acceptedProviderId: 'trade-1',
    acceptedPrice: 285, confirmedDay: 'Mon, Oct 21', confirmedSlot: '10:00 AM',
  },
  {
    id: 'demo-job-2', title: 'Electrical Panel Upgrade',
    property: '142 Maple Ave, Toronto', status: 'quotes-in', tradeType: 'Electrical',
    postedAt: '1 day ago', quotesCount: 2,
  },
  {
    id: 'demo-job-3', title: 'HVAC Annual Maintenance',
    property: '142 Maple Ave, Toronto', status: 'open', tradeType: 'HVAC',
    postedAt: '6 hours ago', quotesCount: 0, expiresIn: '18 hours',
  },
];

// ── Mock data (not yet wired to api) ───────────────────────────────────────

// TODO: wire to api — quotes endpoint does not exist yet on Cloud Run API.
const mockNotifications: QuoteNotification[] = [
  { id: 'n1', jobTitle: 'Kitchen Sink Leak', providerName: 'Maria Plumbing LLC', rating: 4.9, price: 195, timeAgo: '22 min ago' },
  { id: 'n2', jobTitle: 'Kitchen Sink Leak', providerName: 'Pipe Masters Inc.', rating: 4.6, price: 175, timeAgo: '1 hr ago' },
];

// TODO: wire to api — payment history endpoint does not exist yet.
const mockHistory: HistoryItem[] = [
  { id: 'h1', title: 'Deck Power Washing', provider: 'CleanPro Services', providerId: 'tp_clean', completedOn: 'Mar 28', paid: 225, rating: 5, reviewed: true },
  { id: 'h2', title: 'Dryer Vent Cleaning', provider: 'SafeAir Solutions', providerId: 'tp_safe', completedOn: 'Mar 12', paid: 95, rating: 0, reviewed: false },
];

// ── Helpers ────────────────────────────────────────────────────────────────

const statusConfig: Record<ActiveJob['status'], { label: string; variant: 'primary' | 'warning' | 'success' | 'neutral' | 'danger' }> = {
  'open':        { label: 'Open',        variant: 'neutral' },
  'quotes-in':   { label: 'Quotes In',   variant: 'warning'   },
  'scheduled':   { label: 'Scheduled',   variant: 'primary'   },
  'in-progress': { label: 'In Progress', variant: 'success'   },
  'completed':   { label: 'Completed',   variant: 'success'   },
};

const sectionHeader = (title: string, sub?: string, action?: { label: string; onClick: () => void }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'var(--space-3)' }}>
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>{title}</h2>
      {sub && <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>{sub}</p>}
    </div>
    {action && (
      <button onClick={action.onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--primary)', fontWeight: '600', fontFamily: 'inherit' }}>
        {action.label}
      </button>
    )}
  </div>
);

function getRoleDetails(role: string) {
  switch (role) {
    case 'realtor': return { label: 'Realtor', icon: <Users size={14} />, greeting: 'Your Client Jobs' };
    case 'property-manager': return { label: 'Property Manager', icon: <Building2 size={14} />, greeting: 'Your Properties' };
    default: return { label: 'Homeowner', icon: <Home size={14} />, greeting: 'Your Home' };
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();

  const userRole = userProfile?.role || 'homeowner';
  const userId = userProfile?.id || '';
  const displayName = userProfile?.full_name || 'there';
  const roleDetails = getRoleDetails(userRole);

  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  const [messagingJob, setMessagingJob] = useState<ActiveJob | null>(null);
  const [reviewItem, setReviewItem] = useState<HistoryItem | null>(null);
  const [historyReviewed, setHistoryReviewed] = useState<Record<string, boolean>>(
    Object.fromEntries(mockHistory.map(h => [h.id, h.reviewed]))
  );

  useEffect(() => {
    if (!userProfile) return;

    let cancelled = false;

    // Demo mode: skip API call, show mock data immediately
    if (localStorage.getItem('demoMode') === 'true') {
      setJobs(FALLBACK_JOBS);
      setJobsLoading(false);
      return;
    }

    setJobsLoading(true);
    setJobsError(null);

    // API route filters by the signed-in customer's id automatically — no params needed.
    api.listJobs()
      .then((res) => {
        if (cancelled) return;
        const payload = (res as { jobs?: ApiJobRow[] }) || {};
        const rows = payload.jobs || [];
        setJobs(rows.length > 0 ? rows.map(toActiveJob) : FALLBACK_JOBS);
      })
      .catch(() => {
        if (cancelled) return;
        // API unavailable — show demo data so the dashboard is always populated
        setJobs(FALLBACK_JOBS);
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });

    return () => { cancelled = true; };
  }, [userProfile]);

  const activeJobs = jobs.filter(j => j.status !== 'completed');

  // Enrich with confirmed schedules from localStorage (set when accepting a quote)
  const confirmedSchedules = JSON.parse(localStorage.getItem('confirmedSchedules') || '{}');
  const enrichedJobs = activeJobs.map(job => {
    const sched = confirmedSchedules[job.id];
    if (sched && job.status === 'scheduled') {
      return { ...job, confirmedDay: sched.day, confirmedSlot: sched.slot, acceptedProvider: sched.tradespersonName, acceptedPrice: sched.price };
    }
    return job;
  });

  const acceptedJobs = enrichedJobs.filter(j => j.status === 'scheduled' || j.status === 'in-progress');
  const pendingJobs = enrichedJobs.filter(j => j.status === 'open');
  const quotesInJobs = enrichedJobs.filter(j => j.status === 'quotes-in');

  const isJobPoster = userRole === 'homeowner' || userRole === 'property-manager' || userRole === 'realtor';

  if (!userProfile) {
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '90px' }}>

        {/* Hero Header */}
        <div style={{ background: 'var(--navy)', padding: 'var(--space-6) var(--space-4) var(--space-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', fontWeight: '500' }}>
              {roleDetails.icon}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', fontWeight: '500' }}>{roleDetails.label}</span>
          </div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', margin: '0 0 var(--space-4)', letterSpacing: '-0.03em' }}>
            Hey, {displayName.split(' ')[0]}
          </h1>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
            {[
              { label: 'Active Jobs', value: activeJobs.length, icon: <Briefcase size={14} />, sub: 'in progress' },
              { label: 'New Quotes', value: mockNotifications.length, icon: <Bell size={14} />, sub: 'awaiting review' },
              { label: 'Jobs Done', value: mockHistory.length, icon: <CheckCircle size={14} />, sub: 'this year' },
            ].map(stat => (
              <div key={stat.label} style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3)', textAlign: 'center',
              }}>
                <div style={{ color: 'var(--primary)', marginBottom: '4px', display: 'flex', justifyContent: 'center' }}>{stat.icon}</div>
                <div style={{ color: 'white', fontWeight: '800', fontSize: '1.2rem' }}>{stat.value}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', marginTop: '-16px' }}>

          {/* Jobs loading / error banner */}
          {jobsLoading && (
            <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Loading your jobs…</p>
            </Card>
          )}
          {!jobsLoading && jobsError && (
            <Card style={{ padding: 'var(--space-4)', borderLeft: '3px solid var(--danger)' }}>
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', margin: 0, fontWeight: 600 }}>Could not load jobs</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', margin: '4px 0 0' }}>{jobsError}</p>
            </Card>
          )}

          {/* 1. Accepted Jobs */}
          {!jobsLoading && !jobsError && acceptedJobs.length > 0 && (
            <div>
              {sectionHeader('Accepted Jobs', 'Scheduled & currently in progress')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {acceptedJobs.map(job => {
                  const sc = statusConfig[job.status];
                  return (
                    <Card key={job.id} style={{ padding: 'var(--space-4)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                        <div style={{ flex: 1, marginRight: 'var(--space-3)' }}>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{job.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {job.property} · {job.tradeType} · {job.postedAt}
                          </div>
                        </div>
                        <Badge variant={sc.variant} size="sm">{sc.label}</Badge>
                      </div>
                      {job.acceptedProvider && (
                        <div style={{ marginTop: 'var(--space-2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--success)', fontWeight: '600', marginBottom: '4px' }}>
                            <CheckCircle size={12} />
                            {job.acceptedProvider} confirmed · ${job.acceptedPrice}
                          </div>
                          {job.confirmedDay && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                              <Calendar size={11} />
                              {job.confirmedDay} · {job.confirmedSlot}
                            </div>
                          )}
                        </div>
                      )}
                      {job.acceptedProvider && (
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border)' }}>
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
                            Message {job.acceptedProvider}
                          </button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Pending Job Requests */}
          {!jobsLoading && !jobsError && pendingJobs.length > 0 && (
            <div>
              {sectionHeader(
                'Pending Job Requests',
                'Awaiting quotes from tradespeople',
                { label: '+ New Job', onClick: () => navigate('/job-creation') }
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {pendingJobs.map(job => (
                  <Card key={job.id} style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                      <div style={{ flex: 1, marginRight: 'var(--space-3)' }}>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{job.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {job.property} · {job.tradeType} · {job.postedAt}
                        </div>
                      </div>
                      <Badge variant="neutral" size="sm">Open</Badge>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <AlertCircle size={12} />
                      Waiting for quotes · {job.expiresIn} remaining
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state — no jobs at all */}
          {!jobsLoading && !jobsError && acceptedJobs.length === 0 && pendingJobs.length === 0 && quotesInJobs.length === 0 && (
            <div>
              {sectionHeader('Your Jobs', undefined, { label: '+ New Job', onClick: () => navigate('/job-creation') })}
              <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <Home size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 var(--space-4)' }}>No active jobs. Post your first service request.</p>
                <Button variant="primary" onClick={() => navigate('/job-creation')} icon={<Plus size={16} />}>Create a Job</Button>
              </Card>
            </div>
          )}

          {/* 3. New Quotes */}
          {!jobsLoading && !jobsError && (quotesInJobs.length > 0 || mockNotifications.length > 0) && (
            <div>
              {sectionHeader(
                'New Quotes',
                `${mockNotifications.length} quote${mockNotifications.length !== 1 ? 's' : ''} awaiting your decision`,
                { label: 'View All', onClick: () => navigate('/job-board') }
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {mockNotifications.map(notif => (
                  <Card key={notif.id} style={{
                    padding: 'var(--space-4)',
                    border: '2px solid var(--primary)',
                    background: 'var(--primary-light)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{notif.providerName}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>re: {notif.jobTitle} · {notif.timeAgo}</div>
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '1.2rem', color: 'var(--primary)' }}>${notif.price}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={12} fill={s <= Math.floor(notif.rating) ? '#F76B26' : 'none'} color={s <= Math.floor(notif.rating) ? '#F76B26' : 'var(--border)'} />
                        ))}
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>{notif.rating}</span>
                      </div>
                      <Button variant="primary" size="sm" onClick={() => navigate('/job-board')}>
                        Compare Quotes
                      </Button>
                    </div>
                  </Card>
                ))}
                {quotesInJobs.filter(job => !mockNotifications.some(n => n.jobTitle === job.title)).map(job => {
                  const sc = statusConfig[job.status];
                  return (
                    <Card key={job.id} style={{ padding: 'var(--space-4)', cursor: 'pointer' }} onClick={() => navigate('/job-board')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                        <div style={{ flex: 1, marginRight: 'var(--space-3)' }}>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{job.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {job.property} · {job.tradeType} · {job.postedAt}
                          </div>
                        </div>
                        <Badge variant={sc.variant} size="sm">{sc.label}</Badge>
                      </div>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)',
                        padding: 'var(--space-2) var(--space-3)', marginTop: 'var(--space-2)',
                      }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: '600', color: 'var(--primary)' }}>
                          {job.quotesCount} quote{job.quotesCount !== 1 ? 's' : ''} received
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          <Clock size={11} />
                          {job.expiresIn} left
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Property Manager — Properties Overview */}
          {userRole === 'property-manager' && (
            <div>
              {sectionHeader('Properties Overview')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                {[
                  { address: '842 Maple Ave', jobs: 2, status: 'Active' },
                  { address: '310 Elm St', jobs: 1, status: 'Quoted' },
                  { address: '92 Pine Blvd', jobs: 0, status: 'Clear' },
                  { address: '1410 Oak Lane', jobs: 0, status: 'Clear' },
                ].map(prop => (
                  <Card key={prop.address} style={{ padding: 'var(--space-4)' }}>
                    <Building2 size={16} color="var(--primary)" style={{ marginBottom: 'var(--space-2)' }} />
                    <div style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{prop.address}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {prop.jobs > 0 ? `${prop.jobs} active job${prop.jobs > 1 ? 's' : ''}` : 'No active jobs'}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Realtor — Client Jobs */}
          {userRole === 'realtor' && (
            <div>
              {sectionHeader('Client Jobs')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[
                  { client: 'The Johnsons', job: 'HVAC Service', status: 'Open' },
                  { client: 'Maria Chen', job: 'Deck Repair', status: 'Scheduled' },
                ].map(item => (
                  <Card key={item.client} style={{ padding: 'var(--space-3) var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{item.client}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.job}</div>
                      </div>
                      <Badge variant={item.status === 'Open' ? 'neutral' : 'primary'} size="sm">{item.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 4. Payment History */}
          <div>
            {sectionHeader('Payment History', `${mockHistory.length} completed jobs`)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {mockHistory.map(item => (
                <Card key={item.id} style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: historyReviewed[item.id] ? 0 : 'var(--space-3)' }}>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.provider} · {item.completedOn}</div>
                      {item.rating > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginTop: '4px' }}>
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={10} fill={s <= item.rating ? '#F76B26' : 'none'} color={s <= item.rating ? '#F76B26' : 'var(--border)'} />
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)' }}>${item.paid}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: '600' }}>Paid</div>
                    </div>
                  </div>
                  {isJobPoster && !historyReviewed[item.id] && (
                    <button
                      onClick={() => setReviewItem(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', width: '100%',
                        justifyContent: 'center', padding: '8px',
                        background: 'var(--bg-base)', border: '1px dashed var(--border)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)',
                        fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      <Star size={13} />
                      Leave a Review for {item.provider}
                    </button>
                  )}
                  {historyReviewed[item.id] && item.rating === 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--success)', fontWeight: '600' }}>
                      <CheckCircle size={12} />
                      Review submitted
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Button variant="primary" fullWidth onClick={() => navigate('/job-creation')} icon={<Plus size={16} />}>New Job</Button>
              <Button variant="outline" fullWidth onClick={() => navigate('/job-board')} icon={<Briefcase size={16} />}>My Jobs</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Messaging Modal */}
      {messagingJob && messagingJob.acceptedProvider && (
        <MessagingModal
          jobId={messagingJob.id}
          jobTitle={messagingJob.title}
          currentUserId={userId}
          currentUserName={displayName}
          currentUserRole={userRole}
          otherUserId={messagingJob.acceptedProviderId ?? 'tp_unknown'}
          otherUserName={messagingJob.acceptedProvider}
          onClose={() => setMessagingJob(null)}
        />
      )}

      {/* Review Modal */}
      {reviewItem && (
        <ReviewModal
          jobId={reviewItem.id}
          jobTitle={reviewItem.title}
          tradespersonId={reviewItem.providerId}
          tradespersonName={reviewItem.provider}
          reviewerId={userId}
          reviewerName={displayName}
          reviewerRole={userRole}
          onClose={() => {
            setHistoryReviewed(prev => ({ ...prev, [reviewItem.id]: true }));
            setReviewItem(null);
          }}
        />
      )}
    </>
  );
}
