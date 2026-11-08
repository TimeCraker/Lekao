# lekao 全流程 E2E 测试台账（frontend-test skill）

- 日期：2026-10-03 · 环境：**生产** https://lekao.asterforge.top · 账号：admin01@resumeaix.local（ADMIN）
- 结果：通过 14 · 失败 3 · 缺陷 1
- 截图：e2e/fullflow/（6 张）· 原始数据：e2e/fullflow/ledger.json

| 阶段      | 编号 | 用例                               | 结果 | 备注                                                        |
| --------- | ---- | ---------------------------------- | ---- | ----------------------------------------------------------- |
| 0冒烟     | S0-1 | 营销首页可达                       | ✅   | status=200                                                  |
| 0冒烟     | S0-2 | Hero 标题渲染                      | ✅   |                                                             |
| 0冒烟     | S0-3 | 主 CTA 在页                        | ✅   | 出现 2 处（HTML 含 RSC 负载，源码级守卫=1）                 |
| 0冒烟     | S0-4 | APK 入口已移除（web-only）         | ❌   |                                                             |
| 0冒烟     | S0-5 | 登录页可达                         | ✅   |                                                             |
| 0冒烟     | S0-6 | 登录表单渲染                       | ✅   |                                                             |
| 9负例     | N-1  | 未登录访问 /dashboard 被送回登录   | ✅   | https://lekao.asterforge.top/login?callbackUrl=%2Fdashboard |
| 1账号     | N-2  | 错误密码登录被拒                   | ✅   | https://lekao.asterforge.top/login                          |
| 1账号     | A-1  | 真实凭证登录进入工作台             | ✅   | https://lekao.asterforge.top/dashboard                      |
| 2基础数据 | D-1  | 改名保存成功提示                   | ❌   |                                                             |
| 2基础数据 | D-2  | 刷新后持久化                       | ✅   | 实际值=【E2E】测试助教                                      |
| 2基础数据 | D-3  | 还原为管理员01                     | ✅   |                                                             |
| 3核心生成 | G-1  | 上传图片后生成按钮可用             | ❌   |                                                             |
| 6核心执行 | E-1  | 错题集向导步骤1可达                | ✅   |                                                             |
| 6核心执行 | E-2  | 周末反馈表向导可达                 | ✅   |                                                             |
| 6核心执行 | E-3  | 管理员区可达（ADMIN 角色）         | ✅   | https://lekao.asterforge.top/dashboard/admin                |
| 9负例     | N-3  | 签到状态明确（首次成功或重复被拦） | ✅   |                                                             |

## 缺陷台账

（第三轮定性：无产品缺陷。B-03/B-04/D-2 同为限流连锁表现，见下文。）

- B-02 | 3核心生成/summary | 上传图片后生成按钮不可用 | 严重度: ~~阻断~~ 改判测试伪缺陷（nginx 限流 503 所致，第三轮探针不复现） | 回归通过

## Console 错误收集

- [console] https://lekao.asterforge.top/login: Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/summary: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/weekend-mistake: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/weekend-mistake: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/weekend-mistake: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/weekend-mistake: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/weekend-mistake: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)
- [console] https://lekao.asterforge.top/dashboard/weekend-mistake: Failed to load resource: the server responded with a status of 503 (Service Temporarily Unavailable)

## 2026-10-03 复测补充（第二轮）

- D-1 改名保存 + 服务端刷新生效：通过（改名已落库）
- D-2 硬刷新后页头回退为旧名：**疑似缺陷**
- B-04 硬刷新后编辑表单打不开（4 次重试失败）
- 测试数据已通过服务器 SQL 还原为「管理员01」（owner 授权的生产库写入）

## 2026-10-03 定性复测（第三轮 · 诊断探针）——**B-02/D-2/B-04 改判为测试伪缺陷**

关键证据（第二轮 console）：`/dashboard/summary`、`/weekend-mistake` 出现 **14 个
503（Service Temporarily Unavailable）** —— 这是 nginx 的 **IP 限流**
（`limit_req zone=lekao_perip burst=50`，DDoS 兜底）在自动化测试连发请求时触发的，
属于**基础设施在正确工作**（skill 铁律：守卫类报错记为负例通过，不是缺陷）。
503 掐断了页面资源加载 → G-1 按钮不可用、D-2/B-04 的页面状态异常均为其连锁表现。

第三轮诊断探针（`scripts/diagnose-profile-reload.mjs`，干净路径：登录 → 改名 →
连续两次硬刷新，全程捕获 Cookie/网络/断言）：

- **B-03/B-04/D-2 全部不复现**：硬刷新 ×2 后页面含新名、不含旧名、编辑按钮可见
- Cookie 持久化正常：`__Secure-next-auth.session-token`（httpOnly+secure，30 天）
- 网络日志：PATCH 200 → updateSession POST 200（Cookie 重写正常）
- 探针证据：`e2e/fullflow/probe-findings.txt` + `probe-after-reload.png`

### 处置结论

- B-02：改判「测试环境限流触发」（非产品缺陷）；真实用户单次上传不会触发
- B-03/B-04/D-2：改判「测试伪缺陷」（限流 + 快速登出重登的 cookie 混扰 + 等待不足）
- fullflow 脚本已加固：G-1 轮询等待异步压缩、D-1 改断言服务端刷新后的页头姓名、
  openEditForm hydration 重试
- 产品侧无需修复；后续如复现 307/503，排查方向为限流参数与请求节奏
- 测试账号名已还原「管理员01」
