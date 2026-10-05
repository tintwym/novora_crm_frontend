import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { LoginPage } from './modules/auth/LoginPage';
import { RegisterPage } from './modules/auth/RegisterPage';
import { ForgotPasswordPage } from './modules/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './modules/auth/ResetPasswordPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { ContactsPage } from './modules/contacts/ContactsPage';
import { ContactDetailPage } from './modules/contacts/ContactDetailPage';
import { DuplicatesPage } from './modules/contacts/DuplicatesPage';
import { CompaniesPage } from './modules/companies/CompaniesPage';
import { CompanyDetailPage } from './modules/companies/CompanyDetailPage';
import { DealPipelinePage } from './modules/deals/DealPipelinePage';
import { DealDetailPage } from './modules/deals/DealDetailPage';
import { ForecastPage } from './modules/deals/ForecastPage';
import { ActivitiesPage } from './modules/activities/ActivitiesPage';
import { QuotesPage } from './modules/quotes/QuotesPage';
import { QuoteDetailPage } from './modules/quotes/QuoteDetailPage';
import { ProductsPage } from './modules/products/ProductsPage';
import { AutomationsPage } from './modules/automations/AutomationsPage';
import { AuditLogPage } from './modules/audit/AuditLogPage';
import { TicketsPage } from './modules/tickets/TicketsPage';
import { TicketDetailPage } from './modules/tickets/TicketDetailPage';
import { KnowledgeBasePage } from './modules/tickets/KnowledgeBasePage';
import { CustomerPortalPage } from './modules/portal/CustomerPortalPage';
import { UsersPage } from './modules/users/UsersPage';
import { CampaignsPage } from './modules/campaigns/CampaignsPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { SettingsPage } from './modules/settings/SettingsPage';
import { HelpPage } from './modules/help/HelpPage';
import { useAuthStore } from './store/authStore';

function PublicOnly({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicOnly>
            <ForgotPasswordPage />
          </PublicOnly>
        }
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/portal/:portalSlug" element={<CustomerPortalPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/contacts/duplicates" element={<DuplicatesPage />} />
          <Route path="/contacts/:id" element={<ContactDetailPage />} />
          <Route path="/companies" element={<CompaniesPage />} />
          <Route path="/companies/:id" element={<CompanyDetailPage />} />
          <Route path="/deals" element={<DealPipelinePage />} />
          <Route path="/deals/forecast" element={<ForecastPage />} />
          <Route path="/deals/:id" element={<DealDetailPage />} />
          <Route path="/activities" element={<ActivitiesPage />} />
          <Route path="/quotes" element={<QuotesPage />} />
          <Route path="/quotes/:id" element={<QuoteDetailPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/automations" element={<AutomationsPage />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route path="/tickets/kb" element={<KnowledgeBasePage />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/audit-log" element={<AuditLogPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
