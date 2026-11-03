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
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
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
import { Jn, ml, wt, _C } from "../../remote/remoteMode.js";
import { Lt, Bn } from "../../utils/model/modelIds.js";
import {
  KEPT_MODEL_PREFIX,
  toInlineCode,
  SET_MODEL_PREFIX,
  SAVED_AS_DEFAULT_SUFFIX,
  CLOUD_SWITCH_NO_RESPONSE_PREFIX,
  CLOUD_SWITCH_FAILED_PREFIX,
  CURRENT_MODEL_PREFIX,
} from "./modelMessages.js";
import { Cr, useAppState, useSetAppState } from "../../state/AppState.js";
import { useMainLoopModelSetting } from "../../hooks/useMainLoopModel.js";
import { sDe } from "../../hooks/usePromptSuggestion.js";
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
import { WKn, lue } from "../../utils/model/modelUnavailability.js";
import {
  serializeModelSwitch,
  bk,
  zE,
  useMainLoopModel as useMainLoopModel_3,
  useMainLoopModel as useMainLoopModel_2_2,
  getModelSwitchTarget,
} from "../../utils/model/modelSwitchHooks.js";
import {
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  Nf,
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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FableUsageCreditsConsent } from "../../components/usageCredits/FableUsageCreditsConsent.js";
import { PromptDialog } from "../../components/hooks/PromptDialog.js";
import { ModelEffortSwitchConfirm } from "../../components/ModelEffortSwitchConfirm.js";
import { ModelPicker } from "../../components/ModelPicker.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { formatModelRestrictedNotice, isAliasSpelling } from "../../utils/model/validateModel.js";
import { logForDebugging } from "../../utils/debug.js";
import { getDeprecationStatusLine } from "../../utils/model/deprecation.js";
import { vDi } from "../../types/logs.js";
import { COMMON_HELP_ARGS } from "../../constants/xml.js";
import { gn } from "../../utils/shortHash.js";
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
j();
//@ chunk-mvhmq2z8.js:16276-16347 sole-consumer
function dt() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harp_pedal", !0) !== !1;
  } catch {
    return !0;
  }
}
//@ chunk-mvhmq2z8.js:16347-16373 sole-consumer
var we = new HostScoped(() => new Map());
//@ chunk-mvhmq2z8.js:16373-16437 sole-consumer
function at({ models: models }) {
  return models.map(findPluginOptionsTarget).filter((o) => o !== null);
}
//@ chunk-mvhmq2z8.js:16437-16550 sole-consumer
function cachedRemoteModelListWithDefault(r, o) {
  if (o === void 0 || !dt()) return null;
  let i = r.get(o);
  return i?.rows.some((n) => n.value === null) ? i : null;
}
//@ chunk-mvhmq2z8.js:16550-16594 sole-consumer
function ut(r, o, i) {
  if (o !== void 0) r.set(o, i);
}
//@ chunk-mvhmq2z8.js:16594-16746 sole-consumer
function refreshRemoteModelList(r, o, i) {
  if (o.sessionId === void 0 || !dt()) return Promise.resolve(null);
  return trackRemoteModelListRefresh(r, o.sessionId, i, o.sendControlRequest({ subtype: "list_models" }));
}
/**
 * 发出 list_models 控制请求后的处理：成功时记录与上次结果是否相同并缓存行；失败时记遥测，若缓存未被替换则删除该会话的缓存，返回 null。
 */
//@ chunk-mvhmq2z8.js:16746-17121 sole-consumer
function trackRemoteModelListRefresh(r, o, i, n) {
  let C = r.get(o);
  return n.then(at).then(
    (h) => {
      let p = r.get(o);
      return (
        logFeatureOk("remote_model_list_refresh", {
          trigger: fromEnum(i),
          ...(p === void 0
            ? { last_answer: lit("none") }
            : { last_answer: lit(En(p.rows, h) ? "same" : "differed"), last_trigger: fromEnum(p.trigger) }),
        }),
        ut(r, o, { rows: h, trigger: i }),
        h
      );
    },
    (h) => {
      if (
        (logFeatureSad("remote_model_list_refresh", classifyControlRequestError(h), { trigger: fromEnum(i) }),
        r.get(o) === C)
      )
        r.delete(o);
      return null;
    },
  );
}
//@ chunk-mvhmq2z8.js:17121-17149 affinity
function Ge(r, o, i) {
  return "";
}
//@ chunk-mvhmq2z8.js:17149-17189 callgraph-fingerprint = _temp (1)
function hn(s) {
  return s.mainLoopModel;
}
//@ chunk-mvhmq2z8.js:17189-17228 layout
function yn() {
  return Jn() !== null && ml();
}
//@ chunk-mvhmq2z8.js:17228-17273 layout
function kn(Sn) {
  return { text: Sn, isRefusal: !1 };
}
//@ chunk-mvhmq2z8.js:17273-17311 file-local
function wn(s) {
  return s.mainLoopModel;
}
//@ chunk-mvhmq2z8.js:17311-17359 layout = _temp2 (1)
function An(s_0) {
  return s_0.mainLoopModelForSession;
}
//@ chunk-mvhmq2z8.js:17359-17397 layout
function _n(A) {
  return A.sessionEffort;
}
//@ chunk-mvhmq2z8.js:17397-17441 layout
function vn(T) {
  return T.settingsEffortTable;
}
//@ chunk-mvhmq2z8.js:17441-17524 layout
function Eo(r) {
  let o = wo(r);
  if (o !== null) return { kind: "refuse", message: o };
  return null;
}
//@ chunk-mvhmq2z8.js:17524-17551 layout
function wo(r) {
  return null;
}
/**
 * CLOUD_MODEL_LIST_TIMEOUT_MS：15000。
 */
//@ chunk-mvhmq2z8.js:17551-18016 layout
var CLOUD_MODEL_PICKER_UNAVAILABLE =
    "Model picker shows local options in cloud sessions \u2014 pass a model name, e.g. /model sonnet",
  CLOUD_MODEL_LIST_FAILED =
    "Couldn\u2019t load the model list from the cloud session \u2014 pass a model name, e.g. /model sonnet",
  CLOUD_MODEL_LIST_TIMEOUT =
    "Stopped waiting for the cloud session\u2019s model list \u2014 run /model again, or pass a model name, e.g. /model sonnet",
  CLOUD_MODEL_LIST_TIMEOUT_MS = 15000,
  Kt = (r) => Lt(r) !== r,
  xo = (r) =>
    r.reduce((o, i) => (o === null || (i.value?.length ?? 0) > (o.value?.length ?? 0) ? i : o), null)
      ?.value ?? null;
//@ chunk-mvhmq2z8.js:18016-18177 file-local
function isKnownAlias(r, o) {
  let found = r.find((n) => n.value === o);
  return found
    ? found.value
    : xo(
        o === null
          ? []
          : r.filter((n) => n.value !== null && Lt(o).includes(Lt(n.value)) && Kt(o) === Kt(n.value)),
      );
}
//@ chunk-mvhmq2z8.js:18177-18259 layout
var CLOUD_MODEL_PICKER_SUBTITLE = "Models reported by the cloud session. Your pick applies to that session.";
//@ chunk-mvhmq2z8.js:18259-18353 layout
function Pt(r) {
  return r === null
    ? "Kept the workspace\u2019s current model"
    : `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(r))}`;
}
//@ chunk-mvhmq2z8.js:18353-18475 layout
var MODEL_KEPT_MESSAGE =
  "Kept the model (nothing was sent) \u2014 to change it, run /model again or pass a model name, e.g. /model sonnet";
//@ chunk-mvhmq2z8.js:18475-23406 layout
function LocalModelPicker({
  getMessages: getMessages,
  onDone: onDone,
  storageV5: storageV5,
  session: session,
  onQueryEvent: onQueryEvent,
}) {
  let h = Cr(),
    p = useAppState((s) => s.mainLoopModel),
    u = useAppState((s) => s.mainLoopModelForSession),
    A = useMainLoopModelSetting() ?? p,
    T = useAppState((s) => s.fastMode),
    D = sDe(T, A),
    x = useSetAppState(),
    { addNotification: addNotification } = useNotifications(),
    [E] = y(() => {
      return;
    }),
    [ie] = y(() => (E !== void 0 ? getModelOptionsWithTelemetry(isFastModeEnabled() && !!T, E) : void 0)),
    L = R(void 0),
    Q = (s) => s,
    [_, q] = y(null),
    le = R([]),
    [Ee, z] = y(null),
    [ne, ge] = y(null),
    Se = R(!1),
    de = R(0),
    Ce = R(null),
    U = R(null),
    se = R(!1),
    De = R(!1),
    Pe = R(0),
    [xt, Le] = y(!1),
    tt = R(null),
    [$t, We] = y(!1),
    ot = R(null);
  function nt() {
    logEvent("tengu_model_command_menu", { action: lit("cancel") });
    let s = renderModelLabel(A);
    onDone(ee(`${KEPT_MODEL_PREFIX}${toInlineCode(s)}`), { display: "system" });
  }
  function st(s, M, I = !1) {
    let Y = Eo(s);
    if (Y?.kind === "refuse") {
      onDone(Y.message, { display: "system" });
      return;
    }
    if (Y?.kind === "confirm") {
      ((Se.current = !1), (de.current += 1), ge({ model: s, effort: M }));
      return;
    }
    let k = s === null ? managedDenyStartupRefusal(getDefaultMainLoopModelSetting(), "switch") : null;
    if (k !== null) {
      (logFeatureBad("model_switch", "denied_by_managed_settings"), onDone(ee(k), { display: "system" }));
      return;
    }
    if (!I && WKn(s)) {
      ((De.current = !1), (Pe.current += 1), z({ model: s, effort: M }));
      return;
    }
    let V = se.current;
    se.current = !1;
    let abortController = new AbortController();
    ((tt.current = abortController),
      Le(!0),
      serializeModelSwitch(session, () =>
        runPreModelSwitchHooks(session, h.getState, s, "picker", { signal: abortController.signal }),
      )
        .then((B) => {
          if ((Le(!1), abortController.signal.aborted)) return;
          if (((le.current = B.messages), B.decision === "block")) {
            (logFeatureSad("model_switch", "blocked_by_hook"),
              onDone(ee(preModelSwitchBlockedMessage(s, B.reason, B.messages)), { display: "system" }));
            return;
          }
          if (B.decision === "ask") {
            q({
              model: s,
              pick: M,
              kind: "model",
              hookReason: B.reason ?? "Confirm switching the model",
              vettedFrom: bk(h.getState()),
              saveAsDefault: V,
            });
            return;
          }
          return Te(s, M, B.skipConfirm, V);
        })
        .catch((B) => {
          if ((Le(!1), abortController.signal.aborted)) return;
          Ke(B);
        }));
  }
  function Ke(s) {
    (logError(toError(s)), onDone(ee(`Model switch failed: ${Nf(errorMessage(s))}`), { display: "system" }));
  }
  async function Te(s, M, I, Y) {
    let state = h.getState();
    if (
      !I &&
      useMainLoopModel_2(
        s,
        state.mainLoopModel,
        state.mainLoopModelForSession,
        state.cacheMissAckedAtOutputTokens,
        lastMainThreadResponse(getMessages()),
      )
    ) {
      q({ model: s, pick: M, kind: "model", vettedFrom: bk(h.getState()), saveAsDefault: Y });
      return;
    }
    if (
      M !== void 0 &&
      shouldShowEffortNotice({
        target: M,
        current: resolveEffortLevel(state),
        model: aue(s),
        permissionMode: state.toolPermissionContext.mode,
        messages: getMessages(),
        ackedAtOutputTokens: state.cacheMissAckedAtOutputTokens,
        promptCacheMayBeWarm: isMainThreadSource(getMessages()),
        setting: s,
      })
    ) {
      q({ model: s, pick: M, kind: "effort", vettedFrom: bk(h.getState()), saveAsDefault: Y });
      return;
    }
    await Ne(s, M, Y);
  }
  async function Ne(s, M, I) {
    We(!0);
    let Y = bk(h.getState()),
      k;
    try {
      k = I
        ? await savedModelPickReply(
            s,
            {
              getAppState: h.getState,
              setAppState: x,
              session: session,
              storageV5: storageV5,
              options: { mcpClients: [] },
            },
            () => rt(s, M, !0).then((V) => (V.hasDefaultSaveFailed ? { unsaved: V.message } : V.message)),
            {
              persistsOffBox: () => isBridgeOrTransport(session),
              hasModelMoved: () => bk(h.getState()) !== Y,
            },
          )
        : { text: (await rt(s, M, !1)).message, isRefusal: !1 };
    } finally {
      We(!1);
    }
    if (k.isRefusal) {
      ((le.current = []), onDone(ee(k.text), { display: "system" }));
      return;
    }
    if (k.rewrittenTo !== void 0) ((le.current = []), (U.current = null));
    onDone(ee(k.text));
  }
  async function rt(s, M, I) {
    ((U.current = null),
      logEvent("tengu_model_command_menu", {
        action: telemetrySafeModelName(s),
        from_model: telemetrySafeModelName(p),
        to_model: telemetrySafeModelName(s),
      }));
    let Y = I && M !== L.current?.effort;
    if (M !== void 0) persistEffortSetting(M, aue(s), Y, storageV5);
    clearRefusalFallbackModelLatch();
    let k = !1,
      V = !1;
    if (isFastModeEnabled()) clearFastModeCooldown();
    (zE(session, h.getState(), s, "picker"),
      x(
        (re) => (
          (k = !!re.fastMode),
          (V = isFastModeEnabled() ? isFastModeActive(s, re.fastMode) : k),
          {
            ...re,
            mainLoopModel: s,
            mainLoopModelForSession: null,
            ...(M !== void 0 && { sessionEffort: levelEffortSetting(M) }),
            ...(V !== k && { fastMode: V }),
          }
        ),
      ),
      reportFastModeToggle(k, V));
    let J = Ge(L.current, x, storageV5);
    (logFeatureOk("model_switch"), notifyModelDeprecation(s, addNotification));
    let B = I ? await setDefaultModel(s, storageV5) : null,
      xe = B?.kind === "saved",
      te = `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(s))}${xe ? SAVED_AS_DEFAULT_SUFFIX : " for this session only"}`;
    if (M !== void 0)
      te +=
        xe && (!Y || toPersistableEffort(M) === void 0)
          ? ` \xB7 ${toInlineCode(M)} effort for this session only`
          : ` with ${toInlineCode(M)} effort`;
    if (
      ((te += J),
      (te += formatFastModeSuffix(k, V, s, { announceKeptOn: !0 })),
      (te += describeDefaultSaved(B)),
      xe)
    )
      te += anthropicModelEnvNotice(s) || findModelSettingSource(s);
    if (le.current.length > 0)
      ((te += `
${le.current.map(Nf).join(`
`)}`),
        (le.current = []));
    return { message: te, hasDefaultSaveFailed: B?.kind === "failed" };
  }
  function ee(s) {
    let M = U.current;
    ((U.current = null), M?.());
    let I = Ce.current;
    return ((Ce.current = null), I === null ? s : s + I);
  }
  if (Ee) {
    let { model: model, effort: effort } = Ee,
      I = parseUserSpecifiedModel(model ?? getDefaultMainLoopModelSetting()),
      Y = Pe.current;
    return e(FableUsageCreditsConsent, {
      variant: "picker",
      modelName: renderUsageCreditsOnlyModelName(I),
      model: I,
      onDone: (k, V) => {
        if (Y !== Pe.current) return !1;
        if (De.current) return !1;
        if (((De.current = !0), z(null), k === "consent")) {
          st(model, effort, !0);
          return;
        }
        if (((se.current = !1), k === "upgrade")) {
          let trimmed = ee("").trim();
          onDone(trimmed === "" ? void 0 : trimmed, {
            display: trimmed === "" ? "skip" : "system",
            nextInput: "/upgrade",
            submitNextInput: !0,
          });
          return;
        }
        onDone(ee(V ?? `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(A))}`), { display: "system" });
      },
    });
  }
  if ($t) return null;
  if (xt)
    return e(PromptDialog, {
      message: "Running PreModelSwitch hooks\u2026",
      onCancel: () => {
        (tt.current?.abort(), Le(!1), onDone(ee("Model switch cancelled"), { display: "system" }));
      },
    });
  if (_)
    return e(ModelEffortSwitchConfirm, {
      kind: _.kind,
      model: _.model,
      effort: _.pick,
      hookReason: _.hookReason,
      onConfirm: () => {
        if (ot.current === _) return;
        if (((ot.current = _), _.vettedFrom !== void 0 && bk(h.getState()) !== _.vettedFrom)) {
          (q(null),
            onDone(ee("The model changed while you were confirming; pick again"), { display: "system" }));
          return;
        }
        Ne(_.model, _.pick, _.saveAsDefault).catch(Ke);
      },
      onCancel: () => {
        (q(null), (se.current = !1));
      },
    });
  return e(ModelPicker, {
    initial: p,
    sessionModel: u,
    options: ie,
    onSelect: (s, M) => {
      ((L.current = void 0), st(Q(s), M ?? L.current?.effort));
    },
    onSetDefault: (s) => {
      if (wo(Q(s)) !== null) return;
      se.current = !0;
    },
    onCancel: nt,
    isStandaloneCommand: !0,
    showFastModeNotice: isFastModeEnabled() && D && supportsFastMode(A) && isFastModeAvailable(),
  });
}
//@ chunk-mvhmq2z8.js:23406-24820 layout
function CloudModelPickerLoader({
  getMessages: getMessages,
  onDone: onDone,
  storageV5: storageV5,
  credentials: credentials,
  session: session,
}) {
  let h = useAppState((L) => L.mainLoopModel),
    [p, u] = y(null),
    [A, T] = y(null),
    [D] = y(() => new AbortController()),
    [x, O] = y(),
    E = R(!1);
  if (
    (P(() => {
      let L = Jn();
      if (!L) {
        onDone(CLOUD_MODEL_PICKER_UNAVAILABLE, { display: "system" });
        return;
      }
      let Q = !1;
      return (
        L.sendControlRequest(
          { subtype: "list_models" },
          {
            signal: D.signal,
            timeoutMs: CLOUD_MODEL_LIST_TIMEOUT_MS,
            awaitWorkerStart: {
              onChange: (_) => {
                ((E.current ||= _), O(_));
              },
            },
          },
        )
          .then((_) => {
            if (Q || D.signal.aborted) return;
            let q = at(_);
            (ut(we.of(session.host), L.sessionId, { rows: q, trigger: "open" }),
              logEvent("tengu_remote_model_picker", {
                outcome: lit("opened"),
                model_count: q.length,
                waited_for_worker: E.current,
              }),
              u(q));
          })
          .catch((_) => {
            if (Q || D.signal.aborted) return;
            (logEvent("tengu_remote_model_picker", {
              outcome: lit(_ instanceof ControlRequestTimeoutError ? "timeout" : "fallback"),
              waited_for_worker: E.current,
            }),
              onDone(CLOUD_MODEL_LIST_FAILED, { display: "system" }));
          }),
        O((_) => _ ?? !1),
        () => {
          Q = !0;
        }
      );
    }, [onDone, D, session]),
    A !== null)
  )
    return e(SetModelFromArgs, {
      args: A,
      getMessages: getMessages,
      onDone: onDone,
      storageV5: storageV5,
      credentials: credentials,
      session: session,
    });
  if (p === null) {
    if (x === void 0) return null;
    return e(PromptDialog, {
      message: x
        ? "Waiting for the cloud session to be ready\u2026"
        : "Loading models from the cloud session\u2026",
      onCancel: () => {
        (D.abort(),
          logEvent("tengu_remote_model_picker", { outcome: lit("cancelled"), waited_for_worker: E.current }),
          onDone(CLOUD_MODEL_LIST_TIMEOUT, { display: "system" }));
      },
    });
  }
  let ie = isKnownAlias(p, h);
  return e(ModelPicker, {
    initial: ie,
    options: p,
    headerText: CLOUD_MODEL_PICKER_SUBTITLE,
    onSelect: (L) => T(L ?? "default"),
    onCancel: () => {
      (logEvent("tengu_model_command_menu", { action: lit("cancel") }), onDone(Pt(h), { display: "system" }));
    },
    isStandaloneCommand: !0,
  });
}
//@ chunk-mvhmq2z8.js:24820-26826 fingerprint = ModelPickerWrapper (0.322)
function ModelPickerWrapper(t0) {
  let x = w(38),
    {
      kept: kept,
      getMessages: getMessages,
      onDone: onDone,
      storageV5: storageV5,
      credentials: credentials,
      session: session,
    } = t0,
    mainLoopModel = useAppState(hn),
    A = Cr(),
    [T, D] = y(null),
    O;
  if (x[0] !== kept.rows || x[1] !== mainLoopModel)
    ((O = () => isKnownAlias(kept.rows, mainLoopModel)),
      (x[0] = kept.rows),
      (x[1] = mainLoopModel),
      (x[2] = O));
  else O = x[2];
  let [E] = y(O),
    ie = R("pending"),
    mainLoopModelForSession = R(!1),
    Q;
  if (
    x[3] !== kept.rows ||
    x[4] !== kept.trigger ||
    x[5] !== onDone ||
    x[6] !== E ||
    x[7] !== session ||
    x[8] !== A
  )
    ((Q = () => {
      let setAppState = Jn();
      if (!setAppState) {
        ((mainLoopModelForSession.current = !0),
          onDone(CLOUD_MODEL_PICKER_UNAVAILABLE, { display: "system" }));
        return;
      }
      (logEvent("tengu_remote_model_picker", {
        outcome: lit("opened"),
        model_count: kept.rows.length,
        waited_for_worker: !1,
        kept_rows_trigger: fromEnum(kept.trigger),
      }),
        refreshRemoteModelList(we.of(session.host), setAppState, "open").then((q) => {
          let le = En(q, kept.rows) && isKnownAlias(kept.rows, A.getState().mainLoopModel) === E;
          ie.current = q === null ? "failed" : le ? "same" : "differed";
        }));
    }),
      (x[3] = kept.rows),
      (x[4] = kept.trigger),
      (x[5] = onDone),
      (x[6] = E),
      (x[7] = session),
      (x[8] = A),
      (x[9] = Q));
  else Q = x[9];
  let Ee;
  if (x[10] !== kept || x[11] !== onDone || x[12] !== E || x[13] !== session || x[14] !== A)
    ((Ee = [kept, E, session, A, onDone]),
      (x[10] = kept),
      (x[11] = onDone),
      (x[12] = E),
      (x[13] = session),
      (x[14] = A),
      (x[15] = Ee));
  else Ee = x[15];
  if ((P(Q, Ee), T !== null)) {
    let z;
    if (
      x[16] !== credentials ||
      x[17] !== getMessages ||
      x[18] !== onDone ||
      x[19] !== T ||
      x[20] !== session ||
      x[21] !== storageV5
    )
      ((z = e(SetModelFromArgs, {
        args: T,
        getMessages: getMessages,
        onDone: onDone,
        storageV5: storageV5,
        credentials: credentials,
        session: session,
      })),
        (x[16] = credentials),
        (x[17] = getMessages),
        (x[18] = onDone),
        (x[19] = T),
        (x[20] = session),
        (x[21] = storageV5),
        (x[22] = z));
    else z = x[22];
    return z;
  }
  let z;
  if (x[23] !== kept.rows || x[24] !== mainLoopModel)
    ((z = isKnownAlias(kept.rows, mainLoopModel)), (x[23] = kept.rows), (x[24] = mainLoopModel), (x[25] = z));
  else z = x[25];
  let ne = z,
    ge;
  if (x[26] !== ne || x[27] !== onDone || x[28] !== E)
    ((ge = (prev) => {
      if (mainLoopModelForSession.current) {
        return;
      }
      mainLoopModelForSession.current = !0;
      let de = prev === E || prev === ne;
      let Ce = !de || (ie.current === "same" && ne === E);
      if (
        (logEvent("tengu_remote_model_kept_rows_pick", {
          is_ticked_row: de,
          is_sent: Ce,
          own_answer: fromEnum(ie.current),
        }),
        Ce)
      )
        D(prev ?? "default");
      else onDone(MODEL_KEPT_MESSAGE, { display: "system" });
    }),
      (x[26] = ne),
      (x[27] = onDone),
      (x[28] = E),
      (x[29] = ge));
  else ge = x[29];
  let U;
  if (x[30] !== mainLoopModel || x[31] !== onDone)
    ((U = () => {
      if (mainLoopModelForSession.current) {
        return;
      }
      ((mainLoopModelForSession.current = !0),
        logEvent("tengu_model_command_menu", { action: lit("cancel") }),
        onDone(Pt(mainLoopModel), { display: "system" }));
    }),
      (x[30] = mainLoopModel),
      (x[31] = onDone),
      (x[32] = U));
  else U = x[32];
  let se;
  if (x[33] !== ne || x[34] !== kept.rows || x[35] !== ge || x[36] !== U)
    ((se = e(ModelPicker, {
      initial: ne,
      options: kept.rows,
      headerText: CLOUD_MODEL_PICKER_SUBTITLE,
      onSelect: ge,
      onCancel: U,
      isStandaloneCommand: !0,
    })),
      (x[33] = ne),
      (x[34] = kept.rows),
      (x[35] = ge),
      (x[36] = U),
      (x[37] = se));
  else se = x[37];
  return se;
}
//@ chunk-mvhmq2z8.js:26826-33595 layout
function SetModelFromArgs(r) {
  let O = w(72),
    {
      args: args,
      getMessages: getMessages,
      onDone: onDone,
      storageV5: storageV5,
      credentials: credentials,
      session: session,
    } = r,
    u = Cr(),
    A = useSetAppState(),
    { addNotification: addNotification } = useNotifications(),
    [D, x] = y(null),
    E;
  if (O[0] === MEMO_CACHE_SENTINEL) ((E = []), (O[0] = E));
  else E = O[0];
  let ie = R(E),
    [L, Q] = y(!1),
    _ = R(null),
    [q, le] = y(null),
    [Ee] = y(yn),
    z = R(!1),
    ne = R(!1),
    ge = R(0),
    Se = R(null),
    de = R(!1),
    Ce;
  if (
    O[1] !== addNotification ||
    O[2] !== onDone ||
    O[3] !== session ||
    O[4] !== A ||
    O[5] !== storageV5 ||
    O[6] !== u
  )
    ((Ce = (U, se) => {
      let De = !wt();
      x(null);
      let Pe = !1;
      let We = () => {
        let Le = saveModelSwitch(
          session,
          U,
          () => u.getState(),
          A,
          De,
          "command",
          se,
          storageV5,
          (xt) => {
            Pe = xt?.kind === "failed";
          },
        );
        let tt = Ge(void 0, A, storageV5);
        if (se !== void 0 && U !== null)
          addNotification({
            key: `model-restricted-${U}`,
            kind: "warning",
            text: formatModelRestrictedNotice(se, U),
            priority: "immediate",
          });
        return (notifyModelDeprecation(U, addNotification), Le.then(($t) => $t + tt));
      };
      let ot = bk(u.getState());
      let st = De
        ? savedModelPickReply(
            U,
            {
              getAppState: () => u.getState(),
              setAppState: A,
              session: session,
              storageV5: storageV5,
              options: { mcpClients: [] },
            },
            () => We().then((nt) => (Pe ? { unsaved: nt } : nt)),
            {
              persistsOffBox: () => isBridgeOrTransport(session),
              hasModelMoved: () => bk(u.getState()) !== ot,
            },
          )
        : We().then(kn);
      let Ke = ie.current;
      ((ie.current = []),
        st.then(
          (Te) => {
            let { text: text, isRefusal: isRefusal, rewrittenTo: rewrittenTo } = Te;
            return isRefusal
              ? onDone(text, { display: "system" })
              : onDone(
                  Ke.length > 0 && rewrittenTo === void 0
                    ? `${text}
${Ke.map(Nf).join(`
`)}`
                    : text,
                );
          },
          (It) => {
            (logError(toError(It)),
              onDone(`Model switch failed: ${Nf(errorMessage(It))}`, { display: "system" }));
          },
        ));
    }),
      (O[1] = addNotification),
      (O[2] = onDone),
      (O[3] = session),
      (O[4] = A),
      (O[5] = storageV5),
      (O[6] = u),
      (O[7] = Ce));
  else Ce = O[7];
  let s = Ce,
    Te;
  if (O[8] !== s || O[9] !== getMessages || O[10] !== u)
    ((Te = (M, I, Y) => {
      let state = u.getState();
      if (
        !Y &&
        useMainLoopModel_2(
          M,
          state.mainLoopModel,
          state.mainLoopModelForSession,
          state.cacheMissAckedAtOutputTokens,
          lastMainThreadResponse(getMessages()),
        )
      ) {
        x({ model: M, substitutedFrom: I, vettedFrom: bk(u.getState()) });
        return;
      }
      s(M, I);
    }),
      (O[8] = s),
      (O[9] = getMessages),
      (O[10] = u),
      (O[11] = Te));
  else Te = O[11];
  let V = Te,
    J;
  if (O[12] !== V || O[13] !== onDone || O[14] !== session || O[15] !== u)
    ((J = (B, xe) => {
      let abortController = new AbortController();
      ((_.current = abortController),
        Q(!0),
        serializeModelSwitch(session, () =>
          runPreModelSwitchHooks(session, u.getState, B, "command", { signal: abortController.signal }),
        )
          .then((re) => {
            if ((Q(!1), abortController.signal.aborted)) {
              return;
            }
            if (((ie.current = re.messages), re.decision === "block")) {
              (logFeatureSad("model_switch", "blocked_by_hook"),
                onDone(preModelSwitchBlockedMessage(B, re.reason, re.messages), { display: "system" }));
              return;
            }
            if (re.decision === "ask") {
              x({
                model: B,
                substitutedFrom: xe,
                hookReason: re.reason ?? "Confirm switching the model",
                vettedFrom: bk(u.getState()),
              });
              return;
            }
            V(B, xe, re.skipConfirm);
          })
          .catch((vo) => {
            if ((Q(!1), abortController.signal.aborted)) {
              return;
            }
            (logError(toError(vo)),
              onDone(`Model switch failed: ${Nf(errorMessage(vo))}`, { display: "system" }));
          }));
    }),
      (O[12] = V),
      (O[13] = onDone),
      (O[14] = session),
      (O[15] = u),
      (O[16] = J));
  else J = O[16];
  let Me = J,
    Ro;
  if (
    O[17] !== addNotification ||
    O[18] !== args ||
    O[19] !== credentials ||
    O[20] !== onDone ||
    O[21] !== Me ||
    O[22] !== session ||
    O[23] !== A ||
    O[24] !== storageV5
  )
    ((Ro = () => {
      let Vt = Jn();
      if (Vt && ml()) {
        switchMainLoopModelSafe(args, storageV5, credentials).then((he) => {
          if (z.current) {
            return;
          }
          if (!he.ok) {
            ((de.current = !0), onDone(he.message, { display: "system" }));
            return;
          }
          if (he.model !== null && lue(he.model)) {
            (logFeatureSad("model_fable_consent", "remote_thin_client_blocked"),
              (de.current = !0),
              onDone(
                `${renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(he.model))} uses usage credits, and this cloud session can\u2019t show the consent prompt yet \xB7 switch models from the workspace, or consent once in a local session first`,
                { display: "system" },
              ));
            return;
          }
          let model = he.model;
          return Vt.sendControlRequest({ subtype: "set_model", model: model ?? void 0 })
            .then(() => {
              let Bt = !1;
              if (
                (A(
                  (it) => (
                    (Bt = isFastModeEnabled() && !!it.fastMode && !isFastModeActive(model, it.fastMode)),
                    zE(session, it, model, "command"),
                    {
                      ...it,
                      mainLoopModel: model,
                      mainLoopModelForSession: null,
                      ...(Bt && { fastMode: !1 }),
                    }
                  ),
                ),
                Bt)
              )
                reportFastModeToggle(!0, !1);
              if ((refreshRemoteModelList(we.of(session.host), Vt, "switch"), z.current)) {
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
              if (he.substitutedFrom !== void 0 && model !== null)
                addNotification({
                  key: `model-restricted-${model}`,
                  kind: "warning",
                  text: formatModelRestrictedNotice(he.substitutedFrom, model),
                  priority: "immediate",
                });
              if (he.substitutedFrom !== void 0) logFeatureSad("model_switch", "family_alias_stepped_down");
              else logFeatureOk("model_switch");
              ((de.current = !0),
                onDone(
                  model === null
                    ? "Reset model to the workspace default"
                    : `${SET_MODEL_PREFIX}${toInlineCode(renderModelLabel(model))}`,
                ));
            })
            .catch((Yt) => {
              if ((logForDebugging(`[remote] set_model rejected: ${errorMessage(Yt)}`), z.current)) {
                return;
              }
              let So = Yt instanceof ControlRequestTimeoutError;
              (logFeatureBad("model_switch", So ? "timeout" : "remote_rejected"),
                (de.current = !0),
                onDone(
                  So
                    ? `${CLOUD_SWITCH_NO_RESPONSE_PREFIX}${toInlineCode(args)} may still have been applied`
                    : `${CLOUD_SWITCH_FAILED_PREFIX}${toInlineCode(args)}: ${Nf(errorMessage(Yt))}`,
                  { display: "system" },
                ));
            });
        });
        return;
      }
      switchMainLoopModelSafe(args, storageV5, credentials, { acceptCreditsRequired: !0 }).then((ye) => {
        if (!ye.ok) {
          onDone(ye.message, { display: "system" });
          return;
        }
        if (WKn(ye.model)) {
          ((ne.current = !1),
            (ge.current = ge.current + 1),
            le({ model: ye.model, substitutedFrom: ye.substitutedFrom }));
          return;
        }
        if (ye.creditsRefusal !== void 0) {
          onDone(ye.creditsRefusal, { display: "system" });
          return;
        }
        Me(ye.model, ye.substitutedFrom);
      });
    }),
      (O[17] = addNotification),
      (O[18] = args),
      (O[19] = credentials),
      (O[20] = onDone),
      (O[21] = Me),
      (O[22] = session),
      (O[23] = A),
      (O[24] = storageV5),
      (O[25] = Ro));
  else Ro = O[25];
  let Co;
  if (
    O[26] !== args ||
    O[27] !== credentials ||
    O[28] !== onDone ||
    O[29] !== Me ||
    O[30] !== A ||
    O[31] !== storageV5
  )
    ((Co = [args, onDone, A, Me, storageV5, credentials]),
      (O[26] = args),
      (O[27] = credentials),
      (O[28] = onDone),
      (O[29] = Me),
      (O[30] = A),
      (O[31] = storageV5),
      (O[32] = Co));
  else Co = O[32];
  if ((P(Ro, Co), Ee)) {
    const K = `Switching the cloud session to ${args}\u2026`;
    let X;
    if (O[33] !== args || O[34] !== onDone)
      ((X = () => {
        if (de.current) {
          return;
        }
        ((de.current = !0),
          (z.current = !0),
          logFeatureSad("model_switch", "remote_wait_cancelled"),
          onDone(
            `Stopped waiting for the cloud session \u2014 you\u2019ll get a notice if the switch to ${args} still lands`,
            { display: "system" },
          ));
      }),
        (O[33] = args),
        (O[34] = onDone),
        (O[35] = X));
    else X = O[35];
    let ae;
    if (O[36] !== K || O[37] !== X)
      ((ae = e(PromptDialog, { message: K, onCancel: X })), (O[36] = K), (O[37] = X), (O[38] = ae));
    else ae = O[38];
    return ae;
  }
  if (q) {
    let { model: model, substitutedFrom: substitutedFrom } = q;
    let lt, Do, Ue, K, X;
    if (O[39] !== model)
      ((Ue = parseUserSpecifiedModel(model ?? getDefaultMainLoopModelSetting())),
        (Do = ge.current),
        (lt = FableUsageCreditsConsent),
        (K = "picker"),
        (X = renderUsageCreditsOnlyModelName(Ue)),
        (O[39] = model),
        (O[40] = lt),
        (O[41] = Do),
        (O[42] = Ue),
        (O[43] = K),
        (O[44] = X));
    else ((lt = O[40]), (Do = O[41]), (Ue = O[42]), (K = O[43]), (X = O[44]));
    let ae;
    if (O[45] !== model || O[46] !== onDone || O[47] !== Me || O[48] !== u || O[49] !== substitutedFrom)
      ((ae = (Oo, Rn) => {
        if (Do !== ge.current) {
          return !1;
        }
        if (ne.current) {
          return !1;
        }
        if (((ne.current = !0), le(null), Oo === "consent")) {
          Me(model, substitutedFrom);
          return;
        }
        if (Oo === "upgrade") {
          onDone(void 0, { display: "skip", nextInput: "/upgrade", submitNextInput: !0 });
          return;
        }
        onDone(
          Rn ?? `${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(useMainLoopModel_3(u.getState())))}`,
          { display: "system" },
        );
      }),
        (O[45] = model),
        (O[46] = onDone),
        (O[47] = Me),
        (O[48] = u),
        (O[49] = substitutedFrom),
        (O[50] = ae));
    else ae = O[50];
    let Fo;
    if (O[51] !== lt || O[52] !== Ue || O[53] !== K || O[54] !== X || O[55] !== ae)
      ((Fo = e(lt, { variant: K, modelName: X, model: Ue, onDone: ae })),
        (O[51] = lt),
        (O[52] = Ue),
        (O[53] = K),
        (O[54] = X),
        (O[55] = ae),
        (O[56] = Fo));
    else Fo = O[56];
    return Fo;
  }
  if (D) {
    let K;
    if (O[57] !== s || O[58] !== onDone || O[59] !== D || O[60] !== u)
      ((K = () => {
        if (Se.current === D) {
          return;
        }
        if (((Se.current = D), D.vettedFrom !== void 0 && bk(u.getState()) !== D.vettedFrom)) {
          onDone("The model changed while you were confirming; pick again", { display: "system" });
          return;
        }
        s(D.model, D.substitutedFrom);
      }),
        (O[57] = s),
        (O[58] = onDone),
        (O[59] = D),
        (O[60] = u),
        (O[61] = K));
    else K = O[61];
    let X;
    if (O[62] !== onDone || O[63] !== u)
      ((X = () =>
        onDone(`${KEPT_MODEL_PREFIX}${toInlineCode(renderModelLabel(useMainLoopModel_3(u.getState())))}`, {
          display: "system",
        })),
        (O[62] = onDone),
        (O[63] = u),
        (O[64] = X));
    else X = O[64];
    let ae;
    if (O[65] !== D.hookReason || O[66] !== D.model || O[67] !== K || O[68] !== X)
      ((ae = e(ModelEffortSwitchConfirm, {
        kind: "model",
        model: D.model,
        effort: void 0,
        hookReason: D.hookReason,
        onConfirm: K,
        onCancel: X,
      })),
        (O[65] = D.hookReason),
        (O[66] = D.model),
        (O[67] = K),
        (O[68] = X),
        (O[69] = ae));
    else ae = O[69];
    return ae;
  }
  if (L) {
    let K;
    if (O[70] !== onDone)
      ((K = e(PromptDialog, {
        message: "Running PreModelSwitch hooks\u2026",
        onCancel: () => {
          (_.current?.abort(), Q(!1), onDone("Model switch cancelled", { display: "system" }));
        },
      })),
        (O[70] = onDone),
        (O[71] = K));
    else K = O[71];
    return K;
  }
  return null;
}
//@ chunk-mvhmq2z8.js:33595-33776 layout
function notifyModelDeprecation(r, o) {
  let i = getDeprecationStatusLine(r);
  if (!i) return;
  o({
    key: "model-deprecation-warning",
    kind: "warning",
    text: i,
    color: "warning",
    priority: "immediate",
    invalidates: ["model-deprecation-warning"],
  });
}
//@ chunk-mvhmq2z8.js:33776-33941 callgraph-fingerprint = SetModelAndClose (0.23)
function SetModelAndClose(r) {
  let { onDone: onDone } = r,
    isFastMode = useAppState(wn),
    n = useAppState(An),
    C = useAppState(_n),
    h = useAppState(vn);
  return (
    onDone(
      ShowModelAndClose({
        mainLoopModel: isFastMode,
        mainLoopModelForSession: n,
        sessionEffort: C,
        settingsEffortTable: h,
      }),
    ),
    null
  );
}
/**
 * /model 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-mvhmq2z8.js:33941-34964 fingerprint = call (0.691)
var call = async (onDone, context, args) => {
  if (((args = args?.trim() || ""), vDi(args)))
    return (
      logEvent("tengu_model_command_inline_help", { args: fromEnum(args) }),
      e(SetModelAndClose, { onDone: onDone })
    );
  if (COMMON_HELP_ARGS.includes(args)) {
    onDone("Run /model to open the model selection menu, or /model [modelName] to set the model.", {
      display: "system",
    });
    return;
  }
  if (args)
    return (
      logEvent("tengu_model_command_inline", { args_hash: gn(args), args_length: args.length }),
      e(SetModelFromArgs, {
        args: args,
        getMessages: () => context.getMessages?.() ?? context.messages,
        onDone: onDone,
        storageV5: context.storageV5,
        credentials: context.credentials,
        session: context.session,
      })
    );
  if (Jn()) {
    if (_C("modelCatalog") && ml()) {
      let n = cachedRemoteModelListWithDefault(we.of(context.session.host), Jn()?.sessionId);
      if (n !== null)
        return e(ModelPickerWrapper, {
          kept: n,
          getMessages: () => context.getMessages?.() ?? context.messages,
          onDone: onDone,
          storageV5: context.storageV5,
          credentials: context.credentials,
          session: context.session,
        });
      return e(CloudModelPickerLoader, {
        getMessages: () => context.getMessages?.() ?? context.messages,
        onDone: onDone,
        storageV5: context.storageV5,
        credentials: context.credentials,
        session: context.session,
      });
    }
    onDone(CLOUD_MODEL_PICKER_UNAVAILABLE, { display: "system" });
    return;
  }
  return e(LocalModelPicker, {
    onDone: onDone,
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
/**
 * 判断切到带 [1m] 的别名是否有问题：1M 上下文被禁用、目标模型不支持 1M、或模式相关的设置没有对应的 1M 变体；正常返回 null。
 */
//@ chunk-d1cgs5na.js:12136-12407 placement
function diagnose1mAliasSwitch(e) {
  let trimmed = e.toLowerCase().trim(),
    s = Lt(trimmed);
  if (s === trimmed || !isAliasSpelling(trimmed)) return null;
  if (is1mContextDisabled()) return { kind: "disabled" };
  let found = renderDefaultModelSetting(trimmed).find((n) => isKnownNon1mTarget(n));
  if (found !== void 0) return { kind: "unsupported", carrier: Lt(found) };
  if (isModeDependentModelSetting(s) && planModeConstituentFamily(trimmed) === null)
    return { kind: "noModeDependentVariant" };
  return null;
}
//@ chunk-d1cgs5na.js:12407-12554 fingerprint = isOpus1mUnavailable (1)
function isOpus1mUnavailable(model) {
  let lower = model.toLowerCase();
  if (!(lower.includes("opus") && lower.includes("[1m]"))) return !1;
  if (renderDefaultModelSetting(model).every((s) => modelHasNative1MContext(s))) return !1;
  return !shouldProbeThirdPartyDefaults() && !isOpus1mMergeEnabled();
}
/**
 * 判断 sonnet[1m]/opusplan[1m] 这类设置是否需要额外检查 1M 资格：排除旧版 sonnet、原生支持 1M 的模型以及第三方默认探测场景。
 */
//@ chunk-d1cgs5na.js:12651-12852 placement
function requires1mEntitlementCheck(e) {
  let lower = e.toLowerCase();
  if (!((lower.includes("sonnet") && lower.includes("[1m]")) || lower.trim() === "opusplan[1m]")) return !1;
  if (LEGACY_SONNET_MODELS.has(getCanonicalName(lower.trim(), { identity: !0 }))) return !1;
  if (modelHasNative1MContext(parseUserSpecifiedModel(e))) return !1;
  return !shouldProbeThirdPartyDefaultsAlt();
}
//@ chunk-d1cgs5na.js:12852-12887 placement
function aue(e) {
  return parseUserSpecifiedModel(e ?? getDefaultMainLoopModelSetting());
}
//@ chunk-d1cgs5na.js:12887-13152 placement = useMainLoopModel (0.833)
function useMainLoopModel(e, o, s, a, n) {
  if (n === void 0) return !1;
  let l = getTotalOutputTokens();
  if (l === 0 || l === a) return !1;
  let mainLoopModel = Bn(aue(e));
  if (mainLoopModel === Bn(aue(useMainLoopModel_2_2({ mainLoopModel: o, mainLoopModelForSession: s }))))
    return !1;
  let c = n.response?.message.model;
  return !(
    typeof c === "string" &&
    (c === mainLoopModel || getServedModelsForRequestedModel(mainLoopModel)?.has(c) === !0)
  );
}
//@ chunk-d1cgs5na.js:13152-13461 fingerprint = ShowModelAndClose (0.354)
function ShowModelAndClose(t0) {
  let mainLoopModel = toInlineCode(renderModelLabel(t0.mainLoopModel)),
    mainLoopModelForSession = resolveEffortLevel(t0),
    a = mainLoopModelForSession !== void 0 ? ` (effort: ${mainLoopModelForSession})` : "",
    n = getModelSwitchTarget(t0.mainLoopModelForSession, t0.mainLoopModel);
  if (n !== null)
    return `${CURRENT_MODEL_PREFIX}${toInlineCode(renderModelLabel(n))} (this session only)${a}
Base model: ${mainLoopModel}`;
  let l = getActiveModelFallback(),
    r =
      l !== void 0 ? ` (${describeAutoSwitchedModel(toInlineCode(renderModelLabel(l.previousModel)))})` : "";
  return `${CURRENT_MODEL_PREFIX}${mainLoopModel}${r}${a}`;
}
//@ chunk-18hwfzwa.js:929434-929487 fingerprint = _temp2 (1)
function wuo(s_0) {
  return s_0.mainLoopModelForSession;
}
const useMainLoopModel_2 = useMainLoopModel; //@ cross-chunk alias

export {
  ShowModelAndClose,
  wuo,
  aue,
  renderModelLabel,
  diagnose1mAliasSwitch,
  isOpus1mUnavailable,
  requires1mEntitlementCheck,
};
