/**
 * services/api/apiPath.ts
 *
 * 2.1.316 新增：API 路径片段编码（`.`/`..` 双重转义，防止路径穿越）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9cjx5pnm.js (1)
 * attribution: placement 1
 */

/**
 * 路径段编码（. 与 .. 特别处理）。
 */
//@ chunk-9cjx5pnm.js:13895-14005 placement
function encodePathSegment(e) {
  return e === "." || e === ".." ? e.replaceAll(".", "%252E") : encodeURIComponent(e).replaceAll(".", "%2E");
}

export { encodePathSegment };
