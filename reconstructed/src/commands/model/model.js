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
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { findPluginOptionsTarget } from "../plugin/PluginOptionsFlow.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
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
import { strip1mSuffix, stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import {
  KEPT_MODEL_PREFIX,
  toInlineCode,
  SET_MODEL_PREFIX,
  SAVED_AS_DEFAULT_SUFFIX,
  CLOUD_SWITCH_NO_RESPONSE_PREFIX,
  CLOUD_SWITCH_FAILED_PREFIX,
  CURRENT_MODEL_PREFIX,
} from "./modelMessages.js";
import { useAppStoreDirect, useAppState, useSetAppState } from "../../state/AppState.js";
import { useMainLoopModelSetting } from "../../hooks/useMainLoopModel.js";
import { useFastModeOnForModel } from "../../hooks/usePromptSuggestion.js";
import { useNotifications } from "../../context/notifications.js";
import { getModelOptionsWithTelemetry, LEGACY_SONNET_MODELS } from "../../utils/model/modelOptions.js";
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
import {
  getDefaultMainLoopModelSetting,
  isModeDependentModelSetting,
  planModeConstituentFamily,
} from "../../utils/model/planModeModel.js";
import { ladderForDefaultModel, hasLadderForSetting } from "../../utils/model/modelUnavailability.js";
import {
  serializeModelSwitch,
  effectiveModelForContext,
  recordSwitchIfChanged,
  useMainLoopModel as useMainLoopModel_3,
  getModelSwitchTarget,
} from "../../utils/model/modelSwitchHooks.js";
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
import {
  resolveEffortLevel,
  persistEffortSetting,
  levelEffortSetting,
  toPersistableEffort,
} from "../../utils/effort.js";
import { savedModelPickReply } from "../config/configShorthand.js";
import { isBridgeOrTransport } from "../../cli/transportState.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import {
  clearRefusalFallbackModelLatch,
  getTotalOutputTokens,
  getServedModelsForRequestedModel,
} from "../../bootstrap/state.js";
import { formatFastModeSuffix } from "../fast/fast.js";
import {
  parseUserSpecifiedModel,
  renderUsageCreditsOnlyModelName,
  renderDefaultModelSetting as renderDefaultModelSetting_2,
  isOpus1mMergeEnabled,
} from "../../utils/model/modelDisplay.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FableUsageCreditsConsent } from "../../components/usageCredits/FableUsageCreditsConsent.js";
import { PromptDialog } from "../../components/hooks/PromptDialog.js";
import { ModelEffortSwitchConfirm } from "../../components/ModelEffortSwitchConfirm.js";
import { ModelPicker } from "../../components/ModelPicker.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { formatModelRestrictedNotice, isAliasSpelling } from "../../utils/model/validateModel.js";
import { logForDebugging } from "../../utils/debug.js";
import { getDeprecationStatusLine } from "../../utils/model/deprecation.js";
import { isCommonInfoArg } from "../../types/logs.js";
import { COMMON_HELP_ARGS } from "../../constants/xml.js";
import { shortHash } from "../../utils/shortHash.js";
import { is1mContextDisabled, modelHasNative1MContext } from "../../utils/model/contextWindow1m.js";
import { renderDefaultModelSetting } from "../../utils/model/model.js";
import { isKnownNon1mTarget } from "../../utils/model/defaultModel.js";
import {
  shouldProbeThirdPartyDefaults,
  shouldProbeThirdPartyDefaultsAlt,
} from "../../utils/model/thirdPartyModelDefaults.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getActiveModelFallback, describeAutoSwitchedModel } from "../../services/api/safeguardMessages.js";

//@ chunk-mvhmq2z8.js:16272-16276 sole-consumer
init_react_production();
//@ chunk-mvhmq2z8.js:16276-16347 sole-consumer
function isRemoteModelListEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harp_pedal", true) !== false;
  } catch {
    return true;
  }
}
//@ chunk-mvhmq2z8.js:16347-16373 sole-consumer
var REMOTE_MODEL_LIST_CACHE = new HostScoped(() => new Map());
//@ chunk-mvhmq2z8.js:16373-16437 sole-consumer
function pluginOptionsTargets({ models }) {
  return models.map(findPluginOptionsTarget).filter((o) => o !== null);
}
//@ chunk-mvhmq2z8.js:16437-16550 sole-consumer
function cachedRemoteModelListWithDefault(r, sessionId) {
  if (sessionId === undefined || !isRemoteModelListEnabled()) return null;
  let i = r.get(sessionId);
  return i?.rows.some((n) => n.value === null) ? i : null;
}
//@ chunk-mvhmq2z8.js:16550-16594 sole-consumer
function cacheRemoteModelList(r, o, i) {
  if (o !== undefined) r.set(o, i);
}
//@ chunk-mvhmq2z8.js:16594-16746 sole-consumer
function refreshRemoteModelList(r, o, i) {
  if (o.sessionId === undefined || !isRemoteModelListEnabled()) return Promise.resolve(null);
  return trackRemoteModelListRefresh(
    r,
    o.sessionId,
    i,
    o.sendControlRequest({
      subtype: "list_models",
    }),
  );
}
//@ chunk-mvhmq2z8.js:16746-17121 sole-consumer
/**
 * 发出 list_models 控制请求后的处理：成功时记录与上次结果是否相同并缓存行；失败时记遥测，若缓存未被替换则删除该会话的缓存，返回 null。
 */
function trackRemoteModelListRefresh(r, sessionId, i, n) {
  let C = r.get(sessionId);
  return n.then(pluginOptionsTargets).then(
    (h) => {
      let p = r.get(sessionId);
      logFeatureOk("remote_model_list_refresh", {
        trigger: fromEnum(i),
        ...(p === undefined
          ? {
              last_answer: lit("none"),
            }
          : {
              last_answer: lit(En(p.rows, h) ? "same" : "differed"),
              last_trigger: fromEnum(p.trigger),
            }),
      });
      cacheRemoteModelList(r, sessionId, {
        rows: h,
        trigger: i,
      });
      return h;
    },
    (error) => {
      logFeatureSad("remote_model_list_refresh", classifyControlRequestError(error), {
        trigger: fromEnum(i),
      });
      if (r.get(sessionId) === C) r.delete(sessionId);
      return null;
    },
  );
}
//@ chunk-mvhmq2z8.js:17121-17149 affinity
function cloudModelRefusal(r, setAppState, storageV5) {
  return "";
}
//@ chunk-mvhmq2z8.js:17149-17189 callgraph-fingerprint = _temp (1)
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
//@ chunk-mvhmq2z8.js:17311-17359 layout = _temp2 (1)
function selectMainLoopModelForSession(s_0) {
  return s_0.mainLoopModelForSession;
}
//@ chunk-mvhmq2z8.js:17359-17397 layout
function selectSessionEffort(A) {
  return A.sessionEffort;
}
//@ chunk-mvhmq2z8.js:17397-17441 layout
function selectSettingsEffortTable(T) {
  return T.settingsEffortTable;
}
//@ chunk-mvhmq2z8.js:17441-17524 layout
function validateEffortChange(r) {
  let o = noEffortRefusal(r);
  if (o !== null)
    return {
      kind: "refuse",
      message: o,
    };
  return null;
}
//@ chunk-mvhmq2z8.js:17524-17551 layout
function noEffortRefusal(r) {
  return null;
}
//@ chunk-mvhmq2z8.js:17551-18016 layout
/**
 * CLOUD_MODEL_LIST_TIMEOUT_MS：15000。
 */
var CLOUD_MODEL_PICKER_UNAVAILABLE =
  "Model picker shows local options in cloud sessions \u2014 pass a model name, e.g. /model sonnet";
var CLOUD_MODEL_LIST_FAILED =
  "Couldn\u2019t load the model list from the cloud session \u2014 pass a model name, e.g. /model sonnet";
var CLOUD_MODEL_LIST_TIMEOUT =
  "Stopped waiting for the cloud session\u2019s model list \u2014 run /model again, or pass a model name, e.g. /model sonnet";
var CLOUD_MODEL_LIST_TIMEOUT_MS = 15000;
var isAliasModel = (r) => strip1mSuffix(r) !== r;
var longestModelValue = (r) =>
  r.reduce((acc, i) => (acc === null || (i.value?.length ?? 0) > (acc.value?.length ?? 0) ? i : acc), null)
    ?.value ?? null;
//@ chunk-mvhmq2z8.js:18016-18177 file-local
function isKnownAlias(rows, mainLoopModel) {
  let found = rows.find((n) => n.value === mainLoopModel);
  return found
    ? found.value
    : longestModelValue(
        mainLoopModel === null
          ? []
          : rows.filter(
              (n) =>
                n.value !== null &&
                strip1mSuffix(mainLoopModel).includes(strip1mSuffix(n.value)) &&
                isAliasModel(mainLoopModel) === isAliasModel(n.value),
            ),
      );
}
//@ chunk-mvhmq2z8.js:18177-18259 layout
var CLOUD_MODEL_PICKER_SUBTITLE = "Models reported by the cloud session. Your pick applies to that session.";
//@ chunk-mvhmq2z8.js:18259-18353 layout
function keptModelMessage(r) {
  return r === null
    ? "Kept the workspace\u2019s current model"
    : `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(r))}`;
}
//@ chunk-mvhmq2z8.js:18353-18475 layout
var MODEL_KEPT_MESSAGE =
  "Kept the model (nothing was sent) \u2014 to change it, run /model again or pass a model name, e.g. /model sonnet";
//@ chunk-mvhmq2z8.js:18475-23406 layout
function LocalModelPicker({ getMessages, onDone, storageV5, session, onQueryEvent }) {
  let appStoreDirect = useAppStoreDirect();
  let p = useAppState((s) => s.mainLoopModel);
  let sessionModel = useAppState((s) => s.mainLoopModelForSession);
  let A = useMainLoopModelSetting() ?? p;
  let T = useAppState((s) => s.fastMode);
  let fastModeOnForModel = useFastModeOnForModel(T, A);
  let setAppState = useSetAppState();
  let { addNotification } = useNotifications();
  let [E] = y(() => {
    return;
  });
  let [ie] = y(() =>
    E !== undefined ? getModelOptionsWithTelemetry(isFastModeEnabled() && !!T, E) : undefined,
  );
  let L = R(undefined);
  let Q = (s) => s;
  let [_, q] = y(null);
  let messagesRef = R([]);
  let [Ee, z] = y(null);
  let [ne, ge] = y(null);
  let Se = R(false);
  let de = R(0);
  let Ce = R(null);
  let U = R(null);
  let se = R(false);
  let De = R(false);
  let Pe = R(0);
  let [xt, Le] = y(false);
  let abortControllerRef = R(null);
  let [$t, We] = y(false);
  let ot = R(null);
  function handleCancel() {
    logEvent("tengu_model_command_menu", {
      action: lit("cancel"),
    });
    let displayModel = renderModelLabel(A);
    onDone(ee(`${KEPT_MODEL_PREFIX}${toInlineCode(displayModel)}`), {
      display: "system",
    });
  }
  function st(s, M, I = false) {
    let Y = validateEffortChange(s);
    if (Y?.kind === "refuse") {
      onDone(Y.message, {
        display: "system",
      });
      return;
    }
    if (Y?.kind === "confirm") {
      Se.current = false;
      de.current += 1;
      ge({
        model: s,
        effort: M,
      });
      return;
    }
    let k = s === null ? managedDenyStartupRefusal(getDefaultMainLoopModelSetting(), "switch") : null;
    if (k !== null) {
      logFeatureBad("model_switch", "denied_by_managed_settings");
      onDone(ee(k), {
        display: "system",
      });
      return;
    }
    if (!I && ladderForDefaultModel(s)) {
      De.current = false;
      Pe.current += 1;
      z({
        model: s,
        effort: M,
      });
      return;
    }
    let V = se.current;
    se.current = false;
    let abortController = new AbortController();
    abortControllerRef.current = abortController;
    Le(true);
    serializeModelSwitch(session, () =>
      runPreModelSwitchHooks(session, appStoreDirect.getState, s, "picker", {
        signal: abortController.signal,
      }),
    )
      .then((B) => {
        Le(false);
        if (abortController.signal.aborted) return;
        messagesRef.current = B.messages;
        if (B.decision === "block") {
          logFeatureSad("model_switch", "blocked_by_hook");
          onDone(ee(preModelSwitchBlockedMessage(s, B.reason, B.messages)), {
            display: "system",
          });
          return;
        }
        if (B.decision === "ask") {
          q({
            model: s,
            pick: M,
            kind: "model",
            hookReason: B.reason ?? "Confirm switching the model",
            vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
            saveAsDefault: V,
          });
          return;
        }
        return Te(s, M, B.skipConfirm, V);
      })
      .catch((error) => {
        Le(false);
        if (abortController.signal.aborted) return;
        Ke(error);
      });
  }
  function Ke(error) {
    logError(toError(error));
    onDone(ee(`Model switch failed: ${sanitizeHookText(errorMessage(error))}`), {
      display: "system",
    });
  }
  async function Te(s, M, skipConfirm, Y) {
    let state = appStoreDirect.getState();
    if (
      !skipConfirm &&
      useMainLoopModel(
        s,
        state.mainLoopModel,
        state.mainLoopModelForSession,
        state.cacheMissAckedAtOutputTokens,
        lastMainThreadResponse(getMessages()),
      )
    ) {
      q({
        model: s,
        pick: M,
        kind: "model",
        vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
        saveAsDefault: Y,
      });
      return;
    }
    if (
      M !== undefined &&
      shouldShowEffortNotice({
        target: M,
        current: resolveEffortLevel(state),
        model: resolveRequestedModel(s),
        permissionMode: state.toolPermissionContext.mode,
        messages: getMessages(),
        ackedAtOutputTokens: state.cacheMissAckedAtOutputTokens,
        promptCacheMayBeWarm: isMainThreadSource(getMessages()),
        setting: s,
      })
    ) {
      q({
        model: s,
        pick: M,
        kind: "effort",
        vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
        saveAsDefault: Y,
      });
      return;
    }
    await Ne(s, M, Y);
  }
  async function Ne(s, M, I) {
    We(true);
    let Y = effectiveModelForContext(appStoreDirect.getState());
    let k;
    try {
      k = I
        ? await savedModelPickReply(
            s,
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
              rt(s, M, true).then((V) =>
                V.hasDefaultSaveFailed
                  ? {
                      unsaved: V.message,
                    }
                  : V.message,
              ),
            {
              persistsOffBox: () => isBridgeOrTransport(session),
              hasModelMoved: () => effectiveModelForContext(appStoreDirect.getState()) !== Y,
            },
          )
        : {
            text: (await rt(s, M, false)).message,
            isRefusal: false,
          };
    } finally {
      We(false);
    }
    if (k.isRefusal) {
      messagesRef.current = [];
      onDone(ee(k.text), {
        display: "system",
      });
      return;
    }
    if (k.rewrittenTo !== undefined) {
      messagesRef.current = [];
      U.current = null;
    }
    onDone(ee(k.text));
  }
  async function rt(s, M, I) {
    U.current = null;
    logEvent("tengu_model_command_menu", {
      action: telemetrySafeModelName(s),
      from_model: telemetrySafeModelName(p),
      to_model: telemetrySafeModelName(s),
    });
    let Y = I && M !== L.current?.effort;
    if (M !== undefined) persistEffortSetting(M, resolveRequestedModel(s), Y, storageV5);
    clearRefusalFallbackModelLatch();
    let k = false;
    let V = false;
    if (isFastModeEnabled()) clearFastModeCooldown();
    recordSwitchIfChanged(session, appStoreDirect.getState(), s, "picker");
    setAppState((re) => {
      k = !!re.fastMode;
      V = isFastModeEnabled() ? isFastModeActive(s, re.fastMode) : k;
      return {
        ...re,
        mainLoopModel: s,
        mainLoopModelForSession: null,
        ...(M !== undefined && {
          sessionEffort: levelEffortSetting(M),
        }),
        ...(V !== k && {
          fastMode: V,
        }),
      };
    });
    reportFastModeToggle(k, V);
    let J = cloudModelRefusal(L.current, setAppState, storageV5);
    logFeatureOk("model_switch");
    notifyModelDeprecation(s, addNotification);
    let B = I ? await setDefaultModel(s, storageV5) : null;
    let xe = B?.kind === "saved";
    let te = `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(s))}${xe ? SAVED_AS_DEFAULT_SUFFIX : " for this session only"}`;
    if (M !== undefined)
      te +=
        xe && (!Y || toPersistableEffort(M) === undefined)
          ? ` \xB7 ${toInlineCode(M)} effort for this session only`
          : ` with ${toInlineCode(M)} effort`;
    te += J;
    te += formatFastModeSuffix(k, V, s, {
      announceKeptOn: true,
    });
    te += describeDefaultSaved(B);
    if (xe) te += anthropicModelEnvNotice(s) || findModelSettingSource(s);
    if (messagesRef.current.length > 0) {
      te += `
${messagesRef.current.map(sanitizeHookText).join(`
`)}`;
      messagesRef.current = [];
    }
    return {
      message: te,
      hasDefaultSaveFailed: B?.kind === "failed",
    };
  }
  function ee(text) {
    let M = U.current;
    U.current = null;
    M?.();
    let I = Ce.current;
    Ce.current = null;
    return I === null ? text : text + I;
  }
  if (Ee) {
    let { model, effort } = Ee;
    let userSpecifiedModel = parseUserSpecifiedModel(model ?? getDefaultMainLoopModelSetting());
    let Y = Pe.current;
    return jsxProd_default(FableUsageCreditsConsent, {
      variant: "picker",
      modelName: renderUsageCreditsOnlyModelName(userSpecifiedModel),
      model: userSpecifiedModel,
      onDone: (k, V) => {
        if (Y !== Pe.current) return false;
        if (De.current) return false;
        De.current = true;
        z(null);
        if (k === "consent") {
          st(model, effort, true);
          return;
        }
        se.current = false;
        if (k === "upgrade") {
          let trimmed = ee("").trim();
          onDone(trimmed === "" ? undefined : trimmed, {
            display: trimmed === "" ? "skip" : "system",
            nextInput: "/upgrade",
            submitNextInput: true,
          });
          return;
        }
        onDone(ee(V ?? `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(A))}`), {
          display: "system",
        });
      },
    });
  }
  if ($t) return null;
  if (xt)
    return jsxProd_default(PromptDialog, {
      message: "Running PreModelSwitch hooks\u2026",
      onCancel: () => {
        abortControllerRef.current?.abort();
        Le(false);
        onDone(ee("Model switch cancelled"), {
          display: "system",
        });
      },
    });
  if (_)
    return jsxProd_default(ModelEffortSwitchConfirm, {
      kind: _.kind,
      model: _.model,
      effort: _.pick,
      hookReason: _.hookReason,
      onConfirm: () => {
        if (ot.current === _) return;
        ot.current = _;
        if (
          _.vettedFrom !== undefined &&
          effectiveModelForContext(appStoreDirect.getState()) !== _.vettedFrom
        ) {
          q(null);
          onDone(ee("The model changed while you were confirming; pick again"), {
            display: "system",
          });
          return;
        }
        Ne(_.model, _.pick, _.saveAsDefault).catch(Ke);
      },
      onCancel: () => {
        q(null);
        se.current = false;
      },
    });
  return jsxProd_default(ModelPicker, {
    initial: p,
    sessionModel,
    options: ie,
    onSelect: (s, M) => {
      L.current = undefined;
      st(Q(s), M ?? L.current?.effort);
    },
    onSetDefault: (s) => {
      if (noEffortRefusal(Q(s)) !== null) return;
      se.current = true;
    },
    onCancel: handleCancel,
    isStandaloneCommand: true,
    showFastModeNotice:
      isFastModeEnabled() && fastModeOnForModel && supportsFastMode(A) && isFastModeAvailable(),
  });
}
//@ chunk-mvhmq2z8.js:23406-24820 layout
function CloudModelPickerLoader({ getMessages, onDone, storageV5, credentials, session }) {
  let h = useAppState((L) => L.mainLoopModel);
  let [p, u] = y(null);
  let [A, T] = y(null);
  let [D] = y(() => new AbortController());
  let [x, O] = y();
  let E = R(false);
  P(() => {
    let remoteCaps = getRemoteCaps();
    if (!remoteCaps) {
      onDone(CLOUD_MODEL_PICKER_UNAVAILABLE, {
        display: "system",
      });
      return;
    }
    let Q = false;
    remoteCaps
      .sendControlRequest(
        {
          subtype: "list_models",
        },
        {
          signal: D.signal,
          timeoutMs: CLOUD_MODEL_LIST_TIMEOUT_MS,
          awaitWorkerStart: {
            onChange: (_) => {
              E.current ||= _;
              O(_);
            },
          },
        },
      )
      .then((_) => {
        if (Q || D.signal.aborted) return;
        let q = pluginOptionsTargets(_);
        cacheRemoteModelList(REMOTE_MODEL_LIST_CACHE.of(session.host), remoteCaps.sessionId, {
          rows: q,
          trigger: "open",
        });
        logEvent("tengu_remote_model_picker", {
          outcome: lit("opened"),
          model_count: q.length,
          waited_for_worker: E.current,
        });
        u(q);
      })
      .catch((error) => {
        if (Q || D.signal.aborted) return;
        logEvent("tengu_remote_model_picker", {
          outcome: lit(error instanceof ControlRequestTimeoutError ? "timeout" : "fallback"),
          waited_for_worker: E.current,
        });
        onDone(CLOUD_MODEL_LIST_FAILED, {
          display: "system",
        });
      });
    O((_) => _ ?? false);
    return () => {
      Q = true;
    };
  }, [onDone, D, session]);
  if (A !== null)
    return jsxProd_default(SetModelFromArgs, {
      args: A,
      getMessages,
      onDone,
      storageV5,
      credentials,
      session,
    });
  if (p === null) {
    if (x === undefined) return null;
    return jsxProd_default(PromptDialog, {
      message: x
        ? "Waiting for the cloud session to be ready\u2026"
        : "Loading models from the cloud session\u2026",
      onCancel: () => {
        D.abort();
        logEvent("tengu_remote_model_picker", {
          outcome: lit("cancelled"),
          waited_for_worker: E.current,
        });
        onDone(CLOUD_MODEL_LIST_TIMEOUT, {
          display: "system",
        });
      },
    });
  }
  let initial = isKnownAlias(p, h);
  return jsxProd_default(ModelPicker, {
    initial,
    options: p,
    headerText: CLOUD_MODEL_PICKER_SUBTITLE,
    onSelect: (L) => T(L ?? "default"),
    onCancel: () => {
      logEvent("tengu_model_command_menu", {
        action: lit("cancel"),
      });
      onDone(keptModelMessage(h), {
        display: "system",
      });
    },
    isStandaloneCommand: true,
  });
}
//@ chunk-mvhmq2z8.js:24820-26826 fingerprint = ModelPickerWrapper (0.322)
function ModelPickerWrapper(props) {
  let x = w(38);
  let { kept, getMessages, onDone, storageV5, credentials, session } = props;
  let mainLoopModel = useAppState(selectMainLoopModel);
  let appStoreDirect = useAppStoreDirect();
  let [T, D] = y(null);
  let O;
  if (x[0] !== kept.rows || x[1] !== mainLoopModel) {
    O = () => isKnownAlias(kept.rows, mainLoopModel);
    x[0] = kept.rows;
    x[1] = mainLoopModel;
    x[2] = O;
  } else O = x[2];
  let [E] = y(O);
  let ie = R("pending");
  let mainLoopModelForSession = R(false);
  let Q;
  if (
    x[3] !== kept.rows ||
    x[4] !== kept.trigger ||
    x[5] !== onDone ||
    x[6] !== E ||
    x[7] !== session ||
    x[8] !== appStoreDirect
  ) {
    Q = () => {
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
      refreshRemoteModelList(REMOTE_MODEL_LIST_CACHE.of(session.host), setAppState, "open").then((q) => {
        let le = En(q, kept.rows) && isKnownAlias(kept.rows, appStoreDirect.getState().mainLoopModel) === E;
        ie.current = q === null ? "failed" : le ? "same" : "differed";
      });
    };
    x[3] = kept.rows;
    x[4] = kept.trigger;
    x[5] = onDone;
    x[6] = E;
    x[7] = session;
    x[8] = appStoreDirect;
    x[9] = Q;
  } else Q = x[9];
  let Ee;
  if (x[10] !== kept || x[11] !== onDone || x[12] !== E || x[13] !== session || x[14] !== appStoreDirect) {
    Ee = [kept, E, session, appStoreDirect, onDone];
    x[10] = kept;
    x[11] = onDone;
    x[12] = E;
    x[13] = session;
    x[14] = appStoreDirect;
    x[15] = Ee;
  } else Ee = x[15];
  P(Q, Ee);
  if (T !== null) {
    let z;
    if (
      x[16] !== credentials ||
      x[17] !== getMessages ||
      x[18] !== onDone ||
      x[19] !== T ||
      x[20] !== session ||
      x[21] !== storageV5
    ) {
      z = jsxProd_default(SetModelFromArgs, {
        args: T,
        getMessages,
        onDone,
        storageV5,
        credentials,
        session,
      });
      x[16] = credentials;
      x[17] = getMessages;
      x[18] = onDone;
      x[19] = T;
      x[20] = session;
      x[21] = storageV5;
      x[22] = z;
    } else z = x[22];
    return z;
  }
  let z;
  if (x[23] !== kept.rows || x[24] !== mainLoopModel) {
    z = isKnownAlias(kept.rows, mainLoopModel);
    x[23] = kept.rows;
    x[24] = mainLoopModel;
    x[25] = z;
  } else z = x[25];
  let ne = z;
  let onSelect;
  if (x[26] !== ne || x[27] !== onDone || x[28] !== E) {
    onSelect = (prev) => {
      if (mainLoopModelForSession.current) {
        return;
      }
      mainLoopModelForSession.current = true;
      let de = prev === E || prev === ne;
      let Ce = !de || (ie.current === "same" && ne === E);
      logEvent("tengu_remote_model_kept_rows_pick", {
        is_ticked_row: de,
        is_sent: Ce,
        own_answer: fromEnum(ie.current),
      });
      if (Ce) D(prev ?? "default");
      else
        onDone(MODEL_KEPT_MESSAGE, {
          display: "system",
        });
    };
    x[26] = ne;
    x[27] = onDone;
    x[28] = E;
    x[29] = onSelect;
  } else onSelect = x[29];
  let onCancel;
  if (x[30] !== mainLoopModel || x[31] !== onDone) {
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
    x[30] = mainLoopModel;
    x[31] = onDone;
    x[32] = onCancel;
  } else onCancel = x[32];
  let se;
  if (x[33] !== ne || x[34] !== kept.rows || x[35] !== onSelect || x[36] !== onCancel) {
    se = jsxProd_default(ModelPicker, {
      initial: ne,
      options: kept.rows,
      headerText: CLOUD_MODEL_PICKER_SUBTITLE,
      onSelect,
      onCancel,
      isStandaloneCommand: true,
    });
    x[33] = ne;
    x[34] = kept.rows;
    x[35] = onSelect;
    x[36] = onCancel;
    x[37] = se;
  } else se = x[37];
  return se;
}
//@ chunk-mvhmq2z8.js:26826-33595 layout
function SetModelFromArgs(props) {
  let O = w(72);
  let { args, getMessages, onDone, storageV5, credentials, session } = props;
  let appStoreDirect = useAppStoreDirect();
  let setAppState = useSetAppState();
  let { addNotification } = useNotifications();
  let [D, x] = y(null);
  let E;
  if (O[0] === MEMO_CACHE_SENTINEL) {
    E = [];
    O[0] = E;
  } else E = O[0];
  let messagesRef = R(E);
  let [L, Q] = y(false);
  let abortControllerRef = R(null);
  let [q, le] = y(null);
  let [Ee] = y(isUltracodeConfirmable);
  let z = R(false);
  let ne = R(false);
  let ge = R(0);
  let Se = R(null);
  let de = R(false);
  let Ce;
  if (
    O[1] !== addNotification ||
    O[2] !== onDone ||
    O[3] !== session ||
    O[4] !== setAppState ||
    O[5] !== storageV5 ||
    O[6] !== appStoreDirect
  ) {
    Ce = (U, se) => {
      let De = !isRemoteSessionAvailable();
      x(null);
      let Pe = false;
      let We = () => {
        let Le = saveModelSwitch(
          session,
          U,
          () => appStoreDirect.getState(),
          setAppState,
          De,
          "command",
          se,
          storageV5,
          (xt) => {
            Pe = xt?.kind === "failed";
          },
        );
        let tt = cloudModelRefusal(undefined, setAppState, storageV5);
        if (se !== undefined && U !== null)
          addNotification({
            key: `model-restricted-${U}`,
            kind: "warning",
            text: formatModelRestrictedNotice(se, U),
            priority: "immediate",
          });
        notifyModelDeprecation(U, addNotification);
        return Le.then(($t) => $t + tt);
      };
      let ot = effectiveModelForContext(appStoreDirect.getState());
      let st = De
        ? savedModelPickReply(
            U,
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
              We().then((nt) =>
                Pe
                  ? {
                      unsaved: nt,
                    }
                  : nt,
              ),
            {
              persistsOffBox: () => isBridgeOrTransport(session),
              hasModelMoved: () => effectiveModelForContext(appStoreDirect.getState()) !== ot,
            },
          )
        : We().then(textNotRefusal);
      let Ke = messagesRef.current;
      messagesRef.current = [];
      st.then(
        (Te) => {
          let { text, isRefusal, rewrittenTo } = Te;
          return isRefusal
            ? onDone(text, {
                display: "system",
              })
            : onDone(
                Ke.length > 0 && rewrittenTo === undefined
                  ? `${text}
${Ke.map(sanitizeHookText).join(`
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
    O[1] = addNotification;
    O[2] = onDone;
    O[3] = session;
    O[4] = setAppState;
    O[5] = storageV5;
    O[6] = appStoreDirect;
    O[7] = Ce;
  } else Ce = O[7];
  let s = Ce;
  let Te;
  if (O[8] !== s || O[9] !== getMessages || O[10] !== appStoreDirect) {
    Te = (M, I, Y) => {
      let state = appStoreDirect.getState();
      if (
        !Y &&
        useMainLoopModel(
          M,
          state.mainLoopModel,
          state.mainLoopModelForSession,
          state.cacheMissAckedAtOutputTokens,
          lastMainThreadResponse(getMessages()),
        )
      ) {
        x({
          model: M,
          substitutedFrom: I,
          vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
        });
        return;
      }
      s(M, I);
    };
    O[8] = s;
    O[9] = getMessages;
    O[10] = appStoreDirect;
    O[11] = Te;
  } else Te = O[11];
  let V = Te;
  let J;
  if (O[12] !== V || O[13] !== onDone || O[14] !== session || O[15] !== appStoreDirect) {
    J = (B, xe) => {
      let abortController = new AbortController();
      abortControllerRef.current = abortController;
      Q(true);
      serializeModelSwitch(session, () =>
        runPreModelSwitchHooks(session, appStoreDirect.getState, B, "command", {
          signal: abortController.signal,
        }),
      )
        .then((re) => {
          Q(false);
          if (abortController.signal.aborted) {
            return;
          }
          messagesRef.current = re.messages;
          if (re.decision === "block") {
            logFeatureSad("model_switch", "blocked_by_hook");
            onDone(preModelSwitchBlockedMessage(B, re.reason, re.messages), {
              display: "system",
            });
            return;
          }
          if (re.decision === "ask") {
            x({
              model: B,
              substitutedFrom: xe,
              hookReason: re.reason ?? "Confirm switching the model",
              vettedFrom: effectiveModelForContext(appStoreDirect.getState()),
            });
            return;
          }
          V(B, xe, re.skipConfirm);
        })
        .catch((error) => {
          Q(false);
          if (abortController.signal.aborted) {
            return;
          }
          logError(toError(error));
          onDone(`Model switch failed: ${sanitizeHookText(errorMessage(error))}`, {
            display: "system",
          });
        });
    };
    O[12] = V;
    O[13] = onDone;
    O[14] = session;
    O[15] = appStoreDirect;
    O[16] = J;
  } else J = O[16];
  let Me = J;
  let Ro;
  if (
    O[17] !== addNotification ||
    O[18] !== args ||
    O[19] !== credentials ||
    O[20] !== onDone ||
    O[21] !== Me ||
    O[22] !== session ||
    O[23] !== setAppState ||
    O[24] !== storageV5
  ) {
    Ro = () => {
      let remoteCaps = getRemoteCaps();
      if (remoteCaps && isRemoteControlChannelAvailable()) {
        switchMainLoopModelSafe(args, storageV5, credentials).then((he) => {
          if (z.current) {
            return;
          }
          if (!he.ok) {
            de.current = true;
            onDone(he.message, {
              display: "system",
            });
            return;
          }
          if (he.model !== null && hasLadderForSetting(he.model)) {
            logFeatureSad("model_fable_consent", "remote_thin_client_blocked");
            de.current = true;
            onDone(
              `${renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(he.model))} uses usage credits, and this cloud session can\u2019t show the consent prompt yet \xB7 switch models from the workspace, or consent once in a local session first`,
              {
                display: "system",
              },
            );
            return;
          }
          let model = he.model;
          return remoteCaps
            .sendControlRequest({
              subtype: "set_model",
              model: model ?? undefined,
            })
            .then(() => {
              let Bt = false;
              setAppState((it) => {
                Bt = isFastModeEnabled() && !!it.fastMode && !isFastModeActive(model, it.fastMode);
                recordSwitchIfChanged(session, it, model, "command");
                return {
                  ...it,
                  mainLoopModel: model,
                  mainLoopModelForSession: null,
                  ...(Bt && {
                    fastMode: false,
                  }),
                };
              });
              if (Bt) reportFastModeToggle(true, false);
              refreshRemoteModelList(REMOTE_MODEL_LIST_CACHE.of(session.host), remoteCaps, "switch");
              if (z.current) {
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
              if (he.substitutedFrom !== undefined && model !== null)
                addNotification({
                  key: `model-restricted-${model}`,
                  kind: "warning",
                  text: formatModelRestrictedNotice(he.substitutedFrom, model),
                  priority: "immediate",
                });
              if (he.substitutedFrom !== undefined)
                logFeatureSad("model_switch", "family_alias_stepped_down");
              else logFeatureOk("model_switch");
              de.current = true;
              onDone(
                model === null
                  ? "Reset model to the workspace default"
                  : `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(model))}`,
              );
            })
            .catch((error) => {
              logForDebugging(`[remote] set_model rejected: ${errorMessage(error)}`);
              if (z.current) {
                return;
              }
              let So = error instanceof ControlRequestTimeoutError;
              logFeatureBad("model_switch", So ? "timeout" : "remote_rejected");
              de.current = true;
              onDone(
                So
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
      }).then((ye) => {
        if (!ye.ok) {
          onDone(ye.message, {
            display: "system",
          });
          return;
        }
        if (ladderForDefaultModel(ye.model)) {
          ne.current = false;
          ge.current = ge.current + 1;
          le({
            model: ye.model,
            substitutedFrom: ye.substitutedFrom,
          });
          return;
        }
        if (ye.creditsRefusal !== undefined) {
          onDone(ye.creditsRefusal, {
            display: "system",
          });
          return;
        }
        Me(ye.model, ye.substitutedFrom);
      });
    };
    O[17] = addNotification;
    O[18] = args;
    O[19] = credentials;
    O[20] = onDone;
    O[21] = Me;
    O[22] = session;
    O[23] = setAppState;
    O[24] = storageV5;
    O[25] = Ro;
  } else Ro = O[25];
  let Co;
  if (
    O[26] !== args ||
    O[27] !== credentials ||
    O[28] !== onDone ||
    O[29] !== Me ||
    O[30] !== setAppState ||
    O[31] !== storageV5
  ) {
    Co = [args, onDone, setAppState, Me, storageV5, credentials];
    O[26] = args;
    O[27] = credentials;
    O[28] = onDone;
    O[29] = Me;
    O[30] = setAppState;
    O[31] = storageV5;
    O[32] = Co;
  } else Co = O[32];
  P(Ro, Co);
  if (Ee) {
    const message = `Switching the cloud session to ${args}\u2026`;
    let onCancel;
    if (O[33] !== args || O[34] !== onDone) {
      onCancel = () => {
        if (de.current) {
          return;
        }
        de.current = true;
        z.current = true;
        logFeatureSad("model_switch", "remote_wait_cancelled");
        onDone(
          `Stopped waiting for the cloud session \u2014 you\u2019ll get a notice if the switch to ${args} still lands`,
          {
            display: "system",
          },
        );
      };
      O[33] = args;
      O[34] = onDone;
      O[35] = onCancel;
    } else onCancel = O[35];
    let ae;
    if (O[36] !== message || O[37] !== onCancel) {
      ae = jsxProd_default(PromptDialog, {
        message,
        onCancel,
      });
      O[36] = message;
      O[37] = onCancel;
      O[38] = ae;
    } else ae = O[38];
    return ae;
  }
  if (q) {
    let { model, substitutedFrom } = q;
    let lt;
    let Do;
    let Ue;
    let variant;
    let modelName;
    if (O[39] !== model) {
      Ue = parseUserSpecifiedModel(model ?? getDefaultMainLoopModelSetting());
      Do = ge.current;
      lt = FableUsageCreditsConsent;
      variant = "picker";
      modelName = renderUsageCreditsOnlyModelName(Ue);
      O[39] = model;
      O[40] = lt;
      O[41] = Do;
      O[42] = Ue;
      O[43] = variant;
      O[44] = modelName;
    } else {
      lt = O[40];
      Do = O[41];
      Ue = O[42];
      variant = O[43];
      modelName = O[44];
    }
    let onDone_2;
    if (
      O[45] !== model ||
      O[46] !== onDone ||
      O[47] !== Me ||
      O[48] !== appStoreDirect ||
      O[49] !== substitutedFrom
    ) {
      onDone_2 = (Oo, Rn) => {
        if (Do !== ge.current) {
          return false;
        }
        if (ne.current) {
          return false;
        }
        ne.current = true;
        le(null);
        if (Oo === "consent") {
          Me(model, substitutedFrom);
          return;
        }
        if (Oo === "upgrade") {
          onDone(undefined, {
            display: "skip",
            nextInput: "/upgrade",
            submitNextInput: true,
          });
          return;
        }
        onDone(
          Rn ??
            `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(useMainLoopModel_3(appStoreDirect.getState())))}`,
          {
            display: "system",
          },
        );
      };
      O[45] = model;
      O[46] = onDone;
      O[47] = Me;
      O[48] = appStoreDirect;
      O[49] = substitutedFrom;
      O[50] = onDone_2;
    } else onDone_2 = O[50];
    let Fo;
    if (O[51] !== lt || O[52] !== Ue || O[53] !== variant || O[54] !== modelName || O[55] !== onDone_2) {
      Fo = jsxProd_default(lt, {
        variant,
        modelName,
        model: Ue,
        onDone: onDone_2,
      });
      O[51] = lt;
      O[52] = Ue;
      O[53] = variant;
      O[54] = modelName;
      O[55] = onDone_2;
      O[56] = Fo;
    } else Fo = O[56];
    return Fo;
  }
  if (D) {
    let onConfirm;
    if (O[57] !== s || O[58] !== onDone || O[59] !== D || O[60] !== appStoreDirect) {
      onConfirm = () => {
        if (Se.current === D) {
          return;
        }
        Se.current = D;
        if (
          D.vettedFrom !== undefined &&
          effectiveModelForContext(appStoreDirect.getState()) !== D.vettedFrom
        ) {
          onDone("The model changed while you were confirming; pick again", {
            display: "system",
          });
          return;
        }
        s(D.model, D.substitutedFrom);
      };
      O[57] = s;
      O[58] = onDone;
      O[59] = D;
      O[60] = appStoreDirect;
      O[61] = onConfirm;
    } else onConfirm = O[61];
    let onCancel;
    if (O[62] !== onDone || O[63] !== appStoreDirect) {
      onCancel = () =>
        onDone(
          `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(useMainLoopModel_3(appStoreDirect.getState())))}`,
          {
            display: "system",
          },
        );
      O[62] = onDone;
      O[63] = appStoreDirect;
      O[64] = onCancel;
    } else onCancel = O[64];
    let ae;
    if (O[65] !== D.hookReason || O[66] !== D.model || O[67] !== onConfirm || O[68] !== onCancel) {
      ae = jsxProd_default(ModelEffortSwitchConfirm, {
        kind: "model",
        model: D.model,
        effort: undefined,
        hookReason: D.hookReason,
        onConfirm,
        onCancel,
      });
      O[65] = D.hookReason;
      O[66] = D.model;
      O[67] = onConfirm;
      O[68] = onCancel;
      O[69] = ae;
    } else ae = O[69];
    return ae;
  }
  if (L) {
    let K;
    if (O[70] !== onDone) {
      K = jsxProd_default(PromptDialog, {
        message: "Running PreModelSwitch hooks\u2026",
        onCancel: () => {
          abortControllerRef.current?.abort();
          Q(false);
          onDone("Model switch cancelled", {
            display: "system",
          });
        },
      });
      O[70] = onDone;
      O[71] = K;
    } else K = O[71];
    return K;
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
//@ chunk-mvhmq2z8.js:33776-33941 callgraph-fingerprint = SetModelAndClose (0.23)
function SetModelAndClose(r) {
  let { onDone } = r;
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
//@ chunk-mvhmq2z8.js:33941-34964 fingerprint = call (0.691)
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
      let n = cachedRemoteModelListWithDefault(
        REMOTE_MODEL_LIST_CACHE.of(context.session.host),
        getRemoteCaps()?.sessionId,
      );
      if (n !== null)
        return jsxProd_default(ModelPickerWrapper, {
          kept: n,
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
//@ chunk-d1cgs5na.js:1834-1903 fingerprint = renderModelLabel (1)
function renderModelLabel(model) {
  let rendered = renderDefaultModelSetting_2(model ?? getDefaultMainLoopModelSetting());
  return model === null ? `${rendered} (default)` : rendered;
}
//@ chunk-d1cgs5na.js:12136-12407 placement
/**
 * 判断切到带 [1m] 的别名是否有问题：1M 上下文被禁用、目标模型不支持 1M、或模式相关的设置没有对应的 1M 变体；正常返回 null。
 */
function diagnose1mAliasSwitch(e) {
  let setting = e.toLowerCase().trim();
  let s = strip1mSuffix(setting);
  if (s === setting || !isAliasSpelling(setting)) return null;
  if (is1mContextDisabled())
    return {
      kind: "disabled",
    };
  let found = renderDefaultModelSetting(setting).find((n) => isKnownNon1mTarget(n));
  if (found !== undefined)
    return {
      kind: "unsupported",
      carrier: strip1mSuffix(found),
    };
  if (isModeDependentModelSetting(s) && planModeConstituentFamily(setting) === null)
    return {
      kind: "noModeDependentVariant",
    };
  return null;
}
//@ chunk-d1cgs5na.js:12407-12554 fingerprint = isOpus1mUnavailable (1)
function isOpus1mUnavailable(model) {
  let m = model.toLowerCase();
  if (!(m.includes("opus") && m.includes("[1m]"))) return false;
  if (renderDefaultModelSetting(model).every((s) => modelHasNative1MContext(s))) return false;
  return !shouldProbeThirdPartyDefaults() && !isOpus1mMergeEnabled();
}
//@ chunk-d1cgs5na.js:12651-12852 placement
/**
 * 判断 sonnet[1m]/opusplan[1m] 这类设置是否需要额外检查 1M 资格：排除旧版 sonnet、原生支持 1M 的模型以及第三方默认探测场景。
 */
function requires1mEntitlementCheck(e) {
  let lower = e.toLowerCase();
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
  if (modelHasNative1MContext(parseUserSpecifiedModel(e))) return false;
  return !shouldProbeThirdPartyDefaultsAlt();
}
//@ chunk-d1cgs5na.js:12852-12887 placement
/**
 * 把用户指定的模型（或默认主循环模型）解析成实际模型名。
 */
function resolveRequestedModel(e) {
  return parseUserSpecifiedModel(e ?? getDefaultMainLoopModelSetting());
}
//@ chunk-d1cgs5na.js:12887-13152 placement = useMainLoopModel (0.833)
function useMainLoopModel(e, mainLoopModel, mainLoopModelForSession, cacheMissAckedAtOutputTokens, n) {
  if (n === undefined) return false;
  let totalOutputTokens = getTotalOutputTokens();
  if (totalOutputTokens === 0 || totalOutputTokens === cacheMissAckedAtOutputTokens) return false;
  let mainLoopModel_2 = stripAnyVersatileSuffix(resolveRequestedModel(e));
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
  let model = n.response?.message.model;
  return !(
    typeof model === "string" &&
    (model === mainLoopModel_2 || getServedModelsForRequestedModel(mainLoopModel_2)?.has(model) === true)
  );
}
//@ chunk-d1cgs5na.js:13152-13461 fingerprint = ShowModelAndClose (0.354)
function ShowModelAndClose(t0) {
  let mainLoopModel = toInlineCode(renderModelLabel(t0.mainLoopModel));
  let mainLoopModelForSession = resolveEffortLevel(t0);
  let a = mainLoopModelForSession !== undefined ? ` (effort: ${mainLoopModelForSession})` : "";
  let modelSwitchTarget = getModelSwitchTarget(t0.mainLoopModelForSession, t0.mainLoopModel);
  if (modelSwitchTarget !== null)
    return `${CURRENT_MODEL_PREFIX}${toInlineCode(renderModelLabel(modelSwitchTarget))} (this session only)${a}
Base model: ${mainLoopModel}`;
  let activeModelFallback = getActiveModelFallback();
  let r =
    activeModelFallback !== undefined
      ? ` (${describeAutoSwitchedModel(toInlineCode(renderModelLabel(activeModelFallback.previousModel)))})`
      : "";
  return `${CURRENT_MODEL_PREFIX}${mainLoopModel}${r}${a}`;
}
//@ chunk-18hwfzwa.js:929434-929487 fingerprint = _temp2 (1)
function selectMainLoopModelForSession_2(s_0) {
  return s_0.mainLoopModelForSession;
}
export {
  ShowModelAndClose,
  selectMainLoopModelForSession_2,
  resolveRequestedModel,
  renderModelLabel,
  diagnose1mAliasSwitch,
  isOpus1mUnavailable,
  requires1mEntitlementCheck,
};
