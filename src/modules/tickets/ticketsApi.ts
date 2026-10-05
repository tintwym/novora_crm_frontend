import { api } from '../../utils/api';
import type { TicketPriority, TicketStatus } from '@/shared';

export interface Ticket {
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  contactId: string | null;
  assigneeId: string | null;
  requesterEmail: string | null;
  requesterName: string | null;
  slaDueAt: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  slaBreached?: boolean;
  slaDueSoon?: boolean;
  contact?: { id: string; name: string; email: string | null } | null;
  assignee?: { id: string; name: string; email: string } | null;
  messages?: Array<{
    id: string;
    body: string;
    isInternal: boolean;
    authorName: string | null;
    createdAt: string;
    author?: { id: string; name: string } | null;
  }>;
  _count?: { messages: number };
  createdAt?: string;
}

export const ticketsApi = {
  list: (params?: { status?: string; priority?: string; breached?: boolean }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.priority) q.set('priority', params.priority);
    if (params?.breached) q.set('breached', 'true');
    const qs = q.toString();
    return api.get<Ticket[]>(`/tickets${qs ? `?${qs}` : ''}`);
  },
  slaAlerts: () => api.get<Ticket[]>('/tickets/sla-alerts'),
  get: (id: string) => api.get<Ticket>(`/tickets/${id}`),
  create: (data: Record<string, unknown>) => api.post<Ticket>('/tickets', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Ticket>(`/tickets/${id}`, data),
  addMessage: (id: string, body: string, isInternal = false) =>
    api.post(`/tickets/${id}/messages`, { body, isInternal }),
  listKb: () =>
    api.get<Array<{ id: string; title: string; slug: string; body: string; published: boolean }>>(
      '/tickets/kb',
    ),
  createKb: (data: { title: string; body: string }) => api.post('/tickets/kb', data),
  portalInfo: () =>
    api.get<{ id: string; name: string; portalSlug: string | null }>('/tickets/portal-info'),
};
