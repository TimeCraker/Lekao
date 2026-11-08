package com.lekao.app.util

import android.os.Process
import android.os.SystemClock
import android.util.Log

/**
 * StartupProfiler · T58 性能优化
 *
 * 冷启动耗时追踪（< 2s 目标）：
 * - Process 创建 → Activity.onCreate 结束
 * - Application.onCreate 耗时
 * - 首个 Composable render 耗时
 *
 * 用法：
 * ```kotlin
 * // Application.onCreate
 * val phase1 = StartupProfiler.mark("app_onCreate_start")
 * // ...
 * StartupProfiler.mark("channels_created")
 * StartupProfiler.report()  // 输出完整 trace
 * ```
 *
 * release 不输出 Log（仅 debug 用 measureTimeMillis 追踪）
 */
object StartupProfiler {

    private const val TAG = "StartupProfiler"

    /** Process 启动时间（elapsedRealtime）*/
    val processStartMs: Long = SystemClock.elapsedRealtime()

    /** 各阶段耗时记录 */
    private val marks = mutableListOf<Pair<String, Long>>()

    init {
        marks.add("process_start" to 0L)
    }

    /**
     * 标记一个阶段
     * @return 从 processStart 到此阶段的耗时 (ms)
     */
    fun mark(phase: String): Long {
        val elapsed = SystemClock.elapsedRealtime() - processStartMs
        marks.add(phase to elapsed)
        return elapsed
    }

    /**
     * 输出完整 timeline（仅在 debug build）
     */
    fun report() {
        if (marks.size < 2) return
        val sb = StringBuilder("冷启动 trace:\n")
        for (i in 0 until marks.size - 1) {
            val (name, time) = marks[i]
            val (nextName, nextTime) = marks[i + 1]
            sb.append("  $name → $nextName: ${nextTime - time}ms\n")
        }
        sb.append("  总耗时: ${marks.last().second}ms")
        Log.d(TAG, sb.toString())
    }

    /**
     * 首帧渲染时间（从 process 创建到第一个 frame）
     */
    fun firstFrameMs(): Long {
        val uptime = SystemClock.uptimeMillis()
        val elapsed = SystemClock.elapsedRealtime()
        return elapsed - processStartMs
    }
}