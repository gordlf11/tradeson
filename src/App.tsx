import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Briefcase, Calendar, Plus, LayoutDashboard, Home, Building2, Users } from 'lucide-react';

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

// ── Role helpers ──────────────────────────────────────────────────────────

function isTradeRole(role: string) {
  return role === 'licensed-trade' || role === 'non-licensed-trade';
}

function getDashboardPath(role: string) {
  if (role === 'admin') return '/dashboard/admin';
  return isTradeRole(role) ? '/dashboard/tradesperson' : '/dashboard/customer';
}

// ── Role-aware Bottom Nav ─────────────────────────────────────────────────

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;
  const userRole = localStorage.getItem('userRole') || 'homeowner';

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

  if (userRole === 'property-manager') {
    return (
      <nav className="bottom-nav">
        <Link to="/job-creation" className={`nav-item ${path === '/job-creation' ? 'active' : ''}`}>
          <Plus size={20} />
          <span>New Job</span>
        </Link>
        <Link to="/job-board" className={`nav-item ${path.includes('/job-board') ? 'active' : ''}`}>
          <Building2 size={20} />
          <span>My Jobs</span>
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
          <span>My Jobs</span>
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
        <span>My Jobs</span>
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
  const userRole = localStorage.getItem('userRole') || 'homeowner';
  return <Navigate to={getDashboardPath(userRole)} replace />;
};

// ── App ───────────────────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Onboarding */}
        <Route path="/onboarding" element={<RoleSelection />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/onboarding/homeowner" element={<HomeownerOnboarding />} />
        <Route path="/onboarding/property-manager" element={<PropertyManagerOnboarding />} />
        <Route path="/onboarding/realtor" element={<RealtorOnboarding />} />
        <Route path="/onboarding/licensed-trade" element={<LicensedTradespersonOnboarding />} />
        <Route path="/onboarding/non-licensed-trade" element={<UnlicensedTradespersonOnboarding />} />

        {/* Dashboards — role-specific */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/dashboard/tradesperson" element={<TradespersonDashboard />} />
        <Route path="/dashboard/customer" element={<CustomerDashboard />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />

        {/* Main App */}
        <Route path="/job-creation" element={<JobCreation />} />
        <Route path="/job-board" element={<JobBoard />} />
        <Route path="/scheduling" element={<Scheduling />} />
        <Route path="/job-execution" element={<JobExecution />} />
        <Route path="/completion" element={<JobCompletion />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/profile" element={<ProfileSettings />} />
        <Route path="/location-settings" element={<LocationSettings />} />
        <Route path="/payment-settings" element={<PaymentSettings />} />
        <Route path="/privacy-settings" element={<PrivacySettings />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
