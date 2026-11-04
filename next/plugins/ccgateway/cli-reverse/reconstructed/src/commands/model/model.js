/**
 * commands/model/model.tsx
 *
 * /model 命令：模型选择器与切换
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/model/model.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-d1cgs5na.js (7), chunk-mvhmq2z8.js (30)
 * attribution: fingerprint 6, placement 4, sole-consumer 8, affinity 1, callgraph-fingerprint 2, layout 15, file-local 2
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
  getModelSwitchTarget,
  serializeModelSwitch,
  effectiveModelForContext,
  recordSwitchIfChanged,
  useMainLoopModel as useMainLoopModel_3,
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

//@ chunk-d1cgs5na.js:1834-1903 fingerprint (2.1.88 match: renderModelLabel, 1)
function renderModelLabel(model) {
  let rendered = renderDefaultModelSetting_2(model ?? getDefaultMainLoopModelSetting());
  return model === null ? `${rendered} (default)` : rendered;
}
//@ chunk-d1cgs5na.js:12136-12407 placement
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
//@ chunk-d1cgs5na.js:12407-12554 fingerprint (2.1.88 match: isOpus1mUnavailable, 1)
function isOpus1mUnavailable(model) {
  let m = model.toLowerCase();
  if (!(m.includes("opus") && m.includes("[1m]"))) return false;
  if (renderDefaultModelSetting(model).every((model) => modelHasNative1MContext(model))) return false;
  return !shouldProbeThirdPartyDefaults() && !isOpus1mMergeEnabled();
}
//@ chunk-d1cgs5na.js:12651-12852 placement
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
//@ chunk-d1cgs5na.js:12852-12887 placement
/**
 * 把用户指定的模型（或默认主循环模型）解析成实际模型名。
 */
function resolveRequestedModel(model) {
  return parseUserSpecifiedModel(model ?? getDefaultMainLoopModelSetting());
}
//@ chunk-d1cgs5na.js:12887-13152 placement (2.1.88 match: useMainLoopModel, 0.833)
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
        useMainLoopModel_3({
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
//@ chunk-d1cgs5na.js:13152-13461 fingerprint (2.1.88 match: ShowModelAndClose, 0.354)
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
//@ chunk-18hwfzwa.js:929434-929487 fingerprint (2.1.88 match: _temp2, 1)
function selectMainLoopModelForSession_2(s_0) {
  return s_0.mainLoopModelForSession;
}
//@ chunk-mvhmq2z8.js:16272-16276 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mvhmq2z8.js:16272", () => {
  init_react_production();
});
//@ chunk-mvhmq2z8.js:16276-16347 sole-consumer
function isRemoteModelListEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harp_pedal", true) !== false;
  } catch {
    return true;
  }
}
//@ chunk-mvhmq2z8.js:16347-16373 sole-consumer
var REMOTE_MODEL_LIST_CACHE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mvhmq2z8.js:16347", () => {
  REMOTE_MODEL_LIST_CACHE = new HostScoped(() => new Map());
});
//@ chunk-mvhmq2z8.js:16373-16437 sole-consumer
function pluginOptionsTargets({ models }) {
  return models.map(findPluginOptionsTarget).filter((target) => target !== null);
}
//@ chunk-mvhmq2z8.js:16437-16550 sole-consumer
function cachedRemoteModelListWithDefault(cache, sessionId) {
  if (sessionId === undefined || !isRemoteModelListEnabled()) return null;
  let entry = cache.get(sessionId);
  return entry?.rows.some((row) => row.value === null) ? entry : null;
}
//@ chunk-mvhmq2z8.js:16550-16594 sole-consumer
function cacheRemoteModelList(cache, sessionId, entry) {
  if (sessionId !== undefined) cache.set(sessionId, entry);
}
//@ chunk-mvhmq2z8.js:16594-16746 sole-consumer
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
//@ chunk-mvhmq2z8.js:16746-17121 sole-consumer
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
//@ chunk-mvhmq2z8.js:17121-17149 affinity
function cloudModelRefusal(model, setAppState, storageV5) {
  return "";
}
//@ chunk-mvhmq2z8.js:17149-17189 callgraph-fingerprint (2.1.88 match: _temp, 1)
function selectMainLoopModel(s) {
  return s.mainLoopModel;
}
//@ chunk-mvhmq2z8.js:17189-17228 layout
function isUltracodeConfirmable() {
  return getRemoteCaps() !== null && isRemoteControlChannelAvailable();
}
//@ chunk-mvhmq2z8.js:17228-17273 layout
function textNotRefusal(text) {
  return {
    text,
    isRefusal: false,
  };
}
//@ chunk-mvhmq2z8.js:17273-17311 file-local
function selectMainLoopModelForFastMode(s) {
  return s.mainLoopModel;
}
//@ chunk-mvhmq2z8.js:17311-17359 layout (2.1.88 match: _temp2, 1)
function selectMainLoopModelForSession(s_0) {
  return s_0.mainLoopModelForSession;
}
//@ chunk-mvhmq2z8.js:17359-17397 layout
function selectSessionEffort(state) {
  return state.sessionEffort;
}
//@ chunk-mvhmq2z8.js:17397-17441 layout
function selectSettingsEffortTable(settings) {
  return settings.settingsEffortTable;
}
//@ chunk-mvhmq2z8.js:17441-17524 layout
function validateEffortChange(change) {
  let refusal = noEffortRefusal(change);
  if (refusal !== null)
    return {
      kind: "refuse",
      message: refusal,
    };
  return null;
}
//@ chunk-mvhmq2z8.js:17524-17551 layout
function noEffortRefusal(change) {
  return null;
}
//@ chunk-mvhmq2z8.js:17551-18016 layout
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
//@ chunk-mvhmq2z8.js:18016-18177 file-local
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
//@ chunk-mvhmq2z8.js:18177-18259 layout
var CLOUD_MODEL_PICKER_SUBTITLE = "Models reported by the cloud session. Your pick applies to that session.";
//@ chunk-mvhmq2z8.js:18259-18353 layout
function keptModelMessage(message) {
  return message === null
    ? "Kept the workspace\u2019s current model"
    : `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(message))}`;
}
//@ chunk-mvhmq2z8.js:18353-18475 layout
var MODEL_KEPT_MESSAGE =
  "Kept the model (nothing was sent) \u2014 to change it, run /model again or pass a model name, e.g. /model sonnet";
//@ chunk-mvhmq2z8.js:18475-23406 layout
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
//@ chunk-mvhmq2z8.js:23406-24820 layout
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
//@ chunk-mvhmq2z8.js:24820-26826 fingerprint (2.1.88 match: ModelPickerWrapper, 0.322)
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
//@ chunk-mvhmq2z8.js:26826-33595 layout
function SetModelFromArgs(props) {
  let $ = useMemoCache(72);
  let { args, getMessages, onDone, storageV5, credentials, session } = props;
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let { addNotification } = useNotifications();
  let [confirmPicker, setConfirmPicker] = useState(null);
  let notifications;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    notifications = [];
    $[0] = notifications;
  } else notifications = $[0];
  let notificationsRef = useRef(notifications);
  let [switching, setSwitching] = useState(false);
  let abortControllerRef = useRef(null);
  let [ladderRequest, setLadderRequest] = useState(null);
  let [ultracodeConfirmable] = useState(isUltracodeConfirmable);
  let cancelledRef = useRef(false);
  let pendingLadderRef = useRef(false);
  let ladderTickRef = useRef(0);
  let creditNoticeRef = useRef(null);
  let failedRef = useRef(false);
  let applyModel;
  if (
    $[1] !== addNotification ||
    $[2] !== onDone ||
    $[3] !== session ||
    $[4] !== setAppState ||
    $[5] !== storageV5 ||
    $[6] !== appStoreDirect
  ) {
    applyModel = (model, effort) => {
      let notRemote = !isRemoteSessionAvailable();
      setConfirmPicker(null);
      let failed = false;
      let persistSwitch = () => {
        let savePromise = saveModelSwitch(
          session,
          model,
          () => appStoreDirect.getState(),
          setAppState,
          notRemote,
          "command",
          effort,
          storageV5,
          (outcome) => {
            failed = outcome?.kind === "failed";
          },
        );
        let cloudRefusal = cloudModelRefusal(undefined, setAppState, storageV5);
        if (effort !== undefined && model !== null)
          addNotification({
            key: `model-restricted-${model}`,
            kind: "warning",
            text: formatModelRestrictedNotice(effort, model),
            priority: "immediate",
          });
        notifyModelDeprecation(model, addNotification);
        return savePromise.then((prefix) => prefix + cloudRefusal);
      };
      let modelAtStart = effectiveModelForContext(appStoreDirect.getState());
      let switchPromise = notRemote
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
              persistSwitch().then((text) =>
                failed
                  ? {
                      unsaved: text,
                    }
                  : text,
              ),
            {
              persistsOffBox: () => isBridgeOrTransport(session),
              hasModelMoved: () => effectiveModelForContext(appStoreDirect.getState()) !== modelAtStart,
            },
          )
        : persistSwitch().then(textNotRefusal);
      let heldMessages = notificationsRef.current;
      notificationsRef.current = [];
      switchPromise.then(
        (result) => {
          let { text, isRefusal, rewrittenTo } = result;
          return isRefusal
            ? onDone(text, {
                display: "system",
              })
            : onDone(
                heldMessages.length > 0 && rewrittenTo === undefined
                  ? `${text}
${heldMessages.map(sanitizeHookText).join(`
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
  let applyModelDirect = applyModel;
  let applySubstituted;
  if ($[8] !== applyModelDirect || $[9] !== getMessages || $[10] !== appStoreDirect) {
    applySubstituted = (model, substitutedFrom, skipConfirm) => {
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
        setConfirmPicker({
          model,
          substitutedFrom,
          vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
        });
        return;
      }
      applyModelDirect(model, substitutedFrom);
    };
    $[8] = applyModelDirect;
    $[9] = getMessages;
    $[10] = appStoreDirect;
    $[11] = applySubstituted;
  } else applySubstituted = $[11];
  let applyWithHooks = applySubstituted;
  let requestSwitch;
  if ($[12] !== applyWithHooks || $[13] !== onDone || $[14] !== session || $[15] !== appStoreDirect) {
    requestSwitch = (model, substitutedFrom) => {
      let abortController = new AbortController();
      abortControllerRef.current = abortController;
      setSwitching(true);
      serializeModelSwitch(session, () =>
        runPreModelSwitchHooks(session, appStoreDirect.getState, model, "command", {
          signal: abortController.signal,
        }),
      )
        .then((decision) => {
          setSwitching(false);
          if (abortController.signal.aborted) {
            return;
          }
          notificationsRef.current = decision.messages;
          if (decision.decision === "block") {
            logFeatureSad("model_switch", "blocked_by_hook");
            onDone(preModelSwitchBlockedMessage(model, decision.reason, decision.messages), {
              display: "system",
            });
            return;
          }
          if (decision.decision === "ask") {
            setConfirmPicker({
              model,
              substitutedFrom,
              hookReason: decision.reason ?? "Confirm switching the model",
              vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
            });
            return;
          }
          applyWithHooks(model, substitutedFrom, decision.skipConfirm);
        })
        .catch((error) => {
          setSwitching(false);
          if (abortController.signal.aborted) {
            return;
          }
          logError(toError(error));
          onDone(`Model switch failed: ${sanitizeHookText(errorMessage(error))}`, {
            display: "system",
          });
        });
    };
    $[12] = applyWithHooks;
    $[13] = onDone;
    $[14] = session;
    $[15] = appStoreDirect;
    $[16] = requestSwitch;
  } else requestSwitch = $[16];
  let applyCommand = requestSwitch;
  let runCommand;
  if (
    $[17] !== addNotification ||
    $[18] !== args ||
    $[19] !== credentials ||
    $[20] !== onDone ||
    $[21] !== applyCommand ||
    $[22] !== session ||
    $[23] !== setAppState ||
    $[24] !== storageV5
  ) {
    runCommand = () => {
      let sessionId = getRemoteCaps();
      if (sessionId && isRemoteControlChannelAvailable()) {
        switchMainLoopModelSafe(args, storageV5, credentials).then((outcome) => {
          if (cancelledRef.current) {
            return;
          }
          if (!outcome.ok) {
            failedRef.current = true;
            onDone(outcome.message, {
              display: "system",
            });
            return;
          }
          if (outcome.model !== null && hasLadderForSetting(outcome.model)) {
            logFeatureSad("model_fable_consent", "remote_thin_client_blocked");
            failedRef.current = true;
            onDone(
              `${renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(outcome.model))} uses usage credits, and this cloud session can\u2019t show the consent prompt yet \xB7 switch models from the workspace, or consent once in a local session first`,
              {
                display: "system",
              },
            );
            return;
          }
          let model = outcome.model;
          return sessionId
            .sendControlRequest({
              subtype: "set_model",
              model: model ?? undefined,
            })
            .then(() => {
              let turnedOff = false;
              setAppState((prev) => {
                turnedOff = isFastModeEnabled() && !!prev.fastMode && !isFastModeActive(model, prev.fastMode);
                recordSwitchIfChanged(session, prev, model, "command");
                return {
                  ...prev,
                  mainLoopModel: model,
                  mainLoopModelForSession: null,
                  ...(turnedOff && {
                    fastMode: false,
                  }),
                };
              });
              if (turnedOff) reportFastModeToggle(true, false);
              refreshRemoteModelList(REMOTE_MODEL_LIST_CACHE.of(session.host), sessionId, "switch");
              if (cancelledRef.current) {
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
              if (outcome.substitutedFrom !== undefined && model !== null)
                addNotification({
                  key: `model-restricted-${model}`,
                  kind: "warning",
                  text: formatModelRestrictedNotice(outcome.substitutedFrom, model),
                  priority: "immediate",
                });
              if (outcome.substitutedFrom !== undefined)
                logFeatureSad("model_switch", "family_alias_stepped_down");
              else logFeatureOk("model_switch");
              failedRef.current = true;
              onDone(
                model === null
                  ? "Reset model to the workspace default"
                  : `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(model))}`,
              );
            })
            .catch((error) => {
              logForDebugging(`[remote] set_model rejected: ${errorMessage(error)}`);
              if (cancelledRef.current) {
                return;
              }
              let isTimeout = error instanceof ControlRequestTimeoutError;
              logFeatureBad("model_switch", isTimeout ? "timeout" : "remote_rejected");
              failedRef.current = true;
              onDone(
                isTimeout
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
      }).then((localOutcome) => {
        if (!localOutcome.ok) {
          onDone(localOutcome.message, {
            display: "system",
          });
          return;
        }
        if (ladderForDefaultModel(localOutcome.model)) {
          pendingLadderRef.current = false;
          ladderTickRef.current = ladderTickRef.current + 1;
          setLadderRequest({
            model: localOutcome.model,
            substitutedFrom: localOutcome.substitutedFrom,
          });
          return;
        }
        if (localOutcome.creditsRefusal !== undefined) {
          onDone(localOutcome.creditsRefusal, {
            display: "system",
          });
          return;
        }
        applyCommand(localOutcome.model, localOutcome.substitutedFrom);
      });
    };
    $[17] = addNotification;
    $[18] = args;
    $[19] = credentials;
    $[20] = onDone;
    $[21] = applyCommand;
    $[22] = session;
    $[23] = setAppState;
    $[24] = storageV5;
    $[25] = runCommand;
  } else runCommand = $[25];
  let footer;
  if (
    $[26] !== args ||
    $[27] !== credentials ||
    $[28] !== onDone ||
    $[29] !== applyCommand ||
    $[30] !== setAppState ||
    $[31] !== storageV5
  ) {
    footer = [args, onDone, setAppState, applyCommand, storageV5, credentials];
    $[26] = args;
    $[27] = credentials;
    $[28] = onDone;
    $[29] = applyCommand;
    $[30] = setAppState;
    $[31] = storageV5;
    $[32] = footer;
  } else footer = $[32];
  useEffect(runCommand, footer);
  if (ultracodeConfirmable) {
    const message = `Switching the cloud session to ${args}\u2026`;
    let onCancel;
    if ($[33] !== args || $[34] !== onDone) {
      onCancel = () => {
        if (failedRef.current) {
          return;
        }
        failedRef.current = true;
        cancelledRef.current = true;
        logFeatureSad("model_switch", "remote_wait_cancelled");
        onDone(
          `Stopped waiting for the cloud session \u2014 you\u2019ll get a notice if the switch to ${args} still lands`,
          {
            display: "system",
          },
        );
      };
      $[33] = args;
      $[34] = onDone;
      $[35] = onCancel;
    } else onCancel = $[35];
    let promptDialog;
    if ($[36] !== message || $[37] !== onCancel) {
      promptDialog = jsxProd_default(PromptDialog, {
        message,
        onCancel,
      });
      $[36] = message;
      $[37] = onCancel;
      $[38] = promptDialog;
    } else promptDialog = $[38];
    return promptDialog;
  }
  if (ladderRequest) {
    let { model, substitutedFrom } = ladderRequest;
    let ConsentComponent;
    let ladderTick;
    let parsedModel;
    let variant;
    let modelName;
    if ($[39] !== model) {
      parsedModel = parseUserSpecifiedModel(model ?? getDefaultMainLoopModelSetting());
      ladderTick = ladderTickRef.current;
      ConsentComponent = FableUsageCreditsConsent;
      variant = "picker";
      modelName = renderUsageCreditsOnlyModelName(parsedModel);
      $[39] = model;
      $[40] = ConsentComponent;
      $[41] = ladderTick;
      $[42] = parsedModel;
      $[43] = variant;
      $[44] = modelName;
    } else {
      ConsentComponent = $[40];
      ladderTick = $[41];
      parsedModel = $[42];
      variant = $[43];
      modelName = $[44];
    }
    let onDone_2;
    if (
      $[45] !== model ||
      $[46] !== onDone ||
      $[47] !== applyCommand ||
      $[48] !== appStoreDirect ||
      $[49] !== substitutedFrom
    ) {
      onDone_2 = (outcome, extra) => {
        if (ladderTick !== ladderTickRef.current) {
          return false;
        }
        if (pendingLadderRef.current) {
          return false;
        }
        pendingLadderRef.current = true;
        setLadderRequest(null);
        if (outcome === "consent") {
          applyCommand(model, substitutedFrom);
          return;
        }
        if (outcome === "upgrade") {
          onDone(undefined, {
            display: "skip",
            nextInput: "/upgrade",
            submitNextInput: true,
          });
          return;
        }
        onDone(
          extra ??
            `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(useMainLoopModel_3(appStoreDirect.getState())))}`,
          {
            display: "system",
          },
        );
      };
      $[45] = model;
      $[46] = onDone;
      $[47] = applyCommand;
      $[48] = appStoreDirect;
      $[49] = substitutedFrom;
      $[50] = onDone_2;
    } else onDone_2 = $[50];
    let consentElement;
    if (
      $[51] !== ConsentComponent ||
      $[52] !== parsedModel ||
      $[53] !== variant ||
      $[54] !== modelName ||
      $[55] !== onDone_2
    ) {
      consentElement = jsxProd_default(ConsentComponent, {
        variant,
        modelName,
        model: parsedModel,
        onDone: onDone_2,
      });
      $[51] = ConsentComponent;
      $[52] = parsedModel;
      $[53] = variant;
      $[54] = modelName;
      $[55] = onDone_2;
      $[56] = consentElement;
    } else consentElement = $[56];
    return consentElement;
  }
  if (confirmPicker) {
    let onConfirm;
    if (
      $[57] !== applyModelDirect ||
      $[58] !== onDone ||
      $[59] !== confirmPicker ||
      $[60] !== appStoreDirect
    ) {
      onConfirm = () => {
        if (creditNoticeRef.current === confirmPicker) {
          return;
        }
        creditNoticeRef.current = confirmPicker;
        if (
          confirmPicker.vettedFrom !== undefined &&
          effectiveModelForContext(appStoreDirect.getState()) !== confirmPicker.vettedFrom
        ) {
          onDone("The model changed while you were confirming; pick again", {
            display: "system",
          });
          return;
        }
        applyModelDirect(confirmPicker.model, confirmPicker.substitutedFrom);
      };
      $[57] = applyModelDirect;
      $[58] = onDone;
      $[59] = confirmPicker;
      $[60] = appStoreDirect;
      $[61] = onConfirm;
    } else onConfirm = $[61];
    let onCancel;
    if ($[62] !== onDone || $[63] !== appStoreDirect) {
      onCancel = () =>
        onDone(
          `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(useMainLoopModel_3(appStoreDirect.getState())))}`,
          {
            display: "system",
          },
        );
      $[62] = onDone;
      $[63] = appStoreDirect;
      $[64] = onCancel;
    } else onCancel = $[64];
    let content;
    if (
      $[65] !== confirmPicker.hookReason ||
      $[66] !== confirmPicker.model ||
      $[67] !== onConfirm ||
      $[68] !== onCancel
    ) {
      content = jsxProd_default(ModelEffortSwitchConfirm, {
        kind: "model",
        model: confirmPicker.model,
        effort: undefined,
        hookReason: confirmPicker.hookReason,
        onConfirm,
        onCancel,
      });
      $[65] = confirmPicker.hookReason;
      $[66] = confirmPicker.model;
      $[67] = onConfirm;
      $[68] = onCancel;
      $[69] = content;
    } else content = $[69];
    return content;
  }
  if (switching) {
    let footer;
    if ($[70] !== onDone) {
      footer = jsxProd_default(PromptDialog, {
        message: "Running PreModelSwitch hooks\u2026",
        onCancel: () => {
          abortControllerRef.current?.abort();
          setSwitching(false);
          onDone("Model switch cancelled", {
            display: "system",
          });
        },
      });
      $[70] = onDone;
      $[71] = footer;
    } else footer = $[71];
    return footer;
  }
  return null;
}
//@ chunk-mvhmq2z8.js:33595-33776 layout
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
//@ chunk-mvhmq2z8.js:33776-33941 callgraph-fingerprint (2.1.88 match: SetModelAndClose, 0.23)
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
//@ chunk-mvhmq2z8.js:33941-34964 fingerprint (2.1.88 match: call, 0.691)
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
    return jsxProd_default(SetModelFromArgs, {
      args,
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
  ShowModelAndClose,
  selectMainLoopModelForSession_2,
  resolveRequestedModel,
  renderModelLabel,
  diagnose1mAliasSwitch,
  isOpus1mUnavailable,
  requires1mEntitlementCheck,
  call,
};
