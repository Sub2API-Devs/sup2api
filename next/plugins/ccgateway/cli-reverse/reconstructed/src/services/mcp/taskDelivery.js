/**
 * services/mcp/taskDelivery.ts
 *
 * 2.1.316 新增：MCP 任务结果投递
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-5xgkngpb.js:558578-558710 placement
/**
 * 记录 MCP 任务结果投递的特性状态（失败或附带原因），返回是否失败。
 */
function logTaskDelivery(delivery, takenUpAgain) {
  let failure = taskDeliveryFailure(delivery);
  if (failure !== undefined) logFeatureBad("mcp_task_delivery", failure);
  else if (takenUpAgain !== undefined) logFeatureSad("mcp_task_delivery", takenUpAgain);
  return failure !== undefined;
}
//@ chunk-5xgkngpb.js:558710-558768 placement
/**
 * 任务投递成功时记埋点。
 */
function logDeliveryOk(delivery) {
  if (taskDeliveryFailure(delivery) === undefined) logFeatureOk("mcp_task_delivery");
}
//@ chunk-5xgkngpb.js:558768-558829 placement
/**
 * 回退丢弃成功时记埋点。
 */
function logRewindDropOk(delivery) {
  if (taskDeliveryFailure(delivery) === undefined) logFeatureOk("mcp_task_rewind_drop");
}
//@ chunk-5xgkngpb.js:558829-558882 placement
/**
 * 记录结局已保存但投递失败。
 */
function logSavedEnding() {
  logFeatureSad("mcp_task_delivery", "saved_ending");
}
//@ chunk-5xgkngpb.js:558882-558964 placement
/**
 * 给带有结局的任务记投递失败。
 */
function logDeliveryFailureForEndings(messages, reason) {
  for (let message of messages)
    if (message.mcpTaskEnding === true) logFeatureBad("mcp_task_delivery", reason);
}
//@ chunk-5xgkngpb.js:558964-559197 placement
function taskDeliveryFailure(delivery) {
  switch (delivery) {
    case "poll_failed":
      return "poll_refused";
    case "unknown_to_server":
      return "server_forgot";
    case "expired":
    case "drive_crashed":
    case "malformed":
    case "answer_too_large":
    case "connector_changed":
      return delivery;
    default:
      return;
  }
}
export { logDeliveryFailureForEndings, logTaskDelivery, logDeliveryOk, logRewindDropOk, logSavedEnding };
