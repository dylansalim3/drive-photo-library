package com.dylan.drivephotolibrary.data.backup

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class SyncLedgerDatabase(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "dpl_sync_ledger.db"
        private const val DATABASE_VERSION = 1
        const val TABLE_LEDGER = "media_sync_ledger"
        const val COL_MEDIA_STORE_ID = "media_store_id"
        const val COL_CONTENT_HASH = "content_hash"
        const val COL_FILE_NAME = "file_name"
        const val COL_FILE_SIZE = "file_size"
        const val COL_DATE_MODIFIED = "date_modified"
        const val COL_DRIVE_FILE_ID = "drive_file_id"
        const val COL_SYNC_STATUS = "sync_status" // SYNCED, SKIPPED_DUPLICATE, FAILED
        const val COL_SYNCED_AT = "synced_at"

        @Volatile
        private var instance: SyncLedgerDatabase? = null

        fun getInstance(context: Context): SyncLedgerDatabase {
            return instance ?: synchronized(this) {
                instance ?: SyncLedgerDatabase(context.applicationContext).also { instance = it }
            }
        }
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE $TABLE_LEDGER (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_MEDIA_STORE_ID INTEGER UNIQUE NOT NULL,
                $COL_CONTENT_HASH TEXT,
                $COL_FILE_NAME TEXT NOT NULL,
                $COL_FILE_SIZE INTEGER NOT NULL,
                $COL_DATE_MODIFIED INTEGER NOT NULL,
                $COL_DRIVE_FILE_ID TEXT,
                $COL_SYNC_STATUS TEXT NOT NULL,
                $COL_SYNCED_AT INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL("CREATE INDEX idx_media_store ON $TABLE_LEDGER($COL_MEDIA_STORE_ID);")
        db.execSQL("CREATE INDEX idx_hash ON $TABLE_LEDGER($COL_CONTENT_HASH);")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_LEDGER")
        onCreate(db)
    }

    /**
     * Tier 1 check: Instant 0ms verification if media item was already backed up and not modified.
     */
    fun isAlreadySynced(mediaStoreId: Long, dateModified: Long): Boolean {
        readableDatabase.rawQuery(
            "SELECT 1 FROM $TABLE_LEDGER WHERE $COL_MEDIA_STORE_ID = ? AND $COL_DATE_MODIFIED = ? AND $COL_SYNC_STATUS IN ('SYNCED', 'SKIPPED_DUPLICATE') LIMIT 1",
            arrayOf(mediaStoreId.toString(), dateModified.toString())
        ).use { cursor ->
            return cursor.moveToFirst()
        }
    }

    /**
     * Checks if this content hash has already been backed up to Drive.
     */
    fun isHashSynced(contentHash: String): Boolean {
        readableDatabase.rawQuery(
            "SELECT 1 FROM $TABLE_LEDGER WHERE $COL_CONTENT_HASH = ? AND $COL_SYNC_STATUS IN ('SYNCED', 'SKIPPED_DUPLICATE') LIMIT 1",
            arrayOf(contentHash)
        ).use { cursor ->
            return cursor.moveToFirst()
        }
    }

    fun recordSyncResult(
        mediaStoreId: Long,
        contentHash: String?,
        fileName: String,
        fileSize: Long,
        dateModified: Long,
        driveFileId: String?,
        status: String
    ) {
        val values = ContentValues().apply {
            put(COL_MEDIA_STORE_ID, mediaStoreId)
            put(COL_CONTENT_HASH, contentHash)
            put(COL_FILE_NAME, fileName)
            put(COL_FILE_SIZE, fileSize)
            put(COL_DATE_MODIFIED, dateModified)
            put(COL_DRIVE_FILE_ID, driveFileId)
            put(COL_SYNC_STATUS, status)
            put(COL_SYNCED_AT, System.currentTimeMillis())
        }
        writableDatabase.insertWithOnConflict(TABLE_LEDGER, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getSyncedCount(): Int {
        readableDatabase.rawQuery(
            "SELECT COUNT(*) FROM $TABLE_LEDGER WHERE $COL_SYNC_STATUS IN ('SYNCED', 'SKIPPED_DUPLICATE')",
            null
        ).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }
    }

    fun getLastSyncedTimestamp(): Long {
        readableDatabase.rawQuery(
            "SELECT MAX($COL_SYNCED_AT) FROM $TABLE_LEDGER WHERE $COL_SYNC_STATUS IN ('SYNCED', 'SKIPPED_DUPLICATE')",
            null
        ).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getLong(0) else 0L
        }
    }

    fun clearLedger() {
        writableDatabase.delete(TABLE_LEDGER, null, null)
    }
}
