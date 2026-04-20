import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, MapPin, CheckCircle2, AlertTriangle,
  PlayCircle, DollarSign, Package, Calendar,
  Bell, Camera, XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import TopNav from '../components/TopNav';
import { useAuth } from '../contexts/AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────────────

function isTradeRole(role: string) {
  return ['licensed-trade', 'non-licensed-trade', 'licensed_tradesperson', 'unlicensed_tradesperson'].includes(role);
}

// Mock appointment: tomorrow at 2:00 PM
function getMockAppointment(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(14, 0, 0, 0);
  return d;
}

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      hours: Math.floor(diff / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [countdown, setCountdown] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setCountdown(calc()), 1000);
    return () => clearInterval(id);
  });
  return countdown;
}

const MATERIALS_BY_TRADE: Record<string, string[]> = {
  Plumbing:         ["Pipe wrench", "Plumber's tape (Teflon)", "Replacement P-trap & washers", "Drain snake / auger", "Bucket & rags", "Adjustable pliers"],
  Electrical:       ["Voltage tester (non-contact)", "Wire strippers", "Electrical tape", "Wire nuts (assorted)", "Screwdrivers (flathead + Phillips)", "Multimeter"],
  HVAC:             ["Refrigerant manifold gauges", "Coil cleaner", "Replacement air filters", "Fin comb", "Duct tape / mastic sealant", "Thermometer"],
  'General Repairs':["Hammer", "Screwdrivers (set)", "Measuring tape", "Utility knife", "Level", "Patching compound + spackle"],
  Cleaning:         ["All-purpose cleaner", "Microfiber cloths (×6)", "Mop + bucket", "Vacuum", "Scrub brushes", "Gloves"],
  Landscaping:      ["Pruning shears", "Rake", "Leaf blower", "Garden gloves", "Lawn bags", "Edger"],
  'Snow Removal':   ["Snow shovel", "Ice melt / salt", "Push broom", "Snow blower (if applicable)", "Waterproof gloves", "Safety goggles"],
};

const POSTER_CHECKLIST = [
  "Clear access path to the work area",
  "Remove or secure valuables nearby",
  "Pets secured away from work zone",
  "Know the location of main shutoffs (water / gas / electric)",
  "Payment method ready",
];

// ── Countdown display ─────────────────────────────────────────────────────────

function CountdownDisplay({ hours, minutes, seconds, label }: { hours: number; minutes: number; seconds: number; label: string }) {
  return (
    <Card style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
      <p style={{ margin: '0 0 var(--space-3)', fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
        {[{ value: hours, label: 'HRS' }, { value: minutes, label: 'MIN' }, { value: seconds, label: 'SEC' }].map(({ value, label: l }) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2.2rem', fontWeight: '800', color: 'var(--primary)',
              minWidth: '60px', background: 'var(--primary-light)',
              borderRadius: 'var(--radius-md)', padding: '8px 10px', lineHeight: 1,
            }}>
              {String(value).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '0.62rem', fontWeight: '700', color: 'var(--text-tertiary)', marginTop: '4px', letterSpacing: '0.08em' }}>
              {l}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Job Poster view ───────────────────────────────────────────────────────────

type PosterState = 'waiting' | 'job_started' | 'adjustment_pending' | 'adjustment_accepted' | 'adjustment_denied' | 'cancelled';

const MOCK_ADJUSTMENT = { originalPrice: 195, newPrice: 240, delta: 45, reason: 'Found additional pipe corrosion behind the wall — replacement coupling and extra sealant required.' };

function JobPosterView() {
  const navigate = useNavigate();
  const appointment = getMockAppointment();
  const countdown = useCountdown(appointment);
  const [checklist, setChecklist] = useState<boolean[]>(new Array(POSTER_CHECKLIST.length).fill(false));
  const [state, setState] = useState<PosterState>('waiting');
  const [showCancel, setShowCancel] = useState(false);

  if (state === 'cancelled') {
    return (
      <>
        <TopNav title="Day of Service" />
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <Card style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <XCircle size={56} color="var(--danger)" style={{ marginBottom: 'var(--space-3)' }} />
            <h2 style={{ margin: '0 0 var(--space-2)' }}>Appointment Cancelled</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 var(--space-4)' }}>
              Your appointment has been cancelled. The tradesperson has been notified.
            </p>
            <Button variant="primary" fullWidth onClick={() => navigate('/job-board')}>Back to Jobs</Button>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <TopNav title="Day of Service" />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '100px' }}>
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Job started banner */}
          {(state === 'job_started' || state === 'adjustment_pending' || state === 'adjustment_accepted' || state === 'adjustment_denied') && (
            <div style={{
              background: 'var(--success)', borderRadius: 'var(--radius-md)',
              padding: 'var(--space-3) var(--space-4)',
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'white',
            }}>
              <Bell size={20} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Your tradesperson has arrived</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Bob's Plumbing has flagged the job as started</div>
              </div>
            </div>
          )}

          {/* Price adjustment card */}
          {state === 'adjustment_pending' && (
            <Card style={{ border: `2px solid var(--warning)`, padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <AlertTriangle size={20} color="var(--warning)" />
                <h3 style={{ margin: 0 }}>Price Adjustment Requested</h3>
              </div>
              <p style={{ margin: '0 0 var(--space-3)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {MOCK_ADJUSTMENT.reason}
              </p>
              <div style={{
                height: '72px', background: 'var(--bg-base)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 'var(--space-3)', color: 'var(--text-tertiary)', fontSize: '0.8rem', gap: '6px',
              }}>
                <Camera size={15} /> Photo attached
              </div>
              <div style={{ background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Original quote</span>
                  <span>${MOCK_ADJUSTMENT.originalPrice}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--warning)' }}>
                  <span>Adjustment</span>
                  <span>+${MOCK_ADJUSTMENT.delta}</span>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: '700' }}>
                  <span>New Total</span>
                  <span>${MOCK_ADJUSTMENT.newPrice}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button variant="primary" fullWidth onClick={() => setState('adjustment_accepted')}>
                  Approve (+${MOCK_ADJUSTMENT.delta})
                </Button>
                <Button variant="outline" fullWidth onClick={() => setState('adjustment_denied')}>Deny</Button>
              </div>
            </Card>
          )}

          {state === 'adjustment_accepted' && (
            <Card style={{ border: `2px solid var(--success)`, padding: 'var(--space-4)', textAlign: 'center' }}>
              <CheckCircle2 size={36} color="var(--success)" style={{ marginBottom: 'var(--space-2)' }} />
              <h3 style={{ margin: '0 0 4px' }}>Adjustment Approved</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                New total: ${MOCK_ADJUSTMENT.newPrice} · Tradesperson has been notified
              </p>
            </Card>
          )}

          {state === 'adjustment_denied' && (
            <Card style={{ border: `1px solid var(--border)`, padding: 'var(--space-4)', textAlign: 'center' }}>
              <XCircle size={36} color="var(--text-tertiary)" style={{ marginBottom: 'var(--space-2)' }} />
              <h3 style={{ margin: '0 0 4px' }}>Adjustment Declined</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                The tradesperson has been notified and will decide how to proceed
              </p>
            </Card>
          )}

          {/* Appointment info */}
          <Card style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>Kitchen Sink Leak Repair</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Bob's Plumbing Services</p>
              </div>
              <Badge variant="success">Confirmed</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <Calendar size={14} />
              {appointment.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at 2:00 PM
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <MapPin size={14} />
              123 Main St, Springfield
            </div>
          </Card>

          {/* Countdown */}
          {state === 'waiting' && (
            <CountdownDisplay {...countdown} label="Appointment starts in" />
          )}

          {/* Pre-service checklist */}
          <Card style={{ padding: 'var(--space-4)' }}>
            <h3 style={{ margin: '0 0 var(--space-3)', fontSize: '1rem' }}>Pre-Service Checklist</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {POSTER_CHECKLIST.map((item, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checklist[i]}
                    onChange={() => setChecklist(prev => prev.map((v, idx) => idx === i ? !v : v))}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span style={{
                    flex: 1,
                    textDecoration: checklist[i] ? 'line-through' : 'none',
                    color: checklist[i] ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  }}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* Reschedule / Cancel */}
          {state === 'waiting' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <Button variant="outline" fullWidth icon={<Calendar size={18} />} onClick={() => navigate('/scheduling')}>
                Reschedule Appointment
              </Button>
              <button
                type="button"
                onClick={() => setShowCancel(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--danger)', fontSize: '0.875rem', fontWeight: '600',
                  padding: 'var(--space-3)', fontFamily: 'inherit',
                }}
              >
                Cancel Appointment
              </button>
            </div>
          )}

          {/* Demo controls — remove before production */}
          {state === 'waiting' && (
            <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
              <p style={{ margin: '0 0 var(--space-2)', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demo</p>
              <Button variant="outline" size="sm" onClick={() => setState('job_started')}>Simulate: Job started</Button>
            </div>
          )}
          {state === 'job_started' && (
            <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
              <p style={{ margin: '0 0 var(--space-2)', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Demo</p>
              <Button variant="outline" size="sm" onClick={() => setState('adjustment_pending')}>Simulate: Price adjustment received</Button>
            </div>
          )}
        </div>

        {/* Cancel confirmation bottom sheet */}
        {showCancel && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,28,60,0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 300, padding: 'var(--space-4)',
          }}>
            <Card style={{ width: '100%', maxWidth: '428px', padding: 'var(--space-6)' }}>
              <h3 style={{ margin: '0 0 var(--space-2)' }}>Cancel Appointment?</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 var(--space-4)' }}>
                This will notify Bob's Plumbing Services. Cancellations within 2 hours may be subject to a fee.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button variant="outline" fullWidth onClick={() => setShowCancel(false)}>Keep Appointment</Button>
                <Button
                  variant="primary"
                  fullWidth
                  style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => { setShowCancel(false); setState('cancelled'); }}
                >
                  Yes, Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </>
  );
}

// ── Tradesperson view ─────────────────────────────────────────────────────────

type TradeState = 'waiting' | 'started' | 'adjusting' | 'adjustment_submitted' | 'adjustment_accepted' | 'adjustment_denied';

function TradespersonView() {
  const navigate = useNavigate();
  const appointment = getMockAppointment();
  const countdown = useCountdown(appointment);
  const tradeCategory = 'Plumbing'; // will come from job data once data layer is wired
  const materials = MATERIALS_BY_TRADE[tradeCategory] ?? MATERIALS_BY_TRADE['General Repairs'];
  const [checklist, setChecklist] = useState<boolean[]>(new Array(materials.length).fill(false));
  const [state, setState] = useState<TradeState>('waiting');
  const [adjustedPrice, setAdjustedPrice] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const originalPrice = 195;

  return (
    <>
      <TopNav title="Day of Job" />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '100px' }}>
        <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

          {/* Status banners */}
          {state === 'adjustment_accepted' && (
            <div style={{ background: 'var(--success)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'white' }}>
              <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Price adjustment approved</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>New total: ${adjustedPrice} · Proceed with the job</div>
              </div>
            </div>
          )}
          {state === 'adjustment_denied' && (
            <div style={{ background: 'var(--warning)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', color: 'white' }}>
              <AlertTriangle size={20} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Adjustment declined by customer</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>Choose how to proceed below</div>
              </div>
            </div>
          )}

          {/* Appointment info */}
          <Card style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>Kitchen Sink Leak Repair</h3>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Sarah Johnson</p>
              </div>
              <Badge variant={state === 'waiting' ? 'warning' : 'success'}>{state === 'waiting' ? 'Upcoming' : 'In Progress'}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <Calendar size={14} />
              {appointment.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at 2:00 PM
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              <MapPin size={14} />
              123 Main St, Springfield
            </div>
            <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700' }}>
              <Clock size={13} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
              Quoted: ${state === 'adjustment_accepted' && adjustedPrice ? adjustedPrice : originalPrice}
            </div>
          </Card>

          {/* Countdown */}
          {state === 'waiting' && (
            <CountdownDisplay {...countdown} label="Job starts in" />
          )}

          {/* Materials checklist */}
          <Card style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
              <Package size={18} color="var(--primary)" />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Materials Checklist</h3>
              <Badge variant="neutral">{tradeCategory}</Badge>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {materials.map((item, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: '0.875rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={checklist[i]}
                    onChange={() => setChecklist(prev => prev.map((v, idx) => idx === i ? !v : v))}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <span style={{
                    flex: 1,
                    textDecoration: checklist[i] ? 'line-through' : 'none',
                    color: checklist[i] ? 'var(--text-tertiary)' : 'var(--text-primary)',
                  }}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* Flag as started */}
          {state === 'waiting' && (
            <Button variant="primary" size="lg" fullWidth icon={<PlayCircle size={22} />} onClick={() => setState('started')}>
              Flag Job as Started
            </Button>
          )}

          {/* Price adjustment section */}
          {(state === 'started' || state === 'adjusting') && (
            <Card style={{ padding: 'var(--space-4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <DollarSign size={18} color="var(--primary)" />
                <h3 style={{ margin: 0, fontSize: '1rem' }}>Price Adjustment</h3>
              </div>

              {state === 'started' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Current quote</span>
                    <span style={{ fontWeight: '700' }}>${originalPrice}</span>
                  </div>
                  <p style={{ margin: '0 0 var(--space-3)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    If the scope has changed, request an adjustment. The customer will be notified.
                  </p>
                  <Button variant="outline" fullWidth icon={<DollarSign size={17} />} onClick={() => setState('adjusting')}>
                    Request Price Adjustment
                  </Button>
                </>
              )}

              {state === 'adjusting' && (
                <>
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      New Total ($)
                    </label>
                    <input
                      type="number"
                      value={adjustedPrice}
                      onChange={e => setAdjustedPrice(e.target.value)}
                      placeholder={`e.g. ${originalPrice + 45}`}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', fontSize: '1rem', fontFamily: 'inherit',
                        background: 'var(--bg-surface)', color: 'var(--text-primary)', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Reason / Summary
                    </label>
                    <textarea
                      value={adjustReason}
                      onChange={e => setAdjustReason(e.target.value)}
                      placeholder="Describe what changed and why..."
                      rows={3}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border)', fontSize: '0.875rem', fontFamily: 'inherit',
                        background: 'var(--bg-surface)', color: 'var(--text-primary)', resize: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    style={{
                      width: '100%', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                      border: '1px dashed var(--border)', background: 'var(--bg-base)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)',
                      fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer',
                      marginBottom: 'var(--space-3)', fontFamily: 'inherit',
                    }}
                  >
                    <Camera size={16} /> Attach Photo
                  </button>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <Button variant="outline" fullWidth onClick={() => setState('started')}>Back</Button>
                    <Button
                      variant="primary"
                      fullWidth
                      disabled={!adjustedPrice || !adjustReason}
                      onClick={() => setState('adjustment_submitted')}
                    >
                      Send to Customer
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Waiting for customer response */}
          {state === 'adjustment_submitted' && (
            <Card style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
              <div className="loader" style={{ width: '44px', height: '44px', margin: '0 auto var(--space-3)' }} />
              <h3 style={{ margin: '0 0 6px' }}>Awaiting Customer Response</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0 0 var(--space-4)' }}>
                Customer will be notified via push notification.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <Button variant="outline" size="sm" fullWidth onClick={() => setState('adjustment_accepted')}>Demo: Accepted</Button>
                <Button variant="outline" size="sm" fullWidth onClick={() => setState('adjustment_denied')}>Demo: Denied</Button>
              </div>
            </Card>
          )}

          {/* Denied — continue or cancel */}
          {state === 'adjustment_denied' && (
            <Card style={{ padding: 'var(--space-4)' }}>
              <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '1rem' }}>How would you like to proceed?</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: '0 0 var(--space-4)' }}>
                The customer declined the adjustment. You can continue at the original quote of ${originalPrice}, or cancel the job.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <Button variant="primary" fullWidth onClick={() => navigate('/completion')}>
                  Continue at ${originalPrice}
                </Button>
                <button
                  type="button"
                  onClick={() => navigate('/job-board')}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--danger)', fontSize: '0.875rem', fontWeight: '600',
                    padding: 'var(--space-3)', fontFamily: 'inherit',
                  }}
                >
                  Cancel the Job
                </button>
              </div>
            </Card>
          )}

          {/* Complete job (accepted or no adjustment) */}
          {(state === 'adjustment_accepted' || state === 'started') && (
            <Button variant="primary" size="lg" fullWidth onClick={() => navigate('/completion')}>
              {state === 'started' ? 'Complete Job' : `Complete Job ($${adjustedPrice || originalPrice})`}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function JobDayOf() {
  const { userProfile } = useAuth();
  const role = userProfile?.role ?? localStorage.getItem('userRole') ?? 'homeowner';
  return isTradeRole(role) ? <TradespersonView /> : <JobPosterView />;
}
