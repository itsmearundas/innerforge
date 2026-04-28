import { create } from 'zustand';
import api from '../api/axios';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: true,

  init: async () => {
    const token = localStorage.getItem('token');
    if (!token) return set({ loading: false });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, loading: false });
    } catch {
      localStorage.removeItem('token');
      set({ token: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token });
  },

  register: async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', data.token);
    set({ user: data.user, token: data.token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  }
}));

export const useOracleStore = create((set, get) => ({
  isOpen: false,
  messages: [],
  mode: 'auto',
  status: 'idle', // idle | listening | thinking | speaking
  insights: [],
  backgroundEvents: [],

  toggle: () => set(s => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),

  setMode: (mode) => set({ mode }),
  setStatus: (status) => set({ status }),

  addMessage: (msg) => set(s => ({ messages: [...s.messages, msg] })),

  addInsight: (insight) => set(s => ({
    insights: [insight, ...s.insights].slice(0, 10)
  })),

  dismissInsight: (id) => {
    api.delete(`/oracle/insights/${id}`).catch(() => {});
    set(s => ({ insights: s.insights.filter(i => i._id !== id) }));
  },

  addBgEvent: (event) => set(s => ({
    backgroundEvents: [event, ...s.backgroundEvents].slice(0, 20)
  })),

  sendMessage: async (text, backgroundContext = null) => {
    const store = get();
    const userMsg = { role: 'user', content: text };
    set(s => ({ messages: [...s.messages, userMsg], status: 'thinking' }));
    try {
      const { data } = await api.post('/oracle/chat', {
        messages: [...store.messages, userMsg].slice(-10), // last 10 for context
        backgroundContext
      });
      set(s => ({
        messages: [...s.messages, { role: 'ai', content: data.text, mode: data.mode }],
        mode: data.mode,
        status: 'idle'
      }));
      return data;
    } catch {
      set(s => ({
        messages: [...s.messages, { role: 'ai', content: 'Oracle is temporarily unreachable.', mode: 'auto' }],
        status: 'idle'
      }));
      return null;
    }
  }
}));
