/**
 * utils/secureStorage/keychainPrefetch.ts
 *
 * 启动时用 macOS security 命令预取钥匙串项。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/secureStorage/keychainPrefetch.ts
 * pieces: chunk-jcrjgjd4.js (8)
 * attribution: facade-exports 7, fingerprint 1
 */
import { execFile } from "child_process";
import { getKeychainCacheState, getUsername } from "./macOsKeychainHelpers.js";
import { isBareMode } from "../envUtils.js";
import { withDeadline } from "../sleep.js";

//@ chunk-jcrjgjd4.js:360-387 facade-exports
var KEYCHAIN_PREFETCH_TIMEOUT_MS = 1e4;
var KEYCHAIN_PREFETCH_FASTPATH_BUDGET_MS = 250;
var KEYCHAIN_PREFETCH_CACHE = null;
var KEYCHAIN_PREFETCH_PROMISE;
//@ chunk-jcrjgjd4.js:387-416 facade-exports
function isWindowsCredManagerAvailable() {
  return KEYCHAIN_PREFETCH_PROMISE === true;
}
//@ chunk-jcrjgjd4.js:416-454 facade-exports
function getLastKnown() {
  return getKeychainCacheState().lastKnown;
}
//@ chunk-jcrjgjd4.js:454-488 facade-exports
function setLastKnown(lastKnown) {
  getKeychainCacheState().lastKnown = lastKnown;
}
//@ chunk-jcrjgjd4.js:488-746 fingerprint (2.1.88 match: spawnSecurity, 0.914)
/**
 * 用 `security find-generic-password -a <用户> -w -s <服务名>` 预取钥匙串项；超时返回 null。
 */
function spawnSecurity(serviceName) {
  return new Promise((resolve) => {
    try {
      execFile(
        "security",
        ["find-generic-password", "-a", getUsername(), "-w", "-s", serviceName],
        {
          encoding: "utf-8",
          timeout: KEYCHAIN_PREFETCH_TIMEOUT_MS,
          windowsHide: true,
        },
        (err, stdout) => {
          let killed = Boolean(err && "killed" in err && err.killed);
          resolve(
            killed
              ? null
              : {
                  stdout: err ? null : stdout?.trim() || null,
                },
          );
        },
      );
    } catch {
      resolve(null);
    }
  });
}
//@ chunk-jcrjgjd4.js:746-821 facade-exports
/**
 * macOS 钥匙串预读的启动入口；在 linux 构建中函数体被裁剪，实际什么也不做。
 */
function startKeychainPrefetch() {
  let bare = isBareMode();
  if (KEYCHAIN_PREFETCH_CACHE || bare) return;
  let keychainCacheState = getKeychainCacheState();
  let generation = keychainCacheState.generation;
  return;
}
//@ chunk-jcrjgjd4.js:821-884 facade-exports
/**
 * 等待钥匙串预读完成（可带超时）；没有预读任务时直接返回。
 */
async function ensureKeychainPrefetchCompleted(timeoutMs) {
  if (!KEYCHAIN_PREFETCH_CACHE) return;
  await (timeoutMs === undefined
    ? KEYCHAIN_PREFETCH_CACHE
    : withDeadline(KEYCHAIN_PREFETCH_CACHE, timeoutMs));
}
//@ chunk-jcrjgjd4.js:884-931 facade-exports
function clearLegacyApiKeyPrefetch() {
  getKeychainCacheState().legacyApiKeyPrefetch = null;
}
export {
  ensureKeychainPrefetchCompleted,
  startKeychainPrefetch,
  clearLegacyApiKeyPrefetch,
  KEYCHAIN_PREFETCH_FASTPATH_BUDGET_MS,
  getLastKnown,
  isWindowsCredManagerAvailable,
  setLastKnown,
};
