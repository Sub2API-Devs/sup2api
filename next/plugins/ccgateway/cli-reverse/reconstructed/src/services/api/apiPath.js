/**
 * services/api/apiPath.ts
 *
 * 2.1.316 新增：API 路径片段编码（`.`/`..` 双重转义，防止路径穿越）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-77qzxtqv.js (1)
 * attribution: placement 1
 */

//@ chunk-77qzxtqv.js:13964-14074 placement
/**
 * 路径段编码（. 与 .. 特别处理）。
 */
function encodePathSegment(id) {
  return id === "." || id === ".."
    ? id.replaceAll(".", "%252E")
    : encodeURIComponent(id).replaceAll(".", "%2E");
}
export { encodePathSegment };
