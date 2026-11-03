/**
 * tools/PowerShellTool/modeValidation.ts
 *
 * PowerShell acceptEdits 模式：Set/Add/Clear-Content、Remove-Item 可自动允许，排除链接创建、cd+写组合与不可静态验证的参数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/modeValidation.ts
 * pieces: chunk-v0yfsee9.js (6)
 * attribution: fingerprint 5, file-local 1
 */
import {
  resolveToCanonical,
  isCwdChangingCmdlet,
  hasVariableWritingParam,
  hasNonDefaultActionPreference,
  isSafeOutputCommand,
  isAllowlistedPipelineTail,
  argLeaksValue,
} from "./readOnlyValidation.js";
import {
  PS_TOKENIZER_DASH_CHARS,
  deriveSecurityFlags,
  getPipelineSegments,
} from "../../utils/powershell/parser.js";
import { gP, lW, skipLeadingWhitespaceAndComments } from "./powershellParsing.js";

/**
 * acceptEdits 模式自动允许的 cmdlet：Set-Content、Add-Content、Remove-Item、Clear-Content。
 */
//@ chunk-v0yfsee9.js:17169-17245 fingerprint = ACCEPT_EDITS_ALLOWED_CMDLETS (1)
var ACCEPT_EDITS_ALLOWED_CMDLETS = new Set(["set-content", "add-content", "remove-item", "clear-content"]);
//@ chunk-v0yfsee9.js:17245-17289 file-local
function isAcceptEditsAllowedCmdlet(name) {
  let canonical = resolveToCanonical(name);
  return ACCEPT_EDITS_ALLOWED_CMDLETS.has(canonical);
}
//@ chunk-v0yfsee9.js:17289-17344 fingerprint = LINK_ITEM_TYPES (1)
var LINK_ITEM_TYPES = new Set(["symboliclink", "junction", "hardlink"]);
//@ chunk-v0yfsee9.js:17344-17441 fingerprint = isItemTypeParamAbbrev (1)
function isItemTypeParamAbbrev(p) {
  return (p.length >= 3 && "-itemtype".startsWith(p)) || (p.length >= 3 && "-type".startsWith(p));
}
/**
 * New-Item 是否在创建符号链接/联接/硬链接（-ItemType/-Type 缩写、值含通配或变量也算）。
 */
//@ chunk-v0yfsee9.js:17441-17950 fingerprint = isSymlinkCreatingCommand (1)
function isSymlinkCreatingCommand(cmd) {
  if (resolveToCanonical(cmd.name) !== "new-item") return !1;
  for (let r = 0; r < cmd.args.length; r++) {
    let raw = cmd.args[r] ?? "";
    if (raw.length === 0) continue;
    let lower = (
        PS_TOKENIZER_DASH_CHARS.has(raw[0]) || raw[0] === "/" ? "-" + raw.slice(1) : raw
      ).toLowerCase(),
      colonIdx = lower.indexOf(":", 1),
      w = colonIdx > 0 ? lower.slice(0, colonIdx) : lower,
      lower_2 = gP(w.replace(/`[\r\n]+\s*/g, "")).toLowerCase();
    if (!isItemTypeParamAbbrev(lower_2)) continue;
    let O = colonIdx > 0 ? lower.slice(colonIdx + 1) : (cmd.args[r + 1]?.toLowerCase() ?? ""),
      lower_3 = lW(skipLeadingWhitespaceAndComments(gP(O.replace(/`[\r\n]+\s*/g, "")))).toLowerCase();
    if (/[?*[\]($]/.test(lower_3)) return !0;
    for (let v of LINK_ITEM_TYPES) if (lower_3.length > 0 && v.startsWith(lower_3)) return !0;
  }
  return !1;
}
/**
 * PowerShell acceptEdits 模式检查：命令解析成功、无子表达式/脚本块/成员调用/splatting/赋值/停止解析/可展开字符串、不创建链接、无 cd+写组合，所有命令都是 acceptEdits 允许的 cmdlet 或安全输出命令且参数可静态验证时 allow，否则 passthrough。
 */
//@ chunk-v0yfsee9.js:17950-21707 fingerprint = checkPermissionMode (0.943)
function checkPermissionMode(input, parsed, toolPermissionContext) {
  if (toolPermissionContext.mode === "bypassPermissions" || toolPermissionContext.mode === "dontAsk")
    return { behavior: "passthrough", message: "Mode is handled in main permission flow" };
  if (toolPermissionContext.mode !== "acceptEdits")
    return { behavior: "passthrough", message: "No mode-specific validation required" };
  if (!parsed.valid) return { behavior: "passthrough", message: "Cannot validate mode for unparsed command" };
  let securityFlags = deriveSecurityFlags(parsed);
  if (
    securityFlags.hasSubExpressions ||
    securityFlags.hasScriptBlocks ||
    securityFlags.hasMemberInvocations ||
    securityFlags.hasSplatting ||
    securityFlags.hasAssignments ||
    securityFlags.hasStopParsing ||
    securityFlags.hasExpandableStrings
  )
    return {
      behavior: "passthrough",
      message: "Command contains subexpressions, script blocks, or member invocations that require approval",
    };
  let segments = getPipelineSegments(parsed);
  if (segments.length === 0)
    return { behavior: "passthrough", message: "No commands found to validate for acceptEdits mode" };
  let totalCommands = segments.reduce((sum, seg) => sum + seg.commands.length, 0);
  if (
    segments.some((w) =>
      w.commands.some((command) => command.elementType === "CommandAst" && isSymlinkCreatingCommand(command)),
    )
  )
    return {
      behavior: "passthrough",
      message:
        "Command creates a filesystem link (New-Item -ItemType SymbolicLink/Junction/HardLink) \u2014 cannot auto-allow because later path validation cannot follow just-created links",
    };
  if (totalCommands > 1) {
    let w = !1,
      h = !1;
    for (let seg of segments)
      for (let cmd of seg.commands) {
        if (cmd.elementType !== "CommandAst") continue;
        if (isCwdChangingCmdlet(cmd.name)) w = !0;
        if (isAcceptEditsAllowedCmdlet(cmd.name)) h = !0;
      }
    if (w && h)
      return {
        behavior: "passthrough",
        message:
          "Compound command contains a directory-changing command (Set-Location/Push-Location/Pop-Location) with a write operation \u2014 cannot auto-allow because path validation uses stale cwd",
      };
  }
  for (let segment of segments) {
    for (let cmd of segment.commands) {
      if (cmd.elementType !== "CommandAst")
        return {
          behavior: "passthrough",
          message: `Pipeline contains expression source (${cmd.elementType}) that cannot be statically validated`,
        };
      if (cmd.nameType === "application")
        return {
          behavior: "passthrough",
          message: `Command '${cmd.name}' resolved from a path-like name and requires approval`,
        };
      if (cmd.elementTypes)
        for (let O = 1; O < cmd.elementTypes.length; O++) {
          let S = cmd.elementTypes[O];
          if (S !== "StringConstant" && S !== "Parameter")
            return {
              behavior: "passthrough",
              message: `Command argument has unvalidatable type (${S}) \u2014 variable paths cannot be statically resolved`,
            };
          if (S === "Parameter") {
            let arg = cmd.args[O - 1] ?? "",
              colonIdx = arg.indexOf(":");
            if (colonIdx > 0 && /[$(@{[]/.test(arg.slice(colonIdx + 1)))
              return {
                behavior: "passthrough",
                message: "Colon-bound parameter contains an expression that cannot be statically validated",
              };
          }
        }
      if (
        hasVariableWritingParam(cmd.args, cmd.elementTypes) ||
        hasNonDefaultActionPreference(cmd.args, cmd.elementTypes)
      )
        return {
          behavior: "passthrough",
          message: `Variable-writing or ActionPreference argument in '${cmd.name}' requires approval`,
        };
      if (isSafeOutputCommand(cmd.name) && cmd.args.length === 0) continue;
      if (isAllowlistedPipelineTail(cmd, input.command)) continue;
      if (!isAcceptEditsAllowedCmdlet(cmd.name))
        return {
          behavior: "passthrough",
          message: `No mode-specific handling for '${cmd.name}' in acceptEdits mode`,
        };
      if (argLeaksValue(cmd.name, cmd))
        return {
          behavior: "passthrough",
          message: `Arguments in '${cmd.name}' cannot be statically validated in acceptEdits mode`,
        };
    }
    if (segment.nestedCommands)
      for (let cmd of segment.nestedCommands) {
        if (cmd.elementType !== "CommandAst")
          return {
            behavior: "passthrough",
            message: `Nested expression element (${cmd.elementType}) cannot be statically validated`,
          };
        if (cmd.nameType === "application")
          return {
            behavior: "passthrough",
            message: `Nested command '${cmd.name}' resolved from a path-like name and requires approval`,
          };
        if (
          hasVariableWritingParam(cmd.args, cmd.elementTypes) ||
          hasNonDefaultActionPreference(cmd.args, cmd.elementTypes)
        )
          return {
            behavior: "passthrough",
            message: `Variable-writing or ActionPreference argument in nested '${cmd.name}' requires approval`,
          };
        if (isSafeOutputCommand(cmd.name) && cmd.args.length === 0) continue;
        if (isAllowlistedPipelineTail(cmd, input.command)) continue;
        if (!isAcceptEditsAllowedCmdlet(cmd.name))
          return {
            behavior: "passthrough",
            message: `No mode-specific handling for '${cmd.name}' in acceptEdits mode`,
          };
        if (argLeaksValue(cmd.name, cmd))
          return {
            behavior: "passthrough",
            message: `Arguments in nested '${cmd.name}' cannot be statically validated in acceptEdits mode`,
          };
      }
  }
  return { behavior: "allow", updatedInput: input, decisionReason: { type: "mode", mode: "acceptEdits" } };
}

export { isSymlinkCreatingCommand, checkPermissionMode };
