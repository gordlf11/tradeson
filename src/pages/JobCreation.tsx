import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, Mic, Sparkles, AlertCircle, 
  Wrench, Zap, Droplets, Thermometer, 
  Hammer, Home, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

interface JobFormData {
  room: string;
  tradeType: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  photos: File[];
}

const tradeCategories = [
  { id: 'plumbing', label: 'Plumbing', icon: <Droplets size={20} /> },
  { id: 'electrical', label: 'Electrical', icon: <Zap size={20} /> },
  { id: 'hvac', label: 'HVAC', icon: <Thermometer size={20} /> },
  { id: 'carpentry', label: 'Carpentry', icon: <Hammer size={20} /> },
  { id: 'general', label: 'General', icon: <Wrench size={20} /> },
  { id: 'other', label: 'Other', icon: <Home size={20} /> },
];

const severityLevels = [
  { id: 'low', label: 'Routine', color: 'var(--success)', description: 'Non-urgent maintenance' },
  { id: 'medium', label: 'Moderate', color: 'var(--warning)', description: 'Needs attention soon' },
  { id: 'high', label: 'Urgent', color: 'var(--danger)', description: 'Immediate attention needed' }
];

const rooms = [
  'Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 
  'Basement', 'Attic', 'Garage', 'Outdoor', 'Other'
];

export default function JobCreation() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<JobFormData>({
    room: '',
    tradeType: '',
    severity: 'medium',
    description: '',
    photos: []
  });

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData({ ...formData, photos: [...formData.photos, ...files] });
    }
  };

  const handleAIProcess = () => {
    if (!formData.description.trim() || !formData.room || !formData.tradeType) {
      return;
    }
    
    setIsProcessing(true);
    // Simulate AI processing
    setTimeout(() => {
      setIsProcessing(false);
      setStep(2);
    }, 2500);
  };

  const handleSubmit = () => {
    setStep(3);
    setTimeout(() => {
      navigate('/job-board');
    }, 2000);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-6">
        <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Create New Job</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Describe your issue and let our AI help you get quotes
        </p>
      </div>

      {/* Step 1: Input Form */}
      {step === 1 && (
        <Card elevated className="animate-slideUp">
          {/* Room Selection */}
          <div className="form-group">
            <label style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
              Where is the issue located?
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(3, 1fr)', 
              gap: 'var(--space-2)' 
            }}>
              {rooms.map(room => (
                <button
                  key={room}
                  onClick={() => setFormData({ ...formData, room })}
                  style={{
                    padding: 'var(--space-3)',
                    background: formData.room === room ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                    border: `1px solid ${formData.room === room ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    color: formData.room === room ? 'white' : 'var(--text-primary)',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {room}
                </button>
              ))}
            </div>
          </div>

          {/* Trade Type Selection */}
          <div className="form-group mt-6">
            <label style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
              What type of service do you need?
            </label>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: 'var(--space-3)' 
            }}>
              {tradeCategories.map(trade => (
                <button
                  key={trade.id}
                  onClick={() => setFormData({ ...formData, tradeType: trade.id })}
                  style={{
                    padding: 'var(--space-3)',
                    background: formData.tradeType === trade.id ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                    border: `1px solid ${formData.tradeType === trade.id ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    color: formData.tradeType === trade.id ? 'white' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)'
                  }}
                >
                  {trade.icon}
                  <span style={{ fontWeight: 500 }}>{trade.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Severity Selection */}
          <div className="form-group mt-6">
            <label style={{ marginBottom: 'var(--space-3)', display: 'block' }}>
              How urgent is this issue?
            </label>
            <div className="flex flex-col gap-3">
              {severityLevels.map(level => (
                <div
                  key={level.id}
                  onClick={() => setFormData({ ...formData, severity: level.id as JobFormData['severity'] })}
                  style={{
                    padding: 'var(--space-3)',
                    border: `2px solid ${formData.severity === level.id ? level.color : 'var(--border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    background: formData.severity === level.id ? `${level.color}15` : 'transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span style={{ 
                        fontWeight: 600, 
                        color: formData.severity === level.id ? level.color : 'var(--text-primary)' 
                      }}>
                        {level.label}
                      </span>
                      <p style={{ 
                        fontSize: '0.8rem', 
                        color: 'var(--text-secondary)', 
                        margin: 0, 
                        marginTop: '2px' 
                      }}>
                        {level.description}
                      </p>
                    </div>
                    {formData.severity === level.id && (
                      <AlertCircle size={20} color={level.color} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-group mt-6">
            <label>Describe the issue in detail</label>
            <textarea
              placeholder="E.g., The pipe under my kitchen sink is leaking when I run the water. It started yesterday and seems to be getting worse..."
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              style={{
                minHeight: '120px',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Photo Upload */}
          <div className="flex gap-2 mb-6">
            <label style={{
              flex: 1,
              padding: 'var(--space-3)',
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              <Camera size={20} />
              <span>Add Photos</span>
              {formData.photos.length > 0 && (
                <Badge variant="primary" size="sm">{formData.photos.length}</Badge>
              )}
            </label>
            
            <button className="btn btn-secondary" style={{ 
              flex: 1, 
              padding: 'var(--space-3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)'
            }}>
              <Mic size={20} />
              <span>Voice Note</span>
            </button>
          </div>

          {/* Submit Button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleAIProcess}
            disabled={!formData.description || !formData.room || !formData.tradeType}
            loading={isProcessing}
            icon={isProcessing ? undefined : <Sparkles size={20} />}
          >
            {isProcessing ? 'Analyzing Issue...' : 'Generate Quote Estimate'}
          </Button>
        </Card>
      )}

      {/* Step 2: AI Summary */}
      {step === 2 && (
        <Card elevated className="animate-slideUp">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ margin: 0, fontSize: '1.25rem' }}>AI Job Summary</h3>
            <Badge variant={formData.severity === 'high' ? 'danger' : formData.severity === 'medium' ? 'warning' : 'success'}>
              {formData.severity.toUpperCase()} SEVERITY
            </Badge>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, var(--primary-light), transparent)',
            border: '1px solid var(--primary-light)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-4)'
          }}>
            <div className="flex items-center gap-2 mb-3" style={{ color: 'var(--primary)' }}>
              <Sparkles size={16} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>AI Analysis</span>
            </div>
            <p style={{ margin: 0 }}>
              {formData.severity === 'high' ? 'High' : formData.severity === 'medium' ? 'Medium' : 'Low'} severity {formData.tradeType} issue in {formData.room.toLowerCase()}. 
              {formData.description}. Professional assessment recommended. {' '}
              {formData.tradeType === 'plumbing' && 'Likely requires pipe inspection and possible replacement.'}
              {formData.tradeType === 'electrical' && 'Electrical work should be performed by a licensed professional.'}
              {formData.tradeType === 'hvac' && 'HVAC system diagnosis needed to determine repair scope.'}
            </p>
          </div>

          <div className="form-group">
            <label>Trade Category</label>
            <select value={formData.tradeType} onChange={e => setFormData({ ...formData, tradeType: e.target.value })}>
              {tradeCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div style={{
            background: 'var(--bg-base)',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-md)',
            marginTop: 'var(--space-4)',
            marginBottom: 'var(--space-4)'
          }}>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Estimated Cost Range
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
              ${formData.severity === 'high' ? '300 - 500' : formData.severity === 'medium' ? '150 - 250' : '75 - 150'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Based on regional averages. Final quote provided by tradesperson.
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setStep(1)}
              style={{ flex: 1 }}
            >
              Edit Details
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={handleSubmit}
              icon={<ArrowRight size={20} />}
              style={{ flex: 2 }}
            >
              Post to Job Board
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <Card className="text-center animate-slideUp" style={{ padding: '4rem 2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, var(--success), #25d893)',
            borderRadius: '50%',
            margin: '0 auto var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={40} color="white" />
          </div>
          <h2>Job Posted Successfully!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Local tradespeople are being notified. You'll receive quotes shortly.
          </p>
        </Card>
      )}
    </div>
  );
}