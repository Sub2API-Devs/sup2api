/**
 * tools/BashTool/syncedMemoryRemoval.ts
 *
 * 2.1.316 新增：批量删除同步记忆文件前的保护
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (2)
 * attribution: placement 2
 */
import { withTimeout as withTimeout_2 } from "../../utils/sleep.js";
import { DISK_PROBE_TIMEOUT_MS, READ_ONLY_FAMILY_MS } from "./BashTool.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";

//@ chunk-5xgkngpb.js:4888426-4889143 placement
/**
 * 一次删除大量同步记忆文件前提示等待或分批。
 */
async function guardSyncedMemoryRemoval(session, extractTargets) {
  if ((session.multiStoreState ?? session.userMultiStoreState) === null) return;
  try {
    let targets = await extractTargets();
    let probe =
      targets.length > 0
        ? await withTimeout_2(
            session.massDeleteHoldExposure(targets),
            DISK_PROBE_TIMEOUT_MS,
            "disk probe timed out",
          )
        : null;
    if (probe === null) return;
    let { threshold, missingNow, targetsOnDisk } = probe;
    let allowedNow = threshold - missingNow;
    return {
      result: false,
      errorCode: 13,
      message: `This would remove ${missingNow + targetsOnDisk} synced memory files at once (${missingNow} already missing, ${targetsOnDisk} named here), so nothing was removed. Memory sync holds deletions when more than ${threshold} synced files are missing at the same time, and restores them all. ${allowedNow > 0 ? `Remove at most ${allowedNow} now, wait` : "Wait"} about a minute for memory sync to catch up, then continue.`,
    };
  } catch (error) {
    logForDebugging(`memory removal cap: check failed: ${errorMessage(error)}`, {
      level: "warn",
    });
    return;
  }
}
//@ chunk-5xgkngpb.js:4889143-4889724 placement
/**
 * rm 掉同步记忆文件后，先探测文件、再把删除结果回报，避免把未删除的条目当作已删。
 */
async function prepareNamedRemoval(store, collectPaths) {
  if ((store.multiStoreState ?? store.userMultiStoreState) === null) return;
  try {
    let paths = await collectPaths();
    let candidates =
      paths.length > 0
        ? await withTimeout_2(
            store.namedRemovalCandidates(paths),
            DISK_PROBE_TIMEOUT_MS,
            "disk probe timed out",
          )
        : [];
    if (candidates.length === 0) return;
    return async () => {
      try {
        await withTimeout_2(
          store.recordNamedRemovals(candidates),
          READ_ONLY_FAMILY_MS,
          "the delete took too long",
        ).finally(() => store.tellUnsentNamedRemovals(candidates));
      } catch (error) {
        logForDebugging(
          `memory sync: the delete of a Bash rm of a synced file is not confirmed: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    };
  } catch (error) {
    logForDebugging(
      `memory sync: could not check the files this rm names, so its removals are not recorded: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
    return;
  }
}
export { guardSyncedMemoryRemoval, prepareNamedRemoval };
