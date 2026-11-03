/**
 * skills/skillNameRules.ts
 *
 * 2.1.316 新增：技能名合法性规则
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { getHostState } from "../utils/hostEnvironment.js";
import { escapeControlCharsForDisplay, truncateToLength } from "../utils/stringUtils.js";
import { NON_ASCII_SPACE_RE, MAX_NAME_WARNINGS, INVALID_NAME_MESSAGE } from "./loadSkillsDir.js";
import { logForDebugging } from "../utils/debug.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:983062-983407 placement
/**
 * 技能名不符合显示规则时记录（去重、有上限）。
 */
function reportRefusedSkillName(e, n) {
  let namesNotShown = getHostState().namesNotShown;
  let h = `${escapeControlCharsForDisplay(truncateToLength(e, 200)).replace(NON_ASCII_SPACE_RE, (y) => `\\u{${y.codePointAt(0)?.toString(16).toUpperCase()}}`)} ${n}`;
  if (namesNotShown.has(h) || namesNotShown.size >= MAX_NAME_WARNINGS) return;
  namesNotShown.add(h);
  logForDebugging(
    `[names] ${h}: ${INVALID_NAME_MESSAGE}${namesNotShown.size === MAX_NAME_WARNINGS ? ". No more are told" : ""}`,
    {
      level: "warn",
    },
  );
  if (claimOnce().claim("shown_name_rule_refused")) logFeatureSad("skill_shown_name_rule", "name_refused");
}
export { reportRefusedSkillName };
