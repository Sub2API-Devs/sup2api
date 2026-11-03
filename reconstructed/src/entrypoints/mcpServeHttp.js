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
import { StreamableHTTPServerTransport } from "../../vendor/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.js";
import { setMcpServeSession, EMPTY_SESSION_NAME } from "../services/analytics/metadata.js";
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
import { bridgeHostState } from "../bridge/bridgeHostState.js";
import { credentialsStoreFor } from "../utils/secureStorage/credentialsFileStore.js";
import {
  refreshSkillsSyncVeto,
  isSkillsSyncActive,
  isPluginsSyncActive,
  startFirstPluginsSync,
} from "../utils/claudeAiSync/skillsSync.js";
import { startSkillSyncAndResync } from "../services/skillsSync/skillsSync.js";
import { refreshSyncVeto } from "../services/plugins/accountSync/syncedPluginHooks.js";
import { ensureSettingsInstall } from "../services/remoteTools/commandRendering.js";
import { setupPluginHookHotReload } from "../utils/plugins/loadPluginHooks.js";
import { isLoopbackHost } from "../utils/localhost.js";

//@ chunk-k26nnqnx.js:26139-26157 placement
var LOOPBACK_HOST = "127.0.0.1";
//@ chunk-k26nnqnx.js:26157-27736 placement
/**
 * `mcp serve --transport http`：起本地 HTTP MCP 服务，校验 ≥32 字符的 auth token。
 */
async function startMcpHttpServer({
  port,
  debug,
  verbose,
  session,
  storageV5,
  resultFormat = "raw",
  launchSettings,
  workspaceRoot,
  authToken = randomBytes(32).toString("hex"),
}) {
  if (authToken.length < 32) throw Error("auth token must be at least 32 characters");
  let p = `Bearer ${authToken}`;
  let m;
  let server = createServer((h, y) => {
    if (!isLoopbackHostHeader(h.headers.host) || h.headers.origin !== undefined) {
      y.writeHead(403).end();
      return;
    }
    if (h.method === "GET" && h.url === "/health") {
      y.writeHead(200, {
        "Content-Type": "application/json",
      });
      y.end('{"status":"ok"}');
      return;
    }
    if (!timingSafeEqualStrings(h.headers.authorization, p)) {
      y.writeHead(401).end();
      return;
    }
    (async () => {
      if (h.method === "POST" && h.headers["mcp-session-id"] === undefined) await m?.transport.close();
      if (m === undefined) {
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
          transport: new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
          }),
        };
        g.transport.onclose = () => {
          if (m === g) {
            m = undefined;
            setMcpServeSession(session.host, EMPTY_SESSION_NAME);
          }
        };
        m = g;
        await g.server.connect(g.transport);
      }
      let abortController = new AbortController();
      y.once("close", () => {
        if (!y.writableFinished) abortController.abort();
      });
      Object.assign(h, {
        auth: {
          token: "",
          clientId: "",
          scopes: [],
          extra: {
            [CALLER_GONE_SIGNAL]: abortController.signal,
          },
        },
      });
      await m.transport.handleRequest(h, y);
    })().catch((error) => {
      logForDebugging(`mcp serve http: handleRequest failed: ${error}`, {
        level: "error",
      });
      if (!y.headersSent) y.writeHead(500);
      y.end();
    });
  });
  let L = new Set();
  server.on("connection", (h) => {
    L.add(h);
    h.once("close", () => L.delete(h));
  });
  let promise = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, LOOPBACK_HOST, () => {
      server.removeListener("error", reject);
      let S = server.address();
      resolve(typeof S === "object" && S !== null ? S.port : port);
    });
  });
  server.on("error", logError);
  return {
    boundPort: promise,
    url: `http://${LOOPBACK_HOST}:${promise}/`,
    authToken,
    close: async () => {
      await m?.server.close();
      for (let h of L) h.destroy();
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
//@ chunk-k26nnqnx.js:27736-28834 placement
async function runMcpServe(e, r) {
  let { launcher } = r;
  startServedCpuMeter(getRootSession().host, launcher.kind);
  setCwd(e);
  getRepoCheckouts();
  env.unset("CLAUDE_CODE_SYNC_PLUGIN_INSTALL");
  let { authToken, tunnel } = handedOverBy(launcher);
  let a = tunnel === undefined ? undefined : await import("./chunk-e6a6pbbv.js");
  keepBackgroundCommandRecords(getRootSession().host, launcher.kind);
  let c = await startMcpHttpServer({
    ...r,
    session: getRootSession(),
    authToken,
  }).catch((error) => {
    throw a && getErrnoCode(error) === "EADDRINUSE"
      ? new a.ToolServerPortTakenError(errorMessage(error))
      : error;
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
      if (launcher.tunnel.file_upload_path !== undefined)
        bridgeHostState().sessionUploadRoute = {
          url: launcher.tunnel.api_base_url + launcher.tunnel.file_upload_path,
          token: launcher.tunnel.session_token,
        };
      await startTunnelWithCleanup(c, launcher.tunnel);
      break;
    case "runner": {
      await startTunnelWithCleanup(c, launcher.tunnel);
      let { exitWhenRunnerIsGone, tellRunnerStartupIsDone } = await import("./chunk-66nm9g6r.js");
      exitWhenRunnerIsGone(launcher.runner);
      tellRunnerStartupIsDone();
      break;
    }
  }
  logForDebugging(`mcp serve --transport http listening on ${c.url}`);
  let rootSession = getRootSession();
  let f = credentialsStoreFor(r.storageV5);
  refreshSkillsSyncVeto();
  if (isSkillsSyncActive(rootSession)) startSkillSyncAndResync(rootSession, r.storageV5, f);
  refreshSyncVeto();
  if (isPluginsSyncActive(rootSession)) startFirstPluginsSync(rootSession, f);
  ensureSettingsInstall(rootSession, r.storageV5, f)
    .then(() => setupPluginHookHotReload(r.storageV5, f))
    .catch(logError);
}
//@ chunk-k26nnqnx.js:28834-28950 placement
async function startTunnelWithCleanup(e, tunnel) {
  let { startSessionTunnel } = await import("./chunk-e6a6pbbv.js");
  let sessionTunnel = startSessionTunnel(e, tunnel);
  registerCleanup(async () => sessionTunnel.stop());
}
//@ chunk-k26nnqnx.js:28950-29073 placement
function isLoopbackHostHeader(host) {
  if (host === undefined || /[\s@/?#\\]/.test(host)) return false;
  try {
    return isLoopbackHost(new URL(`http://${host}`).hostname);
  } catch {
    return false;
  }
}
