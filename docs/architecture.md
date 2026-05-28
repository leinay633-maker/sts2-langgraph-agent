# Architecture

```text
Runtime Bridge
  ↓ localhost HTTP
MCP Server
  ↓ stdio MCP
LangGraph Runner
  ├─ observe_state
  ├─ planner
  ├─ actor
  ├─ verifier
  ├─ execute_action
  └─ memory_update
```

## Runtime Bridge

Bridge 是游戏侧边界层，负责把运行时对象转换为稳定 DTO：

- player、enemy、card、map、reward、shop 等状态
- 当前可执行的 `legal_actions`
- `state_fingerprint`
- `busy/not_ready/stable` 稳定态标记
- 动作执行结果

Bridge 在执行动作前重新校验 `action_id`，避免模型复用旧动作或生成非法操作。

## MCP Server

MCP Server 不实现游戏规则，只做工具协议、参数校验、调用日志和 Bridge HTTP 转发。

核心工具：

- `get_game_state`
- `list_legal_actions`
- `execute_action`
- `step`
- `get_run_summary`
- `update_run_summary`
- `start_autoslay`
- `stop_autoslay`

## LangGraph Runner

LangGraph Runner 是模型侧编排层。它把长时程决策拆成显式节点，并用代码路由控制流程：

- `busy/not_ready`：等待后重新 observe
- `reward/map/shop/event`：触发 Planner
- 高风险动作：触发 Verifier
- fatal 风险：halt，不继续 POST 副作用动作

这样保留了 LLM 的策略判断能力，同时把事实、动作边界和副作用控制放在工程层。
