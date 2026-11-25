'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  UserCheck,
  Camera,
  MapPin,
  Calendar,
  Clock,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldAlert,
  Info,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Navigation,
  Smartphone,
} from 'lucide-react';
import { AttendanceRecord } from '@/lib/supabase/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CameraPunchModal } from './camera-punch-modal';
import { LiveFleetRadar } from './live-fleet-radar';
import { ANDROID_APK_DOWNLOAD_URL } from '@/lib/mobile-app';

interface AttendanceSummary {
  total: number;
  present: number;
  late: number;
  absent: number;
}

export function AttendanceManagement() {
  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({ total: 0, present: 0, late: 0, absent: 0 });
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<{ id: string; full_name: string; role: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected date for muster roll (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Selected month for reports (YYYY-MM)
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Punch Modal state
  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [punchMode, setPunchMode] = useState<'check-in' | 'check-out'>('check-in');

  // Preview Photo Modal state
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Active Tab for Admin: 'daily' | 'monthly' | 'radar'
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'radar'>('daily');
  const [monthlyData, setMonthlyData] = useState<{
    summary: Array<{
      employeeName: string;
      designation: string;
      daysPresent: number;
      daysLate: number;
      daysAbsent: number;
      totalLogged: number;
    }>;
  }>({ summary: [] });
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams?.get('tab');
    if (tab === 'radar') {
      setActiveTab('radar');
    } else if (tab === 'monthly') {
      setActiveTab('monthly');
    }
  }, [searchParams]);

  const fetchAttendance = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    try {
      // 1. Fetch current user
      const meRes = await fetch('/api/auth/me');
      if (meRes.ok) {
        const meData = await meRes.json();
        setUserProfile(meData.user);
        setIsAdmin(['super_admin', 'admin'].includes(meData.user?.role));
      }

      // 2. Fetch daily attendance
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setAttendanceList(data.attendance || []);
        if (data.summary) setSummary(data.summary);
      }

      // 3. Fetch monthly summary if admin
      const repRes = await fetch(`/api/attendance/report?month=${selectedMonth}`);
      if (repRes.ok) {
        const repData = await repRes.json();
        setMonthlyData({ summary: repData.summary || [] });
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
    const handleToggle = () => fetchAttendance();
    window.addEventListener('diksha_demo_toggle', handleToggle);
    return () => window.removeEventListener('diksha_demo_toggle', handleToggle);
  }, [selectedDate, selectedMonth]);

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const res = await fetch(`/api/attendance/report?month=${selectedMonth}&format=xlsx`);
      if (!res.ok) throw new Error('Failed to generate attendance report');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Diksha_Attendance_Report_${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to download Excel report');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Check today's record for employee card
  const todayRecord = attendanceList.find((a) => a.date === todayStr);
  const hasCheckedInToday = !!todayRecord?.check_in;
  const hasCheckedOutToday = !!todayRecord?.check_out;

  const openPunchModal = (mode: 'check-in' | 'check-out') => {
    setPunchMode(mode);
    setPunchModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Attendance & Geolocation Verification
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Daily check-in / check-out with live camera selfie verification and GPS fix.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAttendance(true)}
            disabled={isRefreshing}
            className="border-slate-200"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          {isAdmin && (
            <Button
              size="sm"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium shadow-xs"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {isExportingExcel ? 'Exporting...' : 'Export to Excel (.xlsx)'}
            </Button>
          )}
        </div>
      </div>

      {/* Employee Quick Punch Card */}
      <div className="rounded-xl border border-amber-300/80 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Live Phone Attendance Terminal
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Today&apos;s Status: {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span>
                Check-in:{' '}
                <strong className={todayRecord?.is_late ? 'text-amber-700 font-bold' : 'text-slate-900'}>
                  {todayRecord?.check_in
                    ? new Date(todayRecord.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : 'Not Recorded'}
                </strong>
                {todayRecord?.is_late && (
                  <span className="ml-1 rounded bg-amber-100 text-amber-800 px-1 text-[10px] font-bold">LATE</span>
                )}
              </span>
              <span>•</span>
              <span>
                Check-out:{' '}
                <strong className="text-slate-900">
                  {todayRecord?.check_out
                    ? new Date(todayRecord.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                    : 'Not Recorded'}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasCheckedInToday ? (
              <Button
                onClick={() => openPunchModal('check-in')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs px-5 py-2.5 text-sm gap-2"
              >
                <Camera className="h-4 w-4" />
                Check-In (Live Selfie)
              </Button>
            ) : !hasCheckedOutToday ? (
              <Button
                onClick={() => openPunchModal('check-out')}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs px-5 py-2.5 text-sm gap-2"
              >
                <Camera className="h-4 w-4" />
                Check-Out (Live Selfie)
              </Button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Shift Completed Today
              </div>
            )}
            <a
              href={ANDROID_APK_DOWNLOAD_URL}
              download="Diksha-CRM-Mobile.apk"
              className="inline-flex min-h-[40px] sm:min-h-[36px] items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <Smartphone className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>Android App (.apk)</span>
            </a>
          </div>
        </div>
      </div>

      {/* Honest Limitations Transparency Notice */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600 shrink-0">
            <Info className="h-5 w-5" />
          </div>
          <div className="text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Attendance System Architectural Disclosures & Safeguards:</p>
            <p>
              1. <strong>Spot Geolocation Only:</strong> GPS coordinates and address are acquired solely at the moment of check-in and check-out. Background continuous tracking is disabled.
            </p>
            <p>
              2. <strong>Photo Verification Proof:</strong> The live camera snapshot functions as non-repudiable visual evidence. Biometric face-matching against historical templates is not performed.
            </p>
            <p>
              3. <strong>Anti-Spoofing & Gallery Block:</strong> Device gallery/file-pickers are intentionally disabled. If location permission is denied by the employee, check-in fails immediately.
            </p>
          </div>
        </div>
      </div>

      {/* Admin Controls & Tabs */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <button
                onClick={() => setActiveTab('daily')}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === 'daily'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Daily Muster Roll
              </button>
              <button
                onClick={() => setActiveTab('monthly')}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                  activeTab === 'monthly'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Monthly Executive Report
              </button>
              <button
                onClick={() => setActiveTab('radar')}
                className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'radar'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <Navigation className="h-3.5 w-3.5" />
                24/7 Live Fleet Radar
              </button>
            </div>

            {/* Date Pickers */}
            {activeTab === 'daily' ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Select Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            ) : activeTab === 'monthly' ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Select Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            ) : null}
          </div>

          {/* Daily Muster Roll View */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              {/* Daily KPI Metric Cards */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Records</span>
                  <p className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Present (On Time)</span>
                  <p className="mt-1 text-2xl font-bold text-emerald-600">{summary.present}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Late (After 10:00 AM)</span>
                  <p className="mt-1 text-2xl font-bold text-amber-600">{summary.late}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Absent / Leave</span>
                  <p className="mt-1 text-2xl font-bold text-rose-600">{summary.absent}</p>
                </div>
              </div>

              {/* Attendance Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
                {isLoading ? (
                  <div className="flex h-64 items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
                  </div>
                ) : attendanceList.length === 0 ? (
                  <EmptyState
                    title="No data yet"
                    description={`No attendance punches recorded for ${selectedDate}. Check-ins recorded from employee phones will appear here.`}
                    icon={UserCheck}
                  />
                ) : (
                  <>
                    {/* Mobile Muster Roll Cards (< md) */}
                    <div className="divide-y divide-slate-100 md:hidden">
                      {attendanceList.map((rec) => {
                        const isLate = rec.is_late || rec.status === 'late';
                        return (
                          <div key={rec.id} className="p-3.5 space-y-2.5 bg-white">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="font-bold text-sm text-slate-900 block">
                                  {rec.employee?.profile?.full_name || 'Staff Member'}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {rec.employee?.designation || 'Sales Agent'}
                                </span>
                              </div>
                              <span
                                className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                                  isLate
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : rec.status === 'present'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-rose-50 text-rose-800 border-rose-300'
                                }`}
                              >
                                {isLate ? 'Late' : rec.status}
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 text-xs">
                              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                                <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                                  Check-In
                                </span>
                                <div className="flex items-center gap-2">
                                  {rec.check_in_selfie_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={rec.check_in_selfie_url}
                                      alt="In"
                                      onClick={() => setPreviewPhotoUrl(rec.check_in_selfie_url || null)}
                                      className="h-9 w-9 rounded object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                      <Camera className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900 block">
                                      {rec.check_in
                                        ? new Date(rec.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                        : '—'}
                                    </span>
                                    {rec.check_in_latitude && rec.check_in_longitude && (
                                      <a
                                        href={`https://www.google.com/maps?q=${rec.check_in_latitude},${rec.check_in_longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-amber-700 font-semibold underline"
                                      >
                                        Map Pin
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                                <span className="text-[10px] font-semibold uppercase text-slate-400 block mb-1">
                                  Check-Out
                                </span>
                                <div className="flex items-center gap-2">
                                  {rec.check_out_selfie_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={rec.check_out_selfie_url}
                                      alt="Out"
                                      onClick={() => setPreviewPhotoUrl(rec.check_out_selfie_url || null)}
                                      className="h-9 w-9 rounded object-cover border border-slate-200 shrink-0"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                      <Camera className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <span className="font-bold text-slate-900 block">
                                      {rec.check_out
                                        ? new Date(rec.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                        : 'Pending'}
                                    </span>
                                    {rec.check_out_latitude && rec.check_out_longitude && (
                                      <a
                                        href={`https://www.google.com/maps?q=${rec.check_out_latitude},${rec.check_out_longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[10px] text-rose-700 font-semibold underline"
                                      >
                                        Map Pin
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Employee</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Check-In Selfie & Time</th>
                          <th className="py-3 px-4">Check-In Location</th>
                          <th className="py-3 px-4">Check-Out Selfie & Time</th>
                          <th className="py-3 px-4">Check-Out Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {attendanceList.map((rec) => {
                          const isLate = rec.is_late || rec.status === 'late';

                          return (
                            <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                              {/* Employee Details */}
                              <td className="py-3 px-4">
                                <span className="font-bold text-slate-900 block">
                                  {rec.employee?.profile?.full_name || 'Staff Member'}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {rec.employee?.designation || 'Sales Agent'}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${
                                    isLate
                                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                                      : rec.status === 'present'
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                      : 'bg-rose-50 text-rose-800 border-rose-300'
                                  }`}
                                >
                                  {isLate ? 'Late' : rec.status}
                                </span>
                              </td>

                              {/* Check-in info & Selfie */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {rec.check_in_selfie_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={rec.check_in_selfie_url}
                                      alt="Check-in Selfie"
                                      onClick={() => setPreviewPhotoUrl(rec.check_in_selfie_url || null)}
                                      className="h-9 w-9 rounded-md object-cover border border-slate-200 cursor-pointer hover:ring-2 hover:ring-amber-500"
                                      title="Click to view full photo"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                                      <Camera className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-semibold text-slate-900 block">
                                      {rec.check_in
                                        ? new Date(rec.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                        : '—'}
                                    </span>
                                    {isLate && (
                                      <span className="text-[10px] text-amber-700 font-medium">After 10:00 AM</span>
                                    )}
                                  </div>
                                </div>
                              </td>

                              {/* Check-in Location & Maps */}
                              <td className="py-3 px-4">
                                {rec.check_in_latitude && rec.check_in_longitude ? (
                                  <div>
                                    <a
                                      href={`https://www.google.com/maps?q=${rec.check_in_latitude},${rec.check_in_longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-amber-700 hover:underline font-medium"
                                    >
                                      <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                      <span>Google Maps</span>
                                    </a>
                                    <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                      {rec.check_in_address || `${rec.check_in_latitude.toFixed(4)}, ${rec.check_in_longitude.toFixed(4)}`}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>

                              {/* Check-out info & Selfie */}
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  {rec.check_out_selfie_url ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={rec.check_out_selfie_url}
                                      alt="Check-out Selfie"
                                      onClick={() => setPreviewPhotoUrl(rec.check_out_selfie_url || null)}
                                      className="h-9 w-9 rounded-md object-cover border border-slate-200 cursor-pointer hover:ring-2 hover:ring-rose-500"
                                      title="Click to view full photo"
                                    />
                                  ) : (
                                    <div className="h-9 w-9 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
                                      <Camera className="h-4 w-4" />
                                    </div>
                                  )}
                                  <div>
                                    <span className="font-semibold text-slate-900 block">
                                      {rec.check_out
                                        ? new Date(rec.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                        : 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Check-out Location & Maps */}
                              <td className="py-3 px-4">
                                {rec.check_out_latitude && rec.check_out_longitude ? (
                                  <div>
                                    <a
                                      href={`https://www.google.com/maps?q=${rec.check_out_latitude},${rec.check_out_longitude}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-rose-700 hover:underline font-medium"
                                    >
                                      <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                                      <span>Google Maps</span>
                                    </a>
                                    <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                                      {rec.check_out_address || `${rec.check_out_latitude.toFixed(4)}, ${rec.check_out_longitude.toFixed(4)}`}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Monthly Executive View */}
          {activeTab === 'monthly' && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Monthly Attendance Telemetry</h3>
                  <p className="text-xs text-slate-500">Aggregated muster totals for {selectedMonth}</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleExportExcel}
                  disabled={isExportingExcel}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs w-full sm:w-auto"
                >
                  <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
                  Download Monthly .xlsx
                </Button>
              </div>

              {monthlyData.summary.length === 0 ? (
                <EmptyState
                  title="No data yet"
                  description={`No monthly attendance summary recorded for ${selectedMonth}.`}
                  icon={UserCheck}
                />
              ) : (
                <>
                  {/* Mobile Monthly Cards (< md) */}
                  <div className="space-y-2.5 md:hidden">
                    {monthlyData.summary.map((row) => (
                      <div key={row.employeeName} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-bold text-sm text-slate-900">{row.employeeName}</div>
                            <div className="text-[11px] text-slate-500">{row.designation}</div>
                          </div>
                          <span className="font-mono text-xs font-bold text-slate-700">
                            {row.totalLogged} punches
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 rounded-lg bg-white border border-slate-200 p-2 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Present</span>
                            <strong className="text-emerald-600">{row.daysPresent}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Late</span>
                            <strong className="text-amber-600">{row.daysLate}</strong>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Absent</span>
                            <strong className="text-rose-600">{row.daysAbsent}</strong>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-4">Employee</th>
                          <th className="py-3 px-4">Designation</th>
                          <th className="py-3 px-4 text-center">Days Present</th>
                          <th className="py-3 px-4 text-center">Days Late</th>
                          <th className="py-3 px-4 text-center">Days Absent</th>
                          <th className="py-3 px-4 text-right">Total Punches</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {monthlyData.summary.map((row) => (
                          <tr key={row.employeeName} className="hover:bg-slate-50/80">
                            <td className="py-3 px-4 font-bold text-slate-900">{row.employeeName}</td>
                            <td className="py-3 px-4 text-slate-500">{row.designation}</td>
                            <td className="py-3 px-4 text-center font-bold text-emerald-600">{row.daysPresent}</td>
                            <td className="py-3 px-4 text-center font-bold text-amber-600">{row.daysLate}</td>
                            <td className="py-3 px-4 text-center font-bold text-rose-600">{row.daysAbsent}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold">{row.totalLogged}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* 24/7 Live Fleet Radar View */}
          {activeTab === 'radar' && <LiveFleetRadar />}
        </div>
      )}

      {/* Camera Punch Modal */}
      <CameraPunchModal
        isOpen={punchModalOpen}
        onClose={() => setPunchModalOpen(false)}
        onSuccess={() => {
          setPunchModalOpen(false);
          fetchAttendance(true);
        }}
        mode={punchMode}
        employeeName={userProfile?.full_name}
      />

      {/* Selfie Photo Preview Modal */}
      {previewPhotoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreviewPhotoUrl(null)}
        >
          <div className="relative max-w-lg rounded-xl overflow-hidden bg-slate-900 border border-slate-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewPhotoUrl}
              alt="Live Attendance Proof"
              className="max-h-[80vh] w-auto object-contain"
            />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black"
            >
              Close ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
