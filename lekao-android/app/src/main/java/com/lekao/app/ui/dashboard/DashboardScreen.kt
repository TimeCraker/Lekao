package com.lekao.app.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Assignment
import androidx.compose.material.icons.automirrored.outlined.Comment
import androidx.compose.material.icons.automirrored.outlined.Lightbulb
import androidx.compose.material.icons.outlined.AutoStories
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material.icons.outlined.ChevronRight
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lekao.app.R
import com.lekao.app.data.api.UserDto

/**
 * Dashboard 工作台 · F03 + M15 图表
 * D1-B T19-T20 实现
 *
 * 结构（按 spec §1.2 F03）：
 * - 顶部用户信息（头像 + 邮箱 + 角色）
 * - T-Coin 余额卡（v0.2.0 接入图表 T20）
 * - 6 个功能入口（summary/feedback/mistake/ideas/settings/admin）
 *
 * 6 个入口对应 6 条线（每条线一个 d1 主流程）：
 * - 课堂小结 (Summary · F04)
 * - 课堂反馈 (Feedback · F05)
 * - 错题集 (Mistake · F06 + 草稿箱 M09)
 * - 灵感墙 (Ideas · F07 + 详情 F09)
 * - 个人中心 (Settings · F08)
 * - Admin 后台 (F10 · 仅 admin 角色可见)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    onNavigateToSummary: () -> Unit,
    onNavigateToFeedback: () -> Unit,
    onNavigateToMistake: () -> Unit,
    onNavigateToIdeas: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToAdmin: () -> Unit = {},
    viewModel: DashboardViewModel = viewModel(factory = DashboardViewModel.factory()),
) {
    val state by viewModel.state.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        text = stringResource(R.string.dashboard_title),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { paddingValues ->
        DashboardContent(
            user = state.user,
            paddingValues = paddingValues,
            onNavigateToSummary = onNavigateToSummary,
            onNavigateToFeedback = onNavigateToFeedback,
            onNavigateToMistake = onNavigateToMistake,
            onNavigateToIdeas = onNavigateToIdeas,
            onNavigateToSettings = onNavigateToSettings,
            onNavigateToAdmin = onNavigateToAdmin,
        )
    }
}

@Composable
private fun DashboardContent(
    user: UserDto?,
    paddingValues: PaddingValues,
    onNavigateToSummary: () -> Unit,
    onNavigateToFeedback: () -> Unit,
    onNavigateToMistake: () -> Unit,
    onNavigateToIdeas: () -> Unit,
    onNavigateToSettings: () -> Unit,
    onNavigateToAdmin: () -> Unit,
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = Modifier
            .fillMaxSize()
            .padding(paddingValues),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        // 用户信息头 (跨 2 列)
        item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
            UserHeader(user = user)
        }
        // T-Coin 余额 (跨 2 列)
        item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
            CoinCard(
                giftCoin = user?.lekaoGiftCoin ?: 0,
                paidCoin = user?.tCoin ?: 0,
            )
        }
        // T-Coin 30 天曲线 (跨 2 列)
        item(span = { androidx.compose.foundation.lazy.grid.GridItemSpan(2) }) {
            CoinChartCard(refreshTrigger = state.refreshTrigger)
        }
        // 6 个功能入口
        items(DashboardEntry.entries) { entry ->
            if (entry == DashboardEntry.ADMIN && user?.role != "ADMIN") return@items
            DashboardEntryCard(
                entry = entry,
                onClick = when (entry) {
                    DashboardEntry.SUMMARY -> onNavigateToSummary
                    DashboardEntry.FEEDBACK -> onNavigateToFeedback
                    DashboardEntry.MISTAKE -> onNavigateToMistake
                    DashboardEntry.IDEAS -> onNavigateToIdeas
                    DashboardEntry.SETTINGS -> onNavigateToSettings
                    DashboardEntry.ADMIN -> onNavigateToAdmin
                }
            )
        }
    }
}

@Composable
private fun UserHeader(user: UserDto?) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.primaryContainer,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            // 头像占位
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(MaterialTheme.colorScheme.primary),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = (user?.email?.take(1) ?: "?").uppercase(),
                    color = MaterialTheme.colorScheme.onPrimary,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = user?.name ?: user?.email ?: stringResource(R.string.dashboard_guest),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
                Text(
                    text = user?.email ?: "",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.7f),
                )
            }
            if (user?.role == "ADMIN") {
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(MaterialTheme.colorScheme.primary)
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                ) {
                    Text(
                        text = "ADMIN",
                        color = MaterialTheme.colorScheme.onPrimary,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }
    }
}

@Composable
private fun CoinCard(giftCoin: Int, paidCoin: Int) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surfaceVariant,
        ),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = Icons.Outlined.MonetizationOn,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(36.dp),
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.dashboard_tcoin_total),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "${giftCoin + paidCoin}",
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary,
                )
                Text(
                    text = stringResource(R.string.dashboard_tcoin_breakdown, giftCoin, paidCoin),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun DashboardEntryCard(entry: DashboardEntry, onClick: () -> Unit) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth(),
        onClick = onClick,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(entry.bgColor),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        imageVector = entry.icon,
                        contentDescription = null,
                        tint = entry.iconColor,
                        modifier = Modifier.size(22.dp),
                    )
                }
                Spacer(Modifier.weight(1f))
                Icon(
                    imageVector = Icons.Outlined.ChevronRight,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(entry.labelRes),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = stringResource(entry.subtitleRes),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

/**
 * Dashboard 6 个入口
 *
 * 顺序：summary / feedback / mistake / ideas / settings / admin
 * admin 仅 role=ADMIN 可见（在 LazyVerticalGrid 中过滤）
 */
enum class DashboardEntry(
    val labelRes: Int,
    val subtitleRes: Int,
    val icon: ImageVector,
    val bgColor: Color,
    val iconColor: Color,
) {
    SUMMARY(
        labelRes = R.string.dashboard_entry_summary,
        subtitleRes = R.string.dashboard_entry_summary_sub,
        icon = Icons.AutoMirrored.Outlined.Assignment,
        bgColor = Color(0xFFE3F2FD),
        iconColor = Color(0xFF1976D2),
    ),
    FEEDBACK(
        labelRes = R.string.dashboard_entry_feedback,
        subtitleRes = R.string.dashboard_entry_feedback_sub,
        icon = Icons.AutoMirrored.Outlined.Comment,
        bgColor = Color(0xFFFFF3E0),
        iconColor = Color(0xFFE65100),
    ),
    MISTAKE(
        labelRes = R.string.dashboard_entry_mistake,
        subtitleRes = R.string.dashboard_entry_mistake_sub,
        icon = Icons.Outlined.BugReport,
        bgColor = Color(0xFFFFEBEE),
        iconColor = Color(0xFFC62828),
    ),
    IDEAS(
        labelRes = R.string.dashboard_entry_ideas,
        subtitleRes = R.string.dashboard_entry_ideas_sub,
        icon = Icons.AutoMirrored.Outlined.Lightbulb,
        bgColor = Color(0xFFF3E5F5),
        iconColor = Color(0xFF6A1B9A),
    ),
    SETTINGS(
        labelRes = R.string.dashboard_entry_settings,
        subtitleRes = R.string.dashboard_entry_settings_sub,
        icon = Icons.Outlined.Settings,
        bgColor = Color(0xFFE0F2F1),
        iconColor = Color(0xFF00695C),
    ),
    ADMIN(
        labelRes = R.string.dashboard_entry_admin,
        subtitleRes = R.string.dashboard_entry_admin_sub,
        icon = Icons.Outlined.AutoStories,
        bgColor = Color(0xFF263238),
        iconColor = Color(0xFFECEFF1),
    );
}