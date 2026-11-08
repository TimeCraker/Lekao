import { redis } from "./redis";

// ============================================
// 在线人数 · ZSET 滑动窗口（30s 无动作算掉线）
// ============================================
// T44 管理后台数据分析 #1
// 为什么用 Redis ZSET：
//   1. 30s 滑动窗口天然适合 score=时间戳
//   2. ZREMRANGEBYSCORE 自动清过期（不占内存）
//   3. ZCOUNT O(log N) 查询快
// 为什么不用 WebSocket：
//   项目无 WS 架构，加一层反而复杂；fire-and-forget 心跳足够

const ONLINE_KEY = "lekao:online";
const PEAK_KEY = "lekao:online:peak";
const ONLINE_WINDOW_SEC = 30;

/**
 * 心跳写：每次受保护页面访问时调用
 * fire-and-forget：调用方用 `void updateOnlineHeartbeat(userId)` 不阻塞响应
 */
export async function updateOnlineHeartbeat(userId: string): Promise<void> {
  const now = Date.now();
  const cutoff = now - ONLINE_WINDOW_SEC * 1000;
  const pipe = redis.pipeline();
  pipe.zadd(ONLINE_KEY, now, userId);
  // 自动清理 30s 前的过期 score（防止 ZSET 无限增长）
  pipe.zremrangebyscore(ONLINE_KEY, "-inf", cutoff);
  await pipe.exec();
  // 顺手更新历史峰值（fire-and-forget，不阻塞心跳）
  const current = await getOnlineUserCount();
  void recordPeak(current);
}

/**
 * 查询当前在线人数（30s 内有心跳的 user_id 数）
 */
export async function getOnlineUserCount(): Promise<number> {
  const cutoff = Date.now() - ONLINE_WINDOW_SEC * 1000;
  return await redis.zcount(ONLINE_KEY, cutoff, "+inf");
}

/**
 * 更新历史峰值（原子 Lua：避免并发覆盖）
 * 为什么 Lua：GET + 比较 + SET 三步必须原子（否则并发可能丢峰值）
 */
async function recordPeak(currentCount: number): Promise<void> {
  const lua = `
    local peak = tonumber(redis.call('GET', KEYS[1]) or '0')
    local cur = tonumber(ARGV[1])
    if cur > peak then
      redis.call('SET', KEYS[1], cur)
    end
    return cur > peak and cur or peak
  `;
  try {
    await redis.eval(lua, 1, PEAK_KEY, currentCount.toString());
  } catch {
    // peak 写失败不影响主心跳
  }
}

/**
 * 查询历史最大在线人数（峰值）
 */
export async function getPeakOnlineCount(): Promise<number> {
  const v = await redis.get(PEAK_KEY);
  return v ? parseInt(v, 10) : 0;
}
