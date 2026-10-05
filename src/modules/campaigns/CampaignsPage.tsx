import { Link } from 'react-router-dom';
import { Card, EmptyState, PageHeader } from '../../components/ui';
import { IconCampaigns } from '../../components/icons/Icons';

export function CampaignsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" description="Marketing campaigns will land in Phase 4" />
      <Card>
        <EmptyState
          icon={IconCampaigns}
          title="Campaigns are coming soon"
          message="Bulk email and lead-capture form campaigns are planned after team admin and sales/support hardening, and will need an email provider to be connected. Meanwhile, use Contacts, Deals, and Tickets to run your pipeline."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link to="/contacts" className="btn-secondary">
                Go to contacts
              </Link>
              <Link to="/dashboard" className="btn-primary">
                Back to dashboard
              </Link>
            </div>
          }
        />
      </Card>
    </div>
  );
}
