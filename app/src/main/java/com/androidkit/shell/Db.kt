package com.androidkit.shell

import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 資料庫：files/Data/app.sqlite3（SQLite）。畫面用 DB.q()／DB.run()（kit.js）叫。
 * 每天第一次開 App 自動備份到 files/Data/db_backup/，留 7 份。
 */
object Db {
    private var db: SQLiteDatabase? = null
    private lateinit var dataDir: File

    fun init(c: Context) { dataDir = File(c.filesDir, "Data").apply { mkdirs() } }

    @Synchronized private fun open(): SQLiteDatabase {
        db?.let { if (it.isOpen) return it }
        val d = SQLiteDatabase.openOrCreateDatabase(File(dataDir, "app.sqlite3"), null)
        db = d; return d
    }

    private fun args(json: String): Array<Any?> = try {
        val a = JSONArray(json.ifBlank { "[]" }); Array(a.length()) { i -> if (a.isNull(i)) null else a.get(i) }
    } catch (_: Exception) { emptyArray() }

    /** 執行（CREATE／INSERT／UPDATE／DELETE）。多句用 ; 分開也可以（不能帶參數） */
    @Synchronized fun exec(sql: String, argsJson: String): String = try {
        val d = open(); val a = args(argsJson)
        if (a.isEmpty() && sql.trim().trimEnd(';').contains(';')) {
            d.beginTransaction()
            try { sql.split(';').map { it.trim() }.filter { it.isNotEmpty() }.forEach { d.execSQL(it) }; d.setTransactionSuccessful() } finally { d.endTransaction() }
        } else d.execSQL(sql, a)
        var changes = 0L; var last = 0L
        d.rawQuery("SELECT changes(), last_insert_rowid()", null).use { if (it.moveToFirst()) { changes = it.getLong(0); last = it.getLong(1) } }
        JSONObject().put("ok", true).put("changes", changes).put("lastId", last).toString()
    } catch (e: Exception) { KLog.err("資料庫 exec：" + sql.take(120), e); JSONObject().put("ok", false).put("err", e.message ?: "").toString() }

    /** 查詢 → {ok, rows:[{欄位:值}]}（最多 5000 列） */
    @Synchronized fun query(sql: String, argsJson: String): String = try {
        val a = args(argsJson).map { it?.toString() }.toTypedArray()
        val rows = JSONArray()
        open().rawQuery(sql, a).use { c ->
            while (c.moveToNext() && rows.length() < 5000) {
                val r = JSONObject()
                for (i in 0 until c.columnCount) r.put(c.getColumnName(i), when (c.getType(i)) {
                    Cursor.FIELD_TYPE_NULL -> JSONObject.NULL
                    Cursor.FIELD_TYPE_INTEGER -> c.getLong(i)
                    Cursor.FIELD_TYPE_FLOAT -> c.getDouble(i)
                    Cursor.FIELD_TYPE_BLOB -> "(blob ${c.getBlob(i).size} bytes)"
                    else -> c.getString(i)
                })
                rows.put(r)
            }
        }
        JSONObject().put("ok", true).put("rows", rows).toString()
    } catch (e: Exception) { KLog.err("資料庫 query：" + sql.take(120), e); JSONObject().put("ok", false).put("err", e.message ?: "").put("rows", JSONArray()).toString() }

    /** 每天備份一次，留 7 份 */
    @Synchronized fun dailyBackup() {
        try {
            val src = File(dataDir, "app.sqlite3"); if (!src.exists() || src.length() == 0L) return
            val bk = File(dataDir, "db_backup").apply { mkdirs() }
            val today = File(bk, "app_" + SimpleDateFormat("yyyyMMdd", Locale.US).format(Date()) + ".sqlite3")
            if (today.exists()) return
            db?.let { if (it.isOpen) it.close() }; db = null
            src.copyTo(today, overwrite = true)
            bk.listFiles()?.filter { it.name.startsWith("app_") }?.sortedByDescending { it.name }?.drop(7)?.forEach { it.delete() }
            KLog.w("資料庫已備份：${today.name}")
        } catch (e: Exception) { KLog.err("資料庫備份", e) }
    }
}
