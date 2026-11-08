package com.lekao.app.data.api

import android.content.Context
import com.google.gson.Gson
import com.lekao.app.data.local.LekaoDatabase
import com.lekao.app.data.local.MistakeDraftEntity
import com.lekao.app.work.MistakeSyncWorker
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * MistakeRepository · D1-D T30-T32 + M09
 *
 * 职责：
 * 1. 错题列表：服务端拉 + Room 缓存（先 cache 再 refresh）
 * 2. 草稿箱：本地保存 → 触发 MistakeSyncWorker 后台上传
 * 3. docx 导出：调 /lekao/mistake/export → downloadUrl → 客户端下载
 */
class MistakeRepository(
    private val context: Context,
    private val api: LekaoApi,
) {
    private val dao = LekaoDatabase.getInstance(context).mistakeDraftDao()
    private val gson = Gson()

    /**
     * 拉取服务端错题列表
     */
    suspend fun fetchList(page: Int = 1, limit: Int = 20): Result<MistakeListResponse> {
        return runCatching {
            val resp = api.listMistakes(page, limit)
            if (!resp.isSuccessful) throw retrofit2.HttpException(resp)
            resp.body() ?: MistakeListResponse()
        }
    }

    /**
     * 观察本地草稿箱（Flow 实时刷新）
     */
    fun observeDrafts(email: String): Flow<List<MistakeDraftEntity>> {
        return dao.observeByEmail(email)
    }

    /**
     * 保存错题为草稿 → 入库 + 触发后台上传
     *
     * @return draft id
     */
    suspend fun saveDraft(
        email: String,
        subject: String,
        topic: String,
        questions: List<MistakeQuestionDto>,
        imagePaths: List<String>,
    ): Result<Long> {
        return runCatching {
            val draft = MistakeDraftEntity(
                userEmail = email,
                subject = subject,
                topic = topic,
                questionsJson = gson.toJson(questions),
                imagePaths = imagePaths.joinToString(","),
            )
            val id = dao.insert(draft)
            // 触发后台同步
            MistakeSyncWorker.enqueueOneTime(context)
            id
        }
    }

    /**
     * 删除草稿
     */
    suspend fun deleteDraft(id: Long) {
        dao.delete(id)
    }

    /**
     * 直接同步上传（绕过 WorkManager 调试用）
     */
    suspend fun syncNow(): Result<Int> {
        return runCatching {
            val pending = dao.pending()
            var synced = 0
            for (draft in pending) {
                try {
                    val questions: List<MistakeQuestionDto> = gson.fromJson(
                        draft.questionsJson,
                        Array<MistakeQuestionDto>::class.java
                    ).toList()
                    val resp = api.uploadMistake(
                        MistakeUploadRequest(
                            subject = draft.subject,
                            topic = draft.topic,
                            questions = questions,
                        )
                    )
                    if (resp.isSuccessful) {
                        val body = resp.body()
                        dao.markSynced(draft.id, MistakeDraftEntity.STATUS_SYNCED, body?.id, System.currentTimeMillis())
                        synced++
                    } else {
                        dao.markFailed(draft.id, MistakeDraftEntity.STATUS_FAILED, "HTTP ${resp.code()}")
                    }
                } catch (t: Throwable) {
                    dao.markFailed(draft.id, MistakeDraftEntity.STATUS_FAILED, t.message)
                }
            }
            synced
        }
    }

    /**
     * 导出错题为 docx
     */
    suspend fun exportDocx(mistakeIds: List<String>): Result<MistakeExportResponse> {
        return runCatching {
            val resp = api.exportMistake(MistakeExportRequest(mistakeIds, format = "docx"))
            if (!resp.isSuccessful) throw retrofit2.HttpException(resp)
            resp.body() ?: throw IllegalStateException("空响应")
        }
    }

    /**
     * 已同步错题数（用于 Dashboard 统计）
     */
    suspend fun pendingCount(): Int = dao.pending().size
}