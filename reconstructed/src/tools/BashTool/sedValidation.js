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

/**
 * 检查选项（含合并的短选项）是否都在允许列表中。
 */
//@ chunk-e6aww6q8.js:1056387-1056585 file-local
function validateFlagsAgainstAllowlist(flags, allowedFlags) {
  for (let flag of flags)
    if (flag.startsWith("-") && !flag.startsWith("--") && flag.length > 2)
      for (let s = 1; s < flag.length; s++) {
        let singleFlag = "-" + flag[s];
        if (!allowedFlags.includes(singleFlag)) return !1;
      }
    else if (!allowedFlags.includes(flag)) return !1;
  return !0;
}
/**
 * sed -n 只打印行（表达式全是 Np / N,Mp / p）且选项在白名单内时为 true。
 */
//@ chunk-e6aww6q8.js:1056585-1057089 fingerprint = isLinePrintingCommand (0.892)
function isLinePrintingCommand(command, expressions) {
  let parseResult = getCommandArgv(command);
  if (parseResult[0] !== "sed") return !1;
  let filtered = parseResult.slice(1).filter((w) => w.startsWith("-") && w !== "--");
  if (
    !validateFlagsAgainstAllowlist(filtered, [
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
    return !1;
  let S = !1;
  for (let arg of filtered) {
    if (arg === "-n" || arg === "--quiet" || arg === "--silent") {
      S = !0;
      break;
    }
    if (arg.startsWith("-") && !arg.startsWith("--") && arg.includes("n")) {
      S = !0;
      break;
    }
  }
  if (!S) return !1;
  if (expressions.length === 0) return !1;
  for (let flag of expressions) {
    let commands = flag.split(";");
    for (let cmd of commands) if (!isPrintCommand(cmd.trim())) return !1;
  }
  return !0;
}
//@ chunk-e6aww6q8.js:1057089-1057156 file-local
function isPrintCommand(cmd) {
  if (!cmd) return !1;
  return /^(?:\d+|\d+,\d+)?p$/.test(cmd);
}
/**
 * 简单替换 s/a/b/flags：一个表达式、恰好三个分隔符、标志只含 gpimIM 与数字；allowFileWrites 时允许 -i。
 */
//@ chunk-e6aww6q8.js:1057156-1057746 fingerprint = isSubstitutionCommand (0.862)
function isSubstitutionCommand(command, expressions, hasFileArguments, options) {
  let allowFileWrites = options?.allowFileWrites ?? !1;
  if (!allowFileWrites && hasFileArguments) return !1;
  let parseResult = getCommandArgv(command);
  if (parseResult[0] !== "sed") return !1;
  let filtered = parseResult.slice(1).filter((Ie) => Ie.startsWith("-") && Ie !== "--"),
    allowedFlags = ["-E", "--regexp-extended", "-r", "--posix"];
  if (allowFileWrites) allowedFlags.push("-i", "--in-place");
  if (!validateFlagsAgainstAllowlist(filtered, allowedFlags)) return !1;
  if (expressions.length !== 1) return !1;
  let expr = expressions[0].trim();
  if (!expr.startsWith("s")) return !1;
  let substitutionMatch = expr.match(/^s\/(.*?)$/);
  if (!substitutionMatch) return !1;
  let rest = substitutionMatch[1],
    Se = 0,
    lastDelimiterPos = -1,
    we = 0;
  while (we < rest.length) {
    if (rest[we] === "\\") {
      we += 2;
      continue;
    }
    if (rest[we] === "/") (Se++, (lastDelimiterPos = we));
    we++;
  }
  if (Se !== 2) return !1;
  let exprFlags = rest.slice(lastDelimiterPos + 1);
  if (!/^[gpimIM]*[1-9]?[gpimIM]*$/.test(exprFlags)) return !1;
  return !0;
}
/**
 * sed 命令是否在白名单内：只读打印或简单替换，表达式无危险操作；对 sed -i 的表达式再做一组更严格的形状检查（禁 w/e/r 命令、地址、;、[、\、..）。readOnlyValidation 与 pathValidation 也用它。
 */
//@ chunk-e6aww6q8.js:1057746-1058669 fingerprint = sedCommandIsAllowedByAllowlist (0.753)
function sedCommandIsAllowedByAllowlist(command, options) {
  let allowFileWrites = options?.allowFileWrites ?? !1;
  if (commandArgvIsRuntimeDetermined(command) || containsAnyPlaceholder(command)) return !1;
  let expressions;
  try {
    expressions = extractSedExpressions(command);
  } catch (error) {
    return !1;
  }
  let hasFileArguments = hasFileArgs(command),
    y = !1,
    S = !1;
  if (allowFileWrites)
    ((y = isLinePrintingCommand(command, expressions)),
      (S = isSubstitutionCommand(command, expressions, hasFileArguments, { allowFileWrites: !0 })));
  else
    ((y = isLinePrintingCommand(command, expressions)),
      (S = isSubstitutionCommand(command, expressions, hasFileArguments)));
  if (!y && !S) return !1;
  for (let expr of expressions) if (S && expr.includes(";")) return !1;
  for (let expr of expressions) if (containsDangerousOperations(expr)) return !1;
  let w = getSedInPlaceExpression(command);
  if (w !== null) {
    if (w === HKt) return !1;
    if (containsDangerousOperations(w)) return !1;
    let trimStart = w.trimStart();
    if (/^[sy][^a-zA-Z0-9]/.test(trimStart)) return !1;
    if (/^[\\$:={]/.test(trimStart)) return !1;
    if (/^\d+[ \t]*[,!~=aAcCdDegGhHiIlnNpPqQrRsStTwWxyz]/.test(trimStart)) return !1;
    if (/^[aAcCdDgGhHiIlnNpPqQtTwWxz=]([\s\\;]|$)/.test(trimStart)) return !1;
    if (/^[rR]([\s\\;/]|\.{1,2}\/|$)/.test(trimStart)) return !1;
    if (
      /^\/(?:[^/\\]|\\.)*\/[IMim]*[ \t]*([aAcCdDgGhHiIlnNpPqQtTwWxz=]([\s\\;]|$)|[rR]([\s\\;/]|\.{1,2}\/|$)|[sy][^a-zA-Z0-9]|[,!~])/.test(
        trimStart,
      )
    )
      return !1;
    let replaced = trimStart.replace(/^(\.{1,2}\/)+/, "");
    if (
      trimStart.includes(";") ||
      trimStart.includes("[") ||
      trimStart.includes("\\") ||
      replaced.includes("..")
    )
      return !1;
  }
  return !0;
}
/**
 * sed 是否带有文件参数（有 -e 时任何位置参数、无 -e 时第二个位置参数）。
 */
//@ chunk-e6aww6q8.js:1058669-1059013 fingerprint = hasFileArgs (0.709)
function hasFileArgs(command) {
  let n = getCommandArgv(command);
  if (n[0] !== "sed") return !1;
  let withoutSed = n.slice(1),
    s = 0,
    h = !1;
  for (let y = 0; y < withoutSed.length; y++) {
    let arg = withoutSed[y];
    if ((arg === "-e" || arg === "--expression") && y + 1 < withoutSed.length) {
      ((h = !0), y++);
      continue;
    }
    if (arg.startsWith("--expression=")) {
      h = !0;
      continue;
    }
    if (arg.startsWith("-e=")) {
      h = !0;
      continue;
    }
    if (arg.startsWith("-")) continue;
    if ((s++, h)) return !0;
    if (s > 1) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1059013-1059048 placement
var HKt = "__SED_MULTIPLE_I_FLAGS__";
/**
 * 提取 sed 的表达式列表；遇到 -ew/-we 等危险组合抛错。
 */
//@ chunk-e6aww6q8.js:1059563-1060300 fingerprint = extractSedExpressions (0.841)
function extractSedExpressions(command) {
  let expressions = [],
    r = getCommandArgv(command);
  if (r[0] !== "sed") return expressions;
  let withoutSed = r.slice(1);
  if (withoutSed.some((h) => /^-e[wWe]/.test(h) || /^-w[eE]/.test(h)))
    throw Error("Dangerous flag combination detected");
  if (withoutSed.length === 0) throw Error("No sed arguments");
  try {
    let h = !1,
      y = !1;
    for (let S = 0; S < withoutSed.length; S++) {
      let w = withoutSed[S];
      if (typeof w !== "string") continue;
      if ((w === "-e" || w === "--expression") && S + 1 < withoutSed.length) {
        h = !0;
        let L = withoutSed[S + 1];
        if (typeof L === "string") (expressions.push(L), S++);
        continue;
      }
      if (w.startsWith("--expression=")) {
        ((h = !0), expressions.push(w.slice(13)));
        continue;
      }
      if (w.startsWith("-e=")) {
        ((h = !0), expressions.push(w.slice(3)));
        continue;
      }
      if (w.startsWith("-")) continue;
      if (!h && !y) {
        (expressions.push(w), (y = !0));
        continue;
      }
      break;
    }
  } catch (error) {
    throw Error(`Failed to parse sed command: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
  return expressions;
}
/**
 * sed 表达式是否包含危险操作：非 ASCII、花括号、换行、注释、! 取反、~ 步进、w/W 写文件、e 执行、s 的 w/e 标志、y 带 wWeE 等。
 */
//@ chunk-e6aww6q8.js:1060300-1061634 file-local
function containsDangerousOperations(expression) {
  let cmd = expression.trim();
  if (!cmd) return !1;
  if (/[^\x01-\x7F]/.test(cmd)) return !0;
  if (cmd.includes("{") || cmd.includes("}")) return !0;
  if (
    cmd.includes(`
`) ||
    cmd.includes("\r")
  )
    return !0;
  let hashIndex = cmd.indexOf("#");
  if (hashIndex !== -1 && !(hashIndex > 0 && cmd[hashIndex - 1] === "s")) return !0;
  if (/^!/.test(cmd) || /[/\d$]!/.test(cmd)) return !0;
  if (/\d\s*~\s*\d|,\s*~\s*\d|\$\s*~\s*\d/.test(cmd)) return !0;
  if (/^,/.test(cmd)) return !0;
  if (/,\s*[+-]/.test(cmd)) return !0;
  if (/s\\/.test(cmd) || /\\[|#%@]/.test(cmd)) return !0;
  if (/\\\/.*[wW]/.test(cmd)) return !0;
  if (/\/[^/]*\s+[wWeE]/.test(cmd)) return !0;
  if (/^s\//.test(cmd) && !/^s\/[^/]*\/[^/]*\/[^/]*$/.test(cmd)) return !0;
  if (/^s./.test(cmd) && /[wWeE]$/.test(cmd)) {
    if (!/^s([^\\\n]).*?\1.*?\1[^wWeE]*$/.test(cmd)) return !0;
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
    return !0;
  if (
    /^e/.test(cmd) ||
    /^\d+\s*e/.test(cmd) ||
    /^\$\s*e/.test(cmd) ||
    /^\/[^/]*\/[IMim]*\s*e/.test(cmd) ||
    /^\d+,\d+\s*e/.test(cmd) ||
    /^\d+,\$\s*e/.test(cmd) ||
    /^\/[^/]*\/[IMim]*,\/[^/]*\/[IMim]*\s*e/.test(cmd)
  )
    return !0;
  let substitutionMatch = cmd.match(/s([^\\\n]).*?\1.*?\1(.*?)$/);
  if (substitutionMatch) {
    let flags = substitutionMatch[2] || "";
    if (flags.includes("w") || flags.includes("W")) return !0;
    if (flags.includes("e") || flags.includes("E")) return !0;
  }
  if (cmd.match(/y([^\\\n])/)) {
    if (/[wWeE]/.test(cmd)) return !0;
  }
  return !1;
}
/**
 * 逐个子命令检查 sed：先做路径约束（ask 时返回）；不在白名单的 sed 要求确认（bashMissKind=sed-dangerous）；开启读封锁时改为拒绝。acceptEdits 模式允许 sed -i。
 */
//@ chunk-e6aww6q8.js:1061634-1062305 fingerprint = checkSedConstraints (0.806)
function checkSedConstraints(input, toolPermissionContext) {
  let commands = splitCommand(input.command),
    s;
  for (let cmd of commands) {
    let y = extractSedCommand(cmd);
    if (y === null) continue;
    let allowFileWrites = toolPermissionContext.mode === "acceptEdits";
    if (((s ??= checkSedCommand(input, toolPermissionContext)), s.behavior === "ask")) {
      if (toolPermissionContext.blockReadsOutsideWorkingDirectories === !0) return outsideReadsSedScriptAsk();
      return s;
    }
    if (!sedCommandIsAllowedByAllowlist(y, { allowFileWrites: allowFileWrites })) {
      if (toolPermissionContext.blockReadsOutsideWorkingDirectories === !0) return outsideReadsSedScriptAsk();
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
  return { behavior: "passthrough", message: "No dangerous sed operations detected" };
}
//@ chunk-e6aww6q8.js:1062305-1062342 placement
function dze(e) {
  return extractSedCommand(e) !== null;
}
//@ chunk-e6aww6q8.js:1062342-1062483 placement
function extractSedCommand(e) {
  let trimmed = e.trim();
  if (!trimmed) return null;
  let r = extractSedFromParse(trimmed);
  if (r !== null) return r;
  if (stripSafeWrappers(trimmed).split(/\s+/)[0] === "sed") return eq(trimmed);
  return null;
}
/**
 * 用 Bash 解析器确认命令只有一条 sed 语句，并从命令名处截取 sed 文本；解析失败或差异时回退字符串处理。
 */
//@ chunk-e6aww6q8.js:1062483-1063028 placement
function extractSedFromParse(e) {
  let n = (w) => (w.split(/\s+/)[0] === "sed" ? w : null);
  if (e.length > SPLIT_MAX_LEN) return n(eq(e));
  if (hasParserLexingDifferential(e)) return n(eq(e));
  let parse = getParserModule().parse(e);
  if (!parse || parseHasErrorNode(parse)) return n(eq(e));
  let filtered = parse.children.filter((w) => w.type !== "comment");
  if (
    filtered.length !== 1 ||
    (filtered[0].type !== "command" &&
      !(
        filtered[0].type === "redirected_statement" && filtered[0].children.some((w) => w.type === "command")
      ))
  )
    return n(eq(e));
  let h = findCommandNode(parse, null);
  if (!h) return null;
  let found = h.children.find((w) => w.type === "command_name");
  if (!found) return null;
  let str = Buffer.from(e, "utf8").subarray(found.startIndex).toString("utf8");
  return n(eq(str));
}
//@ chunk-e6aww6q8.js:1063028-1063111 placement
function eq(e) {
  let trimmed = e.trim();
  for (;;) {
    let r = stripLeadingRedirects(stripSafeWrappers(trimmed));
    if (r === trimmed) break;
    trimmed = r;
  }
  return trimmed;
}
/**
 * 反复剥掉命令文本开头的重定向词（<<< word、>file、2>&1 等），返回剩余部分；用于识别以重定向开头的命令。
 */
//@ chunk-e6aww6q8.js:1063111-1063620 placement = walkHerestringRedirect (0.827)
function stripLeadingRedirects(e) {
  let n = e;
  for (;;) {
    if (n.startsWith("<<<") && n[3] !== "<" && n[3] !== "(") {
      let sliced = n.slice(3),
        w = sliced.startsWith(" ") || sliced.startsWith("\t") ? sliced.trimStart() : sliced;
      if (!w) return n;
      let L = shellWordEnd(w);
      if (L === null) return n;
      n = w.slice(L).trimStart();
      continue;
    }
    let match = /^(?:\d*|&)(?:>>(?!\()|>\|(?!\()|>&(?!\()|<&(?!\()|<>(?!\()|>(?![>|&(])|<(?![<>&(]))/.exec(n);
    if (!match) return n;
    let sliced = n.slice(match[0].length),
      h = sliced.startsWith(" ") || sliced.startsWith("\t") ? sliced.trimStart() : sliced;
    if (!h) return n;
    let y = shellWordEnd(h);
    if (y === null) return n;
    n = h.slice(y).trimStart();
  }
}
//@ chunk-e6aww6q8.js:1063620-1063968 placement
function shellWordEnd(e) {
  let n = 0;
  while (n < e.length) {
    let r = e[n];
    if (r === " " || r === "\t") break;
    if (r === "\\" && n + 1 < e.length) {
      n += 2;
      continue;
    }
    if (r === "'") {
      let index = e.indexOf("'", n + 1);
      if (index === -1) return null;
      n = index + 1;
      continue;
    }
    if (r === '"') {
      let s = n + 1;
      for (;;) {
        if (s >= e.length) return null;
        if (e[s] === "\\" && s + 1 < e.length) {
          s += 2;
          continue;
        }
        if (e[s] === '"') break;
        s++;
      }
      n = s + 1;
      continue;
    }
    n++;
  }
  return n;
}
/**
 * 检查 sed 命令：含危险操作或无法静态校验时需要批准。
 */
//@ chunk-e6aww6q8.js:1063968-1064812 placement
function checkSedCommand(e, n, r) {
  let s = (h) => dze(h) && !(r?.has(h.trim()) ?? !1);
  if (e.command.length > SPLIT_MAX_LEN || hasParserLexingDifferential(e.command))
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
  if (commandRedirectsAreRuntimeDetermined(e.command, s))
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
  return { behavior: "passthrough", message: "No redirect-borne sed risk detected" };
}

export { checkSedConstraints, dze, checkSedCommand, HKt, sedCommandIsAllowedByAllowlist };
