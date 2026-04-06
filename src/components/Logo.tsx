interface LogoProps {
  size?: number;
  height?: number;
  variant?: 'icon-light' | 'icon-dark' | 'wordmark-light' | 'wordmark-dark';
}

export function TradesOnIcon({ size = 36, variant = 'icon-light' }: LogoProps) {
  const isDark = variant === 'icon-dark';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {isDark && <rect width="100" height="100" rx="16" fill="#001C3C" />}
      {/*
        Wrench head (upper right): circular jaw with opening facing upper-right.
        Handle goes diagonally to lower-left, terminating in a pin-like point.
        Checkmark swoosh at the lower right of the icon.
      */}
      <path
        d="
          M 68 6
          C 82 6 92 16 92 29
          C 92 42 82 52 68 52
          C 65 52 62 51 60 50
          L 34 76
          L 40 82
          L 15 92
          L 8 85
          L 18 60
          L 24 66
          L 50 40
          C 49 38 48 35 48 32
          C 48 18 57 6 68 6 Z
          M 68 18
          C 63 18 60 22 60 27
          C 60 32 63 36 68 36
          C 73 36 76 32 76 27
          C 76 22 73 18 68 18 Z
        "
        fill="#F76B26"
      />
      {/* Checkmark swoosh */}
      <path
        d="M 16 72 L 30 86 L 72 44 L 78 50 L 30 98 L 10 78 Z"
        fill="#F76B26"
      />
    </svg>
  );
}

export function TradesOnWordmark({ height = 36, variant = 'wordmark-light' }: LogoProps) {
  const isDark = variant === 'wordmark-dark';
  const textColor = isDark ? '#FEFEFE' : '#001C3C';
  const bgColor = isDark ? '#001C3C' : 'transparent';

  return (
    <svg
      height={height}
      viewBox="0 0 240 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {isDark && <rect width="240" height="60" rx="10" fill={bgColor} />}
      {/* Icon mark */}
      <g transform="translate(4, 4) scale(0.52)">
        <path
          d="
            M 68 6
            C 82 6 92 16 92 29
            C 92 42 82 52 68 52
            C 65 52 62 51 60 50
            L 34 76
            L 40 82
            L 15 92
            L 8 85
            L 18 60
            L 24 66
            L 50 40
            C 49 38 48 35 48 32
            C 48 18 57 6 68 6 Z
            M 68 18
            C 63 18 60 22 60 27
            C 60 32 63 36 68 36
            C 73 36 76 32 76 27
            C 76 22 73 18 68 18 Z
          "
          fill="#F76B26"
        />
        <path
          d="M 16 72 L 30 86 L 72 44 L 78 50 L 30 98 L 10 78 Z"
          fill="#F76B26"
        />
      </g>
      {/* "Trades" in navy/white */}
      <text
        x="62"
        y="40"
        fontFamily="Montserrat, sans-serif"
        fontWeight="700"
        fontSize="26"
        fill={textColor}
        letterSpacing="-0.5"
      >
        Trades
      </text>
      {/* "On" in orange */}
      <text
        x="157"
        y="40"
        fontFamily="Montserrat, sans-serif"
        fontWeight="700"
        fontSize="26"
        fill="#F76B26"
        letterSpacing="-0.5"
      >
        On
      </text>
    </svg>
  );
}
