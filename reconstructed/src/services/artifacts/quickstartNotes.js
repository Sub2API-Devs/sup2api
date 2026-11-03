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
function afterQuickstartSavedLine(t, o, a, d) {
  let e = (i, r) => typeof i === "string" && typeof r === "string" && i === a(r);
  let s = e(t.saved_pages_dir, o)
    ? `[A quickstart in this conversation saved reference pages of this type on disk in ${shellQuoteArgs([t.saved_pages_dir])}; its result lists them, so those are not attached here.]`
    : "";
  if (t.not_listed === true)
    return s === ""
      ? ""
      : `

${s}`;
  let n = s === "" ? "" : ` ${s}`;
  if (typeof t.saved_system === "string" && e(t.saved_system_dir, t.saved_system))
    return `

[A quickstart in this conversation already listed the design systems and saved the files of ${canonicalArtifactTargetFor(t.saved_system, "(unrecognized address)")} on disk \u2014 skip the instructions' step that lists them and reads that README; its result lists the saved files.]${n}`;
  return s === "" ? null : `${d}${n}`;
}
