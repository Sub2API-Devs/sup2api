/**
 * services/remoteManagedSettings/syncCacheState.ts
 *
 * 远程设置缓存文件名常量（remote-settings.json、remote-settings-helper-consent）与大小上限。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/remoteManagedSettings/syncCacheState.ts
 * pieces: chunk-a2q0x549.js (1)
 * attribution: placement 1
 */
import { open } from "fs/promises";
import { constants } from "fs";
import { syncStampPath, isSymlinkPath, MAX_SYNC_STAMP_BYTES } from "./consentRecords.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";

//@ chunk-a2q0x549.js:159349-159683 placement (2.1.88 match: getSessionMemoryContent, 0.683)
/**
 * 读取远程设置同步时间戳文件 <remote-settings>.synced-at（只接受 1–16 位数字，拒绝符号链接）。
 */
async function readRemoteSettingsSyncStamp() {
  let fs = syncStampPath();
  let text;
  try {
    if (NOFOLLOW_NONBLOCK_FLAGS === 0 && (await isSymlinkPath(fs))) return;
    let handle = await open(fs, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS);
    try {
      let stats = await handle.stat();
      if (!stats.isFile() || stats.size > MAX_SYNC_STAMP_BYTES) return;
      text = await handle.readFile({
        encoding: "utf-8",
      });
    } finally {
      await handle.close();
    }
  } catch {
    return;
  }
  let trimmed = text.trim();
  if (!/^\d{1,16}$/.test(trimmed)) return;
  let seconds = Number(trimmed);
  return Number.isFinite(seconds) ? seconds : undefined;
}
export { readRemoteSettingsSyncStamp };
