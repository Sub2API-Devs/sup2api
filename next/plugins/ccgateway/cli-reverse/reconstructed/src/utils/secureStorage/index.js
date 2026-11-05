/**
 * utils/secureStorage/index.ts
 *
 * getSecureStorage：返回平台安全存储，linux 构建恒为明文存储。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/secureStorage/index.ts
 * pieces: chunk-5me9t3vk.js (11)
 * attribution: placement 4, facade-majority 5, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join } from "path";
import { homedir } from "os";
import { readFileSync } from "fs";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
import { fileSuffixForOauthConfig } from "../../constants/oauth.js";
import { getErrnoCode } from "../errors.js";
import { plainTextStore } from "./plainTextStorage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5me9t3vk.js:5570-5942 placement
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
//@ chunk-5me9t3vk.js:5942-5966 placement
var credmanFlagSlot; // deferred: uses CredmanFlagResolver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5me9t3vk.js:5942", () => {
  credmanFlagSlot = new HostScoped(() => new CredmanFlagResolver());
});
//@ chunk-5me9t3vk.js:5966-6002 placement
function credmanFlagResolver() {
  return credmanFlagSlot.of(getRootSession().host);
}
//@ chunk-5me9t3vk.js:6002-6129 placement
function getConfigPaths() {
  return {
    legacyPath: join(getClaudeConfigDir(), ".config.json"),
    configPath: join(process.env.CLAUDE_CONFIG_DIR || homedir(), `.claude${fileSuffixForOauthConfig()}.json`),
  };
}
//@ chunk-5me9t3vk.js:6129-6233 facade-majority
/**
 * Windows 凭据管理器后端是否启用：CLAUDE_CODE_FORCE_WINDOWS_CREDMAN=1 强制开启，否则读缓存的 GrowthBook 开关。
 */
function isWindowsCredManBackendEnabled() {
  if (process.env.CLAUDE_CODE_FORCE_WINDOWS_CREDMAN === "1") return true;
  return credmanFlagResolver().resolve(getConfigPaths, readCredmanFlag);
}
//@ chunk-5me9t3vk.js:6233-6485 layout
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
//@ chunk-5me9t3vk.js:6485-6516 facade-majority
function primeWindowsCredManBackendEnabled(enabled) {
  credmanFlagResolver().prime(enabled, getConfigPaths);
}
//@ chunk-5me9t3vk.js:6516-6522 layout
var plainTextAvailability;
//@ chunk-5me9t3vk.js:6522-6550 facade-majority
function primarySecureStoreKind() {
  return "file";
}
//@ chunk-5me9t3vk.js:6550-6587 facade-majority (2.1.88 match: getSecureStorage, 0)
/**
 * 返回安全存储实现；本构建（linux）中平台存储变量为空，恒为 plainTextStorage。
 */
function getSecureStorage() {
  if (plainTextAvailability) return plainTextAvailability;
  return plainTextStore;
}
//@ chunk-5me9t3vk.js:6587-6625 facade-majority
function getUnselectedGuardedStorages() {
  if (plainTextAvailability) return [];
  return [];
}
export {
  getSecureStorage,
  primarySecureStoreKind,
  isWindowsCredManBackendEnabled,
  primeWindowsCredManBackendEnabled,
  getUnselectedGuardedStorages,
};
