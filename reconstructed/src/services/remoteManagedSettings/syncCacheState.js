/**
 * services/remoteManagedSettings/syncCacheState.ts
 *
 * 远程设置缓存文件名常量（remote-settings.json、remote-settings-helper-consent）与大小上限。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/remoteManagedSettings/syncCacheState.ts
 * pieces: chunk-82kqcve8.js (1)
 * attribution: placement 1
 */
import { open, open as open_2, open as open_3 } from "fs/promises";
import { constants, constants as constants_2 } from "fs";
import { oYe, isSymlinkPath, Yf } from "./consentRecords.js";
import { ws } from "../../utils/fsFlags.js";

/**
 * 读取远程设置同步时间戳文件 <remote-settings>.synced-at（只接受 1–16 位数字，拒绝符号链接）。
 */
//@ chunk-82kqcve8.js:161260-161594 placement = getSessionMemoryContent (0.632)
async function readRemoteSettingsSyncStamp() {
  let fs = oYe(),
    n;
  try {
    if (ws === 0 && (await isSymlinkPath(fs))) return;
    let h = await open_2(fs, constants_2.O_RDONLY | ws);
    try {
      let stats = await h.stat();
      if (!stats.isFile() || stats.size > Yf) return;
      n = await h.readFile({ encoding: "utf-8" });
    } finally {
      await h.close();
    }
  } catch {
    return;
  }
  let trimmed = n.trim();
  if (!/^\d{1,16}$/.test(trimmed)) return;
  let s = Number(trimmed);
  return Number.isFinite(s) ? s : void 0;
}

export { readRemoteSettingsSyncStamp };
