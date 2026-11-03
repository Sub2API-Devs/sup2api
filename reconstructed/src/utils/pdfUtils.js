/**
 * utils/pdfUtils.ts
 *
 * pages 参数解析与 PDF 扩展名/模型相关辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/pdfUtils.ts
 * pieces: chunk-aepeg2w5.js (2), chunk-g54kbxqw.js (2)
 * attribution: file-last-pair 1, fingerprint 3
 */
import { getModelCatalog } from "./model/modelCatalog.js";
import { parseModelId, wR, isSameModelVersion } from "./model/modelIds.js";

/**
 * 在已知模型中查找满足某能力的模型 id（误配名 isPDFExtension）。
 */
//@ chunk-aepeg2w5.js:458156-458281 file-last-pair
function isPDFExtension(ext) {
  let n = [...getModelCatalog().models.map((model) => model.id), ...isPDFSupported()];
  for (let r of n) {
    let s = parseModelId(r);
    if (wR(s) && isSameModelVersion(s, ext)) return r;
  }
  return;
}
//@ chunk-aepeg2w5.js:458281-458354 fingerprint = isPDFSupported (0.502)
function isPDFSupported() {
  return ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"];
}
/**
 * 文档扩展名集合（pdf）。
 */
//@ chunk-g54kbxqw.js:132012-132036 fingerprint = DOCUMENT_EXTENSIONS (1)
var DOCUMENT_EXTENSIONS = new Set(["pdf"]);
/**
 * 解析 pages 参数："N"、"N-M" 或 "N-"，1 基，非法返回 null。
 */
//@ chunk-g54kbxqw.js:132036-132232 fingerprint = parsePDFPageRange (1)
function parsePDFPageRange(pages) {
  let match = /^(\d{1,9})(?:\s*(-)\s*(\d{1,9})?)?$/.exec(pages.trim());
  if (!match) return null;
  let [, s, r, h] = match,
    y = Number(s),
    k = h ? Number(h) : r ? 1 / 0 : y;
  if (y < 1 || k < y) return null;
  return { firstPage: y, lastPage: k };
}

export { parsePDFPageRange, isPDFExtension, isPDFSupported, DOCUMENT_EXTENSIONS };
