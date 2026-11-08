package com.lekao.app.data.api

import com.google.gson.annotations.SerializedName

// ================================================================
// 通用错误响应
// ================================================================
data class ErrorResponse(
    val error: String? = null,
    val message: String? = null,
    val reason: String? = null
)

// ================================================================
// Auth (F01/F02)
// ================================================================
data class UserDto(
    val id: String,
    val email: String,
    val name: String? = null,
    val role: String = "USER",
    @SerializedName("tCoin") val tCoin: Int = 0,
    @SerializedName("lekaoGiftCoin") val lekaoGiftCoin: Int = 0,
    val banned: Boolean = false,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class SignInPasswordRequest(
    val email: String,
    val password: String
)

// ⭐ T82 修复: 注册 API
data class RegisterRequest(
    val email: String,
    val password: String,
    val name: String? = null,
    val code: String
)

data class RegisterResponse(
    val success: Boolean = false,
    val message: String? = null,
    val user: UserDto? = null
)

data class SendCodeRequest(
    val email: String,
    val purpose: String  // "register" | "login" | "reset"
)

data class VerifyCodeRequest(
    val email: String,
    val code: String,
    val inviteCode: String? = null  // 可选邀请码, 填了送 15 枚代币
)

data class ResetPasswordRequest(
    val email: String,
    val code: String,
    val newPassword: String
)

data class AuthResponse(
    val success: Boolean = false,
    val user: UserDto? = null,
    @SerializedName("tCoin") val tCoin: Int = 0,
    @SerializedName("lekaoGiftCoin") val lekaoGiftCoin: Int = 0
)

data class MeResponse(
    val user: UserDto
)

// ================================================================
// Summary (F04/F05 · SSE 流式)
// ================================================================
enum class SummaryTemplate(val apiValue: String) {
    SUMMARY("summary"),
    FEEDBACK("feedback")
}

data class SummarizeRequest(
    val images: List<String> = emptyList(),  // base64 encoded
    val description: String? = null,
    val template: String = "summary",
    val subject: String? = null  // feedback 模板用
)

/**
 * SSE 事件 payload (解析 `data: { ... }` 行)
 */
data class SummarizeChunk(
    val type: String,           // "metadata" | "chunk" | "done" | "error"
    val content: String? = null,
    val subject: String? = null,
    val topic: String? = null,
    @SerializedName("keyPoints") val keyPoints: List<String>? = null,
    val feedback: String? = null,
    val summary: String? = null,
    @SerializedName("coinDeducted") val coinDeducted: Boolean? = null,
    @SerializedName("newGift") val newGift: Int? = null,
    @SerializedName("newPaid") val newPaid: Int? = null
)

// ================================================================
// Mistake (F06)
// ================================================================
data class MistakeQuestionDto(
    val id: String? = null,
    val content: String,
    val imagePath: String? = null,
    val annotation: String? = null  // base64
)

data class MistakeDto(
    val id: String,
    val userId: String,
    val subject: String,           // 数学/物理/化学/英语/语文
    val topic: String,
    val questions: List<MistakeQuestionDto>,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("syncedAt") val syncedAt: String? = null
)

data class MistakeUploadRequest(
    val subject: String,
    val topic: String,
    val questions: List<MistakeQuestionDto>
)

data class MistakeListResponse(
    val mistakes: List<MistakeDto> = emptyList(),
    val total: Int = 0
)

data class MistakeExportRequest(
    val mistakeIds: List<String>,
    val format: String = "docx"   // "docx" | "zip"
)

data class MistakeExportResponse(
    val downloadUrl: String,
    val filename: String
)

// ================================================================
// Ideas (F07)
// ================================================================
data class IdeaDto(
    val id: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("userEmail") val userEmail: String,
    val title: String,
    val description: String,
    val status: String,           // "open" | "planned" | "done"
    val likes: Int = 0,
    @SerializedName("likedByMe") val likedByMe: Boolean = false,
    @SerializedName("commentCount") val commentCount: Int = 0,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String? = null
)

data class IdeaSubmitRequest(
    val title: String,
    val description: String
)

data class IdeaCommentDto(
    val id: String,
    @SerializedName("ideaId") val ideaId: String,
    @SerializedName("userId") val userId: String,
    @SerializedName("userEmail") val userEmail: String,
    val content: String,
    val status: String,
    @SerializedName("createdAt") val createdAt: String
)

data class IdeaCommentRequest(
    val content: String
)

data class IdeaListResponse(
    val ideas: List<IdeaDto> = emptyList(),
    val total: Int = 0,
    @SerializedName("top3") val top3: List<IdeaDto> = emptyList()
)

data class IdeaCommentListResponse(
    val comments: List<IdeaCommentDto> = emptyList(),
    val total: Int = 0
)

// ================================================================
// Admin (F10)
// ================================================================
data class AuditLogDto(
    val id: String,
    val action: String,
    val details: String? = null,
    val ip: String? = null,
    @SerializedName("createdAt") val createdAt: String,
    val admin: AdminUserBrief,
    @SerializedName("targetUser") val targetUser: AdminUserBrief? = null
)

data class AdminUserBrief(
    val email: String,
    val name: String? = null
)

data class CoinLogDto(
    val id: String,
    @SerializedName("userId") val userId: String,
    val amount: Int,
    @SerializedName("beforeGift") val beforeGift: Int,
    @SerializedName("beforePaid") val beforePaid: Int,
    @SerializedName("afterGift") val afterGift: Int,
    @SerializedName("afterPaid") val afterPaid: Int,
    val reason: String? = null,
    @SerializedName("createdAt") val createdAt: String,
    val user: AdminUserBrief,
    val admin: AdminUserBrief
)

data class BanRequest(
    val email: String,
    val reason: String? = null
)

data class CoinAdjustRequest(
    val email: String,
    val amount: Int,
    val reason: String? = null
)

// ================================================================
// FCM (M12 · 推送通知注册)
// ================================================================
data class FcmRegisterRequest(
    val token: String,
    val platform: String = "android",
    @SerializedName("appVersion") val appVersion: String
)

data class FcmRegisterResponse(
    val success: Boolean = false
)