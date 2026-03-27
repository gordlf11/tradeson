import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Building, MapPin, Wrench, CreditCard, Plus, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

interface PropertyData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface PropertyManagerData {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  pocName: string;
  pocEmail: string;
  pocPhone: string;
  propertyCount: '1-5' | '6-20' | '20+' | '';
  properties: PropertyData[];
  servicePreferences: string[];
  plan: 'per-job' | 'pro' | '';
}

const tradeOptions = [
  'Electric', 'Plumbing', 'General Contracting', 'Renovation', 'HVAC', 
  'Roofing', 'Landscaping', 'Cleaning', 'Painting', 'Flooring'
];

export default function PropertyManagerOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PropertyManagerData>({
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    pocName: '',
    pocEmail: '',
    pocPhone: '',
    propertyCount: '',
    properties: [{ address: '', city: '', state: '', zipCode: '' }],
    servicePreferences: [],
    plan: ''
  });

  const updateFormData = (field: keyof PropertyManagerData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addProperty = () => {
    setFormData(prev => ({
      ...prev,
      properties: [...prev.properties, { address: '', city: '', state: '', zipCode: '' }]
    }));
  };

  const removeProperty = (index: number) => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties.filter((_, i) => i !== index)
    }));
  };

  const updateProperty = (index: number, field: keyof PropertyData, value: string) => {
    setFormData(prev => ({
      ...prev,
      properties: prev.properties.map((prop, i) => 
        i === index ? { ...prop, [field]: value } : prop
      )
    }));
  };

  const toggleServicePreference = (service: string) => {
    setFormData(prev => ({
      ...prev,
      servicePreferences: prev.servicePreferences.includes(service)
        ? prev.servicePreferences.filter(s => s !== service)
        : [...prev.servicePreferences, service]
    }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('userRole', 'property-manager');
      localStorage.setItem('propertyManagerData', JSON.stringify(formData));
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
        return formData.companyName && formData.companyAddress && formData.companyEmail && 
               formData.companyPhone && formData.pocName && formData.pocEmail && formData.pocPhone;
      case 2:
        return formData.propertyCount !== '';
      case 3:
        return formData.properties.every(prop => prop.address && prop.city && prop.state && prop.zipCode);
      case 4:
        return formData.servicePreferences.length > 0;
      case 5:
        return formData.plan !== '';
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
                <Building size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Business Information</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Tell us about your company</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input
                label="Company Name"
                placeholder="ABC Property Management"
                value={formData.companyName}
                onChange={(e) => updateFormData('companyName', e.target.value)}
              />
              <Input
                label="Company Address"
                placeholder="123 Business St"
                value={formData.companyAddress}
                onChange={(e) => updateFormData('companyAddress', e.target.value)}
              />
              <Input
                label="Company Email"
                type="email"
                placeholder="contact@company.com"
                value={formData.companyEmail}
                onChange={(e) => updateFormData('companyEmail', e.target.value)}
              />
              <Input
                label="Company Phone"
                placeholder="(555) 123-4567"
                value={formData.companyPhone}
                onChange={(e) => updateFormData('companyPhone', e.target.value)}
              />
              <Input
                label="Point of Contact Full Name"
                placeholder="John Smith"
                value={formData.pocName}
                onChange={(e) => updateFormData('pocName', e.target.value)}
              />
              <Input
                label="POC Email"
                type="email"
                placeholder="john@company.com"
                value={formData.pocEmail}
                onChange={(e) => updateFormData('pocEmail', e.target.value)}
              />
              <Input
                label="POC Phone"
                placeholder="(555) 987-6543"
                value={formData.pocPhone}
                onChange={(e) => updateFormData('pocPhone', e.target.value)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <div className="text-center mb-6">
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Property Portfolio</h2>
              <p style={{ color: 'var(--text-secondary)' }}>How many properties do you manage?</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {['1-5', '6-20', '20+'].map((option) => (
                <Card
                  key={option}
                  interactive
                  onClick={() => updateFormData('propertyCount', option as any)}
                  style={{
                    padding: 'var(--space-4)',
                    border: formData.propertyCount === option ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: formData.propertyCount === option ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{option} properties</div>
                </Card>
              ))}
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
                <MapPin size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Add Properties</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Enter your property addresses</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {formData.properties.map((property, index) => (
                <Card key={index} style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: '600' }}>Property {index + 1}</h3>
                    {index > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProperty(index)}
                        icon={<Trash2 size={16} />}
                      />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <Input
                      label="Address"
                      placeholder="123 Property St"
                      value={property.address}
                      onChange={(e) => updateProperty(index, 'address', e.target.value)}
                    />
                    <Input
                      label="City"
                      placeholder="City"
                      value={property.city}
                      onChange={(e) => updateProperty(index, 'city', e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                      <Input
                        label="State"
                        placeholder="CA"
                        value={property.state}
                        onChange={(e) => updateProperty(index, 'state', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <Input
                        label="Zip Code"
                        placeholder="12345"
                        value={property.zipCode}
                        onChange={(e) => updateProperty(index, 'zipCode', e.target.value)}
                        style={{ flex: 1 }}
                      />
                    </div>
                  </div>
                </Card>
              ))}

              <Button
                variant="outline"
                onClick={addProperty}
                icon={<Plus size={16} />}
              >
                Add Another Property
              </Button>
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
                <Wrench size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Service Preferences</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Which trades do you need most often?</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
              {tradeOptions.map((trade) => (
                <Card
                  key={trade}
                  interactive
                  onClick={() => toggleServicePreference(trade)}
                  style={{
                    padding: 'var(--space-3)',
                    border: formData.servicePreferences.includes(trade) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    background: formData.servicePreferences.includes(trade) ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{trade}</div>
                </Card>
              ))}
            </div>
          </div>
        );

      case 5:
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
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Choose Your Plan</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Select the pricing that works for you</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Card
                interactive
                onClick={() => updateFormData('plan', 'per-job')}
                style={{
                  padding: 'var(--space-4)',
                  border: formData.plan === 'per-job' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: formData.plan === 'per-job' ? 'var(--primary-light)' : 'var(--bg-surface)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Per-Job (12%)</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Pay 12% commission per completed job</div>
              </Card>

              <Card
                interactive
                onClick={() => updateFormData('plan', 'pro')}
                style={{
                  padding: 'var(--space-4)',
                  border: formData.plan === 'pro' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: formData.plan === 'pro' ? 'var(--primary-light)' : 'var(--bg-surface)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '1.2rem', marginBottom: '0.5rem' }}>Pro ($99/mo)</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Fixed monthly rate, unlimited jobs</div>
              </Card>
            </div>
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
            Let's get your property portfolio connected
          </h1>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '0.9rem',
            margin: 0
          }}>
            Step {currentStep} of 5
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
          width: `${(currentStep / 5) * 100}%`,
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
        {currentStep === 5 ? 'Complete Setup' : 'Continue'}
      </Button>
    </div>
  );
}