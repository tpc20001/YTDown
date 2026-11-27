package com.golden.ytdown

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast

/**
 * 分享選單的「YT Download」：直接加入下載，畫面不跳過去（透明、不進最近使用）。
 * YT Download 開著（全螢幕、小窗、分屏、在背景都算）→ 直接交給它開始下載；
 * 完全沒開 → 在背景把它叫起來收下網址，收完自己退到後面，回到你原本的 App。
 */
class ShareActivity : Activity() {
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        val t = ((intent?.getStringExtra(Intent.EXTRA_TEXT) ?: "") + " " + (intent?.getStringExtra(Intent.EXTRA_SUBJECT) ?: "")).trim()
        if (!Regex("https?://").containsMatchIn(t)) Toast.makeText(this, "分享的內容裡沒有網址", Toast.LENGTH_SHORT).show()
        else {
            val s = Engine.sink
            if (s != null) s("onShareBg", t)
            else try {
                startActivity(Intent(this, MainActivity::class.java).setAction(Intent.ACTION_SEND).putExtra(Intent.EXTRA_TEXT, t)
                    .putExtra(MainActivity.EXTRA_BG, true).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION))
            } catch (_: Exception) {}   // 「已加入」或「下載過了，略過」由畫面那邊判斷後再提示，不會兩個打架
        }
        finish()
        overridePendingTransition(0, 0)
    }
}
