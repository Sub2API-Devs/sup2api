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
function agentDisplayName(agent) {
  let name = displayModelName(agent);
  return name === displayModelName("") ? "(unnamed agent)" : name;
}
//@ chunk-n0w240z3.js:330-382 placement
function agentRestrictedNoticeText(agent, requestedModel, resolvedModel) {
  return `${agentDisplayName(agent)} agent: ${formatModelRestrictedNotice(requestedModel, resolvedModel)}`;
}
//@ chunk-n0w240z3.js:382-551 placement
function buildAgentModelRestrictedNotice(agent, requestedModel, resolvedModel) {
  return {
    type: "notification",
    notification: {
      key: `agent-model-restricted-${agentDisplayName(agent)}-${displayModelName(requestedModel)}`,
      text: agentRestrictedNoticeText(agent, requestedModel, resolvedModel),
      priority: "medium",
      color: "warning",
      timeoutMs: 1e4,
    },
  };
}
//@ chunk-n0w240z3.js:551-598 placement
/**
 * 生成"agent 模型受限"通知的上报回调。
 */
function agentModelRestrictedReporter(agent, notify) {
  return (requestedModel, reason) => {
    notify?.(buildAgentModelRestrictedNotice(agent, requestedModel, reason));
  };
}
//@ chunk-n0w240z3.js:598-659 placement
/**
 * 子代理模型受限时发通知。
 */
function agentModelRestrictionNotifier(agent, appendSystemMessage) {
  return (requestedModel, reason) => {
    appendSystemMessage?.(
      createInformationalSystemMessage(agentRestrictedNoticeText(agent, requestedModel, reason), "warning"),
    );
  };
}
export { agentModelRestrictionNotifier, agentModelRestrictedReporter };
