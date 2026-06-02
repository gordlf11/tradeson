import { AlertTriangle, RefreshCw } from 'lucide-react';

/** Single shimmer line — width defaults to 100% */
export function SkeletonLine({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return (
    <div style={{
      width, height, borderRadius: 6,
      background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-base) 50%, var(--border) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
    }} />
  );
}

/** Skeleton that looks like a job card */
export function SkeletonJobCard() {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', padding: 'var(--space-4)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <SkeletonLine width="55%" height={16} />
        <SkeletonLine width="18%" height={22} />
      </div>
      <SkeletonLine width="38%" height={12} />
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <SkeletonLine width="22%" height={12} />
        <SkeletonLine width="28%" height={12} />
      </div>
      <SkeletonLine width="90%" height={12} />
    </div>
  );
}

/** Skeleton that looks like a dashboard metric row */
export function SkeletonMetricCard() {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border)', padding: 'var(--space-4)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <SkeletonLine width="40%" height={14} />
        <SkeletonLine width="20%" height={24} />
      </div>
      <SkeletonLine width="65%" height={12} />
    </div>
  );
}

/** Error state with optional retry */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--danger)',
      borderRadius: 'var(--radius-md)', padding: 'var(--space-5)',
      textAlign: 'center', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 'var(--space-3)',
    }}>
      <AlertTriangle size={28} color="var(--danger)" />
      <div>
        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
          Could not load data
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{message}</div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: 'var(--primary)', color: 'white', border: 'none',
            borderRadius: 'var(--radius-full)', padding: '8px 18px',
            fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

/** Empty state */
export function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)', padding: '3rem 2rem',
      textAlign: 'center', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 'var(--space-3)',
    }}>
      <div style={{ color: 'var(--text-tertiary)' }}>{icon}</div>
      <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>{title}</div>
      <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 260 }}>{body}</div>
    </div>
  );
}
