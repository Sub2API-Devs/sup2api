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
function anthropicResourceLinks(i) {
  if (!Array.isArray(i)) return;
  let e = [],
    o = 2;
  for (let r of i) {
    if (e.length >= 50) break;
    if (typeof r !== "object" || r === null) continue;
    let n = r;
    if (n.type !== "resource_link" || typeof n.uri !== "string" || typeof n.name !== "string") continue;
    let t = { uri: n.uri, name: n.name };
    if (typeof n.title === "string") t.title = n.title;
    if (typeof n.description === "string") t.description = n.description;
    if (typeof n.mimeType === "string") t.mimeType = n.mimeType;
    if (typeof n.size === "number" && Number.isFinite(n.size)) t.size = n.size;
    if (typeof n.annotations === "object" && n.annotations !== null && !Array.isArray(n.annotations))
      t.annotations = n.annotations;
    if (((o += JSON.stringify(t).length + (e.length > 0 ? 1 : 0)), o > 65536)) break;
    e.push(t);
  }
  return e.length > 0 ? e : void 0;
}
/**
 * 去掉 _meta 中 com.anthropic/ 前缀的键，结果为空时返回 undefined。
 */
//@ chunk-9jdk0nys.js:923-1101 placement
function stripAnthropicMeta(i) {
  if (i === void 0) return;
  let e;
  for (let r of Object.keys(i)) if (r.startsWith("com.anthropic/")) ((e ??= { ...i }), delete e[r]);
  let o = e ?? i;
  return Object.keys(o).length > 0 ? o : void 0;
}

export { stripAnthropicMeta, anthropicResourceLinks, COM_ANTHROPIC };
