package com.lekao.app.nav

import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import androidx.navigation.navDeepLink
import com.lekao.app.ui.admin.AdminAuditLogScreen
import com.lekao.app.ui.admin.AdminCoinLogScreen
import com.lekao.app.ui.admin.AdminDashboardScreen
import com.lekao.app.ui.admin.AdminUserBanScreen
import com.lekao.app.ui.dashboard.DashboardScreen
import com.lekao.app.ui.feedback.FeedbackScreen
import com.lekao.app.ui.ideas.IdeaDetailScreen
import com.lekao.app.ui.ideas.IdeasScreen
import com.lekao.app.ui.login.LoginScreen
import com.lekao.app.ui.login.SplashScreen
import com.lekao.app.ui.register.RegisterScreen
import com.lekao.app.ui.mistake.MistakeDraftsScreen
import com.lekao.app.ui.mistake.MistakeScreen
import com.lekao.app.ui.settings.SettingsScreen
import com.lekao.app.ui.summary.SummaryScreen

/**
 * App Navigation · 15 个页面（按 spec §5 T10）
 *
 * 动画：Apple-style 滑动 + 渐变（Hero 风格延续）
 */
@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController(),
    startDestination: String = Routes.Splash.path
) {
    NavHost(
        navController = navController,
        startDestination = startDestination,
        enterTransition = {
            slideIntoContainer(
                AnimatedContentTransitionScope.SlideDirection.Start,
                tween(300)
            ) + fadeIn(tween(300))
        },
        exitTransition = {
            slideOutOfContainer(
                AnimatedContentTransitionScope.SlideDirection.Start,
                tween(300)
            ) + fadeOut(tween(300))
        },
        popEnterTransition = {
            slideIntoContainer(
                AnimatedContentTransitionScope.SlideDirection.End,
                tween(300)
            ) + fadeIn(tween(300))
        },
        popExitTransition = {
            slideOutOfContainer(
                AnimatedContentTransitionScope.SlideDirection.End,
                tween(300)
            ) + fadeOut(tween(300))
        }
    ) {
        // ============ 启动 / Auth ============
        composable(Routes.Splash.path) {
            SplashScreen(
                onNavigateToLogin = {
                    navController.navigate(Routes.Login.path) {
                        popUpTo(Routes.Splash.path) { inclusive = true }
                    }
                },
                onNavigateToDashboard = {
                    navController.navigate(Routes.Dashboard.path) {
                        popUpTo(Routes.Splash.path) { inclusive = true }
                    }
                }
            )
        }

        composable(Routes.Login.path) {
            LoginScreen(
                onLoginSuccess = {
                    navController.navigate(Routes.Dashboard.path) {
                        popUpTo(Routes.Login.path) { inclusive = true }
                    }
                },
                onNavigateToRegister = {
                    navController.navigate(Routes.Register.path)
                }
            )
        }

        // ⭐ T82b: 注册页面
        composable(Routes.Register.path) {
            RegisterScreen(
                onRegisterSuccess = {
                    navController.navigate(Routes.Dashboard.path) {
                        popUpTo(Routes.Login.path) { inclusive = true }
                    }
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        // ============ 主流程 ============
        composable(
            route = Routes.Dashboard.path,
            deepLinks = listOf(
                navDeepLink { uriPattern = "${Routes.DEEP_LINK_HOST}://main" }
            )
        ) {
            DashboardScreen(
                onNavigateToSummary = { navController.navigate(Routes.Summary.path) },
                onNavigateToFeedback = { navController.navigate(Routes.Feedback.path) },
                onNavigateToMistake = { navController.navigate(Routes.Mistake.path) },
                onNavigateToIdeas = { navController.navigate(Routes.Ideas.path) },
                onNavigateToSettings = { navController.navigate(Routes.Settings.path) },
                onNavigateToAdmin = { navController.navigate(Routes.AdminDashboard.path) }
            )
        }

        composable(
            route = Routes.Summary.path,
            deepLinks = listOf(
                navDeepLink { uriPattern = "${Routes.DEEP_LINK_HOST}://summary" }
            )
        ) {
            SummaryScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.Feedback.path,
            deepLinks = listOf(
                navDeepLink { uriPattern = "${Routes.DEEP_LINK_HOST}://feedback" }
            )
        ) {
            FeedbackScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.Mistake.path,
            deepLinks = listOf(
                navDeepLink { uriPattern = "${Routes.DEEP_LINK_HOST}://mistake" }
            )
        ) {
            MistakeScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToDrafts = { navController.navigate(Routes.MistakeDrafts.path) }
            )
        }

        composable(Routes.MistakeDrafts.path) {
            MistakeDraftsScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.Ideas.path,
            deepLinks = listOf(
                navDeepLink { uriPattern = "${Routes.DEEP_LINK_HOST}://ideas" }
            )
        ) {
            IdeasScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToDetail = { ideaId ->
                    navController.navigate(Routes.IdeaDetail.create(ideaId))
                }
            )
        }

        composable(
            route = Routes.IdeaDetail.path,
            arguments = listOf(
                navArgument(Routes.IdeaDetail.ARG_IDEA_ID) { type = NavType.StringType }
            )
        ) { entry ->
            val ideaId = entry.arguments?.getString(Routes.IdeaDetail.ARG_IDEA_ID) ?: ""
            IdeaDetailScreen(
                ideaId = ideaId,
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(
            route = Routes.Settings.path,
            deepLinks = listOf(
                navDeepLink { uriPattern = "${Routes.DEEP_LINK_HOST}://settings" }
            )
        ) {
            SettingsScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToLogin = {
                    navController.navigate(Routes.Login.path) {
                        popUpTo(Routes.Dashboard.path) { inclusive = true }
                    }
                },
                onNavigateToAdmin = { navController.navigate(Routes.AdminDashboard.path) }
            )
        }

        // ============ Admin 后台 ============
        composable(Routes.AdminDashboard.path) {
            AdminDashboardScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToCoinLog = { navController.navigate(Routes.AdminCoinLog.path) },
                onNavigateToAuditLog = { navController.navigate(Routes.AdminAuditLog.path) },
                onNavigateToUserBan = { navController.navigate(Routes.AdminUserBan.path) },
                onNavigateToMistakeList = { navController.navigate(Routes.MistakeDrafts.path) }
            )
        }

        composable(Routes.AdminCoinLog.path) {
            AdminCoinLogScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Routes.AdminAuditLog.path) {
            AdminAuditLogScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Routes.AdminUserBan.path) {
            AdminUserBanScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}