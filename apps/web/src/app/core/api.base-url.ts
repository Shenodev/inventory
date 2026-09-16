const configured = import.meta.env['VITE_API_BASE_URL'] as string | undefined;

export const API_BASE_URL = (configured ?? 'http://localhost:8000/api').replace(/\/+$/, '');
