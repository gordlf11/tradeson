import { useCallback, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import api from '../services/api';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface Props {
  role: string;
  onComplete?: () => void;
}

export default function StripeCheckoutWrapper({ role, onComplete }: Props) {
  const [fetchError, setFetchError] = useState('');

  const fetchClientSecret = useCallback(async () => {
    try {
      const data = await api.createCheckoutSession(role) as { client_secret: string };
      return data.client_secret;
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load payment form');
      return '';
    }
  }, [role]);

  if (fetchError) {
    return (
      <div style={{
        padding: '12px', background: 'rgba(255,74,107,0.1)',
        border: '1px solid var(--danger)', borderRadius: '8px',
        color: 'var(--danger)', fontSize: '0.875rem',
      }}>
        {fetchError}
      </div>
    );
  }

  return (
    <div id="stripe-checkout" style={{ width: '100%' }}>
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ fetchClientSecret, onComplete }}
      >
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
