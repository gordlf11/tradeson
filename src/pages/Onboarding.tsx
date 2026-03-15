import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Wrench } from 'lucide-react';

export default function Onboarding() {
  const [role, setRole] = useState<'homeowner' | 'tradesperson'>('homeowner');
  const navigate = useNavigate();

  const handleContinue = () => {
    if (role === 'homeowner') {
      navigate('/job-creation');
    } else {
      navigate('/job-board');
    }
  };

  return (
    <div className="page-container" style={{ justifyContent: 'center', paddingBottom: 'var(--space-4)' }}>
      <div className="text-center mb-8">
        <h1 style={{ color: 'var(--primary)', marginBottom: '0.5rem' }}>TradesOn</h1>
        <p>Your premium home services marketplace.</p>
      </div>

      <div className="card">
        <h2 className="text-center" style={{ fontSize: '1.25rem' }}>Create Account</h2>
        
        <div className="form-group mt-4">
          <label>I am a...</label>
          <div className="flex flex-col gap-2 mt-2">
            
            {/* Homeowner Option */}
            <div 
              onClick={() => setRole('homeowner')}
              style={{
                padding: 'var(--space-4)',
                border: `2px solid ${role === 'homeowner' ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                cursor: 'pointer',
                backgroundColor: role === 'homeowner' ? 'var(--primary-light)' : 'transparent',
                transition: 'var(--transition)'
              }}
            >
              <div style={{
                background: role === 'homeowner' ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                padding: '10px',
                borderRadius: 'var(--radius-full)',
                color: role === 'homeowner' ? 'white' : 'var(--text-secondary)'
              }}>
                <User size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Homeowner</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>I need to hire a professional.</div>
              </div>
            </div>

            {/* Tradesperson Option */}
            <div 
              onClick={() => setRole('tradesperson')}
              style={{
                padding: 'var(--space-4)',
                border: `2px solid ${role === 'tradesperson' ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                cursor: 'pointer',
                backgroundColor: role === 'tradesperson' ? 'var(--primary-light)' : 'transparent',
                transition: 'var(--transition)'
              }}
            >
              <div style={{
                background: role === 'tradesperson' ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                padding: '10px',
                borderRadius: 'var(--radius-full)',
                color: role === 'tradesperson' ? 'white' : 'var(--text-secondary)'
              }}>
                <Wrench size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Tradesperson</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>I want to find local jobs.</div>
              </div>
            </div>

          </div>
        </div>

        <div className="form-group mt-6">
          <label>Email Address</label>
          <input type="email" placeholder="you@example.com" defaultValue={role === 'homeowner' ? 'alice@example.com' : 'bob@example.com'} />
        </div>

        <div className="form-group">
          <label>Password</label>
          <input type="password" placeholder="••••••••" defaultValue="password123" />
        </div>

        <button className="btn btn-primary mt-4" onClick={handleContinue}>
          Continue as {role === 'homeowner' ? 'Homeowner' : 'Tradesperson'}
        </button>
      </div>
    </div>
  );
}
