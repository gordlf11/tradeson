import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth } from '../services/firebase';
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

interface AuthContextType {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: string | null;
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
  // Flag to prevent onAuthStateChanged from racing with signup
  const isSigningUp = useRef(false);

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
          // User exists in Firebase but not in our DB yet (pre-onboarding)
          setUserProfile(null);
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
        // User in Firebase but not in PG — will go to role-selection
        setUserProfile(null);
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
