import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// ── 程式名稱、套件名稱都從 www/brand.json 讀（tools/rename.py 會改那裡）
@Suppress("UNCHECKED_CAST")
val brand = groovy.json.JsonSlurper().parse(file("src/main/assets/www/brand.json")) as Map<String, Any?>

// ── 外殼版本：改了 Kotlin／AndroidManifest／圖示時才加一（tools/bump.py --shell）。只改畫面不用動
val SHELL = 1

// ── 簽章：keystore/app.jks＋keystore/pass.txt（BUILD_AND_INSTALL.bat 第一次會自動產生；雲端用 Secrets）
val ksFile = rootProject.file("keystore/app.jks")
val ksPass = System.getenv("KEYSTORE_PASS")?.takeIf { it.isNotBlank() }
    ?: rootProject.file("keystore/pass.txt").takeIf { it.exists() }?.readText()?.trim()
    ?: "androidkit"

android {
    namespace = "com.androidkit.shell"
    compileSdk = 37
    defaultConfig {
        applicationId = brand["pkg"] as String
        minSdk = 26
        targetSdk = 34
        versionCode = SHELL
        versionName = "S$SHELL"
        resValue("string", "app_name", brand["name"] as String)
    }
    buildFeatures { buildConfig = true }
    signingConfigs {
        create("kit") { storeFile = ksFile; storePassword = ksPass; keyAlias = "app"; keyPassword = ksPass }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = if (ksFile.exists()) signingConfigs.getByName("kit") else signingConfigs.getByName("debug")
        }
    }
    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }
}
dependencies {
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.documentfile:documentfile:1.0.1")
}

kotlin { compilerOptions { jvmTarget.set(JvmTarget.JVM_17) } }
