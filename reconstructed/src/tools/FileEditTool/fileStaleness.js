/**
 * tools/FileEditTool/fileStaleness.ts
 *
 * 2.1.316 新增：文件读后被改动的检测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { refuseSymlinkWrite } from "../../utils/fsSafety/pathRevalidation.js";
import { getPlatform } from "../../utils/platform.js";
import { aFe, tv } from "../../utils/remoteFileState.js";
import { SymlinkWriteRefusedError } from "../../utils/fsSafety/atomicWriteStaging.js";
import { getErrnoCode } from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:1400523-1400540 placement
var bKo = 67108864;
/**
 * 当前磁盘内容与读取基线比较（match/mismatch/absent）。
 */
//@ chunk-e6aww6q8.js:1400540-1400928 placement
async function compareWithDisk(e, n, r) {
  let s = n.bytes * 4 + 4;
  try {
    let h = await refuseSymlinkWrite(e, e, getPlatform(), Math.min(s, bKo), !0);
    return h === null || !r() ? "absent" : aFe(n, tv(h.content)) ? "match" : "mismatch";
  } catch (error) {
    if (error instanceof SymlinkWriteRefusedError) return "absent";
    switch (getErrnoCode(error)) {
      case "ERR_FILE_TOO_LARGE": {
        let size = error.size;
        return typeof size === "number" && size > s && r() ? "mismatch" : "absent";
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
