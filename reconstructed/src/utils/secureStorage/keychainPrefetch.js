/**
 * utils/secureStorage/keychainPrefetch.ts
 *
 * 启动时用 macOS security 命令预取钥匙串项。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/secureStorage/keychainPrefetch.ts
 * pieces: chunk-9np9x1zv.js (8)
 * attribution: facade-exports 7, fingerprint 1
 */
import { execFile } from "child_process";
import { getKeychainCacheState, getUsername } from "./macOsKeychainHelpers.js";
import { isBareMode } from "../envUtils.js";
import { withDeadline } from "../sleep.js";

//@ chunk-9np9x1zv.js:360-387 facade-exports
var l = 1e4,
  KEYCHAIN_PREFETCH_FASTPATH_BUDGET_MS = 250,
  o = null,
  u;
//@ chunk-9np9x1zv.js:387-416 facade-exports
function isWindowsCredManagerAvailable() {
  return u === !0;
}
//@ chunk-9np9x1zv.js:416-454 facade-exports
function getLastKnown() {
  return getKeychainCacheState().lastKnown;
}
//@ chunk-9np9x1zv.js:454-488 facade-exports
function setLastKnown(n) {
  getKeychainCacheState().lastKnown = n;
}
/**
 * 用 `security find-generic-password -a <用户> -w -s <服务名>` 预取钥匙串项；超时返回 null。
 */
//@ chunk-9np9x1zv.js:488-746 fingerprint = spawnSecurity (0.914)
function spawnSecurity(serviceName) {
  return new Promise((resolve) => {
    try {
      execFile(
        "security",
        ["find-generic-password", "-a", getUsername(), "-w", "-s", serviceName],
        { encoding: "utf-8", timeout: l, windowsHide: !0 },
        (err, stdout) => {
          let a = Boolean(err && "killed" in err && err.killed);
          resolve(a ? null : { stdout: err ? null : stdout?.trim() || null });
        },
      );
    } catch {
      resolve(null);
    }
  });
}
/**
 * macOS 钥匙串预读的启动入口；在 linux 构建中函数体被裁剪，实际什么也不做。
 */
//@ chunk-9np9x1zv.js:746-821 facade-exports
function startKeychainPrefetch() {
  let n = isBareMode();
  if (o || n) return;
  let e = getKeychainCacheState(),
    generation = e.generation;
  return;
}
/**
 * 等待钥匙串预读完成（可带超时）；没有预读任务时直接返回。
 */
//@ chunk-9np9x1zv.js:821-884 facade-exports
async function ensureKeychainPrefetchCompleted(n) {
  if (!o) return;
  await (n === void 0 ? o : withDeadline(o, n));
}
//@ chunk-9np9x1zv.js:884-931 facade-exports
function clearLegacyApiKeyPrefetch() {
  getKeychainCacheState().legacyApiKeyPrefetch = null;
}

export {
  startKeychainPrefetch,
  ensureKeychainPrefetchCompleted,
  clearLegacyApiKeyPrefetch,
  KEYCHAIN_PREFETCH_FASTPATH_BUDGET_MS,
};
