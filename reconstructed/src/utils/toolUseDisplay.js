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
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import {
  isDeviceIdentityEnabledCached,
  isViolinWoodEnabledCached,
} from "../services/analytics/violinGates.js";
import { mcpInfoFromString } from "../services/mcp/mcpStringUtils.js";
import { BACKGROUND_RULE_ID_REGEX } from "../tasks/backgroundLaunchRules.js";
import {
  HOST_TOOL_INPUT_FIELD,
  machineLabelForMessage,
  isReservedMachineNameExact,
} from "../bridge/deviceRegistration.js";
import { getToolRemoteExecution } from "../Tool.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:584105-584274 placement
/**
 * 设备工具显示信息：开启设备身份时，解析合法的 MCP 服务器名与工具名。
 */
function deviceToolDisplayInfo(toolName) {
  if (!isRemoteSessionAvailable() || !isDeviceIdentityEnabledCached()) return;
  let mcpInfo = mcpInfoFromString(toolName);
  return mcpInfo?.toolName &&
    BACKGROUND_RULE_ID_REGEX.test(mcpInfo.serverName) &&
    BACKGROUND_RULE_ID_REGEX.test(mcpInfo.toolName)
    ? {
        serverName: mcpInfo.serverName,
        toolName: mcpInfo.toolName,
      }
    : undefined;
}
//@ chunk-e6aww6q8.js:584274-584456 placement
function remoteMachineOfInput(toolName, input) {
  let machine = typeof input === "object" && input !== null ? input[HOST_TOOL_INPUT_FIELD] : undefined;
  if (!getToolRemoteExecution(toolName).supported || typeof machine !== "string") return;
  let trimmed = machine.trim();
  let trimmed_2 = machineLabelForMessage(trimmed).trim();
  return trimmed_2 === "" || isReservedMachineNameExact(trimmed) || isReservedMachineNameExact(trimmed_2)
    ? undefined
    : trimmed_2;
}
//@ chunk-e6aww6q8.js:584456-584522 placement
/**
 * 显示用的远端机器标识（开关打开时才返回）。
 */
function remoteMachineRefForDisplay(toolName, input) {
  let machine = remoteMachineOfInput(toolName, input);
  return machine !== undefined && isViolinWoodEnabledCached() ? machine : undefined;
}
//@ chunk-e6aww6q8.js:584522-584655 placement
var INJECTED_MACHINE_REFUSAL; // deferred: uses HOST_TOOL_INPUT_FIELD (../bridge/deviceRegistration.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:584522", () => {
  INJECTED_MACHINE_REFUSAL = `A hook or permission handler added "${HOST_TOOL_INPUT_FIELD}" to this call; only the model's own input can name a machine, so it was not run.`;
});
//@ chunk-e6aww6q8.js:584655-584869 placement
/**
 * 从 bash 命令首行的 # 注释提取标题（后面必须还有非注释行，且不含控制字符）。
 */
function bashCommentTitle(command) {
  let index = command.indexOf(`
`);
  let trimmed = (index === -1 ? command : command.slice(0, index)).trim();
  if (!trimmed.startsWith("#") || trimmed.startsWith("#!")) return;
  if (index !== -1 && hasNonCommentLine(command.slice(index + 1))) return;
  let text = trimmed.replace(/^#+\s*/, "");
  if (!text || hasControlChars(text)) return;
  return text;
}
//@ chunk-e6aww6q8.js:584869-584994 placement
function hasNonCommentLine(text) {
  for (let line of text.split(`
`)) {
    let trimmed = line.trim();
    if (trimmed === "") continue;
    if (trimmed.startsWith("#")) continue;
    return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:584994-585102 placement
function hasControlChars(text) {
  for (let idx = 0; idx < text.length; idx++) {
    let code = text.charCodeAt(idx);
    if (code < 32 || (code >= 127 && code <= 159)) return true;
  }
  return false;
}
export { deviceToolDisplayInfo, remoteMachineRefForDisplay, bashCommentTitle, INJECTED_MACHINE_REFUSAL };
