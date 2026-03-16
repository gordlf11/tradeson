import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Home, Briefcase, Calendar, User as UserIcon } from 'lucide-react';

// Placeholders for Pages
import Onboarding from './pages/OnboardingEnhanced';
import JobCreation from './pages/JobCreation';
import JobBoard from './pages/JobBoardEnhanced';
import JobExecution from './pages/JobExecution';
import JobCompletion from './pages/JobCompletion';

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;

  // Don't show nav on onboarding
  if (path === '/' || path === '/onboarding') return null;

  return (
    <nav className="bottom-nav">
      <Link to="/job-board" className={`nav-item ${path.includes('/job-board') ? 'active' : ''}`}>
        <Briefcase />
        <span>Jobs</span>
      </Link>
      <Link to="/job-creation" className={`nav-item ${path === '/job-creation' ? 'active' : ''}`}>
        <Home />
        <span>New Job</span>
      </Link>
      <Link to="/execution" className={`nav-item ${path.includes('/execution') ? 'active' : ''}`}>
        <Calendar />
        <span>Schedule</span>
      </Link>
      <Link to="/profile" className={`nav-item ${path === '/profile' ? 'active' : ''}`}>
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
        <Route path="/" element={<Navigate to="/onboarding" replace />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/job-creation" element={<JobCreation />} />
        <Route path="/job-board" element={<JobBoard />} />
        <Route path="/execution" element={<JobExecution />} />
        <Route path="/completion" element={<JobCompletion />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
