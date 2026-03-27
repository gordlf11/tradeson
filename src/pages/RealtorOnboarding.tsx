import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Briefcase, MapPin, UserPlus, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

interface RealtorData {
  fullName: string;
  email: string;
  phoneNumber: string;
  city: string;
  state: string;
  licenseNumber: string;
  brokerageName: string;
  brokerageEmail: string;
  managingBrokerName: string;
  serviceState: string;
  serviceCity: string;
  mileRange: string;
  clientEmail: string;
}

export default function RealtorOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showClientInvite, setShowClientInvite] = useState(false);
  const [formData, setFormData] = useState<RealtorData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    city: '',
    state: '',
    licenseNumber: '',
    brokerageName: '',
    brokerageEmail: '',
    managingBrokerName: '',
    serviceState: '',
    serviceCity: '',
    mileRange: '',
    clientEmail: ''
  });

  const updateFormData = (field: keyof RealtorData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      localStorage.setItem('userRole', 'realtor');
      localStorage.setItem('realtorData', JSON.stringify(formData));
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

  const handleInviteClient = () => {
    if (formData.clientEmail) {
      // TODO: Send invitation to client
      alert(`Invitation sent to ${formData.clientEmail}!`);
      setShowClientInvite(false);
      setFormData(prev => ({ ...prev, clientEmail: '' }));
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.fullName && formData.email && formData.phoneNumber && 
               formData.city && formData.state && formData.licenseNumber && 
               formData.brokerageName && formData.brokerageEmail && formData.managingBrokerName;
      case 2:
        return formData.serviceState && formData.serviceCity && formData.mileRange;
      case 3:
        return true; // Client invitation is optional
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
                <Briefcase size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Professional Profile</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Tell us about your real estate practice</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input
                label="Full Name"
                placeholder="Jane Smith"
                value={formData.fullName}
                onChange={(e) => updateFormData('fullName', e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                placeholder="jane@realty.com"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
              />
              <Input
                label="Phone Number"
                placeholder="(555) 123-4567"
                value={formData.phoneNumber}
                onChange={(e) => updateFormData('phoneNumber', e.target.value)}
              />
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Input
                  label="City"
                  placeholder="Los Angeles"
                  value={formData.city}
                  onChange={(e) => updateFormData('city', e.target.value)}
                  style={{ flex: 1 }}
                />
                <Input
                  label="State"
                  placeholder="CA"
                  value={formData.state}
                  onChange={(e) => updateFormData('state', e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
              <Input
                label="License #"
                placeholder="RE123456789"
                value={formData.licenseNumber}
                onChange={(e) => updateFormData('licenseNumber', e.target.value)}
              />
              <Input
                label="Brokerage Name"
                placeholder="ABC Realty Group"
                value={formData.brokerageName}
                onChange={(e) => updateFormData('brokerageName', e.target.value)}
              />
              <Input
                label="Brokerage Email"
                type="email"
                placeholder="office@abcrealty.com"
                value={formData.brokerageEmail}
                onChange={(e) => updateFormData('brokerageEmail', e.target.value)}
              />
              <Input
                label="Managing Broker Name"
                placeholder="John Broker"
                value={formData.managingBrokerName}
                onChange={(e) => updateFormData('managingBrokerName', e.target.value)}
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
                <MapPin size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Service Area</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Where do you work with clients?</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Input
                  label="State"
                  placeholder="CA"
                  value={formData.serviceState}
                  onChange={(e) => updateFormData('serviceState', e.target.value)}
                  style={{ flex: 1 }}
                />
                <Input
                  label="Primary City"
                  placeholder="Los Angeles"
                  value={formData.serviceCity}
                  onChange={(e) => updateFormData('serviceCity', e.target.value)}
                  style={{ flex: 2 }}
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>
                  Mile Range
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
                  {['25', '50', '100'].map((range) => (
                    <Card
                      key={range}
                      interactive
                      onClick={() => updateFormData('mileRange', range)}
                      style={{
                        padding: 'var(--space-3)',
                        border: formData.mileRange === range ? '2px solid var(--primary)' : '1px solid var(--border)',
                        background: formData.mileRange === range ? 'var(--primary-light)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: '600' }}>{range} miles</div>
                    </Card>
                  ))}
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
                <UserPlus size={24} color="white" />
              </div>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Client Sub-Accounts</h2>
              <p style={{ color: 'var(--text-secondary)' }}>Invite clients to use TradesOn for their property needs</p>
            </div>

            <Card style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
              <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  When you invite clients, they'll be able to submit service requests through your account.
                  You maintain control over approvals and payments.
                </p>
              </div>

              {!showClientInvite ? (
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setShowClientInvite(true)}
                  icon={<Mail size={16} />}
                >
                  Invite Your First Client
                </Button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  <Input
                    label="Client Email"
                    type="email"
                    placeholder="client@email.com"
                    value={formData.clientEmail}
                    onChange={(e) => updateFormData('clientEmail', e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <Button
                      variant="outline"
                      onClick={() => setShowClientInvite(false)}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleInviteClient}
                      disabled={!formData.clientEmail}
                      style={{ flex: 1 }}
                    >
                      Send Invite
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            <div style={{ 
              padding: 'var(--space-4)', 
              background: 'var(--bg-base)', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)'
            }}>
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-2)', fontWeight: '600' }}>
                Benefits of Client Sub-Accounts:
              </h3>
              <ul style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', paddingLeft: '1.25rem' }}>
                <li>Clients can submit maintenance requests directly</li>
                <li>You approve all services before work begins</li>
                <li>Track all property maintenance in one place</li>
                <li>Build stronger client relationships</li>
              </ul>
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
            Set up your client management system
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
  );
}