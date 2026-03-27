import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Settings, User, Briefcase, Plus, X, ChevronDown } from 'lucide-react';

interface TopNavProps {
  title?: string;
  showMenu?: boolean;
}

export default function TopNav({ title, showMenu = true }: TopNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userEmail = localStorage.getItem('userEmail') || 'user@example.com';
  const userRole = localStorage.getItem('userRole') || 'homeowner';

  const menuItems = [
    {
      id: 'job-creation',
      title: 'Create Job',
      icon: <Plus size={18} />,
      path: '/job-creation',
      description: 'Post a new service request'
    },
    {
      id: 'job-board',
      title: 'Job Board',
      icon: <Briefcase size={18} />,
      path: '/job-board',
      description: 'Browse available jobs'
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: <Settings size={18} />,
      path: '/settings',
      description: 'Account and app preferences'
    }
  ];

  const userMenuItems = [
    {
      id: 'profile',
      title: 'Profile',
      icon: <User size={16} />,
      path: '/profile'
    },
    {
      id: 'settings',
      title: 'Settings',
      icon: <Settings size={16} />,
      path: '/settings'
    },
    {
      id: 'logout',
      title: 'Sign Out',
      icon: <X size={16} />,
      action: () => {
        localStorage.clear();
        navigate('/login');
      }
    }
  ];

  const handleMenuItemClick = (item: any) => {
    if (item.action) {
      item.action();
    } else {
      navigate(item.path);
    }
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const getPageTitle = () => {
    if (title) return title;
    
    if (location.pathname.includes('/job-creation')) return 'Create Job';
    if (location.pathname.includes('/job-board')) return 'Job Board';
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

  return (
    <>
      {/* Top Navigation Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        zIndex: 100,
        maxWidth: '428px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '100%',
          padding: '0 var(--space-4)'
        }}>
          {/* Left side - Menu button */}
          {showMenu && (
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <Menu size={20} color="var(--text-primary)" />
            </button>
          )}

          {/* Center - Page title */}
          <div style={{
            flex: 1,
            textAlign: showMenu ? 'center' : 'left',
            paddingLeft: showMenu ? 0 : 0
          }}>
            <h1 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: 'var(--text-primary)',
              margin: 0
            }}>
              {getPageTitle()}
            </h1>
          </div>

          {/* Right side - User menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: '6px',
                borderRadius: 'var(--radius-md)'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                background: 'var(--primary)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={16} color="white" />
              </div>
              <ChevronDown size={16} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
      </div>

      {/* Overlay */}
      {(isMenuOpen || isUserMenuOpen) && (
        <div
          onClick={() => {
            setIsMenuOpen(false);
            setIsUserMenuOpen(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 150,
            maxWidth: '428px',
            margin: '0 auto'
          }}
        />
      )}

      {/* Main Menu Dropdown */}
      {isMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          left: 'var(--space-4)',
          right: 'var(--space-4)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 200,
          maxWidth: 'calc(428px - var(--space-8))',
          margin: '0 auto'
        }}>
          <div style={{ padding: 'var(--space-4)' }}>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: '600',
              color: 'var(--text-secondary)',
              margin: '0 0 var(--space-3) 0',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Navigation
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item)}
                  style={{
                    background: location.pathname.includes(item.path) ? 'var(--primary-light)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <div style={{
                    color: location.pathname.includes(item.path) ? 'var(--primary)' : 'var(--text-secondary)'
                  }}>
                    {item.icon}
                  </div>
                  <div>
                    <div style={{
                      fontWeight: '500',
                      fontSize: '0.9rem',
                      color: location.pathname.includes(item.path) ? 'var(--primary)' : 'var(--text-primary)',
                      marginBottom: '2px'
                    }}>
                      {item.title}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-secondary)'
                    }}>
                      {item.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* User Menu Dropdown */}
      {isUserMenuOpen && (
        <div style={{
          position: 'fixed',
          top: '64px',
          right: 'var(--space-4)',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 200,
          minWidth: '200px'
        }}>
          <div style={{ padding: 'var(--space-4)' }}>
            {/* User Info */}
            <div style={{
              paddingBottom: 'var(--space-3)',
              borderBottom: '1px solid var(--border)',
              marginBottom: 'var(--space-3)'
            }}>
              <div style={{
                fontSize: '0.9rem',
                fontWeight: '500',
                color: 'var(--text-primary)',
                marginBottom: '2px'
              }}>
                {getRoleDisplayName(userRole)}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--text-secondary)'
              }}>
                {userEmail}
              </div>
            </div>

            {/* Menu Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {userMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleMenuItemClick(item)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'var(--transition-fast)',
                    fontSize: '0.85rem',
                    color: item.id === 'logout' ? 'var(--danger)' : 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = item.id === 'logout' ? 'var(--danger-light)' : 'var(--bg-base)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Spacer to push content below fixed nav */}
      <div style={{ height: '64px' }} />
    </>
  );
}