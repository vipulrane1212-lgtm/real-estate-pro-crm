'use client';

import React, { useState } from 'react';
import { AuthProvider, useAuth } from '@/modules/auth/auth-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { profile, user, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      {/* Sidebar Navigation */}
      <Sidebar
        userRole={role}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        companyName="Diksha Real Estate"
      />

      {/* Main App Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar
          userName={profile?.full_name || 'Agent'}
          userEmail={user?.email}
          userRole={role}
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
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
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthProvider>
  );
}
