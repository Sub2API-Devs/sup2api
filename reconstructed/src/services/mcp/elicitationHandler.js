/**
 * services/mcp/elicitationHandler.ts
 *
 * MCP elicitation（服务器向用户索取输入）处理：注册请求/完成通知处理器，前后运行 Elicitation/ElicitationResult hooks。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/elicitationHandler.ts
 * pieces: chunk-bgxm64nj.js (4), chunk-bma111ke.js (5), chunk-n8fn2df7.js (5)
 * attribution: sole-consumer 3, fingerprint 1, facade-exports 10
 */
import {
  RelatedTaskMetadataSchema as RelatedTaskMetadataSchema_2,
  RELATED_TASK_META_KEY as RELATED_TASK_META_KEY_2,
  ElicitRequestSchema,
  ElicitationCompleteNotificationSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { hostedDesktopRefusal_2 } from "./mcpWireUtils.js";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import {
  executeNotificationHooks,
  executeElicitationHooks,
  executeElicitationResultHooks,
} from "../../utils/hooks.js";
import { getSessionIdentity } from "../../utils/shutdown/pendingWrites.js";
import { logHookExecutionFailure } from "../../utils/hooks/hookMessages.js";
import { identityId2 } from "../../types/ids.js";
import { isDiskless } from "../../bootstrap/state.js";
import { NoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import {
  RelatedTaskMetadataSchema,
  RELATED_TASK_META_KEY,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { jsonStringify, clone } from "../../utils/slowOperations.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import {
  isPersonOnlyPluginServer,
  isPluginPasswordField,
  hasPluginUserConfig,
} from "../../plugins/bundled/claudeTest/userConfig.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { MCP_ELICITATION_DIALOG, MCP_ELICITATION_WAITING_DIALOG } from "./elicitationDialogs.js";

//@ chunk-bma111ke.js:476-567 facade-exports
/**
 * 从 elicitation 请求的 `_meta` 中解析关联的任务元数据（related task），成功返回 {taskId}，否则 null。（v1）
 */
function parseRelatedTaskMetadata(e) {
  let t = RelatedTaskMetadataSchema_2.safeParse(e?.[RELATED_TASK_META_KEY_2]);
  return t.success
    ? {
        taskId: t.data.taskId,
      }
    : null;
}
//@ chunk-bma111ke.js:567-1178 facade-exports = registerElicitationHandler (0.477)
/**
 * registerElicitationHandler：为客户端注册 elicitation/create 请求处理与 elicitation complete 通知处理；请求交给 elicitation 控制器（先跑 Elicitation hooks，再弹对话框，最后跑 ElicitationResult hooks）。
 */
function registerElicitationHandler(client, serverName, requestDialog, transportErrorState, pluginSource) {
  if (
    hostedDesktopRefusal_2({
      name: serverName,
    }) !== undefined
  )
    return;
  let elicitationController = getElicitationController(client, {
    serverName,
    pluginSource,
    requestDialog,
    transportErrorState,
    runElicitationHooks,
    runElicitationResultHooks,
  });
  try {
    client.setRequestHandler(ElicitRequestSchema, (request, extra) =>
      elicitationController.handle(request, {
        signal: extra.signal,
      }),
    );
    client.setNotificationHandler(ElicitationCompleteNotificationSchema, (resolve) => {
      let { elicitationId } = resolve.params;
      logMCPDebug(serverName, `Received elicitation completion notification: ${elicitationId}`);
      executeNotificationHooks(getSessionIdentity(), {
        message: `MCP server "${serverName}" confirmed elicitation ${elicitationId} complete`,
        notificationType: "elicitation_complete",
      }).catch(logHookExecutionFailure);
      if (!elicitationController.complete(elicitationId))
        logMCPDebug(serverName, `Ignoring completion notification for unknown elicitation: ${elicitationId}`);
    });
  } catch {
    return;
  }
}
//@ chunk-bma111ke.js:1178-1506 facade-exports
/**
 * handleElicitationForConnection：为已连接服务器构造 elicitation 控制器并处理一次 elicitation 参数（用于工具调用中 URL elicitation 重试）。
 */
function handleElicitationRequest({ connected, params, signal, requestDialog, transportErrorState }) {
  return getElicitationController(identityId2(connected.client), {
    serverName: connected.name,
    pluginSource: connected.config.pluginSource,
    requestDialog,
    transportErrorState: connected.transportErrorState,
    runElicitationHooks,
    runElicitationResultHooks,
  }).handle(
    {
      params,
    },
    {
      signal,
      transportErrorState,
    },
  );
}
//@ chunk-bma111ke.js:1506-2023 facade-exports = runElicitationHooks (0.977)
/**
 * runElicitationHooks：执行 Elicitation hooks；hook 阻断时返回 decline，hook 给出响应时直接作为结果，否则返回 undefined 交给 UI。
 */
async function runElicitationHooks(serverName, params, signal) {
  let sessionIdentity = getSessionIdentity();
  if (sessionIdentity.project === null && !isDiskless()) throw new NoProjectDirectoryError();
  try {
    let mode = params.mode === "url" ? "url" : "form";
    let url = "url" in params ? params.url : undefined;
    let elicitationId = "elicitationId" in params ? params.elicitationId : undefined;
    let { elicitationResponse, blockingError } = await executeElicitationHooks({
      session: sessionIdentity,
      serverName,
      message: params.message,
      requestedSchema: "requestedSchema" in params ? params.requestedSchema : undefined,
      signal,
      mode,
      url,
      elicitationId,
    });
    if (blockingError)
      return {
        action: "decline",
      };
    if (elicitationResponse)
      return {
        action: elicitationResponse.action,
        content: elicitationResponse.content,
      };
    return;
  } catch (error) {
    logMCPError(serverName, `Elicitation hook error: ${error}`);
    return;
  }
}
//@ chunk-bma111ke.js:2023-2773 facade-exports = runElicitationResultHooks (0.976)
/**
 * runElicitationResultHooks：执行 ElicitationResult hooks，可改写 action/content 或阻断为 decline，并发出 elicitation_response 通知 hook。
 */
async function runElicitationResultHooks(serverName, result, signal, mode, elicitationId) {
  let sessionIdentity = getSessionIdentity();
  if (sessionIdentity.project === null && !isDiskless()) throw new NoProjectDirectoryError();
  try {
    let { elicitationResultResponse, blockingError } = await executeElicitationResultHooks({
      session: sessionIdentity,
      serverName,
      action: result.action,
      content: result.content,
      signal,
      mode,
      elicitationId,
    });
    if (blockingError) {
      executeNotificationHooks(sessionIdentity, {
        message: `Elicitation response for server "${serverName}": decline`,
        notificationType: "elicitation_response",
      }).catch(logHookExecutionFailure);
      return {
        action: "decline",
      };
    }
    let finalResult = elicitationResultResponse
      ? {
          action: elicitationResultResponse.action,
          content: elicitationResultResponse.content ?? result.content,
        }
      : result;
    executeNotificationHooks(sessionIdentity, {
      message: `Elicitation response for server "${serverName}": ${finalResult.action}`,
      notificationType: "elicitation_response",
    }).catch(logHookExecutionFailure);
    return finalResult;
  } catch (error) {
    logMCPError(serverName, `ElicitationResult hook error: ${error}`);
    executeNotificationHooks(sessionIdentity, {
      message: `Elicitation response for server "${serverName}": ${result.action}`,
      notificationType: "elicitation_response",
    }).catch(logHookExecutionFailure);
    return result;
  }
}
//@ chunk-n8fn2df7.js:468-559 facade-exports
/**
 * 从 elicitation 请求 `_meta` 解析关联任务 id。（v2 副本）
 */
function parseRelatedTaskMetadata_2(e) {
  let t = RelatedTaskMetadataSchema.safeParse(e?.[RELATED_TASK_META_KEY]);
  return t.success
    ? {
        taskId: t.data.taskId,
      }
    : null;
}
//@ chunk-n8fn2df7.js:559-1227 facade-exports
/**
 * 给已连接的 MCP 客户端注册 elicitation 处理（v2）：`elicitation/create` 交给处理器（会先跑 Elicitation 钩子、再弹表单/URL 对话框、再跑 ElicitationResult 钩子），`notifications/elicitation/complete` 关闭对应 URL elicitation 并发系统通知；已有自定义处理器或注册失败时跳过。
 */
function registerElicitationHandler_2(e, t, requestDialog, transportErrorState, pluginSource) {
  if (
    hostedDesktopRefusal_2({
      name: t,
    }) !== undefined
  )
    return;
  let elicitationController = getElicitationController(e, {
    serverName: t,
    pluginSource,
    requestDialog,
    transportErrorState,
    runElicitationHooks: runElicitationHooks_2,
    runElicitationResultHooks: runElicitationResultHooks_2,
  });
  try {
    e.setRequestHandler("elicitation/create", (n, o) =>
      elicitationController.handle(n, {
        signal: o.mcpReq.signal,
      }),
    );
    e.setNotificationHandler("notifications/elicitation/complete", (n) => {
      let { elicitationId } = n.params;
      logMCPDebug(t, `Received elicitation completion notification: ${elicitationId}`);
      executeNotificationHooks(getSessionIdentity(), {
        message: `MCP server "${t}" confirmed elicitation ${elicitationId} complete`,
        notificationType: "elicitation_complete",
      }).catch(logHookExecutionFailure);
      if (!elicitationController.complete(elicitationId))
        logMCPDebug(t, `Ignoring completion notification for unknown elicitation: ${elicitationId}`);
    });
  } catch {
    return;
  }
}
//@ chunk-n8fn2df7.js:1227-1555 facade-exports
/**
 * handleElicitationForConnection（v2 副本）：同 chunk-bma111ke 版本。
 */
function handleElicitationRequest_2({ connected, params, signal, requestDialog, transportErrorState }) {
  return getElicitationController(identityId2(connected.client), {
    serverName: connected.name,
    pluginSource: connected.config.pluginSource,
    requestDialog,
    transportErrorState: connected.transportErrorState,
    runElicitationHooks: runElicitationHooks_2,
    runElicitationResultHooks: runElicitationResultHooks_2,
  }).handle(
    {
      params,
    },
    {
      signal,
      transportErrorState,
    },
  );
}
//@ chunk-n8fn2df7.js:1555-2072 facade-exports = runElicitationHooks (0.977)
/**
 * runElicitationHooks（v2 副本）。
 */
async function runElicitationHooks_2(serverName, params, signal) {
  let sessionIdentity = getSessionIdentity();
  if (sessionIdentity.project === null && !isDiskless()) throw new NoProjectDirectoryError();
  try {
    let mode = params.mode === "url" ? "url" : "form";
    let url = "url" in params ? params.url : undefined;
    let elicitationId = "elicitationId" in params ? params.elicitationId : undefined;
    let { elicitationResponse, blockingError } = await executeElicitationHooks({
      session: sessionIdentity,
      serverName,
      message: params.message,
      requestedSchema: "requestedSchema" in params ? params.requestedSchema : undefined,
      signal,
      mode,
      url,
      elicitationId,
    });
    if (blockingError)
      return {
        action: "decline",
      };
    if (elicitationResponse)
      return {
        action: elicitationResponse.action,
        content: elicitationResponse.content,
      };
    return;
  } catch (error) {
    logMCPError(serverName, `Elicitation hook error: ${error}`);
    return;
  }
}
//@ chunk-n8fn2df7.js:2072-2822 facade-exports = runElicitationResultHooks (0.976)
/**
 * runElicitationResultHooks（v2 副本）。
 */
async function runElicitationResultHooks_2(serverName, result, signal, mode, elicitationId) {
  let sessionIdentity = getSessionIdentity();
  if (sessionIdentity.project === null && !isDiskless()) throw new NoProjectDirectoryError();
  try {
    let { elicitationResultResponse, blockingError } = await executeElicitationResultHooks({
      session: sessionIdentity,
      serverName,
      action: result.action,
      content: result.content,
      signal,
      mode,
      elicitationId,
    });
    if (blockingError) {
      executeNotificationHooks(sessionIdentity, {
        message: `Elicitation response for server "${serverName}": decline`,
        notificationType: "elicitation_response",
      }).catch(logHookExecutionFailure);
      return {
        action: "decline",
      };
    }
    let finalResult = elicitationResultResponse
      ? {
          action: elicitationResultResponse.action,
          content: elicitationResultResponse.content ?? result.content,
        }
      : result;
    executeNotificationHooks(sessionIdentity, {
      message: `Elicitation response for server "${serverName}": ${finalResult.action}`,
      notificationType: "elicitation_response",
    }).catch(logHookExecutionFailure);
    return finalResult;
  } catch (error) {
    logMCPError(serverName, `ElicitationResult hook error: ${error}`);
    executeNotificationHooks(sessionIdentity, {
      message: `Elicitation response for server "${serverName}": ${result.action}`,
      notificationType: "elicitation_response",
    }).catch(logHookExecutionFailure);
    return result;
  }
}
//@ chunk-bgxm64nj.js:532-4289 sole-consumer
/**
 * MCP elicitation 处理器：先跑 Elicitation 钩子（内置插件服务器只接受真人的接受）、再弹对话框询问用户，敏感字段在日志中打码，之后跑 ElicitationResult 钩子；URL 模式下维护等待完成的流程与"等待中"对话框。
 */
class ElicitationController {
  urlFlows = new Map();
  deps;
  client;
  constructor(deps, client) {
    this.deps = deps;
    this.client = client;
  }
  hasCompletionChannel() {
    return this.client?.getProtocolEra?.() !== "modern";
  }
  rebind(deps) {
    this.deps = deps;
  }
  handle = async (e, t) => {
    let { signal } = t;
    let { serverName, pluginSource } = this.deps;
    if (
      hostedDesktopRefusal_2({
        name: serverName,
      }) !== undefined
    )
      return {
        action: "cancel",
      };
    let transportErrorState =
      "transportErrorState" in t ? t.transportErrorState : this.deps.transportErrorState;
    if (transportErrorState) transportErrorState.pendingElicitations++;
    logMCPDebug(serverName, `Received elicitation request: ${jsonStringify(e)}`);
    let { params } = e;
    let elicitationMode = getElicitationMode(params);
    logEvent("tengu_mcp_elicitation_shown", {
      mode: fromEnum(elicitationMode),
    });
    let u = isPersonOnlyPluginServer(serverName, pluginSource);
    try {
      let n = await this.deps.runElicitationHooks(serverName, u ? clone(params) : params, signal);
      if (u && n?.action === "accept")
        logMCPDebug(
          serverName,
          "An Elicitation hook answered accept. Only a person can accept the questions of a built-in plugin's server of this name, so the question goes to the person",
        );
      else if (n) {
        let w = u
          ? {
              action: "cancel",
            }
          : n;
        logMCPDebug(
          serverName,
          u
            ? `An Elicitation hook answered ${n.action}. The person was not asked, and this server gets cancel: it takes only the person's own accept or decline`
            : `Elicitation resolved by hook: ${jsonStringify(n)}`,
        );
        logEvent("tengu_mcp_elicitation_response", {
          mode: fromEnum(elicitationMode),
          action: fromEnum(w.action),
          byHook: true,
        });
        logFeatureOk("mcp_elicitation_handle");
        return w;
      }
      let elicitationId =
        params.mode === "url" && this.hasCompletionChannel() ? params.elicitationId : undefined;
      let { result: r, flow } = await this.ask(
        params,
        signal,
        elicitationMode,
        elicitationId,
        transportErrorState,
      );
      let properties = "requestedSchema" in params ? params.requestedSchema.properties : undefined;
      let M =
        r.content === undefined
          ? r
          : {
              ...r,
              content: xr(r.content, (w, S) => {
                let v = properties?.[S];
                return typeof v === "object" &&
                  v !== null &&
                  isPluginPasswordField(serverName, pluginSource, S, v)
                  ? "[masked]"
                  : w;
              }),
            };
      logMCPDebug(serverName, `Elicitation response: ${jsonStringify(M)}`);
      let R = u ? clone(r) : r;
      let h = await this.deps.runElicitationResultHooks(
        serverName,
        R,
        signal,
        elicitationMode,
        elicitationId,
      );
      let y = r.action === "accept" && h.action !== "accept";
      let P = y
        ? {
            action: "cancel",
          }
        : r;
      if (u && h !== R)
        logMCPDebug(
          serverName,
          y
            ? `An ElicitationResult hook answered ${h.action}, so the person's accept goes to this server as cancel`
            : `An ElicitationResult hook answered ${h.action}. For this server a hook can only turn the person's accept into cancel, so the server gets the person's own answer: ${r.action}`,
        );
      let E = u ? P : h;
      if (E.action !== r.action)
        logEvent("tengu_mcp_elicitation_result_hook", {
          mode: fromEnum(elicitationMode),
          action: fromEnum(E.action),
        });
      if (params.mode === "url" && r.action === "accept" && E.action !== "accept")
        this.abandonWaiting(elicitationId, flow);
      logFeatureOk("mcp_elicitation_handle");
      return E;
    } catch (error) {
      logMCPError(serverName, `Elicitation error: ${error}`);
      logFeatureBad("mcp_elicitation_handle", "handler_error");
      return {
        action: "cancel",
      };
    } finally {
      if (transportErrorState) {
        transportErrorState.pendingElicitations--;
        transportErrorState.lastElicitationClosedAt = Date.now();
      }
    }
  };
  complete = (e) => {
    let t = this.urlFlows.get(e);
    if (!t || t.size === 0) return false;
    for (let o of t) {
      o.completed = true;
      o.closeWaiting?.();
    }
    return true;
  };
  abandonWaiting(e, t) {
    t?.closeWaiting?.();
    this.forget(e, t);
  }
  async ask(e, t, o, i, d) {
    if (t.aborted)
      return {
        result: {
          action: "cancel",
        },
        flow: undefined,
      };
    let { serverName, pluginSource, requestDialog } = this.deps;
    let u = hasPluginUserConfig(serverName, pluginSource);
    let n;
    if (i !== undefined) {
      n = {
        completed: false,
        closeWaiting: undefined,
      };
      let r = this.urlFlows.get(i);
      if (r) r.add(n);
      else this.urlFlows.set(i, new Set([n]));
    }
    let f = await requestDialog(
      MCP_ELICITATION_DIALOG,
      {
        serverName,
        ...(pluginSource !== undefined && {
          pluginSource,
        }),
        params: e,
        ...(e.mode === "url" &&
          i === undefined && {
            userConfirmsCompletion: true,
          }),
      },
      {
        place: "under",
        signal: t,
        ...(u && {
          alsoHideWhile: ["draft"],
        }),
      },
    );
    if (!t.aborted)
      logEvent("tengu_mcp_elicitation_response", {
        mode: fromEnum(o),
        action: fromEnum(f.action),
      });
    if (e.mode === "url" && f.action === "accept" && n) {
      if (n.completed) this.forget(i, n);
      else this.showWaiting(e, i, n, t, d);
    } else this.forget(i, n);
    return {
      result: f,
      flow: n,
    };
  }
  async showWaiting(params, t, o, i, d) {
    let abortController = new AbortController();
    o.closeWaiting = () => abortController.abort();
    if (d) d.pendingElicitations++;
    try {
      await this.deps.requestDialog(
        MCP_ELICITATION_WAITING_DIALOG,
        {
          serverName: this.deps.serverName,
          params,
          waitingState: {
            actionLabel: "Skip confirmation",
          },
        },
        {
          signal: AbortSignal.any([abortController.signal, i]),
          succeeds: true,
        },
      );
    } finally {
      if (d) {
        d.pendingElicitations--;
        d.lastElicitationClosedAt = Date.now();
      }
    }
    this.forget(t, o);
  }
  forget(e, t) {
    if (e === undefined || t === undefined) return;
    let o = this.urlFlows.get(e);
    if (!o) return;
    o.delete(t);
    if (o.size === 0) this.urlFlows.delete(e);
  }
}
//@ chunk-bgxm64nj.js:4289-4338 fingerprint = getElicitationMode (1)
function getElicitationMode(params) {
  return params.mode === "url" ? "url" : "form";
}
//@ chunk-bgxm64nj.js:4338-4356 sole-consumer
var weakMap = new WeakMap();
//@ chunk-bgxm64nj.js:4356-4452 sole-consumer
/**
 * 取（或创建）某客户端的 elicitation 控制器，并重绑参数。
 */
function getElicitationController(client, deps) {
  let o = weakMap.get(client);
  if (o) {
    o.rebind(deps);
    return o;
  }
  let i = new ElicitationController(deps, client);
  weakMap.set(client, i);
  return i;
}
export {
  runElicitationHooks_2,
  runElicitationResultHooks_2,
  handleElicitationRequest_2,
  runElicitationHooks,
  runElicitationResultHooks,
};
