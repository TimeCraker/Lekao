package com.lekao.app.ui.mistake

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.CloudDownload
import androidx.compose.material.icons.outlined.CloudOff
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lekao.app.R
import com.lekao.app.data.local.MistakeDraftEntity

/**
 * MistakeDraftsScreen · T42-T44
 *
 * 双 tab：
 * - 草稿箱 (本地 PENDING / FAILED / SYNCED)
 * - 已同步 (服务端列表，可多选导出 docx)
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MistakeDraftsScreen(
    onNavigateBack: () -> Unit,
    viewModel: MistakeDraftsViewModel = viewModel(factory = MistakeDraftsViewModel.factory()),
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("草稿箱 / 已同步", fontWeight = FontWeight.SemiBold) },
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
                .padding(horizontal = 16.dp),
        ) {
            // Tab 切换
            SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                SegmentedButton(
                    selected = state.tab == MistakeDraftsViewModel.Tab.DRAFTS,
                    onClick = { viewModel.setTab(MistakeDraftsViewModel.Tab.DRAFTS) },
                    shape = SegmentedButtonDefaults.itemShape(0, 2),
                    label = { Text("草稿箱 (${state.drafts.size})") },
                )
                SegmentedButton(
                    selected = state.tab == MistakeDraftsViewModel.Tab.SYNCED,
                    onClick = {
                        viewModel.setTab(MistakeDraftsViewModel.Tab.SYNCED)
                        viewModel.loadSynced()
                    },
                    shape = SegmentedButtonDefaults.itemShape(1, 2),
                    label = { Text("已同步") },
                )
            }
            Spacer(Modifier.height(8.dp))

            when (state.tab) {
                MistakeDraftsViewModel.Tab.DRAFTS -> DraftList(
                    drafts = state.drafts,
                    onDelete = viewModel::deleteDraft,
                    onRetry = viewModel::retryDraft,
                )
                MistakeDraftsViewModel.Tab.SYNCED -> SyncedList(
                    mistakes = state.synced,
                    selected = state.selectedForExport,
                    onToggle = viewModel::toggleExport,
                    loading = state.loading,
                )
            }

            // 导出按钮 (仅 SYNCED tab)
            if (state.tab == MistakeDraftsViewModel.Tab.SYNCED && state.selectedForExport.isNotEmpty()) {
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = viewModel::exportDocx,
                    enabled = !state.exporting,
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                ) {
                    if (state.exporting) {
                        CircularProgressIndicator(modifier = Modifier.size(20.dp), color = MaterialTheme.colorScheme.onPrimary, strokeWidth = 2.dp)
                        Spacer(Modifier.width(8.dp))
                        Text("导出中…")
                    } else {
                        Icon(Icons.Outlined.CloudDownload, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("导出 ${state.selectedForExport.size} 道错题为 docx")
                    }
                }
            }

            // 导出 URL (可选分享)
            state.exportUrl?.let { url ->
                Spacer(Modifier.height(8.dp))
                Card(
                    shape = RoundedCornerShape(8.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Text("导出完成", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(4.dp))
                        Text(url, style = MaterialTheme.typography.bodySmall)
                        Spacer(Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Button(onClick = {
                                val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                                cm.setPrimaryClip(ClipData.newPlainText("Lekao", url))
                                Toast.makeText(context, "链接已复制", Toast.LENGTH_SHORT).show()
                            }) {
                                Text("复制链接")
                            }
                            Button(onClick = { shareDocxUrl(context, url) }) {
                                Icon(Icons.Outlined.Share, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(Modifier.width(4.dp))
                                Text("分享")
                            }
                        }
                    }
                }
            }

            state.error?.let { msg ->
                Spacer(Modifier.height(8.dp))
                Text(msg, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun DraftList(
    drafts: List<MistakeDraftEntity>,
    onDelete: (Long) -> Unit,
    onRetry: (MistakeDraftEntity) -> Unit,
) {
    if (drafts.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                "暂无草稿，去录入页面添加几道错题",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(drafts, key = { it.id }) { draft ->
            DraftRow(draft, onDelete = { onDelete(draft.id) }, onRetry = { onRetry(draft) })
        }
    }
}

@Composable
private fun DraftRow(
    draft: MistakeDraftEntity,
    onDelete: () -> Unit,
    onRetry: () -> Unit,
) {
    val subjectLabel = mapOf(
        "math" to "数学", "physics" to "物理", "chemistry" to "化学",
        "english" to "英语", "chinese" to "语文"
    )[draft.subject] ?: draft.subject
    val statusIcon = when (draft.syncStatus) {
        MistakeDraftEntity.STATUS_PENDING -> Icons.Outlined.CloudDownload
        MistakeDraftEntity.STATUS_SYNCED -> Icons.Outlined.CheckCircle
        MistakeDraftEntity.STATUS_FAILED -> Icons.Outlined.CloudOff
        else -> Icons.Outlined.CloudDownload
    }
    val statusColor = when (draft.syncStatus) {
        MistakeDraftEntity.STATUS_PENDING -> MaterialTheme.colorScheme.onSurfaceVariant
        MistakeDraftEntity.STATUS_SYNCED -> Color(0xFF2E7D32)
        MistakeDraftEntity.STATUS_FAILED -> MaterialTheme.colorScheme.error
        else -> MaterialTheme.colorScheme.onSurfaceVariant
    }
    val statusLabel = when (draft.syncStatus) {
        MistakeDraftEntity.STATUS_PENDING -> "等待同步"
        MistakeDraftEntity.STATUS_SYNCED -> "已同步"
        MistakeDraftEntity.STATUS_FAILED -> "同步失败"
        else -> draft.syncStatus
    }
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(statusIcon, contentDescription = null, tint = statusColor, modifier = Modifier.size(28.dp))
            Spacer(Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "$subjectLabel · ${draft.topic}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = statusLabel + (draft.errorMessage?.let { " · $it" } ?: ""),
                    style = MaterialTheme.typography.bodySmall,
                    color = statusColor,
                )
            }
            if (draft.syncStatus == MistakeDraftEntity.STATUS_FAILED) {
                IconButton(onClick = onRetry) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "重试")
                }
            }
            IconButton(onClick = onDelete) {
                Icon(Icons.Outlined.Delete, contentDescription = "删除", tint = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun SyncedList(
    mistakes: List<com.lekao.app.data.api.MistakeDto>,
    selected: Set<String>,
    onToggle: (String) -> Unit,
    loading: Boolean,
) {
    if (loading) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        return
    }
    if (mistakes.isEmpty()) {
        Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Text(
                "还没有已同步的错题",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        return
    }
    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        items(mistakes, key = { it.id }) { mistake ->
            SyncedRow(mistake, selected = selected.contains(mistake.id), onToggle = { onToggle(mistake.id) })
        }
    }
}

@Composable
private fun SyncedRow(
    mistake: com.lekao.app.data.api.MistakeDto,
    selected: Boolean,
    onToggle: () -> Unit,
) {
    val subjectLabel = mapOf(
        "math" to "数学", "physics" to "物理", "chemistry" to "化学",
        "english" to "英语", "chinese" to "语文"
    )[mistake.subject] ?: mistake.subject
    Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (selected) MaterialTheme.colorScheme.primaryContainer
            else MaterialTheme.colorScheme.surface,
        ),
        modifier = Modifier.fillMaxWidth(),
        onClick = onToggle,
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Checkbox(checked = selected, onCheckedChange = { onToggle() })
            Spacer(Modifier.width(8.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = "$subjectLabel · ${mistake.topic}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    text = "${mistake.questions.size} 道题 · ${mistake.createdAt}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

private fun shareDocxUrl(context: Context, url: String) {
    val intent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, "乐考错题集下载链接：$url")
    }
    context.startActivity(Intent.createChooser(intent, "分享错题 docx"))
}