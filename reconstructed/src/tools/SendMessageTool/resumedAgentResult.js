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
import { u, string, array, literal, unknown } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-vb4hww56.js:306-452 placement
/**
 * 恢复代理结果的说明：最终报告不在本消息中，或报告随后由框架附上。
 */
var RESUMED_NO_REPORT = "Resumed agent. Its final report is not in this message.";
var RESUMED_REPORT_FOLLOWS = "Resumed agent. Its final report follows this JSON, framed by the harness.";
//@ chunk-vb4hww56.js:452-562 placement
/**
 * 格式化恢复代理的内联结果文本（"Resumed agent X. Result:" 加文本内容）。
 */
function formatResumedAgentResult({ displayName, content }) {
  return `Resumed agent ${displayName}. Result:

${
  extractTextContent_2(
    content,
    `
`,
  ) || "(no text output)"
}`;
}
//@ chunk-vb4hww56.js:562-803 placement
/**
 * SendMessage 输出 schema：消息、展示文本、内联交还结果、路由与请求 id 等。
 */
var sendMessageOutputSchema = DoctorLazy(() =>
  u({
    message: string().optional(),
    display: string().optional(),
    inlineHandback: u({
      displayName: string(),
      content: array(
        u({
          type: literal("text"),
          text: string(),
        }),
      ),
    })
      .optional()
      .catch(undefined),
    routing: unknown().optional(),
    request_id: unknown().optional(),
    target: unknown().optional(),
  }),
);
//@ chunk-vb4hww56.js:803-959 placement
/**
 * 取 SendMessage 结果的展示文本（路由或请求结果不展示）。
 */
function getSendMessageDisplay(e) {
  if (e.routing) return;
  if (e.request_id !== undefined && e.target !== undefined) return;
  return e.display ?? (e.inlineHandback ? formatResumedAgentResult(e.inlineHandback) : e.message);
}
//@ chunk-vb4hww56.js:959-1036 placement
/**
 * 从恢复 agent 的发送结果里取展示文本（失败返回空串）。
 */
function resumedAgentReport(e) {
  let n = sendMessageOutputSchema().safeParse(e);
  return n.success ? (getSendMessageDisplay(n.data) ?? "") : "";
}
export {
  RESUMED_NO_REPORT,
  RESUMED_REPORT_FOLLOWS,
  formatResumedAgentResult,
  resumedAgentReport,
  sendMessageOutputSchema,
  getSendMessageDisplay,
};
