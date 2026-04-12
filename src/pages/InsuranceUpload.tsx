import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Upload, CheckCircle, FileText, AlertTriangle, Shield } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function InsuranceUpload() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    provider: '',
    policyNumber: '',
    coverage: '',
    expiryDate: '',
  });
  const [fileUploaded, setFileUploaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileUploaded(true);
    }
  };

  const handleSubmit = () => {
    localStorage.setItem('insuranceProvider', formData.provider);
    localStorage.setItem('insurancePolicyNumber', formData.policyNumber);
    localStorage.setItem('insuranceCoverage', formData.coverage);
    localStorage.setItem('insuranceExpiry', formData.expiryDate);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-6)' }}>
        <div style={{
          width: '72px', height: '72px', background: 'rgba(34,197,94,0.1)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-4)',
        }}>
          <CheckCircle size={40} color="var(--success)" />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--text-primary)', marginBottom: 'var(--space-2)', textAlign: 'center' }}>
          Insurance Submitted
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginBottom: 'var(--space-6)', maxWidth: '300px' }}>
          Your insurance certificate has been submitted for review. You'll be notified once verified.
        </p>
        <Button variant="primary" fullWidth onClick={() => navigate('/dashboard/tradesperson')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: 'var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        paddingTop: 'max(var(--space-4), env(safe-area-inset-top))',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Insurance Upload</h1>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: '40px' }}>

        {/* Alert banner */}
        <Card style={{ padding: 'var(--space-4)', background: 'rgba(255,149,0,0.08)', border: '1.5px solid var(--warning)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="var(--warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '4px' }}>Liability Insurance Expiring Soon</div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Upload your renewed certificate to stay active on TradesOn. Your account may be paused if insurance lapses.
              </p>
            </div>
          </div>
        </Card>

        {/* Policy Details */}
        <Card style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Shield size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Policy Details</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Insurance Provider"
              type="text"
              value={formData.provider}
              onChange={e => setFormData({ ...formData, provider: e.target.value })}
              placeholder="e.g. Intact Insurance"
            />
            <Input
              label="Policy Number"
              type="text"
              value={formData.policyNumber}
              onChange={e => setFormData({ ...formData, policyNumber: e.target.value })}
              placeholder="e.g. POL-12345678"
            />
            <Input
              label="Coverage Amount"
              type="text"
              value={formData.coverage}
              onChange={e => setFormData({ ...formData, coverage: e.target.value })}
              placeholder="e.g. $2,000,000"
            />
            <Input
              label="New Expiry Date"
              type="date"
              value={formData.expiryDate}
              onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
            />
          </div>
        </Card>

        {/* File Upload */}
        <Card style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <FileText size={20} color="var(--primary)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Certificate Document</h3>
          </div>

          <label style={{ display: 'block', cursor: 'pointer' }}>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} style={{ display: 'none' }} />
            <div style={{
              border: `2px dashed ${fileUploaded ? 'var(--success)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)', padding: 'var(--space-6)',
              textAlign: 'center', background: fileUploaded ? 'rgba(34,197,94,0.05)' : 'var(--bg-base)',
              transition: 'all 0.2s ease',
            }}>
              {fileUploaded ? (
                <>
                  <CheckCircle size={32} color="var(--success)" style={{ marginBottom: 'var(--space-2)' }} />
                  <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--success)' }}>Document uploaded</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Tap to replace</div>
                </>
              ) : (
                <>
                  <Upload size={32} color="var(--text-tertiary)" style={{ marginBottom: 'var(--space-2)' }} />
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Upload Certificate</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>PDF, JPG or PNG · Max 10MB</div>
                </>
              )}
            </div>
          </label>
        </Card>

        <Button
          variant="primary"
          fullWidth
          onClick={handleSubmit}
          disabled={!fileUploaded || !formData.provider || !formData.policyNumber}
        >
          Submit for Review
        </Button>
      </div>
    </div>
  );
}
