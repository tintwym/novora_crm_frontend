import { api } from '../../utils/api';

export type AuditEntityType =
  | 'CONTACT'
  | 'COMPANY'
  | 'DEAL'
  | 'QUOTE'
  | 'TICKET'
  | 'PRODUCT'
  | 'USER'
  | 'WORKSPACE'
  | 'AUTOMATION'
  | 'ATTACHMENT'
  | 'SAMPLE_DATA';

export interface AuditChange {
  from: unknown;
  to: unknown;
}

export interface AuditEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: AuditEntityType;
  entityId: string | null;
  entityLabel: string | null;
  details: ({ changes?: Record<string, AuditChange> } & Record<string, unknown>) | null;
  createdAt: string;
}

export interface AuditPage {
  items: AuditEntry[];
  page: number;
  hasMore: boolean;
  people: { id: string; name: string }[];
}

export interface AuditFilters {
  entityType?: string;
  action?: string;
  userId?: string;
  q?: string;
  page?: number;
}

export const auditApi = {
  list: (filters: AuditFilters) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
    });
    const qs = params.toString();
    return api.get<AuditPage>(`/audit-log${qs ? `?${qs}` : ''}`);
  },
};
