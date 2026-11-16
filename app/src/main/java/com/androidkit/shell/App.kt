package com.androidkit.shell

import android.app.AlarmManager
import android.app.Application
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import kotlin.system.exitProcess

/**
 * App 一開就跑：LOG、閃退處理（記錄＋自動重開）、通知頻道、資料庫備份、畫面卡住偵測。
 */
class App : Application() {
    override fun onCreate() {
        super.onCreate()
        ctx = applicationContext
        KLog.init(this); Db.init(this)
        KLog.w("—— App 啟動（外殼 S${BuildConfig.VERSION_CODE}）")
        Crash.install(this)
        try { Notify.channels(this) } catch (e: Throwable) { KLog.err("通知頻道", e) }
        Thread({ Db.dailyBackup() }, "db-backup").start()
        Watchdog.start()
    }
    companion object {
        lateinit var ctx: Context
        fun prefs(): SharedPreferences = ctx.getSharedPreferences("kit", Context.MODE_PRIVATE)
    }
}

/**
 * 閃退：記下每條執行緒在做什麼 → 自動重開。
 * 10 分鐘內第 2 次閃退：重開時先把背景工作全部暫停；第 3 次：不再重開。
 */
object Crash {
    private const val WINDOW = 10 * 60_000L

    fun install(c: Context) {
        val prev = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { t, e ->
            try {
                KLog.crash(t, e)
                val n = record()
                val p = App.prefs()
                if (n >= 2) p.edit().putBoolean("pause_all", true).commit()
                if (p.getBoolean("auto_restart", true) && n < 3) {
                    restart(c, 1500)
                    // 有些手機不讓 App 自己從背景打開：留一則通知，點一下就重開
                    Notify.msg(c, "App 剛剛閃退了", "正在自動重開；沒有打開的話，點這裡。（閃退紀錄在 LOG）")
                } else KLog.w("閃退 $n 次（10 分鐘內），不再自動重開")
            } catch (_: Throwable) {}
            if (prev != null) prev.uncaughtException(t, e) else exitProcess(2)
        }
    }

    /** 記這次閃退，回傳 10 分鐘內第幾次 */
    private fun record(): Int {
        val p = App.prefs(); val now = System.currentTimeMillis()
        val list = (p.getString("crashes", "") ?: "").split(',').mapNotNull { it.toLongOrNull() }.filter { now - it < WINDOW } + now
        p.edit().putString("crashes", list.joinToString(",")).commit()
        return list.size
    }

    fun recent(): Int {
        val now = System.currentTimeMillis()
        return (App.prefs().getString("crashes", "") ?: "").split(',').mapNotNull { it.toLongOrNull() }.count { now - it < WINDOW }
    }

    fun info(): String = JSONObject().put("recent", recent()).put("pauseAll", App.prefs().getBoolean("pause_all", false))
        .put("autoRestart", App.prefs().getBoolean("auto_restart", true)).toString()

    /** 畫面讀過「全部暫停」之後清掉 */
    fun clearPause() { App.prefs().edit().putBoolean("pause_all", false).apply() }

    fun restart(c: Context, delayMs: Long) {
        try {
            val i = Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            val opt = if (android.os.Build.VERSION.SDK_INT >= 34) android.app.ActivityOptions.makeBasic()
                .setPendingIntentCreatorBackgroundActivityStartMode(android.app.ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED).toBundle() else null
            val pi = PendingIntent.getActivity(c, 7, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_CANCEL_CURRENT, opt)
            val am = c.getSystemService(Context.ALARM_SERVICE) as AlarmManager
            am.set(AlarmManager.RTC, System.currentTimeMillis() + delayMs, pi)
        } catch (e: Throwable) { KLog.err("排重開", e) }
    }
}

/** 畫面卡住偵測：主執行緒超過門檻秒數沒回應，就記下它卡在哪一行（ui_freeze_log.txt） */
object Watchdog {
    @Volatile var thresholdMs = 2000L
    @Volatile private var beat = 0L
    private val main = Handler(Looper.getMainLooper())

    fun start() {
        beat = System.currentTimeMillis()
        val tick = object : Runnable { override fun run() { beat = System.currentTimeMillis(); main.postDelayed(this, 500) } }
        main.post(tick)
        Thread({
            var reported = 0L
            while (true) {
                try {
                    Thread.sleep(500)
                    val late = System.currentTimeMillis() - beat
                    if (late > thresholdMs && beat != reported) {
                        reported = beat
                        val st = Looper.getMainLooper().thread.stackTrace.take(15).joinToString("\n    at ")
                        KLog.write("ui_freeze_log.txt", "外殼主執行緒卡住 ${late / 1000.0} 秒，卡在：\n    at $st")
                    }
                } catch (_: Throwable) {}
            }
        }, "watchdog").apply { isDaemon = true }.start()
    }
}
