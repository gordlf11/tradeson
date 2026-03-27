import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, CreditCard, Bell, Shield, LogOut, ChevronRight, Edit2 } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Settings() {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
  const userRole = localStorage.getItem('userRole') || 'homeowner';

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'homeowner': return 'Homeowner';
      case 'property-manager': return 'Property Manager';
      case 'realtor': return 'Realtor';
      case 'licensed-trade': return 'Licensed Tradesperson';
      case 'non-licensed-trade': return 'Service Provider';
      default: return 'User';
    }
  };

  const handleSignOut = () => {
    localStorage.clear();
    navigate('/login');
  };

  const settingSections = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          label: 'Profile Information',
          description: 'Update your personal details',
          icon: <User size={20} />,
          action: () => navigate('/profile')
        },
        {
          id: 'location',
          label: 'Location & Address',
          description: 'Manage your service locations',
          icon: <MapPin size={20} />,
          action: () => navigate('/location-settings')
        },
        {
          id: 'payment',
          label: 'Payment Methods',
          description: 'Manage payment and billing',
          icon: <CreditCard size={20} />,
          action: () => navigate('/payment-settings')
        }
      ]
    },
    {
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          label: 'Notifications',
          description: notificationsEnabled ? 'Enabled' : 'Disabled',
          icon: <Bell size={20} />,
          action: () => setNotificationsEnabled(!notificationsEnabled),
          isToggle: true
        },
        {
          id: 'privacy',
          label: 'Privacy & Security',
          description: 'Control your privacy settings',
          icon: <Shield size={20} />,
          action: () => navigate('/privacy-settings')
        }
      ]
    }
  ];

  return (
    <>
      <TopNav title="Settings" />
      
      <div className="page-container" style={{
        background: 'var(--bg-base)',
        paddingTop: 'var(--space-4)'
      }}>
        {/* User Info Card */}
        <Card style={{ 
          marginBottom: 'var(--space-6)',
          padding: 'var(--space-6)' 
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'var(--primary)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <User size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '600',
                marginBottom: '4px',
                color: 'var(--text-primary)'
              }}>
                {getRoleDisplayName(userRole)}
              </h2>
              <p style={{
                fontSize: '0.9rem',
                color: 'var(--text-secondary)',
                marginBottom: 0
              }}>
                {userEmail}
              </p>
            </div>
            <button
              onClick={() => navigate('/profile')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)'
              }}
            >
              <Edit2 size={18} />
            </button>
          </div>
        </Card>

        {/* Settings Sections */}
        {settingSections.map((section) => (
          <div key={section.title} style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              marginBottom: 'var(--space-3)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {section.title}
            </h3>
            
            <Card style={{ padding: 0 }}>
              {section.items.map((item, index) => (
                <button
                  key={item.id}
                  onClick={item.action}
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--space-4)',
                    borderBottom: index < section.items.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--bg-base)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '40px',
                    background: 'var(--bg-base)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    flexShrink: 0
                  }}>
                    {item.icon}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '1rem',
                      fontWeight: '500',
                      color: 'var(--text-primary)',
                      marginBottom: '2px'
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {item.description}
                    </div>
                  </div>

                  {item.isToggle ? (
                    <div style={{
                      width: '44px',
                      height: '24px',
                      background: notificationsEnabled ? 'var(--primary)' : 'var(--border)',
                      borderRadius: '12px',
                      position: 'relative',
                      transition: 'background-color 0.15s ease'
                    }}>
                      <div style={{
                        width: '20px',
                        height: '20px',
                        background: 'white',
                        borderRadius: '50%',
                        position: 'absolute',
                        top: '2px',
                        left: notificationsEnabled ? '22px' : '2px',
                        transition: 'left 0.15s ease'
                      }} />
                    </div>
                  ) : (
                    <ChevronRight size={18} color="var(--text-tertiary)" />
                  )}
                </button>
              ))}
            </Card>
          </div>
        ))}

        {/* Sign Out Button */}
        <Button
          variant="outline"
          fullWidth
          onClick={handleSignOut}
          icon={<LogOut size={18} />}
          style={{
            color: 'var(--danger)',
            borderColor: 'var(--danger)',
            marginTop: 'var(--space-6)'
          }}
        >
          Sign Out
        </Button>

        {/* App Version */}
        <div style={{
          textAlign: 'center',
          marginTop: 'var(--space-6)',
          paddingBottom: 'var(--space-8)'
        }}>
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-tertiary)'
          }}>
            TradesOn v1.0.0
          </p>
        </div>
      </div>
    </>
  );
}