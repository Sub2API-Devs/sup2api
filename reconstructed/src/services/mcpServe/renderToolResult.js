/**
 * services/mcpServe/renderToolResult.ts
 *
 * 2.1.316 新增：mcp serve 工具结果渲染。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-nyz8dmpm.js (4)
 * attribution: placement 4
 */
import { randomBytes } from "crypto";
import { jsonStringify } from "../../utils/slowOperations.js";
import { processToolResultBlock, getOriginalCwd } from "../../utils/toolResultStorage.js";
import { getCachedReadingLimit } from "../../tools/FileReadTool/limits.js";
import { normalizeAttachmentOrEmpty } from "../../utils/messages.js";
import { formatFileSize } from "../../utils/format.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-nyz8dmpm.js:11900-11915 placement
/**
 * 工具结果转内容块的字节上限（15728640）。
 */
var MAX_TOOL_RESULT_BYTES = 15728640;
//@ chunk-nyz8dmpm.js:11915-12535 placement
/**
 * 把工具结果内容转为 MCP 内容块：文本、base64 图片、文档转为 resource（tool-result:attachment/N），其余 JSON 字符串化。
 */
function appendToolResultContent(r, content) {
  if (content === undefined) return;
  if (typeof content === "string") {
    r.push({
      type: "text",
      text: content,
    });
    return;
  }
  for (let e of content)
    if (e.type === "text")
      r.push({
        type: "text",
        text: e.text,
      });
    else if (e.type === "image" && e.source.type === "base64")
      r.push({
        type: "image",
        data: e.source.data,
        mimeType: e.source.media_type,
      });
    else if (e.type === "document" && (e.source.type === "base64" || e.source.type === "text")) {
      let uri = `tool-result:attachment/${r.length}`;
      r.push({
        type: "resource",
        resource:
          e.source.type === "base64"
            ? {
                uri,
                mimeType: e.source.media_type,
                blob: e.source.data,
              }
            : {
                uri,
                mimeType: e.source.media_type,
                text: e.source.data,
              },
      });
    } else
      r.push({
        type: "text",
        text: jsonStringify(e),
      });
}
//@ chunk-nyz8dmpm.js:12535-13237 placement
async function renderToolResultForMCP(r, o, e) {
  let a = `toolu_serve_${randomBytes(12).toString("hex")}`;
  let p = r.mapToolResultToToolResultBlockParam(o.data, a);
  if (p === undefined)
    return {
      content: [
        {
          type: "text",
          text: `[serve-mode] ${r.name} has no rendered form for this result; raw output follows.
${jsonStringify(o.data)}`,
        },
      ],
    };
  let l = await processToolResultBlock(p, r, getOriginalCwd(e.session), e.storageV5);
  let i = [];
  appendToolResultContent(i, l.content);
  let n = [];
  if (o.data && typeof o.data === "object") {
    let cachedReadingLimit = getCachedReadingLimit(o.data);
    if (cachedReadingLimit !== undefined)
      n.push(
        ...normalizeAttachmentOrEmpty({
          type: "read_truncation_notice",
          banner: cachedReadingLimit,
          toolUseID: a,
        }),
      );
  }
  for (let s of o.newMessages ?? [])
    if (s.type === "user" && !s.isVirtual) n.push(s);
    else if (s.type === "attachment") n.push(...normalizeAttachmentOrEmpty(s.attachment));
  for (let s of n) appendToolResultContent(i, s.message.content);
  return {
    content: i,
    ...(l.is_error === true && {
      isError: true,
    }),
  };
}
//@ chunk-nyz8dmpm.js:13237-13592 placement
function withinAnswerLimit(r, o) {
  let e = Buffer.byteLength(jsonStringify(o), "utf8");
  if (e <= MAX_TOOL_RESULT_BYTES)
    return {
      answer: o,
      tooLarge: false,
    };
  let a = `${r.name} ran, but its result (${formatFileSize(e)}) is too large to send back. Ask for less of it: for a PDF, fewer pages at a time with the pages parameter.`;
  logForDebugging(`MCP server: ${a}`, {
    level: "error",
  });
  return {
    answer: {
      content: [
        {
          type: "text",
          text: a,
        },
      ],
      isError: true,
    },
    tooLarge: true,
  };
}
