import { api } from '../../utils/api';

export interface ContactTag {
  id: string;
  name: string;
  color: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  source?: string | null;
  accountId: string | null;
  ownerId: string | null;
  customFields: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  account?: { id: string; name: string } | null;
  owner?: { id: string; name: string; email: string } | null;
  tags: ContactTag[];
  deals?: Array<{ id: string; title: string; value: string | number; stage: string; closeDate: string | null }>;
}

export interface TimelineItem {
  id: string;
  kind: 'activity' | 'note';
  type: string;
  subject: string | null;
  note: string | null;
  date: string;
  user: { id: string; name: string };
}

export interface DuplicateContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  title: string | null;
  source: string | null;
  createdAt: string;
  account: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  matchedOn?: Array<'email' | 'phone' | 'name'>;
  linkedRecords?: number;
}

export interface DuplicateGroup {
  matchedOn: Array<'email' | 'phone' | 'name'>;
  contacts: DuplicateContact[];
}

export interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
  skipped: { row: number; name: string | null; reason: string }[];
}

export type BulkAction = 'delete' | 'assignOwner' | 'setSource' | 'setAccount' | 'addTag' | 'removeTag';

export const contactsApi = {
  list: (params?: { search?: string; accountId?: string; tag?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.accountId) q.set('accountId', params.accountId);
    if (params?.tag) q.set('tag', params.tag);
    const qs = q.toString();
    return api.get<Contact[]>(`/contacts${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => api.get<Contact>(`/contacts/${id}`),
  create: (data: Record<string, unknown>) => api.post<Contact>('/contacts', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Contact>(`/contacts/${id}`, data),
  remove: (id: string) => api.delete<null>(`/contacts/${id}`),
  timeline: (id: string) => api.get<TimelineItem[]>(`/contacts/${id}/timeline`),
  addNote: (id: string, body: string) =>
    api.post(`/contacts/${id}/notes`, { body }),
  import: (contacts: Record<string, unknown>[], skipDuplicates = true) =>
    api.post<ImportResult>('/contacts/import', { contacts, skipDuplicates }),
  bulk: (ids: string[], action: BulkAction, value?: string | null) =>
    api.post<{ updated: number }>('/contacts/bulk', { ids, action, value }),
  duplicates: () => api.get<DuplicateGroup[]>('/contacts/duplicates'),
  checkDuplicates: (params: { email?: string; phone?: string; name?: string; excludeId?: string }) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
    return api.get<DuplicateContact[]>(`/contacts/duplicates/check?${q.toString()}`);
  },
  merge: (primaryId: string, mergeIds: string[]) =>
    api.post<{ primaryId: string; merged: number; movedRecords: number }>(`/contacts/${primaryId}/merge`, {
      mergeIds,
    }),
  listTags: () => api.get<ContactTag[]>('/contacts/tags'),
};
