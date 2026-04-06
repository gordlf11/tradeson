import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ArrowRight, User, MapPin, Briefcase, Sliders, UserPlus, Upload, Mail, Trash2, Eye, EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

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
}

const RADIUS_OPTIONS = ['25', '50', '75', '100'];
const STEP_TOTAL = 5;

const sectionLabel = (text: string) => (
  <p style={{
    fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', color: 'var(--primary)',
    marginBottom: 'var(--space-3)', marginTop: 'var(--space-5)',
  }}>{text}</p>
);

export default function RealtorOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
    serviceRadius: '',
    brokerageName: '',
    licenseNumber: '',
    notifySMS: true,
    notifyEmail: true,
    notifyPush: false,
    marketingOptIn: false,
    clientEmails: [],
    newClientEmail: '',
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

  const handleNext = () => {
    if (currentStep < STEP_TOTAL) setCurrentStep(s => s + 1);
    else {
      localStorage.setItem('userRole', 'realtor');
      localStorage.setItem('realtorData', JSON.stringify(formData));
      localStorage.setItem('hasOnboarded', 'true');
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
            {stepHeader(<User size={24} color="white" />, 'Your Account', 'Set up your login credentials')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Full Name" placeholder="Jane Smith" value={formData.fullName}
                onChange={e => update('fullName', e.target.value)} />
              <Input label="Phone Number" placeholder="(555) 123-4567" value={formData.phoneNumber}
                onChange={e => update('phoneNumber', e.target.value)} />
              <div style={{ position: 'relative' }}>
                <Input label="Password" type={showPassword ? 'text' : 'password'}
                  placeholder="Minimum 8 characters" value={formData.password}
                  onChange={e => update('password', e.target.value)} />
                <button onClick={() => setShowPassword(v => !v)} style={{
                  position: 'absolute', right: '12px', top: '36px',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Input label="Confirm Password" type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter password" value={formData.confirmPassword}
                  onChange={e => update('confirmPassword', e.target.value)} />
                <button onClick={() => setShowConfirm(v => !v)} style={{
                  position: 'absolute', right: '12px', top: '36px',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)',
                }}>
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p style={{ color: 'var(--danger)', fontSize: '0.8rem', margin: 0 }}>Passwords do not match</p>
              )}

              {sectionLabel('Profile Photo (optional)')}
              <Card style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                {!formData.profilePhotoUploaded ? (
                  <>
                    <Upload size={32} color="var(--text-secondary)" style={{ margin: '0 auto var(--space-3)' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>Upload a profile photo</p>
                    <Button variant="outline" onClick={() => update('profilePhotoUploaded', true)} icon={<Upload size={16} />}>Upload Photo</Button>
                  </>
                ) : (
                  <p style={{ color: 'var(--success)', fontWeight: '600' }}>Photo uploaded ✓</p>
                )}
              </Card>
            </div>
          </div>
        );

      case 2:
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-2)' }}>
                {RADIUS_OPTIONS.map(r => (
                  <button key={r} onClick={() => update('serviceRadius', r)} style={{
                    padding: 'var(--space-3)',
                    border: formData.serviceRadius === r ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: formData.serviceRadius === r ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                    color: formData.serviceRadius === r ? 'var(--primary)' : 'var(--text-secondary)',
                    fontFamily: 'inherit',
                  }}>{r} mi</button>
                ))}
              </div>
            </div>
          </div>
        );

      case 3:
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

      case 4:
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

      case 5:
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
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = ['Account', 'Location', 'Professional', 'Preferences', 'Client Portal'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: 'var(--space-4)', paddingTop: '3rem' }}>
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

      <Button variant="primary" size="lg" fullWidth onClick={handleNext}
        icon={<ArrowRight size={20} />}>
        {currentStep === STEP_TOTAL ? 'Complete Setup' : 'Continue'}
      </Button>
    </div>
  );
}
