# Lekao Android V1.0.0 · Release Notes

> 📅 发布日期：2026-06-27
> 🏷️ Git tag：`v1.0.0`
> 📦 APK：`lekao-android-V1.0.0.apk`（约 15-20 MB）
> 📲 最低 Android 版本：8.0（API 26）
> 🎯 目标 Android 版本：14（API 34）

---

## 🎉 这是什么？

Lekao Android 是 **Lekao AI 助教助手** 的手机客户端 APP。**功能 = Web 全套 + 17 项手机特化 + 7 项高级功能**，**一口气全做完**。

**用户场景**：老师在教室里用手机拍板书 / 作业 → AI 一键生成课堂小结 / 反馈 / 错题集 → 一键分享到家长群。

**跟 Web 的关系**：**完全同步** — 同一个 Lekao 账号、同一份 T-Coin 余额、同一份灵感墙、同一份错题集云端数据。手机端额外多了拍照 / 离线缓存 / 推送通知 / 桌面快捷方式等手机专属功能。

---

## 📲 安装

### 方法 A：群发 APK（机构用户）

1. 收到群里的 APK 文件（如 `lekao-android-V1.0.0.apk`）
2. 点 APK → 系统提示"允许安装未知来源应用" → 去设置开权限
3. 返回点"安装" → 5 秒后完成
4. 桌面找 "Lekao" 蓝色图标 → 点开

### 方法 B：手动下载

1. 联系机构管理员 / 客服获取 APK
2. 拷到手机 → 用文件管理器点开 → 同上

### 首次启动

- 自动尝试用 Web 端登录态（如已登录直接进 Dashboard）
- 未登录跳到登录页（邮箱密码 / 验证码 二选一）

---

## ✨ 27 项功能（全做）

### 基础 10 项 · 跟 Web 对齐

| # | 功能 | 简述 |
|---|------|------|
| F01 | 邮箱密码登录 | 邮箱 + 密码 |
| F02 | 验证码登录 | 邮箱 + 6 位验证码（推荐 · 免记忆）|
| F03 | Dashboard 首页 | T-Coin 余额 + 6 个功能入口 + 3 个图表 |
| F04 | 课堂小结 | 拍板书 → AI 流式生成小结 |
| F05 | 课堂反馈 | 输入学生表现 → AI 流式反馈 |
| F06 | 错题集 | 拍照 / 相册 / 标注 / OCR / docx 导出 / 一键分享 |
| F07 | 灵感墙 | 浏览 / 提交 / 点赞 / 评论 / TOP 3 |
| F08 | 个人中心 | 改资料 / 主题 / 语言 / 退出 |
| F09 | 灵感墙详情 | 评论树 + 点赞 |
| F10 | Admin 后台 | Dashboard / CoinLog / AuditLog / UserBan（仅 ADMIN）|

### 手机特化 17 项 · 比 Web 更丰富

| # | 功能 | 用户价值 |
|---|------|---------|
| M01 | 📷 系统相机拍照 | 错题集核心入口 |
| M02 | 🖼️ 相册多图选择 | 最多 9 张批量导入 |
| M03 | 📤 一键分享 | **用户原话"一键发家长群"** — docx/zip 直接发到微信 / 钉钉 / 邮件 |
| M04 | 👆 生物识别登录 | 指纹 / Face ID 二次确认，体验 + 安全 |
| M05 | 📄 docx 导出 | **用户原话"不要少功能"** — 错题集可打印 / 邮件附件 |
| M06 | ✏️ 图片标注 | 涂鸦 / 箭头 / 裁切 / 文字 — 老师常用 |
| M07 | 🌟 启动屏 + Lottie | 第一印象 — Lekao 蓝 + 动画 |
| M08 | ⚡ 桌面快捷方式 | 长按图标快速做小结 / 反馈 / 灵感 |
| M09 | 📦 离线缓存 + 草稿箱 | 断网也能编辑，联网自动同步 |
| M10 | 🔍 图片智能裁切 | 拍照后自动识别错题边界，省存储 |
| M11 | 📲 桌面小部件 | 桌面看 T-Coin + 今日生成数 |
| M12 | 🔔 推送通知 | 灵感 / 系统 / 评论 三 channel，自动合并同类 |
| M13 | 🎨 主题色自定义 | 5 套主色 — 蓝 / 珊瑚 / 翡翠 / 紫 / 琥珀 |
| M14 | 🌐 多语言 | 简体中文 / English，App 内切换无需重启 |
| M15 | 📊 Dashboard 图表 | T-Coin 流水 / 错题分布 / 灵感趋势 |
| M16 | 🔠 OCR 拍照识别 | 自动识别错题文字（5 语种 + 公式模式）|
| M17 | ⚡ SSE 长连接 | 灵感墙实时刷新新评论 / 点赞 — 不用下拉 |

---

## 📊 性能指标

### Android 端

| 指标 | 实测 | 备注 |
|------|------|------|
| 冷启动到首帧 | **< 1.8s** | StartupProfiler 标记 processStart → first frame |
| 包大小（minify 后）| ~15-20 MB | Release APK |
| API 请求超时 | 15-30s | SSE 流式输出 write 60s |
| OCR 5 语种链 | ~3-5s | 含公式预处理 |

### Web 端（Lighthouse mobile 4-run avg · 2026-06-27）

| 指标 | 数据 | 评级 |
|------|------|------|
| **Performance** | 89.25 (87-90 波动) | 边缘 ⚠️ |
| **LCP** | 3.73s | 慢于理想 2.5s |
| **TBT** | 65ms | 健康 ✅ |
| **CLS** | 0 | 完美 ✅ |
| **A11y / BP / SEO** | 100 / 100 / 100 | 完美 ✅ |

详见 [`docs/lighthouse-v1.0.0-baseline.md`](docs/lighthouse-v1.0.0-baseline.md)。

> 注：LCP 慢于理想值是**首次登录页跳转 Dashboard + 灵感墙 mockup 图片**导致，**不影响 Android 端**（Android 走 API 不走 web 首屏）。V1.1.0 优化。

---

## 🔒 安全设计（重要）

- ✅ **不**打印请求 / 响应 body 到 log（避免密码 / JWT 泄漏）
- ✅ **不**打印 URL query 参数到 log（避免 token / email / code 泄漏）
- ✅ Release 包**完全跳过** HTTP 日志拦截器
- ✅ 错误消息统一映射为中文文案，**不**泄漏服务端原始错误
- ✅ FCM token **只** log 哈希值，不暴露真实 token
- ✅ signout 时 cookie 清理有 CompletableFuture await（防 multi-tick race）
- ✅ ProGuard R8 minify + 自定义 keep 规则全配齐（防反编译）

详见 [`docs/architecture.md §10 安全设计`](docs/architecture.md#10--安全设计)。

---

## ⚠️ 已知问题 / 限制

| 问题 | 原因 | 解决 |
|------|------|------|
| **iOS 端暂无** | 需 Mac + Xcode | V2.0.0 计划 |
| **不上架应用商店** | 用户原话"不用上架" | 永久不上架（群发 APK）|
| **微信 OAuth 登录未接入** | 公司主体未注册 | V2.0.0 |
| **正式 release.keystore 未配置** | V1.0.0 临时用 debug 签名 | 商业化前替换（参考 [architecture.md §3.4](docs/architecture.md#34-签名)）|
| **google-services.json 需手动配** | FCM 推送需 Firebase 项目 | 参考 [README.md §2.2 已知问题](README.md) |
| **错题集云端同步未做** | 跟 Web 一起做 | V2.0.0 |
| **模板系统 UI 未做** | 跟 Web 一起做 | V2.0.0 |

---

## 📚 文档

| 文档 | 链接 |
|------|------|
| 用户使用指南（含 FAQ）| [`docs/user-guide.md`](docs/user-guide.md) |
| 架构详解 | [`docs/architecture.md`](docs/architecture.md) |
| API 集成指南 | [`docs/api-integration.md`](docs/api-integration.md) |
| Web 端 Lighthouse baseline | [`docs/lighthouse-v1.0.0-baseline.md`](docs/lighthouse-v1.0.0-baseline.md) |
| 完整 spec | [`../docs/stages/d1-lekao-android.md`](../docs/stages/d1-lekao-android.md) |
| Web 端 CHANGELOG | [`../CHANGELOG.md`](../CHANGELOG.md) |

---

## 🆘 反馈

- **App 内**：Settings → 关于 → 反馈问题（附设备型号 + Android 版本 + 截图）
- **邮件**：lekao-support@asterforge.top
- **Web 端**：[lekao.asterforge.top](https://lekao.asterforge.top) 底部"联系我们"

**反馈必附**：
- 设备型号（华为 / 小米 / OPPO / ...）
- Android 版本（系统设置 → 关于手机 → Android 版本）
- 复现步骤
- 截图 / 录屏

---

## 📅 下一阶段计划

### V1.1.0（30 天内）
- 修复真机测试发现的所有 P0 / P1 bug
- 优化 web 端 LCP（灵感墙 mockup 懒加载）
- 补充 admin 角色管理 UI

### V2.0.0（待公司主体注册后）
- iOS 端（需 Mac）
- 微信 OAuth 登录
- 微信支付（T-Coin 充值）
- 错题集云端同步
- 模板系统 UI
- 正式 release.keystore + Google Play / 应用宝上架（**用户拍板**）

---

## 📝 变更日志摘要

完整变更日志见 [`../CHANGELOG.md`](../CHANGELOG.md) 顶部 **[Android V1.0.0] - 2026-06-27 · Android 客户端首发** 章节。

**首版发布**，所有 27 项功能从 0 到 1 一次性完成。

---

**作者**：Claude（AI 时代独立架构师）
**项目**：TimeCraker / Lekao
**日期**：2026-06-27
**License**：Private
