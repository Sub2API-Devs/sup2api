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

//@ chunk-b29hdd5e.js:5478-5850 sole-consumer
/**
 * Windows 凭据管理器开关的解析器：可预先传入已知值（配置路径一致时直接采用），否则调用读取函数并缓存，出错按 false 处理。
 */
class CredmanFlagResolver {
  memo;
  handedIn;
  prime(enabled, r) {
    if (this.memo !== undefined) return;
    this.handedIn = {
      enabled,
      ...r(),
    };
  }
  resolve(e, r) {
    if (this.memo !== undefined) return this.memo;
    try {
      let a = e();
      let handedIn = this.handedIn;
      if (
        handedIn !== undefined &&
        handedIn.legacyPath === a.legacyPath &&
        handedIn.configPath === a.configPath
      )
        this.memo = handedIn.enabled;
      else this.memo = r(a);
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
var credmanFlagSlot = new HostScoped(() => new CredmanFlagResolver());
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
  let a = "";
  try {
    a = readFileSync(legacyPath, "utf8");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR" && errnoCode !== "EISDIR" && errnoCode !== "ELOOP")
      throw error;
  }
  if (a === "") a = readFileSync(configPath, "utf8");
  return JSON.parse(a).cachedGrowthBookFeatures?.tengu_windows_credman === true;
}
//@ chunk-b29hdd5e.js:6393-6424 facade-majority
function primeWindowsCredManBackendEnabled(e) {
  credmanFlagResolver().prime(e, getConfigPaths);
}
//@ chunk-b29hdd5e.js:6424-6430 layout
var plainTextAvailability;
//@ chunk-b29hdd5e.js:6430-6458 facade-majority
function primarySecureStoreKind() {
  return "file";
}
//@ chunk-b29hdd5e.js:6458-6495 facade-majority = getSecureStorage (0)
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
