import { api } from '../../utils/api';

export interface SearchResults {
  contacts: Array<{ id: string; name: string; email: string | null; title: string | null }>;
  companies: Array<{ id: string; name: string; industry: string | null }>;
  deals: Array<{ id: string; title: string; stage: string; value: number }>;
  tickets: Array<{ id: string; title: string; ticketNumber: string; status: string }>;
}

export const searchApi = {
  query: (q: string) => api.get<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
};
