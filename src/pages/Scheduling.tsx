import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, MapPin, CheckCircle2,
  ChevronLeft, ChevronRight, Navigation
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import TopNav from '../components/TopNav';

interface TimeSlot {
  time: string;
}

const DATES = ['Mon, Mar 18', 'Tue, Mar 19', 'Wed, Mar 20', 'Thu, Mar 21', 'Fri, Mar 22', 'Sat, Mar 23', 'Sun, Mar 24'];
const TIMES: TimeSlot[] = [
  { time: '8:00 AM' }, { time: '8:30 AM' },
  { time: '9:00 AM' }, { time: '9:30 AM' },
  { time: '10:00 AM' }, { time: '10:30 AM' },
  { time: '11:00 AM' }, { time: '11:30 AM' },
  { time: '12:00 PM' }, { time: '12:30 PM' },
  { time: '1:00 PM' }, { time: '1:30 PM' },
  { time: '2:00 PM' }, { time: '2:30 PM' },
  { time: '3:00 PM' }, { time: '3:30 PM' },
  { time: '4:00 PM' }, { time: '4:30 PM' },
  { time: '5:00 PM' },
];

export default function Scheduling() {
  const navigate = useNavigate();
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [step, setStep] = useState<'select' | 'confirm' | 'route'>('select');
  const [dayIndex, setDayIndex] = useState(0);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false]);

  const selectedDate = DATES[dayIndex];

  const handleSlotToggle = (slotKey: string) => {
    if (selectedSlots.includes(slotKey)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slotKey));
    } else {
      setSelectedSlots([...selectedSlots, slotKey]);
    }
  };

  const handleConfirm = () => {
    setStep('confirm');
    setTimeout(() => setStep('route'), 2000);
  };

  const prevDay = () => setDayIndex(i => Math.max(0, i - 1));
  const nextDay = () => setDayIndex(i => Math.min(DATES.length - 1, i + 1));

  const checklistItems = [
    'Clear access to work area',
    'Turn off water main if leaking',
    'Move valuables from under sink',
    'Have payment method ready',
  ];

  return (
    <>
      <TopNav title="Schedule Service" />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '90px' }}>
        <div style={{ padding: 'var(--space-4)' }}>

          {/* Step 1: Time Selection */}
          {step === 'select' && (
            <>
              {/* Job Summary Card */}
              <Card style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700' }}>Kitchen Sink Leak Repair</h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      Bob's Plumbing Services · 2.4 miles away
                    </p>
                  </div>
                  <Badge variant="warning">Moderate</Badge>
                </div>
                <div style={{
                  marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)',
                  background: 'var(--primary-light)', borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '700',
                }}>
                  Accepted Quote: $195
                </div>
              </Card>

              {/* Available Times card */}
              <Card style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
                {/* Section title */}
                <h3 style={{ margin: '0 0 var(--space-4) 0', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Available Times
                </h3>

                {/* Day carousel */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <button
                    type="button"
                    onClick={prevDay}
                    disabled={dayIndex === 0}
                    style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)',
                      width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: dayIndex === 0 ? 'not-allowed' : 'pointer',
                      color: dayIndex === 0 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      flexShrink: 0,
                    }}
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {selectedDate}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {dayIndex + 1} of {DATES.length}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={nextDay}
                    disabled={dayIndex === DATES.length - 1}
                    style={{
                      background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)',
                      width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: dayIndex === DATES.length - 1 ? 'not-allowed' : 'pointer',
                      color: dayIndex === DATES.length - 1 ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      flexShrink: 0,
                    }}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>

                {/* Dot indicators */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: 'var(--space-4)' }}>
                  {DATES.map((_, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setDayIndex(i)}
                      style={{
                        width: i === dayIndex ? '20px' : '8px', height: '8px',
                        borderRadius: '4px', border: 'none', cursor: 'pointer',
                        background: i === dayIndex ? 'var(--primary)' : 'var(--border)',
                        transition: 'all 0.2s ease', padding: 0,
                      }}
                    />
                  ))}
                </div>

                {/* Time slots grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 'var(--space-2)',
                }}>
                  {TIMES.map(slot => {
                    const slotKey = `${selectedDate}-${slot.time}`;
                    const isSelected = selectedSlots.includes(slotKey);
                    return (
                      <button
                        type="button"
                        key={slotKey}
                        onClick={() => handleSlotToggle(slotKey)}
                        style={{
                          padding: 'var(--space-3)',
                          background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                          border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: 'var(--radius-md)',
                          color: isSelected ? 'white' : 'var(--text-primary)',
                          fontSize: '0.82rem', fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          fontFamily: 'inherit',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        }}
                      >
                        <Clock size={13} />
                        {slot.time}
                      </button>
                    );
                  })}
                </div>

                {selectedSlots.length > 0 && (
                  <div style={{
                    marginTop: 'var(--space-4)', padding: 'var(--space-3)',
                    background: 'var(--primary-light)', border: '1px solid var(--primary)',
                    borderRadius: 'var(--radius-md)', fontSize: '0.85rem',
                  }}>
                    <strong style={{ color: 'var(--primary)' }}>{selectedSlots.length} time slot{selectedSlots.length !== 1 ? 's' : ''} selected</strong>
                    <div style={{ marginTop: '4px', color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                      The tradesperson will confirm the best time from your selections
                    </div>
                  </div>
                )}
              </Card>

              {/* Pre-Service Checklist */}
              <Card style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
                <h3 style={{ margin: '0 0 var(--space-3) 0', fontSize: '1rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                  Pre-Service Checklist
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {checklistItems.map((item, index) => (
                    <label key={index} style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-primary)',
                    }}>
                      <input
                        type="checkbox"
                        checked={checklist[index]}
                        onChange={() => setChecklist(prev => prev.map((v, i) => i === index ? !v : v))}
                        style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', flexShrink: 0, cursor: 'pointer' }}
                      />
                      <span style={{ flex: 1 }}>{item}</span>
                    </label>
                  ))}
                </div>
              </Card>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                disabled={selectedSlots.length === 0}
                onClick={handleConfirm}
              >
                Submit Time Preferences ({selectedSlots.length} selected)
              </Button>
            </>
          )}

          {/* Step 2: Confirmation */}
          {step === 'confirm' && (
            <Card style={{ padding: '3rem 2rem', textAlign: 'center' }}>
              <div className="loader" style={{ width: '60px', height: '60px', margin: '0 auto var(--space-4)' }} />
              <h2>Confirming with Tradesperson</h2>
              <p style={{ color: 'var(--text-secondary)' }}>
                Bob's Plumbing is reviewing your time preferences...
              </p>
            </Card>
          )}

          {/* Step 3: Confirmed */}
          {step === 'route' && (
            <>
              <Card style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                  <div style={{
                    width: '48px', height: '48px', background: 'var(--success)',
                    borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <CheckCircle2 size={28} color="white" />
                  </div>
                  <div>
                    <h3 style={{ margin: 0 }}>Service Confirmed!</h3>
                    <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      Tuesday, March 19 at 2:00 PM
                    </p>
                  </div>
                </div>
                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Service Provider</span>
                    <Badge variant="success">Verified</Badge>
                  </div>
                  <div style={{ fontWeight: 600 }}>Bob's Plumbing Services</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    License #PL-2024-1234 · 4.8★ (127 reviews)
                  </div>
                </div>
              </Card>

              <Card style={{ marginBottom: 'var(--space-4)', padding: 'var(--space-4)' }}>
                <h3 style={{ margin: '0 0 var(--space-3) 0' }}>Service Route</h3>
                <div style={{
                  height: '240px', background: 'var(--bg-base)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', position: 'relative',
                }}>
                  <MapPin size={48} color="var(--primary)" style={{ marginBottom: 'var(--space-2)' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>123 Main St, Springfield</p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '4px' }}>
                    Estimated arrival: 1:45 PM – 2:15 PM
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                  <Button variant="outline" size="md" fullWidth icon={<Navigation size={18} />}>Get Directions</Button>
                  <Button variant="primary" size="md" fullWidth onClick={() => navigate('/job-execution')}>Track Live</Button>
                </div>
              </Card>

              <Card style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Questions about your service?</p>
                    <p style={{ margin: '4px 0 0', fontWeight: 600 }}>Contact Bob: (555) 123-4567</p>
                  </div>
                  <Button variant="ghost" size="sm">Call Now</Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
