/**
 * services/deviceBridge/passthroughMcp.ts
 *
 * 2.1.316 新增：设备桥 MCP 直通：把本机 MCP 服务器工具提供给云会话调用，含重名处理、schema 改写与策略拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-weh04swb.js (44)
 * attribution: placement 44
 */
import { createDialFailureLatch, boundDial } from "../mcp/dialFailureLatch.js";
import { createSignal } from "../../utils/signal.js";
import { count } from "../../utils/collections.js";
import { partitionAlias, import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { pMap } from "../../../vendor/p-map/index.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  toError,
  isAbortError,
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { createCombinedAbortSignal } from "../../utils/combinedAbortSignal.js";
import { pickByHelper } from "../../utils/git/gitSafeEnv.js";
import {
  McpSessionExpiredError,
  refreshMcpServerTools,
  McpAuthError,
  McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  maxDescriptionLength,
} from "../mcp/client.js";
import { awaitPolicyColdStartWaiter } from "../policyLimits/coldStartWaiter.js";
import { ensureMdmLoaded } from "../../utils/settings/mdm/mdmLoader.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { isMcpServerAllowedByPolicy } from "../mcp/config.js";
import { isToolFromMcpServer, buildMcpToolName } from "../mcp/mcpStringUtils.js";
import { BASE_CALLER_FIELDS, CALLER_FIELDS, withinDepth } from "../../remote/tools/protocolSchemas.js";
import { omitAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { stripAnthropicMeta } from "../mcp/anthropicMeta.js";
import {
  MAX_PREFIXED_TOOL_NAME_CHARS,
  MAX_RESULT_SIZE_HINT,
  MAX_PASSTHROUGH_TOOLS,
  MAX_INPUT_SCHEMA_DEPTH,
  MAX_TOOL_DESCRIPTION_CHARS,
} from "../../remote/tools/toolDescriptors.js";
import { isAdminScope } from "./deviceMcpConsent.js";
import { normalizedKey, isClaudeAiServerName, isOrgConnectorName } from "../mcp/normalization.js";
import { getPrefixServerKey } from "../../components/agents/ToolSelector.js";
import {
  isServiceReservedToolName,
  mayBePassthroughTool,
  PASSTHROUGH_ANNOUNCE_FORMAT_VERSION,
  PASSTHROUGH_MARKER_KEY,
} from "./passthroughMarker.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { renamedFieldCacheMap } from "../remoteTools/pathMapping.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { TOOL_META_KEYS } from "../../bridge/deviceRegistration.js";
import { beginDeferredInits } from "../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ./deviceMcpConsent.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/services/deviceBridge/deviceMcpConsent.js");
//@ chunk-weh04swb.js:1665-1690 placement
/**
 * 策略重新读取的最小间隔（60 秒）。
 */
var DEFAULT_SETTLE_TIMEOUT_MS = 1e4;
var MAX_CONSECUTIVE_DIAL_FAILURES = 3;
var POLICY_REFRESH_INTERVAL_MS = 60000;
//@ chunk-weh04swb.js:1690-1812 placement
class PassthroughMcpUnavailableError extends Error {
  unavailable;
  name = "PassthroughMcpUnavailableError";
  constructor(unavailable, message, options) {
    super(message, options);
    this.unavailable = unavailable;
  }
}
//@ chunk-weh04swb.js:1812-9043 placement
/**
 * 设备桥：把本机 MCP 服务器的工具"直通"给云会话调用：列出/刷新服务器、重名与保留名检查、托管策略拒绝、调用转发与错误包装。
 */
function createPassthroughMcpBridge(options) {
  let deps = options.ops ?? createPassthroughMcpDeps();
  let dialLatch = options.dialLatch ?? createDialFailureLatch();
  let keys = Object.keys(options.configs);
  let served = new Map();
  let statusByName = new Map();
  let weakSet = new WeakSet();
  let signal = createSignal();
  let now = Date.now();
  let stopPromise;
  let settled_ = false;
  let settleResolve = () => {};
  let settled = new Promise((resolve) => {
    settleResolve = resolve;
  });
  let settleTimer;
  let now_2 = Date.now();
  let isStopped = () => stopPromise !== undefined;
  function settle() {
    if (settled_) return;
    settled_ = true;
    if (settleTimer !== undefined) {
      clearTimeout(settleTimer);
      settleTimer = undefined;
    }
    let statuses = [...statusByName.values()];
    let countStatus = (status) => count(statuses, (entryStatus) => entryStatus === status);
    settleResolve({
      configured: keys.length,
      connected: countStatus("connected"),
      cached: countStatus("cached"),
      failed: countStatus("failed"),
      needsAuth: countStatus("needs-auth"),
      disabled: countStatus("disabled"),
      blocked: countStatus("blocked"),
      excluded: countStatus("excluded"),
      unreported: keys.length - statusByName.size,
      settleMs: Date.now() - now,
    });
    warmCached([...served].filter(([, handle]) => handle.handle.type === "cached").map(([name]) => name));
  }
  async function warmCached(names) {
    let warmOne = async (name) => {
      refreshPolicyIfDue();
      let entry = served.get(name);
      if (entry && !isStopped()) {
        await dial(name, entry).catch(() => {});
        refreshPolicyIfDue();
      }
    };
    let dialConcurrency = (name) => deps.dialConcurrency(options.configs[name]);
    let filtered = names.filter((name) => served.has(name));
    await Promise.all(
      partitionAlias(filtered, (name) => dialConcurrency(name).kind === "local")
        .filter((group) => group.length > 0)
        .map((group) =>
          pMap(group, warmOne, {
            concurrency: dialConcurrency(group[0]).limit,
          }),
        ),
    );
  }
  function emit() {
    try {
      signal.emit();
    } catch (error) {
      logError(error);
    }
  }
  function patch(name, patchValues) {
    let entry = served.get(name);
    if (entry)
      served.set(name, {
        ...entry,
        ...patchValues,
      });
  }
  function adoptClient(client, tools) {
    let previous = served.get(client.name);
    let serverToolList = serverTools(client.name, tools);
    served.set(client.name, {
      handle: client,
      tools: serverToolList,
      dialing: previous?.dialing,
      listing: undefined,
      consecutiveDialFailures: 0,
      everConnected: previous?.everConnected === true || client.type === "connected",
    });
    if (client.type === "connected") {
      if (serverToolList.length === 0)
        patch(client.name, {
          listing: refreshTools(client.name, client),
        });
      ensureListed(client.name, client);
    } else if (settled_) warmCached([client.name]);
    if (previous !== undefined || settled_) emit();
  }
  function ensureListed(name, client) {
    let entry = served.get(name);
    if (!entry || isStopped()) return;
    if (entry.handle !== client) {
      patch(name, {
        handle: client,
        everConnected: true,
      });
      patch(name, {
        listing: refreshTools(name, client),
      });
      emit();
    }
    if (!weakSet.has(client) && client.capabilities?.tools?.listChanged) {
      weakSet.add(client);
      deps.onToolListChanged(client, async () => {
        await refreshTools(name, client);
      });
    }
  }
  function refreshTools(name, client) {
    let changed = false;
    return deps
      .refreshTools(
        client,
        (tools, previousTools) => {
          if (served.get(name)?.handle === client && !isStopped()) {
            patch(name, {
              tools: serverTools(name, previousTools),
              listing: undefined,
            });
            changed = true;
            emit();
          }
        },
        options.storageV5,
      )
      .then(
        () => changed,
        (error) => {
          logForDebugging(
            `[deviceBridge] passthrough MCP tools refresh failed for ${name}: ${toError(error).message}`,
          );
          return false;
        },
      );
  }
  function removeServer(name, reason) {
    let entry = served.get(name);
    if (!entry || isStopped()) return;
    served.delete(name);
    deps.dispose(name, entry.handle.config);
    deps.cleanup([entry.handle]);
    logForDebugging(`[deviceBridge] passthrough MCP server ${name} left the pool (${reason})`);
    emit();
  }
  function refreshPolicyIfDue() {
    let now = Date.now();
    if (now - now_2 >= POLICY_REFRESH_INTERVAL_MS) {
      now_2 = now;
      deps.refreshPolicy();
    }
    for (let [name, entry] of served)
      if (!deps.allowedByPolicy(name, entry.handle.config)) removeServer(name, "denied by managed policy");
  }
  function dial(name, entry) {
    if (entry.dialing) return entry.dialing;
    if (dialLatch.shouldSkip(name))
      return Promise.reject(
        new PassthroughMcpUnavailableError(
          "server",
          "MCP server failed to connect recently; not retrying yet",
        ),
      );
    let promise = deps.ensureConnected(entry.handle).then(
      (client) => {
        clearDialing(name, promise);
        dialLatch.recordSuccess(name);
        if (isStopped() || !served.has(name)) {
          deps.cleanup([client]);
          throw new PassthroughMcpUnavailableError(
            "server",
            "MCP server is no longer offered by this machine",
          );
        }
        patch(name, {
          consecutiveDialFailures: 0,
        });
        ensureListed(name, client);
        return client;
      },
      (error) => {
        clearDialing(name, promise);
        if (isMcpAuthError(error)) {
          removeServer(name, "needs authentication");
          throw error;
        }
        dialLatch.recordFailure(name);
        let dialEntry = served.get(name);
        let failures = (dialEntry?.consecutiveDialFailures ?? 0) + 1;
        patch(name, {
          consecutiveDialFailures: failures,
        });
        if (failures >= MAX_CONSECUTIVE_DIAL_FAILURES && dialEntry?.everConnected !== true)
          removeServer(name, "repeated dial failures");
        else if (served.has(name)) deps.dispose(name, entry.handle.config);
        throw error;
      },
    );
    patch(name, {
      dialing: promise,
    });
    return promise;
  }
  function clearDialing(name, promise) {
    if (served.get(name)?.dialing === promise)
      patch(name, {
        dialing: undefined,
      });
  }
  async function waitForListing(name, { signal, deadline }) {
    let listing = served.get(name)?.listing;
    while (listing !== undefined) {
      let listed = await boundDial(listing, {
        signal,
        timeoutMs: Math.max(0, deadline - Date.now()),
        serverName: name,
        context: "device tool call",
      }).catch((error) => {
        if (isAbortError(error)) throw error;
        throw new PassthroughMcpUnavailableError("server", "MCP server connected too late for this call", {
          cause: error,
        });
      });
      let entry = served.get(name);
      if (listed || entry?.listing === undefined) return;
      if (entry.listing !== listing) {
        listing = entry.listing;
        continue;
      }
      if (entry.handle.type === "connected")
        patch(name, {
          listing: refreshTools(name, entry.handle),
        });
      throw new PassthroughMcpUnavailableError("server", "MCP server did not list its tools");
    }
  }
  async function connectFor(name, { signal, timeoutMs }) {
    let entry = served.get(name);
    if (isStopped() || !entry)
      throw new PassthroughMcpUnavailableError("server", "MCP server is not available on this machine");
    try {
      return await boundDial(dial(name, entry), {
        signal,
        timeoutMs,
        serverName: name,
        context: "device tool call",
      });
    } catch (error) {
      if (isAbortError(error) || error instanceof PassthroughMcpUnavailableError) throw error;
      if (isMcpAuthError(error)) throw needsAuthError(error);
      logForDebugging(`[deviceBridge] passthrough MCP dial failed for ${name}: ${toError(error).message}`);
      throw new PassthroughMcpUnavailableError("server", "MCP server could not be reached for this call", {
        cause: error,
      });
    }
  }
  function assertServable(name, toolName) {
    refreshPolicyIfDue();
    let entry = served.get(name);
    if (!entry || isStopped())
      throw new PassthroughMcpUnavailableError("server", "MCP server is not available on this machine");
    let found = entry.tools.find((tool) => toolNameOf(tool) === toolName);
    if (!found) throw new PassthroughMcpUnavailableError("tool", "MCP tool is not offered by this machine");
    if (found.mcpInfo?.effectiveMaxPermission === "blocked")
      throw new PassthroughMcpUnavailableError(
        "tool",
        "MCP tool is blocked on this machine by the organization",
      );
  }
  async function prepareCall(name, toolName, { signal, deadline }) {
    assertServable(name, toolName);
    let client = await connectFor(name, {
      signal,
      timeoutMs: Math.max(0, deadline - Date.now()),
    });
    await waitForListing(name, {
      signal,
      deadline,
    });
    assertServable(name, toolName);
    if (served.get(name)?.handle !== client)
      throw new PassthroughMcpUnavailableError(
        "server",
        "MCP server was reconnected during this call; retry",
      );
    if (deadline - Date.now() <= 0)
      throw new PassthroughMcpUnavailableError("server", "MCP server connected too late for this call");
    return client;
  }
  async function invokeTool(name, client, args, { signal, deadline, imageLimits }) {
    let combinedAbortSignal = createCombinedAbortSignal(signal, {
      timeoutMs: Math.max(0, deadline - Date.now()),
      refTimer: true,
    });
    let mapError = (error) =>
      signal.aborted
        ? new AbortError(`MCP tool call on '${name}' aborted`)
        : combinedAbortSignal.signal.aborted
          ? new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              `MCP server "${name}" did not answer the call within its deadline`,
              "MCP passthrough call deadline",
            )
          : error;
    try {
      let result = await deps
        .callTool(client, args, {
          signal: combinedAbortSignal.signal,
          imageLimits,
        })
        .catch((error) => {
          throw mapError(error);
        });
      if (result.isError)
        throw "urlElicitationDeclined" in result
          ? new PassthroughMcpUnavailableError(
              "tool",
              "MCP tool needs a consent step in a browser on this machine, which a served call cannot show",
            )
          : mapError(
              new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                "MCP tool call on this machine ended without a result",
                "MCP passthrough call ended without a result",
              ),
            );
      return result;
    } finally {
      combinedAbortSignal.cleanup();
    }
  }
  function maybeNeedsAuth(name, cause) {
    if (!isMcpAuthError(cause)) return cause;
    removeServer(name, "needs authentication");
    return needsAuthError(cause);
  }
  function onDiscovered({ client, tools }) {
    if (isStopped() || statusByName.get(client.name) === "dropped") {
      deps.cleanup([client]);
      return;
    }
    if (!Object.hasOwn(options.configs, client.name)) return;
    switch (client.type) {
      case "connected":
      case "cached":
        statusByName.set(client.name, client.type);
        adoptClient(client, tools);
        break;
      case "failed":
        statusByName.set(client.name, client.type);
        removeServer(client.name, "failed");
        break;
      case "needs-auth":
        statusByName.set(client.name, client.type);
        removeServer(client.name, "needs authentication");
        break;
      case "disabled":
        statusByName.set(client.name, client.type);
        removeServer(client.name, "disabled");
        break;
      case "pending":
        break;
      default:
    }
    if (statusByName.size >= keys.length) settle();
  }
  deps
    .policySettled()
    .then(() => {
      if (isStopped()) return;
      settleTimer = setTimeout(settle, options.settleTimeoutMs ?? DEFAULT_SETTLE_TIMEOUT_MS);
      let initial = pickByHelper(options.configs, (config, name) => {
        if (statusByName.get(name) === "dropped") return false;
        if (deps.needsLocalPrompts(config)) {
          statusByName.set(name, "excluded");
          return false;
        }
        let allowed = deps.allowedByPolicy(name, config);
        if (!allowed) statusByName.set(name, "blocked");
        return allowed;
      });
      return deps.discover(onDiscovered, initial, options.storageV5);
    })
    .catch((error) => {
      logForDebugging(`[deviceBridge] passthrough MCP discovery failed: ${toError(error).message}`);
    })
    .finally(() => {
      settle();
      disposeAll((name) => isStopped() || statusByName.get(name) === "dropped");
    });
  function disposeAll(predicate = () => true) {
    for (let name of keys.filter(predicate)) deps.dispose(name, options.configs[name]);
  }
  return {
    settled,
    servers() {
      refreshPolicyIfDue();
      return keys.flatMap((name) => {
        let entry = served.get(name);
        return entry
          ? [
              {
                name,
                scope: entry.handle.config.scope,
                tools: entry.tools,
                status: entry.handle.type,
              },
            ]
          : [];
      });
    },
    subscribe: signal.subscribe,
    async callTool(name, args, { signal, timeout, imageLimits }) {
      let deadline = Date.now() + timeout;
      let callOnce = async (mayRetry) => {
        let client = await prepareCall(name, args.name, {
          signal,
          deadline,
        });
        try {
          return await invokeTool(name, client, args, {
            signal,
            deadline,
            imageLimits,
          });
        } catch (error) {
          let toolName = args.name;
          if (
            mayRetry &&
            error instanceof McpSessionExpiredError &&
            (!error.mayHaveRun ||
              served.get(name)?.tools.find((tool) => toolNameOf(tool) === toolName)?.readOnlyHint === true)
          )
            return callOnce(false);
          throw maybeNeedsAuth(name, error);
        }
      };
      return callOnce(true);
    },
    toolTimeoutMs: (name) => deps.toolTimeoutMs(options.configs[name]),
    dropServer(name) {
      if (isStopped() || !Object.hasOwn(options.configs, name)) return;
      statusByName.set(name, "dropped");
      if (served.has(name)) removeServer(name, "dropped by the caller");
      else deps.dispose(name, options.configs[name]);
      if (statusByName.size >= keys.length) settle();
    },
    stop() {
      stopPromise ??= (async () => {
        if (settleTimer !== undefined) {
          clearTimeout(settleTimer);
          settleTimer = undefined;
        }
        signal.clear();
        let mapped = [...served.values()].map((handle) => handle.handle);
        served.clear();
        settle();
        disposeAll();
        await deps.cleanup(mapped);
      })();
      return stopPromise;
    },
  };
}
//@ chunk-weh04swb.js:9043-9961 placement
/**
 * 构造设备桥接透传 MCP 的依赖对象：策略就绪、发现工具、确保连接、监听工具列表变化、刷新工具、调用工具、清理/释放连接、策略判定、是否需要本地提示、按本地/远程决定拨号并发、工具超时。
 */
function createPassthroughMcpDeps() {
  let mcpClient = require("../mcp/emitTripwireEvent.lazy.js").mcpClientModule();
  return {
    policySettled: () =>
      Promise.all([awaitPolicyColdStartWaiter(), ensureMdmLoaded()]).then(() => {
        return;
      }),
    discover: (server, context, options) =>
      mcpClient.getMcpToolsCommandsAndResources(server, context, options),
    ensureConnected: (server) => mcpClient.ensureConnectedClient(server),
    onToolListChanged: (server, listener) => mcpClient.onMcpToolListChanged(server, listener),
    refreshTools: refreshMcpServerTools,
    callTool: (client, call, { signal, imageLimits }) =>
      mcpClient.callMCPTool({
        client,
        tool: call.name,
        args: call.arguments ?? {},
        meta: call._meta,
        signal,
        imageLimits,
        hasResultSizeAnnotation: true,
        storageV5: undefined,
        credentials: undefined,
      }),
    cleanup: (serverNames) => mcpClient.cleanupConnectedMcpClients(serverNames),
    dispose: (server, connection) => mcpClient.disposeServerConnectionDetached(server, connection),
    refreshPolicy: invalidateCommandNames,
    allowedByPolicy: isMcpServerAllowedByPolicy,
    needsLocalPrompts: (server) => mcpClient.isFirstPartyDesignServerConfig(server),
    dialConcurrency: (server) =>
      mcpClient.isLocalMcpServer(server)
        ? {
            kind: "local",
            limit: mcpClient.getMcpServerConnectionBatchSize(),
          }
        : {
            kind: "remote",
            limit: mcpClient.getRemoteMcpServerConnectionBatchSize(),
          },
    toolTimeoutMs: (server) => mcpClient.getMcpToolTimeoutMs(server),
  };
}
//@ chunk-weh04swb.js:9961-10011 placement
/**
 * 取工具对外发布的工具名（mcpInfo.toolName 优先）。
 */
function toolNameOf(tool) {
  return tool.mcpInfo?.toolName ?? tool.name;
}
//@ chunk-weh04swb.js:10011-10133 placement
function isMcpAuthError(error) {
  return (
    error instanceof McpAuthError ||
    (error !== null &&
      typeof error === "object" &&
      "mcpErrorSource" in error &&
      error.mcpErrorSource === "user_auth")
  );
}
//@ chunk-weh04swb.js:10133-10231 placement
/**
 * 把 MCP 认证错误包装成“本机需要认证”的透传不可用错误。
 */
function needsAuthError(cause) {
  return new PassthroughMcpUnavailableError("server", "MCP server needs authentication on this machine", {
    cause,
  });
}
//@ chunk-weh04swb.js:10231-10298 placement
/**
 * 取某服务器提供的全部 MCP 工具。
 */
function serverTools(serverName, tools) {
  return tools.filter((tool) => tool.mcpInfo !== undefined && isToolFromMcpServer(tool, serverName));
}
//@ chunk-weh04swb.js:10298-10315 placement
/**
 * 默认的服务器列表引用。
 */
var defaultListHandler = BASE_CALLER_FIELDS;
var defaultList = CALLER_FIELDS;
//@ chunk-weh04swb.js:10315-10427 placement
class PassthroughCallError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  verdict;
  constructor(verdict, message, telemetry) {
    super(message, telemetry, verdict.code);
    this.verdict = verdict;
    this.name = "PassthroughCallError";
  }
}
//@ chunk-weh04swb.js:10427-10559 placement
/**
 * 透传工具未提供时的校验失败结果，并通知工具判定回调。
 */
function refuseNotServedValidation(remoteCall, refusal) {
  remoteCall?.onToolVerdict?.(
    {
      kind: "refused",
      code: "not_served",
    },
    refusal.message,
  );
  return {
    result: false,
    message: refusal.message,
    errorCode: 1,
  };
}
//@ chunk-weh04swb.js:10559-10679 placement
/**
 * 抛出"工具未提供"的透传调用错误，并通知工具判定回调。
 */
function throwNotServed(remoteCall, message, telemetry) {
  let error = new PassthroughCallError(
    {
      kind: "refused",
      code: "not_served",
    },
    message,
    telemetry,
  );
  remoteCall?.onToolVerdict?.(error.verdict, error.message);
  throw error;
}
//@ chunk-weh04swb.js:10679-11311 placement
/**
 * 生成透传 MCP 工具的 call 函数：只接受远程调用，去掉保留参数后调用本机 MCP 服务器（带超时与图片限制），把错误转成透传错误并回报判定；返回内容与 _meta/structuredContent。
 */
function makePassthroughCall(deps, serverName, toolName, argRenames) {
  let renamed = new Set(argRenames.values());
  let filtered = defaultList.filter((input) => !renamed.has(input));
  return async (args, context) => {
    if (context.remoteCall === undefined)
      throw new PassthroughCallError(
        {
          kind: "refused",
          code: "invalid_request",
        },
        NO_REMOTE_CALL_MESSAGE,
        NO_REMOTE_CALL_MESSAGE,
      );
    let timeout = deps.toolTimeoutMs(serverName);
    let { onToolVerdict } = context.remoteCall;
    let result = await deps
      .callTool(
        serverName,
        {
          name: toolName,
          arguments: omitAlias(args, filtered),
        },
        {
          signal: context.abortController.signal,
          timeout,
          imageLimits: {
            ...imageLimitsForModel(context.options.mainLoopModel),
            allowWebp: false,
          },
        },
      )
      .catch((error) => {
        let passthroughError = toPassthroughError(error, serverName);
        if (passthroughError instanceof PassthroughCallError)
          onToolVerdict?.(passthroughError.verdict, passthroughError.message);
        throw passthroughError;
      });
    return {
      data: result.content,
      ...((result._meta || result.structuredContent) && {
        mcpMeta: {
          ...(result._meta && {
            _meta: stripAnthropicMeta(result._meta),
          }),
          ...(result.structuredContent && {
            structuredContent: result.structuredContent,
          }),
        },
      }),
    };
  };
}
//@ chunk-weh04swb.js:11311-11396 placement
/**
 * 非远端调用时透传工具拒绝执行的说明。
 */
var NO_REMOTE_CALL_MESSAGE = "MCP passthrough tools run only for a remote tool call; the call did not run";
//@ chunk-weh04swb.js:11396-12367 placement
/**
 * 把透传 MCP 调用的失败转成给远端的错误：工具自身返回错误（可能已有副作用）、需要浏览器同意（-32042）、服务器不可用、其他（超时/断连/协议错误，可能已执行）。
 */
function toPassthroughError(error, serverName) {
  if (isAbortError(error) || error instanceof PassthroughCallError) return error;
  if (error instanceof McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS)
    return new McpToolCallError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `MCP server "${serverName}" on this machine returned an error for the call (it reached the server and may have had effects): ${error.message}`,
      "MCP passthrough tool returned an error",
      error.mcpMeta,
    );
  if (isJsonRpcErrorCode32042(error))
    return new PassthroughCallError(
      {
        kind: "refused",
        code: "not_served",
      },
      `MCP server "${serverName}" on this machine needs a consent step in a browser there before this tool can run; the call did not run`,
      "MCP passthrough call needs URL consent on this machine",
    );
  if (error instanceof PassthroughMcpUnavailableError)
    return new PassthroughCallError(
      {
        kind: "refused",
        code: "not_served",
      },
      `MCP server "${serverName}" on this machine: ${error.message}; the call did not run`,
      error.message,
    );
  logForDebugging(`[deviceBridge] passthrough MCP call on ${serverName} failed: ${toError(error).message}`);
  return new PassthroughCallError(
    {
      kind: "failed",
      code: "tool_error",
    },
    `MCP server "${serverName}" on this machine gave no usable result for the call (timeout, lost connection, or a protocol-level error); it may have run and had effects`,
    "MCP tool call failed on this machine",
  );
}
//@ chunk-weh04swb.js:12367-12381 placement
var URL_ELICITATION_REQUIRED_CODE = -32042;
//@ chunk-weh04swb.js:12381-12458 placement (2.1.88 match: isConnectionError, 1)
function isJsonRpcErrorCode32042(err) {
  return (
    err !== null && typeof err === "object" && "code" in err && err.code === URL_ELICITATION_REQUIRED_CODE
  );
}
//@ chunk-weh04swb.js:12458-12469 placement
/**
 * 提交给远端的工具名长度上限。
 */
var MAX_TOOL_NAME_CHARS = MAX_PREFIXED_TOOL_NAME_CHARS;
//@ chunk-weh04swb.js:12469-12636 placement
/**
 * 透传 MCP 工具公告的限制：总字节预算、工具数、单个定义大小、标题与搜索提示长度，以及作用域优先级与管理员作用域集合。
 */
var ANNOUNCE_BYTE_BUDGET = MAX_RESULT_SIZE_HINT - 262144;
var MAX_ANNOUNCED_TOOLS = MAX_PASSTHROUGH_TOOLS;
var MAX_DEFINITION_BYTES = 65536;
var MAX_TITLE_CHARS = 256;
var MAX_SEARCH_HINT_CHARS = 512;
var SCOPE_RANK = {
  enterprise: 0,
  managed: 1,
  local: 2,
  user: 3,
  dynamic: 4,
  project: 5,
  claudeai: 6,
  agent: 7,
};
var ADMIN_SCOPES = new Set(["enterprise", "managed"]);
//@ chunk-weh04swb.js:12636-13041 placement
/**
 * 为设备桥接构造透传工具公告：按作用域排序服务器，描述每个工具，检测名称冲突（服务器/工具层面、管理员优先），过滤权限上限、deny 规则与各种限制，返回可公告工具、丢弃原因与按服务器分组的定义。
 */
async function buildPassthroughAnnouncement(servers, options) {
  let servers_2 = sortServersByScope(servers);
  let results = await Promise.all(
    servers_2.map((server) =>
      Promise.all(server.tools.map((tool) => describePassthroughTool(server.name, tool, options.target))),
    ),
  );
  let collisionChecker = buildCollisionChecker(servers_2, results, options.configured);
  let { tools, dropped, byServer } = servers_2.reduce(
    (acc, server, index) => {
      let serverRejection = isAdminScope(server.scope)
        ? {
            reason: "enterprise_scope",
          }
        : collisionChecker.server(server);
      return (results[index] ?? []).reduce(
        (acc, tool) => admitTool(acc, tool, serverRejection, collisionChecker, options),
        acc,
      );
    },
    {
      announced: new Set(),
      bytes: 0,
      tools: [],
      dropped: [],
      byServer: new Map(),
    },
  );
  return {
    tools,
    dropped,
    byServer,
  };
}
//@ chunk-weh04swb.js:13041-13810 placement
/**
 * 构造服务器名与工具名的冲突判定：与保留名/内置名冲突、与管理员服务器前缀重叠、规范化后同名（无管理员时为 alias_collision）。
 */
function buildCollisionChecker(servers, toolGroups, extraServers) {
  let allServers = sortServersByScope([
    ...servers,
    ...extraServers.filter((extraServer) => !servers.some((server) => server.name === extraServer.name)),
  ]);
  let adminServers = new Set(
    allServers.filter((server) => ADMIN_SCOPES.has(server.scope)).map((server) => server.name),
  );
  let adminPrefixes = [...adminServers].map(
    (adminServer) => `${normalizedKey(getPrefixServerKey(adminServer))}_`,
  );
  let shadowsAdminPrefix = (serverName, key) =>
    !adminServers.has(serverName) && adminPrefixes.some((adminPrefix) => `${key}_`.startsWith(adminPrefix));
  let serversByKey = groupByAlias(
    allServers.map((server) => [
      normalizedKey(getPrefixServerKey(server.name)),
      {
        server: server.name,
        admin: adminServers.has(server.name),
      },
    ]),
  );
  let toolsByKey = groupByAlias(
    toolGroups.flat().map((tool) => [
      normalizedKey(tool.name),
      {
        server: tool.server,
        admin: adminServers.has(tool.server),
        rawName: tool.rawName,
      },
    ]),
  );
  return {
    server: (server) =>
      isClaudeAiServerName(server.name) ||
      isOrgConnectorName(server.name) ||
      shadowsAdminPrefix(server.name, normalizedKey(getPrefixServerKey(server.name)))
        ? {
            reason: "collision",
          }
        : resolveAliasGroup(
            serversByKey.get(normalizedKey(getPrefixServerKey(server.name))) ?? [],
            server.name,
            (entry) => entry.server === server.name,
          ),
    tool: (tool) =>
      isServiceReservedToolName(tool.name)
        ? {
            reason: "service_reserved",
          }
        : !mayBePassthroughTool(tool.name) ||
            isClaudeAiServerName(tool.name) ||
            isOrgConnectorName(tool.name) ||
            shadowsAdminPrefix(tool.server, normalizedKey(tool.name))
          ? {
              reason: "collision",
            }
          : resolveAliasGroup(
              toolsByKey.get(normalizedKey(tool.name)) ?? [],
              tool.server,
              (entry) => entry.server === tool.server && entry.rawName === tool.rawName,
            ),
  };
}
//@ chunk-weh04swb.js:13810-14022 placement
function resolveAliasGroup(group, name, isSelf) {
  let winner = group.find((candidate) => candidate.admin) ?? (group.length === 1 ? group[0] : undefined);
  if (winner === undefined)
    return {
      reason: "alias_collision",
      contenders: group.map((candidate) => candidate.server).filter((server) => server !== name),
    };
  return isSelf(winner)
    ? undefined
    : {
        reason: "collision",
      };
}
//@ chunk-weh04swb.js:14022-14158 placement
function groupByAlias(pairs) {
  return pairs.reduce((acc, [key, entry]) => {
    let group = acc.get(key) ?? [];
    if (!group.some((existing) => existing.server === entry.server)) acc.set(key, [...group, entry]);
    return acc;
  }, new Map());
}
//@ chunk-weh04swb.js:14158-14647 placement
/**
 * 决定是否把一个设备 MCP 工具透传给会话：权限上限阻止、命中拒绝规则或描述失败时记入丢弃列表；否则累加大小并加入工具列表和按服务器分组。
 */
function admitTool(acc, tool, serverRejection, collisionChecker, { isDenied, serve }) {
  let rejection =
    serverRejection ??
    collisionChecker.tool(tool) ??
    (tool.tool.mcpInfo?.effectiveMaxPermission === "blocked"
      ? {
          reason: "permission_ceiling",
        }
      : isDenied(tool.tool)
        ? {
            reason: "deny_rule",
          }
        : checkToolLimits(tool, acc));
  if ("reason" in rejection) {
    acc.dropped.push({
      server: tool.server,
      tool: tool.rawName,
      ...rejection,
    });
    return acc;
  }
  acc.announced.add(tool.name);
  acc.bytes += rejection.bytes;
  acc.tools.push(
    serve({
      ...tool,
      definition: rejection.definition,
      wireArguments: rejection.wireArguments,
    }),
  );
  let serverTools = acc.byServer.get(tool.server);
  if (serverTools === undefined) {
    serverTools = [];
    acc.byServer.set(tool.server, serverTools);
  }
  serverTools.push(rejection.definition);
  return acc;
}
//@ chunk-weh04swb.js:14647-15175 placement
/**
 * 检查一个透传工具能否公告：保留参数、名称过长、重名、定义缺失、定义过大、schema 嵌套过深、总字节预算或数量上限；通过则返回定义与字节数。
 */
function checkToolLimits({ name: candidate, definition, wireArguments }, { announced, bytes }) {
  if (wireArguments === "reserved_argument")
    return {
      reason: "reserved_argument",
    };
  if (candidate.length > MAX_TOOL_NAME_CHARS)
    return {
      reason: "name_length",
    };
  if (announced.has(candidate))
    return {
      reason: "collision",
    };
  if (definition === undefined)
    return {
      reason: "definition_error",
    };
  let byteLength = Buffer.byteLength(jsonStringify(definition));
  if (byteLength > MAX_DEFINITION_BYTES)
    return {
      reason: "definition_size",
    };
  if (!withinDepth(definition.inputSchema, MAX_INPUT_SCHEMA_DEPTH))
    return {
      reason: "schema_depth",
    };
  if (bytes + byteLength > ANNOUNCE_BYTE_BUDGET)
    return {
      reason: "announce_budget",
    };
  if (announced.size >= MAX_ANNOUNCED_TOOLS)
    return {
      reason: "announce_count",
    };
  return {
    definition,
    bytes: byteLength,
    wireArguments,
  };
}
//@ chunk-weh04swb.js:15175-15312 placement
function sortServersByScope(servers) {
  return servers
    .map((server, index) => ({
      server,
      index,
      rank: scopeRank(server.scope),
    }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map((entry) => entry.server);
}
//@ chunk-weh04swb.js:15312-15365 placement
/**
 * 作用域优先级序号（未知排最后）。
 */
function scopeRank(scope) {
  return SCOPE_RANK[scope] ?? Number.MAX_SAFE_INTEGER;
}
//@ chunk-weh04swb.js:15365-15756 placement
/**
 * 生成透传工具的描述：名称、原始名、定义与参数改写信息；定义生成失败时记日志并返回空定义。
 */
async function describePassthroughTool(serverName, tool, serverInfo) {
  let rawName = tool.mcpInfo?.toolName ?? tool.name;
  let name = strippedMcpToolName(serverName, rawName);
  let renames = planArgumentRenames(tool.inputJSONSchema);
  let renameMap = renames === "reserved_argument" ? renamedFieldCacheMap() : renames;
  try {
    return {
      server: serverName,
      rawName,
      name,
      tool,
      definition: await buildToolDefinition(name, tool, serverInfo, renameMap),
      wireArguments: renames,
    };
  } catch (error) {
    logForDebugging(`[deviceBridge] passthrough cannot describe '${name}': ${toError(error).message}`, {
      level: "error",
    });
    return {
      server: serverName,
      rawName,
      name,
      tool,
      definition: undefined,
      wireArguments: renames,
    };
  }
}
//@ chunk-weh04swb.js:15756-15797 placement
/**
 * 去掉 mcp__ 前缀的工具名。
 */
function strippedMcpToolName(serverName, toolName) {
  return buildMcpToolName(serverName, toolName).slice(5);
}
//@ chunk-weh04swb.js:15797-15829 placement
/**
 * 参数冲突检查用的键名（<名字>_arg）。
 */
function argKey(key) {
  return `${key}_arg`;
}
//@ chunk-weh04swb.js:15829-16146 placement
/**
 * 透传工具 JSON Schema 中允许保留的关键字集合。
 */
var ALLOWED_SCHEMA_KEYS = new Set([
  "$schema",
  "$comment",
  "type",
  "title",
  "description",
  "properties",
  "required",
  "additionalProperties",
  "unevaluatedProperties",
  "$defs",
  "definitions",
  "default",
  "examples",
  "minProperties",
  "maxProperties",
]);
var REF_SCHEMA_KEYS = new Set([
  "$ref",
  "$dynamicRef",
  "$recursiveRef",
  "$anchor",
  "$dynamicAnchor",
  "$recursiveAnchor",
  "$id",
]);
//@ chunk-weh04swb.js:16146-16758 placement
/**
 * 检查工具输入 schema 是否用到保留参数名：无法安全改名时返回 reserved_argument，没有冲突时返回空映射，否则返回 改后名 → 原名 的映射。
 */
function planArgumentRenames(schema) {
  let properties = schema?.properties;
  let required = schema?.required;
  let declaredKeys = new Set([
    ...(typeof properties === "object" && properties !== null ? Object.keys(properties) : []),
    ...(Array.isArray(required) ? required.filter((name) => typeof name === "string") : []),
  ]);
  let defaultNames = defaultList;
  let defaultHandlers = defaultListHandler;
  if (defaultHandlers.some((defaultName) => declaredKeys.has(argKey(defaultName))))
    return "reserved_argument";
  let conflicting = defaultNames.filter((name) => declaredKeys.has(name));
  if (conflicting.length === 0) return renamedFieldCacheMap();
  if (
    conflicting.some((name) => !defaultHandlers.includes(name)) ||
    schema === undefined ||
    !isObjectSchemaType(schema.type) ||
    Object.keys(schema).some((key) => !ALLOWED_SCHEMA_KEYS.has(key)) ||
    hasRefKeywords(schema) ||
    conflicting.some(
      (name) =>
        typeof properties === "object" &&
        properties !== null &&
        Object.hasOwn(properties, name) &&
        !isPropertySchemaObject(Reflect.get(properties, name)),
    )
  )
    return "reserved_argument";
  let renames = new Map(conflicting.map((name) => [argKey(name), name]));
  return [...renames.keys()].some((key) => defaultNames.includes(key)) ? "reserved_argument" : renames;
}
//@ chunk-weh04swb.js:16758-16971 placement
function hasRefKeywords(node) {
  let containsRef = (node, depth) => {
    if (depth > MAX_INPUT_SCHEMA_DEPTH) return true;
    if (Array.isArray(node)) return node.some((entry) => containsRef(entry, depth + 1));
    if (typeof node !== "object" || node === null) return false;
    return Object.entries(node).some(
      ([key, value]) => REF_SCHEMA_KEYS.has(key) || containsRef(value, depth + 1),
    );
  };
  return containsRef(node, 0);
}
//@ chunk-weh04swb.js:16971-17250 placement
async function buildToolDefinition(name, tool, serverInfo, renamePlan) {
  let description = await tool.description(
    {},
    {
      isNonInteractiveSession: false,
      toolPermissionContext: getEmptyToolPermissionContext(),
      tools: [],
    },
  );
  let toolAnnotations = buildToolAnnotations(tool);
  let maxLength = maxDescriptionLength();
  return {
    name,
    description:
      description.length <= Math.min(maxLength, MAX_TOOL_DESCRIPTION_CHARS)
        ? description
        : truncateSuffix(
            description,
            Math.min(maxLength, MAX_TOOL_DESCRIPTION_CHARS - TRUNCATION_SUFFIX.length),
          ),
    inputSchema: buildInputSchema(tool, renamePlan),
    ...(toolAnnotations && {
      annotations: toolAnnotations,
    }),
    _meta: buildToolMeta(tool, serverInfo),
  };
}
//@ chunk-weh04swb.js:17250-17278 placement
/**
 * 描述被截断时追加的后缀。
 */
var TRUNCATION_SUFFIX = "\u2026 [truncated]";
//@ chunk-weh04swb.js:17278-17325 placement
/**
 * 超长则截断并加截断后缀。
 */
function truncateSuffix(text, maxLen) {
  return text.length > maxLen ? truncateToLength(text, maxLen) + TRUNCATION_SUFFIX : text;
}
//@ chunk-weh04swb.js:17325-17584 placement
function buildInputSchema(tool, renames) {
  let inputJSONSchema = tool.inputJSONSchema;
  if (inputJSONSchema === undefined || !isObjectSchemaType(inputJSONSchema.type))
    return {
      type: "object",
      properties: {},
    };
  let properties =
    typeof inputJSONSchema.properties === "object" &&
    inputJSONSchema.properties !== null &&
    !Array.isArray(inputJSONSchema.properties)
      ? keepValidProperties(inputJSONSchema.properties)
      : {};
  return applyArgumentRenames(
    {
      ...inputJSONSchema,
      type: "object",
      properties,
    },
    renames,
  );
}
//@ chunk-weh04swb.js:17584-17892 placement
/**
 * 在 schema 中应用参数重命名：改写属性名与 required，并在描述中注明原参数名。
 */
function applyArgumentRenames(schema, renames) {
  if (renames.size === 0) return schema;
  let reverseRenames = new Map([...renames].map(([original, renamed]) => [renamed, original]));
  let properties = import_mapValues(
    identityMap(schema.properties, (propSchema, propName) => reverseRenames.get(propName) ?? propName),
    (propSchema, propName) => {
      let original = renames.get(propName);
      return original === undefined
        ? propSchema
        : {
            ...propSchema,
            description: describeRenamedParam(original, propSchema),
          };
    },
  );
  let required = Array.isArray(schema.required)
    ? schema.required.map((requiredName) => reverseRenames.get(requiredName) ?? requiredName)
    : undefined;
  return {
    ...schema,
    properties,
    ...(required && {
      required,
    }),
  };
}
//@ chunk-weh04swb.js:17892-18056 placement
function describeRenamedParam(originalName, schema) {
  let description = Reflect.get(schema, "description");
  let note = `(The tool's own "${originalName}" parameter, passed under this name.)`;
  return typeof description === "string" && description !== "" ? `${description} ${note}` : note;
}
//@ chunk-weh04swb.js:18056-18143 placement
/**
 * 判断 JSON Schema 的 type 是否表示对象。
 */
function isObjectSchemaType(type) {
  return type === undefined || type === "object" || (Array.isArray(type) && type.includes("object"));
}
//@ chunk-weh04swb.js:18143-18248 placement
function keepValidProperties(properties) {
  return Object.fromEntries(
    Object.entries(properties).flatMap(([key, value]) =>
      isPropertySchemaObject(value) ? [[key, value === true ? {} : value]] : [],
    ),
  );
}
//@ chunk-weh04swb.js:18248-18327 placement
/**
 * 判断属性 schema 是否为对象（true 或普通对象）。
 */
function isPropertySchemaObject(value) {
  return value === true || (typeof value === "object" && value !== null && !Array.isArray(value));
}
//@ chunk-weh04swb.js:18327-18598 placement
function buildToolAnnotations(tool) {
  let title = tool.mcpInfo?.title;
  let picked = {
    ...(title !== undefined && {
      title: truncateSuffix(title, MAX_TITLE_CHARS),
    }),
    ...(tool.readOnlyHint !== undefined && {
      readOnlyHint: tool.readOnlyHint,
    }),
    ...(tool.isDestructive?.({}) === true && {
      destructiveHint: true,
    }),
    ...(tool.isOpenWorld?.({}) === true && {
      openWorldHint: true,
    }),
  };
  return Object.keys(picked).length > 0 ? picked : undefined;
}
//@ chunk-weh04swb.js:18598-18955 placement
/**
 * 构造透传工具的 _meta：透传标记（版本、工具名、目标），以及搜索提示、始终加载、结果大小上限与需要用户交互等元信息。
 */
function buildToolMeta(tool, serverInfo) {
  let { inventory, ...target } = serverInfo;
  let marker = {
    v: PASSTHROUGH_ANNOUNCE_FORMAT_VERSION,
    tool: tool.name,
    target,
  };
  return {
    [PASSTHROUGH_MARKER_KEY]: marker,
    ...(tool.searchHint !== undefined && {
      [TOOL_META_KEYS.searchHint]: truncateSuffix(tool.searchHint, MAX_SEARCH_HINT_CHARS),
    }),
    ...(tool.alwaysLoad === true && {
      [TOOL_META_KEYS.alwaysLoad]: true,
    }),
    ...(tool.persistenceThresholdCeiling !== undefined && {
      [TOOL_META_KEYS.maxResultSizeChars]: tool.maxResultSizeChars,
    }),
    ...(tool.requiresUserInteraction?.() === true && {
      [TOOL_META_KEYS.requiresUserInteraction]: true,
    }),
  };
}
export {
  ADMIN_SCOPES,
  createPassthroughMcpBridge,
  buildPassthroughAnnouncement,
  makePassthroughCall,
  refuseNotServedValidation,
  throwNotServed,
};
