import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, Eye, Bell, Lock, Trash2 } from 'lucide-react';
import { Card } from '../components/ui/Card';

interface Toggle {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  default: boolean;
}

const toggles: Toggle[] = [
  { id: 'profileVisible', label: 'Public Profile', description: 'Allow tradespeople to view your profile', icon: <Eye size={18} />, default: true },
  { id: 'emailNotifs', label: 'Email Notifications', description: 'Receive job updates and alerts by email', icon: <Bell size={18} />, default: true },
  { id: 'dataSharing', label: 'Analytics Data Sharing', description: 'Help improve TradesOn with anonymous usage data', icon: <Shield size={18} />, default: false },
];

export default function PrivacySettings() {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<Record<string, boolean>>(
    Object.fromEntries(toggles.map(t => [t.id, t.default]))
  );

  const toggle = (id: string) => setSettings(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: 'var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        paddingTop: 'max(var(--space-4), env(safe-area-inset-top))'
      }}>
        <button
          onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Privacy & Security</h1>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: '40px' }}>

        {/* Privacy toggles */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
            Privacy
          </h3>
          <Card style={{ padding: 0 }}>
            {toggles.map((t, i) => (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                style={{
                  width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 'var(--space-4)',
                  borderBottom: i < toggles.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'left',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', background: 'var(--bg-base)',
                  borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0
                }}>
                  {t.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>{t.label}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{t.description}</div>
                </div>
                <div style={{
                  width: '44px', height: '24px',
                  background: settings[t.id] ? 'var(--primary)' : 'var(--border)',
                  borderRadius: '12px', position: 'relative', transition: 'background-color 0.15s ease', flexShrink: 0
                }}>
                  <div style={{
                    width: '20px', height: '20px', background: 'white', borderRadius: '50%',
                    position: 'absolute', top: '2px',
                    left: settings[t.id] ? '22px' : '2px',
                    transition: 'left 0.15s ease'
                  }} />
                </div>
              </button>
            ))}
          </Card>
        </div>

        {/* Security */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
            Security
          </h3>
          <Card style={{ padding: 0 }}>
            {[
              { label: 'Change Password', icon: <Lock size={18} />, description: 'Update your account password' },
            ].map((item, i, arr) => (
              <button
                key={item.label}
                style={{
                  width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                  padding: 'var(--space-4)',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'left',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', background: 'var(--bg-base)',
                  borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0
                }}>
                  {item.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{item.description}</div>
                </div>
                <ChevronLeft size={18} color="var(--text-tertiary)" style={{ transform: 'rotate(180deg)' }} />
              </button>
            ))}
          </Card>
        </div>

        {/* Danger zone */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--danger)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-3)' }}>
            Danger Zone
          </h3>
          <Card style={{ padding: 0 }}>
            <button
              style={{
                width: '100%', background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', textAlign: 'left',
              }}
            >
              <div style={{
                width: '40px', height: '40px', background: 'rgba(255,74,107,0.08)',
                borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0
              }}>
                <Trash2 size={18} color="var(--danger)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--danger)', marginBottom: '2px' }}>Delete Account</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Permanently remove your account and data</div>
              </div>
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
