import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...(await getAuthHeaders()),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Users
  createUser: (data: { full_name: string; phone_number?: string; role: string }) =>
    request('/api/v1/users', { method: 'POST', body: JSON.stringify(data) }),

  getMe: () => request('/api/v1/users/me'),

  updateMe: (data: Record<string, unknown>) =>
    request('/api/v1/users/me', { method: 'PUT', body: JSON.stringify(data) }),

  deleteMe: () =>
    request('/api/v1/users/me', { method: 'DELETE' }),

  // Onboarding
  onboardHomeowner: (data: Record<string, unknown>) =>
    request('/api/v1/onboarding/homeowner', { method: 'POST', body: JSON.stringify(data) }),

  onboardPropertyManager: (data: Record<string, unknown>) =>
    request('/api/v1/onboarding/property-manager', { method: 'POST', body: JSON.stringify(data) }),

  onboardRealtor: (data: Record<string, unknown>) =>
    request('/api/v1/onboarding/realtor', { method: 'POST', body: JSON.stringify(data) }),

  onboardLicensedTrade: (data: Record<string, unknown>) =>
    request('/api/v1/onboarding/licensed-trade', { method: 'POST', body: JSON.stringify(data) }),

  onboardUnlicensedTrade: (data: Record<string, unknown>) =>
    request('/api/v1/onboarding/non-licensed-trade', { method: 'POST', body: JSON.stringify(data) }),

  // Jobs
  createJob: (data: Record<string, unknown>) =>
    request('/api/v1/jobs', { method: 'POST', body: JSON.stringify(data) }),

  listJobs: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/api/v1/jobs${qs}`);
  },

  getJob: (id: string) => request(`/api/v1/jobs/${id}`),

  // Quotes
  submitQuote: (jobId: string, data: Record<string, unknown>) =>
    request(`/api/v1/quotes/${jobId}/quotes`, { method: 'POST', body: JSON.stringify(data) }),

  acceptQuote: (quoteId: string) =>
    request(`/api/v1/quotes/${quoteId}/accept`, { method: 'POST' }),

  // Stripe — save card for future job payments (SetupIntent)
  createSetupIntent: () =>
    request('/api/v1/stripe/create-setup-intent', { method: 'POST' }),

  // Stripe Connect — tradesperson payout onboarding
  createConnectAccount: () =>
    request('/api/v1/stripe/create-connect-account', { method: 'POST' }),

  getConnectStatus: () =>
    request('/api/v1/stripe/connect-status'),

  // Admin — compliance
  listComplianceSubmissions: () =>
    request('/api/v1/admin/compliance'),

  updateComplianceDecision: (id: string, decision: string, adminNote?: string) =>
    request(`/api/v1/admin/compliance/${id}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision, admin_note: adminNote ?? '' }),
    }),

  // Admin — accounts
  listFlaggedAccounts: () =>
    request('/api/v1/admin/flagged-accounts'),

  applyResolution: (data: Record<string, unknown>) =>
    request('/api/v1/admin/resolutions', { method: 'POST', body: JSON.stringify(data) }),

  // Admin — metrics
  getPlatformMetrics: () =>
    request('/api/v1/admin/metrics'),
};

export default api;
