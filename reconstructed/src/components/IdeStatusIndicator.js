/**
 * components/IdeStatusIndicator.tsx
 *
 * 页脚 IDE 选区指示（"N lines selected" / 当前文件）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/IdeStatusIndicator.tsx
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { getStagedFiles } from "../utils/commitAttribution.js";
import { ideFileLabel, zFe } from "../screens/repl/sendNow.js";

//@ chunk-18hwfzwa.js:119627-119644 placement
var MP = "\u29C9 ";
//@ chunk-18hwfzwa.js:119644-119927 placement
function ideSelectionLabel(h, x) {
  if (!x) return null;
  let D = getStagedFiles(x);
  if (!D && h !== "connected") return null;
  if (x.text && x.lineCount > 0) {
    let L = D && x.filePath ? `from ${ideFileLabel(x.filePath)}` : D ? "from diff" : "selected";
    return `${MP}${zFe(x.lineCount)} ${L}`;
  }
  if (!D && x.filePath) return `${MP}In ${ideFileLabel(x.filePath)}`;
  return null;
}
//@ chunk-18hwfzwa.js:119927-120241 fingerprint = IdeStatusIndicator (0.31)
function IdeStatusIndicator({
  ideStatus: ideStatus,
  ideName: ideName,
  isRemoteWorkspace: isRemoteWorkspace,
  isViewingAgent: isViewingAgent,
  ideSelection: ideSelection,
}) {
  if (
    !ideSelection ||
    getStagedFiles(ideSelection) ||
    ideName === null ||
    isRemoteWorkspace ||
    isViewingAgent ||
    ideStatus !== "connected"
  )
    return null;
  if (ideSelection.text && ideSelection.lineCount > 0)
    return { kind: "lineCount", label: zFe(ideSelection.lineCount) };
  let t1 = ideSelection.filePath ? ideFileLabel(ideSelection.filePath) : "";
  return t1 === "" ? null : { kind: "fileName", label: t1 };
}

export { IdeStatusIndicator, ideSelectionLabel, MP };
