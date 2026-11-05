/**
 * components/IdeStatusIndicator.tsx
 *
 * 页脚 IDE 选区指示（"N lines selected" / 当前文件）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/IdeStatusIndicator.tsx
 * pieces: chunk-czq1j3j2.js (4)
 * attribution: affinity 1, placement 2, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { ideFileLabel, linesLabel } from "../screens/repl/sendNow.js";

//@ chunk-czq1j3j2.js:120586-120628 affinity
function isDiffAttribution(attribution) {
  return attribution?.source === "diff";
}
//@ chunk-czq1j3j2.js:120628-120645 placement
var IDE_FILE_MARKER = "\u29C9 ";
//@ chunk-czq1j3j2.js:120645-120928 placement
function ideSelectionLabel(connectionState, attribution) {
  if (!attribution) return null;
  let isFromIde = isDiffAttribution(attribution);
  if (!isFromIde && connectionState !== "connected") return null;
  if (attribution.text && attribution.lineCount > 0) {
    let sourceLabel =
      isFromIde && attribution.filePath
        ? `from ${ideFileLabel(attribution.filePath)}`
        : isFromIde
          ? "from diff"
          : "selected";
    return `${IDE_FILE_MARKER}${linesLabel(attribution.lineCount)} ${sourceLabel}`;
  }
  if (!isFromIde && attribution.filePath) return `${IDE_FILE_MARKER}In ${ideFileLabel(attribution.filePath)}`;
  return null;
}
//@ chunk-czq1j3j2.js:120928-121242 fingerprint (2.1.88 match: IdeStatusIndicator, 0.31)
function IdeStatusIndicator({ ideStatus, ideName, isRemoteWorkspace, isViewingAgent, ideSelection }) {
  if (
    !ideSelection ||
    isDiffAttribution(ideSelection) ||
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
