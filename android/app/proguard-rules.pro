# Proguard rules for Diksha CRM Android App
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.diksha.crm.DikshaNativeBridge { *; }
