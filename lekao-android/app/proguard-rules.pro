# ============================================
# Lekao Android - ProGuard / R8 规则
# ============================================

# ============ Kotlin ============
-keep class kotlin.Metadata { *; }
-keepclassmembers class **$WhenMappings { <fields>; }

# ============ Compose ============
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# ============ Retrofit ============
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation

# ============ Gson ============
-keep class com.google.gson.** { *; }
-keep class com.google.gson.reflect.TypeToken { *; }
-keep class * extends com.google.gson.reflect.TypeToken
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.lekao.app.data.** { *; }

# ============ Room ============
-keep class * extends androidx.room.RoomDatabase
-dontwarn androidx.room.paging.**

# ============ Apache POI (docx) ============
-keep class org.apache.poi.** { *; }
-dontwarn org.apache.poi.**
-keep class org.openxmlformats.** { *; }
-dontwarn org.openxmlformats.**

# ============ ML Kit ============
-keep class com.google.mlkit.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.mlkit.**

# ============ Firebase ============
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# ============ CameraX ============
-keep class androidx.camera.** { *; }
-dontwarn androidx.camera.**

# ============ Vico ============
-keep class com.patrykandpatrick.vico.** { *; }
-dontwarn com.patrykandpatrick.vico.**

# ============ Glance ============
-keep class androidx.glance.** { *; }
-dontwarn androidx.glance.**

# ============ Lottie ============
-keep class com.airbnb.lottie.** { *; }
-dontwarn com.airbnb.lottie.**

# ============ 应用入口 ============
-keep class com.lekao.app.LekaoApp { *; }
-keep class com.lekao.app.MainActivity { *; }

# ============ D1-E/F ViewModel + util (反射构建) ============
-keep class com.lekao.app.ui.settings.SettingsViewModel { *; }
-keep class com.lekao.app.ui.admin.** { *; }
-keep class com.lekao.app.ui.ideas.IdeasViewModel { *; }
-keep class com.lekao.app.ui.ideas.IdeaDetailViewModel { *; }
-keep class com.lekao.app.util.SseClient { *; }
-keep class com.lekao.app.util.ErrorMessages { *; }

# ============ 报错日志（保留行号）============
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile