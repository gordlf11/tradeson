import TopNav from '../components/TopNav';
import JobTrackingMap from '../components/JobTrackingMap';

const DEMO_VAN_LOCATION = { lat: 44.1680, lng: -103.1880, updatedAt: new Date() };

export default function JobExecution() {
  return (
    <>
      <TopNav title="Job Execution" />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: 'var(--space-4)', paddingBottom: '90px' }}>
        <JobTrackingMap
          jobId="mock-job-001"
          jobAddress="18 E Main St, Rapid City, SD 57701"
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
