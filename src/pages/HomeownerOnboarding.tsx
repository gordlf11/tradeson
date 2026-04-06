import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ArrowRight, User, MapPin, Home, Sliders, CreditCard, Upload, Eye, EyeOff
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

interface HomeownerData {
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

  // Step 3 – Property Details
  propertyAddressSameAsAccount: boolean;
  propertyAddress: string;
  propertyCity: string;
  propertyState: string;
  propertyZip: string;
  propertyType: string;

  // Step 4 – Preferences
  serviceInterests: string[];
  notifySMS: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  marketingOptIn: boolean;

  // Step 5 – Payment
  paymentDeferred: boolean;
}

const SERVICE_INTERESTS = ['Plumbing', 'Electrical', 'HVAC', 'General Repairs', 'Cleaning'];
const PROPERTY_TYPES = ['House', 'Apartment', 'Condo', 'Townhouse'];
const RADIUS_OPTIONS = ['5', '10', '25', '50', '100'];

const STEP_TOTAL = 5;

const sectionLabel = (text: string) => (
  <p style={{
    fontSize: '0.7rem',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--primary)',
    marginBottom: 'var(--space-3)',
    marginTop: 'var(--space-5)'
  }}>{text}</p>
);

export default function HomeownerOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState<HomeownerData>({
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
    propertyAddressSameAsAccount: false,
    propertyAddress: '',
    propertyCity: '',
    propertyState: '',
    propertyZip: '',
    propertyType: '',
    serviceInterests: [],
    notifySMS: true,
    notifyEmail: true,
    notifyPush: false,
    marketingOptIn: false,
    paymentDeferred: false,
  });

  const update = (field: keyof HomeownerData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const toggleList = (field: 'serviceInterests', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value],
    }));
  };

  const syncPropertyAddress = (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      propertyAddressSameAsAccount: checked,
      propertyAddress: checked ? prev.primaryAddress : '',
      propertyCity: checked ? prev.city : '',
      propertyState: checked ? prev.state : '',
      propertyZip: checked ? prev.zipCode : '',
    }));
  };

  const handleNext = () => {
    if (currentStep < STEP_TOTAL) {
      setCurrentStep(s => s + 1);
    } else {
      localStorage.setItem('userRole', 'homeowner');
      localStorage.setItem('homeownerData', JSON.stringify(formData));
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
      width: '60px', height: '60px',
      background: 'var(--primary)',
      borderRadius: 'var(--radius-full)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto var(--space-4)',
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
    <button
      onClick={() => update(field, !formData[field])}
      style={{
        flex: 1,
        padding: 'var(--space-3)',
        border: formData[field] ? '2px solid var(--primary)' : '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: formData[field] ? 'var(--primary-light)' : 'var(--bg-surface)',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.85rem',
        color: formData[field] ? 'var(--primary)' : 'var(--text-secondary)',
        fontFamily: 'inherit',
      }}
    >{label}</button>
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
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                      Upload a profile photo
                    </p>
                    <Button variant="outline" onClick={() => update('profilePhotoUploaded', true)}
                      icon={<Upload size={16} />}>Upload Photo</Button>
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

              {sectionLabel('GPS / Service Radius')}
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                How far are you willing to travel for services? (miles)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 'var(--space-2)' }}>
                {RADIUS_OPTIONS.map(r => (
                  <button key={r} onClick={() => update('serviceRadius', r)} style={{
                    padding: 'var(--space-3) var(--space-2)',
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
            {stepHeader(<Home size={24} color="white" />, 'Your Property', 'Tell us about your home')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Same address toggle */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                cursor: 'pointer', fontWeight: '500',
              }}>
                <input type="checkbox" checked={formData.propertyAddressSameAsAccount}
                  onChange={e => syncPropertyAddress(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                Property address same as my account address
              </label>

              <Input label="Property Address" placeholder="123 Main Street" value={formData.propertyAddress}
                onChange={e => update('propertyAddress', e.target.value)}
                disabled={formData.propertyAddressSameAsAccount} />
              <Input label="City" placeholder="City" value={formData.propertyCity}
                onChange={e => update('propertyCity', e.target.value)}
                disabled={formData.propertyAddressSameAsAccount} />
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Input label="State" placeholder="CA" value={formData.propertyState}
                  onChange={e => update('propertyState', e.target.value)}
                  disabled={formData.propertyAddressSameAsAccount} style={{ flex: 1 }} />
                <Input label="Zip Code" placeholder="12345" value={formData.propertyZip}
                  onChange={e => update('propertyZip', e.target.value)}
                  disabled={formData.propertyAddressSameAsAccount} style={{ flex: 1 }} />
              </div>

              {sectionLabel('Property Type')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                {PROPERTY_TYPES.map(type => (
                  <button key={type} onClick={() => update('propertyType', type)} style={{
                    padding: 'var(--space-4)',
                    border: formData.propertyType === type ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: formData.propertyType === type ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontWeight: '600',
                    color: formData.propertyType === type ? 'var(--primary)' : 'var(--text-primary)',
                    fontFamily: 'inherit',
                  }}>{type}</button>
                ))}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            {stepHeader(<Sliders size={24} color="white" />, 'Preferences', 'Customize your experience')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

              {sectionLabel('Common Service Interests (optional)')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                {SERVICE_INTERESTS.map(s => (
                  <button key={s} onClick={() => toggleList('serviceInterests', s)} style={{
                    padding: 'var(--space-3)',
                    border: formData.serviceInterests.includes(s) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: formData.serviceInterests.includes(s) ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem',
                    color: formData.serviceInterests.includes(s) ? 'var(--primary)' : 'var(--text-secondary)',
                    fontFamily: 'inherit',
                  }}>{s}</button>
                ))}
              </div>

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
                I'd like to receive tips, promotions, and news from TradesOn
              </label>
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            {stepHeader(<CreditCard size={24} color="white" />, 'Payment Setup', 'Secure checkout for jobs')}
            <Card style={{ padding: 'var(--space-6)', textAlign: 'center', marginBottom: 'var(--space-4)' }}>
              <CreditCard size={36} color="var(--text-secondary)" style={{ margin: '0 auto var(--space-4)' }} />
              <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-2)' }}>Add a Payment Method</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Stripe-powered secure payments. You'll only be charged after a job is approved and completed.
              </p>
            </Card>
            <Button variant="outline" fullWidth onClick={() => update('paymentDeferred', false)}
              style={{ marginBottom: 'var(--space-3)' }}>
              Add Card Now (Stripe)
            </Button>
            <button onClick={() => update('paymentDeferred', true)} style={{
              width: '100%', background: 'none', border: 'none',
              color: 'var(--text-secondary)', fontSize: '0.875rem',
              cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
            }}>
              Skip for now — I'll add payment before my first job
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = ['Your Account', 'Your Location', 'Your Property', 'Preferences', 'Payment'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', padding: 'var(--space-4)', paddingTop: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <button onClick={handleBack} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ChevronLeft size={24} color="var(--text-primary)" />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.2rem', color: 'var(--text-primary)', fontWeight: '700' }}>
            Homeowner Setup
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Step {currentStep} of {STEP_TOTAL} — {stepTitles[currentStep - 1]}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '6px', background: 'var(--border)', borderRadius: 'var(--radius-full)',
        overflow: 'hidden', marginBottom: 'var(--space-6)',
      }}>
        <div style={{
          width: `${(currentStep / STEP_TOTAL) * 100}%`, height: '100%',
          background: 'var(--primary)', borderRadius: 'var(--radius-full)',
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Form Content */}
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
