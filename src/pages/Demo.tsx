import { useEffect } from 'react';

// Activates demo mode and hard-redirects to the first screen.
// The full-page reload forces AuthContext to re-mount and pick up the demoMode flag.
export default function Demo() {
  useEffect(() => {
    localStorage.setItem('demoMode', 'true');
    localStorage.setItem('userRole', 'homeowner');
    window.location.replace('/login');
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--navy)',
    }}>
      <div style={{ color: 'white', fontSize: '0.9rem', opacity: 0.6 }}>Starting demo…</div>
    </div>
  );
}
