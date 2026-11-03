/**
 * utils/messagePredicates.ts
 *
 * 消息判定：是否人类回合、最后一条真实用户输入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/messagePredicates.ts
 * pieces: chunk-aepeg2w5.js (3)
 * attribution: fingerprint 1, placement 2
 */
import { matchesTaggedCommand, isHumanOrUnset } from "./messageProvenance.js";

//@ chunk-aepeg2w5.js:608640-608715 fingerprint = isHumanTurn (1)
function isHumanTurn_2(m) {
  return m.type === "user" && !m.isMeta && m.toolUseResult === void 0;
}
//@ chunk-aepeg2w5.js:608715-608909 placement
function isHumanInitiatedMessage(e, n) {
  return (
    isHumanTurn_2(e) ||
    (e.type === "system" && e.subtype === "local_command" && matchesTaggedCommand(e.content, n)) ||
    (e.type === "attachment" &&
      e.attachment.type === "queued_command" &&
      e.attachment.origin?.kind === "human")
  );
}
//@ chunk-aepeg2w5.js:608909-609020 placement = isHumanTurn (0.779)
function isHumanTurn_3(m) {
  return (
    m.type === "user" &&
    !m.isMeta &&
    m.toolUseResult === void 0 &&
    !m.isCompactSummary &&
    isHumanOrUnset(m.origin)
  );
}

export { isHumanTurn_2, isHumanTurn_3, isHumanInitiatedMessage };
