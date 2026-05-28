import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Home, Briefcase, Building2, Users, Wrench, Shield } from 'lucide-react';
import { auth } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

// Kebab-case is the source of truth for localStorage.userRole. All routing,
// nav rendering, and menu logic reads this format. The backend uses
// snake_case (mapped in AuthContext.ROLE_LOCAL_TO_BACKEND).
export type AppRole =
  | 'homeowner'
  | 'property-manager'
  | 'realtor'
  | 'licensed-trade'
  | 'non-licensed-trade'
  | 'admin';

interface RoleOption {
  key: AppRole;
  label: string;
  icon: React.ReactNode;
}

const ROLE_OPTIONS: RoleOption[] = [
  { key: 'homeowner',          label: 'Homeowner',            icon: <Home size={16} /> },
  { key: 'realtor',            label: 'Realtor',              icon: <Users size={16} /> },
  { key: 'property-manager',   label: 'Property Manager',     icon: <Building2 size={16} /> },
  { key: 'licensed-trade',     label: 'Licensed Tradesperson', icon: <Wrench size={16} /> },
  { key: 'non-licensed-trade', label: 'Service Provider',     icon: <Briefcase size={16} /> },
];

function getDashboardPath(role: AppRole) {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'realtor') return '/dashboard/realtor';
  if (role === 'licensed-trade' || role === 'non-licensed-trade') return '/dashboard/tradesperson';
  return '/dashboard/customer';
}

export function useRoleSwitcher() {
  const navigate = useNavigate();
  const { setRole } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Only surface the Admin role if the Firebase custom claim is set.
  useEffect(() => {
    auth.currentUser?.getIdTokenResult()
      .then((r) => setIsAdmin(r.claims.admin === true))
      .catch(() => setIsAdmin(false));
  }, []);

  const currentRole = (localStorage.getItem('userRole') || 'homeowner') as AppRole;

  const availableRoles: RoleOption[] = isAdmin
    ? [...ROLE_OPTIONS, { key: 'admin', label: 'Admin', icon: <Shield size={16} /> }]
    : ROLE_OPTIONS;

  const switchTo = (role: AppRole) => {
    if (role === currentRole) return;
    localStorage.setItem('userRole', role);
    setRole(role);
    navigate(getDashboardPath(role));
  };

  return { availableRoles, currentRole, switchTo };
}

interface RoleSwitcherListProps {
  variant?: 'light' | 'dark';
  onAfterSwitch?: () => void;
}

export function RoleSwitcherList({ variant = 'light', onAfterSwitch }: RoleSwitcherListProps) {
  const { availableRoles, currentRole, switchTo } = useRoleSwitcher();

  const dark = variant === 'dark';
  const colors = {
    label:    dark ? 'rgba(255,255,255,0.5)' : 'var(--text-secondary)',
    text:     dark ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)',
    active:   dark ? 'rgba(255,255,255,0.12)' : 'var(--primary-light)',
    activeFg: dark ? '#fff' : 'var(--primary)',
    hover:    dark ? 'rgba(255,255,255,0.06)' : 'transparent',
  };

  return (
    <div>
      <div style={{
        fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: colors.label,
        padding: '4px 8px 6px',
      }}>
        Switch Role
      </div>
      {availableRoles.map((opt) => {
        const isActive = opt.key === currentRole;
        return (
          <button
            key={opt.key}
            onClick={() => { switchTo(opt.key); onAfterSwitch?.(); }}
            style={{
              background: isActive ? colors.active : 'transparent',
              border: 'none', cursor: 'pointer',
              padding: '8px 10px', borderRadius: 'var(--radius-sm)',
              display: 'flex', alignItems: 'center', gap: 10,
              textAlign: 'left', width: '100%',
              fontSize: '0.85rem', fontWeight: isActive ? 600 : 500,
              color: isActive ? colors.activeFg : colors.text,
              fontFamily: 'inherit',
              transition: 'background-color 120ms ease',
            }}
            onMouseEnter={(e) => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = colors.hover;
            }}
            onMouseLeave={(e) => {
              if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', color: isActive ? colors.activeFg : colors.label }}>
              {opt.icon}
            </span>
            <span style={{ flex: 1 }}>{opt.label}</span>
            {isActive && <Check size={14} color={colors.activeFg} />}
          </button>
        );
      })}
    </div>
  );
}
