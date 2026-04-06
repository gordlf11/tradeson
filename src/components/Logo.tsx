interface LogoProps {
  size?: number;
  height?: number;
  variant?: 'icon-light' | 'icon-dark' | 'wordmark-light' | 'wordmark-dark';
}

// Shared path data for the wrench + checkmark mark
const WRENCH_PATH =
  'M 68 6 C 82 6 92 16 92 29 C 92 42 82 52 68 52 C 65 52 62 51 60 50 ' +
  'L 34 76 L 40 82 L 15 92 L 8 85 L 18 60 L 24 66 L 50 40 ' +
  'C 49 38 48 35 48 32 C 48 18 57 6 68 6 Z ' +
  'M 68 18 C 63 18 59 22 59 28 C 59 34 63 38 68 38 ' +
  'C 73 38 77 34 77 28 C 77 22 73 18 68 18 Z';

// Smooth bezier checkmark swoosh — rounded left cap, curved arms, tapered right end
const CHECK_PATH =
  'M 20 62 C 14 58 6 62 8 72 C 10 82 18 88 26 90 L 36 82 ' +
  'C 46 80 62 66 74 54 L 80 50 L 74 44 ' +
  'C 62 56 46 72 36 72 C 28 72 22 66 20 62 Z';

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
      <path fillRule="evenodd" d={WRENCH_PATH} fill="#F76B26" />
      <path d={CHECK_PATH} fill="#F76B26" />
    </svg>
  );
}

export function TradesOnWordmark({ height = 36, variant = 'wordmark-light' }: LogoProps) {
  const isDark = variant === 'wordmark-dark';
  const textColor = isDark ? '#FEFEFE' : '#001C3C';

  return (
    <svg
      height={height}
      viewBox="0 0 240 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Icon mark — same paths, scaled to fit the 60px height */}
      <g transform="translate(2, 2) scale(0.56)">
        <path fillRule="evenodd" d={WRENCH_PATH} fill="#F76B26" />
        <path d={CHECK_PATH} fill="#F76B26" />
      </g>
      {/* "Trades" in navy/white */}
      <text
        x="64"
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
