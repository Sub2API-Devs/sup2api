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
  let expectedAuth = `Bearer ${authToken}`;
  let current;
  let server = createServer((req, res) => {
    if (!isLoopbackHostHeader(req.headers.host) || req.headers.origin !== undefined) {
      res.writeHead(403).end();
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, {
        "Content-Type": "application/json",
      });
      res.end('{"status":"ok"}');
      return;
    }
    if (!timingSafeEqualStrings(req.headers.authorization, expectedAuth)) {
      res.writeHead(401).end();
      return;
    }
    (async () => {
      if (req.method === "POST" && req.headers["mcp-session-id"] === undefined)
        await current?.transport.close();
      if (current === undefined) {
        let session_ = {
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
        session_.transport.onclose = () => {
          if (current === session_) {
            current = undefined;
            setMcpServeSession(session.host, EMPTY_SESSION_NAME);
          }
        };
        current = session_;
        await session_.server.connect(session_.transport);
      }
      let abortController = new AbortController();
      res.once("close", () => {
        if (!res.writableFinished) abortController.abort();
      });
      Object.assign(req, {
        auth: {
          token: "",
          clientId: "",
          scopes: [],
          extra: {
            [CALLER_GONE_SIGNAL]: abortController.signal,
          },
        },
      });
      await current.transport.handleRequest(req, res);
    })().catch((error) => {
      logForDebugging(`mcp serve http: handleRequest failed: ${error}`, {
        level: "error",
      });
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
  });
  let sockets = new Set();
  server.on("connection", (socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  let promise = await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, LOOPBACK_HOST, () => {
      server.removeListener("error", reject);
      let address = server.address();
      resolve(typeof address === "object" && address !== null ? address.port : port);
    });
  });
  server.on("error", logError);
  return {
    boundPort: promise,
    url: `http://${LOOPBACK_HOST}:${promise}/`,
    authToken,
    close: async () => {
      await current?.server.close();
      for (let socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(() => resolve()));
    },
  };
}
//@ chunk-k26nnqnx.js:27736-28834 placement
async function runMcpServe(cwd, options) {
  let { launcher } = options;
  startServedCpuMeter(getRootSession().host, launcher.kind);
  setCwd(cwd);
  getRepoCheckouts();
  env.unset("CLAUDE_CODE_SYNC_PLUGIN_INSTALL");
  let { authToken, tunnel } = handedOverBy(launcher);
  let tunnelModule = tunnel === undefined ? undefined : await import("../cli/handlers/EX_CONFIG.lazy.js");
  keepBackgroundCommandRecords(getRootSession().host, launcher.kind);
  let server = await startMcpHttpServer({
    ...options,
    session: getRootSession(),
    authToken,
  }).catch((error) => {
    throw tunnelModule && getErrnoCode(error) === "EADDRINUSE"
      ? new tunnelModule.ToolServerPortTakenError(errorMessage(error))
      : error;
  });
  switch (
    (registerCleanup(server.close),
    process.stdout.write(`MCP server listening on ${server.url}
`),
    launcher.kind)
  ) {
    case "stdout-reader":
      process.stdout.write(`MCP server auth token: ${server.authToken}
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
      await startTunnelWithCleanup(server, launcher.tunnel);
      break;
    case "runner": {
      await startTunnelWithCleanup(server, launcher.tunnel);
      let { exitWhenRunnerIsGone, tellRunnerStartupIsDone } =
        await import("../selfHostedRunner/exitWhenRunnerIsGone.lazy.js");
      exitWhenRunnerIsGone(launcher.runner);
      tellRunnerStartupIsDone();
      break;
    }
  }
  logForDebugging(`mcp serve --transport http listening on ${server.url}`);
  let rootSession = getRootSession();
  let credentials = credentialsStoreFor(options.storageV5);
  refreshSkillsSyncVeto();
  if (isSkillsSyncActive(rootSession)) startSkillSyncAndResync(rootSession, options.storageV5, credentials);
  refreshSyncVeto();
  if (isPluginsSyncActive(rootSession)) startFirstPluginsSync(rootSession, credentials);
  ensureSettingsInstall(rootSession, options.storageV5, credentials)
    .then(() => setupPluginHookHotReload(options.storageV5, credentials))
    .catch(logError);
}
//@ chunk-k26nnqnx.js:28834-28950 placement
async function startTunnelWithCleanup(server, tunnel) {
  let { startSessionTunnel } = await import("../cli/handlers/EX_CONFIG.lazy.js");
  let sessionTunnel = startSessionTunnel(server, tunnel);
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
export { runMcpServe };
