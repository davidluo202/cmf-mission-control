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
