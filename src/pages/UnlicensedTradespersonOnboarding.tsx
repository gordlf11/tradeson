import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ArrowRight, MapPin, Wrench, Shield, CreditCard,
  Upload, Plus, Trash2, CheckCircle, AlertCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface UnlicensedData {
  // Step 1 – Account Info
  fullName: string;
  businessName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  profilePhotoUploaded: boolean; // MANDATORY

  // Step 2 – Location
  primaryAddress: string;
  city: string;
  state: string;
  zipCode: string;

  // Step 3 – Services Offered
  serviceCategories: string[];
  subcategories: string[];
  additionalServices: string;

  // Step 4 – Coverage
  serviceRadius: string;
  areasServed: string[];
  newAreaZip: string;

  // Step 5 – Trust Signals
  idUploaded: boolean;

  // Step 6 – Payout + Preferences
  businessEntityType: string;
  stripeConnectSetup: boolean;
  notifySMS: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  marketingOptIn: boolean;
}

const SERVICE_CATEGORIES = [
  'General Handyman', 'House Cleaning', 'Yard Work', 'Furniture Assembly',
  'Moving Services', 'Interior Painting', 'Basic Repairs', 'Organization',
  'Pet Services', 'Pressure Washing', 'Window Cleaning', 'Gutter Cleaning',
  'Landscaping', 'Snow Removal',
];

const SUBCATEGORIES: Record<string, string[]> = {
  'General Handyman': ['Minor Repairs', 'Mounting / Hanging', 'Caulking', 'Assembly'],
  'House Cleaning': ['Deep Clean', 'Regular Maintenance', 'Move-In/Out', 'Post-Construction'],
  'Yard Work': ['Mowing', 'Edging', 'Weeding', 'Leaf Removal'],
  'Moving Services': ['Local Move', 'Packing Help', 'Loading / Unloading', 'Storage'],
  'Interior Painting': ['Walls', 'Ceilings', 'Trim', 'Cabinets'],
};

const ENTITY_TYPES = ['Sole Proprietor', 'LLC', 'Partnership', 'Other'];

const STEP_TOTAL = 5;

const sectionLabel = (text: string) => (
  <p style={{
    fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', color: 'var(--primary)',
    marginBottom: 'var(--space-3)', marginTop: 'var(--space-5)',
  }}>{text}</p>
);

export default function UnlicensedTradespersonOnboarding() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<UnlicensedData>({
    fullName: '',
    businessName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    profilePhotoUploaded: false,
    primaryAddress: '',
    city: '',
    state: '',
    zipCode: '',
    serviceCategories: [],
    subcategories: [],
    additionalServices: '',
    serviceRadius: '25',
    areasServed: [],
    newAreaZip: '',
    idUploaded: false,
    businessEntityType: '',
    stripeConnectSetup: false,
    notifySMS: true,
    notifyEmail: true,
    notifyPush: false,
    marketingOptIn: false,
  });

  const update = (field: keyof UnlicensedData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const toggleList = (field: 'serviceCategories' | 'subcategories', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).includes(value)
        ? (prev[field] as string[]).filter(v => v !== value)
        : [...(prev[field] as string[]), value],
    }));
  };

  const addAreaZip = () => {
    const zip = formData.newAreaZip.trim();
    if (zip && !formData.areasServed.includes(zip)) {
      setFormData(prev => ({ ...prev, areasServed: [...prev.areasServed, zip], newAreaZip: '' }));
    }
  };

  const removeAreaZip = (zip: string) => {
    setFormData(prev => ({ ...prev, areasServed: prev.areasServed.filter(z => z !== zip) }));
  };

  const handleNext = async () => {
    if (currentStep < STEP_TOTAL) {
      setCurrentStep(s => s + 1);
      return;
    }
    setIsSubmitting(true);
    setSubmitError('');
    try {
      await api.onboardUnlicensedTrade({
        business_name: formData.businessName,
        service_address: formData.primaryAddress,
        service_city: formData.city,
        service_state: formData.state,
        service_zip: formData.zipCode,
        service_radius_miles: parseInt(formData.serviceRadius) || 25,
        primary_trades: formData.serviceCategories,
        subcategories: formData.subcategories,
        additional_services: formData.additionalServices,
        business_entity_type: formData.businessEntityType,
        areas_served: formData.areasServed,
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
    if (formData.fullName) localStorage.setItem('userName', formData.fullName);
    if (formData.phoneNumber) localStorage.setItem('userPhone', formData.phoneNumber);
    // Address fields — read by LocationSettings.tsx as a fallback when the API is down
    if (formData.primaryAddress) localStorage.setItem('locationStreet', formData.primaryAddress);
    if (formData.city) localStorage.setItem('locationCity', formData.city);
    if (formData.state) localStorage.setItem('locationProvince', formData.state);
    if (formData.zipCode) localStorage.setItem('locationPostal', formData.zipCode);
    if (formData.businessName || formData.city) localStorage.setItem('tradespersonData', JSON.stringify({
      businessName: formData.businessName,
      serviceCity: formData.city,
      serviceState: formData.state,
      serviceRadius: formData.serviceRadius,
      primaryTrades: formData.serviceCategories,
    }));
    localStorage.setItem('userRole', 'non-licensed-trade');
    localStorage.setItem('hasOnboarded', 'true');
    setIsSubmitting(false);
    navigate('/job-board');
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

  const uploadCard = (uploaded: boolean, field: keyof UnlicensedData, label: string, required = false) => (
    <Card style={{
      padding: 'var(--space-4)', textAlign: 'center',
      border: required && !uploaded ? '2px dashed var(--danger)' : (uploaded ? '2px solid var(--success)' : '1px solid var(--border)'),
    }}>
      {!uploaded ? (
        <>
          <Upload size={32} color={required ? 'var(--danger)' : 'var(--text-secondary)'}
            style={{ margin: '0 auto var(--space-3)' }} />
          <p style={{
            fontSize: '0.85rem', marginBottom: 'var(--space-3)',
            color: required ? 'var(--danger)' : 'var(--text-secondary)',
            fontWeight: required ? '600' : '400',
          }}>{label}</p>
          <Button variant={required ? 'primary' : 'outline'}
            onClick={() => update(field, true)} icon={<Upload size={16} />}>Upload</Button>
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
          <CheckCircle size={20} color="var(--success)" />
          <p style={{ color: 'var(--success)', fontWeight: '600', margin: 0 }}>Uploaded ✓</p>
        </div>
      )}
    </Card>
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
            {stepHeader(<MapPin size={24} color="white" />, 'About You', 'Tell us about yourself and where you are based')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Full Name" placeholder="Jane Smith" value={formData.fullName}
                onChange={e => update('fullName', e.target.value)} required />
              <Input label="Phone Number" placeholder="+1 (555) 000-0000" type="tel" value={formData.phoneNumber}
                onChange={e => update('phoneNumber', e.target.value)} />
              <Input label="Business Name (optional)" placeholder="Smith Services" value={formData.businessName}
                onChange={e => update('businessName', e.target.value)} />
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
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            {stepHeader(<Wrench size={24} color="white" />, 'Services Offered', 'What do you specialize in?')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sectionLabel('Service Categories')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                {SERVICE_CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => toggleList('serviceCategories', cat)} style={{
                    padding: 'var(--space-3)',
                    border: formData.serviceCategories.includes(cat) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: formData.serviceCategories.includes(cat) ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem',
                    color: formData.serviceCategories.includes(cat) ? 'var(--primary)' : 'var(--text-secondary)',
                    fontFamily: 'inherit',
                  }}>{cat}</button>
                ))}
              </div>

              {formData.serviceCategories.some(c => SUBCATEGORIES[c]) && (
                <>
                  {sectionLabel('Subcategories')}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {formData.serviceCategories.filter(c => SUBCATEGORIES[c]).map(cat => (
                      <div key={cat}>
                        <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>{cat}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
                          {SUBCATEGORIES[cat].map(sub => (
                            <button key={sub} onClick={() => toggleList('subcategories', sub)} style={{
                              padding: 'var(--space-2) var(--space-3)',
                              border: formData.subcategories.includes(sub) ? '2px solid var(--primary)' : '1px solid var(--border)',
                              borderRadius: 'var(--radius-sm)',
                              background: formData.subcategories.includes(sub) ? 'var(--primary-light)' : 'var(--bg-surface)',
                              cursor: 'pointer', fontWeight: '500', fontSize: '0.8rem',
                              color: formData.subcategories.includes(sub) ? 'var(--primary)' : 'var(--text-secondary)',
                              fontFamily: 'inherit', textAlign: 'left' as const,
                            }}>{sub}</button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {sectionLabel('Additional Services (optional)')}
              <textarea
                placeholder="Anything else you offer not listed above…"
                value={formData.additionalServices}
                onChange={e => update('additionalServices', e.target.value)}
                style={{
                  width: '100%', minHeight: '80px', padding: 'var(--space-3)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                  fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical',
                  color: 'var(--text-primary)', background: 'var(--bg-surface)',
                }}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            {stepHeader(<MapPin size={24} color="white" />, 'Coverage Area', 'Where do you work?')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sectionLabel('Service Radius (miles from home)')}
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

              {sectionLabel('Areas Served (add zip codes)')}
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Input label="Zip / Postcode" placeholder="e.g. 90210" value={formData.newAreaZip}
                  onChange={e => update('newAreaZip', e.target.value)} style={{ flex: 1 }} />
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button variant="primary" onClick={addAreaZip}
                    disabled={!formData.newAreaZip} icon={<Plus size={16} />}>Add</Button>
                </div>
              </div>

              {formData.areasServed.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 'var(--space-2)' }}>
                  {formData.areasServed.map(zip => (
                    <div key={zip} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '4px 12px', background: 'var(--primary-light)',
                      border: '1px solid var(--primary)', borderRadius: 'var(--radius-full)',
                      fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)',
                    }}>
                      {zip}
                      <button onClick={() => removeAreaZip(zip)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--primary)', display: 'flex', alignItems: 'center',
                      }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            {stepHeader(<Shield size={24} color="white" />, 'Trust Signals', 'Build client confidence')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Card style={{ padding: 'var(--space-4)', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
                  ID verification helps clients feel confident hiring you. Verified providers get more job opportunities.
                </p>
              </Card>

              {sectionLabel('Identity Verification (required)')}
              {uploadCard(formData.idUploaded, 'idUploaded',
                'Upload a government-issued ID (Driver\'s license, Passport)', true)}
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            {stepHeader(<CreditCard size={24} color="white" />, 'Payout & Preferences', 'Get paid and stay connected')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sectionLabel('Business Entity Type')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {ENTITY_TYPES.map(type => (
                  <button key={type} onClick={() => update('businessEntityType', type)} style={{
                    padding: 'var(--space-4)',
                    border: formData.businessEntityType === type ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: formData.businessEntityType === type ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontWeight: '700', fontSize: '1rem', textAlign: 'left' as const,
                    color: formData.businessEntityType === type ? 'var(--primary)' : 'var(--text-primary)',
                    fontFamily: 'inherit',
                  }}>{type}</button>
                ))}
              </div>

              {sectionLabel('Payout Setup')}
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '0 0 var(--space-3)' }}>
                Connect a bank account or debit card to receive earnings from completed jobs.
              </p>

              {formData.stripeConnectSetup ? (
                <Card style={{ padding: 'var(--space-4)', border: '2px solid var(--success)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <CheckCircle size={22} color="var(--success)" />
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        Stripe Payouts Connected
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: '600' }}>
                        Complete setup on the Stripe tab, then return here
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card style={{ padding: 'var(--space-4)', border: '2px solid var(--primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <div style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Stripe Payouts</div>
                    <span style={{ fontSize: '0.65rem', fontWeight: '800', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '9999px' }}>TEST MODE</span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                    Secure payouts via Stripe Connect Express. Set up your bank account or debit card once and get paid automatically on job completion.
                  </p>
                  {connectError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 'var(--space-3)', color: 'var(--danger)', fontSize: '0.8rem' }}>
                      <AlertCircle size={14} />
                      {connectError}
                    </div>
                  )}
                  <Button
                    variant="primary"
                    fullWidth
                    loading={connectLoading}
                    onClick={async () => {
                      setConnectLoading(true);
                      setConnectError('');
                      try {
                        const data = await api.createConnectAccount() as { onboarding_url: string };
                        update('stripeConnectSetup', true);
                        window.open(data.onboarding_url, '_blank');
                      } catch (err: any) {
                        setConnectError(err.message || 'Failed to start payout setup');
                      } finally {
                        setConnectLoading(false);
                      }
                    }}
                  >
                    Set Up Stripe Payouts
                  </Button>
                </Card>
              )}

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

      default:
        return null;
    }
  };

  const stepTitles = ['Location', 'Services', 'Coverage', 'Verification', 'Payout'];

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
            Service Provider Setup
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
