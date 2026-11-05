/**
 * tools/BashTool/modeValidation.ts
 *
 * acceptEdits 模式下自动允许 mkdir/touch/rm/rmdir/mv/cp/sed；混入 DesignSync 前置条件代码
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/modeValidation.ts
 * pieces: chunk-5xgkngpb.js (4)
 * attribution: fingerprint 3, file-local 1
 */
import { stripSafeWrappers } from "./bashPermissions.js";
import { splitCommand } from "../../utils/bash/commands.js";

//@ chunk-5xgkngpb.js:1158542-1158597 fingerprint (2.1.88 match: ACCEPT_EDITS_ALLOWED_COMMANDS, 1)
var ACCEPT_EDITS_ALLOWED_COMMANDS = ["mkdir", "touch", "rm", "rmdir", "mv", "cp", "sed"];
//@ chunk-5xgkngpb.js:1158597-1158636 file-local
function isFilesystemCommand(command) {
  return ACCEPT_EDITS_ALLOWED_COMMANDS.includes(command);
}
//@ chunk-5xgkngpb.js:1158636-1159083 fingerprint (2.1.88 match: validateCommandForMode, 0.927)
/**
 * acceptEdits 模式下，mkdir/touch/rm/rmdir/mv/cp/sed 这类文件系统命令自动允许（touch 的参数需是简单路径）。
 */
function validateCommandForMode(cmd, toolPermissionContext) {
  let strippedCommand = stripSafeWrappers(cmd);
  let [baseCmd] = strippedCommand.split(/\s+/);
  if (!baseCmd)
    return {
      behavior: "passthrough",
      message: "Base command not found",
    };
  let hasTouchArguments =
    baseCmd === "touch" &&
    (strippedCommand !== cmd.trim() ||
      !strippedCommand
        .split(/\s+/)
        .slice(1)
        .every((arg) => /^['"]?[\w./~]/.test(arg)));
  if (toolPermissionContext.mode === "acceptEdits" && isFilesystemCommand(baseCmd) && !hasTouchArguments)
    return {
      behavior: "allow",
      updatedInput: {
        command: cmd,
      },
      decisionReason: {
        type: "mode",
        mode: "acceptEdits",
      },
    };
  return {
    behavior: "passthrough",
    message: `No mode-specific handling for '${baseCmd}' in ${toolPermissionContext.mode} mode`,
  };
}
//@ chunk-5xgkngpb.js:1159083-1159717 fingerprint (2.1.88 match: checkPermissionMode, 0.913)
/**
 * 按权限模式校验：bypass/dontAsk 交给主流程；所有子命令都被 acceptEdits 允许时整体 allow，否则 passthrough。
 */
function checkPermissionMode(input, toolPermissionContext) {
  if (toolPermissionContext.mode === "bypassPermissions")
    return {
      behavior: "passthrough",
      message: "Bypass mode is handled in main permission flow",
    };
  if (toolPermissionContext.mode === "dontAsk")
    return {
      behavior: "passthrough",
      message: "DontAsk mode is handled in main permission flow",
    };
  let commands = splitCommand(input.command);
  let allHandled = false;
  for (let cmd of commands) {
    let result = validateCommandForMode(cmd, toolPermissionContext);
    if (result.behavior === "ask" || result.behavior === "deny") return result;
    if (result.behavior === "passthrough")
      return {
        behavior: "passthrough",
        message: "No mode-specific validation required",
      };
    allHandled = true;
  }
  if (allHandled)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "mode",
        mode: toolPermissionContext.mode,
      },
    };
  return {
    behavior: "passthrough",
    message: "No mode-specific validation required",
  };
}
export { checkPermissionMode };
