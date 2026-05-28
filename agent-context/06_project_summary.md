# Project Summary

这个项目的核心目标，是把一个没有官方 Agent API 的单机游戏整理成稳定的长时程 Agent 环境。

系统分为三层：游戏侧 Bridge 负责状态读取、合法动作枚举和动作执行；MCP Server 负责把这些能力暴露成标准工具；LangGraph Runner 负责把一局游戏中的观察、规划、行动、复核和记忆更新组织成显式状态图。

## Highlights

- 状态来自 Bridge 的结构化快照，而不是截图识别。
- 动作空间由 Bridge 枚举，模型只选择当前合法的 `action_id`。
- 不可逆或高风险动作会进入 Verifier 节点复核。
- 运行记忆按 facts、strategy、risks、events 分层保存，方便回放和恢复。
- 本地 runtime 用于稳定复现完整 Agent 链路和测试工具协议。

## Why LangGraph

这个任务本质上是一个长时程状态机。每一步都需要读取稳定状态、选择合法动作、执行后等待结算，再把关键变化写入记忆。LangGraph 适合把这些步骤拆成可观察、可测试、可复用的节点，而不是把全部逻辑压进一个长 prompt。
