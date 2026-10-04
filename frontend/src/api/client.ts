import { useAuthStore } from '@/stores/authStore';

/** Error returned by the API envelope `{ data: null, error }`. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const BASE = import.meta.env.VITE_API_URL ?? '/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  keepalive?: boolean;
}

function headers(json: boolean): HeadersInit {
  const token = useAuthStore.getState().token;
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleFailure(response: Response): Promise<never> {
  let message = response.status >= 500 ? 'Сервер недоступен, попробуйте позже' : `Ошибка ${response.status}`;
  try {
    const payload = await response.json();
    if (payload?.error) message = payload.error;
  } catch {
    /* non-JSON error body */
  }
  if (response.status === 401 && useAuthStore.getState().token) useAuthStore.getState().logout();
  throw new ApiError(message, response.status);
}

async function send(path: string, { method = 'GET', body, signal, keepalive }: RequestOptions) {
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${BASE}${path}`, {
      method,
      signal,
      keepalive,
      headers: headers(body !== undefined && !isForm),
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new ApiError('Нет соединения с сервером', 0);
  }
  if (!response.ok) await handleFailure(response);
  return response;
}

/** JSON request unwrapping the `{ data, error }` envelope. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await send(path, options);
  const payload = (await response.json()) as { data: T; error: string | null };
  if (payload.error) throw new ApiError(payload.error, response.status);
  return payload.data;
}

/** Binary request (exports). Returns the blob and server-suggested filename. */
export async function requestFile(path: string, options: RequestOptions = {}) {
  const response = await send(path, options);
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  const plain = /filename="([^"]+)"/i.exec(disposition)?.[1];
  const filename = utf8 ? decodeURIComponent(utf8) : (plain ?? 'document');
  return { blob: await response.blob(), filename };
}

export function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== false) search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
