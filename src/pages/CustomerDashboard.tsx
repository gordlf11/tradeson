import { useState } from 'react';
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

// ── Mock data ─────────────────────────────────────────────────────────────

const mockJobs: ActiveJob[] = [
  { id: 'j1', title: 'Kitchen Sink Leak', property: '842 Maple Ave', status: 'quotes-in', tradeType: 'Plumbing', postedAt: '5 hrs ago', quotesCount: 3, expiresIn: '67h 15m' },
  {
    id: 'j2', title: 'Bathroom Light Fixture', property: '842 Maple Ave', status: 'scheduled',
    tradeType: 'Electrical', postedAt: 'Yesterday', quotesCount: 5,
    acceptedProvider: 'Mike Sparks', acceptedProviderId: 'tp_mike', acceptedPrice: 140,
    confirmedDay: 'Wednesday', confirmedSlot: '10 AM – 1 PM',
  },
  { id: 'j3', title: 'HVAC Filter Service', property: '310 Elm St', status: 'open', tradeType: 'HVAC', postedAt: '2 hrs ago', quotesCount: 0, expiresIn: '70h 00m' },
];

const mockNotifications: QuoteNotification[] = [
  { id: 'n1', jobTitle: 'Kitchen Sink Leak', providerName: 'Maria Plumbing LLC', rating: 4.9, price: 195, timeAgo: '22 min ago' },
  { id: 'n2', jobTitle: 'Kitchen Sink Leak', providerName: 'Pipe Masters Inc.', rating: 4.6, price: 175, timeAgo: '1 hr ago' },
];

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

  const userRole = localStorage.getItem('userRole') || 'homeowner';
  const userId = localStorage.getItem('userEmail') || 'customer_1';
  const storedData = JSON.parse(
    localStorage.getItem('homeownerData') ||
    localStorage.getItem('realtorData') ||
    localStorage.getItem('propertyManagerData') || '{}'
  );
  const displayName = storedData.fullName || 'there';
  const roleDetails = getRoleDetails(userRole);

  const activeJobs = mockJobs.filter(j => j.status !== 'completed');

  // Enrich with confirmed schedules from localStorage (set when accepting a quote)
  const confirmedSchedules = JSON.parse(localStorage.getItem('confirmedSchedules') || '{}');
  const enrichedJobs = activeJobs.map(job => {
    const sched = confirmedSchedules[job.id];
    if (sched && job.status === 'scheduled') {
      return { ...job, confirmedDay: sched.day, confirmedSlot: sched.slot, acceptedProvider: sched.tradespersonName, acceptedPrice: sched.price };
    }
    return job;
  });

  const [messagingJob, setMessagingJob] = useState<ActiveJob | null>(null);
  const [reviewItem, setReviewItem] = useState<HistoryItem | null>(null);
  const [historyReviewed, setHistoryReviewed] = useState<Record<string, boolean>>(
    Object.fromEntries(mockHistory.map(h => [h.id, h.reviewed]))
  );

  const isJobPoster = userRole === 'homeowner' || userRole === 'property-manager' || userRole === 'realtor';

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

          {/* Quote Notifications */}
          {mockNotifications.length > 0 && (
            <div>
              {sectionHeader(
                'New Quotes to Review',
                `${mockNotifications.length} quotes waiting for your decision`,
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
              </div>
            </div>
          )}

          {/* Active Jobs */}
          <div>
            {sectionHeader(
              'Active Jobs',
              `Across ${userRole === 'property-manager' ? 'your properties' : 'your home'}`,
              { label: '+ New Job', onClick: () => navigate('/job-creation') }
            )}
            {enrichedJobs.length === 0 ? (
              <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                <Home size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--space-4)', margin: '0 0 var(--space-4)' }}>No active jobs. Post your first service request.</p>
                <Button variant="primary" onClick={() => navigate('/job-creation')} icon={<Plus size={16} />}>Create a Job</Button>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {enrichedJobs.map(job => {
                  const sc = statusConfig[job.status];
                  const isAccepted = job.status === 'scheduled' || job.status === 'in-progress';
                  return (
                    <Card key={job.id} style={{ padding: 'var(--space-4)' }}>
                      <div
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)', cursor: 'pointer' }}
                        onClick={() => navigate('/job-board')}
                      >
                        <div style={{ flex: 1, marginRight: 'var(--space-3)' }}>
                          <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{job.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {job.property} · {job.tradeType} · {job.postedAt}
                          </div>
                        </div>
                        <Badge variant={sc.variant} size="sm">{sc.label}</Badge>
                      </div>

                      {/* Status-specific details */}
                      {job.status === 'quotes-in' && (
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
                      )}
                      {job.status === 'open' && job.quotesCount === 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <AlertCircle size={12} />
                          Waiting for quotes · {job.expiresIn} remaining
                        </div>
                      )}
                      {job.status === 'scheduled' && job.acceptedProvider && (
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

                      {/* Messaging icon — accepted jobs only */}
                      {isAccepted && job.acceptedProvider && (
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
            )}
          </div>

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

          {/* Payment & Job History */}
          <div>
            {sectionHeader('Job History & Payments', `${mockHistory.length} completed jobs`)}
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

                  {/* Review button — job posters only, not yet reviewed */}
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
