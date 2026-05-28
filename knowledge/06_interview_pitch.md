# 面试讲法

一句话：

我把一个没有官方 Agent API 的单机游戏，包装成了可观测、可调用、可复盘的长时程 Agent 环境。底层用 C# Mod Bridge 接真实状态和合法动作，中间用 MCP 做工具协议，最上层用 LangGraph 把 Observe、Planner、Actor、Verifier、Memory 拆成显式状态图。

重点不要说“只是用了 LangGraph”。要强调：

- 真实状态来自 Bridge，不是截图 OCR。
- 模型只能选择 `action_id`，不能自由生成操作。
- 高风险动作有 Verifier 和 halt。
- 记忆分事实、策略、风险、事件，避免 run_summary 漂移。
- Mock Bridge 让项目可以脱离游戏展示，真实 Adapter 预留给 Mod 接入。
