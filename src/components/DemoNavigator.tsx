import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface DemoScreen {
  path: string;
  label: string;
  role: string;
  section: string;
}

export const DEMO_SCREENS: DemoScreen[] = [
  // ── Auth ──────────────────────────────────────────────────────────────────
  { path: '/login',                      label: 'Login',                               role: 'homeowner',         section: 'Auth' },
  { path: '/signup',                     label: 'Sign Up',                             role: 'homeowner',         section: 'Auth' },

  // ── Onboarding ────────────────────────────────────────────────────────────
  { path: '/onboarding',                 label: 'Role Selection',                      role: 'homeowner',         section: 'Onboarding' },
  { path: '/onboarding/homeowner',       label: 'Homeowner Onboarding',                role: 'homeowner',         section: 'Onboarding' },
  { path: '/onboarding/property-manager',label: 'Property Manager Onboarding',         role: 'property-manager',  section: 'Onboarding' },
  { path: '/onboarding/realtor',         label: 'Realtor Onboarding',                  role: 'realtor',           section: 'Onboarding' },
  { path: '/onboarding/licensed-trade',  label: 'Licensed Tradesperson Onboarding',    role: 'licensed-trade',    section: 'Onboarding' },
  { path: '/onboarding/non-licensed-trade', label: 'Unlicensed Tradesperson Onboarding', role: 'non-licensed-trade', section: 'Onboarding' },

  // ── Customer Flow ─────────────────────────────────────────────────────────
  { path: '/dashboard/customer',         label: 'Customer Dashboard',                  role: 'homeowner',         section: 'Customer Flow' },
  { path: '/job-creation',               label: 'Job Creation',                        role: 'homeowner',         section: 'Customer Flow' },
  { path: '/job-board',                  label: 'Job Board (Customer)',                role: 'homeowner',         section: 'Customer Flow' },
  { path: '/scheduling',                 label: 'Scheduling',                          role: 'homeowner',         section: 'Customer Flow' },
  { path: '/job-day-of',                 label: 'Job Day-Of (Poster)',                 role: 'homeowner',         section: 'Customer Flow' },
  { path: '/completion',                 label: 'Job Completion & Review',             role: 'homeowner',         section: 'Customer Flow' },

  // ── Tradesperson Flow ─────────────────────────────────────────────────────
  { path: '/dashboard/tradesperson',     label: 'Tradesperson Dashboard',              role: 'licensed-trade',    section: 'Tradesperson Flow' },
  { path: '/job-board',                  label: 'Job Board (Tradesperson)',            role: 'licensed-trade',    section: 'Tradesperson Flow' },
  { path: '/job-execution',              label: 'Job Execution',                       role: 'licensed-trade',    section: 'Tradesperson Flow' },
  { path: '/job-day-of',                 label: 'Job Day-Of (Tradesperson)',           role: 'licensed-trade',    section: 'Tradesperson Flow' },
  { path: '/insurance-upload',           label: 'Insurance Upload',                    role: 'licensed-trade',    section: 'Tradesperson Flow' },

  // ── Admin ─────────────────────────────────────────────────────────────────
  { path: '/dashboard/admin',            label: 'Admin Dashboard',                     role: 'admin',             section: 'Admin' },

  // ── Settings ──────────────────────────────────────────────────────────────
  { path: '/settings',                   label: 'Settings',                            role: 'homeowner',         section: 'Settings' },
  { path: '/profile',                    label: 'Profile Settings',                    role: 'homeowner',         section: 'Settings' },
  { path: '/location-settings',          label: 'Location Settings',                   role: 'homeowner',         section: 'Settings' },
  { path: '/payment-settings',           label: 'Payment Settings',                    role: 'homeowner',         section: 'Settings' },
  { path: '/privacy-settings',           label: 'Privacy Settings',                    role: 'homeowner',         section: 'Settings' },
];

export default function DemoNavigator() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setRole } = useAuth();

  const currentRole = localStorage.getItem('userRole') || 'homeowner';

  // Match by path + role (handles duplicate paths like /job-board and /job-day-of)
  let currentIndex = DEMO_SCREENS.findIndex(
    s => s.path === location.pathname && s.role === currentRole
  );
  // Fall back to path-only match
  if (currentIndex === -1) {
    currentIndex = DEMO_SCREENS.findIndex(s => s.path === location.pathname);
  }
  const displayIndex = Math.max(0, currentIndex);
  const current = DEMO_SCREENS[displayIndex];

  const goTo = (index: number) => {
    const screen = DEMO_SCREENS[index];
    localStorage.setItem('userRole', screen.role);
    setRole(screen.role);
    navigate(screen.path);
  };

  const exitDemo = () => {
    localStorage.removeItem('demoMode');
    localStorage.removeItem('userRole');
    localStorage.removeItem('hasOnboarded');
    window.location.replace('/login');
  };

  const isFirst = displayIndex === 0;
  const isLast = displayIndex === DEMO_SCREENS.length - 1;

  const circleBtn = (disabled: boolean): React.CSSProperties => ({
    background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.13)',
    border: 'none',
    color: disabled ? 'rgba(255,255,255,0.2)' : 'white',
    cursor: disabled ? 'default' : 'pointer',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'background 0.15s',
  });

  return (
    <div
      role="navigation"
      aria-label="Demo navigator"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: 'rgba(0,28,60,0.97)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderTop: '1px solid rgba(255,255,255,0.09)',
        padding: '10px 16px 10px',
        paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}
    >
      {/* Prev */}
      <button
        onClick={() => !isFirst && goTo(displayIndex - 1)}
        disabled={isFirst}
        style={circleBtn(isFirst)}
        aria-label="Previous screen"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Center label */}
      <div style={{ flex: 1, textAlign: 'center', minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase',
          letterSpacing: '0.09em', color: 'var(--primary)', marginBottom: '2px',
        }}>
          {current?.section} &nbsp;·&nbsp; {displayIndex + 1} / {DEMO_SCREENS.length}
        </div>
        <div style={{
          fontSize: '0.85rem', fontWeight: '700', color: 'white',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {current?.label ?? location.pathname}
        </div>
      </div>

      {/* Next */}
      <button
        onClick={() => !isLast && goTo(displayIndex + 1)}
        disabled={isLast}
        style={circleBtn(isLast)}
        aria-label="Next screen"
      >
        <ChevronRight size={20} />
      </button>

      {/* Exit */}
      <button
        onClick={exitDemo}
        style={{
          background: 'rgba(255,74,107,0.13)',
          border: '1px solid rgba(255,74,107,0.28)',
          color: '#ff7b7b',
          cursor: 'pointer',
          padding: '6px 11px',
          borderRadius: '20px',
          fontSize: '0.72rem',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flexShrink: 0,
          letterSpacing: '0.02em',
        }}
        aria-label="Exit demo mode"
      >
        <X size={12} />
        Exit
      </button>
    </div>
  );
}
