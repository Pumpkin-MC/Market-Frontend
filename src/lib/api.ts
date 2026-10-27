import axios from 'axios';
import { toLanguageTag } from './locale';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
  },
});

api.interceptors.request.use((config) => {
  const lang = localStorage.getItem('i18nextLng') || (typeof navigator !== 'undefined' ? navigator.language : 'en');
  if (lang) {
    config.headers['Accept-Language'] = toLanguageTag(lang);
  }
  return config;
});

export default api;
