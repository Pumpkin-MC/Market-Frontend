import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_URL = '/api';

const MAX_RETRIES = 3;
const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const IDEMPOTENT_METHODS = new Set(['get', 'head', 'options']);

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retryCount?: number;
}

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
    config.headers['Accept-Language'] = lang;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config as RetryableRequestConfig | undefined;
    if (!config) {
      return Promise.reject(error);
    }

    const method = (config.method || 'get').toLowerCase();
    const status = error?.response?.status as number | undefined;
    const isTransientGatewayError = status !== undefined && RETRYABLE_STATUS_CODES.has(status);
    const isTransientNetworkError = !error.response && error.code !== 'ERR_CANCELED';

    if (
      IDEMPOTENT_METHODS.has(method) &&
      (isTransientGatewayError || isTransientNetworkError) &&
      (config._retryCount ?? 0) < MAX_RETRIES
    ) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      const delayMs = Math.min(350 * Math.pow(2, config._retryCount - 1), 2000) + Math.floor(Math.random() * 150);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return api.request(config);
    }

    return Promise.reject(error);
  }
);

export default api;
