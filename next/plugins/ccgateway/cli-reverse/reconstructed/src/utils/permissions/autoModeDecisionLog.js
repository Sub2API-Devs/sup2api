/**
 * utils/permissions/autoModeDecisionLog.ts
 *
 * 2.1.316 新增：自动模式决策日志
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { appendFile } from "fs/promises";
import { isDiskless } from "../../bootstrap/state.js";
import { getCwd } from "../cwd.js";
import { jsonStringify } from "../slowOperations.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1276716-1276973 placement
class AutoModeDecisionLog {
  logPath = undefined;
  append(entry) {
    if (isDiskless()) return;
    if (this.logPath === undefined)
      this.logPath =
        process.env.AUTOMODE_DECISION_LOG === "1" ? join(getCwd(), ".automode_decisions.jsonl") : null;
    if (!this.logPath) return;
    appendFile(
      this.logPath,
      `${jsonStringify({
        ts: Date.now(),
        ...entry,
      })}
`,
    ).catch(() => {});
  }
}
//@ chunk-5xgkngpb.js:1276973-1277001 placement
var autoModeDecisionLogSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1276973", () => {
  autoModeDecisionLogSlot = new SessionRootSlot(() => new AutoModeDecisionLog());
});
//@ chunk-5xgkngpb.js:1277001-1277038 placement
/**
 * appendAutoModeDecision：往当前会话的 auto 模式决策日志追加一条。
 */
function appendAutoModeDecision(session, entry) {
  autoModeDecisionLogSlot.of(session).append(entry);
}
export { appendAutoModeDecision };
