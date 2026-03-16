import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, Calendar, User as UserIcon, Plus } from 'lucide-react';

// Auth Pages
import Login from './pages/Login';
import Signup from './pages/Signup';

// Onboarding Pages  
import RoleSelection from './pages/RoleSelection';
import Onboarding from './pages/OnboardingEnhanced';

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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        {/* Onboarding Routes */}
        <Route path="/onboarding" element={<RoleSelection />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/onboarding/homeowner" element={<Onboarding />} />
        <Route path="/onboarding/property-manager" element={<Onboarding />} />
        <Route path="/onboarding/realtor" element={<Onboarding />} />
        <Route path="/onboarding/licensed-trade" element={<Onboarding />} />
        <Route path="/onboarding/non-licensed-trade" element={<Onboarding />} />
        
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
