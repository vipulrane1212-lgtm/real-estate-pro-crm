'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/modules/auth/auth-context';
import { DemoDataProvider } from '@/modules/demo/demo-data-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { FollowUpAlarmOverlay } from '@/components/reminders/follow-up-alarm-overlay';
import { VoiceAlertAnnouncer } from '@/components/reminders/voice-alert-announcer';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { profile, user, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f8fafc] overflow-x-hidden">
      {/* Follow-up Loud Alarm Overlay (Unmissable full-screen reminder) */}
      <FollowUpAlarmOverlay />

      {/* Sidebar Navigation */}
      <Sidebar
        userRole={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        companyName="Diksha Real Estate"
      />

      {/* Main App Container */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Agreement / Renewal Voice Alert & Banner */}
        <VoiceAlertAnnouncer />

        <Topbar
          userName={profile?.full_name || 'Agent'}
          userEmail={user?.email}
          userRole={role}
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
        />

        <main className="flex-1 overflow-y-auto px-3 py-4 pb-24 sm:p-6 lg:p-8 lg:pb-8 min-w-0">
          <div className="w-full min-w-0">{children}</div>
        </main>
      </div>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <MobileBottomNav onOpenMenu={() => setSidebarOpen(true)} />
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <DemoDataProvider>
        <AdminLayoutContent>{children}</AdminLayoutContent>
      </DemoDataProvider>
    </AuthProvider>
  );
}
