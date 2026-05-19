import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, CheckCircle,
  Home, Building2, Users, Bell, Briefcase, AlertCircle,
  MessageCircle, Calendar
} from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import MessagingModal from '../components/MessagingModal';
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


interface PaymentRow {
  id: string;
  amount: number;
  status: string;
  date: string;
  job_title: string;
  tx_type: string;
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

// ── Fallback jobs (demo mode only) ────────────────────────────────────────

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
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);

  useEffect(() => {
    // Demo mode: show mock data immediately — don't wait for userProfile
    if (localStorage.getItem('demoMode') === 'true') {
      setJobs(FALLBACK_JOBS);
      setJobsLoading(false);
      setPaymentsLoading(false);
      return;
    }

    if (!userProfile) return;

    let cancelled = false;

    setJobsLoading(true);
    setJobsError(null);

    api.listJobs()
      .then((res) => {
        if (cancelled) return;
        const rows = ((res as { jobs?: ApiJobRow[] }).jobs) || [];
        setJobs(rows.map(toActiveJob));
      })
      .catch(() => {
        if (!cancelled) setJobsError('Could not load jobs. Pull to refresh.');
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });

    setPaymentsLoading(true);
    api.listMyPayments()
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res) ? (res as PaymentRow[]) : [];
        setPayments(rows.filter(r => r.tx_type === 'payment' && r.status === 'completed'));
      })
      .catch(() => {/* non-fatal — history shows empty state */})
      .finally(() => { if (!cancelled) setPaymentsLoading(false); });

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
              { label: 'New Quotes', value: quotesInJobs.length, icon: <Bell size={14} />, sub: 'awaiting review' },
              { label: 'Jobs Done', value: payments.length, icon: <CheckCircle size={14} />, sub: 'completed' },
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
          {!jobsLoading && !jobsError && quotesInJobs.length > 0 && (
            <div>
              {sectionHeader(
                'New Quotes',
                `${quotesInJobs.length} quote${quotesInJobs.length !== 1 ? 's' : ''} awaiting your decision`,
                { label: 'View All', onClick: () => navigate('/job-board') }
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {quotesInJobs.map(job => {
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
                        <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); navigate('/job-board', { state: { autoCompare: true } }); }}>
                          Compare Quotes
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Property Manager — Properties Overview placeholder */}
          {userRole === 'property-manager' && (
            <div>
              {sectionHeader('Properties Overview')}
              <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <Building2 size={28} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                  Property management dashboard coming soon. Your jobs are tracked in the sections above.
                </p>
              </Card>
            </div>
          )}

          {/* 4. Payment History */}
          <div>
            {sectionHeader('Payment History', payments.length > 0 ? `${payments.length} completed job${payments.length !== 1 ? 's' : ''}` : undefined)}
            {paymentsLoading ? (
              <Card style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Loading history…</p>
              </Card>
            ) : payments.length === 0 ? (
              <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <CheckCircle size={28} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No completed jobs yet. Payment history will appear here.</p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {payments.map(item => (
                  <Card key={item.id} style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.job_title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '800', fontSize: '1rem', color: 'var(--text-primary)' }}>${Number(item.amount).toFixed(2)}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: '600' }}>Paid</div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Button variant="primary" fullWidth onClick={() => navigate('/job-creation')} icon={<Plus size={16} />}>New Job</Button>
              <Button variant="outline" fullWidth onClick={() => navigate('/job-board')} icon={<Briefcase size={16} />}>Jobs I Posted</Button>
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

    </>
  );
}
