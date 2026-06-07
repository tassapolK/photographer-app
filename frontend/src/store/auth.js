import { create } from 'zustand';
import api from '../utils/api';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('photo_token') || null,
  photographer: null,

  login: async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('photo_token', data.token);
    set({ token: data.token, photographer: { name: data.name } });
  },

  register: async (name, email, password) => {
    const data = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('photo_token', data.token);
    set({ token: data.token, photographer: { name: data.name } });
  },

  logout: () => {
    localStorage.removeItem('photo_token');
    set({ token: null, photographer: null });
  },

  fetchMe: async () => {
    try {
      const data = await api.get('/auth/me');
      set({ photographer: data });
    } catch {
      localStorage.removeItem('photo_token');
      set({ token: null, photographer: null });
    }
  },
}));
