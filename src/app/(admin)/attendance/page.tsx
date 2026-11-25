'use client';

import React, { Suspense } from 'react';
import { AttendanceManagement } from '@/modules/attendance/attendance-management';

export default function AttendancePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading attendance...</div>}>
      <AttendanceManagement />
    </Suspense>
  );
}
