/**
 * utils/skills/ccrSlowSkillsWatch.ts
 *
 * CCR 慢技能监视开关判定（CLAUDE_CODE_CCR_SLOW_SKILLS_WATCH）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-14160r19.js (1)
 * attribution: placement 1
 */
import { env } from "../env.js";

//@ chunk-14160r19.js:226-306 placement
/**
 * 远端 CCR 的慢技能监视开关是否打开。
 */
function isSlowSkillsWatchOn() {
  return env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_CCR_SLOW_SKILLS_WATCH;
}
export { isSlowSkillsWatchOn };
