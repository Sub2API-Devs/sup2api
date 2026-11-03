/**
 * utils/model/agentModelRestriction.ts
 *
 * 2.1.316 新增：子代理模型受限时发通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n0w240z3.js (5)
 * attribution: placement 5
 */
import { displayModelName, formatModelRestrictedNotice } from "./validateModel.js";
import { createInformationalSystemMessage } from "../messages.js";

//@ chunk-n0w240z3.js:266-330 placement
function o(e) {
  let t = displayModelName(e);
  return t === displayModelName("") ? "(unnamed agent)" : t;
}
//@ chunk-n0w240z3.js:330-382 placement
function r(e, t, i) {
  return `${o(e)} agent: ${formatModelRestrictedNotice(t, i)}`;
}
//@ chunk-n0w240z3.js:382-551 placement
function buildAgentModelRestrictedNotice(e, t, i) {
  return {
    type: "notification",
    notification: {
      key: `agent-model-restricted-${o(e)}-${displayModelName(t)}`,
      text: r(e, t, i),
      priority: "medium",
      color: "warning",
      timeoutMs: 1e4,
    },
  };
}
//@ chunk-n0w240z3.js:551-598 placement
function i2n(e, t) {
  return (i, n) => {
    t?.(buildAgentModelRestrictedNotice(e, i, n));
  };
}
/**
 * 子代理模型受限时发通知。
 */
//@ chunk-n0w240z3.js:598-659 placement
function agentModelRestrictionNotifier(e, t) {
  return (i, n) => {
    t?.(createInformationalSystemMessage(r(e, i, n), "warning"));
  };
}

export { agentModelRestrictionNotifier, i2n };
