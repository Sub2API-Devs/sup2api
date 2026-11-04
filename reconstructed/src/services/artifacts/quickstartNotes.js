/**
 * services/artifacts/quickstartNotes.ts
 *
 * 2.1.316 新增：Artifact 快速开始说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-chsmq3nc.js (1)
 * attribution: placement 1
 */
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { canonicalArtifactTargetFor } from "../../tools/ArtifactTool/artifactUrls.js";

//@ chunk-chsmq3nc.js:991-1715 placement
function afterQuickstartSavedLine(result, pageDir, sameDir, prefix) {
  let isUnder = (base, child) =>
    typeof base === "string" && typeof child === "string" && base === sameDir(child);
  let savedNote = isUnder(result.saved_pages_dir, pageDir)
    ? `[A quickstart in this conversation saved reference pages of this type on disk in ${shellQuoteArgs([result.saved_pages_dir])}; its result lists them, so those are not attached here.]`
    : "";
  if (result.not_listed === true)
    return savedNote === ""
      ? ""
      : `

${savedNote}`;
  let suffix = savedNote === "" ? "" : ` ${savedNote}`;
  if (typeof result.saved_system === "string" && isUnder(result.saved_system_dir, result.saved_system))
    return `

[A quickstart in this conversation already listed the design systems and saved the files of ${canonicalArtifactTargetFor(result.saved_system, "(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${suffix}`;
  return savedNote === "" ? null : `${prefix}${suffix}`;
}
export { afterQuickstartSavedLine };
