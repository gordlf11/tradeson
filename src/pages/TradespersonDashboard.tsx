import { } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase, DollarSign, Star, AlertTriangle, Calendar,
  Clock, ChevronRight, CheckCircle, TrendingUp, Shield
} from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface ActiveJob {
  id: string;
  title: string;
  client: string;
  address: string;
  status: 'confirmed' | 'en-route' | 'in-progress' | 'completed';
  scheduledDate: string;
  estimatedValue: number;
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

const mockActiveJobs: ActiveJob[] = [
  { id: '1', title: 'Kitchen Sink Leak Repair', client: 'Sarah Johnson', address: '842 Maple Ave', status: 'confirmed', scheduledDate: 'Today, 2:00 PM', estimatedValue: 220 },
  { id: '2', title: 'Bathroom Electrical Outlet', client: 'James Park', address: '310 Elm St', status: 'in-progress', scheduledDate: 'Today, 4:30 PM', estimatedValue: 175 },
  { id: '3', title: 'HVAC Annual Tune-Up', client: 'Maria Torres', address: '57 Oak Drive', status: 'confirmed', scheduledDate: 'Tomorrow, 9:00 AM', estimatedValue: 310 },
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

  const tradespersonData = JSON.parse(localStorage.getItem('tradespersonData') || '{}');
  const userRole = localStorage.getItem('userRole') || 'licensed-trade';
  const displayName = tradespersonData.fullName || tradespersonData.businessName || 'Tradesperson';
  const rating = 4.8;
  const reviewCount = 47;

  return (
    <>
      <TopNav title="Dashboard" />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '90px' }}>

        {/* Hero Header — Navy */}
        <div style={{ background: 'var(--navy)', padding: 'var(--space-6) var(--space-4) var(--space-8)' }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', margin: '0 0 4px', fontWeight: '500' }}>
            {userRole === 'licensed-trade' ? 'Licensed Tradesperson' : 'Service Provider'}
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

          {/* Earnings Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
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
        </div>

        {/* Compliance Alerts */}
        {mockAlerts.some(a => a.daysLeft < 90) && (
          <div style={{ padding: '0 var(--space-4)', position: 'relative', zIndex: 10, marginTop: '-20px' }}>
            {mockAlerts.filter(a => a.daysLeft < 90).map(alert => (
              <div key={alert.id} style={{
                background: alert.daysLeft < 30 ? 'var(--danger-light)' : 'rgba(255,149,0,0.1)',
                border: `1px solid ${alert.daysLeft < 30 ? 'var(--danger)' : 'var(--warning)'}`,
                borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-2)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              }}>
                <AlertTriangle size={18} color={alert.daysLeft < 30 ? 'var(--danger)' : 'var(--warning)'} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{alert.label} Expiring</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Expires {alert.expiresOn} · {alert.daysLeft} days left</div>
                </div>
                <ChevronRight size={16} color="var(--text-secondary)" />
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Active & Upcoming Jobs */}
          <div>
            {sectionHeader('Active & Upcoming Jobs', `${mockActiveJobs.length} assignments`)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {mockActiveJobs.map(job => {
                const sc = statusConfig[job.status];
                return (
                  <Card key={job.id} interactive style={{ padding: 'var(--space-4)' }} onClick={() => navigate('/job-execution')}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '2px' }}>{job.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{job.client} · {job.address}</div>
                      </div>
                      <Badge variant={sc.variant} size="sm">{sc.label}</Badge>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <Clock size={13} />
                        {job.scheduledDate}
                      </div>
                      <div style={{ fontWeight: '800', fontSize: '0.95rem', color: 'var(--primary)' }}>${job.estimatedValue}</div>
                    </div>
                  </Card>
                );
              })}
            </div>
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
    </>
  );
}
