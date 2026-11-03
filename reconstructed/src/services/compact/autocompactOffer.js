/**
 * services/compact/autocompactOffer.ts
 *
 * 2.1.316 新增。自动压缩提议判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (20)
 * attribution: placement 20
 */
import { createHash } from "crypto";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  E,
  zodStrictObject,
  _enum,
  array,
  u,
  string,
  union,
  M,
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
import {
  markAutoCompactOfferEligibleLogged,
  bumpAutoCompactOfferEsc,
  markAutoCompactOfferResolved,
  readAutoCompactOffer,
} from "../../utils/permissions/permissionSetup.js";
import { logEvent } from "../analytics/index.js";
import { applyAutoCompactWindow } from "../../commands/autocompact/autocompact.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";

//@ chunk-18hwfzwa.js:1109652-1109656 placement
init_react_production();
//@ chunk-18hwfzwa.js:1109694-1109812 placement
/**
 * 最多询问几次（2）。
 */
var TENGU_BINARY_MUSIC = "tengu_binary_music";
var MIN_OFFER_WINDOW_TOKENS = 200000;
var MAX_OFFER_WINDOW_TOKENS = 1e6;
var DEFAULT_OFFER_TOKENS = 400000;
var OFFER_WINDOW_SIZE_LADDER = [300000, 400000, 500000, 600000, 700000, 800000, 900000];
var MAX_OFFER_ASKS = 2;
//@ chunk-18hwfzwa.js:1109812-1109862 placement
/**
 * 提议候选 token 数的 schema（≥Kx 且 < R8）。
 */
function offerTokensSchema() {
  return E()
    .int()
    .min(TRANSPORT_LABELS)
    .max(MAX_OFFER_WINDOW_TOKENS - 1);
}
//@ chunk-18hwfzwa.js:1109862-1110298 placement
/**
 * 自动压缩窗口提议实验配置 schema（arm、触发阈值、候选大小、顺序、最多询问次数）。
 */
var AUTOCOMPACT_OFFER_CONFIG_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    arm: _enum(["control", "offer"]),
    triggerTokens: E()
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
    maxAsks: E().int().min(1).max(5).default(MAX_OFFER_ASKS),
  }).refine(
    (h) => h.sizes.includes(h.defaultTokens) && h.sizes.every((siz, D) => D === 0 || siz > h.sizes[D - 1]),
    "sizes must ascend and include defaultTokens",
  ),
);
//@ chunk-18hwfzwa.js:1110298-1110488 placement
function autocompactOfferConfig(featureValue_CACHED_MAY_BE_STALE) {
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "object" ||
    featureValue_CACHED_MAY_BE_STALE === null ||
    Object.keys(featureValue_CACHED_MAY_BE_STALE).length === 0
  )
    return;
  let x = AUTOCOMPACT_OFFER_CONFIG_SCHEMA().safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (!x.success) {
    logFeatureSad("autocompact_offer", "served_value_invalid");
    return;
  }
  return x.data;
}
//@ chunk-18hwfzwa.js:1110488-1110960 placement
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
  let ee = isAutoCompactEnabled();
  let { window: ke, source } = getAutoCompactWindow(modelContextInfo, ee ? configuredWindow : undefined);
  let Be = autocompactWindowSetting(source, modelContextInfo.settingsKey, configuredWindow);
  return {
    accountUuid,
    modelKey: modelContextInfo.settingsKey,
    windowTokens: ke,
    currentSetting: Be.currentSetting,
    block: !ee
      ? "auto_compact_off"
      : !isSettingSourceEnabled("userSettings")
        ? "user_settings_off"
        : Be.block,
  };
}
//@ chunk-18hwfzwa.js:1110960-1111567 placement
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
  let L = Object.hasOwn(configuredWindow.byModel, settingsKey);
  let ee = L ? configuredWindow.byModel[settingsKey] : configuredWindow.default;
  let windowSettingForModel = findWindowSettingForModel(settingsKey);
  let Be = !(windowSettingForModel === undefined || windowSettingForModel.source === "userSettings")
    ? "other_settings_file"
    : ee === undefined || ee === "auto"
      ? "auto"
      : L
        ? "own_per_model"
        : "own_top_level";
  if (windowSettingForModel?.window !== ee || (windowSettingForModel?.perModel ?? false) !== L)
    return {
      currentSetting: Be,
      block: "settings_changed",
    };
  return {
    currentSetting: Be,
    block: Be === "other_settings_file" ? Be : undefined,
  };
}
//@ chunk-18hwfzwa.js:1111567-1111654 placement
/**
 * 给出不能提议的原因（已阻断，或窗口不高于默认）。
 */
function describeOfferSkip(h, defaultTokens) {
  return h.block ?? (h.windowTokens > defaultTokens ? undefined : "window_not_above_default");
}
//@ chunk-18hwfzwa.js:1111654-1111689 placement
var AUTOCOMPACT_OFFER_ORDER = "autocompact-offer-order:";
//@ chunk-18hwfzwa.js:1111689-1111820 placement
/**
 * random 顺序时按账号哈希确定 lower_first 或 keep_first。
 */
function resolveOfferOrder(order, accountUuid) {
  if (order !== "random") return order;
  let [D = 0] = createHash("sha256")
    .update(AUTOCOMPACT_OFFER_ORDER + accountUuid)
    .digest();
  return D % 2 === 0 ? "lower_first" : "keep_first";
}
//@ chunk-18hwfzwa.js:1111820-1112406 placement
/**
 * 自动压缩提议对话框要求的最小终端行数（12），不足时记为 terminal_too_short。
 */
var AUTOCOMPACT_OFFER_PAYLOAD_SCHEMA = DoctorLazy(() =>
  u({
    order: _enum(["lower_first", "keep_first"]),
    accountUuid: string(),
    modelKey: string(),
    sizes: array(
      u({
        tokens: E(),
        firesAt: E(),
      }),
    ).min(1),
    defaultTokens: E(),
    triggerTokens: E(),
    contextTokens: E(),
    windowTokens: E(),
    currentSetting: _enum(["auto", "own_per_model", "own_top_level"]),
    askNumber: E(),
  }).refine((h) => h.sizes.some((siz) => siz.tokens === h.defaultTokens)),
);
var MIN_OFFER_DIALOG_ROWS = 12;
var AUTOCOMPACT_OFFER_DIALOG = withHideWhile({
  kind: AUTOCOMPACT_OFFER,
  payload: AUTOCOMPACT_OFFER_PAYLOAD_SCHEMA,
  result: DoctorLazy(() =>
    union([
      u({
        choice: _enum(["accept", "keep", "esc"]),
        tokens: E(),
        stepperMoves: E(),
        strayKeys: E(),
        preselected: _enum(["lower", "keep"]),
        isScreenReader: M(),
      }),
      literal("cancelled"),
    ]),
  ),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});
//@ chunk-18hwfzwa.js:1112406-1112535 placement
/**
 * 当前窗口设置描述（auto 时注明默认）。
 */
function describeCurrentWindow({ windowTokens, currentSetting }) {
  return currentSetting === "auto"
    ? `${formatTokens(windowTokens)} tokens (default via auto setting)`
    : `${formatTokens(windowTokens)} tokens`;
}
//@ chunk-18hwfzwa.js:1112535-1112643 placement
/**
 * 当前窗口设置短标签。
 */
function currentWindowLabel({ windowTokens, currentSetting }) {
  return currentSetting === "auto"
    ? `auto (${formatTokens(windowTokens)} tokens)`
    : `${formatTokens(windowTokens)} tokens`;
}
//@ chunk-18hwfzwa.js:1112643-1112941 placement
/**
 * 提议对话框的遥测字段。
 */
function offerTelemetryFields(h, { preselected, isScreenReader }) {
  return {
    preselected: fromEnum(preselected),
    screen_reader: isScreenReader,
    window_model: telemetrySafeModelName(h.modelKey),
    context_tokens: h.contextTokens,
    trigger_tokens: h.triggerTokens,
    default_tokens: h.defaultTokens,
    window_tokens: h.windowTokens,
    current_setting: fromEnum(h.currentSetting),
    ask_number: h.askNumber,
  };
}
//@ chunk-18hwfzwa.js:1112941-1113195 placement
/**
 * 显示提议对话框并记录结果，返回选择或 cancelled/withdrawn。
 */
async function showAutocompactOffer(requestDialog, x, D) {
  let L;
  let ee = await requestDialog(AUTOCOMPACT_OFFER_DIALOG, x, {
    place: "under",
    onFirstReveal: () => {
      L = Date.now();
    },
  });
  if (ee === "cancelled") return L === undefined ? "cancelled" : "withdrawn";
  return (await recordAutocompactOfferOutcome(ee, x, L === undefined ? undefined : Date.now() - L, D)) ===
    "unavailable"
    ? "cancelled"
    : ee.choice;
}
//@ chunk-18hwfzwa.js:1113195-1114148 placement
async function recordAutocompactOfferOutcome(h, x, msToAnswer, L) {
  let { accountUuid, modelKey } = x;
  let { outcome, text, level } = await applyAutocompactOfferChoice(h, x, L);
  let now = Date.now();
  let ze = (rt) => markAutoCompactOfferEligibleLogged(rt, accountUuid, modelKey, now);
  if (outcome === "not_now")
    saveGlobalConfig((rt) => bumpAutoCompactOfferEsc(ze(rt), accountUuid, modelKey), L.storageV5);
  else if (outcome === "saved" || outcome === "kept")
    saveGlobalConfig(
      (rt) =>
        markAutoCompactOfferResolved(ze(rt), accountUuid, modelKey, {
          choice: outcome === "saved" ? "accept" : "keep",
          tokens: outcome === "saved" ? h.tokens : x.windowTokens,
        }),
      L.storageV5,
    );
  if (outcome === "saved" || outcome === "kept" || outcome === "not_now") logFeatureOk("autocompact_offer");
  else if (outcome !== "unavailable" || h.choice === "accept") logFeatureBad("autocompact_offer", outcome);
  let found = x.sizes.find((siz) => siz.tokens === h.tokens);
  logEvent("tengu_autocompact_offer_resolved", {
    ...offerTelemetryFields(x, h),
    choice: fromEnum(h.choice),
    outcome: fromEnum(outcome),
    chosen_tokens: h.tokens,
    changed_from_default: h.tokens !== x.defaultTokens,
    stepper_moves: h.stepperMoves,
    stray_keys: h.strayKeys,
    ms_to_answer: msToAnswer,
    warning_shown: found !== undefined && x.contextTokens >= found.firesAt,
    will_compact_next_turn:
      outcome === "saved" && found !== undefined && L.getLiveContextTokens() >= found.firesAt,
  });
  L.appendSystemLine(text, level);
  return outcome;
}
//@ chunk-18hwfzwa.js:1114148-1115324 placement
async function applyAutocompactOfferChoice(h, x, D) {
  if (!makeAutocompactOfferPayload(x, D) || !x.sizes.some((siz) => siz.tokens === h.tokens))
    return h.choice === "esc"
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
  if (h.choice === "esc")
    return {
      outcome: "not_now",
      text: "Autocompact unchanged \xB7 /autocompact to change it",
      level: "notice",
    };
  if (h.choice === "keep")
    return {
      outcome: "kept",
      text: `Keeping ${currentWindowLabel(x)} \xB7 /autocompact to change`,
      level: "notice",
    };
  let ee = await applyAutoCompactWindow(
    String(h.tokens),
    {
      storageV5: D.storageV5,
      options: {
        mainLoopModel: D.getLiveModel(),
        autoCompactWindow: D.getLiveWindow(),
      },
      onQueryEvent: (Re) => {
        if (Re.type === "apply_flag_settings") D.applyFlagSettings(Re.settings);
      },
    },
    "offer",
  );
  let windowSettingForModel = findWindowSettingForModel(x.modelKey);
  if (windowSettingForModel !== undefined && windowSettingForModel.source !== "userSettings")
    return {
      outcome: "overridden",
      text: ee,
      level: "warning",
    };
  if (windowSettingForModel?.window !== h.tokens)
    return {
      outcome: "write_failed",
      text: `Autocompact unchanged \xB7 ${ee}`,
      level: "warning",
    };
  return {
    outcome: "saved",
    text: `Autocompact set to ${formatTokens(h.tokens)} tokens for ${renderModelName(x.modelKey)} \xB7 /autocompact to switch back`,
    level: "notice",
  };
}
//@ chunk-18hwfzwa.js:1115324-1115666 placement
function makeAutocompactOfferPayload(h, x) {
  let D = autocompactOfferEligibility({
    model: x.getLiveModel(),
    configuredWindow: x.getLiveWindow(),
  });
  return (
    D !== undefined &&
    D.block === undefined &&
    D.accountUuid === h.accountUuid &&
    D.modelKey === h.modelKey &&
    D.windowTokens === h.windowTokens &&
    D.currentSetting === h.currentSetting &&
    !readAutoCompactOffer(getGlobalConfig(), h.accountUuid, h.modelKey)?.isAnswered &&
    x.getLiveContextTokens() >= h.triggerTokens
  );
}
//@ chunk-18hwfzwa.js:1115666-1115670 placement
init_react_production();
//@ chunk-18hwfzwa.js:1115670-1115692 placement
/**
 * 自动压缩提议对话框正文的最小列数（20）。
 */
var MIN_BODY_ROWS = 2;
var DIALOG_HORIZONTAL_CHROME = 6;
var MIN_BODY_COLUMNS = 20;
export {
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
  TENGU_BINARY_MUSIC,
  autocompactOfferConfig,
  describeOfferSkip,
  MIN_OFFER_DIALOG_ROWS,
  resolveOfferOrder,
  showAutocompactOffer,
};
