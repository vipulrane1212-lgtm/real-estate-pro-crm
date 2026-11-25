import { Geolocation, Position } from '@capacitor/geolocation';
import { Device, BatteryInfo } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';
import { APP_CONFIG } from '../config';

export interface LocationPingPayload {
  employee_id?: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number | null;
  heading: number | null;
  battery_level: number;
  is_charging: boolean;
  activity_type: 'still' | 'walking' | 'in_vehicle' | 'unknown';
  address?: string;
}

class LocationTrackerService {
  private isTracking = false;
  private watchId: string | null = null;
  private intervalTimer: NodeJS.Timeout | null = null;
  private lastPosition: Position | null = null;
  private authToken: string | null = null;

  /**
   * Initializes auth token from local storage
   */
  public async init() {
    const token = await Preferences.get({ key: 'auth_token' });
    this.authToken = token.value;
    
    // Check if user was previously punched in before app was closed
    const activeDuty = await Preferences.get({ key: 'is_on_duty' });
    if (activeDuty.value === 'true') {
      this.startDutyTracking();
    }
  }

  public setAuthToken(token: string) {
    this.authToken = token;
    Preferences.set({ key: 'auth_token', value: token });
  }

  /**
   * Requests necessary location permissions
   * Android will prompt: "While using the app" -> then "Allow all the time"
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      const status = await Geolocation.checkPermissions();
      if (status.location !== 'granted') {
        const req = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
        return req.location === 'granted';
      }
      return true;
    } catch (err) {
      console.error('Failed to request GPS permissions:', err);
      return false;
    }
  }

  /**
   * Starts Background Location Tracker when Employee Punches In
   */
  public async startDutyTracking(): Promise<boolean> {
    if (this.isTracking) return true;

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      alert('Location permission ("Allow all the time") is required for field duty tracking.');
      return false;
    }

    this.isTracking = true;
    await Preferences.set({ key: 'is_on_duty', value: 'true' });

    // Send immediate first ping upon punch-in
    await this.captureAndSendPing();

    // Set recurring timer every 3 minutes
    this.intervalTimer = setInterval(() => {
      this.captureAndSendPing();
    }, APP_CONFIG.TRACKING.PING_INTERVAL_MS);

    // Watch position for movement triggers
    try {
      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000,
        },
        (position: Position | null, err: unknown) => {
          if (err) {
            console.warn('GPS Watch warning:', err);
            return;
          }
          if (position) {
            this.handlePositionChange(position);
          }
        }
      );
    } catch (err) {
      console.warn('Continuous GPS watch fallback to interval only:', err);
    }

    return true;
  }

  /**
   * Stops Tracker immediately when Employee Punches Out
   * Preserves employee privacy outside working hours
   */
  public async stopDutyTracking(): Promise<void> {
    this.isTracking = false;
    await Preferences.set({ key: 'is_on_duty', value: 'false' });

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }

    if (this.watchId) {
      try {
        await Geolocation.clearWatch({ id: this.watchId });
      } catch (err) {
        console.warn('Failed to clear watch:', err);
      }
      this.watchId = null;
    }

    // Flush any pending offline pings before sleeping
    await this.flushOfflineQueue();
  }

  public getTrackingStatus(): boolean {
    return this.isTracking;
  }

  /**
   * Evaluates position delta to dynamically adjust ping rate if moving fast
   */
  private async handlePositionChange(position: Position) {
    if (!this.lastPosition) {
      this.lastPosition = position;
      return;
    }

    const dist = this.calculateDistance(
      this.lastPosition.coords.latitude,
      this.lastPosition.coords.longitude,
      position.coords.latitude,
      position.coords.longitude
    );

    // If agent moved more than 75 meters, send ping immediately
    if (dist >= APP_CONFIG.TRACKING.DISTANCE_THRESHOLD_METERS) {
      this.lastPosition = position;
      await this.sendPingFromPosition(position);
    }
  }

  /**
   * Captures current GPS coordinates + battery metrics and posts to CRM API
   */
  public async captureAndSendPing(): Promise<boolean> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      });

      this.lastPosition = position;
      return await this.sendPingFromPosition(position);
    } catch (err) {
      console.error('Failed to get current GPS fix:', err);
      return false;
    }
  }

  private async sendPingFromPosition(pos: Position): Promise<boolean> {
    try {
      let batteryInfo: BatteryInfo = { batteryLevel: 1.0, isCharging: false };
      try {
        batteryInfo = await Device.getBatteryInfo();
      } catch {
        // Battery API not available in simulator
      }

      const speedKmh = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
      let activityType: LocationPingPayload['activity_type'] = 'still';
      if (speedKmh > 18) {
        activityType = 'in_vehicle';
      } else if (speedKmh > 2) {
        activityType = 'walking';
      }

      const payload: LocationPingPayload = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: Math.round(pos.coords.accuracy || 10),
        speed: speedKmh,
        heading: pos.coords.heading ? Math.round(pos.coords.heading) : null,
        battery_level: Math.round((batteryInfo.batteryLevel || 1) * 100),
        is_charging: !!batteryInfo.isCharging,
        activity_type: activityType,
      };

      // Attempt immediate send
      const success = await this.postToServer(payload);
      if (!success) {
        // Enqueue offline ping to retry when connection restores
        await this.queueOfflinePing(payload);
      } else {
        // If sent successfully, try flushing any backlog
        this.flushOfflineQueue();
      }

      return success;
    } catch (err) {
      console.error('sendPingFromPosition error:', err);
      return false;
    }
  }

  private async postToServer(payload: LocationPingPayload): Promise<boolean> {
    try {
      const res = await fetch(`${APP_CONFIG.API_BASE_URL}/api/location/ping`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      return res.ok;
    } catch (networkErr) {
      console.warn('Network offline or CRM unreachable:', networkErr);
      return false;
    }
  }

  private async queueOfflinePing(payload: LocationPingPayload) {
    const queueData = await Preferences.get({ key: 'offline_location_queue' });
    const queue: LocationPingPayload[] = queueData.value ? JSON.parse(queueData.value) : [];
    // Keep max 50 offline coordinates to avoid memory bloat
    if (queue.length > 50) queue.shift();
    queue.push(payload);
    await Preferences.set({ key: 'offline_location_queue', value: JSON.stringify(queue) });
  }

  private async flushOfflineQueue() {
    const queueData = await Preferences.get({ key: 'offline_location_queue' });
    if (!queueData.value) return;

    const queue: LocationPingPayload[] = JSON.parse(queueData.value);
    if (queue.length === 0) return;

    const remaining: LocationPingPayload[] = [];
    for (const item of queue) {
      const ok = await this.postToServer(item);
      if (!ok) {
        remaining.push(item);
      }
    }

    await Preferences.set({ key: 'offline_location_queue', value: JSON.stringify(remaining) });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

export const locationTracker = new LocationTrackerService();
