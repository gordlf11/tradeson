import { useState } from 'react';
import { mockJobs } from '../services/mockData';
import { MapPin, Clock, Camera } from 'lucide-react';

export default function JobBoard() {
  const [jobs] = useState(mockJobs.filter(j => j.status === 'open'));

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 style={{ marginBottom: 0 }}>Job Board</h2>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>Springfield Area (5 mile radius)</p>
        </div>
        <div className="badge badge-blue">Filter</div>
      </div>

      <div className="flex flex-col gap-4">
        {jobs.map(job => (
          <div key={job.id} className="card" style={{ padding: '0' }}>
            {/* Job Header */}
            <div style={{ padding: 'var(--space-4)', borderBottom: '1px solid var(--border)' }}>
              <div className="flex justify-between items-center mb-2">
                <span className={`badge ${job.severity === 'medium' ? 'badge-orange' : 'badge-green'}`}>
                  {job.severity.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Just now</span>
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{job.title}</h3>
              <div className="flex items-center gap-4 text-secondary" style={{ fontSize: '0.875rem' }}>
                <div className="flex items-center gap-1"><MapPin size={14}/> 2.4 mi away</div>
              </div>
            </div>

            {/* Job Body */}
            <div style={{ padding: 'var(--space-4)' }}>
              <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                {job.aiSummary}
              </p>

              {/* Photo Mock */}
              <div className="flex gap-2 mb-4 overflow-hidden" style={{ borderRadius: 'var(--radius-sm)' }}>
                <div style={{ flex: 1, height: '80px', background: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                  <Camera size={24} />
                </div>
                <div style={{ flex: 1, height: '80px', background: 'var(--bg-surface-elevated)' }}></div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>AI Quote Range</div>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    ${job.budgetRange?.[0]} - ${job.budgetRange?.[1]}
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                  Submit Quote
                </button>
              </div>
            </div>
          </div>
        ))}

        {jobs.length === 0 && (
          <div className="text-center" style={{ marginTop: '3rem', color: 'var(--text-tertiary)' }}>
            <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No new jobs right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
