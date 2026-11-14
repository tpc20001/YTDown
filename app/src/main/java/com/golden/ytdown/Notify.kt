package com.golden.ytdown

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

/** 通知：下載中（常駐、安靜）＋下載完成（一般）。 */
object Notify {
    const val CH_RUN = "ytd_run"; const val CH_DONE = "ytd_done"; const val ONGOING_ID = 1
    private var seq = 100

    fun channels(c: Context) {
        val nm = c.getSystemService(NotificationManager::class.java) ?: return
        nm.createNotificationChannel(NotificationChannel(CH_RUN, "下載中", NotificationManager.IMPORTANCE_LOW))
        nm.createNotificationChannel(NotificationChannel(CH_DONE, "下載完成", NotificationManager.IMPORTANCE_DEFAULT))
    }
    private fun open(c: Context): PendingIntent = PendingIntent.getActivity(
        c, 0, Intent(c, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    fun ongoing(c: Context, n: Int, text: String? = null): Notification = NotificationCompat.Builder(c, CH_RUN)
        .setSmallIcon(R.drawable.ic_stat).setContentTitle("YT Download：正在下載 $n 個")
        .setContentText(text ?: "點這裡回到 App").setOngoing(true).setOnlyAlertOnce(true)
        .setContentIntent(open(c)).build()

    fun updateOngoing(c: Context, n: Int, text: String? = null) {
        try { NotificationManagerCompat.from(c).notify(ONGOING_ID, ongoing(c, n, text)) } catch (_: SecurityException) {}
    }

    fun done(c: Context, title: String, ok: Boolean) {
        val n = NotificationCompat.Builder(c, CH_DONE)
            .setSmallIcon(R.drawable.ic_stat)
            .setContentTitle(if (ok) "下載完成" else "下載失敗")
            .setContentText(title.take(120)).setAutoCancel(true)
            .setContentIntent(open(c)).build()
        try { NotificationManagerCompat.from(c).notify(seq++, n) } catch (_: SecurityException) {}
    }
}

/** 有下載在跑時讓 App 留在前景服務，切到背景不會被系統殺掉。 */
class KeepAlive : Service() {
    override fun onBind(i: Intent?): IBinder? = null
    override fun onStartCommand(i: Intent?, flags: Int, startId: Int): Int {
        val n = Notify.ongoing(this, i?.getIntExtra("n", 1) ?: 1, Engine.fgText)
        if (Build.VERSION.SDK_INT >= 29) startForeground(Notify.ONGOING_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        else startForeground(Notify.ONGOING_ID, n)
        return START_NOT_STICKY
    }
}
