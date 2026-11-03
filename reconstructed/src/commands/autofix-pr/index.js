/**
 * commands/autofix-pr/index.ts
 *
 * 2.1.316 新增：/autofix-pr 命令对象：在云会话里自动修复 PR
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { consoleProfileCanStartCloudSessions } from "../../utils/teleport/api.js";
import { isPolicyAllowed as isPolicyAllowed_3 } from "../../services/policyLimits/policyEvidence.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { CLOUD_SESSIONS_POLICY } from "../../services/cloudSessions/cloudSessionsPolicy.js";

/**
 * isAutofixPrEnabled：(claude.ai 订阅 或 console 档案) 且 allow_remote_sessions。
 */
//@ chunk-e6aww6q8.js:1685740-1685804 placement
function isAutofixPrEnabled() {
  return (
    (isClaudeAISubscriber() || consoleProfileCanStartCloudSessions()) &&
    isPolicyAllowed_3("allow_remote_sessions")
  );
}
/**
 * /autofix-pr 命令对象（local-jsx）；描述：Monitor and autofix any issues with the current PR；availability ["claude-ai","console-profile"]；isEnabled: ()=>GZt()&&!_e()；isHidden: {return!GZt()}；实现 chunk-4pdevvfa.js 的 fr。
 */
//@ chunk-e6aww6q8.js:1685804-1686086 placement
var autofixPrCommandDefinition = {
  type: "local-jsx",
  name: "autofix-pr",
  description: "Monitor and autofix any issues with the current PR",
  argumentHint: void 0,
  availability: ["claude-ai", "console-profile"],
  isEnabled: () => isAutofixPrEnabled() && !getIsNonInteractiveSession(),
  policyGate: CLOUD_SESSIONS_POLICY,
  get isHidden() {
    return !isAutofixPrEnabled();
  },
  userFacingName() {
    return "autofix-pr";
  },
};
//@ chunk-e6aww6q8.js:1686086-1686098 placement
var autofixPrCommand = autofixPrCommandDefinition;

export { autofixPrCommand };
