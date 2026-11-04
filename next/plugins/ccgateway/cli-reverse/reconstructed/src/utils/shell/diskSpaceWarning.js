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
async function buildDiskFullWarning(path, outputLost) {
  let tempDir = join(tmpdir(), claudeTempDirName());
  let outputOutcome = outputLost
    ? "whatever this command printed was lost"
    : "this command's output may be cut short";
  let tailClause = `so ${outputOutcome} and its own writes may have failed with "No space left on device".`;
  let statsKnown = false;
  try {
    let stats = await statfs(dirname(path), {
      bigint: true,
    });
    let freeMb = (stats.bavail * stats.bsize) / (1024n * 1024n);
    statsKnown = freeMb >= 0n && stats.blocks > 0n;
    if (statsKnown && freeMb < 10n)
      return `Disk full: this computer's volume holding ${tempDir} (Claude Code's temporary directory) has ${freeMb} MB free, ${tailClause} ${DISK_FULL_ADVICE}`;
    if (statsKnown && stats.files > 0n && stats.ffree < 1000n)
      return `Nearly out of inodes: this computer's volume holding ${tempDir} (Claude Code's temporary directory) has ${stats.ffree} free inodes, so creating files there may fail and the command may have failed for that reason. ${DISK_FULL_ADVICE}`;
  } catch {}
  if (statsKnown && !outputLost) return null;
  let probeResult = await probeTaskOutputWrite(path);
  if (probeResult === "EDQUOT")
    return `Disk quota used up: a test write beside this command's output file, on the volume holding ${tempDir} (Claude Code's temporary directory), failed with EDQUOT, so ${outputOutcome} and its own writes may have failed with "Disk quota exceeded". Delete files there that are no longer needed, or restart Claude Code with CLAUDE_CODE_TMPDIR set to a directory on another volume, then retry. If this is the user's own computer, tell them before deleting anything to make room.`;
  if (probeResult === "ENOSPC")
    return `Disk full: a test write beside this command's output file, on the volume holding ${tempDir} (Claude Code's temporary directory), failed with ENOSPC (the volume, or the user's quota on it, has no space left), ${tailClause} ${DISK_FULL_ADVICE}`;
  return null;
}
export { DISK_SPACE_CHECK_INTERVAL_MS, buildDiskFullWarning, DISK_FULL_ADVICE };
