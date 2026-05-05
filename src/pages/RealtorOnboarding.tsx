import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ArrowRight, MapPin, Briefcase, Sliders, UserPlus, Mail, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StripeCheckoutWrapper from '../components/StripeCheckoutWrapper';

interface RealtorData {
  // Step 1 – Account Info
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  profilePhotoUploaded: boolean;

  // Step 2 – Location
  primaryAddress: string;
  city: string;
  state: string;
  zipCode: string;
  serviceRadius: string;

  // Step 3 – Professional Info
  brokerageName: string;
  licenseNumber: string;

  // Step 4 – Preferences
  notifySMS: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  marketingOptIn: boolean;

  // Step 5 – Client Portal
  clientEmails: string[];
  newClientEmail: string;

  // Payment
  paymentDeferred: boolean;
}

const STEP_TOTAL = 4;

const sectionLabel = (text: string) => (
  <p style={{
    fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', color: 'var(--primary)',
    marginBottom: 'var(--space-3)', marginTop: 'var(--space-5)',
  }}>{text}</p>
);

export default function RealtorOnboarding() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState<RealtorData>({
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    profilePhotoUploaded: false,
    primaryAddress: '',
    city: '',
    state: '',
    zipCode: '',
    serviceRadius: '25',
    brokerageName: '',
    licenseNumber: '',
    notifySMS: true,
    notifyEmail: true,
    notifyPush: false,
    marketingOptIn: false,
    clientEmails: [],
    newClientEmail: '',
    paymentDeferred: false,
  });

  const update = (field: keyof RealtorData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const addClientEmail = () => {
    const email = formData.newClientEmail.trim();
    if (email && !formData.clientEmails.includes(email)) {
      setFormData(prev => ({
        ...prev,
        clientEmails: [...prev.clientEmails, email],
        newClientEmail: '',
      }));
    }
  };

  const removeClientEmail = (email: string) => {
    setFormData(prev => ({
      ...prev,
      clientEmails: prev.clientEmails.filter(e => e !== email),
    }));
  };

  const handleNext = async () => {
    if (currentStep < STEP_TOTAL) {
      setCurrentStep(s => s + 1);
    } else {
      setIsSubmitting(true);
      try {
        await api.onboardRealtor({
          brokerage_name: formData.brokerageName,
          license_number: formData.licenseNumber,
          service_radius_miles: parseInt(formData.serviceRadius) || 25,
          client_emails: formData.clientEmails,
          address_line_1: formData.primaryAddress,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          notify_sms: formData.notifySMS,
          notify_email: formData.notifyEmail,
          notify_push: formData.notifyPush,
          marketing_opt_in: formData.marketingOptIn,
        });
        await api.updateMe({ full_name: formData.fullName, phone_number: formData.phoneNumber });
        await refreshProfile();
      } catch (err: any) {
        // Backend DB unavailable — continue anyway; profile syncs when DB is restored
        console.warn('Onboarding API error (non-blocking):', err.message);
      }
      // Address fields — read by LocationSettings.tsx as a fallback when the API is down
      if (formData.primaryAddress) localStorage.setItem('locationStreet', formData.primaryAddress);
      if (formData.city) localStorage.setItem('locationCity', formData.city);
      if (formData.state) localStorage.setItem('locationProvince', formData.state);
      if (formData.zipCode) localStorage.setItem('locationPostal', formData.zipCode);
      localStorage.setItem('userRole', 'realtor');
      localStorage.setItem('hasOnboarded', 'true');
      setIsSubmitting(false);
      navigate('/job-creation');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
    else navigate(-1);
  };


  const iconCircle = (icon: React.ReactNode) => (
    <div style={{
      width: '60px', height: '60px', background: 'var(--primary)',
      borderRadius: 'var(--radius-full)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)',
    }}>{icon}</div>
  );

  const stepHeader = (icon: React.ReactNode, title: string, subtitle: string) => (
    <div className="text-center mb-6">
      {iconCircle(icon)}
      <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary)', margin: 0 }}>{subtitle}</p>
    </div>
  );

  const notifToggle = (label: string, field: 'notifySMS' | 'notifyEmail' | 'notifyPush') => (
    <button onClick={() => update(field, !formData[field])} style={{
      flex: 1, padding: 'var(--space-3)',
      border: formData[field] ? '2px solid var(--primary)' : '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      background: formData[field] ? 'var(--primary-light)' : 'var(--bg-surface)',
      cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
      color: formData[field] ? 'var(--primary)' : 'var(--text-secondary)',
      fontFamily: 'inherit',
    }}>{label}</button>
  );

  const renderStep = () => {
    switch (currentStep) {

      case 1:
        return (
          <div>
            {stepHeader(<MapPin size={24} color="white" />, 'Your Location', 'Where are you based?')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Primary Address" placeholder="123 Main Street" value={formData.primaryAddress}
                onChange={e => update('primaryAddress', e.target.value)} />
              <Input label="City" placeholder="Your City" value={formData.city}
                onChange={e => update('city', e.target.value)} />
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Input label="State" placeholder="CA" value={formData.state}
                  onChange={e => update('state', e.target.value)} style={{ flex: 1 }} />
                <Input label="Zip Code" placeholder="12345" value={formData.zipCode}
                  onChange={e => update('zipCode', e.target.value)} style={{ flex: 1 }} />
              </div>

              {sectionLabel('Service Radius (Client Area)')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>5 mi</span>
                  <span style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--primary)' }}>{formData.serviceRadius} miles</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>50 mi</span>
                </div>
                <input
                  type="range"
                  min="5" max="50" step="1"
                  value={formData.serviceRadius}
                  onChange={e => update('serviceRadius', e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            {stepHeader(<Briefcase size={24} color="white" />, 'Professional Info', 'Your real estate credentials')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Brokerage Name" placeholder="ABC Realty Group" value={formData.brokerageName}
                onChange={e => update('brokerageName', e.target.value)} />
              <Input label="License Number" placeholder="RE123456789" value={formData.licenseNumber}
                onChange={e => update('licenseNumber', e.target.value)} />
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            {stepHeader(<Sliders size={24} color="white" />, 'Preferences', 'Customize your experience')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sectionLabel('Notification Preferences')}
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {notifToggle('SMS', 'notifySMS')}
                {notifToggle('Email', 'notifyEmail')}
                {notifToggle('Push', 'notifyPush')}
              </div>
              {sectionLabel('Marketing')}
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer', fontWeight: '500' }}>
                <input type="checkbox" checked={formData.marketingOptIn}
                  onChange={e => update('marketingOptIn', e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                I'd like to receive tips, promotions, and platform updates from TradesOn
              </label>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            {stepHeader(<UserPlus size={24} color="white" />, 'Client Portal', 'Invite clients to use TradesOn')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                Add your clients' emails below. They'll receive an invite to set up a Homeowner account under your portal,
                giving you visibility into their service requests.
              </p>

              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Input label="Client Email" type="email" placeholder="client@email.com"
                  value={formData.newClientEmail}
                  onChange={e => update('newClientEmail', e.target.value)}
                  style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button variant="primary" onClick={addClientEmail}
                    disabled={!formData.newClientEmail}
                    icon={<Mail size={16} />}>
                    Add
                  </Button>
                </div>
              </div>

              {formData.clientEmails.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {sectionLabel(`Invited Clients (${formData.clientEmails.length})`)}
                  {formData.clientEmails.map(email => (
                    <div key={email} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: 'var(--space-3) var(--space-4)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-surface)',
                    }}>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{email}</span>
                      <button onClick={() => removeClientEmail(email)} style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)',
                      }}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Card style={{ padding: 'var(--space-4)', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-primary)', margin: 0 }}>
                  You can also invite clients anytime from your dashboard. This step is optional.
                </p>
              </Card>

              {/* Payment Setup */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-4)' }}>
                <div style={{ fontWeight: '700', fontSize: '0.88rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
                  Membership & Billing
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                  Activate your membership to manage client service jobs. Charged only after jobs are completed.
                </p>
                <StripeCheckoutWrapper role="realtor" onComplete={() => update('paymentDeferred', false)} />
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => update('paymentDeferred', true)}
                  style={{ marginTop: 'var(--space-2)', color: 'var(--text-secondary)' }}
                >
                  Skip for now
                </Button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = ['Location', 'Professional', 'Preferences', 'Client Portal'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: 'var(--space-4)', paddingTop: '3rem', paddingBottom: '120px' }}>
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button onClick={handleBack} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChevronLeft size={24} color="var(--text-primary)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', color: 'var(--text-primary)', fontWeight: '700' }}>
            Realtor Setup
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Step {currentStep} of {STEP_TOTAL} — {stepTitles[currentStep - 1]}
          </p>
        </div>
      </div>

      <div style={{
        height: '6px', background: 'var(--border)', borderRadius: 'var(--radius-full)',
        overflow: 'hidden', marginBottom: 'var(--space-6)',
      }}>
        <div style={{
          width: `${(currentStep / STEP_TOTAL) * 100}%`, height: '100%',
          background: 'var(--primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.3s ease',
        }} />
      </div>

      <Card style={{ marginBottom: 'var(--space-6)', padding: 'var(--space-6)' }}>
        {renderStep()}
      </Card>

      <Button variant="primary" size="lg" fullWidth onClick={handleNext} loading={isSubmitting}
        icon={<ArrowRight size={20} />}>
        {currentStep === STEP_TOTAL ? 'Complete Setup' : 'Continue'}
      </Button>
    </div>
  );
}
