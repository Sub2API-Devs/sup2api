/**
 * components/messages/fileWriteResultView.tsx
 *
 * 2.1.316 新增：按 sha256 校验后渲染写文件结果
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ac1eq6qc.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createHash } from "crypto";
import { safeParseJSON } from "../../utils/json.js";
import { mergeClients_2 } from "../../services/mcp/claudeTestWriteTool.js";
import { renderMcpToolResultMessage } from "../../tools/MCPTool/UI.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FileWriteToolCreatedMessage } from "../../tools/FileWriteTool/UI.js";

//@ chunk-ac1eq6qc.js:14465-14799 placement
/**
 * 从工具结果（字符串或文本块）中解析 Write 结果 JSON，形状不对时返回 undefined。
 */
function parseFileWriteResult(result) {
  let text =
    typeof result === "string"
      ? result
      : Array.isArray(result)
        ? result.find((part) => part.type === "text" && typeof part.text === "string")?.text
        : undefined;
  let parsed = safeParseJSON(text, false);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("ok" in parsed) ||
    !("file" in parsed) ||
    !("sha256" in parsed)
  )
    return null;
  return parsed.ok === true && typeof parsed.file === "string" && typeof parsed.sha256 === "string"
    ? {
        file: parsed.file,
        sha256: parsed.sha256,
      }
    : null;
}
//@ chunk-ac1eq6qc.js:14799-14854 placement
var CONTROL_OR_CR_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]|\r(?!\n)/;
//@ chunk-ac1eq6qc.js:14854-15098 placement
function renderVerifiedFileWriteResult(result, messageId, toolUse) {
  let clients = mergeClients_2(toolUse.input);
  let fileWriteResult = parseFileWriteResult(result);
  let replaced = clients?.text.replace(/^\uFEFF/, "");
  if (
    fileWriteResult === null ||
    replaced === undefined ||
    CONTROL_OR_CR_RE.test(replaced) ||
    createHash("sha256").update(replaced, "utf8").digest("hex") !== fileWriteResult.sha256
  )
    return renderMcpToolResultMessage(result, messageId, toolUse);
  return jsxProd_default(FileWriteToolCreatedMessage, {
    filePath: fileWriteResult.file,
    content: replaced,
    verbose: toolUse.verbose,
  });
}
export { renderVerifiedFileWriteResult };
