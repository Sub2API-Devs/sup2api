/**
 * utils/model/claude3Models.ts
 *
 * 2.1.316 新增：Claude 3 模型名判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-8nzbdydx.js (3)
 * attribution: placement 3
 */
import { includesAnyIgnoreCase } from "../toolErrors.js";
import { getMainLoopModel } from "./model.js";
import { DOCUMENT_EXTENSIONS } from "../pdfUtils.js";

//@ chunk-8nzbdydx.js:40691-40751 placement
var CLAUDE3_MODEL_IDS = ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"];
//@ chunk-8nzbdydx.js:40751-40790 placement
/**
 * 判断当前模型是否不是 claude-3 系列。
 */
function isNotClaude3Model(model) {
  return !includesAnyIgnoreCase(model ?? getMainLoopModel(), CLAUDE3_MODEL_IDS);
}
//@ chunk-8nzbdydx.js:40790-40874 placement
/**
 * 判断扩展名是否属于可处理的文档类型。
 */
function isDocumentExtension(isDocumentExtension) {
  let extension = isDocumentExtension.startsWith(".") ? isDocumentExtension.slice(1) : isDocumentExtension;
  return DOCUMENT_EXTENSIONS.has(extension.toLowerCase());
}
export { isDocumentExtension, isNotClaude3Model };
