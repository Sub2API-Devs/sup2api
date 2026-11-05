/**
 * tools/PowerShellTool/modeValidation.ts
 *
 * PowerShell acceptEdits 模式：Set/Add/Clear-Content、Remove-Item 可自动允许，排除链接创建、cd+写组合与不可静态验证的参数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/modeValidation.ts
 * pieces: chunk-6zpsr8vx.js (6)
 * attribution: fingerprint 5, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import {
  unescapePsDoubleQuoted,
  stripPsParameterPrefix,
  skipLeadingWhitespaceAndComments,
} from "./powershellParsing.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6zpsr8vx.js:18396-18472 fingerprint (2.1.88 match: ACCEPT_EDITS_ALLOWED_CMDLETS, 1)
/**
 * acceptEdits 模式自动允许的 cmdlet：Set-Content、Add-Content、Remove-Item、Clear-Content。
 */
var ACCEPT_EDITS_ALLOWED_CMDLETS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6zpsr8vx.js:18396", () => {
  ACCEPT_EDITS_ALLOWED_CMDLETS = new Set(["set-content", "add-content", "remove-item", "clear-content"]);
});
//@ chunk-6zpsr8vx.js:18472-18516 file-local
function isAcceptEditsAllowedCmdlet(name) {
  let canonical = resolveToCanonical(name);
  return ACCEPT_EDITS_ALLOWED_CMDLETS.has(canonical);
}
//@ chunk-6zpsr8vx.js:18516-18571 fingerprint (2.1.88 match: LINK_ITEM_TYPES, 1)
var LINK_ITEM_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6zpsr8vx.js:18516", () => {
  LINK_ITEM_TYPES = new Set(["symboliclink", "junction", "hardlink"]);
});
//@ chunk-6zpsr8vx.js:18571-18668 fingerprint (2.1.88 match: isItemTypeParamAbbrev, 1)
function isItemTypeParamAbbrev(p) {
  return (p.length >= 3 && "-itemtype".startsWith(p)) || (p.length >= 3 && "-type".startsWith(p));
}
//@ chunk-6zpsr8vx.js:18668-19177 fingerprint (2.1.88 match: isSymlinkCreatingCommand, 1)
/**
 * New-Item 是否在创建符号链接/联接/硬链接（-ItemType/-Type 缩写、值含通配或变量也算）。
 */
function isSymlinkCreatingCommand(cmd) {
  if (resolveToCanonical(cmd.name) !== "new-item") return false;
  for (let i = 0; i < cmd.args.length; i++) {
    let raw = cmd.args[i] ?? "";
    if (raw.length === 0) continue;
    let lower = (
      PS_TOKENIZER_DASH_CHARS.has(raw[0]) || raw[0] === "/" ? "-" + raw.slice(1) : raw
    ).toLowerCase();
    let colonIdx = lower.indexOf(":", 1);
    let paramRaw = colonIdx > 0 ? lower.slice(0, colonIdx) : lower;
    let param = unescapePsDoubleQuoted(paramRaw.replace(/`[\r\n]+\s*/g, "")).toLowerCase();
    if (!isItemTypeParamAbbrev(param)) continue;
    let rawVal = colonIdx > 0 ? lower.slice(colonIdx + 1) : (cmd.args[i + 1]?.toLowerCase() ?? "");
    let lower_2 = stripPsParameterPrefix(
      skipLeadingWhitespaceAndComments(unescapePsDoubleQuoted(rawVal.replace(/`[\r\n]+\s*/g, ""))),
    ).toLowerCase();
    if (/[?*[\]($]/.test(lower_2)) return true;
    for (let linkType of LINK_ITEM_TYPES) if (lower_2.length > 0 && linkType.startsWith(lower_2)) return true;
  }
  return false;
}
//@ chunk-6zpsr8vx.js:19177-22934 fingerprint (2.1.88 match: checkPermissionMode, 0.943)
/**
 * PowerShell acceptEdits 模式检查：命令解析成功、无子表达式/脚本块/成员调用/splatting/赋值/停止解析/可展开字符串、不创建链接、无 cd+写组合，所有命令都是 acceptEdits 允许的 cmdlet 或安全输出命令且参数可静态验证时 allow，否则 passthrough。
 */
function checkPermissionMode(input, parsed, toolPermissionContext) {
  if (toolPermissionContext.mode === "bypassPermissions" || toolPermissionContext.mode === "dontAsk")
    return {
      behavior: "passthrough",
      message: "Mode is handled in main permission flow",
    };
  if (toolPermissionContext.mode !== "acceptEdits")
    return {
      behavior: "passthrough",
      message: "No mode-specific validation required",
    };
  if (!parsed.valid)
    return {
      behavior: "passthrough",
      message: "Cannot validate mode for unparsed command",
    };
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
    return {
      behavior: "passthrough",
      message: "No commands found to validate for acceptEdits mode",
    };
  let totalCommands = segments.reduce((sum, seg) => sum + seg.commands.length, 0);
  if (
    segments.some((segment) =>
      segment.commands.some(
        (command) => command.elementType === "CommandAst" && isSymlinkCreatingCommand(command),
      ),
    )
  )
    return {
      behavior: "passthrough",
      message:
        "Command creates a filesystem link (New-Item -ItemType SymbolicLink/Junction/HardLink) \u2014 cannot auto-allow because later path validation cannot follow just-created links",
    };
  if (totalCommands > 1) {
    let hasCdCommand = false;
    let hasAcceptEditsCmdlet = false;
    for (let seg of segments)
      for (let cmd of seg.commands) {
        if (cmd.elementType !== "CommandAst") continue;
        if (isCwdChangingCmdlet(cmd.name)) hasCdCommand = true;
        if (isAcceptEditsAllowedCmdlet(cmd.name)) hasAcceptEditsCmdlet = true;
      }
    if (hasCdCommand && hasAcceptEditsCmdlet)
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
        for (let i = 1; i < cmd.elementTypes.length; i++) {
          let t = cmd.elementTypes[i];
          if (t !== "StringConstant" && t !== "Parameter")
            return {
              behavior: "passthrough",
              message: `Command argument has unvalidatable type (${t}) \u2014 variable paths cannot be statically resolved`,
            };
          if (t === "Parameter") {
            let arg = cmd.args[i - 1] ?? "";
            let colonIdx = arg.indexOf(":");
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
  return {
    behavior: "allow",
    updatedInput: input,
    decisionReason: {
      type: "mode",
      mode: "acceptEdits",
    },
  };
}
export { isSymlinkCreatingCommand, checkPermissionMode };
