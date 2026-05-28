namespace Sts2LangGraphAgent.Bridge.Core;

public sealed class ActionResolver
{
    private readonly IGameAdapter _adapter;
    private readonly StabilityGuard _stabilityGuard;

    public ActionResolver(IGameAdapter adapter, StabilityGuard stabilityGuard)
    {
        _adapter = adapter;
        _stabilityGuard = stabilityGuard;
    }

    public ExecuteActionResponse ExecuteIfLegal(string actionId)
    {
        if (string.IsNullOrWhiteSpace(actionId))
        {
            return new ExecuteActionResponse("rejected", "action_id is required", null, _adapter.ReadState());
        }

        var state = _adapter.ReadState();
        if (!_stabilityGuard.IsStable(state))
        {
            return new ExecuteActionResponse("rejected", $"state is not stable: {_stabilityGuard.Explain(state)}", null, state);
        }

        var action = state.LegalActions.FirstOrDefault(item => item.ActionId == actionId);
        if (action is null)
        {
            return new ExecuteActionResponse("rejected", $"action_id is not currently legal: {actionId}", null, state);
        }

        return _adapter.ExecuteAction(actionId);
    }
}
