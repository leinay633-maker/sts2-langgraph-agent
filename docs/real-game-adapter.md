# 真实游戏接入说明

当前仓库包含完整 Bridge 架构和 Mock Demo，但没有硬编码《杀戮尖塔2》的内部类型名。

真实接入时只需要替换 `Bridge.Mod` 中的 `SampleGameAdapter`：

```csharp
IGameAdapter adapter = new SlayTheSpire2GameAdapter();
```

`SlayTheSpire2GameAdapter` 应实现：

- `ReadState()`：读取真实 run/combat/map/reward/shop 状态。
- `ListLegalActions()`：返回当前稳定态下的合法动作。
- `ExecuteAction(actionId)`：重新校验 action_id 后投递到游戏主线程。
- `ReadSummary()` / `UpdateSummary()`：读写结构化 run summary。

不要把 MCP 协议塞进游戏进程。游戏内层只暴露 localhost HTTP，外部 MCP Server 负责模型工具协议。
