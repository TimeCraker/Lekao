package com.lekao.app.ui.settings

import android.app.Activity
import android.content.Intent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.Logout
import androidx.compose.material.icons.outlined.AdminPanelSettings
import androidx.compose.material.icons.outlined.DarkMode
import androidx.compose.material.icons.outlined.Fingerprint
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Palette
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lekao.app.R
import com.lekao.app.data.local.TokenStore
import com.lekao.app.ui.theme.ThemePreset
import com.lekao.app.ui.theme.ThemePresets
import com.lekao.app.ui.theme.presetByKey

/**
 * SettingsScreen · T51-T52
 *
 * 个人中心：
 * - 个人资料（邮箱 + 昵称编辑）
 * - 主题切换 (light/dark/system)
 * - 语言切换 (zh/en/system)
 * - 生物识别 + 推送开关
 * - Admin 入口（仅 admin 角色可见）
 * - 退出登录
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onNavigateBack: () -> Unit,
    onNavigateToLogin: () -> Unit,
    onNavigateToAdmin: () -> Unit,
    viewModel: SettingsViewModel = viewModel(factory = SettingsViewModel.factory()),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    val activity = context as? Activity

    // 监听登录态变化 (退出登录后跳 Login)
    val authState = viewModel.authState.collectAsState()
    LaunchedEffect(authState.value) {
        if (authState.value == null) {
            // 登出成功 → 重启 Activity 触发 SplashScreen 判断
            activity?.let {
                val intent = it.packageManager.getLaunchIntentForPackage(it.packageName)
                intent?.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
                it.startActivity(intent)
                it.finish()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.settings_title), fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.common_back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background),
            )
        },
        containerColor = MaterialTheme.colorScheme.background,
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            // ============ 个人资料 ============
            SectionCard(
                icon = Icons.Outlined.Person,
                title = stringResource(R.string.settings_profile),
            ) {
                OutlinedTextField(
                    value = state.nickname,
                    onValueChange = viewModel::setNickname,
                    label = { Text(stringResource(R.string.settings_nickname)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = viewModel::saveNickname,
                    enabled = !state.savingNickname && state.nickname.isNotBlank(),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    if (state.savingNickname) {
                        CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                        Spacer(Modifier.width(8.dp))
                    }
                    Text(stringResource(R.string.common_save))
                }
            }
            Spacer(Modifier.height(12.dp))

            // ============ 外观 (主题) ============
            SectionCard(
                icon = Icons.Outlined.DarkMode,
                title = stringResource(R.string.settings_appearance),
            ) {
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                    val themes = listOf(
                        TokenStore.THEME_LIGHT to stringResource(R.string.settings_theme_light),
                        TokenStore.THEME_DARK to stringResource(R.string.settings_theme_dark),
                        TokenStore.THEME_SYSTEM to stringResource(R.string.settings_theme_system),
                    )
                    themes.forEachIndexed { idx, (key, label) ->
                        SegmentedButton(
                            selected = state.theme == key,
                            onClick = { viewModel.setTheme(key) },
                            shape = SegmentedButtonDefaults.itemShape(idx, themes.size),
                            label = { Text(label) },
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            // ============ 语言 ============
            SectionCard(
                icon = Icons.Outlined.Language,
                title = stringResource(R.string.settings_language),
            ) {
                SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                    val langs = listOf(
                        TokenStore.LANG_ZH to stringResource(R.string.settings_language_zh),
                        TokenStore.LANG_EN to stringResource(R.string.settings_language_en),
                        TokenStore.LANG_SYSTEM to "System",
                    )
                    langs.forEachIndexed { idx, (key, label) ->
                        SegmentedButton(
                            selected = state.language == key,
                            onClick = { viewModel.setLanguage(key) },
                            shape = SegmentedButtonDefaults.itemShape(idx, langs.size),
                            label = { Text(label) },
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            // ============ 自定义主色 (M13) ============
            SectionCard(
                icon = Icons.Outlined.Palette,
                title = "主题色",
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    ThemePresets.forEach { preset ->
                        val selected = state.customColor == preset.key
                        ColorSwatch(
                            color = preset.swatchColor,
                            label = preset.displayName,
                            selected = selected,
                            onClick = { viewModel.setCustomColor(preset.key) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))

            // ============ 生物识别 + 通知 ============
            SectionCard(
                icon = Icons.Outlined.Fingerprint,
                title = "安全 / 通知",
            ) {
                SwitchRow(
                    label = stringResource(R.string.login_biometric_title),
                    checked = state.biometricEnabled,
                    onCheckedChange = viewModel::setBiometric,
                )
                HorizontalDivider()
                SwitchRow(
                    label = stringResource(R.string.settings_notification),
                    checked = true,  // TODO: T62 接 FCM 真实开关
                    onCheckedChange = { /* 暂不持久化 */ },
                )
            }
            Spacer(Modifier.height(12.dp))

            // ============ Admin 入口 (仅 admin 角色) ============
            val isAdmin = authState.value?.role == "ADMIN"
            if (isAdmin) {
                SectionCard(
                    icon = Icons.Outlined.AdminPanelSettings,
                    title = stringResource(R.string.admin_title),
                ) {
                    OutlinedButton(
                        onClick = onNavigateToAdmin,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text("进入管理后台")
                    }
                }
                Spacer(Modifier.height(12.dp))
            }
            Spacer(Modifier.height(12.dp))

            // ============ 退出登录 ============
            Button(
                onClick = viewModel::signOut,
                enabled = !state.signingOut,
                modifier = Modifier.fillMaxWidth().height(48.dp),
                colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.error,
                ),
            ) {
                if (state.signingOut) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), color = MaterialTheme.colorScheme.onError, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                } else {
                    Icon(Icons.AutoMirrored.Outlined.Logout, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                }
                Text(stringResource(R.string.settings_signout))
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun SectionCard(
    icon: ImageVector,
    title: String,
    content: @Composable () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.width(8.dp))
                Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Modifier.height(12.dp))
            content()
        }
    }
}

@Composable
private fun SwitchRow(label: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, modifier = Modifier.weight(1f))
        Switch(checked = checked, onCheckedChange = onCheckedChange)
    }
}

@Composable
private fun ColorSwatch(
    color: androidx.compose.ui.graphics.Color,
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    androidx.compose.material3.OutlinedCard(
        onClick = onClick,
        modifier = modifier.height(64.dp),
        shape = RoundedCornerShape(8.dp),
        border = if (selected) BorderStroke(2.dp, MaterialTheme.colorScheme.primary) else BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
    ) {
        Column(
            modifier = Modifier.fillMaxSize().padding(4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
        ) {
            Box(
                modifier = Modifier.size(24.dp).background(color, CircleShape)
                    .border(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.3f), CircleShape),
            )
            Spacer(Modifier.height(4.dp))
            Text(label, style = MaterialTheme.typography.labelSmall, maxLines = 1)
        }
    }
}