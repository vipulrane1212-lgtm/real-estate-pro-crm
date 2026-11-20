package com.diksha.crm

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class ConfigActivity : Activity() {

    private lateinit var editUrl: EditText
    private lateinit var txtStatus: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_config)

        editUrl = findViewById(R.id.edit_server_url)
        txtStatus = findViewById(R.id.txt_test_status)

        val prefs = getSharedPreferences("diksha_crm_prefs", Context.MODE_PRIVATE)
        val currentUrl = prefs.getString("server_url", "http://10.0.2.2:3000") ?: "http://10.0.2.2:3000"
        editUrl.setText(currentUrl)

        findViewById<Button>(R.id.btn_save_connect).setOnClickListener {
            val enteredUrl = editUrl.text.toString().trim()
            if (enteredUrl.isEmpty()) {
                Toast.makeText(this, "Please enter a valid URL", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val sanitizedUrl = if (!enteredUrl.startsWith("http://") && !enteredUrl.startsWith("https://")) {
                "http://$enteredUrl"
            } else {
                enteredUrl
            }

            prefs.edit().putString("server_url", sanitizedUrl).apply()
            Toast.makeText(this, "Server URL Saved!", Toast.LENGTH_SHORT).show()

            val intent = Intent(this, MainActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            startActivity(intent)
            finish()
        }

        findViewById<Button>(R.id.btn_test_connection).setOnClickListener {
            val urlString = editUrl.text.toString().trim()
            testPing(urlString)
        }

        findViewById<Button>(R.id.btn_preset_emulator).setOnClickListener {
            editUrl.setText("http://10.0.2.2:3000")
        }

        findViewById<Button>(R.id.btn_preset_localhost).setOnClickListener {
            editUrl.setText("http://localhost:3000")
        }
    }

    private fun testPing(urlString: String) {
        txtStatus.visibility = View.VISIBLE
        txtStatus.text = "Pinging server..."

        thread {
            try {
                val pingUrl = if (!urlString.startsWith("http://") && !urlString.startsWith("https://")) {
                    "http://$urlString"
                } else {
                    urlString
                }

                val url = URL("$pingUrl/api/auth/me")
                val conn = url.openConnection() as HttpURLConnection
                conn.connectTimeout = 4000
                conn.readTimeout = 4000
                conn.requestMethod = "GET"
                val code = conn.responseCode
                conn.disconnect()

                runOnUiThread {
                    if (code == 200 || code == 401) {
                        txtStatus.text = "Success! CRM server reachable (HTTP $code)"
                        txtStatus.setTextColor(resources.getColor(R.color.primary_gold))
                    } else {
                        txtStatus.text = "Server responded with HTTP $code"
                        txtStatus.setTextColor(resources.getColor(R.color.alarm_red))
                    }
                }
            } catch (e: Exception) {
                runOnUiThread {
                    txtStatus.text = "Connection Failed: ${e.message}"
                    txtStatus.setTextColor(resources.getColor(R.color.alarm_red))
                }
            }
        }
    }
}
