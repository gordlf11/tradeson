import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import api from '../services/api';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

interface Props {
  role: string;
  onComplete?: () => void;
}

// Shared success state
function SavedState() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4) 0' }}>
      <CheckCircle size={40} color="var(--success)" />
      <div style={{ fontWeight: '700', color: 'var(--success)', fontSize: '0.95rem' }}>Payment method saved</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '280px' }}>
        Your card will only be charged after a job is completed and approved.
      </div>
    </div>
  );
}

// Demo-mode preview — shows a representative card form without hitting the API
function DemoCardForm({ onComplete }: { onComplete?: () => void }) {
  const [saved, setSaved] = useState(false);

  if (saved) return <SavedState />;

  const fieldStyle: React.CSSProperties = {
    border: '1.5px solid var(--border)', borderRadius: '10px',
    padding: '10px 12px', color: 'var(--text-secondary)',
    fontSize: '0.9rem', background: 'var(--bg-surface)',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '500',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Tab bar mimicking Stripe PaymentElement */}
      <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '4px' }}>
        <div style={{
          padding: '8px 16px', borderBottom: '2px solid var(--primary)',
          color: 'var(--primary)', fontWeight: '600', fontSize: '0.85rem', marginBottom: '-2px',
        }}>
          Card
        </div>
        <div style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Bank
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={labelStyle}>Card number</span>
        <div style={fieldStyle}>4242 4242 4242 4242</div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={labelStyle}>Expiry</span>
          <div style={fieldStyle}>12 / 29</div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={labelStyle}>CVC</span>
          <div style={fieldStyle}>•••</div>
        </div>
      </div>

      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Demo mode — no real card required
      </div>

      <Button
        variant="primary"
        fullWidth
        icon={<CreditCard size={16} />}
        onClick={() => { setSaved(true); onComplete?.(); }}
      >
        Save Payment Method
      </Button>
    </div>
  );
}

// Real form — must render inside <Elements> provider
function CardSetupForm({ onComplete }: { onComplete?: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!stripe || !elements) return;
    setSaving(true);
    setError('');
    const result = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });
    if (result.error) {
      setError(result.error.message || 'Could not save payment method');
    } else {
      setSaved(true);
      onComplete?.();
    }
    setSaving(false);
  };

  if (saved) return <SavedState />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <div style={{
          fontSize: '0.82rem', color: 'var(--danger)', padding: '8px 12px',
          background: 'rgba(255,74,107,0.08)', borderRadius: '8px', border: '1px solid var(--danger)',
        }}>
          {error}
        </div>
      )}
      <Button variant="primary" fullWidth loading={saving} onClick={handleSave} icon={<CreditCard size={16} />}>
        Save Payment Method
      </Button>
    </div>
  );
}

export default function StripeCheckoutWrapper({ role: _role, onComplete }: Props) {
  const isDemo = localStorage.getItem('demoMode') === 'true';
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(!isDemo);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (isDemo || !stripeKey) {
      setLoading(false);
      if (!isDemo && !stripeKey) setFetchError('Stripe is not configured');
      return;
    }
    api.createSetupIntent()
      .then((data: any) => setClientSecret(data.client_secret))
      .catch((err: any) => setFetchError(err.message || 'Could not load payment form'))
      .finally(() => setLoading(false));
  }, [isDemo]);

  // Demo path — show visual preview with clickable success
  if (isDemo) return <DemoCardForm onComplete={onComplete} />;

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-5)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
        <div className="spinner" style={{ margin: '0 auto 10px' }} />
        Loading payment form…
      </div>
    );
  }

  if (fetchError || !clientSecret) {
    return (
      <div style={{
        padding: '12px 16px', background: 'rgba(255,149,0,0.07)',
        border: '1.5px solid var(--warning)', borderRadius: '10px',
        color: 'var(--text-secondary)', fontSize: '0.82rem',
        display: 'flex', gap: '10px', alignItems: 'flex-start',
      }}>
        <CreditCard size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>Payment form unavailable right now. You can add a payment method later in <strong>Settings → Payment</strong>.</span>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: { colorPrimary: '#E8611A', borderRadius: '10px' },
        },
      }}
    >
      <CardSetupForm onComplete={onComplete} />
    </Elements>
  );
}
