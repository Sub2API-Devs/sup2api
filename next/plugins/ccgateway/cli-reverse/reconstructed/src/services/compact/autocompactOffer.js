/**
 * services/compact/autocompactOffer.ts
 *
 * 2.1.316 新增。自动压缩提议判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8prszgkd.js (1), chunk-bc4jcw5z.js (7), chunk-czq1j3j2.js (19)
 * attribution: placement 27
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  numberSchema,
  zodStrictObject,
  _enum,
  array,
  objectSchema,
  stringSchema,
  union,
  booleanSchema,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { TRANSPORT_LABELS, getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { getTeammateAgentId } from "../../bootstrap/state.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { isAutoCompactEnabled } from "./compactSettings.js";
import { getAutoCompactWindow } from "./autoCompact.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { isWindowWithCeiling, findWindowSettingForModel } from "./autoCompactWindow.js";
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { AUTOCOMPACT_OFFER } from "../../components/nudges/nudgeIds.js";
import { formatTokens } from "../../utils/format.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { logEvent } from "../analytics/index.js";
import { applyAutoCompactWindow } from "../../commands/autocompact/autocompact.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bc4jcw5z.js:1544-1968 placement
/**
 * 读取自动压缩提议记录。
 */
function readAutoCompactOffer(config, accountUuid, modelKey) {
  let entry = ownPropertyValue(ownPropertyValue(config.autoCompactOffer, accountUuid), modelKey);
  if (typeof entry !== "object" || entry === null || typeof entry.eligibleLoggedAt !== "number") return;
  let { escCount, resolved } = entry;
  let isAnswered = typeof resolved === "object" && resolved !== null;
  let { choice, tokens } = isAnswered ? resolved : {};
  return {
    eligibleLoggedAt: entry.eligibleLoggedAt,
    isAnswered,
    ...(typeof escCount === "number" &&
      Number.isInteger(escCount) &&
      escCount > 0 && {
        escCount,
      }),
    ...((choice === "accept" || choice === "keep") &&
      typeof tokens === "number" && {
        resolved: {
          choice,
          tokens,
        },
      }),
  };
}
//@ chunk-bc4jcw5z.js:1968-2152 placement
/**
 * 在自动压缩提议状态里记下某（会话, 键）的 eligibleLoggedAt；已有记录时不改。
 */
function markAutoCompactOfferEligibleLogged(config, accountUuid, modelKey, eligibleLoggedAt) {
  if (readAutoCompactOffer(config, accountUuid, modelKey) !== undefined) return config;
  let accountOffers = ownPropertyValue(config.autoCompactOffer, accountUuid);
  return {
    ...config,
    autoCompactOffer: {
      ...config.autoCompactOffer,
      [accountUuid]: {
        ...accountOffers,
        [modelKey]: {
          ...ownPropertyValue(accountOffers, modelKey),
          eligibleLoggedAt,
        },
      },
    },
  };
}
//@ chunk-bc4jcw5z.js:2152-2235 placement
/**
 * bumpAutoCompactOfferEsc：记录一次 Esc 计数。
 */
function bumpAutoCompactOfferEsc(config, accountUuid, modelKey) {
  let autoCompactOffer = readAutoCompactOffer(config, accountUuid, modelKey);
  return updateAutoCompactOffer(config, accountUuid, modelKey, {
    escCount: (autoCompactOffer?.escCount ?? 0) + 1,
  });
}
//@ chunk-bc4jcw5z.js:2235-2286 placement
/**
 * markAutoCompactOfferResolved：标记压缩提议已解决。
 */
function markAutoCompactOfferResolved(config, accountUuid, modelKey, resolved) {
  return updateAutoCompactOffer(config, accountUuid, modelKey, {
    resolved,
  });
}
//@ chunk-bc4jcw5z.js:2286-2480 placement
function updateAutoCompactOffer(config, accountUuid, modelKey, patch) {
  let accountOffers = ownPropertyValue(config.autoCompactOffer, accountUuid);
  let rawEntry = ownPropertyValue(accountOffers, modelKey);
  let autoCompactOffer = readAutoCompactOffer(config, accountUuid, modelKey);
  if (autoCompactOffer === undefined || autoCompactOffer.isAnswered || !rawEntry) return config;
  return {
    ...config,
    autoCompactOffer: {
      ...config.autoCompactOffer,
      [accountUuid]: {
        ...accountOffers,
        [modelKey]: {
          ...rawEntry,
          ...patch,
        },
      },
    },
  };
}
//@ chunk-bc4jcw5z.js:2480-2565 placement
function ownPropertyValue(object, key) {
  return typeof object === "object" && object !== null && Object.hasOwn(object, key)
    ? object[key]
    : undefined;
}
//@ chunk-bc4jcw5z.js:2565-2653 placement
/**
 * isAutoCompactOfferAnswered：压缩提议已回答或被跳过。
 */
function isAutoCompactOfferAnswered(globalConfig, accountUuid, modelKey) {
  let autoCompactOffer = readAutoCompactOffer(globalConfig, accountUuid, modelKey);
  return (
    autoCompactOffer !== undefined && (autoCompactOffer.isAnswered || (autoCompactOffer.escCount ?? 0) > 0)
  );
}
//@ chunk-8prszgkd.js:16318-16338 placement
/**
 * 自动压缩提议对话框正文的最小列数（20）。
 */
var MIN_BODY_ROWS = 2;
var DIALOG_HORIZONTAL_CHROME = 6;
var MIN_BODY_COLUMNS = 20;
//@ chunk-czq1j3j2.js:1128859-1128863 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1128859", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1132308-1132312 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1132308", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1146173-1146291 placement
/**
 * 最多询问几次（2）。
 */
var TENGU_BINARY_MUSIC = "tengu_binary_music";
var MIN_OFFER_WINDOW_TOKENS = 200000;
var MAX_OFFER_WINDOW_TOKENS = 1e6;
var DEFAULT_OFFER_TOKENS = 400000;
var OFFER_WINDOW_SIZE_LADDER = [300000, 400000, 500000, 600000, 700000, 800000, 900000];
var MAX_OFFER_ASKS = 2;
//@ chunk-czq1j3j2.js:1146291-1146341 placement
/**
 * 提议候选 token 数的 schema（≥Kx 且 < R8）。
 */
function offerTokensSchema() {
  return numberSchema()
    .int()
    .min(TRANSPORT_LABELS)
    .max(MAX_OFFER_WINDOW_TOKENS - 1);
}
//@ chunk-czq1j3j2.js:1146341-1146777 placement
/**
 * 自动压缩窗口提议实验配置 schema（arm、触发阈值、候选大小、顺序、最多询问次数）。
 */
var AUTOCOMPACT_OFFER_CONFIG_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:1146341", () => {
  AUTOCOMPACT_OFFER_CONFIG_SCHEMA = DoctorLazy(() =>
    zodStrictObject({
      arm: _enum(["control", "offer"]),
      triggerTokens: numberSchema()
        .int()
        .min(MIN_OFFER_WINDOW_TOKENS)
        .max(MAX_OFFER_WINDOW_TOKENS - 1)
        .default(MIN_OFFER_WINDOW_TOKENS),
      defaultTokens: offerTokensSchema().default(DEFAULT_OFFER_TOKENS),
      order: _enum(["random", "lower_first", "keep_first"]).default("random"),
      sizes: array(offerTokensSchema())
        .min(1)
        .max(OFFER_WINDOW_SIZE_LADDER.length + 2)
        .default(OFFER_WINDOW_SIZE_LADDER),
      maxAsks: numberSchema().int().min(1).max(5).default(MAX_OFFER_ASKS),
    }).refine(
      (config) =>
        config.sizes.includes(config.defaultTokens) &&
        config.sizes.every((siz, index) => index === 0 || siz > config.sizes[index - 1]),
      "sizes must ascend and include defaultTokens",
    ),
  );
});
//@ chunk-czq1j3j2.js:1146777-1146967 placement
function autocompactOfferConfig(featureValue_CACHED_MAY_BE_STALE) {
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "object" ||
    featureValue_CACHED_MAY_BE_STALE === null ||
    Object.keys(featureValue_CACHED_MAY_BE_STALE).length === 0
  )
    return;
  let parsed = AUTOCOMPACT_OFFER_CONFIG_SCHEMA().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!parsed.success) {
    logFeatureSad("autocompact_offer", "served_value_invalid");
    return;
  }
  return parsed.data;
}
//@ chunk-czq1j3j2.js:1146967-1147439 placement
function autocompactOfferEligibility({ model, configuredWindow }) {
  let accountUuid = getOauthAccountInfo()?.accountUuid;
  if (
    !getGlobalConfig().hasCompletedOnboarding ||
    accountUuid === undefined ||
    isRemoteSessionAvailable() ||
    isActingAsBgJob() ||
    getTeammateAgentId() !== undefined
  )
    return;
  let modelContextInfo = getModelContextInfo(model);
  if (
    modelContextInfo.longContextWindowWithoutOptIn < MAX_OFFER_WINDOW_TOKENS ||
    modelContextInfo.contextWindow < MAX_OFFER_WINDOW_TOKENS
  )
    return;
  let autoCompactOn = isAutoCompactEnabled();
  let { window: contextWindow, source } = getAutoCompactWindow(
    modelContextInfo,
    autoCompactOn ? configuredWindow : undefined,
  );
  let setting = autocompactWindowSetting(source, modelContextInfo.settingsKey, configuredWindow);
  return {
    accountUuid,
    modelKey: modelContextInfo.settingsKey,
    windowTokens: contextWindow,
    currentSetting: setting.currentSetting,
    block: !autoCompactOn
      ? "auto_compact_off"
      : !isSettingSourceEnabled("userSettings")
        ? "user_settings_off"
        : setting.block,
  };
}
//@ chunk-czq1j3j2.js:1147439-1148046 placement
function autocompactWindowSetting(source, settingsKey, configuredWindow) {
  if (source === "env" || source === "experiment")
    return {
      currentSetting: source,
      block: source,
    };
  if (source === "clientdata")
    return {
      currentSetting: "server",
      block: "server",
    };
  if (typeof configuredWindow !== "object" || isWindowWithCeiling(configuredWindow))
    return {
      currentSetting: "launch_flag",
      block: "launch_flag",
    };
  let isPerModel = Object.hasOwn(configuredWindow.byModel, settingsKey);
  let configured = isPerModel ? configuredWindow.byModel[settingsKey] : configuredWindow.default;
  let windowSettingForModel = findWindowSettingForModel(settingsKey);
  let current = !(windowSettingForModel === undefined || windowSettingForModel.source === "userSettings")
    ? "other_settings_file"
    : configured === undefined || configured === "auto"
      ? "auto"
      : isPerModel
        ? "own_per_model"
        : "own_top_level";
  if (
    windowSettingForModel?.window !== configured ||
    (windowSettingForModel?.perModel ?? false) !== isPerModel
  )
    return {
      currentSetting: current,
      block: "settings_changed",
    };
  return {
    currentSetting: current,
    block: current === "other_settings_file" ? current : undefined,
  };
}
//@ chunk-czq1j3j2.js:1148046-1148133 placement
/**
 * 给出不能提议的原因（已阻断，或窗口不高于默认）。
 */
function describeOfferSkip(eligibility, defaultTokens) {
  return (
    eligibility.block ?? (eligibility.windowTokens > defaultTokens ? undefined : "window_not_above_default")
  );
}
//@ chunk-czq1j3j2.js:1148133-1148168 placement
var AUTOCOMPACT_OFFER_ORDER = "autocompact-offer-order:";
//@ chunk-czq1j3j2.js:1148168-1148299 placement
/**
 * random 顺序时按账号哈希确定 lower_first 或 keep_first。
 */
function resolveOfferOrder(order, accountUuid) {
  if (order !== "random") return order;
  let [byte = 0] = createHash("sha256")
    .update(AUTOCOMPACT_OFFER_ORDER + accountUuid)
    .digest();
  return byte % 2 === 0 ? "lower_first" : "keep_first";
}
//@ chunk-czq1j3j2.js:1148299-1148885 placement
/**
 * 自动压缩提议对话框要求的最小终端行数（12），不足时记为 terminal_too_short。
 */
var AUTOCOMPACT_OFFER_PAYLOAD_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MIN_OFFER_DIALOG_ROWS;
var AUTOCOMPACT_OFFER_DIALOG;
deferInit("chunk-czq1j3j2.js:1148299", () => {
  AUTOCOMPACT_OFFER_PAYLOAD_SCHEMA = DoctorLazy(() =>
    objectSchema({
      order: _enum(["lower_first", "keep_first"]),
      accountUuid: stringSchema(),
      modelKey: stringSchema(),
      sizes: array(
        objectSchema({
          tokens: numberSchema(),
          firesAt: numberSchema(),
        }),
      ).min(1),
      defaultTokens: numberSchema(),
      triggerTokens: numberSchema(),
      contextTokens: numberSchema(),
      windowTokens: numberSchema(),
      currentSetting: _enum(["auto", "own_per_model", "own_top_level"]),
      askNumber: numberSchema(),
    }).refine((payload) => payload.sizes.some((siz) => siz.tokens === payload.defaultTokens)),
  );
  MIN_OFFER_DIALOG_ROWS = 12;
  AUTOCOMPACT_OFFER_DIALOG = withHideWhile({
    kind: AUTOCOMPACT_OFFER,
    payload: AUTOCOMPACT_OFFER_PAYLOAD_SCHEMA,
    result: DoctorLazy(() =>
      union([
        objectSchema({
          choice: _enum(["accept", "keep", "esc"]),
          tokens: numberSchema(),
          stepperMoves: numberSchema(),
          strayKeys: numberSchema(),
          preselected: _enum(["lower", "keep"]),
          isScreenReader: booleanSchema(),
        }),
        literal("cancelled"),
      ]),
    ),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
});
//@ chunk-czq1j3j2.js:1148885-1149014 placement
/**
 * 当前窗口设置描述（auto 时注明默认）。
 */
function describeCurrentWindow({ windowTokens, currentSetting }) {
  return currentSetting === "auto"
    ? `${formatTokens(windowTokens)} tokens (default via auto setting)`
    : `${formatTokens(windowTokens)} tokens`;
}
//@ chunk-czq1j3j2.js:1149014-1149122 placement
/**
 * 当前窗口设置短标签。
 */
function currentWindowLabel({ windowTokens, currentSetting }) {
  return currentSetting === "auto"
    ? `auto (${formatTokens(windowTokens)} tokens)`
    : `${formatTokens(windowTokens)} tokens`;
}
//@ chunk-czq1j3j2.js:1149122-1149420 placement
/**
 * 提议对话框的遥测字段。
 */
function offerTelemetryFields(payload, { preselected, isScreenReader }) {
  return {
    preselected: fromEnum(preselected),
    screen_reader: isScreenReader,
    window_model: telemetrySafeModelName(payload.modelKey),
    context_tokens: payload.contextTokens,
    trigger_tokens: payload.triggerTokens,
    default_tokens: payload.defaultTokens,
    window_tokens: payload.windowTokens,
    current_setting: fromEnum(payload.currentSetting),
    ask_number: payload.askNumber,
  };
}
//@ chunk-czq1j3j2.js:1149420-1149674 placement
/**
 * 显示提议对话框并记录结果，返回选择或 cancelled/withdrawn。
 */
async function showAutocompactOffer(requestDialog, payload, options) {
  let revealedAt;
  let result = await requestDialog(AUTOCOMPACT_OFFER_DIALOG, payload, {
    place: "under",
    onFirstReveal: () => {
      revealedAt = Date.now();
    },
  });
  if (result === "cancelled") return revealedAt === undefined ? "cancelled" : "withdrawn";
  return (await recordAutocompactOfferOutcome(
    result,
    payload,
    revealedAt === undefined ? undefined : Date.now() - revealedAt,
    options,
  )) === "unavailable"
    ? "cancelled"
    : result.choice;
}
//@ chunk-czq1j3j2.js:1149674-1150627 placement
async function recordAutocompactOfferOutcome(answer, payload, msToAnswer, options) {
  let { accountUuid, modelKey } = payload;
  let { outcome, text, level } = await applyAutocompactOfferChoice(answer, payload, options);
  let now = Date.now();
  let markEligible = (config) => markAutoCompactOfferEligibleLogged(config, accountUuid, modelKey, now);
  if (outcome === "not_now")
    saveGlobalConfig(
      (config) => bumpAutoCompactOfferEsc(markEligible(config), accountUuid, modelKey),
      options.storageV5,
    );
  else if (outcome === "saved" || outcome === "kept")
    saveGlobalConfig(
      (config) =>
        markAutoCompactOfferResolved(markEligible(config), accountUuid, modelKey, {
          choice: outcome === "saved" ? "accept" : "keep",
          tokens: outcome === "saved" ? answer.tokens : payload.windowTokens,
        }),
      options.storageV5,
    );
  if (outcome === "saved" || outcome === "kept" || outcome === "not_now") logFeatureOk("autocompact_offer");
  else if (outcome !== "unavailable" || answer.choice === "accept")
    logFeatureBad("autocompact_offer", outcome);
  let found = payload.sizes.find((siz) => siz.tokens === answer.tokens);
  logEvent("tengu_autocompact_offer_resolved", {
    ...offerTelemetryFields(payload, answer),
    choice: fromEnum(answer.choice),
    outcome: fromEnum(outcome),
    chosen_tokens: answer.tokens,
    changed_from_default: answer.tokens !== payload.defaultTokens,
    stepper_moves: answer.stepperMoves,
    stray_keys: answer.strayKeys,
    ms_to_answer: msToAnswer,
    warning_shown: found !== undefined && payload.contextTokens >= found.firesAt,
    will_compact_next_turn:
      outcome === "saved" && found !== undefined && options.getLiveContextTokens() >= found.firesAt,
  });
  options.appendSystemLine(text, level);
  return outcome;
}
//@ chunk-czq1j3j2.js:1150627-1151803 placement
async function applyAutocompactOfferChoice(selection, offer, context) {
  if (
    !makeAutocompactOfferPayload(offer, context) ||
    !offer.sizes.some((siz) => siz.tokens === selection.tokens)
  )
    return selection.choice === "esc"
      ? {
          outcome: "unavailable",
          text: "Autocompact unchanged \xB7 /autocompact to change it",
          level: "notice",
        }
      : {
          outcome: "unavailable",
          text: "That autocompact offer was out of date, so nothing was saved \xB7 /autocompact to set it",
          level: "warning",
        };
  if (selection.choice === "esc")
    return {
      outcome: "not_now",
      text: "Autocompact unchanged \xB7 /autocompact to change it",
      level: "notice",
    };
  if (selection.choice === "keep")
    return {
      outcome: "kept",
      text: `Keeping ${currentWindowLabel(offer)} \xB7 /autocompact to change`,
      level: "notice",
    };
  let applySummary = await applyAutoCompactWindow(
    String(selection.tokens),
    {
      storageV5: context.storageV5,
      options: {
        mainLoopModel: context.getLiveModel(),
        autoCompactWindow: context.getLiveWindow(),
      },
      onQueryEvent: (queryEvent) => {
        if (queryEvent.type === "apply_flag_settings") context.applyFlagSettings(queryEvent.settings);
      },
    },
    "offer",
  );
  let windowSettingForModel = findWindowSettingForModel(offer.modelKey);
  if (windowSettingForModel !== undefined && windowSettingForModel.source !== "userSettings")
    return {
      outcome: "overridden",
      text: applySummary,
      level: "warning",
    };
  if (windowSettingForModel?.window !== selection.tokens)
    return {
      outcome: "write_failed",
      text: `Autocompact unchanged \xB7 ${applySummary}`,
      level: "warning",
    };
  return {
    outcome: "saved",
    text: `Autocompact set to ${formatTokens(selection.tokens)} tokens for ${renderModelName(offer.modelKey)} \xB7 /autocompact to switch back`,
    level: "notice",
  };
}
//@ chunk-czq1j3j2.js:1151803-1152145 placement
function makeAutocompactOfferPayload(payload, source) {
  let eligibility = autocompactOfferEligibility({
    model: source.getLiveModel(),
    configuredWindow: source.getLiveWindow(),
  });
  return (
    eligibility !== undefined &&
    eligibility.block === undefined &&
    eligibility.accountUuid === payload.accountUuid &&
    eligibility.modelKey === payload.modelKey &&
    eligibility.windowTokens === payload.windowTokens &&
    eligibility.currentSetting === payload.currentSetting &&
    !readAutoCompactOffer(getGlobalConfig(), payload.accountUuid, payload.modelKey)?.isAnswered &&
    source.getLiveContextTokens() >= payload.triggerTokens
  );
}
export {
  isAutoCompactOfferAnswered,
  MIN_BODY_ROWS,
  MIN_BODY_COLUMNS,
  DIALOG_HORIZONTAL_CHROME,
  offerTelemetryFields,
  describeCurrentWindow,
  currentWindowLabel,
  AUTOCOMPACT_OFFER_DIALOG,
  makeAutocompactOfferPayload,
  MIN_OFFER_WINDOW_TOKENS,
  autocompactOfferEligibility,
  readAutoCompactOffer,
  TENGU_BINARY_MUSIC,
  autocompactOfferConfig,
  describeOfferSkip,
  markAutoCompactOfferEligibleLogged,
  MIN_OFFER_DIALOG_ROWS,
  resolveOfferOrder,
  showAutocompactOffer,
};
