package com.lekao.app.data.api

import android.content.Context
import com.lekao.app.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Retrofit + OkHttp 单例（按 spec §3.3.1 决策：Cookie 自动管理）
 *
 * 关键设计：
 * 1. Cookie 自动管理（LekaoCookieJar）
 * 2. SSE 流式响应支持（READ_TIMEOUT 60s）
 * 3. 错误处理 Interceptor（401 自动跳登录 / 403 banned 提示 / 429 限流）
 * 4. 请求头注入（X-Client-Platform: android / X-Client-Version: ...）
 */
object RetrofitClient {

    @Volatile
    private var instance: Retrofit? = null

    fun getInstance(context: Context): Retrofit {
        return instance ?: synchronized(this) {
            instance ?: build(context).also { instance = it }
        }
    }

    /**
     * 自定义 logger: 屏蔽敏感 header（Authorization / Cookie / Set-Cookie）
     * 即使是 HEADERS 级别也不能直打 cookie 值, 否则 logcat 会泄漏 token
     */
    private val safeLogger = HttpLoggingInterceptor.Logger { msg ->
        val sanitized = msg.replace(
            Regex("(?i)(authorization|cookie|set-cookie): .*"),
            "$1: ***REDACTED***"
        )
        android.util.Log.d("LekaoAPI-HTTP", sanitized)
    }

    private fun build(context: Context): Retrofit {
        val cookieJar = LekaoCookieJar(context.applicationContext)

        // DEBUG 也只用 HEADERS, BODY 级别会把 password/code/token 都打 logcat, 不可接受
        val loggingInterceptor = HttpLoggingInterceptor(safeLogger).apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.HEADERS
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        val clientHeadersInterceptor = Interceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("X-Client-Platform", "android")
                .addHeader("X-Client-Version", BuildConfig.VERSION_NAME)
                .addHeader("X-Client-Code", BuildConfig.VERSION_CODE.toString())
                .addHeader("Accept", "application/json")
                .build()
            chain.proceed(request)
        }

        val errorLoggingInterceptor = Interceptor { chain ->
            val response: Response = chain.proceed(chain.request())
            // 错误码统一打 log（实际错误处理在 Repository 层 catch HttpException）
            if (!response.isSuccessful) {
                // 只打 method + path, 不打 query（query 可能含 email, code, token）
                // 不打 localPrincipal（SSL 会话信息 + 客户端证书主体, 泄漏面大）
                android.util.Log.w(
                    "LekaoAPI",
                    "[${response.code}] ${chain.request().method} ${chain.request().url.encodedPath}"
                )
            }
            response
        }

        val okHttpClient = OkHttpClient.Builder()
            .cookieJar(cookieJar)
            .connectTimeout(LekaoConfig.CONNECT_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .readTimeout(LekaoConfig.READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .writeTimeout(LekaoConfig.WRITE_TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .addInterceptor(clientHeadersInterceptor)
            .addInterceptor(loggingInterceptor)
            .addInterceptor(errorLoggingInterceptor)
            .build()

        return Retrofit.Builder()
            .baseUrl(LekaoConfig.BASE_URL + LekaoConfig.API_VERSION + "/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun clearCookies(context: Context) {
        val cookieJar = LekaoCookieJar(context.applicationContext)
        cookieJar.clearAll()
    }

    fun api(context: Context): LekaoApi {
        return getInstance(context).create(LekaoApi::class.java)
    }
}