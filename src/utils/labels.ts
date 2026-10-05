import { DEAL_STAGES, LEAD_SOURCES, type DealStage, type LeadSource } from '@/shared';

export const STAGE_LABEL: Record<DealStage, string> = {
  LEAD: 'Lead',
  QUALIFIED: 'Qualified',
  PROPOSAL: 'Proposal',
  NEGOTIATION: 'Negotiation',
  WON: 'Won',
  LOST: 'Lost',
};

export function stageLabel(stage: string): string {
  return STAGE_LABEL[stage as DealStage] ?? stage;
}

export const SOURCE_LABEL: Record<LeadSource, string> = {
  WEBSITE: 'Website',
  REFERRAL: 'Referral',
  CAMPAIGN: 'Campaign',
  EVENT: 'Event',
  COLD_OUTREACH: 'Cold outreach',
  SOCIAL: 'Social media',
  PARTNER: 'Partner',
  OTHER: 'Other',
};

export function sourceLabel(source: string | null | undefined): string {
  if (!source) return '';
  return SOURCE_LABEL[source as LeadSource] ?? source;
}

export { DEAL_STAGES, LEAD_SOURCES };
