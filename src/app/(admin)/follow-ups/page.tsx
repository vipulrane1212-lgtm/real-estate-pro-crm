import React from 'react';
import { FollowUpManagement } from '@/modules/follow-ups/follow-up-management';

export const metadata = {
  title: 'Follow-ups & Reminders | Diksha Real Estate CRM',
  description: 'Manage scheduled calls, site visits, and client reminders',
};

export default function FollowUpsPage() {
  return <FollowUpManagement />;
}
