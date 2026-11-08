package com.lekao.app.ui.register

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
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
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
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
import com.lekao.app.ui.theme.LekaoWhite

/**
 * RegisterScreen · T82b
 *
 * 风格对齐 LoginScreen + Web 端 src/app/register/page.tsx：
 * - 米色 canvas 背景 + 白卡片 + 圆角 + 阴影
 * - 输入框: 圆角 12dp + focus ring
 * - 错误提示: 彩色背景块
 * - 主按钮: 圆角 12dp + 高度 48dp
 * - Shake 反馈: 错误时表单抖动
 * - 服务条款 checkbox: 用户必须勾选才能注册
 *
 * 字段：邮箱 + 昵称(可选) + 密码 + 确认密码 + 6 位验证码 + 邀请码(可选)
 *
 * 成功 → AuthRepository.register 内自动 signInWithPassword → authState 变 → 跳转 Dashboard
 */
@Composable
fun RegisterScreen(
    onRegisterSuccess: () -> Unit,
    onNavigateBack: () -> Unit = {},
    viewModel: RegisterViewModel = viewModel(factory = RegisterViewModel.factory()),
) {
    val state by viewModel.state.collectAsState()

    var shakeOffset by remember { mutableStateOf(0.dp) }
    LaunchedEffect(state.error) {
        if (state.error != null) {
            for (i in 0..5) {
                shakeOffset = if (i % 2 == 0) 8.dp else (-8).dp
                kotlinx.coroutines.delay(50)
            }
            shakeOffset = 0.dp
        }
    }

    LaunchedEffect(state.success) {
        if (state.success) onRegisterSuccess()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(LekaoCanvas)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 40.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // 顶部返回 + 标题
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onNavigateBack) {
                    Text("← 返回", color = LekaoBlueText)
                }
            }

            Spacer(Modifier.height(8.dp))

            // Logo + 标题
            Image(
                painter = painterResource(R.drawable.ic_splash_logo),
                contentDescription = null,
                modifier = Modifier.size(64.dp),
            )
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.register_title),
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = LekaoInk,
            )
            Spacer(Modifier.height(4.dp))
            Text(
                text = stringResource(R.string.register_subtitle),
                style = MaterialTheme.typography.bodyMedium,
                color = LekaoInkMuted,
            )

            Spacer(Modifier.height(24.dp))

            // 卡片
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
                    // 邮箱
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

                    // 昵称(可选)
                    OutlinedTextField(
                        value = state.name,
                        onValueChange = viewModel::setName,
                        label = { Text(stringResource(R.string.register_name)) },
                        placeholder = { Text(stringResource(R.string.register_name_placeholder), color = LekaoInkSubtle) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                        shape = RoundedCornerShape(12.dp),
                        colors = LekaoTextFieldColors(),
                        enabled = !state.submitting,
                    )

                    Spacer(Modifier.height(12.dp))

                    // 密码
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
                            imeAction = ImeAction.Next,
                        ),
                        shape = RoundedCornerShape(12.dp),
                        colors = LekaoTextFieldColors(),
                        enabled = !state.submitting,
                    )

                    Spacer(Modifier.height(12.dp))

                    // 确认密码
                    OutlinedTextField(
                        value = state.confirmPassword,
                        onValueChange = viewModel::setConfirmPassword,
                        label = { Text(stringResource(R.string.register_confirm_password)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Next,
                        ),
                        shape = RoundedCornerShape(12.dp),
                        colors = LekaoTextFieldColors(),
                        enabled = !state.submitting,
                    )

                    Spacer(Modifier.height(12.dp))

                    // 验证码 + 发送按钮
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
                        RegisterSendCodeButton(
                            countdown = state.codeCountdown,
                            sending = state.sendingCode,
                            enabled = state.email.isNotBlank() && !state.submitting,
                            onClick = viewModel::sendCode,
                        )
                    }

                    Spacer(Modifier.height(12.dp))

                    // 邀请码
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

                    Spacer(Modifier.height(16.dp))

                    // 服务条款 checkbox
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Checkbox(
                            checked = state.agreeTerms,
                            onCheckedChange = viewModel::setAgreeTerms,
                            enabled = !state.submitting,
                            colors = CheckboxDefaults.colors(
                                checkedColor = LekaoBlueText,
                                uncheckedColor = LekaoHairline,
                            ),
                        )
                        Text(
                            text = buildAnnotatedTermsText(),
                            color = LekaoInkMuted,
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null,
                                ) { viewModel.setAgreeTerms(!state.agreeTerms) },
                        )
                    }

                    // 错误提示
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
                                stringResource(R.string.register_submit),
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

// ============ 发送验证码按钮 (带倒计时) ============
@Composable
private fun RegisterSendCodeButton(
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
            .heightIn(min = 56.dp)
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

// ============ 服务条款文本 ============
@Composable
private fun buildAnnotatedTermsText(): androidx.compose.ui.text.AnnotatedString {
    val service = stringResource(R.string.login_terms_service)
    val privacy = stringResource(R.string.login_terms_privacy)
    return androidx.compose.ui.text.buildAnnotatedString {
        append("我已阅读并同意 ")
        withStyle(androidx.compose.ui.text.SpanStyle(textDecoration = TextDecoration.Underline)) {
            append(service)
        }
        append(" 和 ")
        withStyle(androidx.compose.ui.text.SpanStyle(textDecoration = TextDecoration.Underline)) {
            append(privacy)
        }
    }
}