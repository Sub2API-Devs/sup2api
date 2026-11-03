/**
 * tools/BashTool/syncedMemoryRemoval.ts
 *
 * 2.1.316 新增：批量删除同步记忆文件前的保护
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { withTimeout as withTimeout_2 } from "../../utils/sleep.js";
import { IRs } from "./BashTool.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

/**
 * 一次删除大量同步记忆文件前提示等待或分批。
 */
//@ chunk-e6aww6q8.js:4768167-4768903 placement
async function guardSyncedMemoryRemoval(e, n) {
  if ((e.multiStoreState ?? e.userMultiStoreState) === null) return;
  try {
    let r = await n(),
      s = r.length > 0 ? await withTimeout_2(e.massDeleteHoldExposure(r), IRs, "disk probe timed out") : null;
    if (s === null) return;
    let { threshold: threshold, missingNow: missingNow, targetsOnDisk: targetsOnDisk } = s,
      w = threshold - missingNow;
    return {
      result: !1,
      errorCode: 13,
      message: `This would remove ${missingNow + targetsOnDisk} synced memory files at once (${missingNow} already missing, ${targetsOnDisk} named here), so nothing was removed. Memory sync holds deletions when more than ${threshold} synced files are missing at the same time, and restores them all. ${w > 0 ? `Remove at most ${w} now, wait` : "Wait"} about a minute for memory sync to apply the pending deletions, then continue.`,
    };
  } catch (error) {
    logForDebugging(`memory removal cap: check failed: ${errorMessage(error)}`, { level: "warn" });
    return;
  }
}

export { guardSyncedMemoryRemoval };
