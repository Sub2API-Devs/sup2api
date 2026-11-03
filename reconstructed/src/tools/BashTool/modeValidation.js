/**
 * tools/BashTool/modeValidation.ts
 *
 * acceptEdits 模式下自动允许 mkdir/touch/rm/rmdir/mv/cp/sed；混入 DesignSync 前置条件代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/modeValidation.ts
 * pieces: chunk-e6aww6q8.js (4)
 * attribution: fingerprint 3, file-local 1
 */
import { stripSafeWrappers } from "./bashPermissions.js";
import { splitCommand } from "../../utils/bash/commands.js";

//@ chunk-e6aww6q8.js:1163179-1163234 fingerprint = ACCEPT_EDITS_ALLOWED_COMMANDS (1)
var ACCEPT_EDITS_ALLOWED_COMMANDS = ["mkdir", "touch", "rm", "rmdir", "mv", "cp", "sed"];
//@ chunk-e6aww6q8.js:1163234-1163273 file-local
function isFilesystemCommand(command) {
  return ACCEPT_EDITS_ALLOWED_COMMANDS.includes(command);
}
/**
 * acceptEdits 模式下，mkdir/touch/rm/rmdir/mv/cp/sed 这类文件系统命令自动允许（touch 的参数需是简单路径）。
 */
//@ chunk-e6aww6q8.js:1163273-1163720 fingerprint = validateCommandForMode (0.931)
function validateCommandForMode(cmd, toolPermissionContext) {
  let r = stripSafeWrappers(cmd),
    [s] = r.split(/\s+/);
  if (!s) return { behavior: "passthrough", message: "Base command not found" };
  let h =
    s === "touch" &&
    (r !== cmd.trim() ||
      !r
        .split(/\s+/)
        .slice(1)
        .every((y) => /^['"]?[\w./~]/.test(y)));
  if (toolPermissionContext.mode === "acceptEdits" && isFilesystemCommand(s) && !h)
    return {
      behavior: "allow",
      updatedInput: { command: cmd },
      decisionReason: { type: "mode", mode: "acceptEdits" },
    };
  return {
    behavior: "passthrough",
    message: `No mode-specific handling for '${s}' in ${toolPermissionContext.mode} mode`,
  };
}
/**
 * 按权限模式校验：bypass/dontAsk 交给主流程；所有子命令都被 acceptEdits 允许时整体 allow，否则 passthrough。
 */
//@ chunk-e6aww6q8.js:1163720-1164354 fingerprint = checkPermissionMode (0.89)
function checkPermissionMode(input, toolPermissionContext) {
  if (toolPermissionContext.mode === "bypassPermissions")
    return { behavior: "passthrough", message: "Bypass mode is handled in main permission flow" };
  if (toolPermissionContext.mode === "dontAsk")
    return { behavior: "passthrough", message: "DontAsk mode is handled in main permission flow" };
  let commands = splitCommand(input.command),
    s = !1;
  for (let cmd of commands) {
    let result = validateCommandForMode(cmd, toolPermissionContext);
    if (result.behavior === "ask" || result.behavior === "deny") return result;
    if (result.behavior === "passthrough")
      return { behavior: "passthrough", message: "No mode-specific validation required" };
    s = !0;
  }
  if (s)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: { type: "mode", mode: toolPermissionContext.mode },
    };
  return { behavior: "passthrough", message: "No mode-specific validation required" };
}

export { checkPermissionMode };
