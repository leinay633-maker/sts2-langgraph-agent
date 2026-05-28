namespace Sts2LangGraphAgent.Bridge.Core;

public sealed class StabilityGuard
{
    public bool IsStable(GameStateDto state)
    {
        if (state.Status is "busy" or "not_ready") return false;
        if (string.IsNullOrWhiteSpace(state.StateFingerprint)) return false;
        if (!state.IsGameOver && state.LegalActions.Count == 0) return false;
        return true;
    }

    public string Explain(GameStateDto state)
    {
        if (state.Status is "busy" or "not_ready") return state.Message ?? state.Status;
        if (string.IsNullOrWhiteSpace(state.StateFingerprint)) return "missing state fingerprint";
        if (!state.IsGameOver && state.LegalActions.Count == 0) return "no legal actions for non-terminal state";
        return "stable";
    }
}
