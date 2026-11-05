/**
 * services/mcp/elicitationHandler.ts
 *
 * MCP elicitation（服务器向用户索取输入）处理：注册请求/完成通知处理器，前后运行 Elicitation/ElicitationResult hooks。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/elicitationHandler.ts
 * pieces: chunk-0sfbgcrn.js (5), chunk-h4qtft3t.js (5), chunk-z9d6k8pq.js (4)
 * attribution: facade-exports 10, sole-consumer 3, fingerprint 1
 */
import { hostedDesktopRefusal_2 } from "./mcpWireUtils.js";
import { logMCPDebug, logMCPError } from "../../utils/log.js";
import { jsonStringify, clone } from "../../utils/slowOperations.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import {
  isPersonOnlyPluginServer,
  isPluginPasswordField,
  hasPluginUserConfig,
} from "../../plugins/bundled/claudeTest/userConfig.js";
import { logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { import_mapValues } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { MCP_ELICITATION_DIALOG, MCP_ELICITATION_WAITING_DIALOG } from "./elicitationDialogs.js";
import { RelatedTaskMetadataSchema as RelatedTaskMetadataSchema_2 } from "../../../vendor/@modelcontextprotocol/core/dist/auth-CUe6YdwF.mjs";
import { RELATED_TASK_META_KEY as RELATED_TASK_META_KEY_2 } from "../../../vendor/@modelcontextprotocol/core/dist/schemas-lGLjBX8n.cjs";
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
  ElicitRequestSchema,
  ElicitationCompleteNotificationSchema,
} from "../../../vendor/@modelcontextprotocol/sdk/dist/esm/types.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-z9d6k8pq.js:533-4291 sole-consumer
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
  handle = async (request, extra) => {
    let { signal } = extra;
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
      "transportErrorState" in extra ? extra.transportErrorState : this.deps.transportErrorState;
    if (transportErrorState) transportErrorState.pendingElicitations++;
    logMCPDebug(serverName, `Received elicitation request: ${jsonStringify(request)}`);
    let { params } = request;
    let elicitationMode = getElicitationMode(params);
    logEvent("tengu_mcp_elicitation_shown", {
      mode: fromEnum(elicitationMode),
    });
    let personOnly = isPersonOnlyPluginServer(serverName, pluginSource);
    try {
      let hookAnswer = await this.deps.runElicitationHooks(
        serverName,
        personOnly ? clone(params) : params,
        signal,
      );
      if (personOnly && hookAnswer?.action === "accept")
        logMCPDebug(
          serverName,
          "An Elicitation hook answered accept. Only a person can accept the questions of a built-in plugin's server of this name, so the question goes to the person",
        );
      else if (hookAnswer) {
        let response = personOnly
          ? {
              action: "cancel",
            }
          : hookAnswer;
        logMCPDebug(
          serverName,
          personOnly
            ? `An Elicitation hook answered ${hookAnswer.action}. The person was not asked, and this server gets cancel: it takes only the person's own accept or decline`
            : `Elicitation resolved by hook: ${jsonStringify(hookAnswer)}`,
        );
        logEvent("tengu_mcp_elicitation_response", {
          mode: fromEnum(elicitationMode),
          action: fromEnum(response.action),
          byHook: true,
        });
        logFeatureOk("mcp_elicitation_handle");
        return response;
      }
      let elicitationId =
        params.mode === "url" && this.hasCompletionChannel() ? params.elicitationId : undefined;
      let { result: personAnswer, flow } = await this.ask(
        params,
        signal,
        elicitationMode,
        elicitationId,
        transportErrorState,
      );
      let properties = "requestedSchema" in params ? params.requestedSchema.properties : undefined;
      let maskedAnswer =
        personAnswer.content === undefined
          ? personAnswer
          : {
              ...personAnswer,
              content: import_mapValues(personAnswer.content, (value, field) => {
                let schema = properties?.[field];
                return typeof schema === "object" &&
                  schema !== null &&
                  isPluginPasswordField(serverName, pluginSource, field, schema)
                  ? "[masked]"
                  : value;
              }),
            };
      logMCPDebug(serverName, `Elicitation response: ${jsonStringify(maskedAnswer)}`);
      let hookInput = personOnly ? clone(personAnswer) : personAnswer;
      let resultHookAnswer = await this.deps.runElicitationResultHooks(
        serverName,
        hookInput,
        signal,
        elicitationMode,
        elicitationId,
      );
      let hookOverrodeAccept = personAnswer.action === "accept" && resultHookAnswer.action !== "accept";
      let fallbackAnswer = hookOverrodeAccept
        ? {
            action: "cancel",
          }
        : personAnswer;
      if (personOnly && resultHookAnswer !== hookInput)
        logMCPDebug(
          serverName,
          hookOverrodeAccept
            ? `An ElicitationResult hook answered ${resultHookAnswer.action}, so the person's accept goes to this server as cancel`
            : `An ElicitationResult hook answered ${resultHookAnswer.action}. For this server a hook can only turn the person's accept into cancel, so the server gets the person's own answer: ${personAnswer.action}`,
        );
      let finalAnswer = personOnly ? fallbackAnswer : resultHookAnswer;
      if (finalAnswer.action !== personAnswer.action)
        logEvent("tengu_mcp_elicitation_result_hook", {
          mode: fromEnum(elicitationMode),
          action: fromEnum(finalAnswer.action),
        });
      if (params.mode === "url" && personAnswer.action === "accept" && finalAnswer.action !== "accept")
        this.abandonWaiting(elicitationId, flow);
      logFeatureOk("mcp_elicitation_handle");
      return finalAnswer;
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
  complete = (elicitationId) => {
    let flows = this.urlFlows.get(elicitationId);
    if (!flows || flows.size === 0) return false;
    for (let flow of flows) {
      flow.completed = true;
      flow.closeWaiting?.();
    }
    return true;
  };
  abandonWaiting(elicitationId, flow) {
    flow?.closeWaiting?.();
    this.forget(elicitationId, flow);
  }
  async ask(params, signal, mode, elicitationId, transportErrorState) {
    if (signal.aborted)
      return {
        result: {
          action: "cancel",
        },
        flow: undefined,
      };
    let { serverName, pluginSource, requestDialog } = this.deps;
    let hideWhileDraft = hasPluginUserConfig(serverName, pluginSource);
    let flow;
    if (elicitationId !== undefined) {
      flow = {
        completed: false,
        closeWaiting: undefined,
      };
      let existing = this.urlFlows.get(elicitationId);
      if (existing) existing.add(flow);
      else this.urlFlows.set(elicitationId, new Set([flow]));
    }
    let answer = await requestDialog(
      MCP_ELICITATION_DIALOG,
      {
        serverName,
        ...(pluginSource !== undefined && {
          pluginSource,
        }),
        params,
        ...(params.mode === "url" &&
          elicitationId === undefined && {
            userConfirmsCompletion: true,
          }),
      },
      {
        place: "under",
        signal,
        ...(hideWhileDraft && {
          alsoHideWhile: ["draft"],
        }),
      },
    );
    if (!signal.aborted)
      logEvent("tengu_mcp_elicitation_response", {
        mode: fromEnum(mode),
        action: fromEnum(answer.action),
      });
    if (params.mode === "url" && answer.action === "accept" && flow) {
      if (flow.completed) this.forget(elicitationId, flow);
      else this.showWaiting(params, elicitationId, flow, signal, transportErrorState);
    } else this.forget(elicitationId, flow);
    return {
      result: answer,
      flow,
    };
  }
  async showWaiting(params, elicitationId, flow, signal, transportErrorState) {
    let abortController = new AbortController();
    flow.closeWaiting = () => abortController.abort();
    if (transportErrorState) transportErrorState.pendingElicitations++;
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
          signal: AbortSignal.any([abortController.signal, signal]),
          succeeds: true,
        },
      );
    } finally {
      if (transportErrorState) {
        transportErrorState.pendingElicitations--;
        transportErrorState.lastElicitationClosedAt = Date.now();
      }
    }
    this.forget(elicitationId, flow);
  }
  forget(elicitationId, flow) {
    if (elicitationId === undefined || flow === undefined) return;
    let flows = this.urlFlows.get(elicitationId);
    if (!flows) return;
    flows.delete(flow);
    if (flows.size === 0) this.urlFlows.delete(elicitationId);
  }
}
//@ chunk-z9d6k8pq.js:4291-4340 fingerprint (2.1.88 match: getElicitationMode, 1)
function getElicitationMode(params) {
  return params.mode === "url" ? "url" : "form";
}
//@ chunk-z9d6k8pq.js:4340-4358 sole-consumer
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-z9d6k8pq.js:4340", () => {
  weakMap = new WeakMap();
});
//@ chunk-z9d6k8pq.js:4358-4454 sole-consumer
/**
 * 取（或创建）某客户端的 elicitation 控制器，并重绑参数。
 */
function getElicitationController(client, deps) {
  let existing = weakMap.get(client);
  if (existing) {
    existing.rebind(deps);
    return existing;
  }
  let controller = new ElicitationController(deps, client);
  weakMap.set(client, controller);
  return controller;
}
//@ chunk-0sfbgcrn.js:468-559 facade-exports
/**
 * 从 elicitation 请求 `_meta` 解析关联任务 id。（v2 副本）
 */
function parseRelatedTaskMetadata(meta) {
  let parseResult = RelatedTaskMetadataSchema_2.safeParse(meta?.[RELATED_TASK_META_KEY_2]);
  return parseResult.success
    ? {
        taskId: parseResult.data.taskId,
      }
    : null;
}
//@ chunk-0sfbgcrn.js:559-1227 facade-exports
/**
 * 给已连接的 MCP 客户端注册 elicitation 处理（v2）：`elicitation/create` 交给处理器（会先跑 Elicitation 钩子、再弹表单/URL 对话框、再跑 ElicitationResult 钩子），`notifications/elicitation/complete` 关闭对应 URL elicitation 并发系统通知；已有自定义处理器或注册失败时跳过。
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
    client.setRequestHandler("elicitation/create", (request, extra) =>
      elicitationController.handle(request, {
        signal: extra.mcpReq.signal,
      }),
    );
    client.setNotificationHandler("notifications/elicitation/complete", (notification) => {
      let { elicitationId } = notification.params;
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
//@ chunk-0sfbgcrn.js:1227-1555 facade-exports
/**
 * handleElicitationForConnection（v2 副本）：同 chunk-bma111ke 版本。
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
//@ chunk-0sfbgcrn.js:1555-2072 facade-exports (2.1.88 match: runElicitationHooks, 0.977)
/**
 * runElicitationHooks（v2 副本）。
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
//@ chunk-0sfbgcrn.js:2072-2822 facade-exports (2.1.88 match: runElicitationResultHooks, 0.976)
/**
 * runElicitationResultHooks（v2 副本）。
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
//@ chunk-h4qtft3t.js:476-567 facade-exports
/**
 * 从 elicitation 请求的 `_meta` 中解析关联的任务元数据（related task），成功返回 {taskId}，否则 null。（v1）
 */
function parseRelatedTaskMetadata_2(meta) {
  let parseResult = RelatedTaskMetadataSchema.safeParse(meta?.[RELATED_TASK_META_KEY]);
  return parseResult.success
    ? {
        taskId: parseResult.data.taskId,
      }
    : null;
}
//@ chunk-h4qtft3t.js:567-1178 facade-exports (2.1.88 match: registerElicitationHandler, 0.477)
/**
 * registerElicitationHandler：为客户端注册 elicitation/create 请求处理与 elicitation complete 通知处理；请求交给 elicitation 控制器（先跑 Elicitation hooks，再弹对话框，最后跑 ElicitationResult hooks）。
 */
function registerElicitationHandler_2(client, serverName, requestDialog, transportErrorState, pluginSource) {
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
    runElicitationHooks: runElicitationHooks_2,
    runElicitationResultHooks: runElicitationResultHooks_2,
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
//@ chunk-h4qtft3t.js:1178-1506 facade-exports
/**
 * handleElicitationForConnection：为已连接服务器构造 elicitation 控制器并处理一次 elicitation 参数（用于工具调用中 URL elicitation 重试）。
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
//@ chunk-h4qtft3t.js:1506-2023 facade-exports (2.1.88 match: runElicitationHooks, 0.977)
/**
 * runElicitationHooks：执行 Elicitation hooks；hook 阻断时返回 decline，hook 给出响应时直接作为结果，否则返回 undefined 交给 UI。
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
//@ chunk-h4qtft3t.js:2023-2773 facade-exports (2.1.88 match: runElicitationResultHooks, 0.976)
/**
 * runElicitationResultHooks：执行 ElicitationResult hooks，可改写 action/content 或阻断为 decline，并发出 elicitation_response 通知 hook。
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
export {
  runElicitationHooks,
  runElicitationResultHooks,
  handleElicitationRequest,
  runElicitationHooks_2,
  runElicitationResultHooks_2,
  parseRelatedTaskMetadata,
  registerElicitationHandler,
  handleElicitationRequest_2,
  parseRelatedTaskMetadata_2,
  registerElicitationHandler_2,
};
