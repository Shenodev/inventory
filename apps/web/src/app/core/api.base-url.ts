const configured = import.meta.env['VITE_API_BASE_URL'] as string | undefined;

const fallback = import.meta.env.PROD
  ? 'https://api.inventory.shenodev.tech/api'
  : 'http://localhost:8000/api';

export const API_BASE_URL = (configured ?? fallback).replace(/\/+$/, '');
