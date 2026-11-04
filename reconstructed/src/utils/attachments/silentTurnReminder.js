/**
 * utils/attachments/silentTurnReminder.ts
 *
 * 2.1.316 新增：静默回合提醒
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { isModelCapabilityEnabled } from "../model/promptBundles.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { getCachedClientData } from "../config.js";

//@ chunk-e6aww6q8.js:3291976-3292178 placement
/**
 * 静默回合提醒的默认回合数、最小间隔、客户端数据键与默认提示文本。
 */
var DEFAULT_SILENT_TURN_REMINDER_TURNS = 5;
var SILENT_TURN_REMINDER_MIN_GAP = 3;
var SILENT_TURN_REMINDER_SECONDS = "silent_turn_reminder_seconds";
var DEFAULT_SILENT_TURN_REMINDER_TEXT =
  "The user hasn't heard from you in a while. As you continue, keep them updated when there's something to tell \u2014 a finding, a change of plan.";
//@ chunk-e6aww6q8.js:3292178-3292348 placement
/**
 * 读取静默回合提醒文本：环境变量 > 开关 tengu_hushed_lark_text > 默认文本。
 */
function getSilentTurnReminderText() {
  let CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT = env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT;
  if (CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT !== undefined) return CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_hushed_lark_text",
    DEFAULT_SILENT_TURN_REMINDER_TEXT,
  );
  return typeof featureValue_CACHED_MAY_BE_STALE === "string" &&
    featureValue_CACHED_MAY_BE_STALE.trim() !== ""
    ? featureValue_CACHED_MAY_BE_STALE
    : DEFAULT_SILENT_TURN_REMINDER_TEXT;
}
//@ chunk-e6aww6q8.js:3292348-3292449 placement
/**
 * 判断当前模型是否启用静默回合提醒（环境变量可覆盖）。
 */
function isSilentTurnReminderEnabled(mainLoopModel) {
  let canonicalName = getCanonicalName(mainLoopModel);
  return isModelCapabilityEnabled(
    "silent_turn_reminder",
    canonicalName,
    mainLoopModel,
    env.CLAUDE_CODE_SILENT_TURN_REMINDER,
  );
}
//@ chunk-e6aww6q8.js:3292449-3292542 placement
/**
 * 读取并缓存静默回合提醒的回合数阈值。
 */
function cachedSilentTurnReminderTurns() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.silentTurnReminderTurns ??= getSilentTurnReminderTurns();
  return sessionFeatureValues.silentTurnReminderTurns;
}
//@ chunk-e6aww6q8.js:3292542-3292723 placement
/**
 * 读取静默回合提醒的秒数阈值：环境变量或客户端数据（≥1 的整数）。
 */
function getSilentTurnReminderSeconds(mainLoopModel) {
  let CLAUDE_CODE_SILENT_TURN_REMINDER_SECONDS = env.CLAUDE_CODE_SILENT_TURN_REMINDER_SECONDS;
  if (CLAUDE_CODE_SILENT_TURN_REMINDER_SECONDS !== undefined) return CLAUDE_CODE_SILENT_TURN_REMINDER_SECONDS;
  let clientValue = getCachedClientData(mainLoopModel)?.[SILENT_TURN_REMINDER_SECONDS];
  return typeof clientValue === "number" && Number.isFinite(clientValue) && clientValue >= 1
    ? Math.floor(clientValue)
    : undefined;
}
//@ chunk-e6aww6q8.js:3292723-3292891 placement
function getSilentTurnReminderTurns() {
  let CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS = env.CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS;
  if (CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS !== undefined) return CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_hushed_lark",
    DEFAULT_SILENT_TURN_REMINDER_TURNS,
  );
  return Number.isFinite(featureValue_CACHED_MAY_BE_STALE) && featureValue_CACHED_MAY_BE_STALE >= 1
    ? Math.floor(featureValue_CACHED_MAY_BE_STALE)
    : DEFAULT_SILENT_TURN_REMINDER_TURNS;
}
export {
  isSilentTurnReminderEnabled,
  getSilentTurnReminderSeconds,
  SILENT_TURN_REMINDER_MIN_GAP,
  cachedSilentTurnReminderTurns,
  getSilentTurnReminderText,
};
