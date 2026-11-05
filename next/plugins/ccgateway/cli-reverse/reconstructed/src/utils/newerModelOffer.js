/**
 * utils/newerModelOffer.ts
 *
 * 2.1.316 新增。更新模型提议判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (28)
 * attribution: placement 28
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useEffect, createElement } from "../../vendor/react/cjs/react.production.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { NEWER_MODEL_OFFER as NEWER_MODEL_OFFER_2 } from "../components/nudges/nudgeIds.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  stringSchema,
  _enum,
  booleanSchema,
  record,
  numberSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { getBaselineModelSetting, preserve1mContextForRefusalFallback } from "./model/smallFastModel.js";
import { getDefaultMainLoopModel } from "./model/modelFallback.js";
import { parseUserSpecifiedModel, bytesPerTokenForModel, renderModelName } from "./model/modelDisplay.js";
import { parseModelId, compareVersion, stripAnyVersatileSuffix } from "./model/modelIds.js";
import { CACHE_TTL_1H_MS } from "../services/api/promptCacheBreakDetection.js";
import { SYNTHETIC_MODEL, createSystemMessage } from "./messages.js";
import { isFastModeSettingOn, supportsFastMode } from "./fastMode.js";
import { getInitialSettings } from "./settings/settings.js";
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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SegmentedText } from "../components/PromptInput/Notifications.js";
import { isWithinRecentInput } from "../hooks/useRecentInputGuard.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { isUnattendedInteractiveSession } from "./concurrentSessions.js";
import { getMainLoopModelFromState } from "../hooks/useMainLoopModel.js";
import { createDependencyWatcher } from "../cli/print/rewindStandIn.js";
import { logError } from "./log.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { serializeModelSwitch } from "./model/modelSwitchHooks.js";
import {
  runPreModelSwitchHooks,
  preModelSwitchBlockedMessage,
  saveModelSwitch,
  sanitizeHookText,
} from "../commands/model/modelSwitch.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:350721-350725 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:350721", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:368223-368227 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:368223", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:386541-386704 placement
var resumeOnNewerModelDialogDef; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:386541", () => {
  resumeOnNewerModelDialogDef = withHideWhile({
    kind: NEWER_MODEL_OFFER_2,
    payload: DoctorLazy(() =>
      objectSchema({
        from: stringSchema(),
        to: stringSchema(),
      }),
    ),
    result: DoctorLazy(() => _enum(["resume_on_newer_model", "keep", "dismiss", "cancelled"])),
    default: "cancelled",
    hideWhile: [],
  });
});
//@ chunk-czq1j3j2.js:386704-386746 placement
function canonicalIdentityName(model) {
  return getCanonicalName(model, {
    identity: true,
  });
}
//@ chunk-czq1j3j2.js:386746-387139 placement
/**
 * 判断是否提示改用更新的模型：当前模型与基线模型同族且更新、无后缀，且对话中尚未用过基线模型、也没有发生拒绝回退时，返回保留 1M 上下文后的建议模型。
 */
function findNewerModelOffer(messages, currentModel) {
  let baselineModelSetting = getBaselineModelSetting();
  let baselineModel =
    baselineModelSetting === undefined || baselineModelSetting === null
      ? getDefaultMainLoopModel()
      : parseUserSpecifiedModel(baselineModelSetting);
  let modelId = parseModelId(currentModel);
  let modelId_2 = parseModelId(baselineModel);
  if (
    !modelId ||
    !modelId_2 ||
    modelId.trailer !== undefined ||
    modelId_2.trailer !== undefined ||
    modelId.family !== modelId_2.family ||
    compareVersion(modelId_2, modelId) <= 0
  )
    return;
  let baselineCanonical = canonicalIdentityName(baselineModel);
  for (let message of messages) {
    if (
      message?.type === "assistant" &&
      typeof message.message?.model === "string" &&
      canonicalIdentityName(message.message.model) === baselineCanonical
    )
      return;
    if (message?.type === "system" && message.subtype === "model_refusal_fallback") return;
  }
  return preserve1mContextForRefusalFallback(currentModel, baselineModel);
}
//@ chunk-czq1j3j2.js:387139-387152 placement
var NEWER_OFFER_MIN_AGE_MS; // deferred: uses CACHE_TTL_5M_MS (../services/api/promptCacheBreakDetection.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:387139", () => {
  NEWER_OFFER_MIN_AGE_MS = 2 * CACHE_TTL_1H_MS;
});
//@ chunk-czq1j3j2.js:387152-387399 placement
function lastAssistantModelBefore(messages) {
  let last = messages.findLast(
    (message) =>
      (message?.type === "user" && !message.isMeta && message.toolDenialKind !== "interrupted") ||
      (message?.type === "assistant" && message.message?.model !== SYNTHETIC_MODEL) ||
      (message?.type === "system" && message.subtype === "away_summary"),
  );
  return Date.now() - Date.parse(last?.timestamp ?? "") >= NEWER_OFFER_MIN_AGE_MS;
}
//@ chunk-czq1j3j2.js:387399-387742 placement
function fastModeCostDelta({ from, to }) {
  let isFastModeOn = isFastModeSettingOn(getInitialSettings());
  let lookupCosts = (model) =>
    MODEL_COSTS[canonicalIdentityName(model)] &&
    getModelCosts(model, {
      ...EMPTY_USAGE,
      speed: isFastModeOn && supportsFastMode(model) ? "fast" : "standard",
    });
  let fromCosts = lookupCosts(from);
  let toCosts = lookupCosts(to);
  let byteRatio = bytesPerTokenForModel(from) / bytesPerTokenForModel(to);
  return (
    fromCosts !== undefined &&
    toCosts !== undefined &&
    toCosts.inputTokens * byteRatio <= fromCosts.inputTokens &&
    toCosts.promptCacheWriteTokens * byteRatio <= fromCosts.promptCacheWriteTokens &&
    (toCosts.promptCacheWrite1hTokens ?? 0) * byteRatio <= (fromCosts.promptCacheWrite1hTokens ?? 1 / 0)
  );
}
//@ chunk-czq1j3j2.js:387742-387782 placement
var DEFAULT_OFFER_LIMITS = {
  maxAsks: 2,
  minHoursBetween: 168,
};
//@ chunk-czq1j3j2.js:387782-387971 placement
function isOfferThrottled(switchInfo, limits) {
  let newerModelAsks = getGlobalConfig().newerModelAsks ?? {};
  let previousAsks = newerModelAsks[canonicalIdentityName(switchInfo.to)];
  let max = Math.max(0, ...Object.values(newerModelAsks).map((askRecord) => askRecord.lastAskedAt));
  return (
    (previousAsks?.asks ?? 0) >= limits.maxAsks || Date.now() - max < limits.minHoursBetween * CACHE_TTL_1H_MS
  );
}
//@ chunk-czq1j3j2.js:387971-388155 placement
var NEWER_MODEL_OFFER_CONFIG_SCHEMA; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:387971", () => {
  NEWER_MODEL_OFFER_CONFIG_SCHEMA = DoctorLazy(() =>
    objectSchema({
      enabled: booleanSchema(),
      form: _enum(["line", "dialog"]).optional(),
      families: record(stringSchema(), booleanSchema()).optional(),
      maxAsks: numberSchema().optional(),
      minHoursBetween: numberSchema().optional(),
      words: record(stringSchema(), stringSchema()).optional(),
    }),
  );
});
//@ chunk-czq1j3j2.js:388155-388230 placement
function newerModelOfferConfig() {
  return NEWER_MODEL_OFFER_CONFIG_SCHEMA().safeParse(
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_hidden_volcano", null),
  ).data;
}
//@ chunk-czq1j3j2.js:388230-388839 placement
function shouldOfferNewerModel(messages, mainLoopModelFromState) {
  if (getGlobalConfig().resumeReturnDismissed || !isFirstPartyApiBackend()) return;
  let newerModelOffer = findNewerModelOffer(messages, mainLoopModelFromState);
  if (newerModelOffer === undefined || !lastAssistantModelBefore(messages)) return;
  let switchInfo = {
    from: mainLoopModelFromState,
    to: newerModelOffer,
  };
  let declinedText = stayingOnModelText(mainLoopModelFromState);
  let announcementSlotWinner = announcementState().announcementSlotWinner;
  if (
    !fastModeCostDelta(switchInfo) ||
    messages.some(
      (message) =>
        message?.type === "system" && message.subtype === "informational" && message.content === declinedText,
    ) ||
    (announcementSlotWinner
      ? announcementSlotWinner.id === "startup-announcement"
      : pickStartupAnnouncement(false) !== undefined)
  )
    return;
  let config = newerModelOfferConfig();
  if (
    !config ||
    config.families?.[parseModelId(newerModelOffer)?.family ?? ""] === false ||
    isOfferThrottled(switchInfo, {
      maxAsks: config.maxAsks ?? DEFAULT_OFFER_LIMITS.maxAsks,
      minHoursBetween: config.minHoursBetween ?? DEFAULT_OFFER_LIMITS.minHoursBetween,
    })
  )
    return;
  if (!config.enabled) {
    logNewerModelSuggestion("held_out", switchInfo);
    return;
  }
  if (config.form === undefined) return;
  let offer = {
    ...switchInfo,
    form: config.form,
  };
  logNewerModelSuggestion("offered", offer);
  return offer;
}
//@ chunk-czq1j3j2.js:388839-388871 placement
function displayModelName(modelName) {
  return renderModelName(stripAnyVersatileSuffix(modelName));
}
//@ chunk-czq1j3j2.js:388871-389190 placement
var NEWER_MODEL_OFFER_COPY = {
  lead: "You\u2019re resuming {an} {older} session.",
  text: "Press `{key}` to continue with `{newer}`.",
  title: "You\u2019re resuming {an} {older} session. Continue with {newer}?",
  accept: "Continue with {newer}",
  decline: "Keep {older}",
  accepted: "Continuing with {newer}, your default model \xB7 /model to switch back",
};
//@ chunk-czq1j3j2.js:389190-389478 placement
function fillNewerModelCopy({ from, to }, shortcutDisplay = "") {
  let words = newerModelOfferConfig()?.words;
  let fillTemplate = (template) =>
    template
      .replaceAll("{an}", /^[aeiou]/i.test(displayModelName(from)) ? "an" : "a")
      .replaceAll("{older}", displayModelName(from))
      .replaceAll("{newer}", displayModelName(to))
      .replaceAll("{key}", shortcutDisplay);
  let copy = {};
  for (let key of Object.keys(NEWER_MODEL_OFFER_COPY))
    copy[key] = fillTemplate(words?.[key] ?? NEWER_MODEL_OFFER_COPY[key]);
  return {
    ...copy,
    declined: stayingOnModelText(from),
  };
}
//@ chunk-czq1j3j2.js:389478-389550 placement
function stayingOnModelText(model) {
  return `Staying on ${displayModelName(model)} \xB7 /model to switch later`;
}
//@ chunk-czq1j3j2.js:389550-389678 placement
function logNewerModelSuggestion(action, { from, to, form }) {
  logEvent("tengu_newer_model_suggestion", {
    action: fromEnum(action),
    form: fromEnumOpt(form),
    from_model: telemetrySafeModelName(from),
    to_model: telemetrySafeModelName(to),
  });
}
//@ chunk-czq1j3j2.js:389678-389961 placement
function recordNewerModelAsk(action, offer, storageV5) {
  logNewerModelSuggestion(action, offer);
  if (action !== "shown" && action !== "accepted") return;
  let toCanonical = canonicalIdentityName(offer.to);
  saveGlobalConfig((config) => {
    let previousAsks = config.newerModelAsks?.[toCanonical] ?? {
      asks: 0,
      lastAskedAt: 0,
    };
    return {
      ...config,
      newerModelAsks: {
        ...config.newerModelAsks,
        [toCanonical]:
          action === "accepted"
            ? {
                asks: 0,
                lastAskedAt: 0,
              }
            : {
                asks: previousAsks.asks + 1,
                lastAskedAt: Date.now(),
              },
      },
    };
  }, storageV5);
}
//@ chunk-czq1j3j2.js:389965-390201 placement
function NewerModelOfferLine(props) {
  let $ = useMemoCache(5);
  let { segments, onScreen } = props;
  let subscribe;
  let subscribeDeps;
  if ($[0] !== onScreen) {
    subscribe = () => {
      onScreen(true);
      return () => onScreen(false);
    };
    subscribeDeps = [onScreen];
    $[0] = onScreen;
    $[1] = subscribe;
    $[2] = subscribeDeps;
  } else {
    subscribe = $[1];
    subscribeDeps = $[2];
  }
  useEffect(subscribe, subscribeDeps);
  let element;
  if ($[3] !== segments) {
    element = jsxProd_default(SegmentedText, {
      segments,
    });
    $[3] = segments;
    $[4] = element;
  } else element = $[4];
  return element;
}
//@ chunk-czq1j3j2.js:390201-390242 placement
var NEWER_MODEL_OFFER = "newer-model-offer";
var OFFER_TIMEOUT_MS = 60000;
var drawnOffer;
//@ chunk-czq1j3j2.js:390242-390276 placement
/**
 * 结束并清除当前已绘出的新模型提议。
 */
function endDrawnOffer() {
  drawnOffer?.end();
  drawnOffer = undefined;
}
//@ chunk-czq1j3j2.js:390276-390381 placement
/**
 * 若已绘出的新模型提议不在最近输入期间，则取走该提议并清除绘制状态，返回是否取走。
 */
function takeDrawnOffer(inputClock, windowMs) {
  if (drawnOffer?.drawnAt === undefined || isWithinRecentInput(inputClock, drawnOffer.drawnAt, windowMs))
    return false;
  let { take } = drawnOffer;
  endDrawnOffer();
  take();
  return true;
}
//@ chunk-czq1j3j2.js:390381-390591 placement
async function useDefaultToNewerModelKey(messages, context) {
  let { store } = context;
  let shortcutDisplay = getShortcutDisplay("chat:defaultToNewerModel", "Chat", "ctrl+y");
  let offer =
    shortcutDisplay === "" || isUnattendedInteractiveSession()
      ? undefined
      : shouldOfferNewerModel(messages, getMainLoopModelFromState(store.getState()));
  if (offer === undefined) return;
  if (offer.form === "line") offerNewerModelLine(offer, shortcutDisplay, context);
  else await showNewerModelOfferDialog(offer, context);
}
//@ chunk-czq1j3j2.js:390591-391245 placement
function offerNewerModelLine(offer, shortcutDisplay, context) {
  let { store, storageV5 } = context;
  let dependencyWatcher = createDependencyWatcher(
    [store],
    () => [getMainLoopModelFromState(store.getState())],
    (currentModel) => {
      if (currentModel !== offer.from) endDrawnOffer();
    },
  );
  let recorded = false;
  endDrawnOffer();
  let drawnOfferEntry = (drawnOffer = {
    drawnAt: undefined,
    take: () => void confirmModelSwitchCommand(offer, context).catch(logError),
    end: () => {
      dependencyWatcher();
      context.removeNotification(NEWER_MODEL_OFFER);
    },
  });
  let copy = fillNewerModelCopy(offer, shortcutDisplay);
  let columns = process.stdout.columns ?? 80;
  context.addNotification({
    key: NEWER_MODEL_OFFER,
    kind: "upsell",
    priority: "immediate",
    requeueOnPreempt: true,
    timeoutMs: OFFER_TIMEOUT_MS,
    jsx: createElement(NewerModelOfferLine, {
      onScreen: (isOnScreen) => {
        drawnOfferEntry.drawnAt = isOnScreen ? Date.now() : undefined;
        if (isOnScreen && !recorded) {
          recorded = true;
          recordNewerModelAsk("shown", offer, storageV5);
        }
      },
      segments: [
        ...(`${copy.lead} ${copy.text}`.length - 4 <= columns - 6
          ? [
              {
                text: `${copy.lead} `,
                dim: true,
              },
            ]
          : []),
        ...copy.text.split(/(`[^`]+`)/).map((segment) =>
          segment.startsWith("`")
            ? {
                text: segment.slice(1, -1),
                color: "permission",
              }
            : {
                text: segment,
              },
        ),
      ],
    }),
  });
}
//@ chunk-czq1j3j2.js:391245-391330 placement
function appendOfferNotice({ transcript }, text, level = "notice") {
  transcript.apply({
    type: "append",
    messages: [createSystemMessage(text, level)],
  });
}
//@ chunk-czq1j3j2.js:391330-391641 placement
async function showNewerModelOfferDialog(offer, context) {
  let { storageV5 } = context;
  let choice = await context.requestDialog(resumeOnNewerModelDialogDef, offer, {
    onFirstReveal: () => recordNewerModelAsk("shown", offer, storageV5),
  });
  if (choice === "cancelled") return;
  if (choice === "dismiss") {
    recordNewerModelAsk("dismissed", offer, storageV5);
    logFeatureOk("cli_newer_model_offer");
    return;
  }
  if (choice === "keep") {
    recordNewerModelAsk("declined", offer, storageV5);
    appendOfferNotice(context, fillNewerModelCopy(offer).declined);
    logFeatureOk("cli_newer_model_offer");
    return;
  }
  await confirmModelSwitchCommand(offer, context);
}
//@ chunk-czq1j3j2.js:391641-392208 placement
async function confirmModelSwitchCommand(offer, context) {
  let { session, store, setAppState, storageV5 } = context;
  let switchResult = await serializeModelSwitch(session, () =>
    runPreModelSwitchHooks(session, store.getState, offer.to, "command"),
  );
  if (switchResult.decision !== "proceed") {
    appendOfferNotice(
      context,
      preModelSwitchBlockedMessage(
        offer.to,
        switchResult.decision === "ask"
          ? `${switchResult.reason ?? "confirmation required"} (use /model to confirm)`
          : switchResult.reason,
        switchResult.messages,
      ),
      "warning",
    );
    logFeatureSad("cli_newer_model_offer", "switch_blocked");
    return;
  }
  recordNewerModelAsk("accepted", offer, storageV5);
  let savedSwitch = await saveModelSwitch(
    session,
    offer.to,
    store.getState,
    setAppState,
    false,
    "command",
    undefined,
    storageV5,
  );
  appendOfferNotice(context, fillNewerModelCopy(offer).accepted);
  for (let noticeText of [
    savedSwitch.split(" for this session only")[1]?.trim(),
    ...switchResult.messages.map(sanitizeHookText),
  ])
    if (noticeText) appendOfferNotice(context, noticeText);
  logFeatureOk("cli_newer_model_offer");
}
export {
  useDefaultToNewerModelKey,
  endDrawnOffer,
  takeDrawnOffer,
  fillNewerModelCopy,
  resumeOnNewerModelDialogDef,
};
