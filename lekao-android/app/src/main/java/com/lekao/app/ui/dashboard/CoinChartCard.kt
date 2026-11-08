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
import com.patrykandpatrick.vico.core.chart.line.LineChart
import com.patrykandpatrick.vico.core.entry.ChartEntryModel
import com.patrykandpatrick.vico.core.entry.entryModelOf

/**
 * T-Coin 30 天变化曲线 · T20 M15
 *
 * Vico 1.16.0 真实 API（不是 2.0 cartesian）:
 * - Chart composable (ChartsKt)
 * - lineChart() factory
 * - rememberBottomAxis / rememberStartAxis
 * - entryModelOf 工厂方法直接生成 ChartEntryModel（不走 producer 延迟状态）
 *
 * T91 修复: 之前用 `ChartEntryModelProducer().apply { setEntries(...) }.requireModel()`
 * 仍 NPE —— requireModel() = getModel()!! 在 series 为空时炸。
 * 根因分析(Vico 1.16.0 ChartEntryModelProducer.kt):
 *   - init 块只在 entryCollections != null 时调 setEntries
 *   - 我们的写法先空构造再 apply setEntries,虽然同步填 series,
 *     但 Compose 重组期间 registerForUpdates 内部 runBlocking 可能与
 *     主线程 setEntries 产生时序竞争,getInternalModel() 返回 null
 *   - requireModel() = getModel()!! → NPE on ChartModelProducer.kt:41
 * 改用 entryModelOf(...).toTypedArray() spread → 内部直接
 *   ChartEntryModelProducer(listOf(entryList)).requireModel(),单条同步链,
 *   没有任何空隙让 series 变空,根本性避开 requireModel NPE 路径。
 */
@Composable
fun CoinChartCard(
    refreshTrigger: Int = 0,
    modifier: Modifier = Modifier,
) {
    // 30 天 mock 数据: 简单递增 + 轻微波动
    val mockData = remember { List(30) { idx -> (idx * 6 + (idx % 4) * 11).toFloat() } }

    // T91: 用 entryModelOf 静态生成 model,remember 包一层避免每次 recomposition 重建
    val model: ChartEntryModel = remember(mockData) {
        // entryModelOf(vararg Number): 用 index 当 x, value 当 y
        // 内部: listOf(entryList).let { ChartEntryModelProducer(it).requireModel() }
        // 单条同步链, 无 NPE 风险
        entryModelOf(*mockData.toTypedArray())
    }
    val chart = remember { LineChart() }

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
                model = model,
                startAxis = rememberStartAxis(),
                bottomAxis = rememberBottomAxis(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(180.dp),
            )
        }
    }
}
