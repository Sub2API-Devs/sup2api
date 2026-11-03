/**
 * utils/shell/diskSpaceWarning.ts
 *
 * 2.1.316 新增：磁盘满警告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { join, dirname } from "path";
import { statfs } from "fs/promises";
import { tmpdir, claudeTempDirName } from "../tempDir.js";
import { probeTaskOutputWrite } from "../task/diskOutput.js";

//@ chunk-e6aww6q8.js:257536-257760 placement
/**
 * 磁盘空间不足时的建议文本（释放空间或设置 CLAUDE_CODE_TMPDIR）与相关时间常量。
 */
var DISK_FULL_ADVICE =
  "Free space on that volume, or restart Claude Code with CLAUDE_CODE_TMPDIR set to a directory on another one, then retry. If this is the user's own computer, tell them before deleting anything to make room.";
var DISK_SPACE_CHECK_INTERVAL_MS = 5000;
//@ chunk-e6aww6q8.js:257760-259223 placement
/**
 * 磁盘已满时给出警告，说明命令输出可能丢失或被截断。
 */
async function buildDiskFullWarning(path, n) {
  let r = join(tmpdir(), claudeTempDirName());
  let s = n ? "whatever this command printed was lost" : "this command's output may be cut short";
  let h = `so ${s} and its own writes may have failed with "No space left on device".`;
  let y = false;
  try {
    let w = await statfs(dirname(path), {
      bigint: true,
    });
    let L = (w.bavail * w.bsize) / (1024n * 1024n);
    y = L >= 0n && w.blocks > 0n;
    if (y && L < 10n)
      return `Disk full: this computer's volume holding ${r} (Claude Code's temporary directory) has ${L} MB free, ${h} ${DISK_FULL_ADVICE}`;
    if (y && w.files > 0n && w.ffree < 1000n)
      return `Nearly out of inodes: this computer's volume holding ${r} (Claude Code's temporary directory) has ${w.ffree} free inodes, so creating files there may fail and the command may have failed for that reason. ${DISK_FULL_ADVICE}`;
  } catch {}
  if (y && !n) return null;
  let S = await probeTaskOutputWrite(path);
  if (S === "EDQUOT")
    return `Disk quota used up: a test write beside this command's output file, on the volume holding ${r} (Claude Code's temporary directory), failed with EDQUOT, so ${s} and its own writes may have failed with "Disk quota exceeded". Delete files there that are no longer needed, or restart Claude Code with CLAUDE_CODE_TMPDIR set to a directory on another volume, then retry. If this is the user's own computer, tell them before deleting anything to make room.`;
  if (S === "ENOSPC")
    return `Disk full: a test write beside this command's output file, on the volume holding ${r} (Claude Code's temporary directory), failed with ENOSPC (the volume, or the user's quota on it, has no space left), ${h} ${DISK_FULL_ADVICE}`;
  return null;
}
export { DISK_SPACE_CHECK_INTERVAL_MS, buildDiskFullWarning, DISK_FULL_ADVICE };
