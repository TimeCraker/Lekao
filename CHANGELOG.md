# LeKao · 更新日志

> 所有重要变更记录在此。版本号遵循 [Semantic Versioning](https://semver.org/)。

---

## [2.0.0] - 2026-06-22 · 收尾稳定版

**Lekao 第一个功能完整 + 安全加固 + 监控到位 + 品牌专业 + SEO 就绪 + 移动端可用 的稳定版本。**

### 🎯 核心功能

| 模块 | 功能 |
|------|------|
| 课堂小结 | 上传讲义图片 → AI 识别学科/章节/知识点 → 生成课堂小结（含授课内容 + 学习要求 + 可选作业反馈）|
| 作业/堂测反馈 | 上传讲义图片 → AI 生成 10/20/30/40/50 条逐题反馈 + 作业总体小结（4 挡字数：标准/×1.5/×2/×3）|
| 错题集 Word | Excel 模板 + 拖拽题目图片（每题最多 3 张）→ 5 分钟生成全班 Word 错题文档（**永久免费**）|
| T-Coin 体系 | 注册即送 5 枚（够生成 5 次），扣费优先 gift_coin → t_coin |
| 邮箱密码登录 + 验证码登录双模式 | 邀请码支持（可选，填了送 15 枚）|
| 本地历史（IndexedDB）| 用户可查本地历史，主动清除 |

### 🔒 安全设计

| 层 | 实现 |
|----|------|
| banned 拦截（4 层）| `authorize` + `signIn` callback + `verify-code` + `proxy.ts` |
| Rate Limit（双层）| 用户级 5 次/60s + 全局并发 5/instance + 队列 100 + 60s 超时 |
| AI 错误友好分类 | 402 余额不足 / 429 限流 / 超时 / 上下文超长 → SSE `__ERROR__` 事件 |
| Prisma 连接池 | `?connection_limit=4&pool_timeout=20` 防 DB 撑爆 |
| nginx limit_req | 20r/s + burst 50 防 DDoS |
| Security Review | 7 个 MEDIUM + 1 个 CRITICAL 全部修复 |

### 📊 监控

- systemd + cgroup v2 memory 监控（`/usr/local/bin/lekao-monitor.sh` 每 5 分钟）
- QQ SMTP 告警：> 80% 内存 / 进程 dead → 推送到 QQ 邮箱

### 🎨 品牌与 SEO

- 几何 Logo（圆形 + L 字符 + signal coral 强调点）
- Next 16 dynamic icon route：`/icon` `/apple-icon` `/opengraph-image`
- 全平台 SEO：title 模板 + 12 关键词 + OpenGraph + Twitter Card
- 双 JSON-LD schema：SoftwareApplication + FAQPage（Google Rich Result）
- 自动生成 `robots.txt` + `sitemap.xml`

### 📱 移动端

- 关键页面响应式：Navbar / Hero / Uploader / Summary 选项栏
- 触屏设备禁用 3D tilt（节省 GPU）
- 触控目标 ≥ 36px
- 渐进式 grid (2/3/5 列)
- 图片压缩移动端自动降级（1280px / 0.4MB）

### 🚀 部署

- 腾讯云 3.6GB 单进程 systemd + nginx 反代
- 阿里云 SSL 终端（Certbot 自动续签）
- PostgreSQL 共享 DB（与 ResumeAIX 共用 users 表只读）
- git bundle + SCP 部署（跨境网络抽风兜底）

### 📦 技术栈

| 层 | 选型 |
|----|------|
| 前端 | Next.js 16 + React 19 + Tailwind 4 |
| 数据库 | PostgreSQL + Prisma 6 |
| 认证 | next-auth v4 + JWT |
| 视觉模型 | Qwen3-VL-8B-Instruct（硅基流动）|
| 文本模型 | DeepSeek-V4-Flash |
| Word 生成 | docx + JSZip |
| 图片压缩 | browser-image-compression + Web Worker |

---

## [1.x] - 2026-06-20 ~ 2026-06-22

详见 git log：
- Phase 1 (T1-T15)：脚手架 + 登录系统 + 部署 + Lighthouse a11y 100
- Phase 2：课堂小结 + 反馈业务功能
- P0 三件套 + 9 项安全加固 + 监控告警

---

## 下阶段规划（等用户拍板）

### P0 阻塞商业化（等公司主体）
- T41 微信 OAuth
- T39 微信支付

### P1 杀手级（任选）
- 移动端完整 sprint（8h）
- T42 批量并行生成（4h）
- 用户自定义模板 UI（6h）

### 监控增强（性价比低）
- Sentry 接入（30min，已用 QQ 邮件告警替代）

---

**维护者**：LeKao 团队
**License**: Private
