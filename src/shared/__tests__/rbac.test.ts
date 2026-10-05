import { describe, expect, it } from 'vitest';
import { Permission, Role, roleHasPermission } from '../constants/roles';
import { DEAL_STAGES, TICKET_PRIORITIES } from '../index';

describe('rbac', () => {
  it('admin can manage users', () => {
    expect(roleHasPermission(Role.ADMIN, Permission.MANAGE_USERS)).toBe(true);
  });

  it('sales rep cannot forecast', () => {
    expect(roleHasPermission(Role.SALES_REP, Permission.FORECAST_DEALS)).toBe(false);
  });

  it('only managers and admins edit the product catalog', () => {
    expect(roleHasPermission(Role.SALES_MANAGER, Permission.MANAGE_PRODUCTS)).toBe(true);
    expect(roleHasPermission(Role.SALES_REP, Permission.MANAGE_PRODUCTS)).toBe(false);
  });

  it('only managers and admins set up automations', () => {
    expect(roleHasPermission(Role.ADMIN, Permission.MANAGE_AUTOMATIONS)).toBe(true);
    expect(roleHasPermission(Role.SALES_MANAGER, Permission.MANAGE_AUTOMATIONS)).toBe(true);
    expect(roleHasPermission(Role.SALES_REP, Permission.MANAGE_AUTOMATIONS)).toBe(false);
    expect(roleHasPermission(Role.SUPPORT_AGENT, Permission.MANAGE_AUTOMATIONS)).toBe(false);
  });

  it('only admins read the audit log', () => {
    expect(roleHasPermission(Role.ADMIN, Permission.VIEW_AUDIT_LOG)).toBe(true);
    expect(roleHasPermission(Role.SUPER_ADMIN, Permission.VIEW_AUDIT_LOG)).toBe(true);
    expect(roleHasPermission(Role.SALES_MANAGER, Permission.VIEW_AUDIT_LOG)).toBe(false);
    expect(roleHasPermission(Role.SALES_REP, Permission.VIEW_AUDIT_LOG)).toBe(false);
  });
});

describe('constants', () => {
  it('exports deal stages and ticket priorities', () => {
    expect(DEAL_STAGES).toContain('LEAD');
    expect(TICKET_PRIORITIES).toContain('URGENT');
  });
});
