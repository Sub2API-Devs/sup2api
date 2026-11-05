/**
 * costHook.ts
 *
 * 本构建里只剩一个退出钩子注册函数（被旧版名 useCostSummary 错配，实为进程退出时清理 activeKeyFile）；真正的成本汇总输出不在此。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/costHook.ts
 * pieces: chunk-e5z7dpjd.js (2)
 * attribution: affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { tryAcquireLock } from "./utils/nativeInstaller/pidLock.js";

//@ chunk-e5z7dpjd.js:23172-23190 affinity
var releaseLock = null;
var exitHookInstalled = false;
//@ chunk-e5z7dpjd.js:23190-23328 fingerprint (2.1.88 match: useCostSummary, 0.832)
async function useCostSummary(versionPath, lockFilePath) {
  let release = await tryAcquireLock(versionPath, lockFilePath);
  if (!release) return false;
  releaseLock = release;
  if (!exitHookInstalled) {
    exitHookInstalled = true;
    let onExit = () => {
      try {
        releaseLock?.();
      } catch {}
    };
    process.on("exit", onExit);
  }
  return true;
}
export { useCostSummary };
