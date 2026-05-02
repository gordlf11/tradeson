import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, Camera, ChevronLeft, Check } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { uploadFile } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileSettings() {
  const navigate = useNavigate();
  const { firebaseUser, userProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: userProfile?.full_name || localStorage.getItem('userName') || '',
    email: userProfile?.email || firebaseUser?.email || localStorage.getItem('userEmail') || '',
    phone: userProfile?.phone_number || localStorage.getItem('userPhone') || '',
  });

  // Re-seed when the profile finishes loading (it can arrive after first render)
  useEffect(() => {
    if (!userProfile && !firebaseUser) return;
    setFormData(prev => ({
      name: userProfile?.full_name || prev.name,
      email: userProfile?.email || firebaseUser?.email || prev.email,
      phone: userProfile?.phone_number || prev.phone,
    }));
  }, [userProfile, firebaseUser]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(localStorage.getItem('userAvatar'));
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadFile(`users/${firebaseUser.uid}/avatar/${file.name}`, file);
      setAvatarUrl(url);
      localStorage.setItem('userAvatar', url);
    } catch (err) {
      console.error('Avatar upload failed:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('userName', formData.name);
    localStorage.setItem('userEmail', formData.email);
    localStorage.setItem('userPhone', formData.phone);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        background: 'var(--navy)', padding: 'var(--space-4)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
        paddingTop: 'max(var(--space-4), env(safe-area-inset-top))'
      }}>
        <button
          onClick={() => navigate('/settings')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Profile Information</h1>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: '40px' }}>

        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4) 0' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <User size={36} color="white" />
              }
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: '28px', height: '28px', borderRadius: '50%',
                background: uploadingAvatar ? 'var(--text-tertiary)' : 'var(--navy)',
                border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: uploadingAvatar ? 'default' : 'pointer',
              }}
            >
              <Camera size={14} color="white" />
            </button>
          </div>
          {uploadingAvatar && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', position: 'absolute' }}>
              Uploading…
            </p>
          )}
        </div>

        <Card style={{ padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)' }}>
            Personal Details
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Full Name"
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              icon={<User size={18} />}
              placeholder="Your full name"
            />
            <Input
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              icon={<Mail size={18} />}
              placeholder="you@example.com"
            />
            <Input
              label="Phone Number"
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              icon={<Phone size={18} />}
              placeholder="+1 (555) 000-0000"
            />
          </div>
        </Card>

        <Button
          variant="primary"
          fullWidth
          onClick={handleSave}
          icon={saved ? <Check size={18} /> : undefined}
          style={saved ? { background: 'var(--success)' } : undefined}
        >
          {saved ? 'Saved!' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}
