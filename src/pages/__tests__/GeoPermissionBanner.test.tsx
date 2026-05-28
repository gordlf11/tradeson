import { describe, test, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Module mocks (must be before any import that touches firebase) ──────────

vi.mock('../../services/firebase', () => ({ db: {}, auth: { currentUser: null } }));
vi.mock('../../services/api', () => ({ default: { getJob: vi.fn() } }));
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ userProfile: null, firebaseUser: null }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(), setDoc: vi.fn(), updateDoc: vi.fn(), serverTimestamp: vi.fn(),
  collection: vi.fn(), onSnapshot: vi.fn(), Timestamp: class {},
}));
// Leaflet is imported by JobTrackingMap which JobDayOf.tsx also imports
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({ setView: vi.fn(), remove: vi.fn() })),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    marker: vi.fn(() => ({ addTo: vi.fn(), bindPopup: vi.fn(), setLatLng: vi.fn(), remove: vi.fn() })),
    divIcon: vi.fn(() => ({})),
    Icon: { Default: { prototype: {} } },
  },
}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

import { GeoPermissionBanner, type GeoPermission } from '../JobDayOf';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GeoPermissionBanner', () => {
  beforeAll(() => {
    // Simulate Chrome so browser-specific instructions are deterministic
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      configurable: true,
    });
  });

  test('renders nothing when permission is unavailable', () => {
    const { container } = render(<GeoPermissionBanner permission={'unavailable' as GeoPermission} />);
    expect(container.firstChild).toBeNull();
  });

  test('shows green confirmation when granted', () => {
    render(<GeoPermissionBanner permission="granted" />);
    expect(screen.getByText(/Location services: enabled/i)).toBeInTheDocument();
  });

  test('shows prompt message when permission is prompt', () => {
    render(<GeoPermissionBanner permission="prompt" />);
    expect(screen.getByText(/requires location sharing/i)).toBeInTheDocument();
  });

  test('shows re-enable instructions when denied', () => {
    render(<GeoPermissionBanner permission="denied" />);
    expect(screen.getByText(/Location access is required/i)).toBeInTheDocument();
    // Chrome-specific instructions should appear
    expect(screen.getByText(/Settings → Privacy and security/i)).toBeInTheDocument();
  });

  test('denied banner contains the browser name', () => {
    render(<GeoPermissionBanner permission="denied" />);
    expect(screen.getByText(/Chrome/)).toBeInTheDocument();
  });
});
