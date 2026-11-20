import React from 'react';
import { CallsManagement } from '@/modules/calls/calls-management';

export const metadata = {
  title: 'Telephony & Call Logs | Diksha Real Estate CRM',
  description: 'Track client phone interactions, call durations, and audio recordings',
};

export default function CallsPage() {
  return <CallsManagement />;
}
