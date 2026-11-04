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
function appendToolResultContent(blocks, content) {
  if (content === undefined) return;
  if (typeof content === "string") {
    blocks.push({
      type: "text",
      text: content,
    });
    return;
  }
  for (let item of content)
    if (item.type === "text")
      blocks.push({
        type: "text",
        text: item.text,
      });
    else if (item.type === "image" && item.source.type === "base64")
      blocks.push({
        type: "image",
        data: item.source.data,
        mimeType: item.source.media_type,
      });
    else if (item.type === "document" && (item.source.type === "base64" || item.source.type === "text")) {
      let uri = `tool-result:attachment/${blocks.length}`;
      blocks.push({
        type: "resource",
        resource:
          item.source.type === "base64"
            ? {
                uri,
                mimeType: item.source.media_type,
                blob: item.source.data,
              }
            : {
                uri,
                mimeType: item.source.media_type,
                text: item.source.data,
              },
      });
    } else
      blocks.push({
        type: "text",
        text: jsonStringify(item),
      });
}
//@ chunk-nyz8dmpm.js:12535-13237 placement
async function renderToolResultForMCP(tool, result, context) {
  let toolUseId = `toolu_serve_${randomBytes(12).toString("hex")}`;
  let blockParam = tool.mapToolResultToToolResultBlockParam(result.data, toolUseId);
  if (blockParam === undefined)
    return {
      content: [
        {
          type: "text",
          text: `[serve-mode] ${tool.name} has no rendered form for this result; raw output follows.
${jsonStringify(result.data)}`,
        },
      ],
    };
  let processed = await processToolResultBlock(
    blockParam,
    tool,
    getOriginalCwd(context.session),
    context.storageV5,
  );
  let content = [];
  appendToolResultContent(content, processed.content);
  let attachments = [];
  if (result.data && typeof result.data === "object") {
    let cachedReadingLimit = getCachedReadingLimit(result.data);
    if (cachedReadingLimit !== undefined)
      attachments.push(
        ...normalizeAttachmentOrEmpty({
          type: "read_truncation_notice",
          banner: cachedReadingLimit,
          toolUseID: toolUseId,
        }),
      );
  }
  for (let newMessage of result.newMessages ?? [])
    if (newMessage.type === "user" && !newMessage.isVirtual) attachments.push(newMessage);
    else if (newMessage.type === "attachment")
      attachments.push(...normalizeAttachmentOrEmpty(newMessage.attachment));
  for (let attachment of attachments) appendToolResultContent(content, attachment.message.content);
  return {
    content,
    ...(processed.is_error === true && {
      isError: true,
    }),
  };
}
//@ chunk-nyz8dmpm.js:13237-13592 placement
function withinAnswerLimit(tool, answer) {
  let byteLength = Buffer.byteLength(jsonStringify(answer), "utf8");
  if (byteLength <= MAX_TOOL_RESULT_BYTES)
    return {
      answer,
      tooLarge: false,
    };
  let notice = `${tool.name} ran, but its result (${formatFileSize(byteLength)}) is too large to send back. Ask for less of it: for a PDF, fewer pages at a time with the pages parameter.`;
  logForDebugging(`MCP server: ${notice}`, {
    level: "error",
  });
  return {
    answer: {
      content: [
        {
          type: "text",
          text: notice,
        },
      ],
      isError: true,
    },
    tooLarge: true,
  };
}
export { renderToolResultForMCP, withinAnswerLimit };
