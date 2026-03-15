import { FileText, CheckCircle2, Download } from 'lucide-react';

export default function JobCompletion() {
  return (
    <div className="page-container">
      <div className="text-center mb-6">
        <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
        <h2>Job Completed</h2>
        <p>Review the final invoice from Bob Builder.</p>
      </div>

      <div className="card" style={{ animation: 'fadeIn 0.4s' }}>
        <div className="flex justify-between items-center mb-6" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Invoice #INV-2049</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Generated Today</span>
          </div>
          <FileText size={24} color="var(--primary)" />
        </div>

        <div className="flex flex-col gap-3 mb-6" style={{ fontSize: '0.9rem' }}>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Service Labor (1 hr)</span>
            <span>$150.00</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Parts (PVC Trap)</span>
            <span>$45.00</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--text-secondary)' }}>Platform Fee</span>
            <span>$8.50</span>
          </div>
        </div>

        <div style={{ background: 'var(--bg-surface-elevated)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
          <div className="flex justify-between items-center">
            <span style={{ fontWeight: 600 }}>Total Due</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>$203.50</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button className="btn btn-primary" style={{ display: 'flex', gap: '8px' }}>
            Pay $203.50 Now
          </button>
          <button className="btn btn-secondary" style={{ display: 'flex', gap: '8px', color: 'var(--text-secondary)' }}>
            <Download size={18} /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}
