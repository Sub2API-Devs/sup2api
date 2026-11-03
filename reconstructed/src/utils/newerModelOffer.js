/**
 * utils/newerModelOffer.ts
 *
 * 2.1.316 新增。更新模型提议判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (28)
 * attribution: placement 28
 */
import { j, P, Vc } from "../../vendor/react/cjs/react.production.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { NEWER_MODEL_OFFER as NEWER_MODEL_OFFER_2 } from "../components/nudges/nudgeIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, U, M, pe, E } from "../../vendor/zod/v4/classic/schemas.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { getBaselineModelSetting, preserve1mContextForRefusalFallback } from "./model/smallFastModel.js";
import { getDefaultMainLoopModel } from "./model/modelFallback.js";
import { parseUserSpecifiedModel, bytesPerTokenForModel, renderModelName } from "./model/modelDisplay.js";
import { parseModelId, K3e, Bn } from "./model/modelIds.js";
import { oR } from "../services/api/promptCacheBreakDetection.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { isFastModeSettingOn, supportsFastMode } from "./fastMode.js";
import { getInitialSettings_2 } from "./settings/settings.js";
import { MODEL_COSTS, getModelCosts } from "./modelCost.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isFirstPartyApiBackend } from "./model/providers.js";
import { announcementState } from "../services/announcements/announcementState.js";
import { pickStartupAnnouncement } from "../services/startupAnnouncements.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./model/telemetryModelName.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SegmentedText } from "../components/PromptInput/Notifications.js";
import { isWithinRecentInput } from "../hooks/useRecentInputGuard.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { isUnattendedInteractiveSession } from "./concurrentSessions.js";
import { getMainLoopModelFromState } from "../hooks/useMainLoopModel.js";
import { createDependencyWatcher } from "../cli/print/rewindStandIn.js";
import { logError } from "./log.js";
import { createSystemMessage } from "./messages.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { serializeModelSwitch } from "./model/modelSwitchHooks.js";
import {
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  saveModelSwitch,
  Nf,
} from "../commands/model/modelSwitch.js";

//@ chunk-18hwfzwa.js:348815-348819 placement
j();
//@ chunk-18hwfzwa.js:348819-348982 placement
var resumeOnNewerModelDialogDef = withHideWhile({
  kind: NEWER_MODEL_OFFER_2,
  payload: DoctorLazy(() => u({ from: o(), to: o() })),
  result: DoctorLazy(() => U(["resume_on_newer_model", "keep", "dismiss", "cancelled"])),
  default: "cancelled",
  hideWhile: [],
});
//@ chunk-18hwfzwa.js:348982-349024 placement
function YH(h) {
  return getCanonicalName(h, { identity: !0 });
}
/**
 * 判断是否提示改用更新的模型：当前模型与基线模型同族且更新、无后缀，且对话中尚未用过基线模型、也没有发生拒绝回退时，返回保留 1M 上下文后的建议模型。
 */
//@ chunk-18hwfzwa.js:349024-349417 placement
function findNewerModelOffer(h, x) {
  let D = getBaselineModelSetting(),
    L = D === void 0 || D === null ? getDefaultMainLoopModel() : parseUserSpecifiedModel(D),
    ee = parseModelId(x),
    ke = parseModelId(L);
  if (
    !ee ||
    !ke ||
    ee.trailer !== void 0 ||
    ke.trailer !== void 0 ||
    ee.family !== ke.family ||
    K3e(ke, ee) <= 0
  )
    return;
  let Re = YH(L);
  for (let Be of h) {
    if (Be?.type === "assistant" && typeof Be.message?.model === "string" && YH(Be.message.model) === Re)
      return;
    if (Be?.type === "system" && Be.subtype === "model_refusal_fallback") return;
  }
  return preserve1mContextForRefusalFallback(x, L);
}
//@ chunk-18hwfzwa.js:349417-349430 placement
var EBt = 2 * oR;
//@ chunk-18hwfzwa.js:349430-349677 placement
function lastAssistantModelBefore(h) {
  let last = h.findLast(
    (D) =>
      (D?.type === "user" && !D.isMeta && D.toolDenialKind !== "interrupted") ||
      (D?.type === "assistant" && D.message?.model !== SYNTHETIC_MODEL) ||
      (D?.type === "system" && D.subtype === "away_summary"),
  );
  return Date.now() - Date.parse(last?.timestamp ?? "") >= EBt;
}
//@ chunk-18hwfzwa.js:349677-350020 placement
function fastModeCostDelta({ from: from, to: to }) {
  let D = isFastModeSettingOn(getInitialSettings_2()),
    L = (Be) =>
      MODEL_COSTS[YH(Be)] &&
      getModelCosts(Be, { ...EMPTY_USAGE, speed: D && supportsFastMode(Be) ? "fast" : "standard" }),
    ee = L(from),
    ke = L(to),
    Re = bytesPerTokenForModel(from) / bytesPerTokenForModel(to);
  return (
    ee !== void 0 &&
    ke !== void 0 &&
    ke.inputTokens * Re <= ee.inputTokens &&
    ke.promptCacheWriteTokens * Re <= ee.promptCacheWriteTokens &&
    (ke.promptCacheWrite1hTokens ?? 0) * Re <= (ee.promptCacheWrite1hTokens ?? 1 / 0)
  );
}
//@ chunk-18hwfzwa.js:350020-350060 placement
var VWe = { maxAsks: 2, minHoursBetween: 168 };
//@ chunk-18hwfzwa.js:350060-350249 placement
function isOfferThrottled(h, x) {
  let D = getGlobalConfig().newerModelAsks ?? {},
    L = D[YH(h.to)],
    max = Math.max(0, ...Object.values(D).map((ke) => ke.lastAskedAt));
  return (L?.asks ?? 0) >= x.maxAsks || Date.now() - max < x.minHoursBetween * oR;
}
//@ chunk-18hwfzwa.js:350249-350433 placement
var NEWER_MODEL_OFFER_CONFIG_SCHEMA = DoctorLazy(() =>
  u({
    enabled: M(),
    form: U(["line", "dialog"]).optional(),
    families: pe(o(), M()).optional(),
    maxAsks: E().optional(),
    minHoursBetween: E().optional(),
    words: pe(o(), o()).optional(),
  }),
);
//@ chunk-18hwfzwa.js:350433-350508 placement
function newerModelOfferConfig() {
  return NEWER_MODEL_OFFER_CONFIG_SCHEMA().safeParse(
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_hidden_volcano", null),
  ).data;
}
//@ chunk-18hwfzwa.js:350508-351117 placement
function shouldOfferNewerModel(h, x) {
  if (getGlobalConfig().resumeReturnDismissed || !isFirstPartyApiBackend()) return;
  let D = findNewerModelOffer(h, x);
  if (D === void 0 || !lastAssistantModelBefore(h)) return;
  let L = { from: x, to: D },
    ee = JWe(x),
    announcementSlotWinner = announcementState().announcementSlotWinner;
  if (
    !fastModeCostDelta(L) ||
    h.some((He) => He?.type === "system" && He.subtype === "informational" && He.content === ee) ||
    (announcementSlotWinner
      ? announcementSlotWinner.id === "startup-announcement"
      : pickStartupAnnouncement(!1) !== void 0)
  )
    return;
  let Re = newerModelOfferConfig();
  if (
    !Re ||
    Re.families?.[parseModelId(D)?.family ?? ""] === !1 ||
    isOfferThrottled(L, {
      maxAsks: Re.maxAsks ?? VWe.maxAsks,
      minHoursBetween: Re.minHoursBetween ?? VWe.minHoursBetween,
    })
  )
    return;
  if (!Re.enabled) {
    logNewerModelSuggestion("held_out", L);
    return;
  }
  if (Re.form === void 0) return;
  let Be = { ...L, form: Re.form };
  return (logNewerModelSuggestion("offered", Be), Be);
}
//@ chunk-18hwfzwa.js:351117-351149 placement
function sz(h) {
  return renderModelName(Bn(h));
}
//@ chunk-18hwfzwa.js:351149-351468 placement
var NEWER_MODEL_OFFER_COPY = {
  lead: "You\u2019re resuming {an} {older} session.",
  text: "Press `{key}` to continue with `{newer}`.",
  title: "You\u2019re resuming {an} {older} session. Continue with {newer}?",
  accept: "Continue with {newer}",
  decline: "Keep {older}",
  accepted: "Continuing with {newer}, your default model \xB7 /model to switch back",
};
//@ chunk-18hwfzwa.js:351468-351756 placement
function fillNewerModelCopy({ from: from, to: to }, D = "") {
  let L = newerModelOfferConfig()?.words,
    ee = (Re) =>
      Re.replaceAll("{an}", /^[aeiou]/i.test(sz(from)) ? "an" : "a")
        .replaceAll("{older}", sz(from))
        .replaceAll("{newer}", sz(to))
        .replaceAll("{key}", D),
    ke = {};
  for (let Re of Object.keys(NEWER_MODEL_OFFER_COPY)) ke[Re] = ee(L?.[Re] ?? NEWER_MODEL_OFFER_COPY[Re]);
  return { ...ke, declined: JWe(from) };
}
//@ chunk-18hwfzwa.js:351756-351828 placement
function JWe(h) {
  return `Staying on ${sz(h)} \xB7 /model to switch later`;
}
//@ chunk-18hwfzwa.js:351828-351956 placement
function logNewerModelSuggestion(h, { from: from, to: to, form: form }) {
  logEvent("tengu_newer_model_suggestion", {
    action: fromEnum(h),
    form: fromEnumOpt(form),
    from_model: telemetrySafeModelName(from),
    to_model: telemetrySafeModelName(to),
  });
}
//@ chunk-18hwfzwa.js:351956-352239 placement
function recordNewerModelAsk(h, x, D) {
  if ((logNewerModelSuggestion(h, x), h !== "shown" && h !== "accepted")) return;
  let L = YH(x.to);
  saveGlobalConfig((ee) => {
    let ke = ee.newerModelAsks?.[L] ?? { asks: 0, lastAskedAt: 0 };
    return {
      ...ee,
      newerModelAsks: {
        ...ee.newerModelAsks,
        [L]: h === "accepted" ? { asks: 0, lastAskedAt: 0 } : { asks: ke.asks + 1, lastAskedAt: Date.now() },
      },
    };
  }, D);
}
//@ chunk-18hwfzwa.js:352239-352243 placement
j();
//@ chunk-18hwfzwa.js:352243-352479 placement
function NewerModelOfferLine(h) {
  let $ = w(5),
    { segments: segments, onScreen: onScreen } = h,
    ee,
    ke;
  if ($[0] !== onScreen)
    ((ee = () => (onScreen(!0), () => onScreen(!1))),
      (ke = [onScreen]),
      ($[0] = onScreen),
      ($[1] = ee),
      ($[2] = ke));
  else ((ee = $[1]), (ke = $[2]));
  P(ee, ke);
  let Re;
  if ($[3] !== segments) ((Re = e(SegmentedText, { segments: segments })), ($[3] = segments), ($[4] = Re));
  else Re = $[4];
  return Re;
}
//@ chunk-18hwfzwa.js:352479-352520 placement
var NEWER_MODEL_OFFER = "newer-model-offer",
  BBt = 60000,
  lO;
//@ chunk-18hwfzwa.js:352520-352554 placement
function Sv() {
  (lO?.end(), (lO = void 0));
}
/**
 * 若已绘出的新模型提议不在最近输入期间，则取走该提议并清除绘制状态，返回是否取走。
 */
//@ chunk-18hwfzwa.js:352554-352659 placement
function takeDrawnOffer(h, x) {
  if (lO?.drawnAt === void 0 || isWithinRecentInput(h, lO.drawnAt, x)) return !1;
  let { take: take } = lO;
  return (Sv(), take(), !0);
}
//@ chunk-18hwfzwa.js:352659-352869 placement
async function useDefaultToNewerModelKey(h, x) {
  let { store: store } = x,
    L = getShortcutDisplay("chat:defaultToNewerModel", "Chat", "ctrl+y"),
    ee =
      L === "" || isUnattendedInteractiveSession()
        ? void 0
        : shouldOfferNewerModel(h, getMainLoopModelFromState(store.getState()));
  if (ee === void 0) return;
  if (ee.form === "line") offerNewerModelLine(ee, L, x);
  else await showNewerModelOfferDialog(ee, x);
}
//@ chunk-18hwfzwa.js:352869-353523 placement
function offerNewerModelLine(h, x, D) {
  let { store: store, storageV5: storageV5 } = D,
    ke = createDependencyWatcher(
      [store],
      () => [getMainLoopModelFromState(store.getState())],
      (ze) => {
        if (ze !== h.from) Sv();
      },
    ),
    Re = !1;
  Sv();
  let Be = (lO = {
      drawnAt: void 0,
      take: () => void confirmModelSwitchCommand(h, D).catch(logError),
      end: () => {
        (ke(), D.removeNotification(NEWER_MODEL_OFFER));
      },
    }),
    He = fillNewerModelCopy(h, x),
    We = process.stdout.columns ?? 80;
  D.addNotification({
    key: NEWER_MODEL_OFFER,
    kind: "upsell",
    priority: "immediate",
    requeueOnPreempt: !0,
    timeoutMs: BBt,
    jsx: Vc(NewerModelOfferLine, {
      onScreen: (ze) => {
        if (((Be.drawnAt = ze ? Date.now() : void 0), ze && !Re))
          ((Re = !0), recordNewerModelAsk("shown", h, storageV5));
      },
      segments: [
        ...(`${He.lead} ${He.text}`.length - 4 <= We - 6 ? [{ text: `${He.lead} `, dim: !0 }] : []),
        ...He.text
          .split(/(`[^`]+`)/)
          .map((ze) => (ze.startsWith("`") ? { text: ze.slice(1, -1), color: "permission" } : { text: ze })),
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:353523-353608 placement
function iz({ transcript: transcript }, x, D = "notice") {
  transcript.apply({ type: "append", messages: [createSystemMessage(x, D)] });
}
//@ chunk-18hwfzwa.js:353608-353919 placement
async function showNewerModelOfferDialog(h, x) {
  let { storageV5: storageV5 } = x,
    requestDialog = await x.requestDialog(resumeOnNewerModelDialogDef, h, {
      onFirstReveal: () => recordNewerModelAsk("shown", h, storageV5),
    });
  if (requestDialog === "cancelled") return;
  if (requestDialog === "dismiss") {
    (recordNewerModelAsk("dismissed", h, storageV5), logFeatureOk("cli_newer_model_offer"));
    return;
  }
  if (requestDialog === "keep") {
    (recordNewerModelAsk("declined", h, storageV5),
      iz(x, fillNewerModelCopy(h).declined),
      logFeatureOk("cli_newer_model_offer"));
    return;
  }
  await confirmModelSwitchCommand(h, x);
}
//@ chunk-18hwfzwa.js:353919-354486 placement
async function confirmModelSwitchCommand(h, x) {
  let { session: session, store: store, setAppState: setAppState, storageV5: storageV5 } = x,
    Re = await serializeModelSwitch(session, () =>
      runPreModelSwitchHooks(session, store.getState, h.to, "command"),
    );
  if (Re.decision !== "proceed") {
    (iz(
      x,
      preModelSwitchBlockedMessage(
        h.to,
        Re.decision === "ask" ? `${Re.reason ?? "confirmation required"} (use /model to confirm)` : Re.reason,
        Re.messages,
      ),
      "warning",
    ),
      logFeatureSad("cli_newer_model_offer", "switch_blocked"));
    return;
  }
  recordNewerModelAsk("accepted", h, storageV5);
  let Be = await saveModelSwitch(
    session,
    h.to,
    store.getState,
    setAppState,
    !1,
    "command",
    void 0,
    storageV5,
  );
  iz(x, fillNewerModelCopy(h).accepted);
  for (let He of [Be.split(" for this session only")[1]?.trim(), ...Re.messages.map(Nf)]) if (He) iz(x, He);
  logFeatureOk("cli_newer_model_offer");
}

export { useDefaultToNewerModelKey, Sv, takeDrawnOffer, fillNewerModelCopy, resumeOnNewerModelDialogDef };
