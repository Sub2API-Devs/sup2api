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
import { qSe } from "../../tools/ArtifactTool/actionNames.js";
import { analyzeTurnTail, isHumanOrigin, isHumanTurn } from "../turnOrigin.js";
import { consentMustDeny } from "./toolPermissionContext.js";
import { envSessionKind } from "../sessionShape.js";

//@ chunk-hgrqcyvx.js:342-451 placement
class LazyReaderSlot {
  read = null;
  register(s) {
    this.read = s;
  }
  loaded() {
    if (this.read === null) qSe.loadWriters?.();
    return this.read;
  }
}
//@ chunk-hgrqcyvx.js:451-465 placement
var personOnlyRegistry = new LazyReaderSlot();
//@ chunk-hgrqcyvx.js:465-497 placement
function registerPersonOnlyDecider(s) {
  personOnlyRegistry.register(s);
}
//@ chunk-hgrqcyvx.js:497-583 placement
var PERSON_ONLY_DECISION = {
  suppressAlwaysAllowRule: !0,
  personOnly: !0,
  defaultToNo: !0,
  localDisplayOnly: !0,
};
/**
 * 判断本轮权限请求是否必须由人本人决定（定时触发、轮次被替换等情况），返回对应选项。
 */
//@ chunk-hgrqcyvx.js:583-1484 placement
function personOnlyDecisionFor(s) {
  let {
      decider: decider,
      scheduledTrigger: scheduledTrigger,
      replacedTurnStart: replacedTurnStart,
    } = analyzeTurnTail(s.messages),
    r = decider === null ? void 0 : s.messages[decider.index],
    n =
      decider === null
        ? replacedTurnStart?.bySessionUsersOwnWords === !0
        : r !== void 0 && isHumanOrigin(decider.origin) && isHumanTurn(r);
  return consentMustDeny(s) ||
    (scheduledTrigger && !n) ||
    decider?.origin?.kind === "channel" ||
    (decider?.origin?.kind === "peer" &&
      decider.origin.senderTaskId === void 0 &&
      decider.origin.selfSent !== !0) ||
    (isHumanOrigin(decider?.origin) && !n) ||
    (replacedTurnStart?.byHuman === !0 && !replacedTurnStart.byHumanHere)
    ? {
        behavior: "deny",
        message:
          "The user's organization requires a person to approve each new artifact, and nobody can be asked here: permission prompts are off or bypassed, or a schedule or a message from outside this session started this turn. Nothing was created or published. Tell the user they can ask for it themselves in a session that shows permission prompts, and don't retry in this turn.",
        decisionReason: {
          type: "safetyCheck",
          reason: "Creating an artifact needs a person to approve it",
          classifierApprovable: !1,
        },
      }
    : void 0;
}
/**
 * 该 tool_use 是否由用户决定：查 toolDecisions 中的来源为 user_temporary/user_permanent；没有记录时用全局判定。
 */
//@ chunk-hgrqcyvx.js:1484-1642 placement = decisionClassificationField (0.64)
function isUserDecidedToolUse(s) {
  let e = s.toolUseId === void 0 ? void 0 : s.toolDecisions?.get(s.toolUseId)?.source;
  return e === void 0 ? envSessionKind() : e === "user_temporary" || e === "user_permanent";
}

export {
  personOnlyRegistry,
  personOnlyDecisionFor,
  PERSON_ONLY_DECISION,
  isUserDecidedToolUse,
  registerPersonOnlyDecider,
};
