/**
 * commands/model/model.tsx
 *
 * /model 命令：模型选择器与切换
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/model/model.tsx
 * pieces: chunk-czq1j3j2.js (1), chunk-ny1a8wws.js (36), chunk-wefvmrb3.js (7)
 * attribution: fingerprint 5, sole-consumer 8, affinity 1, callgraph-fingerprint 2, file-local 2, layout 21, placement 4, shared-adjacent 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  renderDefaultModelSetting as renderDefaultModelSetting_2,
  isOpus1mMergeEnabled,
  parseUserSpecifiedModel,
  renderUsageCreditsOnlyModelName,
} from "../../utils/model/modelDisplay.js";
import {
  getDefaultMainLoopModelSetting,
  isModeDependentModelSetting,
  planModeConstituentFamily,
} from "../../utils/model/planModeModel.js";
import { strip1mSuffix, stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { isAliasSpelling, formatModelRestrictedNotice } from "../../utils/model/validateModel.js";
import { is1mContextDisabled, modelHasNative1MContext } from "../../utils/model/contextWindow1m.js";
import { renderDefaultModelSetting } from "../../utils/model/model.js";
import { isKnownNon1mTarget } from "../../utils/model/defaultModel.js";
import {
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
} from "../../utils/model/thirdPartyModelDefaults.js";
import { LEGACY_SONNET_MODELS, getModelOptionsWithTelemetry } from "../../utils/model/modelOptions.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import {
  getTotalOutputTokens,
  getServedModelsForRequestedModel,
  clearRefusalFallbackModelLatch,
} from "../../bootstrap/state.js";
import {
  useMainLoopModel as useMainLoopModel_2,
  getModelSwitchTarget,
  serializeModelSwitch,
  effectiveModelForContext,
  recordSwitchIfChanged,
} from "../../utils/model/modelSwitchHooks.js";
import {
  toInlineCode,
  CURRENT_MODEL_PREFIX,
  KEPT_MODEL_PREFIX,
  SET_MODEL_PREFIX,
  SAVED_AS_DEFAULT_SUFFIX,
  CLOUD_SWITCH_NO_RESPONSE_PREFIX,
  CLOUD_SWITCH_FAILED_PREFIX,
} from "./modelMessages.js";
import {
  resolveEffortLevel,
  persistEffortSetting,
  levelEffortSetting,
  toPersistableEffort,
} from "../../utils/effort.js";
import { getActiveModelFallback, describeAutoSwitchedModel } from "../../services/api/safeguardMessages.js";
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { findPluginOptionsTarget } from "../plugin/PluginOptionsFlow.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import {
  classifyControlRequestError,
  ControlRequestTimeoutError,
} from "../../remote/controlRequestErrors.js";
import {
  getRemoteCaps,
  isRemoteControlChannelAvailable,
  isRemoteSessionAvailable,
  hasRemoteCap,
} from "../../remote/remoteMode.js";
import { useAppStoreDirect, useAppState, useSetAppState } from "../../state/AppState.js";
import { useMainLoopModelSetting } from "../../hooks/useMainLoopModel.js";
import { useFastModeOnForModel } from "../../hooks/usePromptSuggestion.js";
import { useNotifications } from "../../context/notifications.js";
import {
  isFastModeEnabled,
  clearFastModeCooldown,
  isFastModeActive,
  reportFastModeToggle,
  supportsFastMode,
  isFastModeAvailable,
} from "../../utils/fastMode.js";
import { logEvent } from "../../services/analytics/index.js";
import { managedDenyStartupRefusal } from "../../utils/model/modelAllowlist.js";
import { ladderForDefaultModel, hasLadderForSetting } from "../../utils/model/modelUnavailability.js";
import {
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  sanitizeHookText,
  setDefaultModel,
  describeDefaultSaved,
  anthropicModelEnvNotice,
  findModelSettingSource,
  saveModelSwitch,
  switchMainLoopModelSafe,
} from "./modelSwitch.js";
import { logError } from "../../utils/log.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { lastMainThreadResponse, isMainThreadSource } from "../../utils/querySource.js";
import { shouldShowEffortNotice } from "../../components/PromptInput/promptInputState.js";
import { savedModelPickReply } from "../config/configShorthand.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { formatFastModeSuffix } from "../fast/fast.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FableUsageCreditsConsent } from "../../components/usageCredits/FableUsageCreditsConsent.js";
import { PromptDialog } from "../../components/hooks/PromptDialog.js";
import { ModelEffortSwitchConfirm } from "../../components/ModelEffortSwitchConfirm.js";
import { ModelPicker } from "../../components/ModelPicker.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { logForDebugging } from "../../utils/debug.js";
import { getDeprecationStatusLine } from "../../utils/model/deprecation.js";
import { isCommonInfoArg } from "../../types/logs.js";
import { COMMON_HELP_ARGS } from "../../constants/xml.js";
import { shortHash } from "../../utils/shortHash.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-wefvmrb3.js:1901-1970 fingerprint (2.1.88 match: renderModelLabel, 1)
function renderModelLabel(model) {
  let rendered = renderDefaultModelSetting_2(model ?? getDefaultMainLoopModelSetting());
  return model === null ? `${rendered} (default)` : rendered;
}
//@ chunk-wefvmrb3.js:12204-12475 placement
/**
 * 判断切到带 [1m] 的别名是否有问题：1M 上下文被禁用、目标模型不支持 1M、或模式相关的设置没有对应的 1M 变体；正常返回 null。
 */
function diagnose1mAliasSwitch(setting) {
  let setting_2 = setting.toLowerCase().trim();
  let stripped = strip1mSuffix(setting_2);
  if (stripped === setting_2 || !isAliasSpelling(setting_2)) return null;
  if (is1mContextDisabled())
    return {
      kind: "disabled",
    };
  let found = renderDefaultModelSetting(setting_2).find((candidate) => isKnownNon1mTarget(candidate));
  if (found !== undefined)
    return {
      kind: "unsupported",
      carrier: strip1mSuffix(found),
    };
  if (isModeDependentModelSetting(stripped) && planModeConstituentFamily(setting_2) === null)
    return {
      kind: "noModeDependentVariant",
    };
  return null;
}
//@ chunk-wefvmrb3.js:12475-12622 shared-adjacent (2.1.88 match: isOpus1mUnavailable, 1)
function isOpus1mUnavailable(model) {
  let m = model.toLowerCase();
  if (!(m.includes("opus") && m.includes("[1m]"))) return false;
  if (renderDefaultModelSetting(model).every((model) => modelHasNative1MContext(model))) return false;
  return !shouldProbeThirdPartyDefaults() && !isOpus1mMergeEnabled();
}
//@ chunk-wefvmrb3.js:12719-12920 placement
/**
 * 判断 sonnet[1m]/opusplan[1m] 这类设置是否需要额外检查 1M 资格：排除旧版 sonnet、原生支持 1M 的模型以及第三方默认探测场景。
 */
function requires1mEntitlementCheck(model) {
  let lower = model.toLowerCase();
  if (!((lower.includes("sonnet") && lower.includes("[1m]")) || lower.trim() === "opusplan[1m]"))
    return false;
  if (
    LEGACY_SONNET_MODELS.has(
      getCanonicalName(lower.trim(), {
        identity: true,
      }),
    )
  )
    return false;
  if (modelHasNative1MContext(parseUserSpecifiedModel(model))) return false;
  return !shouldProbeThirdPartyDefaultsAlt();
}
//@ chunk-wefvmrb3.js:12920-12955 placement
/**
 * 把用户指定的模型（或默认主循环模型）解析成实际模型名。
 */
function resolveRequestedModel(model) {
  return parseUserSpecifiedModel(model ?? getDefaultMainLoopModelSetting());
}
//@ chunk-wefvmrb3.js:12955-13220 placement (2.1.88 match: useMainLoopModel, 0.832)
function useMainLoopModel(
  model,
  mainLoopModel,
  mainLoopModelForSession,
  cacheMissAckedAtOutputTokens,
  options,
) {
  if (options === undefined) return false;
  let totalOutputTokens = getTotalOutputTokens();
  if (totalOutputTokens === 0 || totalOutputTokens === cacheMissAckedAtOutputTokens) return false;
  let mainLoopModel_2 = stripAnyVersatileSuffix(resolveRequestedModel(model));
  if (
    mainLoopModel_2 ===
    stripAnyVersatileSuffix(
      resolveRequestedModel(
        useMainLoopModel_2({
          mainLoopModel,
          mainLoopModelForSession,
        }),
      ),
    )
  )
    return false;
  let model_2 = options.response?.message.model;
  return !(
    typeof model_2 === "string" &&
    (model_2 === mainLoopModel_2 || getServedModelsForRequestedModel(mainLoopModel_2)?.has(model_2) === true)
  );
}
//@ chunk-wefvmrb3.js:13220-13529 fingerprint (2.1.88 match: ShowModelAndClose, 0.354)
function ShowModelAndClose(t0) {
  let mainLoopModel = toInlineCode(renderModelLabel(t0.mainLoopModel));
  let mainLoopModelForSession = resolveEffortLevel(t0);
  let effortSuffix = mainLoopModelForSession !== undefined ? ` (effort: ${mainLoopModelForSession})` : "";
  let modelSwitchTarget = getModelSwitchTarget(t0.mainLoopModelForSession, t0.mainLoopModel);
  if (modelSwitchTarget !== null)
    return `${CURRENT_MODEL_PREFIX}${toInlineCode(renderModelLabel(modelSwitchTarget))} (this session only)${effortSuffix}
Base model: ${mainLoopModel}`;
  let activeModelFallback = getActiveModelFallback();
  let fallbackText =
    activeModelFallback !== undefined
      ? ` (${describeAutoSwitchedModel(toInlineCode(renderModelLabel(activeModelFallback.previousModel)))})`
      : "";
  return `${CURRENT_MODEL_PREFIX}${mainLoopModel}${fallbackText}${effortSuffix}`;
}
//@ chunk-czq1j3j2.js:962386-962439 fingerprint (2.1.88 match: _temp2, 1)
function selectMainLoopModelForSession_2(s_0) {
  return s_0.mainLoopModelForSession;
}
//@ chunk-ny1a8wws.js:17449-17453 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ny1a8wws.js:17449", () => {
  init_react_production();
});
//@ chunk-ny1a8wws.js:17453-17524 sole-consumer
function isRemoteModelListEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harp_pedal", true) !== false;
  } catch {
    return true;
  }
}
//@ chunk-ny1a8wws.js:17524-17550 sole-consumer
var REMOTE_MODEL_LIST_CACHE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ny1a8wws.js:17524", () => {
  REMOTE_MODEL_LIST_CACHE = new HostScoped(() => new Map());
});
//@ chunk-ny1a8wws.js:17550-17614 sole-consumer
function pluginOptionsTargets({ models }) {
  return models.map(findPluginOptionsTarget).filter((target) => target !== null);
}
//@ chunk-ny1a8wws.js:17614-17727 sole-consumer
function cachedRemoteModelListWithDefault(cache, sessionId) {
  if (sessionId === undefined || !isRemoteModelListEnabled()) return null;
  let entry = cache.get(sessionId);
  return entry?.rows.some((row) => row.value === null) ? entry : null;
}
//@ chunk-ny1a8wws.js:17727-17771 sole-consumer
function cacheRemoteModelList(cache, sessionId, entry) {
  if (sessionId !== undefined) cache.set(sessionId, entry);
}
//@ chunk-ny1a8wws.js:17771-17923 sole-consumer
function refreshRemoteModelList(cache, sessionId, options) {
  if (sessionId.sessionId === undefined || !isRemoteModelListEnabled()) return Promise.resolve(null);
  return trackRemoteModelListRefresh(
    cache,
    sessionId.sessionId,
    options,
    sessionId.sendControlRequest({
      subtype: "list_models",
    }),
  );
}
//@ chunk-ny1a8wws.js:17923-18298 sole-consumer
/**
 * 发出 list_models 控制请求后的处理：成功时记录与上次结果是否相同并缓存行；失败时记遥测，若缓存未被替换则删除该会话的缓存，返回 null。
 */
function trackRemoteModelListRefresh(cache, sessionId, startedAt, done) {
  let existing = cache.get(sessionId);
  return done.then(pluginOptionsTargets).then(
    (row) => {
      let entry = cache.get(sessionId);
      logFeatureOk("remote_model_list_refresh", {
        trigger: fromEnum(startedAt),
        ...(entry === undefined
          ? {
              last_answer: lit("none"),
            }
          : {
              last_answer: lit(import_sortedIndex_2(entry.rows, row) ? "same" : "differed"),
              last_trigger: fromEnum(entry.trigger),
            }),
      });
      cacheRemoteModelList(cache, sessionId, {
        rows: row,
        trigger: startedAt,
      });
      return row;
    },
    (error) => {
      logFeatureSad("remote_model_list_refresh", classifyControlRequestError(error), {
        trigger: fromEnum(startedAt),
      });
      if (cache.get(sessionId) === existing) cache.delete(sessionId);
      return null;
    },
  );
}
//@ chunk-ny1a8wws.js:18298-18326 affinity
function cloudModelRefusal(model, setAppState, storageV5) {
  return "";
}
//@ chunk-ny1a8wws.js:18326-18366 callgraph-fingerprint (2.1.88 match: _temp, 1)
function selectMainLoopModel(s) {
  return s.mainLoopModel;
}
//@ chunk-ny1a8wws.js:18366-18404 file-local
function selectMainLoopModel_2(s) {
  return s.mainLoopModel;
}
//@ chunk-ny1a8wws.js:18404-18419 layout
function cloudLandedTextPlaceholder() {}
//@ chunk-ny1a8wws.js:18419-18458 layout
function isUltracodeConfirmable() {
  return getRemoteCaps() !== null && isRemoteControlChannelAvailable();
}
//@ chunk-ny1a8wws.js:18458-18503 layout
function textNotRefusal(text) {
  return {
    text,
    isRefusal: false,
  };
}
//@ chunk-ny1a8wws.js:18503-18518 layout
function noopWorkerStartHandler() {}
//@ chunk-ny1a8wws.js:18518-18556 layout
function selectMainLoopModelForFastMode(state) {
  return state.mainLoopModel;
}
//@ chunk-ny1a8wws.js:18556-18604 layout (2.1.88 match: _temp2, 1)
function selectMainLoopModelForSession(s_0) {
  return s_0.mainLoopModelForSession;
}
//@ chunk-ny1a8wws.js:18604-18642 layout
function selectSessionEffort(state) {
  return state.sessionEffort;
}
//@ chunk-ny1a8wws.js:18642-18686 layout
function selectSettingsEffortTable(settings) {
  return settings.settingsEffortTable;
}
//@ chunk-ny1a8wws.js:18686-18769 layout
function validateEffortChange(change) {
  let refusal = noEffortRefusal(change);
  if (refusal !== null)
    return {
      kind: "refuse",
      message: refusal,
    };
  return null;
}
//@ chunk-ny1a8wws.js:18769-18793 layout
function isModelInUse(_state) {
  return false;
}
//@ chunk-ny1a8wws.js:18793-18820 layout
function noEffortRefusal(change) {
  return null;
}
//@ chunk-ny1a8wws.js:18820-18844 layout
function identityModel(state) {
  return state;
}
//@ chunk-ny1a8wws.js:18844-19309 layout
/**
 * 云会话模型选择器的提示文案组：et 本地选项不可用、Po 列表加载失败、Lo 等待超时的说明（"Stopped waiting for the cloud session’s model list …"）；No 是超时毫秒 15000；Kt/xo 是别名判断与最长值挑选。
 */
var CLOUD_MODEL_PICKER_UNAVAILABLE =
  "Model picker shows local options in cloud sessions \u2014 pass a model name, e.g. /model sonnet";
var CLOUD_MODEL_LIST_FAILED =
  "Couldn\u2019t load the model list from the cloud session \u2014 pass a model name, e.g. /model sonnet";
var CLOUD_MODEL_LIST_TIMEOUT_MESSAGE =
  "Stopped waiting for the cloud session\u2019s model list \u2014 run /model again, or pass a model name, e.g. /model sonnet";
var CLOUD_MODEL_LIST_TIMEOUT_MS = 15000;
var isAliasModel = (model) => strip1mSuffix(model) !== model;
var longestModelValue = (models) =>
  models.reduce(
    (acc, row) => (acc === null || (row.value?.length ?? 0) > (acc.value?.length ?? 0) ? row : acc),
    null,
  )?.value ?? null;
//@ chunk-ny1a8wws.js:19309-19470 file-local
function isKnownAlias(rows, model) {
  let found = rows.find((row) => row.value === model);
  return found
    ? found.value
    : longestModelValue(
        model === null
          ? []
          : rows.filter(
              (row) =>
                row.value !== null &&
                strip1mSuffix(model).includes(strip1mSuffix(row.value)) &&
                isAliasModel(model) === isAliasModel(row.value),
            ),
      );
}
//@ chunk-ny1a8wws.js:19470-19552 layout
var CLOUD_MODEL_PICKER_SUBTITLE = "Models reported by the cloud session. Your pick applies to that session.";
//@ chunk-ny1a8wws.js:19552-19646 layout
function keptModelMessage(message) {
  return message === null
    ? "Kept the workspace\u2019s current model"
    : `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(message))}`;
}
//@ chunk-ny1a8wws.js:19646-19768 layout
var MODEL_KEPT_MESSAGE =
  "Kept the model (nothing was sent) \u2014 to change it, run /model again or pass a model name, e.g. /model sonnet";
//@ chunk-ny1a8wws.js:19768-24696 layout
function LocalModelPicker({ getMessages, onDone, storageV5, session, onQueryEvent }) {
  let appStoreDirect = useAppStoreDirect();
  let appModel = useAppState((state) => state.mainLoopModel);
  let sessionModel = useAppState((state) => state.mainLoopModelForSession);
  let modelSetting = useMainLoopModelSetting() ?? appModel;
  let fastMode = useAppState((state) => state.fastMode);
  let fastModeOnForModel = useFastModeOnForModel(fastMode, modelSetting);
  let setAppState = useSetAppState();
  let { addNotification } = useNotifications();
  let [viewModel] = useState(() => {
    return;
  });
  let [modelOptions] = useState(() =>
    viewModel !== undefined
      ? getModelOptionsWithTelemetry(isFastModeEnabled() && !!fastMode, viewModel)
      : undefined,
  );
  let sessionRef = useRef(undefined);
  let identity = (value) => value;
  let [confirmRequest, setConfirmRequest] = useState(null);
  let messagesRef = useRef([]);
  let [ladderRequest, setLadderRequest] = useState(null);
  let [effortRequest, setEffortRequest] = useState(null);
  let savingDefault = useRef(false);
  let savedCount = useRef(0);
  let creditNotice = useRef(null);
  let limitNotice = useRef(null);
  let pendingSaveAsDefault = useRef(false);
  let pendingLadder = useRef(false);
  let ladderCount = useRef(0);
  let [switching, setSwitching] = useState(false);
  let abortControllerRef = useRef(null);
  let [busy, setBusy] = useState(false);
  let abortController = useRef(null);
  function handleCancel() {
    logEvent("tengu_model_command_menu", {
      action: lit("cancel"),
    });
    let displayModel = renderModelLabel(modelSetting);
    onDone(toDoneText(`${KEPT_MODEL_PREFIX}${toInlineCode(displayModel)}`), {
      display: "system",
    });
  }
  function requestSwitch(model, effort, saveAsDefault = false) {
    let refusal = validateEffortChange(model);
    if (refusal?.kind === "refuse") {
      onDone(refusal.message, {
        display: "system",
      });
      return;
    }
    if (refusal?.kind === "confirm") {
      savingDefault.current = false;
      savedCount.current += 1;
      setEffortRequest({
        model,
        effort,
      });
      return;
    }
    let denyReason =
      model === null ? managedDenyStartupRefusal(getDefaultMainLoopModelSetting(), "switch") : null;
    if (denyReason !== null) {
      logFeatureBad("model_switch", "denied_by_managed_settings");
      onDone(toDoneText(denyReason), {
        display: "system",
      });
      return;
    }
    if (!saveAsDefault && ladderForDefaultModel(model)) {
      pendingLadder.current = false;
      ladderCount.current += 1;
      setLadderRequest({
        model,
        effort,
      });
      return;
    }
    let wasPending = pendingSaveAsDefault.current;
    pendingSaveAsDefault.current = false;
    let abortController = new AbortController();
    abortControllerRef.current = abortController;
    setSwitching(true);
    serializeModelSwitch(session, () =>
      runPreModelSwitchHooks(session, appStoreDirect.getState, model, "picker", {
        signal: abortController.signal,
      }),
    )
      .then((decision) => {
        setSwitching(false);
        if (abortController.signal.aborted) return;
        messagesRef.current = decision.messages;
        if (decision.decision === "block") {
          logFeatureSad("model_switch", "blocked_by_hook");
          onDone(toDoneText(preModelSwitchBlockedMessage(model, decision.reason, decision.messages)), {
            display: "system",
          });
          return;
        }
        if (decision.decision === "ask") {
          setConfirmRequest({
            model,
            pick: effort,
            kind: "model",
            hookReason: decision.reason ?? "Confirm switching the model",
            vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
            saveAsDefault: wasPending,
          });
          return;
        }
        return completeSwitch(model, effort, decision.skipConfirm, wasPending);
      })
      .catch((error) => {
        setSwitching(false);
        if (abortController.signal.aborted) return;
        showError(error);
      });
  }
  function showError(error) {
    logError(toError(error));
    onDone(toDoneText(`Model switch failed: ${sanitizeHookText(errorMessage(error))}`), {
      display: "system",
    });
  }
  async function completeSwitch(model, pick, skipConfirm, saveAsDefault) {
    let state = appStoreDirect.getState();
    if (
      !skipConfirm &&
      useMainLoopModel(
        model,
        state.mainLoopModel,
        state.mainLoopModelForSession,
        state.cacheMissAckedAtOutputTokens,
        lastMainThreadResponse(getMessages()),
      )
    ) {
      setConfirmRequest({
        model,
        pick,
        kind: "model",
        vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
        saveAsDefault,
      });
      return;
    }
    if (
      pick !== undefined &&
      shouldShowEffortNotice({
        target: pick,
        current: resolveEffortLevel(state),
        model: resolveRequestedModel(model),
        permissionMode: state.toolPermissionContext.mode,
        messages: getMessages(),
        ackedAtOutputTokens: state.cacheMissAckedAtOutputTokens,
        promptCacheMayBeWarm: isMainThreadSource(getMessages()),
        setting: model,
      })
    ) {
      setConfirmRequest({
        model,
        pick,
        kind: "effort",
        vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
        saveAsDefault,
      });
      return;
    }
    await applyModelWithHooks(model, pick, saveAsDefault);
  }
  async function applyModelWithHooks(model, effort, saveAsDefault) {
    setBusy(true);
    let modelBefore = effectiveModelForContext(appStoreDirect.getState());
    let result;
    try {
      result = saveAsDefault
        ? await savedModelPickReply(
            model,
            {
              getAppState: appStoreDirect.getState,
              setAppState,
              session,
              storageV5,
              options: {
                mcpClients: [],
              },
            },
            () =>
              applyModelCore(model, effort, true).then((settled) =>
                settled.hasDefaultSaveFailed
                  ? {
                      unsaved: settled.message,
                    }
                  : settled.message,
              ),
            {
              persistsOffBox: () => isBridgeOrTransport(session),
              hasModelMoved: () => effectiveModelForContext(appStoreDirect.getState()) !== modelBefore,
            },
          )
        : {
            text: (await applyModelCore(model, effort, false)).message,
            isRefusal: false,
          };
    } finally {
      setBusy(false);
    }
    if (result.isRefusal) {
      messagesRef.current = [];
      onDone(toDoneText(result.text), {
        display: "system",
      });
      return;
    }
    if (result.rewrittenTo !== undefined) {
      messagesRef.current = [];
      limitNotice.current = null;
    }
    onDone(toDoneText(result.text));
  }
  async function applyModelCore(model, effort, saveAsDefault) {
    limitNotice.current = null;
    logEvent("tengu_model_command_menu", {
      action: telemetrySafeModelName(model),
      from_model: telemetrySafeModelName(appModel),
      to_model: telemetrySafeModelName(model),
    });
    let effortChanged = saveAsDefault && effort !== sessionRef.current?.effort;
    if (effort !== undefined)
      persistEffortSetting(effort, resolveRequestedModel(model), effortChanged, storageV5);
    clearRefusalFallbackModelLatch();
    let failed = false;
    let fastModeOff = false;
    if (isFastModeEnabled()) clearFastModeCooldown();
    recordSwitchIfChanged(session, appStoreDirect.getState(), model, "picker");
    setAppState((prev) => {
      failed = !!prev.fastMode;
      fastModeOff = isFastModeEnabled() ? isFastModeActive(model, prev.fastMode) : failed;
      return {
        ...prev,
        mainLoopModel: model,
        mainLoopModelForSession: null,
        ...(effort !== undefined && {
          sessionEffort: levelEffortSetting(effort),
        }),
        ...(fastModeOff !== failed && {
          fastMode: fastModeOff,
        }),
      };
    });
    reportFastModeToggle(failed, fastModeOff);
    let cloudRefusal = cloudModelRefusal(sessionRef.current, setAppState, storageV5);
    logFeatureOk("model_switch");
    notifyModelDeprecation(model, addNotification);
    let saveResult = saveAsDefault ? await setDefaultModel(model, storageV5) : null;
    let savedAsDefault = saveResult?.kind === "saved";
    let notice = `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(model))}${savedAsDefault ? SAVED_AS_DEFAULT_SUFFIX : " for this session only"}`;
    if (effort !== undefined)
      notice +=
        savedAsDefault && (!effortChanged || toPersistableEffort(effort) === undefined)
          ? ` \xB7 ${toInlineCode(effort)} effort for this session only`
          : ` with ${toInlineCode(effort)} effort`;
    notice += cloudRefusal;
    notice += formatFastModeSuffix(failed, fastModeOff, model, {
      announceKeptOn: true,
    });
    notice += describeDefaultSaved(saveResult);
    if (savedAsDefault) notice += anthropicModelEnvNotice(model) || findModelSettingSource(model);
    if (messagesRef.current.length > 0) {
      notice += `
${messagesRef.current.map(sanitizeHookText).join(`
`)}`;
      messagesRef.current = [];
    }
    return {
      message: notice,
      hasDefaultSaveFailed: saveResult?.kind === "failed",
    };
  }
  function toDoneText(text) {
    let usageLimitNotice = limitNotice.current;
    limitNotice.current = null;
    usageLimitNotice?.();
    let usageCreditNotice = creditNotice.current;
    creditNotice.current = null;
    return usageCreditNotice === null ? text : text + usageCreditNotice;
  }
  if (ladderRequest) {
    let { model, effort } = ladderRequest;
    let userSpecifiedModel = parseUserSpecifiedModel(model ?? getDefaultMainLoopModelSetting());
    let ladderRemaining = ladderCount.current;
    return jsxProd_default(FableUsageCreditsConsent, {
      variant: "picker",
      modelName: renderUsageCreditsOnlyModelName(userSpecifiedModel),
      model: userSpecifiedModel,
      onDone: (result, consent) => {
        if (ladderRemaining !== ladderCount.current) return false;
        if (pendingLadder.current) return false;
        pendingLadder.current = true;
        setLadderRequest(null);
        if (result === "consent") {
          requestSwitch(model, effort, true);
          return;
        }
        pendingSaveAsDefault.current = false;
        if (result === "upgrade") {
          let trimmed = toDoneText("").trim();
          onDone(trimmed === "" ? undefined : trimmed, {
            display: trimmed === "" ? "skip" : "system",
            nextInput: "/upgrade",
            submitNextInput: true,
          });
          return;
        }
        onDone(toDoneText(consent ?? `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(modelSetting))}`), {
          display: "system",
        });
      },
    });
  }
  if (busy) return null;
  if (switching)
    return jsxProd_default(PromptDialog, {
      message: "Running PreModelSwitch hooks\u2026",
      onCancel: () => {
        abortControllerRef.current?.abort();
        setSwitching(false);
        onDone(toDoneText("Model switch cancelled"), {
          display: "system",
        });
      },
    });
  if (confirmRequest)
    return jsxProd_default(ModelEffortSwitchConfirm, {
      kind: confirmRequest.kind,
      model: confirmRequest.model,
      effort: confirmRequest.pick,
      hookReason: confirmRequest.hookReason,
      onConfirm: () => {
        if (abortController.current === confirmRequest) return;
        abortController.current = confirmRequest;
        if (
          confirmRequest.vettedFrom !== undefined &&
          effectiveModelForContext(appStoreDirect.getState()) !== confirmRequest.vettedFrom
        ) {
          setConfirmRequest(null);
          onDone(toDoneText("The model changed while you were confirming; pick again"), {
            display: "system",
          });
          return;
        }
        applyModelWithHooks(confirmRequest.model, confirmRequest.pick, confirmRequest.saveAsDefault).catch(
          showError,
        );
      },
      onCancel: () => {
        setConfirmRequest(null);
        pendingSaveAsDefault.current = false;
      },
    });
  return jsxProd_default(ModelPicker, {
    initial: appModel,
    sessionModel,
    options: modelOptions,
    onSelect: (choice, extra) => {
      sessionRef.current = undefined;
      requestSwitch(identity(choice), extra ?? sessionRef.current?.effort);
    },
    onSetDefault: (value) => {
      if (noEffortRefusal(identity(value)) !== null) return;
      pendingSaveAsDefault.current = true;
    },
    onCancel: handleCancel,
    isStandaloneCommand: true,
    showFastModeNotice:
      isFastModeEnabled() && fastModeOnForModel && supportsFastMode(modelSetting) && isFastModeAvailable(),
  });
}
//@ chunk-ny1a8wws.js:24696-26113 layout
function CloudModelPickerLoader({ getMessages, onDone, storageV5, credentials, session }) {
  let model = useAppState((state) => state.mainLoopModel);
  let [error, setError] = useState(null);
  let [selected, setSelected] = useState(null);
  let [abortController] = useState(() => new AbortController());
  let [officialAlt, setOfficialAlt] = useState();
  let busy = useRef(false);
  useEffect(() => {
    let remoteCaps = getRemoteCaps();
    if (!remoteCaps) {
      onDone(CLOUD_MODEL_PICKER_UNAVAILABLE, {
        display: "system",
      });
      return;
    }
    let cancelled = false;
    remoteCaps
      .sendControlRequest(
        {
          subtype: "list_models",
        },
        {
          signal: abortController.signal,
          timeoutMs: CLOUD_MODEL_LIST_TIMEOUT_MS,
          awaitWorkerStart: {
            onChange: (value) => {
              busy.current ||= value;
              setOfficialAlt(value);
            },
          },
        },
      )
      .then((args) => {
        if (cancelled || abortController.signal.aborted) return;
        let targets = pluginOptionsTargets(args);
        cacheRemoteModelList(REMOTE_MODEL_LIST_CACHE.of(session.host), remoteCaps.sessionId, {
          rows: targets,
          trigger: "open",
        });
        logEvent("tengu_remote_model_picker", {
          outcome: lit("opened"),
          model_count: targets.length,
          waited_for_worker: busy.current,
        });
        setError(targets);
      })
      .catch((error) => {
        if (cancelled || abortController.signal.aborted) return;
        logEvent("tengu_remote_model_picker", {
          outcome: lit(error instanceof ControlRequestTimeoutError ? "timeout" : "fallback"),
          waited_for_worker: busy.current,
        });
        onDone(CLOUD_MODEL_LIST_FAILED, {
          display: "system",
        });
      });
    setOfficialAlt((prev) => prev ?? false);
    return () => {
      cancelled = true;
    };
  }, [onDone, abortController, session]);
  if (selected !== null)
    return jsxProd_default(SetModelFromArgs, {
      args: selected,
      getMessages,
      onDone,
      storageV5,
      credentials,
      session,
    });
  if (error === null) {
    if (officialAlt === undefined) return null;
    return jsxProd_default(PromptDialog, {
      message: officialAlt
        ? "Waiting for the cloud session to be ready\u2026"
        : "Loading models from the cloud session\u2026",
      onCancel: () => {
        abortController.abort();
        logEvent("tengu_remote_model_picker", {
          outcome: lit("cancelled"),
          waited_for_worker: busy.current,
        });
        onDone(CLOUD_MODEL_LIST_TIMEOUT_MESSAGE, {
          display: "system",
        });
      },
    });
  }
  let initial = isKnownAlias(error, model);
  return jsxProd_default(ModelPicker, {
    initial,
    options: error,
    headerText: CLOUD_MODEL_PICKER_SUBTITLE,
    onSelect: (choice) => setSelected(choice ?? "default"),
    onCancel: () => {
      logEvent("tengu_model_command_menu", {
        action: lit("cancel"),
      });
      onDone(keptModelMessage(model), {
        display: "system",
      });
    },
    isStandaloneCommand: true,
  });
}
//@ chunk-ny1a8wws.js:26113-28126 fingerprint (2.1.88 match: ModelPickerWrapper, 0.322)
function ModelPickerWrapper(props) {
  let $ = useMemoCache(38);
  let { kept, getMessages, onDone, storageV5, credentials, session } = props;
  let mainLoopModel = useAppState(selectMainLoopModel);
  let appStoreDirect = useAppStoreDirect();
  let [error, setError] = useState(null);
  let fallbackModel;
  if ($[0] !== kept.rows || $[1] !== mainLoopModel) {
    fallbackModel = () => isKnownAlias(kept.rows, mainLoopModel);
    $[0] = kept.rows;
    $[1] = mainLoopModel;
    $[2] = fallbackModel;
  } else fallbackModel = $[2];
  let [initialModel] = useState(fallbackModel);
  let statusRef = useRef("pending");
  let mainLoopModelForSession = useRef(false);
  let content;
  if (
    $[3] !== kept.rows ||
    $[4] !== kept.trigger ||
    $[5] !== onDone ||
    $[6] !== initialModel ||
    $[7] !== session ||
    $[8] !== appStoreDirect
  ) {
    content = () => {
      let setAppState = getRemoteCaps();
      if (!setAppState) {
        mainLoopModelForSession.current = true;
        onDone(CLOUD_MODEL_PICKER_UNAVAILABLE, {
          display: "system",
        });
        return;
      }
      logEvent("tengu_remote_model_picker", {
        outcome: lit("opened"),
        model_count: kept.rows.length,
        waited_for_worker: false,
        kept_rows_trigger: fromEnum(kept.trigger),
      });
      refreshRemoteModelList(REMOTE_MODEL_LIST_CACHE.of(session.host), setAppState, "open").then((option) => {
        let label =
          import_sortedIndex_2(option, kept.rows) &&
          isKnownAlias(kept.rows, appStoreDirect.getState().mainLoopModel) === initialModel;
        statusRef.current = option === null ? "failed" : label ? "same" : "differed";
      });
    };
    $[3] = kept.rows;
    $[4] = kept.trigger;
    $[5] = onDone;
    $[6] = initialModel;
    $[7] = session;
    $[8] = appStoreDirect;
    $[9] = content;
  } else content = $[9];
  let row;
  if (
    $[10] !== kept ||
    $[11] !== onDone ||
    $[12] !== initialModel ||
    $[13] !== session ||
    $[14] !== appStoreDirect
  ) {
    row = [kept, initialModel, session, appStoreDirect, onDone];
    $[10] = kept;
    $[11] = onDone;
    $[12] = initialModel;
    $[13] = session;
    $[14] = appStoreDirect;
    $[15] = row;
  } else row = $[15];
  useEffect(content, row);
  if (error !== null) {
    let footer;
    if (
      $[16] !== credentials ||
      $[17] !== getMessages ||
      $[18] !== onDone ||
      $[19] !== error ||
      $[20] !== session ||
      $[21] !== storageV5
    ) {
      footer = jsxProd_default(SetModelFromArgs, {
        args: error,
        getMessages,
        onDone,
        storageV5,
        credentials,
        session,
      });
      $[16] = credentials;
      $[17] = getMessages;
      $[18] = onDone;
      $[19] = error;
      $[20] = session;
      $[21] = storageV5;
      $[22] = footer;
    } else footer = $[22];
    return footer;
  }
  let hoverModel;
  if ($[23] !== kept.rows || $[24] !== mainLoopModel) {
    hoverModel = isKnownAlias(kept.rows, mainLoopModel);
    $[23] = kept.rows;
    $[24] = mainLoopModel;
    $[25] = hoverModel;
  } else hoverModel = $[25];
  let hoverModelValue = hoverModel;
  let onSelect;
  if ($[26] !== hoverModelValue || $[27] !== onDone || $[28] !== initialModel) {
    onSelect = (prev) => {
      if (mainLoopModelForSession.current) {
        return;
      }
      mainLoopModelForSession.current = true;
      let isSameModel = prev === initialModel || prev === hoverModelValue;
      let showCurrent = !isSameModel || (statusRef.current === "same" && hoverModelValue === initialModel);
      logEvent("tengu_remote_model_kept_rows_pick", {
        is_ticked_row: isSameModel,
        is_sent: showCurrent,
        own_answer: fromEnum(statusRef.current),
      });
      if (showCurrent) setError(prev ?? "default");
      else
        onDone(MODEL_KEPT_MESSAGE, {
          display: "system",
        });
    };
    $[26] = hoverModelValue;
    $[27] = onDone;
    $[28] = initialModel;
    $[29] = onSelect;
  } else onSelect = $[29];
  let onCancel;
  if ($[30] !== mainLoopModel || $[31] !== onDone) {
    onCancel = () => {
      if (mainLoopModelForSession.current) {
        return;
      }
      mainLoopModelForSession.current = true;
      logEvent("tengu_model_command_menu", {
        action: lit("cancel"),
      });
      onDone(keptModelMessage(mainLoopModel), {
        display: "system",
      });
    };
    $[30] = mainLoopModel;
    $[31] = onDone;
    $[32] = onCancel;
  } else onCancel = $[32];
  let details;
  if ($[33] !== hoverModelValue || $[34] !== kept.rows || $[35] !== onSelect || $[36] !== onCancel) {
    details = jsxProd_default(ModelPicker, {
      initial: hoverModelValue,
      options: kept.rows,
      headerText: CLOUD_MODEL_PICKER_SUBTITLE,
      onSelect,
      onCancel,
      isStandaloneCommand: true,
    });
    $[33] = hoverModelValue;
    $[34] = kept.rows;
    $[35] = onSelect;
    $[36] = onCancel;
    $[37] = details;
  } else details = $[37];
  return details;
}
//@ chunk-ny1a8wws.js:28126-28840 layout
function SetModelFromArgs(outerProps) {
  let $ = useMemoCache(15);
  let args;
  let onDone;
  let rest;
  if ($[0] !== outerProps) {
    ({ args, onDone, ...rest } = outerProps);
    $[0] = outerProps;
    $[1] = args;
    $[2] = onDone;
    $[3] = rest;
  } else {
    args = $[1];
    onDone = $[2];
    rest = $[3];
  }
  useAppState(selectMainLoopModel_2);
  let pickModel;
  if ($[4] !== args) {
    pickModel = () => identityModel(args);
    $[4] = args;
    $[5] = pickModel;
  } else pickModel = $[5];
  let [pickedModel] = useState(pickModel);
  let modelArg = pickedModel === "default" ? null : pickedModel;
  let useResult;
  if ($[6] !== modelArg) {
    useResult = () => isModelInUse(modelArg);
    $[6] = modelArg;
    $[7] = useResult;
  } else useResult = $[7];
  let [useSwitched] = useState(useResult);
  useState(false);
  useRef(false);
  let pendingSave = useRef(null);
  let saveStarted = useRef(false);
  let { addNotification } = useNotifications();
  let { storageV5 } = rest;
  let cloudLandedText = cloudLandedTextPlaceholder;
  let finish;
  if ($[8] !== onDone) {
    finish = (text, display) => {
      if (pendingSave.current === null || text === undefined) {
        saveStarted.current = true;
        onDone(text, display);
        return;
      }
      pendingSave.current.then((savedText) => onDone(text + savedText, display));
    };
    $[8] = onDone;
    $[9] = finish;
  } else finish = $[9];
  let onDone_2 = finish;
  const onCloudSwitchLanded = useSwitched ? cloudLandedText : undefined;
  let picker;
  if ($[10] !== onDone_2 || $[11] !== rest || $[12] !== pickedModel || $[13] !== onCloudSwitchLanded) {
    picker = jsxProd_default(ModelPickerPanel, {
      args: pickedModel,
      onDone: onDone_2,
      onCloudSwitchLanded,
      ...rest,
    });
    $[10] = onDone_2;
    $[11] = rest;
    $[12] = pickedModel;
    $[13] = onCloudSwitchLanded;
    $[14] = picker;
  } else picker = $[14];
  return picker;
}
//@ chunk-ny1a8wws.js:28840-35728 layout
function ModelPickerPanel(props) {
  let $ = useMemoCache(74);
  let { args, getMessages, onDone, onCloudSwitchLanded, storageV5, credentials, session } = props;
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let { addNotification } = useNotifications();
  let [pendingConfirm, setPendingConfirm] = useState(null);
  let noMessages;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    noMessages = [];
    $[0] = noMessages;
  } else noMessages = $[0];
  let hookMessagesRef = useRef(noMessages);
  let [isRunningHooks, setIsRunningHooks] = useState(false);
  let abortControllerRef = useRef(null);
  let [consentState, setConsentState] = useState(null);
  let [isConfirmable] = useState(isUltracodeConfirmable);
  let switchAbandoned = useRef(false);
  let consentAnswered = useRef(false);
  let consentEpoch = useRef(0);
  let confirmedFor = useRef(null);
  let isSettled = useRef(false);
  let applyModel;
  if (
    $[1] !== addNotification ||
    $[2] !== onDone ||
    $[3] !== session ||
    $[4] !== setAppState ||
    $[5] !== storageV5 ||
    $[6] !== appStoreDirect
  ) {
    applyModel = (model, credentials) => {
      let saveAsDefault = !isRemoteSessionAvailable();
      setPendingConfirm(null);
      let didFail = false;
      let applyAndNotify = () => {
        let switchResult = saveModelSwitch(
          session,
          model,
          () => appStoreDirect.getState(),
          setAppState,
          saveAsDefault,
          "command",
          credentials,
          storageV5,
          (outcome) => {
            didFail = outcome?.kind === "failed";
          },
        );
        let refusalCount = cloudModelRefusal(undefined, setAppState, storageV5);
        if (credentials !== undefined && model !== null)
          addNotification({
            key: `model-restricted-${model}`,
            kind: "warning",
            text: formatModelRestrictedNotice(credentials, model),
            priority: "immediate",
          });
        notifyModelDeprecation(model, addNotification);
        return switchResult.then((result) => result + refusalCount);
      };
      let previousEffectiveModel = effectiveModelForContext(appStoreDirect.getState());
      let reply = saveAsDefault
        ? savedModelPickReply(
            model,
            {
              getAppState: () => appStoreDirect.getState(),
              setAppState,
              session,
              storageV5,
              options: {
                mcpClients: [],
              },
            },
            () =>
              applyAndNotify().then((count) =>
                didFail
                  ? {
                      unsaved: count,
                    }
                  : count,
              ),
            {
              persistsOffBox: () => isBridgeOrTransport(session),
              hasModelMoved: () =>
                effectiveModelForContext(appStoreDirect.getState()) !== previousEffectiveModel,
            },
          )
        : applyAndNotify().then(textNotRefusal);
      let hookTexts = hookMessagesRef.current;
      hookMessagesRef.current = [];
      reply.then(
        (outcome) => {
          let { text, isRefusal, rewrittenTo } = outcome;
          return isRefusal
            ? onDone(text, {
                display: "system",
              })
            : onDone(
                hookTexts.length > 0 && rewrittenTo === undefined
                  ? `${text}
${hookTexts.map(sanitizeHookText).join(`
`)}`
                  : text,
              );
        },
        (error) => {
          logError(toError(error));
          onDone(`Model switch failed: ${sanitizeHookText(errorMessage(error))}`, {
            display: "system",
          });
        },
      );
    };
    $[1] = addNotification;
    $[2] = onDone;
    $[3] = session;
    $[4] = setAppState;
    $[5] = storageV5;
    $[6] = appStoreDirect;
    $[7] = applyModel;
  } else applyModel = $[7];
  let switchModel = applyModel;
  let applyAfterCacheCheck;
  if ($[8] !== switchModel || $[9] !== getMessages || $[10] !== appStoreDirect) {
    applyAfterCacheCheck = (model, substitutedFrom, skipConfirm) => {
      let state = appStoreDirect.getState();
      if (
        !skipConfirm &&
        useMainLoopModel(
          model,
          state.mainLoopModel,
          state.mainLoopModelForSession,
          state.cacheMissAckedAtOutputTokens,
          lastMainThreadResponse(getMessages()),
        )
      ) {
        setPendingConfirm({
          model,
          substitutedFrom,
          vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
        });
        return;
      }
      switchModel(model, substitutedFrom);
    };
    $[8] = switchModel;
    $[9] = getMessages;
    $[10] = appStoreDirect;
    $[11] = applyAfterCacheCheck;
  } else applyAfterCacheCheck = $[11];
  let applyChecked = applyAfterCacheCheck;
  let runHooksThenApply;
  if ($[12] !== applyChecked || $[13] !== onDone || $[14] !== session || $[15] !== appStoreDirect) {
    runHooksThenApply = (model, substitutedFrom) => {
      let abortController = new AbortController();
      abortControllerRef.current = abortController;
      setIsRunningHooks(true);
      serializeModelSwitch(session, () =>
        runPreModelSwitchHooks(session, appStoreDirect.getState, model, "command", {
          signal: abortController.signal,
        }),
      )
        .then((hookOutcome) => {
          setIsRunningHooks(false);
          if (abortController.signal.aborted) {
            return;
          }
          hookMessagesRef.current = hookOutcome.messages;
          if (hookOutcome.decision === "block") {
            logFeatureSad("model_switch", "blocked_by_hook");
            onDone(preModelSwitchBlockedMessage(model, hookOutcome.reason, hookOutcome.messages), {
              display: "system",
            });
            return;
          }
          if (hookOutcome.decision === "ask") {
            setPendingConfirm({
              model,
              substitutedFrom,
              hookReason: hookOutcome.reason ?? "Confirm switching the model",
              vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
            });
            return;
          }
          applyChecked(model, substitutedFrom, hookOutcome.skipConfirm);
        })
        .catch((error) => {
          setIsRunningHooks(false);
          if (abortController.signal.aborted) {
            return;
          }
          logError(toError(error));
          onDone(`Model switch failed: ${sanitizeHookText(errorMessage(error))}`, {
            display: "system",
          });
        });
    };
    $[12] = applyChecked;
    $[13] = onDone;
    $[14] = session;
    $[15] = appStoreDirect;
    $[16] = runHooksThenApply;
  } else runHooksThenApply = $[16];
  let applyFromHooks = runHooksThenApply;
  let switchEffect;
  if (
    $[17] !== addNotification ||
    $[18] !== args ||
    $[19] !== credentials ||
    $[20] !== onCloudSwitchLanded ||
    $[21] !== onDone ||
    $[22] !== applyFromHooks ||
    $[23] !== session ||
    $[24] !== setAppState ||
    $[25] !== storageV5
  ) {
    switchEffect = () => {
      let sessionId = getRemoteCaps();
      if (sessionId && isRemoteControlChannelAvailable()) {
        switchMainLoopModelSafe(args, storageV5, credentials).then((switchResult) => {
          if (switchAbandoned.current) {
            return;
          }
          if (!switchResult.ok) {
            isSettled.current = true;
            onDone(switchResult.message, {
              display: "system",
            });
            return;
          }
          if (switchResult.model !== null && hasLadderForSetting(switchResult.model)) {
            logFeatureSad("model_fable_consent", "remote_thin_client_blocked");
            isSettled.current = true;
            onDone(
              `${renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(switchResult.model))} uses usage credits, and this cloud session can\u2019t show the consent prompt yet \xB7 switch models from the workspace, or consent once in a local session first`,
              {
                display: "system",
              },
            );
            return;
          }
          let model = switchResult.model;
          return sessionId
            .sendControlRequest(
              {
                subtype: "set_model",
                model: model ?? undefined,
              },
              ...(onCloudSwitchLanded
                ? [
                    {
                      awaitWorkerStart: {
                        onChange: noopWorkerStartHandler,
                      },
                    },
                  ]
                : []),
            )
            .then(() => {
              onCloudSwitchLanded?.();
              let fastModeDropped = false;
              setAppState((state) => {
                fastModeDropped =
                  isFastModeEnabled() && !!state.fastMode && !isFastModeActive(model, state.fastMode);
                recordSwitchIfChanged(session, state, model, "command");
                return {
                  ...state,
                  mainLoopModel: model,
                  mainLoopModelForSession: null,
                  ...(fastModeDropped && {
                    fastMode: false,
                  }),
                };
              });
              if (fastModeDropped) reportFastModeToggle(true, false);
              refreshRemoteModelList(REMOTE_MODEL_LIST_CACHE.of(session.host), sessionId, "switch");
              if (switchAbandoned.current) {
                addNotification({
                  key: `remote-model-switch-landed-${model ?? "default"}`,
                  kind: "event",
                  text:
                    model === null
                      ? "The cloud session reset its model to the workspace default"
                      : `The cloud session switched to ${renderModelLabel(model)}`,
                  priority: "high",
                });
                return;
              }
              if (switchResult.substitutedFrom !== undefined && model !== null)
                addNotification({
                  key: `model-restricted-${model}`,
                  kind: "warning",
                  text: formatModelRestrictedNotice(switchResult.substitutedFrom, model),
                  priority: "immediate",
                });
              if (switchResult.substitutedFrom !== undefined)
                logFeatureSad("model_switch", "family_alias_stepped_down");
              else logFeatureOk("model_switch");
              isSettled.current = true;
              onDone(
                model === null
                  ? "Reset model to the workspace default"
                  : `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(model))}`,
              );
            })
            .catch((error) => {
              logForDebugging(`[remote] set_model rejected: ${errorMessage(error)}`);
              if (switchAbandoned.current) {
                return;
              }
              let timedOut = error instanceof ControlRequestTimeoutError;
              logFeatureBad("model_switch", timedOut ? "timeout" : "remote_rejected");
              isSettled.current = true;
              onDone(
                timedOut
                  ? `${CLOUD_SWITCH_NO_RESPONSE_PREFIX}${toInlineCode(args)} may still have been applied`
                  : `${CLOUD_SWITCH_FAILED_PREFIX}${toInlineCode(args)}: ${sanitizeHookText(errorMessage(error))}`,
                {
                  display: "system",
                },
              );
            });
        });
        return;
      }
      switchMainLoopModelSafe(args, storageV5, credentials, {
        acceptCreditsRequired: true,
      }).then((localResult) => {
        if (!localResult.ok) {
          onDone(localResult.message, {
            display: "system",
          });
          return;
        }
        if (ladderForDefaultModel(localResult.model)) {
          consentAnswered.current = false;
          consentEpoch.current = consentEpoch.current + 1;
          setConsentState({
            model: localResult.model,
            substitutedFrom: localResult.substitutedFrom,
          });
          return;
        }
        if (localResult.creditsRefusal !== undefined) {
          onDone(localResult.creditsRefusal, {
            display: "system",
          });
          return;
        }
        applyFromHooks(localResult.model, localResult.substitutedFrom);
      });
    };
    $[17] = addNotification;
    $[18] = args;
    $[19] = credentials;
    $[20] = onCloudSwitchLanded;
    $[21] = onDone;
    $[22] = applyFromHooks;
    $[23] = session;
    $[24] = setAppState;
    $[25] = storageV5;
    $[26] = switchEffect;
  } else switchEffect = $[26];
  let effectDeps;
  if (
    $[27] !== args ||
    $[28] !== credentials ||
    $[29] !== onCloudSwitchLanded ||
    $[30] !== onDone ||
    $[31] !== applyFromHooks ||
    $[32] !== setAppState ||
    $[33] !== storageV5
  ) {
    effectDeps = [args, onDone, onCloudSwitchLanded, setAppState, applyFromHooks, storageV5, credentials];
    $[27] = args;
    $[28] = credentials;
    $[29] = onCloudSwitchLanded;
    $[30] = onDone;
    $[31] = applyFromHooks;
    $[32] = setAppState;
    $[33] = storageV5;
    $[34] = effectDeps;
  } else effectDeps = $[34];
  useEffect(switchEffect, effectDeps);
  if (isConfirmable) {
    const message = `Switching the cloud session to ${args}\u2026`;
    let onCancel;
    if ($[35] !== args || $[36] !== onDone) {
      onCancel = () => {
        if (isSettled.current) {
          return;
        }
        isSettled.current = true;
        switchAbandoned.current = true;
        logFeatureSad("model_switch", "remote_wait_cancelled");
        onDone(
          `Stopped waiting for the cloud session \u2014 you\u2019ll get a notice if the switch to ${args} still lands`,
          {
            display: "system",
          },
        );
      };
      $[35] = args;
      $[36] = onDone;
      $[37] = onCancel;
    } else onCancel = $[37];
    let waitingDialog;
    if ($[38] !== message || $[39] !== onCancel) {
      waitingDialog = jsxProd_default(PromptDialog, {
        message,
        onCancel,
      });
      $[38] = message;
      $[39] = onCancel;
      $[40] = waitingDialog;
    } else waitingDialog = $[40];
    return waitingDialog;
  }
  if (consentState) {
    let { model, substitutedFrom } = consentState;
    let consentComponent;
    let epoch;
    let parsedModel;
    let variant;
    let modelName;
    if ($[41] !== model) {
      parsedModel = parseUserSpecifiedModel(model ?? getDefaultMainLoopModelSetting());
      epoch = consentEpoch.current;
      consentComponent = FableUsageCreditsConsent;
      variant = "picker";
      modelName = renderUsageCreditsOnlyModelName(parsedModel);
      $[41] = model;
      $[42] = consentComponent;
      $[43] = epoch;
      $[44] = parsedModel;
      $[45] = variant;
      $[46] = modelName;
    } else {
      consentComponent = $[42];
      epoch = $[43];
      parsedModel = $[44];
      variant = $[45];
      modelName = $[46];
    }
    let onDone_2;
    if (
      $[47] !== model ||
      $[48] !== onDone ||
      $[49] !== applyFromHooks ||
      $[50] !== appStoreDirect ||
      $[51] !== substitutedFrom
    ) {
      onDone_2 = (choice, keptText) => {
        if (epoch !== consentEpoch.current) {
          return false;
        }
        if (consentAnswered.current) {
          return false;
        }
        consentAnswered.current = true;
        setConsentState(null);
        if (choice === "consent") {
          applyFromHooks(model, substitutedFrom);
          return;
        }
        if (choice === "upgrade") {
          onDone(undefined, {
            display: "skip",
            nextInput: "/upgrade",
            submitNextInput: true,
          });
          return;
        }
        onDone(
          keptText ??
            `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(useMainLoopModel_2(appStoreDirect.getState())))}`,
          {
            display: "system",
          },
        );
      };
      $[47] = model;
      $[48] = onDone;
      $[49] = applyFromHooks;
      $[50] = appStoreDirect;
      $[51] = substitutedFrom;
      $[52] = onDone_2;
    } else onDone_2 = $[52];
    let consentElement;
    if (
      $[53] !== consentComponent ||
      $[54] !== parsedModel ||
      $[55] !== variant ||
      $[56] !== modelName ||
      $[57] !== onDone_2
    ) {
      consentElement = jsxProd_default(consentComponent, {
        variant,
        modelName,
        model: parsedModel,
        onDone: onDone_2,
      });
      $[53] = consentComponent;
      $[54] = parsedModel;
      $[55] = variant;
      $[56] = modelName;
      $[57] = onDone_2;
      $[58] = consentElement;
    } else consentElement = $[58];
    return consentElement;
  }
  if (pendingConfirm) {
    let onConfirm;
    if ($[59] !== switchModel || $[60] !== onDone || $[61] !== pendingConfirm || $[62] !== appStoreDirect) {
      onConfirm = () => {
        if (confirmedFor.current === pendingConfirm) {
          return;
        }
        confirmedFor.current = pendingConfirm;
        if (
          pendingConfirm.vettedFrom !== undefined &&
          effectiveModelForContext(appStoreDirect.getState()) !== pendingConfirm.vettedFrom
        ) {
          onDone("The model changed while you were confirming; pick again", {
            display: "system",
          });
          return;
        }
        switchModel(pendingConfirm.model, pendingConfirm.substitutedFrom);
      };
      $[59] = switchModel;
      $[60] = onDone;
      $[61] = pendingConfirm;
      $[62] = appStoreDirect;
      $[63] = onConfirm;
    } else onConfirm = $[63];
    let onCancel;
    if ($[64] !== onDone || $[65] !== appStoreDirect) {
      onCancel = () =>
        onDone(
          `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(useMainLoopModel_2(appStoreDirect.getState())))}`,
          {
            display: "system",
          },
        );
      $[64] = onDone;
      $[65] = appStoreDirect;
      $[66] = onCancel;
    } else onCancel = $[66];
    let confirmElement;
    if (
      $[67] !== pendingConfirm.hookReason ||
      $[68] !== pendingConfirm.model ||
      $[69] !== onConfirm ||
      $[70] !== onCancel
    ) {
      confirmElement = jsxProd_default(ModelEffortSwitchConfirm, {
        kind: "model",
        model: pendingConfirm.model,
        effort: undefined,
        hookReason: pendingConfirm.hookReason,
        onConfirm,
        onCancel,
      });
      $[67] = pendingConfirm.hookReason;
      $[68] = pendingConfirm.model;
      $[69] = onConfirm;
      $[70] = onCancel;
      $[71] = confirmElement;
    } else confirmElement = $[71];
    return confirmElement;
  }
  if (isRunningHooks) {
    let hooksDialog;
    if ($[72] !== onDone) {
      hooksDialog = jsxProd_default(PromptDialog, {
        message: "Running PreModelSwitch hooks\u2026",
        onCancel: () => {
          abortControllerRef.current?.abort();
          setIsRunningHooks(false);
          onDone("Model switch cancelled", {
            display: "system",
          });
        },
      });
      $[72] = onDone;
      $[73] = hooksDialog;
    } else hooksDialog = $[73];
    return hooksDialog;
  }
  return null;
}
//@ chunk-ny1a8wws.js:35728-35909 layout
function notifyModelDeprecation(modelId, addNotification) {
  let deprecationStatusLine = getDeprecationStatusLine(modelId);
  if (!deprecationStatusLine) return;
  addNotification({
    key: "model-deprecation-warning",
    kind: "warning",
    text: deprecationStatusLine,
    color: "warning",
    priority: "immediate",
    invalidates: ["model-deprecation-warning"],
  });
}
//@ chunk-ny1a8wws.js:35909-36074 callgraph-fingerprint (2.1.88 match: SetModelAndClose, 0.23)
function SetModelAndClose(state) {
  let { onDone } = state;
  let isFastMode = useAppState(selectMainLoopModelForFastMode);
  let mainLoopModelForSession = useAppState(selectMainLoopModelForSession);
  let sessionEffort = useAppState(selectSessionEffort);
  let settingsEffortTable = useAppState(selectSettingsEffortTable);
  onDone(
    ShowModelAndClose({
      mainLoopModel: isFastMode,
      mainLoopModelForSession,
      sessionEffort,
      settingsEffortTable,
    }),
  );
  return null;
}
//@ chunk-ny1a8wws.js:36074-37101 fingerprint (2.1.88 match: call, 0.691)
/**
 * /model 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context, args) => {
  args = args?.trim() || "";
  if (isCommonInfoArg(args)) {
    logEvent("tengu_model_command_inline_help", {
      args: fromEnum(args),
    });
    return jsxProd_default(SetModelAndClose, {
      onDone,
    });
  }
  if (COMMON_HELP_ARGS.includes(args)) {
    onDone("Run /model to open the model selection menu, or /model [modelName] to set the model.", {
      display: "system",
    });
    return;
  }
  if (args) {
    logEvent("tengu_model_command_inline", {
      args_hash: shortHash(args),
      args_length: args.length,
    });
    return jsxProd_default(ModelPickerPanel, {
      args: identityModel(args),
      getMessages: () => context.getMessages?.() ?? context.messages,
      onDone,
      storageV5: context.storageV5,
      credentials: context.credentials,
      session: context.session,
    });
  }
  if (getRemoteCaps()) {
    if (hasRemoteCap("modelCatalog") && isRemoteControlChannelAvailable()) {
      let cached = cachedRemoteModelListWithDefault(
        REMOTE_MODEL_LIST_CACHE.of(context.session.host),
        getRemoteCaps()?.sessionId,
      );
      if (cached !== null)
        return jsxProd_default(ModelPickerWrapper, {
          kept: cached,
          getMessages: () => context.getMessages?.() ?? context.messages,
          onDone,
          storageV5: context.storageV5,
          credentials: context.credentials,
          session: context.session,
        });
      return jsxProd_default(CloudModelPickerLoader, {
        getMessages: () => context.getMessages?.() ?? context.messages,
        onDone,
        storageV5: context.storageV5,
        credentials: context.credentials,
        session: context.session,
      });
    }
    onDone(CLOUD_MODEL_PICKER_UNAVAILABLE, {
      display: "system",
    });
    return;
  }
  return jsxProd_default(LocalModelPicker, {
    onDone,
    getMessages: () => context.getMessages?.() ?? context.messages,
    storageV5: context.storageV5,
    session: context.session,
    onQueryEvent: context.onQueryEvent,
  });
};
export {
  renderModelLabel,
  selectMainLoopModelForSession_2,
  resolveRequestedModel,
  ShowModelAndClose,
  diagnose1mAliasSwitch,
  isOpus1mUnavailable,
  requires1mEntitlementCheck,
  call,
};
