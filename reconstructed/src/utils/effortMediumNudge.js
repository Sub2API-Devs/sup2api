/**
 * utils/effortMediumNudge.ts
 *
 * 2.1.316 新增。medium effort 推荐判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (25)
 * attribution: placement 25
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, o, M, Ue, U, A, T } from "../../vendor/zod/v4/classic/schemas.js";
import {
  EFFORT_LEVELS,
  getModelSettingsKey,
  getEffortEnvOverride,
  orgOverridesUserEffort,
  getEffortLevelOrHigh,
  getEffortSettingsSources,
  isLegacyUserEffortModel,
} from "./effort.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { wi } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { wt } from "../remote/remoteMode.js";
import { isSettingSourceEnabled } from "./settings/constants.js";
import { isActingAsBgJob } from "./concurrentSessions.js";
import { env } from "./env.js";
import { getTeammateAgentId } from "../bootstrap/state.js";
import { countCharInString } from "./stringUtils.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { NUDGE_IDS } from "../components/nudges/nudgeIds.js";
import { lmn } from "../commands/terminalSetup/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./model/telemetryModelName.js";
import { logEvent } from "../services/analytics/index.js";
import { announce } from "./accessibility/screenReader.js";
import { logError } from "./log.js";
import { applyEffortCommand } from "../commands/effort/effort.js";
import { EFFORT_LEVEL_KEY } from "../components/EffortIndicator.js";
import { j } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:155528-156543 placement
var EFFORT_NUDGE_COPY_SCHEMA = 500,
  bQ = 6,
  uNt = 120,
  BBe = 60,
  mNt = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/,
  kQ = ["high", "xhigh", "max"],
  nie = ["medium", "high", "xhigh"],
  pNt = ["high"],
  MEDIUM = "medium",
  fNt = 200,
  iie = DoctorLazy(() =>
    u({
      title: o()
        .min(1)
        .max(uNt)
        .refine(LP, "title must not contain control chars")
        .refine(GD, "title must be a single line")
        .optional(),
      body: o()
        .min(1)
        .max(EFFORT_NUDGE_COPY_SCHEMA)
        .refine(LP, "body must not contain control chars")
        .refine((h) => KBe(h) <= bQ, `body must be at most ${bQ} lines`),
      confirmLabel: o()
        .min(1)
        .max(BBe)
        .refine(LP, "confirmLabel must not contain control chars")
        .refine(GD, "confirmLabel must be a single line")
        .optional(),
      cancelLabel: o()
        .min(1)
        .max(BBe)
        .refine(LP, "cancelLabel must not contain control chars")
        .refine(GD, "cancelLabel must be a single line")
        .optional(),
      cancelFirst: M().optional(),
      fromEffort: Ue([U(kQ), A(U(kQ)).min(1)]).optional(),
      toEffort: U(nie).optional(),
      showWarning: M().optional(),
      warningText: o()
        .min(1)
        .max(fNt)
        .refine(LP, "warningText must not contain control chars")
        .refine(GD, "warningText must be a single line")
        .optional(),
    }),
  );
//@ chunk-18hwfzwa.js:156543-156621 placement
function gNt(h) {
  let x = HBe(h.toEffort ?? MEDIUM);
  return getNudgeFromEfforts(h).every((D) => x < HBe(D));
}
//@ chunk-18hwfzwa.js:156621-156739 placement
function getNudgeFromEfforts(h) {
  if (h.fromEffort === void 0) return pNt;
  return typeof h.fromEffort === "string" ? [h.fromEffort] : h.fromEffort;
}
//@ chunk-18hwfzwa.js:156739-156776 placement
function HBe(h) {
  return EFFORT_LEVELS.indexOf(h);
}
//@ chunk-18hwfzwa.js:156776-156939 placement
var EFFORT_NUDGE_MODEL_FLAGS = {
    "claude-opus-5": { flag: "tengu_radiant_island", from: ["high"] },
    "claude-fable-5-1": { flag: "tengu_steady_plum", from: ["high", "xhigh", "max"] },
  },
  CLAUDE_OPUS_5 = "claude-opus-5";
//@ chunk-18hwfzwa.js:156939-157002 placement
function vQ(h) {
  let x = getModelSettingsKey(h);
  return Object.hasOwn(EFFORT_NUDGE_MODEL_FLAGS, x) ? x : void 0;
}
//@ chunk-18hwfzwa.js:157002-157359 placement
function effortMediumNudgeCandidate({ model: model, effortValue: effortValue }) {
  let D = getGlobalConfig(),
    L = vQ(model);
  if (!D.hasCompletedOnboarding || L === void 0 || hasSeenEffortNudge(D, L)) return;
  let ee = effortPinSource({ model: model, effortValue: effortValue });
  if (ee === void 0) return;
  let { cohort: cohort, fromLevel: fromLevel } = ee,
    Be = servedEffortNudgeCopy(getFeatureValue_CACHED_MAY_BE_STALE(EFFORT_NUDGE_MODEL_FLAGS[L].flag, {}));
  if (Be === void 0 || !getNudgeFromEfforts(Be).includes(fromLevel)) return;
  let He = Be.toEffort ?? MEDIUM;
  return { ...Be, cohort: cohort, modelKey: L, fromLevel: fromLevel, toLevel: He };
}
//@ chunk-18hwfzwa.js:157359-157470 placement
function hasSeenEffortNudge(h, x) {
  return (
    h.hasSeenEffortMediumNudgeByModel?.[x] === !0 ||
    (x === CLAUDE_OPUS_5 && h.hasSeenEffortMediumNudge === !0)
  );
}
//@ chunk-18hwfzwa.js:157470-157724 placement
function markEffortNudgeSeen(h, x) {
  let D = x === CLAUDE_OPUS_5;
  if (h.hasSeenEffortMediumNudgeByModel?.[x] === !0 && (!D || h.hasSeenEffortMediumNudge === !0)) return h;
  return {
    ...h,
    hasSeenEffortMediumNudgeByModel: { ...h.hasSeenEffortMediumNudgeByModel, [x]: !0 },
    ...(D && { hasSeenEffortMediumNudge: !0 }),
  };
}
//@ chunk-18hwfzwa.js:157724-158114 placement
function servedEffortNudgeCopy(h) {
  let x = iie(),
    safeParse = x.safeParse(h);
  if (safeParse.success) return UBe(safeParse.data);
  if (typeof h !== "object" || h === null || Object.keys(h).length === 0) return;
  logFeatureSad("effort_medium_nudge", "served_copy_invalid");
  let L = new Set(safeParse.error.issues.map((issue) => issue.path[0]));
  if (L.has("body") || L.has("fromEffort") || L.has("toEffort")) return;
  let safeParse_2 = x.safeParse(wi(h, (ke, Re) => L.has(Re)));
  return safeParse_2.success ? UBe(safeParse_2.data) : void 0;
}
//@ chunk-18hwfzwa.js:158114-158203 placement
function UBe(h) {
  if (gNt(h)) return h;
  logFeatureSad("effort_medium_nudge", "served_copy_invalid");
  return;
}
//@ chunk-18hwfzwa.js:158203-158620 placement
function effortPinSource({ model: model, effortValue: effortValue }) {
  let D = vQ(model);
  if (
    D === void 0 ||
    getEffortEnvOverride() !== void 0 ||
    wt() ||
    !isSettingSourceEnabled("userSettings") ||
    orgOverridesUserEffort(model) ||
    isActingAsBgJob() ||
    env.CLAUDE_BRIDGE_REATTACH_SESSION !== void 0 ||
    getTeammateAgentId() !== void 0
  )
    return;
  let L = SNt(getEffortLevelOrHigh(model, effortValue), EFFORT_NUDGE_MODEL_FLAGS[D].from);
  if (L === void 0) return;
  let ee = findEffortSettingSource(model);
  if (ee === void 0 && effortValue === void 0) return { cohort: "default", fromLevel: L };
  if (ee?.source === "userSettings" && ee.effortLevel === L && effortValue === L)
    return { cohort: "user_pin", fromLevel: L };
  return;
}
//@ chunk-18hwfzwa.js:158620-158664 placement
function SNt(h, x) {
  return x.find((D) => D === h);
}
/**
 * 从高到低优先级查找某模型生效的 effort 设置来源：先看 modelSettings 里精确/同键模型的 effortLevel，再看来源级 effortLevel（用户设置只对旧版模型生效）。
 */
//@ chunk-18hwfzwa.js:158664-159029 placement
function findEffortSettingSource(h) {
  let x = getModelSettingsKey(h),
    D = getEffortSettingsSources();
  for (let L = D.length - 1; L >= 0; L--) {
    let { source: source, settings: settings } = D[L],
      Re;
    for (let [He, We] of Object.entries(settings.modelSettings ?? {})) {
      let ze = We?.effortLevel;
      if (ze === void 0 || getModelSettingsKey(He) !== x) continue;
      if (He === x) {
        Re = ze;
        break;
      }
      Re ??= ze;
    }
    let Be = Re ?? (source !== "userSettings" || isLegacyUserEffortModel(x) ? settings.effortLevel : void 0);
    if (Be !== void 0) return { source: source, effortLevel: Be };
  }
  return;
}
//@ chunk-18hwfzwa.js:159029-159076 placement
function die(h) {
  return h.replace(
    /\r\n?/g,
    `
`,
  );
}
//@ chunk-18hwfzwa.js:159076-159116 placement
function KBe(h) {
  return (
    countCharInString(
      die(h),
      `
`,
    ) + 1
  );
}
//@ chunk-18hwfzwa.js:159116-159168 placement
function GD(h) {
  return KBe(h) === 1 && !h.includes("\t");
}
//@ chunk-18hwfzwa.js:159168-159202 placement
function LP(h) {
  return !mNt.test(h);
}
//@ chunk-18hwfzwa.js:159202-159628 placement
var effortMediumNudgeDialogDef = withHideWhile({
  kind: NUDGE_IDS,
  payload: DoctorLazy(() =>
    u({
      model: o(),
      copy: iie()
        .extend({
          cohort: U(["default", "user_pin"]),
          modelKey: o().refine((h) => Object.hasOwn(EFFORT_NUDGE_MODEL_FLAGS, h)),
          fromLevel: U(kQ),
          toLevel: U(nie),
        })
        .refine((h) => EFFORT_LEVELS.indexOf(h.toLevel) < EFFORT_LEVELS.indexOf(h.fromLevel)),
    }),
  ),
  result: DoctorLazy(() =>
    Ue([
      u({
        choice: U(["accept", "decline"]),
        optionOrder: U(["confirm_first", "cancel_first", "screen_reader"]),
      }),
      T("cancelled"),
    ]),
  ),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});
/**
 * 等待活动空闲后弹出"降低推理强度到 medium"的提示对话框，用户作答后应用选择。
 */
//@ chunk-18hwfzwa.js:159628-159791 placement
async function showEffortMediumNudge(h, x, D, L) {
  await lmn(D.activity, D.signal);
  let ee = await h(effortMediumNudgeDialogDef, x, { place: "under", signal: D.signal });
  if (ee === "cancelled") return;
  await resolveEffortMediumNudge(ee, x.copy, L);
}
//@ chunk-18hwfzwa.js:159791-160641 placement
async function resolveEffortMediumNudge(
  { choice: choice, optionOrder: optionOrder },
  { cohort: cohort, modelKey: modelKey, fromLevel: fromLevel, toLevel: toLevel, showWarning: showWarning },
  Be,
) {
  let He = {
    cohort: fromEnum(cohort),
    option_order: fromEnum(optionOrder),
    nudge_model: telemetrySafeModelName(modelKey),
    from_level: fromEnum(fromLevel),
    to_level: fromEnum(toLevel),
    warning_shown: showWarning === !0,
  };
  if (choice === "accept" && !isNudgeStillApplicable(modelKey, fromLevel, Be)) {
    (logFeatureBad("effort_medium_nudge", "unavailable_at_accept"),
      logEvent("tengu_effort_medium_nudge_resolved", {
        choice: fromEnum(choice),
        outcome: fromEnum("unavailable"),
        ...He,
      }));
    let ze = "Effort setting unavailable right now \xB7 nothing changed";
    (announce(`[${ze}]`),
      Be.addNotification({
        key: "effort-medium-nudge-result",
        kind: "warning",
        text: ze,
        color: "warning",
        priority: "high",
      }));
    return;
  }
  let We = choice === "accept" ? await applyEffortMediumNudgeResult(Be, toLevel) : "declined";
  if (
    (saveGlobalConfig((ze) => markEffortNudgeSeen(ze, modelKey), Be.storageV5).catch(logError),
    We === "write_failed")
  )
    logFeatureBad("effort_medium_nudge", "settings_write_failed");
  else logFeatureOk("effort_medium_nudge");
  logEvent("tengu_effort_medium_nudge_resolved", { choice: fromEnum(choice), outcome: fromEnum(We), ...He });
}
//@ chunk-18hwfzwa.js:160641-160762 placement
function isNudgeStillApplicable(h, x, D) {
  let liveModel = D.getLiveModel();
  return (
    vQ(liveModel) === h &&
    effortPinSource({ model: liveModel, effortValue: D.getLiveEffort() })?.fromLevel === x
  );
}
//@ chunk-18hwfzwa.js:160762-161354 placement
async function applyEffortMediumNudgeResult(
  {
    setAppState: setAppState,
    addNotification: addNotification,
    storageV5: storageV5,
    getLiveEffort: getLiveEffort,
    getLiveUltracode: getLiveUltracode,
  },
  ke,
) {
  let Re = await applyEffortCommand(
    ke,
    { effort: getLiveEffort(), ultracode: getLiveUltracode(), route: "nudge" },
    setAppState,
    !0,
    storageV5,
  );
  if (!Re.effortUpdate)
    return (
      announce(`[${Re.message}]`),
      addNotification({
        key: "effort-medium-nudge-result",
        kind: "warning",
        text: Re.message,
        color: "warning",
        priority: "high",
        invalidates: [EFFORT_LEVEL_KEY],
      }),
      "write_failed"
    );
  let Be = Re.effortUpdate.value === ke ? `Effort set to ${ke} and saved as your default` : Re.message;
  return (
    announce(`[${Be}]`),
    addNotification({
      key: "effort-medium-nudge-result",
      kind: "feedback",
      text: Be,
      priority: "high",
      timeoutMs: 5000,
      invalidates: [EFFORT_LEVEL_KEY],
    }),
    "switched"
  );
}
//@ chunk-18hwfzwa.js:161354-161358 placement
j();
//@ chunk-18hwfzwa.js:161358-161401 placement
function WNt(Go) {
  return (logError(Go), { success: !1 });
}

export {
  WNt,
  effortMediumNudgeCandidate,
  showEffortMediumNudge,
  bQ,
  die,
  effortMediumNudgeDialogDef,
  LP,
  GD,
};
