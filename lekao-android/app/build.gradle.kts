import java.util.Properties
import java.io.FileInputStream

// M12 FCM 推送：只有 google-services.json 存在时才 apply google-services plugin
// Firebase 项目未配置时, 不阻塞编译, FCM 推送功能暂时不可用
if (rootProject.file("google-services.json").exists()) {
    apply(plugin = "com.google.gms.google-services")
} else {
    logger.warn("⚠️ google-services.json 缺失, FCM 推送功能暂时不可用 (M12 待 Firebase 项目配置后启用)")
}

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    // 不使用 kotlin.plugin.compose (2.0+ 才引入),改用传统 composeOptions 配置
    id("com.google.devtools.ksp")
    // google-services plugin 由上方 rootProject.file("google-services.json").exists() 守卫后 apply
}

// 加载密钥（local.properties 不入仓, google-services.json 也需手动配）
val localProperties = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) load(FileInputStream(f))
}

android {
    namespace = "com.lekao.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.lekao.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables { useSupportLibrary = true }

        // 从 local.properties 读取敏感配置（如有）
        buildConfigField(
            "String",
            "LEKAO_BASE_URL",
            "\"${localProperties.getProperty("lekao.baseUrl", "https://lekao.asterforge.top")}\""
        )
    }

    // ⚠️ signingConfigs 必须先于 buildTypes 定义(否则 getByName 找不到)
    signingConfigs {
        create("release") {
            // V1.0.0 demo keystore
            storeFile = file("release.keystore")
            storePassword = "lekao2024"
            keyAlias = "lekao-v1"
            keyPassword = "lekao2024"
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            // D1-G V1.0.0 临时关 minify: Vico/ML Kit/Coil/Glance 第三方库 keep 规则
            // 还没写齐,build 会 fail。V1.0.0 优先出包,minify 优化推到 V1.1
            isMinifyEnabled = false
            isShrinkResources = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
            // D1-G V1.0.0: 用 app/release.keystore 签名
            // ⚠️ Demo 用途(密码 lekao2024,有效 10000 天)
            // 商业化(个体工商户下来)前必须重新生成,APK 包名会变
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-opt-in=androidx.compose.material3.ExperimentalMaterial3Api",
            "-opt-in=androidx.compose.foundation.ExperimentalFoundationApi",
            "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi"
        )
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    // Kotlin 1.9.24 + Compose 1.5.x 编译器映射
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.14"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
            excludes += "/META-INF/DEPENDENCIES"
            excludes += "/META-INF/LICENSE*"
            excludes += "/META-INF/NOTICE*"
        }
    }

    // Lint 配置: V1.0.0 不阻塞 build (缺英文翻译 + 拼写检查 等 warning 不影响功能)
    // 完整 Lint 修复计划放在 V1.1.0 (包括补全 values-en/strings.xml)
    lint {
        abortOnError = false
        checkReleaseBuilds = false
    }
}

// ================================================================
// 依赖 (按 V1.0.0 spec §2.2 一次性装齐, 不分批)
// ================================================================
dependencies {

    // ============ AndroidX 核心 ============
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.6")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.6")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.6")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.appcompat:appcompat:1.7.0")
    // Material 3 XML 主题/Shape/BottomSheet 资源(AndroidManifest.xml 引用 Theme.Material3.DayNight.NoActionBar 等)
    implementation("com.google.android.material:material:1.12.0")

    // ============ Compose + Material 3 ============
    implementation(platform("androidx.compose:compose-bom:2024.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.animation:animation")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")

    // ============ Navigation (T10 配全 17 个页面) ============
    implementation("androidx.navigation:navigation-compose:2.8.4")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    // ============ 网络（T09 Retrofit + OkHttp + Cookie）============
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-gson:2.11.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // ============ 图片加载 ============
    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("io.coil-kt:coil-svg:2.7.0")

    // ============ 协程 ============
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")

    // ============ 数据存储（JWT cookie + 离线缓存）============
    implementation("androidx.datastore:datastore-preferences:1.1.1")
    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    // ============ 错题集 docx 导出（M05 · apache-poi）============
    implementation("org.apache.poi:poi-ooxml:5.3.0")
    implementation("org.apache.poi:poi-scratchpad:5.3.0")

    // ============ WorkManager（后台同步 · M09）============
    implementation("androidx.work:work-runtime-ktx:2.9.1")

    // ============ 启动屏 + Lottie（M07）============
    implementation("androidx.core:core-splashscreen:1.0.1")
    implementation("com.airbnb.android:lottie-compose:6.5.0")

    // ============ 生物识别（M04）============
    implementation("androidx.biometric:biometric:1.2.0-alpha05")

    // ============ 相机（M01 拍照）============
    implementation("androidx.camera:camera-core:1.3.4")
    implementation("androidx.camera:camera-camera2:1.3.4")
    implementation("androidx.camera:camera-lifecycle:1.3.4")
    implementation("androidx.camera:camera-view:1.3.4")

    // ============ 图片编辑（M06 标注 + M10 智能裁切）============
    implementation("com.github.yalantis:ucrop:2.2.10")

    // ============ 推送通知（M12 · FCM）============
    implementation(platform("com.google.firebase:firebase-bom:33.5.1"))
    implementation("com.google.firebase:firebase-messaging-ktx")
    implementation("com.google.firebase:firebase-analytics-ktx")

    // ============ OCR（M16 · ML Kit 中英文）============
    implementation("com.google.mlkit:text-recognition:16.0.1")
    implementation("com.google.mlkit:text-recognition-chinese:16.0.1")

    // ============ Dashboard 图表（M15 · Vico · 1.16.0 稳定版, API rememberStartAxis/rememberBottomAxis 都齐全）============
    implementation("com.patrykandpatrick.vico:compose:1.16.0")
    implementation("com.patrykandpatrick.vico:compose-m3:1.16.0")
    implementation("com.patrykandpatrick.vico:core:1.16.0")

    // ============ 桌面小部件（M11 · Glance）============
    implementation("androidx.glance:glance-appwidget:1.1.0")
    implementation("androidx.glance:glance-material3:1.1.0")

    // ============ JSON（API 数据）============
    implementation("com.google.code.gson:gson:2.11.0")

    // ============ 安全 ============
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // ============ 测试 ============
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.9.0")
    testImplementation("org.mockito:mockito-core:5.14.2")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.4.0")
    testImplementation("com.google.truth:truth:1.4.4")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    // ui-test-junit4 不在 Compose BOM 内, 需显式版本 (对齐 Compose 1.7.5)
    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.7.5")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:rules:1.6.1")
}