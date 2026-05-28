import { ShieldCheck } from 'lucide-react';

interface TrustedBadgePillProps {
  variant?: 'light' | 'dark' | 'compact';
  size?: number;
}

// Visual indicator that a tradesperson has completed the TradesOn Trusted
// mini-course. Used on the tradesperson dashboard hero, quote cards on
// the customer's comparison view, and anywhere we surface a tradesperson
// identity to a customer.
export default function TrustedBadgePill({ variant = 'light', size = 13 }: TrustedBadgePillProps) {
  const dark = variant === 'dark';
  const compact = variant === 'compact';

  if (compact) {
    return (
      <span
        title="TradesOn Trusted — Customer Ready"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 20, height: 20, borderRadius: '50%',
          background: 'var(--primary)', color: 'white', flexShrink: 0,
        }}
      >
        <ShieldCheck size={12} strokeWidth={2.5} />
      </span>
    );
  }

  return (
    <span
      title="TradesOn Trusted — completed the Customer Ready mini-course"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: dark ? 'rgba(247, 107, 38, 0.18)' : 'var(--primary-light)',
        color: dark ? '#fff' : 'var(--primary)',
        border: dark ? '1px solid rgba(247, 107, 38, 0.4)' : '1px solid var(--primary)',
        borderRadius: 'var(--radius-full)',
        padding: '3px 10px',
        fontSize: `${size}px`,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
      }}
    >
      <ShieldCheck size={size + 1} strokeWidth={2.5} />
      Trusted
    </span>
  );
}
