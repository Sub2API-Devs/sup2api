/**
 * services/PromptSuggestion/backOff.ts
 *
 * 提示建议退避与提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a6fbv34e.js (11)
 * attribution: placement 11
 */
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { getGlobalConfig, saveGlobalConfig, saveGlobalConfigDurably } from "../../utils/config.js";
import { env } from "../../utils/env.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-a6fbv34e.js:410-466 placement
function tUt() {
  try {
    return !1;
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 提示建议退避的常量：连续未使用阈值、已展示提示的标记值、退避期间每隔多少轮才给一次、首次启动后的最短时间与退避提示文案。
 */
//@ chunk-a6fbv34e.js:466-598 placement
var UNUSED_STREAK_THRESHOLD = 20,
  NOTICE_CLAIMED_STREAK = UNUSED_STREAK_THRESHOLD + 1,
  BACK_OFF_TURN_INTERVAL = 10,
  MIN_INSTALL_AGE_MS = 1209600000,
  BACK_OFF_NOTICE_PARTS = [
    { text: "Showing fewer prompt suggestions" },
    { text: " \xB7 use one to bring them back", dim: !0 },
  ];
/**
 * 提示建议是否处于退避：连续未使用达阈值、未被环境变量强制开启、且首次启动已超过两周。
 */
//@ chunk-a6fbv34e.js:598-794 placement
function isSuggestionBackOffActive() {
  let e = getGlobalConfig();
  if (getUnusedStreak(e) < UNUSED_STREAK_THRESHOLD) return !1;
  if (env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION === !0) return !1;
  if (tUt()) return !1;
  if (Date.now() - Date.parse(e.firstStartTime ?? "1970-01-01") < MIN_INSTALL_AGE_MS) return !1;
  return !0;
}
/**
 * 记录一次提示建议是否被使用：使用则清零并结束退避，否则累计连续未使用次数，达阈值时写入全局配置。
 */
//@ chunk-a6fbv34e.js:794-945 placement
function recordSuggestionOutcome(e, o, n) {
  if (e) {
    if (n) n.unusedInARow = 0;
    endSuggestionBackOff(o, !1);
    return;
  }
  if (!n || getUnusedStreak(getGlobalConfig()) >= UNUSED_STREAK_THRESHOLD) return;
  if ((n.unusedInARow++, n.unusedInARow >= UNUSED_STREAK_THRESHOLD))
    ((n.unusedInARow = 0), saveGlobalConfig(S, o));
}
//@ chunk-a6fbv34e.js:945-993 placement
function fjs(e, o) {
  if (o) o.unusedInARow = 0;
  endSuggestionBackOff(e, !0);
}
//@ chunk-a6fbv34e.js:993-1143 placement
function logPromptSuggestionBackOff(e) {
  if (!p(getGlobalConfig()) || !isSuggestionBackOffActive()) return !1;
  return (
    saveGlobalConfig((o) => (p(o) ? { ...o, promptSuggestionUnusedStreak: NOTICE_CLAIMED_STREAK } : o), e),
    logFeatureOk("prompt_suggestion_back_off_notice"),
    !0
  );
}
/**
 * 结束提示建议退避：清零连续未使用计数，若原本处于退避则可靠写入并上报结束事件。
 */
//@ chunk-a6fbv34e.js:1143-1490 placement
function endSuggestionBackOff(e, o) {
  let n = getUnusedStreak(getGlobalConfig());
  if (n === 0) return;
  if (!isSuggestionBackOffActive()) {
    saveGlobalConfig(d, e);
    return;
  }
  let c = { was_notice_claimed: n === NOTICE_CLAIMED_STREAK, via_config_toggle: o };
  saveGlobalConfigDurably(d, e)
    .then((u) => {
      if (u) logFeatureOk("prompt_suggestion_back_off_end", c);
      else logFeatureSad("prompt_suggestion_back_off_end", "reset_unconfirmed", c);
    })
    .catch((u) =>
      logForDebugging(`Prompt suggestion back-off: could not log the end event: ${u}`, { level: "error" }),
    );
}
//@ chunk-a6fbv34e.js:1490-1560 placement
function d(e) {
  return getUnusedStreak(e) === 0 ? e : { ...e, promptSuggestionUnusedStreak: 0 };
}
//@ chunk-a6fbv34e.js:1560-1629 placement
function S(e) {
  return getUnusedStreak(e) >= UNUSED_STREAK_THRESHOLD
    ? e
    : { ...e, promptSuggestionUnusedStreak: UNUSED_STREAK_THRESHOLD };
}
//@ chunk-a6fbv34e.js:1629-1673 placement
function p(e) {
  let o = getUnusedStreak(e);
  return o >= UNUSED_STREAK_THRESHOLD && o !== NOTICE_CLAIMED_STREAK;
}
//@ chunk-a6fbv34e.js:1673-1775 placement
function getUnusedStreak(e) {
  let promptSuggestionUnusedStreak = e.promptSuggestionUnusedStreak;
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
  tUt,
  fjs,
};
