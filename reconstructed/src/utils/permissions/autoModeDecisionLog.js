/**
 * utils/permissions/autoModeDecisionLog.ts
 *
 * 2.1.316 新增：自动模式决策日志
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { join } from "path";
import { appendFile } from "fs/promises";
import { isDiskless } from "../../bootstrap/state.js";
import { getCwd } from "../cwd.js";
import { jsonStringify } from "../slowOperations.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

//@ chunk-e6aww6q8.js:1271852-1272109 placement
class AutoModeDecisionLog {
  logPath = undefined;
  append(e) {
    if (isDiskless()) return;
    if (this.logPath === undefined)
      this.logPath =
        process.env.AUTOMODE_DECISION_LOG === "1" ? join(getCwd(), ".automode_decisions.jsonl") : null;
    if (!this.logPath) return;
    appendFile(
      this.logPath,
      `${jsonStringify({
        ts: Date.now(),
        ...e,
      })}
`,
    ).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:1272109-1272137 placement
var autoModeDecisionLogSlot = new SessionRootSlot(() => new AutoModeDecisionLog());
//@ chunk-e6aww6q8.js:1272137-1272174 placement
/**
 * appendAutoModeDecision：往当前会话的 auto 模式决策日志追加一条。
 */
function appendAutoModeDecision(session, n) {
  autoModeDecisionLogSlot.of(session).append(n);
}
export { appendAutoModeDecision };
