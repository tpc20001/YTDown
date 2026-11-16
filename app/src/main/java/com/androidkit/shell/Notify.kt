package com.androidkit.shell

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

/** 通知：背景工作中（常駐、安靜）＋一般通知（完成、提醒）。 */
object Notify {
    const val CH_RUN = "kit_run"; const val CH_MSG = "kit_msg"; const val ONGOING_ID = 1
    @Volatile var title = ""
    @Volatile var text = ""
    private var seq = 100

    fun channels(c: Context) {
        val nm = c.getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(NotificationChannel(CH_RUN, "背景工作中", NotificationManager.IMPORTANCE_LOW))
        nm.createNotificationChannel(NotificationChannel(CH_MSG, "通知", NotificationManager.IMPORTANCE_DEFAULT))
    }
    private fun open(c: Context): PendingIntent = PendingIntent.getActivity(
        c, 0, Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    fun ongoing(c: Context): Notification = NotificationCompat.Builder(c, CH_RUN)
        .setSmallIcon(R.drawable.ic_stat).setContentTitle(title.ifEmpty { c.getString(R.string.app_name) })
        .setContentText(text.ifEmpty { "點這裡回到 App" }).setOngoing(true).setOnlyAlertOnce(true)
        .setContentIntent(open(c)).build()

    /** 常駐通知開／關（有背景工作或 📡 遠端網頁開著時開，切到背景才不會被系統殺掉） */
    fun keep(c: Context, on: Boolean) {
        try {
            val i = Intent(c, KeepAlive::class.java)
            if (on) {
                if (KeepAlive.running) NotificationManagerCompat.from(c).notify(ONGOING_ID, ongoing(c))
                else ContextCompat.startForegroundService(c, i)
            } else if (KeepAlive.running) c.stopService(i)
        } catch (e: Throwable) { KLog.err("常駐通知", e) }
    }

    fun msg(c: Context, t: String, body: String) {
        val n = NotificationCompat.Builder(c, CH_MSG).setSmallIcon(R.drawable.ic_stat)
            .setContentTitle(t.take(80)).setContentText(body.take(200)).setAutoCancel(true)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body.take(1000)))
            .setContentIntent(open(c)).build()
        try { NotificationManagerCompat.from(c).notify(seq++, n) } catch (_: SecurityException) {}
    }
}

/** 前景服務：讓 App 在背景也活著（畫面關了，背景工作和遠端網頁照跑）。 */
class KeepAlive : Service() {
    companion object { @Volatile var running = false }
    override fun onBind(i: Intent?): IBinder? = null
    override fun onStartCommand(i: Intent?, flags: Int, startId: Int): Int {
        val n = Notify.ongoing(this)
        try {
            if (Build.VERSION.SDK_INT >= 29) startForeground(Notify.ONGOING_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
            else startForeground(Notify.ONGOING_ID, n)
            running = true
        } catch (e: Throwable) { KLog.err("前景服務", e); stopSelf() }
        return START_NOT_STICKY
    }
    override fun onDestroy() { running = false; super.onDestroy() }
}
