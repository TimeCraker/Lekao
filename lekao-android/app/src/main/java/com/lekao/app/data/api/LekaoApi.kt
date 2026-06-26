package com.lekao.app.data.api

import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Streaming

/**
 * Lekao API · 17 个 endpoint（按 spec §4.2）
 *
 * Auth (6):  send-code / verify-code / sign-in-password / reset / me / signout
 * Summary (1): summarize (SSE 流式)
 * Mistake (3): upload / list / export
 * Ideas (4): list / submit / like / comments
 * Admin (3): audit-log / coin-log / ban
 * FCM (1): register
 */
interface LekaoApi {

    // ============ Auth ============
    @POST("auth/send-code")
    suspend fun sendCode(@Body req: SendCodeRequest): Response<AuthResponse>

    @POST("auth/verify-code")
    suspend fun verifyCode(@Body req: VerifyCodeRequest): Response<AuthResponse>

    @POST("auth/sign-in-password")
    suspend fun signInWithPassword(@Body req: SignInPasswordRequest): Response<AuthResponse>

    @POST("auth/reset")
    suspend fun resetPassword(@Body req: ResetPasswordRequest): Response<AuthResponse>

    @GET("auth/me")
    suspend fun me(): Response<MeResponse>

    @POST("auth/signout")
    suspend fun signOut(): Response<Unit>

    // ============ Summary (SSE 流式) ============
    @POST("lekao/summarize")
    @Streaming
    suspend fun summarizeStream(@Body req: SummarizeRequest): Response<ResponseBody>

    // ============ Mistake ============
    @POST("lekao/mistake/upload")
    suspend fun uploadMistake(@Body req: MistakeUploadRequest): Response<MistakeDto>

    @GET("lekao/mistake/list")
    suspend fun listMistakes(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<MistakeListResponse>

    @POST("lekao/mistake/export")
    suspend fun exportMistake(@Body req: MistakeExportRequest): Response<MistakeExportResponse>

    // ============ Ideas ============
    @GET("lekao/ideas")
    suspend fun listIdeas(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("sort") sort: String? = null  // "top" | "new" | "comments"
    ): Response<IdeaListResponse>

    @POST("lekao/ideas")
    suspend fun submitIdea(@Body req: IdeaSubmitRequest): Response<IdeaDto>

    @POST("lekao/ideas/{id}/like")
    suspend fun likeIdea(@Path("id") id: String): Response<Map<String, Boolean>>

    @GET("lekao/ideas/{id}/comments")
    suspend fun getIdeaComments(
        @Path("id") id: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<IdeaCommentListResponse>

    @POST("lekao/ideas/{id}/comments")
    suspend fun postIdeaComment(
        @Path("id") id: String,
        @Body req: IdeaCommentRequest
    ): Response<IdeaCommentDto>

    // ============ Admin ============
    @GET("admin/audit-log")
    suspend fun getAuditLog(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 30,
        @Query("action") action: String? = null
    ): Response<AuditLogResponse>

    @GET("admin/coin-log")
    suspend fun getCoinLog(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 30,
        @Query("email") email: String? = null
    ): Response<CoinLogResponse>

    @POST("admin/ban")
    suspend fun banUser(@Body req: BanRequest): Response<Map<String, Boolean>>

    @POST("admin/coin-adjust")
    suspend fun coinAdjust(@Body req: CoinAdjustRequest): Response<Map<String, Boolean>>

    // ============ FCM (M12) ============
    @POST("lekao/fcm/register")
    suspend fun registerFcmToken(@Body req: FcmRegisterRequest): Response<FcmRegisterResponse>
}

// Admin 包装响应（与 Web 端一致）
data class AuditLogResponse(
    val logs: List<AuditLogDto> = emptyList(),
    val total: Int = 0
)

data class CoinLogResponse(
    val logs: List<CoinLogDto> = emptyList(),
    val total: Int = 0
)