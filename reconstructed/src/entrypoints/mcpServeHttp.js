/**
 * entrypoints/mcpServeHttp.ts
 *
 * 2.1.316 新增：mcp serve --transport http：本地 HTTP MCP 服务与 auth token 校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-k26nnqnx.js (5)
 * attribution: placement 5
 */
import { randomBytes, randomUUID } from "crypto";
import { createServer } from "http";
import { timingSafeEqualStrings } from "../utils/sessionRecords.js";
import { createMCPServer, CALLER_GONE_SIGNAL } from "./mcp.js";
import { M } from "../../vendor/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js";
import { setMcpServeSession, V8t } from "../services/analytics/metadata.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { startServedCpuMeter } from "./mcpServe/cpuReport.js";
import { getRootSession } from "../bootstrap/state.js";
import { setCwd } from "../utils/Shell.js";
import { getRepoCheckouts } from "../utils/git/repoCheckouts.js";
import { env } from "../utils/env.js";
import { handedOverBy } from "./mcpServe/sessionTunnelLauncher.js";
import { keepBackgroundCommandRecords } from "../services/mcpServe/readCalls.js";
import { getErrnoCode, errorMessage } from "../utils/errors.js";
import { registerCleanup } from "../utils/cleanupRegistry.js";
import { ao } from "../bridge/bridgeHostState.js";
import { credentialsStoreFor } from "../utils/secureStorage/credentialsFileStore.js";
import { eN, Zoe, Jbt, bet } from "../utils/claudeAiSync/skillsSync.js";
import { lLe } from "../services/skillsSync/skillsSync.js";
import { sJ } from "../services/plugins/accountSync/syncedPluginHooks.js";
import { ensureSettingsInstall } from "../services/remoteTools/commandRendering.js";
import { setupPluginHookHotReload } from "../utils/plugins/loadPluginHooks.js";
import { pw } from "../utils/localhost.js";

//@ chunk-k26nnqnx.js:26139-26157 placement
var Z = "127.0.0.1";
/**
 * `mcp serve --transport http`：起本地 HTTP MCP 服务，校验 ≥32 字符的 auth token。
 */
//@ chunk-k26nnqnx.js:26157-27736 placement
async function startMcpHttpServer({
  port: port,
  debug: debug,
  verbose: verbose,
  session: session,
  storageV5: storageV5,
  resultFormat: resultFormat = "raw",
  launchSettings: launchSettings,
  workspaceRoot: workspaceRoot,
  authToken: authToken = randomBytes(32).toString("hex"),
}) {
  if (authToken.length < 32) throw Error("auth token must be at least 32 characters");
  let p = `Bearer ${authToken}`,
    m,
    b = createServer((h, y) => {
      if (!isLoopbackHostHeader(h.headers.host) || h.headers.origin !== void 0) {
        y.writeHead(403).end();
        return;
      }
      if (h.method === "GET" && h.url === "/health") {
        (y.writeHead(200, { "Content-Type": "application/json" }), y.end('{"status":"ok"}'));
        return;
      }
      if (!timingSafeEqualStrings(h.headers.authorization, p)) {
        y.writeHead(401).end();
        return;
      }
      (async () => {
        if (h.method === "POST" && h.headers["mcp-session-id"] === void 0) await m?.transport.close();
        if (m === void 0) {
          let g = {
            server: createMCPServer(
              debug,
              verbose,
              session,
              "http",
              storageV5,
              resultFormat,
              launchSettings,
              workspaceRoot,
            ),
            transport: new M({ sessionIdGenerator: () => randomUUID() }),
          };
          ((g.transport.onclose = () => {
            if (m === g) ((m = void 0), setMcpServeSession(session.host, V8t));
          }),
            (m = g),
            await g.server.connect(g.transport));
        }
        let abortController = new AbortController();
        (y.once("close", () => {
          if (!y.writableFinished) abortController.abort();
        }),
          Object.assign(h, {
            auth: {
              token: "",
              clientId: "",
              scopes: [],
              extra: { [CALLER_GONE_SIGNAL]: abortController.signal },
            },
          }),
          await m.transport.handleRequest(h, y));
      })().catch((S) => {
        if (
          (logForDebugging(`mcp serve http: handleRequest failed: ${S}`, { level: "error" }), !y.headersSent)
        )
          y.writeHead(500);
        y.end();
      });
    }),
    L = new Set();
  b.on("connection", (h) => {
    (L.add(h), h.once("close", () => L.delete(h)));
  });
  let promise = await new Promise((h, y) => {
    (b.once("error", y),
      b.listen(port, Z, () => {
        b.removeListener("error", y);
        let address = b.address();
        h(typeof address === "object" && address !== null ? address.port : port);
      }));
  });
  return (
    b.on("error", logError),
    {
      boundPort: promise,
      url: `http://${Z}:${promise}/`,
      authToken: authToken,
      close: async () => {
        await m?.server.close();
        for (let h of L) h.destroy();
        await new Promise((h) => b.close(() => h()));
      },
    }
  );
}
//@ chunk-k26nnqnx.js:27736-28834 placement
async function runMcpServe(e, r) {
  let { launcher: launcher } = r;
  (startServedCpuMeter(getRootSession().host, launcher.kind),
    setCwd(e),
    getRepoCheckouts(),
    env.unset("CLAUDE_CODE_SYNC_PLUGIN_INSTALL"));
  let { authToken: authToken, tunnel: tunnel } = handedOverBy(launcher),
    a = tunnel === void 0 ? void 0 : await import("./chunk-e6a6pbbv.js");
  keepBackgroundCommandRecords(getRootSession().host, launcher.kind);
  let c = await startMcpHttpServer({ ...r, session: getRootSession(), authToken: authToken }).catch((p) => {
    throw a && getErrnoCode(p) === "EADDRINUSE" ? new a.ToolServerPortTakenError(errorMessage(p)) : p;
  });
  switch (
    (registerCleanup(c.close),
    process.stdout.write(`MCP server listening on ${c.url}
`),
    launcher.kind)
  ) {
    case "stdout-reader":
      process.stdout.write(`MCP server auth token: ${c.authToken}
`);
      break;
    case "bearer-minter":
      break;
    case "tool-container":
      if (launcher.tunnel.file_upload_path !== void 0)
        ao().sessionUploadRoute = {
          url: launcher.tunnel.api_base_url + launcher.tunnel.file_upload_path,
          token: launcher.tunnel.session_token,
        };
      await startTunnelWithCleanup(c, launcher.tunnel);
      break;
    case "runner": {
      await startTunnelWithCleanup(c, launcher.tunnel);
      let { exitWhenRunnerIsGone: exitWhenRunnerIsGone, tellRunnerStartupIsDone: tellRunnerStartupIsDone } =
        await import("./chunk-66nm9g6r.js");
      (exitWhenRunnerIsGone(launcher.runner), tellRunnerStartupIsDone());
      break;
    }
  }
  logForDebugging(`mcp serve --transport http listening on ${c.url}`);
  let u = getRootSession(),
    f = credentialsStoreFor(r.storageV5);
  if ((eN(), Zoe(u))) lLe(u, r.storageV5, f);
  if ((sJ(), Jbt(u))) bet(u, f);
  ensureSettingsInstall(u, r.storageV5, f)
    .then(() => setupPluginHookHotReload(r.storageV5, f))
    .catch(logError);
}
//@ chunk-k26nnqnx.js:28834-28950 placement
async function startTunnelWithCleanup(e, r) {
  let { startSessionTunnel: startSessionTunnel } = await import("./chunk-e6a6pbbv.js"),
    o = startSessionTunnel(e, r);
  registerCleanup(async () => o.stop());
}
//@ chunk-k26nnqnx.js:28950-29073 placement
function isLoopbackHostHeader(e) {
  if (e === void 0 || /[\s@/?#\\]/.test(e)) return !1;
  try {
    return pw(new URL(`http://${e}`).hostname);
  } catch {
    return !1;
  }
}
