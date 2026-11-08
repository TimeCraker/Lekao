# Stage · 云端生成历史用户侧可见（只读）

> **日期**：2026-08-28
> **背景**：每次 AI 生成早已落盘 `lekao_class_summaries` / `lekao_class_feedbacks` 两张文本表（v2.0.0 起防客诉），但用户侧 `/dashboard/history` 只读浏览器 IndexedDB——换设备 / 清缓存历史即消失，云端数据只有 admin 后台能看。
> **目标**：把这两张已有表的记录开放给本人，本地 + 云端合并展示。

## 边界（红线）

- **零 migration**：不建新表、不改 schema，只读两张已有文本表
- **只读**：用户侧无删除/清空云端能力（本地记录的删除/清空行为保留）
- **不碰错题集**：错题集的本地图片存储（IndexedDB + File System Access）不动
- 图片不进云端：两张表本就只存文本（subject/topic/feedbackText/summaryText），维持现状

## 技术方案

### API：`GET /api/lekao/history`（新增）

- 鉴权：session（userId 隔离，where 强制 `{ userId }`，不接受外部 userId 参数——与 admin/history 的关键差异）
- 分页：`page` / `limit`（默认 1 / 20，上限 50），`type=summary|feedback|all`
- 查询逻辑抄改 `src/app/api/admin/history/route.ts`：去掉 ADMIN 校验 + include user，where 钉死本人
- 返回字段映射为与本地 `HistoryRecord` 同构（id/template/subject/topic/feedback/summary/createdAt），前端零转换合并

### 前端：`/dashboard/history`（改造）

- 并行加载：本地 IndexedDB + 云端第一页（limit 50）
- 合并：按 `createdAt` 倒序；指纹去重（template + subject + topic + feedback 前 60 字），云端优先——同一次生成双写两处只显示一条
  - 可靠性依据：两处 feedback 文本同源（后端 `parseSummaryOutput(accumulated)` 与前端共用同一 parser 切同一条流）
- 徽章：云端条目「永久保存」（success 色），仅本地条目「仅本机」（默认色）
- 云端条目无删除按钮（只读）；本地条目删除/清空行为不变，清空文案明确「仅清空本机」
- 云端还有更多 → 「加载更多」按钮（page+1）

### 验收

- [ ] 本地 + 云端混合展示，按时间倒序，无肉眼可见重复条目
- [ ] 云端条目带「永久保存」徽章、无删除按钮；本地条目可删
- [ ] 换设备登录（无 IndexedDB）仍能看到云端历史
- [ ] 未登录/无 session 调 API → 401；A 用户查不到 B 用户记录
- [ ] 零 migration；`build` + `lint`（改动文件零新增问题）
