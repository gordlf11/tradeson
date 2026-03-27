import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Home, User, MapPin, CreditCard } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

interface HomeownerData {
  fullName: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  paymentMethodAdded: boolean;
}

export default function HomeownerOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<HomeownerData>({
    fullName: '',
    phoneNumber: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    paymentMethodAdded: false
  });

  const updateFormData = (field: keyof HomeownerData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      // Save data and complete onboarding
      localStorage.setItem('userRole', 'homeowner');
      localStorage.setItem('homeownerData', JSON.stringify(formData));
      localStorage.setItem('hasOnboarded', 'true');
      navigate('/job-creation');
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
        return formData.fullName && formData.phoneNumber && formData.email;
      case 2:
        return formData.address && formData.city && formData.state && formData.zipCode;
      case 3:
        return true; // Payment setup is optional for now
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

            <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input
                label="Full Name"
                placeholder="John Doe"
                value={formData.fullName}
                onChange={(e) => updateFormData('fullName', e.target.value)}
              />
              <div className="form-row">
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
              </div>
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
                <Home size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Add Your Home</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Where do you need services?</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input
                label="Address"
                placeholder="123 Main Street"
                value={formData.address}
                onChange={(e) => updateFormData('address', e.target.value)}
              />
              <div className="form-row">
                <Input
                  label="City"
                  placeholder="Your City"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                />
                <div className="form-row">
                  <Input
                    label="State"
                    placeholder="CA"
                    value={formData.state}
                    onChange={(e) => updateFormData('state', e.target.value)}
                  />
                  <Input
                    label="Zip Code"
                    placeholder="12345"
                    value={formData.zipCode}
                    onChange={(e) => updateFormData('zipCode', e.target.value)}
                  />
                </div>
              </div>
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
                <CreditCard size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Payment Setup</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Add a payment method for easy checkout</p>
            </div>

            <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                Payment processor integration will be added here.
                <br />
                You can skip this step for now and add payment methods later.
              </p>
            </Card>

            <Button
              variant="outline"
              fullWidth
              onClick={() => updateFormData('paymentMethodAdded', !formData.paymentMethodAdded)}
            >
              {formData.paymentMethodAdded ? 'Payment Method Added ✓' : 'Add Payment Method'}
            </Button>
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
            Let's set up your property
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            margin: 0
          }}>
            Step {currentStep} of 3
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
          width: `${(currentStep / 3) * 100}%`,
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
      <div className="btn-center">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleNext}
          disabled={!isStepValid()}
          icon={<ArrowRight size={20} />}
        >
          {currentStep === 3 ? 'Complete Setup' : 'Continue'}
        </Button>
      </div>
    </div>
  );
}