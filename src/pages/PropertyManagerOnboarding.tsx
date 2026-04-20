import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
  ChevronLeft, ArrowRight, MapPin, Building, Layers, Wrench, Sliders,
  Plus, Trash2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import StripeCheckoutWrapper from '../components/StripeCheckoutWrapper';

interface PropertyLocation {
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface PropertyManagerData {
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

  // Step 3 – Company / Business Info
  companyName: string;
  jobTitle: string;
  businessEmail: string;

  // Step 4 – Portfolio Details
  propertyCount: string;
  propertyTypes: string[];
  propertyLocations: PropertyLocation[];

  // Step 5 – Operational Preferences
  preferredServiceTypes: string[];
  urgencyTypes: string[];

  // Step 6 – Preferences
  notifySMS: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  marketingOptIn: boolean;
}

const PROPERTY_COUNT_OPTIONS = ['1–5', '6–20', '21–50', '50+'];
const PROPERTY_TYPE_OPTIONS = ['Residential', 'Commercial', 'Mixed-Use', 'Vacation/STR'];
const SERVICE_TYPE_OPTIONS = ['Plumbing', 'Electrical', 'HVAC', 'General Contracting', 'Landscaping', 'Cleaning', 'Painting', 'Roofing'];
const URGENCY_OPTIONS = ['Emergency', 'Routine', 'Turnover'];

const STEP_TOTAL = 5;

const sectionLabel = (text: string) => (
  <p style={{
    fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', color: 'var(--primary)',
    marginBottom: 'var(--space-3)', marginTop: 'var(--space-5)',
  }}>{text}</p>
);

export default function PropertyManagerOnboarding() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState<PropertyManagerData>({
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
    companyName: '',
    jobTitle: '',
    businessEmail: '',
    propertyCount: '',
    propertyTypes: [],
    propertyLocations: [{ address: '', city: '', state: '', zipCode: '' }],
    preferredServiceTypes: [],
    urgencyTypes: [],
    notifySMS: true,
    notifyEmail: true,
    notifyPush: false,
    marketingOptIn: false,
  });

  const update = (field: keyof PropertyManagerData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const toggleList = (field: 'propertyTypes' | 'preferredServiceTypes' | 'urgencyTypes', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(value)
        ? (prev[field] as string[]).filter(v => v !== value)
        : [...(prev[field] as string[]), value],
    }));
  };

  const addLocation = () => setFormData(prev => ({
    ...prev,
    propertyLocations: [...prev.propertyLocations, { address: '', city: '', state: '', zipCode: '' }],
  }));

  const removeLocation = (i: number) => setFormData(prev => ({
    ...prev,
    propertyLocations: prev.propertyLocations.filter((_, idx) => idx !== i),
  }));

  const updateLocation = (i: number, field: keyof PropertyLocation, value: string) => {
    setFormData(prev => ({
      ...prev,
      propertyLocations: prev.propertyLocations.map((loc, idx) =>
        idx === i ? { ...loc, [field]: value } : loc
      ),
    }));
  };

  const handleNext = async () => {
    if (currentStep < STEP_TOTAL) setCurrentStep(s => s + 1);
    else {
      setIsSubmitting(true);
      setSubmitError('');
      try {
        await api.onboardPropertyManager({
          company_name: formData.companyName,
          job_title: formData.jobTitle,
          business_email: formData.businessEmail,
          property_count_range: formData.propertyCount,
          property_types: formData.propertyTypes,
          preferred_service_types: formData.preferredServiceTypes,
          urgency_types: formData.urgencyTypes,
          managed_properties: formData.propertyLocations.map(p => ({
            address: p.address, city: p.city, state: p.state, zip_code: p.zipCode,
          })),
          address_line_1: formData.primaryAddress,
          city: formData.city,
          state: formData.state,
          zip_code: formData.zipCode,
          service_radius_miles: parseInt(formData.serviceRadius) || 25,
          notify_sms: formData.notifySMS,
          notify_email: formData.notifyEmail,
          notify_push: formData.notifyPush,
          marketing_opt_in: formData.marketingOptIn,
        });
        await api.updateMe({ full_name: formData.fullName, phone_number: formData.phoneNumber });
        await refreshProfile();
        localStorage.setItem('userRole', 'property-manager');
        localStorage.setItem('hasOnboarded', 'true');
        navigate('/job-creation');
      } catch (err: any) {
        setSubmitError(err.message || 'Failed to save profile');
      } finally {
        setIsSubmitting(false);
      }
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

  const chipGrid = (options: string[], field: 'propertyTypes' | 'preferredServiceTypes' | 'urgencyTypes') => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
      {options.map(opt => (
        <button key={opt} onClick={() => toggleList(field, opt)} style={{
          padding: 'var(--space-3)',
          border: (formData[field] as string[]).includes(opt) ? '2px solid var(--primary)' : '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          background: (formData[field] as string[]).includes(opt) ? 'var(--primary-light)' : 'var(--bg-surface)',
          cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem',
          color: (formData[field] as string[]).includes(opt) ? 'var(--primary)' : 'var(--text-secondary)',
          fontFamily: 'inherit',
        }}>{opt}</button>
      ))}
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
              <Input label="Primary Address" placeholder="123 Office Blvd" value={formData.primaryAddress}
                onChange={e => update('primaryAddress', e.target.value)} />
              <Input label="City" placeholder="Your City" value={formData.city}
                onChange={e => update('city', e.target.value)} />
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Input label="State" placeholder="CA" value={formData.state}
                  onChange={e => update('state', e.target.value)} style={{ flex: 1 }} />
                <Input label="Zip Code" placeholder="12345" value={formData.zipCode}
                  onChange={e => update('zipCode', e.target.value)} style={{ flex: 1 }} />
              </div>
              {sectionLabel('Service Radius')}
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
            {stepHeader(<Building size={24} color="white" />, 'Company Info', 'Tell us about your business')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Company Name" placeholder="ABC Property Management" value={formData.companyName}
                onChange={e => update('companyName', e.target.value)} />
              <Input label="Your Job Title" placeholder="e.g. Operations Manager" value={formData.jobTitle}
                onChange={e => update('jobTitle', e.target.value)} />
              <Input label="Business Email" type="email" placeholder="ops@yourcompany.com" value={formData.businessEmail}
                onChange={e => update('businessEmail', e.target.value)} />
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            {stepHeader(<Layers size={24} color="white" />, 'Portfolio Details', 'Tell us about your properties')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sectionLabel('Number of Properties Managed')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                {PROPERTY_COUNT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => update('propertyCount', opt)} style={{
                    padding: 'var(--space-4)',
                    border: formData.propertyCount === opt ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: formData.propertyCount === opt ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontWeight: '700', fontSize: '1rem',
                    color: formData.propertyCount === opt ? 'var(--primary)' : 'var(--text-primary)',
                    fontFamily: 'inherit',
                  }}>{opt} properties</button>
                ))}
              </div>

              {sectionLabel('Property Types Managed')}
              {chipGrid(PROPERTY_TYPE_OPTIONS, 'propertyTypes')}

              {sectionLabel('Property Locations')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {formData.propertyLocations.map((loc, idx) => (
                  <Card key={idx} style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.875rem', color: 'var(--text-primary)' }}>Location {idx + 1}</span>
                      {idx > 0 && (
                        <button onClick={() => removeLocation(idx)} style={{
                          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)',
                        }}>
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                      <Input label="Address" placeholder="123 Property St" value={loc.address}
                        onChange={e => updateLocation(idx, 'address', e.target.value)} />
                      <Input label="City" placeholder="City" value={loc.city}
                        onChange={e => updateLocation(idx, 'city', e.target.value)} />
                      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        <Input label="State" placeholder="CA" value={loc.state}
                          onChange={e => updateLocation(idx, 'state', e.target.value)} style={{ flex: 1 }} />
                        <Input label="Zip" placeholder="12345" value={loc.zipCode}
                          onChange={e => updateLocation(idx, 'zipCode', e.target.value)} style={{ flex: 1 }} />
                      </div>
                    </div>
                  </Card>
                ))}
                <Button variant="outline" onClick={addLocation} icon={<Plus size={16} />}>Add Another Location</Button>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            {stepHeader(<Wrench size={24} color="white" />, 'Operational Preferences', 'What services do you need?')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sectionLabel('Preferred Service Types')}
              {chipGrid(SERVICE_TYPE_OPTIONS, 'preferredServiceTypes')}

              {sectionLabel('Urgency Types Handled')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {URGENCY_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => toggleList('urgencyTypes', opt)} style={{
                    padding: 'var(--space-4)',
                    border: formData.urgencyTypes.includes(opt) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: formData.urgencyTypes.includes(opt) ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontWeight: '700', fontSize: '1rem', textAlign: 'left' as const,
                    color: formData.urgencyTypes.includes(opt) ? 'var(--primary)' : 'var(--text-primary)',
                    fontFamily: 'inherit',
                  }}>{opt}</button>
                ))}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            {stepHeader(<Sliders size={24} color="white" />, 'Notifications & Payment', 'Preferences and billing setup')}
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

              {sectionLabel('Membership & Billing')}
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 var(--space-3)' }}>
                Activate your membership to start managing service jobs. You'll only be charged after jobs are completed.
              </p>
              <StripeCheckoutWrapper role="property-manager" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const stepTitles = ['Location', 'Company', 'Portfolio', 'Operations', 'Notifications'];

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
            Property Manager Setup
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

      {submitError && (<div style={{ padding: '12px', background: 'rgba(255,74,107,0.1)', border: '1px solid var(--danger)', borderRadius: '8px', color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '12px' }}>{submitError}</div>)}
      <Button variant="primary" size="lg" fullWidth onClick={handleNext} loading={isSubmitting}
        icon={<ArrowRight size={20} />}>
        {currentStep === STEP_TOTAL ? 'Complete Setup' : 'Continue'}
      </Button>
    </div>
  );
}
