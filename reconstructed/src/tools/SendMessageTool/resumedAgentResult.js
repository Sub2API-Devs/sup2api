/**
 * tools/SendMessageTool/resumedAgentResult.ts
 *
 * 2.1.316 新增：恢复的 agent 结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vb4hww56.js (5)
 * attribution: placement 5
 */
import { extractTextContent_2 } from "../../utils/messages.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, A, T, oe } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * 恢复代理结果的说明：最终报告不在本消息中，或报告随后由框架附上。
 */
//@ chunk-vb4hww56.js:306-452 placement
var RESUMED_NO_REPORT = "Resumed agent. Its final report is not in this message.",
  RESUMED_REPORT_FOLLOWS = "Resumed agent. Its final report follows this JSON, framed by the harness.";
/**
 * 格式化恢复代理的内联结果文本（"Resumed agent X. Result:" 加文本内容）。
 */
//@ chunk-vb4hww56.js:452-562 placement
function formatResumedAgentResult({ displayName: displayName, content: content }) {
  return `Resumed agent ${displayName}. Result:

${
  extractTextContent_2(
    content,
    `
`,
  ) || "(no text output)"
}`;
}
/**
 * SendMessage 输出 schema：消息、展示文本、内联交还结果、路由与请求 id 等。
 */
//@ chunk-vb4hww56.js:562-803 placement
var sendMessageOutputSchema = DoctorLazy(() =>
  u({
    message: o().optional(),
    display: o().optional(),
    inlineHandback: u({ displayName: o(), content: A(u({ type: T("text"), text: o() })) })
      .optional()
      .catch(void 0),
    routing: oe().optional(),
    request_id: oe().optional(),
    target: oe().optional(),
  }),
);
/**
 * 取 SendMessage 结果的展示文本（路由或请求结果不展示）。
 */
//@ chunk-vb4hww56.js:803-959 placement
function getSendMessageDisplay(e) {
  if (e.routing) return;
  if (e.request_id !== void 0 && e.target !== void 0) return;
  return e.display ?? (e.inlineHandback ? formatResumedAgentResult(e.inlineHandback) : e.message);
}
//@ chunk-vb4hww56.js:959-1036 placement
function bHs(e) {
  let safeParse = sendMessageOutputSchema().safeParse(e);
  return safeParse.success ? (getSendMessageDisplay(safeParse.data) ?? "") : "";
}

export {
  RESUMED_NO_REPORT,
  RESUMED_REPORT_FOLLOWS,
  formatResumedAgentResult,
  bHs,
  sendMessageOutputSchema,
  getSendMessageDisplay,
};
