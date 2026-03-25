import axios from 'axios';

const API_URL = 'http://localhost:8765/api'; // In production, this should be configurable
const API_TOKEN = 'cmf-mc-token-2026';

export const api = axios.create({
  baseURL: API_URL,
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
