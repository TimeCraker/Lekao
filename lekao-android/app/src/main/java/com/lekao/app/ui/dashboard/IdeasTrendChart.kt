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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.patrykandpatrick.vico.compose.axis.horizontal.rememberBottomAxis
import com.patrykandpatrick.vico.compose.axis.vertical.rememberStartAxis
import com.patrykandpatrick.vico.compose.chart.Chart
import com.patrykandpatrick.vico.core.chart.line.LineChart
import com.patrykandpatrick.vico.core.entry.ChartEntryModelProducer
import com.patrykandpatrick.vico.core.entry.entryOf

/**
 * 灵感墙近 14 天趋势折线图 · T55 M15
 *
 * 展示灵感帖子每日新增数（mock 数据 → v0.3.0 接后端 /lekao/ideas/stats）
 *
 * Vico 1.16.0 API
 */
@Composable
fun IdeasTrendChart(
    refreshTrigger: Int = 0,
    modifier: Modifier = Modifier,
) {
    // TODO: v0.3.0 接 api.getIdeasStats() 替代 mock
    val mockData = remember { listOf(3, 7, 2, 5, 8, 10, 4, 6, 9, 11, 3, 7, 5, 12) }

    val modelProducer = remember { ChartEntryModelProducer() }
    val chart = remember { LineChart() }

    LaunchedEffect(refreshTrigger, mockData) {
        modelProducer.setEntries(mockData.mapIndexed { idx, v -> entryOf(x = idx.toFloat(), y = v.toFloat()) })
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "灵感墙近 14 天",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "每日新增灵感数",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            Chart(
                chart = chart,
                model = modelProducer.requireModel(),
                startAxis = rememberStartAxis(),
                bottomAxis = rememberBottomAxis(),
                modifier = Modifier.fillMaxWidth().height(160.dp),
            )
        }
    }
}
