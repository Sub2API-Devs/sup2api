/**
 * commands/autofix-pr/index.ts
 *
 * 2.1.316 新增：/autofix-pr 命令对象：在云会话里自动修复 PR
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isClaudeAISubscriber } from "../../utils/auth.js";
import { consoleProfileCanStartCloudSessions } from "../../utils/teleport/api.js";
import { isPolicyAllowed as isPolicyAllowed_3 } from "../../services/policyLimits/policyEvidence.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { CLOUD_SESSIONS_POLICY } from "../../services/cloudSessions/cloudSessionsPolicy.js";

//@ chunk-5xgkngpb.js:1760632-1760696 placement
/**
 * isAutofixPrEnabled：(claude.ai 订阅 或 console 档案) 且 allow_remote_sessions。
 */
function isAutofixPrEnabled() {
  return (
    (isClaudeAISubscriber() || consoleProfileCanStartCloudSessions()) &&
    isPolicyAllowed_3("allow_remote_sessions")
  );
}
//@ chunk-5xgkngpb.js:1760696-1760978 placement
/**
 * /autofix-pr 命令对象（local-jsx）；描述：Monitor and autofix any issues with the current PR；availability ["claude-ai","console-profile"]；isEnabled: ()=>GZt()&&!_e()；isHidden: {return!GZt()}；实现 chunk-4pdevvfa.js 的 fr。
 */
var autofixPrCommandDefinition = {
  type: "local-jsx",
  name: "autofix-pr",
  description: "Monitor and autofix any issues with the current PR",
  argumentHint: undefined,
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
//@ chunk-5xgkngpb.js:1760978-1760990 placement
var autofixPrCommand = autofixPrCommandDefinition;
export { autofixPrCommand };
