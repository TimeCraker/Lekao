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
         * 用 by lazy 包一层是关键: 嵌套 sealed object + companion 互相引用会触发
         * Kotlin classloader 循环依赖, Routes.<clinit> 跑到这一行时 Splash.INSTANCE 还没初始化
         * → NPE on Routes$Splash.getPath()
         * 改成 by lazy 后: Routes.<clinit> 只放 lazy delegate, 不立即求值 Splash.path
         * 第一次访问 Routes.START 时 Routes 已完整初始化, Splash.INSTANCE 已 ready
         */
        val START: String by lazy { Splash.path }

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