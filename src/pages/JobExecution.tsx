import { Navigation, AlertTriangle } from 'lucide-react';

export default function JobExecution() {
  return (
    <div className="page-container">
      <h2>Schedule & Execution</h2>

      <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
        <div className="flex justify-between items-center mb-4">
          <div className="badge badge-blue">UPCOMING JOB</div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tomorrow, 10:00 AM</span>
        </div>
        
        <h3>Leaky Pipe under Kitchen Sink</h3>
        <p style={{ fontSize: '0.9rem', marginBottom: '1.5rem' }}>123 Fake St, Springfield</p>

        {/* Customer View of Schedule */}
        <div className="flex gap-2">
          <button className="btn btn-primary" style={{ flex: 1 }}>
            <Navigation size={18} /> Track Pro
          </button>
          <button className="btn btn-secondary" style={{ flex: 1 }}>
            Contact
          </button>
        </div>
      </div>

      <h3 className="mt-8 mb-4">Onsite Adjustments</h3>
      
      {/* Scope Adjustment UI (Customer View Example) */}
      <div className="card">
        <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--warning)' }}>
          <AlertTriangle size={20} />
          <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>New Scope Update</h4>
        </div>
        
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Bob Builder discovered the trap needs full replacement due to structural cracking.
        </p>

        <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem' }}>
          <div className="flex justify-between mb-2">
            <span>Original Quote</span>
            <span>$150.00</span>
          </div>
          <div className="flex justify-between" style={{ color: 'var(--warning)' }}>
            <span>Additional Parts</span>
            <span>+$45.00</span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '10px 0' }} />
          <div className="flex justify-between" style={{ fontWeight: 600 }}>
            <span>New Total</span>
            <span>$195.00</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="btn btn-primary" style={{ flex: 2 }}>Approve Change</button>
          <button className="btn btn-secondary" style={{ flex: 1 }}>Decline</button>
        </div>
      </div>

    </div>
  );
}
