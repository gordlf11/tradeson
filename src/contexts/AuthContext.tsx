import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { onMessage, getToken } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, initMessaging } from '../services/firebase';
import api from '../services/api';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone_number?: string;
  onboarding_completed?: boolean;
  address?: Record<string, unknown>;
  profile?: Record<string, unknown>;
}

export interface InAppNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
  inAppNotification: InAppNotification | null;
  dismissNotification: () => void;
  login: (email: string, password: string) => Promise<UserProfile | null>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setRole: (role: string) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inAppNotification, setInAppNotification] = useState<InAppNotification | null>(null);
  // Flag to prevent onAuthStateChanged from racing with signup
  const isSigningUp = useRef(false);

  const dismissNotification = useCallback(() => setInAppNotification(null), []);

  // Listen to Firebase auth state
  useEffect(() => {
    // Demo mode: skip Firebase listener, use mock user immediately
    if (localStorage.getItem('demoMode') === 'true') {
      const role = localStorage.getItem('userRole') || 'homeowner';
      setFirebaseUser({ uid: 'demo-user-uid', email: 'demo@tradeson.com' } as unknown as User);
      setUserProfile({ id: 'demo-user-uid', email: 'demo@tradeson.com', full_name: 'Demo User', role });
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);

      if (user && !isSigningUp.current) {
        // Only fetch profile if we're not in the middle of signup
        try {
          const profile = await api.getMe() as UserProfile;
          setUserProfile(profile);
        } catch {
          // Firebase user exists but no PG row. Could be a real new user
          // who never finished signup, OR an account whose PG row got
          // dropped (e.g. signup happened during a brief API outage).
          // Self-heal: try to populate from Firebase identity + localStorage
          // breadcrumbs. If the heal fails, fall back to null and let
          // role-selection take over.
          const healed = await selfHealProfile(user);
          setUserProfile(healed);
        }
      } else if (!user) {
        setUserProfile(null);
      }

      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Safety timeout — never leave user on loading screen forever
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout — forcing resolve');
        setLoading(false);
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [loading]);

  // FCM: get token on login, store to Firestore users/{uid}.fcmToken,
  // register foreground onMessage handler to show in-app toast.
  useEffect(() => {
    if (!firebaseUser || localStorage.getItem('demoMode') === 'true') return;

    let unsubscribeFcm: (() => void) | undefined;

    (async () => {
      try {
        const messaging = await initMessaging();
        if (!messaging) return;

        // Store FCM token on Firestore users/{uid} — rules allow owner to write fcmToken
        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
        });
        if (token) {
          await setDoc(doc(db, 'users', firebaseUser.uid), { fcmToken: token }, { merge: true });
        }

        // Foreground message handler: show in-app notification toast
        unsubscribeFcm = onMessage(messaging, (payload) => {
          const { title, body } = payload.notification ?? {};
          if (title) {
            setInAppNotification({
              title,
              body: body ?? '',
              data: payload.data as Record<string, string> | undefined,
            });
            // Auto-dismiss after 6 seconds
            setTimeout(() => setInAppNotification(null), 6000);
          }
        });
      } catch (err) {
        // FCM unavailable in local dev (HTTP) or browser doesn't support it — non-fatal
        console.warn('FCM setup skipped:', err);
      }
    })();

    return () => unsubscribeFcm?.();
  }, [firebaseUser]);

  const login = async (email: string, password: string): Promise<UserProfile | null> => {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      setFirebaseUser(cred.user);
      // Fetch profile after login
      let profile: UserProfile | null = null;
      try {
        profile = await api.getMe() as UserProfile;
        setUserProfile(profile);
      } catch {
        // Firebase user has no PG row. Try to self-heal from Firebase
        // identity + localStorage breadcrumbs before giving up.
        profile = await selfHealProfile(cred.user);
        setUserProfile(profile);
      }
      setLoading(false);
      return profile;
    } catch (err: any) {
      setLoading(false);
      const msg = firebaseErrorMessage(err.code);
      setError(msg);
      throw new Error(msg);
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    setError(null);
    isSigningUp.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      setFirebaseUser(cred.user);

      // Now create the user in PostgreSQL
      try {
        await api.createUser({ full_name: name, role: 'homeowner' });
        const profile = await api.getMe() as UserProfile;
        setUserProfile(profile);
      } catch (apiErr) {
        console.error('API user creation failed:', apiErr);
        // Firebase user exists but PG row failed — still allow navigation
        setUserProfile(null);
      }
    } catch (err: any) {
      const msg = firebaseErrorMessage(err.code) || err.message;
      setError(msg);
      throw new Error(msg);
    } finally {
      isSigningUp.current = false;
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
    setFirebaseUser(null);
  };

  const setRole = (role: string) => {
    if (userProfile) {
      setUserProfile({ ...userProfile, role });
    }
  };

  const refreshProfile = async () => {
    if (!firebaseUser) return;
    try {
      const profile = await api.getMe() as UserProfile;
      setUserProfile(profile);
    } catch {
      // Profile not created yet
    }
  };

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      userProfile,
      loading,
      error,
      inAppNotification,
      dismissNotification,
      login,
      signup,
      logout,
      setRole,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Maps the kebab-case role we store in localStorage during onboarding back
// to the snake_case role the backend's user table accepts.
const ROLE_LOCAL_TO_BACKEND: Record<string, string> = {
  'homeowner':           'homeowner',
  'property-manager':    'property_manager',
  'realtor':             'realtor',
  'licensed-trade':      'licensed_tradesperson',
  'non-licensed-trade':  'unlicensed_tradesperson',
};

/**
 * When a Firebase user exists but `GET /users/me` returns 404, this fills
 * the gap by calling `POST /users` with the best identity we have and
 * re-fetching the profile. Returns null if either call still fails.
 *
 * Triggered in two places:
 *   - login() right after a successful signInWithEmailAndPassword
 *   - onAuthStateChanged when the app boots and finds a stale Firebase
 *     session whose PG row never landed (signup race, API outage, etc.)
 */
async function selfHealProfile(user: User): Promise<UserProfile | null> {
  try {
    const localRole = localStorage.getItem('userRole');
    const role = (localRole && ROLE_LOCAL_TO_BACKEND[localRole]) || 'homeowner';
    const fullName =
      user.displayName ||
      localStorage.getItem('userName') ||
      user.email?.split('@')[0] ||
      'New User';
    const phone = localStorage.getItem('userPhone') || undefined;

    await api.createUser({ full_name: fullName, role, phone_number: phone });
    const profile = await api.getMe() as UserProfile;
    console.info('Self-healed missing PG row for', user.email);
    return profile;
  } catch (err: any) {
    // 409 (already exists) is fine — race with another tab; just re-fetch
    if (err?.message?.includes('User already exists')) {
      try {
        return await api.getMe() as UserProfile;
      } catch {
        return null;
      }
    }
    console.warn('Self-heal failed; userProfile will stay null:', err?.message);
    return null;
  }
}

function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address';
    case 'auth/user-disabled': return 'This account has been disabled';
    case 'auth/user-not-found': return 'No account found with this email';
    case 'auth/wrong-password': return 'Incorrect password';
    case 'auth/invalid-credential': return 'Invalid email or password';
    case 'auth/email-already-in-use': return 'An account with this email already exists';
    case 'auth/weak-password': return 'Password must be at least 6 characters';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later';
    default: return 'Authentication failed. Please try again';
  }
}

export default AuthContext;
