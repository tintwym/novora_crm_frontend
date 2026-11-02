import { api } from '../../utils/api';

export interface HrmsSyncSummary {
  status: 'OK' | 'PARTIAL' | 'FAILED';
  message: string;
  notes?: string[];
}

export interface HrmsStatus {
  available: boolean;
  connected: boolean;
  hrmsOrganizationId?: string;
  hrmsOrganizationName?: string | null;
  connectedAt?: string;
  salesDepartmentCodes?: string[];
  supportDepartmentCodes?: string[];
  lastSyncAt?: string | null;
  lastSyncStatus?: 'OK' | 'PARTIAL' | 'FAILED' | null;
  lastSyncMessage?: string | null;
  lastEventAt?: string | null;
  syncing?: boolean;
  linkedUsers?: number;
  summary?: HrmsSyncSummary;
}

export const hrmsApi = {
  status: () => api.get<HrmsStatus>('/integrations/hrms'),
  connect: (code: string) => api.post<HrmsStatus>('/integrations/hrms/connect', { code }),
  disconnect: () => api.delete<HrmsStatus>('/integrations/hrms'),
  updateSettings: (body: { salesDepartmentCodes: string[]; supportDepartmentCodes: string[] }) =>
    api.patch<HrmsStatus>('/integrations/hrms/settings', body),
  sync: () => api.post<HrmsStatus>('/integrations/hrms/sync', {}),
};
