/**
 * JobTrackingMap.tsx
 * Live GPS tracking map for the job poster, showing tradesperson location
 * on a Leaflet + OpenStreetMap map. Real-time updates via Firestore onSnapshot
 * on the tracking/{jobId} document.
 *
 * TODO: Upgrade from Leaflet/OSM to Mapbox GL JS for better styling and
 * Directions API support (ETA calculation).
 */

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MapPin, Navigation, Clock, Phone, MessageCircle, AlertTriangle } from 'lucide-react';
import { Card } from './ui/Card';

// Fix Leaflet's broken default icon paths in Vite bundled builds.
// Leaflet tries to resolve icons relative to its own CSS, which fails
// when assets are hashed by Vite. Override with inline SVG markers instead.
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

function makeIcon(color: string, emoji: string): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};color:white;border-radius:50%;
      width:36px;height:36px;display:flex;align-items:center;
      justify-content:center;font-size:18px;
      box-shadow:0 2px 8px rgba(0,0,0,0.3);
      border:3px solid white;
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

const HOUSE_ICON = makeIcon('#001C3C', '🏠');
const VAN_ICON   = makeIcon('#F76B26', '🚐');

/** Haversine straight-line distance in miles. */
export function haversinemiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Linearly interpolate between two lat/lng pairs. t in [0, 1]. */
function lerpLatLng(
  from: L.LatLngLiteral,
  to: L.LatLngLiteral,
  t: number,
): L.LatLngLiteral {
  return {
    lat: from.lat + (to.lat - from.lat) * t,
    lng: from.lng + (to.lng - from.lng) * t,
  };
}

export interface TrackingLocation {
  lat: number;
  lng: number;
  updatedAt: Date;
}

export interface JobTrackingMapProps {
  jobId: string;
  jobAddress: string;
  tradespersonName: string;
  tradespersonPhone?: string;
  tradespersonCategory?: string;
  jobStatus: 'accepted' | 'en_route' | 'arrived' | 'in_progress' | 'completed';
  onMessageClick?: () => void;
}

const STATUS_BANNER: Record<
  JobTrackingMapProps['jobStatus'],
  { text: (name: string) => string; bg: string; color: string; pulse: boolean }
> = {
  accepted:    { text: () => 'Your tradesperson has accepted the job. Tracking begins when they are on their way.', bg: 'var(--bg-base)', color: 'var(--text-secondary)', pulse: false },
  en_route:    { text: name => `${name} is on their way!`, bg: 'rgba(0,122,255,0.08)', color: '#007AFF', pulse: true },
  arrived:     { text: name => `${name} has arrived at your property.`, bg: 'var(--success-light)', color: 'var(--success)', pulse: false },
  in_progress: { text: () => 'Job in progress.', bg: 'var(--warning-light)', color: 'var(--warning)', pulse: true },
  completed:   { text: () => 'Job complete! Please review your tradesperson.', bg: 'var(--success-light)', color: 'var(--success)', pulse: false },
};

// Geocode a free-text address using Nominatim (OpenStreetMap). No API key needed.
async function geocodeAddress(address: string): Promise<L.LatLngLiteral | null> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const data = await resp.json();
    if (!data[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export default function JobTrackingMap({
  jobId,
  jobAddress,
  tradespersonName,
  tradespersonPhone,
  tradespersonCategory,
  jobStatus,
  onMessageClick,
}: JobTrackingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<L.Map | null>(null);
  const destinationRef  = useRef<L.Marker | null>(null);
  const vanRef          = useRef<L.Marker | null>(null);
  const animFrameRef    = useRef<number>(0);
  const vanPosRef       = useRef<L.LatLngLiteral | null>(null);

  const [trackingLoc, setTrackingLoc]   = useState<TrackingLocation | null>(null);
  const [destLatLng, setDestLatLng]     = useState<L.LatLngLiteral | null>(null);
  const [geocodeError, setGeocodeError] = useState(false);
  const [staleLocation, setStaleLocation] = useState(false);

  // Geocode job address on mount
  useEffect(() => {
    geocodeAddress(jobAddress).then(ll => {
      if (ll) setDestLatLng(ll);
      else setGeocodeError(true);
    });
  }, [jobAddress]);

  // Subscribe to tracking/{jobId} in Firestore for live location updates
  useEffect(() => {
    const ref = doc(db, 'tracking', jobId);
    const unsub = onSnapshot(ref, snap => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.lat == null || d.lng == null) return;
      setTrackingLoc({
        lat: d.lat,
        lng: d.lng,
        updatedAt: d.updatedAt instanceof Timestamp ? d.updatedAt.toDate() : new Date(),
      });
    });
    return unsub;
  }, [jobId]);

  // Stale-location warning: >3 min old while en_route
  useEffect(() => {
    if (jobStatus !== 'en_route' || !trackingLoc) { setStaleLocation(false); return; }
    const check = () => setStaleLocation((Date.now() - trackingLoc.updatedAt.getTime()) > 180_000);
    check();
    const id = setInterval(check, 10_000);
    return () => clearInterval(id);
  }, [trackingLoc, jobStatus]);

  // Initialize Leaflet map once container is ready
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Default center: geographic center of the Dakotas — the map re-centers
    // to the job address after geocoding completes.
    const map = L.map(mapContainerRef.current, {
      center: [46.8, -100.4],
      zoom: 7,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update destination marker when geocoding resolves
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !destLatLng) return;

    if (destinationRef.current) {
      destinationRef.current.setLatLng(destLatLng);
    } else {
      destinationRef.current = L.marker(destLatLng, { icon: HOUSE_ICON })
        .addTo(map)
        .bindPopup(`<strong>Job Site</strong><br>${jobAddress}`);
    }
    map.setView(destLatLng, 13);
  }, [destLatLng, jobAddress]);

  // Smoothly animate van marker to new location over ~2 seconds
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !trackingLoc) return;

    const target: L.LatLngLiteral = { lat: trackingLoc.lat, lng: trackingLoc.lng };

    if (!vanRef.current) {
      vanRef.current = L.marker(target, { icon: VAN_ICON })
        .addTo(map)
        .bindPopup(`<strong>${tradespersonName}</strong><br>En route`);
      vanPosRef.current = target;
      return;
    }

    const from = vanPosRef.current ?? target;
    const start = performance.now();
    const duration = 2000;

    cancelAnimationFrame(animFrameRef.current);

    const animate = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const pos = lerpLatLng(from, target, t);
      vanRef.current!.setLatLng(pos);
      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        vanPosRef.current = target;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [trackingLoc, tradespersonName]);

  // Hide van marker if tradesperson has arrived
  useEffect(() => {
    if ((jobStatus === 'arrived' || jobStatus === 'completed') && vanRef.current) {
      vanRef.current.remove();
      vanRef.current = null;
    }
  }, [jobStatus]);

  const banner = STATUS_BANNER[jobStatus];
  const distanceMiles =
    destLatLng && trackingLoc
      ? haversinemiles(destLatLng.lat, destLatLng.lng, trackingLoc.lat, trackingLoc.lng)
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Status banner */}
      <div style={{
        background: banner.bg, border: `1px solid ${banner.color}33`,
        borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
      }}>
        {banner.pulse && (
          <span style={{
            width: 10, height: 10, borderRadius: '50%', background: banner.color,
            flexShrink: 0, animation: 'pulse 1.5s ease-in-out infinite',
          }} />
        )}
        <span style={{ fontSize: '0.88rem', fontWeight: '600', color: banner.color }}>
          {banner.text(tradespersonName.split(' ')[0])}
        </span>
        {jobStatus === 'completed' && onMessageClick && (
          <button
            onClick={onMessageClick}
            style={{
              marginLeft: 'auto', background: 'var(--success)', color: 'white',
              border: 'none', borderRadius: 'var(--radius-full)', padding: '6px 14px',
              fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Leave Review
          </button>
        )}
      </div>

      {/* Stale location warning */}
      {staleLocation && (
        <div style={{
          background: 'var(--warning-light)', border: '1px solid var(--warning)',
          borderRadius: 'var(--radius-sm)', padding: 'var(--space-2) var(--space-3)',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertTriangle size={14} color="var(--warning)" />
          <span style={{ fontSize: '0.78rem', color: 'var(--warning)', fontWeight: '600' }}>
            Location signal lost. Tracking may be delayed.
          </span>
        </div>
      )}

      {/* Map */}
      <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
        {geocodeError && (
          <div style={{
            position: 'absolute', inset: 0, background: 'var(--bg-base)', zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            <MapPin size={28} color="var(--text-tertiary)" />
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
              Map unavailable — could not geocode address.
            </p>
          </div>
        )}

        <div ref={mapContainerRef} style={{ width: '100%', height: '400px', minHeight: '300px' }} />

        {/* No-location placeholder overlay */}
        {!trackingLoc && jobStatus === 'accepted' && !geocodeError && (
          <div style={{
            position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
            background: 'white', borderRadius: 'var(--radius-md)', padding: '8px 14px',
            boxShadow: 'var(--shadow-md)', zIndex: 10, whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Live tracking will appear here once {tradespersonName.split(' ')[0]} is on their way.
            </span>
          </div>
        )}
      </div>

      {/* Distance + last update */}
      {trackingLoc && distanceMiles !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Navigation size={14} color="var(--text-secondary)" />
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Approx. <strong>{distanceMiles.toFixed(1)} mi</strong> away
            {/* TODO: replace with Mapbox Directions API for driving ETA */}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={11} />
            Updated {Math.round((Date.now() - trackingLoc.updatedAt.getTime()) / 1000)}s ago
          </span>
        </div>
      )}

      {/* Tradesperson info card */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%', background: 'var(--primary-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '1.2rem' }}>🔧</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {tradespersonName}
            </div>
            {tradespersonCategory && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{tradespersonCategory}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            {tradespersonPhone && (
              <a
                href={`tel:${tradespersonPhone}`}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--success-light)', border: '1px solid var(--success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--success)', textDecoration: 'none',
                }}
                title="Call tradesperson"
              >
                <Phone size={16} />
              </a>
            )}
            {onMessageClick && (
              <button
                onClick={onMessageClick}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: 'var(--primary-light)', border: '1px solid var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--primary)', cursor: 'pointer',
                }}
                title="Message tradesperson"
              >
                <MessageCircle size={16} />
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
