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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0sfjpx19.js:25022-25465 placement
/**
 * 判断模型名是否可识别（第一方时与目录比对），返回形状分类。
 */
function recognizeModelName(name) {
  let name_2 = name.trim();
  if (!name_2)
    return {
      recognized: false,
      shape: "empty",
    };
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl())
    return {
      recognized: true,
    };
  let lower = name_2.toLowerCase();
  let model = strip1mSuffix(lower).trim();
  if (isModelKeyAlias(lower) || isModelKeyAlias(model))
    return {
      recognized: true,
    };
  if (getCatalogEntry(model) || catalogIdForProviderModelId(model))
    return {
      recognized: true,
    };
  if (isDeploymentVouchedModel(name_2))
    return {
      recognized: true,
    };
  if (buildModelPickerOptions().some((option) => option.value === name_2))
    return {
      recognized: true,
    };
  if (catalogBehavesAsTarget(model) !== undefined)
    return {
      recognized: true,
    };
  if (/^claude-\S+$/.test(lower))
    return {
      recognized: true,
    };
  return {
    recognized: false,
    ...formatModelDisplayName(name_2),
  };
}
//@ chunk-0sfjpx19.js:25465-25827 placement
function formatModelDisplayName(name) {
  let name_2 = name.replace(/^\[(.+)\]$/s, "$1").trim();
  let found = getModelCatalog().models.find(
    (model) => model.display_name.toLowerCase() === name_2.toLowerCase(),
  );
  if (found)
    return {
      shape: "display_name",
      suggestion: found.id,
    };
  if (/^\d+$/.test(name))
    return {
      shape: "numeric",
    };
  if (name.startsWith("["))
    return {
      shape: "bracketed",
      ...suggestModelName(name_2),
    };
  if (/\s/.test(name))
    return {
      shape: "whitespace",
      ...suggestModelName(name),
    };
  return {
    shape: "other",
    ...suggestModelName(name),
  };
}
//@ chunk-0sfjpx19.js:25827-25941 placement
function suggestModelName(name) {
  let candidates = [...LEGACY_MODEL_IDS, ...getModelCatalog().models.map((model) => model.id)];
  let [suggestion] = similarNames(name.toLowerCase(), candidates, 1);
  return suggestion
    ? {
        suggestion,
      }
    : {};
}
//@ chunk-0sfjpx19.js:25941-26139 placement
function formatUnknownModelHint(name, suggestion) {
  let prefix = artifactPathPrefix("model");
  let hint =
    suggestion !== undefined
      ? ` Did you mean '${suggestion}'?`
      : prefix
        ? ` Run ${prefix} to see available models.`
        : " Switch to a different model.";
  return `Model "${name}" is not a recognized model id.${hint}`;
}
//@ chunk-0sfjpx19.js:26139-26202 placement
/**
 * 把切换请求里的模型解析成实际模型名：默认解析豁免或模型被允许才返回，否则 undefined。
 */
function resolveSwitchedModel(pick) {
  return pick !== undefined && (isExemptDefaultResolvingPick(pick) || isModelAllowed(pick))
    ? parseUserSpecifiedModel(pick)
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
    let message = messages[j];
    if (isCompactBoundaryMessage(message)) return;
    if (userMessageText(message)?.startsWith(MODEL_SET_STDOUT_PREFIX)) {
      let previous = messages[j - 1];
      let previousText = previous === undefined ? null : userMessageText(previous);
      let argText =
        previousText !== null && extractTag(previousText, COMMAND_NAME)?.trim() === "/model"
          ? extractTag(previousText, COMMAND_ARGS)?.trim()
          : undefined;
      return argText ? resolveEffortAfterModelSwitch(argText) : undefined;
    }
    let model = assistantModelOf(message);
    if (model !== undefined) return model;
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
  let canonical = canonicalModelName(userSpecifiedModel);
  if (canonicalModelName(parseUserSpecifiedModel(conversationModel)) !== canonical) return true;
  let userSpecifiedModel_2 = parseUserSpecifiedModel(previousModel);
  return (
    canonicalModelName(userSpecifiedModel_2) === canonical &&
    has1mSuffix_2(userSpecifiedModel_2) !== has1mSuffix_2(userSpecifiedModel)
  );
}
//@ chunk-0sfjpx19.js:26742-27152 placement
function classifyModelSwitch(name) {
  if (name.trim().toLowerCase() === "default")
    return {
      kind: "default",
    };
  let recognized = recognizeModelName(name);
  if (!recognized.recognized && !(recognized.shape === "other" && name.trim().length <= MAX_MODEL_NAME_CHARS))
    return {
      kind: "unrecognized",
      shape: recognized.shape,
      suggestion: recognized.suggestion,
    };
  if (isExemptDefaultResolvingPick(name))
    return {
      kind: "allowed",
      model: name,
    };
  let enforcement = isModelAllowedUnderActiveEnforcement(name);
  if (enforcement ?? isModelAllowed(name))
    return {
      kind: "allowed",
      model: name,
    };
  let steppedDown = stepDownRestrictedFamilyAliasPick(name);
  return steppedDown === null
    ? {
        kind: "blocked",
        underEnforcement: enforcement !== null,
      }
    : {
        kind: "steppedDown",
        model: steppedDown,
      };
}
//@ chunk-0sfjpx19.js:27152-27388 placement
function logUnrecognizedModelSwitch(name, surface) {
  let recognized = recognizeModelName(name);
  if (recognized.recognized) return;
  logEvent("tengu_set_model_unrecognized", {
    shape: fromEnum(recognized.shape),
    had_suggestion: recognized.suggestion !== undefined,
    surface,
  });
  logFeatureBad("model_switch", "unrecognized_model");
  return {
    ok: false,
    error: formatUnknownModelHint(displayModelName(name), recognized.suggestion),
  };
}
//@ chunk-0sfjpx19.js:27388-27463 placement
function modelSwitchFailure(error, code) {
  logFeatureBad("system_prompt_switch", code);
  return {
    ok: false,
    error,
    code,
  };
}
//@ chunk-0sfjpx19.js:27463-31684 placement
/**
 * 处理 set_model 控制请求：校验类型、识别模型、切换主循环模型与系统提示词并回复（约 4 KB）。
 */
async function handleSetModelRequest(request, host) {
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
    let requestedModel = typeof model === "string" ? model : "";
    if (requestedModel.trim() === "" || requestedModel.trim().toLowerCase() === "default")
      return modelSwitchFailure(
        "set_model: when only_if_model_is_current is true, model must be a model name. It cannot be absent, empty or 'default'.",
        "invalid_request",
      );
    let mainLoopModel = getMainLoopModel();
    if (
      !sameEffort(requestedModel, mainLoopModel) ||
      !sameEffort(resolveSwitchedModel(host.getActiveModel()) ?? mainLoopModel, mainLoopModel) ||
      planModeConstituentFamily(getUserSpecifiedModelSetting()) !== null
    )
      return modelSwitchFailure(
        "set_model: only_if_model_is_current is true, and the session cannot confirm that it runs the model named. The request changed nothing. Name the model that the session runs. If a turn is in progress, send the request again after that turn ends.",
        "model_not_current",
      );
    host.setSystemPrompt(systemPrompt);
    logFeatureOk("system_prompt_switch");
    return {
      ok: true,
    };
  }
  let pick = model ?? "default";
  let initial = classifyModelSwitch(pick);
  let reprobe =
    initial.kind === "blocked" && !initial.underEnforcement
      ? await reprobeEntitlementDeny(pick, host.storageV5, host.credentials)
      : undefined;
  let classified = reprobe === "overturned" ? classifyModelSwitch(pick) : initial;
  let appliedModel;
  let steppedDown;
  let unconfirmed = false;
  switch (classified.kind) {
    case "unrecognized":
      logEvent("tengu_set_model_unrecognized", {
        shape: fromEnum(classified.shape),
        had_suggestion: classified.suggestion !== undefined,
        surface: host.surface,
      });
      logFeatureBad("model_switch", "unrecognized_model");
      if (typeof systemPrompt === "string") logFeatureBad("system_prompt_switch", "model_switch_rejected");
      return {
        ok: false,
        error: formatUnknownModelHint(displayModelName(pick), classified.suggestion),
        code: "catalog_unknown",
      };
    case "blocked": {
      let switchedModel = resolveSwitchedModel(host.getActiveModel());
      host.noticeRestrictedModel(pick, switchedModel);
      logFeatureBad("model_switch", reprobe === "probe_failed" ? "entitlement_probe_failed" : "not_allowed");
      if (typeof systemPrompt === "string") logFeatureBad("system_prompt_switch", "model_switch_rejected");
      return {
        ok: false,
        error: formatModelRestrictedNotice(pick, switchedModel ?? getMainLoopModel()),
        code: reprobe === "probe_failed" ? "check_failed" : "restricted_by_org",
      };
    }
    case "default": {
      let refusal = managedDenyStartupRefusal(getDefaultMainLoopModel(), "switch");
      if (refusal !== null)
        return {
          ok: false,
          error: sanitizeTelemetryString(refusal),
          code: "restricted_by_org",
        };
      appliedModel = getDefaultMainLoopModel();
      steppedDown = null;
      break;
    }
    case "allowed": {
      if (isExemptDefaultResolvingPick(pick)) {
        appliedModel = classified.model;
        steppedDown = null;
        break;
      }
      let switchResult = await switchMainLoopModelSafe(pick, host.storageV5, host.credentials, {
        deadlineMs: MODEL_LIST_REFRESH_TIMEOUT_MS,
        acceptSessionModeRefusal: true,
        acceptSharedLimitRefusal: true,
        ...(host.isLaunchModelPick?.() && {
          confirmWithServer: false,
        }),
      });
      if (!switchResult.ok) {
        if (typeof systemPrompt === "string") logFeatureBad("system_prompt_switch", "model_switch_rejected");
        if (switchResult.serverRefusedModel === true && host.dropUnconfirmedLaunchModel?.(pick))
          logEvent("tengu_set_model_launch_model_dropped", {
            surface: host.surface,
            code: fromEnumOpt(switchResult.code),
          });
        return {
          ok: false,
          error: sanitizeTelemetryString(switchResult.message),
          ...(switchResult.code !== undefined && {
            code: switchResult.code,
          }),
        };
      }
      appliedModel = switchResult.model ?? getDefaultMainLoopModel();
      steppedDown = switchResult.substitutedFrom !== undefined ? appliedModel : null;
      unconfirmed = switchResult.unconfirmed === true;
      break;
    }
    case "steppedDown":
      appliedModel = classified.model;
      steppedDown = classified.model;
      break;
  }
  let readAppState = () => {
    let appState = host.readAppState();
    return {
      mainLoopModel: appState.mainLoopModel ?? host.getActiveModel() ?? getMainLoopModel(),
      mainLoopModelForSession: appState.mainLoopModelForSession,
      toolPermissionContext: appState.toolPermissionContext,
    };
  };
  let targetModel = classified.kind === "default" ? null : appliedModel;
  let hookResult = await runPreModelSwitchHooks(host.session, readAppState, targetModel, "sdk");
  if (hookResult.decision !== "proceed") {
    logFeatureSad("model_switch", "blocked_by_hook");
    if (typeof systemPrompt === "string") logFeatureBad("system_prompt_switch", "model_switch_rejected");
    return {
      ok: false,
      error: describeModelSwitchBlocked(hookResult),
      code: "blocked_by_hook",
    };
  }
  let mainLoopModel = getMainLoopModel();
  let activeModel = host.getActiveModel();
  let conversationModel = host.getConversationModel();
  recordSwitchIfChanged(host.session, readAppState(), targetModel, "sdk");
  if (isFirstPartyClientDataFetchEnabled()) {
    let apply = withClientDataReseedOnModelChange(() => host.applyModel(appliedModel));
    if (getMainLoopModel() !== mainLoopModel)
      refreshBootstrapDataTracked_2(host.storageV5, host.credentials, apply);
  } else host.applyModel(appliedModel);
  if (
    (getMainLoopModel() !== mainLoopModel ||
      parseUserSpecifiedModel(appliedModel) !== parseUserSpecifiedModel(activeModel ?? mainLoopModel)) &&
    modelChangeNeedsNewContext({
      appliedModel,
      previousModel: activeModel ?? mainLoopModel,
      conversationModel,
    })
  )
    host.injectModelSwitchBreadcrumbs(pick, appliedModel);
  host.recordAllowedModelApplied();
  if (steppedDown !== null) {
    host.noticeRestrictedModel(pick, steppedDown);
    logFeatureSad("model_switch", "family_alias_stepped_down");
  } else logFeatureOk("model_switch");
  if (typeof systemPrompt === "string") {
    host.setSystemPrompt(systemPrompt);
    logFeatureOk("system_prompt_switch");
  }
  return {
    ok: true,
    ...(hookResult.messages.length > 0 && {
      notices: hookResult.messages.map(sanitizeHookText),
    }),
    ...(unconfirmed && {
      unconfirmed: true,
    }),
  };
}
//@ chunk-0sfjpx19.js:31684-31797 placement
function assistantModelOf(message) {
  if (message.type !== "assistant") return;
  let model = message.message?.model;
  return typeof model === "string" && model !== SYNTHETIC_MODEL ? model : undefined;
}
//@ chunk-0sfjpx19.js:31797-31863 placement
function userMessageText(message) {
  return message.type === "user" ? getContentText(message.message?.content) : null;
}
//@ chunk-0sfjpx19.js:31863-31895 placement
function canonicalModelName(userSpecifiedModel) {
  return getCanonicalName(stripAnyVersatileSuffix(userSpecifiedModel));
}
//@ chunk-0sfjpx19.js:31895-32051 placement
function resolveEffortAfterModelSwitch(name) {
  let classified = classifyModelSwitch(name);
  switch (classified.kind) {
    case "default":
      return getDefaultMainLoopModel();
    case "allowed":
    case "steppedDown":
      return classified.model;
    case "unrecognized":
    case "blocked":
      return;
  }
}
//@ chunk-0sfjpx19.js:32051-32087 placement
/**
 * 模型切换状态的清理器（HostScoped 包装的函数槽，用于撤销待发切换）。
 */
var MODEL_SWITCH_STATE_CLEARER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0sfjpx19.js:32051", () => {
  MODEL_SWITCH_STATE_CLEARER = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-0sfjpx19.js:32087-32128 placement
var AUTO_INPUT_ORIGIN_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0sfjpx19.js:32087", () => {
  AUTO_INPUT_ORIGIN_KINDS = new Set(["plugin", "coordinator"]);
});
//@ chunk-0sfjpx19.js:32128-32173 placement
function isSchedulingPluginCommand(command) {
  return isMainAgentCommand(command) && getSchedulingPlugin(command) !== undefined;
}
//@ chunk-0sfjpx19.js:32173-32252 placement
function resurrectQueuedInput(command) {
  holdQueuedInput(
    () =>
      enqueueCommand({
        ...command,
        admissionExempt: "resurrected",
      }),
    command,
    () => emitDiscardedCommand([command]),
  );
}
//@ chunk-0sfjpx19.js:32252-32349 placement
/**
 * 取消排队中的自动输入：命中时清定时项、移除插件/协调器来源的排队消息，并取消其他可取消项。
 */
function cancelQueuedAutoInput(command, hold, discard) {
  let shouldCancel = isSchedulingPluginCommand(command) && isHeldByPlugin();
  if (shouldCancel)
    runIgnoringAbort(() =>
      AUTO_INPUT_ORIGIN_KINDS.has(command.origin?.kind) ? discard() : holdQueuedInput(hold, command, discard),
    );
  return shouldCancel;
}
//@ chunk-0sfjpx19.js:32349-32512 placement
/**
 * 取消排队中的自动输入：清除待发的定时项，移除插件/协调器来源的排队消息，并取消其他可取消的项（轮次继续时保留部分）。
 */
function cancelQueuedAutoInputs({ turnGoesOn = false } = {}) {
  if (isPluginInputRefusalOn()) {
    runIgnoringAbort(() => MODEL_SWITCH_STATE_CLEARER.get()?.());
    runIgnoringAbort(() =>
      removeQueuedByFilter(
        (queued) => isSchedulingPluginCommand(queued) && AUTO_INPUT_ORIGIN_KINDS.has(queued.origin?.kind),
      ),
    );
    runIgnoringAbort(() =>
      dequeueAllMatching(
        (queued) => isSchedulingPluginCommand(queued) && !(turnGoesOn && isFoldInFlight(queued)),
      ).forEach(resurrectQueuedInput),
    );
  }
}
//@ chunk-0sfjpx19.js:32512-32548 placement
/**
 * 被取消命令的状态槽（收集需要从队列移除的 uuid）。
 */
var CANCELLED_COMMAND_STATE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0sfjpx19.js:32512", () => {
  CANCELLED_COMMAND_STATE = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-0sfjpx19.js:32548-32875 placement
var MODEL_SWITCH_STATE = (options = {}) =>
  runIgnoringAbort(() => {
    let binding = currentSurfaceBinding();
    let sentBefore = new Set();
    receiptQueuedProbe.set(cancelQueuedAutoInput);
    inFlightDrainProbe.set(countHeldCommands);
    if (binding !== undefined)
      pluginInputHoldSlot.set({
        session: new WeakRef(binding),
        stoppedAt: performance.now(),
        sentBefore,
      });
    runIgnoringAbort(() => (CANCELLED_COMMAND_STATE.get()?.() ?? []).forEach((uuid) => sentBefore.add(uuid)));
    runIgnoringAbort(() =>
      getCommandQueue()
        .flatMap((queued) => queued.uuid ?? queued.stopKey ?? queued.handedOffTurn?.messages[0]?.uuid ?? [])
        .forEach((uuid) => sentBefore.add(uuid)),
    );
    cancelQueuedAutoInputs(options);
  });
//@ chunk-0sfjpx19.js:32875-32896 placement
var MOVED_RESULT_HOLD_MS = 200;
var MAX_MOVED_RESULT_WAITS = 8;
var GRACE_POLL_TICKS = 2;
//@ chunk-0sfjpx19.js:32896-33717 placement
/**
 * 根据轮次状态（被钩子结束、对话框占用、本地轮次）决定排队提示 stand_by/wait/deliver。
 */
function decideQueuedPromptAction(decision) {
  if (decision.head === "ended_by_hook" || decision.hasFoldTakenPrompt || !decision.isLocalTurnActive)
    return {
      action: "stand_by",
    };
  if (decision.isHeldByDialog)
    return {
      action: "wait",
      reason: "held_by_dialog",
    };
  if (decision.head === "not_ready" || !decision.isLocalTurnRunning)
    return {
      action: "wait",
      reason: "not_ready",
    };
  if (decision.head === "behind_earlier")
    return {
      action: "wait",
      reason: "behind_earlier",
    };
  if (decision.holderCount > decision.unmovableHolderCount)
    return {
      action: "background",
    };
  if (decision.isCompacting)
    return {
      action: "wait",
      reason: "compacting",
    };
  if (decision.isAwaitingMovedResult)
    return {
      action: "wait",
      reason: "moved_result",
    };
  if (decision.holderCount > 0 || decision.isExecuting) {
    if (!decision.isUnmovableGraceOver)
      return {
        action: "wait",
        reason: "unmovable_grace",
      };
    return decision.isBackgroundingDisabled
      ? {
          action: "cancel",
        }
      : {
          action: "interrupt",
        };
  }
  if (!decision.isMainRequestInFlight)
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
