package com.lekao.app.ui.login

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lekao.app.R
import com.lekao.app.ui.theme.LekaoBlueText
import com.lekao.app.ui.theme.LekaoCanvas
import com.lekao.app.ui.theme.LekaoCanvasAlt
import com.lekao.app.ui.theme.LekaoError
import com.lekao.app.ui.theme.LekaoHairline
import com.lekao.app.ui.theme.LekaoInk
import com.lekao.app.ui.theme.LekaoInkMuted
import com.lekao.app.ui.theme.LekaoInkSubtle
import com.lekao.app.ui.theme.LekaoSignal
import com.lekao.app.ui.theme.LekaoSuccess
import com.lekao.app.ui.theme.LekaoSuccessSoft
import com.lekao.app.ui.theme.LekaoWhite

/**
 * LoginScreen · T12 (T81b redesign)
 *
 * 风格对齐 Web 端 src/app/login/page.tsx:
 * - 米色 canvas 背景 + 白卡片 + 圆角 + 阴影
 * - Tab 切换: 滑动 pill 指示器 (类似 motion layoutId)
 * - 输入框: 圆角 12dp + focus ring (LekaoBlue 边框 + 微阴影)
 * - 错误 / 成功提示: 彩色背景块 (不是纯文字)
 * - 主按钮: 圆角 12dp + 高度 48dp + 按下反馈
 * - Shake 反馈: 错误时表单抖动
 * - 邀请码字段: 验证码模式下 (跟 Web 端对齐)
 *
 * 登录成功 → AuthRepository.authState 变化 → AppNavigation 自动跳 Dashboard
 */
@Composable
fun LoginScreen(
    onLoginSuccess: () -> Unit,
    onNavigateToRegister: () -> Unit = {},
    viewModel: LoginViewModel = viewModel(factory = LoginViewModel.factory()),
) {
    val state by viewModel.state.collectAsState()

    // Shake 触发: error 出现时表单抖动
    var shakeOffset by remember { mutableStateOf(0.dp) }
    LaunchedEffect(state.error) {
        if (state.error != null) {
            // 3 次左右抖动
            for (i in 0..5) {
                shakeOffset = if (i % 2 == 0) 8.dp else (-8).dp
                kotlinx.coroutines.delay(50)
            }
            shakeOffset = 0.dp
        }
    }

    LaunchedEffect(state.success) {
        if (state.success) onLoginSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(LekaoCanvas)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScrollIfNeeded()
                .padding(horizontal = 24.dp, vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Spacer(Modifier.height(24.dp))

            // ============ 顶部: Logo + 标题 ============
            Image(
                painter = painterResource(R.drawable.ic_splash_logo),
                contentDescription = null,
                modifier = Modifier.size(72.dp),
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.app_name),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = LekaoInk,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = "登录后继续你的工作",
                style = MaterialTheme.typography.bodyMedium,
                color = LekaoInkMuted,
            )

            Spacer(Modifier.height(32.dp))

            // ============ 卡片 ============
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .shadow(8.dp, RoundedCornerShape(20.dp), clip = false),
                shape = RoundedCornerShape(20.dp),
                color = LekaoWhite,
                border = androidx.compose.foundation.BorderStroke(1.dp, LekaoHairline),
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp)
                        .offset(x = shakeOffset),
                ) {
                    // Tab 切换 (滑动 pill 指示器)
                    ModeTabs(
                        current = state.mode,
                        onChange = viewModel::setMode,
                    )

                    Spacer(Modifier.height(20.dp))

                    OutlinedTextField(
                        value = state.email,
                        onValueChange = viewModel::setEmail,
                        label = { Text(stringResource(R.string.login_email)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next,
                        ),
                        shape = RoundedCornerShape(12.dp),
                        colors = LekaoTextFieldColors(),
                        enabled = !state.submitting,
                    )

                    Spacer(Modifier.height(12.dp))

                    // 模式切换的表单字段 (带渐变过渡)
                    AnimatedContent(
                        targetState = state.mode,
                        transitionSpec = {
                            (fadeIn(tween(220)) + slideInVertically(tween(220)) { it / 8 })
                                .togetherWith(fadeOut(tween(180)) + slideOutVertically(tween(180)) { -it / 8 })
                        },
                        label = "login-mode",
                    ) { mode ->
                        Column {
                            when (mode) {
                                LoginViewModel.Mode.PASSWORD -> {
                                    OutlinedTextField(
                                        value = state.password,
                                        onValueChange = viewModel::setPassword,
                                        label = { Text(stringResource(R.string.login_password)) },
                                        placeholder = { Text(stringResource(R.string.login_password_placeholder), color = LekaoInkSubtle) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth(),
                                        visualTransformation = PasswordVisualTransformation(),
                                        keyboardOptions = KeyboardOptions(
                                            keyboardType = KeyboardType.Password,
                                            imeAction = ImeAction.Done,
                                        ),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = LekaoTextFieldColors(),
                                        enabled = !state.submitting,
                                    )
                                }
                                LoginViewModel.Mode.CODE -> {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    ) {
                                        OutlinedTextField(
                                            value = state.code,
                                            onValueChange = viewModel::setCode,
                                            label = { Text(stringResource(R.string.login_code)) },
                                            singleLine = true,
                                            modifier = Modifier.weight(1f),
                                            keyboardOptions = KeyboardOptions(
                                                keyboardType = KeyboardType.NumberPassword,
                                                imeAction = ImeAction.Next,
                                            ),
                                            shape = RoundedCornerShape(12.dp),
                                            colors = LekaoTextFieldColors(),
                                            enabled = !state.submitting,
                                        )
                                        SendCodeButton(
                                            countdown = state.codeCountdown,
                                            sending = state.sendingCode,
                                            enabled = state.email.isNotBlank() && !state.submitting,
                                            onClick = viewModel::sendCode,
                                        )
                                    }
                                    Spacer(Modifier.height(12.dp))
                                    OutlinedTextField(
                                        value = state.inviteCode,
                                        onValueChange = viewModel::setInviteCode,
                                        label = { Text(stringResource(R.string.login_invite_code_label)) },
                                        placeholder = { Text(stringResource(R.string.login_invite_code_hint), color = LekaoInkSubtle) },
                                        singleLine = true,
                                        modifier = Modifier.fillMaxWidth(),
                                        shape = RoundedCornerShape(12.dp),
                                        colors = LekaoTextFieldColors(),
                                        enabled = !state.submitting,
                                    )
                                }
                            }
                        }
                    }

                    // 错误提示块
                    AnimatedVisibility(
                        visible = state.error != null,
                        enter = fadeIn() + slideInVertically { -it / 2 },
                        exit = fadeOut() + slideOutVertically { -it / 2 },
                    ) {
                        Column {
                            Spacer(Modifier.height(12.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(LekaoError.copy(alpha = 0.08f))
                                    .border(1.dp, LekaoError.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                            ) {
                                Text(
                                    text = state.error.orEmpty(),
                                    color = LekaoError,
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }

                    Spacer(Modifier.height(20.dp))

                    // 主按钮
                    Button(
                        onClick = viewModel::submit,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        enabled = !state.submitting,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = LekaoBlueText,
                            contentColor = LekaoWhite,
                        ),
                    ) {
                        if (state.submitting) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp,
                                color = LekaoWhite,
                            )
                        } else {
                            Text(
                                stringResource(R.string.login_submit),
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // 注册链接
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = "还没有账号？",
                    color = LekaoInkMuted,
                    style = MaterialTheme.typography.bodyMedium,
                )
                Spacer(Modifier.width(4.dp))
                Text(
                    text = "立即注册",
                    color = LekaoBlueText,
                    fontWeight = FontWeight.Medium,
                    style = MaterialTheme.typography.bodyMedium,
                    textDecoration = TextDecoration.None,
                    modifier = Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                    ) { onNavigateToRegister() },
                )
            }

            Spacer(Modifier.height(12.dp))

            // 服务条款 + 隐私政策
            Text(
                text = buildAnnotatedTermsText(),
                color = LekaoInkMuted,
                style = MaterialTheme.typography.bodySmall,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth(),
            )

            Spacer(Modifier.height(24.dp))
        }
    }
}

// ============ Tab 切换 (滑动 pill 指示器) ============
@Composable
private fun ModeTabs(
    current: LoginViewModel.Mode,
    onChange: (LoginViewModel.Mode) -> Unit,
) {
    val configuration = LocalConfiguration.current
    val density = LocalDensity.current
    // 父容器宽度 = 卡片宽度 - 内边距 24dp*2
    // 我们让父容器占满, 内部用 weight 1:1 两个 Tab
    // pill 宽度 = 父容器宽度的一半, 偏移根据 current 决定
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(44.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(LekaoCanvasAlt),
    ) {
        // 用 Row 内的 weight 让两个 Tab 平分宽度, 然后我们用一个 Box 用 offset 实现滑动
        Row(
            modifier = Modifier.fillMaxWidth().height(44.dp),
        ) {
            // 占位, 真正的 pill 在最外层 Box 上, 通过 alignment + offset 控制
            TabItem(
                label = stringResource(R.string.login_password_tab),
                selected = current == LoginViewModel.Mode.PASSWORD,
                onClick = { onChange(LoginViewModel.Mode.PASSWORD) },
                modifier = Modifier.weight(1f),
            )
            TabItem(
                label = stringResource(R.string.login_code_tab),
                selected = current == LoginViewModel.Mode.CODE,
                onClick = { onChange(LoginViewModel.Mode.CODE) },
                modifier = Modifier.weight(1f),
            )
        }
        // pill 滑动指示器
        val pillOffset by animateDpAsState(
            targetValue = if (current == LoginViewModel.Mode.PASSWORD) 4.dp else with(density) {
                // 用 BoxWithConstraints 才能精确算, 这里用占位: Tab 总宽 = 父容器宽, 2 个 Tab 等分
                // 实际运行时父容器宽 = configuration.screenWidthDp.dp - 48.dp (左右各 24dp padding) - 48.dp (卡片 padding)
                // 所以 pill 偏移 = (父容器宽 / 2) - 4dp (左 padding)
                val parentWidth = configuration.screenWidthDp.dp - 48.dp - 48.dp - 48.dp  // 屏幕宽 - 外层 padding - 卡片 padding - 卡内 padding
                parentWidth / 2 - 4.dp
            },
            animationSpec = spring(stiffness = 380f, dampingRatio = 0.8f),
            label = "pill-offset",
        )
        Box(
            modifier = Modifier
                .padding(4.dp)
                .offset(x = if (current == LoginViewModel.Mode.PASSWORD) 0.dp else pillOffset)
                .width(with(density) {
                    val parentWidth = configuration.screenWidthDp.dp - 48.dp - 48.dp - 48.dp
                    parentWidth / 2
                })
                .height(36.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(LekaoWhite)
                .shadow(2.dp, RoundedCornerShape(10.dp), clip = false),
        )
    }
}

@Composable
private fun TabItem(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
            ) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            color = if (selected) LekaoInk else LekaoInkMuted,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

// ============ 发送验证码按钮 (带倒计时) ============
@Composable
private fun SendCodeButton(
    countdown: Int,
    sending: Boolean,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val displayText = when {
        sending -> ""
        countdown > 0 -> "${countdown}s"
        else -> stringResource(R.string.login_send_code)
    }
    Box(
        modifier = Modifier
            .heightIn(min = 56.dp) // 与 OutlinedTextField 高度对齐
            .clip(RoundedCornerShape(12.dp))
            .background(if (enabled && countdown == 0 && !sending) LekaoCanvasAlt else LekaoCanvasAlt.copy(alpha = 0.5f))
            .clickable(enabled = enabled && countdown == 0 && !sending) { onClick() }
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        if (sending) {
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp,
                color = LekaoInkMuted,
            )
        } else {
            Text(
                text = displayText,
                color = if (countdown > 0 || !enabled) LekaoInkMuted else LekaoInk,
                fontWeight = FontWeight.Medium,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 1,
            )
        }
    }
}

// ============ TextField 颜色配置 (统一 Lekao 风格) ============
@Composable
private fun LekaoTextFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = LekaoBlueText,
    unfocusedBorderColor = LekaoHairline,
    disabledBorderColor = LekaoHairline.copy(alpha = 0.5f),
    errorBorderColor = LekaoError,
    focusedLabelColor = LekaoBlueText,
    unfocusedLabelColor = LekaoInkMuted,
    cursorColor = LekaoBlueText,
)

// ============ 辅助 Modifier ============
@Composable
private fun Modifier.verticalScrollIfNeeded(): Modifier =
    this.then(Modifier.verticalScroll(rememberScrollState()))

// ============ 服务条款文本 ============
@Composable
private fun buildAnnotatedTermsText(): androidx.compose.ui.text.AnnotatedString {
    val service = stringResource(R.string.login_terms_service)
    val privacy = stringResource(R.string.login_terms_privacy)
    val agreement = stringResource(R.string.login_terms_agreement)
    val and = stringResource(R.string.login_terms_and)
    return androidx.compose.ui.text.buildAnnotatedString {
        append("$agreement ")
        withStyle(androidx.compose.ui.text.SpanStyle(textDecoration = TextDecoration.Underline)) {
            append(service)
        }
        append(" $and ")
        withStyle(androidx.compose.ui.text.SpanStyle(textDecoration = TextDecoration.Underline)) {
            append(privacy)
        }
    }
}

// ============ 用到的 import 集中区 ============
// (unused imports cleaned)