import { api } from '../../utils/api';

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  unitPrice: number;
  isActive: boolean;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  sku?: string | null;
  description?: string | null;
  unitPrice: number;
  isActive?: boolean;
}

export const productsApi = {
  list: (opts: { includeArchived?: boolean; q?: string } = {}) => {
    const params = new URLSearchParams();
    if (opts.includeArchived) params.set('includeArchived', 'true');
    if (opts.q) params.set('q', opts.q);
    const qs = params.toString();
    return api.get<Product[]>(`/products${qs ? `?${qs}` : ''}`);
  },
  create: (data: ProductInput) => api.post<Product>('/products', data),
  update: (id: string, data: Partial<ProductInput>) => api.patch<Product>(`/products/${id}`, data),
  remove: (id: string) => api.delete<{ archived: boolean }>(`/products/${id}`),
};
