/**
 * services/PromptSuggestion/backOff.ts
 *
 * 提示建议退避与提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-e9t8sw6e.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { getGlobalConfig, saveGlobalConfig, saveGlobalConfigDurably } from "../../utils/config.js";
import { env } from "../../utils/env.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-e9t8sw6e.js:410-466 placement
/**
 * 恒返回 false 的占位判断：若为 true 表示提示建议由插件/其他路径负责，cli 侧不再执行（logSuggestionSuppressed 记 plugin_owns）。
 */
function isSuggestionOwnedByPlugin() {
  try {
    return false;
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-e9t8sw6e.js:466-598 placement
/**
 * 提示建议退避的常量：连续未使用阈值、已展示提示的标记值、退避期间每隔多少轮才给一次、首次启动后的最短时间与退避提示文案。
 */
var UNUSED_STREAK_THRESHOLD = 20;
var NOTICE_CLAIMED_STREAK = UNUSED_STREAK_THRESHOLD + 1;
var BACK_OFF_TURN_INTERVAL = 10;
var MIN_INSTALL_AGE_MS = 1209600000;
var BACK_OFF_NOTICE_PARTS = [
  {
    text: "Showing fewer prompt suggestions",
  },
  {
    text: " \xB7 use one to bring them back",
    dim: true,
  },
];
//@ chunk-e9t8sw6e.js:598-794 placement
/**
 * 提示建议是否处于退避：连续未使用达阈值、未被环境变量强制开启、且首次启动已超过两周。
 */
function isSuggestionBackOffActive() {
  let globalConfig = getGlobalConfig();
  if (getUnusedStreak(globalConfig) < UNUSED_STREAK_THRESHOLD) return false;
  if (env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION === true) return false;
  if (isSuggestionOwnedByPlugin()) return false;
  if (Date.now() - Date.parse(globalConfig.firstStartTime ?? "1970-01-01") < MIN_INSTALL_AGE_MS) return false;
  return true;
}
//@ chunk-e9t8sw6e.js:794-945 placement
/**
 * 记录一次提示建议是否被使用：使用则清零并结束退避，否则累计连续未使用次数，达阈值时写入全局配置。
 */
function recordSuggestionOutcome(used, storageV5, promptSuggestion) {
  if (used) {
    if (promptSuggestion) promptSuggestion.unusedInARow = 0;
    endSuggestionBackOff(storageV5, false);
    return;
  }
  if (!promptSuggestion || getUnusedStreak(getGlobalConfig()) >= UNUSED_STREAK_THRESHOLD) return;
  promptSuggestion.unusedInARow++;
  if (promptSuggestion.unusedInARow >= UNUSED_STREAK_THRESHOLD) {
    promptSuggestion.unusedInARow = 0;
    saveGlobalConfig(setUnusedStreakToThreshold, storageV5);
  }
}
//@ chunk-e9t8sw6e.js:945-993 placement
/**
 * 用户在 /config 里重新打开提示建议时调用：清零连续未使用计数，并以 via_config_toggle=true 结束退避（走可靠写入与结束事件）。
 */
function endBackOffFromConfigToggle(storageV5, promptSuggestionRun) {
  if (promptSuggestionRun) promptSuggestionRun.unusedInARow = 0;
  endSuggestionBackOff(storageV5, true);
}
//@ chunk-e9t8sw6e.js:993-1143 placement
function logPromptSuggestionBackOff(storageV5) {
  if (!isBackOffNoticeUnclaimed(getGlobalConfig()) || !isSuggestionBackOffActive()) return false;
  saveGlobalConfig(
    (config) =>
      isBackOffNoticeUnclaimed(config)
        ? {
            ...config,
            promptSuggestionUnusedStreak: NOTICE_CLAIMED_STREAK,
          }
        : config,
    storageV5,
  );
  logFeatureOk("prompt_suggestion_back_off_notice");
  return true;
}
//@ chunk-e9t8sw6e.js:1143-1490 placement
/**
 * 结束提示建议退避：清零连续未使用计数，若原本处于退避则可靠写入并上报结束事件。
 */
function endSuggestionBackOff(storageV5, viaConfigToggle) {
  let unusedStreak = getUnusedStreak(getGlobalConfig());
  if (unusedStreak === 0) return;
  if (!isSuggestionBackOffActive()) {
    saveGlobalConfig(clearUnusedStreak, storageV5);
    return;
  }
  let fields = {
    was_notice_claimed: unusedStreak === NOTICE_CLAIMED_STREAK,
    via_config_toggle: viaConfigToggle,
  };
  saveGlobalConfigDurably(clearUnusedStreak, storageV5)
    .then((saved) => {
      if (saved) logFeatureOk("prompt_suggestion_back_off_end", fields);
      else logFeatureSad("prompt_suggestion_back_off_end", "reset_unconfirmed", fields);
    })
    .catch((error) =>
      logForDebugging(`Prompt suggestion back-off: could not log the end event: ${error}`, {
        level: "error",
      }),
    );
}
//@ chunk-e9t8sw6e.js:1490-1560 placement
function clearUnusedStreak(config) {
  return getUnusedStreak(config) === 0
    ? config
    : {
        ...config,
        promptSuggestionUnusedStreak: 0,
      };
}
//@ chunk-e9t8sw6e.js:1560-1629 placement
function setUnusedStreakToThreshold(config) {
  return getUnusedStreak(config) >= UNUSED_STREAK_THRESHOLD
    ? config
    : {
        ...config,
        promptSuggestionUnusedStreak: UNUSED_STREAK_THRESHOLD,
      };
}
//@ chunk-e9t8sw6e.js:1629-1673 placement
function isBackOffNoticeUnclaimed(config) {
  let unusedStreak = getUnusedStreak(config);
  return unusedStreak >= UNUSED_STREAK_THRESHOLD && unusedStreak !== NOTICE_CLAIMED_STREAK;
}
//@ chunk-e9t8sw6e.js:1673-1775 placement
function getUnusedStreak(config) {
  let promptSuggestionUnusedStreak = config.promptSuggestionUnusedStreak;
  return typeof promptSuggestionUnusedStreak === "number" && Number.isFinite(promptSuggestionUnusedStreak)
    ? promptSuggestionUnusedStreak
    : 0;
}
export {
  recordSuggestionOutcome,
  logPromptSuggestionBackOff,
  BACK_OFF_NOTICE_PARTS,
  isSuggestionBackOffActive,
  BACK_OFF_TURN_INTERVAL,
  isSuggestionOwnedByPlugin,
  endBackOffFromConfigToggle,
};
