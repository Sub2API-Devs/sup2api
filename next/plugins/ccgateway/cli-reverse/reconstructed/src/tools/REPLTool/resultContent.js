/**
 * tools/REPLTool/resultContent.ts
 *
 * 把结果里的 base64 图片/PDF 换成大小标记，避免撑爆上下文（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (4)
 * attribution: placement 4
 */
import { READ as READ_2 } from "../FileReadTool/constants.js";
import { SUPPORTED_IMAGE_TYPES_3 } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";

//@ chunk-n51jggtb.js:69511-69642 placement
/**
 * 生成“base64 字符已移出结果”的标记，替换图片/PDF 的 base64 负载。
 */
function describeBase64Omission(base64, kind) {
  return `[${base64.length} base64 chars \u2014 ${kind} bytes moved to the REPL result, subject to its per-result ${kind} cap]`;
}
//@ chunk-n51jggtb.js:69642-70374 placement
/**
 * 把 Read 的图片/PDF/多页结果里的 base64 换成大小标记。
 */
function shrinkInlineBase64(result, content) {
  if (result.mcpContent === true)
    return Array.isArray(content) && content.some(isBase64ImageBlock)
      ? content.map((block) =>
          isBase64ImageBlock(block)
            ? {
                ...block,
                source: {
                  ...block.source,
                  data: describeBase64Omission(block.source.data, "image"),
                },
              }
            : block,
        )
      : content;
  if (result.toolName !== READ_2 || content === null || typeof content !== "object" || !("type" in content))
    return content;
  if (
    (content.type === "image" || content.type === "pdf") &&
    "file" in content &&
    typeof content.file === "object" &&
    content.file !== null &&
    "base64" in content.file &&
    typeof content.file.base64 === "string" &&
    content.file.base64.length > 0
  ) {
    if (content.type === "image" && !("type" in content.file && typeof content.file.type === "string"))
      return content;
    return {
      ...content,
      file: {
        ...content.file,
        base64: describeBase64Omission(content.file.base64, content.type === "pdf" ? "document" : "image"),
      },
    };
  }
  if (
    content.type === "parts" &&
    "pages" in content &&
    Array.isArray(content.pages) &&
    content.pages.some(isBase64Page)
  )
    return {
      ...content,
      pages: content.pages.map((page) =>
        isBase64Page(page)
          ? {
              ...page,
              base64: describeBase64Omission(page.base64, "image"),
            }
          : page,
      ),
    };
  return content;
}
//@ chunk-n51jggtb.js:70374-70705 placement
/**
 * 判断内容块是否为受支持的 base64 图片。
 */
function isBase64ImageBlock(block) {
  if (
    typeof block !== "object" ||
    block === null ||
    !("type" in block) ||
    block.type !== "image" ||
    !("source" in block) ||
    typeof block.source !== "object" ||
    block.source === null
  )
    return false;
  let { source } = block;
  return (
    "type" in source &&
    source.type === "base64" &&
    "media_type" in source &&
    typeof source.media_type === "string" &&
    SUPPORTED_IMAGE_TYPES_3.has(source.media_type) &&
    "data" in source &&
    typeof source.data === "string" &&
    source.data.length > 0
  );
}
//@ chunk-n51jggtb.js:70705-70866 placement
/**
 * 判断一个页面项是否带可用 base64 与 mediaType。
 */
function isBase64Page(page) {
  return (
    typeof page === "object" &&
    page !== null &&
    "base64" in page &&
    typeof page.base64 === "string" &&
    page.base64.length > 0 &&
    "mediaType" in page &&
    typeof page.mediaType === "string"
  );
}
export { shrinkInlineBase64, isBase64ImageBlock, isBase64Page };
