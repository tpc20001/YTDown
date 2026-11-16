package com.androidkit.shell

import android.app.ActivityManager
import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.Debug
import android.os.PowerManager
import android.os.Process
import android.os.StatFs
import android.os.SystemClock
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.Inet4Address
import java.net.NetworkInterface

/** 手機狀態：記憶體、本 App 的 CPU、電池、溫度、儲存空間、網路、前景 App。 */
object Sys {
    private var lastCpu = 0L
    private var lastWall = 0L
    private var lastPct = 0.0

    /** 這個 App 用了多少 CPU（%，以整支手機 100% 計） */
    @Synchronized private fun appCpu(): Double {
        return try {
            val f = File("/proc/self/stat").readText()
            val p = f.substringAfterLast(')').trim().split(' ')
            // ) 之後：第 12、13 個是 utime、stime（單位 1/100 秒）
            val ticks = p[11].toLong() + p[12].toLong()
            val now = SystemClock.elapsedRealtime()
            if (lastWall > 0 && now - lastWall >= 500) {
                val cores = Runtime.getRuntime().availableProcessors().coerceAtLeast(1)
                lastPct = ((ticks - lastCpu) * 10.0 / (now - lastWall) * 100.0 / cores).coerceIn(0.0, 100.0)
            }
            if (now - lastWall >= 500) { lastCpu = ticks; lastWall = now }
            lastPct
        } catch (_: Exception) { -1.0 }
    }

    fun perf(c: Context): String {
        val o = JSONObject()
        try {
            val am = c.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val mi = ActivityManager.MemoryInfo(); am.getMemoryInfo(mi)
            o.put("ramTotal", mi.totalMem).put("ramFree", mi.availMem).put("ramLow", mi.lowMemory)
            o.put("appMem", Debug.getPss() * 1024L)
        } catch (_: Exception) {}
        o.put("cpu", appCpu()).put("cores", Runtime.getRuntime().availableProcessors())
        try {
            val b = c.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
            if (b != null) {
                val lv = b.getIntExtra(BatteryManager.EXTRA_LEVEL, -1); val sc = b.getIntExtra(BatteryManager.EXTRA_SCALE, 100)
                val st = b.getIntExtra(BatteryManager.EXTRA_STATUS, -1)
                o.put("battery", if (lv >= 0 && sc > 0) lv * 100 / sc else -1)
                o.put("batTemp", b.getIntExtra(BatteryManager.EXTRA_TEMPERATURE, 0) / 10.0)
                o.put("charging", st == BatteryManager.BATTERY_STATUS_CHARGING || st == BatteryManager.BATTERY_STATUS_FULL)
            }
        } catch (_: Exception) {}
        try {
            val pm = c.getSystemService(Context.POWER_SERVICE) as PowerManager
            o.put("powerSave", pm.isPowerSaveMode).put("screenOn", pm.isInteractive)
            // 0 正常 1 微熱 2 中等 3 嚴重 4 危急 5 緊急 6 關機
            o.put("thermal", if (Build.VERSION.SDK_INT >= 29) pm.currentThermalStatus else -1)
        } catch (_: Exception) {}
        try { val s = StatFs(c.filesDir.path); o.put("diskFree", s.availableBytes).put("diskTotal", s.totalBytes) } catch (_: Exception) {}
        o.put("net", JSONObject(net(c)))
        o.put("t", System.currentTimeMillis())
        return o.toString()
    }

    fun net(c: Context): String {
        val o = JSONObject()
        try {
            val cm = c.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val caps = cm.getNetworkCapabilities(cm.activeNetwork)
            o.put("online", caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true)
            o.put("wifi", caps?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true || caps?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true)
            o.put("metered", cm.isActiveNetworkMetered)
        } catch (_: Exception) {}
        return o.toString()
    }

    /** 這支手機的 IP（Wi-Fi 區網、Tailscale 的 100.x 都會列出來） */
    fun ips(): String {
        val a = JSONArray()
        try {
            for (ni in NetworkInterface.getNetworkInterfaces()) {
                if (!ni.isUp || ni.isLoopback) continue
                for (ad in ni.inetAddresses) if (ad is Inet4Address && !ad.isLoopbackAddress)
                    a.put(JSONObject().put("name", ni.name).put("ip", ad.hostAddress).put("tailscale", ad.hostAddress?.startsWith("100.") == true))
            }
        } catch (_: Exception) {}
        return a.toString()
    }

    // ---------- 🧪 讓路名單：現在前景是哪個 App（要使用者在系統設定允許「使用情形存取」）
    fun hasUsage(c: Context): Boolean = try {
        val ops = c.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val m = if (Build.VERSION.SDK_INT >= 29) ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), c.packageName)
        else ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), c.packageName)
        m == AppOpsManager.MODE_ALLOWED
    } catch (_: Exception) { false }

    fun fgApp(c: Context): String {
        if (!hasUsage(c)) return ""
        return try {
            val um = c.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val now = System.currentTimeMillis()
            val ev = um.queryEvents(now - 6 * 3600_000L, now); val e = UsageEvents.Event()
            var pkg = ""
            while (ev.hasNextEvent()) { ev.getNextEvent(e); if (e.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) pkg = e.packageName ?: pkg }
            pkg
        } catch (_: Exception) { "" }
    }

    /** 手機上裝了哪些 App（讓路名單用） */
    fun apps(c: Context): String {
        val a = JSONArray()
        try {
            val pm = c.packageManager
            val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            pm.queryIntentActivities(i, 0).map { it.activityInfo.packageName to it.loadLabel(pm).toString() }
                .distinctBy { it.first }.filter { it.first != c.packageName }.sortedBy { it.second }
                .forEach { a.put(JSONObject().put("pkg", it.first).put("name", it.second)) }
        } catch (_: Exception) {}
        return a.toString()
    }

    fun envText(c: Context): String = "App：${c.packageName}  外殼 S${BuildConfig.VERSION_CODE}\n" +
        "手機：${Build.MANUFACTURER} ${Build.MODEL}  Android ${Build.VERSION.RELEASE}（SDK ${Build.VERSION.SDK_INT}）\n" +
        "時間：${KLog.ts()}\n狀態：${perf(c)}\n"
}
