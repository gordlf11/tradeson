import { useEffect, useState, useCallback } from 'react';
import {
  Home, DollarSign, Users, Briefcase, Copy, CheckCircle, ChevronDown, ChevronUp,
  Star, Plus, X, Link2, TrendingUp, Building2, Wrench, BarChart2,
  AlertCircle
} from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────

interface DashboardJob {
  id: string;
  title: string;
  category: string;
  status: string;
  tradesperson_name: string | null;
  amount: number;
  payment_status: string | null;
  created_at: string;
}

interface Property {
  address: string;
  city: string;
  state: string;
  zip_code: string;
  client_name: string;
  jobs: DashboardJob[];
  total_spend: number;
  open_jobs: number;
}

interface CostRow {
  category: string;
  job_count: number;
  avg_cost: number;
  total_cost: number;
}

interface Favorite {
  tradesperson_user_id: string;
  full_name: string;
  rating: number | null;
  jobs_completed: number;
  primary_trades: string[];
  business_name: string | null;
  service_city: string | null;
  service_state: string | null;
  trade_category: string | null;
  note: string | null;
}

interface Client {
  id: string;
  client_email: string;
  full_name: string | null;
  user_id: string | null;
  invited_at: string;
  accepted_at: string | null;
  property_address: string | null;
  property_city: string | null;
  property_state: string | null;
}

interface Summary {
  total_clients: number;
  active_clients: number;
  referral_signups: number;
  total_jobs: number;
  open_jobs: number;
  completed_jobs: number;
  active_properties: number;
  total_properties: number;
  total_spend: number;
}

interface DashboardData {
  profile: {
    full_name: string;
    brokerage_name: string;
    referral_code: string;
    referral_url: string;
  };
  summary: Summary;
  clients: Client[];
  properties: Property[];
  cost_by_category: CostRow[];
  favorites: Favorite[];
}

// ── Fallback mock data ──────────────────────────────────────────────────────

const MOCK_DATA: DashboardData = {
  profile: {
    full_name: 'Sarah Chen',
    brokerage_name: 'Pinnacle Realty Group',
    referral_code: 'REA4KX9P',
    referral_url: 'https://tradeson.app/join?ref=REA4KX9P',
  },
  summary: {
    total_clients: 6,
    active_clients: 4,
    referral_signups: 2,
    total_jobs: 14,
    open_jobs: 5,
    completed_jobs: 9,
    active_properties: 3,
    total_properties: 5,
    total_spend: 11420,
  },
  clients: [
    { id: '1', client_email: 'john.smith@email.com', full_name: 'John Smith', user_id: 'u1', invited_at: new Date(Date.now() - 30 * 86400000).toISOString(), accepted_at: new Date(Date.now() - 28 * 86400000).toISOString(), property_address: '142 Maple Ave', property_city: 'Toronto', property_state: 'ON' },
    { id: '2', client_email: 'linda.p@email.com', full_name: 'Linda Park', user_id: 'u2', invited_at: new Date(Date.now() - 15 * 86400000).toISOString(), accepted_at: new Date(Date.now() - 14 * 86400000).toISOString(), property_address: '87 Oak St', property_city: 'Mississauga', property_state: 'ON' },
    { id: '3', client_email: 'r.torres@email.com', full_name: null, user_id: null, invited_at: new Date(Date.now() - 5 * 86400000).toISOString(), accepted_at: null, property_address: null, property_city: null, property_state: null },
  ],
  properties: [
    {
      address: '142 Maple Ave', city: 'Toronto', state: 'ON', zip_code: 'M5V 2T6',
      client_name: 'John Smith', open_jobs: 2, total_spend: 3750,
      jobs: [
        { id: 'j1', title: 'Kitchen Faucet Replacement', category: 'Plumbing', status: 'completed', tradesperson_name: 'Carlos Rivera', amount: 650, payment_status: 'completed', created_at: new Date(Date.now() - 20 * 86400000).toISOString() },
        { id: 'j2', title: 'HVAC Tune-Up + Filter Replacement', category: 'HVAC', status: 'completed', tradesperson_name: 'AirPro Services', amount: 380, payment_status: 'completed', created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
        { id: 'j3', title: 'Interior Paint — Living Room + Hallway', category: 'Painting', status: 'in_progress', tradesperson_name: 'BrightCoat Pro', amount: 1800, payment_status: null, created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
        { id: 'j4', title: 'Bathroom Caulking + Grout Refresh', category: 'Handyman', status: 'open', tradesperson_name: null, amount: 0, payment_status: null, created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
      ],
    },
    {
      address: '87 Oak St', city: 'Mississauga', state: 'ON', zip_code: 'L5B 3R2',
      client_name: 'Linda Park', open_jobs: 1, total_spend: 5200,
      jobs: [
        { id: 'j5', title: 'Deep Clean — Full Home Before Listing', category: 'Cleaning', status: 'completed', tradesperson_name: 'SparkleTeam', amount: 420, payment_status: 'completed', created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
        { id: 'j6', title: 'Hardwood Floor Refinish — Main Level', category: 'Carpentry', status: 'completed', tradesperson_name: 'FloorMaster Co.', amount: 2400, payment_status: 'completed', created_at: new Date(Date.now() - 8 * 86400000).toISOString() },
        { id: 'j7', title: 'Exterior Power Wash + Eavestrough Clean', category: 'Handyman', status: 'scheduled', tradesperson_name: 'CleanPro Exterior', amount: 550, payment_status: null, created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
      ],
    },
  ],
  cost_by_category: [
    { category: 'Painting', job_count: 3, avg_cost: 1650, total_cost: 4950 },
    { category: 'Carpentry', job_count: 2, avg_cost: 2100, total_cost: 4200 },
    { category: 'Plumbing', job_count: 4, avg_cost: 480, total_cost: 1920 },
    { category: 'HVAC', job_count: 2, avg_cost: 390, total_cost: 780 },
    { category: 'Cleaning', job_count: 3, avg_cost: 420, total_cost: 1260 },
    { category: 'Handyman', job_count: 2, avg_cost: 325, total_cost: 650 },
  ],
  favorites: [
    { tradesperson_user_id: 'tp1', full_name: 'Carlos Rivera', business_name: 'Rivera Plumbing', rating: 4.9, jobs_completed: 47, primary_trades: ['Plumbing'], service_city: 'Toronto', service_state: 'ON', trade_category: 'Plumbing', note: 'Always on time, fixes it right the first time. Trust him for any pre-listing plumbing.' },
    { tradesperson_user_id: 'tp2', full_name: 'SparkleTeam', business_name: null, rating: 4.8, jobs_completed: 112, primary_trades: ['Cleaning'], service_city: 'Mississauga', service_state: 'ON', trade_category: 'Cleaning', note: 'Best listing-prep deep clean in the GTA.' },
    { tradesperson_user_id: 'tp3', full_name: 'BrightCoat Pro', business_name: 'BrightCoat Painting', rating: 4.7, jobs_completed: 63, primary_trades: ['Painting'], service_city: 'Toronto', service_state: 'ON', trade_category: 'Painting', note: null },
  ],
};

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function relDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function statusColor(s: string): string {
  switch (s) {
    case 'completed': return 'var(--success)';
    case 'in_progress': return 'var(--primary)';
    case 'scheduled': return '#5856d6';
    case 'open': return 'var(--text-secondary)';
    default: return 'var(--text-secondary)';
  }
}

function statusLabel(s: string): string {
  switch (s) {
    case 'in_progress': return 'In Progress';
    case 'pending_confirmation': return 'Awaiting Confirm';
    default: return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
  }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string;
}) {
  return (
    <Card style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius-md)',
          background: accent ? `${accent}18` : 'var(--primary-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </div>
        <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '800', color: accent || 'var(--text-primary)', lineHeight: 1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{sub}</div>}
    </Card>
  );
}

function PropertyCard({ property }: { property: Property }) {
  const [expanded, setExpanded] = useState(false);
  const hasOpenJobs = property.open_jobs > 0;

  return (
    <Card padding="none" style={{ overflow: 'hidden', border: hasOpenJobs ? '1.5px solid var(--primary)' : undefined }}>
      {hasOpenJobs && <div style={{ height: 3, background: 'var(--primary)' }} />}
      <button
        onClick={() => setExpanded(v => !v)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          padding: 'var(--space-4)', textAlign: 'left',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          fontFamily: 'inherit',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
            <Home size={14} color="var(--primary)" />
            <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {property.address}
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
            {property.city}{property.state ? `, ${property.state}` : ''}{property.zip_code ? ` ${property.zip_code}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Users size={11} /> {property.client_name}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 3 }}>
              <Briefcase size={11} /> {property.jobs.length} job{property.jobs.length !== 1 ? 's' : ''}
            </span>
            {property.total_spend > 0 && (
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: 3 }}>
                <DollarSign size={11} /> {fmt$(property.total_spend)} paid
              </span>
            )}
            {property.open_jobs > 0 && (
              <Badge variant="primary" size="sm">{property.open_jobs} active</Badge>
            )}
          </div>
        </div>
        <div style={{ marginLeft: 'var(--space-3)', color: 'var(--text-secondary)', flexShrink: 0 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {expanded && (
        <div style={{ borderTop: '1px solid var(--border)', padding: 'var(--space-3) var(--space-4) var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {property.jobs.map(job => (
              <div key={job.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: 'var(--space-3)', background: 'var(--bg-base)',
                borderRadius: 'var(--radius-md)', gap: 'var(--space-3)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 2 }}>
                    {job.title}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' as const, alignItems: 'center', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                    <span>{job.category}</span>
                    {job.tradesperson_name && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Wrench size={10} /> {job.tradesperson_name}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-secondary)' }}>{relDate(job.created_at)}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{
                    fontSize: '0.7rem', fontWeight: '700', color: statusColor(job.status),
                    marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.04em',
                  }}>
                    {statusLabel(job.status)}
                  </div>
                  {job.amount > 0 && (
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {fmt$(job.amount)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function FavoriteCard({ fav, onRemove }: { fav: Favorite; onRemove: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const tradeLabel = fav.trade_category || (fav.primary_trades?.[0]) || 'Trade';

  const handleRecommend = () => {
    const text = `I recommend ${fav.full_name}${fav.business_name ? ` (${fav.business_name})` : ''} for ${tradeLabel} work. They have ${fav.jobs_completed} completed jobs on TradesOn${fav.rating ? ` with a ${fav.rating} star rating` : ''}. ${fav.note ? `"${fav.note}"` : ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Card style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 4 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-full)',
              background: 'var(--primary-light)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: '800', fontSize: '0.9rem', color: 'var(--primary)',
              flexShrink: 0,
            }}>
              {fav.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                {fav.full_name}
              </div>
              {fav.business_name && fav.business_name !== fav.full_name && (
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{fav.business_name}</div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' as const, marginBottom: 'var(--space-2)' }}>
            <Badge variant="primary" size="sm">{tradeLabel}</Badge>
            {fav.rating && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <Star size={11} color="#f59e0b" fill="#f59e0b" /> {fav.rating}
              </span>
            )}
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
              {fav.jobs_completed} jobs
            </span>
            {fav.service_city && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                {fav.service_city}{fav.service_state ? `, ${fav.service_state}` : ''}
              </span>
            )}
          </div>
          {fav.note && (
            <p style={{
              fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 var(--space-2)',
              fontStyle: 'italic', lineHeight: 1.5,
              borderLeft: '2px solid var(--border)', paddingLeft: 'var(--space-2)',
            }}>
              "{fav.note}"
            </p>
          )}
        </div>
        <button
          onClick={() => onRemove(fav.tradesperson_user_id)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', padding: 4, marginLeft: 'var(--space-2)',
          }}
        >
          <X size={16} />
        </button>
      </div>
      <Button
        variant="outline"
        size="sm"
        fullWidth
        icon={copied ? <CheckCircle size={14} /> : <Copy size={14} />}
        onClick={handleRecommend}
        style={copied ? { borderColor: 'var(--success)', color: 'var(--success)' } : undefined}
      >
        {copied ? 'Recommendation Copied!' : 'Copy Recommendation'}
      </Button>
    </Card>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function RealtorDashboard() {
  useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showClients, setShowClients] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerResults, setPickerResults] = useState<any[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const isDemoMode = localStorage.getItem('demoMode') === 'true';

  const load = useCallback(async () => {
    if (isDemoMode) {
      setData(MOCK_DATA);
      setLoading(false);
      return;
    }
    try {
      const res = await api.getRealtorDashboard() as DashboardData;
      setData(res);
    } catch {
      setData(MOCK_DATA);
    } finally {
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => { load(); }, [load]);

  const copyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.profile.referral_url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    });
  };

  const handleRemoveFavorite = async (tradespersonUserId: string) => {
    setRemovingId(tradespersonUserId);
    try {
      await api.removeRealtorFavorite(tradespersonUserId);
      setData(prev => prev ? {
        ...prev,
        favorites: prev.favorites.filter(f => f.tradesperson_user_id !== tradespersonUserId),
      } : prev);
    } catch (err) {
      console.error('Remove favorite failed:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const openPicker = async () => {
    setPickerOpen(true);
    setPickerLoading(true);
    try {
      const res = await api.getRealtorTradespeoplePicker() as any[];
      setPickerResults(res);
    } catch {
      setPickerResults([]);
    } finally {
      setPickerLoading(false);
    }
  };

  const handleAddFavorite = async (tp: any) => {
    await api.addRealtorFavorite(tp.id, tp.primary_trades?.[0]);
    setPickerOpen(false);
    load();
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: 90 }}>
        <TopNav title="Broker Dashboard" />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ margin: '0 auto 16px' }} />
            Loading your portfolio…
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { profile, summary, clients, properties, cost_by_category, favorites } = data;
  const maxCost = cost_by_category.length > 0
    ? Math.max(...cost_by_category.map(r => r.total_cost))
    : 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: 90 }}>
      <TopNav title="Broker Dashboard" />

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

        {/* ── Welcome ── */}
        <div>
          <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            {profile.full_name}
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
            {profile.brokerage_name || 'Broker Command Center'}
          </p>
        </div>

        {/* ── KPI Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
          <StatCard
            icon={<Users size={16} color="var(--primary)" />}
            label="Clients"
            value={summary.total_clients}
            sub={`${summary.active_clients} on platform`}
          />
          <StatCard
            icon={<Home size={16} color="#5856d6" />}
            label="Properties"
            value={summary.total_properties}
            sub={`${summary.active_properties} active`}
            accent="#5856d6"
          />
          <StatCard
            icon={<Briefcase size={16} color="#f59e0b" />}
            label="Jobs Posted"
            value={summary.total_jobs}
            sub={`${summary.open_jobs} in progress`}
            accent="#f59e0b"
          />
          <StatCard
            icon={<DollarSign size={16} color="var(--success)" />}
            label="Total Spend"
            value={fmt$(summary.total_spend)}
            sub={`${summary.completed_jobs} completed`}
            accent="var(--success)"
          />
        </div>

        {/* ── Referral Link ── */}
        <Card style={{ padding: 'var(--space-4)', border: '1.5px solid var(--primary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Link2 size={16} color="var(--primary)" />
            <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Your Client Referral Link
            </span>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 var(--space-3)', lineHeight: 1.5 }}>
            Share this link with homeowners selling their property. When they sign up, their jobs and spend will appear on your dashboard automatically.
          </p>
          <div style={{
            background: 'var(--bg-base)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
            marginBottom: 'var(--space-3)', fontFamily: 'monospace',
            fontSize: '0.78rem', color: 'var(--text-secondary)', wordBreak: 'break-all' as const,
          }}>
            {profile.referral_url}
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <Button
              variant="primary"
              icon={linkCopied ? <CheckCircle size={15} /> : <Copy size={15} />}
              onClick={copyLink}
              style={linkCopied ? { background: 'var(--success)', borderColor: 'var(--success)' } : undefined}
            >
              {linkCopied ? 'Copied!' : 'Copy Link'}
            </Button>
            {(summary.active_clients > 0 || summary.referral_signups > 0) && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--primary)' }}>
                  {summary.active_clients + summary.referral_signups}
                </strong> homeowner{(summary.active_clients + summary.referral_signups) !== 1 ? 's' : ''} joined
              </span>
            )}
          </div>
        </Card>

        {/* ── Client List (collapsible) ── */}
        <div>
          <button
            onClick={() => setShowClients(v => !v)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              width: '100%', background: 'none', border: 'none', cursor: 'pointer',
              marginBottom: 'var(--space-3)', fontFamily: 'inherit', padding: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Users size={16} color="var(--primary)" />
              <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                Clients ({clients.length})
              </span>
            </div>
            {showClients ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
          </button>

          {showClients && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {clients.length === 0 ? (
                <Card style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    No clients yet. Share your referral link to get started.
                  </p>
                </Card>
              ) : clients.map(client => (
                <Card key={client.id} style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {client.full_name || client.client_email}
                    </div>
                    {client.full_name && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{client.client_email}</div>
                    )}
                    {client.property_address && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {client.property_address}, {client.property_city}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {client.accepted_at ? (
                      <Badge variant="success" size="sm">On Platform</Badge>
                    ) : (
                      <Badge variant="neutral" size="sm">Invited</Badge>
                    )}
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                      {relDate(client.invited_at)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── Properties ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
            <Building2 size={16} color="var(--primary)" />
            <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
              Properties
            </span>
            <Badge variant="neutral" size="sm">{properties.length}</Badge>
          </div>

          {properties.length === 0 ? (
            <Card style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
              <Home size={32} style={{ opacity: 0.2, margin: '0 auto var(--space-3)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                Jobs posted by your clients will appear here, grouped by property address.
              </p>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {properties.map((prop, i) => (
                <PropertyCard key={`${prop.address}-${i}`} property={prop} />
              ))}
            </div>
          )}
        </div>

        {/* ── Cost Breakdown by Trade ── */}
        {cost_by_category.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <BarChart2 size={16} color="var(--primary)" />
              <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                Cost by Trade
              </span>
            </div>
            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {cost_by_category.map(row => (
                  <div key={row.category}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 }}>
                      <div>
                        <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                          {row.category}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: 8 }}>
                          {row.job_count} job{row.job_count !== 1 ? 's' : ''} · avg {fmt$(row.avg_cost)}
                        </span>
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        {fmt$(row.total_cost)}
                      </span>
                    </div>
                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 4,
                        width: `${Math.round((row.total_cost / maxCost) * 100)}%`,
                        background: 'var(--primary)',
                        transition: 'width 0.4s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{
                marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)',
                borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                  Total Prep Spend
                </span>
                <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--success)' }}>
                  {fmt$(summary.total_spend)}
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* ── Trusted Tradespeople ── */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <Star size={16} color="#f59e0b" fill="#f59e0b" />
              <span style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                Trusted Tradespeople
              </span>
            </div>
            <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={openPicker}>
              Add
            </Button>
          </div>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 var(--space-3)', lineHeight: 1.5 }}>
            Your curated list of go-to pros for pre-listing prep. Tap "Copy Recommendation" to share their details with a client.
          </p>

          {favorites.length === 0 ? (
            <Card style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
              <Star size={32} style={{ opacity: 0.2, margin: '0 auto var(--space-3)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 var(--space-3)' }}>
                No favorites yet. Add tradespeople you trust to build your referral network.
              </p>
              <Button variant="outline" size="sm" icon={<Plus size={14} />} onClick={openPicker}>
                Add First Pro
              </Button>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {favorites.map(fav => (
                <div key={fav.tradesperson_user_id} style={{ opacity: removingId === fav.tradesperson_user_id ? 0.5 : 1 }}>
                  <FavoriteCard fav={fav} onRemove={handleRemoveFavorite} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Add Pro Picker Modal ── */}
        {pickerOpen && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 1000, display: 'flex', alignItems: 'flex-end',
          }}>
            <div style={{
              background: 'var(--bg-surface)', width: '100%',
              borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
              padding: 'var(--space-5)', maxHeight: '70vh', overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Add Trusted Pro
                </h3>
                <button onClick={() => setPickerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={20} color="var(--text-secondary)" />
                </button>
              </div>

              {pickerLoading ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-5)', color: 'var(--text-secondary)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
                  Loading…
                </div>
              ) : pickerResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-5)' }}>
                  <AlertCircle size={32} style={{ opacity: 0.3, margin: '0 auto var(--space-3)' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                    No additional tradespeople found. Tradespeople who have worked on your clients' jobs will appear here.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {pickerResults.map((tp: any) => (
                    <button
                      key={tp.id}
                      onClick={() => handleAddFavorite(tp)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--bg-base)', border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'inherit',
                        width: '100%', textAlign: 'left',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {tp.full_name}
                        </div>
                        {tp.primary_trades?.length > 0 && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                            {tp.primary_trades.join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        {tp.rating && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                            <Star size={12} color="#f59e0b" fill="#f59e0b" /> {tp.rating}
                          </span>
                        )}
                        <Plus size={16} color="var(--primary)" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Insights tip ── */}
        <Card style={{ padding: 'var(--space-4)', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <TrendingUp size={18} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                Pre-listing prep insight
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                Homes that complete painting, cleaning, and a handyman pass before listing sell
                faster and at higher prices. Average prep cost across your portfolio: {' '}
                <strong style={{ color: 'var(--primary)' }}>
                  {summary.total_properties > 0
                    ? fmt$(Math.round(summary.total_spend / summary.total_properties))
                    : '$0'}
                </strong> per property.
              </p>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
