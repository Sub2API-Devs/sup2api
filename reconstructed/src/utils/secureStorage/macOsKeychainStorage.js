/**
 * utils/secureStorage/macOsKeychainStorage.ts
 *
 * macOS 钥匙串存储相关（本段多为误配：钥匙串项缺失探测、bubblewrap 试跑、设备密钥的钥匙串后端）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/secureStorage/macOsKeychainStorage.ts
 * pieces: chunk-b29hdd5e.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 */
import { execFileNoThrow } from "../execFileNoThrow.js";
import { getUsername, getMacOsKeychainStorageServiceName } from "./macOsKeychainHelpers.js";

//@ chunk-b29hdd5e.js:2006-2017 sole-consumer
var KEYCHAIN_PROBE_TIMEOUT_MS = 2000;
//@ chunk-b29hdd5e.js:2017-2026 affinity
var KEYCHAIN_ITEM_NOT_FOUND_EXIT = 44;
/**
 * 用 security find-generic-password 探测钥匙串项是否不存在（退出码等于“未找到”）；出错返回 false。不是旧版的 doReadAsync。
 */
//@ chunk-b29hdd5e.js:2026-2212 fingerprint = doReadAsync (1)
async function isKeychainItemMissing() {
  try {
    let { code: code } = await execFileNoThrow(
      "security",
      ["find-generic-password", "-a", getUsername(), "-w", "-s", getMacOsKeychainStorageServiceName()],
      { useCwd: !1, preserveOutputOnError: !1, timeout: KEYCHAIN_PROBE_TIMEOUT_MS },
    );
    return code === KEYCHAIN_ITEM_NOT_FOUND_EXIT;
  } catch {
    return !1;
  }
}

export { isKeychainItemMissing };
