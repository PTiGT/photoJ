import { request, requestFile, toQuery } from './client';
import type {
  AdminStats,
  AdminUser,
  AttachmentFile,
  Block,
  DocumentDetails,
  DocumentSummary,
  DocumentType,
  ExportFormat,
  Role,
  SaveResult,
  TemplateDetails,
  TemplateSummary,
  User,
  VersionDetails,
  VersionSummary,
} from '@/types';

export { ApiError } from './client';

interface AuthResponse {
  token: string;
  user: User;
}

export const authApi = {
  login: (body: { email: string; password: string }) => request<AuthResponse>('/auth/login', { method: 'POST', body }),
  register: (body: { email: string; name: string; password: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body }),
  me: () => request<{ user: User }>('/auth/me'),
};

export interface DocumentQuery {
  search?: string;
  type?: DocumentType;
  favorite?: boolean;
  limit?: number;
}

export const documentsApi = {
  list: (query: DocumentQuery = {}, signal?: AbortSignal) =>
    request<DocumentSummary[]>(`/documents${toQuery({ ...query })}`, { signal }),
  get: (id: string) => request<DocumentDetails>(`/documents/${id}`),
  create: (body: { type: DocumentType; title?: string; templateId?: string; blank?: boolean }) =>
    request<DocumentDetails>('/documents', { method: 'POST', body }),
  update: (id: string, body: { title?: string; blocks?: Block[]; createVersion?: boolean }, keepalive = false) =>
    request<SaveResult>(`/documents/${id}`, { method: 'PUT', body, keepalive }),
  remove: (id: string) => request<{ id: string }>(`/documents/${id}`, { method: 'DELETE' }),
  duplicate: (id: string) => request<DocumentSummary>(`/documents/${id}/duplicate`, { method: 'POST' }),
  setFavorite: (id: string, favorite: boolean) =>
    request<{ id: string; isFavorite: boolean }>(`/documents/${id}/favorite`, { method: favorite ? 'POST' : 'DELETE' }),
  versions: (id: string) => request<VersionSummary[]>(`/documents/${id}/versions`),
  version: (id: string, versionId: string) => request<VersionDetails>(`/documents/${id}/versions/${versionId}`),
  export: (id: string, format: ExportFormat) => requestFile(`/documents/${id}/export/${format}`, { method: 'POST' }),
  exportMany: (ids: string[]) => requestFile('/documents/export/xlsx', { method: 'POST', body: { ids } }),
  upload: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<AttachmentFile>(`/documents/${id}/attachments`, { method: 'POST', body: form });
  },
};

export const templatesApi = {
  list: (docType?: DocumentType) => request<TemplateSummary[]>(`/templates${toQuery({ docType })}`),
  get: (id: string) => request<TemplateDetails>(`/templates/${id}`),
  create: (body: {
    name: string;
    description?: string;
    docType: DocumentType;
    blocks?: Block[];
    fromDocumentId?: string;
    isSystem?: boolean;
  }) => request<TemplateDetails>('/templates', { method: 'POST', body }),
  update: (id: string, body: { name?: string; description?: string; blocks?: Block[] }, keepalive = false) =>
    request<TemplateDetails>(`/templates/${id}`, { method: 'PUT', body, keepalive }),
  remove: (id: string) => request<{ id: string }>(`/templates/${id}`, { method: 'DELETE' }),
};

export const adminApi = {
  stats: () => request<AdminStats>('/admin/stats'),
  users: () => request<AdminUser[]>('/admin/users'),
  setRole: (id: string, role: Role) => request<User>(`/admin/users/${id}`, { method: 'PATCH', body: { role } }),
  removeUser: (id: string) => request<{ id: string }>(`/admin/users/${id}`, { method: 'DELETE' }),
};
