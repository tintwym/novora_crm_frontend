import { api } from '../../utils/api';

export interface SampleDataStatus {
  loaded: boolean;
  counts: Record<string, number>;
}

export const sampleDataApi = {
  status: () => api.get<SampleDataStatus>('/sample-data'),
  load: () => api.post<SampleDataStatus>('/sample-data', {}),
  remove: () => api.delete<SampleDataStatus>('/sample-data'),
};
