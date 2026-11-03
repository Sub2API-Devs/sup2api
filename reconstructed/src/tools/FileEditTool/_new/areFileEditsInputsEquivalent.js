/**
 * tools/FileEditTool/_new/areFileEditsInputsEquivalent.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9br8f9tm.js (1)
 * attribution: sole-consumer-new 1
 */
import { resolve, resolve as resolve_2 } from "path";
import { areFileEditInputsIdentical, E, isExpectedReadError, areFileEditsEquivalent } from "../utils.js";
import { Qn, gb } from "../../../utils/pathClassification.js";
import { isWslUncPath, n_ } from "../../../utils/networkPaths.js";

/**
 * 两个编辑输入是否等价：路径相同、字面相同，否则读当前文件比较两组编辑的应用结果（areFileEditsEquivalent）。
 */
//@ chunk-9br8f9tm.js:8832-9089 sole-consumer-new
function areFileEditsInputsEquivalent(e, n) {
  if (e.file_path !== n.file_path) return !1;
  if (areFileEditInputsIdentical(e, n)) return !0;
  let r = "";
  if (
    (!Qn(e.file_path) || isWslUncPath(e.file_path)) &&
    !gb(e.file_path) &&
    !n_(e.file_path) &&
    !n_(resolve(e.file_path))
  )
    try {
      r = E(e.file_path);
    } catch (error) {
      if (!isExpectedReadError(error)) throw error;
    }
  return areFileEditsEquivalent(e.edits, n.edits, r);
}

export { areFileEditsInputsEquivalent };
