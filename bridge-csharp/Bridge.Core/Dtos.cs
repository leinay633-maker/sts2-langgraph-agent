namespace Sts2LangGraphAgent.Bridge.Core;

public sealed record PlayerSnapshot(
    int Hp,
    int MaxHp,
    int Block,
    int Energy,
    int Gold,
    IReadOnlyList<string> Deck,
    IReadOnlyList<string> Relics,
    IReadOnlyList<string> Potions);

public sealed record EnemySnapshot(
    string Id,
    string Name,
    int Hp,
    string Intent,
    int IncomingDamage);

public sealed record LegalActionDto(
    string ActionId,
    string ActionType,
    string Label,
    string Description,
    string Risk,
    IReadOnlyDictionary<string, object?> Metadata);

public sealed record GameStateDto(
    string RunId,
    int StepNo,
    string Status,
    string StateType,
    string Screen,
    string StateFingerprint,
    PlayerSnapshot Player,
    IReadOnlyList<EnemySnapshot> Enemies,
    IReadOnlyList<LegalActionDto> LegalActions,
    bool IsGameOver,
    string? Outcome,
    string? Message);

public sealed record ExecuteActionRequest(string ActionId);

public sealed record ExecuteActionResponse(
    string Status,
    string? Reason,
    LegalActionDto? Action,
    GameStateDto? State);

public sealed record RunSummaryDto(
    IReadOnlyDictionary<string, object?> Facts,
    IReadOnlyDictionary<string, object?> Strategy,
    IReadOnlyDictionary<string, object?> Risks,
    IReadOnlyList<RunEventDto> Events);

public sealed record RunEventDto(int StepNo, string EventType, string Summary, string Source);
