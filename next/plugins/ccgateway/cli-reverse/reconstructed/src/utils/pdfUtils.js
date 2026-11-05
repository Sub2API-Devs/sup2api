/**
 * utils/pdfUtils.ts
 *
 * pages 参数解析与 PDF 扩展名/模型相关辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/pdfUtils.ts
 * pieces: chunk-5xgkngpb.js (2), chunk-8nzbdydx.js (2)
 * attribution: placement 2, fingerprint 2
 */

//@ chunk-8nzbdydx.js:40471-40495 fingerprint (2.1.88 match: DOCUMENT_EXTENSIONS, 1)
/**
 * 文档扩展名集合（pdf）。
 */
var DOCUMENT_EXTENSIONS = new Set(["pdf"]);
//@ chunk-8nzbdydx.js:40495-40691 fingerprint (2.1.88 match: parsePDFPageRange, 1)
/**
 * 解析 pages 参数："N"、"N-M" 或 "N-"，1 基，非法返回 null。
 */
function parsePDFPageRange(pages) {
  let match = /^(\d{1,9})(?:\s*(-)\s*(\d{1,9})?)?$/.exec(pages.trim());
  if (!match) return null;
  let [, firstPageText, dash, lastPageText] = match;
  let firstPage = Number(firstPageText);
  let lastPage = lastPageText ? Number(lastPageText) : dash ? 1 / 0 : firstPage;
  if (firstPage < 1 || lastPage < firstPage) return null;
  return {
    firstPage,
    lastPage,
  };
}
//@ chunk-5xgkngpb.js:142932-143017 placement
function pdfReadToolUseId(fileId, index = 0) {
  return `toolu_pdfread_${fileId.replaceAll("-", "")}${index === 0 ? "" : `-${index}`}`;
}
//@ chunk-5xgkngpb.js:143017-143091 placement
function isPdfReadToolUseId(id) {
  return typeof id === "string" && id.startsWith("toolu_pdfread_");
}
export { isPdfReadToolUseId, parsePDFPageRange, pdfReadToolUseId, DOCUMENT_EXTENSIONS };
