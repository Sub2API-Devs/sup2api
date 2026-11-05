/**
 * utils/backgroundHousekeeping.ts
 *
 * 启动后的后台维护：初始化记忆提取与 autoDream、更新插件市场、注册 deep link 协议、定期清理旧消息文件与旧版本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/backgroundHousekeeping.ts
 * pieces: chunk-ads6w2ye.js (3)
 * attribution: facade-majority 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stat, writeFile } from "fs/promises";
import { join } from "path";
import { isStorageV5Enabled } from "./hoverRest.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
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

//@ chunk-ads6w2ye.js:11937-11984 facade-majority
/**
 * 判定过期清理的时间阈值（24 小时）。
 */
var STALE_CLEANUP_AGE_MS = 86400000;
var DELAY_VERY_SLOW_OPERATIONS_THAT_HAPPEN_EVERY_SESSION = 600000;
var STALE_CLEANUP_CATCHUP_DELAY_MS = 5000;
var TRANSCRIPT_HEARTBEAT_INTERVAL_MS = 3600000;
//@ chunk-ads6w2ye.js:11984-12206 facade-majority
async function isLastCleanupSentinelFresh(storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    let statResult = await storageV5.statMeta(STORAGE_SPACES.state("last-cleanup"));
    return statResult.ok && Date.now() - statResult.value.mtimeMs < STALE_CLEANUP_AGE_MS;
  }
  try {
    let stats = await stat(join(getClaudeConfigDir(), ".last-cleanup"));
    return Date.now() - stats.mtimeMs < STALE_CLEANUP_AGE_MS;
  } catch {
    return false;
  }
}
//@ chunk-ads6w2ye.js:12206-13268 facade-majority (2.1.88 match: startBackgroundHousekeeping, 0.051)
/**
 * 后台维护（每宿主一次）：初始化 extractMemories/autoDream、后台更新插件；交互式时注册 deep link；延迟执行慢操作（用户 1 分钟内有操作则推迟）：清理旧消息文件、写 .last-cleanup、清理旧版本。
 */
async function startBackgroundHousekeeping(host, storageV5) {
  if (isDiskless()) return;
  if (!host.backgroundHousekeeping.claim()) return;
  initExtractMemories(host);
  initAutoDream(host);
  autoUpdateMarketplacesAndPluginsInBackground(storageV5);
  if (getIsInteractive()) {
    ensureDeepLinkProtocolRegistered(storageV5);
    touchSessionTranscript(storageV5);
    setInterval(touchSessionTranscript, TRANSCRIPT_HEARTBEAT_INTERVAL_MS, storageV5).unref();
  }
  let cleanupPhase = "sentinel-unchecked";
  async function runHousekeeping() {
    if (getIsInteractive() && getLastInteractionTime() > Date.now() - 60000) {
      setTimeout(runVerySlowOps, DELAY_VERY_SLOW_OPERATIONS_THAT_HAPPEN_EVERY_SESSION).unref();
      return;
    }
    if (cleanupPhase !== "done") {
      if (cleanupPhase === "sentinel-unchecked") {
        cleanupPhase = "sweep-due";
        if (await isLastCleanupSentinelFresh(storageV5)) {
          setTimeout(runVerySlowOps, DELAY_VERY_SLOW_OPERATIONS_THAT_HAPPEN_EVERY_SESSION).unref();
          return;
        }
      }
      cleanupPhase = "done";
      let cleanupFinished = (await cleanupOldMessageFilesInBackground(storageV5)) === undefined;
      if (isStorageV5Enabled() && storageV5 !== undefined)
        await reapStaleHousekeepingStagingFiles(getClaudeConfigDir(), host.backgroundHousekeeping);
      if (cleanupFinished && isStorageV5Enabled() && storageV5 !== undefined) {
        await healRefusedSentinelLeaf(storageV5);
        let writeResult = await storageV5.write(
          STORAGE_SPACES.state("last-cleanup"),
          new Date().toISOString(),
          {
            publishDiscipline: "inPlace",
          },
        );
        if (!writeResult.ok)
          logForDebugging(`.last-cleanup write failed: ${writeResult.error.code}`, {
            level: "error",
          });
      } else if (cleanupFinished)
        await writeFile(join(getClaudeConfigDir(), ".last-cleanup"), new Date().toISOString()).catch(
          (error) =>
            isSyscallError(error)
              ? logForDebugging(`.last-cleanup write failed: ${error.code} ${error.message}`, {
                  level: "error",
                })
              : logError(error),
        );
    }
    if (getIsInteractive() && getLastInteractionTime() > Date.now() - 60000) {
      setTimeout(runVerySlowOps, DELAY_VERY_SLOW_OPERATIONS_THAT_HAPPEN_EVERY_SESSION).unref();
      return;
    }
    await cleanupOldVersions();
  }
  function runVerySlowOps() {
    return runHousekeeping().catch((error) =>
      isCleanupQuietFsErrno(error)
        ? logForDebugging(`background housekeeping failed: ${error.message}`, {
            level: "error",
          })
        : logError(error),
    );
  }
  setTimeout(runVerySlowOps, STALE_CLEANUP_CATCHUP_DELAY_MS).unref();
}
export {
  startBackgroundHousekeeping,
  DELAY_VERY_SLOW_OPERATIONS_THAT_HAPPEN_EVERY_SESSION,
  STALE_CLEANUP_CATCHUP_DELAY_MS,
  TRANSCRIPT_HEARTBEAT_INTERVAL_MS,
  isLastCleanupSentinelFresh,
};
