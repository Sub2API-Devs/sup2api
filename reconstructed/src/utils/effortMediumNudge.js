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
import { u, string, M, union, _enum, array, literal } from "../../vendor/zod/v4/classic/schemas.js";
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
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { isSettingSourceEnabled } from "./settings/constants.js";
import { isActingAsBgJob } from "./concurrentSessions.js";
import { env } from "./env.js";
import { getTeammateAgentId } from "../bootstrap/state.js";
import { countCharInString } from "./stringUtils.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { NUDGE_IDS } from "../components/nudges/nudgeIds.js";
import { waitForFalse } from "../commands/terminalSetup/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./model/telemetryModelName.js";
import { logEvent } from "../services/analytics/index.js";
import { announce } from "./accessibility/screenReader.js";
import { logError } from "./log.js";
import { applyEffortCommand } from "../commands/effort/effort.js";
import { EFFORT_LEVEL_KEY } from "../components/EffortIndicator.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:155528-156543 placement
/**
 * 提示文案的最大字符数（500）。
 */
var EFFORT_NUDGE_COPY_SCHEMA = 500;
var MAX_NUDGE_BODY_LINES = 6;
var MAX_NUDGE_TITLE_CHARS = 120;
var MAX_NUDGE_LABEL_CHARS = 60;
var CONTROL_CHARS_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/;
var NUDGE_FROM_LEVELS = ["high", "xhigh", "max"];
var NUDGE_TO_LEVELS = ["medium", "high", "xhigh"];
var DEFAULT_NUDGE_FROM_EFFORTS = ["high"];
var MEDIUM = "medium";
var MAX_NUDGE_WARNING_CHARS = 200;
var nudgeCopySchema = DoctorLazy(() =>
  u({
    title: string()
      .min(1)
      .max(MAX_NUDGE_TITLE_CHARS)
      .refine(hasNoControlChars, "title must not contain control chars")
      .refine(isSingleLine, "title must be a single line")
      .optional(),
    body: string()
      .min(1)
      .max(EFFORT_NUDGE_COPY_SCHEMA)
      .refine(hasNoControlChars, "body must not contain control chars")
      .refine(
        (h) => countLines(h) <= MAX_NUDGE_BODY_LINES,
        `body must be at most ${MAX_NUDGE_BODY_LINES} lines`,
      ),
    confirmLabel: string()
      .min(1)
      .max(MAX_NUDGE_LABEL_CHARS)
      .refine(hasNoControlChars, "confirmLabel must not contain control chars")
      .refine(isSingleLine, "confirmLabel must be a single line")
      .optional(),
    cancelLabel: string()
      .min(1)
      .max(MAX_NUDGE_LABEL_CHARS)
      .refine(hasNoControlChars, "cancelLabel must not contain control chars")
      .refine(isSingleLine, "cancelLabel must be a single line")
      .optional(),
    cancelFirst: M().optional(),
    fromEffort: union([_enum(NUDGE_FROM_LEVELS), array(_enum(NUDGE_FROM_LEVELS)).min(1)]).optional(),
    toEffort: _enum(NUDGE_TO_LEVELS).optional(),
    showWarning: M().optional(),
    warningText: string()
      .min(1)
      .max(MAX_NUDGE_WARNING_CHARS)
      .refine(hasNoControlChars, "warningText must not contain control chars")
      .refine(isSingleLine, "warningText must be a single line")
      .optional(),
  }),
);
//@ chunk-18hwfzwa.js:156543-156621 placement
/**
 * 判断提示是否确实是向下调整 effort。
 */
function isNudgeDowngrade(h) {
  let x = effortRank(h.toEffort ?? MEDIUM);
  return getNudgeFromEfforts(h).every((D) => x < effortRank(D));
}
//@ chunk-18hwfzwa.js:156621-156739 placement
function getNudgeFromEfforts(h) {
  if (h.fromEffort === undefined) return DEFAULT_NUDGE_FROM_EFFORTS;
  return typeof h.fromEffort === "string" ? [h.fromEffort] : h.fromEffort;
}
//@ chunk-18hwfzwa.js:156739-156776 placement
/**
 * 返回 effort 级别的排序下标。
 */
function effortRank(h) {
  return EFFORT_LEVELS.indexOf(h);
}
//@ chunk-18hwfzwa.js:156776-156939 placement
var EFFORT_NUDGE_MODEL_FLAGS = {
  "claude-opus-5": {
    flag: "tengu_radiant_island",
    from: ["high"],
  },
  "claude-fable-5-1": {
    flag: "tengu_steady_plum",
    from: ["high", "xhigh", "max"],
  },
};
var CLAUDE_OPUS_5 = "claude-opus-5";
//@ chunk-18hwfzwa.js:156939-157002 placement
/**
 * 取模型对应的提示开关键（未配置时 undefined）。
 */
function nudgeFlagKeyForModel(model) {
  let modelSettingsKey = getModelSettingsKey(model);
  return Object.hasOwn(EFFORT_NUDGE_MODEL_FLAGS, modelSettingsKey) ? modelSettingsKey : undefined;
}
//@ chunk-18hwfzwa.js:157002-157359 placement
function effortMediumNudgeCandidate({ model, effortValue }) {
  let globalConfig = getGlobalConfig();
  let L = nudgeFlagKeyForModel(model);
  if (!globalConfig.hasCompletedOnboarding || L === undefined || hasSeenEffortNudge(globalConfig, L)) return;
  let ee = effortPinSource({
    model,
    effortValue,
  });
  if (ee === undefined) return;
  let { cohort, fromLevel } = ee;
  let Be = servedEffortNudgeCopy(getFeatureValue_CACHED_MAY_BE_STALE(EFFORT_NUDGE_MODEL_FLAGS[L].flag, {}));
  if (Be === undefined || !getNudgeFromEfforts(Be).includes(fromLevel)) return;
  let toLevel = Be.toEffort ?? MEDIUM;
  return {
    ...Be,
    cohort,
    modelKey: L,
    fromLevel,
    toLevel,
  };
}
//@ chunk-18hwfzwa.js:157359-157470 placement
function hasSeenEffortNudge(globalConfig, x) {
  return (
    globalConfig.hasSeenEffortMediumNudgeByModel?.[x] === true ||
    (x === CLAUDE_OPUS_5 && globalConfig.hasSeenEffortMediumNudge === true)
  );
}
//@ chunk-18hwfzwa.js:157470-157724 placement
function markEffortNudgeSeen(h, modelKey) {
  let D = modelKey === CLAUDE_OPUS_5;
  if (h.hasSeenEffortMediumNudgeByModel?.[modelKey] === true && (!D || h.hasSeenEffortMediumNudge === true))
    return h;
  return {
    ...h,
    hasSeenEffortMediumNudgeByModel: {
      ...h.hasSeenEffortMediumNudgeByModel,
      [modelKey]: true,
    },
    ...(D && {
      hasSeenEffortMediumNudge: true,
    }),
  };
}
//@ chunk-18hwfzwa.js:157724-158114 placement
function servedEffortNudgeCopy(featureValue_CACHED_MAY_BE_STALE) {
  let x = nudgeCopySchema();
  let D = x.safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (D.success) return acceptServedNudge(D.data);
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "object" ||
    featureValue_CACHED_MAY_BE_STALE === null ||
    Object.keys(featureValue_CACHED_MAY_BE_STALE).length === 0
  )
    return;
  logFeatureSad("effort_medium_nudge", "served_copy_invalid");
  let L = new Set(D.error.issues.map((issue) => issue.path[0]));
  if (L.has("body") || L.has("fromEffort") || L.has("toEffort")) return;
  let ee = x.safeParse(wi(featureValue_CACHED_MAY_BE_STALE, (ke, Re) => L.has(Re)));
  return ee.success ? acceptServedNudge(ee.data) : undefined;
}
//@ chunk-18hwfzwa.js:158114-158203 placement
/**
 * 校验下发的提示文案，不合法时记录并返回 undefined。
 */
function acceptServedNudge(h) {
  if (isNudgeDowngrade(h)) return h;
  logFeatureSad("effort_medium_nudge", "served_copy_invalid");
  return;
}
//@ chunk-18hwfzwa.js:158203-158620 placement
function effortPinSource({ model, effortValue }) {
  let D = nudgeFlagKeyForModel(model);
  if (
    D === undefined ||
    getEffortEnvOverride() !== undefined ||
    isRemoteSessionAvailable() ||
    !isSettingSourceEnabled("userSettings") ||
    orgOverridesUserEffort(model) ||
    isActingAsBgJob() ||
    env.CLAUDE_BRIDGE_REATTACH_SESSION !== undefined ||
    getTeammateAgentId() !== undefined
  )
    return;
  let nudgeFromLevel = findNudgeFromLevel(
    getEffortLevelOrHigh(model, effortValue),
    EFFORT_NUDGE_MODEL_FLAGS[D].from,
  );
  if (nudgeFromLevel === undefined) return;
  let effortSettingSource = findEffortSettingSource(model);
  if (effortSettingSource === undefined && effortValue === undefined)
    return {
      cohort: "default",
      fromLevel: nudgeFromLevel,
    };
  if (
    effortSettingSource?.source === "userSettings" &&
    effortSettingSource.effortLevel === nudgeFromLevel &&
    effortValue === nudgeFromLevel
  )
    return {
      cohort: "user_pin",
      fromLevel: nudgeFromLevel,
    };
  return;
}
//@ chunk-18hwfzwa.js:158620-158664 placement
/**
 * 在给定的 effort 级别列表里找到生效的源级别。
 */
function findNudgeFromLevel(effortLevelOrHigh, from) {
  return from.find((D) => D === effortLevelOrHigh);
}
//@ chunk-18hwfzwa.js:158664-159029 placement
/**
 * 从高到低优先级查找某模型生效的 effort 设置来源：先看 modelSettings 里精确/同键模型的 effortLevel，再看来源级 effortLevel（用户设置只对旧版模型生效）。
 */
function findEffortSettingSource(model) {
  let modelSettingsKey = getModelSettingsKey(model);
  let effortSettingsSources = getEffortSettingsSources();
  for (let idx = effortSettingsSources.length - 1; idx >= 0; idx--) {
    let { source, settings } = effortSettingsSources[idx];
    let Re;
    for (let [key, value] of Object.entries(settings.modelSettings ?? {})) {
      let effortLevel = value?.effortLevel;
      if (effortLevel === undefined || getModelSettingsKey(key) !== modelSettingsKey) continue;
      if (key === modelSettingsKey) {
        Re = effortLevel;
        break;
      }
      Re ??= effortLevel;
    }
    let Be =
      Re ??
      (source !== "userSettings" || isLegacyUserEffortModel(modelSettingsKey)
        ? settings.effortLevel
        : undefined);
    if (Be !== undefined)
      return {
        source,
        effortLevel: Be,
      };
  }
  return;
}
//@ chunk-18hwfzwa.js:159029-159076 placement
/**
 * 把 CRLF/CR 统一为 LF。
 */
function normalizeNewlines(h) {
  return h.replace(
    /\r\n?/g,
    `
`,
  );
}
//@ chunk-18hwfzwa.js:159076-159116 placement
/**
 * 统计文本行数（先统一换行再加一）。
 */
function countLines(h) {
  return (
    countCharInString(
      normalizeNewlines(h),
      `
`,
    ) + 1
  );
}
//@ chunk-18hwfzwa.js:159116-159168 placement
/**
 * 判断文本是否只有一行且不含制表符。
 */
function isSingleLine(h) {
  return countLines(h) === 1 && !h.includes("\t");
}
//@ chunk-18hwfzwa.js:159168-159202 placement
/**
 * 判断文本是否不含控制字符。
 */
function hasNoControlChars(h) {
  return !CONTROL_CHARS_RE.test(h);
}
//@ chunk-18hwfzwa.js:159202-159628 placement
var effortMediumNudgeDialogDef = withHideWhile({
  kind: NUDGE_IDS,
  payload: DoctorLazy(() =>
    u({
      model: string(),
      copy: nudgeCopySchema()
        .extend({
          cohort: _enum(["default", "user_pin"]),
          modelKey: string().refine((h) => Object.hasOwn(EFFORT_NUDGE_MODEL_FLAGS, h)),
          fromLevel: _enum(NUDGE_FROM_LEVELS),
          toLevel: _enum(NUDGE_TO_LEVELS),
        })
        .refine((h) => EFFORT_LEVELS.indexOf(h.toLevel) < EFFORT_LEVELS.indexOf(h.fromLevel)),
    }),
  ),
  result: DoctorLazy(() =>
    union([
      u({
        choice: _enum(["accept", "decline"]),
        optionOrder: _enum(["confirm_first", "cancel_first", "screen_reader"]),
      }),
      literal("cancelled"),
    ]),
  ),
  default: "cancelled",
  hideWhile: ["panel", "draft"],
});
//@ chunk-18hwfzwa.js:159628-159791 placement
/**
 * 等待活动空闲后弹出"降低推理强度到 medium"的提示对话框，用户作答后应用选择。
 */
async function showEffortMediumNudge(requestDialog, x, D, L) {
  await waitForFalse(D.activity, D.signal);
  let ee = await requestDialog(effortMediumNudgeDialogDef, x, {
    place: "under",
    signal: D.signal,
  });
  if (ee === "cancelled") return;
  await resolveEffortMediumNudge(ee, x.copy, L);
}
//@ chunk-18hwfzwa.js:159791-160641 placement
async function resolveEffortMediumNudge(
  { choice, optionOrder },
  { cohort, modelKey, fromLevel, toLevel, showWarning },
  Be,
) {
  let He = {
    cohort: fromEnum(cohort),
    option_order: fromEnum(optionOrder),
    nudge_model: telemetrySafeModelName(modelKey),
    from_level: fromEnum(fromLevel),
    to_level: fromEnum(toLevel),
    warning_shown: showWarning === true,
  };
  if (choice === "accept" && !isNudgeStillApplicable(modelKey, fromLevel, Be)) {
    logFeatureBad("effort_medium_nudge", "unavailable_at_accept");
    logEvent("tengu_effort_medium_nudge_resolved", {
      choice: fromEnum(choice),
      outcome: fromEnum("unavailable"),
      ...He,
    });
    let ze = "Effort setting unavailable right now \xB7 nothing changed";
    announce(`[${ze}]`);
    Be.addNotification({
      key: "effort-medium-nudge-result",
      kind: "warning",
      text: ze,
      color: "warning",
      priority: "high",
    });
    return;
  }
  let We = choice === "accept" ? await applyEffortMediumNudgeResult(Be, toLevel) : "declined";
  saveGlobalConfig((ze) => markEffortNudgeSeen(ze, modelKey), Be.storageV5).catch(logError);
  if (We === "write_failed") logFeatureBad("effort_medium_nudge", "settings_write_failed");
  else logFeatureOk("effort_medium_nudge");
  logEvent("tengu_effort_medium_nudge_resolved", {
    choice: fromEnum(choice),
    outcome: fromEnum(We),
    ...He,
  });
}
//@ chunk-18hwfzwa.js:160641-160762 placement
function isNudgeStillApplicable(modelKey, fromLevel, D) {
  let liveModel = D.getLiveModel();
  return (
    nudgeFlagKeyForModel(liveModel) === modelKey &&
    effortPinSource({
      model: liveModel,
      effortValue: D.getLiveEffort(),
    })?.fromLevel === fromLevel
  );
}
//@ chunk-18hwfzwa.js:160762-161354 placement
async function applyEffortMediumNudgeResult(
  { setAppState, addNotification, storageV5, getLiveEffort, getLiveUltracode },
  toLevel,
) {
  let Re = await applyEffortCommand(
    toLevel,
    {
      effort: getLiveEffort(),
      ultracode: getLiveUltracode(),
      route: "nudge",
    },
    setAppState,
    true,
    storageV5,
  );
  if (!Re.effortUpdate) {
    announce(`[${Re.message}]`);
    addNotification({
      key: "effort-medium-nudge-result",
      kind: "warning",
      text: Re.message,
      color: "warning",
      priority: "high",
      invalidates: [EFFORT_LEVEL_KEY],
    });
    return "write_failed";
  }
  let Be =
    Re.effortUpdate.value === toLevel ? `Effort set to ${toLevel} and saved as your default` : Re.message;
  announce(`[${Be}]`);
  addNotification({
    key: "effort-medium-nudge-result",
    kind: "feedback",
    text: Be,
    priority: "high",
    timeoutMs: 5000,
    invalidates: [EFFORT_LEVEL_KEY],
  });
  return "switched";
}
//@ chunk-18hwfzwa.js:161354-161358 placement
init_react_production();
//@ chunk-18hwfzwa.js:161358-161401 placement
/**
 * 记录错误并返回 {success:false}。
 */
function rejectNudgeOnError(Go) {
  logError(Go);
  return {
    success: false,
  };
}
export {
  rejectNudgeOnError,
  effortMediumNudgeCandidate,
  showEffortMediumNudge,
  MAX_NUDGE_BODY_LINES,
  normalizeNewlines,
  effortMediumNudgeDialogDef,
  hasNoControlChars,
  isSingleLine,
};
