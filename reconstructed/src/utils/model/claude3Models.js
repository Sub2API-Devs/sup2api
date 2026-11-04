/**
 * utils/model/claude3Models.ts
 *
 * 2.1.316 新增：Claude 3 模型名判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (3)
 * attribution: placement 3
 */
import { includesAnyIgnoreCase } from "../toolErrors.js";
import { getMainLoopModel } from "./model.js";
import { DOCUMENT_EXTENSIONS } from "../pdfUtils.js";

//@ chunk-g54kbxqw.js:132232-132292 placement
var CLAUDE3_MODEL_IDS = ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"];
//@ chunk-g54kbxqw.js:132292-132331 placement
/**
 * 判断当前模型是否不是 claude-3 系列。
 */
function isNotClaude3Model(model) {
  return !includesAnyIgnoreCase(model ?? getMainLoopModel(), CLAUDE3_MODEL_IDS);
}
//@ chunk-g54kbxqw.js:132331-132415 placement
/**
 * 判断扩展名是否属于可处理的文档类型。
 */
function isDocumentExtension(ext) {
  let extension = ext.startsWith(".") ? ext.slice(1) : ext;
  return DOCUMENT_EXTENSIONS.has(extension.toLowerCase());
}
export { isDocumentExtension, isNotClaude3Model };
