import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, User, Wrench, Shield, Clock, Upload } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

interface UnlicensedTradespersonData {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  tradeSpecializations: string[];
  insuranceUploaded: boolean;
  serviceRadius: string;
  availability: {
    [key: string]: string[];
  };
}

const tradeOptions = [
  'General Handyman', 'House Cleaning', 'Yard Work', 'Furniture Assembly', 
  'Moving Services', 'Painting (Interior)', 'Basic Repairs', 'Organization',
  'Pet Services', 'Pressure Washing', 'Window Cleaning', 'Gutter Cleaning'
];

const timeSlots = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'
];

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function UnlicensedTradespersonOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<UnlicensedTradespersonData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    tradeSpecializations: [],
    insuranceUploaded: false,
    serviceRadius: '',
    availability: {}
  });

  const updateFormData = (field: keyof UnlicensedTradespersonData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleTradeSpecialization = (trade: string) => {
    setFormData(prev => ({
      ...prev,
      tradeSpecializations: prev.tradeSpecializations.includes(trade)
        ? prev.tradeSpecializations.filter(t => t !== trade)
        : [...prev.tradeSpecializations, trade]
    }));
  };

  const updateAvailability = (day: string, timeSlot: string) => {
    setFormData(prev => ({
      ...prev,
      availability: {
        ...prev.availability,
        [day]: prev.availability[day]?.includes(timeSlot)
          ? prev.availability[day].filter(slot => slot !== timeSlot)
          : [...(prev.availability[day] || []), timeSlot]
      }
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('userRole', 'non-licensed-trade');
      localStorage.setItem('unlicensedTradespersonData', JSON.stringify(formData));
      localStorage.setItem('hasOnboarded', 'true');
      navigate('/job-board');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.fullName && formData.phoneNumber && formData.email && formData.address;
      case 2:
        return formData.tradeSpecializations.length > 0;
      case 3:
        return formData.serviceRadius; // Insurance is optional for unlicensed
      case 4:
        return Object.keys(formData.availability).length > 0;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div>
            <div className="text-center mb-6">
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)'
              }}>
                <User size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Your Information</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Tell us about yourself</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input
                label="Full Name"
                placeholder="John Smith"
                value={formData.fullName}
                onChange={(e) => updateFormData('fullName', e.target.value)}
              />
              <Input
                label="Phone Number"
                placeholder="(555) 123-4567"
                value={formData.phoneNumber}
                onChange={(e) => updateFormData('phoneNumber', e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
              />
              <Input
                label="Address"
                placeholder="123 Main St, City, State 12345"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div className="text-center mb-6">
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)'
              }}>
                <Wrench size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Service Specializations</h2>
              <p style={{ color: 'var(--text-secondary)' }}>What services do you provide? (Select all that apply)</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
              {tradeOptions.map((trade) => (
                <Card
                  key={trade}
                  interactive
                  onClick={() => toggleTradeSpecialization(trade)}
                  style={{
                    padding: 'var(--space-3)',
                    border: formData.tradeSpecializations.includes(trade) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: formData.tradeSpecializations.includes(trade) ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{trade}</div>
                </Card>
              ))}
            </div>

            <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Selected: {formData.tradeSpecializations.length} specialization{formData.tradeSpecializations.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <div className="text-center mb-6">
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)'
              }}>
                <Shield size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Insurance & Service Area</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Upload insurance (optional) and set your service radius</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {/* Insurance Upload - Optional */}
              <Card style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>Insurance Coverage</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Optional</span>
                </div>
                {!formData.insuranceUploaded ? (
                  <div style={{ textAlign: 'center' }}>
                    <Upload size={32} color="var(--text-secondary)" style={{ margin: '0 auto var(--space-3)' }} />
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                      Upload your liability insurance certificate (recommended)
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <Button
                        variant="outline"
                        onClick={() => updateFormData('insuranceUploaded', true)}
                        icon={<Upload size={16} />}
                        style={{ flex: 1 }}
                      >
                        Upload Insurance
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => {}}
                        style={{ flex: 1 }}
                      >
                        Skip for Now
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: 'var(--success)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto var(--space-3)'
                    }}>
                      <Shield size={16} color="white" />
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--success)' }}>Insurance Uploaded ✓</p>
                  </div>
                )}
              </Card>

              {/* Service Radius */}
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: 'var(--space-3)' }}>Service Radius</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                  How many miles from your location can you service?
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-3)' }}>
                  {['5', '15', '25', '50'].map((radius) => (
                    <Card
                      key={radius}
                      interactive
                      onClick={() => updateFormData('serviceRadius', radius)}
                      style={{
                        padding: 'var(--space-3)',
                        border: formData.serviceRadius === radius ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: formData.serviceRadius === radius ? 'var(--primary-light)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>{radius} mi</div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <div className="text-center mb-6">
              <div style={{
                width: '60px',
                height: '60px',
                background: 'var(--primary)',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto var(--space-4)'
              }}>
                <Clock size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Set Availability</h2>
              <p style={{ color: 'var(--text-secondary)' }}>When are you available to work?</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {daysOfWeek.map((day) => (
                <Card key={day} style={{ padding: 'var(--space-4)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-3)', fontWeight: '600' }}>{day}</h3>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', 
                    gap: 'var(--space-2)' 
                  }}>
                    {timeSlots.map((timeSlot) => (
                      <button
                        key={`${day}-${timeSlot}`}
                        onClick={() => updateAvailability(day, timeSlot)}
                        style={{
                          padding: '6px 8px',
                          border: formData.availability[day]?.includes(timeSlot) ? '2px solid var(--primary)' : '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          background: formData.availability[day]?.includes(timeSlot) ? 'var(--primary-light)' : 'var(--bg-surface)',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                          fontWeight: formData.availability[day]?.includes(timeSlot) ? '600' : '400',
                          color: formData.availability[day]?.includes(timeSlot) ? 'var(--primary)' : 'var(--text-secondary)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {timeSlot}
                      </button>
                    ))}
                  </div>
                  {formData.availability[day]?.length > 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                      {formData.availability[day].length} time slot{formData.availability[day].length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </Card>
              ))}
            </div>

            <Card style={{ padding: 'var(--space-4)', marginTop: 'var(--space-4)', background: 'var(--bg-base)' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-2)' }}>💡 Availability Tips</h3>
              <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem' }}>
                <li>More availability = more job opportunities</li>
                <li>You can update your schedule anytime</li>
                <li>Weekend availability is often in high demand</li>
              </ul>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="page-container" style={{
      minHeight: '100vh',
      background: 'var(--bg-base)',
      padding: 'var(--space-4)',
      paddingTop: '3rem'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)'
      }}>
        <button
          onClick={handleBack}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ChevronLeft size={24} color="var(--text-primary)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: '1.5rem',
            marginBottom: '0.25rem',
            color: 'var(--text-primary)',
            fontWeight: '600'
          }}>
            Service Provider Setup
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            margin: 0
          }}>
            Step {currentStep} of 4
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '8px',
        background: 'var(--border)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden',
        marginBottom: 'var(--space-6)'
      }}>
        <div style={{
          width: `${(currentStep / 4) * 100}%`,
          height: '100%',
          background: 'var(--primary)',
          borderRadius: 'var(--radius-full)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Form Content */}
      <Card style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
        {renderStepContent()}
      </Card>

      {/* Continue Button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onClick={handleNext}
        disabled={!isStepValid()}
        icon={<ArrowRight size={20} />}
      >
        {currentStep === 4 ? 'Complete Setup' : 'Continue'}
      </Button>
    </div>
  );
}