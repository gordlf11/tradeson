import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, ChevronLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

interface ClientOption {
  id: string;
  title: string;
  description: string;
  recommended?: boolean;
}

export default function OnboardingClientSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const userRole = location.pathname.split('/').pop() || 'homeowner';
  const [selectedOption, setSelectedOption] = useState<string>('sub-accounts');
  const [firstName, setFirstName] = useState('');
  const [clientsCanSubmitJobs, setClientsCanSubmitJobs] = useState(false);

  const clientOptions: ClientOption[] = [
    {
      id: 'professional',
      title: 'Professional Profile',
      description: 'License and brokerage info'
    },
    {
      id: 'service-area',
      title: 'Service Area',
      description: 'Where you work with clients'
    },
    {
      id: 'sub-accounts',
      title: 'Client Sub-Accounts',
      description: 'Invite your first client',
      recommended: true
    },
    {
      id: 'choose-plan',
      title: 'Choose Your Plan',
      description: 'Per job ($25) or Pro ($99/mo)'
    }
  ];

  const handleNext = () => {
    localStorage.setItem('hasOnboarded', 'true');
    localStorage.setItem('userRole', userRole);
    navigate('/job-board');
  };

  return (
    <div className="page-container" style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      padding: 'var(--space-4)',
      paddingTop: '3rem'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)'
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ChevronLeft size={24} color="var(--text-primary)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '0.25rem',
            color: 'var(--text-primary)',
            fontWeight: '600'
          }}>
            Welcome, Realtor!
          </h1>
          <p style={{ 
            color: 'var(--text-secondary)', 
            fontSize: '0.9rem',
            margin: 0
          }}>
            Set up your client management system
          </p>
        </div>
      </div>

      {/* Options List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-6)'
      }}>
        {clientOptions.map(option => (
          <Card
            key={option.id}
            interactive
            onClick={() => setSelectedOption(option.id)}
            style={{
              padding: 'var(--space-4)',
              border: selectedOption === option.id ? '2px solid var(--primary)' : '1px solid var(--border)',
              background: selectedOption === option.id ? 'var(--primary-light)' : 'var(--bg-surface)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              {/* Checkmark Circle */}
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                border: selectedOption === option.id ? 'none' : '2px solid var(--border)',
                background: selectedOption === option.id ? 'var(--success)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {selectedOption === option.id && <Check size={14} color="white" />}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: '600',
                  fontSize: '1rem',
                  color: 'var(--text-primary)',
                  marginBottom: '2px'
                }}>
                  {option.title}
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  {option.description}
                </div>
              </div>

              {/* Recommended Badge */}
              {option.recommended && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '12px',
                  padding: '2px 8px',
                  background: 'var(--primary)',
                  color: 'white',
                  fontSize: '0.7rem',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  Recommended
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Client Invitation Section */}
      {selectedOption === 'sub-accounts' && (
        <Card style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-3)', fontWeight: '600' }}>
            Invite Your First Client
          </h3>
          <input
            type="text"
            placeholder="sarah.jones@email.com"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            style={{
              width: '100%',
              padding: 'var(--space-3)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.95rem',
              marginBottom: 'var(--space-3)'
            }}
          />
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            cursor: 'pointer',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)'
          }}>
            <input
              type="checkbox"
              checked={clientsCanSubmitJobs}
              onChange={(e) => setClientsCanSubmitJobs(e.target.checked)}
              style={{ width: '18px', height: '18px' }}
            />
            <span>Clients can submit jobs too</span>
          </label>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            marginTop: 'var(--space-2)',
            marginBottom: 0
          }}>
            Your clients can submit maintenance requests.<br />
            You control approvals and payments.
          </p>
        </Card>
      )}

      {/* Progress Bar */}
      <div style={{
        height: '8px',
        background: 'var(--border)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        marginBottom: 'var(--space-4)'
      }}>
        <div style={{
          width: '75%',
          height: '100%',
          background: 'var(--primary)',
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Progress Text */}
      <p style={{
        textAlign: 'center',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        marginBottom: 'var(--space-4)'
      }}>
        Progress: 75%
      </p>

      {/* Send Invitation Button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleNext}
      >
        Send Invitation!
      </Button>
    </div>
  );
}