package com.golden.ytdown

import android.app.Application
import android.content.Context
import android.util.Log
import com.yausername.aria2c.Aria2c
import com.yausername.ffmpeg.FFmpeg
import com.yausername.youtubedl_android.YoutubeDL

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        ctx = applicationContext
        try { YoutubeDL.getInstance().init(this); FFmpeg.getInstance().init(this); ready = true }
        catch (e: Exception) { initErr = e.message ?: e.toString(); Log.e("YTD", "init", e) }
        // aria2 加速下載（裝不起來也不影響一般下載）
        try { Aria2c.getInstance().init(this); aria2 = true } catch (e: Throwable) { Log.w("YTD", "aria2c", e) }
        Notify.channels(this)
    }
    companion object {
        lateinit var ctx: Context
        @Volatile var ready = false
        @Volatile var initErr = ""
        @Volatile var aria2 = false
    }
}
