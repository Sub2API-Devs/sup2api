/**
 * screens/repl/_new/nextTeammateMode.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */
import { alwaysFalse } from "../../../Tool.js";
import { cycleAllTeammateModes } from "../../../components/teams/TeamsDialog.js";
import { getProactivityPolicyVerdict } from "../../../utils/permissions/permissionSetup.js";

/**
 * 切换队友模式（受主动性策略限制时回到 default）。
 */
//@ chunk-e6aww6q8.js:1297008-1297111 sole-consumer-new
function nextTeammateMode(e, n, r) {
  if (!alwaysFalse()) return cycleAllTeammateModes(e, n, r);
  if (r && getProactivityPolicyVerdict(n, e, void 0) !== void 0) return "default";
  return e;
}

export { nextTeammateMode };
