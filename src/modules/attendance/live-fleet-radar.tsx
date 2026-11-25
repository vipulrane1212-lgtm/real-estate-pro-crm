'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Navigation,
  MapPin,
  Battery,
  BatteryCharging,
  BatteryWarning,
  Car,
  Footprints,
  Clock,
  RefreshCw,
  Search,
  Filter,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  Eye,
  ChevronRight,
  Maximize2,
  Minimize2,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LiveFleetAgent } from '@/app/api/location/live/route';
import { LocationBreadcrumb } from '@/app/api/location/history/route';
import { useDemoData } from '@/modules/demo/demo-data-context';
import { ANDROID_APK_DOWNLOAD_URL } from '@/lib/mobile-app';

export function LiveFleetRadar() {
  const { showDemoData } = useDemoData();
  const [agents, setAgents] = useState<LiveFleetAgent[]>([]);
  const [summary, setSummary] = useState<{
    total_tracked: number;
    total_on_duty: number;
    moving: number;
    stationary: number;
    battery_low: number;
  }>({
    total_tracked: 0,
    total_on_duty: 0,
    moving: 0,
    stationary: 0,
    battery_low: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'moving' | 'stationary' | 'battery_low'>('all');
  const [selectedAgent, setSelectedAgent] = useState<LiveFleetAgent | null>(null);

  // Route Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayRoute, setReplayRoute] = useState<LocationBreadcrumb[]>([]);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlayingAuto, setIsPlayingAuto] = useState(false);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);

  // Map DOM and Leaflet References
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const polylineRef = useRef<any>(null);
  const replayMarkerRef = useRef<any>(null);

  // Fetch live fleet data
  const fetchLiveFleet = async (silent = false) => {
    try {
      if (!silent) setIsRefreshing(true);
      const res = await fetch('/api/location/live');
      if (res.ok) {
        const data = await res.json();
        setAgents(data.agents || []);
        if (data.summary) setSummary(data.summary);

        // Auto-select first agent if none selected
        if (!selectedAgent && data.agents && data.agents.length > 0) {
          setSelectedAgent(data.agents[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load live fleet coordinates:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveFleet();
    const interval = setInterval(() => {
      if (!isReplaying) {
        fetchLiveFleet(true);
      }
    }, 15000); // Poll every 15s

    const handleToggle = () => fetchLiveFleet();
    window.addEventListener('diksha_demo_toggle', handleToggle);
    return () => {
      clearInterval(interval);
      window.removeEventListener('diksha_demo_toggle', handleToggle);
    };
  }, [isReplaying]);

  // Load and initialize Leaflet map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      // Dynamically import Leaflet
      const L = (await import('leaflet')).default;

      // Inject Leaflet CSS if not already present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!leafletMapRef.current && mapContainerRef.current && isMounted) {
        // Lucknow coordinates
        const map = L.map(mapContainerRef.current, {
          center: [26.8467, 80.99],
          zoom: 12,
          zoomControl: true,
        });

        // Clean OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors | Diksha Real Estate Fleet Radar',
        }).addTo(map);

        leafletMapRef.current = map;
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
      }
    };
  }, []);

  // Update map markers when agents change or when not in replay mode
  useEffect(() => {
    if (!leafletMapRef.current || isReplaying) return;

    import('leaflet').then((LModule) => {
      const L = LModule.default;
      const map = leafletMapRef.current;
      if (!map) return;

      // Remove previous markers
      Object.values(markersRef.current).forEach((m) => m.remove());
      markersRef.current = {};

      // Add marker for each agent
      agents.forEach((agent) => {
        const isSelected = selectedAgent?.employee_id === agent.employee_id;
        const isMoving = agent.status === 'moving';

        const customIcon = L.divIcon({
          className: 'custom-fleet-pin',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="
                background: ${isMoving ? '#059669' : '#d97706'};
                color: #ffffff;
                font-weight: 800;
                font-size: 11px;
                padding: 4px 8px;
                border-radius: 9999px;
                border: 2px solid #ffffff;
                box-shadow: 0 4px 12px rgba(0,0,0,0.25);
                white-space: nowrap;
                display: flex;
                align-items: center;
                gap: 4px;
              ">
                <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ffffff; animation: ${
                  isMoving ? 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none'
                }"></span>
                ${agent.name.split(' ')[0]} ${isMoving ? `(${Math.round(agent.speed_kmh)} km/h)` : ''}
              </div>
              <div style="
                width: 0;
                height: 0;
                border-left: 6px solid transparent;
                border-right: 6px solid transparent;
                border-top: 6px solid ${isMoving ? '#059669' : '#d97706'};
              "></div>
            </div>
          `,
          iconSize: [80, 40],
          iconAnchor: [40, 36],
        });

        const marker = L.marker([agent.latitude, agent.longitude], { icon: customIcon }).addTo(map);

        marker.on('click', () => {
          setSelectedAgent(agent);
          map.setView([agent.latitude, agent.longitude], 14, { animate: true });
        });

        markersRef.current[agent.employee_id] = marker;
      });
    });
  }, [agents, selectedAgent, isReplaying]);

  // Handle agent selection pan
  const handleSelectAgent = (agent: LiveFleetAgent) => {
    setSelectedAgent(agent);
    if (leafletMapRef.current) {
      leafletMapRef.current.setView([agent.latitude, agent.longitude], 14, { animate: true });
    }
  };

  // Start route replay for selected agent
  const handleStartReplay = async (agent: LiveFleetAgent) => {
    setIsLoadingRoute(true);
    setIsReplaying(true);
    setIsPlayingAuto(false);
    setReplayIndex(0);

    try {
      const res = await fetch(`/api/location/history?employee_id=${agent.employee_id}`);
      if (res.ok) {
        const data = await res.json();
        const route: LocationBreadcrumb[] = data.route || [];
        setReplayRoute(route);

        if (route.length > 0 && leafletMapRef.current) {
          const L = (await import('leaflet')).default;
          const map = leafletMapRef.current;

          // Clear existing normal markers
          Object.values(markersRef.current).forEach((m) => m.remove());
          markersRef.current = {};

          // Draw Polyline Route
          if (polylineRef.current) polylineRef.current.remove();
          const latLngs = route.map((pt) => [pt.latitude, pt.longitude] as [number, number]);
          const polyline = L.polyline(latLngs, {
            color: '#2563eb',
            weight: 4,
            opacity: 0.85,
            dashArray: '8, 8',
          }).addTo(map);
          polylineRef.current = polyline;

          map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

          // Create animated moving pin for replay
          if (replayMarkerRef.current) replayMarkerRef.current.remove();
          const first = route[0];
          const replayIcon = L.divIcon({
            className: 'replay-active-pin',
            html: `
              <div style="background: #2563eb; color: white; border: 2px solid white; padding: 4px 8px; border-radius: 9999px; font-weight: bold; font-size: 11px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; align-items: center; gap: 4px;">
                🚗 ${agent.name.split(' ')[0]}
              </div>
            `,
            iconSize: [70, 30],
            iconAnchor: [35, 25],
          });
          const rMarker = L.marker([first.latitude, first.longitude], { icon: replayIcon }).addTo(map);
          replayMarkerRef.current = rMarker;
        }
      }
    } catch (err) {
      console.error('Error fetching route history:', err);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Exit route replay mode
  const handleExitReplay = () => {
    setIsReplaying(false);
    setIsPlayingAuto(false);
    setReplayRoute([]);
    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }
    if (replayMarkerRef.current) {
      replayMarkerRef.current.remove();
      replayMarkerRef.current = null;
    }
    fetchLiveFleet();
  };

  // Auto-playback loop for replay
  useEffect(() => {
    let timer: any;
    if (isPlayingAuto && isReplaying && replayRoute.length > 0) {
      timer = setInterval(() => {
        setReplayIndex((prev) => {
          if (prev >= replayRoute.length - 1) {
            setIsPlayingAuto(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlayingAuto, isReplaying, replayRoute]);

  // Update marker position on scrub
  useEffect(() => {
    if (isReplaying && replayRoute.length > 0 && replayMarkerRef.current && leafletMapRef.current) {
      const currentPt = replayRoute[replayIndex];
      if (currentPt) {
        replayMarkerRef.current.setLatLng([currentPt.latitude, currentPt.longitude]);
      }
    }
  }, [replayIndex, isReplaying, replayRoute]);

  // Filter agents by search query and status chip
  const filteredAgents = agents.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.designation.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'moving') return a.status === 'moving';
    if (statusFilter === 'stationary') return a.status === 'stationary';
    if (statusFilter === 'battery_low') return a.battery_level <= 25;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Radar Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white border border-slate-200 p-5 rounded-2xl shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl flex items-center gap-2">
              <Navigation className="h-6 w-6 text-amber-600 animate-pulse" />
              24/7 Field Fleet Radar & Route Replay
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              Live GPS Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time Lucknow map positioning, continuous movement speed, and breadcrumb route history for field staff
          </p>
        </div>

        {/* Live Counters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-500">On Duty:</span>
            <strong className="text-slate-900 font-bold">{summary.total_on_duty} Agents</strong>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 shadow-2xs">
            <Car className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-emerald-700">Moving:</span>
            <strong className="text-emerald-900 font-bold">{summary.moving}</strong>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-amber-700">At Client Site:</span>
            <strong className="text-amber-900 font-bold">{summary.stationary}</strong>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLiveFleet()}
            disabled={isRefreshing}
            className="h-8 gap-1.5 text-xs border-slate-200"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh GPS
          </Button>
        </div>
      </div>

      {/* Main Map & Agent Drawer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Agent Fleet Directory (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Search & Filter Bar */}
          <div className="bg-white border border-slate-200 p-3.5 rounded-xl shadow-2xs space-y-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search agent or Lucknow location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                  statusFilter === 'all'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                All ({agents.length})
              </button>
              <button
                onClick={() => setStatusFilter('moving')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                  statusFilter === 'moving'
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Moving ({summary.moving})
              </button>
              <button
                onClick={() => setStatusFilter('stationary')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                  statusFilter === 'stationary'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Stationary ({summary.stationary})
              </button>
              {summary.battery_low > 0 && (
                <button
                  onClick={() => setStatusFilter('battery_low')}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition ${
                    statusFilter === 'battery_low'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white text-rose-600 border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  Low Battery ({summary.battery_low})
                </button>
              )}
            </div>
          </div>

          {/* Agent Cards List */}
          <div className="space-y-2.5 max-h-[300px] lg:max-h-[560px] overflow-y-auto pr-1">
            {filteredAgents.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-xs text-slate-500">
                No active field agents match the selected filter.
              </div>
            ) : (
              filteredAgents.map((agent) => {
                const isSelected = selectedAgent?.employee_id === agent.employee_id;
                const isMoving = agent.status === 'moving';
                const isLowBattery = agent.battery_level <= 25;

                return (
                  <div
                    key={agent.employee_id}
                    onClick={() => handleSelectAgent(agent)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                            isMoving ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {agent.name
                            .split(' ')
                            .map((p) => p[0])
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                            {agent.name}
                            {agent.is_demo && (
                              <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-amber-200/80 text-amber-900">
                                SIM
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{agent.designation}</div>
                        </div>
                      </div>

                      {/* Moving / Stopped Pill */}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isMoving
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isMoving ? `🚗 ${Math.round(agent.speed_kmh)} km/h` : '📍 At Site'}
                      </span>
                    </div>

                    {/* Location Landmark */}
                    <div className="mt-2 text-[11px] text-slate-700 font-medium line-clamp-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                      <span>{agent.address}</span>
                    </div>

                    {/* Footer: Battery & Route Replay action */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex items-center gap-1 font-semibold ${
                            isLowBattery ? 'text-rose-600' : 'text-slate-700'
                          }`}
                        >
                          <Battery className="h-3.5 w-3.5" />
                          {agent.battery_level}%
                        </span>
                        <span>•</span>
                        <span>{agent.today_visits_count} visits today</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartReplay(agent);
                        }}
                        className="inline-flex items-center gap-1 font-bold text-amber-700 hover:text-amber-800 text-[11px] cursor-pointer"
                      >
                        Replay Path <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Interactive Map Canvas (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          {/* Map Container */}
          <div className="relative w-full h-[360px] sm:h-[460px] lg:h-[580px] rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
            <div ref={mapContainerRef} className="w-full h-full z-0" />

            {/* Selected Agent Floating Overlay on Map */}
            {selectedAgent && !isReplaying && (
              <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 sm:max-w-sm bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-lg">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      Active Field Agent
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{selectedAgent.name}</h3>
                    <p className="text-xs text-slate-500">{selectedAgent.designation}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedAgent.status === 'moving'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedAgent.status === 'moving'
                      ? `Speed: ${Math.round(selectedAgent.speed_kmh)} km/h`
                      : 'Stationary'}
                  </span>
                </div>

                <div className="mt-2.5 text-xs text-slate-700 bg-slate-50 rounded-lg p-2 border border-slate-100">
                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span>Current Landmark:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{selectedAgent.address}</p>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartReplay(selectedAgent)}
                    className="w-full text-xs font-bold border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 h-8"
                  >
                    Replay Today&apos;s Route
                  </Button>
                </div>
              </div>
            )}

            {/* Route Replay Controller Overlay */}
            {isReplaying && (
              <div className="absolute bottom-4 left-4 right-4 z-20 bg-white/95 backdrop-blur-md border border-blue-200 rounded-xl p-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                        Route Replay: {selectedAgent?.name}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-blue-100 text-blue-800">
                        {replayRoute.length} Waypoints
                      </span>
                    </div>
                    {replayRoute[replayIndex] && (
                      <p className="text-xs font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-blue-600" />
                        <span>{replayRoute[replayIndex].time_label}</span>
                        <span>•</span>
                        <span>{replayRoute[replayIndex].address}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsPlayingAuto(!isPlayingAuto)}
                      className="h-8 gap-1.5 text-xs font-bold"
                    >
                      {isPlayingAuto ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                      {isPlayingAuto ? 'Pause' : 'Play Route'}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExitReplay}
                      className="h-8 text-xs text-slate-600 hover:text-slate-900"
                    >
                      Exit Replay
                    </Button>
                  </div>
                </div>

                {/* Timeline Slider Scrubber */}
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, replayRoute.length - 1)}
                  value={replayIndex}
                  onChange={(e) => setReplayIndex(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Companion Mobile App Architecture Banner */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Diksha Field Companion Mobile App Integration
              </h4>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                When employees install the Diksha Field Companion APK on their Android phones, the background service
                automatically pings <code>/api/location/ping</code> every 3–5 minutes during their active shift,
                streaming live coordinates and battery telemetry straight to this radar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              API Endpoint Active: <code>/api/location/ping</code>
            </span>
            <a
              href={ANDROID_APK_DOWNLOAD_URL}
              download="Diksha-CRM-Mobile.apk"
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg bg-[#0f172a] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1e293b] transition-colors shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>Download Android APK</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
