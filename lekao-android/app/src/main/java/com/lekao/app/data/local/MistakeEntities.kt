package com.lekao.app.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Mistake 本地表（M09 草稿箱 + 离线缓存）
 *
 * 双角色：
 * 1. 草稿箱：本地新增 (syncStatus=PENDING) → WorkManager 后台上传 → syncStatus=SYNCED
 * 2. 离线缓存：服务端列表 (syncStatus=SYNCED) → 离线可读
 */

@Entity(tableName = "mistake_drafts")
data class MistakeDraftEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    @ColumnInfo(name = "user_email") val userEmail: String,
    @ColumnInfo(name = "subject") val subject: String,
    @ColumnInfo(name = "topic") val topic: String,
    @ColumnInfo(name = "questions_json") val questionsJson: String,  // List<MistakeQuestionDto> JSON
    @ColumnInfo(name = "image_paths") val imagePaths: String,         // 逗号分隔本地路径
    @ColumnInfo(name = "sync_status") val syncStatus: String = STATUS_PENDING,
    @ColumnInfo(name = "server_id") val serverId: String? = null,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis(),
    @ColumnInfo(name = "synced_at") val syncedAt: Long? = null,
    @ColumnInfo(name = "error_message") val errorMessage: String? = null,
) {
    companion object {
        const val STATUS_PENDING = "PENDING"
        const val STATUS_SYNCED = "SYNCED"
        const val STATUS_FAILED = "FAILED"
    }
}