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
import { pathToFileURL } from "url";
import "path";
import * as pathModule_2 from "path";
import "path";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { getProjectConfigRoot } from "../../bootstrap/state.js";
import { getCwd } from "../../utils/cwd.js";
import { withTimeout as withTimeout_2, sleep } from "../../utils/sleep.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:4626357-4626575 sole-consumer
/**
 * 按点号分隔的 section 路径从服务器 settings 里取子值，取不到返回 null；用于响应 workspace/configuration。
 */
function getConfigSection(settings, section) {
  if (settings == null) return null;
  if (section === undefined || section === "") return settings;
  let current = settings;
  for (let segment of section.split(".")) {
    if (
      current === null ||
      typeof current !== "object" ||
      !Object.prototype.hasOwnProperty.call(current, segment)
    )
      return null;
    current = current[segment];
  }
  return current ?? null;
}
//@ chunk-e6aww6q8.js:4626575-4626614 affinity
/**
 * LSP 请求重试常量：ContentModified 错误码 -32801、最多重试 3 次、退避基数 500ms、请求默认超时 60s。
 */
var LSP_ERROR_CONTENT_MODIFIED = -32801;
var MAX_RETRIES_FOR_TRANSIENT_ERRORS = 3;
var RETRY_BASE_DELAY_MS = 500;
var DEFAULT_REQUEST_TIMEOUT_MS = 60000;
//@ chunk-e6aww6q8.js:4626614-4632777 fingerprint (2.1.88 match: createLSPServerInstance, 0.717)
/**
 * 创建一个 LSP 服务器实例（状态机 stopped/starting/running/stopping/error）。start() 串行化并发启动、受 restartOnCrash/maxRestarts 约束；启动时注册 workspace/configuration（按 settings 回答）、忽略 client/registerCapability，发 initialize（clientInfo "Claude Code"+版本，声明 hover/definition/references/documentSymbol/callHierarchy/publishDiagnostics 能力），有 settings 时推 workspace/didChangeConfiguration。sendRequest 对 ContentModified 指数退避重试并带 requestTimeout。各步骤上报 lsp_server_start/lsp_request 等健康指标。
 */
function createLSPServerInstance(name, config) {
  let { createLSPClient } = require("./LSPClient.js");
  let state = "stopped";
  let lastError;
  let restartCount = 0;
  let crashRecoveryCount = 0;
  let maxCrashLogged = false;
  let startPromise;
  let client = createLSPClient(name, (error) => {
    state = "error";
    lastError = error;
    crashRecoveryCount++;
    logFeatureSad(
      "lsp_server_start",
      error.oomKilledInToolCgroup === true ? "lsp_server_oom_killed_tool_cgroup" : "lsp_server_crashed",
    );
  });
  async function start() {
    while (startPromise) await startPromise.catch(() => {});
    if (state === "running" || state === "starting") return;
    let doStartPromise = doStart();
    startPromise = doStartPromise.finally(() => {
      startPromise = undefined;
    });
    startPromise.catch(() => {});
    return doStartPromise;
  }
  async function doStart() {
    if (state === "error" && crashRecoveryCount > 0 && config.restartOnCrash === false)
      throw lastError ?? Error(`LSP server '${name}' crashed (restartOnCrash is false)`);
    let maxRestarts = config.maxRestarts ?? 3;
    if (state === "error" && crashRecoveryCount > maxRestarts) {
      if (!maxCrashLogged) {
        maxCrashLogged = true;
        lastError = Error(
          `LSP server '${name}' exceeded max crash recovery attempts (${maxRestarts})` +
            (lastError ? `; last crash: ${lastError.message}` : ""),
        );
        logForDebugging(lastError.message, {
          level: "error",
        });
        logFeatureBad("lsp_server_start", "lsp_server_max_crash_recovery");
      }
      throw lastError;
    }
    let initializePromise;
    let crashCountAtStart = crashRecoveryCount;
    try {
      state = "starting";
      logForDebugging(`Starting LSP server instance: ${name}`);
      await client.start(config.command, config.args || [], {
        env: config.env,
        cwd: getProjectConfigRoot() ?? config.workspaceFolder,
        ...(config.pluginSource !== undefined && {
          pluginId: config.pluginSource,
        }),
      });
      client.onRequest("workspace/configuration", (configurationRequest) => {
        logForDebugging(
          `LSP: Received workspace/configuration request from ${name} for sections: ${configurationRequest.items.map((item) => item.section ?? "<root>").join(", ")}`,
        );
        return configurationRequest.items.map((item) => getConfigSection(config.settings, item.section));
      });
      client.onRequest("client/registerCapability", (registerRequest) => {
        logForDebugging(
          `LSP: Ignoring client/registerCapability from ${name} for: ${describeRegistrations(registerRequest?.registrations)}`,
        );
        return null;
      });
      client.onRequest("client/unregisterCapability", (unregisterRequest) => {
        logForDebugging(
          `LSP: Ignoring client/unregisterCapability from ${name} for: ${describeRegistrations(unregisterRequest?.unregisterations)}`,
        );
        return null;
      });
      let workspaceFolder = config.workspaceFolder || getCwd();
      let workspaceUri = pathToFileURL(workspaceFolder).href;
      let initializeParams = {
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
        workspaceFolders: [
          {
            uri: workspaceUri,
            name: pathModule_2.basename(workspaceFolder),
          },
        ],
        rootPath: workspaceFolder,
        rootUri: workspaceUri,
        capabilities: {
          workspace: {
            configuration: config.settings != null,
            workspaceFolders: false,
            didChangeWatchedFiles: {
              dynamicRegistration: false,
            },
          },
          textDocument: {
            synchronization: {
              dynamicRegistration: false,
              willSave: false,
              willSaveWaitUntil: false,
              didSave: true,
            },
            publishDiagnostics: {
              relatedInformation: true,
              tagSupport: {
                valueSet: [1, 2],
              },
              versionSupport: false,
              codeDescriptionSupport: true,
              dataSupport: false,
            },
            hover: {
              dynamicRegistration: false,
              contentFormat: ["markdown", "plaintext"],
            },
            definition: {
              dynamicRegistration: false,
              linkSupport: true,
            },
            references: {
              dynamicRegistration: false,
            },
            documentSymbol: {
              dynamicRegistration: false,
              hierarchicalDocumentSymbolSupport: true,
            },
            callHierarchy: {
              dynamicRegistration: false,
            },
          },
          general: {
            positionEncodings: ["utf-16"],
          },
        },
      };
      initializePromise = client.initialize(initializeParams);
      if (config.startupTimeout !== undefined)
        await withTimeout_2(
          initializePromise,
          config.startupTimeout,
          `LSP server '${name}' timed out after ${config.startupTimeout}ms during initialization`,
        );
      else await initializePromise;
      if (state !== "starting") throw lastError ?? Error("LSP server crashed during startup");
      state = "running";
      crashRecoveryCount = 0;
      maxCrashLogged = false;
      if (config.settings != null)
        client
          .sendNotification("workspace/didChangeConfiguration", {
            settings: config.settings,
          })
          .catch((error) => {
            logForDebugging(
              `LSP: workspace/didChangeConfiguration push failed for ${name}: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
          });
      logForDebugging(`LSP server instance started: ${name}`);
      logFeatureOk("lsp_server_start");
    } catch (error) {
      client.stop(config.shutdownTimeout ?? config.startupTimeout).catch(() => {});
      initializePromise?.catch(() => {});
      state = "error";
      lastError = error;
      logForDebugging(`Failed to start LSP server '${name}': ${errorMessage(error)}`, {
        level: "error",
      });
      if (crashRecoveryCount === crashCountAtStart)
        logFeatureBad("lsp_server_start", "lsp_server_start_failed");
      throw error;
    }
  }
  async function stop() {
    if (state === "stopped" || state === "stopping") return;
    try {
      state = "stopping";
      await client.stop(config.shutdownTimeout);
      state = "stopped";
      logForDebugging(`LSP server instance stopped: ${name}`);
      logFeatureOk("lsp_server_stop");
    } catch (error) {
      state = "error";
      lastError = error;
      logForDebugging(`Failed to stop LSP server '${name}': ${errorMessage(error)}`, {
        level: "error",
      });
      logFeatureSad("lsp_server_stop", "lsp_server_stop_failed");
      throw error;
    }
  }
  async function restart() {
    try {
      await stop();
    } catch (error) {
      let stopError = Error(`Failed to stop LSP server '${name}' during restart: ${errorMessage(error)}`);
      logForDebugging(`Failed to stop LSP server '${name}' during restart: ${errorMessage(error)}`, {
        level: "error",
      });
      throw stopError;
    }
    restartCount++;
    let maxRestarts = config.maxRestarts ?? 3;
    if (restartCount > maxRestarts) {
      let error = Error(`Max restart attempts (${maxRestarts}) exceeded for server '${name}'`);
      logForDebugging(error.message, {
        level: "error",
      });
      throw error;
    }
    try {
      await start();
    } catch (error) {
      let startError = Error(
        `Failed to start LSP server '${name}' during restart (attempt ${restartCount}/${maxRestarts}): ${errorMessage(error)}`,
      );
      logForDebugging(startError.message, {
        level: "error",
      });
      throw startError;
    }
  }
  function isHealthy() {
    return state === "running" && client.isInitialized;
  }
  async function sendRequest(method, params) {
    if (!isHealthy()) {
      let error = Error(
        `Cannot send request to LSP server '${name}': server is ${state}${lastError ? `, last error: ${lastError.message}` : ""}`,
      );
      logForDebugging(
        `Cannot send request to LSP server '${name}': server is ${state}${lastError ? `, last error: ${lastError.message}` : ""}`,
        {
          level: "error",
        },
      );
      logFeatureBad("lsp_request", "lsp_server_unavailable");
      throw error;
    }
    let lastRequestError;
    let requestTimeoutMs = config.requestTimeout ?? DEFAULT_REQUEST_TIMEOUT_MS;
    let timeoutMessage = `no response after ${requestTimeoutMs}ms`;
    for (let attempt = 0; attempt <= MAX_RETRIES_FOR_TRANSIENT_ERRORS; attempt++)
      try {
        let response = await withTimeout_2(
          client.sendRequest(method, params),
          requestTimeoutMs,
          timeoutMessage,
        );
        logFeatureOk("lsp_request");
        return response;
      } catch (error) {
        lastRequestError = error;
        let errorCode = error.code;
        if (
          typeof errorCode === "number" &&
          errorCode === LSP_ERROR_CONTENT_MODIFIED &&
          attempt < MAX_RETRIES_FOR_TRANSIENT_ERRORS
        ) {
          let delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          logForDebugging(
            `LSP request '${method}' to '${name}' got ContentModified error, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES_FOR_TRANSIENT_ERRORS})\u2026`,
          );
          await sleep(delay);
          continue;
        }
        break;
      }
    let requestError = Object.assign(
      Error(
        `LSP request '${method}' failed for server '${name}': ${lastRequestError?.message ?? "unknown error"}`,
        {
          cause: lastRequestError,
        },
      ),
      {
        code: lastRequestError?.code,
      },
    );
    logForDebugging(requestError.message, {
      level: "error",
    });
    logFeatureBad(
      "lsp_request",
      lastRequestError?.message === timeoutMessage ? "lsp_request_timeout" : "lsp_request_failed",
    );
    throw requestError;
  }
  async function sendNotification(method, params) {
    if (!isHealthy()) {
      let error = Error(`Cannot send notification to LSP server '${name}': server is ${state}`);
      logForDebugging(`Cannot send notification to LSP server '${name}': server is ${state}`, {
        level: "error",
      });
      throw error;
    }
    try {
      await client.sendNotification(method, params);
    } catch (error) {
      let notificationError = Error(
        `LSP notification '${method}' failed for server '${name}': ${errorMessage(error)}`,
      );
      logForDebugging(notificationError.message, {
        level: "error",
      });
      throw notificationError;
    }
  }
  function onNotification(method, handler) {
    client.onNotification(method, handler);
  }
  function onRequest(method, handler) {
    client.onRequest(method, handler);
  }
  return {
    name,
    config,
    get state() {
      return state;
    },
    get lastError() {
      return lastError;
    },
    get restartCount() {
      return restartCount;
    },
    start,
    stop,
    restart,
    isHealthy,
    sendRequest,
    sendNotification,
    onNotification,
    onRequest,
  };
}
//@ chunk-e6aww6q8.js:4632777-4632970 affinity
/**
 * 把 client/(un)registerCapability 请求里的 registrations 列成 method 名串，供日志使用。
 */
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
