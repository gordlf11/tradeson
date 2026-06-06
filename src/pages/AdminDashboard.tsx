import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  Shield, Users, Briefcase, DollarSign, AlertTriangle, CheckCircle,
  XCircle, FileText, TrendingUp, Eye,
  BarChart2, Flag, LogOut, ChevronDown, ChevronUp,
  UserCheck, AlertOctagon, Lock, MessageCircle, ChevronRight, User
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import api from '../services/api';
import {
  logAdminAction,
  updateSupportTicket,
  subscribeToAuditLog,
  subscribeToSupportTickets,
} from '../services/messagingService';
import type { SupportTicket } from '../services/messagingService';
import { RoleSwitcherList } from '../components/RoleSwitcherMenu';

// ── Types ──────────────────────────────────────────────────────────────────

type AdminSection = 'overview' | 'compliance' | 'accounts' | 'audit' | 'metrics' | 'support';

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

// ── Zero-state metrics (populated from API) ────────────────────────────────

const emptyMetrics = {
  users: { homeowners: 0, propertyManagers: 0, realtors: 0, tradespersons: 0, total: 0 },
  mau: { total: 0, homeowners: 0, tradespersons: 0, others: 0 },
  jobs: { open: 0, inProgress: 0, completed: 0 },
  revenue: { gross: 0, net: 0, platformFee: 0, opex: 0 },
  funnel: {
    customer: { visits: 0, signups: 0, onboarded: 0, firstJob: 0 },
    tradesperson: { signups: 0, verified: 0, firstBid: 0, firstJobWon: 0 },
  },
  supplyDemand: [] as { zip: string; trade: string; supply: number; demand: number; ratio: number }[],
  activationRate: 0,
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

function ComplianceSection({ adminEmail }: { adminEmail: string }) {
  const [submissions, setSubmissions] = useState<ComplianceSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    api.listComplianceSubmissions()
      .then((data: any) => {
        const items: ComplianceSubmission[] = Array.isArray(data) ? data : (data?.submissions ?? []);
        setSubmissions(items);
        if (items.length) setExpanded(items[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDecision = async (id: string, decision: ComplianceSubmission['status']) => {
    const note = notes[id] ?? '';
    const sub = submissions.find(s => s.id === id);
    try { await api.updateComplianceDecision(id, decision, note); } catch {}
    try {
      await logAdminAction({
        adminId: adminEmail, adminEmail,
        actionType: decision === 'approved' ? 'Account Approved'
          : decision === 'rejected' ? 'Account Rejected'
          : 'More Docs Requested',
        targetUserId: sub?.id ?? id,
        targetUserEmail: sub?.email ?? '',
        reason: note || (decision === 'approved' ? 'All documents verified and valid.' : ''),
      });
    } catch {}
    setSubmissions(prev => prev.map(s => s.id === id
      ? { ...s, status: decision, adminNote: note }
      : s
    ));
  };

  const pending = submissions.filter(s => s.status === 'pending' || s.status === 'more_docs');
  const resolved = submissions.filter(s => s.status === 'approved' || s.status === 'rejected');

  if (loading) {
    return <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Loading submissions…</p></Card>;
  }

  if (submissions.length === 0) {
    return (
      <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <CheckCircle size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No compliance submissions to review.</p>
      </Card>
    );
  }

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
  const [accounts, setAccounts] = useState<FlaggedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [notified, setNotified] = useState<Record<string, boolean>>({});

  useEffect(() => {
    api.listFlaggedAccounts()
      .then((data: any) => {
        const items: FlaggedAccount[] = Array.isArray(data) ? data : (data?.accounts ?? []);
        setAccounts(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}><p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>Loading flagged accounts…</p></Card>;
  }

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
      {filtered.length === 0 && (
        <Card style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
          <CheckCircle size={28} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>No flagged accounts{search ? ' matching your search' : ''}.</p>
        </Card>
      )}
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

function ResolutionsSection({ preselectedAccount, adminEmail }: { preselectedAccount?: FlaggedAccount; adminEmail: string }) {
  const [accounts, setAccounts] = useState<FlaggedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState(preselectedAccount?.id ?? '');
  const [action, setAction] = useState('');
  const [reason, setReason] = useState('');
  const [suspendUntil, setSuspendUntil] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.listFlaggedAccounts()
      .then((data: any) => {
        const items: FlaggedAccount[] = Array.isArray(data) ? data : (data?.accounts ?? []);
        if (items.length) setAccounts(items);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    if (!selectedAccount || !action || !reason) return;
    const acct = accounts.find(a => a.id === selectedAccount);
    try {
      await api.applyResolution({
        user_id: selectedAccount,
        action_type: action,
        reason,
        ...(suspendUntil ? { suspend_until: suspendUntil } : {}),
      });
    } catch {}
    try {
      await logAdminAction({
        adminId: adminEmail, adminEmail,
        actionType: action === 'warning' ? 'Warning Issued'
          : action === 'suspension' ? 'Temporary Suspension'
          : action === 'deactivation' ? 'Permanent Deactivation'
          : 'Explanation Requested',
        targetUserId: selectedAccount,
        targetUserEmail: acct?.email ?? '',
        reason,
      });
    } catch {}
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
                {accounts.map(a => (
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

// ── Live indicator dot ─────────────────────────────────────────────────────

function LiveDot({ active, error }: { active: boolean; error?: boolean }) {
  if (error) return (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', flexShrink: 0 }} />
  );
  if (!active) return (
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--border)', display: 'inline-block', flexShrink: 0 }} />
  );
  return (
    <span style={{ position: 'relative', width: 8, height: 8, display: 'inline-flex', flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--success)', animation: 'pulse 2s ease-in-out infinite' }} />
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', position: 'relative' }} />
    </span>
  );
}

function LastUpdatedLabel({ updatedAt }: { updatedAt: Date | null }) {
  const [label, setLabel] = useState('—');
  useEffect(() => {
    if (!updatedAt) return;
    const tick = () => {
      const secs = Math.round((Date.now() - updatedAt.getTime()) / 1000);
      setLabel(secs < 5 ? 'just now' : `${secs}s ago`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [updatedAt]);
  return <span style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)' }}>Updated {label}</span>;
}

// ── Section: Audit Log ─────────────────────────────────────────────────────

function AuditLogSection() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [liveActive, setLiveActive] = useState(false);
  const [liveError, setLiveError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuditLog((data, ts) => {
      setLiveActive(true);
      setLiveError(false);
      setUpdatedAt(ts);
      setEntries(data.map(e => ({
        id: e.id,
        adminEmail: e.adminEmail,
        actionType: e.actionType,
        targetUser: e.targetUserEmail,
        targetEmail: e.targetUserEmail,
        reason: e.reason,
        timestamp: e.timestamp.toLocaleString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit',
        }),
      })));
    });
    return unsub;
  }, []);

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LiveDot active={liveActive} error={liveError} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Live</span>
          <LastUpdatedLabel updatedAt={updatedAt} />
        </div>
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
              {entries.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                    No audit log entries yet.
                  </td>
                </tr>
              )}
              {entries.map((entry, i) => (
                <tr
                  key={entry.id}
                  style={{
                    borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
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
  const [m, setM] = useState(emptyMetrics);
  const [liveActive, setLiveActive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetch = () => {
      api.getPlatformMetrics()
        .then((data: any) => {
          if (data) { setM(data); setLiveActive(true); setError(false); setUpdatedAt(new Date()); }
        })
        .catch(() => setError(true));
    };
    fetch();
    // Postgres-backed — poll every 30s (no Firestore mirror yet)
    const id = setInterval(fetch, 30_000);
    return () => clearInterval(id);
  }, []);

  const fmtCurrency = (n: number) => `$${n.toLocaleString()}`;
  const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

      {/* Live status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <LiveDot active={liveActive} error={error} />
        <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
          {error ? 'Connection error' : liveActive ? 'Refreshing every 30s' : 'Loading…'}
        </span>
        <LastUpdatedLabel updatedAt={updatedAt} />
      </div>

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

// ── Section: Support Tickets ───────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  low: 'var(--success)', medium: 'var(--warning)', high: 'var(--danger)', urgent: '#7c3aed',
};
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent'];
const TEAM_OPTIONS     = ['unassigned', 'account', 'technical'];
const STATUS_OPTIONS   = ['open', 'in_progress', 'resolved', 'closed'];

function SupportSection() {
  const [tickets, setTickets]           = useState<SupportTicket[]>([]);
  const [loading, setLoading]           = useState(true);
  const [liveActive, setLiveActive]     = useState(false);
  const [updatedAt, setUpdatedAt]       = useState<Date | null>(null);
  const [expanded, setExpanded]         = useState<string | null>(null);
  const [saving, setSaving]             = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('open');

  useEffect(() => {
    const unsub = subscribeToSupportTickets((data, ts) => {
      setTickets(data);
      setLiveActive(true);
      setUpdatedAt(ts);
      setLoading(false);
    });
    return unsub;
  }, []);

  const updateField = async (ticketId: string, field: keyof Pick<SupportTicket, 'status' | 'priority' | 'team' | 'owner'>, value: string) => {
    setSaving(ticketId);
    try {
      await updateSupportTicket(ticketId, { [field]: value });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, [field]: value } : t));
    } catch {}
    setSaving(null);
  };

  const categoryLabel: Record<string, string> = {
    job_issue: 'Job Issue', job_poster: 'Report User',
    platform: 'Platform Feedback', troubleshooting: 'Troubleshooting', chat: 'Talk with Support',
  };

  const visible = filterStatus === 'all'
    ? tickets
    : tickets.filter(t => t.status === filterStatus);

  const openCount = tickets.filter(t => t.status === 'open').length;

  const selectStyle: React.CSSProperties = {
    padding: '4px 8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
    fontSize: '0.72rem', fontFamily: 'inherit', color: 'var(--text-primary)',
    background: 'var(--bg-surface)', cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          {['open', 'in_progress', 'resolved', 'all'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '6px 14px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '0.75rem', fontWeight: '700',
                border: filterStatus === s ? '2px solid var(--primary)' : '1px solid var(--border)',
                background: filterStatus === s ? 'var(--primary-light)' : 'var(--bg-surface)',
                color: filterStatus === s ? 'var(--primary)' : 'var(--text-secondary)',
              }}
            >
              {s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              {s === 'open' && openCount > 0 && (
                <span style={{ marginLeft: '6px', background: 'var(--danger)', color: 'white', borderRadius: '9999px', padding: '1px 6px', fontSize: '0.65rem' }}>
                  {openCount}
                </span>
              )}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LiveDot active={liveActive} />
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Live</span>
          <LastUpdatedLabel updatedAt={updatedAt} />
        </div>
      </div>

      {loading ? (
        <Card style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>Loading tickets…</p>
        </Card>
      ) : visible.length === 0 ? (
        <Card style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
          <MessageCircle size={32} color="var(--text-tertiary)" style={{ margin: '0 auto var(--space-3)' }} />
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.85rem' }}>No {filterStatus !== 'all' ? filterStatus.replace('_', ' ') : ''} tickets.</p>
        </Card>
      ) : (
        visible.map(ticket => (
          <Card key={ticket.id} style={{ padding: 'var(--space-4)' }}>
            {/* Header row */}
            <div
              style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', cursor: 'pointer' }}
              onClick={() => setExpanded(expanded === ticket.id ? null : ticket.id)}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px',
                    borderRadius: '9999px', background: PRIORITY_COLORS[ticket.priority],
                    color: 'white', textTransform: 'uppercase',
                  }}>
                    {ticket.priority}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', background: 'var(--bg-base)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: '600' }}>
                    {categoryLabel[ticket.category] ?? ticket.category}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: ticket.status === 'open' ? 'var(--warning)' : ticket.status === 'resolved' ? 'var(--success)' : 'var(--text-secondary)', fontWeight: '700', textTransform: 'capitalize' }}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ticket.subject}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {ticket.userName || ticket.userEmail} · {ticket.userRole} · {ticket.createdAt.toLocaleDateString()}
                </div>
              </div>
              <div style={{ color: 'var(--text-tertiary)', flexShrink: 0, marginTop: '2px' }}>
                {expanded === ticket.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </div>
            </div>

            {/* Expanded detail */}
            {expanded === ticket.id && (
              <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                {/* Description */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: 'var(--space-4)', background: 'var(--bg-base)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
                  {ticket.description}
                </div>
                {ticket.relatedJobId && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                    Related Job: <strong>{ticket.relatedJobId}</strong>
                  </div>
                )}

                {/* Admin controls */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Priority</label>
                    <select value={ticket.priority} onChange={e => updateField(ticket.id, 'priority', e.target.value)} style={selectStyle} disabled={saving === ticket.id}>
                      {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Team</label>
                    <select value={ticket.team} onChange={e => updateField(ticket.id, 'team', e.target.value)} style={selectStyle} disabled={saving === ticket.id}>
                      {TEAM_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Status</label>
                    <select value={ticket.status} onChange={e => updateField(ticket.id, 'status', e.target.value)} style={selectStyle} disabled={saving === ticket.id}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace('_', ' ').charAt(0).toUpperCase() + s.replace('_', ' ').slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Owner</label>
                    <input
                      type="text"
                      defaultValue={ticket.owner === 'unassigned' ? '' : ticket.owner}
                      placeholder="admin@tradeson.com"
                      onBlur={e => {
                        const val = e.target.value.trim() || 'unassigned';
                        if (val !== ticket.owner) updateField(ticket.id, 'owner', val);
                      }}
                      style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}
                      disabled={saving === ticket.id}
                    />
                  </div>
                </div>

                {saving === ticket.id && (
                  <p style={{ fontSize: '0.75rem', color: 'var(--primary)', margin: 0 }}>Saving…</p>
                )}
              </div>
            )}
          </Card>
        ))
      )}
    </div>
  );
}

// ── Main Admin Dashboard ───────────────────────────────────────────────────

const LARRY_ITEMS = [
  { priority: '🔴', label: 'Wire data layer — JobBoard, Dashboards, Quote flow, JobCreation (all on mock data)' },
  { priority: '🔴', label: 'FCM notifications — new quote, accepted bid, new message, schedule change, compliance' },
  { priority: '🟠', label: 'Firebase Storage security rules (deploy --only storage)' },
  { priority: '🟠', label: 'Postgres indexes on jobs, quotes, reviews tables' },
  { priority: '🟠', label: 'Payment history — wire GET /api/v1/payments/me into CustomerDashboard' },
  { priority: '🟠', label: 'Item 6 deploy — redeploy tradeson-api + create nightly Cloud Scheduler job' },
  { priority: '🟡', label: 'BigQuery pipelines — Firestore→BQ Extension + Datastream PG→BQ' },
  { priority: '🟡', label: 'Firestore query pagination — limit(20) + Load More on JobBoard + dashboards' },
];

function LarrySprint() {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('larryBannerDismissed') === '1');
  if (dismissed) return null;
  return (
    <div style={{
      margin: 'var(--space-4)', background: 'rgba(255,200,0,0.08)',
      border: '1px solid rgba(255,200,0,0.35)', borderRadius: 'var(--radius-md)',
      padding: 'var(--space-4)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
          ⚡ Larry — Open launch items
        </div>
        <button
          onClick={() => { sessionStorage.setItem('larryBannerDismissed', '1'); setDismissed(true); }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontFamily: 'inherit', fontSize: '1rem', lineHeight: 1, padding: '0 0 0 8px' }}
        >✕</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {LARRY_ITEMS.map((item, i) => (
          <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
            <span style={{ flexShrink: 0 }}>{item.priority}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'var(--space-3)', fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
        Full detail + commands in CLAUDE.md. AI Job Analysis has been removed as a feature.
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [flaggingAccount, setFlaggingAccount] = useState<FlaggedAccount | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const adminEmail = localStorage.getItem('userEmail') || 'admin@tradeson.com';

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [isUserMenuOpen]);

  const [pendingCompliance, setPendingCompliance] = useState(0);
  const [highSeverityFlags, setHighSeverityFlags] = useState(0);
  const [overviewMetrics, setOverviewMetrics] = useState(emptyMetrics);

  useEffect(() => {
    api.listComplianceSubmissions()
      .then((data: any) => {
        const items = Array.isArray(data) ? data : (data?.submissions ?? []);
        setPendingCompliance(items.filter((s: any) => s.status === 'pending' || s.status === 'more_docs').length);
      })
      .catch(() => {});

    api.listFlaggedAccounts()
      .then((data: any) => {
        const items = Array.isArray(data) ? data : (data?.accounts ?? []);
        setHighSeverityFlags(items.filter((a: any) => a.severity === 'high').length);
      })
      .catch(() => {});

    api.getPlatformMetrics()
      .then((data: any) => { if (data) setOverviewMetrics(data); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    // signOut() of Firebase Auth is required — clearing localStorage alone
    // leaves the persisted Firebase session intact and the user stays logged in.
    try { await signOut(auth); } finally {
      localStorage.clear();
      navigate('/login');
    }
  };

  const sections: { key: AdminSection; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: <BarChart2 size={15} /> },
    { key: 'compliance', label: 'Compliance', icon: <Shield size={15} />, badge: pendingCompliance },
    { key: 'accounts', label: 'Accounts', icon: <AlertTriangle size={15} />, badge: highSeverityFlags },
    { key: 'support', label: 'Support', icon: <MessageCircle size={15} /> },
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
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setIsUserMenuOpen((v) => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                padding: '4px 8px 4px 4px', borderRadius: '999px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
              aria-label="Open account menu"
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--primary)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={14} color="white" />
              </div>
              <ChevronDown size={14} color="rgba(255,255,255,0.7)" />
            </button>

            {isUserMenuOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: '#0c2342', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
                minWidth: 220, zIndex: 200, padding: 'var(--space-3)',
              }}>
                <div style={{
                  padding: '4px 8px 10px', borderBottom: '1px solid rgba(255,255,255,0.12)',
                  marginBottom: 8,
                }}>
                  <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 600 }}>Admin</div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.72rem' }}>{adminEmail}</div>
                </div>
                <RoleSwitcherList variant="dark" onAfterSwitch={() => setIsUserMenuOpen(false)} />
                <div style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '8px 0' }} />
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', textAlign: 'left',
                    fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 500,
                    color: '#ff6b6b',
                  }}
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
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

      {/* Larry dev-priority banner — visible to admin only, dismissible */}
      <LarrySprint />

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
                { label: 'Total Users', value: overviewMetrics.users.total.toLocaleString(), icon: <Users size={18} />, color: 'var(--primary)' },
                { label: 'Active Jobs', value: (overviewMetrics.jobs.open + overviewMetrics.jobs.inProgress).toLocaleString(), icon: <Briefcase size={18} />, color: 'var(--navy)' },
                { label: 'YTD Revenue', value: overviewMetrics.revenue.gross > 0 ? `$${(overviewMetrics.revenue.gross / 1000).toFixed(0)}K` : '$0', icon: <DollarSign size={18} />, color: 'var(--success)' },
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
                          {s.key === 'support' && 'View and triage user support tickets'}
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
            <ComplianceSection adminEmail={adminEmail} />
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
            <ResolutionsSection preselectedAccount={flaggingAccount} adminEmail={adminEmail} />
          </>
        )}
        {activeSection === 'support' && (
          <>
            <h2 style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 var(--space-4)' }}>
              Support Tickets
            </h2>
            <SupportSection />
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
