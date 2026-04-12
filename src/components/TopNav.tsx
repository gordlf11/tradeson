import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Menu, Settings, User, Briefcase, Plus, X, ChevronDown,
  LayoutDashboard, Calendar, DollarSign, Users, Home, Building2
} from 'lucide-react';
import { TradesOnWordmark } from './Logo';

interface TopNavProps {
  title?: string;
  showMenu?: boolean;
}

function getRoleMenuItems(role: string) {
  switch (role) {
    case 'licensed-trade':
    case 'non-licensed-trade':
      return [
        { id: 'dashboard', title: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard', description: 'Your jobs, earnings & status' },
        { id: 'job-board', title: 'Job Board', icon: <Briefcase size={18} />, path: '/job-board', description: 'Browse available jobs' },
        { id: 'scheduling', title: 'My Schedule', icon: <Calendar size={18} />, path: '/scheduling', description: 'Manage your availability' },
        { id: 'settings', title: 'Settings', icon: <Settings size={18} />, path: '/settings', description: 'Account preferences' },
      ];
    case 'homeowner':
      return [
        { id: 'dashboard', title: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard', description: 'Your home & active jobs' },
        { id: 'job-creation', title: 'Create Job', icon: <Plus size={18} />, path: '/job-creation', description: 'Post a new service request' },
        { id: 'job-board', title: 'My Jobs', icon: <Home size={18} />, path: '/job-board', description: 'View your posted jobs & quotes' },
        { id: 'settings', title: 'Settings', icon: <Settings size={18} />, path: '/settings', description: 'Account preferences' },
      ];
    case 'property-manager':
      return [
        { id: 'dashboard', title: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard', description: 'Portfolio & job overview' },
        { id: 'job-creation', title: 'Create Job', icon: <Plus size={18} />, path: '/job-creation', description: 'Post a new service request' },
        { id: 'job-board', title: 'My Jobs', icon: <Building2 size={18} />, path: '/job-board', description: 'Jobs across all properties' },
        { id: 'settings', title: 'Settings', icon: <Settings size={18} />, path: '/settings', description: 'Account preferences' },
      ];
    case 'realtor':
      return [
        { id: 'dashboard', title: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/dashboard', description: 'Clients & active jobs' },
        { id: 'job-creation', title: 'Create Job', icon: <Plus size={18} />, path: '/job-creation', description: 'Post a new service request' },
        { id: 'job-board', title: 'My Jobs', icon: <Users size={18} />, path: '/job-board', description: 'Jobs across your clients' },
        { id: 'settings', title: 'Settings', icon: <Settings size={18} />, path: '/settings', description: 'Account preferences' },
      ];
    default:
      return [
        { id: 'job-board', title: 'Job Board', icon: <Briefcase size={18} />, path: '/job-board', description: 'Browse available jobs' },
        { id: 'settings', title: 'Settings', icon: <Settings size={18} />, path: '/settings', description: 'Account preferences' },
      ];
  }
}

export default function TopNav({ title, showMenu = true }: TopNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userEmail = localStorage.getItem('userEmail') || 'user@tradeson.com';
  const userRole = localStorage.getItem('userRole') || 'homeowner';
  const menuItems = getRoleMenuItems(userRole);

  const userMenuItems = [
    { id: 'profile', title: 'Profile', icon: <User size={16} />, path: '/settings' },
    { id: 'earnings', title: 'Earnings', icon: <DollarSign size={16} />, path: '/dashboard' },
    {
      id: 'logout', title: 'Sign Out', icon: <X size={16} />,
      action: () => { localStorage.clear(); navigate('/login'); }
    }
  ];

  const handleMenuItemClick = (item: any) => {
    if (item.action) item.action();
    else navigate(item.path);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const getPageTitle = () => {
    if (title) return title;
    if (location.pathname.includes('/job-creation')) return 'Create Job';
    if (location.pathname.includes('/job-board')) return 'Job Board';
    if (location.pathname.includes('/scheduling')) return 'Schedule';
    if (location.pathname.includes('/dashboard')) return 'Dashboard';
    if (location.pathname.includes('/settings')) return 'Settings';
    return 'TradesOn';
  };

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

  const showTitle = !['/', '/login', '/signup'].includes(location.pathname);

  return (
    <>
      {/* Top Navigation Bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: '64px',
        background: 'var(--navy)', borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 100, maxWidth: '428px', margin: '0 auto',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: '100%', padding: '0 var(--space-4)',
        }}>
          {/* Left — Hamburger */}
          {showMenu && (
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
            }}>
              <Menu size={20} color="white" />
            </button>
          )}

          {/* Center — Logo + page title */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: showMenu ? 'center' : 'flex-start', gap: '8px' }}>
            {showTitle && (
              <img src="/logo.png" alt="" width={26} height={26} style={{ objectFit: 'contain', flexShrink: 0 }} />
            )}
            {showTitle
              ? <span style={{ fontSize: '1rem', fontWeight: '700', color: 'white', letterSpacing: '-0.02em' }}>{getPageTitle()}</span>
              : <TradesOnWordmark height={32} variant="wordmark-dark" />
            }
          </div>

          {/* Right — User avatar */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: '6px', borderRadius: 'var(--radius-md)',
            }}>
              <div style={{
                width: '32px', height: '32px', background: 'var(--primary)',
                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={16} color="white" />
              </div>
              <ChevronDown size={14} color="rgba(255,255,255,0.7)" />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {(isMenuOpen || isUserMenuOpen) && (
        <div
          onClick={() => { setIsMenuOpen(false); setIsUserMenuOpen(false); }}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,28,60,0.5)', zIndex: 150,
            maxWidth: '428px', margin: '0 auto',
          }}
        />
      )}

      {/* Role-Aware Main Menu */}
      {isMenuOpen && (
        <div style={{
          position: 'fixed', top: '64px', left: 'var(--space-4)', right: 'var(--space-4)',
          background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', zIndex: 200,
          maxWidth: 'calc(428px - 2rem)', margin: '0 auto',
        }}>
          {/* Role badge */}
          <div style={{
            padding: 'var(--space-4)', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
          }}>
            <div style={{
              width: '40px', height: '40px', background: 'var(--primary)',
              borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <User size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {getRoleDisplayName(userRole)}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{userEmail}</div>
            </div>
          </div>

          <div style={{ padding: 'var(--space-3)' }}>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleMenuItemClick(item)}
                style={{
                  background: location.pathname === item.path ? 'var(--primary-light)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                  display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                  textAlign: 'left', width: '100%', transition: 'var(--transition-fast)',
                  marginBottom: '2px',
                }}
              >
                <div style={{ color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-secondary)', flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', color: location.pathname === item.path ? 'var(--primary)' : 'var(--text-primary)', marginBottom: '1px' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{item.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User Dropdown */}
      {isUserMenuOpen && (
        <div style={{
          position: 'fixed', top: '64px',
          right: 'max(var(--space-4), calc((100vw - 428px) / 2 + var(--space-4)))',
          background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)', zIndex: 200, minWidth: '200px', maxWidth: '260px',
        }}>
          <div style={{ padding: 'var(--space-4)' }}>
            <div style={{ paddingBottom: 'var(--space-3)', borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-3)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                {getRoleDisplayName(userRole)}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{userEmail}</div>
            </div>
            {userMenuItems.map((item) => (
              <button key={item.id} onClick={() => handleMenuItemClick(item)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-sm)',
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                textAlign: 'left', width: '100%', transition: 'var(--transition-fast)',
                fontSize: '0.85rem', color: item.id === 'logout' ? 'var(--danger)' : 'var(--text-primary)',
                marginBottom: '2px',
              }}>
                {item.icon}
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div style={{ height: '64px' }} />
    </>
  );
}
