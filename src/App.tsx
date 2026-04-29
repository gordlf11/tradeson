import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Briefcase, Calendar, Plus, LayoutDashboard, Home, Building2, Users } from 'lucide-react';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Auth
import Login from './pages/Login';
import Signup from './pages/Signup';

// Onboarding
import RoleSelection from './pages/RoleSelection';
import HomeownerOnboarding from './pages/HomeownerOnboarding';
import PropertyManagerOnboarding from './pages/PropertyManagerOnboarding';
import RealtorOnboarding from './pages/RealtorOnboarding';
import LicensedTradespersonOnboarding from './pages/LicensedTradespersonOnboarding';
import UnlicensedTradespersonOnboarding from './pages/UnlicensedTradespersonOnboarding';

// Dashboards
import TradespersonDashboard from './pages/TradespersonDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import AdminDashboard from './pages/AdminDashboard';

// Main App
import JobCreation from './pages/JobCreation';
import JobBoard from './pages/JobBoardEnhanced';
import JobExecution from './pages/JobExecution';
import JobCompletion from './pages/JobCompletion';
import Scheduling from './pages/Scheduling';
import Settings from './pages/Settings';
import ProfileSettings from './pages/ProfileSettings';
import LocationSettings from './pages/LocationSettings';
import PaymentSettings from './pages/PaymentSettings';
import PrivacySettings from './pages/PrivacySettings';
import InsuranceUpload from './pages/InsuranceUpload';
import JobDayOf from './pages/JobDayOf';
import ErrorBoundary from './components/ErrorBoundary';
import Demo from './pages/Demo';
import DemoNavigator from './components/DemoNavigator';

// ── Role helpers ──────────────────────────────────────────────────────────

function isTradeRole(role: string) {
  return role === 'licensed-trade' || role === 'non-licensed-trade'
    || role === 'licensed_tradesperson' || role === 'unlicensed_tradesperson';
}

function getDashboardPath(role: string) {
  if (role === 'admin') return '/dashboard/admin';
  return isTradeRole(role) ? '/dashboard/tradesperson' : '/dashboard/customer';
}

// ── Role-aware Bottom Nav ─────────────────────────────────────────────────

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;
  const { userProfile } = useAuth();
  const userRole = userProfile?.role || localStorage.getItem('userRole') || 'homeowner';

  // Hide nav on auth, onboarding, and admin screens
  const hideNavPaths = ['/login', '/signup', '/onboarding', '/role-selection', '/dashboard/admin'];
  if (path === '/' || hideNavPaths.some(p => path.startsWith(p))) return null;

  const dashPath = getDashboardPath(userRole);
  const isOnDash = path.includes('/dashboard');

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
          <span>Jobs I Posted</span>
        </Link>
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
          <span>Jobs I Posted</span>
        </Link>
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
        <span>Jobs I Posted</span>
      </Link>
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

function AppRoutes() {
  return (
    <>
      <Routes>
        {/* Demo mode — public, activates demo and hard-redirects */}
        <Route path="/demo" element={<Demo />} />

        {/* Auth — public */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Onboarding — requires auth */}
        <Route path="/onboarding" element={<RequireAuth><RoleSelection /></RequireAuth>} />
        <Route path="/role-selection" element={<RequireAuth><RoleSelection /></RequireAuth>} />
        <Route path="/onboarding/homeowner" element={<RequireAuth><HomeownerOnboarding /></RequireAuth>} />
        <Route path="/onboarding/property-manager" element={<RequireAuth><PropertyManagerOnboarding /></RequireAuth>} />
        <Route path="/onboarding/realtor" element={<RequireAuth><RealtorOnboarding /></RequireAuth>} />
        <Route path="/onboarding/licensed-trade" element={<RequireAuth><LicensedTradespersonOnboarding /></RequireAuth>} />
        <Route path="/onboarding/non-licensed-trade" element={<RequireAuth><UnlicensedTradespersonOnboarding /></RequireAuth>} />

        {/* Dashboards — requires auth */}
        <Route path="/dashboard" element={<RequireAuth><DashboardRedirect /></RequireAuth>} />
        <Route path="/dashboard/tradesperson" element={<RequireAuth><ErrorBoundary><TradespersonDashboard /></ErrorBoundary></RequireAuth>} />
        <Route path="/dashboard/customer" element={<RequireAuth><ErrorBoundary><CustomerDashboard /></ErrorBoundary></RequireAuth>} />
        <Route path="/dashboard/admin" element={<RequireAuth><ErrorBoundary><AdminDashboard /></ErrorBoundary></RequireAuth>} />

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
        <Route path="/job-day-of" element={<RequireAuth><JobDayOf /></RequireAuth>} />
      </Routes>
      <BottomNav />
      {localStorage.getItem('demoMode') === 'true' && <DemoNavigator />}
    </>
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
