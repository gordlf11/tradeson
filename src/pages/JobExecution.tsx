import { Briefcase } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';

export default function JobExecution() {
  const isDemo = localStorage.getItem('demoMode') === 'true';

  if (!isDemo) {
    return (
      <>
        <TopNav title="Job Execution" />
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <Card style={{ padding: 'var(--space-6)', textAlign: 'center', maxWidth: '320px' }}>
            <Briefcase size={48} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-4)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 var(--space-2)' }}>
              Live Job Tracking Coming Soon
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Real-time job execution tracking will be available here once your job is in progress.
            </p>
          </Card>
        </div>
      </>
    );
  }

  // Demo content preserved below
  return (
    <>
      <TopNav title="Job Execution" />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: 'var(--space-4)', paddingBottom: '90px' }}>
        <Card style={{ padding: 'var(--space-4)', borderLeft: '4px solid var(--primary)', marginBottom: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: '700', fontSize: '0.72rem', padding: '3px 10px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase' }}>Upcoming Job</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tomorrow, 10:00 AM</span>
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>Leaky Pipe under Kitchen Sink</h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>123 Demo St, Springfield</p>
        </Card>
      </div>
    </>
  );
}
