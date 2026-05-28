import { useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';

// Activates demo mode and hard-redirects to the first screen.
// Signs out any real Firebase session first — otherwise AuthContext
// keeps using the real identity and the demo's seeded fallback data
// is shadowed by whatever the real user has in Postgres.
export default function Demo() {
  useEffect(() => {
    (async () => {
      try {
        if (auth.currentUser) await signOut(auth);
      } catch {
        // Non-fatal — proceed into demo mode regardless
      }
      // Clear any stale identity breadcrumbs so AuthContext doesn't
      // try to rehydrate the real user from localStorage.
      ['userEmail', 'userName', 'userPhone', 'hasOnboarded'].forEach((k) =>
        localStorage.removeItem(k)
      );
      localStorage.setItem('demoMode', 'true');
      localStorage.setItem('userRole', 'homeowner');
      // Full reload so AuthContext re-mounts and picks up the flag.
      window.location.replace('/login');
    })();
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
