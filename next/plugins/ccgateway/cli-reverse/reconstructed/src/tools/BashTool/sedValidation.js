/**
 * tools/BashTool/sedValidation.ts
 *
 * sed 白名单：只打印（-n Np）或简单替换才放行，检测 w/e/r 等危险表达式，checkSedConstraints
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/sedValidation.ts
 * pieces: chunk-e6aww6q8.js (17)
 * attribution: file-local 3, fingerprint 6, placement 8
 */
import {
  getCommandArgv,
  commandArgvIsRuntimeDetermined,
  splitCommand,
  SPLIT_MAX_LEN,
  hasParserLexingDifferential,
  parseHasErrorNode,
  commandRedirectsAreRuntimeDetermined,
} from "../../utils/bash/commands.js";
import { containsAnyPlaceholder } from "../../utils/bash/ast.js";
import { getSedInPlaceExpression } from "./sedEditParser.js";
import { outsideReadsSedScriptAsk } from "../../types/permissions.js";
import { stripSafeWrappers } from "./bashPermissions.js";
import { getParserModule } from "../../utils/bash/bashParser.js";
import { findCommandNode } from "../../utils/bash/parser.js";

//@ chunk-e6aww6q8.js:1056387-1056585 file-local
/**
 * 检查选项（含合并的短选项）是否都在允许列表中。
 */
function validateFlagsAgainstAllowlist(flags, allowedFlags) {
  for (let flag of flags)
    if (flag.startsWith("-") && !flag.startsWith("--") && flag.length > 2)
      for (let i = 1; i < flag.length; i++) {
        let singleFlag = "-" + flag[i];
        if (!allowedFlags.includes(singleFlag)) return false;
      }
    else if (!allowedFlags.includes(flag)) return false;
  return true;
}
//@ chunk-e6aww6q8.js:1056585-1057089 fingerprint (2.1.88 match: isLinePrintingCommand, 0.892)
/**
 * sed -n 只打印行（表达式全是 Np / N,Mp / p）且选项在白名单内时为 true。
 */
function isLinePrintingCommand(command, expressions) {
  let sedMatch = getCommandArgv(command);
  if (sedMatch[0] !== "sed") return false;
  let flags = sedMatch.slice(1).filter((flag) => flag.startsWith("-") && flag !== "--");
  if (
    !validateFlagsAgainstAllowlist(flags, [
      "-n",
      "--quiet",
      "--silent",
      "-E",
      "--regexp-extended",
      "-r",
      "-z",
      "--zero-terminated",
      "--posix",
    ])
  )
    return false;
  let hasNFlag = false;
  for (let flag of flags) {
    if (flag === "-n" || flag === "--quiet" || flag === "--silent") {
      hasNFlag = true;
      break;
    }
    if (flag.startsWith("-") && !flag.startsWith("--") && flag.includes("n")) {
      hasNFlag = true;
      break;
    }
  }
  if (!hasNFlag) return false;
  if (expressions.length === 0) return false;
  for (let expr of expressions) {
    let commands = expr.split(";");
    for (let cmd of commands) if (!isPrintCommand(cmd.trim())) return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:1057089-1057156 file-local
function isPrintCommand(cmd) {
  if (!cmd) return false;
  return /^(?:\d+|\d+,\d+)?p$/.test(cmd);
}
//@ chunk-e6aww6q8.js:1057156-1057746 fingerprint (2.1.88 match: isSubstitutionCommand, 0.862)
/**
 * 简单替换 s/a/b/flags：一个表达式、恰好三个分隔符、标志只含 gpimIM 与数字；allowFileWrites 时允许 -i。
 */
function isSubstitutionCommand(command, expressions, hasFileArguments, options) {
  let allowFileWrites = options?.allowFileWrites ?? false;
  if (!allowFileWrites && hasFileArguments) return false;
  let sedMatch = getCommandArgv(command);
  if (sedMatch[0] !== "sed") return false;
  let flags = sedMatch.slice(1).filter((arg) => arg.startsWith("-") && arg !== "--");
  let allowedFlags = ["-E", "--regexp-extended", "-r", "--posix"];
  if (allowFileWrites) allowedFlags.push("-i", "--in-place");
  if (!validateFlagsAgainstAllowlist(flags, allowedFlags)) return false;
  if (expressions.length !== 1) return false;
  let expr = expressions[0].trim();
  if (!expr.startsWith("s")) return false;
  let substitutionMatch = expr.match(/^s\/(.*?)$/);
  if (!substitutionMatch) return false;
  let rest = substitutionMatch[1];
  let delimiterCount = 0;
  let lastDelimiterPos = -1;
  let i = 0;
  while (i < rest.length) {
    if (rest[i] === "\\") {
      i += 2;
      continue;
    }
    if (rest[i] === "/") {
      delimiterCount++;
      lastDelimiterPos = i;
    }
    i++;
  }
  if (delimiterCount !== 2) return false;
  let exprFlags = rest.slice(lastDelimiterPos + 1);
  if (!/^[gpimIM]*[1-9]?[gpimIM]*$/.test(exprFlags)) return false;
  return true;
}
//@ chunk-e6aww6q8.js:1057746-1058669 fingerprint (2.1.88 match: sedCommandIsAllowedByAllowlist, 0.753)
/**
 * sed 命令是否在白名单内：只读打印或简单替换，表达式无危险操作；对 sed -i 的表达式再做一组更严格的形状检查（禁 w/e/r 命令、地址、;、[、\、..）。readOnlyValidation 与 pathValidation 也用它。
 */
function sedCommandIsAllowedByAllowlist(command, options) {
  let allowFileWrites = options?.allowFileWrites ?? false;
  if (commandArgvIsRuntimeDetermined(command) || containsAnyPlaceholder(command)) return false;
  let expressions;
  try {
    expressions = extractSedExpressions(command);
  } catch (_error) {
    return false;
  }
  let hasFileArguments = hasFileArgs(command);
  let isPattern1 = false;
  let isPattern2 = false;
  if (allowFileWrites) {
    isPattern1 = isLinePrintingCommand(command, expressions);
    isPattern2 = isSubstitutionCommand(command, expressions, hasFileArguments, {
      allowFileWrites: true,
    });
  } else {
    isPattern1 = isLinePrintingCommand(command, expressions);
    isPattern2 = isSubstitutionCommand(command, expressions, hasFileArguments);
  }
  if (!isPattern1 && !isPattern2) return false;
  for (let expr of expressions) if (isPattern2 && expr.includes(";")) return false;
  for (let expr of expressions) if (containsDangerousOperations(expr)) return false;
  let expression = getSedInPlaceExpression(command);
  if (expression !== null) {
    if (expression === MULTIPLE_INPLACE_MARKER) return false;
    if (containsDangerousOperations(expression)) return false;
    let expressionText = expression.trimStart();
    if (/^[sy][^a-zA-Z0-9]/.test(expressionText)) return false;
    if (/^[\\$:={]/.test(expressionText)) return false;
    if (/^\d+[ \t]*[,!~=aAcCdDegGhHiIlnNpPqQrRsStTwWxyz]/.test(expressionText)) return false;
    if (/^[aAcCdDgGhHiIlnNpPqQtTwWxz=]([\s\\;]|$)/.test(expressionText)) return false;
    if (/^[rR]([\s\\;/]|\.{1,2}\/|$)/.test(expressionText)) return false;
    if (
      /^\/(?:[^/\\]|\\.)*\/[IMim]*[ \t]*([aAcCdDgGhHiIlnNpPqQtTwWxz=]([\s\\;]|$)|[rR]([\s\\;/]|\.{1,2}\/|$)|[sy][^a-zA-Z0-9]|[,!~])/.test(
        expressionText,
      )
    )
      return false;
    let replaced = expressionText.replace(/^(\.{1,2}\/)+/, "");
    if (
      expressionText.includes(";") ||
      expressionText.includes("[") ||
      expressionText.includes("\\") ||
      replaced.includes("..")
    )
      return false;
  }
  return true;
}
//@ chunk-e6aww6q8.js:1058669-1059013 fingerprint (2.1.88 match: hasFileArgs, 0.709)
/**
 * sed 是否带有文件参数（有 -e 时任何位置参数、无 -e 时第二个位置参数）。
 */
function hasFileArgs(command) {
  let sedMatch = getCommandArgv(command);
  if (sedMatch[0] !== "sed") return false;
  let withoutSed = sedMatch.slice(1);
  let operandCount = 0;
  let hasEFlag = false;
  for (let i = 0; i < withoutSed.length; i++) {
    let arg = withoutSed[i];
    if ((arg === "-e" || arg === "--expression") && i + 1 < withoutSed.length) {
      hasEFlag = true;
      i++;
      continue;
    }
    if (arg.startsWith("--expression=")) {
      hasEFlag = true;
      continue;
    }
    if (arg.startsWith("-e=")) {
      hasEFlag = true;
      continue;
    }
    if (arg.startsWith("-")) continue;
    operandCount++;
    if (hasEFlag) return true;
    if (operandCount > 1) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1059013-1059048 placement
/**
 * 提取 sed 表达式时表示“出现多个 -i 标志”的占位文本，遇到即判为危险。
 */
var MULTIPLE_INPLACE_MARKER = "__SED_MULTIPLE_I_FLAGS__";
//@ chunk-e6aww6q8.js:1059563-1060300 fingerprint (2.1.88 match: extractSedExpressions, 0.841)
/**
 * 提取 sed 的表达式列表；遇到 -ew/-we 等危险组合抛错。
 */
function extractSedExpressions(command) {
  let expressions = [];
  let sedMatch = getCommandArgv(command);
  if (sedMatch[0] !== "sed") return expressions;
  let withoutSed = sedMatch.slice(1);
  if (withoutSed.some((arg) => /^-e[wWe]/.test(arg) || /^-w[eE]/.test(arg)))
    throw Error("Dangerous flag combination detected");
  if (withoutSed.length === 0) throw Error("No sed arguments");
  try {
    let foundEFlag = false;
    let foundExpression = false;
    for (let i = 0; i < withoutSed.length; i++) {
      let arg = withoutSed[i];
      if (typeof arg !== "string") continue;
      if ((arg === "-e" || arg === "--expression") && i + 1 < withoutSed.length) {
        foundEFlag = true;
        let nextArg = withoutSed[i + 1];
        if (typeof nextArg === "string") {
          expressions.push(nextArg);
          i++;
        }
        continue;
      }
      if (arg.startsWith("--expression=")) {
        foundEFlag = true;
        expressions.push(arg.slice(13));
        continue;
      }
      if (arg.startsWith("-e=")) {
        foundEFlag = true;
        expressions.push(arg.slice(3));
        continue;
      }
      if (arg.startsWith("-")) continue;
      if (!foundEFlag && !foundExpression) {
        expressions.push(arg);
        foundExpression = true;
        continue;
      }
      break;
    }
  } catch (error) {
    throw Error(`Failed to parse sed command: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
  return expressions;
}
//@ chunk-e6aww6q8.js:1060300-1061634 file-local
/**
 * sed 表达式是否包含危险操作：非 ASCII、花括号、换行、注释、! 取反、~ 步进、w/W 写文件、e 执行、s 的 w/e 标志、y 带 wWeE 等。
 */
function containsDangerousOperations(expression) {
  let cmd = expression.trim();
  if (!cmd) return false;
  if (/[^\x01-\x7F]/.test(cmd)) return true;
  if (cmd.includes("{") || cmd.includes("}")) return true;
  if (
    cmd.includes(`
`) ||
    cmd.includes("\r")
  )
    return true;
  let hashIndex = cmd.indexOf("#");
  if (hashIndex !== -1 && !(hashIndex > 0 && cmd[hashIndex - 1] === "s")) return true;
  if (/^!/.test(cmd) || /[/\d$]!/.test(cmd)) return true;
  if (/\d\s*~\s*\d|,\s*~\s*\d|\$\s*~\s*\d/.test(cmd)) return true;
  if (/^,/.test(cmd)) return true;
  if (/,\s*[+-]/.test(cmd)) return true;
  if (/s\\/.test(cmd) || /\\[|#%@]/.test(cmd)) return true;
  if (/\\\/.*[wW]/.test(cmd)) return true;
  if (/\/[^/]*\s+[wWeE]/.test(cmd)) return true;
  if (/^s\//.test(cmd) && !/^s\/[^/]*\/[^/]*\/[^/]*$/.test(cmd)) return true;
  if (/^s./.test(cmd) && /[wWeE]$/.test(cmd)) {
    if (!/^s([^\\\n]).*?\1.*?\1[^wWeE]*$/.test(cmd)) return true;
  }
  if (
    /^[wW]\s*\S+/.test(cmd) ||
    /^\d+\s*[wW]\s*\S+/.test(cmd) ||
    /^\$\s*[wW]\s*\S+/.test(cmd) ||
    /^\/[^/]*\/[IMim]*\s*[wW]\s*\S+/.test(cmd) ||
    /^\d+,\d+\s*[wW]\s*\S+/.test(cmd) ||
    /^\d+,\$\s*[wW]\s*\S+/.test(cmd) ||
    /^\/[^/]*\/[IMim]*,\/[^/]*\/[IMim]*\s*[wW]\s*\S+/.test(cmd)
  )
    return true;
  if (
    /^e/.test(cmd) ||
    /^\d+\s*e/.test(cmd) ||
    /^\$\s*e/.test(cmd) ||
    /^\/[^/]*\/[IMim]*\s*e/.test(cmd) ||
    /^\d+,\d+\s*e/.test(cmd) ||
    /^\d+,\$\s*e/.test(cmd) ||
    /^\/[^/]*\/[IMim]*,\/[^/]*\/[IMim]*\s*e/.test(cmd)
  )
    return true;
  let substitutionMatch = cmd.match(/s([^\\\n]).*?\1.*?\1(.*?)$/);
  if (substitutionMatch) {
    let flags = substitutionMatch[2] || "";
    if (flags.includes("w") || flags.includes("W")) return true;
    if (flags.includes("e") || flags.includes("E")) return true;
  }
  if (cmd.match(/y([^\\\n])/)) {
    if (/[wWeE]/.test(cmd)) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1061634-1062305 fingerprint (2.1.88 match: checkSedConstraints, 0.806)
/**
 * 逐个子命令检查 sed：先做路径约束（ask 时返回）；不在白名单的 sed 要求确认（bashMissKind=sed-dangerous）；开启读封锁时改为拒绝。acceptEdits 模式允许 sed -i。
 */
function checkSedConstraints(input, toolPermissionContext) {
  let commands = splitCommand(input.command);
  let firstAsk;
  for (let cmd of commands) {
    let trimmed = extractSedCommand(cmd);
    if (trimmed === null) continue;
    let allowFileWrites = toolPermissionContext.mode === "acceptEdits";
    firstAsk ??= checkSedCommand(input, toolPermissionContext);
    if (firstAsk.behavior === "ask") {
      if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true)
        return outsideReadsSedScriptAsk();
      return firstAsk;
    }
    if (
      !sedCommandIsAllowedByAllowlist(trimmed, {
        allowFileWrites,
      })
    ) {
      if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true)
        return outsideReadsSedScriptAsk();
      return {
        behavior: "ask",
        message: "sed command requires approval (contains potentially dangerous operations)",
        decisionReason: {
          type: "other",
          reason:
            "sed command contains operations that require explicit approval (e.g., write commands, execute commands)",
          bashMissKind: "sed-dangerous",
        },
      };
    }
  }
  return {
    behavior: "passthrough",
    message: "No dangerous sed operations detected",
  };
}
//@ chunk-e6aww6q8.js:1062305-1062342 placement
/**
 * 判断命令里是否含 sed 调用。
 */
function isSedCommand(segment) {
  return extractSedCommand(segment) !== null;
}
//@ chunk-e6aww6q8.js:1062342-1062483 placement
function extractSedCommand(segment) {
  let text = segment.trim();
  if (!text) return null;
  let sedFromParse = extractSedFromParse(text);
  if (sedFromParse !== null) return sedFromParse;
  if (stripSafeWrappers(text).split(/\s+/)[0] === "sed") return stripLeadingRedirectsAndWrappers(text);
  return null;
}
//@ chunk-e6aww6q8.js:1062483-1063028 placement
/**
 * 用 Bash 解析器确认命令只有一条 sed 语句，并从命令名处截取 sed 文本；解析失败或差异时回退字符串处理。
 */
function extractSedFromParse(text) {
  let asSedCommand = (text) => (text.split(/\s+/)[0] === "sed" ? text : null);
  if (text.length > SPLIT_MAX_LEN) return asSedCommand(stripLeadingRedirectsAndWrappers(text));
  if (hasParserLexingDifferential(text)) return asSedCommand(stripLeadingRedirectsAndWrappers(text));
  let astRoot = getParserModule().parse(text);
  if (!astRoot || parseHasErrorNode(astRoot)) return asSedCommand(stripLeadingRedirectsAndWrappers(text));
  let filtered = astRoot.children.filter((child) => child.type !== "comment");
  if (
    filtered.length !== 1 ||
    (filtered[0].type !== "command" &&
      !(
        filtered[0].type === "redirected_statement" &&
        filtered[0].children.some((child) => child.type === "command")
      ))
  )
    return asSedCommand(stripLeadingRedirectsAndWrappers(text));
  let commandNode = findCommandNode(astRoot, null);
  if (!commandNode) return null;
  let found = commandNode.children.find((child) => child.type === "command_name");
  if (!found) return null;
  let str = Buffer.from(text, "utf8").subarray(found.startIndex).toString("utf8");
  return asSedCommand(stripLeadingRedirectsAndWrappers(str));
}
//@ chunk-e6aww6q8.js:1063028-1063111 placement
/**
 * 反复剥掉命令文本开头的重定向词与安全包装，返回剩余命令（用于识别以重定向开头的命令）。
 */
function stripLeadingRedirectsAndWrappers(text) {
  let trimmed = text.trim();
  for (;;) {
    let stripped = stripLeadingRedirects(stripSafeWrappers(trimmed));
    if (stripped === trimmed) break;
    trimmed = stripped;
  }
  return trimmed;
}
//@ chunk-e6aww6q8.js:1063111-1063620 placement (2.1.88 match: walkHerestringRedirect, 0.827)
/**
 * 反复剥掉命令文本开头的重定向词（<<< word、>file、2>&1 等），返回剩余部分；用于识别以重定向开头的命令。
 */
function stripLeadingRedirects(command) {
  let rest = command;
  for (;;) {
    if (rest.startsWith("<<<") && rest[3] !== "<" && rest[3] !== "(") {
      let sliced = rest.slice(3);
      let hereStringRest = sliced.startsWith(" ") || sliced.startsWith("\t") ? sliced.trimStart() : sliced;
      if (!hereStringRest) return rest;
      let wordEnd = shellWordEnd(hereStringRest);
      if (wordEnd === null) return rest;
      rest = hereStringRest.slice(wordEnd).trimStart();
      continue;
    }
    let match = /^(?:\d*|&)(?:>>(?!\()|>\|(?!\()|>&(?!\()|<&(?!\()|<>(?!\()|>(?![>|&(])|<(?![<>&(]))/.exec(
      rest,
    );
    if (!match) return rest;
    let sliced = rest.slice(match[0].length);
    let targetRest = sliced.startsWith(" ") || sliced.startsWith("\t") ? sliced.trimStart() : sliced;
    if (!targetRest) return rest;
    let wordEnd = shellWordEnd(targetRest);
    if (wordEnd === null) return rest;
    rest = targetRest.slice(wordEnd).trimStart();
  }
}
//@ chunk-e6aww6q8.js:1063620-1063968 placement
function shellWordEnd(text) {
  let idx = 0;
  while (idx < text.length) {
    let char = text[idx];
    if (char === " " || char === "\t") break;
    if (char === "\\" && idx + 1 < text.length) {
      idx += 2;
      continue;
    }
    if (char === "'") {
      let index = text.indexOf("'", idx + 1);
      if (index === -1) return null;
      idx = index + 1;
      continue;
    }
    if (char === '"') {
      let scan = idx + 1;
      for (;;) {
        if (scan >= text.length) return null;
        if (text[scan] === "\\" && scan + 1 < text.length) {
          scan += 2;
          continue;
        }
        if (text[scan] === '"') break;
        scan++;
      }
      idx = scan + 1;
      continue;
    }
    idx++;
  }
  return idx;
}
//@ chunk-e6aww6q8.js:1063968-1064812 placement
/**
 * 检查 sed 命令：含危险操作或无法静态校验时需要批准。
 */
function checkSedCommand(input, toolPermissionContext, coveredSegments) {
  let isUncoveredSed = (segment) => isSedCommand(segment) && !(coveredSegments?.has(segment.trim()) ?? false);
  if (input.command.length > SPLIT_MAX_LEN || hasParserLexingDifferential(input.command))
    return {
      behavior: "ask",
      message: "sed command requires approval (contains potentially dangerous operations)",
      decisionReason: {
        type: "other",
        reason:
          "sed command could not be statically validated (command is over-length or contains characters bash and the analyzer tokenize differently)",
        bashMissKind: "sed-dangerous",
      },
    };
  if (commandRedirectsAreRuntimeDetermined(input.command, isUncoveredSed))
    return {
      behavior: "ask",
      message: "sed command requires approval (contains potentially dangerous operations)",
      decisionReason: {
        type: "other",
        reason:
          "sed command carries redirect-borne content that cannot be statically validated (swallowed arguments, unanalyzable heredoc, or expansion in a redirect target)",
        bashMissKind: "sed-dangerous",
      },
    };
  return {
    behavior: "passthrough",
    message: "No redirect-borne sed risk detected",
  };
}
export {
  checkSedConstraints,
  isSedCommand,
  checkSedCommand,
  MULTIPLE_INPLACE_MARKER,
  sedCommandIsAllowedByAllowlist,
};
