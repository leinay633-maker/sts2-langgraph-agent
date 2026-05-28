using Sts2LangGraphAgent.Bridge.Core;
using Xunit;

namespace Sts2LangGraphAgent.Bridge.Tests;

public sealed class StabilityGuardTests
{
    [Fact]
    public void SampleAdapterStartsStable()
    {
        var adapter = new SampleGameAdapter();
        var guard = new StabilityGuard();
        Assert.True(guard.IsStable(adapter.ReadState()));
    }

    [Fact]
    public void ActionResolverRejectsUnknownAction()
    {
        var adapter = new SampleGameAdapter();
        var resolver = new ActionResolver(adapter, new StabilityGuard());
        var response = resolver.ExecuteIfLegal("missing");
        Assert.Equal("rejected", response.Status);
    }
}
