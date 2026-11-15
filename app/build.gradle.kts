import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.golden.ytdown"
    compileSdk = 37
    defaultConfig {
        applicationId = "com.golden.ytdown"
        minSdk = 26
        targetSdk = 34
        versionCode = 109
        versionName = "YTD_V0.1.09"
        ndk { abiFilters += listOf("arm64-v8a") }   // 只留現在手機用的 64 位元，APK 從 160MB 縮到約三分之一
    }
    // 固定簽章：keystore/ytd.jks（BUILD_APK.bat 第一次會自動產生）。同一把鑰匙打包，手機才能直接覆蓋安裝
    val ytdKs = rootProject.file("keystore/ytd.jks")
    signingConfigs {
        create("ytd") {
            storeFile = ytdKs; storePassword = "ytdown123"; keyAlias = "ytd"; keyPassword = "ytdown123"
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (ytdKs.exists()) signingConfigs.getByName("ytd") else signingConfigs.getByName("debug")
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
    packaging { jniLibs { useLegacyPackaging = true } }   // yt-dlp 的 python 要解壓出來才跑得動
}
dependencies {
    // yt-dlp（下載核心）＋ ffmpeg（影像聲音合併）。0.18.1 起內建 QuickJS，YouTube 的 JS 解題才過得了
    implementation("io.github.junkfood02.youtubedl-android:library:0.18.1")
    implementation("io.github.junkfood02.youtubedl-android:ffmpeg:0.18.1")
    implementation("io.github.junkfood02.youtubedl-android:aria2c:0.18.1")   // 加速下載（可在設定開關）
    implementation("androidx.documentfile:documentfile:1.0.1")                  // 自選存檔資料夾
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("dev.g000sha256:tdl-coroutines:17.0.0")                    // Telegram 官方 TDLib（登入自己的帳號下載大影片）
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.11.0")
}

kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }
