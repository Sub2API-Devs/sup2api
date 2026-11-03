/**
 * services/mcp/taskDelivery.ts
 *
 * 2.1.316 新增：MCP 任务结果投递
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
 */
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";

/**
 * 记录 MCP 任务结果投递的特性状态（失败或附带原因），返回是否失败。
 */
//@ chunk-e6aww6q8.js:551822-551954 placement
function logTaskDelivery(e, n) {
  let r = taskDeliveryFailure(e);
  if (r !== void 0) logFeatureBad("mcp_task_delivery", r);
  else if (n !== void 0) logFeatureSad("mcp_task_delivery", n);
  return r !== void 0;
}
//@ chunk-e6aww6q8.js:551954-552012 placement
function Wfn(e) {
  if (taskDeliveryFailure(e) === void 0) logFeatureOk("mcp_task_delivery");
}
//@ chunk-e6aww6q8.js:552012-552073 placement
function g8n(e) {
  if (taskDeliveryFailure(e) === void 0) logFeatureOk("mcp_task_rewind_drop");
}
//@ chunk-e6aww6q8.js:552073-552126 placement
function q4s() {
  logFeatureSad("mcp_task_delivery", "saved_ending");
}
//@ chunk-e6aww6q8.js:552126-552208 placement
function E1r(e, n) {
  for (let r of e) if (r.mcpTaskEnding === !0) logFeatureBad("mcp_task_delivery", n);
}
//@ chunk-e6aww6q8.js:552208-552417 placement
function taskDeliveryFailure(e) {
  switch (e) {
    case "poll_failed":
      return "poll_refused";
    case "unknown_to_server":
      return "server_forgot";
    case "expired":
    case "drive_crashed":
    case "malformed":
    case "answer_too_large":
      return e;
    default:
      return;
  }
}

export { E1r, Wfn, q4s, g8n, logTaskDelivery };
