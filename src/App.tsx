import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Briefcase, Calendar, User as UserIcon, Plus } from 'lucide-react';

// Auth Pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// Onboarding Pages  
import RoleSelection from './pages/RoleSelection';
import HomeownerOnboarding from './pages/HomeownerOnboarding';
import PropertyManagerOnboarding from './pages/PropertyManagerOnboarding';
import RealtorOnboarding from './pages/RealtorOnboarding';
import LicensedTradespersonOnboarding from './pages/LicensedTradespersonOnboarding';
import UnlicensedTradespersonOnboarding from './pages/UnlicensedTradespersonOnboarding';

// Main App Pages
import JobCreation from './pages/JobCreation';
import JobBoard from './pages/JobBoardEnhanced';
import JobExecution from './pages/JobExecution';
import JobCompletion from './pages/JobCompletion';
import Scheduling from './pages/Scheduling';

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;

  // Don't show nav on auth and onboarding screens
  const hideNavPaths = ['/', '/login', '/signup', '/onboarding', '/role-selection'];
  if (hideNavPaths.some(p => path.startsWith(p))) return null;

  return (
    <nav className="bottom-nav">
      <Link to="/job-board" className={`nav-item ${path.includes('/job-board') ? 'active' : ''}`}>
        <Briefcase />
        <span>Jobs</span>
      </Link>
      <Link to="/job-creation" className={`nav-item ${path === '/job-creation' ? 'active' : ''}`}>
        <Plus />
        <span>Create</span>
      </Link>
      <Link to="/scheduling" className={`nav-item ${path.includes('/scheduling') ? 'active' : ''}`}>
        <Calendar />
        <span>Schedule</span>
      </Link>
      <Link to="/dashboard" className={`nav-item ${path === '/dashboard' || path === '/profile' ? 'active' : ''}`}>
        <UserIcon />
        <span>Profile</span>
      </Link>
    </nav>
  );
};

const DesktopNav = () => {
  const location = useLocation();
  const path = location.pathname;

  // Don't show nav on auth and onboarding screens
  const hideNavPaths = ['/', '/login', '/signup', '/onboarding', '/role-selection'];
  if (hideNavPaths.some(p => path.startsWith(p))) return null;

  return (
    <nav className="desktop-nav">
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h3 style={{ 
          fontSize: '1.25rem', 
          fontWeight: '700', 
          color: 'var(--primary)',
          marginBottom: 'var(--space-2)'
        }}>
          TradesOn
        </h3>
        <p style={{ 
          fontSize: '0.875rem', 
          color: 'var(--text-secondary)',
          margin: 0
        }}>
          Your marketplace platform
        </p>
      </div>
      
      <Link to="/job-board" className={`desktop-nav-item ${path.includes('/job-board') ? 'active' : ''}`}>
        <Briefcase />
        <span>Job Board</span>
      </Link>
      <Link to="/job-creation" className={`desktop-nav-item ${path === '/job-creation' ? 'active' : ''}`}>
        <Plus />
        <span>Create Job</span>
      </Link>
      <Link to="/scheduling" className={`desktop-nav-item ${path.includes('/scheduling') ? 'active' : ''}`}>
        <Calendar />
        <span>Schedule</span>
      </Link>
      <Link to="/dashboard" className={`desktop-nav-item ${path === '/dashboard' || path === '/profile' ? 'active' : ''}`}>
        <UserIcon />
        <span>Dashboard</span>
      </Link>
    </nav>
  );
};

function App() {
  return (
    <BrowserRouter>
      <div className="responsive-indicator"></div>
      <DesktopNav />
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Onboarding Routes */}
        <Route path="/onboarding" element={<RoleSelection />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/onboarding/homeowner" element={<HomeownerOnboarding />} />
        <Route path="/onboarding/property-manager" element={<PropertyManagerOnboarding />} />
        <Route path="/onboarding/realtor" element={<RealtorOnboarding />} />
        <Route path="/onboarding/licensed-trade" element={<LicensedTradespersonOnboarding />} />
        <Route path="/onboarding/non-licensed-trade" element={<UnlicensedTradespersonOnboarding />} />
        
        {/* Main App Routes */}
        <Route path="/job-creation" element={<JobCreation />} />
        <Route path="/job-board" element={<JobBoard />} />
        <Route path="/scheduling" element={<Scheduling />} />
        <Route path="/job-execution" element={<JobExecution />} />
        <Route path="/completion" element={<JobCompletion />} />
        
        {/* Dashboard Routes */}
        <Route path="/dashboard" element={<JobBoard />} />
        <Route path="/dashboard/tradesperson" element={<JobBoard />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
