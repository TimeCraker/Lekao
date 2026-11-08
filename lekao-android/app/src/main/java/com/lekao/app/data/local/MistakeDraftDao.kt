package com.lekao.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * Mistake Draft DAO
 */
@Dao
interface MistakeDraftDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(draft: MistakeDraftEntity): Long

    @Update
    suspend fun update(draft: MistakeDraftEntity)

    @Query("UPDATE mistake_drafts SET sync_status = :status, server_id = :serverId, synced_at = :syncedAt, error_message = NULL WHERE id = :id")
    suspend fun markSynced(id: Long, status: String, serverId: String?, syncedAt: Long)

    @Query("UPDATE mistake_drafts SET sync_status = :status, error_message = :error WHERE id = :id")
    suspend fun markFailed(id: Long, status: String, error: String?)

    @Query("SELECT * FROM mistake_drafts WHERE user_email = :email ORDER BY created_at DESC")
    fun observeByEmail(email: String): Flow<List<MistakeDraftEntity>>

    @Query("SELECT * FROM mistake_drafts WHERE sync_status = 'PENDING' ORDER BY created_at ASC")
    suspend fun pending(): List<MistakeDraftEntity>

    @Query("SELECT * FROM mistake_drafts WHERE sync_status = 'FAILED' ORDER BY created_at DESC LIMIT 50")
    suspend fun failed(): List<MistakeDraftEntity>

    @Query("SELECT * FROM mistake_drafts WHERE id = :id LIMIT 1")
    suspend fun byId(id: Long): MistakeDraftEntity?

    @Query("DELETE FROM mistake_drafts WHERE id = :id")
    suspend fun delete(id: Long)
}