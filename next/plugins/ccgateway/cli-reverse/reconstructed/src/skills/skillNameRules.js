/**
 * skills/skillNameRules.ts
 *
 * 2.1.316 新增：技能名合法性规则
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */
import { getHostState } from "../utils/hostEnvironment.js";
import { escapeControlCharsForDisplay, truncateToLength } from "../utils/stringUtils.js";
import { NON_ASCII_SPACE_RE, MAX_NAME_WARNINGS, INVALID_NAME_MESSAGE } from "./loadSkillsDir.js";
import { logForDebugging } from "../utils/debug.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";

//@ chunk-5xgkngpb.js:996773-997117 placement
/**
 * 技能名不符合显示规则时记录（去重、有上限）。
 */
function reportRefusedSkillName(name, reason) {
  let namesNotShown = getHostState().namesNotShown;
  let warning = `${escapeControlCharsForDisplay(truncateToLength(name, 200)).replace(NON_ASCII_SPACE_RE, (char) => `\\u{${char.codePointAt(0)?.toString(16).toUpperCase()}}`)} ${reason}`;
  if (namesNotShown.has(warning) || namesNotShown.size >= MAX_NAME_WARNINGS) return;
  namesNotShown.add(warning);
  logForDebugging(
    `[names] ${warning}: ${INVALID_NAME_MESSAGE}${namesNotShown.size === MAX_NAME_WARNINGS ? ". No more are told" : ""}`,
    {
      level: "warn",
    },
  );
  if (claimOnce().claim("shown_name_rule_refused")) logFeatureSad("skill_shown_name_rule", "name_refused");
}
export { reportRefusedSkillName };
