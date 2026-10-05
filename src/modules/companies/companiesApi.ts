import { api } from '../../utils/api';

export interface Account {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  ownerId: string | null;
  owner?: { id: string; name: string; email: string } | null;
  _count?: { contacts: number; deals: number };
  contacts?: Array<{ id: string; name: string; email: string | null; phone: string | null; title: string | null }>;
  deals?: Array<{ id: string; title: string; value: string | number; stage: string; closeDate: string | null }>;
}

export const companiesApi = {
  list: (search?: string) =>
    api.get<Account[]>(`/companies${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  get: (id: string) => api.get<Account>(`/companies/${id}`),
  create: (data: Partial<Account> & { name: string }) => api.post<Account>('/companies', data),
  update: (id: string, data: Partial<Account>) => api.patch<Account>(`/companies/${id}`, data),
  remove: (id: string) => api.delete<null>(`/companies/${id}`),
};
