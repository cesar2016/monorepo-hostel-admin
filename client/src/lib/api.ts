import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...restOptions } = options;

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  const session = (await supabase.auth.getSession()).data.session;
  const token = session?.access_token;

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(url, {
    ...restOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    let errorMessage = 'Ocurrió un error inesperado al procesar la solicitud.';
    let errorDetails: Record<string, string[]> | undefined;

    try {
      const errorJson = await response.json();
      if (errorJson.message) errorMessage = errorJson.message;
      if (errorJson.errors) errorDetails = errorJson.errors;
    } catch {
      errorMessage = response.statusText || errorMessage;
    }

    if (response.status === 401) {
      // Si la sesión expiró o es inválida
      console.warn('Sesión no autorizada o expirada (401)');
    }

    throw new ApiError(errorMessage, response.status, errorDetails);
  }

  // Si no hay contenido (204)
  if (response.status === 204) {
    return {} as T;
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  get: <T>(url: string, params?: Record<string, string | number | boolean | undefined | null>, headers?: HeadersInit) =>
    request<T>(url, { method: 'GET', params, headers }),

  post: <T>(url: string, body?: unknown, headers?: HeadersInit) =>
    request<T>(url, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  put: <T>(url: string, body?: unknown, headers?: HeadersInit) =>
    request<T>(url, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  patch: <T>(url: string, body?: unknown, headers?: HeadersInit) =>
    request<T>(url, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    }),

  delete: <T>(url: string, headers?: HeadersInit) =>
    request<T>(url, { method: 'DELETE', headers }),

  download: async (endpoint: string, params?: Record<string, string | number | boolean | undefined | null>, filename?: string) => {
    let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const qs = searchParams.toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    }

    const session = (await supabase.auth.getSession()).data.session;
    const token = session?.access_token;

    const response = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      throw new ApiError('Error al descargar el archivo', response.status);
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'descarga';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
