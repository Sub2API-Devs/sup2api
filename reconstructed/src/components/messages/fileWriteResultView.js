/**
 * components/messages/fileWriteResultView.tsx
 *
 * 2.1.316 新增：按 sha256 校验后渲染写文件结果
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ytava78w.js (3)
 * attribution: placement 3
 */
import { createHash } from "crypto";
import { safeParseJSON } from "../../utils/json.js";
import { mergeClients_2 } from "../../services/mcp/claudeTestWriteTool.js";
import { renderMcpToolResultMessage } from "../../tools/MCPTool/UI.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { FileWriteToolCreatedMessage } from "../../tools/FileWriteTool/UI.js";

//@ chunk-ytava78w.js:13317-13651 placement
/**
 * 从工具结果（字符串或文本块）中解析 Write 结果 JSON，形状不对时返回 undefined。
 */
function parseFileWriteResult(r) {
  let n =
    typeof r === "string"
      ? r
      : Array.isArray(r)
        ? r.find((s) => s.type === "text" && typeof s.text === "string")?.text
        : undefined;
  let t = safeParseJSON(n, false);
  if (typeof t !== "object" || t === null || !("ok" in t) || !("file" in t) || !("sha256" in t)) return null;
  return t.ok === true && typeof t.file === "string" && typeof t.sha256 === "string"
    ? {
        file: t.file,
        sha256: t.sha256,
      }
    : null;
}
//@ chunk-ytava78w.js:13651-13706 placement
var CONTROL_OR_CR_RE = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]|\r(?!\n)/;
//@ chunk-ytava78w.js:13706-13950 placement
function renderVerifiedFileWriteResult(r, n, t) {
  let s = mergeClients_2(t.input);
  let fileWriteResult = parseFileWriteResult(r);
  let replaced = s?.text.replace(/^\uFEFF/, "");
  if (
    fileWriteResult === null ||
    replaced === undefined ||
    CONTROL_OR_CR_RE.test(replaced) ||
    createHash("sha256").update(replaced, "utf8").digest("hex") !== fileWriteResult.sha256
  )
    return renderMcpToolResultMessage(r, n, t);
  return jsxProd_default(FileWriteToolCreatedMessage, {
    filePath: fileWriteResult.file,
    content: replaced,
    verbose: t.verbose,
  });
}
