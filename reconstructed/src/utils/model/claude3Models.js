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
var pl = ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"];
//@ chunk-g54kbxqw.js:132292-132331 placement
function $Yt(e) {
  return !includesAnyIgnoreCase(e ?? getMainLoopModel(), pl);
}
//@ chunk-g54kbxqw.js:132331-132415 placement
function CFe(e) {
  let n = e.startsWith(".") ? e.slice(1) : e;
  return DOCUMENT_EXTENSIONS.has(n.toLowerCase());
}

export { CFe, $Yt };
