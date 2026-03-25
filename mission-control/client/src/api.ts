import axios from 'axios';

function resolveApiBaseUrl() {
  // Prefer same-origin /api when server reverse-proxies or serves static + API together.
  // Fallback to "same host, 8765" when dashboard is served on a different port (e.g. 8077).
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  if (envUrl) return envUrl;

  const { protocol, hostname } = window.location;
  // If user opens via localhost (dev), keep localhost.
  const host = hostname || 'localhost';
  return `${protocol}//${host}:8765/api`;
}

const API_TOKEN = (import.meta as any).env?.VITE_API_TOKEN || 'cmf-mc-token-2026';

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'x-api-token': API_TOKEN
  }
});

export const getAgents = () => api.get('/agents').then(res => res.data.agents);
export const getProposals = () => api.get('/proposals').then(res => res.data.proposals);
export const getIncidents = () => api.get('/incidents').then(res => res.data.incidents);
export const getChatMessages = () => api.get('/chatroom/messages').then(res => res.data.messages);

export const sendChatMessage = (payload: any) => api.post('/chatroom/messages', payload);
export const approveProposal = (id: string, action: string) => api.post(`/proposals/${id}/approve`, { action });
export const reviveIncident = (id: string) => api.post(`/incidents/${id}/revive`);
