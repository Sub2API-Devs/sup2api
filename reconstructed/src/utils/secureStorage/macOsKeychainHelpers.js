/**
 * utils/secureStorage/macOsKeychainHelpers.ts
 *
 * macOS 钥匙串服务名/账户名计算与每宿主读缓存状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/secureStorage/macOsKeychainHelpers.ts
 * pieces: chunk-gwwacf44.js (13)
 * attribution: fingerprint 5, layout 7, callgraph-fingerprint 1
 */
import { join } from "path";
import { homedir, userInfo } from "os";
import { createHash } from "crypto";
import { getClaudeConfigDir } from "../envUtils.js";
import { isDiskless, getRootSession } from "../../bootstrap/state.js";
import { getOauthConfig } from "../../constants/oauth.js";
import { HostScoped } from "../hostScoped.js";

//@ chunk-gwwacf44.js:442-465 fingerprint = CREDENTIALS_SERVICE_SUFFIX (1)
var CREDENTIALS_SERVICE_SUFFIX = "-credentials";
//@ chunk-gwwacf44.js:465-600 layout = getProjectDirsUpToHome (0.855)
/**
 * 安全存储使用的配置目录：CLAUDE_SECURESTORAGE_CONFIG_DIR 优先（空串退回 ~/.claude），否则用 Claude 配置目录；NFC 归一。用于钥匙串服务名后缀。旧版名 getProjectDirsUpToHome 错配。
 */
function getProjectDirsUpToHome() {
  let envClaudeSecurestorageConfigDir = process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR;
  if (envClaudeSecurestorageConfigDir !== undefined)
    return (envClaudeSecurestorageConfigDir || join(homedir(), ".claude")).normalize("NFC");
  return getClaudeConfigDir();
}
//@ chunk-gwwacf44.js:600-636 layout
/**
 * keychainProjectDirs：钥匙串服务名用到的项目目录。
 */
function keychainProjectDirs() {
  return isDiskless() ? null : getProjectDirsUpToHome();
}
//@ chunk-gwwacf44.js:636-906 fingerprint = getMacOsKeychainStorageServiceName (0.839)
/**
 * macOS 钥匙串服务名："Claude Code" + OAuth 后缀 + 后缀 + （设置了 CLAUDE_CONFIG_DIR / CLAUDE_SECURESTORAGE_CONFIG_DIR 时）配置目录 sha256 前 8 位。
 */
function getMacOsKeychainStorageServiceName(serviceSuffix = "") {
  let envClaudeSecurestorageConfigDir = process.env.CLAUDE_SECURESTORAGE_CONFIG_DIR;
  let isDefaultDir =
    envClaudeSecurestorageConfigDir !== undefined
      ? !envClaudeSecurestorageConfigDir
      : !process.env.CLAUDE_CONFIG_DIR;
  let r =
    envClaudeSecurestorageConfigDir !== undefined
      ? envClaudeSecurestorageConfigDir.normalize("NFC")
      : getClaudeConfigDir();
  let dirHash = isDefaultDir ? "" : `-${createHash("sha256").update(r).digest("hex").substring(0, 8)}`;
  return `Claude Code${getOauthConfig().OAUTH_FILE_SUFFIX}${serviceSuffix}${dirHash}`;
}
//@ chunk-gwwacf44.js:906-932 layout
var SAFE_USERNAME_PATTERN = /^[a-zA-Z0-9._-]+$/;
//@ chunk-gwwacf44.js:932-1064 fingerprint = getUsername (1)
/**
 * 钥匙串账户名：USER 或 os.userInfo，非 [A-Za-z0-9._-] 时用 claude-code-user。
 */
function getUsername() {
  let e;
  try {
    e = process.env.USER || userInfo().username;
  } catch {
    e = "claude-code-user";
  }
  if (!SAFE_USERNAME_PATTERN.test(e)) return "claude-code-user";
  return e;
}
//@ chunk-gwwacf44.js:1064-1078 layout
var KEYCHAIN_CACHE_TTL_MS = 30000;
//@ chunk-gwwacf44.js:1078-1229 layout
class KeychainCacheState {
  cache = {
    data: null,
    cachedAt: 0,
  };
  generation = 0;
  readInFlight = null;
  lastReadFailure = null;
  keychainHoldsItem = false;
  lastKnown = null;
  legacyApiKeyPrefetch = null;
}
//@ chunk-gwwacf44.js:1229-1252 layout
var KEYCHAIN_CACHE_PER_HOST = new HostScoped(() => new KeychainCacheState());
//@ chunk-gwwacf44.js:1252-1289 layout
function getKeychainCacheState() {
  return KEYCHAIN_CACHE_PER_HOST.of(getRootSession().host);
}
//@ chunk-gwwacf44.js:1289-1413 fingerprint = keychainCacheState (0.861)
/**
 * 把钥匙串读缓存标为过期（保留数据、cachedAt 归零），代数加一并清除进行中的读取与失败记录。
 */
function markKeychainCacheStale() {
  let keychainCacheState = getKeychainCacheState();
  keychainCacheState.cache = {
    data: keychainCacheState.cache.data,
    cachedAt: 0,
  };
  keychainCacheState.generation++;
  keychainCacheState.readInFlight = null;
  keychainCacheState.lastReadFailure = null;
}
//@ chunk-gwwacf44.js:1413-1528 callgraph-fingerprint = clearKeychainCache (0.861)
/**
 * 清空钥匙串读缓存（数据置空），代数加一并清除进行中的读取与失败记录。
 */
function clearKeychainCache() {
  let keychainCacheState = getKeychainCacheState();
  keychainCacheState.cache = {
    data: null,
    cachedAt: 0,
  };
  keychainCacheState.generation++;
  keychainCacheState.readInFlight = null;
  keychainCacheState.lastReadFailure = null;
}
//@ chunk-gwwacf44.js:1528-1689 fingerprint = primeKeychainCacheFromPrefetch (0.831)
function primeKeychainCacheFromPrefetch(stdout, n, t = getKeychainCacheState()) {
  if (t.cache.cachedAt !== 0 || t.generation !== n) return;
  let data = null;
  if (stdout)
    try {
      data = JSON.parse(stdout);
    } catch {
      return;
    }
  t.cache = {
    data,
    cachedAt: Date.now(),
  };
}
export {
  getMacOsKeychainStorageServiceName,
  getUsername,
  clearKeychainCache,
  keychainProjectDirs,
  KEYCHAIN_CACHE_TTL_MS,
  getProjectDirsUpToHome,
  markKeychainCacheStale,
  getKeychainCacheState,
};
