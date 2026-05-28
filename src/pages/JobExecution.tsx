import { Briefcase } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import JobTrackingMap from '../components/JobTrackingMap';

const DEMO_VAN_LOCATION = { lat: 39.7617, lng: -89.6801, updatedAt: new Date() };

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

  return (
    <>
      <TopNav title="Job Execution" />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: 'var(--space-4)', paddingBottom: '90px' }}>
        <JobTrackingMap
          jobId="mock-job-001"
          jobAddress="123 Demo St, Springfield, IL"
          tradespersonName="Bob's Plumbing Services"
          tradespersonPhone="(555) 867-5309"
          tradespersonCategory="Plumbing"
          jobStatus="en_route"
          mockLocation={DEMO_VAN_LOCATION}
          onMessageClick={() => {}}
        />
      </div>
    </>
  );
}
