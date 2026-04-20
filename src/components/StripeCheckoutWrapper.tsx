import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import api from '../services/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Props {
  role: string;
  onComplete?: () => void;
}

// Must render inside <Elements> provider
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

  if (saved) {
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
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    api.createSetupIntent()
      .then((data: any) => setClientSecret(data.client_secret))
      .catch((err: any) => setFetchError(err.message || 'Could not load payment form'))
      .finally(() => setLoading(false));
  }, []);

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
