export const DEAL_STAGES = [
  'LEAD',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'WON',
  'LOST',
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export const ACTIVITY_TYPES = ['CALL', 'MEETING', 'EMAIL', 'TASK', 'NOTE'] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const LEAD_SOURCES = [
  'WEBSITE',
  'REFERRAL',
  'CAMPAIGN',
  'EVENT',
  'COLD_OUTREACH',
  'SOCIAL',
  'PARTNER',
  'OTHER',
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];
