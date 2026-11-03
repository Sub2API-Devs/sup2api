/**
 * utils/toolUseDisplay.ts
 *
 * 2.1.316 新增：工具调用显示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { wt } from "../remote/remoteMode.js";
import {
  isDeviceIdentityEnabledCached,
  isViolinWoodEnabledCached,
} from "../services/analytics/violinGates.js";
import { mcpInfoFromString } from "../services/mcp/mcpStringUtils.js";
import { QIt } from "../tasks/backgroundLaunchRules.js";
import { $r, HT, xH } from "../bridge/deviceRegistration.js";
import { getToolRemoteExecution } from "../Tool.js";

/**
 * 设备工具显示信息：开启设备身份时，解析合法的 MCP 服务器名与工具名。
 */
//@ chunk-e6aww6q8.js:584105-584274 placement
function deviceToolDisplayInfo(e) {
  if (!wt() || !isDeviceIdentityEnabledCached()) return;
  let n = mcpInfoFromString(e);
  return n?.toolName && QIt.test(n.serverName) && QIt.test(n.toolName)
    ? { serverName: n.serverName, toolName: n.toolName }
    : void 0;
}
//@ chunk-e6aww6q8.js:584274-584456 placement
function remoteMachineOfInput(e, n) {
  let r = typeof n === "object" && n !== null ? n[$r] : void 0;
  if (!getToolRemoteExecution(e).supported || typeof r !== "string") return;
  let trimmed = r.trim(),
    trimmed_2 = HT(trimmed).trim();
  return trimmed_2 === "" || xH(trimmed) || xH(trimmed_2) ? void 0 : trimmed_2;
}
//@ chunk-e6aww6q8.js:584456-584522 placement
function hwt(e, n) {
  let r = remoteMachineOfInput(e, n);
  return r !== void 0 && isViolinWoodEnabledCached() ? r : void 0;
}
//@ chunk-e6aww6q8.js:584522-584655 placement
var INJECTED_MACHINE_REFUSAL = `A hook or permission handler added "${$r}" to this call; only the model's own input can name a machine, so it was not run.`;
/**
 * 从 bash 命令首行的 # 注释提取标题（后面必须还有非注释行，且不含控制字符）。
 */
//@ chunk-e6aww6q8.js:584655-584869 placement
function bashCommentTitle(e) {
  let index = e.indexOf(`
`),
    trimmed = (index === -1 ? e : e.slice(0, index)).trim();
  if (!trimmed.startsWith("#") || trimmed.startsWith("#!")) return;
  if (index !== -1 && hasNonCommentLine(e.slice(index + 1))) return;
  let replaced = trimmed.replace(/^#+\s*/, "");
  if (!replaced || hasControlChars(replaced)) return;
  return replaced;
}
//@ chunk-e6aww6q8.js:584869-584994 placement
function hasNonCommentLine(e) {
  for (let n of e.split(`
`)) {
    let trimmed = n.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("#")) continue;
    return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:584994-585102 placement
function hasControlChars(e) {
  for (let n = 0; n < e.length; n++) {
    let code = e.charCodeAt(n);
    if (code < 32 || (code >= 127 && code <= 159)) return !0;
  }
  return !1;
}

export { deviceToolDisplayInfo, hwt, bashCommentTitle, INJECTED_MACHINE_REFUSAL };
