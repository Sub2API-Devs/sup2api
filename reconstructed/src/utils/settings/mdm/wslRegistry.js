/**
 * utils/settings/mdm/wslRegistry.ts
 *
 * 2.1.316 新增：在 WSL 中读取 Windows 注册表的托管设置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zw3bhs13.js (4)
 * attribution: placement 4
 */
import { ge } from "../../identity.js";
import { FDn } from "../../remoteCoworkSources.js";
import { importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { oDt } from "../../platform.js";

/**
 * WSL 读取 Windows 注册表与托管设置的常量：超时、输出上限、reg.exe 路径、键不存在消息、托管目录与云会话缓存。
 */
//@ chunk-zw3bhs13.js:442-658 placement
var REG_QUERY_TIMEOUT_MS = 5000,
  REG_QUERY_MAX_BUFFER = 2097152,
  WSL_REG_EXE_PATH = "/mnt/c/Windows/System32/reg.exe",
  REG_KEY_NOT_FOUND_TEXT = "unable to find the specified registry key or value",
  WSL_MANAGED_SETTINGS_DIR = "/mnt/c/Program Files/ClaudeCode",
  coworkCloudCache = ge({ isCoworkCloud: void 0 }, (e) => {
    e.isCoworkCloud = void 0;
  });
/**
 * 判断当前入口是否为云端协作会话（结果缓存）。
 */
//@ chunk-zw3bhs13.js:658-803 placement
function isCoworkCloudEntrypoint() {
  if (coworkCloudCache.isCoworkCloud === void 0) {
    let envClaudeCodeEntrypoint = process.env.CLAUDE_CODE_ENTRYPOINT;
    coworkCloudCache.isCoworkCloud = FDn.some((r) => r === envClaudeCodeEntrypoint);
  }
  return coworkCloudCache.isCoworkCloud;
}
//@ chunk-zw3bhs13.js:803-847 placement
function dxi() {
  ((coworkCloudCache.isCoworkCloud = void 0), isCoworkCloudEntrypoint());
}
/**
 * 判断是否运行在 WSL 中（环境变量或 /proc/version）。
 */
//@ chunk-zw3bhs13.js:847-1018 placement
function isWsl() {
  let e = isCoworkCloudEntrypoint();
  if (process.env.WSL_DISTRO_NAME && !e) return !0;
  try {
    let lower = importMetaRequire("fs").readFileSync("/proc/version", "utf8").toLowerCase();
    return oDt(lower);
  } catch {
    return !1;
  }
}

export {
  WSL_MANAGED_SETTINGS_DIR,
  WSL_REG_EXE_PATH,
  isWsl,
  isCoworkCloudEntrypoint,
  REG_QUERY_TIMEOUT_MS,
  REG_KEY_NOT_FOUND_TEXT,
  REG_QUERY_MAX_BUFFER,
  dxi,
};
