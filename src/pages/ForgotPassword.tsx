import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { auth } from '../services/firebase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { TradesOnIcon } from '../components/Logo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      setError(firebaseErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      background: 'var(--bg-base)',
      padding: 'var(--space-4)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-3)' }}>
          <TradesOnIcon size={103} variant="icon-light" />
        </div>
        <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)', fontWeight: '700', marginBottom: '0.25rem' }}>
          TradesOn
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Reset your password
        </p>
      </div>

      <Card elevated className="animate-slideUp" style={{ maxWidth: '400px', margin: '0 auto', width: '100%' }}>
        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)' }}>
              <CheckCircle2 size={48} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Check your email</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>
              We sent a password reset link to <strong>{email}</strong>. Follow the link to set a new password.
            </p>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              color: 'var(--primary)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 600,
            }}>
              <ArrowLeft size={16} /> Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>Forgot password?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>
              Enter the email associated with your account and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <Input
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={<Mail size={18} />}
                  required
                />
              </div>

              {error && (
                <div style={{
                  padding: 'var(--space-3)',
                  background: 'rgba(255, 74, 107, 0.1)',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger)',
                  fontSize: '0.875rem',
                  marginBottom: 'var(--space-4)',
                }}>
                  {error}
                </div>
              )}

              <Button type="submit" variant="primary" size="lg" fullWidth loading={isLoading}>
                Send reset link
              </Button>
            </form>

            <div style={{
              marginTop: 'var(--space-6)',
              paddingTop: 'var(--space-6)',
              borderTop: '1px solid var(--border)',
              textAlign: 'center',
            }}>
              <Link to="/login" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                color: 'var(--primary)', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600,
              }}>
                <ArrowLeft size={16} /> Back to Sign In
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function firebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email': return 'Invalid email address';
    case 'auth/user-not-found': return 'No account found with this email';
    case 'auth/too-many-requests': return 'Too many attempts. Please try again later';
    default: return 'Could not send reset link. Please try again.';
  }
}
