/**
 * utils/secureStorage/index.ts
 *
 * getSecureStorage：返回平台安全存储，linux 构建恒为明文存储。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/secureStorage/index.ts
 * pieces: chunk-b29hdd5e.js (10)
 * attribution: sole-consumer 3, affinity 1, facade-majority 4, layout 2
 */
import { join } from "path";
import { homedir } from "os";
import { readFileSync } from "fs";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getClaudeConfigDir } from "../envUtils.js";
import { fileSuffixForOauthConfig } from "../../constants/oauth.js";
import { getErrnoCode } from "../errors.js";
import { plainTextStorage } from "./plainTextStorage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b29hdd5e.js:5478-5850 sole-consumer
/**
 * Windows 凭据管理器开关的解析器：可预先传入已知值（配置路径一致时直接采用），否则调用读取函数并缓存，出错按 false 处理。
 */
class CredmanFlagResolver {
  memo;
  handedIn;
  prime(enabled, extra) {
    if (this.memo !== undefined) return;
    this.handedIn = {
      enabled,
      ...extra(),
    };
  }
  resolve(paths, resolveFn) {
    if (this.memo !== undefined) return this.memo;
    try {
      let resolvedPaths = paths();
      let handedIn = this.handedIn;
      if (
        handedIn !== undefined &&
        handedIn.legacyPath === resolvedPaths.legacyPath &&
        handedIn.configPath === resolvedPaths.configPath
      )
        this.memo = handedIn.enabled;
      else this.memo = resolveFn(resolvedPaths);
    } catch {
      this.memo = false;
    }
    return this.memo;
  }
  reset() {
    this.memo = undefined;
    this.handedIn = undefined;
  }
}
//@ chunk-b29hdd5e.js:5850-5874 sole-consumer
var credmanFlagSlot; // deferred: uses CredmanFlagResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b29hdd5e.js:5850", () => {
  credmanFlagSlot = new HostScoped(() => new CredmanFlagResolver());
});
//@ chunk-b29hdd5e.js:5874-5910 sole-consumer
function credmanFlagResolver() {
  return credmanFlagSlot.of(getRootSession().host);
}
//@ chunk-b29hdd5e.js:5910-6037 affinity
function getConfigPaths() {
  return {
    legacyPath: join(getClaudeConfigDir(), ".config.json"),
    configPath: join(process.env.CLAUDE_CONFIG_DIR || homedir(), `.claude${fileSuffixForOauthConfig()}.json`),
  };
}
//@ chunk-b29hdd5e.js:6037-6141 facade-majority
/**
 * Windows 凭据管理器后端是否启用：CLAUDE_CODE_FORCE_WINDOWS_CREDMAN=1 强制开启，否则读缓存的 GrowthBook 开关。
 */
function isWindowsCredManBackendEnabled() {
  if (process.env.CLAUDE_CODE_FORCE_WINDOWS_CREDMAN === "1") return true;
  return credmanFlagResolver().resolve(getConfigPaths, readCredmanFlag);
}
//@ chunk-b29hdd5e.js:6141-6393 layout
function readCredmanFlag({ legacyPath, configPath }) {
  let text = "";
  try {
    text = readFileSync(legacyPath, "utf8");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR" && errnoCode !== "EISDIR" && errnoCode !== "ELOOP")
      throw error;
  }
  if (text === "") text = readFileSync(configPath, "utf8");
  return JSON.parse(text).cachedGrowthBookFeatures?.tengu_windows_credman === true;
}
//@ chunk-b29hdd5e.js:6393-6424 facade-majority
function primeWindowsCredManBackendEnabled(enabled) {
  credmanFlagResolver().prime(enabled, getConfigPaths);
}
//@ chunk-b29hdd5e.js:6424-6430 layout
var plainTextAvailability;
//@ chunk-b29hdd5e.js:6430-6458 facade-majority
function primarySecureStoreKind() {
  return "file";
}
//@ chunk-b29hdd5e.js:6458-6495 facade-majority (2.1.88 match: getSecureStorage, 0)
/**
 * 返回安全存储实现；本构建（linux）中平台存储变量为空，恒为 plainTextStorage。
 */
function getSecureStorage() {
  if (plainTextAvailability) return plainTextAvailability;
  return plainTextStorage;
}
export {
  getSecureStorage,
  primarySecureStoreKind,
  primeWindowsCredManBackendEnabled,
  isWindowsCredManBackendEnabled,
};
