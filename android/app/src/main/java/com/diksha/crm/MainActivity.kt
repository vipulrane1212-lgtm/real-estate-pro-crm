package com.diksha.crm

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.speech.tts.TextToSpeech
import android.view.View
import android.webkit.*
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : Activity(), TextToSpeech.OnInitListener {

    private lateinit var webView: WebView
    private lateinit var progressBar: ProgressBar
    private lateinit var errorLayout: LinearLayout
    private var filePathCallback: ValueCallback<Array<Uri>>? = null
    private var cameraImageUri: Uri? = null
    private var tts: TextToSpeech? = null
    private var serverUrl: String = BackgroundLocationService.DEFAULT_CRM_URL
    private var promptedBackgroundLocation = false

    private val PERMISSIONS_REQUEST_CODE = 101
    private val BACKGROUND_LOCATION_REQUEST_CODE = 102

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webview)
        progressBar = findViewById(R.id.loading_progress)
        errorLayout = findViewById(R.id.error_layout)

        tts = TextToSpeech(this, this)

        val prefs = getSharedPreferences("diksha_crm_prefs", Context.MODE_PRIVATE)
        serverUrl = prefs.getString("server_url", BackgroundLocationService.DEFAULT_CRM_URL)
            ?: BackgroundLocationService.DEFAULT_CRM_URL

        findViewById<Button>(R.id.btn_server_settings).setOnClickListener {
            startActivity(Intent(this, ConfigActivity::class.java))
        }

        findViewById<Button>(R.id.btn_retry).setOnClickListener {
            errorLayout.visibility = View.GONE
            webView.reload()
        }

        findViewById<Button>(R.id.btn_config_from_error).setOnClickListener {
            startActivity(Intent(this, ConfigActivity::class.java))
        }

        requestAppPermissions()
        setupWebView()
        startAlarmService()
        startLocationServiceIfPermitted()

        webView.loadUrl(serverUrl)
    }

    override fun onResume() {
        super.onResume()
        startLocationServiceIfPermitted()
    }

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            tts?.language = Locale("en", "IN")
        }
    }

    private fun requestAppPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }

        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), PERMISSIONS_REQUEST_CODE)
        } else {
            requestBackgroundLocationIfNeeded()
        }
    }

    private fun requestBackgroundLocationIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && !promptedBackgroundLocation) {
            val hasFineOrCoarse =
                ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
                ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
            val hasBg =
                ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_BACKGROUND_LOCATION) == PackageManager.PERMISSION_GRANTED
            if (hasFineOrCoarse && !hasBg) {
                promptedBackgroundLocation = true
                ActivityCompat.requestPermissions(
                    this,
                    arrayOf(Manifest.permission.ACCESS_BACKGROUND_LOCATION),
                    BACKGROUND_LOCATION_REQUEST_CODE
                )
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSIONS_REQUEST_CODE) {
            startLocationServiceIfPermitted()
            requestBackgroundLocationIfNeeded()
        } else if (requestCode == BACKGROUND_LOCATION_REQUEST_CODE) {
            startLocationServiceIfPermitted()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(true)
        cookieManager.setAcceptThirdPartyCookies(webView, true)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.setGeolocationEnabled(true)
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true

        // User Agent branding for Diksha Native Android
        settings.userAgentString = "${settings.userAgentString} DikshaAndroidApp/1.0"

        webView.addJavascriptInterface(DikshaNativeBridge(this, tts), "DikshaAndroid")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                progressBar.visibility = View.VISIBLE
                errorLayout.visibility = View.GONE
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                progressBar.visibility = View.GONE
                // Sync session cookie to SharedPreferences for background services
                url?.let {
                    CookieManager.getInstance().flush()
                    val cookies = CookieManager.getInstance().getCookie(it)
                    if (!cookies.isNullOrEmpty()) {
                        getSharedPreferences("diksha_crm_prefs", Context.MODE_PRIVATE)
                            .edit()
                            .putString("session_cookie", cookies)
                            .apply()
                        startLocationServiceIfPermitted()
                    }
                }
            }

            override fun onReceivedError(
                view: WebView?,
                errorCode: Int,
                description: String?,
                failingUrl: String?
            ) {
                progressBar.visibility = View.GONE
                errorLayout.visibility = View.VISIBLE
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // WebRTC Camera & Microphone runtime permission handler
            override fun onPermissionRequest(request: PermissionRequest?) {
                runOnUiThread {
                    request?.grant(request.resources)
                }
            }

            // HTML5 Geolocation permission prompt auto-grant
            override fun onGeolocationPermissionsShowPrompt(
                origin: String?,
                callback: GeolocationPermissions.Callback?
            ) {
                callback?.invoke(origin, true, false)
            }

            // ANTI-SPOOFING ENFORCEMENT: Restricts file chooser to Live Camera only (Gallery blocked)
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                this@MainActivity.filePathCallback?.onReceiveValue(null)
                this@MainActivity.filePathCallback = filePathCallback

                // Camera-only Intent — gallery picker is intentionally blocked to prevent attendance spoofing
                val takePictureIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                if (takePictureIntent.resolveActivity(packageManager) != null) {
                    var photoFile: File? = null
                    try {
                        photoFile = createImageFile()
                    } catch (ex: IOException) {
                        ex.printStackTrace()
                    }

                    if (photoFile != null) {
                        cameraImageUri = FileProvider.getUriForFile(
                            this@MainActivity,
                            "${applicationContext.packageName}.fileprovider",
                            photoFile
                        )
                        takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraImageUri)
                        startActivityForResult(takePictureIntent, FILE_CHOOSER_REQUEST_CODE)
                        return true
                    }
                }
                return false
            }
        }
    }

    @Throws(IOException::class)
    private fun createImageFile(): File {
        val timeStamp: String = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val storageDir: File? = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile("LIVE_SELFIE_${timeStamp}_", ".jpg", storageDir)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            if (resultCode == RESULT_OK && cameraImageUri != null) {
                filePathCallback?.onReceiveValue(arrayOf(cameraImageUri!!))
            } else {
                filePathCallback?.onReceiveValue(null)
            }
            filePathCallback = null
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    private fun startAlarmService() {
        val serviceIntent = Intent(this, FollowUpAlarmService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private fun startLocationServiceIfPermitted() {
        val fineGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!fineGranted && !coarseGranted) return

        val locIntent = Intent(this, BackgroundLocationService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(locIntent)
        } else {
            startService(locIntent)
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        tts?.stop()
        tts?.shutdown()
        super.onDestroy()
    }

    companion object {
        private const val FILE_CHOOSER_REQUEST_CODE = 2001
    }
}
