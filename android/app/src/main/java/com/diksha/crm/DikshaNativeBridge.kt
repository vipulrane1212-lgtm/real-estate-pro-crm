package com.diksha.crm

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.speech.tts.TextToSpeech
import android.webkit.JavascriptInterface
import android.widget.Toast
import java.util.Locale

class DikshaNativeBridge(
    private val context: Context,
    private val tts: TextToSpeech?
) {

    @JavascriptInterface
    fun triggerLoudAlarm(followUpJson: String) {
        val intent = Intent(context, AlarmActivity::class.java).apply {
            putExtra("EXTRA_FOLLOW_UP_JSON", followUpJson)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        context.startActivity(intent)
    }

    @JavascriptInterface
    fun speakRenewalAlert(text: String) {
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "RENEWAL_ALERT")
    }

    @JavascriptInterface
    fun openDialer(phoneNumber: String) {
        val dialIntent = Intent(Intent.ACTION_DIAL).apply {
            data = Uri.parse("tel:$phoneNumber")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(dialIntent)
    }

    @JavascriptInterface
    fun showToast(message: String) {
        Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
    }
}
