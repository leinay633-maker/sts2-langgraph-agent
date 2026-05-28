import type { ExecuteActionResponse, GameState, LegalAction, RunSummary } from "../../shared/src/types.js";

const baseDeck = ["Strike", "Strike", "Defend", "Defend", "Bash"];

type Phase =
  | "combat_open"
  | "combat_after_strike"
  | "combat_after_defend"
  | "reward"
  | "map"
  | "shop"
  | "shop_after_buy"
  | "boss_open"
  | "boss_after_bash"
  | "victory";

export class RuntimeEngine {
  private runId = `run-${Date.now()}`;
  private phase: Phase = "combat_open";
  private stepNo = 0;
  private busyReadsRemaining = 0;
  private autoslay = false;
  private summary: RunSummary = {
    facts: {},
    strategy: {},
    risks: {},
    events: []
  };

  health() {
    return {
      ok: true,
      bridge: "sts2-runtime-bridge",
      run_id: this.runId,
      port: Number(process.env.BRIDGE_PORT ?? 15526),
      autoslay: this.autoslay
    };
  }

  state(): GameState {
    if (this.busyReadsRemaining > 0) {
      this.busyReadsRemaining -= 1;
      return this.makeState("busy", [], "Animation resolving");
    }

    return this.stableState();
  }

  actions(): LegalAction[] {
    return this.state().legal_actions;
  }

  execute(actionId: string): ExecuteActionResponse {
    const state = this.stableState();
    const action = state.legal_actions.find((item) => item.action_id === actionId);

    if (!action) {
      return {
        status: "rejected",
        reason: `Unknown or currently illegal action_id: ${actionId}`,
        state
      };
    }

    this.summary.events.push({
      step_no: this.stepNo,
      event_type: action.action_type,
      summary: action.label,
      source: "system"
    });

    this.phase = this.nextPhase(actionId);
    this.stepNo += 1;
    this.busyReadsRemaining = this.phase === "victory" ? 0 : 1;

    return {
      status: "accepted",
      action,
      state: this.state()
    };
  }

  getSummary() {
    this.syncFacts();
    return this.summary;
  }

  updateSummary(diff: Record<string, unknown>) {
    this.summary.events.push({
      step_no: this.stepNo,
      event_type: "summary_diff",
      summary: JSON.stringify(diff),
      source: "model"
    });

    this.summary.strategy = {
      ...this.summary.strategy,
      ...(diff.strategy && typeof diff.strategy === "object" ? diff.strategy : {})
    };

    this.summary.risks = {
      ...this.summary.risks,
      ...(diff.risks && typeof diff.risks === "object" ? diff.risks : {})
    };

    return this.getSummary();
  }

  startAutoslay() {
    this.autoslay = true;
    return { ok: true, autoslay: true };
  }

  stopAutoslay() {
    this.autoslay = false;
    return { ok: true, autoslay: false };
  }

  private stableState(): GameState {
    switch (this.phase) {
      case "combat_open":
        return this.makeState("combat", [
          action("play_strike_louse", "play_card", "打出 Strike", "对酸液史莱姆造成 6 点伤害。", "low", { target_id: "louse" }),
          action("play_defend", "play_card", "打出 Defend", "获得 5 点格挡。", "low"),
          action("end_turn", "end_turn", "结束回合", "敌人将造成 5 点伤害，结束前需要确认防御。", "high")
        ]);
      case "combat_after_strike":
        return this.makeState("combat", [
          action("play_defend", "play_card", "打出 Defend", "获得 5 点格挡，覆盖本回合伤害。", "low"),
          action("end_turn", "end_turn", "结束回合", "当前格挡不足时存在掉血风险。", "high")
        ]);
      case "combat_after_defend":
        return this.makeState("combat", [
          action("end_turn", "end_turn", "结束回合", "格挡足够，结束回合进入奖励页。", "high")
        ]);
      case "reward":
        return this.makeState("reward", [
          action("choose_reward_inflame", "choose_reward", "选择 Inflame", "补强力量成长，符合 Ironclad 方向。", "low"),
          action("skip_reward", "skip_reward", "跳过奖励", "跳过当前关键成长牌。", "high")
        ]);
      case "map":
        return this.makeState("map", [
          action("choose_safe_route", "choose_map_node", "选择安全路线", "保留血量，进入商店。", "low"),
          action("choose_elite_route", "choose_elite_route", "选择精英路线", "收益更高但当前防御偏弱。", "high")
        ]);
      case "shop":
        return this.makeState("shop", [
          action("buy_card_draw", "buy_item", "购买 Battle Trance", "补充过牌能力。", "medium", { cost: 75 }),
          action("remove_strike", "remove_card", "删除 Strike", "优化牌组，但会消耗大部分金币。", "high", { cost: 90 }),
          action("leave_shop", "leave_shop", "离开商店", "保留金币前往 Boss。", "low")
        ]);
      case "shop_after_buy":
        return this.makeState("shop", [
          action("leave_shop", "leave_shop", "离开商店", "过牌已补足，进入 Boss。", "low")
        ]);
      case "boss_open":
        return this.makeState("combat", [
          action("play_bash_boss", "play_card", "对 Boss 打出 Bash", "施加易伤，准备爆发。", "low", { target_id: "guardian" }),
          action("end_turn", "end_turn", "结束回合", "Boss 即将造成 18 点伤害，高风险。", "fatal")
        ]);
      case "boss_after_bash":
        return this.makeState("combat", [
          action("play_heavy_blade", "play_card", "打出 Heavy Blade", "利用力量和易伤斩杀 Boss。", "low", { target_id: "guardian" }),
          action("end_turn", "end_turn", "结束回合", "不斩杀会吃 18 点伤害。", "fatal")
        ]);
      case "victory":
        return this.makeState("victory", [], "Victory");
      default:
        return this.makeState("not_ready", [], "Unknown phase");
    }
  }

  private makeState(stateType: GameState["state_type"], legalActions: LegalAction[], message?: string): GameState {
    const player = this.playerSnapshot();
    const enemies = stateType === "combat" ? this.enemySnapshot() : [];

    return {
      run_id: this.runId,
      step_no: this.stepNo,
      status: stateType === "busy" ? "busy" : stateType === "not_ready" ? "not_ready" : "stable",
      state_type: stateType,
      screen: stateType,
      state_fingerprint: `${this.phase}:${this.stepNo}:${legalActions.map((item) => item.action_id).join("|")}`,
      player,
      enemies,
      legal_actions: legalActions,
      is_game_over: stateType === "victory" || stateType === "defeat" || stateType === "game_over",
      outcome: stateType === "victory" ? "victory" : undefined,
      message
    };
  }

  private playerSnapshot() {
    const deck = [...baseDeck];
    if (["reward", "map", "shop", "shop_after_buy", "boss_open", "boss_after_bash", "victory"].includes(this.phase)) {
      deck.push("Inflame");
    }
    if (["shop_after_buy", "boss_open", "boss_after_bash", "victory"].includes(this.phase)) {
      deck.push("Battle Trance");
    }

    return {
      hp: ["boss_open", "boss_after_bash", "victory"].includes(this.phase) ? 58 : 68,
      maxHp: 80,
      block: this.phase === "combat_after_defend" ? 5 : 0,
      energy: 3,
      gold: ["shop_after_buy", "boss_open", "boss_after_bash", "victory"].includes(this.phase) ? 35 : 110,
      deck,
      relics: ["Burning Blood", "Anchor"],
      potions: ["Fire Potion"]
    };
  }

  private enemySnapshot() {
    if (["boss_open", "boss_after_bash"].includes(this.phase)) {
      return [{ id: "guardian", name: "Guardian", hp: this.phase === "boss_after_bash" ? 18 : 46, intent: "Attack", incomingDamage: 18 }];
    }
    return [{ id: "louse", name: "Acid Louse", hp: this.phase === "combat_open" ? 12 : 6, intent: "Attack", incomingDamage: 5 }];
  }

  private nextPhase(actionId: string): Phase {
    const transitions: Record<string, Phase> = {
      play_strike_louse: "combat_after_strike",
      play_defend: "combat_after_defend",
      end_turn: this.phase === "combat_after_defend" ? "reward" : this.phase,
      choose_reward_inflame: "map",
      skip_reward: "map",
      choose_safe_route: "shop",
      choose_elite_route: "shop",
      buy_card_draw: "shop_after_buy",
      remove_strike: "shop_after_buy",
      leave_shop: "boss_open",
      play_bash_boss: "boss_after_bash",
      play_heavy_blade: "victory"
    };
    return transitions[actionId] ?? this.phase;
  }

  private syncFacts() {
    const state = this.stableState();
    this.summary.facts = {
      deck: state.player.deck,
      relics: state.player.relics,
      hp: { current: state.player.hp, max: state.player.maxHp },
      gold: state.player.gold,
      phase: this.phase,
      source_step: state.step_no,
      source: "bridge"
    };
  }
}

function action(
  action_id: string,
  action_type: string,
  label: string,
  description: string,
  risk: LegalAction["risk"],
  metadata?: Record<string, unknown>
): LegalAction {
  return { action_id, action_type, label, description, risk, metadata };
}
