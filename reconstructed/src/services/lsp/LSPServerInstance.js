/**
 * services/lsp/LSPServerInstance.ts
 *
 * 单个 LSP 服务器实例的状态机：启动/initialize、workspace/configuration 应答、崩溃恢复与重启上限、带超时和 ContentModified 重试的请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/lsp/LSPServerInstance.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: sole-consumer 1, affinity 2, fingerprint 1
 */
import { pathToFileURL, pathToFileURL as pathToFileURL_2, pathToFileURL as pathToFileURL_3 } from "url";
import * as pathModule from "path";
import * as pathModule_2 from "path";
import * as pathModule_3 from "path";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { getProjectConfigRoot } from "../../bootstrap/state.js";
import { getCwd } from "../../utils/cwd.js";
import { withTimeout as withTimeout_2, sleep } from "../../utils/sleep.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * 按点号分隔的 section 路径从服务器 settings 里取子值，取不到返回 null；用于响应 workspace/configuration。
 */
//@ chunk-e6aww6q8.js:4626357-4626575 sole-consumer
function getConfigSection(settings, section) {
  if (settings == null) return null;
  if (section === void 0 || section === "") return settings;
  let current = settings;
  for (let s of section.split(".")) {
    if (current === null || typeof current !== "object" || !Object.prototype.hasOwnProperty.call(current, s))
      return null;
    current = current[s];
  }
  return current ?? null;
}
/**
 * LSP 请求重试常量：ContentModified 错误码 -32801、最多重试 3 次、退避基数 500ms、请求默认超时 60s。
 */
//@ chunk-e6aww6q8.js:4626575-4626614 affinity
var LSP_ERROR_CONTENT_MODIFIED = -32801,
  MAX_RETRIES_FOR_TRANSIENT_ERRORS = 3,
  RETRY_BASE_DELAY_MS = 500,
  DEFAULT_REQUEST_TIMEOUT_MS = 60000;
/**
 * 创建一个 LSP 服务器实例（状态机 stopped/starting/running/stopping/error）。start() 串行化并发启动、受 restartOnCrash/maxRestarts 约束；启动时注册 workspace/configuration（按 settings 回答）、忽略 client/registerCapability，发 initialize（clientInfo "Claude Code"+版本，声明 hover/definition/references/documentSymbol/callHierarchy/publishDiagnostics 能力），有 settings 时推 workspace/didChangeConfiguration。sendRequest 对 ContentModified 指数退避重试并带 requestTimeout。各步骤上报 lsp_server_start/lsp_request 等健康指标。
 */
//@ chunk-e6aww6q8.js:4626614-4632777 fingerprint = createLSPServerInstance (0.717)
function createLSPServerInstance(name, config) {
  let { createLSPClient: createLSPClient } = require("./chunk-t4ksmxzx.js"),
    state = "stopped",
    lastError,
    restartCount = 0,
    crashRecoveryCount = 0,
    maxCrashLogged = !1,
    startPromise,
    client = createLSPClient(name, (error) => {
      ((state = "error"),
        (lastError = error),
        crashRecoveryCount++,
        logFeatureSad(
          "lsp_server_start",
          error.oomKilledInToolCgroup === !0 ? "lsp_server_oom_killed_tool_cgroup" : "lsp_server_crashed",
        ));
    });
  async function start() {
    while (startPromise) await startPromise.catch(() => {});
    if (state === "running" || state === "starting") return;
    let We = doStart();
    return (
      (startPromise = We.finally(() => {
        startPromise = void 0;
      })),
      startPromise.catch(() => {}),
      We
    );
  }
  async function doStart() {
    if (state === "error" && crashRecoveryCount > 0 && config.restartOnCrash === !1)
      throw lastError ?? Error(`LSP server '${name}' crashed (restartOnCrash is false)`);
    let maxRestarts = config.maxRestarts ?? 3;
    if (state === "error" && crashRecoveryCount > maxRestarts) {
      if (!maxCrashLogged)
        ((maxCrashLogged = !0),
          (lastError = Error(
            `LSP server '${name}' exceeded max crash recovery attempts (${maxRestarts})` +
              (lastError ? `; last crash: ${lastError.message}` : ""),
          )),
          logForDebugging(lastError.message, { level: "error" }),
          logFeatureBad("lsp_server_start", "lsp_server_max_crash_recovery"));
      throw lastError;
    }
    let initializePromise,
      crashCountAtStart = crashRecoveryCount;
    try {
      ((state = "starting"),
        logForDebugging(`Starting LSP server instance: ${name}`),
        await client.start(config.command, config.args || [], {
          env: config.env,
          cwd: getProjectConfigRoot() ?? config.workspaceFolder,
          ...(config.pluginSource !== void 0 && { pluginId: config.pluginSource }),
        }),
        client.onRequest(
          "workspace/configuration",
          (Et) => (
            logForDebugging(
              `LSP: Received workspace/configuration request from ${name} for sections: ${Et.items.map((item) => item.section ?? "<root>").join(", ")}`,
            ),
            Et.items.map((item) => getConfigSection(config.settings, item.section))
          ),
        ),
        client.onRequest(
          "client/registerCapability",
          (Et) => (
            logForDebugging(
              `LSP: Ignoring client/registerCapability from ${name} for: ${describeRegistrations(Et?.registrations)}`,
            ),
            null
          ),
        ),
        client.onRequest(
          "client/unregisterCapability",
          (Et) => (
            logForDebugging(
              `LSP: Ignoring client/unregisterCapability from ${name} for: ${describeRegistrations(Et?.unregisterations)}`,
            ),
            null
          ),
        ));
      let workspaceFolder = config.workspaceFolder || getCwd(),
        workspaceUri = pathToFileURL_3(workspaceFolder).href,
        initializeParams = {
          processId: process.pid,
          clientInfo: {
            name: "Claude Code",
            version: {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
          },
          initializationOptions: config.initializationOptions ?? {},
          workspaceFolders: [{ uri: workspaceUri, name: pathModule_3.basename(workspaceFolder) }],
          rootPath: workspaceFolder,
          rootUri: workspaceUri,
          capabilities: {
            workspace: {
              configuration: config.settings != null,
              workspaceFolders: !1,
              didChangeWatchedFiles: { dynamicRegistration: !1 },
            },
            textDocument: {
              synchronization: { dynamicRegistration: !1, willSave: !1, willSaveWaitUntil: !1, didSave: !0 },
              publishDiagnostics: {
                relatedInformation: !0,
                tagSupport: { valueSet: [1, 2] },
                versionSupport: !1,
                codeDescriptionSupport: !0,
                dataSupport: !1,
              },
              hover: { dynamicRegistration: !1, contentFormat: ["markdown", "plaintext"] },
              definition: { dynamicRegistration: !1, linkSupport: !0 },
              references: { dynamicRegistration: !1 },
              documentSymbol: { dynamicRegistration: !1, hierarchicalDocumentSymbolSupport: !0 },
              callHierarchy: { dynamicRegistration: !1 },
            },
            general: { positionEncodings: ["utf-16"] },
          },
        };
      if (((initializePromise = client.initialize(initializeParams)), config.startupTimeout !== void 0))
        await withTimeout_2(
          initializePromise,
          config.startupTimeout,
          `LSP server '${name}' timed out after ${config.startupTimeout}ms during initialization`,
        );
      else await initializePromise;
      if (state !== "starting") throw lastError ?? Error("LSP server crashed during startup");
      if (((state = "running"), (crashRecoveryCount = 0), (maxCrashLogged = !1), config.settings != null))
        client
          .sendNotification("workspace/didChangeConfiguration", { settings: config.settings })
          .catch((Et) => {
            logForDebugging(
              `LSP: workspace/didChangeConfiguration push failed for ${name}: ${errorMessage(Et)}`,
              { level: "warn" },
            );
          });
      (logForDebugging(`LSP server instance started: ${name}`), logFeatureOk("lsp_server_start"));
    } catch (error) {
      if (
        (client.stop(config.shutdownTimeout ?? config.startupTimeout).catch(() => {}),
        initializePromise?.catch(() => {}),
        (state = "error"),
        (lastError = error),
        logForDebugging(`Failed to start LSP server '${name}': ${errorMessage(error)}`, { level: "error" }),
        crashRecoveryCount === crashCountAtStart)
      )
        logFeatureBad("lsp_server_start", "lsp_server_start_failed");
      throw error;
    }
  }
  async function stop() {
    if (state === "stopped" || state === "stopping") return;
    try {
      ((state = "stopping"),
        await client.stop(config.shutdownTimeout),
        (state = "stopped"),
        logForDebugging(`LSP server instance stopped: ${name}`),
        logFeatureOk("lsp_server_stop"));
    } catch (error) {
      throw (
        (state = "error"),
        (lastError = error),
        logForDebugging(`Failed to stop LSP server '${name}': ${errorMessage(error)}`, { level: "error" }),
        logFeatureSad("lsp_server_stop", "lsp_server_stop_failed"),
        error
      );
    }
  }
  async function restart() {
    try {
      await stop();
    } catch (error) {
      let lt = Error(`Failed to stop LSP server '${name}' during restart: ${errorMessage(error)}`);
      throw (
        logForDebugging(`Failed to stop LSP server '${name}' during restart: ${errorMessage(error)}`, {
          level: "error",
        }),
        lt
      );
    }
    restartCount++;
    let maxRestarts = config.maxRestarts ?? 3;
    if (restartCount > maxRestarts) {
      let ze = Error(`Max restart attempts (${maxRestarts}) exceeded for server '${name}'`);
      throw (logForDebugging(ze.message, { level: "error" }), ze);
    }
    try {
      await start();
    } catch (error) {
      let lt = Error(
        `Failed to start LSP server '${name}' during restart (attempt ${restartCount}/${maxRestarts}): ${errorMessage(error)}`,
      );
      throw (logForDebugging(lt.message, { level: "error" }), lt);
    }
  }
  function isHealthy() {
    return state === "running" && client.isInitialized;
  }
  async function sendRequest(method, params) {
    if (!isHealthy()) {
      let Et = Error(
        `Cannot send request to LSP server '${name}': server is ${state}${lastError ? `, last error: ${lastError.message}` : ""}`,
      );
      throw (
        logForDebugging(
          `Cannot send request to LSP server '${name}': server is ${state}${lastError ? `, last error: ${lastError.message}` : ""}`,
          { level: "error" },
        ),
        logFeatureBad("lsp_request", "lsp_server_unavailable"),
        Et
      );
    }
    let lastRequestError,
      requestTimeoutMs = config.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT_MS,
      timeoutMessage = `no response after ${requestTimeoutMs}ms`;
    for (let attempt = 0; attempt <= MAX_RETRIES_FOR_TRANSIENT_ERRORS; attempt++)
      try {
        let yt = await withTimeout_2(client.sendRequest(method, params), requestTimeoutMs, timeoutMessage);
        return (logFeatureOk("lsp_request"), yt);
      } catch (error) {
        lastRequestError = error;
        let errorCode = error.code;
        if (
          typeof errorCode === "number" &&
          errorCode === LSP_ERROR_CONTENT_MODIFIED &&
          attempt < MAX_RETRIES_FOR_TRANSIENT_ERRORS
        ) {
          let delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          (logForDebugging(
            `LSP request '${method}' to '${name}' got ContentModified error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES_FOR_TRANSIENT_ERRORS})\u2026`,
          ),
            await sleep(delay));
          continue;
        }
        break;
      }
    let merged = Object.assign(
      Error(
        `LSP request '${method}' failed for server '${name}': ${lastRequestError?.message ?? "unknown error"}`,
        { cause: lastRequestError },
      ),
      { code: lastRequestError?.code },
    );
    throw (
      logForDebugging(merged.message, { level: "error" }),
      logFeatureBad(
        "lsp_request",
        lastRequestError?.message === timeoutMessage ? "lsp_request_timeout" : "lsp_request_failed",
      ),
      merged
    );
  }
  async function sendNotification(method, params) {
    if (!isHealthy()) {
      let lt = Error(`Cannot send notification to LSP server '${name}': server is ${state}`);
      throw (
        logForDebugging(`Cannot send notification to LSP server '${name}': server is ${state}`, {
          level: "error",
        }),
        lt
      );
    }
    try {
      await client.sendNotification(method, params);
    } catch (error) {
      let Je = Error(`LSP notification '${method}' failed for server '${name}': ${errorMessage(error)}`);
      throw (logForDebugging(Je.message, { level: "error" }), Je);
    }
  }
  function onNotification(method, handler) {
    client.onNotification(method, handler);
  }
  function onRequest(method, handler) {
    client.onRequest(method, handler);
  }
  return {
    name: name,
    config: config,
    get state() {
      return state;
    },
    get lastError() {
      return lastError;
    },
    get restartCount() {
      return restartCount;
    },
    start: start,
    stop: stop,
    restart: restart,
    isHealthy: isHealthy,
    sendRequest: sendRequest,
    sendNotification: sendNotification,
    onNotification: onNotification,
    onRequest: onRequest,
  };
}
/**
 * 把 client/(un)registerCapability 请求里的 registrations 列成 method 名串，供日志使用。
 */
//@ chunk-e6aww6q8.js:4632777-4632970 affinity
function describeRegistrations(registrations) {
  if (!Array.isArray(registrations) || registrations.length === 0) return "<none>";
  return registrations
    .map((registration) =>
      typeof registration === "object" &&
      registration !== null &&
      "method" in registration &&
      typeof registration.method === "string"
        ? registration.method
        : "<malformed>",
    )
    .join(", ");
}

export { createLSPServerInstance };
