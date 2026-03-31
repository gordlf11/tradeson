import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ArrowRight, User, MapPin, Wrench, FileText, Shield, CreditCard,
  Upload, Eye, EyeOff, Plus, Trash2, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';

interface LicensedTradespersonData {
  // Step 1 – Account Info
  fullName: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  profilePhotoUploaded: boolean; // MANDATORY

  // Step 2 – Business Info & Service Address
  businessName: string;
  serviceAddress: string;
  serviceCity: string;
  serviceState: string;
  serviceZip: string;

  // Step 3 – Trade Details
  primaryTrades: string[];
  subcategories: string[];
  additionalServices: string;

  // Step 4 – Coverage
  serviceRadius: string;
  areasServed: string[];
  newAreaZip: string;

  // Step 5 – Licensing & Compliance
  licenseType: string;
  licenseNumber: string;
  licenseExpirationDate: string;
  licenseDocUploaded: boolean;

  // Step 6 – Insurance & ID
  hasInsurance: string; // 'yes' | 'no' | ''
  insuranceDocUploaded: boolean;
  idUploaded: boolean;

  // Step 7 – Payout + Preferences
  businessEntityType: string;
  stripeConnectSetup: boolean;
  notifySMS: boolean;
  notifyEmail: boolean;
  notifyPush: boolean;
  marketingOptIn: boolean;
}

const PRIMARY_TRADES = ['Plumbing', 'Electrical', 'HVAC', 'General Contracting', 'Roofing', 'Carpentry', 'Masonry', 'Flooring'];
const SUBCATEGORIES: Record<string, string[]> = {
  Plumbing: ['Drain Cleaning', 'Leak Repair', 'Water Heater', 'Pipe Installation'],
  Electrical: ['Panel Upgrade', 'Outlet Installation', 'Lighting', 'Wiring'],
  HVAC: ['AC Installation', 'Furnace Repair', 'Duct Cleaning', 'Tune-up'],
  'General Contracting': ['Framing', 'Drywall', 'Demolition', 'Renovation'],
  Roofing: ['Shingle Replacement', 'Flat Roof', 'Gutters', 'Inspection'],
  Carpentry: ['Custom Cabinets', 'Trim Work', 'Decking', 'Framing'],
  Masonry: ['Brick Work', 'Concrete', 'Stone Laying', 'Foundation'],
  Flooring: ['Hardwood', 'Tile', 'Laminate', 'Carpet'],
};
const RADIUS_OPTIONS = ['10', '25', '50', '100'];
const ENTITY_TYPES = ['Sole Proprietor', 'LLC', 'S-Corp', 'C-Corp', 'Partnership'];
const LICENSE_TYPES = ['General Contractor', 'Electrician', 'Plumber', 'HVAC Technician', 'Roofer', 'Other'];

const STEP_TOTAL = 7;

const sectionLabel = (text: string) => (
  <p style={{
    fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', color: 'var(--primary)',
    marginBottom: 'var(--space-3)', marginTop: 'var(--space-5)',
  }}>{text}</p>
);

export default function LicensedTradespersonOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [formData, setFormData] = useState<LicensedTradespersonData>({
    fullName: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    profilePhotoUploaded: false,
    businessName: '',
    serviceAddress: '',
    serviceCity: '',
    serviceState: '',
    serviceZip: '',
    primaryTrades: [],
    subcategories: [],
    additionalServices: '',
    serviceRadius: '',
    areasServed: [],
    newAreaZip: '',
    licenseType: '',
    licenseNumber: '',
    licenseExpirationDate: '',
    licenseDocUploaded: false,
    hasInsurance: '',
    insuranceDocUploaded: false,
    idUploaded: false,
    businessEntityType: '',
    stripeConnectSetup: false,
    notifySMS: true,
    notifyEmail: true,
    notifyPush: false,
    marketingOptIn: false,
  });

  const update = (field: keyof LicensedTradespersonData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const toggleList = (field: 'primaryTrades' | 'subcategories', value: string) => {
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

  const handleNext = () => {
    if (currentStep < STEP_TOTAL) setCurrentStep(s => s + 1);
    else {
      localStorage.setItem('userRole', 'licensed-trade');
      localStorage.setItem('tradespersonData', JSON.stringify(formData));
      localStorage.setItem('hasOnboarded', 'true');
      navigate('/job-board');
    }
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
    else navigate(-1);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return formData.fullName && formData.phoneNumber &&
          formData.password.length >= 8 && formData.password === formData.confirmPassword &&
          formData.profilePhotoUploaded;
      case 2:
        return formData.businessName && formData.serviceAddress && formData.serviceCity &&
          formData.serviceState && formData.serviceZip;
      case 3:
        return formData.primaryTrades.length > 0;
      case 4:
        return formData.serviceRadius && formData.areasServed.length > 0;
      case 5:
        return formData.licenseType && formData.licenseNumber &&
          formData.licenseExpirationDate && formData.licenseDocUploaded;
      case 6:
        return formData.hasInsurance !== '' && formData.idUploaded;
      case 7:
        return formData.businessEntityType;
      default:
        return false;
    }
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

  const uploadButton = (uploaded: boolean, field: keyof LicensedTradespersonData, label: string) => (
    <Card style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
      {!uploaded ? (
        <>
          <Upload size={32} color="var(--text-secondary)" style={{ margin: '0 auto var(--space-3)' }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>{label}</p>
          <Button variant="outline" onClick={() => update(field, true)} icon={<Upload size={16} />}>Upload</Button>
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
            {stepHeader(<User size={24} color="white" />, 'Your Account', 'Profile photo required for tradespeople')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Full Name" placeholder="John Smith" value={formData.fullName}
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

              {sectionLabel('Profile Photo (required)')}
              <Card style={{
                padding: 'var(--space-4)', textAlign: 'center',
                border: !formData.profilePhotoUploaded ? '2px dashed var(--danger)' : '2px solid var(--success)',
              }}>
                {!formData.profilePhotoUploaded ? (
                  <>
                    <Upload size={32} color="var(--danger)" style={{ margin: '0 auto var(--space-3)' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: 'var(--space-3)', fontWeight: '600' }}>
                      A profile photo is required for tradespeople
                    </p>
                    <Button variant="primary" onClick={() => update('profilePhotoUploaded', true)} icon={<Upload size={16} />}>
                      Upload Photo
                    </Button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                    <CheckCircle size={20} color="var(--success)" />
                    <p style={{ color: 'var(--success)', fontWeight: '600', margin: 0 }}>Photo uploaded ✓</p>
                  </div>
                )}
              </Card>
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            {stepHeader(<MapPin size={24} color="white" />, 'Business Info', 'Your business & base address')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Input label="Business Name" placeholder="Smith Plumbing LLC" value={formData.businessName}
                onChange={e => update('businessName', e.target.value)} />
              <Input label="Service Base Address" placeholder="123 Trade St" value={formData.serviceAddress}
                onChange={e => update('serviceAddress', e.target.value)} />
              <Input label="City" placeholder="Your City" value={formData.serviceCity}
                onChange={e => update('serviceCity', e.target.value)} />
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <Input label="State" placeholder="CA" value={formData.serviceState}
                  onChange={e => update('serviceState', e.target.value)} style={{ flex: 1 }} />
                <Input label="Zip Code" placeholder="12345" value={formData.serviceZip}
                  onChange={e => update('serviceZip', e.target.value)} style={{ flex: 1 }} />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            {stepHeader(<Wrench size={24} color="white" />, 'Trade Details', 'What services do you offer?')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sectionLabel('Primary Trade(s)')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                {PRIMARY_TRADES.map(trade => (
                  <button key={trade} onClick={() => toggleList('primaryTrades', trade)} style={{
                    padding: 'var(--space-3)',
                    border: formData.primaryTrades.includes(trade) ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: formData.primaryTrades.includes(trade) ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontWeight: '600', fontSize: '0.875rem',
                    color: formData.primaryTrades.includes(trade) ? 'var(--primary)' : 'var(--text-secondary)',
                    fontFamily: 'inherit',
                  }}>{trade}</button>
                ))}
              </div>

              {formData.primaryTrades.length > 0 && (
                <>
                  {sectionLabel('Subcategories')}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {formData.primaryTrades.map(trade => (
                      <div key={trade}>
                        <p style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>{trade}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
                          {(SUBCATEGORIES[trade] || []).map(sub => (
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
                placeholder="Describe any additional services not listed above…"
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

      case 4:
        return (
          <div>
            {stepHeader(<MapPin size={24} color="white" />, 'Coverage Area', 'Where do you work?')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sectionLabel('Service Radius (miles from base)')}
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
              {formData.areasServed.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Add at least one zip code to define your service area
                </p>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            {stepHeader(<FileText size={24} color="white" />, 'Licensing', 'Verify your credentials')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: 'var(--space-2)', color: 'var(--text-primary)' }}>
                  License Type
                </label>
                <select value={formData.licenseType} onChange={e => update('licenseType', e.target.value)}
                  style={{
                    width: '100%', padding: 'var(--space-3) var(--space-4)',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                    fontFamily: 'inherit', fontSize: '1rem', color: 'var(--text-primary)',
                    background: 'var(--bg-surface)',
                  }}>
                  <option value="">Select license type…</option>
                  {LICENSE_TYPES.map(lt => <option key={lt} value={lt}>{lt}</option>)}
                </select>
              </div>
              <Input label="License Number" placeholder="e.g. LIC-123456" value={formData.licenseNumber}
                onChange={e => update('licenseNumber', e.target.value)} />
              <Input label="License Expiration Date" type="date" placeholder="MM/DD/YYYY"
                value={formData.licenseExpirationDate}
                onChange={e => update('licenseExpirationDate', e.target.value)} />

              {sectionLabel('License Document Upload')}
              {uploadButton(formData.licenseDocUploaded, 'licenseDocUploaded', 'Upload your license (PDF, JPG, PNG — max 10MB)')}
            </div>
          </div>
        );

      case 6:
        return (
          <div>
            {stepHeader(<Shield size={24} color="white" />, 'Insurance & ID', 'Build trust with clients')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {sectionLabel('Do you carry liability insurance?')}
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                {['yes', 'no'].map(opt => (
                  <button key={opt} onClick={() => update('hasInsurance', opt)} style={{
                    flex: 1, padding: 'var(--space-4)',
                    border: formData.hasInsurance === opt ? '2px solid var(--primary)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    background: formData.hasInsurance === opt ? 'var(--primary-light)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontWeight: '700', fontSize: '1rem',
                    color: formData.hasInsurance === opt ? 'var(--primary)' : 'var(--text-primary)',
                    fontFamily: 'inherit', textTransform: 'capitalize' as const,
                  }}>{opt === 'yes' ? 'Yes' : 'No'}</button>
                ))}
              </div>

              {formData.hasInsurance === 'yes' && (
                <>
                  {sectionLabel('Proof of Insurance')}
                  {uploadButton(formData.insuranceDocUploaded, 'insuranceDocUploaded', 'Upload your insurance certificate (PDF, JPG, PNG)')}
                </>
              )}

              {sectionLabel('Identity Verification (required)')}
              {uploadButton(formData.idUploaded, 'idUploaded', 'Upload a government-issued ID (Driver\'s license, Passport)')}
            </div>
          </div>
        );

      case 7:
        return (
          <div>
            {stepHeader(<CreditCard size={24} color="white" />, 'Payout & Preferences', 'Get paid and stay informed')}
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

              {sectionLabel('Payout Setup (Stripe Connect)')}
              <Card style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                {!formData.stripeConnectSetup ? (
                  <>
                    <CreditCard size={32} color="var(--text-secondary)" style={{ margin: '0 auto var(--space-3)' }} />
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                      Connect your bank account via Stripe to receive payments
                    </p>
                    <Button variant="primary" onClick={() => update('stripeConnectSetup', true)}>
                      Connect Bank Account
                    </Button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)' }}>
                    <CheckCircle size={20} color="var(--success)" />
                    <p style={{ color: 'var(--success)', fontWeight: '600', margin: 0 }}>Payout account connected ✓</p>
                  </div>
                )}
              </Card>

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

  const stepTitles = ['Account', 'Business', 'Trade Details', 'Coverage', 'Licensing', 'Insurance & ID', 'Payout'];

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
            Licensed Tradesperson Setup
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
        disabled={!isStepValid()} icon={<ArrowRight size={20} />}>
        {currentStep === STEP_TOTAL ? 'Complete Setup' : 'Continue'}
      </Button>
    </div>
  );
}
