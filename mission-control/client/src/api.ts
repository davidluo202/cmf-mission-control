import axios from 'axios';

function resolveApiBaseUrl() {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envUrl) return envUrl;

  if (window.location.hostname.includes('railway.app')) {
    return 'https://cmf-mission-control-production.up.railway.app/api';
  }

  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}/api`;
}

const API_TOKEN = (import.meta as any).env?.VITE_API_TOKEN || 'cmf-mc-token-2026';

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'x-api-token': API_TOKEN,
  },
});

export const getAgents      = () => api.get('/agents').then(r => r.data.agents);
export const getProposals   = () => api.get('/proposals').then(r => r.data.proposals);
export const getIncidents   = () => api.get('/incidents').then(r => r.data.incidents);
export const getChatMessages = (limit = 200) =>
  api.get(`/chatroom/messages?limit=${limit}`).then(r => r.data.messages);

export const sendChatMessage  = (payload: any) => api.post('/chatroom/messages', payload);
export const clearChatMessages = ()             => api.delete('/chatroom/messages');
export const approveProposal  = (id: string, action: string) =>
  api.post(`/proposals/${id}/approve`, { action });
export const reviveIncident   = (id: string) => api.post(`/incidents/${id}/revive`);
export const pingAgent        = (id: string) => api.post(`/agents/${id}/heartbeat`);
export const getHealth        = () =>
  axios.get(resolveApiBaseUrl().replace('/api', '/health')).then(r => r.data);

export const getHealthChecks        = (params?: { agent_id?: string; status?: string; check_type?: string }) =>
  api.get('/health-checks', { params }).then(r => r.data.health_checks);
export const getHealthChecksSummary = () =>
  api.get('/health-checks/summary').then(r => r.data.summary);
export const postHealthCheck        = (payload: any) => api.post('/health-checks', payload);
export const resolveHealthCheck     = (id: string) => api.post(`/health-checks/${id}/resolve`);

// ─── Alerts ──────────────────────────────────────────────────────────────────
export const getAlerts = (params?: { severity?: string; target?: string; acknowledged?: string; agent_id?: string }) =>
  api.get('/alerts', { params }).then(r => r.data.alerts);
export const getUnacknowledgedCount = () =>
  api.get('/alerts/unacknowledged').then(r => r.data);
export const acknowledgeAlert = (id: string, acknowledged_by = 'David') =>
  api.post(`/alerts/${id}/acknowledge`, { acknowledged_by });
export const acknowledgeAllAlerts = (acknowledged_by = 'David') =>
  api.post('/alerts/acknowledge-all', { acknowledged_by });

// ─── v0.6.0: Rescue / Mutual Aid ────────────────────────────────────────────
export const getRescueTasks = (params?: { status?: string; agent_id?: string }) =>
  api.get('/rescue/tasks', { params }).then(r => r.data.rescue_tasks);
export const requestRescue = (payload: { requester_agent: string; target_agent: string; rescue_type: string }) =>
  api.post('/rescue/request', payload);
export const respondRescue = (payload: { task_id: string; response: string; result?: string }) =>
  api.post('/rescue/respond', payload);
export const assignPartners = (payload: { agent_a: string; agent_b: string }) =>
  api.post('/rescue/assign', payload);
export const getPartners = () => api.get('/rescue/partners').then(r => r.data.partners);

// ─── v0.6.0: Emoji Status ──────────────────────────────────────────────────
export const setAgentEmoji = (payload: { agent_id: string; emoji: string }) =>
  api.post('/agents/emoji', payload);
export const getAgentEmoji = (agent_id: string) =>
  api.get(`/agents/emoji/${agent_id}`).then(r => r.data);
