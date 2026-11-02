import { api } from '../../utils/api';
import type { ActivityType } from '@/shared';

export interface Activity {
  id: string;
  type: ActivityType;
  subject: string | null;
  note: string | null;
  dueAt: string | null;
  completedAt: string | null;
  date: string;
  eventAt?: string;
  status?: 'overdue' | 'upcoming';
  automated?: boolean;
  user: { id: string; name: string };
  contact?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
}

export const activitiesApi = {
  list: (params?: {
    type?: string;
    contactId?: string;
    dealId?: string;
    completed?: boolean;
    mine?: boolean;
  }) => {
    const q = new URLSearchParams();
    if (params?.type) q.set('type', params.type);
    if (params?.contactId) q.set('contactId', params.contactId);
    if (params?.dealId) q.set('dealId', params.dealId);
    if (params?.completed !== undefined) q.set('completed', String(params.completed));
    if (params?.mine !== undefined) q.set('mine', String(params.mine));
    const qs = q.toString();
    return api.get<Activity[]>(`/activities${qs ? `?${qs}` : ''}`);
  },
  calendar: (from: string, to: string) =>
    api.get<Activity[]>(`/activities/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  reminders: () => api.get<Activity[]>('/activities/reminders'),
  create: (data: Record<string, unknown>) => api.post<Activity>('/activities', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch<Activity>(`/activities/${id}`, data),
  complete: (id: string) => api.post<Activity>(`/activities/${id}/complete`),
  remove: (id: string) => api.delete<null>(`/activities/${id}`),
};
