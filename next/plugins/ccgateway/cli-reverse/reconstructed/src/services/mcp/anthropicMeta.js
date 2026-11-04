/**
 * services/mcp/anthropicMeta.ts
 *
 * 2.1.316 新增。MCP 结果中的 Anthropic 元数据。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9jdk0nys.js (3)
 * attribution: placement 3
 */

//@ chunk-9jdk0nys.js:191-216 placement
var COM_ANTHROPIC = "com.anthropic/";
//@ chunk-9jdk0nys.js:216-923 placement
function anthropicResourceLinks(content) {
  if (!Array.isArray(content)) return;
  let links = [];
  let bytes = 2;
  for (let block of content) {
    if (links.length >= 50) break;
    if (typeof block !== "object" || block === null) continue;
    let source = block;
    if (source.type !== "resource_link" || typeof source.uri !== "string" || typeof source.name !== "string")
      continue;
    let link = {
      uri: source.uri,
      name: source.name,
    };
    if (typeof source.title === "string") link.title = source.title;
    if (typeof source.description === "string") link.description = source.description;
    if (typeof source.mimeType === "string") link.mimeType = source.mimeType;
    if (typeof source.size === "number" && Number.isFinite(source.size)) link.size = source.size;
    if (
      typeof source.annotations === "object" &&
      source.annotations !== null &&
      !Array.isArray(source.annotations)
    )
      link.annotations = source.annotations;
    bytes += JSON.stringify(link).length + (links.length > 0 ? 1 : 0);
    if (bytes > 65536) break;
    links.push(link);
  }
  return links.length > 0 ? links : undefined;
}
//@ chunk-9jdk0nys.js:923-1101 placement
/**
 * 去掉 _meta 中 com.anthropic/ 前缀的键，结果为空时返回 undefined。
 */
function stripAnthropicMeta(meta) {
  if (meta === undefined) return;
  let copy;
  for (let key of Object.keys(meta))
    if (key.startsWith("com.anthropic/")) {
      copy ??= {
        ...meta,
      };
      delete copy[key];
    }
  let stripped = copy ?? meta;
  return Object.keys(stripped).length > 0 ? stripped : undefined;
}
export { stripAnthropicMeta, anthropicResourceLinks, COM_ANTHROPIC };
