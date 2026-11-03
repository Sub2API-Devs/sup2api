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
import { ideFileLabel, linesLabel } from "../screens/repl/sendNow.js";

//@ chunk-18hwfzwa.js:119627-119644 placement
var IDE_FILE_MARKER = "\u29C9 ";
//@ chunk-18hwfzwa.js:119644-119927 placement
function ideSelectionLabel(h, ideSelection) {
  if (!ideSelection) return null;
  let stagedFiles = getStagedFiles(ideSelection);
  if (!stagedFiles && h !== "connected") return null;
  if (ideSelection.text && ideSelection.lineCount > 0) {
    let L =
      stagedFiles && ideSelection.filePath
        ? `from ${ideFileLabel(ideSelection.filePath)}`
        : stagedFiles
          ? "from diff"
          : "selected";
    return `${IDE_FILE_MARKER}${linesLabel(ideSelection.lineCount)} ${L}`;
  }
  if (!stagedFiles && ideSelection.filePath)
    return `${IDE_FILE_MARKER}In ${ideFileLabel(ideSelection.filePath)}`;
  return null;
}
//@ chunk-18hwfzwa.js:119927-120241 fingerprint = IdeStatusIndicator (0.31)
function IdeStatusIndicator({ ideStatus, ideName, isRemoteWorkspace, isViewingAgent, ideSelection }) {
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
    return {
      kind: "lineCount",
      label: linesLabel(ideSelection.lineCount),
    };
  let t1 = ideSelection.filePath ? ideFileLabel(ideSelection.filePath) : "";
  return t1 === ""
    ? null
    : {
        kind: "fileName",
        label: t1,
      };
}
export { IdeStatusIndicator, ideSelectionLabel, IDE_FILE_MARKER };
