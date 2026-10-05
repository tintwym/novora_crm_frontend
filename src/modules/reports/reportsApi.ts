import { api } from '../../utils/api';

export interface SalesReport {
  range: { from: string; to: string; interval: 'day' | 'week' | 'month' };
  scope: 'company' | 'own';
  summary: {
    newDeals: number;
    won: number;
    lost: number;
    winRate: number | null;
    revenue: number;
    avgDealSize: number;
    avgSalesCycleDays: number;
    openDeals: number;
    openPipeline: number;
    weightedPipeline: number;
  };
  trend: Array<{ start: string; won: number; lost: number; revenue: number; created: number }>;
  byOwner: Array<{
    id: string;
    name: string;
    created: number;
    won: number;
    lost: number;
    winRate: number | null;
    revenue: number;
    openPipeline: number;
    activities: number;
  }>;
  topAccounts: Array<{ id: string; name: string; won: number; revenue: number }>;
  stages: Array<{ stage: string; count: number; value: number }>;
  bySource: Array<{
    source: string;
    created: number;
    won: number;
    lost: number;
    winRate: number | null;
    revenue: number;
    openPipeline: number;
  }>;
  activityMix: Array<{ type: string; count: number }>;
}

export const reportsApi = {
  sales: (params: { from?: string; to?: string }) => {
    const q = new URLSearchParams();
    if (params.from) q.set('from', params.from);
    if (params.to) q.set('to', params.to);
    const qs = q.toString();
    return api.get<SalesReport>(`/reports/sales${qs ? `?${qs}` : ''}`);
  },
};
