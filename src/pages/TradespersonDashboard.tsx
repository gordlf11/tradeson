import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, DollarSign, Star, AlertTriangle, Calendar,
  Clock, ChevronRight, CheckCircle, TrendingUp, Shield,
  MessageCircle,
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

const mockPendingQuotes: PendingQuote[] = [
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
  const rating = 4.8;
  const reviewCount = 47;

  const [messagingJob, setMessagingJob] = useState<ActiveJob | null>(null);
  const [activeJobs, setActiveJobs] = useState<ActiveJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [jobsError, setJobsError] = useState<string | null>(null);

  useEffect(() => {
    // Demo mode: skip API call, show mock data immediately — don't wait for userProfile
    if (localStorage.getItem('demoMode') === 'true') {
      setActiveJobs(FALLBACK_ACTIVE_JOBS);
      setJobsLoading(false);
      return;
    }

    if (!userProfile) return;

    let cancelled = false;

    setJobsLoading(true);
    setJobsError(null);

    api.listJobs()
      .then((res) => {
        if (cancelled) return;
        const payload = (res as { jobs?: ApiJobRow[] }) || {};
        const rows = payload.jobs || [];
        const mine = rows.filter((r) => r.assigned_tradesperson_id === userProfile.id);
        setActiveJobs(mine.length > 0 ? mine.map(toActiveJob) : FALLBACK_ACTIVE_JOBS);
      })
      .catch(() => {
        if (cancelled) return;
        // API unavailable — show demo data so the dashboard is always populated
        setActiveJobs(FALLBACK_ACTIVE_JOBS);
      })
      .finally(() => {
        if (!cancelled) setJobsLoading(false);
      });

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
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '90px' }}>

        {/* Hero Header — Navy */}
        <div style={{ background: 'var(--navy)', padding: 'var(--space-6) var(--space-4) var(--space-8)' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '0 0 4px', fontWeight: '500' }}>
            {(userRole === 'licensed-trade' || userRole === 'licensed_tradesperson') ? 'Licensed Tradesperson' : 'Service Provider'}
          </p>
          <h1 style={{ color: 'white', fontSize: '1.5rem', fontWeight: '800', margin: '0 0 var(--space-3)', letterSpacing: '-0.03em' }}>
            {displayName}
          </h1>
          {/* Rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={14} fill={s <= Math.floor(rating) ? '#F76B26' : 'none'} color={s <= Math.floor(rating) ? '#F76B26' : 'rgba(255,255,255,0.4)'} />
            ))}
            <span style={{ color: 'white', fontWeight: '700', fontSize: '0.85rem' }}>{rating}</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem' }}>({reviewCount} reviews)</span>
          </div>

          {/* Earnings Cards — row 1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            {[
              { label: 'This Month', value: '$3,840', icon: <TrendingUp size={14} />, sub: '+12% vs last' },
              { label: 'Pending Payout', value: '$970', icon: <Clock size={14} />, sub: '2 jobs' },
              { label: 'Lifetime', value: '$48,200', icon: <DollarSign size={14} />, sub: '214 jobs' },
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

          {/* Earnings Cards — row 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', textAlign: 'center' }}>
              <div style={{ color: 'var(--primary)', marginBottom: '4px', display: 'flex', justifyContent: 'center' }}><DollarSign size={14} /></div>
              <div style={{ color: 'white', fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.02em' }}>$225</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', marginTop: '2px' }}>Avg Per Job</div>
              <div style={{ color: 'var(--primary)', fontSize: '0.65rem' }}>all time</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Service Mix</div>
              {[
                { label: 'Repair', pct: 35, color: '#F76B26' },
                { label: 'Maintenance', pct: 30, color: '#4CAF50' },
                { label: 'New Install', pct: 25, color: '#2196F3' },
                { label: 'Replacement', pct: 10, color: '#9C27B0' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.12)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: '2px' }} />
                  </div>
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', minWidth: '24px', textAlign: 'right' }}>{row.pct}%</span>
                </div>
              ))}
            </div>
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
            {mockPendingQuotes.length === 0 ? (
              <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <Briefcase size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No pending quotes. Browse the job board to submit new quotes.</p>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {mockPendingQuotes.map(q => (
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
