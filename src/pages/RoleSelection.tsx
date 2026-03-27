import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Wrench, Building, Home, Briefcase, ArrowRight, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type UserRole = 'homeowner' | 'property-manager' | 'realtor' | 'licensed-trade' | 'non-licensed-trade';

interface RoleOption {
  id: UserRole;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const navigate = useNavigate();

  const roles: RoleOption[] = [
    {
      id: 'homeowner',
      title: 'Homeowner',
      description: 'I need help with home repairs and services',
      icon: <Home size={28} />,
      color: 'var(--primary)'
    },
    {
      id: 'property-manager',
      title: 'Property Manager',
      description: 'I manage multiple properties and need services',
      icon: <Building size={28} />,
      color: '#9333EA'
    },
    {
      id: 'realtor',
      title: 'Realtor',
      description: 'I coordinate services for real estate transactions',
      icon: <Briefcase size={28} />,
      color: '#EC4899'
    },
    {
      id: 'licensed-trade',
      title: 'Licensed Tradesperson',
      description: 'I\'m a verified professional with credentials',
      icon: <Wrench size={28} />,
      color: 'var(--success)'
    },
    {
      id: 'non-licensed-trade',
      title: 'General Service Provider (Unlicensed)',
      description: 'I provide general home services and repairs',
      icon: <User size={28} />,
      color: 'var(--warning)'
    }
  ];

  const handleContinue = () => {
    if (!selectedRole) return;

    // Store the selected role
    localStorage.setItem('userRole', selectedRole);

    // Navigate to role-specific onboarding
    switch (selectedRole) {
      case 'homeowner':
        navigate('/onboarding/homeowner');
        break;
      case 'property-manager':
        navigate('/onboarding/property-manager');
        break;
      case 'realtor':
        navigate('/onboarding/realtor');
        break;
      case 'licensed-trade':
        navigate('/onboarding/licensed-trade');
        break;
      case 'non-licensed-trade':
        navigate('/onboarding/non-licensed-trade');
        break;
    }
  };

  return (
    <div className="page-container" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 'var(--space-4)'
    }}>
      {/* Header */}
      <div className="text-center mb-8 animate-slideDown">
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: '700' }}>
          Choose Your Role
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Select how you'll be using TradesOn
        </p>
      </div>

      {/* Role Cards */}
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)'
      }}>
        {roles.map((role, index) => (
          <Card
            key={role.id}
            interactive
            className="animate-slideUp"
            style={{
              animationDelay: `${index * 0.05}s`,
              cursor: 'pointer',
              border: selectedRole === role.id ? `2px solid var(--primary)` : '1px solid var(--border)',
              background: selectedRole === role.id ? 'var(--primary-light)' : 'var(--bg-surface)',
              position: 'relative',
              transition: 'all 0.3s ease',
              boxShadow: selectedRole === role.id ? 'var(--shadow-md)' : 'var(--shadow-sm)'
            }}
            onClick={() => setSelectedRole(role.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
              {/* Icon */}
              <div style={{
                width: '56px',
                height: '56px',
                background: selectedRole === role.id ? 'var(--primary)' : 'var(--bg-base)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: selectedRole === role.id ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.3s ease',
                flexShrink: 0
              }}>
                {role.icon}
              </div>

              {/* Content */}
              <div style={{ flex: 1 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  marginBottom: '4px'
                }}>
                  {role.title}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)'
                }}>
                  {role.description}
                </p>
              </div>

              {/* Checkmark */}
              {selectedRole === role.id && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  width: '24px',
                  height: '24px',
                  background: role.color,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Check size={14} color="white" />
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Continue Button */}
      <div style={{ maxWidth: '600px', margin: '2rem auto 0', width: '100%' }}>
        <Button
          variant="primary"
          size="lg"
          fullWidth
          disabled={!selectedRole}
          onClick={handleContinue}
          icon={<ArrowRight size={20} />}
        >
          Continue
        </Button>
      </div>

      {/* Info Text */}
      <p className="text-center mt-4" style={{
        fontSize: '0.8rem',
        color: 'var(--text-tertiary)'
      }}>
        You can update your role anytime in settings
      </p>
    </div>
  );
}