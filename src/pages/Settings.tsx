import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, CreditCard, Bell, Shield, LogOut, ChevronRight, Edit2, Plus, Check, RefreshCw } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const ALL_ROLES = [
  { id: 'homeowner', label: 'Homeowner', description: 'Post jobs and hire tradespeople' },
  { id: 'property-manager', label: 'Property Manager', description: 'Manage multiple properties' },
  { id: 'realtor', label: 'Realtor', description: 'Coordinate work for property listings' },
  { id: 'licensed-trade', label: 'Licensed Tradesperson', description: 'Accept jobs and get paid' },
  { id: 'non-licensed-trade', label: 'Service Provider', description: 'Offer unlicensed services' },
];

function getRoleDisplayName(role: string) {
  return ALL_ROLES.find(r => r.id === role)?.label ?? 'User';
}

export default function Settings() {
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showAddRole, setShowAddRole] = useState(false);

  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
  const userName = localStorage.getItem('userName') || '';
  const userRole = localStorage.getItem('userRole') || 'homeowner';
  const additionalRoles: string[] = JSON.parse(localStorage.getItem('additionalRoles') || '[]');
  const allUserRoles = [userRole, ...additionalRoles.filter(r => r !== userRole)];

  const addRole = (roleId: string) => {
    if (allUserRoles.includes(roleId)) return;
    const updated = [...additionalRoles.filter(r => r !== userRole), roleId];
    localStorage.setItem('additionalRoles', JSON.stringify(updated));
    setShowAddRole(false);
    window.location.reload();
  };

  const switchRole = (roleId: string) => {
    const remaining = allUserRoles.filter(r => r !== roleId);
    localStorage.setItem('userRole', roleId);
    localStorage.setItem('additionalRoles', JSON.stringify(remaining));
    window.location.href = '/dashboard';
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
        <Card style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
            <div style={{ width: '60px', height: '60px', background: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={24} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '2px', color: 'var(--text-primary)' }}>
                {userName || getRoleDisplayName(userRole)}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 0 }}>{userEmail}</p>
            </div>
            <button onClick={() => navigate('/profile')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}>
              <Edit2 size={18} />
            </button>
          </div>
        </Card>

        {/* Role Management */}
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            My Roles
          </h3>
          <Card style={{ padding: 0 }}>
            {allUserRoles.map((role, i) => (
              <div key={role} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-4)',
                borderBottom: i < allUserRoles.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ width: '36px', height: '36px', background: role === userRole ? 'var(--primary)' : 'var(--bg-base)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {role === userRole ? <Check size={18} color="white" /> : <User size={18} color="var(--text-secondary)" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-primary)' }}>{getRoleDisplayName(role)}</div>
                  {role === userRole && <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: '600' }}>Active</div>}
                </div>
                {role !== userRole && (
                  <button
                    onClick={() => switchRole(role)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: 'var(--radius-full)', color: 'var(--primary)', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    <RefreshCw size={12} /> Switch
                  </button>
                )}
              </div>
            ))}

            {!showAddRole ? (
              <button
                onClick={() => setShowAddRole(true)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', background: 'transparent', border: 'none', cursor: 'pointer', borderTop: allUserRoles.length > 0 ? '1px solid var(--border)' : 'none', color: 'var(--primary)', fontFamily: 'inherit' }}
              >
                <div style={{ width: '36px', height: '36px', border: '2px dashed var(--primary)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Plus size={16} color="var(--primary)" />
                </div>
                <span style={{ fontSize: '0.95rem', fontWeight: '600' }}>Add Another Role</span>
              </button>
            ) : (
              <div style={{ padding: 'var(--space-4)', borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', fontWeight: '600' }}>Select a role to add:</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {ALL_ROLES.filter(r => !allUserRoles.includes(r.id)).map(role => (
                    <button
                      key={role.id}
                      onClick={() => addRole(role.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>{role.label}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{role.description}</div>
                      </div>
                      <Plus size={16} color="var(--primary)" />
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowAddRole(false)} style={{ marginTop: 'var(--space-3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                  Cancel
                </button>
              </div>
            )}
          </Card>
        </div>

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