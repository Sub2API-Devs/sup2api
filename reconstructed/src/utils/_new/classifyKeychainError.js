/**
 * utils/_new/classifyKeychainError.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gwwacf44.js (2)
 * attribution: sole-consumer-new 2
 */

//@ chunk-gwwacf44.js:1689-1751 sole-consumer-new
function kRi(e, n, t) {
  if (e.generation === t) e.keychainHoldsItem = n;
}
/**
 * 把 macOS 钥匙串命令的错误输出归类：重复项、钥匙串不可用、无默认钥匙串、找不到、不允许交互、用户取消、认证失败、已锁定或其他。
 */
//@ chunk-gwwacf44.js:1751-2673 sole-consumer-new
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

export { classifyKeychainError };
