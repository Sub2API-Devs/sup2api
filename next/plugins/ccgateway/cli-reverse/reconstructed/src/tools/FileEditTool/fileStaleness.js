/**
 * tools/FileEditTool/fileStaleness.ts
 *
 * 2.1.316 新增：文件读后被改动的检测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import { refuseSymlinkWrite } from "../../utils/fsSafety/pathRevalidation.js";
import { getPlatform } from "../../utils/platform.js";
import { matchesContentDigest, stripBom as stripBom_2 } from "../../utils/remoteFileState.js";
import { SymlinkWriteRefusedError } from "../../utils/fsSafety/atomicWriteStaging.js";
import { getErrnoCode } from "../../utils/errors.js";

//@ chunk-5xgkngpb.js:1399994-1400011 placement
/**
 * 比较磁盘内容时读取文件的大小上限（64 MiB）。
 */
var MAX_STALENESS_COMPARE_BYTES = 67108864;
//@ chunk-5xgkngpb.js:1400011-1400399 placement
/**
 * 当前磁盘内容与读取基线比较（match/mismatch/absent）。
 */
async function compareWithDisk(absolutePath, readBaseline, readAutoAllowed) {
  let maxExpectedBytes = readBaseline.bytes * 4 + 4;
  try {
    let readResult = await refuseSymlinkWrite(
      absolutePath,
      absolutePath,
      getPlatform(),
      Math.min(maxExpectedBytes, MAX_STALENESS_COMPARE_BYTES),
      true,
    );
    return readResult === null || !readAutoAllowed()
      ? "absent"
      : matchesContentDigest(readBaseline, stripBom_2(readResult.content))
        ? "match"
        : "mismatch";
  } catch (error) {
    if (error instanceof SymlinkWriteRefusedError) return "absent";
    switch (getErrnoCode(error)) {
      case "ERR_FILE_TOO_LARGE": {
        let size = error.size;
        return typeof size === "number" && size > maxExpectedBytes && readAutoAllowed()
          ? "mismatch"
          : "absent";
      }
      case "ERR_NOT_REGULAR_FILE":
      case "EISDIR":
        return "absent";
      default:
        throw error;
    }
  }
}
export { compareWithDisk };
