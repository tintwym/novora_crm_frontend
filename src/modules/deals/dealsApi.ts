import { api } from '../../utils/api';
import type { DealStage, ActivityType } from '@/shared';
import type { AutomationTaskResult } from '../automations/automationsApi';

export interface Deal {
  id: string;
  title: string;
  value: number;
  stage: DealStage;
  closeDate: string | null;
  contactId: string | null;
  accountId: string | null;
  ownerId: string | null;
  probability: number;
  source?: string | null;
  createdAt?: string;
  updatedAt?: string;
  contact?: { id: string; name: string; email: string | null } | null;
  account?: { id: string; name: string } | null;
  owner?: { id: string; name: string; email: string } | null;
  activities?: Array<{
    id: string;
    type: ActivityType;
    subject: string | null;
    note: string | null;
    date: string;
    dueAt?: string | null;
    completedAt?: string | null;
    automated?: boolean;
    user: { id: string; name: string };
  }>;
  attachments?: DealAttachment[];
  automationTasks?: AutomationTaskResult[];
}

export interface DealAttachment {
  id: string;
  fileName: string;
  fileUrl: string | null;
  uploaded: boolean;
  mimeType: string | null;
  sizeBytes: number | null;
  uploadedBy: string | null;
  uploader: { id: string; name: string } | null;
  createdAt: string;
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const PREVIEWABLE = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'application/pdf'];

export function canPreview(file: DealAttachment) {
  return file.uploaded && file.mimeType != null && PREVIEWABLE.includes(file.mimeType);
}

export interface PipelineResponse {
  columns: Array<{ stage: DealStage; deals: Deal[]; totalValue: number }>;
  totalOpenValue: number;
}

export interface ForecastResponse {
  summary: { dealCount: number; pipelineValue: number; weightedForecast: number };
  byStage: Array<{ stage: string; count: number; pipelineValue: number; weightedValue: number }>;
  byOwner: Array<{
    ownerId: string;
    ownerName: string;
    pipelineValue: number;
    weightedValue: number;
    count: number;
  }>;
}

export interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
  skipped: { row: number; name: string | null; reason: string }[];
}

export const dealsApi = {
  pipeline: () => api.get<PipelineResponse>('/deals/pipeline'),
  forecast: () => api.get<ForecastResponse>('/deals/forecast'),
  list: () => api.get<Deal[]>('/deals'),
  get: (id: string) => api.get<Deal>(`/deals/${id}`),
  create: (data: Record<string, unknown>) => api.post<Deal>('/deals', data),
  update: (id: string, data: Record<string, unknown>) => api.patch<Deal>(`/deals/${id}`, data),
  updateStage: (id: string, stage: DealStage) =>
    api.patch<Deal>(`/deals/${id}/stage`, { stage }),
  remove: (id: string) => api.delete<null>(`/deals/${id}`),
  import: (deals: Record<string, unknown>[], skipDuplicates = true) =>
    api.post<ImportResult>('/deals/import', { deals, skipDuplicates }),
  addActivity: (id: string, data: Record<string, unknown>) =>
    api.post(`/deals/${id}/activities`, data),
  addAttachment: (id: string, data: { fileName: string; fileUrl: string }) =>
    api.post<DealAttachment>(`/deals/${id}/attachments`, data),
  uploadAttachment: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.upload<DealAttachment>(`/deals/${id}/attachments`, form);
  },
  removeAttachment: (attachmentId: string) => api.delete<null>(`/attachments/${attachmentId}`),
  downloadAttachment: (file: DealAttachment, target?: Window | null) =>
    api.download(`/attachments/${file.id}/download`, file.fileName, target),
};
