import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, ChevronLeft, Check, Home, Building2, Plus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const MOCK_PORTFOLIO = [
  { id: 'p1', address: '842 Maple Ave', city: 'Toronto', province: 'ON', postalCode: 'M6G 1L8' },
  { id: 'p2', address: '310 Elm St', city: 'Toronto', province: 'ON', postalCode: 'M5T 1J7' },
  { id: 'p3', address: '92 Pine Blvd', city: 'Mississauga', province: 'ON', postalCode: 'L5B 2N4' },
  { id: 'p4', address: '1410 Oak Lane', city: 'Brampton', province: 'ON', postalCode: 'L6T 3R2' },
];

export default function LocationSettings() {
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole') || 'homeowner';
  const isPM = role === 'property-manager';

  // Primary address (all roles)
  const [formData, setFormData] = useState({
    street: localStorage.getItem('locationStreet') || '',
    city: localStorage.getItem('locationCity') || '',
    province: localStorage.getItem('locationProvince') || '',
    postalCode: localStorage.getItem('locationPostal') || '',
  });
  const [saved, setSaved] = useState(false);

  // Portfolio properties (property manager only)
  const [properties, setProperties] = useState<typeof MOCK_PORTFOLIO>(
    JSON.parse(localStorage.getItem('portfolioProperties') || 'null') ?? MOCK_PORTFOLIO
  );
  const [portfolioSaved, setPortfolioSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('locationStreet', formData.street);
    localStorage.setItem('locationCity', formData.city);
    localStorage.setItem('locationProvince', formData.province);
    localStorage.setItem('locationPostal', formData.postalCode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSavePortfolio = () => {
    localStorage.setItem('portfolioProperties', JSON.stringify(properties));
    setPortfolioSaved(true);
    setTimeout(() => setPortfolioSaved(false), 2000);
  };

  const updateProperty = (id: string, field: string, value: string) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addProperty = () => {
    const newProp = { id: `p${Date.now()}`, address: '', city: '', province: 'ON', postalCode: '' };
    setProperties(prev => [...prev, newProp]);
  };

  const removeProperty = (id: string) => {
    setProperties(prev => prev.filter(p => p.id !== id));
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

        {/* Info card */}
        <Card style={{ padding: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)', background: 'var(--primary-light)', border: '1px solid var(--primary)' }}>
          <MapPin size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: 0 }}>
            {isPM
              ? 'Your primary address and all managed properties are used to match jobs to tradespeople in your area.'
              : 'Your address is used to match you with tradespeople in your area.'}
          </p>
        </Card>

        {/* Primary address */}
        <Card style={{ padding: 'var(--space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
            <Home size={16} color="var(--primary)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
              {isPM ? 'Primary / Office Address' : 'Service Address'}
            </h3>
          </div>
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

        {/* Portfolio properties — property manager only */}
        {isPM && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Building2 size={16} color="var(--primary)" />
                <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                  Managed Properties ({properties.length})
                </h3>
              </div>
              <button
                onClick={addProperty}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--primary)', fontSize: '0.82rem', fontWeight: '700', fontFamily: 'inherit',
                }}
              >
                <Plus size={14} /> Add Property
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {properties.map((prop, idx) => (
                <Card key={prop.id} style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Property {idx + 1}
                    </span>
                    <button
                      onClick={() => removeProperty(prop.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '0.75rem', fontFamily: 'inherit' }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <Input
                      label="Street Address"
                      type="text"
                      value={prop.address}
                      onChange={e => updateProperty(prop.id, 'address', e.target.value)}
                      placeholder="123 Main St"
                    />
                    <Input
                      label="City"
                      type="text"
                      value={prop.city}
                      onChange={e => updateProperty(prop.id, 'city', e.target.value)}
                      placeholder="Toronto"
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                      <Input
                        label="Province"
                        type="text"
                        value={prop.province}
                        onChange={e => updateProperty(prop.id, 'province', e.target.value)}
                        placeholder="ON"
                      />
                      <Input
                        label="Postal Code"
                        type="text"
                        value={prop.postalCode}
                        onChange={e => updateProperty(prop.id, 'postalCode', e.target.value)}
                        placeholder="M5V 2T6"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={handleSavePortfolio}
              icon={portfolioSaved ? <Check size={18} /> : undefined}
              style={portfolioSaved ? { background: 'var(--success)' } : undefined}
            >
              {portfolioSaved ? 'Portfolio Saved!' : 'Save Portfolio'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
