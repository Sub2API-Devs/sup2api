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
  RelatedTaskMetadataSchema,
  RELATED_TASK_META_KEY,
  ElicitRequestSchema,
  ElicitationCompleteNotificationSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { hostedDesktopRefusal } from "./mcpWireUtils.js";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import {
  executeNotificationHooks,
  executeElicitationHooks,
  executeElicitationResultHooks,
} from "../../utils/hooks.js";
import { getSessionIdentity } from "../../utils/shutdown/pendingWrites.js";
import { hq } from "../../utils/hooks/hookMessages.js";
import { oa } from "../../types/ids.js";
import { isDiskless } from "../../bootstrap/state.js";
import { NoProjectDirectoryError } from "../../bootstrap/sessionSlices.js";
import {
  Mdn,
  IO_MODELCONTEXTPROTOCOL_RELATED_TASK,
} from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { jsonStringify, clone } from "../../utils/slowOperations.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import {
  iYn,
  isPluginPasswordField,
  hasPluginUserConfig,
} from "../../plugins/bundled/claudeTest/userConfig.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { xr } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { MCP_ELICITATION_DIALOG, MCP_ELICITATION_WAITING_DIALOG } from "./elicitationDialogs.js";

/**
 * 从 elicitation 请求的 `_meta` 中解析关联的任务元数据（related task），成功返回 {taskId}，否则 null。（v1）
 */
//@ chunk-bma111ke.js:476-567 facade-exports
function parseRelatedTaskMetadata(e) {
  let safeParse = RelatedTaskMetadataSchema.safeParse(e?.[RELATED_TASK_META_KEY]);
  return safeParse.success ? { taskId: safeParse.data.taskId } : null;
}
/**
 * registerElicitationHandler：为客户端注册 elicitation/create 请求处理与 elicitation complete 通知处理；请求交给 elicitation 控制器（先跑 Elicitation hooks，再弹对话框，最后跑 ElicitationResult hooks）。
 */
//@ chunk-bma111ke.js:567-1178 facade-exports = registerElicitationHandler (0.477)
function registerElicitationHandler(client, serverName, requestDialog, transportErrorState, pluginSource) {
  if (hostedDesktopRefusal({ name: serverName }) !== void 0) return;
  let elicitationController = TBt(client, {
    serverName: serverName,
    pluginSource: pluginSource,
    requestDialog: requestDialog,
    transportErrorState: transportErrorState,
    runElicitationHooks: runElicitationHooks,
    runElicitationResultHooks: runElicitationResultHooks,
  });
  try {
    (client.setRequestHandler(ElicitRequestSchema, (request, extra) =>
      elicitationController.handle(request, { signal: extra.signal }),
    ),
      client.setNotificationHandler(ElicitationCompleteNotificationSchema, (resolve) => {
        let { elicitationId: elicitationId } = resolve.params;
        if (
          (logMCPDebug(serverName, `Received elicitation completion notification: ${elicitationId}`),
          executeNotificationHooks(getSessionIdentity(), {
            message: `MCP server "${serverName}" confirmed elicitation ${elicitationId} complete`,
            notificationType: "elicitation_complete",
          }).catch(hq),
          !elicitationController.complete(elicitationId))
        )
          logMCPDebug(
            serverName,
            `Ignoring completion notification for unknown elicitation: ${elicitationId}`,
          );
      }));
  } catch {
    return;
  }
}
/**
 * handleElicitationForConnection：为已连接服务器构造 elicitation 控制器并处理一次 elicitation 参数（用于工具调用中 URL elicitation 重试）。
 */
//@ chunk-bma111ke.js:1178-1506 facade-exports
function handleElicitationRequest({
  connected: connected,
  params: params,
  signal: signal,
  requestDialog: requestDialog,
  transportErrorState: transportErrorState,
}) {
  return TBt(oa(connected.client), {
    serverName: connected.name,
    pluginSource: connected.config.pluginSource,
    requestDialog: requestDialog,
    transportErrorState: connected.transportErrorState,
    runElicitationHooks: runElicitationHooks,
    runElicitationResultHooks: runElicitationResultHooks,
  }).handle({ params: params }, { signal: signal, transportErrorState: transportErrorState });
}
/**
 * runElicitationHooks：执行 Elicitation hooks；hook 阻断时返回 decline，hook 给出响应时直接作为结果，否则返回 undefined 交给 UI。
 */
//@ chunk-bma111ke.js:1506-2023 facade-exports = runElicitationHooks (0.977)
async function runElicitationHooks(serverName, params, signal) {
  let c = getSessionIdentity();
  if (c.project === null && !isDiskless()) throw new NoProjectDirectoryError();
  try {
    let r = params.mode === "url" ? "url" : "form",
      o = "url" in params ? params.url : void 0,
      n = "elicitationId" in params ? params.elicitationId : void 0,
      { elicitationResponse: elicitationResponse, blockingError: blockingError } =
        await executeElicitationHooks({
          session: c,
          serverName: serverName,
          message: params.message,
          requestedSchema: "requestedSchema" in params ? params.requestedSchema : void 0,
          signal: signal,
          mode: r,
          url: o,
          elicitationId: n,
        });
    if (blockingError) return { action: "decline" };
    if (elicitationResponse)
      return { action: elicitationResponse.action, content: elicitationResponse.content };
    return;
  } catch (error) {
    logMCPError(serverName, `Elicitation hook error: ${error}`);
    return;
  }
}
/**
 * runElicitationResultHooks：执行 ElicitationResult hooks，可改写 action/content 或阻断为 decline，并发出 elicitation_response 通知 hook。
 */
//@ chunk-bma111ke.js:2023-2773 facade-exports = runElicitationResultHooks (0.976)
async function runElicitationResultHooks(serverName, result, signal, mode, elicitationId) {
  let o = getSessionIdentity();
  if (o.project === null && !isDiskless()) throw new NoProjectDirectoryError();
  try {
    let { elicitationResultResponse: elicitationResultResponse, blockingError: blockingError } =
      await executeElicitationResultHooks({
        session: o,
        serverName: serverName,
        action: result.action,
        content: result.content,
        signal: signal,
        mode: mode,
        elicitationId: elicitationId,
      });
    if (blockingError)
      return (
        executeNotificationHooks(o, {
          message: `Elicitation response for server "${serverName}": decline`,
          notificationType: "elicitation_response",
        }).catch(hq),
        { action: "decline" }
      );
    let finalResult = elicitationResultResponse
      ? {
          action: elicitationResultResponse.action,
          content: elicitationResultResponse.content ?? result.content,
        }
      : result;
    return (
      executeNotificationHooks(o, {
        message: `Elicitation response for server "${serverName}": ${finalResult.action}`,
        notificationType: "elicitation_response",
      }).catch(hq),
      finalResult
    );
  } catch (error) {
    return (
      logMCPError(serverName, `ElicitationResult hook error: ${error}`),
      executeNotificationHooks(o, {
        message: `Elicitation response for server "${serverName}": ${result.action}`,
        notificationType: "elicitation_response",
      }).catch(hq),
      result
    );
  }
}
/**
 * 从 elicitation 请求 `_meta` 解析关联任务 id。（v2 副本）
 */
//@ chunk-n8fn2df7.js:468-559 facade-exports
function parseRelatedTaskMetadata_2(e) {
  let safeParse = Mdn.safeParse(e?.[IO_MODELCONTEXTPROTOCOL_RELATED_TASK]);
  return safeParse.success ? { taskId: safeParse.data.taskId } : null;
}
/**
 * 给已连接的 MCP 客户端注册 elicitation 处理（v2）：`elicitation/create` 交给处理器（会先跑 Elicitation 钩子、再弹表单/URL 对话框、再跑 ElicitationResult 钩子），`notifications/elicitation/complete` 关闭对应 URL elicitation 并发系统通知；已有自定义处理器或注册失败时跳过。
 */
//@ chunk-n8fn2df7.js:559-1227 facade-exports
function registerElicitationHandler_2(e, t, s, c, r) {
  if (hostedDesktopRefusal({ name: t }) !== void 0) return;
  let i = TBt(e, {
    serverName: t,
    pluginSource: r,
    requestDialog: s,
    transportErrorState: c,
    runElicitationHooks: runElicitationHooks_2,
    runElicitationResultHooks: runElicitationResultHooks_2,
  });
  try {
    (e.setRequestHandler("elicitation/create", (n, o) => i.handle(n, { signal: o.mcpReq.signal })),
      e.setNotificationHandler("notifications/elicitation/complete", (n) => {
        let { elicitationId: elicitationId } = n.params;
        if (
          (logMCPDebug(t, `Received elicitation completion notification: ${elicitationId}`),
          executeNotificationHooks(getSessionIdentity(), {
            message: `MCP server "${t}" confirmed elicitation ${elicitationId} complete`,
            notificationType: "elicitation_complete",
          }).catch(hq),
          !i.complete(elicitationId))
        )
          logMCPDebug(t, `Ignoring completion notification for unknown elicitation: ${elicitationId}`);
      }));
  } catch {
    return;
  }
}
/**
 * handleElicitationForConnection（v2 副本）：同 chunk-bma111ke 版本。
 */
//@ chunk-n8fn2df7.js:1227-1555 facade-exports
function handleElicitationRequest_2({
  connected: connected,
  params: params,
  signal: signal,
  requestDialog: requestDialog,
  transportErrorState: transportErrorState,
}) {
  return TBt(oa(connected.client), {
    serverName: connected.name,
    pluginSource: connected.config.pluginSource,
    requestDialog: requestDialog,
    transportErrorState: connected.transportErrorState,
    runElicitationHooks: runElicitationHooks_2,
    runElicitationResultHooks: runElicitationResultHooks_2,
  }).handle({ params: params }, { signal: signal, transportErrorState: transportErrorState });
}
/**
 * runElicitationHooks（v2 副本）。
 */
//@ chunk-n8fn2df7.js:1555-2072 facade-exports = runElicitationHooks (0.977)
async function runElicitationHooks_2(serverName, params, signal) {
  let c = getSessionIdentity();
  if (c.project === null && !isDiskless()) throw new NoProjectDirectoryError();
  try {
    let r = params.mode === "url" ? "url" : "form",
      i = "url" in params ? params.url : void 0,
      n = "elicitationId" in params ? params.elicitationId : void 0,
      { elicitationResponse: elicitationResponse, blockingError: blockingError } =
        await executeElicitationHooks({
          session: c,
          serverName: serverName,
          message: params.message,
          requestedSchema: "requestedSchema" in params ? params.requestedSchema : void 0,
          signal: signal,
          mode: r,
          url: i,
          elicitationId: n,
        });
    if (blockingError) return { action: "decline" };
    if (elicitationResponse)
      return { action: elicitationResponse.action, content: elicitationResponse.content };
    return;
  } catch (error) {
    logMCPError(serverName, `Elicitation hook error: ${error}`);
    return;
  }
}
/**
 * runElicitationResultHooks（v2 副本）。
 */
//@ chunk-n8fn2df7.js:2072-2822 facade-exports = runElicitationResultHooks (0.976)
async function runElicitationResultHooks_2(serverName, result, signal, mode, elicitationId) {
  let i = getSessionIdentity();
  if (i.project === null && !isDiskless()) throw new NoProjectDirectoryError();
  try {
    let { elicitationResultResponse: elicitationResultResponse, blockingError: blockingError } =
      await executeElicitationResultHooks({
        session: i,
        serverName: serverName,
        action: result.action,
        content: result.content,
        signal: signal,
        mode: mode,
        elicitationId: elicitationId,
      });
    if (blockingError)
      return (
        executeNotificationHooks(i, {
          message: `Elicitation response for server "${serverName}": decline`,
          notificationType: "elicitation_response",
        }).catch(hq),
        { action: "decline" }
      );
    let finalResult = elicitationResultResponse
      ? {
          action: elicitationResultResponse.action,
          content: elicitationResultResponse.content ?? result.content,
        }
      : result;
    return (
      executeNotificationHooks(i, {
        message: `Elicitation response for server "${serverName}": ${finalResult.action}`,
        notificationType: "elicitation_response",
      }).catch(hq),
      finalResult
    );
  } catch (error) {
    return (
      logMCPError(serverName, `ElicitationResult hook error: ${error}`),
      executeNotificationHooks(i, {
        message: `Elicitation response for server "${serverName}": ${result.action}`,
        notificationType: "elicitation_response",
      }).catch(hq),
      result
    );
  }
}
/**
 * MCP elicitation 处理器：先跑 Elicitation 钩子（内置插件服务器只接受真人的接受）、再弹对话框询问用户，敏感字段在日志中打码，之后跑 ElicitationResult 钩子；URL 模式下维护等待完成的流程与"等待中"对话框。
 */
//@ chunk-bgxm64nj.js:532-4289 sole-consumer
class ElicitationController {
  urlFlows = new Map();
  deps;
  client;
  constructor(e, t) {
    ((this.deps = e), (this.client = t));
  }
  hasCompletionChannel() {
    return this.client?.getProtocolEra?.() !== "modern";
  }
  rebind(e) {
    this.deps = e;
  }
  handle = async (e, t) => {
    let { signal: signal } = t,
      { serverName: serverName, pluginSource: pluginSource } = this.deps;
    if (hostedDesktopRefusal({ name: serverName }) !== void 0) return { action: "cancel" };
    let l = "transportErrorState" in t ? t.transportErrorState : this.deps.transportErrorState;
    if (l) l.pendingElicitations++;
    logMCPDebug(serverName, `Received elicitation request: ${jsonStringify(e)}`);
    let { params: params } = e,
      p = getElicitationMode(params);
    logEvent("tengu_mcp_elicitation_shown", { mode: fromEnum(p) });
    let u = iYn(serverName, pluginSource);
    try {
      let runElicitationHooks = await this.deps.runElicitationHooks(
        serverName,
        u ? clone(params) : params,
        signal,
      );
      if (u && runElicitationHooks?.action === "accept")
        logMCPDebug(
          serverName,
          "An Elicitation hook answered accept. Only a person can accept the questions of a built-in plugin's server of this name, so the question goes to the person",
        );
      else if (runElicitationHooks) {
        let w = u ? { action: "cancel" } : runElicitationHooks;
        return (
          logMCPDebug(
            serverName,
            u
              ? `An Elicitation hook answered ${runElicitationHooks.action}. The person was not asked, and this server gets cancel: it takes only the person's own accept or decline`
              : `Elicitation resolved by hook: ${jsonStringify(runElicitationHooks)}`,
          ),
          logEvent("tengu_mcp_elicitation_response", {
            mode: fromEnum(p),
            action: fromEnum(w.action),
            byHook: !0,
          }),
          logFeatureOk("mcp_elicitation_handle"),
          w
        );
      }
      let f = params.mode === "url" && this.hasCompletionChannel() ? params.elicitationId : void 0,
        { result: r, flow: flow } = await this.ask(params, signal, p, f, l),
        C = "requestedSchema" in params ? params.requestedSchema.properties : void 0,
        M =
          r.content === void 0
            ? r
            : {
                ...r,
                content: xr(r.content, (w, S) => {
                  let v = C?.[S];
                  return typeof v === "object" &&
                    v !== null &&
                    isPluginPasswordField(serverName, pluginSource, S, v)
                    ? "[masked]"
                    : w;
                }),
              };
      logMCPDebug(serverName, `Elicitation response: ${jsonStringify(M)}`);
      let R = u ? clone(r) : r,
        runElicitationResultHooks = await this.deps.runElicitationResultHooks(serverName, R, signal, p, f),
        y = r.action === "accept" && runElicitationResultHooks.action !== "accept",
        P = y ? { action: "cancel" } : r;
      if (u && runElicitationResultHooks !== R)
        logMCPDebug(
          serverName,
          y
            ? `An ElicitationResult hook answered ${runElicitationResultHooks.action}, so the person's accept goes to this server as cancel`
            : `An ElicitationResult hook answered ${runElicitationResultHooks.action}. For this server a hook can only turn the person's accept into cancel, so the server gets the person's own answer: ${r.action}`,
        );
      let E = u ? P : runElicitationResultHooks;
      if (E.action !== r.action)
        logEvent("tengu_mcp_elicitation_result_hook", { mode: fromEnum(p), action: fromEnum(E.action) });
      if (params.mode === "url" && r.action === "accept" && E.action !== "accept")
        this.abandonWaiting(f, flow);
      return (logFeatureOk("mcp_elicitation_handle"), E);
    } catch (error) {
      return (
        logMCPError(serverName, `Elicitation error: ${error}`),
        logFeatureBad("mcp_elicitation_handle", "handler_error"),
        { action: "cancel" }
      );
    } finally {
      if (l) (l.pendingElicitations--, (l.lastElicitationClosedAt = Date.now()));
    }
  };
  complete = (e) => {
    let t = this.urlFlows.get(e);
    if (!t || t.size === 0) return !1;
    for (let o of t) ((o.completed = !0), o.closeWaiting?.());
    return !0;
  };
  abandonWaiting(e, t) {
    (t?.closeWaiting?.(), this.forget(e, t));
  }
  async ask(e, t, o, i, d) {
    if (t.aborted) return { result: { action: "cancel" }, flow: void 0 };
    let { serverName: serverName, pluginSource: pluginSource, requestDialog: requestDialog } = this.deps,
      u = hasPluginUserConfig(serverName, pluginSource),
      n;
    if (i !== void 0) {
      n = { completed: !1, closeWaiting: void 0 };
      let r = this.urlFlows.get(i);
      if (r) r.add(n);
      else this.urlFlows.set(i, new Set([n]));
    }
    let f = await requestDialog(
      MCP_ELICITATION_DIALOG,
      {
        serverName: serverName,
        ...(pluginSource !== void 0 && { pluginSource: pluginSource }),
        params: e,
        ...(e.mode === "url" && i === void 0 && { userConfirmsCompletion: !0 }),
      },
      { place: "under", signal: t, ...(u && { alsoHideWhile: ["draft"] }) },
    );
    if (!t.aborted)
      logEvent("tengu_mcp_elicitation_response", { mode: fromEnum(o), action: fromEnum(f.action) });
    if (e.mode === "url" && f.action === "accept" && n)
      if (n.completed) this.forget(i, n);
      else this.showWaiting(e, i, n, t, d);
    else this.forget(i, n);
    return { result: f, flow: n };
  }
  async showWaiting(e, t, o, i, d) {
    let abortController = new AbortController();
    if (((o.closeWaiting = () => abortController.abort()), d)) d.pendingElicitations++;
    try {
      await this.deps.requestDialog(
        MCP_ELICITATION_WAITING_DIALOG,
        { serverName: this.deps.serverName, params: e, waitingState: { actionLabel: "Skip confirmation" } },
        { signal: AbortSignal.any([abortController.signal, i]), succeeds: !0 },
      );
    } finally {
      if (d) (d.pendingElicitations--, (d.lastElicitationClosedAt = Date.now()));
    }
    this.forget(t, o);
  }
  forget(e, t) {
    if (e === void 0 || t === void 0) return;
    let o = this.urlFlows.get(e);
    if (!o) return;
    if ((o.delete(t), o.size === 0)) this.urlFlows.delete(e);
  }
}
//@ chunk-bgxm64nj.js:4289-4338 fingerprint = getElicitationMode (1)
function getElicitationMode(params) {
  return params.mode === "url" ? "url" : "form";
}
//@ chunk-bgxm64nj.js:4338-4356 sole-consumer
var weakMap = new WeakMap();
//@ chunk-bgxm64nj.js:4356-4452 sole-consumer
function TBt(e, t) {
  let o = weakMap.get(e);
  if (o) return (o.rebind(t), o);
  let i = new ElicitationController(t, e);
  return (weakMap.set(e, i), i);
}

export {
  runElicitationHooks_2,
  runElicitationResultHooks_2,
  handleElicitationRequest_2,
  runElicitationHooks,
  runElicitationResultHooks,
};
