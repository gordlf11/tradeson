import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronLeft, Check, Home } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function LocationSettings() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    street: localStorage.getItem('locationStreet') || '',
    city: localStorage.getItem('locationCity') || '',
    province: localStorage.getItem('locationProvince') || '',
    postalCode: localStorage.getItem('locationPostal') || '',
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('locationStreet', formData.street);
    localStorage.setItem('locationCity', formData.city);
    localStorage.setItem('locationProvince', formData.province);
    localStorage.setItem('locationPostal', formData.postalCode);
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
        <h1 style={{ color: 'white', fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>Location & Address</h1>
      </div>

      <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', paddingBottom: '40px' }}>

        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
          <MapPin size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            Your address is used to match you with tradespeople in your area.
          </p>
        </Card>

        <Card style={{ padding: 'var(--space-5)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 'var(--space-4)' }}>
            Service Address
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Input
              label="Street Address"
              type="text"
              value={formData.street}
              onChange={e => setFormData({ ...formData, street: e.target.value })}
              icon={<Home size={18} />}
              placeholder="123 Main St"
            />
            <Input
              label="City"
              type="text"
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
              icon={<MapPin size={18} />}
              placeholder="Toronto"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <Input
                label="Province"
                type="text"
                value={formData.province}
                onChange={e => setFormData({ ...formData, province: e.target.value })}
                placeholder="ON"
              />
              <Input
                label="Postal Code"
                type="text"
                value={formData.postalCode}
                onChange={e => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="M5V 2T6"
              />
            </div>
          </div>
        </Card>

        <Button
          variant="primary"
          fullWidth
          onClick={handleSave}
          icon={saved ? <Check size={18} /> : undefined}
          style={saved ? { background: 'var(--success)' } : undefined}
        >
          {saved ? 'Saved!' : 'Save Address'}
        </Button>
      </div>
    </div>
  );
}
