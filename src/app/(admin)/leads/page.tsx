import React from 'react';
import { LeadManagement } from '@/modules/leads/lead-management';

export const metadata = {
  title: 'Lead Management & Pipeline | Diksha Real Estate CRM',
  description: 'Inbound client enquiries, requirements, and pipeline stages',
};

export default function LeadsPage() {
  return <LeadManagement />;
}
