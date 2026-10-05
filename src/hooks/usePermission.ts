import { Permission, roleHasPermission, type Role } from '@/shared';
import { useAuthStore } from '../store/authStore';

export function usePermission(permission: Permission): boolean {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return false;
  return roleHasPermission(role as Role, permission);
}
