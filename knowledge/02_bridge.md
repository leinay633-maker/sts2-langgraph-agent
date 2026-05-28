# C# Mod Bridge

Bridge 的核心职责是把游戏进程内部状态转成稳定 DTO。

## 状态采集

状态采集应由 Adapter 完成。真实游戏接入时，Adapter 读取当前 run、combat、player、enemy、card zone、map、reward、shop 等对象，然后转成 `GameStateDto`。

## 合法动作

Bridge 必须枚举当前所有合法动作，每个动作包含：

- `action_id`：稳定标识，模型只能选择它。
- `action_type`：动作类型，例如 play_card、end_turn、choose_reward。
- `label` 和 `description`：给模型阅读。
- `risk`：low、medium、high、fatal。

## 稳定态

Bridge 不应在动画、结算、切房间或动作解析中返回可决策状态。状态不稳定时返回 `busy` 或 `not_ready`，LangGraph 会等待再读。
