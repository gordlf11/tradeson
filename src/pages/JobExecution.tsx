import TopNav from '../components/TopNav';
import JobTrackingMap from '../components/JobTrackingMap';

const DEMO_VAN_LOCATION = { lat: 39.7617, lng: -89.6801, updatedAt: new Date() };

export default function JobExecution() {
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
