package com.diksha.crm

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt

class BackgroundLocationService : Service(), LocationListener {

    private val CHANNEL_GPS_ID = "diksha_crm_gps_channel"
    private val NOTIFICATION_ID = 1002
    private var locationManager: LocationManager? = null
    private var scheduler: ScheduledExecutorService? = null
    @Volatile
    private var latestLocation: Location? = null

    override fun onCreate() {
        super.onCreate()
        if (!hasLocationPermission()) {
            stopSelf()
            return
        }

        createNotificationChannel()
        val notification = buildNotification()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        startLocationUpdates()
        startPeriodicPings()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (!hasLocationPermission()) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    private fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_GPS_ID,
                "Field Duty GPS Telemetry",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Active shift GPS sync for Diksha Real Estate field team"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            1,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_GPS_ID)
            .setContentTitle("Diksha CRM Field GPS Active")
            .setContentText("Live location telemetry syncing securely")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    @SuppressLint("MissingPermission")
    private fun startLocationUpdates() {
        try {
            locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
            val lm = locationManager ?: return

            if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                lm.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    120_000L,
                    50f,
                    this,
                    Looper.getMainLooper()
                )
            }
            if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                lm.requestLocationUpdates(
                    LocationManager.NETWORK_PROVIDER,
                    120_000L,
                    50f,
                    this,
                    Looper.getMainLooper()
                )
            }

            val gpsLast = lm.getLastKnownLocation(LocationManager.GPS_PROVIDER)
            val netLast = lm.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
            latestLocation = chooseBetterLocation(gpsLast, netLast)
        } catch (_: SecurityException) {
            stopSelf()
        } catch (_: Exception) {
            // Keep service alive cleanly if a provider is disabled temporarily
        }
    }

    private fun chooseBetterLocation(gps: Location?, net: Location?): Location? {
        if (gps == null) return net
        if (net == null) return gps
        return if (gps.time >= net.time) gps else net
    }

    private fun startPeriodicPings() {
        scheduler = Executors.newSingleThreadScheduledExecutor()
        scheduler?.scheduleWithFixedDelay({
            sendLocationPing()
        }, 15, 180, TimeUnit.SECONDS)
    }

    @SuppressLint("MissingPermission")
    private fun sendLocationPing() {
        try {
            if (!hasLocationPermission()) return

            val lm = locationManager
            val loc = latestLocation ?: lm?.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                ?: lm?.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                ?: return

            val prefs = getSharedPreferences("diksha_crm_prefs", Context.MODE_PRIVATE)
            val serverUrl = prefs.getString("server_url", DEFAULT_CRM_URL) ?: DEFAULT_CRM_URL
            val sessionCookie = prefs.getString("session_cookie", "") ?: ""
            if (sessionCookie.isEmpty()) return

            val batteryStatus = registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            val level = batteryStatus?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
            val scale = batteryStatus?.getIntExtra(BatteryManager.EXTRA_SCALE, 100) ?: 100
            val batteryPct = if (level >= 0 && scale > 0) ((level * 100f) / scale).roundToInt() else 100
            val status = batteryStatus?.getIntExtra(BatteryManager.EXTRA_STATUS, -1) ?: -1
            val isCharging = status == BatteryManager.BATTERY_STATUS_CHARGING || status == BatteryManager.BATTERY_STATUS_FULL

            val speedKmh = if (loc.hasSpeed()) (loc.speed * 3.6f) else 0f
            val activityType = when {
                speedKmh > 12f -> "in_vehicle"
                speedKmh > 1.5f -> "walking"
                else -> "stationary"
            }

            val payload = JSONObject().apply {
                put("latitude", loc.latitude)
                put("longitude", loc.longitude)
                put("accuracy", loc.accuracy)
                put("speed", speedKmh)
                put("heading", if (loc.hasBearing()) loc.bearing else 0f)
                put("battery_level", batteryPct)
                put("is_charging", isCharging)
                put("activity_type", activityType)
            }

            val url = URL("$serverUrl/api/location/ping")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.connectTimeout = 6000
            conn.readTimeout = 6000
            conn.setRequestProperty("Content-Type", "application/json")
            conn.setRequestProperty("Cookie", sessionCookie)
            conn.doOutput = true
            conn.outputStream.use { os ->
                os.write(payload.toString().toByteArray(Charsets.UTF_8))
            }
            conn.responseCode
            conn.disconnect()
        } catch (_: Exception) {
            // Network unavailable or not an employee account; retry silently next cycle
        }
    }

    override fun onLocationChanged(location: Location) {
        latestLocation = location
    }

    @Deprecated("Deprecated in Java")
    override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}

    override fun onProviderEnabled(provider: String) {}

    override fun onProviderDisabled(provider: String) {}

    override fun onDestroy() {
        try {
            locationManager?.removeUpdates(this)
        } catch (_: Exception) {}
        scheduler?.shutdownNow()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        const val DEFAULT_CRM_URL = "https://real-estate-pro-crm.vercel.app"
    }
}
