package com.lekao.app.ui.summary

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.net.Uri
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.ContentCopy
import androidx.compose.material.icons.outlined.MonetizationOn
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.lekao.app.R
import com.lekao.app.data.api.SummaryTemplate

/**
 * SummaryScreen · T22 + T25 (图片选择) + T27 (OCR 占位)
 *
 * 完整流程：
 * 1. 选 template: 课堂小结 / 课堂反馈
 * 2. 选图片（多选相册 / 拍照 / OCR 占位）
 * 3. 选填 subject (feedback 用) + description
 * 4. 提交生成（SSE 流式显示）
 * 5. 复制结果（小结贴家长群 / 反馈贴 Excel）
 *
 * SSE 流式文本：
 * - streaming 时实时显示 chunk
 * - done 后显示完整结果 + copy 按钮
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SummaryScreen(
    onNavigateBack: () -> Unit,
    viewModel: SummaryViewModel = viewModel(factory = SummaryViewModel.factory()),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    // 相册多选 (PhotoPicker API 33+ 不需要权限)
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = 9),
    ) { uris ->
        uris.forEach(viewModel::addImage)
    }
    // 相机
    var cameraTempUri by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<Uri?>(null) }
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture(),
    ) { saved ->
        if (saved) cameraTempUri?.let(viewModel::addImage)
        cameraTempUri = null
    }
    val cameraPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission(),
    ) { granted ->
        if (granted) {
            val uri = createTempImageUri(context)
            cameraTempUri = uri
            cameraLauncher.launch(uri)
        } else {
            Toast.makeText(context, "需要相机权限", Toast.LENGTH_SHORT).show()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.summary_title), fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.common_back))
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                )
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
            // ============ T-Coin 余额卡 ============
            CoinBalanceRow(balance = state.coinBalance)
            Spacer(Modifier.height(12.dp))

            // ============ Template 选择 ============
            TemplateSelector(
                current = state.template,
                onChange = viewModel::setTemplate,
            )
            Spacer(Modifier.height(12.dp))

            // ============ Subject (仅 feedback 模板)============
            if (state.template == SummaryTemplate.FEEDBACK) {
                OutlinedTextField(
                    value = state.subject ?: "",
                    onValueChange = { viewModel.setSubject(it) },
                    label = { Text(stringResource(R.string.feedback_subject_label)) },
                    placeholder = { Text(stringResource(R.string.feedback_subject_hint)) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Spacer(Modifier.height(8.dp))
            }

            // ============ 图片选择区 ============
            ImagePickerArea(
                images = state.images,
                onPickFromGallery = {
                    photoPickerLauncher.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                },
                onTakePhoto = {
                    cameraPermissionLauncher.launch(android.Manifest.permission.CAMERA)
                },
                onRemove = viewModel::removeImage,
            )
            Spacer(Modifier.height(12.dp))

            // ============ 描述 (可选)============
            OutlinedTextField(
                value = state.description,
                onValueChange = viewModel::setDescription,
                label = { Text(stringResource(R.string.summary_description_label)) },
                placeholder = { Text(stringResource(R.string.summary_description_hint)) },
                modifier = Modifier.fillMaxWidth().height(100.dp),
            )
            Spacer(Modifier.height(16.dp))

            // ============ 错误提示 ============
            state.error?.let { msg ->
                Text(
                    text = msg,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }

            // ============ 提交按钮 ============
            Button(
                onClick = viewModel::submit,
                enabled = state.images.isNotEmpty() &&
                         state.status != SummaryViewModel.UiState.Status.UPLOADING &&
                         state.status != SummaryViewModel.UiState.Status.STREAMING,
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                when (state.status) {
                    SummaryViewModel.UiState.Status.UPLOADING -> {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("正在上传…")
                    }
                    SummaryViewModel.UiState.Status.STREAMING -> {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp,
                        )
                        Spacer(Modifier.width(8.dp))
                        Text("AI 生成中…")
                    }
                    else -> {
                        Text(stringResource(R.string.summary_generate))
                    }
                }
            }
            Spacer(Modifier.height(16.dp))

            // ============ 结果区 (流式 / 完成)============
            if (state.status == SummaryViewModel.UiState.Status.STREAMING ||
                state.status == SummaryViewModel.UiState.Status.DONE ||
                state.streamingText.isNotEmpty() ||
                state.streamingFeedback.isNotEmpty()) {
                ResultCard(
                    state = state,
                    onCopy = { content ->
                        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        clipboard.setPrimaryClip(ClipData.newPlainText("Lekao", content))
                        Toast.makeText(context, "已复制到剪贴板", Toast.LENGTH_SHORT).show()
                    },
                )
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

@Composable
private fun CoinBalanceRow(balance: Int) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Outlined.MonetizationOn,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(28.dp),
            )
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = stringResource(R.string.dashboard_tcoin_total),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    text = "$balance",
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            Text(
                text = "生成 1 次消耗 1 T-Coin",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TemplateSelector(
    current: SummaryTemplate,
    onChange: (SummaryTemplate) -> Unit,
) {
    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
        SegmentedButton(
            selected = current == SummaryTemplate.SUMMARY,
            onClick = { onChange(SummaryTemplate.SUMMARY) },
            shape = SegmentedButtonDefaults.itemShape(0, 2),
            label = { Text(stringResource(R.string.summary_template_summary)) },
        )
        SegmentedButton(
            selected = current == SummaryTemplate.FEEDBACK,
            onClick = { onChange(SummaryTemplate.FEEDBACK) },
            shape = SegmentedButtonDefaults.itemShape(1, 2),
            label = { Text(stringResource(R.string.summary_template_feedback)) },
        )
    }
}

@Composable
private fun ImagePickerArea(
    images: List<Uri>,
    onPickFromGallery: () -> Unit,
    onTakePhoto: () -> Unit,
    onRemove: (Uri) -> Unit,
) {
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    painter = painterResource(R.drawable.ic_splash_logo),
                    contentDescription = null,
                    modifier = Modifier.size(24.dp),
                    tint = MaterialTheme.colorScheme.primary,
                )
                Spacer(Modifier.width(8.dp))
                Text(
                    text = stringResource(R.string.summary_upload_hint),
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
            Spacer(Modifier.height(8.dp))
            // 按钮组
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onPickFromGallery, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Outlined.PhotoLibrary, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(stringResource(R.string.summary_pick_gallery))
                }
                OutlinedButton(onClick = onTakePhoto, modifier = Modifier.weight(1f)) {
                    Icon(Icons.Outlined.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text(stringResource(R.string.summary_take_photo))
                }
            }
            Spacer(Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.summary_upload_formats),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            // 已选图片缩略图
            if (images.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(images) { uri ->
                        Box(modifier = Modifier.size(80.dp)) {
                            AsyncImage(
                                model = uri,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(80.dp)
                                    .clip(RoundedCornerShape(8.dp)),
                            )
                            IconButton(
                                onClick = { onRemove(uri) },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .size(24.dp)
                                    .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(12.dp)),
                            ) {
                                Icon(
                                    Icons.Outlined.Close,
                                    contentDescription = "删除",
                                    tint = Color.White,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultCard(
    state: SummaryViewModel.UiState,
    onCopy: (String) -> Unit,
) {
    val titleText = when (state.template) {
        SummaryTemplate.SUMMARY -> "课堂小结"
        SummaryTemplate.FEEDBACK -> "家长反馈"
    }
    val copyLabel = when (state.template) {
        SummaryTemplate.SUMMARY -> stringResource(R.string.summary_copy_summary)
        SummaryTemplate.FEEDBACK -> stringResource(R.string.summary_copy_feedback)
    }
    val bodyText = when (state.template) {
        SummaryTemplate.SUMMARY -> state.streamingText
        SummaryTemplate.FEEDBACK -> state.streamingFeedback.ifEmpty { state.streamingText }
    }

    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = titleText,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                if (state.status == SummaryViewModel.UiState.Status.STREAMING) {
                    CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                }
                if (state.status == SummaryViewModel.UiState.Status.DONE && bodyText.isNotBlank()) {
                    IconButton(onClick = { onCopy(bodyText) }) {
                        Icon(Icons.Outlined.ContentCopy, contentDescription = "复制")
                    }
                }
            }
            if (state.topic.isNotBlank()) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = state.topic,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp))
            Text(
                text = bodyText.ifBlank { "等待 AI 输出…" },
                style = MaterialTheme.typography.bodyMedium,
            )
            // 复制按钮 (大按钮，feedback 模式展示贴 Excel 提示)
            if (state.status == SummaryViewModel.UiState.Status.DONE && bodyText.isNotBlank()) {
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = { onCopy(bodyText) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                ) {
                    Icon(Icons.Outlined.ContentCopy, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(copyLabel)
                }
            }
        }
    }
}

/**
 * 创建相机拍照临时文件 URI (FileProvider 模式，minSdk 26+ 简化: 用 cacheDir)
 */
private fun createTempImageUri(context: Context): Uri {
    val cacheDir = context.cacheDir
    val photoDir = java.io.File(cacheDir, "camera").apply { mkdirs() }
    val photoFile = java.io.File(photoDir, "photo_${System.currentTimeMillis()}.jpg")
    photoFile.createNewFile()
    return androidx.core.content.FileProvider.getUriForFile(
        context,
        "${context.packageName}.fileprovider",
        photoFile
    )
}