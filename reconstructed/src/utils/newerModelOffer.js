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
import { init_react_production, P, Vc } from "../../vendor/react/cjs/react.production.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { NEWER_MODEL_OFFER as NEWER_MODEL_OFFER_2 } from "../components/nudges/nudgeIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, string, _enum, M, record, E } from "../../vendor/zod/v4/classic/schemas.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { getBaselineModelSetting, preserve1mContextForRefusalFallback } from "./model/smallFastModel.js";
import { getDefaultMainLoopModel } from "./model/modelFallback.js";
import { parseUserSpecifiedModel, bytesPerTokenForModel, renderModelName } from "./model/modelDisplay.js";
import { parseModelId, compareVersion, stripAnyVersatileSuffix } from "./model/modelIds.js";
import { CACHE_TTL_1H_MS } from "../services/api/promptCacheBreakDetection.js";
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
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
  sanitizeHookText,
} from "../commands/model/modelSwitch.js";

//@ chunk-18hwfzwa.js:348815-348819 placement
init_react_production();
//@ chunk-18hwfzwa.js:348819-348982 placement
var resumeOnNewerModelDialogDef = withHideWhile({
  kind: NEWER_MODEL_OFFER_2,
  payload: DoctorLazy(() =>
    u({
      from: string(),
      to: string(),
    }),
  ),
  result: DoctorLazy(() => _enum(["resume_on_newer_model", "keep", "dismiss", "cancelled"])),
  default: "cancelled",
  hideWhile: [],
});
//@ chunk-18hwfzwa.js:348982-349024 placement
function canonicalIdentityName(h) {
  return getCanonicalName(h, {
    identity: true,
  });
}
//@ chunk-18hwfzwa.js:349024-349417 placement
/**
 * 判断是否提示改用更新的模型：当前模型与基线模型同族且更新、无后缀，且对话中尚未用过基线模型、也没有发生拒绝回退时，返回保留 1M 上下文后的建议模型。
 */
function findNewerModelOffer(h, x) {
  let baselineModelSetting = getBaselineModelSetting();
  let L =
    baselineModelSetting === undefined || baselineModelSetting === null
      ? getDefaultMainLoopModel()
      : parseUserSpecifiedModel(baselineModelSetting);
  let modelId = parseModelId(x);
  let modelId_2 = parseModelId(L);
  if (
    !modelId ||
    !modelId_2 ||
    modelId.trailer !== undefined ||
    modelId_2.trailer !== undefined ||
    modelId.family !== modelId_2.family ||
    compareVersion(modelId_2, modelId) <= 0
  )
    return;
  let Re = canonicalIdentityName(L);
  for (let Be of h) {
    if (
      Be?.type === "assistant" &&
      typeof Be.message?.model === "string" &&
      canonicalIdentityName(Be.message.model) === Re
    )
      return;
    if (Be?.type === "system" && Be.subtype === "model_refusal_fallback") return;
  }
  return preserve1mContextForRefusalFallback(x, L);
}
//@ chunk-18hwfzwa.js:349417-349430 placement
var NEWER_OFFER_MIN_AGE_MS = 2 * CACHE_TTL_1H_MS;
//@ chunk-18hwfzwa.js:349430-349677 placement
function lastAssistantModelBefore(h) {
  let last = h.findLast(
    (D) =>
      (D?.type === "user" && !D.isMeta && D.toolDenialKind !== "interrupted") ||
      (D?.type === "assistant" && D.message?.model !== SYNTHETIC_MODEL) ||
      (D?.type === "system" && D.subtype === "away_summary"),
  );
  return Date.now() - Date.parse(last?.timestamp ?? "") >= NEWER_OFFER_MIN_AGE_MS;
}
//@ chunk-18hwfzwa.js:349677-350020 placement
function fastModeCostDelta({ from, to }) {
  let D = isFastModeSettingOn(getInitialSettings_2());
  let L = (Be) =>
    MODEL_COSTS[canonicalIdentityName(Be)] &&
    getModelCosts(Be, {
      ...EMPTY_USAGE,
      speed: D && supportsFastMode(Be) ? "fast" : "standard",
    });
  let ee = L(from);
  let ke = L(to);
  let Re = bytesPerTokenForModel(from) / bytesPerTokenForModel(to);
  return (
    ee !== undefined &&
    ke !== undefined &&
    ke.inputTokens * Re <= ee.inputTokens &&
    ke.promptCacheWriteTokens * Re <= ee.promptCacheWriteTokens &&
    (ke.promptCacheWrite1hTokens ?? 0) * Re <= (ee.promptCacheWrite1hTokens ?? 1 / 0)
  );
}
//@ chunk-18hwfzwa.js:350020-350060 placement
var DEFAULT_OFFER_LIMITS = {
  maxAsks: 2,
  minHoursBetween: 168,
};
//@ chunk-18hwfzwa.js:350060-350249 placement
function isOfferThrottled(h, x) {
  let newerModelAsks = getGlobalConfig().newerModelAsks ?? {};
  let L = newerModelAsks[canonicalIdentityName(h.to)];
  let max = Math.max(0, ...Object.values(newerModelAsks).map((ke) => ke.lastAskedAt));
  return (L?.asks ?? 0) >= x.maxAsks || Date.now() - max < x.minHoursBetween * CACHE_TTL_1H_MS;
}
//@ chunk-18hwfzwa.js:350249-350433 placement
var NEWER_MODEL_OFFER_CONFIG_SCHEMA = DoctorLazy(() =>
  u({
    enabled: M(),
    form: _enum(["line", "dialog"]).optional(),
    families: record(string(), M()).optional(),
    maxAsks: E().optional(),
    minHoursBetween: E().optional(),
    words: record(string(), string()).optional(),
  }),
);
//@ chunk-18hwfzwa.js:350433-350508 placement
function newerModelOfferConfig() {
  return NEWER_MODEL_OFFER_CONFIG_SCHEMA().safeParse(
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_hidden_volcano", null),
  ).data;
}
//@ chunk-18hwfzwa.js:350508-351117 placement
function shouldOfferNewerModel(h, mainLoopModelFromState) {
  if (getGlobalConfig().resumeReturnDismissed || !isFirstPartyApiBackend()) return;
  let newerModelOffer = findNewerModelOffer(h, mainLoopModelFromState);
  if (newerModelOffer === undefined || !lastAssistantModelBefore(h)) return;
  let L = {
    from: mainLoopModelFromState,
    to: newerModelOffer,
  };
  let ee = stayingOnModelText(mainLoopModelFromState);
  let announcementSlotWinner = announcementState().announcementSlotWinner;
  if (
    !fastModeCostDelta(L) ||
    h.some((He) => He?.type === "system" && He.subtype === "informational" && He.content === ee) ||
    (announcementSlotWinner
      ? announcementSlotWinner.id === "startup-announcement"
      : pickStartupAnnouncement(false) !== undefined)
  )
    return;
  let Re = newerModelOfferConfig();
  if (
    !Re ||
    Re.families?.[parseModelId(newerModelOffer)?.family ?? ""] === false ||
    isOfferThrottled(L, {
      maxAsks: Re.maxAsks ?? DEFAULT_OFFER_LIMITS.maxAsks,
      minHoursBetween: Re.minHoursBetween ?? DEFAULT_OFFER_LIMITS.minHoursBetween,
    })
  )
    return;
  if (!Re.enabled) {
    logNewerModelSuggestion("held_out", L);
    return;
  }
  if (Re.form === undefined) return;
  let Be = {
    ...L,
    form: Re.form,
  };
  logNewerModelSuggestion("offered", Be);
  return Be;
}
//@ chunk-18hwfzwa.js:351117-351149 placement
function displayModelName(from) {
  return renderModelName(stripAnyVersatileSuffix(from));
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
function fillNewerModelCopy({ from, to }, D = "") {
  let words = newerModelOfferConfig()?.words;
  let ee = (Re) =>
    Re.replaceAll("{an}", /^[aeiou]/i.test(displayModelName(from)) ? "an" : "a")
      .replaceAll("{older}", displayModelName(from))
      .replaceAll("{newer}", displayModelName(to))
      .replaceAll("{key}", D);
  let ke = {};
  for (let key of Object.keys(NEWER_MODEL_OFFER_COPY))
    ke[key] = ee(words?.[key] ?? NEWER_MODEL_OFFER_COPY[key]);
  return {
    ...ke,
    declined: stayingOnModelText(from),
  };
}
//@ chunk-18hwfzwa.js:351756-351828 placement
function stayingOnModelText(h) {
  return `Staying on ${displayModelName(h)} \xB7 /model to switch later`;
}
//@ chunk-18hwfzwa.js:351828-351956 placement
function logNewerModelSuggestion(h, { from, to, form }) {
  logEvent("tengu_newer_model_suggestion", {
    action: fromEnum(h),
    form: fromEnumOpt(form),
    from_model: telemetrySafeModelName(from),
    to_model: telemetrySafeModelName(to),
  });
}
//@ chunk-18hwfzwa.js:351956-352239 placement
function recordNewerModelAsk(h, x, storageV5) {
  logNewerModelSuggestion(h, x);
  if (h !== "shown" && h !== "accepted") return;
  let L = canonicalIdentityName(x.to);
  saveGlobalConfig((ee) => {
    let ke = ee.newerModelAsks?.[L] ?? {
      asks: 0,
      lastAskedAt: 0,
    };
    return {
      ...ee,
      newerModelAsks: {
        ...ee.newerModelAsks,
        [L]:
          h === "accepted"
            ? {
                asks: 0,
                lastAskedAt: 0,
              }
            : {
                asks: ke.asks + 1,
                lastAskedAt: Date.now(),
              },
      },
    };
  }, storageV5);
}
//@ chunk-18hwfzwa.js:352239-352243 placement
init_react_production();
//@ chunk-18hwfzwa.js:352243-352479 placement
function NewerModelOfferLine(props) {
  let $ = w(5);
  let { segments, onScreen } = props;
  let ee;
  let ke;
  if ($[0] !== onScreen) {
    ee = () => {
      onScreen(true);
      return () => onScreen(false);
    };
    ke = [onScreen];
    $[0] = onScreen;
    $[1] = ee;
    $[2] = ke;
  } else {
    ee = $[1];
    ke = $[2];
  }
  P(ee, ke);
  let Re;
  if ($[3] !== segments) {
    Re = jsxProd_default(SegmentedText, {
      segments,
    });
    $[3] = segments;
    $[4] = Re;
  } else Re = $[4];
  return Re;
}
//@ chunk-18hwfzwa.js:352479-352520 placement
var NEWER_MODEL_OFFER = "newer-model-offer";
var OFFER_TIMEOUT_MS = 60000;
var drawnOffer;
//@ chunk-18hwfzwa.js:352520-352554 placement
/**
 * 结束并清除当前已绘出的新模型提议。
 */
function endDrawnOffer() {
  drawnOffer?.end();
  drawnOffer = undefined;
}
//@ chunk-18hwfzwa.js:352554-352659 placement
/**
 * 若已绘出的新模型提议不在最近输入期间，则取走该提议并清除绘制状态，返回是否取走。
 */
function takeDrawnOffer(inputClock, x) {
  if (drawnOffer?.drawnAt === undefined || isWithinRecentInput(inputClock, drawnOffer.drawnAt, x))
    return false;
  let { take } = drawnOffer;
  endDrawnOffer();
  take();
  return true;
}
//@ chunk-18hwfzwa.js:352659-352869 placement
async function useDefaultToNewerModelKey(h, x) {
  let { store } = x;
  let shortcutDisplay = getShortcutDisplay("chat:defaultToNewerModel", "Chat", "ctrl+y");
  let ee =
    shortcutDisplay === "" || isUnattendedInteractiveSession()
      ? undefined
      : shouldOfferNewerModel(h, getMainLoopModelFromState(store.getState()));
  if (ee === undefined) return;
  if (ee.form === "line") offerNewerModelLine(ee, shortcutDisplay, x);
  else await showNewerModelOfferDialog(ee, x);
}
//@ chunk-18hwfzwa.js:352869-353523 placement
function offerNewerModelLine(h, shortcutDisplay, D) {
  let { store, storageV5 } = D;
  let dependencyWatcher = createDependencyWatcher(
    [store],
    () => [getMainLoopModelFromState(store.getState())],
    (ze) => {
      if (ze !== h.from) endDrawnOffer();
    },
  );
  let Re = false;
  endDrawnOffer();
  let Be = (drawnOffer = {
    drawnAt: undefined,
    take: () => void confirmModelSwitchCommand(h, D).catch(logError),
    end: () => {
      dependencyWatcher();
      D.removeNotification(NEWER_MODEL_OFFER);
    },
  });
  let He = fillNewerModelCopy(h, shortcutDisplay);
  let columns = process.stdout.columns ?? 80;
  D.addNotification({
    key: NEWER_MODEL_OFFER,
    kind: "upsell",
    priority: "immediate",
    requeueOnPreempt: true,
    timeoutMs: OFFER_TIMEOUT_MS,
    jsx: Vc(NewerModelOfferLine, {
      onScreen: (ze) => {
        Be.drawnAt = ze ? Date.now() : undefined;
        if (ze && !Re) {
          Re = true;
          recordNewerModelAsk("shown", h, storageV5);
        }
      },
      segments: [
        ...(`${He.lead} ${He.text}`.length - 4 <= columns - 6
          ? [
              {
                text: `${He.lead} `,
                dim: true,
              },
            ]
          : []),
        ...He.text.split(/(`[^`]+`)/).map((ze) =>
          ze.startsWith("`")
            ? {
                text: ze.slice(1, -1),
                color: "permission",
              }
            : {
                text: ze,
              },
        ),
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:353523-353608 placement
function appendOfferNotice({ transcript }, x, D = "notice") {
  transcript.apply({
    type: "append",
    messages: [createSystemMessage(x, D)],
  });
}
//@ chunk-18hwfzwa.js:353608-353919 placement
async function showNewerModelOfferDialog(h, x) {
  let { storageV5 } = x;
  let L = await x.requestDialog(resumeOnNewerModelDialogDef, h, {
    onFirstReveal: () => recordNewerModelAsk("shown", h, storageV5),
  });
  if (L === "cancelled") return;
  if (L === "dismiss") {
    recordNewerModelAsk("dismissed", h, storageV5);
    logFeatureOk("cli_newer_model_offer");
    return;
  }
  if (L === "keep") {
    recordNewerModelAsk("declined", h, storageV5);
    appendOfferNotice(x, fillNewerModelCopy(h).declined);
    logFeatureOk("cli_newer_model_offer");
    return;
  }
  await confirmModelSwitchCommand(h, x);
}
//@ chunk-18hwfzwa.js:353919-354486 placement
async function confirmModelSwitchCommand(h, x) {
  let { session, store, setAppState, storageV5 } = x;
  let Re = await serializeModelSwitch(session, () =>
    runPreModelSwitchHooks(session, store.getState, h.to, "command"),
  );
  if (Re.decision !== "proceed") {
    appendOfferNotice(
      x,
      preModelSwitchBlockedMessage(
        h.to,
        Re.decision === "ask" ? `${Re.reason ?? "confirmation required"} (use /model to confirm)` : Re.reason,
        Re.messages,
      ),
      "warning",
    );
    logFeatureSad("cli_newer_model_offer", "switch_blocked");
    return;
  }
  recordNewerModelAsk("accepted", h, storageV5);
  let Be = await saveModelSwitch(
    session,
    h.to,
    store.getState,
    setAppState,
    false,
    "command",
    undefined,
    storageV5,
  );
  appendOfferNotice(x, fillNewerModelCopy(h).accepted);
  for (let He of [Be.split(" for this session only")[1]?.trim(), ...Re.messages.map(sanitizeHookText)])
    if (He) appendOfferNotice(x, He);
  logFeatureOk("cli_newer_model_offer");
}
export {
  useDefaultToNewerModelKey,
  endDrawnOffer,
  takeDrawnOffer,
  fillNewerModelCopy,
  resumeOnNewerModelDialogDef,
};
