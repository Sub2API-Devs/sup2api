/**
 * utils/backgroundHousekeeping.ts
 *
 * 启动后的后台维护：初始化记忆提取与 autoDream、更新插件市场、注册 deep link 协议、定期清理旧消息文件与旧版本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/backgroundHousekeeping.ts
 * pieces: chunk-0nv5pv9r.js (3)
 * attribution: facade-majority 3
 */
import { stat, writeFile } from "fs/promises";
import { join } from "path";
import { isStorageV5Enabled } from "./hoverRest.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { isDiskless, getIsInteractive, getLastInteractionTime } from "../bootstrap/state.js";
import { initExtractMemories } from "../services/extractMemories/extractMemories.js";
import { initAutoDream } from "../services/autoDream/autoDream.js";
import { autoUpdateMarketplacesAndPluginsInBackground } from "./plugins/pluginAutoupdate.js";
import { ensureDeepLinkProtocolRegistered } from "./deepLink/registerProtocol.js";
import { touchSessionTranscript } from "./sessionStorage.js";
import {
  cleanupOldMessageFilesInBackground,
  reapStaleHousekeepingStagingFiles,
  healRefusedSentinelLeaf,
  isCleanupQuietFsErrno,
} from "./cleanup.js";
import { logForDebugging } from "./debug.js";
import { isSyscallError } from "./errors.js";
import { logError } from "./log.js";
import { cleanupOldVersions } from "./nativeInstaller/installer.js";

//@ chunk-0nv5pv9r.js:11937-11984 facade-majority
var L = 86400000,
  DELAY_VERY_SLOW_OPERATIONS_THAT_HAPPEN_EVERY_SESSION = 600000,
  STALE_CLEANUP_CATCHUP_DELAY_MS = 5000,
  TRANSCRIPT_HEARTBEAT_INTERVAL_MS = 3600000;
//@ chunk-0nv5pv9r.js:11984-12206 facade-majority
async function isLastCleanupSentinelFresh(n) {
  if (isStorageV5Enabled() && n !== void 0) {
    let statMeta = await n.statMeta(STORAGE_SPACES.state("last-cleanup"));
    return statMeta.ok && Date.now() - statMeta.value.mtimeMs < L;
  }
  try {
    let o = await stat(join(getClaudeConfigDir(), ".last-cleanup"));
    return Date.now() - o.mtimeMs < L;
  } catch {
    return !1;
  }
}
/**
 * 后台维护（每宿主一次）：初始化 extractMemories/autoDream、后台更新插件；交互式时注册 deep link；延迟执行慢操作（用户 1 分钟内有操作则推迟）：清理旧消息文件、写 .last-cleanup、清理旧版本。
 */
//@ chunk-0nv5pv9r.js:12206-13290 facade-majority = startBackgroundHousekeeping (0.047)
async function startBackgroundHousekeeping(host, storageV5) {
  if (isDiskless()) return;
  if (!host.backgroundHousekeeping.claim()) return;
  if (
    (initExtractMemories(host),
    initAutoDream(host),
    autoUpdateMarketplacesAndPluginsInBackground(storageV5),
    getIsInteractive())
  )
    (ensureDeepLinkProtocolRegistered(storageV5),
      touchSessionTranscript(storageV5),
      setInterval(touchSessionTranscript, TRANSCRIPT_HEARTBEAT_INTERVAL_MS, storageV5).unref());
  let m = "sentinel-unchecked";
  async function r() {
    if (getIsInteractive() && getLastInteractionTime() > Date.now() - 60000) {
      setTimeout(runVerySlowOps, DELAY_VERY_SLOW_OPERATIONS_THAT_HAPPEN_EVERY_SESSION).unref();
      return;
    }
    if (m !== "done") {
      if (m === "sentinel-unchecked") {
        if (((m = "sweep-due"), await isLastCleanupSentinelFresh(storageV5))) {
          setTimeout(runVerySlowOps, DELAY_VERY_SLOW_OPERATIONS_THAT_HAPPEN_EVERY_SESSION).unref();
          return;
        }
      }
      m = "done";
      let i = (await cleanupOldMessageFilesInBackground(storageV5)) !== "remote_settings_unknowable";
      if (isStorageV5Enabled() && storageV5 !== void 0)
        await reapStaleHousekeepingStagingFiles(getClaudeConfigDir(), host.backgroundHousekeeping);
      if (i && isStorageV5Enabled() && storageV5 !== void 0) {
        await healRefusedSentinelLeaf(storageV5);
        let write = await storageV5.write(STORAGE_SPACES.state("last-cleanup"), new Date().toISOString(), {
          publishDiscipline: "inPlace",
        });
        if (!write.ok) logForDebugging(`.last-cleanup write failed: ${write.error.code}`, { level: "error" });
      } else if (i)
        await writeFile(join(getClaudeConfigDir(), ".last-cleanup"), new Date().toISOString()).catch((u) =>
          isSyscallError(u)
            ? logForDebugging(`.last-cleanup write failed: ${u.code} ${u.message}`, { level: "error" })
            : logError(u),
        );
    }
    if (getIsInteractive() && getLastInteractionTime() > Date.now() - 60000) {
      setTimeout(runVerySlowOps, DELAY_VERY_SLOW_OPERATIONS_THAT_HAPPEN_EVERY_SESSION).unref();
      return;
    }
    await cleanupOldVersions();
  }
  function runVerySlowOps() {
    return r().catch((i) =>
      isCleanupQuietFsErrno(i)
        ? logForDebugging(`background housekeeping failed: ${i.message}`, { level: "error" })
        : logError(i),
    );
  }
  setTimeout(runVerySlowOps, STALE_CLEANUP_CATCHUP_DELAY_MS).unref();
}

export { startBackgroundHousekeeping };
