package com.diksha.crm

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.speech.tts.TextToSpeech
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class FollowUpAlarmService : Service(), TextToSpeech.OnInitListener {

    private val CHANNEL_SERVICE_ID = "diksha_crm_service_channel"
    private val CHANNEL_ALARM_ID = "diksha_crm_alarm_channel"
    private var scheduler: ScheduledExecutorService? = null
    private var tts: TextToSpeech? = null
    private val spokenExpiries = mutableSetOf<String>()

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
        tts = TextToSpeech(this, this)
        startForeground(1001, buildForegroundNotification())
        startPolling()
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale("en", "IN")
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_SERVICE_ID,
                "CRM Background Monitor",
                NotificationManager.IMPORTANCE_LOW
            )

            val alarmChannel = NotificationChannel(
                CHANNEL_ALARM_ID,
                "Overdue Follow-up Alarms",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Loud audio and full screen alarms for scheduled client callbacks"
                enableVibration(true)
                setBypassDnd(true)
            }

            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
            manager.createNotificationChannel(alarmChannel)
        }
    }

    private fun buildForegroundNotification(): Notification {
        val launchIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_SERVICE_ID)
            .setContentTitle("Diksha CRM Background Service")
            .setContentText("Monitoring follow-ups and agreement expiry alerts")
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    private fun startPolling() {
        scheduler = Executors.newSingleThreadScheduledExecutor()
        scheduler?.scheduleWithFixedDelay({
            checkFollowUps()
            checkAgreementExpiries()
        }, 5, 20, TimeUnit.SECONDS)
    }

    private fun checkFollowUps() {
        try {
            val prefs = getSharedPreferences("diksha_crm_prefs", Context.MODE_PRIVATE)
            val serverUrl = prefs.getString("server_url", "http://10.0.2.2:3000") ?: "http://10.0.2.2:3000"
            val sessionCookie = prefs.getString("session_cookie", "") ?: ""

            val url = URL("$serverUrl/api/follow-ups/reminders")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            if (sessionCookie.isNotEmpty()) {
                conn.setRequestProperty("Cookie", sessionCookie)
            }

            if (conn.responseCode == 200) {
                val response = conn.inputStream.bufferedReader().use(BufferedReader::readText)
                val json = JSONObject(response)
                val reminders = json.optJSONArray("reminders")

                if (reminders != null && reminders.length() > 0) {
                    val firstReminder = reminders.getJSONObject(0)
                    triggerFullScreenAlarm(firstReminder.toString())
                }
            }
            conn.disconnect()
        } catch (e: Exception) {
            // Server might be temporarily unreachable, keep service running
        }
    }

    private fun triggerFullScreenAlarm(reminderJson: String) {
        val alarmIntent = Intent(this, AlarmActivity::class.java).apply {
            putExtra("EXTRA_FOLLOW_UP_JSON", reminderJson)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }

        val fullScreenPendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            alarmIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ALARM_ID)
            .setContentTitle("URGENT: Overdue Follow-up!")
            .setContentText("Tap to call client and view details")
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setAutoCancel(true)
            .build()

        val manager = getSystemService(NotificationManager::class.java)
        manager.notify(2002, notification)
    }

    private fun checkAgreementExpiries() {
        try {
            val prefs = getSharedPreferences("diksha_crm_prefs", Context.MODE_PRIVATE)
            val serverUrl = prefs.getString("server_url", "http://10.0.2.2:3000") ?: "http://10.0.2.2:3000"
            val sessionCookie = prefs.getString("session_cookie", "") ?: ""

            val url = URL("$serverUrl/api/alerts/expiries")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "GET"
            conn.connectTimeout = 5000
            conn.readTimeout = 5000
            if (sessionCookie.isNotEmpty()) {
                conn.setRequestProperty("Cookie", sessionCookie)
            }

            if (conn.responseCode == 200) {
                val response = conn.inputStream.bufferedReader().use(BufferedReader::readText)
                val json = JSONObject(response)
                val voiceAlerts = json.optJSONArray("voiceAlerts")

                if (voiceAlerts != null && voiceAlerts.length() > 0) {
                    for (i in 0 until voiceAlerts.length()) {
                        val item = voiceAlerts.getJSONObject(i)
                        val id = item.optString("id")
                        val days = item.optInt("days_remaining", 0)
                        val key = "$id-$days"
                        val spokenText = item.optString("spoken_text", "")

                        if (!spokenExpiries.contains(key) && spokenText.isNotEmpty()) {
                            spokenExpiries.add(key)
                            tts?.speak(spokenText, TextToSpeech.QUEUE_ADD, null, "RENEWAL_$key")
                        }
                    }
                }
            }
            conn.disconnect()
        } catch (e: Exception) {
            // Ignore
        }
    }

    override fun onDestroy() {
        scheduler?.shutdownNow()
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
