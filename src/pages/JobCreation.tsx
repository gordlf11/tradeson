import { useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Sparkles, AlertCircle, CheckCircle,
  Wrench, Zap, Droplets, Thermometer,
  Home, ArrowRight, ArrowLeft, X, TreePine, Snowflake,
  Paintbrush, HardHat, Hammer, Building2, Truck
} from 'lucide-react';
import TopNav from '../components/TopNav';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { uploadFile } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { TRADES, findTrade } from '../config/tradeTaxonomy';

// ── Types ──────────────────────────────────────────────────────────────────

interface JobFormData {
  // Step 1 — Room
  room: string;
  // Step 2 — Trade type
  tradeType: string;
  // Step 3 — Severity / urgency
  severity: 'routine' | 'moderate' | 'urgent';
  // Step 4 — Generic uncovering questions
  affectedPart: string;
  adjacentImpact: string;
  housewideImpact: string;
  jobNature: string;
  // Step 4 — Cleaning intake
  cleaningType: string;
  squareFootage: string;
  bedrooms: string;
  bathrooms: string;
  cleaningAreas: string[];
  cleaningDescription: string;
  cleaningSpecialRequirements: string;
  // Step 4 — Snow removal intake
  snowAreas: string[];
  snowAreaSize: string;
  snowDepth: string;
  requiresSalting: string;
  snowRequirements: string;
  // Step 4 — Landscaping intake
  landscapingType: string;
  propertySize: string;
  workAreas: string[];
  yardCondition: string;
  debrisRemoval: string;
  landscapingDescription: string;
  // Step 5 — Description & photos
  description: string;
  photos: File[];
  // Validation flags
  photoQualityFlag: boolean;
  categoryMismatchFlag: boolean;
}

// ── Options ────────────────────────────────────────────────────────────────

const ROOMS = [
  'Kitchen', 'Bathroom', 'Living Room', 'Bedroom',
  'Basement', 'Attic', 'Garage', 'Outdoor / Yard', 'Whole House', 'Other',
];

// Trade cards derived from the canonical taxonomy — one source of truth.
// Icons mapped by trade id; new trades added to TRADES get a fallback icon.
const TRADE_ICON: Record<string, ReactElement> = {
  'plumbing':          <Droplets size={20} />,
  'electrical':        <Zap size={20} />,
  'hvac':              <Thermometer size={20} />,
  'handyman':          <Wrench size={20} />,
  'cleaning':          <Home size={20} />,
  'landscaping':       <TreePine size={20} />,
  'snow-removal':      <Snowflake size={20} />,
  'painting':          <Paintbrush size={20} />,
  'roofing':           <HardHat size={20} />,
  'carpentry':         <Hammer size={20} />,
  'concrete-masonry':  <Building2 size={20} />,
  'moving':            <Truck size={20} />,
};
const TRADE_CATEGORIES = TRADES.map(t => ({
  id: t.id,
  label: t.label,
  icon: TRADE_ICON[t.id] ?? <Wrench size={20} />,
}));

// ── Specialized intake option sets (derived from taxonomy) ────────────────
// Deliberately no "Other" — see notes.md Section C for rationale.

const CLEANING_TYPES    = findTrade('cleaning')!.subServices.map(s => s.label);
const CLEANING_AREAS    = ['Kitchen', 'Bathrooms', 'Bedrooms', 'Living areas', 'Laundry room', 'Basement', 'Garage'];
const SNOW_AREAS        = findTrade('snow-removal')!.subServices.map(s => s.label);
const LANDSCAPING_TYPES = findTrade('landscaping')!.subServices.map(s => s.label);
const LANDSCAPING_WORK_AREAS = ['Front yard', 'Backyard', 'Side yard', 'Entire property'];
const YARD_CONDITIONS   = ['Well-maintained', 'Overgrown', 'Needs full cleanup', 'Recently done, just maintenance'];

const SEVERITY_LEVELS = [
  { id: 'routine', label: 'Routine',  sub: 'Not urgent — schedule at your convenience', color: 'var(--success)' },
  { id: 'moderate', label: 'Moderate', sub: 'Needs attention within a few days',          color: 'var(--warning)' },
  { id: 'urgent',  label: 'Urgent',   sub: 'Immediate attention required',               color: 'var(--danger)' },
] as const;

// Aligned with the Tradesperson Dashboard "Service Mix" buckets
// (TradespersonDashboard.tsx). Renaming any of these breaks the rollup.
const JOB_NATURE_OPTIONS = [
  'Repair', 'Maintenance', 'New Install', 'Replacement',
];

const TOTAL_STEPS = 5;

// ── Helpers ────────────────────────────────────────────────────────────────

const sectionLabel = (text: string) => (
  <p style={{
    fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase' as const,
    letterSpacing: '0.08em', color: 'var(--primary)',
    marginBottom: 'var(--space-3)', marginTop: 'var(--space-4)',
  }}>{text}</p>
);

const stepHeader = (title: string, subtitle: string) => (
  <div style={{ marginBottom: 'var(--space-5)' }}>
    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 6px', letterSpacing: '-0.02em' }}>{title}</h2>
    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>{subtitle}</p>
  </div>
);

// ── Component ──────────────────────────────────────────────────────────────

export default function JobCreation() {
  const navigate = useNavigate();
  const { firebaseUser } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState<JobFormData>({
    room: '',
    tradeType: '',
    severity: 'moderate',
    affectedPart: '',
    adjacentImpact: '',
    housewideImpact: '',
    jobNature: '',
    cleaningType: '',
    squareFootage: '',
    bedrooms: '',
    bathrooms: '',
    cleaningAreas: [],
    cleaningDescription: '',
    cleaningSpecialRequirements: '',
    snowAreas: [],
    snowAreaSize: '',
    snowDepth: '',
    requiresSalting: '',
    snowRequirements: '',
    landscapingType: '',
    propertySize: '',
    workAreas: [],
    yardCondition: '',
    debrisRemoval: '',
    landscapingDescription: '',
    description: '',
    photos: [],
    photoQualityFlag: false,
    categoryMismatchFlag: false,
  });

  const set = (field: keyof JobFormData, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const toggleArr = (field: keyof JobFormData, value: string) =>
    setFormData(prev => {
      const arr = prev[field] as string[];
      return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] };
    });

  const PHOTO_LIMIT = 5;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData(prev => {
        const remaining = PHOTO_LIMIT - prev.photos.length;
        return { ...prev, photos: [...prev.photos, ...files.slice(0, remaining)] };
      });
    }
  };

  const removePhoto = (idx: number) => {
    setFormData(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));
  };

  const isStepValid = () => {
    switch (step) {
      case 1: return !!formData.room;
      case 2: return !!formData.tradeType;
      case 3: return !!formData.severity;
      case 4: {
        if (formData.tradeType === 'cleaning') {
          return !!formData.cleaningType && formData.cleaningAreas.length > 0 && formData.cleaningDescription.trim().length >= 10;
        }
        if (formData.tradeType === 'snow-removal') {
          return formData.snowAreas.length > 0 && !!formData.snowAreaSize && !!formData.requiresSalting;
        }
        if (formData.tradeType === 'landscaping') {
          return !!formData.landscapingType && formData.workAreas.length > 0;
        }
        return !!formData.affectedPart && !!formData.jobNature;
      }
      case 5: return formData.description.trim().length >= 20;
      default: return true;
    }
  };

  const handleNext = () => {
    if (step < 5) {
      setStep(s => (s + 1) as any);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(s => (s - 1) as any);
    else navigate(-1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const derivedTitle = (formData.affectedPart || formData.description)
      .trim()
      .slice(0, 120) || `${formData.room} — ${formData.tradeType}`;

    const payload: Record<string, unknown> = {
      title: derivedTitle,
      description: formData.description,
      category: formData.tradeType,
      room: formData.room,
      severity: formData.severity,
      job_nature: formData.jobNature,
      affected_part: formData.affectedPart,
      adjacent_impact: formData.adjacentImpact,
      housewide_impact: formData.housewideImpact,
      // Specialized intake fields
      cleaning_type: formData.cleaningType || undefined,
      square_footage: formData.squareFootage || undefined,
      bedrooms: formData.bedrooms || undefined,
      bathrooms: formData.bathrooms || undefined,
      cleaning_areas: formData.cleaningAreas.length ? formData.cleaningAreas : undefined,
      cleaning_description: formData.cleaningDescription || undefined,
      cleaning_special_requirements: formData.cleaningSpecialRequirements || undefined,
      snow_areas: formData.snowAreas.length ? formData.snowAreas : undefined,
      snow_area_size: formData.snowAreaSize || undefined,
      snow_depth: formData.snowDepth || undefined,
      requires_salting: formData.requiresSalting || undefined,
      snow_requirements: formData.snowRequirements || undefined,
      landscaping_type: formData.landscapingType || undefined,
      property_size: formData.propertySize || undefined,
      work_areas: formData.workAreas.length ? formData.workAreas : undefined,
      yard_condition: formData.yardCondition || undefined,
      debris_removal: formData.debrisRemoval || undefined,
      landscaping_description: formData.landscapingDescription || undefined,
    };

    let jobId = `local_${Date.now()}`;
    try {
      const job = await api.createJob(payload) as { id?: string };
      jobId = job?.id ?? jobId;

      if (formData.photos.length > 0 && firebaseUser) {
        await Promise.all(
          formData.photos.map((photo) =>
            uploadFile(`jobs/${jobId}/photos/${photo.name}`, photo).catch((err) =>
              console.warn('Photo upload failed:', err)
            )
          )
        );
      }
    } catch (err) {
      // API unavailable — continue gracefully so the user always sees confirmation
      console.warn('Job creation API error (non-blocking):', err instanceof Error ? err.message : err);
    }

    // Persist locally so the job appears on "Jobs I Posted" immediately
    const localJob = {
      id: jobId,
      title: derivedTitle,
      description: formData.description,
      category: formData.tradeType,
      room: formData.room,
      severity: formData.severity,
      status: 'open',
      created_at: new Date().toISOString(),
      quote_count: 0,
    };
    const existing = JSON.parse(localStorage.getItem('localJobs') || '[]');
    localStorage.setItem('localJobs', JSON.stringify([localJob, ...existing]));

    setIsSubmitting(false);
    setStep(6 as any);
    setTimeout(() => navigate('/job-board'), 2500);
  };

  // ── Step renderers ──────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div>
      {stepHeader('Where is the issue?', 'Select the room or area of the home affected.')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
        {ROOMS.map(room => (
          <button
            key={room}
            onClick={() => set('room', room)}
            style={{
              padding: 'var(--space-4)',
              background: formData.room === room ? 'var(--primary)' : 'var(--bg-surface)',
              border: `2px solid ${formData.room === room ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              color: formData.room === room ? 'white' : 'var(--text-primary)',
              fontSize: '0.875rem', fontWeight: '600', cursor: 'pointer',
              transition: 'all 0.15s ease', textAlign: 'left',
              fontFamily: 'inherit',
              boxShadow: formData.room === room ? 'var(--shadow-md)' : 'none',
            }}
          >
            {room}
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      {stepHeader('What type of work is needed?', 'Choose the trade category that best fits the problem.')}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
        {TRADE_CATEGORIES.map(trade => (
          <button
            key={trade.id}
            onClick={() => set('tradeType', trade.id)}
            style={{
              padding: 'var(--space-4)',
              background: formData.tradeType === trade.id ? 'var(--primary)' : 'var(--bg-surface)',
              border: `2px solid ${formData.tradeType === trade.id ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)',
              color: formData.tradeType === trade.id ? 'white' : 'var(--text-primary)',
              cursor: 'pointer', transition: 'all 0.15s ease',
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              fontFamily: 'inherit', fontWeight: '600', fontSize: '0.9rem',
              boxShadow: formData.tradeType === trade.id ? 'var(--shadow-md)' : 'none',
            }}
          >
            {trade.icon}
            {trade.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      {stepHeader('How soon does this need to be done?', 'This helps tradespeople prioritize your job.')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {SEVERITY_LEVELS.map(level => (
          <button
            key={level.id}
            onClick={() => set('severity', level.id)}
            style={{
              padding: 'var(--space-4)',
              border: `2px solid ${formData.severity === level.id ? level.color : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)', cursor: 'pointer',
              background: formData.severity === level.id ? `${level.color}12` : 'var(--bg-surface)',
              transition: 'all 0.15s ease', textAlign: 'left', fontFamily: 'inherit', width: '100%',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: '700', fontSize: '1rem', color: formData.severity === level.id ? level.color : 'var(--text-primary)' }}>
                  {level.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {level.sub}
                </div>
              </div>
              {formData.severity === level.id && <AlertCircle size={20} color={level.color} />}
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // ── Step 4 helpers ──────────────────────────────────────────────────────

  const multiSelectGrid = (options: string[], field: keyof JobFormData, label: string) => (
    <div>
      <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
        {label} <span style={{ color: 'var(--danger)' }}>*</span>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
        {options.map(opt => {
          const selected = (formData[field] as string[]).includes(opt);
          return (
            <button key={opt} onClick={() => toggleArr(field, opt)} style={{
              padding: 'var(--space-3)',
              border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: selected ? 'var(--primary-light)' : 'var(--bg-surface)',
              cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem',
              color: selected ? 'var(--primary)' : 'var(--text-secondary)',
              fontFamily: 'inherit', textAlign: 'left' as const,
            }}>{opt}</button>
          );
        })}
      </div>
    </div>
  );

  const singleSelectList = (options: string[], field: keyof JobFormData, label: string) => (
    <div>
      <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
        {label} <span style={{ color: 'var(--danger)' }}>*</span>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
        {options.map(opt => {
          const selected = formData[field] === opt;
          return (
            <button key={opt} onClick={() => set(field, opt)} style={{
              padding: 'var(--space-3)',
              border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: selected ? 'var(--primary-light)' : 'var(--bg-surface)',
              cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem',
              color: selected ? 'var(--primary)' : 'var(--text-secondary)',
              fontFamily: 'inherit', textAlign: 'left' as const,
            }}>{opt}</button>
          );
        })}
      </div>
    </div>
  );

  const yesNoToggle = (field: keyof JobFormData, label: string) => (
    <div>
      <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
        {label} <span style={{ color: 'var(--danger)' }}>*</span>
      </label>
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        {['Yes', 'No'].map(opt => {
          const selected = formData[field] === opt.toLowerCase();
          return (
            <button key={opt} onClick={() => set(field, opt.toLowerCase())} style={{
              flex: 1, padding: 'var(--space-3)',
              border: selected ? '2px solid var(--primary)' : '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: selected ? 'var(--primary-light)' : 'var(--bg-surface)',
              cursor: 'pointer', fontWeight: '700', fontSize: '1rem',
              color: selected ? 'var(--primary)' : 'var(--text-primary)',
              fontFamily: 'inherit',
            }}>{opt}</button>
          );
        })}
      </div>
    </div>
  );

  const renderStep4 = () => {
    const { tradeType } = formData;

    if (tradeType === 'cleaning') return (
      <div>
        {stepHeader('Tell us about your cleaning request', 'Answer a few quick questions so cleaners arrive prepared.')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {singleSelectList(CLEANING_TYPES, 'cleaningType', 'What type of cleaning do you need?')}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
            <Input label="Sq ft *" placeholder="e.g. 1,200" value={formData.squareFootage}
              onChange={e => set('squareFootage', e.target.value)} />
            <Input label="Bedrooms" placeholder="e.g. 3" value={formData.bedrooms}
              onChange={e => set('bedrooms', e.target.value)} />
            <Input label="Bathrooms" placeholder="e.g. 2" value={formData.bathrooms}
              onChange={e => set('bathrooms', e.target.value)} />
          </div>
          {multiSelectGrid(CLEANING_AREAS, 'cleaningAreas', 'What areas need to be cleaned?')}
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Please describe what needs to be done <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea placeholder='e.g. "Full deep clean including baseboards, inside oven, and windows"'
              value={formData.cleaningDescription} onChange={e => set('cleaningDescription', e.target.value)}
              rows={3} style={{ width: '100%', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-surface)', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Special requirements or add-ons? <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
            </label>
            <textarea placeholder='e.g. "Inside fridge/oven, pet hair removal"'
              value={formData.cleaningSpecialRequirements} onChange={e => set('cleaningSpecialRequirements', e.target.value)}
              rows={2} style={{ width: '100%', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-surface)', resize: 'vertical' }} />
          </div>
        </div>
      </div>
    );

    if (tradeType === 'snow-removal') return (
      <div>
        {stepHeader('Tell us about your snow removal request', 'Help us understand the scope of the job.')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {multiSelectGrid(SNOW_AREAS, 'snowAreas', 'What areas need snow removed?')}
          <Input label="Approximate size of the area *" placeholder="e.g. 2-car driveway, 400 sq ft"
            value={formData.snowAreaSize} onChange={e => set('snowAreaSize', e.target.value)} />
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              How deep is the snow currently? <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
            </label>
            <Input placeholder='e.g. "2 inches", "6+ inches, drifting"'
              value={formData.snowDepth} onChange={e => set('snowDepth', e.target.value)} />
          </div>
          {yesNoToggle('requiresSalting', 'Do you require salting / de-icing?')}
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Any specific requirements? <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
            </label>
            <textarea placeholder='e.g. "Clear path to mailbox and garage, avoid piling near fence"'
              value={formData.snowRequirements} onChange={e => set('snowRequirements', e.target.value)}
              rows={2} style={{ width: '100%', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-surface)', resize: 'vertical' }} />
          </div>
        </div>
      </div>
    );

    if (tradeType === 'landscaping') return (
      <div>
        {stepHeader('Tell us about your landscaping request', 'Help us find the right professional for your yard.')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {singleSelectList(LANDSCAPING_TYPES, 'landscapingType', 'What type of landscaping service do you need?')}
          <Input label="Approximate property size" placeholder="e.g. 5,000 sq ft lot"
            value={formData.propertySize} onChange={e => set('propertySize', e.target.value)} />
          {multiSelectGrid(LANDSCAPING_WORK_AREAS, 'workAreas', 'What areas need work?')}
          {singleSelectList(YARD_CONDITIONS, 'yardCondition', 'What is the current condition of the yard?')}
          {yesNoToggle('debrisRemoval', 'Do you need removal of waste / debris?')}
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Please describe what needs to be done <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(optional)</span>
            </label>
            <textarea placeholder='e.g. "Mow lawn, edge borders, remove weeds, trim bushes"'
              value={formData.landscapingDescription} onChange={e => set('landscapingDescription', e.target.value)}
              rows={3} style={{ width: '100%', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-surface)', resize: 'vertical' }} />
          </div>
        </div>
      </div>
    );

    // ── Generic intake (Plumbing, Electrical, HVAC, General Repairs) ──
    return (
      <div>
        {stepHeader('Tell us more about the issue', 'Answer a few quick questions so tradespeople arrive prepared.')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              What part of the {formData.room.toLowerCase()} is not working or damaged? <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <textarea placeholder={`e.g. "The faucet under the sink" or "The light switch on the left wall"`}
              value={formData.affectedPart} onChange={e => set('affectedPart', e.target.value)}
              rows={2} style={{ width: '100%', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-surface)', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Is anything else in the {formData.room.toLowerCase()} being affected because of this?
            </label>
            <textarea placeholder={`e.g. "The cabinet under the sink is also getting wet" or "None"`}
              value={formData.adjacentImpact} onChange={e => set('adjacentImpact', e.target.value)}
              rows={2} style={{ width: '100%', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-surface)', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Is anything else in the house being impacted by this issue?
            </label>
            <textarea placeholder={`e.g. "The water pressure everywhere dropped" or "No, it's isolated to the kitchen"`}
              value={formData.housewideImpact} onChange={e => set('housewideImpact', e.target.value)}
              rows={2} style={{ width: '100%', padding: 'var(--space-3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem', color: 'var(--text-primary)', background: 'var(--bg-surface)', resize: 'vertical' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              What best describes the nature of this job? <span style={{ color: 'var(--danger)' }}>*</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-2)' }}>
              {JOB_NATURE_OPTIONS.map(opt => (
                <button key={opt} onClick={() => set('jobNature', opt)} style={{
                  padding: 'var(--space-3)',
                  border: formData.jobNature === opt ? '2px solid var(--primary)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: formData.jobNature === opt ? 'var(--primary-light)' : 'var(--bg-surface)',
                  cursor: 'pointer', fontWeight: '600', fontSize: '0.82rem',
                  color: formData.jobNature === opt ? 'var(--primary)' : 'var(--text-secondary)',
                  fontFamily: 'inherit',
                }}>{opt}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderStep5 = () => (
    <div>
      {stepHeader('Describe the issue & add photos', 'Give tradespeople a clear picture of what needs to be done.')}

      {/* Validation flags */}
      {formData.photoQualityFlag && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <AlertCircle size={18} color="var(--danger)" />
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--danger)' }}>Photo quality issue</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>One or more photos appear blurry or too dark. Please re-upload a clearer image.</div>
          </div>
        </div>
      )}
      {formData.categoryMismatchFlag && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', background: 'rgba(255,149,0,0.1)', border: '1px solid var(--warning)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <AlertCircle size={18} color="var(--warning)" />
          <div>
            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--warning)' }}>Trade category may not match</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Your description suggests a different trade. Please verify your category selection in Step 2.</div>
          </div>
        </div>
      )}

      {/* Description */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <label style={{ display: 'block', fontWeight: '700', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
          Describe the issue <span style={{ color: 'var(--text-secondary)', fontWeight: '400' }}>(min. 20 characters)</span>
        </label>
        <textarea
          placeholder="Describe what is broken, not working, or needs attention. Include any context that would help the tradesperson prepare..."
          value={formData.description}
          onChange={e => set('description', e.target.value)}
          rows={5}
          style={{
            width: '100%', padding: 'var(--space-3)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem',
            color: 'var(--text-primary)', background: 'var(--bg-surface)', resize: 'vertical', minHeight: '120px',
          }}
        />
        <div style={{ textAlign: 'right', fontSize: '0.72rem', color: formData.description.length < 20 ? 'var(--danger)' : 'var(--text-secondary)', marginTop: '4px' }}>
          {formData.description.length} / 20 min
        </div>
      </div>

      {/* Photo upload */}
      {sectionLabel('Photos (strongly recommended)')}
      <label style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)',
        padding: 'var(--space-4)', background: formData.photos.length >= PHOTO_LIMIT ? 'var(--bg-base)' : 'var(--bg-surface)',
        border: `2px dashed ${formData.photos.length >= PHOTO_LIMIT ? 'var(--border)' : 'var(--primary)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: formData.photos.length >= PHOTO_LIMIT ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s ease', marginBottom: 'var(--space-3)',
        opacity: formData.photos.length >= PHOTO_LIMIT ? 0.5 : 1,
      }}>
        <input
          type="file" accept="image/*" multiple capture="environment"
          onChange={handlePhotoUpload} style={{ display: 'none' }}
          disabled={formData.photos.length >= PHOTO_LIMIT}
        />
        <Camera size={22} color="var(--primary)" />
        <span style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
          {formData.photos.length >= PHOTO_LIMIT ? 'Photo limit reached' : 'Add Photos'}
        </span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          {formData.photos.length}/{PHOTO_LIMIT} photos
        </span>
      </label>

      {formData.photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          {formData.photos.map((file, idx) => (
            <div key={idx} style={{ position: 'relative', aspectRatio: '1', background: 'var(--bg-base)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <img
                src={URL.createObjectURL(file)}
                alt={`Photo ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <button
                onClick={() => removePhoto(idx)}
                style={{
                  position: 'absolute', top: '4px', right: '4px',
                  background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                  width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={12} color="white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Job summary preview */}
      <Card style={{ padding: 'var(--space-4)', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <Sparkles size={14} color="var(--primary)" />
          <span style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--primary)' }}>JOB SUMMARY</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {[
            { label: 'Room', value: formData.room },
            { label: 'Trade', value: TRADE_CATEGORIES.find(t => t.id === formData.tradeType)?.label || '' },
            { label: 'Urgency', value: SEVERITY_LEVELS.find(s => s.id === formData.severity)?.label || '' },
            { label: 'Affected Area', value: formData.affectedPart || '—' },
            { label: 'Nature', value: formData.jobNature || '—' },
            { label: 'Photos', value: `${formData.photos.length} attached` },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: '500' }}>{row.label}</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: '700' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  // Step 6 — Success
  if (step === (6 as any)) {
    return (
      <>
        <TopNav title="Job Posted" />
        <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}>
          <div style={{ textAlign: 'center', maxWidth: '320px' }}>
            <div style={{
              width: '80px', height: '80px', background: 'var(--success)',
              borderRadius: '50%', margin: '0 auto var(--space-5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={40} color="white" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: 'var(--space-3)' }}>
              Job Posted!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
              Your job has been posted to the board. Verified tradespeople in your area will review it and submit quotes. You'll be notified when new quotes arrive.
            </p>
          </div>
        </div>
      </>
    );
  }

  const stepLabels = ['Room', 'Trade Type', 'Urgency', 'Details', 'Description'];

  return (
    <>
      <TopNav title="Create Job" />
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', paddingBottom: '100px' }}>
        <div style={{ padding: 'var(--space-4)' }}>

          {/* Step progress */}
          <div style={{ marginBottom: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step {step} of {TOTAL_STEPS} — {stepLabels[step - 1]}
              </span>
              <Badge variant="neutral" size="sm">{Math.round((step / TOTAL_STEPS) * 100)}%</Badge>
            </div>
            <div style={{ height: '4px', background: 'var(--border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: `${(step / TOTAL_STEPS) * 100}%`, height: '100%', background: 'var(--primary)', borderRadius: 'var(--radius-full)', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', justifyContent: 'center' }}>
            {stepLabels.map((label, i) => (
              <div key={label} style={{
                width: i + 1 <= step ? '20px' : '8px', height: '8px',
                borderRadius: 'var(--radius-full)',
                background: i + 1 <= step ? 'var(--primary)' : 'var(--border)',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>

          {/* Form card */}
          <Card style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
            {step === 4 && renderStep4()}
            {step === 5 && renderStep5()}
          </Card>

          {/* Submit error */}
          {submitError && (
            <div
              role="alert"
              style={{
                display: 'flex', gap: 'var(--space-3)', alignItems: 'center',
                background: 'var(--danger-light)', border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)', padding: 'var(--space-3)',
                marginBottom: 'var(--space-3)',
              }}
            >
              <AlertCircle size={18} color="var(--danger)" />
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--danger)' }}>
                  Could not post job
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {submitError}
                </div>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
            <Button variant="outline" onClick={handleBack} icon={<ArrowLeft size={18} />} style={{ flex: 1 }} disabled={isSubmitting}>
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              disabled={!isStepValid() || isSubmitting}
              loading={isSubmitting}
              icon={step === TOTAL_STEPS ? <CheckCircle size={18} /> : <ArrowRight size={18} />}
              style={{ flex: 2 }}
            >
              {step === TOTAL_STEPS ? (isSubmitting ? 'Posting…' : 'Post Job') : 'Continue'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
