import { api } from '../../utils/api';
import type { QuoteStatus } from '@/shared';

export interface QuoteLineItem {
  id?: string;
  productId?: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  amount?: number;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  status: QuoteStatus;
  currency: string;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  notes: string | null;
  terms: string | null;
  validUntil: string | null;
  dealId: string;
  contactId: string | null;
  accountId: string | null;
  deal?: { id: string; title: string; stage: string };
  contact?: { id: string; name: string; email: string | null; phone: string | null } | null;
  account?: { id: string; name: string; email: string | null; phone: string | null } | null;
  createdBy?: { id: string; name: string; email: string };
  lineItems: QuoteLineItem[];
  createdAt?: string;
}

export const quotesApi = {
  list: (dealId?: string) =>
    api.get<Quote[]>(`/quotes${dealId ? `?dealId=${encodeURIComponent(dealId)}` : ''}`),
  get: (id: string) => api.get<Quote>(`/quotes/${id}`),
  create: (data: Record<string, unknown>) => api.post<Quote>('/quotes', data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Quote>(`/quotes/${id}`, data),
  updateStatus: (id: string, status: QuoteStatus) =>
    api.patch<Quote>(`/quotes/${id}/status`, { status }),
  remove: (id: string) => api.delete<null>(`/quotes/${id}`),
  email: (id: string, data: { to: string; subject?: string; message?: string }) =>
    api.post<Quote & { emailedTo: string }>(`/quotes/${id}/email`, data),
  downloadPdf: (id: string, fileName?: string) =>
    api.download(`/quotes/${id}/pdf`, fileName ?? `quote-${id}.pdf`),
};
