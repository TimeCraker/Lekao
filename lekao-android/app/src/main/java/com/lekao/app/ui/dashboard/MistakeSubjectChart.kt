package com.lekao.app.ui.dashboard

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.patrykandpatrick.vico.compose.axis.horizontal.rememberBottomAxis
import com.patrykandpatrick.vico.compose.axis.vertical.rememberStartAxis
import com.patrykandpatrick.vico.compose.chart.Chart
import com.patrykandpatrick.vico.core.chart.column.ColumnChart
import com.patrykandpatrick.vico.core.entry.ChartEntryModel
import com.patrykandpatrick.vico.core.entry.entryModelOf

/**
 * 错题集分类统计柱状图 · T55 M15
 *
 * 按学科分类展示错题数量（mock 数据 → v0.3.0 接后端 /lekao/mistake/stats）
 *
 * Vico 1.16.0 API
 *
 * T92 修复: 与 CoinChartCard.kt T91 + IdeasTrendChart.kt T92 同根因。
 *   Dashboard 三个 Vico 图表原都用 `ChartEntryModelProducer() + LaunchedEffect
 *   setEntries + requireModel()` 模式,requireModel() = getModel()!! 在 series
 *   为空时 NPE。改用 entryModelOf(...).toTypedArray() spread → 单条同步链,
 *   根本性避开 requireModel NPE 路径。
 */
@Composable
fun MistakeSubjectChart(
    refreshTrigger: Int = 0,
    modifier: Modifier = Modifier,
) {
    // TODO: v0.3.0 接 api.getMistakeStats() 替代 mock
    val mockSubjects = remember { listOf("语文", "数学", "英语", "物理", "化学", "历史") }
    val mockCounts = remember { listOf(12, 24, 18, 7, 9, 5) }

    // T92: 用 entryModelOf 静态生成 model,remember 包一层保留 refreshTrigger 响应
    val model: ChartEntryModel = remember(refreshTrigger) {
        // entryModelOf(vararg Number): 用 index 当 x, value 当 y
        // 与原 entryOf(x=idx, y=v) 行为等价（x 自动 0..5 排列）
        entryModelOf(*mockCounts.toTypedArray())
    }
    val chart = remember { ColumnChart() }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "错题分类统计",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = mockSubjects.joinToString(" · "),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            Chart(
                chart = chart,
                model = model,
                startAxis = rememberStartAxis(),
                bottomAxis = rememberBottomAxis(),
                modifier = Modifier.fillMaxWidth().height(160.dp),
            )
        }
    }
}
