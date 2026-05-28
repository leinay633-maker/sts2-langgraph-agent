# Bridge Adapter Design

Bridge Adapter 是游戏运行时和 Agent 工具层之间的隔离层。

它实现 `IGameAdapter`，向上提供稳定 DTO，向下对接具体游戏对象和主线程执行机制。

## Responsibilities

- `ReadState()`：读取当前 run、combat、map、reward、shop 等状态。
- `ListLegalActions()`：枚举当前稳定态下的合法动作。
- `ExecuteAction(actionId)`：重新校验动作后投递到游戏主线程。
- `ReadSummary()`：读取结构化运行摘要。
- `UpdateSummary(diff)`：写入策略和风险层更新。

## Adapter Boundary

Adapter 只负责游戏内部对象读取和动作投递，不负责 MCP 协议，不直接调用模型。

外部链路保持不变：

```text
LangGraph Runner → MCP Server → Bridge HTTP API → IGameAdapter
```

这个边界让游戏侧逻辑、工具协议和模型编排可以独立调试、独立替换。
