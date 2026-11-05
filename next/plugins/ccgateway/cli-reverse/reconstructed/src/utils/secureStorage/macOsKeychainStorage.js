/**
 * utils/secureStorage/macOsKeychainStorage.ts
 *
 * macOS 钥匙串存储相关（本段多为误配：钥匙串项缺失探测、bubblewrap 试跑、设备密钥的钥匙串后端）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/secureStorage/macOsKeychainStorage.ts
 * pieces: chunk-5me9t3vk.js (3), chunk-rfqytzvf.js (2)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1, placement 2
 */
import { execFileNoThrow } from "../execFileNoThrow.js";
import { getUsername, getMacOsKeychainStorageServiceName } from "./macOsKeychainHelpers.js";

//@ chunk-rfqytzvf.js:1689-1751 placement
/**
 * 在代次一致时记录钥匙串是否已持有该项。
 */
function setKeychainHoldsItem(state, keychainHoldsItem, generation) {
  if (state.generation === generation) state.keychainHoldsItem = keychainHoldsItem;
}
//@ chunk-rfqytzvf.js:1751-2673 placement
/**
 * 把 macOS 钥匙串命令的错误输出归类：重复项、钥匙串不可用、无默认钥匙串、找不到、不允许交互、用户取消、认证失败、已锁定或其他。
 */
function classifyKeychainError(stderr) {
  if (!stderr) return "empty";
  let lower = stderr.toLowerCase();
  if (lower.includes("errsecduplicateitem") || lower.includes("already exists")) return "duplicate_item";
  if (lower.includes("unable to open") || lower.includes("could not open")) return "keychain_unavailable";
  if (
    lower.includes("errsecnodefaultkeychain") ||
    lower.includes("default keychain") ||
    lower.includes("no keychain")
  )
    return "no_keychain";
  if (lower.includes("errsecitemnotfound") || lower.includes("item could not be found"))
    return "item_not_found";
  if (
    lower.includes("errsecinteractionnotallowed") ||
    lower.includes("interaction is not allowed") ||
    lower.includes("no user interaction")
  )
    return "interaction_not_allowed";
  if (lower.includes("errsecusercanceled") || lower.includes("cancel")) return "user_canceled";
  if (
    lower.includes("errsecauthfailed") ||
    lower.includes("authorization") ||
    lower.includes("authentication") ||
    lower.includes("name or passphrase")
  )
    return "auth_failed";
  if (lower.includes("locked") || lower.includes("unlock")) return "keychain_locked";
  return "other";
}
//@ chunk-5me9t3vk.js:2043-2054 sole-consumer
var KEYCHAIN_PROBE_TIMEOUT_MS = 2000;
//@ chunk-5me9t3vk.js:2054-2063 affinity
var KEYCHAIN_ITEM_NOT_FOUND_EXIT = 44;
//@ chunk-5me9t3vk.js:2063-2249 fingerprint (2.1.88 match: doReadAsync, 1)
/**
 * 用 security find-generic-password 探测钥匙串项是否不存在（退出码等于“未找到”）；出错返回 false。不是旧版的 doReadAsync。
 */
async function isKeychainItemMissing() {
  try {
    let { code } = await execFileNoThrow(
      "security",
      ["find-generic-password", "-a", getUsername(), "-w", "-s", getMacOsKeychainStorageServiceName()],
      {
        useCwd: false,
        preserveOutputOnError: false,
        timeout: KEYCHAIN_PROBE_TIMEOUT_MS,
      },
    );
    return code === KEYCHAIN_ITEM_NOT_FOUND_EXIT;
  } catch {
    return false;
  }
}
export { isKeychainItemMissing, classifyKeychainError };
