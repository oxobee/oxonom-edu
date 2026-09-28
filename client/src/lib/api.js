import axios from 'axios';

// Dynamically resolve API base URL so both localhost and LAN IP (Wi-Fi) always work seamlessly
export const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const envUrl = import.meta.env.VITE_API_BASE_URL;
        // If an external production URL is configured (e.g. render / cloud domain)
        if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1') && !envUrl.includes('192.168.')) {
            return envUrl;
        }
        const hostname = window.location.hostname || 'localhost';
        return `http://${hostname}:5001`;
    }
    return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';
};

// Resolves media URL to always point to backend server if relative /uploads path
export const resolveMediaUrl = (url) => {
    if (!url || typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (trimmed.startsWith('/uploads/')) {
        const base = getApiBaseUrl();
        return `${base}${trimmed}`;
    }
    return trimmed;
};

// Create axios instance with base configuration
const api = axios.create({
    baseURL: getApiBaseUrl()
});

// Request interceptor to add JWT token to all requests
api.interceptors.request.use(
    (config) => {
        if (!config.baseURL || config.baseURL.includes('192.168.1.172')) {
            config.baseURL = getApiBaseUrl();
        }
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 errors (token expired/invalid)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isVerifyPasswordUrl = error.config?.url?.includes('/verify-password');
        if (error.response?.status === 401 && !isVerifyPasswordUrl) {
            // Token is invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Redirect to login page
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
