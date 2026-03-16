import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, MapPin, CheckCircle2, 
  ChevronLeft, ChevronRight, Navigation
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
}

const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const dates = ['Mon, Mar 18', 'Tue, Mar 19', 'Wed, Mar 20', 'Thu, Mar 21', 'Fri, Mar 22'];
  const times = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM'];
  
  dates.forEach(date => {
    times.forEach(time => {
      slots.push({
        date,
        time,
        available: Math.random() > 0.3 // 70% availability
      });
    });
  });
  
  return slots;
};

export default function Scheduling() {
  const navigate = useNavigate();
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [step, setStep] = useState<'select' | 'confirm' | 'route'>('select');
  const [timeSlots] = useState(generateTimeSlots());
  const [selectedDate, setSelectedDate] = useState('Mon, Mar 18');

  const handleSlotToggle = (slotKey: string) => {
    if (selectedSlots.includes(slotKey)) {
      setSelectedSlots(selectedSlots.filter(s => s !== slotKey));
    } else if (selectedSlots.length < 3) {
      setSelectedSlots([...selectedSlots, slotKey]);
    }
  };

  const handleConfirm = () => {
    setStep('confirm');
    // Simulate tradesperson selecting time
    setTimeout(() => {
      setStep('route');
    }, 2000);
  };

  const filteredSlots = timeSlots.filter(slot => slot.date === selectedDate);
  const dates = [...new Set(timeSlots.map(slot => slot.date))];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Schedule Service</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          {step === 'select' && 'Select your preferred time slots (up to 3)'}
          {step === 'confirm' && 'Confirming with tradesperson...'}
          {step === 'route' && 'Service scheduled - View route'}
        </p>
      </div>

      {/* Step 1: Time Selection */}
      {step === 'select' && (
        <>
          {/* Job Summary Card */}
          <Card className="mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Kitchen Sink Leak Repair</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Bob's Plumbing Services • 2.4 miles away
                </p>
              </div>
              <Badge variant="warning">MODERATE</Badge>
            </div>
            <div style={{
              marginTop: 'var(--space-3)',
              padding: 'var(--space-2)',
              background: 'var(--bg-base)',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.875rem',
              color: 'var(--primary)'
            }}>
              Quoted Price: $150 - $250
            </div>
          </Card>

          {/* Date Selector */}
          <Card elevated className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 style={{ margin: 0 }}>Available Times</h3>
              <div className="flex items-center gap-2">
                <ChevronLeft size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
                <span style={{ fontSize: '0.875rem', minWidth: '100px', textAlign: 'center' }}>
                  This Week
                </span>
                <ChevronRight size={20} style={{ cursor: 'pointer', color: 'var(--text-secondary)' }} />
              </div>
            </div>

            {/* Date Tabs */}
            <div className="flex gap-2 mb-4" style={{ overflowX: 'auto' }}>
              {dates.map(date => (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  style={{
                    padding: '8px 16px',
                    background: selectedDate === date ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                    border: 'none',
                    borderRadius: 'var(--radius-full)',
                    color: selectedDate === date ? 'white' : 'var(--text-primary)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {date}
                </button>
              ))}
            </div>

            {/* Time Slots Grid */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: 'var(--space-2)'
            }}>
              {filteredSlots.map(slot => {
                const slotKey = `${slot.date}-${slot.time}`;
                const isSelected = selectedSlots.includes(slotKey);
                
                return (
                  <button
                    key={slotKey}
                    onClick={() => slot.available && handleSlotToggle(slotKey)}
                    disabled={!slot.available}
                    style={{
                      padding: 'var(--space-3)',
                      background: isSelected ? 'var(--primary)' : 
                                 !slot.available ? 'var(--bg-base)' : 'var(--bg-surface-elevated)',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius-sm)',
                      color: isSelected ? 'white' : 
                             !slot.available ? 'var(--text-tertiary)' : 'var(--text-primary)',
                      fontSize: '0.875rem',
                      cursor: slot.available ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s ease',
                      opacity: slot.available ? 1 : 0.5
                    }}
                  >
                    <Clock size={14} style={{ display: 'block', margin: '0 auto 4px' }} />
                    {slot.time}
                  </button>
                );
              })}
            </div>

            {selectedSlots.length > 0 && (
              <div style={{
                marginTop: 'var(--space-4)',
                padding: 'var(--space-3)',
                background: 'var(--primary-light)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem'
              }}>
                <strong>Selected times:</strong> {selectedSlots.length}/3
                <div style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
                  The tradesperson will confirm the best time from your selections
                </div>
              </div>
            )}
          </Card>

          {/* Pre-Job Checklist */}
          <Card className="mb-4">
            <h3 style={{ margin: '0 0 var(--space-3) 0' }}>Pre-Service Checklist</h3>
            <div className="flex flex-col gap-2">
              {[
                'Clear access to work area',
                'Turn off water main if leaking',
                'Move valuables from under sink',
                'Have payment method ready'
              ].map((item, index) => (
                <label key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.875rem',
                  cursor: 'pointer'
                }}>
                  <input type="checkbox" style={{ marginRight: '8px' }} />
                  {item}
                </label>
              ))}
            </div>
          </Card>

          {/* Submit Button */}
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
        <Card elevated className="text-center animate-slideUp" style={{ padding: '3rem 2rem' }}>
          <div className="loader" style={{ 
            width: '60px', 
            height: '60px', 
            margin: '0 auto var(--space-4)' 
          }} />
          <h2>Confirming with Tradesperson</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Bob's Plumbing is reviewing your time preferences...
          </p>
        </Card>
      )}

      {/* Step 3: Route View */}
      {step === 'route' && (
        <>
          {/* Confirmation Card */}
          <Card elevated className="mb-4 animate-slideUp">
            <div className="flex items-center gap-3 mb-4">
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, var(--success), #25d893)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
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

            <div style={{
              padding: 'var(--space-3)',
              background: 'var(--bg-base)',
              borderRadius: 'var(--radius-sm)'
            }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Service Provider
                </span>
                <Badge variant="success">VERIFIED</Badge>
              </div>
              <div style={{ fontWeight: 600 }}>Bob's Plumbing Services</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                License #PL-2024-1234 • 4.8★ (127 reviews)
              </div>
            </div>
          </Card>

          {/* Route Map Placeholder */}
          <Card elevated className="mb-4">
            <h3 style={{ margin: '0 0 var(--space-3) 0' }}>Service Route</h3>
            <div style={{
              height: '300px',
              background: 'linear-gradient(135deg, var(--bg-surface-elevated), var(--bg-base))',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <MapPin size={48} color="var(--primary)" style={{ marginBottom: 'var(--space-2)' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                123 Main St, Springfield
              </p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem', marginTop: '4px' }}>
                Estimated arrival: 1:45 PM - 2:15 PM
              </p>
              
              {/* Route Line Mock */}
              <div style={{
                position: 'absolute',
                top: '40%',
                left: '20%',
                right: '20%',
                height: '2px',
                background: 'var(--primary)',
                opacity: 0.5
              }}>
                <div style={{
                  position: 'absolute',
                  right: '-8px',
                  top: '-7px',
                  width: '16px',
                  height: '16px',
                  background: 'var(--primary)',
                  borderRadius: '50%',
                  border: '3px solid var(--bg-surface)'
                }} />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="secondary" size="md" fullWidth icon={<Navigation size={18} />}>
                Get Directions
              </Button>
              <Button variant="primary" size="md" fullWidth onClick={() => navigate('/job-execution')}>
                Track Live
              </Button>
            </div>
          </Card>

          {/* Contact Card */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Questions about your service?
                </p>
                <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
                  Contact Bob: (555) 123-4567
                </p>
              </div>
              <Button variant="ghost" size="sm">
                Call Now
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}