# LangGraph 编排

LangGraph Runner 负责长时程状态机：

```text
observe_state -> planner? -> actor -> verifier? -> execute_action -> memory_update -> observe_state
```

## 节点职责

- `observe_state`：通过 MCP 读取 Bridge 状态。
- `wait_stable`：遇到 busy/not_ready 时等待。
- `planner`：只在奖励、地图、商店、事件等关键阶段更新长期策略。
- `actor`：从 `legal_actions` 里选择一个 `action_id`。
- `verifier`：只复核高风险动作。
- `execute_action`：通过 MCP 调 Bridge 执行动作。
- `memory_update`：写结构化策略和风险 diff。

## 路由原则

路由尽量用代码，不交给模型。这样能降低成本，也能避免模型在协议层漂移。
