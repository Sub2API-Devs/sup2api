/**
 * utils/permissions/personOnlyDecisions.ts
 *
 * 2.1.316 新增：必须由本人决定的权限请求
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hgrqcyvx.js (6)
 * attribution: placement 6
 */
import { lazyWritersSlot } from "../../tools/ArtifactTool/actionNames.js";
import { analyzeTurnTail, isHumanOrigin, isHumanTurn } from "../turnOrigin.js";
import { consentMustDeny } from "./toolPermissionContext.js";
import { envSessionKind } from "../sessionShape.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hgrqcyvx.js:342-451 placement
class LazyReaderSlot {
  read = null;
  register(read) {
    this.read = read;
  }
  loaded() {
    if (this.read === null) lazyWritersSlot.loadWriters?.();
    return this.read;
  }
}
//@ chunk-hgrqcyvx.js:451-465 placement
var personOnlyRegistry; // deferred: uses LazyReaderSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hgrqcyvx.js:451", () => {
  personOnlyRegistry = new LazyReaderSlot();
});
//@ chunk-hgrqcyvx.js:465-497 placement
function registerPersonOnlyDecider(decider) {
  personOnlyRegistry.register(decider);
}
//@ chunk-hgrqcyvx.js:497-583 placement
var PERSON_ONLY_DECISION = {
  suppressAlwaysAllowRule: true,
  personOnly: true,
  defaultToNo: true,
  localDisplayOnly: true,
};
//@ chunk-hgrqcyvx.js:583-1484 placement
/**
 * 判断本轮权限请求是否必须由人本人决定（定时触发、轮次被替换等情况），返回对应选项。
 */
function personOnlyDecisionFor(request) {
  let { decider, scheduledTrigger, replacedTurnStart } = analyzeTurnTail(request.messages);
  let deciderMessage = decider === null ? undefined : request.messages[decider.index];
  let isPersonDecided =
    decider === null
      ? replacedTurnStart?.bySessionUsersOwnWords === true
      : deciderMessage !== undefined && isHumanOrigin(decider.origin) && isHumanTurn(deciderMessage);
  return consentMustDeny(request) ||
    (scheduledTrigger && !isPersonDecided) ||
    decider?.origin?.kind === "channel" ||
    (decider?.origin?.kind === "peer" &&
      decider.origin.senderTaskId === undefined &&
      decider.origin.selfSent !== true) ||
    (isHumanOrigin(decider?.origin) && !isPersonDecided) ||
    (replacedTurnStart?.byHuman === true && !replacedTurnStart.byHumanHere)
    ? {
        behavior: "deny",
        message:
          "The user's organization requires a person to approve each new artifact, and nobody can be asked here: permission prompts are off or bypassed, or a schedule or a message from outside this session started this turn. Nothing was created or published. Tell the user they can ask for it themselves in a session that shows permission prompts, and don't retry in this turn.",
        decisionReason: {
          type: "safetyCheck",
          reason: "Creating an artifact needs a person to approve it",
          classifierApprovable: false,
        },
      }
    : undefined;
}
//@ chunk-hgrqcyvx.js:1484-1642 placement (2.1.88 match: decisionClassificationField, 0.64)
/**
 * 该 tool_use 是否由用户决定：查 toolDecisions 中的来源为 user_temporary/user_permanent；没有记录时用全局判定。
 */
function isUserDecidedToolUse(context) {
  let source =
    context.toolUseId === undefined ? undefined : context.toolDecisions?.get(context.toolUseId)?.source;
  return source === undefined ? envSessionKind() : source === "user_temporary" || source === "user_permanent";
}
export {
  personOnlyRegistry,
  personOnlyDecisionFor,
  PERSON_ONLY_DECISION,
  isUserDecidedToolUse,
  registerPersonOnlyDecider,
};
