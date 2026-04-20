import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield, Users, Briefcase, DollarSign, AlertTriangle, CheckCircle,
  XCircle, FileText, TrendingUp, Eye,
  BarChart2, Flag, LogOut, ChevronDown, ChevronUp,
  UserCheck, AlertOctagon, Lock
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

// ── Types ──────────────────────────────────────────────────────────────────

type AdminSection = 'overview' | 'compliance' | 'accounts' | 'audit' | 'metrics';

interface ComplianceSubmission {
  id: string;
  tradespersonName: string;
  email: string;
  tradeType: string;
  submittedAt: string;
  licenseNumber: string;
  licenseState: string;
  licenseExpiry: string;
  insuranceCoverage: string;
  insuranceExpiry: string;
  hasGovId: boolean;
  hasLicenseDoc: boolean;
  hasInsuranceDoc: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'more_docs';
  adminNote: string;
}

interface FlaggedAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  flagReason: string;
  flagType: 'dispute' | 'poor_reviews' | 'expired_insurance' | 'suspicious_activity';
  flaggedAt: string;
  severity: 'low' | 'medium' | 'high';
  reviewCount?: number;
  avgRating?: number;
}

interface AuditEntry {
  id: string;
  adminEmail: string;
  actionType: string;
  targetUser: string;
  targetEmail: string;
  reason: string;
  timestamp: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────

const mockSubmissions: ComplianceSubmission[] = [
  {
    id: 'cs1', tradespersonName: 'Carlos Rivera', email: 'carlos@plumb.co',
    tradeType: 'Plumbing', submittedAt: '2 hrs ago', licenseNumber: 'PL-99123',
    licenseState: 'CA', licenseExpiry: '2026-08-01', insuranceCoverage: '$1,000,000',
    insuranceExpiry: '2025-12-31', hasGovId: true, hasLicenseDoc: true, hasInsuranceDoc: true,
    status: 'pending', adminNote: '',
  },
  {
    id: 'cs2', tradespersonName: 'Amy Watts', email: 'amy@watts-electric.com',
    tradeType: 'Electrical', submittedAt: '5 hrs ago', licenseNumber: 'EL-44021',
    licenseState: 'CA', licenseExpiry: '2025-09-15', insuranceCoverage: '$500,000',
    insuranceExpiry: '2025-07-01', hasGovId: true, hasLicenseDoc: false, hasInsuranceDoc: true,
    status: 'more_docs', adminNote: 'Missing professional license document.',
  },
  {
    id: 'cs3', tradespersonName: 'Dave Nguyen', email: 'dave@nguyenfix.com',
    tradeType: 'HVAC', submittedAt: 'Yesterday', licenseNumber: 'HV-20847',
    licenseState: 'CA', licenseExpiry: '2027-03-01', insuranceCoverage: '$2,000,000',
    insuranceExpiry: '2026-06-30', hasGovId: true, hasLicenseDoc: true, hasInsuranceDoc: true,
    status: 'approved', adminNote: '',
  },
];

const mockFlaggedAccounts: FlaggedAccount[] = [
  {
    id: 'fa1', name: 'Mike Johnson', email: 'mike.j@handyman.co', role: 'Tradesperson',
    flagReason: 'Open payment dispute filed by client', flagType: 'dispute',
    flaggedAt: '1 day ago', severity: 'high',
  },
  {
    id: 'fa2', name: 'Lisa Torres', email: 'lisa.t@fixes.com', role: 'Tradesperson',
    flagReason: 'Average rating below 2.5 over last 30 days', flagType: 'poor_reviews',
    flaggedAt: '3 days ago', severity: 'medium', reviewCount: 8, avgRating: 2.3,
  },
  {
    id: 'fa3', name: 'Bob Clark', email: 'bob@clarkhvac.com', role: 'Tradesperson',
    flagReason: 'Insurance certificate expired 14 days ago', flagType: 'expired_insurance',
    flaggedAt: '14 days ago', severity: 'high',
  },
  {
    id: 'fa4', name: 'James Patel', email: 'j.patel@gmail.com', role: 'Homeowner',
    flagReason: '14 failed login attempts in 2 hours — possible unauthorized access',
    flagType: 'suspicious_activity', flaggedAt: '6 hrs ago', severity: 'high',
  },
];

const mockAuditLog: AuditEntry[] = [
  { id: 'al1', adminEmail: 'admin@tradeson.com', actionType: 'Account Approved', targetUser: 'Dave Nguyen', targetEmail: 'dave@nguyenfix.com', reason: 'All documents verified and valid.', timestamp: 'Apr 9, 2026 · 10:14 AM' },
  { id: 'al2', adminEmail: 'admin@tradeson.com', actionType: 'More Docs Requested', targetUser: 'Amy Watts', targetEmail: 'amy@watts-electric.com', reason: 'Missing professional license document.', timestamp: 'Apr 9, 2026 · 9:02 AM' },
  { id: 'al3', adminEmail: 'admin@tradeson.com', actionType: 'Temporary Suspension', targetUser: 'Mike Johnson', targetEmail: 'mike.j@handyman.co', reason: 'Payment dispute unresolved for 7 days. Account suspended pending resolution.', timestamp: 'Apr 8, 2026 · 3:45 PM' },
  { id: 'al4', adminEmail: 'admin@tradeson.com', actionType: 'Warning Issued', targetUser: 'Lisa Torres', targetEmail: 'lisa.t@fixes.com', reason: 'Service quality below platform threshold. Customer complaints reviewed.', timestamp: 'Apr 7, 2026 · 11:30 AM' },
  { id: 'al5', adminEmail: 'admin@tradeson.com', actionType: 'Account Rejected', targetUser: 'Unknown Applicant', targetEmail: 'reject@test.com', reason: 'Fraudulent license number detected during cross-reference check.', timestamp: 'Apr 6, 2026 · 2:00 PM' },
];

// ── Metric helpers ─────────────────────────────────────────────────────────

const platformMetrics = {
  users: { homeowners: 1842, propertyManagers: 394, realtors: 218, tradespersons: 631, total: 3085 },
  mau: { total: 1240, homeowners: 720, tradespersons: 390, others: 130 },
  jobs: { open: 87, inProgress: 143, completed: 2104 },
  revenue: { gross: 184320, net: 156672, platformFee: 27648, opex: 24000 },
  funnel: {
    customer: { visits: 12400, signups: 2054, onboarded: 1842, firstJob: 1104 },
    tradesperson: { signups: 850, verified: 631, firstBid: 512, firstJobWon: 389 },
  },
  supplyDemand: [
    { zip: '90210', trade: 'Plumbing', supply: 12, demand: 18, ratio: 0.67 },
    { zip: '90211', trade: 'Electrical', supply: 8, demand: 6, ratio: 1.33 },
    { zip: '90212', trade: 'HVAC', supply: 3, demand: 14, ratio: 0.21 },
  ],
  activationRate: 0.78,
};

// ── Sub-components ─────────────────────────────────────────────────────────


function StatusBadge({ status }: { status: ComplianceSubmission['status'] }) {
  const map = {
    pending: { label: 'Pending Review', variant: 'warning' as const },
    approved: { label: 'Approved', variant: 'success' as const },
    rejected: { label: 'Rejected', variant: 'danger' as const },
    more_docs: { label: 'More Docs Needed', variant: 'neutral' as const },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

function SeverityBadge({ severity }: { severity: FlaggedAccount['severity'] }) {
  const map = { low: 'success' as const, medium: 'warning' as const, high: 'danger' as const };
  return <Badge variant={map[severity]} size="sm">{severity.toUpperCase()}</Badge>;
}

// ── Section: Compliance Review ─────────────────────────────────────────────

function ComplianceSection() {
  const [submissions, setSubmissions] = useState(mockSubmissions);
  const [expanded, setExpanded] = useState<string | null>('cs1');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleDecision = (id: string, decision: ComplianceSubmission['status']) => {
    setSubmissions(prev => prev.map(s => s.id === id
      ? { ...s, status: decision, adminNote: notes[id] || s.adminNote }
      : s
    ));
  };

  const pending = submissions.filter(s => s.status === 'pending' || s.status === 'more_docs');
  const resolved = submissions.filter(s => s.status === 'approved' || s.status === 'rejected');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      <div>
        <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
          Pending Review ({pending.length})
        </h3>
        {pending.map(sub => (
          <Card key={sub.id} style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-4)' }}>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
            >
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{sub.tradespersonName}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sub.tradeType} · {sub.email} · {sub.submittedAt}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusBadge status={sub.status} />
                {expanded === sub.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>

            {expanded === sub.id && (
              <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                {/* Documents */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                  {[
                    { label: 'Gov. ID', done: sub.hasGovId },
                    { label: 'License Doc', done: sub.hasLicenseDoc },
                    { label: 'Insurance', done: sub.hasInsuranceDoc },
                  ].map(doc => (
                    <div key={doc.label} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                      padding: 'var(--space-3)', background: doc.done ? 'rgba(52,199,89,0.1)' : 'rgba(255,59,48,0.08)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      {doc.done
                        ? <CheckCircle size={20} color="var(--success)" />
                        : <XCircle size={20} color="var(--danger)" />
                      }
                      <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{doc.label}</span>
                    </div>
                  ))}
                </div>

                {/* License + Insurance details */}
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: 'var(--space-4)' }}>
                  <div><strong>License:</strong> {sub.licenseNumber} · {sub.licenseState} · Expires {sub.licenseExpiry}</div>
                  <div><strong>Insurance:</strong> {sub.insuranceCoverage} coverage · Expires {sub.insuranceExpiry}</div>
                </div>

                {/* Admin Note */}
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Admin Note (required for rejection or more docs)
                  </label>
                  <textarea
                    value={notes[sub.id] ?? sub.adminNote}
                    onChange={e => setNotes(prev => ({ ...prev, [sub.id]: e.target.value }))}
                    rows={2}
                    placeholder="Enter reason or instructions for the applicant..."
                    style={{
                      width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                      fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical',
                      color: 'var(--text-primary)', background: 'var(--bg-surface)',
                    }}
                  />
                </div>

                {/* Decision buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button variant="primary" size="sm" onClick={() => handleDecision(sub.id, 'approved')}
                    icon={<CheckCircle size={14} />}>Approve</Button>
                  <Button variant="danger" size="sm" onClick={() => handleDecision(sub.id, 'rejected')}
                    icon={<XCircle size={14} />}>Reject</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDecision(sub.id, 'more_docs')}
                    icon={<FileText size={14} />}>Request Docs</Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {resolved.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
            Resolved ({resolved.length})
          </h3>
          {resolved.map(sub => (
            <Card key={sub.id} style={{ marginBottom: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{sub.tradespersonName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{sub.tradeType} · {sub.email}</div>
                </div>
                <StatusBadge status={sub.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Section: Account Monitoring ────────────────────────────────────────────

function AccountMonitoringSection({ onFlagAccount }: { onFlagAccount: (account: FlaggedAccount) => void }) {
  const [search, setSearch] = useState('');
  const [notified, setNotified] = useState<Record<string, boolean>>({});

  const filtered = mockFlaggedAccounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const flagIcon = (type: FlaggedAccount['flagType']) => {
    if (type === 'dispute') return <DollarSign size={16} color="var(--danger)" />;
    if (type === 'poor_reviews') return <Flag size={16} color="var(--warning)" />;
    if (type === 'expired_insurance') return <Shield size={16} color="var(--warning)" />;
    return <AlertOctagon size={16} color="var(--danger)" />;
  };

  const handleNotify = (id: string) => {
    setNotified(prev => ({ ...prev, [id]: true }));
    setTimeout(() => setNotified(prev => ({ ...prev, [id]: false })), 2500);
  };

  return (
    <div>
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', boxSizing: 'border-box', padding: '10px 14px',
            border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
            fontSize: '0.875rem', fontFamily: 'inherit', color: 'var(--text-primary)',
            background: 'var(--bg-surface)',
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filtered.map(account => (
          <Card key={account.id} style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {flagIcon(account.flagType)}
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>{account.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{account.role} · {account.email}</div>
                </div>
              </div>
              <SeverityBadge severity={account.severity} />
            </div>
            <div style={{
              background: account.severity === 'high' ? 'rgba(255,59,48,0.06)' : 'rgba(255,149,0,0.08)',
              borderRadius: 'var(--radius-sm)', padding: '8px 12px',
              fontSize: '0.78rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)',
            }}>
              {account.flagReason}
            </div>
            {account.avgRating !== undefined && (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                Avg Rating: {account.avgRating} / 5 over {account.reviewCount} reviews
              </div>
            )}
            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>Flagged {account.flaggedAt}</div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => onFlagAccount(account)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: '700',
                  border: '1.5px solid var(--danger)',
                  background: 'rgba(255,59,48,0.06)',
                  color: 'var(--danger)',
                  transition: 'all 0.15s ease',
                }}
              >
                <Flag size={13} />
                Flag Account
              </button>
              <button
                onClick={() => handleNotify(account.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  padding: '8px 0', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: '0.78rem', fontWeight: '700',
                  border: 'none',
                  background: notified[account.id] ? 'var(--success)' : 'var(--primary)',
                  color: 'white',
                  transition: 'background 0.15s ease',
                }}
              >
                {notified[account.id] ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                {notified[account.id] ? 'Notice Sent' : 'Send Notice'}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ── Section: Admin Resolutions ─────────────────────────────────────────────

function ResolutionsSection({ preselectedAccount }: { preselectedAccount?: FlaggedAccount }) {
  const [selectedAccount, setSelectedAccount] = useState(preselectedAccount?.id ?? '');
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [suspendUntil, setSuspendUntil] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedAccount || !action || !reason) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setSelectedAccount('');
      setAction('');
      setReason('');
      setSuspendUntil('');
    }, 2000);
  };

  const actions = [
    { value: 'warning', label: 'Issue Formal Warning', desc: 'User must acknowledge the warning before accessing the platform.' },
    { value: 'explanation', label: 'Request Written Explanation', desc: 'User must submit a written explanation for review.' },
    { value: 'suspension', label: 'Temporary Suspension', desc: 'Block access until a specified reinstatement date.' },
    { value: 'deactivation', label: 'Permanent Deactivation', desc: 'Permanently close the account with a documented reason.' },
  ];

  return (
    <div>
      {submitted ? (
        <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <CheckCircle size={40} color="var(--success)" style={{ margin: '0 auto var(--space-3)' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Resolution Applied</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>The action has been logged to the audit trail and the user has been notified.</p>
        </Card>
      ) : (
        <Card style={{ padding: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: 'var(--space-4)', color: 'var(--text-primary)' }}>
            Apply Resolution
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Target Account
              </label>
              <select
                value={selectedAccount}
                onChange={e => setSelectedAccount(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
                  fontFamily: 'inherit', color: 'var(--text-primary)', background: 'var(--bg-surface)',
                }}
              >
                <option value="">Select flagged account...</option>
                {mockFlaggedAccounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name} ({a.role})</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', color: 'var(--text-primary)' }}>
                Resolution Action
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {actions.map(a => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAction(a.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer',
                      padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)', textAlign: 'left',
                      border: action === a.value ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                      background: action === a.value ? 'var(--primary-light)' : 'var(--bg-surface)',
                      fontFamily: 'inherit', width: '100%', transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                      border: action === a.value ? '5px solid var(--primary)' : '2px solid var(--border)',
                      background: 'var(--bg-surface)', transition: 'all 0.15s ease',
                    }} />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-primary)' }}>{a.label}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{a.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {action === 'suspension' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Reinstatement Date
                </label>
                <input
                  type="date"
                  value={suspendUntil}
                  onChange={e => setSuspendUntil(e.target.value)}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem', fontFamily: 'inherit', color: 'var(--text-primary)',
                    background: 'var(--bg-surface)',
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                Documented Reason <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Explain the reason for this action. This will be recorded in the audit log and sent to the user."
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical',
                  color: 'var(--text-primary)', background: 'var(--bg-surface)',
                }}
              />
            </div>

            <Button
              variant={action === 'deactivation' ? 'danger' : 'primary'}
              fullWidth
              onClick={handleSubmit}
              disabled={!selectedAccount || !action || !reason}
            >
              Apply Resolution & Notify User
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Section: Audit Log ─────────────────────────────────────────────────────

function AuditLogSection() {
  const actionColor = (action: string) => {
    if (action.includes('Approved')) return 'var(--success)';
    if (action.includes('Rejected') || action.includes('Deactivat')) return 'var(--danger)';
    if (action.includes('Suspension')) return 'var(--danger)';
    if (action.includes('Warning')) return 'var(--warning)';
    return 'var(--primary)';
  };

  return (
    <div>
      <div style={{
        background: 'rgba(255,149,0,0.08)', border: '1px solid var(--warning)',
        borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
        display: 'flex', gap: '10px', alignItems: 'flex-start',
      }}>
        <Lock size={16} color="var(--warning)" style={{ flexShrink: 0, marginTop: '1px' }} />
        <p style={{ fontSize: '0.78rem', color: 'var(--text-primary)', margin: 0 }}>
          Audit log entries are <strong>immutable</strong>. All admin actions are permanently recorded for compliance and dispute resolution.
        </p>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-base)', borderBottom: '2px solid var(--border)' }}>
                {['Action', 'Target User', 'Admin', 'Reason', 'Timestamp'].map(col => (
                  <th key={col} style={{
                    padding: '10px 14px', textAlign: 'left', fontWeight: '700',
                    fontSize: '0.72rem', color: 'var(--text-secondary)',
                    textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mockAuditLog.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: i < mockAuditLog.length - 1 ? '1px solid var(--border)' : 'none',
                    background: i % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-base)',
                  }}
                >
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <span style={{
                      fontWeight: '700', color: actionColor(entry.actionType),
                      display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <span style={{
                        width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                        background: actionColor(entry.actionType), display: 'inline-block',
                      }} />
                      {entry.actionType}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{entry.targetUser}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{entry.targetEmail}</div>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {entry.adminEmail}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', maxWidth: '220px' }}>
                    {entry.reason}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontSize: '0.72rem' }}>
                    {entry.timestamp}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Section: Platform Metrics ──────────────────────────────────────────────

function MetricsSection() {
  const m = platformMetrics;
  const fmtCurrency = (n: number) => `$${n.toLocaleString()}`;
  const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Users */}
      <div>
        <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Registered Users
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
          {[
            { label: 'Total Users', value: m.users.total.toLocaleString(), icon: <Users size={16} />, color: 'var(--primary)' },
            { label: 'Tradespersons', value: m.users.tradespersons.toLocaleString(), icon: <UserCheck size={16} />, color: 'var(--success)' },
            { label: 'Homeowners', value: m.users.homeowners.toLocaleString(), icon: <Shield size={16} />, color: 'var(--navy)' },
            { label: 'MAU (Total)', value: m.mau.total.toLocaleString(), icon: <TrendingUp size={16} />, color: 'var(--warning)' },
          ].map(stat => (
            <Card key={stat.label} style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
              <div style={{ color: stat.color, display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>{stat.icon}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{stat.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{stat.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Jobs */}
      <div>
        <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Active Jobs
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
          {[
            { label: 'Open', value: m.jobs.open, color: 'var(--warning)' },
            { label: 'In Progress', value: m.jobs.inProgress, color: 'var(--primary)' },
            { label: 'Completed', value: m.jobs.completed, color: 'var(--success)' },
          ].map(j => (
            <Card key={j.label} style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', fontWeight: '800', color: j.color }}>{j.value.toLocaleString()}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{j.label}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Revenue */}
      <div>
        <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Revenue (YTD)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {[
            { label: 'Gross Revenue', value: fmtCurrency(m.revenue.gross), color: 'var(--success)' },
            { label: 'Net Revenue', value: fmtCurrency(m.revenue.net), color: 'var(--primary)' },
            { label: 'Platform Fees Collected', value: fmtCurrency(m.revenue.platformFee), color: 'var(--navy)' },
            { label: 'Operational Expenses', value: fmtCurrency(m.revenue.opex), color: 'var(--danger)' },
          ].map(r => (
            <Card key={r.label} style={{ padding: 'var(--space-3) var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{r.label}</span>
                <span style={{ fontWeight: '800', fontSize: '1rem', color: r.color }}>{r.value}</span>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Customer Funnel */}
      <div>
        <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Customer Acquisition Funnel
        </h3>
        <Card style={{ padding: 'var(--space-4)' }}>
          {[
            { label: 'Website Visits', value: m.funnel.customer.visits },
            { label: 'Sign-Ups', value: m.funnel.customer.signups },
            { label: 'Onboarded', value: m.funnel.customer.onboarded },
            { label: 'First Job Created', value: m.funnel.customer.firstJob },
          ].map((step, i, arr) => {
            const pct = i === 0 ? 100 : Math.round((step.value / arr[0].value) * 100);
            return (
              <div key={step.label} style={{ marginBottom: i < arr.length - 1 ? 'var(--space-3)' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{step.label}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {step.value.toLocaleString()} <span style={{ color: 'var(--text-tertiary)', fontWeight: '400' }}>({pct}%)</span>
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-base)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: '9999px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Tradesperson Funnel */}
      <div>
        <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Tradesperson Acquisition Funnel
        </h3>
        <Card style={{ padding: 'var(--space-4)' }}>
          {[
            { label: 'Sign-Ups', value: m.funnel.tradesperson.signups },
            { label: 'Verified', value: m.funnel.tradesperson.verified },
            { label: 'First Bid Submitted', value: m.funnel.tradesperson.firstBid },
            { label: 'First Job Won', value: m.funnel.tradesperson.firstJobWon },
          ].map((step, i, arr) => {
            const pct = i === 0 ? 100 : Math.round((step.value / arr[0].value) * 100);
            return (
              <div key={step.label} style={{ marginBottom: i < arr.length - 1 ? 'var(--space-3)' : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{step.label}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {step.value.toLocaleString()} <span style={{ color: 'var(--text-tertiary)', fontWeight: '400' }}>({pct}%)</span>
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-base)', borderRadius: '9999px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: 'var(--navy)', borderRadius: '9999px', transition: 'width 0.4s ease' }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Supply / Demand by ZIP */}
      <div>
        <h3 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Supply / Demand by ZIP & Trade
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {m.supplyDemand.map(row => (
            <Card key={`${row.zip}-${row.trade}`} style={{ padding: 'var(--space-3) var(--space-4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '0.82rem', color: 'var(--text-primary)' }}>{row.zip} · {row.trade}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Supply: {row.supply} · Demand: {row.demand}</div>
                </div>
                <Badge
                  variant={row.ratio < 0.5 ? 'danger' : row.ratio > 1.2 ? 'success' : 'warning'}
                  size="sm"
                >
                  {row.ratio < 0.5 ? 'Under-Served' : row.ratio > 1.2 ? 'Over-Supplied' : 'Balanced'}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Activation rate */}
      <Card style={{ padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)' }}>Platform Activation Rate</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Users who completed their first transaction</div>
          </div>
          <div style={{ fontWeight: '800', fontSize: '1.5rem', color: 'var(--success)' }}>{fmtPct(m.activationRate)}</div>
        </div>
      </Card>
    </div>
  );
}

// ── Main Admin Dashboard ───────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [flaggingAccount, setFlaggingAccount] = useState<FlaggedAccount | null>(null);
  const adminEmail = localStorage.getItem('userEmail') || 'admin@tradeson.com';

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const pendingCompliance = mockSubmissions.filter(s => s.status === 'pending').length;
  const highSeverityFlags = mockFlaggedAccounts.filter(a => a.severity === 'high').length;

  const sections: { key: AdminSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart2 size={15} /> },
    { key: 'compliance', label: 'Compliance', icon: <Shield size={15} />, badge: pendingCompliance },
    { key: 'accounts', label: 'Accounts', icon: <AlertTriangle size={15} />, badge: highSeverityFlags },
    { key: 'audit', label: 'Audit Log', icon: <FileText size={15} /> },
    { key: 'metrics', label: 'Metrics', icon: <TrendingUp size={15} /> },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '40px' }}>

      {/* Admin Header */}
      <div style={{ background: 'var(--navy)', padding: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} color="var(--primary)" />
              <span style={{ color: 'white', fontWeight: '800', fontSize: '1rem', letterSpacing: '-0.02em' }}>Admin Portal</span>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', margin: '2px 0 0' }}>{adminEmail}</p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.8)', padding: '6px 12px', borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', fontFamily: 'inherit',
            }}
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        {/* Alert banner */}
        {(pendingCompliance > 0 || highSeverityFlags > 0) && (
          <div style={{
            background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.4)',
            borderRadius: 'var(--radius-sm)', padding: '8px 12px',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <AlertTriangle size={14} color="var(--danger)" />
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.75rem', margin: 0 }}>
              {pendingCompliance} compliance submissions pending · {highSeverityFlags} high-severity account flags
            </p>
          </div>
        )}
      </div>

      {/* Section Content */}
      <div style={{ padding: 'var(--space-4)' }}>
        {/* Back navigation */}
        {activeSection !== 'overview' && !flaggingAccount && (
          <button
            onClick={() => setActiveSection('overview')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '700',
              fontFamily: 'inherit', padding: '0 0 var(--space-4) 0',
            }}
          >
            ← Back to Overview
          </button>
        )}
        {flaggingAccount && (
          <button
            onClick={() => setFlaggingAccount(null)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--primary)', fontSize: '0.85rem', fontWeight: '700',
              fontFamily: 'inherit', padding: '0 0 var(--space-4) 0',
            }}
          >
            ← Back to Accounts
          </button>
        )}

        {/* Overview */}
        {activeSection === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Platform Overview
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              {[
                { label: 'Total Users', value: platformMetrics.users.total.toLocaleString(), icon: <Users size={18} />, color: 'var(--primary)' },
                { label: 'Active Jobs', value: (platformMetrics.jobs.open + platformMetrics.jobs.inProgress).toLocaleString(), icon: <Briefcase size={18} />, color: 'var(--navy)' },
                { label: 'YTD Revenue', value: `$${(platformMetrics.revenue.gross / 1000).toFixed(0)}K`, icon: <DollarSign size={18} />, color: 'var(--success)' },
                { label: 'Pending Reviews', value: pendingCompliance, icon: <Shield size={18} />, color: pendingCompliance > 0 ? 'var(--warning)' : 'var(--success)' },
              ].map(stat => (
                <Card key={stat.label} style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                  <div style={{ color: stat.color, display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>{stat.icon}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{stat.value}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{stat.label}</div>
                </Card>
              ))}
            </div>

            {/* Quick action cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sections.filter(s => s.key !== 'overview').map(s => (
                <Card key={s.key} interactive style={{ padding: 'var(--space-4)' }} onClick={() => { setFlaggingAccount(null); setActiveSection(s.key); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: 'var(--primary)' }}>{s.icon}</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{s.label}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                          {s.key === 'compliance' && 'Review tradesperson verification submissions'}
                          {s.key === 'accounts' && 'Monitor flagged accounts — flag to apply resolutions'}
                          {s.key === 'audit' && 'Immutable log of all admin actions'}
                          {s.key === 'metrics' && 'Platform-wide performance and funnel metrics'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {s.badge !== undefined && s.badge > 0 && (
                        <Badge variant="danger" size="sm">{s.badge}</Badge>
                      )}
                      <Eye size={16} color="var(--text-tertiary)" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'compliance' && (
          <>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 var(--space-4)' }}>
              Compliance Review
            </h2>
            <ComplianceSection />
          </>
        )}
        {activeSection === 'accounts' && !flaggingAccount && (
          <>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 var(--space-4)' }}>
              Account Monitoring
            </h2>
            <AccountMonitoringSection onFlagAccount={(account) => setFlaggingAccount(account)} />
          </>
        )}
        {activeSection === 'accounts' && flaggingAccount && (
          <>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 4px' }}>
                Apply Resolution
              </h2>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 12px', background: 'rgba(255,59,48,0.06)',
                border: '1px solid rgba(255,59,48,0.2)', borderRadius: 'var(--radius-sm)',
              }}>
                <Flag size={13} color="var(--danger)" />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>
                  <strong>{flaggingAccount.name}</strong> · {flaggingAccount.role} · {flaggingAccount.flagReason}
                </span>
              </div>
            </div>
            <ResolutionsSection preselectedAccount={flaggingAccount} />
          </>
        )}
        {activeSection === 'audit' && (
          <>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 var(--space-4)' }}>
              Audit Log
            </h2>
            <AuditLogSection />
          </>
        )}
        {activeSection === 'metrics' && (
          <>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 var(--space-4)' }}>
              Platform Metrics
            </h2>
            <MetricsSection />
          </>
        )}
      </div>
    </div>
  );
}
