---
name: source-command-lekao
description: "执行迁移自 Claude 的 `/lekao` 项目命令。用于读取 LeKao 上下文，或按参数执行同步、开发、部署、状态、日志、迁移与验证。"
---

# LeKao command adapter

完整读取 `../../../.claude/skills/lekao.md`，再将命令参数作为用户明确授权的动作执行。无参数时只返回项目上下文和下一步，不连接服务器或修改环境。
