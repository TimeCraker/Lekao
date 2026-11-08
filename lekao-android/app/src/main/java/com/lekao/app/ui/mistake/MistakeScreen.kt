package com.lekao.app.ui.mistake

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
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.PhotoLibrary
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.lekao.app.R

/**
 * MistakeScreen · T33-T37
 *
 * 错题录入：
 * 1. 选科目（数学/物理/化学/英语/语文 5 个 FilterChip）
 * 2. 填章节
 * 3. 拍照 / 相册多选 (最多 20 张)
 * 4. (可选) OCR 识别图中文字 → 自动填入题目
 * 5. 保存到草稿箱 → 后台同步到服务端
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MistakeScreen(
    onNavigateBack: () -> Unit,
    onNavigateToDrafts: () -> Unit,
    viewModel: MistakeViewModel = viewModel(factory = MistakeViewModel.factory()),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    // 相册多选 (max 20)
    val photoPicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia(maxItems = 20),
    ) { uris -> uris.forEach(viewModel::addImage) }

    // 拍照
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

    // 保存成功 → 弹提示 → 跳草稿箱
    LaunchedEffect(state.savedId) {
        if (state.savedId != null) {
            Toast.makeText(context, "已加入草稿箱", Toast.LENGTH_SHORT).show()
            viewModel.reset()
            kotlinx.coroutines.delay(500)
            onNavigateToDrafts()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.mistake_title), fontWeight = FontWeight.SemiBold) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Outlined.ArrowBack, contentDescription = stringResource(R.string.common_back))
                    }
                },
                actions = {
                    IconButton(onClick = onNavigateToDrafts) {
                        Icon(androidx.compose.material.icons.Icons.Outlined.AutoAwesome, contentDescription = stringResource(R.string.mistake_drafts))
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
            Text(
                text = "科目",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(Modifier.height(4.dp))
            // 5 个 FilterChip
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(
                    "math" to "数学",
                    "physics" to "物理",
                    "chemistry" to "化学",
                    "english" to "英语",
                    "chinese" to "语文",
                ).forEach { (key, label) ->
                    FilterChip(
                        selected = state.subject == key,
                        onClick = { viewModel.setSubject(key) },
                        label = { Text(label) },
                    )
                }
            }
            Spacer(Modifier.height(12.dp))

            OutlinedTextField(
                value = state.topic,
                onValueChange = viewModel::setTopic,
                label = { Text("章节 / 知识点") },
                placeholder = { Text("如：二次函数 / 牛顿第三定律") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))

            // 图片操作
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(
                    onClick = {
                        photoPicker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
                    },
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Outlined.PhotoLibrary, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("相册")
                }
                OutlinedButton(
                    onClick = { cameraPermissionLauncher.launch(android.Manifest.permission.CAMERA) },
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(Icons.Outlined.CameraAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("拍照")
                }
            }
            Spacer(Modifier.height(12.dp))

            if (state.images.isNotEmpty()) {
                Text(
                    text = "已选 ${state.images.size} 张题图",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(state.images) { uri ->
                        Box(modifier = Modifier.size(96.dp)) {
                            AsyncImage(
                                model = uri,
                                contentDescription = null,
                                modifier = Modifier
                                    .size(96.dp)
                                    .clip(RoundedCornerShape(8.dp)),
                            )
                            IconButton(
                                onClick = { viewModel.removeImage(uri) },
                                modifier = Modifier
                                    .align(Alignment.TopEnd)
                                    .background(Color.Black.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
                                    .size(24.dp),
                            ) {
                                Icon(Icons.Outlined.Close, contentDescription = "删除", tint = Color.White, modifier = Modifier.size(14.dp))
                            }
                            // OCR 按钮
                            IconButton(
                                onClick = { viewModel.runOcr(uri) },
                                modifier = Modifier
                                    .align(Alignment.BottomEnd)
                                    .background(MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                                    .size(28.dp),
                            ) {
                                Icon(
                                    androidx.compose.material.icons.Icons.Outlined.AutoAwesome,
                                    contentDescription = "OCR",
                                    tint = MaterialTheme.colorScheme.onPrimary,
                                    modifier = Modifier.size(16.dp),
                                )
                            }
                        }
                    }
                }
                Spacer(Modifier.height(12.dp))
            }

            // OCR 文本框（可选填）
            OutlinedTextField(
                value = state.ocrText,
                onValueChange = viewModel::setOcrText,
                label = { Text("题目文字（OCR 提取或手动输入）") },
                modifier = Modifier.fillMaxWidth().height(100.dp),
            )
            Spacer(Modifier.height(16.dp))

            state.error?.let { msg ->
                Text(
                    text = msg,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.padding(bottom = 8.dp),
                )
            }

            Button(
                onClick = viewModel::save,
                enabled = !state.saving && state.images.isNotEmpty() && state.topic.isNotBlank(),
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (state.saving) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                    Spacer(Modifier.width(8.dp))
                    Text("保存中…")
                } else {
                    Icon(Icons.Outlined.CheckCircle, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("加入草稿箱")
                }
            }
            Spacer(Modifier.height(32.dp))
        }
    }
}

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