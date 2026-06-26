package com.lekao.app.data.api

import android.content.Context
import com.lekao.app.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Retrofit + OkHttp 单例
 *
 * 安全要点（不要重新引入 HttpLoggingInterceptor！）：
 * 1. 不使用 HttpLoggingInterceptor（默认 BODY 级别会打整个 body + URL 含 query）
 * 2. 自定义 SafeHttpLogInterceptor: **默认全屏蔽**，只打印白名单字段
 *    - 方法 + 路径（永不打印 query，可能含 token/code/password/email）
 *    - 响应状态码
 *    - 几个诊断 header（X-Client-Platform / Content-Type / Content-Length）
 * 3. 永不打印 body（可能含密码 / JWT）
 * 4. 永不打印 Authorization / Cookie / Set-Cookie / Proxy-Auth / X-API-Key
 * 5. Release 包 (BuildConfig.DEBUG=false) 自动跳过
 */
object RetrofitClient {

    @Volatile
    private var instance: Retrofit? = null

    fun getInstance(context: Context): Retrofit {
        return instance ?: synchronized(this) {
            instance ?: build(context).also { instance = it }
        }
    }

    private fun build(context: Context): Retrofit {
        val cookieJar = LekaoCookieJar(context.applicationContext)

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
            if (!response.isSuccessful) {
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
            .addInterceptor(SafeHttpLogInterceptor)
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

/**
 * 自定义 HTTP 日志拦截器（替换 HttpLoggingInterceptor）
 *
 * 设计原则：**default-deny**
 * - 永不打印 request/response body（可能含密码/JWT）
 * - 永不打印 query 参数（可能含 token/code/email）
 * - 永不打印黑名单 header（Authorization/Cookie/Set-Cookie/Proxy-Auth 等）
 * - 只打 method + path + 响应码 + 白名单诊断 header
 * - Release 包 (BuildConfig.DEBUG=false) 整个拦截器空操作
 *
 * 安全性收益：
 * - 即使 URL 含 ?token=xxx&code=yyy 也不会被打 logcat
 * - 即使 header 里有 Authorization: Bearer xxx 也不会被打
 * - 攻击面 = 0（不依赖 regex 黑名单/白名单匹配）
 */
private object SafeHttpLogInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        if (!BuildConfig.DEBUG) {
            return chain.proceed(request)
        }

        // 请求行: → METHOD /path (无 query)
        android.util.Log.d("LekaoAPI", "→ ${request.method} ${request.url.encodedPath}")
        // 逐个白名单 header 显式打, 其它任何 header 都不打
        logHeaderIfPresent("LekaoAPI", "X-Client-Platform", request.header("X-Client-Platform"))
        logHeaderIfPresent("LekaoAPI", "X-Client-Version", request.header("X-Client-Version"))
        logHeaderIfPresent("LekaoAPI", "Content-Type", request.header("Content-Type"))
        logHeaderIfPresent("LekaoAPI", "Content-Length", request.header("Content-Length"))

        val response = chain.proceed(request)

        // 响应行: ← code METHOD /path
        android.util.Log.d(
            "LekaoAPI",
            "← ${response.code} ${request.method} ${request.url.encodedPath}"
        )
        logHeaderIfPresent("LekaoAPI", "Content-Type", response.header("Content-Type"))
        logHeaderIfPresent("LekaoAPI", "Content-Length", response.header("Content-Length"))
        logHeaderIfPresent("LekaoAPI", "Cache-Control", response.header("Cache-Control"))

        return response
    }

    private fun logHeaderIfPresent(tag: String, name: String, value: String?) {
        if (!value.isNullOrEmpty()) {
            android.util.Log.d(tag, "  $name: $value")
        }
    }
}
