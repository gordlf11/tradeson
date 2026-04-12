interface LogoProps {
  size?: number;
  height?: number;
  variant?: 'icon-light' | 'icon-dark' | 'wordmark-light' | 'wordmark-dark';
}

export function TradesOnIcon({ size = 36, variant = 'icon-light' }: LogoProps) {
  const isDark = variant === 'icon-dark';

  if (isDark) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '16px',
        background: '#001C3C', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '10%', boxSizing: 'border-box',
      }}>
        <img src="/logo.png" alt="TradesOn" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="TradesOn"
      width={size}
      height={size}
      style={{ objectFit: 'contain' }}
    />
  );
}

export function TradesOnWordmark({ height = 36, variant = 'wordmark-light' }: LogoProps) {
  const isDark = variant === 'wordmark-dark';
  const textColor = isDark ? '#FEFEFE' : '#001C3C';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height }}>
      <img src="/logo.png" alt="" style={{ height, width: height, objectFit: 'contain' }} />
      <span style={{
        fontFamily: 'Montserrat, sans-serif',
        fontWeight: 700,
        fontSize: height * 0.58,
        color: textColor,
        letterSpacing: '-0.03em',
        lineHeight: 1,
      }}>
        Trades<span style={{ color: '#F76B26' }}>On</span>
      </span>
    </div>
  );
}
