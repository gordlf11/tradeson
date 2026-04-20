import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{
          minHeight: '60vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '2rem', textAlign: 'center',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'var(--danger-light)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', marginBottom: '1rem',
            fontSize: '1.8rem',
          }}>
            ⚠️
          </div>
          <h2 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>Something went wrong</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 1.5rem' }}>
            Please refresh the page or try again.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{
              padding: '10px 24px', background: 'var(--primary)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-md)', fontWeight: '700',
              fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
