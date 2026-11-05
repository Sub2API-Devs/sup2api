/**
 * utils/settings/mdm/wslRegistry.ts
 *
 * 2.1.316 新增：在 WSL 中读取 Windows 注册表的托管设置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4cd7tk6d.js (4)
 * attribution: placement 4
 */
import { identity } from "../../identity.js";
import { REMOTE_COWORK_SOURCE_KINDS } from "../../remoteCoworkSources.js";
import { importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { looksLikeWslVersion } from "../../platform.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4cd7tk6d.js:442-658 placement
/**
 * WSL 读取 Windows 注册表与托管设置的常量：超时、输出上限、reg.exe 路径、键不存在消息、托管目录与云会话缓存。
 */
var REG_QUERY_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var REG_QUERY_MAX_BUFFER;
var WSL_REG_EXE_PATH;
var REG_KEY_NOT_FOUND_TEXT;
var WSL_MANAGED_SETTINGS_DIR;
var coworkCloudCache;
deferInit("chunk-4cd7tk6d.js:442", () => {
  REG_QUERY_TIMEOUT_MS = 5000;
  REG_QUERY_MAX_BUFFER = 2097152;
  WSL_REG_EXE_PATH = "/mnt/c/Windows/System32/reg.exe";
  REG_KEY_NOT_FOUND_TEXT = "unable to find the specified registry key or value";
  WSL_MANAGED_SETTINGS_DIR = "/mnt/c/Program Files/ClaudeCode";
  coworkCloudCache = identity(
    {
      isCoworkCloud: undefined,
    },
    (cache) => {
      cache.isCoworkCloud = undefined;
    },
  );
});
//@ chunk-4cd7tk6d.js:658-803 placement
/**
 * 判断当前入口是否为云端协作会话（结果缓存）。
 */
function isCoworkCloudEntrypoint() {
  if (coworkCloudCache.isCoworkCloud === undefined) {
    let envClaudeCodeEntrypoint = process.env.CLAUDE_CODE_ENTRYPOINT;
    coworkCloudCache.isCoworkCloud = REMOTE_COWORK_SOURCE_KINDS.some(
      (entrypoint) => entrypoint === envClaudeCodeEntrypoint,
    );
  }
  return coworkCloudCache.isCoworkCloud;
}
//@ chunk-4cd7tk6d.js:803-847 placement
/**
 * resetCoworkCloudCache：重置 cowork 云缓存。
 */
function resetCoworkCloudCache() {
  coworkCloudCache.isCoworkCloud = undefined;
  isCoworkCloudEntrypoint();
}
//@ chunk-4cd7tk6d.js:847-1018 placement
/**
 * 判断是否运行在 WSL 中（环境变量或 /proc/version）。
 */
function isWsl() {
  let isCoworkCloud = isCoworkCloudEntrypoint();
  if (process.env.WSL_DISTRO_NAME && !isCoworkCloud) return true;
  try {
    let kernelString = importMetaRequire("fs").readFileSync("/proc/version", "utf8").toLowerCase();
    return looksLikeWslVersion(kernelString);
  } catch {
    return false;
  }
}
export {
  WSL_MANAGED_SETTINGS_DIR,
  isWsl,
  isCoworkCloudEntrypoint,
  WSL_REG_EXE_PATH,
  REG_QUERY_TIMEOUT_MS,
  REG_KEY_NOT_FOUND_TEXT,
  REG_QUERY_MAX_BUFFER,
  resetCoworkCloudCache,
};
