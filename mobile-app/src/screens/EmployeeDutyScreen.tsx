import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Camera,
  CheckCircle2,
  XCircle,
  PhoneCall,
  Battery,
  ShieldCheck,
  Radio,
  Car,
  AlertTriangle,
  RefreshCw,
  LogOut,
  Calendar,
} from 'lucide-react';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { locationTracker } from '../services/location-tracker.service';
import { telephonyService } from '../services/telephony.service';
import { APP_CONFIG } from '../config';

interface EmployeeProfile {
  id: string;
  name: string;
  designation: string;
  phone: string;
}

export function EmployeeDutyScreen() {
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [isPunching, setIsPunching] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile>({
    id: 'emp_01',
    name: 'Deepak Yadav',
    designation: 'Senior Field Inspection Coordinator',
    phone: '+91 98390 12005',
  });

  const [assignedVisits, setAssignedVisits] = useState([
    {
      id: 'v_1',
      leadId: 'l_1',
      clientName: 'Ashok Maurya',
      phone: '+91 99182 33445',
      property: 'Sushant Golf City Plot A-12',
      time: '11:30 AM',
      status: 'Confirmed',
    },
    {
      id: 'v_2',
      leadId: 'l_2',
      clientName: 'Sunita Jain',
      phone: '+91 98391 88220',
      property: 'Shalimar Grand 3 BHK',
      time: '03:00 PM',
      status: 'Pending',
    },
  ]);

  useEffect(() => {
    locationTracker.init().then(() => {
      setIsOnDuty(locationTracker.getTrackingStatus());
    });
  }, []);

  // Handle Punch In with Selfie Camera & GPS
  const handlePunchIn = async () => {
    try {
      setIsPunching(true);

      // 1. Capture Selfie Attendance
      let photoUrl: string | null = null;
      try {
        const image = await CapCamera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });
        photoUrl = image.dataUrl || null;
        setSelfiePhoto(photoUrl);
      } catch (camErr) {
        console.warn('Camera canceled or skipped:', camErr);
      }

      // 2. Start Background GPS Tracker
      const started = await locationTracker.startDutyTracking();
      if (started) {
        setIsOnDuty(true);
        setLastPingTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch (err) {
      console.error('Punch in error:', err);
      alert('Unable to complete punch-in. Please ensure GPS and Camera permissions are granted.');
    } finally {
      setIsPunching(false);
    }
  };

  // Handle Punch Out: Stops GPS Tracking immediately
  const handlePunchOut = async () => {
    if (!confirm('Are you sure you want to end your duty shift? GPS tracking will stop immediately.')) return;
    try {
      setIsPunching(true);
      await locationTracker.stopDutyTracking();
      setIsOnDuty(false);
      setSelfiePhoto(null);
    } catch (err) {
      console.error('Punch out error:', err);
    } finally {
      setIsPunching(false);
    }
  };

  // Direct Call to Client with Auto-Record / Bridge
  const handleCallClient = async (leadId: string, phone: string, name: string) => {
    await telephonyService.callClient({
      leadId,
      clientPhone: phone,
      clientName: name,
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col justify-between max-w-md mx-auto shadow-2xl">
      {/* Top Header */}
      <header className="p-5 bg-slate-950/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-400">
            {profile.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">{profile.name}</h1>
            <p className="text-xs text-slate-400">{profile.designation}</p>
          </div>
        </div>

        {/* Live Tracking Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
            isOnDuty
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${isOnDuty ? 'bg-emerald-500 animate-ping' : 'bg-slate-500'}`}
          />
          {isOnDuty ? 'ON DUTY' : 'OFF DUTY'}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-5 space-y-5 flex-1 overflow-y-auto">
        {/* Status Radar Card */}
        <div
          className={`p-5 rounded-2xl border transition-all ${
            isOnDuty
              ? 'bg-gradient-to-br from-emerald-950/40 to-slate-900 border-emerald-500/30'
              : 'bg-slate-950/40 border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Radio className={`w-4 h-4 ${isOnDuty ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
              <span>Shift Radar Telemetry</span>
            </div>
            {lastPingTime && (
              <span className="text-[11px] text-slate-400">Synced {lastPingTime}</span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-2xl font-black text-white tracking-tight">
                {isOnDuty ? '24/7 Field GPS Active' : 'Shift Not Started'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {isOnDuty
                  ? 'Real-time location stream connected to Lucknow HQ'
                  : 'Punch in to activate GPS tracking and client visit duties'}
              </p>
            </div>
          </div>

          {/* Telemetry Chips */}
          {isOnDuty && (
            <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">GPS FIX</span>
                <strong className="text-emerald-400 font-bold">High (3m)</strong>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">SYNC RATE</span>
                <strong className="text-white font-bold">Every 3m</strong>
              </div>
              <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">PRIVACY</span>
                <strong className="text-cyan-400 font-bold">Shift Protected</strong>
              </div>
            </div>
          )}
        </div>

        {/* Punch In / Punch Out Action Button */}
        <div>
          {!isOnDuty ? (
            <button
              onClick={handlePunchIn}
              disabled={isPunching}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-base rounded-2xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-3 transition-all cursor-pointer active:scale-98"
            >
              {isPunching ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  <span>Punch In & Start Duty Shift</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handlePunchOut}
              disabled={isPunching}
              className="w-full py-3.5 px-6 bg-slate-800 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700 hover:border-red-800/50 font-semibold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Punch Out & Stop GPS Tracking</span>
            </button>
          )}
        </div>

        {/* Today's Field Schedule / Site Visits */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Today's Site Visits ({assignedVisits.length})</span>
            </h2>
          </div>

          <div className="space-y-2.5">
            {assignedVisits.map((visit) => (
              <div
                key={visit.id}
                className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{visit.clientName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {visit.time}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-cyan-400" />
                    <span>{visit.property}</span>
                  </p>
                </div>

                {/* Quick Call Action (Bridge & Record) */}
                <button
                  onClick={() => handleCallClient(visit.leadId, visit.phone, visit.clientName)}
                  className="p-3 bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/40 text-emerald-400 rounded-xl cursor-pointer transition-all active:scale-95"
                  title="Call Client (Auto-Recorded)"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Note for Employees */}
        <div className="p-3.5 rounded-xl bg-slate-950/30 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5 leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            <strong>Privacy Guarantee:</strong> GPS location monitoring is active strictly while you are Punched In. When you Punch Out, all location tracking terminates immediately.
          </p>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="p-3 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-500">
        Diksha Real Estate Operations Portal • v1.0 Android APK
      </footer>
    </div>
  );
}
