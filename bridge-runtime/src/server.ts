import http from "node:http";
import { URL } from "node:url";
import { RuntimeEngine } from "./scenario.js";

const port = Number(process.env.BRIDGE_PORT ?? 15526);
const host = process.env.BRIDGE_HOST ?? "127.0.0.1";
const engine = new RuntimeEngine();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? `${host}:${port}`}`);

    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, engine.health());
    }

    if (req.method === "GET" && url.pathname === "/state") {
      return json(res, 200, engine.state());
    }

    if (req.method === "GET" && url.pathname === "/actions") {
      return json(res, 200, engine.actions());
    }

    if (req.method === "POST" && url.pathname === "/execute") {
      const body = await readJson(req);
      return json(res, 200, engine.execute(String(body.action_id ?? "")));
    }

    if (req.method === "GET" && url.pathname === "/summary") {
      return json(res, 200, engine.getSummary());
    }

    if (req.method === "POST" && url.pathname === "/summary") {
      const body = await readJson(req);
      const diff = typeof body.diff === "object" && body.diff !== null ? (body.diff as Record<string, unknown>) : body;
      return json(res, 200, engine.updateSummary(diff));
    }

    if (req.method === "POST" && url.pathname === "/automation/start_autoslay") {
      return json(res, 200, engine.startAutoslay());
    }

    if (req.method === "POST" && url.pathname === "/automation/stop_autoslay") {
      return json(res, 200, engine.stopAutoslay());
    }

    return json(res, 404, { error: "not_found", path: url.pathname });
  } catch (error) {
    return json(res, 500, {
      error: "internal_error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(port, host, () => {
  console.error(`[bridge-runtime] listening on http://${host}:${port}`);
});

function json(res: http.ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data, null, 2));
}

function readJson(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
