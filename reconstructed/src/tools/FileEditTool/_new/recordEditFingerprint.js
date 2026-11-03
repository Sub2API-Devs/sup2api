/**
 * tools/FileEditTool/_new/recordEditFingerprint.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: sole-consumer-new 4
 */
import { mn } from "../../../utils/remoteEnvironment.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { computeContentHash } from "../../../utils/commitAttribution.js";
import { jsonStringify, jsonParse } from "../../../utils/slowOperations.js";
import { readFileChecked } from "../../../utils/fileRead.js";

//@ chunk-e6aww6q8.js:4647900-4647926 sole-consumer-new
var vpt = 4194304,
  p2n = 16384;
//@ chunk-e6aww6q8.js:4647926-4648003 sole-consumer-new
function m2n(e) {
  if (!mn() || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_patient_meteor", !1)) return;
  return recordEditFingerprint(e);
}
/**
 * 记录编辑结果的内容哈希（大小受限）。
 */
//@ chunk-e6aww6q8.js:4648003-4648565 sole-consumer-new
function recordEditFingerprint({
  absoluteFilePath: absoluteFilePath,
  output: output,
  originalFile: originalFile,
  updatedFile: updatedFile,
  appliedNewString: appliedNewString,
}) {
  if (
    originalFile.length > vpt ||
    updatedFile.length > vpt ||
    output.oldString.length + output.newString.length > p2n
  )
    return;
  let y = computeContentHash(
      updatedFile.replaceAll(
        `\r
`,
        `
`,
      ),
    ),
    S = jsonStringify({
      filePath: output.filePath,
      oldString: output.oldString,
      newString: output.newString,
      ...(appliedNewString !== output.newString && { appliedNewString: appliedNewString }),
      replaceAll: output.replaceAll,
      userModified: output.userModified,
      structuredPatch: output.structuredPatch,
      originalFile: null,
      originalFileSha256: computeContentHash(originalFile),
      updatedFileSha256: y,
    });
  if (S.length > p2n) return;
  return { subagentFrameResult: jsonParse(S), subagentFrameResultHolds: () => CTs(absoluteFilePath, y) };
}
//@ chunk-e6aww6q8.js:4648565-4648659 sole-consumer-new
async function CTs(e, n) {
  try {
    let { content: content } = await readFileChecked(e, vpt * 4);
    return computeContentHash(content) === n;
  } catch {
    return !1;
  }
}

export { recordEditFingerprint, m2n };
