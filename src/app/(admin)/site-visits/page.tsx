import React from 'react';
import { SiteVisitsManagement } from '@/modules/site-visits/site-visits-management';

export const metadata = {
  title: 'Site Visits & Inspection Schedules | Diksha Real Estate CRM',
  description: 'Manage daily property visits, agent itineraries, and client feedback',
};

export default function SiteVisitsPage() {
  return <SiteVisitsManagement />;
}
