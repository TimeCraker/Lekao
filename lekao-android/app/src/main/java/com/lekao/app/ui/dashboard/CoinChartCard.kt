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
 * T-Coin 30 天变化曲线 · T20 M15
 *
 * Vico 1.16.0 真实 API（不是 2.0 cartesian）:
 * - Chart composable (ChartsKt)
 * - lineChart() factory
 * - rememberBottomAxis / rememberStartAxis
 * - ChartEntryModelProducer.setEntries + entryOf
 */
@Composable
fun CoinChartCard(
    refreshTrigger: Int = 0,
    modifier: Modifier = Modifier,
) {
    // 30 天 mock 数据: 简单递增 + 轻微波动
    val mockData = remember { List(30) { idx -> (idx * 6 + (idx % 4) * 11).toFloat() } }

    val modelProducer = remember { ChartEntryModelProducer() }
    val chart = remember { LineChart() }

    LaunchedEffect(refreshTrigger, mockData) {
        modelProducer.setEntries(mockData.mapIndexed { idx, v -> entryOf(x = idx.toFloat(), y = v) })
    }

    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = MaterialTheme.colorScheme.surface,
        ),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
        modifier = modifier.fillMaxWidth(),
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
        ) {
            Text(
                text = "T-Coin 近 30 天",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                text = "v0.2.0 接入真实数据",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(12.dp))
            Chart(
                chart = chart,
                model = modelProducer.requireModel(),
                startAxis = rememberStartAxis(),
                bottomAxis = rememberBottomAxis(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
            )
        }
    }
}
