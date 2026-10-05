import type { DealStage } from '@/shared';
import { api } from '../../utils/api';

export type AutomationTaskType = 'TASK' | 'CALL' | 'MEETING' | 'EMAIL';
export type AutomationAssignee = 'DEAL_OWNER' | 'ACTOR';

export interface AutomationRule {
  id: string;
  name: string;
  triggerStage: DealStage | null;
  taskType: AutomationTaskType;
  taskSubject: string;
  taskNote: string | null;
  dueInDays: number;
  assignTo: AutomationAssignee;
  isActive: boolean;
  runCount: number;
  openTasks: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutomationRuleInput {
  name: string;
  triggerStage: DealStage | 'ANY';
  taskType: AutomationTaskType;
  taskSubject: string;
  taskNote: string | null;
  dueInDays: number;
  assignTo: AutomationAssignee;
  isActive?: boolean;
}

/** Tasks a deal change created through automation rules, returned on deal create/update. */
export interface AutomationTaskResult {
  id: string;
  subject: string;
  rule: string;
}

export const automationsApi = {
  list: () => api.get<AutomationRule[]>('/automations'),
  create: (data: AutomationRuleInput) => api.post<AutomationRule>('/automations', data),
  update: (id: string, data: Partial<AutomationRuleInput>) => api.patch<AutomationRule>(`/automations/${id}`, data),
  remove: (id: string) => api.delete<Record<string, never>>(`/automations/${id}`),
};

export function automationNotice(tasks: AutomationTaskResult[] | undefined): string | null {
  if (!tasks || tasks.length === 0) return null;
  if (tasks.length === 1) return `Automation added a follow-up: “${tasks[0].subject}”.`;
  return `Automations added ${tasks.length} follow-ups: ${tasks.map((t) => `“${t.subject}”`).join(', ')}.`;
}
