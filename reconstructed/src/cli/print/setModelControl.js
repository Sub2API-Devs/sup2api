/**
 * cli/print/setModelControl.ts
 *
 * 2.1.316 新增：SDK 控制请求 set_model 的处理：模型名识别、建议、回退与系统提示词切换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (25)
 * attribution: placement 25
 */
import { getAPIProvider, isFirstPartyAnthropicBaseUrl } from "../../utils/model/providers.js";
import {
  strip1mSuffix,
  isModelKeyAlias,
  LEGACY_MODEL_IDS,
  stripAnyVersatileSuffix,
} from "../../utils/model/modelIds.js";
import {
  getCatalogEntry,
  catalogIdForProviderModelId,
  getModelCatalog,
} from "../../utils/model/modelCatalog.js";
import {
  isDeploymentVouchedModel,
  stepDownRestrictedFamilyAliasPick,
  planModeConstituentFamily,
} from "../../utils/model/planModeModel.js";
import { buildModelPickerOptions } from "../../utils/model/modelOptions.js";
import { catalogBehavesAsTarget } from "../../utils/model/modelCatalog/catalogCapabilities.js";
import { similarNames } from "../../utils/settings/managedEnvKeys.js";
import { artifactPathPrefix } from "../../services/artifacts/artifactMount.js";
import {
  isExemptDefaultResolvingPick,
  isModelAllowedUnderActiveEnforcement,
} from "../../utils/model/defaultModel.js";
import { isModelAllowed, managedDenyStartupRefusal } from "../../utils/model/modelAllowlist.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { isHumanTurn_2 } from "../../utils/messagePredicates.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { MODEL_SET_STDOUT_PREFIX, extractTag, getContentText } from "../../utils/messages.js";
import { COMMAND_NAME, COMMAND_ARGS } from "../../constants/xml.js";
import { has1mSuffix_2 } from "../../utils/model/contextWindow1m.js";
import {
  MAX_MODEL_NAME_CHARS,
  displayModelName,
  reprobeEntitlementDeny,
  formatModelRestrictedNotice,
} from "../../utils/model/validateModel.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { sameEffort } from "../../utils/permissions/permissionSetup.js";
import { getUserSpecifiedModelSetting } from "../../utils/model/smallFastModel.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import {
  switchMainLoopModelSafe,
  MODEL_LIST_REFRESH_TIMEOUT_MS,
  runPreModelSwitchHooks,
  describeModelSwitchBlocked,
  sanitizeHookText,
} from "../../commands/model/modelSwitch.js";
import { recordSwitchIfChanged } from "../../utils/model/modelSwitchHooks.js";
import {
  isFirstPartyClientDataFetchEnabled,
  withClientDataReseedOnModelChange,
  refreshBootstrapDataTracked_2,
} from "../../bridge/bridgeEnabled.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { identity } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import {
  isMainAgentCommand,
  getSchedulingPlugin,
  enqueueCommand,
  emitDiscardedCommand,
  removeQueuedByFilter,
  dequeueAllMatching,
  isFoldInFlight,
  receiptQueuedProbe,
  inFlightDrainProbe,
  getCommandQueue,
} from "../../utils/messageQueueManager.js";
import {
  holdQueuedInput,
  isHeldByPlugin,
  isPluginInputRefusalOn,
  countHeldCommands,
  pluginInputHoldSlot,
} from "../../plugins/functionHooks/inputHold.js";
import { runIgnoringAbort } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import { currentSurfaceBinding } from "../../plugins/functionHooks/surfaceBinding.js";

//@ chunk-0sfjpx19.js:25022-25465 placement
/**
 * 判断模型名是否可识别（第一方时与目录比对），返回形状分类。
 */
function recognizeModelName(e) {
  let trimmed = e.trim();
  if (!trimmed)
    return {
      recognized: false,
      shape: "empty",
    };
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl())
    return {
      recognized: true,
    };
  let lower = trimmed.toLowerCase();
  let trimmed_2 = strip1mSuffix(lower).trim();
  if (isModelKeyAlias(lower) || isModelKeyAlias(trimmed_2))
    return {
      recognized: true,
    };
  if (getCatalogEntry(trimmed_2) || catalogIdForProviderModelId(trimmed_2))
    return {
      recognized: true,
    };
  if (isDeploymentVouchedModel(trimmed))
    return {
      recognized: true,
    };
  if (buildModelPickerOptions().some((h) => h.value === trimmed))
    return {
      recognized: true,
    };
  if (catalogBehavesAsTarget(trimmed_2) !== undefined)
    return {
      recognized: true,
    };
  if (/^claude-\S+$/.test(lower))
    return {
      recognized: true,
    };
  return {
    recognized: false,
    ...formatModelDisplayName(trimmed),
  };
}
//@ chunk-0sfjpx19.js:25465-25827 placement
function formatModelDisplayName(e) {
  let trimmed = e.replace(/^\[(.+)\]$/s, "$1").trim();
  let found = getModelCatalog().models.find(
    (model) => model.display_name.toLowerCase() === trimmed.toLowerCase(),
  );
  if (found)
    return {
      shape: "display_name",
      suggestion: found.id,
    };
  if (/^\d+$/.test(e))
    return {
      shape: "numeric",
    };
  if (e.startsWith("["))
    return {
      shape: "bracketed",
      ...suggestModelName(trimmed),
    };
  if (/\s/.test(e))
    return {
      shape: "whitespace",
      ...suggestModelName(e),
    };
  return {
    shape: "other",
    ...suggestModelName(e),
  };
}
//@ chunk-0sfjpx19.js:25827-25941 placement
function suggestModelName(e) {
  let n = [...LEGACY_MODEL_IDS, ...getModelCatalog().models.map((model) => model.id)];
  let [r] = similarNames(e.toLowerCase(), n, 1);
  return r
    ? {
        suggestion: r,
      }
    : {};
}
//@ chunk-0sfjpx19.js:25941-26139 placement
function formatUnknownModelHint(e, suggestion) {
  let r = artifactPathPrefix("model");
  let s =
    suggestion !== undefined
      ? ` Did you mean '${suggestion}'?`
      : r
        ? ` Run ${r} to see available models.`
        : " Switch to a different model.";
  return `Model "${e}" is not a recognized model id.${s}`;
}
//@ chunk-0sfjpx19.js:26139-26202 placement
/**
 * 把切换请求里的模型解析成实际模型名：默认解析豁免或模型被允许才返回，否则 undefined。
 */
function resolveSwitchedModel(e) {
  return e !== undefined && (isExemptDefaultResolvingPick(e) || isModelAllowed(e))
    ? parseUserSpecifiedModel(e)
    : undefined;
}
//@ chunk-0sfjpx19.js:26202-26562 placement
function buildModelSwitchNotice({ messages, queriedInProcess, activeModel }) {
  if (
    queriedInProcess &&
    messages.some((message) => isHumanTurn_2(message) || assistantModelOf(message) !== undefined)
  )
    return activeModel;
  for (let j = messages.length - 1; j >= 0; j--) {
    let h = messages[j];
    if (isCompactBoundaryMessage(h)) return;
    if (userMessageText(h)?.startsWith(MODEL_SET_STDOUT_PREFIX)) {
      let _ = messages[j - 1];
      let b = _ === undefined ? null : userMessageText(_);
      let k =
        b !== null && extractTag(b, COMMAND_NAME)?.trim() === "/model"
          ? extractTag(b, COMMAND_ARGS)?.trim()
          : undefined;
      return k ? resolveEffortAfterModelSwitch(k) : undefined;
    }
    let y = assistantModelOf(h);
    if (y !== undefined) return y;
  }
  return;
}
//@ chunk-0sfjpx19.js:26562-26742 placement
/**
 * 判断切换模型后是否需要新的上下文：与会话模型规范名不同，或同一模型但 1M 后缀变化。
 */
function modelChangeNeedsNewContext({ appliedModel, previousModel, conversationModel }) {
  if (conversationModel === undefined) return false;
  let userSpecifiedModel = parseUserSpecifiedModel(appliedModel);
  let h = canonicalModelName(userSpecifiedModel);
  if (canonicalModelName(parseUserSpecifiedModel(conversationModel)) !== h) return true;
  let userSpecifiedModel_2 = parseUserSpecifiedModel(previousModel);
  return (
    canonicalModelName(userSpecifiedModel_2) === h &&
    has1mSuffix_2(userSpecifiedModel_2) !== has1mSuffix_2(userSpecifiedModel)
  );
}
//@ chunk-0sfjpx19.js:26742-27152 placement
function classifyModelSwitch(e) {
  if (e.trim().toLowerCase() === "default")
    return {
      kind: "default",
    };
  let n = recognizeModelName(e);
  if (!n.recognized && !(n.shape === "other" && e.trim().length <= MAX_MODEL_NAME_CHARS))
    return {
      kind: "unrecognized",
      shape: n.shape,
      suggestion: n.suggestion,
    };
  if (isExemptDefaultResolvingPick(e))
    return {
      kind: "allowed",
      model: e,
    };
  let r = isModelAllowedUnderActiveEnforcement(e);
  if (r ?? isModelAllowed(e))
    return {
      kind: "allowed",
      model: e,
    };
  let s = stepDownRestrictedFamilyAliasPick(e);
  return s === null
    ? {
        kind: "blocked",
        underEnforcement: r !== null,
      }
    : {
        kind: "steppedDown",
        model: s,
      };
}
//@ chunk-0sfjpx19.js:27152-27388 placement
function logUnrecognizedModelSwitch(e, surface) {
  let r = recognizeModelName(e);
  if (r.recognized) return;
  logEvent("tengu_set_model_unrecognized", {
    shape: fromEnum(r.shape),
    had_suggestion: r.suggestion !== undefined,
    surface,
  });
  logFeatureBad("model_switch", "unrecognized_model");
  return {
    ok: false,
    error: formatUnknownModelHint(displayModelName(e), r.suggestion),
  };
}
//@ chunk-0sfjpx19.js:27388-27463 placement
function modelSwitchFailure(error, n) {
  logFeatureBad("system_prompt_switch", n);
  return {
    ok: false,
    error,
    code: n,
  };
}
//@ chunk-0sfjpx19.js:27463-31684 placement
/**
 * 处理 set_model 控制请求：校验类型、识别模型、切换主循环模型与系统提示词并回复（约 4 KB）。
 */
async function handleSetModelRequest(request, n) {
  let model = request.model;
  if (model != null && typeof model !== "string") {
    logFeatureBad("model_switch", "invalid_model_type");
    if (request.system_prompt !== undefined) logFeatureBad("system_prompt_switch", "model_switch_rejected");
    return {
      ok: false,
      error: "set_model: model must be a string",
      code: "invalid_request",
    };
  }
  let systemPrompt = request.system_prompt;
  if (systemPrompt !== undefined && (typeof systemPrompt !== "string" || systemPrompt === "")) {
    logFeatureBad("system_prompt_switch", typeof systemPrompt !== "string" ? "invalid_type" : "empty");
    return {
      ok: false,
      error: "set_model: system_prompt must be a non-empty string when present",
      code: "invalid_request",
    };
  }
  let onlyIfModelIsCurrent = request.only_if_model_is_current;
  if (onlyIfModelIsCurrent !== undefined && typeof onlyIfModelIsCurrent !== "boolean") {
    logFeatureBad("model_switch", "invalid_only_if_model_is_current_type");
    if (systemPrompt !== undefined) logFeatureBad("system_prompt_switch", "model_switch_rejected");
    return {
      ok: false,
      error: "set_model: only_if_model_is_current must be true, false or absent",
      code: "invalid_request",
    };
  }
  if (onlyIfModelIsCurrent === true) {
    if (typeof systemPrompt !== "string")
      return modelSwitchFailure(
        "set_model: when only_if_model_is_current is true, system_prompt is required.",
        "invalid_request",
      );
    let L = typeof model === "string" ? model : "";
    if (L.trim() === "" || L.trim().toLowerCase() === "default")
      return modelSwitchFailure(
        "set_model: when only_if_model_is_current is true, model must be a model name. It cannot be absent, empty or 'default'.",
        "invalid_request",
      );
    let mainLoopModel = getMainLoopModel();
    if (
      !sameEffort(L, mainLoopModel) ||
      !sameEffort(resolveSwitchedModel(n.getActiveModel()) ?? mainLoopModel, mainLoopModel) ||
      planModeConstituentFamily(getUserSpecifiedModelSetting()) !== null
    )
      return modelSwitchFailure(
        "set_model: only_if_model_is_current is true, and the session cannot confirm that it runs the model named. The request changed nothing. Name the model that the session runs. If a turn is in progress, send the request again after that turn ends.",
        "model_not_current",
      );
    n.setSystemPrompt(systemPrompt);
    logFeatureOk("system_prompt_switch");
    return {
      ok: true,
    };
  }
  let y = model ?? "default";
  let _ = classifyModelSwitch(y);
  let b =
    _.kind === "blocked" && !_.underEnforcement
      ? await reprobeEntitlementDeny(y, n.storageV5, n.credentials)
      : undefined;
  let k = b === "overturned" ? classifyModelSwitch(y) : _;
  let w;
  let S;
  let T = false;
  switch (k.kind) {
    case "unrecognized":
      logEvent("tengu_set_model_unrecognized", {
        shape: fromEnum(k.shape),
        had_suggestion: k.suggestion !== undefined,
        surface: n.surface,
      });
      logFeatureBad("model_switch", "unrecognized_model");
      if (typeof systemPrompt === "string") logFeatureBad("system_prompt_switch", "model_switch_rejected");
      return {
        ok: false,
        error: formatUnknownModelHint(displayModelName(y), k.suggestion),
        code: "catalog_unknown",
      };
    case "blocked": {
      let switchedModel = resolveSwitchedModel(n.getActiveModel());
      n.noticeRestrictedModel(y, switchedModel);
      logFeatureBad("model_switch", b === "probe_failed" ? "entitlement_probe_failed" : "not_allowed");
      if (typeof systemPrompt === "string") logFeatureBad("system_prompt_switch", "model_switch_rejected");
      return {
        ok: false,
        error: formatModelRestrictedNotice(y, switchedModel ?? getMainLoopModel()),
        code: b === "probe_failed" ? "check_failed" : "restricted_by_org",
      };
    }
    case "default": {
      let L = managedDenyStartupRefusal(getDefaultMainLoopModel(), "switch");
      if (L !== null)
        return {
          ok: false,
          error: sanitizeTelemetryString(L),
          code: "restricted_by_org",
        };
      w = getDefaultMainLoopModel();
      S = null;
      break;
    }
    case "allowed": {
      if (isExemptDefaultResolvingPick(y)) {
        w = k.model;
        S = null;
        break;
      }
      let L = await switchMainLoopModelSafe(y, n.storageV5, n.credentials, {
        deadlineMs: MODEL_LIST_REFRESH_TIMEOUT_MS,
        acceptSessionModeRefusal: true,
        acceptSharedLimitRefusal: true,
        ...(n.isLaunchModelPick?.() && {
          confirmWithServer: false,
        }),
      });
      if (!L.ok) {
        if (typeof systemPrompt === "string") logFeatureBad("system_prompt_switch", "model_switch_rejected");
        if (L.serverRefusedModel === true && n.dropUnconfirmedLaunchModel?.(y))
          logEvent("tengu_set_model_launch_model_dropped", {
            surface: n.surface,
            code: fromEnumOpt(L.code),
          });
        return {
          ok: false,
          error: sanitizeTelemetryString(L.message),
          ...(L.code !== undefined && {
            code: L.code,
          }),
        };
      }
      w = L.model ?? getDefaultMainLoopModel();
      S = L.substitutedFrom !== undefined ? w : null;
      T = L.unconfirmed === true;
      break;
    }
    case "steppedDown":
      w = k.model;
      S = k.model;
      break;
  }
  let D = () => {
    let appState = n.readAppState();
    return {
      mainLoopModel: appState.mainLoopModel ?? n.getActiveModel() ?? getMainLoopModel(),
      mainLoopModelForSession: appState.mainLoopModelForSession,
      toolPermissionContext: appState.toolPermissionContext,
    };
  };
  let E = k.kind === "default" ? null : w;
  let N = await runPreModelSwitchHooks(n.session, D, E, "sdk");
  if (N.decision !== "proceed") {
    logFeatureSad("model_switch", "blocked_by_hook");
    if (typeof systemPrompt === "string") logFeatureBad("system_prompt_switch", "model_switch_rejected");
    return {
      ok: false,
      error: describeModelSwitchBlocked(N),
      code: "blocked_by_hook",
    };
  }
  let mainLoopModel = getMainLoopModel();
  let activeModel = n.getActiveModel();
  let conversationModel = n.getConversationModel();
  recordSwitchIfChanged(n.session, D(), E, "sdk");
  if (isFirstPartyClientDataFetchEnabled()) {
    let L = withClientDataReseedOnModelChange(() => n.applyModel(w));
    if (getMainLoopModel() !== mainLoopModel) refreshBootstrapDataTracked_2(n.storageV5, n.credentials, L);
  } else n.applyModel(w);
  if (
    (getMainLoopModel() !== mainLoopModel ||
      parseUserSpecifiedModel(w) !== parseUserSpecifiedModel(activeModel ?? mainLoopModel)) &&
    modelChangeNeedsNewContext({
      appliedModel: w,
      previousModel: activeModel ?? mainLoopModel,
      conversationModel,
    })
  )
    n.injectModelSwitchBreadcrumbs(y, w);
  n.recordAllowedModelApplied();
  if (S !== null) {
    n.noticeRestrictedModel(y, S);
    logFeatureSad("model_switch", "family_alias_stepped_down");
  } else logFeatureOk("model_switch");
  if (typeof systemPrompt === "string") {
    n.setSystemPrompt(systemPrompt);
    logFeatureOk("system_prompt_switch");
  }
  return {
    ok: true,
    ...(N.messages.length > 0 && {
      notices: N.messages.map(sanitizeHookText),
    }),
    ...(T && {
      unconfirmed: true,
    }),
  };
}
//@ chunk-0sfjpx19.js:31684-31797 placement
function assistantModelOf(e) {
  if (e.type !== "assistant") return;
  let model = e.message?.model;
  return typeof model === "string" && model !== SYNTHETIC_MODEL ? model : undefined;
}
//@ chunk-0sfjpx19.js:31797-31863 placement
function userMessageText(e) {
  return e.type === "user" ? getContentText(e.message?.content) : null;
}
//@ chunk-0sfjpx19.js:31863-31895 placement
function canonicalModelName(userSpecifiedModel) {
  return getCanonicalName(stripAnyVersatileSuffix(userSpecifiedModel));
}
//@ chunk-0sfjpx19.js:31895-32051 placement
function resolveEffortAfterModelSwitch(e) {
  let n = classifyModelSwitch(e);
  switch (n.kind) {
    case "default":
      return getDefaultMainLoopModel();
    case "allowed":
    case "steppedDown":
      return n.model;
    case "unrecognized":
    case "blocked":
      return;
  }
}
//@ chunk-0sfjpx19.js:32051-32087 placement
/**
 * 模型切换状态的清理器（HostScoped 包装的函数槽，用于撤销待发切换）。
 */
var MODEL_SWITCH_STATE_CLEARER = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-0sfjpx19.js:32087-32128 placement
var AUTO_INPUT_ORIGIN_KINDS = new Set(["plugin", "coordinator"]);
//@ chunk-0sfjpx19.js:32128-32173 placement
function isSchedulingPluginCommand(e) {
  return isMainAgentCommand(e) && getSchedulingPlugin(e) !== undefined;
}
//@ chunk-0sfjpx19.js:32173-32252 placement
function resurrectQueuedInput(e) {
  holdQueuedInput(
    () =>
      enqueueCommand({
        ...e,
        admissionExempt: "resurrected",
      }),
    e,
    () => emitDiscardedCommand([e]),
  );
}
//@ chunk-0sfjpx19.js:32252-32349 placement
/**
 * 取消排队中的自动输入：命中时清定时项、移除插件/协调器来源的排队消息，并取消其他可取消项。
 */
function cancelQueuedAutoInput(e, n, r) {
  let s = isSchedulingPluginCommand(e) && isHeldByPlugin();
  if (s)
    runIgnoringAbort(() => (AUTO_INPUT_ORIGIN_KINDS.has(e.origin?.kind) ? r() : holdQueuedInput(n, e, r)));
  return s;
}
//@ chunk-0sfjpx19.js:32349-32512 placement
/**
 * 取消排队中的自动输入：清除待发的定时项，移除插件/协调器来源的排队消息，并取消其他可取消的项（轮次继续时保留部分）。
 */
function cancelQueuedAutoInputs({ turnGoesOn: e = false } = {}) {
  if (isPluginInputRefusalOn()) {
    runIgnoringAbort(() => MODEL_SWITCH_STATE_CLEARER.get()?.());
    runIgnoringAbort(() =>
      removeQueuedByFilter(
        (r) => isSchedulingPluginCommand(r) && AUTO_INPUT_ORIGIN_KINDS.has(r.origin?.kind),
      ),
    );
    runIgnoringAbort(() =>
      dequeueAllMatching((r) => isSchedulingPluginCommand(r) && !(e && isFoldInFlight(r))).forEach(
        resurrectQueuedInput,
      ),
    );
  }
}
//@ chunk-0sfjpx19.js:32512-32548 placement
/**
 * 被取消命令的状态槽（收集需要从队列移除的 uuid）。
 */
var CANCELLED_COMMAND_STATE = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-0sfjpx19.js:32548-32875 placement
var MODEL_SWITCH_STATE = (e = {}) =>
  runIgnoringAbort(() => {
    let n = currentSurfaceBinding();
    let r = new Set();
    receiptQueuedProbe.set(cancelQueuedAutoInput);
    inFlightDrainProbe.set(countHeldCommands);
    if (n !== undefined)
      pluginInputHoldSlot.set({
        session: new WeakRef(n),
        stoppedAt: performance.now(),
        sentBefore: r,
      });
    runIgnoringAbort(() => (CANCELLED_COMMAND_STATE.get()?.() ?? []).forEach((s) => r.add(s)));
    runIgnoringAbort(() =>
      getCommandQueue()
        .flatMap((s) => s.uuid ?? s.stopKey ?? s.handedOffTurn?.messages[0]?.uuid ?? [])
        .forEach((s) => r.add(s)),
    );
    cancelQueuedAutoInputs(e);
  });
//@ chunk-0sfjpx19.js:32875-32896 placement
var MOVED_RESULT_HOLD_MS = 200;
var MAX_MOVED_RESULT_WAITS = 8;
var GRACE_POLL_TICKS = 2;
//@ chunk-0sfjpx19.js:32896-33717 placement
/**
 * 根据轮次状态（被钩子结束、对话框占用、本地轮次）决定排队提示 stand_by/wait/deliver。
 */
function decideQueuedPromptAction(e) {
  if (e.head === "ended_by_hook" || e.hasFoldTakenPrompt || !e.isLocalTurnActive)
    return {
      action: "stand_by",
    };
  if (e.isHeldByDialog)
    return {
      action: "wait",
      reason: "held_by_dialog",
    };
  if (e.head === "not_ready" || !e.isLocalTurnRunning)
    return {
      action: "wait",
      reason: "not_ready",
    };
  if (e.head === "behind_earlier")
    return {
      action: "wait",
      reason: "behind_earlier",
    };
  if (e.holderCount > e.unmovableHolderCount)
    return {
      action: "background",
    };
  if (e.isCompacting)
    return {
      action: "wait",
      reason: "compacting",
    };
  if (e.isAwaitingMovedResult)
    return {
      action: "wait",
      reason: "moved_result",
    };
  if (e.holderCount > 0 || e.isExecuting) {
    if (!e.isUnmovableGraceOver)
      return {
        action: "wait",
        reason: "unmovable_grace",
      };
    return e.isBackgroundingDisabled
      ? {
          action: "cancel",
        }
      : {
          action: "interrupt",
        };
  }
  if (!e.isMainRequestInFlight)
    return {
      action: "wait",
      reason: "not_sampling",
    };
  return {
    action: "interrupt",
  };
}
export {
  MOVED_RESULT_HOLD_MS,
  GRACE_POLL_TICKS,
  decideQueuedPromptAction,
  MAX_MOVED_RESULT_WAITS,
  resolveSwitchedModel,
  logUnrecognizedModelSwitch,
  handleSetModelRequest,
  modelChangeNeedsNewContext,
  MODEL_SWITCH_STATE,
  buildModelSwitchNotice,
  CANCELLED_COMMAND_STATE,
  MODEL_SWITCH_STATE_CLEARER,
  cancelQueuedAutoInput,
  cancelQueuedAutoInputs,
};
