package com.lekao.app.nav

/**
 * Lekao 路由表 · 15 个页面（按 spec §5 T10）
 *
 * 路由设计原则：
 * - 单一来源（所有跳转走这里）
 * - deepLink 支持（桌面快捷方式 M08 / 通知跳转 M12）
 * - 参数化路由用 `{}` 占位
 */
sealed class Routes(val path: String) {

    // ============ 启动 / Auth ============
    object Splash : Routes("splash")
    object Login : Routes("login")
    object Register : Routes("register")

    // ============ 主流程 ============
    object Dashboard : Routes("dashboard")

    // 课堂小结 / 反馈 (F04 / F05)
    object Summary : Routes("summary")
    object Feedback : Routes("feedback")

    // 错题集 (F06 + M09 草稿箱)
    object Mistake : Routes("mistake")
    object MistakeDrafts : Routes("mistake/drafts")

    // 灵感墙 (F07 + F09)
    object Ideas : Routes("ideas")
    object IdeaDetail : Routes("ideas/{ideaId}") {
        fun create(ideaId: String) = "ideas/$ideaId"
        const val ARG_IDEA_ID = "ideaId"
    }

    // 个人中心 (F08)
    object Settings : Routes("settings")

    // ============ Admin 后台 (F10 · 仅 admin 角色)============
    object AdminDashboard : Routes("admin")
    object AdminCoinLog : Routes("admin/coin-log")
    object AdminAuditLog : Routes("admin/audit-log")
    object AdminUserBan : Routes("admin/user-ban")

    companion object {
        /**
         * 启动入口 (M07 SplashScreen → 主流程)
         *
         * T90 修复: 用 const val 直接硬编码 "splash" 字符串,不再走 Splash.path getter。
         * 根因: Kotlin 嵌套 sealed object + companion 的 <clinit> 互相引用,
         *   调用 `Routes.Splash.path` 时(尤其作为默认参数)若 Splash.INSTANCE
         *   还在 lazy-init 中途 → NPE on Routes$Splash.getPath()
         * const val 是编译期常量, 编译器把 "splash" 内联到调用方字节码,
         *   完全不触发任何 Splash INSTANCE 访问, 零 NPE 风险。
         * Splash.path 的运行时值仍是 "splash",行为等价。
         */
        const val START: String = "splash"

        /** DeepLink 路由表（M08 桌面快捷方式 + M12 推送通知） */
        const val DEEP_LINK_HOST = "lekao"

        val DEEP_LINKS: Map<String, String> by lazy {
            mapOf(
                "summary" to Summary.path,
                "feedback" to Feedback.path,
                "ideas" to Ideas.path,
                "mistake" to Mistake.path,
                "settings" to Settings.path
            )
        }
    }
}

/**
 * UI 状态管理（统一 Loading/Success/Error 状态）
 */
sealed class UiState<out T> {
    object Idle : UiState<Nothing>()
    object Loading : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String, val code: Int? = null) : UiState<Nothing>()
}