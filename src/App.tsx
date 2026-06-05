import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { Briefcase, Calendar, Plus, LayoutDashboard, Home, Building2, Users, MessageCircle } from 'lucide-react';
import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { subscribeToUnreadCount } from './services/messagingService';
import ErrorBoundary from './components/ErrorBoundary';
import DemoNavigator from './components/DemoNavigator';

// Auth — kept eager so the login screen has zero delay
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import AuthAction from './pages/AuthAction';
import Demo from './pages/Demo';

// All other pages — lazy loaded for code splitting
const RoleSelection                      = lazy(() => import('./pages/RoleSelection'));
const HomeownerOnboarding                = lazy(() => import('./pages/HomeownerOnboarding'));
const PropertyManagerOnboarding          = lazy(() => import('./pages/PropertyManagerOnboarding'));
const RealtorOnboarding                  = lazy(() => import('./pages/RealtorOnboarding'));
const LicensedTradespersonOnboarding     = lazy(() => import('./pages/LicensedTradespersonOnboarding'));
const UnlicensedTradespersonOnboarding   = lazy(() => import('./pages/UnlicensedTradespersonOnboarding'));
const TrustedBadge                       = lazy(() => import('./pages/onboarding/TrustedBadge'));
const TradespersonDashboard              = lazy(() => import('./pages/TradespersonDashboard'));
const CustomerDashboard                  = lazy(() => import('./pages/CustomerDashboard'));
const AdminDashboard                     = lazy(() => import('./pages/AdminDashboard'));
const RealtorDashboard                   = lazy(() => import('./pages/RealtorDashboard'));
const JobCreation                        = lazy(() => import('./pages/JobCreation'));
const JobBoard                           = lazy(() => import('./pages/JobBoardEnhanced'));
const JobExecution                       = lazy(() => import('./pages/JobExecution'));
const JobCompletion                      = lazy(() => import('./pages/JobCompletion'));
const Scheduling                         = lazy(() => import('./pages/Scheduling'));
const Settings                           = lazy(() => import('./pages/Settings'));
const ProfileSettings                    = lazy(() => import('./pages/ProfileSettings'));
const LocationSettings                   = lazy(() => import('./pages/LocationSettings'));
const PaymentSettings                    = lazy(() => import('./pages/PaymentSettings'));
const PrivacySettings                    = lazy(() => import('./pages/PrivacySettings'));
const InsuranceUpload                    = lazy(() => import('./pages/InsuranceUpload'));
const JobDayOf                           = lazy(() => import('./pages/JobDayOf'));
const ContactSupport                     = lazy(() => import('./pages/ContactSupport'));

// ── Referral link handler ─────────────────────────────────────────────────
// Saves ?ref=CODE to localStorage then bounces to /signup.
// The AuthContext signup() reads and clears the code before calling api.createUser().

const JoinRedirect = () => {
  const [params] = useSearchParams();
  const code = params.get('ref');
  if (code) localStorage.setItem('referralCode', code);
  return <Navigate to="/signup" replace />;
};

// ── Role helpers ──────────────────────────────────────────────────────────

function isTradeRole(role: string) {
  return role === 'licensed-trade' || role === 'non-licensed-trade'
    || role === 'licensed_tradesperson' || role === 'unlicensed_tradesperson';
}

function getDashboardPath(role: string) {
  if (role === 'admin') return '/dashboard/admin';
  if (role === 'realtor') return '/dashboard/realtor';
  return isTradeRole(role) ? '/dashboard/tradesperson' : '/dashboard/customer';
}

// ── Unread message badge ──────────────────────────────────────────────────

function UnreadBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span style={{
      position: 'absolute', top: '-4px', right: '-6px',
      background: 'var(--danger)', color: 'white',
      borderRadius: 'var(--radius-full)', fontSize: '0.6rem', fontWeight: '700',
      minWidth: '16px', height: '16px', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '0 3px', lineHeight: 1,
    }}>
      {count > 99 ? '99+' : count}
    </span>
  );
}

// ── Role-aware Bottom Nav ─────────────────────────────────────────────────

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;
  const { userProfile, firebaseUser } = useAuth();
  const userRole = userProfile?.role || localStorage.getItem('userRole') || 'homeowner';
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid) return;
    const unsub = subscribeToUnreadCount(uid, setUnreadCount);
    return unsub;
  }, [firebaseUser?.uid]);

  // Hide nav on auth, onboarding, and admin screens
  const hideNavPaths = ['/login', '/signup', '/forgot-password', '/auth/action', '/onboarding', '/role-selection', '/dashboard/admin'];
  if (path === '/' || hideNavPaths.some(p => path.startsWith(p))) return null;

  const dashPath = getDashboardPath(userRole);
  const isOnDash = path.includes('/dashboard');

  const msgNavItem = (
    <Link to={dashPath} className={`nav-item ${isOnDash ? 'active' : ''}`} style={{ position: 'relative' }}>
      <MessageCircle size={20} />
      <UnreadBadge count={unreadCount} />
      <span>Messages</span>
    </Link>
  );

  if (isTradeRole(userRole)) {
    return (
      <nav className="bottom-nav">
        <Link to="/job-board" className={`nav-item ${path.includes('/job-board') ? 'active' : ''}`}>
          <Briefcase size={20} />
          <span>Jobs</span>
        </Link>
        <Link to="/scheduling" className={`nav-item ${path.includes('/scheduling') ? 'active' : ''}`}>
          <Calendar size={20} />
          <span>Schedule</span>
        </Link>
        {msgNavItem}
        <Link to={dashPath} className={`nav-item ${isOnDash ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
      </nav>
    );
  }

  if (userRole === 'property-manager' || userRole === 'property_manager') {
    return (
      <nav className="bottom-nav">
        <Link to="/job-creation" className={`nav-item ${path === '/job-creation' ? 'active' : ''}`}>
          <Plus size={20} />
          <span>New Job</span>
        </Link>
        <Link to="/job-board" className={`nav-item ${path.includes('/job-board') ? 'active' : ''}`}>
          <Building2 size={20} />
          <span>Jobs</span>
        </Link>
        {msgNavItem}
        <Link to={dashPath} className={`nav-item ${isOnDash ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
      </nav>
    );
  }

  if (userRole === 'realtor') {
    return (
      <nav className="bottom-nav">
        <Link to="/job-creation" className={`nav-item ${path === '/job-creation' ? 'active' : ''}`}>
          <Plus size={20} />
          <span>New Job</span>
        </Link>
        <Link to="/job-board" className={`nav-item ${path.includes('/job-board') ? 'active' : ''}`}>
          <Users size={20} />
          <span>Jobs</span>
        </Link>
        {msgNavItem}
        <Link to={dashPath} className={`nav-item ${isOnDash ? 'active' : ''}`}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
      </nav>
    );
  }

  // Default: Homeowner
  return (
    <nav className="bottom-nav">
      <Link to="/job-creation" className={`nav-item ${path === '/job-creation' ? 'active' : ''}`}>
        <Plus size={20} />
        <span>New Job</span>
      </Link>
      <Link to="/job-board" className={`nav-item ${path.includes('/job-board') ? 'active' : ''}`}>
        <Home size={20} />
        <span>Jobs</span>
      </Link>
      {msgNavItem}
      <Link to={dashPath} className={`nav-item ${isOnDash ? 'active' : ''}`}>
        <LayoutDashboard size={20} />
        <span>Dashboard</span>
      </Link>
    </nav>
  );
};

// ── Smart Dashboard redirect ───────────────────────────────────────────────

const DashboardRedirect = () => {
  const { userProfile } = useAuth();
  const userRole = userProfile?.role || localStorage.getItem('userRole') || 'homeowner';
  return <Navigate to={getDashboardPath(userRole)} replace />;
};

// ── Onboarding guard — blocks re-entry once user has completed setup ──────

const RequireOnboarding = ({ children }: { children: React.ReactNode }) => {
  const { userProfile, loading } = useAuth();
  const isDemoMode = localStorage.getItem('demoMode') === 'true';

  if (isDemoMode) return <>{children}</>;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading...
        </div>
      </div>
    );
  }

  // Already onboarded: role-specific profile exists in Postgres (most reliable),
  // or the localStorage flag set at the end of every onboarding flow (fallback).
  const alreadyOnboarded =
    userProfile?.onboarding_completed === true ||
    localStorage.getItem('hasOnboarded') === 'true' ||
    (userProfile?.profile != null);

  if (alreadyOnboarded) {
    const role = userProfile?.role || localStorage.getItem('userRole') || 'homeowner';
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return <>{children}</>;
};

// ── Protected Route wrapper ────────────────────────────────────────────────

const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { firebaseUser, loading } = useAuth();
  const isDemoMode = localStorage.getItem('demoMode') === 'true';

  // Demo mode bypasses all auth checks
  if (isDemoMode) return <>{children}</>;

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          Loading...
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// ── App ───────────────────────────────────────────────────────────────────

const PageFallback = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
    <div className="loader" style={{ width: 36, height: 36 }} />
  </div>
);

function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Demo mode — public, activates demo and hard-redirects */}
        <Route path="/demo" element={<Demo />} />

        {/* Referral link — public */}
        <Route path="/join" element={<JoinRedirect />} />

        {/* Auth — public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth/action" element={<AuthAction />} />

        {/* Onboarding — requires auth; already-onboarded users are redirected to their dashboard */}
        <Route path="/onboarding" element={<RequireAuth><RequireOnboarding><RoleSelection /></RequireOnboarding></RequireAuth>} />
        <Route path="/role-selection" element={<RequireAuth><RequireOnboarding><RoleSelection /></RequireOnboarding></RequireAuth>} />
        <Route path="/onboarding/homeowner" element={<RequireAuth><RequireOnboarding><HomeownerOnboarding /></RequireOnboarding></RequireAuth>} />
        <Route path="/onboarding/property-manager" element={<RequireAuth><RequireOnboarding><PropertyManagerOnboarding /></RequireOnboarding></RequireAuth>} />
        <Route path="/onboarding/realtor" element={<RequireAuth><RequireOnboarding><RealtorOnboarding /></RequireOnboarding></RequireAuth>} />
        <Route path="/onboarding/licensed-trade" element={<RequireAuth><RequireOnboarding><LicensedTradespersonOnboarding /></RequireOnboarding></RequireAuth>} />
        <Route path="/onboarding/non-licensed-trade" element={<RequireAuth><RequireOnboarding><UnlicensedTradespersonOnboarding /></RequireOnboarding></RequireAuth>} />
        <Route path="/onboarding/trusted-badge" element={<RequireAuth><TrustedBadge /></RequireAuth>} />

        {/* Dashboards — requires auth */}
        <Route path="/dashboard" element={<RequireAuth><DashboardRedirect /></RequireAuth>} />
        <Route path="/dashboard/tradesperson" element={<RequireAuth><ErrorBoundary><TradespersonDashboard /></ErrorBoundary></RequireAuth>} />
        <Route path="/dashboard/customer" element={<RequireAuth><ErrorBoundary><CustomerDashboard /></ErrorBoundary></RequireAuth>} />
        <Route path="/dashboard/admin" element={<RequireAuth><ErrorBoundary><AdminDashboard /></ErrorBoundary></RequireAuth>} />
        <Route path="/dashboard/realtor" element={<RequireAuth><ErrorBoundary><RealtorDashboard /></ErrorBoundary></RequireAuth>} />

        {/* Main App — requires auth */}
        <Route path="/job-creation" element={<RequireAuth><JobCreation /></RequireAuth>} />
        <Route path="/job-board" element={<RequireAuth><ErrorBoundary><JobBoard /></ErrorBoundary></RequireAuth>} />
        <Route path="/scheduling" element={<RequireAuth><Scheduling /></RequireAuth>} />
        <Route path="/job-execution" element={<RequireAuth><JobExecution /></RequireAuth>} />
        <Route path="/completion" element={<RequireAuth><JobCompletion /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfileSettings /></RequireAuth>} />
        <Route path="/location-settings" element={<RequireAuth><LocationSettings /></RequireAuth>} />
        <Route path="/payment-settings" element={<RequireAuth><PaymentSettings /></RequireAuth>} />
        <Route path="/privacy-settings" element={<RequireAuth><PrivacySettings /></RequireAuth>} />
        <Route path="/insurance-upload" element={<RequireAuth><InsuranceUpload /></RequireAuth>} />
        <Route path="/job-day-of/:jobId?" element={<RequireAuth><JobDayOf /></RequireAuth>} />
        <Route path="/contact-support" element={<RequireAuth><ContactSupport /></RequireAuth>} />
      </Routes>
      <BottomNav />
      {localStorage.getItem('demoMode') === 'true' && <DemoNavigator />}
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
