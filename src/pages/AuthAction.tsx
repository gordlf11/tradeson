import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  verifyPasswordResetCode,
  confirmPasswordReset,
  applyActionCode,
} from 'firebase/auth';
import { Lock, CheckCircle2, AlertTriangle, ArrowLeft } from 'lucide-react';
import { auth } from '../services/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { TradesOnIcon } from '../components/Logo';

/**
 * Custom email-action handler — branded, served on app.tradeson.io so the
 * reset/verify link domain matches the sending domain (mail.tradeson.io).
 * That removes the firebaseapp.com domain-mismatch that Gmail flags as
 * phishing and was junking our auth emails.
 *
 * Set in Firebase Console → Authentication → Templates → Customize action URL:
 *   https://app.tradeson.io/auth/action
 *
 * Firebase appends ?mode=<action>&oobCode=<code>&apiKey=...&continueUrl=...
 * Modes handled: resetPassword, verifyEmail, recoverEmail.
 */

type Phase = 'loading' | 'resetForm' | 'success' | 'error';

export default function AuthAction() {
  const [params] = useSearchParams();
  const mode = params.get('mode');
  const oobCode = params.get('oobCode') ?? '';

  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successCopy, setSuccessCopy] = useState({ title: '', body: '' });

  // Validate the action code on mount and branch by mode.
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!oobCode || !mode) {
        if (!cancelled) { setError('This link is missing or malformed. Request a new one.'); setPhase('error'); }
        return;
      }
      try {
        if (mode === 'resetPassword') {
          const addr = await verifyPasswordResetCode(auth, oobCode);
          if (cancelled) return;
          setEmail(addr);
          setPhase('resetForm');
        } else if (mode === 'verifyEmail' || mode === 'recoverEmail') {
          await applyActionCode(auth, oobCode);
          if (cancelled) return;
          setSuccessCopy(
            mode === 'verifyEmail'
              ? { title: 'Email verified', body: 'Your email address is confirmed. You can sign in now.' }
              : { title: 'Email change reverted', body: 'Your account email has been restored. You can sign in now.' }
          );
          setPhase('success');
        } else {
          setError('Unsupported request type.');
          setPhase('error');
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(friendlyError(err?.code));
        setPhase('error');
      }
    }
    run();
    return () => { cancelled = true; };
  }, [mode, oobCode]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setIsSubmitting(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccessCopy({ title: 'Password updated', body: 'Your password has been changed. Sign in with your new password.' });
      setPhase('success');
    } catch (err: any) {
      setError(friendlyError(err?.code));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container" style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', background: 'var(--bg-base)', padding: 'var(--space-4)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
          <TradesOnIcon size={103} variant="icon-light" />
        </div>
        <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', fontWeight: 700, marginBottom: '0.25rem' }}>TradesOn</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          {mode === 'resetPassword' ? 'Reset your password' : 'Account security'}
        </p>
      </div>

      <Card elevated className="animate-slideUp" style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        {phase === 'loading' && (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Verifying your link…</p>
        )}

        {phase === 'resetForm' && (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Set a new password</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>
              For <strong>{email}</strong>. Choose a new password to finish.
            </p>
            <form onSubmit={handleReset}>
              <div className="mb-4">
                <Input type="password" label="New password" placeholder="At least 6 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)} icon={<Lock size={18} />} required />
              </div>
              <div className="mb-4">
                <Input type="password" label="Confirm new password" placeholder="Re-enter password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} icon={<Lock size={18} />} required />
              </div>
              {error && <div style={errorBoxStyle}>{error}</div>}
              <Button type="submit" variant="primary" size="lg" fullWidth loading={isSubmitting}>
                Update password
              </Button>
            </form>
          </>
        )}

        {phase === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
              <CheckCircle2 size={48} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>{successCopy.title}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>{successCopy.body}</p>
            <Link to="/login" style={backLinkStyle}><ArrowLeft size={16} /> Back to Sign In</Link>
          </div>
        )}

        {phase === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
              <AlertTriangle size={48} color="var(--danger)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Link problem</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>{error}</p>
            <Link to="/forgot-password" style={backLinkStyle}><ArrowLeft size={16} /> Request a new link</Link>
          </div>
        )}
      </Card>
    </div>
  );
}

const errorBoxStyle: React.CSSProperties = {
  padding: 'var(--space-3)', background: 'rgba(255, 74, 107, 0.1)',
  border: '1px solid var(--danger)', borderRadius: 'var(--radius-sm)',
  color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 'var(--space-4)',
};

const backLinkStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  color: 'var(--primary)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 600,
};

function friendlyError(code?: string): string {
  switch (code) {
    case 'auth/expired-action-code': return 'This link has expired. Request a new one.';
    case 'auth/invalid-action-code': return 'This link is invalid or has already been used. Request a new one.';
    case 'auth/user-disabled': return 'This account has been disabled. Contact support.';
    case 'auth/user-not-found': return 'No account found for this link.';
    case 'auth/weak-password': return 'Please choose a stronger password (at least 6 characters).';
    default: return 'Something went wrong with this link. Request a new one.';
  }
}
