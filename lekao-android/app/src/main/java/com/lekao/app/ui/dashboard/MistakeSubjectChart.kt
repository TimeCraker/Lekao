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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.patrykandpatrick.vico.compose.cartesian.CartesianChartHost
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberBottomAxis
import com.patrykandpatrick.vico.compose.cartesian.axis.rememberStartAxis
import com.patrykandpatrick.vico.compose.cartesian.layer.rememberColumnCartesianLayer
import com.patrykandpatrick.vico.compose.cartesian.rememberCartesianChart
import com.patrykandpatrick.vico.compose.cartesian.rememberVicoScrollState
import com.patrykandpatrick.vico.core.cartesian.data.CartesianChartModelProducer
import com.patrykandpatrick.vico.core.cartesian.data.columnSeries

/**
 * 错题集分类统计柱状图 · T55 M15
 *
 * 按学科分类展示错题数量（mock 数据 → v0.3.0 接后端 /lekao/mistake/stats）
 */
@Composable
fun MistakeSubjectChart(
    refreshTrigger: Int = 0,
    modifier: Modifier = Modifier,
) {
    // TODO: v0.3.0 接 api.getMistakeStats() 替代 mock
    val mockSubjects = remember { listOf("语文", "数学", "英语", "物理", "化学", "历史") }
    val mockCounts = remember { listOf(12, 24, 18, 7, 9, 5) }

    val modelProducer = remember { CartesianChartModelProducer.build() }

    LaunchedEffect(refreshTrigger, mockCounts) {
        modelProducer.tryRunTransaction {
            columnSeries { series(mockCounts.map { it.toFloat() }) }
        }
    }

    val columnColors = remember {
        listOf(
            Color(0xFF1976D2), // blue
            Color(0xFFE65100), // orange
            Color(0xFF2E7D32), // green
            Color(0xFF6A1B9A), // purple
            Color(0xFFC62828), // red
            Color(0xFF00695C), // teal
        )
    }

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
            CartesianChartHost(
                chart = rememberCartesianChart(
                    rememberColumnCartesianLayer(),
                    startAxis = rememberStartAxis(),
                    bottomAxis = rememberBottomAxis(),
                ),
                modelProducer = modelProducer,
                scrollState = rememberVicoScrollState(),
                modifier = Modifier.fillMaxWidth().height(160.dp),
            )
        }
    }
}