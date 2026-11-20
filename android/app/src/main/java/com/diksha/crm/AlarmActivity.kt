package com.diksha.crm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class AlarmActivity : Activity() {

    private var mediaPlayer: MediaPlayer? = null
    private var vibrator: Vibrator? = null
    private var followUpId: String? = null
    private var clientPhone: String? = null
    private var serverUrl: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Wake screen over keyguard/lockscreen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        setContentView(R.layout.activity_alarm)

        val prefs = getSharedPreferences("diksha_crm_prefs", Context.MODE_PRIVATE)
        serverUrl = prefs.getString("server_url", "http://10.0.2.2:3000") ?: "http://10.0.2.2:3000"

        val jsonString = intent.getStringExtra("EXTRA_FOLLOW_UP_JSON")
        parseFollowUpData(jsonString)
        startAlarmAudioAndVibration()
        setupButtons()
    }

    private fun parseFollowUpData(jsonString: String?) {
        val txtLeadName = findViewById<TextView>(R.id.txt_alarm_lead_name)
        val txtPhone = findViewById<TextView>(R.id.txt_alarm_phone)
        val txtOverdue = findViewById<TextView>(R.id.txt_alarm_overdue_time)
        val txtRemarks = findViewById<TextView>(R.id.txt_alarm_remarks)

        if (!jsonString.isNullOrEmpty()) {
            try {
                val json = JSONObject(jsonString)
                followUpId = json.optString("id", "")
                val overdueMinutes = json.optInt("overdue_minutes", 0)
                val remarks = json.optString("remarks", "No remarks provided")

                val leadObj = json.optJSONObject("lead")
                val leadName = leadObj?.optString("full_name", "Valued Client") ?: "Valued Client"
                clientPhone = leadObj?.optString("phone", "") ?: ""

                txtLeadName.text = "Follow-up: $leadName"
                txtPhone.text = if (clientPhone.isNullOrEmpty()) "No Phone Provided" else clientPhone
                txtOverdue.text = "Overdue by $overdueMinutes minutes! Call required immediately."
                txtRemarks.text = "Remarks: $remarks"
            } catch (e: Exception) {
                txtLeadName.text = "Overdue Follow-up"
            }
        }
    }

    private fun startAlarmAudioAndVibration() {
        try {
            val alarmUri: Uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE)

            mediaPlayer = MediaPlayer().apply {
                setDataSource(applicationContext, alarmUri)
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                isLooping = true
                prepare()
                start()
            }

            vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
                vibratorManager.defaultVibrator
            } else {
                @Suppress("DEPRECATION")
                getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
            }

            val pattern = longArrayOf(0, 800, 300, 800, 300)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(pattern, 0))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(pattern, 0)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun stopAlarm() {
        try {
            mediaPlayer?.stop()
            mediaPlayer?.release()
            mediaPlayer = null
            vibrator?.cancel()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun setupButtons() {
        findViewById<Button>(R.id.btn_alarm_call_now).setOnClickListener {
            stopAlarm()
            if (!clientPhone.isNullOrEmpty()) {
                val callIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$clientPhone"))
                startActivity(callIntent)
            }
            finish()
        }

        findViewById<Button>(R.id.btn_alarm_complete).setOnClickListener {
            stopAlarm()
            followUpId?.let { id ->
                thread {
                    postApi("$serverUrl/api/follow-ups/$id", "PATCH", "{\"status\":\"completed\",\"outcome\":\"Completed from Android Alarm\"}")
                }
            }
            Toast.makeText(this, "Marked as Completed", Toast.LENGTH_SHORT).show()
            finish()
        }

        findViewById<Button>(R.id.btn_alarm_snooze_5).setOnClickListener {
            stopAlarm()
            followUpId?.let { id ->
                thread {
                    postApi("$serverUrl/api/follow-ups/$id/snooze", "POST", "{\"minutes\":5}")
                }
            }
            Toast.makeText(this, "Snoozed for 5 minutes", Toast.LENGTH_SHORT).show()
            finish()
        }

        findViewById<Button>(R.id.btn_alarm_snooze_10).setOnClickListener {
            stopAlarm()
            followUpId?.let { id ->
                thread {
                    postApi("$serverUrl/api/follow-ups/$id/snooze", "POST", "{\"minutes\":10}")
                }
            }
            Toast.makeText(this, "Snoozed for 10 minutes", Toast.LENGTH_SHORT).show()
            finish()
        }

        findViewById<Button>(R.id.btn_alarm_dismiss).setOnClickListener {
            stopAlarm()
            followUpId?.let { id ->
                thread {
                    postApi("$serverUrl/api/follow-ups/$id/acknowledge", "POST", "{}")
                }
            }
            Toast.makeText(this, "Alarm Acknowledged", Toast.LENGTH_SHORT).show()
            finish()
        }
    }

    private fun postApi(urlString: String, method: String, jsonBody: String) {
        try {
            val url = URL(urlString)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = method
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.outputStream.use { os ->
                os.write(jsonBody.toByteArray())
            }
            conn.responseCode
            conn.disconnect()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    override fun onDestroy() {
        stopAlarm()
        super.onDestroy()
    }
}
