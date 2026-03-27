import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Camera, DollarSign, Filter, TrendingUp, AlertCircle, Users } from 'lucide-react';
import TopNav from '../components/TopNav';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

interface Job {
  id: string;
  title: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  distance: number;
  timeAgo: string;
  description: string;
  aiSummary: string;
  budgetRange: [number, number];
  photos: number;
  bids: number;
  verified: boolean;
}

const mockJobs: Job[] = [
  {
    id: '1',
    title: 'Kitchen Sink Leak Repair',
    category: 'Plumbing',
    severity: 'medium',
    distance: 2.4,
    timeAgo: '5 min ago',
    description: 'The pipe under my kitchen sink is leaking quite badly when I run the water.',
    aiSummary: 'Medium severity plumbing issue. Leak under kitchen sink during water flow. Likely requires P-trap replacement or seal repair.',
    budgetRange: [150, 250],
    photos: 3,
    bids: 2,
    verified: true
  },
  {
    id: '2',
    title: 'Bathroom Light Fixture Installation',
    category: 'Electrical',
    severity: 'low',
    distance: 3.1,
    timeAgo: '12 min ago',
    description: 'Need to install a new vanity light fixture in the master bathroom.',
    aiSummary: 'Simple electrical task. Vanity light installation in master bath. Standard wiring work required.',
    budgetRange: [100, 180],
    photos: 2,
    bids: 5,
    verified: true
  },
  {
    id: '3',
    title: 'Emergency AC Repair',
    category: 'HVAC',
    severity: 'high',
    distance: 1.8,
    timeAgo: '18 min ago',
    description: 'AC unit stopped working completely. House is getting very hot.',
    aiSummary: 'High priority HVAC issue. Complete AC failure. Immediate diagnosis and repair needed.',
    budgetRange: [300, 500],
    photos: 1,
    bids: 3,
    verified: false
  }
];

export default function JobBoardEnhanced() {
  const [jobs] = useState<Job[]>(mockJobs);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const navigate = useNavigate();

  const categories = [
    { id: 'all', label: 'All Jobs', count: 12 },
    { id: 'plumbing', label: 'Plumbing', count: 4 },
    { id: 'electrical', label: 'Electrical', count: 3 },
    { id: 'hvac', label: 'HVAC', count: 2 },
    { id: 'general', label: 'General', count: 3 }
  ];

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case 'high':
        return { variant: 'danger' as const, label: 'URGENT', icon: <AlertCircle size={12} /> };
      case 'medium':
        return { variant: 'warning' as const, label: 'MODERATE', icon: <TrendingUp size={12} /> };
      default:
        return { variant: 'success' as const, label: 'ROUTINE', icon: null };
    }
  };

  return (
    <>
      <TopNav title="Job Board" />
      
      <div className="page-container" style={{ paddingTop: 'var(--space-4)' }}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Springfield Area • 5 mile radius
              </p>
            </div>
            <Button variant="secondary" size="sm" icon={<Filter size={16} />}>
              Filter
            </Button>
          </div>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto" style={{ paddingBottom: '8px' }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '8px 16px',
                borderRadius: 'var(--radius-full)',
                background: selectedCategory === cat.id ? 'var(--primary)' : 'var(--bg-surface-elevated)',
                color: selectedCategory === cat.id ? 'white' : 'var(--text-primary)',
                border: 'none',
                fontSize: '0.875rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'var(--transition)',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {cat.label}
              <span style={{
                background: selectedCategory === cat.id ? 'rgba(255,255,255,0.2)' : 'var(--bg-base)',
                padding: '2px 6px',
                borderRadius: '10px',
                fontSize: '0.75rem'
              }}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Job Cards */}
      <div className="flex flex-col gap-4">
        {jobs.map(job => {
          const severityConfig = getSeverityConfig(job.severity);
          
          return (
            <Card 
              key={job.id} 
              interactive 
              padding="none"
              className="animate-slideUp"
              style={{ overflow: 'hidden' }}
            >
              {/* Job Header */}
              <div style={{ 
                padding: 'var(--space-4)', 
                borderBottom: '1px solid var(--border)',
                background: job.severity === 'high' ? 'rgba(255, 74, 107, 0.05)' : 'transparent'
              }}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={severityConfig.variant} size="sm">
                      <span className="flex items-center gap-1">
                        {severityConfig.icon}
                        {severityConfig.label}
                      </span>
                    </Badge>
                    {job.verified && (
                      <Badge variant="primary" size="sm">VERIFIED</Badge>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <Clock size={12} style={{ display: 'inline', marginRight: '2px' }} />
                    {job.timeAgo}
                  </span>
                </div>
                
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{job.title}</h3>
                
                <div className="flex items-center gap-4" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  <span className="flex items-center gap-1">
                    <MapPin size={14}/> {job.distance} mi away
                  </span>
                  <span>{job.category}</span>
                  {job.bids > 0 && (
                    <span className="flex items-center gap-1">
                      <Users size={14}/> {job.bids} bids
                    </span>
                  )}
                </div>
              </div>

              {/* Job Body */}
              <div style={{ padding: 'var(--space-4)' }}>
                {/* AI Summary */}
                <div style={{ 
                  background: 'linear-gradient(135deg, var(--primary-light), transparent)',
                  border: '1px solid var(--primary-light)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 'var(--space-4)'
                }}>
                  <div className="flex items-center gap-2 mb-2" style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      background: 'var(--primary)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ color: 'white', fontSize: '10px' }}>AI</span>
                    </div>
                    <span style={{ fontWeight: 600 }}>AI Analysis</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: '1.5' }}>
                    {job.aiSummary}
                  </p>
                </div>

                {/* Photos Preview */}
                {job.photos > 0 && (
                  <div className="flex gap-2 mb-4" style={{ height: '100px' }}>
                    {[...Array(Math.min(job.photos, 3))].map((_, i) => (
                      <div 
                        key={i}
                        style={{ 
                          flex: 1,
                          background: `linear-gradient(135deg, var(--bg-surface-elevated), var(--bg-base))`,
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-tertiary)',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {i === 2 && job.photos > 3 && (
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 600
                          }}>
                            +{job.photos - 3}
                          </div>
                        )}
                        <Camera size={24} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Quote Section */}
                <div style={{
                  background: 'var(--bg-base)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      AI Estimated Quote
                    </div>
                    <div style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, var(--primary), var(--success))',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      ${job.budgetRange[0]} - ${job.budgetRange[1]}
                    </div>
                  </div>

                  <Button 
                    variant="primary" 
                    size="md"
                    onClick={() => navigate('/job-execution')}
                    icon={<DollarSign size={18} />}
                  >
                    Submit Quote
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {jobs.length === 0 && (
          <Card className="text-center" style={{ padding: '4rem 2rem' }}>
            <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <h3>No Jobs Available</h3>
            <p style={{ color: 'var(--text-secondary)' }}>
              Check back soon for new opportunities in your area.
            </p>
          </Card>
        )}
      </div>
      </div>
    </>
  );
}