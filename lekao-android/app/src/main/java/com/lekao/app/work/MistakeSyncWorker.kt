package com.lekao.app.work

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.lekao.app.data.api.LekaoApi
import com.lekao.app.data.api.LekaoCookieJar
import com.lekao.app.data.api.MistakeRepository
import com.lekao.app.data.api.RetrofitClient
import java.util.concurrent.TimeUnit

/**
 * MistakeSyncWorker · D1-D T32 + M09
 *
 * 后台同步草稿箱错题到服务端
 *
 * 触发：
 * - 草稿新增时 (MistakeRepository.saveDraft)
 * - 网络恢复时 (WorkManager Constraints)
 * - 应用启动时 (可选)
 *
 * 策略：
 * - 只在 NETWORK_CONNECTED 时跑
 * - 失败指数退避 (10s → 30s → 2min)
 * - unique work name 避免重复触发
 */
class MistakeSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        return try {
            val ctx = applicationContext
            val api = RetrofitClient.api(ctx)
            val repo = MistakeRepository(ctx, api)
            val result = repo.syncNow()
            result.fold(
                onSuccess = { synced ->
                    android.util.Log.i("MistakeSync", "Synced $synced drafts")
                    Result.success()
                },
                onFailure = { error ->
                    android.util.Log.w("MistakeSync", "Sync failed: ${error.message}")
                    Result.retry()
                }
            )
        } catch (t: Throwable) {
            android.util.Log.e("MistakeSync", "Worker failed", t)
            Result.retry()
        }
    }

    companion object {
        const val UNIQUE_NAME = "lekao_mistake_sync"

        fun enqueueOneTime(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()
            val request = OneTimeWorkRequestBuilder<MistakeSyncWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                UNIQUE_NAME,
                ExistingWorkPolicy.KEEP,
                request
            )
        }
    }
}