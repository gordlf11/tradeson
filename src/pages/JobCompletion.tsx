import { CheckCircle2, FileText, Download } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';

export default function JobCompletion() {
  const isDemo = localStorage.getItem('demoMode') === 'true';

  if (!isDemo) {
    return (
      <>
        <TopNav title="Job Completion" />
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
          <Card style={{ padding: 'var(--space-6)', textAlign: 'center', maxWidth: '320px' }}>
            <CheckCircle2 size={48} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-4)' }} />
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)', margin: '0 0 var(--space-2)' }}>
              Invoice & Completion
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
              Your final invoice and job completion summary will appear here once a job is marked complete.
            </p>
          </Card>
        </div>
      </>
    );
  }

  // Demo content preserved below
  return (
    <>
      <TopNav title="Job Completion" />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: 'var(--space-4)', paddingBottom: '90px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto var(--space-4)' }} />
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 var(--space-2)' }}>Job Completed</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Review the final invoice from your tradesperson.</p>
        </div>

        <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 'var(--space-4)', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-4)' }}>
            <div>
              <h3 style={{ margin: '0 0 4px', fontWeight: '700', color: 'var(--text-primary)' }}>Invoice #INV-2049</h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Demo Tradesperson · May 2026</p>
            </div>
            <FileText size={20} color="var(--primary)" />
          </div>
          {[
            { label: 'Service Labor', amount: 150.00 },
            { label: 'Parts (PVC Trap)', amount: 45.00 },
            { label: 'Platform Fee', amount: 8.50 },
          ].map(line => (
            <div key={line.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: '0.875rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{line.label}</span>
              <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>${line.amount.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 'var(--space-3)', borderTop: '2px solid var(--border)', marginTop: 'var(--space-2)', fontSize: '1rem', fontWeight: '800', color: 'var(--text-primary)' }}>
            <span>Total Due</span>
            <span>$203.50</span>
          </div>
        </Card>

        <button style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          padding: '10px', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: '600',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          <Download size={16} />
          Download Invoice PDF
        </button>
      </div>
    </>
  );
}
