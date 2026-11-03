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
import { Lt, Nb, E8, Bn } from "../../utils/model/modelIds.js";
import { getCatalogEntry, catalogIdForProviderModelId, WK } from "../../utils/model/modelCatalog.js";
import {
  isDeploymentVouchedModel,
  stepDownRestrictedFamilyAliasPick,
  planModeConstituentFamily,
} from "../../utils/model/planModeModel.js";
import { buildModelPickerOptions } from "../../utils/model/modelOptions.js";
import { hwi } from "../../utils/model/modelCatalog/catalogCapabilities.js";
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
import { has1mSuffix } from "../../utils/model/contextWindow1m.js";
import {
  Xto,
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
  jKn,
  runPreModelSwitchHooks,
  describeModelSwitchBlocked,
  Nf,
} from "../../commands/model/modelSwitch.js";
import { zE } from "../../utils/model/modelSwitchHooks.js";
import { C9o, withClientDataReseedOnModelChange, Qsr } from "../../bridge/bridgeEnabled.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import {
  $f,
  getSchedulingPlugin,
  enqueueCommand,
  MXs,
  kb,
  SVe,
  OXs,
  dhn,
  chn,
  oO,
} from "../../utils/messageQueueManager.js";
import { holdQueuedInput, xZ, kBr, countHeldCommands, RZ } from "../../plugins/functionHooks/inputHold.js";
import { Km } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import { lp } from "../../plugins/functionHooks/surfaceBinding.js";

/**
 * 判断模型名是否可识别（第一方时与目录比对），返回形状分类。
 */
//@ chunk-0sfjpx19.js:25022-25465 placement
function recognizeModelName(e) {
  let trimmed = e.trim();
  if (!trimmed) return { recognized: !1, shape: "empty" };
  if (getAPIProvider() !== "firstParty" || !isFirstPartyAnthropicBaseUrl()) return { recognized: !0 };
  let lower = trimmed.toLowerCase(),
    trimmed_2 = Lt(lower).trim();
  if (Nb(lower) || Nb(trimmed_2)) return { recognized: !0 };
  if (getCatalogEntry(trimmed_2) || catalogIdForProviderModelId(trimmed_2)) return { recognized: !0 };
  if (isDeploymentVouchedModel(trimmed)) return { recognized: !0 };
  if (buildModelPickerOptions().some((h) => h.value === trimmed)) return { recognized: !0 };
  if (hwi(trimmed_2) !== void 0) return { recognized: !0 };
  if (/^claude-\S+$/.test(lower)) return { recognized: !0 };
  return { recognized: !1, ...formatModelDisplayName(trimmed) };
}
//@ chunk-0sfjpx19.js:25465-25827 placement
function formatModelDisplayName(e) {
  let trimmed = e.replace(/^\[(.+)\]$/s, "$1").trim(),
    found = WK().models.find((model) => model.display_name.toLowerCase() === trimmed.toLowerCase());
  if (found) return { shape: "display_name", suggestion: found.id };
  if (/^\d+$/.test(e)) return { shape: "numeric" };
  if (e.startsWith("[")) return { shape: "bracketed", ...suggestModelName(trimmed) };
  if (/\s/.test(e)) return { shape: "whitespace", ...suggestModelName(e) };
  return { shape: "other", ...suggestModelName(e) };
}
//@ chunk-0sfjpx19.js:25827-25941 placement
function suggestModelName(e) {
  let n = [...E8, ...WK().models.map((model) => model.id)],
    [r] = similarNames(e.toLowerCase(), n, 1);
  return r ? { suggestion: r } : {};
}
//@ chunk-0sfjpx19.js:25941-26139 placement
function formatUnknownModelHint(e, n) {
  let r = artifactPathPrefix("model"),
    s =
      n !== void 0
        ? ` Did you mean '${n}'?`
        : r
          ? ` Run ${r} to see available models.`
          : " Switch to a different model.";
  return `Model "${e}" is not a recognized model id.${s}`;
}
//@ chunk-0sfjpx19.js:26139-26202 placement
function Okr(e) {
  return e !== void 0 && (isExemptDefaultResolvingPick(e) || isModelAllowed(e))
    ? parseUserSpecifiedModel(e)
    : void 0;
}
//@ chunk-0sfjpx19.js:26202-26562 placement
function buildModelSwitchNotice({
  messages: messages,
  queriedInProcess: queriedInProcess,
  activeModel: activeModel,
}) {
  if (queriedInProcess && messages.some((s) => isHumanTurn_2(s) || assistantModelOf(s) !== void 0))
    return activeModel;
  for (let s = messages.length - 1; s >= 0; s--) {
    let h = messages[s];
    if (isCompactBoundaryMessage(h)) return;
    if (Kn(h)?.startsWith(MODEL_SET_STDOUT_PREFIX)) {
      let _ = messages[s - 1],
        b = _ === void 0 ? null : Kn(_),
        k =
          b !== null && extractTag(b, COMMAND_NAME)?.trim() === "/model"
            ? extractTag(b, COMMAND_ARGS)?.trim()
            : void 0;
      return k ? resolveEffortAfterModelSwitch(k) : void 0;
    }
    let y = assistantModelOf(h);
    if (y !== void 0) return y;
  }
  return;
}
/**
 * 判断切换模型后是否需要新的上下文：与会话模型规范名不同，或同一模型但 1M 后缀变化。
 */
//@ chunk-0sfjpx19.js:26562-26742 placement
function modelChangeNeedsNewContext({
  appliedModel: appliedModel,
  previousModel: previousModel,
  conversationModel: conversationModel,
}) {
  if (conversationModel === void 0) return !1;
  let s = parseUserSpecifiedModel(appliedModel),
    h = Ot(s);
  if (Ot(parseUserSpecifiedModel(conversationModel)) !== h) return !0;
  let y = parseUserSpecifiedModel(previousModel);
  return Ot(y) === h && has1mSuffix(y) !== has1mSuffix(s);
}
//@ chunk-0sfjpx19.js:26742-27152 placement
function classifyModelSwitch(e) {
  if (e.trim().toLowerCase() === "default") return { kind: "default" };
  let n = recognizeModelName(e);
  if (!n.recognized && !(n.shape === "other" && e.trim().length <= Xto))
    return { kind: "unrecognized", shape: n.shape, suggestion: n.suggestion };
  if (isExemptDefaultResolvingPick(e)) return { kind: "allowed", model: e };
  let r = isModelAllowedUnderActiveEnforcement(e);
  if (r ?? isModelAllowed(e)) return { kind: "allowed", model: e };
  let s = stepDownRestrictedFamilyAliasPick(e);
  return s === null ? { kind: "blocked", underEnforcement: r !== null } : { kind: "steppedDown", model: s };
}
//@ chunk-0sfjpx19.js:27152-27388 placement
function logUnrecognizedModelSwitch(e, n) {
  let r = recognizeModelName(e);
  if (r.recognized) return;
  return (
    logEvent("tengu_set_model_unrecognized", {
      shape: fromEnum(r.shape),
      had_suggestion: r.suggestion !== void 0,
      surface: n,
    }),
    logFeatureBad("model_switch", "unrecognized_model"),
    { ok: !1, error: formatUnknownModelHint(displayModelName(e), r.suggestion) }
  );
}
//@ chunk-0sfjpx19.js:27388-27463 placement
function It(e, n) {
  return (logFeatureBad("system_prompt_switch", n), { ok: !1, error: e, code: n });
}
/**
 * 处理 set_model 控制请求：校验类型、识别模型、切换主循环模型与系统提示词并回复（约 4 KB）。
 */
//@ chunk-0sfjpx19.js:27463-31684 placement
async function handleSetModelRequest(e, n) {
  let model = e.model;
  if (model != null && typeof model !== "string") {
    if ((logFeatureBad("model_switch", "invalid_model_type"), e.system_prompt !== void 0))
      logFeatureBad("system_prompt_switch", "model_switch_rejected");
    return { ok: !1, error: "set_model: model must be a string", code: "invalid_request" };
  }
  let system_prompt = e.system_prompt;
  if (system_prompt !== void 0 && (typeof system_prompt !== "string" || system_prompt === ""))
    return (
      logFeatureBad("system_prompt_switch", typeof system_prompt !== "string" ? "invalid_type" : "empty"),
      {
        ok: !1,
        error: "set_model: system_prompt must be a non-empty string when present",
        code: "invalid_request",
      }
    );
  let only_if_model_is_current = e.only_if_model_is_current;
  if (only_if_model_is_current !== void 0 && typeof only_if_model_is_current !== "boolean") {
    if ((logFeatureBad("model_switch", "invalid_only_if_model_is_current_type"), system_prompt !== void 0))
      logFeatureBad("system_prompt_switch", "model_switch_rejected");
    return {
      ok: !1,
      error: "set_model: only_if_model_is_current must be true, false or absent",
      code: "invalid_request",
    };
  }
  if (only_if_model_is_current === !0) {
    if (typeof system_prompt !== "string")
      return It(
        "set_model: when only_if_model_is_current is true, system_prompt is required.",
        "invalid_request",
      );
    let L = typeof model === "string" ? model : "";
    if (L.trim() === "" || L.trim().toLowerCase() === "default")
      return It(
        "set_model: when only_if_model_is_current is true, model must be a model name. It cannot be absent, empty or 'default'.",
        "invalid_request",
      );
    let oe = getMainLoopModel();
    if (
      !sameEffort(L, oe) ||
      !sameEffort(Okr(n.getActiveModel()) ?? oe, oe) ||
      planModeConstituentFamily(getUserSpecifiedModelSetting()) !== null
    )
      return It(
        "set_model: only_if_model_is_current is true, and the session cannot confirm that it runs the model named. The request changed nothing. Name the model that the session runs. If a turn is in progress, send the request again after that turn ends.",
        "model_not_current",
      );
    return (n.setSystemPrompt(system_prompt), logFeatureOk("system_prompt_switch"), { ok: !0 });
  }
  let y = model ?? "default",
    _ = classifyModelSwitch(y),
    b =
      _.kind === "blocked" && !_.underEnforcement
        ? await reprobeEntitlementDeny(y, n.storageV5, n.credentials)
        : void 0,
    k = b === "overturned" ? classifyModelSwitch(y) : _,
    w,
    S,
    T = !1;
  switch (k.kind) {
    case "unrecognized":
      if (
        (logEvent("tengu_set_model_unrecognized", {
          shape: fromEnum(k.shape),
          had_suggestion: k.suggestion !== void 0,
          surface: n.surface,
        }),
        logFeatureBad("model_switch", "unrecognized_model"),
        typeof system_prompt === "string")
      )
        logFeatureBad("system_prompt_switch", "model_switch_rejected");
      return {
        ok: !1,
        error: formatUnknownModelHint(displayModelName(y), k.suggestion),
        code: "catalog_unknown",
      };
    case "blocked": {
      let L = Okr(n.getActiveModel());
      if (
        (n.noticeRestrictedModel(y, L),
        logFeatureBad("model_switch", b === "probe_failed" ? "entitlement_probe_failed" : "not_allowed"),
        typeof system_prompt === "string")
      )
        logFeatureBad("system_prompt_switch", "model_switch_rejected");
      return {
        ok: !1,
        error: formatModelRestrictedNotice(y, L ?? getMainLoopModel()),
        code: b === "probe_failed" ? "check_failed" : "restricted_by_org",
      };
    }
    case "default": {
      let L = managedDenyStartupRefusal(getDefaultMainLoopModel(), "switch");
      if (L !== null) return { ok: !1, error: sanitizeTelemetryString(L), code: "restricted_by_org" };
      ((w = getDefaultMainLoopModel()), (S = null));
      break;
    }
    case "allowed": {
      if (isExemptDefaultResolvingPick(y)) {
        ((w = k.model), (S = null));
        break;
      }
      let L = await switchMainLoopModelSafe(y, n.storageV5, n.credentials, {
        deadlineMs: jKn,
        acceptSessionModeRefusal: !0,
        acceptSharedLimitRefusal: !0,
        ...(n.isLaunchModelPick?.() && { confirmWithServer: !1 }),
      });
      if (!L.ok) {
        if (typeof system_prompt === "string") logFeatureBad("system_prompt_switch", "model_switch_rejected");
        if (L.serverRefusedModel === !0 && n.dropUnconfirmedLaunchModel?.(y))
          logEvent("tengu_set_model_launch_model_dropped", { surface: n.surface, code: fromEnumOpt(L.code) });
        return {
          ok: !1,
          error: sanitizeTelemetryString(L.message),
          ...(L.code !== void 0 && { code: L.code }),
        };
      }
      ((w = L.model ?? getDefaultMainLoopModel()),
        (S = L.substitutedFrom !== void 0 ? w : null),
        (T = L.unconfirmed === !0));
      break;
    }
    case "steppedDown":
      ((w = k.model), (S = k.model));
      break;
  }
  let D = () => {
      let appState = n.readAppState();
      return {
        mainLoopModel: appState.mainLoopModel ?? n.getActiveModel() ?? getMainLoopModel(),
        mainLoopModelForSession: appState.mainLoopModelForSession,
        toolPermissionContext: appState.toolPermissionContext,
      };
    },
    E = k.kind === "default" ? null : w,
    N = await runPreModelSwitchHooks(n.session, D, E, "sdk");
  if (N.decision !== "proceed") {
    if ((logFeatureSad("model_switch", "blocked_by_hook"), typeof system_prompt === "string"))
      logFeatureBad("system_prompt_switch", "model_switch_rejected");
    return { ok: !1, error: describeModelSwitchBlocked(N), code: "blocked_by_hook" };
  }
  let G = getMainLoopModel(),
    activeModel = n.getActiveModel(),
    conversationModel = n.getConversationModel();
  if ((zE(n.session, D(), E, "sdk"), C9o())) {
    let L = withClientDataReseedOnModelChange(() => n.applyModel(w));
    if (getMainLoopModel() !== G) Qsr(n.storageV5, n.credentials, L);
  } else n.applyModel(w);
  if (
    (getMainLoopModel() !== G || parseUserSpecifiedModel(w) !== parseUserSpecifiedModel(activeModel ?? G)) &&
    modelChangeNeedsNewContext({
      appliedModel: w,
      previousModel: activeModel ?? G,
      conversationModel: conversationModel,
    })
  )
    n.injectModelSwitchBreadcrumbs(y, w);
  if ((n.recordAllowedModelApplied(), S !== null))
    (n.noticeRestrictedModel(y, S), logFeatureSad("model_switch", "family_alias_stepped_down"));
  else logFeatureOk("model_switch");
  if (typeof system_prompt === "string")
    (n.setSystemPrompt(system_prompt), logFeatureOk("system_prompt_switch"));
  return {
    ok: !0,
    ...(N.messages.length > 0 && { notices: N.messages.map(Nf) }),
    ...(T && { unconfirmed: !0 }),
  };
}
//@ chunk-0sfjpx19.js:31684-31797 placement
function assistantModelOf(e) {
  if (e.type !== "assistant") return;
  let n = e.message?.model;
  return typeof n === "string" && n !== SYNTHETIC_MODEL ? n : void 0;
}
//@ chunk-0sfjpx19.js:31797-31863 placement
function Kn(e) {
  return e.type === "user" ? getContentText(e.message?.content) : null;
}
//@ chunk-0sfjpx19.js:31863-31895 placement
function Ot(e) {
  return getCanonicalName(Bn(e));
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
var tmo = ge(to(), (e) => e.set(void 0));
//@ chunk-0sfjpx19.js:32087-32128 placement
var qn = new Set(["plugin", "coordinator"]);
//@ chunk-0sfjpx19.js:32128-32173 placement
function $t(e) {
  return $f(e) && getSchedulingPlugin(e) !== void 0;
}
//@ chunk-0sfjpx19.js:32173-32252 placement
function pi(e) {
  holdQueuedInput(
    () => enqueueCommand({ ...e, admissionExempt: "resurrected" }),
    e,
    () => MXs([e]),
  );
}
//@ chunk-0sfjpx19.js:32252-32349 placement
function nmo(e, n, r) {
  let s = $t(e) && xZ();
  if (s) Km(() => (qn.has(e.origin?.kind) ? r() : holdQueuedInput(n, e, r)));
  return s;
}
/**
 * 取消排队中的自动输入：清除待发的定时项，移除插件/协调器来源的排队消息，并取消其他可取消的项（轮次继续时保留部分）。
 */
//@ chunk-0sfjpx19.js:32349-32512 placement
function cancelQueuedAutoInputs({ turnGoesOn: e = !1 } = {}) {
  if (kBr())
    (Km(() => tmo.get()?.()),
      Km(() => kb((r) => $t(r) && qn.has(r.origin?.kind))),
      Km(() => SVe((r) => $t(r) && !(e && OXs(r))).forEach(pi)));
}
//@ chunk-0sfjpx19.js:32512-32548 placement
var rmo = ge(to(), (e) => e.set(void 0));
//@ chunk-0sfjpx19.js:32548-32875 placement
var MODEL_SWITCH_STATE = (e = {}) =>
  Km(() => {
    let n = lp(),
      r = new Set();
    if ((dhn.set(nmo), chn.set(countHeldCommands), n !== void 0))
      RZ.set({ session: new WeakRef(n), stoppedAt: performance.now(), sentBefore: r });
    (Km(() => (rmo.get()?.() ?? []).forEach((s) => r.add(s))),
      Km(() =>
        oO()
          .flatMap((s) => s.uuid ?? s.stopKey ?? s.handedOffTurn?.messages[0]?.uuid ?? [])
          .forEach((s) => r.add(s)),
      ),
      cancelQueuedAutoInputs(e));
  });
//@ chunk-0sfjpx19.js:32875-32896 placement
var Ci = 200,
  vi = 8,
  Qn = 2;
/**
 * 根据轮次状态（被钩子结束、对话框占用、本地轮次）决定排队提示 stand_by/wait/deliver。
 */
//@ chunk-0sfjpx19.js:32896-33717 placement
function decideQueuedPromptAction(e) {
  if (e.head === "ended_by_hook" || e.hasFoldTakenPrompt || !e.isLocalTurnActive)
    return { action: "stand_by" };
  if (e.isHeldByDialog) return { action: "wait", reason: "held_by_dialog" };
  if (e.head === "not_ready" || !e.isLocalTurnRunning) return { action: "wait", reason: "not_ready" };
  if (e.head === "behind_earlier") return { action: "wait", reason: "behind_earlier" };
  if (e.holderCount > e.unmovableHolderCount) return { action: "background" };
  if (e.isCompacting) return { action: "wait", reason: "compacting" };
  if (e.isAwaitingMovedResult) return { action: "wait", reason: "moved_result" };
  if (e.holderCount > 0 || e.isExecuting) {
    if (!e.isUnmovableGraceOver) return { action: "wait", reason: "unmovable_grace" };
    return e.isBackgroundingDisabled ? { action: "cancel" } : { action: "interrupt" };
  }
  if (!e.isMainRequestInFlight) return { action: "wait", reason: "not_sampling" };
  return { action: "interrupt" };
}

export {
  Ci,
  Qn,
  decideQueuedPromptAction,
  vi,
  Okr,
  logUnrecognizedModelSwitch,
  handleSetModelRequest,
  modelChangeNeedsNewContext,
  MODEL_SWITCH_STATE,
  buildModelSwitchNotice,
  rmo,
  tmo,
  nmo,
  cancelQueuedAutoInputs,
};
