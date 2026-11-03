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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { E, zodStrictObject, U, A, u, o, Ue, M, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { Kx, getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { wt } from "../../remote/remoteMode.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { getTeammateAgentId } from "../../bootstrap/state.js";
import { getModelContextInfo } from "../../utils/model/modelContextInfo.js";
import { isAutoCompactEnabled } from "./compactSettings.js";
import { getAutoCompactWindow } from "./autoCompact.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { $8n, findWindowSettingForModel } from "./autoCompactWindow.js";
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { AUTOCOMPACT_OFFER } from "../../components/nudges/nudgeIds.js";
import { formatTokens } from "../../utils/format.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import {
  markAutoCompactOfferEligibleLogged,
  lhi,
  dhi,
  readAutoCompactOffer,
} from "../../utils/permissions/permissionSetup.js";
import { logEvent } from "../analytics/index.js";
import { applyAutoCompactWindow } from "../../commands/autocompact/autocompact.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";

//@ chunk-18hwfzwa.js:1109652-1109656 placement
j();
//@ chunk-18hwfzwa.js:1109694-1109812 placement
var TENGU_BINARY_MUSIC = "tengu_binary_music",
  T8 = 200000,
  R8 = 1e6,
  ako = 400000,
  dit = [300000, 400000, 500000, 600000, 700000, 800000, 900000],
  lko = 2;
//@ chunk-18hwfzwa.js:1109812-1109862 placement
function cit() {
  return E()
    .int()
    .min(Kx)
    .max(R8 - 1);
}
/**
 * 自动压缩窗口提议实验配置 schema（arm、触发阈值、候选大小、顺序、最多询问次数）。
 */
//@ chunk-18hwfzwa.js:1109862-1110298 placement
var AUTOCOMPACT_OFFER_CONFIG_SCHEMA = DoctorLazy(() =>
  zodStrictObject({
    arm: U(["control", "offer"]),
    triggerTokens: E()
      .int()
      .min(T8)
      .max(R8 - 1)
      .default(T8),
    defaultTokens: cit().default(ako),
    order: U(["random", "lower_first", "keep_first"]).default("random"),
    sizes: A(cit())
      .min(1)
      .max(dit.length + 2)
      .default(dit),
    maxAsks: E().int().min(1).max(5).default(lko),
  }).refine(
    (h) => h.sizes.includes(h.defaultTokens) && h.sizes.every((size, D) => D === 0 || size > h.sizes[D - 1]),
    "sizes must ascend and include defaultTokens",
  ),
);
//@ chunk-18hwfzwa.js:1110298-1110488 placement
function autocompactOfferConfig(h) {
  if (typeof h !== "object" || h === null || Object.keys(h).length === 0) return;
  let safeParse = AUTOCOMPACT_OFFER_CONFIG_SCHEMA().safeParse(h);
  if (!safeParse.success) {
    logFeatureSad("autocompact_offer", "served_value_invalid");
    return;
  }
  return safeParse.data;
}
//@ chunk-18hwfzwa.js:1110488-1110960 placement
function autocompactOfferEligibility({ model: model, configuredWindow: configuredWindow }) {
  let D = getOauthAccountInfo()?.accountUuid;
  if (
    !getGlobalConfig().hasCompletedOnboarding ||
    D === void 0 ||
    wt() ||
    isActingAsBgJob() ||
    getTeammateAgentId() !== void 0
  )
    return;
  let L = getModelContextInfo(model);
  if (L.longContextWindowWithoutOptIn < R8 || L.contextWindow < R8) return;
  let ee = isAutoCompactEnabled(),
    { window: ke, source: source } = getAutoCompactWindow(L, ee ? configuredWindow : void 0),
    Be = autocompactWindowSetting(source, L.settingsKey, configuredWindow);
  return {
    accountUuid: D,
    modelKey: L.settingsKey,
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
function autocompactWindowSetting(h, x, D) {
  if (h === "env" || h === "experiment") return { currentSetting: h, block: h };
  if (h === "clientdata") return { currentSetting: "server", block: "server" };
  if (typeof D !== "object" || $8n(D)) return { currentSetting: "launch_flag", block: "launch_flag" };
  let hasOwn = Object.hasOwn(D.byModel, x),
    ee = hasOwn ? D.byModel[x] : D.default,
    ke = findWindowSettingForModel(x),
    Be = !(ke === void 0 || ke.source === "userSettings")
      ? "other_settings_file"
      : ee === void 0 || ee === "auto"
        ? "auto"
        : hasOwn
          ? "own_per_model"
          : "own_top_level";
  if (ke?.window !== ee || (ke?.perModel ?? !1) !== hasOwn)
    return { currentSetting: Be, block: "settings_changed" };
  return { currentSetting: Be, block: Be === "other_settings_file" ? Be : void 0 };
}
//@ chunk-18hwfzwa.js:1111567-1111654 placement
function fit(h, x) {
  return h.block ?? (h.windowTokens > x ? void 0 : "window_not_above_default");
}
//@ chunk-18hwfzwa.js:1111654-1111689 placement
var AUTOCOMPACT_OFFER_ORDER = "autocompact-offer-order:";
/**
 * random 顺序时按账号哈希确定 lower_first 或 keep_first。
 */
//@ chunk-18hwfzwa.js:1111689-1111820 placement
function resolveOfferOrder(h, x) {
  if (h !== "random") return h;
  let [D = 0] = createHash("sha256")
    .update(AUTOCOMPACT_OFFER_ORDER + x)
    .digest();
  return D % 2 === 0 ? "lower_first" : "keep_first";
}
/**
 * 自动压缩窗口提议对话框的载荷 schema 与对话框定义。
 */
//@ chunk-18hwfzwa.js:1111820-1112406 placement
var AUTOCOMPACT_OFFER_PAYLOAD_SCHEMA = DoctorLazy(() =>
    u({
      order: U(["lower_first", "keep_first"]),
      accountUuid: o(),
      modelKey: o(),
      sizes: A(u({ tokens: E(), firesAt: E() })).min(1),
      defaultTokens: E(),
      triggerTokens: E(),
      contextTokens: E(),
      windowTokens: E(),
      currentSetting: U(["auto", "own_per_model", "own_top_level"]),
      askNumber: E(),
    }).refine((h) => h.sizes.some((size) => size.tokens === h.defaultTokens)),
  ),
  hit = 12,
  AUTOCOMPACT_OFFER_DIALOG = withHideWhile({
    kind: AUTOCOMPACT_OFFER,
    payload: AUTOCOMPACT_OFFER_PAYLOAD_SCHEMA,
    result: DoctorLazy(() =>
      Ue([
        u({
          choice: U(["accept", "keep", "esc"]),
          tokens: E(),
          stepperMoves: E(),
          strayKeys: E(),
          preselected: U(["lower", "keep"]),
          isScreenReader: M(),
        }),
        T("cancelled"),
      ]),
    ),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
/**
 * 当前窗口设置描述（auto 时注明默认）。
 */
//@ chunk-18hwfzwa.js:1112406-1112535 placement
function describeCurrentWindow({ windowTokens: windowTokens, currentSetting: currentSetting }) {
  return currentSetting === "auto"
    ? `${formatTokens(windowTokens)} tokens (default via auto setting)`
    : `${formatTokens(windowTokens)} tokens`;
}
/**
 * 当前窗口设置短标签。
 */
//@ chunk-18hwfzwa.js:1112535-1112643 placement
function currentWindowLabel({ windowTokens: windowTokens, currentSetting: currentSetting }) {
  return currentSetting === "auto"
    ? `auto (${formatTokens(windowTokens)} tokens)`
    : `${formatTokens(windowTokens)} tokens`;
}
/**
 * 提议对话框的遥测字段。
 */
//@ chunk-18hwfzwa.js:1112643-1112941 placement
function offerTelemetryFields(h, { preselected: preselected, isScreenReader: isScreenReader }) {
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
/**
 * 显示提议对话框并记录结果，返回选择或 cancelled/withdrawn。
 */
//@ chunk-18hwfzwa.js:1112941-1113195 placement
async function showAutocompactOffer(h, x, D) {
  let L,
    ee = await h(AUTOCOMPACT_OFFER_DIALOG, x, {
      place: "under",
      onFirstReveal: () => {
        L = Date.now();
      },
    });
  if (ee === "cancelled") return L === void 0 ? "cancelled" : "withdrawn";
  return (await recordAutocompactOfferOutcome(ee, x, L === void 0 ? void 0 : Date.now() - L, D)) ===
    "unavailable"
    ? "cancelled"
    : ee.choice;
}
//@ chunk-18hwfzwa.js:1113195-1114148 placement
async function recordAutocompactOfferOutcome(h, x, D, L) {
  let { accountUuid: accountUuid, modelKey: modelKey } = x,
    { outcome: outcome, text: text, level: level } = await applyAutocompactOfferChoice(h, x, L),
    now = Date.now(),
    ze = (rt) => markAutoCompactOfferEligibleLogged(rt, accountUuid, modelKey, now);
  if (outcome === "not_now") saveGlobalConfig((rt) => lhi(ze(rt), accountUuid, modelKey), L.storageV5);
  else if (outcome === "saved" || outcome === "kept")
    saveGlobalConfig(
      (rt) =>
        dhi(ze(rt), accountUuid, modelKey, {
          choice: outcome === "saved" ? "accept" : "keep",
          tokens: outcome === "saved" ? h.tokens : x.windowTokens,
        }),
      L.storageV5,
    );
  if (outcome === "saved" || outcome === "kept" || outcome === "not_now") logFeatureOk("autocompact_offer");
  else if (outcome !== "unavailable" || h.choice === "accept") logFeatureBad("autocompact_offer", outcome);
  let found = x.sizes.find((size) => size.tokens === h.tokens);
  return (
    logEvent("tengu_autocompact_offer_resolved", {
      ...offerTelemetryFields(x, h),
      choice: fromEnum(h.choice),
      outcome: fromEnum(outcome),
      chosen_tokens: h.tokens,
      changed_from_default: h.tokens !== x.defaultTokens,
      stepper_moves: h.stepperMoves,
      stray_keys: h.strayKeys,
      ms_to_answer: D,
      warning_shown: found !== void 0 && x.contextTokens >= found.firesAt,
      will_compact_next_turn:
        outcome === "saved" && found !== void 0 && L.getLiveContextTokens() >= found.firesAt,
    }),
    L.appendSystemLine(text, level),
    outcome
  );
}
//@ chunk-18hwfzwa.js:1114148-1115324 placement
async function applyAutocompactOfferChoice(h, x, D) {
  if (!makeAutocompactOfferPayload(x, D) || !x.sizes.some((size) => size.tokens === h.tokens))
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
        options: { mainLoopModel: D.getLiveModel(), autoCompactWindow: D.getLiveWindow() },
        onQueryEvent: (Re) => {
          if (Re.type === "apply_flag_settings") D.applyFlagSettings(Re.settings);
        },
      },
      "offer",
    ),
    ke = findWindowSettingForModel(x.modelKey);
  if (ke !== void 0 && ke.source !== "userSettings")
    return { outcome: "overridden", text: ee, level: "warning" };
  if (ke?.window !== h.tokens)
    return { outcome: "write_failed", text: `Autocompact unchanged \xB7 ${ee}`, level: "warning" };
  return {
    outcome: "saved",
    text: `Autocompact set to ${formatTokens(h.tokens)} tokens for ${renderModelName(x.modelKey)} \xB7 /autocompact to switch back`,
    level: "notice",
  };
}
//@ chunk-18hwfzwa.js:1115324-1115666 placement
function makeAutocompactOfferPayload(h, x) {
  let D = autocompactOfferEligibility({ model: x.getLiveModel(), configuredWindow: x.getLiveWindow() });
  return (
    D !== void 0 &&
    D.block === void 0 &&
    D.accountUuid === h.accountUuid &&
    D.modelKey === h.modelKey &&
    D.windowTokens === h.windowTokens &&
    D.currentSetting === h.currentSetting &&
    !readAutoCompactOffer(getGlobalConfig(), h.accountUuid, h.modelKey)?.isAnswered &&
    x.getLiveContextTokens() >= h.triggerTokens
  );
}
//@ chunk-18hwfzwa.js:1115666-1115670 placement
j();
//@ chunk-18hwfzwa.js:1115670-1115692 placement
var AL = 2,
  hko = 6,
  yko = 20;

export {
  AL,
  yko,
  hko,
  offerTelemetryFields,
  describeCurrentWindow,
  currentWindowLabel,
  AUTOCOMPACT_OFFER_DIALOG,
  makeAutocompactOfferPayload,
  T8,
  autocompactOfferEligibility,
  TENGU_BINARY_MUSIC,
  autocompactOfferConfig,
  fit,
  hit,
  resolveOfferOrder,
  showAutocompactOffer,
};
