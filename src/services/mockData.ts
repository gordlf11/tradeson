export type UserRole = 'homeowner' | 'tradesperson';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export type JobStatus = 'open' | 'quoted' | 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'closed';

export interface Job {
  id: string;
  customerId: string;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  address: string;
  status: JobStatus;
  createdAt: string;
  budgetRange?: [number, number];
  photos?: string[];
  aiSummary?: string;
}

export interface Quote {
  id: string;
  jobId: string;
  tradespersonId: string;
  amount: number;
  message: string;
  estimatedTimeHours: number;
  createdAt: string;
}

// Synthetic Database
export const mockUsers: User[] = [
  {
    id: 'u-1',
    name: 'Alice Homeowner',
    email: 'alice@example.com',
    role: 'homeowner',
    avatar: 'https://i.pravatar.cc/150?u=alice'
  },
  {
    id: 't-1',
    name: 'Bob Builder',
    email: 'bob@example.com',
    role: 'tradesperson',
    avatar: 'https://i.pravatar.cc/150?u=bob'
  },
  {
    id: 't-2',
    name: 'Charlie Plumber',
    email: 'charlie@example.com',
    role: 'tradesperson',
    avatar: 'https://i.pravatar.cc/150?u=charlie'
  }
];

export const mockJobs: Job[] = [
  {
    id: 'j-1',
    customerId: 'u-1',
    title: 'Leaky Pipe under Kitchen Sink',
    description: 'There is a consistent drip under the kitchen sink. Looks like the PVC trap is cracked.',
    category: 'Plumbing',
    severity: 'medium',
    address: '123 Fake St, Springfield',
    status: 'open',
    createdAt: new Date().toISOString(),
    budgetRange: [150, 250],
    aiSummary: 'Medium severity plumbing issue. User reports leaky PVC pipe under kitchen sink. Standard repair expected.'
  },
  {
    id: 'j-2',
    customerId: 'u-1',
    title: 'Install 2 Ceiling Fans',
    description: 'Need two ceiling fans installed in the bedrooms. Wiring is already there.',
    category: 'Electrical',
    severity: 'low',
    address: '123 Fake St, Springfield',
    status: 'quoted',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    budgetRange: [100, 200],
    aiSummary: 'Low severity electrical installation. Two ceiling fans with pre-existing wiring.'
  }
];

export const mockQuotes: Quote[] = [
  {
    id: 'q-1',
    jobId: 'j-2',
    tradespersonId: 't-1',
    amount: 150,
    message: 'I can get both installed in an hour. Available tomorrow.',
    estimatedTimeHours: 1,
    createdAt: new Date().toISOString()
  }
];

// Utility hook/functions to read from "DB"
export const getActiveJobs = () => mockJobs.filter(j => j.status !== 'closed');
export const getJobsByUser = (userId: string) => mockJobs.filter(j => j.customerId === userId);
export const getQuotesForJob = (jobId: string) => mockQuotes.filter(q => q.jobId === jobId);
