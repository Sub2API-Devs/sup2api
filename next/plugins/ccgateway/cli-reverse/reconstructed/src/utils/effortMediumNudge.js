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
import {
  objectSchema,
  stringSchema,
  booleanSchema,
  union,
  _enum,
  array,
  literal,
} from "../../vendor/zod/v4/classic/schemas.js";
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
import { import_reject } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { isSettingSourceEnabled } from "./settings/constants.js";
import { isActingAsBgJob } from "./concurrentSessions.js";
import { env } from "./env.js";
import { getTeammateAgentId } from "../bootstrap/state.js";
import { countCharInString } from "./stringUtils.js";
import { withHideWhile } from "../components/dialogs/dialogRequests.js";
import { EFFORT_MEDIUM_NUDGE } from "../components/nudges/nudgeIds.js";
import { waitForFalse } from "../commands/terminalSetup/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { telemetrySafeModelName } from "./model/telemetryModelName.js";
import { logEvent } from "../services/analytics/index.js";
import { announce } from "./accessibility/screenReader.js";
import { logError } from "./log.js";
import { applyEffortCommand } from "../commands/effort/effort.js";
import { EFFORT_LEVEL_KEY } from "../components/EffortIndicator.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:155528-156543 placement
/**
 * 提示文案的最大字符数（500）。
 */
var MAX_NUDGE_BODY_CHARS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_NUDGE_BODY_LINES;
var MAX_NUDGE_TITLE_CHARS;
var MAX_NUDGE_LABEL_CHARS;
var CONTROL_CHARS_RE;
var NUDGE_FROM_LEVELS;
var NUDGE_TO_LEVELS;
var DEFAULT_NUDGE_FROM_EFFORTS;
var MEDIUM;
var MAX_NUDGE_WARNING_CHARS;
var nudgeCopySchema;
deferInit("chunk-18hwfzwa.js:155528", () => {
  MAX_NUDGE_BODY_CHARS = 500;
  MAX_NUDGE_BODY_LINES = 6;
  MAX_NUDGE_TITLE_CHARS = 120;
  MAX_NUDGE_LABEL_CHARS = 60;
  CONTROL_CHARS_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/;
  NUDGE_FROM_LEVELS = ["high", "xhigh", "max"];
  NUDGE_TO_LEVELS = ["medium", "high", "xhigh"];
  DEFAULT_NUDGE_FROM_EFFORTS = ["high"];
  MEDIUM = "medium";
  MAX_NUDGE_WARNING_CHARS = 200;
  nudgeCopySchema = DoctorLazy(() =>
    objectSchema({
      title: stringSchema()
        .min(1)
        .max(MAX_NUDGE_TITLE_CHARS)
        .refine(hasNoControlChars, "title must not contain control chars")
        .refine(isSingleLine, "title must be a single line")
        .optional(),
      body: stringSchema()
        .min(1)
        .max(MAX_NUDGE_BODY_CHARS)
        .refine(hasNoControlChars, "body must not contain control chars")
        .refine(
          (body) => countLines(body) <= MAX_NUDGE_BODY_LINES,
          `body must be at most ${MAX_NUDGE_BODY_LINES} lines`,
        ),
      confirmLabel: stringSchema()
        .min(1)
        .max(MAX_NUDGE_LABEL_CHARS)
        .refine(hasNoControlChars, "confirmLabel must not contain control chars")
        .refine(isSingleLine, "confirmLabel must be a single line")
        .optional(),
      cancelLabel: stringSchema()
        .min(1)
        .max(MAX_NUDGE_LABEL_CHARS)
        .refine(hasNoControlChars, "cancelLabel must not contain control chars")
        .refine(isSingleLine, "cancelLabel must be a single line")
        .optional(),
      cancelFirst: booleanSchema().optional(),
      fromEffort: union([_enum(NUDGE_FROM_LEVELS), array(_enum(NUDGE_FROM_LEVELS)).min(1)]).optional(),
      toEffort: _enum(NUDGE_TO_LEVELS).optional(),
      showWarning: booleanSchema().optional(),
      warningText: stringSchema()
        .min(1)
        .max(MAX_NUDGE_WARNING_CHARS)
        .refine(hasNoControlChars, "warningText must not contain control chars")
        .refine(isSingleLine, "warningText must be a single line")
        .optional(),
    }),
  );
});
//@ chunk-18hwfzwa.js:156543-156621 placement
/**
 * 判断提示是否确实是向下调整 effort。
 */
function isNudgeDowngrade(nudge) {
  let targetRank = effortRank(nudge.toEffort ?? MEDIUM);
  return getNudgeFromEfforts(nudge).every((fromEffort) => targetRank < effortRank(fromEffort));
}
//@ chunk-18hwfzwa.js:156621-156739 placement
function getNudgeFromEfforts(nudge) {
  if (nudge.fromEffort === undefined) return DEFAULT_NUDGE_FROM_EFFORTS;
  return typeof nudge.fromEffort === "string" ? [nudge.fromEffort] : nudge.fromEffort;
}
//@ chunk-18hwfzwa.js:156739-156776 placement
/**
 * 返回 effort 级别的排序下标。
 */
function effortRank(effortLevel) {
  return EFFORT_LEVELS.indexOf(effortLevel);
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
  let modelKey = nudgeFlagKeyForModel(model);
  if (
    !globalConfig.hasCompletedOnboarding ||
    modelKey === undefined ||
    hasSeenEffortNudge(globalConfig, modelKey)
  )
    return;
  let pinSource = effortPinSource({
    model,
    effortValue,
  });
  if (pinSource === undefined) return;
  let { cohort, fromLevel } = pinSource;
  let servedCopy = servedEffortNudgeCopy(
    getFeatureValue_CACHED_MAY_BE_STALE(EFFORT_NUDGE_MODEL_FLAGS[modelKey].flag, {}),
  );
  if (servedCopy === undefined || !getNudgeFromEfforts(servedCopy).includes(fromLevel)) return;
  let toLevel = servedCopy.toEffort ?? MEDIUM;
  return {
    ...servedCopy,
    cohort,
    modelKey,
    fromLevel,
    toLevel,
  };
}
//@ chunk-18hwfzwa.js:157359-157470 placement
function hasSeenEffortNudge(globalConfig, modelKey) {
  return (
    globalConfig.hasSeenEffortMediumNudgeByModel?.[modelKey] === true ||
    (modelKey === CLAUDE_OPUS_5 && globalConfig.hasSeenEffortMediumNudge === true)
  );
}
//@ chunk-18hwfzwa.js:157470-157724 placement
function markEffortNudgeSeen(globalConfig, modelKey) {
  let isDefaultModel = modelKey === CLAUDE_OPUS_5;
  if (
    globalConfig.hasSeenEffortMediumNudgeByModel?.[modelKey] === true &&
    (!isDefaultModel || globalConfig.hasSeenEffortMediumNudge === true)
  )
    return globalConfig;
  return {
    ...globalConfig,
    hasSeenEffortMediumNudgeByModel: {
      ...globalConfig.hasSeenEffortMediumNudgeByModel,
      [modelKey]: true,
    },
    ...(isDefaultModel && {
      hasSeenEffortMediumNudge: true,
    }),
  };
}
//@ chunk-18hwfzwa.js:157724-158114 placement
function servedEffortNudgeCopy(featureValue_CACHED_MAY_BE_STALE) {
  let schema = nudgeCopySchema();
  let parseResult = schema.safeParse(featureValue_CACHED_MAY_BE_STALE);
  if (parseResult.success) return acceptServedNudge(parseResult.data);
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "object" ||
    featureValue_CACHED_MAY_BE_STALE === null ||
    Object.keys(featureValue_CACHED_MAY_BE_STALE).length === 0
  )
    return;
  logFeatureSad("effort_medium_nudge", "served_copy_invalid");
  let badFields = new Set(parseResult.error.issues.map((issue) => issue.path[0]));
  if (badFields.has("body") || badFields.has("fromEffort") || badFields.has("toEffort")) return;
  let partialParseResult = schema.safeParse(
    import_reject(featureValue_CACHED_MAY_BE_STALE, (value, key) => badFields.has(key)),
  );
  return partialParseResult.success ? acceptServedNudge(partialParseResult.data) : undefined;
}
//@ chunk-18hwfzwa.js:158114-158203 placement
/**
 * 校验下发的提示文案，不合法时记录并返回 undefined。
 */
function acceptServedNudge(nudge) {
  if (isNudgeDowngrade(nudge)) return nudge;
  logFeatureSad("effort_medium_nudge", "served_copy_invalid");
  return;
}
//@ chunk-18hwfzwa.js:158203-158620 placement
function effortPinSource({ model, effortValue }) {
  let modelKey = nudgeFlagKeyForModel(model);
  if (
    modelKey === undefined ||
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
    EFFORT_NUDGE_MODEL_FLAGS[modelKey].from,
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
  return from.find((candidateLevel) => candidateLevel === effortLevelOrHigh);
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
    let matchedEffort;
    for (let [key, value] of Object.entries(settings.modelSettings ?? {})) {
      let effortLevel = value?.effortLevel;
      if (effortLevel === undefined || getModelSettingsKey(key) !== modelSettingsKey) continue;
      if (key === modelSettingsKey) {
        matchedEffort = effortLevel;
        break;
      }
      matchedEffort ??= effortLevel;
    }
    let effortLevel =
      matchedEffort ??
      (source !== "userSettings" || isLegacyUserEffortModel(modelSettingsKey)
        ? settings.effortLevel
        : undefined);
    if (effortLevel !== undefined)
      return {
        source,
        effortLevel,
      };
  }
  return;
}
//@ chunk-18hwfzwa.js:159029-159076 placement
/**
 * 把 CRLF/CR 统一为 LF。
 */
function normalizeNewlines(text) {
  return text.replace(
    /\r\n?/g,
    `
`,
  );
}
//@ chunk-18hwfzwa.js:159076-159116 placement
/**
 * 统计文本行数（先统一换行再加一）。
 */
function countLines(text) {
  return (
    countCharInString(
      normalizeNewlines(text),
      `
`,
    ) + 1
  );
}
//@ chunk-18hwfzwa.js:159116-159168 placement
/**
 * 判断文本是否只有一行且不含制表符。
 */
function isSingleLine(text) {
  return countLines(text) === 1 && !text.includes("\t");
}
//@ chunk-18hwfzwa.js:159168-159202 placement
/**
 * 判断文本是否不含控制字符。
 */
function hasNoControlChars(text) {
  return !CONTROL_CHARS_RE.test(text);
}
//@ chunk-18hwfzwa.js:159202-159628 placement
var effortMediumNudgeDialogDef; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:159202", () => {
  effortMediumNudgeDialogDef = withHideWhile({
    kind: EFFORT_MEDIUM_NUDGE,
    payload: DoctorLazy(() =>
      objectSchema({
        model: stringSchema(),
        copy: nudgeCopySchema()
          .extend({
            cohort: _enum(["default", "user_pin"]),
            modelKey: stringSchema().refine((modelKey) => Object.hasOwn(EFFORT_NUDGE_MODEL_FLAGS, modelKey)),
            fromLevel: _enum(NUDGE_FROM_LEVELS),
            toLevel: _enum(NUDGE_TO_LEVELS),
          })
          .refine((nudge) => EFFORT_LEVELS.indexOf(nudge.toLevel) < EFFORT_LEVELS.indexOf(nudge.fromLevel)),
      }),
    ),
    result: DoctorLazy(() =>
      union([
        objectSchema({
          choice: _enum(["accept", "decline"]),
          optionOrder: _enum(["confirm_first", "cancel_first", "screen_reader"]),
        }),
        literal("cancelled"),
      ]),
    ),
    default: "cancelled",
    hideWhile: ["panel", "draft"],
  });
});
//@ chunk-18hwfzwa.js:159628-159791 placement
/**
 * 等待活动空闲后弹出"降低推理强度到 medium"的提示对话框，用户作答后应用选择。
 */
async function showEffortMediumNudge(requestDialog, copy, controller, appState) {
  await waitForFalse(controller.activity, controller.signal);
  let choice = await requestDialog(effortMediumNudgeDialogDef, copy, {
    place: "under",
    signal: controller.signal,
  });
  if (choice === "cancelled") return;
  await resolveEffortMediumNudge(choice, copy.copy, appState);
}
//@ chunk-18hwfzwa.js:159791-160641 placement
async function resolveEffortMediumNudge(
  { choice, optionOrder },
  { cohort, modelKey, fromLevel, toLevel, showWarning },
  appState,
) {
  let telemetryBase = {
    cohort: fromEnum(cohort),
    option_order: fromEnum(optionOrder),
    nudge_model: telemetrySafeModelName(modelKey),
    from_level: fromEnum(fromLevel),
    to_level: fromEnum(toLevel),
    warning_shown: showWarning === true,
  };
  if (choice === "accept" && !isNudgeStillApplicable(modelKey, fromLevel, appState)) {
    logFeatureBad("effort_medium_nudge", "unavailable_at_accept");
    logEvent("tengu_effort_medium_nudge_resolved", {
      choice: fromEnum(choice),
      outcome: fromEnum("unavailable"),
      ...telemetryBase,
    });
    let unavailableText = "Effort setting unavailable right now \xB7 nothing changed";
    announce(`[${unavailableText}]`);
    appState.addNotification({
      key: "effort-medium-nudge-result",
      kind: "warning",
      text: unavailableText,
      color: "warning",
      priority: "high",
    });
    return;
  }
  let outcome = choice === "accept" ? await applyEffortMediumNudgeResult(appState, toLevel) : "declined";
  saveGlobalConfig((config) => markEffortNudgeSeen(config, modelKey), appState.storageV5).catch(logError);
  if (outcome === "write_failed") logFeatureBad("effort_medium_nudge", "settings_write_failed");
  else logFeatureOk("effort_medium_nudge");
  logEvent("tengu_effort_medium_nudge_resolved", {
    choice: fromEnum(choice),
    outcome: fromEnum(outcome),
    ...telemetryBase,
  });
}
//@ chunk-18hwfzwa.js:160641-160762 placement
function isNudgeStillApplicable(modelKey, fromLevel, appState) {
  let liveModel = appState.getLiveModel();
  return (
    nudgeFlagKeyForModel(liveModel) === modelKey &&
    effortPinSource({
      model: liveModel,
      effortValue: appState.getLiveEffort(),
    })?.fromLevel === fromLevel
  );
}
//@ chunk-18hwfzwa.js:160762-161354 placement
async function applyEffortMediumNudgeResult(
  { setAppState, addNotification, storageV5, getLiveEffort, getLiveUltracode },
  toLevel,
) {
  let result = await applyEffortCommand(
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
  if (!result.effortUpdate) {
    announce(`[${result.message}]`);
    addNotification({
      key: "effort-medium-nudge-result",
      kind: "warning",
      text: result.message,
      color: "warning",
      priority: "high",
      invalidates: [EFFORT_LEVEL_KEY],
    });
    return "write_failed";
  }
  let message =
    result.effortUpdate.value === toLevel
      ? `Effort set to ${toLevel} and saved as your default`
      : result.message;
  announce(`[${message}]`);
  addNotification({
    key: "effort-medium-nudge-result",
    kind: "feedback",
    text: message,
    priority: "high",
    timeoutMs: 5000,
    invalidates: [EFFORT_LEVEL_KEY],
  });
  return "switched";
}
//@ chunk-18hwfzwa.js:161354-161358 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:161354", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:161358-161401 placement
/**
 * 记录错误并返回 {success:false}。
 */
function rejectNudgeOnError(error) {
  logError(error);
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
