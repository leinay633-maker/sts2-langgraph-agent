using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Sts2LangGraphAgent.Bridge.Core;

public sealed class HttpBridgeServer : IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = true
    };

    private readonly HttpListener _listener = new();
    private readonly IGameAdapter _adapter;
    private readonly ActionResolver _actionResolver;
    private CancellationTokenSource? _cts;

    public HttpBridgeServer(IGameAdapter adapter, int port)
    {
        _adapter = adapter;
        _actionResolver = new ActionResolver(adapter, new StabilityGuard());
        _listener.Prefixes.Add($"http://127.0.0.1:{port}/");
    }

    public void Start()
    {
        _cts = new CancellationTokenSource();
        _listener.Start();
        _ = Task.Run(() => Loop(_cts.Token));
    }

    public void Dispose()
    {
        _cts?.Cancel();
        if (_listener.IsListening) _listener.Stop();
        _listener.Close();
    }

    private async Task Loop(CancellationToken token)
    {
        while (!token.IsCancellationRequested && _listener.IsListening)
        {
            var context = await _listener.GetContextAsync();
            _ = Task.Run(() => Handle(context), token);
        }
    }

    private async Task Handle(HttpListenerContext context)
    {
        try
        {
            var path = context.Request.Url?.AbsolutePath ?? "/";
            var method = context.Request.HttpMethod;

            if (method == "GET" && path == "/health")
            {
                await Json(context, new { ok = true, bridge = "sts2-csharp-bridge", run_id = _adapter.RunId, autoslay = _adapter.IsAutoslayRunning });
                return;
            }

            if (method == "GET" && path == "/state")
            {
                await Json(context, _adapter.ReadState());
                return;
            }

            if (method == "GET" && path == "/actions")
            {
                await Json(context, _adapter.ListLegalActions());
                return;
            }

            if (method == "POST" && path == "/execute")
            {
                var request = await ReadJson<ExecuteActionRequest>(context);
                await Json(context, _actionResolver.ExecuteIfLegal(request?.ActionId ?? ""));
                return;
            }

            if (method == "GET" && path == "/summary")
            {
                await Json(context, _adapter.ReadSummary());
                return;
            }

            if (method == "POST" && path == "/summary")
            {
                var diff = await ReadJson<Dictionary<string, object?>>(context) ?? new Dictionary<string, object?>();
                await Json(context, _adapter.UpdateSummary(diff));
                return;
            }

            if (method == "POST" && path == "/automation/start_autoslay")
            {
                _adapter.StartAutoslay();
                await Json(context, new { ok = true, autoslay = true });
                return;
            }

            if (method == "POST" && path == "/automation/stop_autoslay")
            {
                _adapter.StopAutoslay();
                await Json(context, new { ok = true, autoslay = false });
                return;
            }

            context.Response.StatusCode = 404;
            await Json(context, new { error = "not_found", path });
        }
        catch (Exception ex)
        {
            context.Response.StatusCode = 500;
            await Json(context, new { error = "internal_error", message = ex.Message });
        }
    }

    private static async Task<T?> ReadJson<T>(HttpListenerContext context)
    {
        using var reader = new StreamReader(context.Request.InputStream, context.Request.ContentEncoding);
        var raw = await reader.ReadToEndAsync();
        return string.IsNullOrWhiteSpace(raw) ? default : JsonSerializer.Deserialize<T>(raw, JsonOptions);
    }

    private static async Task Json(HttpListenerContext context, object value)
    {
        var raw = JsonSerializer.Serialize(value, JsonOptions);
        var bytes = Encoding.UTF8.GetBytes(raw);
        context.Response.ContentType = "application/json; charset=utf-8";
        context.Response.ContentLength64 = bytes.Length;
        await context.Response.OutputStream.WriteAsync(bytes);
        context.Response.Close();
    }
}
