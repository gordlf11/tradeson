import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Camera, Sparkles, CheckCircle2 } from 'lucide-react';

export default function JobCreation() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [description, setDescription] = useState('');

  const handleAIProcess = () => {
    if (!description.trim()) return;
    setIsProcessing(true);
    // Simulate AI network delay
    setTimeout(() => {
      setIsProcessing(false);
      setStep(2);
    }, 2500);
  };

  const submitJob = () => {
    setStep(3);
    setTimeout(() => {
      navigate('/job-board');
    }, 2000);
  };

  return (
    <div className="page-container">
      <h2>New Job Request</h2>
      
      {step === 1 && (
        <div className="card" style={{ animation: 'fadeIn 0.3s' }}>
          <p>Describe your issue, upload a photo, or use voice. Our AI will handle the rest.</p>
          
          <div className="form-group mt-4">
            <label>What do you need help with?</label>
            <textarea 
              placeholder="E.g. The pipe under my kitchen sink is leaking quite badly when I run the water..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-2 mb-6">
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>
              <Camera size={20} /> Photo
            </button>
            <button className="btn btn-secondary" style={{ flex: 1, padding: '0.75rem' }}>
              <Mic size={20} /> Voice
            </button>
          </div>

          <button 
            className="btn btn-primary justify-center" 
            onClick={handleAIProcess}
            disabled={isProcessing || !description.trim()}
          >
            {isProcessing ? (
              <><Sparkles className="loader" size={20}/> Analyzing Issue...</>
            ) : (
              <><Sparkles size={20}/> Generate Quote Estimate</>
            )}
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card" style={{ animation: 'fadeIn 0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ margin: 0 }}>AI Job Summary</h3>
            <span className="badge badge-orange">Medium Severity</span>
          </div>
          
          <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <div className="flex items-center gap-2 text-secondary mb-2" style={{ fontSize: '0.85rem' }}>
              <Sparkles size={14} color="var(--primary)"/> Generated Details
            </div>
            <p style={{ margin: 0, fontSize: '0.95rem' }}>
              "Medium severity plumbing issue. User reports a leak under the kitchen sink when water is running. Requires pipe inspection and probable trap replacement."
            </p>
          </div>

          <div className="form-group">
            <label>Trade Category</label>
            <select defaultValue="plumbing">
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="hvac">HVAC</option>
              <option value="general">General Handyman</option>
            </select>
          </div>

          <div className="form-group">
            <label>Estimated Cost Range</label>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>$150 - $250</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Based on regional averages. Final quote provided by tradesperson.</div>
          </div>

          <button className="btn btn-primary w-full mt-4" onClick={submitJob}>
            Looks Good - Post to Job Board
          </button>
          <button className="btn btn-secondary w-full mt-2" onClick={() => setStep(1)}>
            Edit Details
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="card text-center" style={{ animation: 'fadeIn 0.3s', padding: '3rem 1rem' }}>
          <CheckCircle2 size={64} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h3>Job Posted!</h3>
          <p>Local tradespeople are being notified. You will receive quotes shortly.</p>
        </div>
      )}
    </div>
  );
}
