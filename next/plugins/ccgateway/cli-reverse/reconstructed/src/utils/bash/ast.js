/**
 * utils/bash/ast.ts
 *
 * Bash 命令安全分析：把解析树遍历成 SimpleCommand 列表（argv/envVars/redirects），跟踪变量值，遇到无法静态确定的 shell 特性返回 too-complex，并做语义检查（checkSemantics）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/ast.ts
 * pieces: chunk-5xgkngpb.js (6), chunk-9jzjcqxe.js (1), chunk-nzz6y5xm.js (148)
 * attribution: fingerprint 20, placement 15, layout 71, facade-majority 36, file-local 3, callgraph-fingerprint 1, sole-consumer 8, callgraph-witnessed 1
 */
import { AsyncLocalStorage } from "async_hooks";
import { isDeepStrictEqual } from "util";
import { homedir } from "os";
import {
  parseCommandRaw,
  PARSE_ABORTED,
  isSetFlagWithA,
  hasAnyShortFlagChar,
  stripPathAndExe,
} from "./parser.js";
import {
  isSnappyTowerEnabled,
  isSturdyLanternDefault,
  isVastPuddleEnabled,
  isBashReadingMode,
  isNestedRippleEnabled,
  isRuleOffOrBashReading,
  recordReadingRefusal,
  isStagedPumpkinEnabled,
  isRmModifierAllowed,
} from "./bashReadingFlags.js";
import { hasCommentNode, SPLIT_MAX_LEN, splitCommand, getCommandArgv } from "./commands.js";
import { isScrubEnabled } from "../subprocessEnv.js";
import { hasZshMultibyteName, SHELL_KEYWORDS, getParserModule } from "./bashParser.js";
import { getOwn } from "../objectSafety.js";
import { isXargsToSafeFilter } from "../../tools/BashTool/readOnlyValidation.js";
import { stripCommandBuiltinPrefixes } from "../../tools/BashTool/bashSecurity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-nzz6y5xm.js:3050-3064 placement
/**
 * 记录是否发生拒绝的 AsyncLocalStorage。
 */
var refusalTrackingStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nzz6y5xm.js:3050", () => {
  refusalTrackingStorage = new AsyncLocalStorage();
});
//@ chunk-nzz6y5xm.js:3064-3169 placement
/**
 * 在拒绝跟踪上下文中运行函数，返回结果与是否发生拒绝。
 */
async function runWithRefusalTracking(accepted, fn) {
  let tracker = {
    accepted,
    refused: false,
  };
  return {
    result: await refusalTrackingStorage.run(tracker, fn),
    refused: tracker.refused,
  };
}
//@ chunk-nzz6y5xm.js:3169-3259 placement
/**
 * 标记本次分析发生拒绝，并返回是否为首次。
 */
function noteRefusal() {
  let tracker = refusalTrackingStorage.getStore();
  if (tracker === undefined) return true;
  tracker.refused = true;
  return !tracker.accepted;
}
//@ chunk-nzz6y5xm.js:3259-3361 layout
function substitutionIsRisky(node, buffer) {
  let line = renderNodeText(node, buffer, "line");
  let at = line.search(SUBST_START_RE);
  return (at !== -1 && RISKY_SYNTAX_RE.test(line.slice(at + 2))) || walkExpansionRisk(node, buffer, false);
}
//@ chunk-nzz6y5xm.js:3361-3536 layout
var SUBST_MARK = "\x03";
var HEREDOC_MARK = "\x02";
var SUBST_START_RE = /[$<>]\((?!\(?\x03)/;
var RISKY_SYNTAX_RE =
  /(?:^|[ \t\n;&|()<>])(?:#|(?:case|esac)(?=$|[ \t\n;&|()<>]))|(?:^|[^<])(?:<<(?![<\x02])|<<<+[<\x02])|\$(?=$|[ \t\n;&|)<>])/;
//@ chunk-nzz6y5xm.js:3536-4029 layout
function walkExpansionRisk(node, buffer, risky) {
  let firstChildType = node.children[0]?.type;
  if (
    node.type === "process_substitution" ||
    (node.type === "command_substitution" && firstChildType === "$(")
  ) {
    let substitutionText = renderNodeText(node, buffer, "substitution");
    if (
      risky ||
      RISKY_SYNTAX_RE.test(substitutionText.slice(2, -1)) ||
      !isSingleBalancedGroup(substitutionText.slice(1))
    )
      return true;
  } else if (
    firstChildType === "$((" &&
    !isSingleBalancedGroup(renderNodeText(node, buffer, "substitution").slice(1))
  )
    return true;
  let childrenRisky =
    risky ||
    node.type === "arithmetic_expansion" ||
    node.type === "c_style_for_statement" ||
    firstChildType === "((" ||
    (node.type === "string" &&
      node.children.some(
        (child, sibling) => child.type === "$" && node.children[sibling + 1]?.text.startsWith("["),
      ));
  return node.children.some((child) => walkExpansionRisk(child, buffer, childrenRisky));
}
//@ chunk-nzz6y5xm.js:4029-4156 layout
function isSingleBalancedGroup(text) {
  let depth = 0;
  for (let i = 0; i < text.length; i++)
    if (text[i] === "(") depth++;
    else if (text[i] === ")" && --depth === 0) return i === text.length - 1;
  return false;
}
//@ chunk-nzz6y5xm.js:4156-4422 layout
function renderNodeText(node, buffer, mode) {
  let text = "";
  let startIndex = node.startIndex;
  let sorted = mk(node, mode).sort((startIndex, replacements) => startIndex.start - replacements.start);
  for (let replacement of sorted)
    if (replacement.start >= startIndex) {
      text += buffer.toString("latin1", startIndex, replacement.start) + replacement.left;
      startIndex = replacement.end;
    }
  return (text + buffer.toString("latin1", startIndex, node.endIndex)).replace(
    /\\([^])/g,
    (escaped, parentNode) =>
      parentNode ===
      `
`
        ? ""
        : parentNode === " " || parentNode === "\t"
          ? parentNode
          : "_",
  );
}
//@ chunk-nzz6y5xm.js:4422-4556 layout (2.1.88 match: mk, 0.815)
function mk(node, parentNode) {
  return node.children.flatMap((child) => {
    let kid = treeNode(child, parentNode);
    return kid === null
      ? mk(child, parentNode)
      : [
          {
            start: child.startIndex,
            end: child.endIndex,
            left: kid,
          },
        ];
  });
}
//@ chunk-nzz6y5xm.js:4556-5088 layout
function treeNode(node, mode) {
  switch (node.type) {
    case "raw_string":
      return "''";
    case "string":
      return '""';
    case "ansi_c_string":
      return "$''";
    case "simple_expansion":
      return "$x";
    case "comment":
      return " #";
    case "heredoc_body":
      return mode === "line" ? " " : null;
    case "heredoc_redirect":
      return mode === "substitution" && redirect(node) ? "<<" + HEREDOC_MARK : null;
    case "command_substitution":
      return node.children[0]?.type === "$(" ? "$(" + SUBST_MARK + ")" : "``";
    case "process_substitution":
      return node.text.charAt(0) + "(" + SUBST_MARK + ")";
    case "arithmetic_expansion":
      return node.children[0]?.type === "$((" ? "$((" + SUBST_MARK + "))" : null;
    default:
      return null;
  }
}
//@ chunk-nzz6y5xm.js:5088-5579 layout
function redirect(node) {
  let [operator, start, body, end] = node.children;
  if (
    !operator ||
    !start ||
    !body ||
    !end ||
    (operator.type !== "<<" && operator.type !== "<<-") ||
    start.type !== "heredoc_start" ||
    !/^(?:(?!(?:case|esac)$)\w+|'[^'\\\s()]+'|"[^"$`\\\s()]+")$/.test(start.text) ||
    body.type !== "heredoc_body" ||
    body.startIndex !== start.endIndex + 1 ||
    end.type !== "heredoc_end"
  )
    return false;
  let text = body.text + end.text;
  return [text, text.replaceAll("\\\n", "")].every((variant) => {
    let lines = variant.split(`
`);
    return (
      lines.findIndex((line) => {
        let lines = operator.type === "<<-" ? line.replace(/^\t+/, "") : line;
        return lines === end.text || lines.startsWith(end.text + ")");
      }) ===
      lines.length - 1
    );
  });
}
//@ chunk-nzz6y5xm.js:5579-5979 facade-majority (2.1.88 match: VAR_PLACEHOLDER, 0.159)
var STRUCTURAL_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SEPARATOR_TYPES;
var REDIRECTABLE_COMMAND_TYPES;
var TRAILING_OK_TYPES;
var CMDSUB_PLACEHOLDER;
var VAR_PLACEHOLDER;
var REDIRECT_NODE_TYPES;
var UNCERTAIN_VAR_PLACEHOLDER;
deferInit("chunk-nzz6y5xm.js:5579", () => {
  STRUCTURAL_TYPES = new Set(["program", "list", "pipeline", "redirected_statement"]);
  SEPARATOR_TYPES = new Set([
    "&&",
    "||",
    "|",
    ";",
    "&",
    "|&",
    `
`,
  ]);
  REDIRECTABLE_COMMAND_TYPES = new Set([
    "command",
    "pipeline",
    "list",
    "negated_command",
    "declaration_command",
    "unset_command",
  ]);
  TRAILING_OK_TYPES = new Set(["test_command", "redirected_statement"]);
  CMDSUB_PLACEHOLDER = "__CMDSUB_OUTPUT__";
  VAR_PLACEHOLDER = "__TRACKED_VAR__";
  REDIRECT_NODE_TYPES = new Set(["file_redirect", "herestring_redirect", "heredoc_redirect"]);
  UNCERTAIN_VAR_PLACEHOLDER = "__UNCERTAIN_VAR__";
});
//@ chunk-nzz6y5xm.js:5979-6046 facade-majority
/**
 * 值中是否含任一占位符（CMDSUB / TRACKED_VAR / UNCERTAIN_VAR）。
 */
function containsAnyPlaceholder(value) {
  return (
    value.includes(CMDSUB_PLACEHOLDER) ||
    value.includes(VAR_PLACEHOLDER) ||
    value.includes(UNCERTAIN_VAR_PLACEHOLDER)
  );
}
//@ chunk-nzz6y5xm.js:6046-6123 facade-majority
/**
 * 把占位符换成 $(…) / ${…}，用于给用户看的理由文本。
 */
function redactPlaceholdersForDisplay(text) {
  return text.replaceAll(CMDSUB_PLACEHOLDER, "$(\u2026)").replaceAll(VAR_PLACEHOLDER, "${\u2026}");
}
//@ chunk-nzz6y5xm.js:6123-6183 facade-majority
function deletePlaceholders(text) {
  return text.replaceAll(CMDSUB_PLACEHOLDER, "").replaceAll(VAR_PLACEHOLDER, "");
}
//@ chunk-nzz6y5xm.js:6183-6212 layout
var substitutionCount = 0;
var catHeredocInlineCount = 0;
var quoteScanCarveOutCount = 0;
var QUOTE_OR_BACKSLASH_RE = /["`\\]/;
//@ chunk-nzz6y5xm.js:6212-6254 layout
function isPrecededByNewline(text, index) {
  return (
    index > 0 &&
    text[index - 1] ===
      `
`
  );
}
//@ chunk-nzz6y5xm.js:6254-6403 facade-majority
/**
 * 文本中是否含运行时才确定的占位符：变量或不确定变量占位，或不在行首的命令替换输出占位。
 */
function containsRuntimePlaceholder(text) {
  if (text.includes(VAR_PLACEHOLDER) || text.includes(UNCERTAIN_VAR_PLACEHOLDER)) return true;
  let index = text.indexOf(CMDSUB_PLACEHOLDER);
  while (index !== -1) {
    if (!isPrecededByNewline(text, index)) return true;
    index = text.indexOf(CMDSUB_PLACEHOLDER, index + CMDSUB_PLACEHOLDER.length);
  }
  return false;
}
//@ chunk-nzz6y5xm.js:6403-6477 facade-majority
/**
 * 文本是否以任一占位符（命令替换输出、变量、不确定变量）开头。
 */
function startsWithAnyPlaceholder(argValue) {
  return (
    argValue.startsWith(CMDSUB_PLACEHOLDER) ||
    argValue.startsWith(VAR_PLACEHOLDER) ||
    argValue.startsWith(UNCERTAIN_VAR_PLACEHOLDER)
  );
}
//@ chunk-nzz6y5xm.js:6477-7285 fingerprint (2.1.88 match: SAFE_ENV_VARS, 0.606)
var BARE_VAR_UNSAFE_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STDBUF_SHORT_SEP_RE;
var STDBUF_SHORT_FUSED_RE;
var STDBUF_LONG_RE;
var BASH_READONLY_SPECIAL_VARS;
var SAFE_ENV_VARS;
var SPECIAL_VAR_NAMES;
var DANGEROUS_NODE_TYPES;
var DANGEROUS_TYPE_IDS;
deferInit("chunk-nzz6y5xm.js:6477", () => {
  BARE_VAR_UNSAFE_RE = /[ \t\n*?[]/;
  STDBUF_SHORT_SEP_RE = /^-[ioe]$/;
  STDBUF_SHORT_FUSED_RE = /^-[ioe]./;
  STDBUF_LONG_RE = /^--(input|output|error)=/;
  BASH_READONLY_SPECIAL_VARS = new Set([
    "BASHOPTS",
    "BASH_VERSINFO",
    "EUID",
    "PPID",
    "SHELLOPTS",
    "UID",
    "FUNCNAME",
    "GROUPS",
    "BASH_ARGC",
    "BASH_ARGV",
    "BASH_LINENO",
    "BASH_SOURCE",
    "BASHPID",
  ]);
  SAFE_ENV_VARS = new Set([
    "HOME",
    "PWD",
    "OLDPWD",
    "USER",
    "LOGNAME",
    "SHELL",
    "PATH",
    "HOSTNAME",
    "UID",
    "EUID",
    "PPID",
    "RANDOM",
    "SECONDS",
    "LINENO",
    "TMPDIR",
    "BASH_VERSION",
    "BASHPID",
    "SHLVL",
    "HISTFILE",
    "IFS",
  ]);
  SPECIAL_VAR_NAMES = new Set(["?", "$", "!", "#", "0", "-"]);
  DANGEROUS_NODE_TYPES = new Set([
    "command_substitution",
    "process_substitution",
    "expansion",
    "simple_expansion",
    "brace_expression",
    "subshell",
    "compound_statement",
    "for_statement",
    "while_statement",
    "until_statement",
    "if_statement",
    "case_statement",
    "function_definition",
    "test_command",
    "ansi_c_string",
    "translated_string",
    "herestring_redirect",
    "heredoc_redirect",
  ]);
  DANGEROUS_TYPE_IDS = [...DANGEROUS_NODE_TYPES];
});
//@ chunk-nzz6y5xm.js:7285-7378 facade-majority (2.1.88 match: nodeTypeId, 1)
/**
 * 把节点类型映射为数字 id（未定义 -2、ERROR -1、DANGEROUS_TYPE_IDS 下标+1、其他 0），用于 tengu_bash_ast_too_complex 遥测。
 */
function nodeTypeId(nodeType) {
  if (!nodeType) return -2;
  if (nodeType === "ERROR") return -1;
  let i = DANGEROUS_TYPE_IDS.indexOf(nodeType);
  return i >= 0 ? i + 1 : 0;
}
//@ chunk-nzz6y5xm.js:7378-7989 facade-majority (2.1.88 match: REDIRECT_OPS, 1)
var REDIRECT_OPS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BRACE_EXPANSION_RE;
var BRACE_ESCAPED_CLOSE_RE;
var BRACE_ESCAPED_OPEN_RE;
var CONTROL_CHAR_RE;
var LONE_SURROGATE_RE;
var UNICODE_WHITESPACE_RE;
var BACKSLASH_ESCAPED_SPACE_RE;
var BACKSLASH_LINE_CONTINUATION_RE;
var BACKSLASH_WHITESPACE_RE;
var WORD_LEAF_EXPANSION_RE;
var WORD_LEAF_QUOTE_RE;
var ZSH_TILDE_BRACKET_RE;
var ZSH_EQUALS_EXPANSION_RE;
var ZSH_NUMERIC_GLOB_RE;
var BRACE_WITH_QUOTE_RE;
deferInit("chunk-nzz6y5xm.js:7378", () => {
  REDIRECT_OPS = {
    ">": ">",
    ">>": ">>",
    "<": "<",
    ">&": ">&",
    "<&": "<&",
    ">|": ">|",
    "&>": "&>",
    "&>>": "&>>",
    "<<<": "<<<",
  };
  BRACE_EXPANSION_RE = /\{[^\s]*(,|\.\.)[^\s]*\}/;
  BRACE_ESCAPED_CLOSE_RE = /\{[^{]*\\}/;
  BRACE_ESCAPED_OPEN_RE = /\{[^}]*\\\{/;
  CONTROL_CHAR_RE = /[\x00-\x08\x0B-\x1F\x7F]/;
  LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
  UNICODE_WHITESPACE_RE = /[\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/;
  BACKSLASH_ESCAPED_SPACE_RE = /\\[ \t]/;
  BACKSLASH_LINE_CONTINUATION_RE = /(?:^|[^ \t\\])(?:\\\\)*\\\n|[ \t](?:\\\\)+\\\n|\\[ \t]\\\n/;
  BACKSLASH_WHITESPACE_RE = new RegExp(
    `${BACKSLASH_ESCAPED_SPACE_RE.source}|${BACKSLASH_LINE_CONTINUATION_RE.source}`,
  );
  WORD_LEAF_EXPANSION_RE = /(?:^|[^\\])(?:\\\\)*(?:[`$]|[<>=]\()/;
  WORD_LEAF_QUOTE_RE = /(?:^|[^\\])(?:\\\\)*['"]/;
  ZSH_TILDE_BRACKET_RE = /~\[/;
  ZSH_EQUALS_EXPANSION_RE = /(?:^|[\s;&|])=[a-zA-Z_]/;
  ZSH_NUMERIC_GLOB_RE = /<\d*-\d*>/;
  BRACE_WITH_QUOTE_RE = /\{[^}]*['"]/;
});
//@ chunk-nzz6y5xm.js:7989-8637 layout
/**
 * 简易扫描：命令文本在未加引号处（跳过单/双引号、反引号、注释）出现 * ? [ 即为真。写入 SimpleCommand.hasUnquotedGlob。
 */
function hasUnquotedGlob(text) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let atWordStart = true;
  let index = 0;
  while (index < text.length) {
    let char = text[index];
    if (inBacktick) {
      if (char === "\\" && (text[index + 1] === "`" || text[index + 1] === "\\" || text[index + 1] === "$"))
        index += 2;
      else {
        if (char === "`") inBacktick = false;
        index++;
      }
    } else if (inSingleQuote) {
      if (char === "'") inSingleQuote = false;
      index++;
    } else if (inDoubleQuote) {
      if (char === "\\" && (text[index + 1] === '"' || text[index + 1] === "\\" || text[index + 1] === "`"))
        index += 2;
      else if (char === "`") {
        inBacktick = true;
        index++;
      } else {
        if (char === '"') inDoubleQuote = false;
        index++;
      }
    } else if (char === "\\" && index + 1 < text.length) {
      if (
        text[index + 1] !==
        `
`
      )
        atWordStart = false;
      index += 2;
    } else if (char === "#" && atWordStart) {
      while (
        index < text.length &&
        text[index] !==
          `
`
      )
        index++;
      atWordStart = true;
    } else if (char === "`") {
      inBacktick = true;
      atWordStart = false;
      index++;
    } else {
      if (char === "*" || char === "?" || char === "[") return true;
      if (char === "'") inSingleQuote = true;
      else if (char === '"') inDoubleQuote = true;
      atWordStart =
        char === " " ||
        char === "\t" ||
        char ===
          `
` ||
        char === ";" ||
        char === "|" ||
        char === "&" ||
        char === "(" ||
        char === ")" ||
        char === "<" ||
        char === ">";
      index++;
    }
  }
  return false;
}
//@ chunk-nzz6y5xm.js:8637-8662 layout
var GLOB_PATTERN_RE = /[*?]|\[[^\]]*\]/;
//@ chunk-nzz6y5xm.js:8662-8695 layout
function looksLikeGlob(text) {
  return GLOB_PATTERN_RE.test(text);
}
//@ chunk-nzz6y5xm.js:8695-9016 facade-majority
/**
 * 判断命令 argv 或非 heredoc 重定向目标中是否有会被 shell 通配展开的模式（结合 argvUnquotedGlob 与占位符）。
 */
function hasSourceUnquotedGlob(command) {
  let argvUnquotedGlob = command.argvUnquotedGlob;
  if (
    command.carveOutMayDesyncQuoteScan === true ||
    (argvUnquotedGlob === undefined && command.argv.some(containsAnyPlaceholder))
  )
    return (
      command.argv.some(looksLikeGlob) ||
      command.redirects.some(
        (redirect) => redirect.op !== "<<" && redirect.op !== "<<<" && looksLikeGlob(redirect.target),
      )
    );
  if (argvUnquotedGlob === undefined) return false;
  if (argvUnquotedGlob.length !== command.argv.length) return command.argv.some(looksLikeGlob);
  return command.argv.some(
    (arg, index) => looksLikeGlob(arg) && (argvUnquotedGlob[index] === true || containsAnyPlaceholder(arg)),
  );
}
//@ chunk-nzz6y5xm.js:9016-9830 file-local
/**
 * 把单/双引号与反引号内的 { 替换为空格，用于 BRACE_WITH_QUOTE_RE 预检，避免把引号里的花括号当成展开混淆。
 */
function maskBracesInQuotedContexts(cmd) {
  if (!cmd.includes("{")) return cmd;
  let out = [];
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let atWordStart = true;
  let index = 0;
  while (index < cmd.length) {
    let char = cmd[index];
    if (inBacktick) {
      if (char === "\\" && (cmd[index + 1] === "`" || cmd[index + 1] === "\\" || cmd[index + 1] === "$")) {
        out.push(char, cmd[index + 1]);
        index += 2;
      } else {
        if (char === "`") inBacktick = false;
        out.push(char === "{" ? " " : char);
        index++;
      }
    } else if (inSingleQuote) {
      if (char === "'") inSingleQuote = false;
      out.push(char === "{" ? " " : char);
      index++;
    } else if (inDoubleQuote) {
      if (char === "\\" && (cmd[index + 1] === '"' || cmd[index + 1] === "\\" || cmd[index + 1] === "`")) {
        out.push(char, cmd[index + 1]);
        index += 2;
      } else if (char === "`") {
        inBacktick = true;
        out.push(char);
        index++;
      } else {
        if (char === '"') inDoubleQuote = false;
        out.push(char === "{" ? " " : char);
        index++;
      }
    } else if (char === "\\" && index + 1 < cmd.length) {
      out.push(char, cmd[index + 1]);
      if (
        cmd[index + 1] !==
        `
`
      )
        atWordStart = false;
      index += 2;
    } else if (char === "#" && atWordStart) {
      while (
        index < cmd.length &&
        cmd[index] !==
          `
`
      ) {
        out.push(cmd[index]);
        index++;
      }
      atWordStart = true;
    } else if (char === "`") {
      inBacktick = true;
      atWordStart = false;
      out.push(char);
      index++;
    } else {
      if (char === "'") inSingleQuote = true;
      else if (char === '"') inDoubleQuote = true;
      atWordStart =
        char === " " ||
        char === "\t" ||
        char ===
          `
` ||
        char === ";" ||
        char === "|" ||
        char === "&" ||
        char === "(" ||
        char === ")" ||
        char === "<" ||
        char === ">";
      out.push(char);
      index++;
    }
  }
  return out.join("");
}
//@ chunk-nzz6y5xm.js:9830-9861 callgraph-fingerprint (2.1.88 match: DOLLAR, 1)
var DOLLAR; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nzz6y5xm.js:9830", () => {
  DOLLAR = String.fromCharCode(36);
});
//@ chunk-nzz6y5xm.js:9861-9957 file-local
function collectCommandSubstitution(node, type) {
  if (node.type === type) return true;
  for (let child of node.children) if (child && collectCommandSubstitution(child, type)) return true;
  return false;
}
//@ chunk-nzz6y5xm.js:9957-10283 facade-majority
/**
 * 安全解析入口（2.1.88 parseForSecurity 的 316 版）：空串/解析失败返回空 simple；否则调用 parseForSecurityFromAstWithLoopCheck，simple 结果附带 tree。选项 readsDivergentShapes 用于按“分歧形态”重读。被 Shell.exec 的 worktree 守卫、命令文本日志与 shell -c 递归检查使用。
 */
async function parseForSecurity(command, { readsDivergentShapes = false } = {}) {
  if (command === "")
    return {
      kind: "simple",
      commands: [],
      bareAssignmentNames: [],
    };
  let root = await parseCommandRaw(command);
  if (root === null)
    return {
      kind: "simple",
      commands: [],
      bareAssignmentNames: [],
    };
  let result = parseForSecurityFromAst(command, root, {
    readsDivergentShapes,
  });
  if (root !== PARSE_ABORTED && (result.kind === "simple" || result.nodeType !== undefined))
    return {
      ...result,
      tree: root,
    };
  return result;
}
//@ chunk-nzz6y5xm.js:10283-10633 facade-majority
/**
 * 为 n 个声明前缀生成“bash 是否保留赋值”的若干种布尔组合：n≤3 全枚举（exhaustive），否则取全假/全真/单个为真，并补上当前组合。供 shell -c 递归检查逐种读法判定。
 */
function declarationPrefixReadings(count, currentReading) {
  let readingOf = (pick) =>
    Array.from(
      {
        length: count,
      },
      (value, index) => pick(index),
    );
  if (count <= 3)
    return {
      readings: Array.from(
        {
          length: 2 ** count,
        },
        (value, bitmask) => readingOf((bit) => Math.floor(bitmask / 2 ** bit) % 2 === 1),
      ),
      exhaustive: true,
    };
  let readings = [readingOf(() => false), readingOf(() => true)];
  for (let i = 0; count <= 8 && i < count; i++) readings.push(readingOf((index) => index === i));
  if (
    currentReading?.length === count &&
    !readings.some((reading) => reading.every((value, index) => value === currentReading[index]))
  )
    readings.push([...currentReading]);
  return {
    readings,
    exhaustive: false,
  };
}
//@ chunk-nzz6y5xm.js:10633-11013 facade-majority
/**
 * parseForSecurityFromAst 的包装：先以 first 轮运行；若结果 simple 且含循环、且 GrowthBook tengu_snappy_tower 打开，再以 later 轮（循环体按迭代后状态重走）运行，两次结果不深度相等时加 laterLoopPassesDiffer。BashTool 权限检查的主要调用点。
 */
function parseForSecurityFromAst(command, root, options = {}) {
  let firstPass = parseForSecurityFromAst_2(command, root, options, "first");
  if (
    firstPass.kind === "simple" &&
    options.readsDivergentShapes !== true &&
    root !== PARSE_ABORTED &&
    failsSubstitutionTextCheck(command, root)
  )
    return {
      kind: "too-complex",
      reason: "A nested command in this command can't be checked before it runs",
      differential: true,
      divergentShape: true,
      keepsRemovalVerdict: true,
    };
  return firstPass.kind === "simple" &&
    firstPass.hasLoop === true &&
    isSnappyTowerEnabled() &&
    !isDeepStrictEqual(firstPass, parseForSecurityFromAst_2(command, root, options, "later"))
    ? {
        ...firstPass,
        laterLoopPassesDiffer: true,
      }
    : firstPass;
}
//@ chunk-nzz6y5xm.js:11013-11090 facade-majority
function failsSubstitutionTextCheck(command, commandText) {
  return (
    command.includes("(") &&
    isSturdyLanternDefault() &&
    substitutionIsRisky(commandText, Buffer.from(command, "utf8"))
  );
}
//@ chunk-nzz6y5xm.js:11090-14464 fingerprint (2.1.88 match: parseForSecurityFromAst, 0.449)
/**
 * Bash 安全分析核心：先做字节级预检（孤立代理项、控制字符、Unicode 空白、反斜杠空白、zsh ~[ / =cmd / <N-M>、花括号内引号），再查解析中止、反引号扫描异常、顶层语句之间/末尾是否有解析器跳过的字节、fd 变量重定向、重定向形状、结构性解析错误；然后保存/重置模块级分析状态，调用 walkProgram 收集 SimpleCommand。返回 {kind:'simple', commands, bareAssignmentNames, hasLoop, …} 或 {kind:'too-complex', reason, nodeType?, differential?, divergentShape?, keepsRemovalVerdict?}；可附 usesAssignedValue、uncertainWrite、declarationPrefixes。
 */
function parseForSecurityFromAst_2(
  command,
  root,
  {
    plainUnquotedHeredocs = false,
    declarationPrefix,
    readsDivergentShapes = false,
    passesEscapedBlanks = false,
  },
  pass,
) {
  if (LONE_SURROGATE_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains lone surrogate",
      differential: true,
    };
  if (CONTROL_CHAR_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains control characters",
      differential: true,
    };
  if (UNICODE_WHITESPACE_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains Unicode whitespace",
      differential: true,
    };
  if ((passesEscapedBlanks ? BACKSLASH_LINE_CONTINUATION_RE : BACKSLASH_WHITESPACE_RE).test(command))
    return {
      kind: "too-complex",
      reason: "Contains backslash-escaped whitespace",
      differential: true,
    };
  if (ZSH_TILDE_BRACKET_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains zsh ~[ dynamic directory syntax",
      differential: true,
    };
  if (ZSH_EQUALS_EXPANSION_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains zsh =cmd equals expansion",
      differential: true,
    };
  if (ZSH_NUMERIC_GLOB_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains zsh <N-M> numeric-range glob",
      differential: true,
    };
  if (BRACE_WITH_QUOTE_RE.test(maskBracesInQuotedContexts(command)))
    return {
      kind: "too-complex",
      reason: "Contains brace with quote character (expansion obfuscation)",
      differential: true,
    };
  if (command.trim() === "")
    return {
      kind: "simple",
      commands: [],
      bareAssignmentNames: [],
    };
  if (root === PARSE_ABORTED)
    return {
      kind: "too-complex",
      reason: "Parser aborted (timeout, resource limit, or over-length)",
      nodeType: "PARSE_ABORT",
    };
  for (let marker of ["backtick_body_empty", "backtick_body_overrun", "backtick_escape_unsupported"])
    if (collectCommandSubstitution(root, marker))
      return {
        kind: "too-complex",
        reason:
          marker === "backtick_body_empty"
            ? "empty backtick substitution \u2014 bash joins the surrounding words, so the parsed command boundaries cannot be trusted"
            : "backtick substitution scan could not be trusted (" +
              marker +
              ") \u2014 the parsed bytes may differ from what bash executes",
        differential: true,
      };
  let buffer = Buffer.from(command, "utf8");
  {
    let zshDifferentialSyntax = findZshDifferentialSyntax(root, buffer, 0);
    if (zshDifferentialSyntax) return zshDifferentialSyntax;
  }
  {
    let refusal = checkDeclarationOperands(root);
    if (refusal) return refusal;
  }
  let isSeparatorByte = (byte) =>
    byte === 32 || byte === 9 || byte === 10 || byte === 13 || byte === 59 || byte === 38;
  let skipBlanks = (coveredEnd, limit) => {
    let position = coveredEnd;
    while (position < limit) {
      let byte = buffer[position];
      if (isSeparatorByte(byte)) position++;
      else if (
        byte === 92 &&
        (buffer[position + 1] === 10 || (buffer[position + 1] === 13 && buffer[position + 2] === 10))
      )
        position += buffer[position + 1] === 13 ? 3 : 2;
      else break;
    }
    return position;
  };
  let sorted = root.children
    .filter((child) => child !== null)
    .map((child) => [child.startIndex, child.endIndex])
    .sort((leftRange, rightRange) => leftRange[0] - rightRange[0]);
  let coveredEnd = 0;
  for (let [start, end] of sorted) {
    if (skipBlanks(coveredEnd, start) < start)
      return {
        kind: "too-complex",
        reason: "Parser skipped input between top-level statements",
      };
    if (end > coveredEnd) coveredEnd = end;
  }
  if (skipBlanks(coveredEnd, buffer.length) < buffer.length)
    return {
      kind: "too-complex",
      reason: "Parser did not consume trailing input",
    };
  {
    let fdVariableRedirect = findFdVariableRedirect(root, buffer);
    if (fdVariableRedirect !== null)
      return {
        kind: "too-complex",
        reason: `Redirect uses ${describeFdVariable(fdVariableRedirect)} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
  }
  {
    let redirectShapeError = findRedirectShapeError(root);
    if (redirectShapeError) return redirectShapeError;
  }
  let divergentShapeError = readsDivergentShapes ? null : findStructuralParseError(root);
  if (divergentShapeError !== null)
    return {
      kind: "too-complex",
      reason: divergentShapeError,
      nodeType: "ERROR",
      differential: true,
      divergentShape: true,
    };
  let savedPlainHeredocs = allowPlainUnquotedHeredocs;
  let savedDivergentShapes = readingDivergentShapes;
  let savedUncertainWrite = sawUncertainWrite;
  let savedBudget = reExpansionBudget;
  let savedPrefix = currentDeclarationPrefix;
  let laterPass = declarationPrefixCount;
  let savedPrefixValues = declarationPrefixValues;
  let savedPrefixInBranch = prefixAssignInBranch;
  let savedUnsetNames = unsetNames;
  let savedBashKeeps = declarationPrefixBashKeeps;
  let savedUsedAssignedValue = usedAssignedValue;
  usedAssignedValue = false;
  let savedIsLaterLoopPass = isLaterLoopPass;
  let savedLoopNode = currentLoopNode;
  let savedLoopDepth = loopDepth;
  isLaterLoopPass = pass === "later";
  currentLoopNode = null;
  loopDepth = 0;
  allowPlainUnquotedHeredocs = plainUnquotedHeredocs;
  readingDivergentShapes = readsDivergentShapes;
  sawUncertainWrite = false;
  reExpansionBudget = command.length * RE_EXPANSION_FACTOR;
  currentDeclarationPrefix = declarationPrefix;
  declarationPrefixCount = 0;
  declarationPrefixValues = new Map();
  prefixAssignInBranch = false;
  unsetNames = new Set();
  declarationPrefixBashKeeps = undefined;
  let result;
  try {
    result = walkProgram(root);
    if (usedAssignedValue && result.kind === "simple")
      result = {
        ...result,
        usesAssignedValue: true,
      };
    if (prefixAssignInBranch && result.kind === "simple")
      result = {
        kind: "too-complex",
        reason:
          "A variable set in front of a declaration inside a branch or loop can't be checked before it runs",
      };
    let declarationPrefixBashKeeps = getDeclarationPrefixBashKeeps();
    if (declarationPrefix === undefined && declarationPrefixBashKeeps !== undefined)
      result = {
        ...result,
        declarationPrefixes: declarationPrefixBashKeeps.length,
        declarationPrefixBashKeeps,
      };
    if (
      declarationPrefix !== undefined &&
      result.kind === "simple" &&
      getDeclarationPrefixCount() !== declarationPrefix.length
    )
      result = {
        kind: "too-complex",
        reason: "The variables set in front of declarations in this command can't be checked before it runs",
      };
    if (sawUncertainWrite)
      result = {
        ...result,
        uncertainWrite: true,
      };
  } finally {
    allowPlainUnquotedHeredocs = savedPlainHeredocs;
    readingDivergentShapes = savedDivergentShapes;
    sawUncertainWrite = savedUncertainWrite;
    reExpansionBudget = savedBudget;
    currentDeclarationPrefix = savedPrefix;
    declarationPrefixCount = laterPass;
    declarationPrefixValues = savedPrefixValues;
    prefixAssignInBranch = savedPrefixInBranch;
    unsetNames = savedUnsetNames;
    declarationPrefixBashKeeps = savedBashKeeps;
    usedAssignedValue = savedUsedAssignedValue;
    isLaterLoopPass = savedIsLaterLoopPass;
    currentLoopNode = savedLoopNode;
    loopDepth = savedLoopDepth;
  }
  if (
    result.kind === "too-complex" &&
    result.nodeType !== "ERROR" &&
    (hasDollarNonAsciiError(root) || hasZshLengthOfNonAsciiSubscript(root))
  )
    return {
      ...result,
      nodeType: "ERROR",
    };
  return result;
}
//@ chunk-nzz6y5xm.js:14464-14798 layout
/**
 * 找结构性解析错误：空的非 heredoc 节点返回 Parse error；[ 紧贴后续单词时返回理由。
 */
function findStructuralParseError(node) {
  if (node.children.length === 0)
    return node.startIndex === node.endIndex && !node.type.startsWith("heredoc_") ? "Parse error" : null;
  for (let child of node.children) {
    let childError = child === null ? null : findStructuralParseError(child);
    if (childError !== null) return childError;
  }
  return node.type === "test_command" && node.children[0]?.type === "[" && !/^\[[ \t]/.test(node.text)
    ? "[ glued to the next word names another command"
    : null;
}
//@ chunk-nzz6y5xm.js:14798-14935 layout (2.1.88 match: nodeTypeId, 1)
function hasDollarNonAsciiError(nodeType) {
  if (nodeType.type === "ERROR" && (nodeType.text.startsWith("${") || isDollarNonAsciiName(nodeType.text)))
    return true;
  for (let child of nodeType.children) if (child && hasDollarNonAsciiError(child)) return true;
  return false;
}
//@ chunk-nzz6y5xm.js:14935-15354 layout
function hasZshLengthOfNonAsciiSubscript(node) {
  let children = node.children;
  for (let k = 0; k < children.length; k++) {
    let child = children[k];
    if (!child) continue;
    if (
      child.type === "simple_expansion" &&
      child.children.some((child) => child?.type === "special_variable_name" && child.text === "#")
    ) {
      let textAfterSubscript = "";
      for (let k_2 = k + 1; k_2 < children.length; k_2++) {
        let text = children[k_2]?.text ?? "";
        textAfterSubscript += text;
        if (!/^[\w\u0080-\uffff]*$/.test(text)) break;
      }
      let match = /^[\w\u0080-\uffff]*(?=\[|:[a-zA-Z&])/.exec(textAfterSubscript);
      if (match && /[\u0080-\uffff]/.test(match[0])) return true;
    }
    if (hasZshLengthOfNonAsciiSubscript(child)) return true;
  }
  return false;
}
//@ chunk-nzz6y5xm.js:15354-15443 layout
function isDollarNonAsciiName(text) {
  return /^\$[#^=~+]*[\w\u0080-\uffff]+$/.test(text) && /[\u0080-\uffff]/.test(text);
}
//@ chunk-nzz6y5xm.js:15443-16943 layout
/**
 * 递归查找 bash 与 zsh 解读不同的语法（注释紧贴括号、case 模式组内注释、无 () 的 function 括号体、关键字紧贴括号），命中时返回 too-complex（differential）。
 */
function findZshDifferentialSyntax(node, bytes, baseOffset) {
  for (let child of node.children) {
    if (!child) continue;
    let charBeforeChild = child.startIndex - 1 - baseOffset;
    if (
      child.type === "comment" &&
      charBeforeChild >= 0 &&
      (bytes[charBeforeChild] === 41 || bytes[charBeforeChild] === 40)
    )
      return {
        kind: "too-complex",
        reason:
          "comment glued to a paren \u2014 bash reads `)#\u2026` and `(#\u2026` as a comment, but zsh reads a keyword- or word-glued `(\u2026)` as a glob group whose `#\u2026` text is word content that executes",
        differential: true,
      };
    let zshDifferentialSyntax = findZshDifferentialSyntax(child, bytes, baseOffset);
    if (zshDifferentialSyntax) return zshDifferentialSyntax;
  }
  for (let child of node.children) {
    if (!child) continue;
    if (
      child.type === "case_item" &&
      !child.children.some((child) => child !== undefined && child.type === ")") &&
      hasCommentNode(child)
    )
      return {
        kind: "too-complex",
        reason:
          "`case` pattern group holds a comment \u2014 bash reads no comment inside a pattern list, but zsh reads the group as one glob word and expands its contents",
        differential: true,
      };
    if (
      child.type === "function" &&
      !node.children.some((child) => child !== undefined && child.type === "(")
    ) {
      let functionWord = node.children[1];
      let redirectedBody = node.children.find(
        (child) => child !== undefined && child.type === "redirected_statement",
      )?.children[0];
      let bodySubshell =
        node.children.find((child) => child !== undefined && child.type === "subshell") ??
        (redirectedBody?.type === "subshell" ? redirectedBody : undefined);
      if (
        functionWord !== undefined &&
        bodySubshell !== undefined &&
        isOnlyBlankBetween(bytes, functionWord.endIndex - baseOffset, bodySubshell.startIndex - baseOffset)
      )
        return {
          kind: "too-complex",
          reason:
            "`function` with a parenthesised body and no `()` \u2014 bash reads a subshell body, but zsh reads one glob-group word and expands its contents",
          differential: true,
        };
    }
    if (COMPOUND_STATEMENT_TYPES.has(child.type) && bytes[child.endIndex - baseOffset] === 40)
      return {
        kind: "too-complex",
        reason: `\`${child.type}\` glued to a paren \u2014 bash reads a keyword and a subshell, but zsh reads one glob-group word and expands its contents`,
        differential: true,
      };
  }
  return null;
}
//@ chunk-nzz6y5xm.js:16943-17003 layout
/**
 * 复合语句节点类型（if/elif/else/while/until/case）。
 */
var COMPOUND_STATEMENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nzz6y5xm.js:16943", () => {
  COMPOUND_STATEMENT_TYPES = new Set(["if", "elif", "else", "while", "until", "case"]);
});
//@ chunk-nzz6y5xm.js:17003-21858 layout
/**
 * 递归检查 declare/unset 语句的写法：标志会改变赋值语义且有会被求值的操作数、相邻引号片段拼成一个操作数、$'…' 标志、拼写成别的命令但实为声明等，返回 too-complex。（实为 ast.ts 安全检查，被切到 bashParser.ts）
 */
function checkDeclarationOperands(node) {
  if (node.type === "declaration_command" || node.type === "unset_command") {
    if (
      node.type === "declaration_command" &&
      node.children.some(
        (child) =>
          child !== undefined &&
          (/^(?:export|readonly)$/.test(node.children[0]?.text ?? "")
            ? EXPORT_SEMANTIC_FLAG_RE
            : DECLARE_SEMANTIC_FLAG_RE
          ).test(unquoteFlagWord(child.text)),
      ) &&
      !areDeclareArgsSimple(node)
    )
      return {
        kind: "too-complex",
        reason: `${node.children[0]?.text ?? "declare"} with a flag that changes assignment semantics and an operand it would evaluate`,
        differential: true,
      };
    let isDeclarationBuiltin =
      node.type === "unset_command" ||
      /^(?:declare|typeset|local|export)$/.test(node.children[0]?.text ?? "");
    let matches = /^(?:declare|typeset|local)$/.test(node.children[0]?.text ?? "");
    let allowFunctionName = node.children.some(
      (child) => child !== undefined && /^[-+][A-Za-z]*[fF]/.test(unquoteFlagWord(child.text)),
    );
    let prevOperand;
    for (let [childIndex, operand] of node.children.entries()) {
      if (!operand) continue;
      if (
        childIndex > 1 &&
        prevOperand !== undefined &&
        operand.type !== "variable_assignment" &&
        operand.startIndex === prevOperand.endIndex
      )
        return {
          kind: "too-complex",
          reason: `${node.children[0]?.text ?? node.type} operand '${prevOperand.text}${operand.text}' is split across adjacent quoted segments \u2014 the shell joins them into one word the analyzer cannot verify`,
          differential: true,
        };
      if (childIndex > 0 && operand.type === "ansi_c_string" && /^\$'[-+]/.test(operand.text))
        return {
          kind: "too-complex",
          reason: `${node.children[0]?.text ?? node.type} flag ${operand.text} \u2014 a $'\u2026' flag word the shell decodes`,
          differential: true,
        };
      if (childIndex > 0 && !/^[-+]/.test(unquoteFlagWord(operand.text))) {
        let isPlainWordType =
          operand.type === "word" ||
          operand.type === "raw_string" ||
          operand.type === "concatenation" ||
          operand.type === "variable_name" ||
          operand.type === "number";
        if (
          operand.type === "ansi_c_string" &&
          (isDeclarationBuiltin || node.children[0]?.text === "readonly")
        )
          return {
            kind: "too-complex",
            reason: `${node.children[0]?.text ?? node.type} operand ${operand.text} \u2014 a $'\u2026' word the shell decodes, which may carry a subscript the parser cannot read`,
            differential: true,
          };
        if (matches) {
          if (!isSafeDeclarationArg(operand, allowFunctionName))
            return {
              kind: "too-complex",
              reason: `${node.children[0]?.text ?? "declare"} operand '${operand.text}' is not a plain NAME with an inert value \u2014 the shell may re-parse it as a subscript, an expanded name or a compound assignment`,
              differential: true,
            };
          prevOperand = operand;
          continue;
        }
        let assignmentName = getAssignmentName(operand.text);
        let matches_2 = /^['"]?[A-Za-z_]\w*=/.test(operand.text);
        let hasEvaluatedSubscript = isPlainWordType
          ? (isDeclarationBuiltin && assignmentName.includes("[")) ||
            (matches_2 ? assignmentName.slice(1).includes("\\") : operand.text.slice(1).includes("\\"))
          : operand.type === "string" &&
            (matches_2 ? assignmentName.includes("\\") : operand.text.includes("\\"));
        let assignmentHasEscape =
          operand.type === "variable_assignment" && /['\\]/.test(getAssignmentName(operand.text));
        let hasDollarAssignment =
          isPlainWordType &&
          isDeclarationBuiltin &&
          /^['"]?\$/.test(assignmentName) &&
          /[[`'"]/.test(operand.text);
        if (hasEvaluatedSubscript || assignmentHasEscape || hasDollarAssignment)
          return {
            kind: "too-complex",
            reason: `${node.children[0]?.text ?? node.type} operand '${operand.text}' carries a subscript or escape the shell evaluates \u2014 the parser read it as literal text`,
            differential: true,
          };
        if (
          operand.type === "variable_name"
            ? !(
                PLAIN_VAR_NAME_RE.test(operand.text) ||
                (allowFunctionName && FUNCTION_NAME_RE.test(operand.text))
              )
            : (operand.type === "word" ||
                operand.type === "concatenation" ||
                operand.type === "raw_string" ||
                (operand.type === "string" && getAssignmentName(operand.text) !== operand.text)) &&
              !isPlainDeclarationOperand(
                operand.text,
                allowFunctionName,
                node.children[0]?.text === "readonly",
              )
        )
          return {
            kind: "too-complex",
            reason: `${node.children[0]?.text ?? node.type} operand '${operand.text}' is not a plain variable name \u2014 the shell expands or matches it before assigning`,
            differential: true,
          };
      }
      prevOperand = operand;
    }
  }
  if (node.type === "command") {
    let node_2 = node.children.find((child) => child !== undefined && child.type === "command_name");
    let commandNameIndex = node_2 === undefined ? -1 : node.children.indexOf(node_2);
    let filtered = node.children.filter(
      (child, childIndex) =>
        child !== undefined && childIndex > commandNameIndex && child.type !== "command_name",
    );
    if (node_2 !== undefined) {
      if (
        containsAnsiCString(node_2) &&
        filtered.some((argWord) => !/^[-+]/.test(unquoteFlagWord(argWord.text)))
      )
        return {
          kind: "too-complex",
          reason: `command head ${node_2.text} \u2014 a $'\u2026' word the shell decodes before looking the command up`,
          differential: true,
        };
      let headWord = stripQuoteChars(node_2.text);
      let remainingWords = filtered;
      let sawWrapper = false;
      let sawPrintVersionFlag = false;
      while (PREFIX_WRAPPER_RE.test(headWord) && remainingWords.length > 0) {
        sawWrapper = true;
        while (remainingWords.length > 0 && /^-/.test(unquoteFlagWord(remainingWords[0].text))) {
          let flagWord = unquoteFlagWord(remainingWords[0].text);
          if (headWord === "command" && /^-[pP]*[vV]/.test(flagWord)) sawPrintVersionFlag = true;
          remainingWords = remainingWords.slice(headWord === "exec" && /^-[cl]*a$/.test(flagWord) ? 2 : 1);
        }
        if (
          !sawPrintVersionFlag &&
          remainingWords.length > 0 &&
          containsAnsiCString(remainingWords[0]) &&
          remainingWords.slice(1).some((argWord) => !/^[-+]/.test(unquoteFlagWord(argWord.text)))
        )
          return {
            kind: "too-complex",
            reason: `command head ${remainingWords[0].text} after ${headWord} \u2014 a $'\u2026' word the shell decodes before looking the command up`,
            differential: true,
          };
        headWord = remainingWords.length > 0 ? stripQuoteChars(remainingWords[0].text) : "";
        remainingWords = remainingWords.slice(1);
      }
      let isDeclarationHead =
        sawWrapper || stripQuoteChars(node_2.text) !== node_2.text || DECLARATION_NAME_RE.test(node_2.text);
      if (!sawPrintVersionFlag && isDeclarationHead && DECLARATION_NAME_RE.test(headWord)) {
        let isIntegerHead = headWord === "integer" || headWord === "float";
        let syntheticNode = {
          ...node,
          children: [
            node_2,
            ...(isIntegerHead
              ? [
                  {
                    ...node_2,
                    text: "-i",
                  },
                ]
              : []),
            ...remainingWords,
          ],
        };
        let joined = remainingWords
          .map((argWord) => unquoteFlagWord(argWord.text))
          .filter((flagWord) => /^[-+]/.test(flagWord))
          .join("");
        let hasSemanticFlag =
          isIntegerHead ||
          (/^(?:declare|typeset|local|private)$/.test(headWord) && DECLARE_FLAG_CHARS_RE.test(joined)) ||
          (/^(?:export|readonly)$/.test(headWord) && EXPORT_FLAG_CHARS_RE.test(joined));
        let filtered = remainingWords.filter(
          (operandWord) => !/^[-+]/.test(unquoteFlagWord(operandWord.text)),
        );
        let allowFunctionName = /[fF]/.test(joined);
        let isComplex =
          (hasSemanticFlag && !areDeclareArgsSimple(syntheticNode)) ||
          remainingWords.some(
            (operandWord) => operandWord.type === "ansi_c_string" && /^\$'[-+]/.test(operandWord.text),
          );
        if (/^(?:declare|typeset|local|integer|float|private)$/.test(headWord))
          isComplex ||= filtered.some((operandWord) => !isSafeDeclarationArg(operandWord, allowFunctionName));
        else
          isComplex ||= filtered.some((operandWord) => {
            if (operandWord.type === "ansi_c_string") return true;
            let assignmentName = getAssignmentName(operandWord.text);
            return (
              /[\\'"]/.test(assignmentName.replace(/^['"]/, "").replace(/['"]$/, "")) ||
              (headWord !== "readonly" && assignmentName.includes("[")) ||
              /^['"]?\$/.test(assignmentName) ||
              ((operandWord.type === "word" ||
                operandWord.type === "concatenation" ||
                operandWord.type === "raw_string" ||
                (operandWord.type === "string" &&
                  getAssignmentName(operandWord.text) !== operandWord.text)) &&
                !isPlainDeclarationOperand(operandWord.text, allowFunctionName, headWord === "readonly"))
            );
          });
        if (isComplex)
          return {
            kind: "too-complex",
            reason: `${headWord} spelled '${sawWrapper ? `${node_2.text} \u2026` : node_2.text}' with an operand the shell would evaluate \u2014 the parser did not read this as a declaration`,
            differential: true,
          };
      }
    }
  }
  for (let child of node.children) {
    if (!child) continue;
    let childError = checkDeclarationOperands(child);
    if (childError) return childError;
  }
  return null;
}
//@ chunk-nzz6y5xm.js:21858-22331 placement (2.1.88 match: DECL_KEYWORDS, 0.884)
/**
 * 声明类命令的正则与选项规则：前缀包装（builtin/command/exec/time/coproc/noglob/nocorrect/-）、声明命令名、declare/export 会改变语义的标志字母，以及 declare/typeset/local/export/readonly 的赋值型与列出型选项。
 */
var PREFIX_WRAPPER_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DECLARATION_NAME_RE;
var DECLARE_SEMANTIC_FLAG_RE;
var DECLARE_FLAG_CHARS_RE;
var EXPORT_SEMANTIC_FLAG_RE;
var EXPORT_FLAG_CHARS_RE;
var DECLARE_OPTION_CLASSES;
var DECLARATION_OPTION_RULES;
deferInit("chunk-nzz6y5xm.js:21858", () => {
  PREFIX_WRAPPER_RE = /^(?:builtin|command|exec|time|coproc|noglob|nocorrect|-)$/;
  DECLARATION_NAME_RE = /^(?:declare|typeset|local|export|readonly|unset|integer|float|private)$/;
  DECLARE_SEMANTIC_FLAG_RE = /^[-+].*[nialuAEFLRZ]/;
  DECLARE_FLAG_CHARS_RE = /[nialuAEFLRZ]/;
  EXPORT_SEMANTIC_FLAG_RE = /^[-+].*[aAiluEFLRZ]/;
  EXPORT_FLAG_CHARS_RE = /[aAiluEFLRZ]/;
  DECLARE_OPTION_CLASSES = {
    assigning: /^[-+][rtx]+$/,
    listing: /^(?:-[fgprtxU]+|\+[grtx]+)$/,
  };
  DECLARATION_OPTION_RULES = new Map([
    ["declare", DECLARE_OPTION_CLASSES],
    ["typeset", DECLARE_OPTION_CLASSES],
    [
      "local",
      {
        assigning: DECLARE_OPTION_CLASSES.assigning,
        listing: /^-[fprtx]+$/,
      },
    ],
    [
      "export",
      {
        listing: /^-[aAfnp]+$/,
      },
    ],
    [
      "readonly",
      {
        listing: /^-[aAfpx]+$/,
      },
    ],
  ]);
});
//@ chunk-nzz6y5xm.js:22331-23275 placement
/**
 * 检查声明命令的选项组合：列举型选项与赋值同用、readonly 重复命名、选项出现在名字之后、bash/zsh 不共同支持的选项，返回理由或 null。
 */
function checkDeclarationOptions(commandName, words) {
  let optionRules = DECLARATION_OPTION_RULES.get(commandName);
  let seenNames = new Set();
  let isReadonly = commandName === "readonly";
  let sawNonOption = false;
  let listingOption;
  for (let word of words)
    if (!/^[-+]/.test(word)) {
      if (listingOption !== undefined && word.includes("="))
        return `${commandName} ${listingOption} with an assignment \u2014 not every supported bash and zsh assigns under that option, so the value cannot be statically verified`;
      let replaced = word.replace(/\+?=.*/s, "");
      if (isReadonly && word.includes("=") && seenNames.has(replaced))
        return `${commandName} names '${redactPlaceholdersForDisplay(replaced)}' twice \u2014 the first makes it read-only, so bash does not carry out the second`;
      seenNames.add(replaced);
      sawNonOption = true;
    } else if (sawNonOption)
      return `${commandName} word '${redactPlaceholdersForDisplay(word)}' comes after the options \u2014 the shell reads it as a name, which it cannot be, and bash and zsh go on from that error differently`;
    else if (word === "--") sawNonOption = true;
    else if (optionRules?.assigning?.test(word)) isReadonly ||= /^-.*r/.test(word);
    else if (optionRules?.listing.test(word)) listingOption ??= word;
    else
      return `${commandName} option '${redactPlaceholdersForDisplay(word)}' is not one bash and zsh are both known to accept \u2014 a shell that rejects it assigns nothing, so the names it declares cannot be statically verified`;
  return null;
}
//@ chunk-nzz6y5xm.js:23275-23707 placement
/**
 * 检查声明上下文分歧：local 在函数外赋值、export/readonly 给名字加数组属性，返回理由或 null。
 */
function checkDeclarationContext(commandName, words) {
  let filtered = words.filter((operandWord) => !/^[-+]/.test(operandWord));
  if (commandName === "local" && filtered.some((operandWord) => operandWord.includes("=")))
    return "'local' outside a function \u2014 bash refuses that and assigns nothing, so the value cannot be statically verified";
  if (
    (commandName === "export" || commandName === "readonly") &&
    filtered.length > 0 &&
    words.some(isSetFlagWithA)
  )
    return `'${commandName}' gives a name the array attribute \u2014 zsh empties a value it held and bash keeps it, so it cannot be statically verified`;
  return null;
}
//@ chunk-nzz6y5xm.js:23707-23766 placement
var PLAIN_VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
var FUNCTION_NAME_RE = /^[A-Za-z_][\w.:-]*$/;
//@ chunk-nzz6y5xm.js:23766-24077 placement
function isPlainDeclarationOperand(text, allowFunctionName, isReadonly = false) {
  let assignmentName = getAssignmentName(text);
  let quoteChar = text[0];
  if (quoteChar === "'" || quoteChar === '"') {
    assignmentName = assignmentName.slice(1);
    if (assignmentName.endsWith(quoteChar)) assignmentName = assignmentName.slice(0, -1);
  } else if (/^\\[A-Za-z_]/.test(assignmentName)) assignmentName = assignmentName.slice(1);
  if (isReadonly && (quoteChar === "'" || quoteChar === '"')) {
    let index = text.indexOf("[");
    let index_2 = text.indexOf(quoteChar, 1);
    if (index > 0 && index_2 > index) assignmentName = assignmentName.replace(/\[[\s\S]*$/, "");
  }
  assignmentName = assignmentName.replace(/\+$/, "");
  return (
    PLAIN_VAR_NAME_RE.test(assignmentName) || (allowFunctionName && FUNCTION_NAME_RE.test(assignmentName))
  );
}
//@ chunk-nzz6y5xm.js:24077-24165 placement
function containsAnsiCString(node) {
  return (
    node.type === "ansi_c_string" ||
    node.children.some((child) => child !== undefined && containsAnsiCString(child))
  );
}
//@ chunk-nzz6y5xm.js:24165-24237 placement
function stripQuoteChars(text) {
  return text.replace(/\$(['"])/g, "$1").replace(/["'\\]/g, "");
}
//@ chunk-nzz6y5xm.js:24237-24363 placement
var EXPANSION_NODE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EXPANSION_MASK;
deferInit("chunk-nzz6y5xm.js:24237", () => {
  EXPANSION_NODE_TYPES = new Set([
    "command_substitution",
    "process_substitution",
    "arithmetic_expansion",
    "expansion",
    "simple_expansion",
  ]);
  EXPANSION_MASK = "$_";
});
//@ chunk-nzz6y5xm.js:24363-24761 placement (2.1.88 match: mk, 0.833)
function maskExpansions(node) {
  let ranges = [];
  let walk = (current) => {
    for (let child of current.children) {
      if (!child) continue;
      if (EXPANSION_NODE_TYPES.has(child.type))
        ranges.push([child.startIndex - node.startIndex, child.endIndex - node.startIndex]);
      else walk(child);
    }
  };
  walk(node);
  if (ranges.length === 0) return node.text;
  ranges.sort((leftRange, rightRange) => leftRange[0] - rightRange[0]);
  let buffer = Buffer.from(node.text, "utf8");
  let out = "";
  let cursor = 0;
  for (let [start, end] of ranges) {
    if (start < cursor || end > buffer.length) return node.text;
    out += buffer.subarray(cursor, start).toString("utf8") + EXPANSION_MASK;
    cursor = end;
  }
  return out + buffer.subarray(cursor).toString("utf8");
}
//@ chunk-nzz6y5xm.js:24761-24908 sole-consumer
function hasParenInExpansion(node) {
  if (node.type === "expansion" && node.text.replace(/\$\(\(?|[<>]\(/g, "").includes("(")) return true;
  return node.children.some((child) => child !== undefined && hasParenInExpansion(child));
}
//@ chunk-nzz6y5xm.js:24908-25572 sole-consumer
/**
 * 判断 declare/export 等的参数是否为安全的变量名或 name=value：拒绝大括号展开、ANSI-C 字符串、展开中的括号与以 ( 开头的值，数组赋值与数字直接接受。
 */
function isSafeDeclarationArg(node, allowExtendedNames) {
  if (node.type === "number" || /^\d+$/.test(node.text)) return true;
  let masked = maskExpansions(node);
  if (
    node.type !== "raw_string" &&
    node.type !== "string" &&
    BRACE_EXPANSION_RE.test(maskBracesInQuotedContexts(masked))
  )
    return false;
  let unquoted = /^['"]/.test(masked) ? masked.slice(1) : masked;
  let eqIndex = unquoted.indexOf("=");
  let varName = (eqIndex < 0 ? unquoted : unquoted.slice(0, eqIndex)).replace(/\+$/, "");
  if (!(allowExtendedNames ? /^[A-Za-z_][\w.:-]*['"]?$/ : /^[A-Za-z_]\w*['"]?$/).test(varName)) return false;
  if (eqIndex < 0) return true;
  if (
    node.children.find(
      (child, index) => child !== undefined && index >= 2 && child.type !== "=" && child.type !== "+=",
    )?.type === "array"
  )
    return true;
  if (containsAnsiCString(node) || /\$'./.test(masked)) return false;
  if (hasParenInExpansion(node)) return false;
  let valueRest = unquoted.slice(eqIndex + 1);
  for (;;)
    if (/^[\\'"]/.test(valueRest)) valueRest = valueRest.slice(1);
    else if (/^\$['"]/.test(valueRest)) valueRest = valueRest.slice(2);
    else if (valueRest.startsWith(EXPANSION_MASK)) valueRest = valueRest.slice(EXPANSION_MASK.length);
    else break;
  return !valueRest.startsWith("(");
}
//@ chunk-nzz6y5xm.js:25572-25853 sole-consumer
function getAssignmentName(text) {
  let bracketDepth = 0;
  let otherQuote = null;
  let outerQuote = text[0] === "'" || text[0] === '"' ? text[0] : null;
  for (let index = outerQuote === null ? 0 : 1; index < text.length; index += 1) {
    let char = text[index];
    if (otherQuote !== null) {
      if (char === otherQuote) otherQuote = null;
    } else if ((char === "'" || char === '"') && char !== outerQuote) otherQuote = char;
    else if (char === "[") bracketDepth += 1;
    else if (char === "]" && bracketDepth > 0) bracketDepth -= 1;
    else if (char === "=" && bracketDepth === 0) return text.slice(0, index);
  }
  return text;
}
//@ chunk-nzz6y5xm.js:25937-26064 sole-consumer
function isOnlyBlankBetween(bytes, start, end) {
  let index = start;
  while (index < end) {
    let byte = bytes[index];
    if (byte === 32 || byte === 9) index += 1;
    else if (byte === 92 && bytes[index + 1] === 10) index += 2;
    else return false;
  }
  return true;
}
//@ chunk-nzz6y5xm.js:26064-26434 sole-consumer
/**
 * 判断 declare 类命令的各参数是否都是简单赋值：带 -i/-E/-F 时只允许算术表达式值，否则只允许普通字符串或简单数组。
 */
function areDeclareArgsSimple(node) {
  let joined = node.children
    .map((child) => (child === undefined ? "" : unquoteFlagWord(child.text)))
    .filter((flagWord) => /^[-+]/.test(flagWord))
    .join("");
  let argPattern = /[iEF]/.test(joined)
    ? /^[A-Za-z_][\w.-]*=(?:(['"]?)[0-9+\-*\/% ().]*\1|\([0-9+\-*\/% ().\s]*\))$/
    : /^[A-Za-z_][\w.-]*(?:\+?=(?:(['"]?)[\w.\/ -]*\1|\([\w\s.\/-]*\)))?$/;
  return node.children.every((child, index) => {
    if (!child || index === 0 || /^[-+]/.test(unquoteFlagWord(child.text))) return true;
    return argPattern.test(child.text);
  });
}
//@ chunk-nzz6y5xm.js:26434-26544 sole-consumer
function unquoteFlagWord(text) {
  let match = /^\$?(['"])([-+][^'"]*)\1$/.exec(text);
  if (match) return match[2];
  return /^\\[-+]/.test(text) ? text.slice(1) : text;
}
//@ chunk-nzz6y5xm.js:26544-26601 sole-consumer
var LOOP_STATEMENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_LOOP_NESTING;
deferInit("chunk-nzz6y5xm.js:26544", () => {
  LOOP_STATEMENT_TYPES = new Set(["for_statement", "while_statement"]);
  MAX_LOOP_NESTING = 5;
});
//@ chunk-nzz6y5xm.js:26601-26644 sole-consumer
function isLoopBlockedByEnvScrub(node) {
  return LOOP_STATEMENT_TYPES.has(node.type) && isScrubEnabled();
}
//@ chunk-nzz6y5xm.js:26644-27061 callgraph-witnessed (2.1.88 match: walkProgram, 0.33)
/**
 * 遍历 program：先跑 Tar 预检，再 collectCommands 收集命令与裸赋值名；对每条命令检查 zsh stat -A/-H 与声明上下文（local 在函数外等）。返回 {kind:'simple', commands, bareAssignmentNames, hasLoop}。
 */
function walkProgram(root) {
  let preCheck = scanSameLineStatementSplits(root);
  if (preCheck) return preCheck;
  let commands = [];
  let varScope = new Map();
  let bareAssignmentNames = [];
  let error = collectCommands(root, commands, varScope, bareAssignmentNames);
  if (error) return error;
  let hasLoop = [...LOOP_STATEMENT_TYPES].some((loopType) => collectCommandSubstitution(root, loopType));
  let lastCommand = hasLoop ? undefined : commands.at(-1);
  for (let command of readingDivergentShapes ? [] : commands) {
    let [name = "", ...args] = command.argv;
    let reason =
      zshStatWritesVarReason(name, args) ??
      (command === lastCommand ? null : checkDeclarationContext(name, args));
    if (reason !== null)
      return {
        kind: "too-complex",
        reason,
        divergentShape: true,
        ...(command.argvUnquotedGlob === undefined && {
          nodeType: "declaration_command",
        }),
      };
  }
  return {
    kind: "simple",
    commands,
    bareAssignmentNames,
    hasLoop,
  };
}
//@ chunk-nzz6y5xm.js:27061-27228 layout (2.1.88 match: mk, 0.833)
function isSameLine(parent, left, right) {
  return !Buffer.from(parent.text, "utf8")
    .subarray(left.endIndex - parent.startIndex, right.startIndex - parent.startIndex)
    .toString("utf8")
    .replace(/\\\r?\n/g, "").includes(`
`);
}
//@ chunk-nzz6y5xm.js:27228-27633 layout (2.1.88 match: extractCompoundStructure, 0.753)
var STATEMENT_NODE_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SCOPED_STATEMENT_TYPES;
deferInit("chunk-nzz6y5xm.js:27228", () => {
  STATEMENT_NODE_TYPES = new Set([
    "command",
    "variable_assignment",
    "variable_assignments",
    "list",
    "pipeline",
    "redirected_statement",
    "negated_command",
    "declaration_command",
    "unset_command",
    "test_command",
    "subshell",
    "compound_statement",
    "if_statement",
    "while_statement",
    "for_statement",
    "case_statement",
    "function_definition",
    "ERROR",
  ]);
  SCOPED_STATEMENT_TYPES = new Set([
    "negated_command",
    "if_statement",
    "while_statement",
    "for_statement",
    "subshell",
  ]);
});
//@ chunk-nzz6y5xm.js:27633-28342 facade-majority
/**
 * 递归扫描同一行上紧贴前一语句的语句或 (…) 组：bash 会把它们读成一条命令或报错，zsh 会当成 glob 组，存在解析分歧，返回 too-complex（differential）。
 */
function scanSameLineStatementSplits(node) {
  let previousStatement = null;
  for (let child of node.children) {
    if (!child) continue;
    if (STATEMENT_NODE_TYPES.has(child.type)) {
      if (previousStatement !== null) {
        let inner = child;
        while (STRUCTURAL_TYPES.has(inner.type)) {
          let found = inner.children.find((child) => child != null);
          if (!found) break;
          inner = found;
        }
        if (SCOPED_STATEMENT_TYPES.has(inner.type) && isSameLine(node, previousStatement, inner))
          return {
            kind: "too-complex",
            reason:
              inner.type === "subshell"
                ? "`(\u2026)` group directly follows a statement or word on the same line \u2014 bash rejects the line, but zsh reads the glued `(\u2026)` as a glob-group word and expands what follows it"
                : "statement directly follows another statement on the same line \u2014 bash reads the text as one command (`!` and shell keywords are plain words after an assignment), not two statements",
            differential: true,
          };
      }
      previousStatement = child;
    } else previousStatement = null;
    let failure = scanSameLineStatementSplits(child);
    if (failure) return failure;
  }
  return null;
}
//@ chunk-nzz6y5xm.js:28342-40829 fingerprint (2.1.88 match: collectCommands, 0.636)
/**
 * 递归收集简单命令（2.1.88 collectCommands 的大幅扩展版）：处理 command、redirected_statement、program/list/pipeline（|| 与 & 分支复制作用域，pipeline 末段外的赋值不外泄）、negated_command、declaration_command（declare/typeset/local/export/readonly 的大量 zsh/bash 分歧检查与变量跟踪）、variable_assignment（执行影响变量、整数属性变量拒绝）、for/while/if（作用域合并与循环变量限制）、subshell、test_command、unset_command；不认识的节点交给 tooComplex。返回 null 表示继续，返回结果对象表示终止。
 */
function collectCommands(node, commands, varScope, bareAssignmentNames, isProgramChild = false) {
  if (node.type === "command") {
    let result = walkCommand(node, [], commands, varScope, bareAssignmentNames);
    if (result.kind !== "simple") return result;
    commands.push(...result.commands);
    return null;
  }
  if (node.type === "redirected_statement")
    return walkRedirectedStatement(node, commands, varScope, bareAssignmentNames, isProgramChild);
  if (node.type === "comment") return null;
  if (STRUCTURAL_TYPES.has(node.type)) {
    let isPipeline = node.type === "pipeline";
    let commandsBefore = commands.length;
    let needsSnapshot = false;
    if (!isPipeline) {
      for (let child of node.children)
        if (child && (child.type === "||" || child.type === "&")) {
          needsSnapshot = true;
          break;
        }
    }
    let snapshotScope = needsSnapshot ? new Map(varScope) : null;
    let branchScope = isPipeline ? new Map(varScope) : varScope;
    let unsettledNames = null;
    for (let child of node.children) {
      if (!child) continue;
      if (SEPARATOR_TYPES.has(child.type)) {
        if (child.type === "||" || child.type === "|" || child.type === "|&" || child.type === "&") {
          if (child.type === "||") {
            unsettledNames ??= new Set();
            if (loopDepth === 0) for (let key of varScope.keys()) unsettledNames.add(key);
            let sourceScope = snapshotScope ?? varScope;
            branchScope = new Map(sourceScope);
            for (let [key, value] of varScope)
              if (sourceScope.get(key) !== value) markVarUnknown(branchScope, key);
            for (let key of sourceScope.keys()) if (!varScope.has(key)) markVarUnknown(branchScope, key);
          } else branchScope = new Map(snapshotScope ?? varScope);
        } else if (unsettledNames !== null) {
          for (let key of unsettledNames) markVarUnknown(varScope, key);
          unsettledNames = null;
          branchScope = varScope;
        }
        continue;
      }
      let err = collectCommands(child, commands, branchScope, bareAssignmentNames, node.type === "program");
      if (err) return err;
      if (unsettledNames !== null && loopDepth > 0) mergeScopeInto(varScope, branchScope);
    }
    if (unsettledNames !== null) for (let key of unsettledNames) markVarUnknown(varScope, key);
    if (isPipeline) {
      mergeScopeInto(varScope, branchScope);
      if (commands.length === commandsBefore) pushTrueCommand(commands, node);
    }
    return null;
  }
  if (node.type === "negated_command") {
    let commandsBefore = commands.length;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "!") continue;
      let commands_2 = collectCommands(child, commands, varScope, bareAssignmentNames);
      if (commands_2) return commands_2;
    }
    if (commands.length === commandsBefore) pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "declaration_command") {
    let commandsBefore = commands.length;
    let any = node.children.some((child) => child !== null && containsArithmeticExpansion(child));
    let checkArithmetic = (name, value) => {
      if (!any) return null;
      let trackedValue = varScope.get(name);
      let _ = commandsBefore === 0 && !containsAnyPlaceholder(value);
      let valueTracked = trackedValue !== undefined && !containsAnyPlaceholder(trackedValue);
      return _ || valueTracked
        ? divergentShapeResult(
            `'${name}' is assigned by a declaration carrying an expansion that can fail at runtime, which assigns nothing when it fails \u2014 its value cannot be statically verified`,
          )
        : null;
    };
    let carveOutsBefore = quoteScanCarveOutCount;
    let varScope_2 = new Map(varScope);
    let sawFunctionFlag = false;
    let sawUpperFlag = false;
    let argv = [];
    let previousEnd = -1;
    for (let child of node.children) {
      if (!child) continue;
      let gluedToPrevious = child.startIndex === previousEnd;
      switch (((previousEnd = child.endIndex), child.type)) {
        case "export":
        case "local":
        case "readonly":
        case "declare":
        case "typeset":
          argv.push(child.text);
          break;
        case "word":
        case "number":
        case "raw_string":
        case "string":
        case "concatenation": {
          if (gluedToPrevious)
            return {
              kind: "too-complex",
              reason: `${argv[0] ?? "declaration"} operand is split across adjacent quoted segments \u2014 the shell joins them into one word the analyzer cannot verify`,
              differential: true,
            };
          let word = walkArgument(child, commands, varScope_2, bareAssignmentNames);
          if (typeof word !== "string") return word;
          if (/^[+-].*m/.test(word))
            return {
              kind: "too-complex",
              reason: `${argv[0]} flag ${word} \u2014 zsh -m/+m pattern-assigns every matching variable; cannot statically model target set`,
              nodeType: "declaration_command",
            };
          if (
            argv[0] === "declare" ||
            argv[0] === "typeset" ||
            argv[0] === "local" ||
            argv[0] === "readonly"
          ) {
            if (/^[+-].*f/.test(word)) sawFunctionFlag = true;
            if (/^[+-].*[uU]/.test(word)) sawUpperFlag = true;
            if (sawFunctionFlag && sawUpperFlag)
              return {
                kind: "too-complex",
                reason: `${argv[0]} with both -f and -u/-U flags \u2014 zsh marks a function for autoload (synonym of 'autoload'), creating a function from file contents at call time`,
                nodeType: "declaration_command",
              };
          }
          if (
            (argv[0] === "declare" || argv[0] === "typeset" || argv[0] === "local") &&
            DECLARE_SEMANTIC_FLAG_RE.test(word)
          )
            return {
              kind: "too-complex",
              reason: `declare flag ${word} changes assignment semantics (nameref/integer/float/array/width-truncation/case-conversion)`,
              ...(areDeclareArgsSimple(node)
                ? {
                    nodeType: "declaration_command",
                  }
                : {
                    differential: true,
                  }),
            };
          if (
            (argv[0] === "export" || argv[0] === "readonly") &&
            isSetFlagWithA(word) &&
            !areDeclareArgsSimple(node)
          )
            return {
              kind: "too-complex",
              reason: `${argv[0]} flag ${word} with an operand bash would evaluate as a compound array assignment`,
              differential: true,
            };
          if ((argv[0] === "export" || argv[0] === "readonly") && /^[+-].*[iluEFLRZ]/.test(word))
            return {
              kind: "too-complex",
              reason: `${argv[0]} flag ${word} \u2014 zsh bin_typeset mathevals (-i/-E/-F), width-truncates (-L/-R/-Z), or case-converts (-l/-u) the assigned value`,
              ...(areDeclareArgsSimple(node)
                ? {
                    nodeType: "declaration_command",
                  }
                : {
                    differential: true,
                  }),
            };
          if (/^[+-].*T/.test(word))
            return {
              kind: "too-complex",
              reason: `${argv[0]} -T creates a user-defined zsh tied pair \u2014 tracked literals for its operands are unreliable`,
              nodeType: "declaration_command",
            };
          if (
            (argv[0] === "declare" || argv[0] === "typeset" || argv[0] === "local" || argv[0] === "export") &&
            word[0] !== "-" &&
            /^[^=]*\[/.test(word)
          )
            return {
              kind: "too-complex",
              reason: `${argv[0]} positional '${word}' contains array subscript \u2014 zsh/bash evaluate $(cmd) in subscripts`,
              differential: true,
            };
          if (
            (argv[0] === "declare" || argv[0] === "typeset" || argv[0] === "local") &&
            !/^[-+]/.test(word) &&
            !isSafeDeclarationArg(
              child,
              argv.some((existingFlag) => /^[-+][A-Za-z]*[fF]/.test(existingFlag)),
            )
          )
            return {
              kind: "too-complex",
              reason: `${argv[0]} operand '${child.text}' is not a plain NAME with an inert value \u2014 the shell may re-parse it as a subscript, an expanded name or a compound assignment`,
              differential: true,
            };
          if (word[0] !== "-") {
            let index = word.indexOf("=");
            if (index > 0) {
              let sliced = word.slice(0, index);
              if (/^[A-Za-z_][A-Za-z0-9_]*\+?$/.test(sliced)) {
                let isAppend = sliced.endsWith("+");
                let varName = isAppend ? sliced.slice(0, -1) : sliced;
                let refusal = checkArithmetic(varName, word.slice(index + 1));
                if (refusal) return refusal;
                applyVarToScope(
                  varScope,
                  {
                    name: varName,
                    value: word.slice(index + 1),
                    isAppend,
                  },
                  commandsBefore > 0,
                );
                bareAssignmentNames.push(varName);
              }
            }
          }
          argv.push(word);
          break;
        }
        case "variable_assignment": {
          if (
            (argv[0] === "declare" || argv[0] === "typeset" || argv[0] === "local") &&
            !isSafeDeclarationArg(
              child,
              argv.some((existingFlag) => /^[-+][A-Za-z]*[fF]/.test(existingFlag)),
            )
          )
            return {
              kind: "too-complex",
              reason: `${argv[0]} operand '${child.text}' is not a plain NAME with an inert value \u2014 the shell may re-parse it as a subscript, an expanded name or a compound assignment`,
              differential: true,
            };
          let assignment = walkVariableAssignment(child, commands, varScope_2, bareAssignmentNames);
          if ("kind" in assignment) return assignment;
          let refusal = checkArithmetic(assignment.name, assignment.value);
          if (refusal) return refusal;
          applyVarToScope(varScope, assignment, commandsBefore > 0);
          bareAssignmentNames.push(assignment.name);
          argv.push(`${assignment.name}=${assignment.value}`);
          break;
        }
        case "variable_name": {
          let text = child.text;
          if (
            (argv[0] === "declare" || argv[0] === "typeset" || argv[0] === "local" || argv[0] === "export") &&
            text[0] !== "-" &&
            /^[^=]*\[/.test(text)
          )
            return {
              kind: "too-complex",
              reason: `${argv[0]} positional '${text}' contains array subscript \u2014 backslash-escaped form de-escapes to [$(cmd)] at runtime`,
              differential: true,
            };
          let any = argv.some((existingFlag) => /^-[A-Za-z]*[fF]/.test(existingFlag));
          if (!PLAIN_VAR_NAME_RE.test(text) && !(any && FUNCTION_NAME_RE.test(text)))
            return {
              kind: "too-complex",
              reason: `${argv[0]} operand '${text}' is not a plain variable name \u2014 the shell may turn it into an assignment the parser did not see`,
              differential: true,
            };
          argv.push(text);
          break;
        }
        case "ansi_c_string":
          return {
            kind: "too-complex",
            reason: `${argv[0] ?? "declaration"} operand ${child.text} \u2014 a $'\u2026' word the shell decodes, which may carry a subscript the parser cannot read`,
            differential: true,
          };
        default:
          return tooComplex(child);
      }
    }
    let refusal = checkDeclarationOptions(argv[0] ?? "", argv.slice(1));
    if (refusal !== null && !readingDivergentShapes)
      return {
        kind: "too-complex",
        reason: refusal,
        divergentShape: true,
        ...(areDeclareArgsSimple(node) && {
          nodeType: "declaration_command",
        }),
      };
    commands.push({
      argv,
      envVars: [],
      redirects: [],
      text: node.text,
      hasUnquotedGlob: hasUnquotedGlob(node.text),
      carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== carveOutsBefore,
    });
    return null;
  }
  if (node.type === "variable_assignment") {
    let commandsBefore = commands.length;
    let assignment = walkVariableAssignment(node, commands, varScope, bareAssignmentNames);
    if ("kind" in assignment) return assignment;
    if (isExecInfluencingVar(assignment.name))
      return {
        kind: "too-complex",
        reason: `${assignment.name} assignment alters command lookup/execution for subsequent commands`,
        nodeType: "variable_assignment",
      };
    if (isIntegerVarAssignUnsafe(assignment.name, assignment.value))
      return {
        kind: "too-complex",
        reason: `${assignment.name} has integer attribute \u2014 assignment arith-evals RHS, which can execute subscript command substitution or abort/diverge at runtime`,
        nodeType: "variable_assignment",
      };
    applyVarToScope(varScope, assignment, commandsBefore > 0);
    bareAssignmentNames.push(assignment.name);
    if (
      commands.length === commandsBefore &&
      (containsArithmeticExpansion(node) || BASH_READONLY_SPECIAL_VARS.has(assignment.name))
    )
      pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "for_statement") {
    if (isLoopBlockedByEnvScrub(node)) return tooComplex(node);
    let loopWrites = collectLoopWrites(node, commands, varScope, bareAssignmentNames);
    if ("kind" in loopWrites) return loopWrites;
    let loopVar = null;
    let doGroup = null;
    let commandsBefore = commands.length;
    let needsTrueCommand = false;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "variable_name") loopVar = child.text;
      else if (child.type === "do_group") doGroup = child;
      else if (child.type === "select")
        return {
          kind: "too-complex",
          reason: "select statement reads stdin into $REPLY; cannot statically model",
          nodeType: "for_statement",
        };
      else if (child.type === "for" || child.type === "in" || child.type === ";") continue;
      else if (child.type === "command_substitution") {
        let err = walkCommandSubstitution(child, commands, varScope, bareAssignmentNames);
        if (err) return err;
      } else {
        let arg = walkArgument(child, commands, varScope, bareAssignmentNames);
        if (typeof arg !== "string") return arg;
        if (containsArithmeticExpansion(child)) needsTrueCommand = true;
        else if ((hasUnquotedGlob(child.text) || nodeHasUnquotedGlob(child)) && isVastPuddleEnabled())
          needsTrueCommand = true;
      }
    }
    if (loopVar === null || doGroup === null) return tooComplex(node);
    if (
      loopVar === "PS4" ||
      loopVar === "IFS" ||
      BASH_READONLY_SPECIAL_VARS.has(loopVar) ||
      loopVar === "BASH_ARGV0" ||
      isExecInfluencingVar(loopVar) ||
      INTEGER_ATTR_DEFAULT_VARS.has(loopVar) ||
      SAFE_ENV_VARS.has(loopVar) ||
      BASH_IMPLICITLY_REBOUND_VARS.has(loopVar)
    )
      return {
        kind: "too-complex",
        reason: `${loopVar} as loop variable bypasses assignment validation`,
        nodeType: "for_statement",
      };
    let trackedValue = varScope.get(loopVar);
    if (trackedValue !== undefined && !containsAnyPlaceholder(trackedValue))
      return {
        kind: "too-complex",
        reason: `for-loop variable '${loopVar}' would overwrite tracked literal ${JSON.stringify(trackedValue.slice(0, 40))}; post-loop value cannot be statically determined`,
        nodeType: "for_statement",
      };
    varScope.delete(loopVar);
    bareAssignmentNames.push(loopVar);
    let bodyScope = new Map(varScope);
    markLoopWritesUnknown(bodyScope, doGroup);
    for (let loopWrite of loopWrites) markVarUnknown(bodyScope, loopWrite);
    bodyScope.delete(loopVar);
    for (let child of doGroup.children) {
      if (!child) continue;
      if (child.type === "do" || child.type === "done" || child.type === ";") continue;
      let err = collectCommands(child, commands, bodyScope, bareAssignmentNames);
      if (err) return err;
    }
    mergeScopeInto(varScope, bodyScope);
    if (needsTrueCommand && commands.length === commandsBefore) pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "if_statement" || node.type === "while_statement") {
    if (isLoopBlockedByEnvScrub(node)) return tooComplex(node);
    let keysBeforeLoop = null;
    let scopeBeforeCondition = null;
    if (node.type === "while_statement") {
      let loopWrites = collectLoopWrites(node, commands, varScope, bareAssignmentNames);
      if ("kind" in loopWrites) return loopWrites;
      keysBeforeLoop = new Set(varScope.keys());
      scopeBeforeCondition = new Map(varScope);
      markLoopWritesUnknown(varScope, node);
      for (let loopWrite of loopWrites) {
        markVarUnknown(varScope, loopWrite);
        markVarUnknown(scopeBeforeCondition, loopWrite);
      }
    }
    let seenThen = false;
    for (let child of node.children) {
      if (!child) continue;
      if (
        child.type === "if" ||
        child.type === "fi" ||
        child.type === "else" ||
        child.type === "elif" ||
        child.type === "while" ||
        child.type === "until" ||
        child.type === ";"
      )
        continue;
      if (child.type === "then") {
        seenThen = true;
        continue;
      }
      if (child.type === "do_group") {
        let bodyScope = new Map(varScope);
        markLoopWritesUnknown(bodyScope, child);
        for (let child_2 of child.children) {
          if (!child_2) continue;
          if (child_2.type === "do" || child_2.type === "done" || child_2.type === ";") continue;
          let err = collectCommands(child_2, commands, bodyScope, bareAssignmentNames);
          if (err) return err;
        }
        mergeScopeInto(varScope, bodyScope);
        continue;
      }
      if (child.type === "elif_clause" || child.type === "else_clause") {
        let branchScope = new Map(varScope);
        for (let child_2 of child.children) {
          if (!child_2) continue;
          if (
            child_2.type === "elif" ||
            child_2.type === "else" ||
            child_2.type === "then" ||
            child_2.type === ";"
          )
            continue;
          let err = collectCommands(child_2, commands, branchScope, bareAssignmentNames);
          if (err) return err;
        }
        mergeScopeInto(varScope, branchScope);
        continue;
      }
      let branchScope = new Map(varScope);
      let before = commands.length;
      let err = collectCommands(child, commands, branchScope, bareAssignmentNames);
      if (err) return err;
      if (!seenThen) {
        for (let [key, value] of branchScope) {
          let trackedValue = (scopeBeforeCondition ?? varScope).get(key);
          if (trackedValue !== undefined && !containsAnyPlaceholder(trackedValue) && value !== trackedValue)
            return {
              kind: "too-complex",
              reason: `'${key}' was tracked as literal '${trackedValue}' but condition may modify it (||/pipeline/unset/&&-short-circuit) \u2014 cannot prove downstream value`,
              nodeType: node.type,
            };
          if (trackedValue?.includes(UNCERTAIN_VAR_PLACEHOLDER) === true && value !== trackedValue) {
            varScope.set(key, trackedValue);
            continue;
          }
          varScope.set(key, value);
        }
        for (let key of varScope.keys())
          if (!branchScope.has(key)) {
            let trackedValue = (scopeBeforeCondition ?? varScope).get(key);
            if (trackedValue !== undefined && !containsAnyPlaceholder(trackedValue))
              return {
                kind: "too-complex",
                reason: `'${key}' was tracked as literal '${trackedValue}' but condition may unset it (&&-short-circuit) \u2014 cannot prove downstream value`,
                nodeType: node.type,
              };
            markVarUnknown(varScope, key);
          }
        for (let i = before; i < commands.length; i++) {
          let command = commands[i];
          if (command?.argv[0] === "read" && !isBashReadingMode()) {
            for (let arg of command.argv.slice(1))
              if (!arg.startsWith("-") && /^[A-Za-z_][A-Za-z0-9_]*$/.test(arg)) {
                let existing = varScope.get(arg);
                if (existing !== undefined && !containsAnyPlaceholder(existing))
                  return {
                    kind: "too-complex",
                    reason: `'read ${arg}' in condition may not execute (||/pipeline/subshell); cannot prove it overwrites tracked literal '${existing}'`,
                    nodeType: node.type,
                  };
                markVarUnknown(varScope, arg);
              }
            let trackedReply = varScope.get("REPLY");
            if (trackedReply !== undefined && !containsAnyPlaceholder(trackedReply))
              return {
                kind: "too-complex",
                reason: `'read' in condition may write stdin to REPLY; cannot prove it overwrites tracked literal '${trackedReply}'`,
                nodeType: node.type,
              };
            markVarUnknown(varScope, "REPLY");
          }
        }
      } else mergeScopeInto(varScope, branchScope);
    }
    if (keysBeforeLoop !== null) {
      for (let key of [...varScope.keys()]) if (!keysBeforeLoop.has(key)) varScope.delete(key);
    }
    return null;
  }
  if (node.type === "subshell") {
    let innerScope = new Map(varScope);
    let commandsBefore = commands.length;
    let sawContent = false;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "(" || child.type === ")") continue;
      if (child.type !== "comment") sawContent = true;
      let err = collectCommands(child, commands, innerScope, bareAssignmentNames);
      if (err) return err;
    }
    if (sawContent && commands.length === commandsBefore) pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "test_command") {
    let any = node.children.some((child) => child?.type === "[[");
    let testCommandGap = findTestCommandGap(node, any);
    if (testCommandGap) return testCommandGap;
    let argv = ["[["];
    let carveOutsBefore = quoteScanCarveOutCount;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "[[" || child.type === "]]" || child.type === "[" || child.type === "]") continue;
      let err = walkTestExpr(child, argv, commands, varScope, bareAssignmentNames, any);
      if (err) return err;
    }
    commands.push({
      argv,
      envVars: [],
      redirects: [],
      text: node.text,
      hasUnquotedGlob: hasUnquotedGlob(node.text),
      carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== carveOutsBefore,
    });
    return null;
  }
  if (node.type === "unset_command") {
    let argv = [];
    let carveOutsBefore = quoteScanCarveOutCount;
    let hasPriorCommands = commands.length > 0;
    let sawFunctionFlag = false;
    let sawOperand = false;
    let isUnsetenv = false;
    for (let child of node.children) {
      if (!child) continue;
      switch (child.type) {
        case "unset":
          argv.push(child.text);
          isUnsetenv = child.text === "unsetenv";
          break;
        case "variable_name":
          if (!PLAIN_VAR_NAME_RE.test(child.text) && !(sawFunctionFlag && FUNCTION_NAME_RE.test(child.text)))
            return {
              kind: "too-complex",
              reason: `${argv[0] ?? "unset"} operand '${child.text}' is not a plain variable name \u2014 the shell may expand or evaluate it`,
              differential: true,
            };
          argv.push(child.text);
          sawOperand = true;
          if (sawFunctionFlag || isUnsetenv) {
            let refusal = uncertainValueResult(
              varScope.get(child.text),
              `'${child.text}' no longer has a statically known value at this unset \u2014 cannot verify what the command leaves behind`,
              "unset_command",
            );
            if (refusal !== null) return refusal;
            break;
          }
          if (isAssignmentNameUnsafeForSandbox(child.text))
            return {
              kind: "too-complex",
              reason: `'unset' targets shell variable ${child.text} (exec-influencing / integer-attr / IFS / PS4)`,
              nodeType: "unset_command",
            };
          recordUnset(varScope, child.text, hasPriorCommands);
          break;
        case "word": {
          let name = walkArgument(child, commands, varScope, bareAssignmentNames);
          if (typeof name !== "string") return name;
          if (name.startsWith("-")) {
            if (sawOperand) return tooComplex(child);
            if (name !== "-f" && name !== "-v") return tooComplex(child);
            if (name === "-f") sawFunctionFlag = true;
            argv.push(name);
            break;
          }
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return tooComplex(child);
          argv.push(name);
          sawOperand = true;
          if (sawFunctionFlag || isUnsetenv) {
            let refusal = uncertainValueResult(
              varScope.get(name),
              `'${name}' no longer has a statically known value at this unset \u2014 cannot verify what the command leaves behind`,
              "unset_command",
            );
            if (refusal !== null) return refusal;
            break;
          }
          if (isAssignmentNameUnsafeForSandbox(name))
            return {
              kind: "too-complex",
              reason: `'unset' targets shell variable ${name} (exec-influencing / integer-attr / IFS / PS4)`,
              nodeType: "unset_command",
            };
          recordUnset(varScope, name, hasPriorCommands);
          break;
        }
        case "ansi_c_string":
        case "raw_string":
        case "string":
        case "concatenation":
          if (/\[/.test(child.text) || child.type === "ansi_c_string")
            return {
              kind: "too-complex",
              reason: `${argv[0] ?? "unset"} operand ${child.text} carries a subscript \u2014 bash and zsh evaluate $(cmd) inside it`,
              differential: true,
            };
          return tooComplex(child);
        default:
          return tooComplex(child);
      }
    }
    commands.push({
      argv,
      envVars: [],
      redirects: [],
      text: node.text,
      hasUnquotedGlob: hasUnquotedGlob(node.text),
      carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== carveOutsBefore,
    });
    return null;
  }
  return tooComplex(node);
}
//@ chunk-nzz6y5xm.js:40829-40934 fingerprint (2.1.88 match: walkTestExpr, 0.753)
var TEST_EXPRESSION_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nzz6y5xm.js:40829", () => {
  TEST_EXPRESSION_TYPES = new Set([
    "unary_expression",
    "binary_expression",
    "negated_expression",
    "parenthesized_expression",
  ]);
});
//@ chunk-nzz6y5xm.js:40934-41171 layout
function isBlankTestGap(text, allowComments) {
  let index = 0;
  while (index < text.length) {
    let char = text[index];
    if (char === " " || char === "\t") {
      index++;
      continue;
    }
    if (
      char === "\\" &&
      text[index + 1] ===
        `
`
    ) {
      index += 2;
      continue;
    }
    if (
      allowComments &&
      char ===
        `
`
    ) {
      index++;
      continue;
    }
    if (allowComments && char === "#") {
      index++;
      while (
        index < text.length &&
        text[index] !==
          `
`
      )
        index++;
      continue;
    }
    return false;
  }
  return true;
}
//@ chunk-nzz6y5xm.js:41171-41821 layout
function findTestCommandGap(node, allowComments) {
  let buffer = Buffer.from(node.text, "utf8");
  let startIndex = node.startIndex;
  for (let child of node.children) {
    if (!child) continue;
    if (child.startIndex > startIndex) {
      let text = buffer
        .subarray(startIndex - node.startIndex, child.startIndex - node.startIndex)
        .toString("utf8");
      if (!isBlankTestGap(text, allowComments))
        return {
          kind: "too-complex",
          reason:
            "Test command has unparsed bytes between children \u2014 parser dropped content that shell will see",
        };
    }
    startIndex = Math.max(startIndex, child.endIndex);
    if (TEST_EXPRESSION_TYPES.has(child.type)) {
      let testCommandGap = findTestCommandGap(child, allowComments);
      if (testCommandGap) return testCommandGap;
    }
  }
  if (startIndex < node.endIndex) {
    let text = buffer.subarray(startIndex - node.startIndex).toString("utf8");
    if (!isBlankTestGap(text, allowComments))
      return {
        kind: "too-complex",
        reason:
          "Test command has unparsed bytes after its last child \u2014 parser dropped content that shell will see",
      };
  }
  return null;
}
//@ chunk-nzz6y5xm.js:41821-42165 layout
function hasZshEqualsProcSubst(text) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let sawSeparator = false;
  let parenDepth = 0;
  let prevChar;
  for (let index = 0; index < text.length; index++) {
    let char = text[index];
    if (!inSingleQuote && char === "\\") {
      index++;
      continue;
    }
    if (!inDoubleQuote && char === "'") {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (!inSingleQuote && char === '"') {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    if (!inSingleQuote && !inDoubleQuote) {
      if (char === "=" && text[index + 1] === "(" && (sawSeparator || index === 0 || prevChar === "|"))
        return true;
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth = Math.max(0, parenDepth - 1);
      else if (parenDepth === 0 && (char === "|" || char === "&") && prevChar === char) sawSeparator = true;
      prevChar = char;
    }
  }
  return false;
}
//@ chunk-nzz6y5xm.js:42165-42437 facade-majority
/**
 * 文本中是否有独立的 ]]（排除 [[:class:]] 等字符类写法，以及两侧都是单词字符的情况），用于发现 [[ ]] 条件的提前闭合。
 */
function containsStandaloneCondCloser(text) {
  let replaced = text.replace(/\[(?::[a-zA-Z]+:|=[A-Za-z0-9-]*=|\.[A-Za-z0-9-]*\.|[!^]?)\]\](?!\])/g, "\x00");
  let isWordChar = /[A-Za-z0-9_]/;
  let index = replaced.indexOf("]]");
  while (index !== -1) {
    let prevChar = index > 0 ? replaced[index - 1] : "";
    let nextChar = index + 2 < replaced.length ? replaced[index + 2] : "";
    if (!(isWordChar.test(prevChar) && isWordChar.test(nextChar))) return true;
    index = replaced.indexOf("]]", index + 1);
  }
  return false;
}
//@ chunk-nzz6y5xm.js:42437-42545 facade-majority
var ZSH_SUBSCRIPT_OR_MODIFIER_RE = /^([\w\u0080-\uffff]*|[-?*@!#])(\[|:[a-zA-Z&])/;
var ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE = /^([\w\u0080-\uffff]*|[-?*@!#$])(\[|:[a-zA-Z&])/;
//@ chunk-nzz6y5xm.js:42545-46036 layout
/**
 * 遍历 [[ ]]/[ ] 内表达式，把运算符和操作数压入 argv：拒绝 zsh $name[expr]、!( 粘连、regex/extglob 中的展开/进程替换/=(CMD)/未加引号 &/粘连 ||/括号不平衡、独立 ]] 闭合符等 shell 词法分歧。
 */
function walkTestExpr(node, argv, innerCommands, varScope, bareAssignmentNames, isDoubleBracket) {
  if (TEST_EXPRESSION_TYPES.has(node.type)) {
    for (let childIndex = 0; childIndex < node.children.length; childIndex++) {
      let node_2 = node.children[childIndex];
      if (!node_2) continue;
      if (
        (node_2.type === "simple_expansion" || node_2.type === "expansion") &&
        (node.children[childIndex + 1]?.text.startsWith("[") ||
          /^:[a-zA-Z&]/.test(node.children[childIndex + 1]?.text ?? "") ||
          (node_2.children.some((child) => child?.type === "special_variable_name") &&
            ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE.test(node.children[childIndex + 1]?.text ?? "")))
      )
        return {
          kind: "too-complex",
          reason: "zsh $name[expr] / $name:mod in [[ ]] operand \u2014 recursive eval",
          differential: true,
        };
      if (
        isDoubleBracket &&
        node_2.type === "!" &&
        node.children[childIndex + 1]?.startIndex === node_2.endIndex
      )
        return {
          kind: "too-complex",
          reason: "zsh reads !( in [[ ]] as part of a word",
          differential: true,
        };
      let childError = walkTestExpr(
        node_2,
        argv,
        innerCommands,
        varScope,
        bareAssignmentNames,
        isDoubleBracket,
      );
      if (childError) return childError;
    }
    return null;
  }
  switch (node.type) {
    case "test_operator":
    case "!":
    case "(":
    case ")":
    case "&&":
    case "||":
    case "==":
    case "=":
    case "!=":
    case "<":
    case ">":
    case "=~":
      argv.push(node.text);
      return null;
    case "regex":
    case "extglob_pattern":
      if (/\$([({[\w#?!*@$'"+~^=-]|[\u0080-\uffff])|`|[<>]\(/.test(node.text))
        return {
          kind: "too-complex",
          reason: `[[ ]] ${node.type === "extglob_pattern" ? "pattern" : node.type} contains expansion / command / process substitution`,
          differential: true,
        };
      if (node.text.startsWith("=("))
        return {
          kind: "too-complex",
          reason: `[[ ]] ${node.type === "extglob_pattern" ? "pattern" : node.type} contains zsh =(CMD) process substitution`,
          differential: true,
        };
      if (node.type === "regex" && hasZshEqualsProcSubst(node.text))
        return {
          kind: "too-complex",
          reason: `[[ ]] ${node.type} contains zsh =(CMD) process substitution`,
          differential: true,
        };
      if (node.type === "extglob_pattern") {
        let text = node.text;
        let patternIndex = 0;
        while (patternIndex < text.length) {
          if (text[patternIndex] === "\\" && patternIndex + 1 < text.length) {
            patternIndex += 2;
            continue;
          }
          if (text[patternIndex] === "&")
            return {
              kind: "too-complex",
              reason: "[[ ]] pattern contains unquoted & (zsh splits the word at & at any depth)",
              differential: true,
            };
          patternIndex++;
        }
      }
      if (node.type === "regex") {
        let text = node.text;
        let parenDepth = 0;
        let charIndex = 0;
        while (charIndex < text.length) {
          let char = text[charIndex];
          if (char === "\\" && charIndex + 1 < text.length) {
            charIndex += 2;
            continue;
          }
          if (parenDepth === 0 && char === "|" && text[charIndex + 1] === char)
            return {
              kind: "too-complex",
              reason: "[[ ]] regex contains glued || (zsh splits it as a cond operator)",
              differential: true,
            };
          if (char === "&")
            return {
              kind: "too-complex",
              reason: "[[ ]] regex contains unquoted & (zsh splits the word at & at any depth)",
              differential: true,
            };
          if (char === '"' || char === "'") {
            let quoteChar = char;
            charIndex++;
            while (charIndex < text.length && text[charIndex] !== quoteChar) {
              if (quoteChar === '"' && text[charIndex] === "\\" && charIndex + 1 < text.length) charIndex++;
              charIndex++;
            }
            if (charIndex < text.length) charIndex++;
            continue;
          }
          if (char === "(") parenDepth++;
          else if (char === ")") {
            parenDepth--;
            if (parenDepth < 0)
              return {
                kind: "too-complex",
                reason: "[[ ]] regex has unbalanced parentheses (parser desync)",
                differential: true,
              };
          }
          charIndex++;
        }
        if (parenDepth !== 0)
          return {
            kind: "too-complex",
            reason: "[[ ]] regex has unbalanced parentheses (parser desync)",
            differential: true,
          };
      }
      if (node.text.includes("&&"))
        return {
          kind: "too-complex",
          reason:
            "[[ ]] pattern leaf contains `&&` \u2014 shell cond-lexer divergence (zsh splits the word there)",
          differential: true,
        };
      if (containsStandaloneCondCloser(node.text))
        return {
          kind: "too-complex",
          reason:
            "[[ ]] pattern leaf contains a potential standalone `]]` closer \u2014 shell cond-lexer divergence (zsh may close the conditional early)",
          differential: true,
        };
      argv.push(node.text);
      return null;
    case "test_rhs_missing":
      return {
        kind: "too-complex",
        reason: "Test command comparison is missing its right-hand side \u2014 parser dropped consumed bytes",
      };
    default: {
      let argumentValue = walkArgument(node, innerCommands, varScope, bareAssignmentNames);
      if (typeof argumentValue !== "string") {
        if (isDoubleBracket && argumentValue.kind === "too-complex") {
          let { nodeType, ...restResult } = argumentValue;
          return {
            ...restResult,
            differential: true,
          };
        }
        return argumentValue;
      }
      if (
        (isDoubleBracket &&
          (containsStandaloneCondCloser(argumentValue) || containsStandaloneCondCloser(node.text))) ||
        /]].*[;\n&|<>]/s.test(argumentValue)
      )
        return {
          kind: "too-complex",
          reason: isDoubleBracket
            ? "[[ ]] quoted operand contains `]]` closer or `]]`+separator bytes \u2014 possible parser quote-state desync"
            : "test command quoted operand contains `]]`+separator bytes \u2014 possible parser quote-state desync",
          differential: true,
        };
      argv.push(argumentValue);
      return null;
    }
  }
}
//@ chunk-nzz6y5xm.js:46036-46291 layout
function findUnsupportedListTail(node) {
  let lastChild = null;
  for (let child of node.children) {
    if (!child || child.type === "!" || child.type === "comment" || SEPARATOR_TYPES.has(child.type)) continue;
    lastChild = child;
  }
  if (!lastChild) return null;
  if (lastChild.type === "list" || lastChild.type === "negated_command")
    return findUnsupportedListTail(lastChild);
  if (!REDIRECTABLE_COMMAND_TYPES.has(lastChild.type) && !TRAILING_OK_TYPES.has(lastChild.type))
    return lastChild;
  return null;
}
//@ chunk-nzz6y5xm.js:46291-46350 layout
/**
 * 把变量在作用域中标为未知值 VAR_PLACEHOLDER（已是不确定值时保持）。
 */
function markVarUnknown(varScope, name) {
  if (varScope.get(name)?.includes(UNCERTAIN_VAR_PLACEHOLDER)) return;
  varScope.set(name, VAR_PLACEHOLDER);
}
//@ chunk-nzz6y5xm.js:46350-46368 layout
var UNCERTAIN_PREFIX; // deferred: uses STRUCTURAL_TYPES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-nzz6y5xm.js:46350", () => {
  UNCERTAIN_PREFIX = `${UNCERTAIN_VAR_PLACEHOLDER}\x00`;
});
//@ chunk-nzz6y5xm.js:46368-46431 layout
function stripUncertainPrefix(text) {
  return readingDivergentShapes && text.startsWith(UNCERTAIN_PREFIX)
    ? text.slice(UNCERTAIN_PREFIX.length)
    : text;
}
//@ chunk-nzz6y5xm.js:46431-46626 layout
function uncertainValueResult(value, reason, nodeType) {
  if (value === undefined) return null;
  if (!containsAnyPlaceholder(stripUncertainPrefix(value))) return null;
  return !readingDivergentShapes && value.includes(UNCERTAIN_VAR_PLACEHOLDER)
    ? {
        kind: "too-complex",
        reason,
        nodeType,
        divergentShape: true,
      }
    : {
        kind: "too-complex",
        reason,
        nodeType,
      };
}
//@ chunk-nzz6y5xm.js:46626-46690 layout
function recordUnset(varScope, name, hasPriorCommands) {
  unsetNames.add(name);
  if (hasPriorCommands && readingDivergentShapes) sawUncertainWrite = true;
  varScope.set(
    name,
    !hasPriorCommands ? "" : readingDivergentShapes ? UNCERTAIN_PREFIX : UNCERTAIN_VAR_PLACEHOLDER,
  );
}
//@ chunk-nzz6y5xm.js:46690-46853 layout
function mergeScopeAfterConditional(varScope, snapshot) {
  for (let [varName, value] of varScope)
    if (snapshot.get(varName) !== value) {
      if (!readingDivergentShapes && declarationPrefixValues.get(varName) === value)
        prefixAssignInBranch = true;
      sawUncertainWrite ||= readingDivergentShapes;
      varScope.set(
        varName,
        !readingDivergentShapes
          ? UNCERTAIN_VAR_PLACEHOLDER
          : value.includes(UNCERTAIN_VAR_PLACEHOLDER)
            ? value
            : UNCERTAIN_PREFIX + value,
      );
    }
  for (let key of snapshot.keys()) if (!varScope.has(key)) varScope.set(key, UNCERTAIN_VAR_PLACEHOLDER);
}
//@ chunk-nzz6y5xm.js:46853-48397 fingerprint (2.1.88 match: walkRedirectedStatement, 0.821)
/**
 * 处理 redirected_statement：分离 file/heredoc 重定向与内层命令；内层是 a && b 的 list 时分两段收集；随后解析每个文件重定向、检查重定向读前缀变量、校验 heredoc，并把重定向挂到最后一条命令上（无命令时推入空 argv 命令）。
 */
function walkRedirectedStatement(node, commands, varScope, bareAssignmentNames, isProgramChild) {
  let redirects = [];
  let innerCommand = null;
  let fileRedirects = [];
  let heredocRedirects = [];
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "file_redirect") fileRedirects.push(child);
    else if (child.type === "heredoc_redirect") heredocRedirects.push(child);
    else if (REDIRECTABLE_COMMAND_TYPES.has(child.type)) {
      if (child.type === "list" || child.type === "negated_command") {
        let unsupportedListTail = findUnsupportedListTail(child);
        if (unsupportedListTail) return tooComplex(unsupportedListTail);
      }
      innerCommand = child;
    } else return tooComplex(child);
  }
  if (!innerCommand) {
    for (let fileRedirect of fileRedirects) {
      let redirect = walkFileRedirect(fileRedirect, commands, varScope, bareAssignmentNames);
      if ("kind" in redirect) return redirect;
      redirects.push(redirect);
    }
    for (let heredocRedirect of heredocRedirects) {
      let failure = walkHeredocRedirect(heredocRedirect, varScope);
      if (failure) return failure;
    }
    commands.push({
      argv: [],
      envVars: [],
      redirects,
      text: node.text,
      hasUnquotedGlob: hasUnquotedGlob(node.text),
    });
    return null;
  }
  let before = commands.length;
  let trailingPipeline =
    allowPlainUnquotedHeredocs &&
    isProgramChild &&
    innerCommand.type === "command" &&
    fileRedirects.length === 0 &&
    heredocRedirects.length === 1
      ? heredocRedirects[0]?.children.find((child) => child?.type === "pipeline")
      : undefined;
  let scopeBeforeInner;
  let needsMerge = false;
  if (innerCommand.type === "list") {
    let children = innerCommand.children;
    if (children.length === 3 && children[0] && children[1]?.type === "&&" && children[2]) {
      let commands_2 = collectCommands(children[0], commands, varScope, bareAssignmentNames);
      if (commands_2) return commands_2;
      scopeBeforeInner = new Map(varScope);
      needsMerge = true;
      let commands_3 = collectCommands(children[2], commands, varScope, bareAssignmentNames);
      if (commands_3) return commands_3;
    } else {
      let commands_2 = collectCommands(innerCommand, commands, varScope, bareAssignmentNames);
      if (commands_2) return commands_2;
      scopeBeforeInner = varScope;
    }
  } else if (STRUCTURAL_TYPES.has(innerCommand.type)) {
    let commands_2 = collectCommands(innerCommand, commands, varScope, bareAssignmentNames);
    if (commands_2) return commands_2;
    scopeBeforeInner = varScope;
  } else {
    scopeBeforeInner = new Map(varScope);
    needsMerge = true;
    let commands_2 = collectCommands(
      innerCommand,
      commands,
      trailingPipeline ? new Map(varScope) : varScope,
      bareAssignmentNames,
    );
    if (commands_2) return commands_2;
  }
  if (needsMerge) mergeScopeAfterConditional(varScope, scopeBeforeInner);
  let command = commands.length > before ? commands.at(-1) : undefined;
  let prefixVarName = command?.envVars[0]?.name;
  if (
    prefixVarName !== undefined &&
    fileRedirects.some((fileRedirect) => containsArithmeticExpansion(fileRedirect))
  ) {
    let failure = prefixAssignmentMayFailResult(prefixVarName);
    if (failure) return failure;
  }
  for (let fileRedirect of fileRedirects) {
    let redirect = walkFileRedirect(fileRedirect, commands, scopeBeforeInner, bareAssignmentNames);
    if ("kind" in redirect) return redirect;
    redirects.push(redirect);
  }
  if (command) {
    let failure = checkRedirectReadsPrefixVar(
      fileRedirects,
      command,
      redirects,
      commands,
      scopeBeforeInner,
      bareAssignmentNames,
    );
    if (failure) return failure;
  }
  for (let heredocRedirect of heredocRedirects) {
    let err = walkHeredocRedirect(heredocRedirect, scopeBeforeInner, trailingPipeline);
    if (err) return err;
  }
  if (trailingPipeline) {
    let commands_2 = collectCommands(trailingPipeline, commands, varScope, bareAssignmentNames);
    if (commands_2) return commands_2;
  }
  if (heredocRedirects.length > 0)
    for (let index = before; index < commands.length; index++) {
      let last = commands[index];
      if (last) last.argvSourceLiteral = false;
    }
  if (redirects.length > 0)
    if (commands.length > before) {
      let last = commands.at(-1);
      if (last) last.redirects.push(...redirects);
    } else
      commands.push({
        argv: [],
        envVars: [],
        redirects,
        text: node.text,
        hasUnquotedGlob: hasUnquotedGlob(node.text),
      });
  return null;
}
//@ chunk-nzz6y5xm.js:48397-49870 layout
/**
 * 检查 file_redirect：子节点之间不能有被解析器丢掉的字节，不能用 fd 变量，>&/<& 后不能以 - 开头，关闭 fd 后不能跟词，目标不能多于一个。
 */
function checkFileRedirectShape(node) {
  {
    let startIndex = node.startIndex;
    for (let child of node.children) {
      if (!child) continue;
      if (child.startIndex > startIndex) {
        let str = Buffer.from(node.text, "utf8")
          .subarray(startIndex - node.startIndex, child.startIndex - node.startIndex)
          .toString("utf8");
        if (!/^(?:[ \t]|\\\n)*$/.test(str))
          return {
            kind: "too-complex",
            reason:
              "Redirect has unparsed bytes between children \u2014 parser dropped content that shell will see",
          };
      }
      startIndex = child.endIndex;
    }
    if (startIndex < node.endIndex) {
      let str = Buffer.from(node.text, "utf8")
        .subarray(startIndex - node.startIndex)
        .toString("utf8");
      if (!/^(?:[ \t]|\\\n)*$/.test(str))
        return {
          kind: "too-complex",
          reason: "Redirect has unparsed trailing bytes \u2014 parser dropped content that shell will see",
        };
    }
  }
  let lastOp = null;
  let targetCount = 0;
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "variable_name")
      return {
        kind: "too-complex",
        reason: `Redirect uses ${child.text} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
    if (child.type === "file_descriptor") continue;
    if (child.type === ">&-" || child.type === "<&-") {
      lastOp = child.type;
      continue;
    }
    if (child.type in REDIRECT_OPS) {
      lastOp = child.type;
      continue;
    }
    if ((lastOp === ">&" || lastOp === "<&") && child.text.startsWith("-"))
      return {
        kind: "too-complex",
        reason:
          "Redirect target after >& or <& starts with - \u2014 bash treats the dash as close-fd and passes the rest to the command as a hidden argument",
      };
    if (lastOp === ">&-" || lastOp === "<&-")
      return {
        kind: "too-complex",
        reason:
          "Close-fd redirect is followed by a word \u2014 bash passes it to the command as a hidden argument",
      };
    targetCount++;
    lastOp = null;
  }
  if (targetCount > 1)
    return {
      kind: "too-complex",
      reason: "Redirect has multiple targets \u2014 post-redirect args swallowed",
    };
  return null;
}
//@ chunk-nzz6y5xm.js:49870-50046 layout
var HEREDOC_PART_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HEREDOC_TRAILER_TYPES;
var FD_VARIABLE_RE;
deferInit("chunk-nzz6y5xm.js:49870", () => {
  HEREDOC_PART_TYPES = new Set([
    "heredoc_start",
    "heredoc_body",
    "<<",
    "<<-",
    "heredoc_end",
    "file_descriptor",
  ]);
  HEREDOC_TRAILER_TYPES = new Set(["file_redirect", "pipeline"]);
  FD_VARIABLE_RE = /^\{(?:\w|[^\x00-\x7F])+(\[.*\])?\}$/su;
});
//@ chunk-nzz6y5xm.js:50046-50231 layout
function describeFdVariable(text) {
  let name = /^\{((?:\w|[^\x00-\x7F])+)/u.exec(text)?.[1];
  if (name === undefined) return "{\u2026}";
  let safeName = /^\w{1,64}$/.test(name) ? name : "\u2026";
  return text[name.length + 1] === "[" ? `{${safeName}[\u2026]}` : `{${safeName}}`;
}
//@ chunk-nzz6y5xm.js:50231-50592 layout (2.1.88 match: mk, 1)
/**
 * 在子树中找 {name}> / {name}< 形式的 fd 变量重定向，返回其文本（会给 shell 变量赋值，属副作用）。
 */
function findFdVariableRedirect(node, bytes) {
  let match = bytes[node.startIndex] === 123 ? FD_VARIABLE_RE.exec(node.text) : null;
  if (match) {
    let endIndex = node.endIndex;
    let hadSpace = false;
    for (;;) {
      let byte = bytes[endIndex];
      if (byte === 32 || byte === 9) {
        hadSpace = true;
        endIndex++;
      } else if (byte === 92 && bytes[endIndex + 1] === 10) endIndex += 2;
      else break;
    }
    let nextByte = bytes[endIndex];
    let byteAfter = bytes[endIndex + 1];
    if (
      (((nextByte === 62 || nextByte === 60) && byteAfter !== 40) || (nextByte === 38 && byteAfter === 62)) &&
      !(hadSpace && match[1] !== undefined)
    )
      return node.text;
  }
  for (let child of node.children)
    if (child) {
      let fdVariableRedirect = findFdVariableRedirect(child, bytes);
      if (fdVariableRedirect !== null) return fdVariableRedirect;
    }
  return null;
}
//@ chunk-nzz6y5xm.js:50592-51188 layout
/**
 * 递归检查所有重定向节点的形状：文件重定向交给 checkFileRedirectShape；here-string/heredoc 禁止 fd 变量，heredoc 起始行后只能跟文件重定向或管道。
 */
function findRedirectShapeError(node) {
  if (node.type === "file_redirect") {
    let failure = checkFileRedirectShape(node);
    if (failure) return failure;
  }
  if (node.type === "herestring_redirect" || node.type === "heredoc_redirect") {
    for (let child of node.children)
      if (child?.type === "variable_name")
        return {
          kind: "too-complex",
          reason: `Redirect uses ${describeFdVariable(child.text)} fd-variable assignment \u2014 modifies shell variable as side effect`,
        };
    if (node.type === "heredoc_redirect") {
      for (let child of node.children)
        if (child && !HEREDOC_PART_TYPES.has(child.type) && !HEREDOC_TRAILER_TYPES.has(child.type))
          return {
            kind: "too-complex",
            reason: "Text after the heredoc start on the same line cannot be statically analyzed",
          };
    }
  }
  for (let child of node.children)
    if (child) {
      let redirectShapeError = findRedirectShapeError(child);
      if (redirectShapeError) return redirectShapeError;
    }
  return null;
}
//@ chunk-nzz6y5xm.js:51188-53953 fingerprint (2.1.88 match: walkFileRedirect, 0.463)
/**
 * 解析单个 file_redirect 为 {op, target, fd, targetSourceLiteral}：拒绝 fd 变量、关闭 fd 后跟词、多目标、>& 后以 - 开头、含花括号/替换的目标、含命令替换输出/换行/以 ! 或 = 开头的目标，以及 >& 后非简单路径。
 */
function walkFileRedirect(node, innerCommands, varScope, bareAssignmentNames) {
  let substitutionsBefore = substitutionCount;
  let inlineHeredocsBefore = catHeredocInlineCount;
  let op = null;
  let target = null;
  let fd;
  {
    let shapeError = checkFileRedirectShape(node);
    if (shapeError) return shapeError;
  }
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "file_descriptor") fd = Number(child.text);
    else if (child.type === "variable_name")
      return {
        kind: "too-complex",
        reason: `Redirect uses ${child.text} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
    else if (child.type in REDIRECT_OPS) op = REDIRECT_OPS[child.type] ?? null;
    else if (child.type === ">&-" || child.type === "<&-") {
      if (node.children.some((child_2) => child_2 !== child && child_2?.type !== "file_descriptor"))
        return {
          kind: "too-complex",
          reason:
            "Close-fd redirect is followed by a word \u2014 bash passes it to the command as a hidden argument",
        };
      return tooComplex(child);
    } else if (target !== null)
      return {
        kind: "too-complex",
        reason: "Redirect has multiple targets \u2014 post-redirect args swallowed",
      };
    else if ((op === ">&" || op === "<&") && child.text.startsWith("-"))
      return {
        kind: "too-complex",
        reason:
          "Redirect target after >& or <& starts with - \u2014 bash treats the dash as close-fd and passes the rest to the command as a hidden argument",
      };
    else if (child.type === "word" || child.type === "number") {
      if (child.children.length > 0) return tooComplex(child);
      if (BRACE_EXPANSION_RE.test(child.text)) return tooComplex(child);
      if (BRACE_ESCAPED_CLOSE_RE.test(child.text)) return tooComplex(child);
      if (BRACE_ESCAPED_OPEN_RE.test(child.text)) return tooComplex(child);
      if (/(?:^|[^\\])(?:\\\\)*[`$]/.test(child.text)) return tooComplex(child);
      target = child.text.replace(/\\([\s\S])/g, (matchText, escaped) =>
        escaped ===
        `
`
          ? ""
          : escaped,
      );
    } else if (child.type === "raw_string") target = stripRawString(child.text);
    else if (child.type === "string") {
      let word = walkString(child, innerCommands, varScope, bareAssignmentNames);
      if (typeof word !== "string") return word;
      target = word;
    } else if (child.type === "concatenation") {
      let word = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
      if (typeof word !== "string") return word;
      if (/(?:^|[^\\])(?:\\\\)*[`$]/.test(child.text))
        return {
          kind: "too-complex",
          reason: "Redirect target concatenation contains $/` \u2014 unanalyzable gap or substitution",
          nodeType: "concatenation",
        };
      target = word;
    } else return tooComplex(child);
  }
  if (!op || target === null)
    return {
      kind: "too-complex",
      reason: "Unrecognized redirect shape",
    };
  if (containsAnyPlaceholder(target))
    return {
      kind: "too-complex",
      reason: "Redirect target contains $(cmd) output \u2014 path is runtime-determined",
      nodeType: node.type,
    };
  if (
    target.includes(`
`)
  )
    return {
      kind: "too-complex",
      reason: "Redirect target contains newline \u2014 potential path traversal",
      nodeType: node.type,
    };
  if (target.startsWith("!"))
    return {
      kind: "too-complex",
      reason: "Redirect target starts with ! \u2014 zsh clobber or history expansion",
      nodeType: node.type,
    };
  if (target.startsWith("="))
    return {
      kind: "too-complex",
      reason: "Redirect target starts with = \u2014 zsh expands to PATH binary",
      nodeType: node.type,
    };
  if ((op === ">&" || op === "<&") && target.startsWith("-"))
    return {
      kind: "too-complex",
      reason:
        "Redirect target after >& or <& starts with - \u2014 bash treats the dash as close-fd and passes the rest to the command as a hidden argument",
    };
  if (op === ">&" && !/^[A-Za-z0-9./_-]+$/.test(target))
    return {
      kind: "too-complex",
      reason:
        "bash `>&` applies a second word-expansion pass to its target \u2014 path cannot be statically validated",
      nodeType: node.type,
    };
  return {
    op,
    target,
    fd,
    targetSourceLiteral:
      substitutionCount === substitutionsBefore && catHeredocInlineCount === inlineHeredocsBefore,
  };
}
//@ chunk-nzz6y5xm.js:53953-54049 layout
var allowPlainUnquotedHeredocs; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var readingDivergentShapes;
var sawUncertainWrite;
var reExpansionBudget;
var argvWordNodes;
var currentDeclarationPrefix;
var declarationPrefixCount;
var declarationPrefixBashKeeps;
var declarationPrefixValues;
var prefixAssignInBranch;
var usedAssignedValue;
var isLaterLoopPass;
var currentLoopNode;
var loopDepth;
var unsetNames;
deferInit("chunk-nzz6y5xm.js:53953", () => {
  allowPlainUnquotedHeredocs = false;
  readingDivergentShapes = false;
  sawUncertainWrite = false;
  reExpansionBudget = 0;
  argvWordNodes = new WeakMap();
  declarationPrefixCount = 0;
  declarationPrefixValues = new Map();
  prefixAssignInBranch = false;
  usedAssignedValue = false;
  isLaterLoopPass = false;
  currentLoopNode = null;
  loopDepth = 0;
  unsetNames = new Set();
});
//@ chunk-nzz6y5xm.js:54049-54126 layout
function divergentShapeResult(reason) {
  return readingDivergentShapes
    ? null
    : {
        kind: "too-complex",
        reason,
        divergentShape: true,
      };
}
//@ chunk-nzz6y5xm.js:54126-54322 layout
function prefixAssignmentMayFailResult(varName) {
  return divergentShapeResult(
    `'${varName}' is set for one command that carries an expansion which can fail at runtime \u2014 whether the assignment stands for later commands cannot be statically verified`,
  );
}
//@ chunk-nzz6y5xm.js:54322-54345 layout
function getDeclarationPrefixBashKeeps() {
  return declarationPrefixBashKeeps;
}
//@ chunk-nzz6y5xm.js:54345-54368 layout
function getDeclarationPrefixCount() {
  return declarationPrefixCount;
}
//@ chunk-nzz6y5xm.js:54368-54510 layout
var HEREDOC_BODY_ESCAPE_RE; // deferred: uses PLAIN_VAR_NAME_RE of its import cycle while loading; runs once the cycle is complete
var VAR_NAME_SOURCE;
var PLAIN_VAR_REF_RE;
deferInit("chunk-nzz6y5xm.js:54368", () => {
  HEREDOC_BODY_ESCAPE_RE = /`|\\[$`\\\n]/;
  VAR_NAME_SOURCE = PLAIN_VAR_NAME_RE.source.slice(1, -1);
  PLAIN_VAR_REF_RE = new RegExp(
    `\\$(?:${VAR_NAME_SOURCE}(?![A-Za-z0-9_\\u0080-\\uffff])|\\{${VAR_NAME_SOURCE}\\})(?!\\[|:[A-Za-z&])`,
    "g",
  );
});
//@ chunk-nzz6y5xm.js:54510-57045 layout
/**
 * 校验 heredoc：必须有被扫描的正文；分界符未加引号时只在 plainUnquotedHeredocs 模式且正文只含可静态解析的 $name 时放行，否则 too-complex（differential）；引号分界符含反斜杠、<<- 配制表符分界符、正文行以分界符开头后跟 ) ` } 等也拒绝。可选允许分界行后紧跟一个简单管道。
 */
function walkHeredocRedirect(node, varScope, trailingPipeline) {
  let delimiter = null;
  let endDelimiter = null;
  let body = null;
  let isDashHeredoc = false;
  for (let child of node.children) {
    if (!child) continue;
    if (HEREDOC_PART_TYPES.has(child.type)) {
      if (child.type === "heredoc_start") delimiter = child.text;
      else if (child.type === "heredoc_body") body = child;
      else if (child.type === "<<-") isDashHeredoc = true;
      else if (child.type === "heredoc_end") endDelimiter = child.text;
    } else if (
      child === trailingPipeline &&
      child.children.at(-1)?.type === "command" &&
      child.children.every(
        (child) =>
          child?.type === "|" ||
          (child?.type === "command" && !child.children.some((child) => child?.type.endsWith("_redirect"))),
      )
    );
    else if (HEREDOC_TRAILER_TYPES.has(child.type)) {
      let failure = tooComplex(child);
      return failure.kind === "too-complex"
        ? {
            ...failure,
            afterHeredocDelimiter: true,
          }
        : failure;
    } else
      return {
        kind: "too-complex",
        reason: "Text after the heredoc start on the same line cannot be statically analyzed",
      };
  }
  if (body === null)
    return {
      kind: "too-complex",
      reason: "Heredoc body was not scanned by the parser",
      nodeType: "heredoc_redirect",
    };
  if (trailingPipeline) {
    let str = Buffer.from(node.text, "utf8")
      .subarray(0, body.startIndex - node.startIndex)
      .toString("utf8");
    let joined = node.children
      .slice(0, node.children.indexOf(body))
      .map((child) => (child === trailingPipeline ? "|" : "") + (child?.text ?? ""))
      .join("");
    if (
      str.indexOf(`
`) !==
        str.length - 1 ||
      str.includes("\\") ||
      str.replace(/[ \t\n]/g, "") !== joined.replace(/[ \t]/g, "")
    )
      return {
        kind: "too-complex",
        reason: "More than a pipeline follows the heredoc delimiter on its line",
      };
  }
  let isQuotedDelimiter =
    delimiter !== null &&
    ((delimiter.startsWith("'") && delimiter.endsWith("'")) ||
      (delimiter.startsWith('"') && delimiter.endsWith('"')) ||
      delimiter.startsWith("\\"));
  if (!isQuotedDelimiter) {
    let filtered = body.children.filter((child) => child?.type !== "heredoc_content");
    if (!(
      allowPlainUnquotedHeredocs &&
      varScope !== undefined &&
      delimiter !== null &&
      PLAIN_VAR_NAME_RE.test(delimiter) &&
      endDelimiter === delimiter &&
      !HEREDOC_BODY_ESCAPE_RE.test(body.text) &&
      (body.text.match(/\$/g)?.length ?? 0) === filtered.length &&
      (body.text.match(PLAIN_VAR_REF_RE)?.length ?? 0) === filtered.length &&
      filtered.every((expansion) => {
        substitutionCount++;
        return (
          (expansion?.type === "simple_expansion" || expansion?.type === "expansion") &&
          typeof resolveSimpleExpansion(expansion, varScope, true) === "string"
        );
      })
    ))
      return {
        kind: "too-complex",
        reason: "Heredoc with unquoted delimiter undergoes shell expansion",
        nodeType: "heredoc_redirect",
        differential: true,
      };
  }
  if (
    delimiter !== null &&
    (delimiter.startsWith("'") || delimiter.startsWith('"')) &&
    delimiter.slice(1, -1).includes("\\")
  )
    return {
      kind: "too-complex",
      reason: "Quoted heredoc delimiter contains backslash",
      nodeType: "heredoc_redirect",
    };
  if (isQuotedDelimiter)
    for (let child of body.children) {
      if (!child) continue;
      if (child.type !== "heredoc_content") return tooComplex(child);
    }
  if (delimiter !== null && body !== null) {
    let delimiterText = !isQuotedDelimiter
      ? delimiter
      : delimiter.startsWith("\\")
        ? delimiter.slice(1)
        : delimiter.slice(1, -1);
    if (delimiterText.length > 0) {
      if (isDashHeredoc && delimiterText.startsWith("\t"))
        return {
          kind: "too-complex",
          reason: "Heredoc uses <<- with a tab-prefixed delimiter",
          nodeType: "heredoc_redirect",
        };
      for (let line of body.text.split(`
`)) {
        let lineText = isDashHeredoc ? line.replace(/^\t+/, "") : line;
        if (!lineText.startsWith(delimiterText)) continue;
        let sliced = lineText.slice(delimiterText.length);
        if (/[)`}]/.test(sliced))
          return {
            kind: "too-complex",
            reason:
              "Heredoc body line starts with the delimiter and contains a shell metacharacter bash may treat as a terminator",
            nodeType: "heredoc_redirect",
          };
      }
    }
  }
  return null;
}
//@ chunk-nzz6y5xm.js:57045-57381 layout
/**
 * 校验 here-string（<<<）：参数需可静态解析，禁止 fd 变量与换行后注释。
 */
function walkHerestringRedirect(node, innerCommands, varScope, bareAssignmentNames) {
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "<<<") continue;
    if (child.type === "variable_name")
      return {
        kind: "too-complex",
        reason: `Redirect uses ${describeFdVariable(child.text)} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
    let content = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
    if (typeof content !== "string") return content;
    if (NEWLINE_HASH_RE.test(content)) return tooComplex(child);
  }
  return null;
}
//@ chunk-nzz6y5xm.js:57381-57760 facade-majority
var COMMAND_WRAPPER_BUILTINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_PREFIX_ASSIGN_RE;
var ASSIGNING_WRAPPERS;
var DECLARATION_BUILTINS;
var DECLARATION_BUILTINS_ZSH;
var POSIX_SPECIAL_BUILTINS_NONEVAL;
deferInit("chunk-nzz6y5xm.js:57381", () => {
  COMMAND_WRAPPER_BUILTINS = new Set(["command", "builtin", "noglob", "nocorrect", "time"]);
  SAFE_PREFIX_ASSIGN_RE = /^[A-Za-z_][A-Za-z0-9_]*\+?=[A-Za-z0-9_.,:/@%+=-]*$/;
  ASSIGNING_WRAPPERS = new Set(["builtin", "command", "noglob"]);
  DECLARATION_BUILTINS = new Set(["declare", "typeset", "local", "export", "readonly"]);
  DECLARATION_BUILTINS_ZSH = new Set([...DECLARATION_BUILTINS, "integer", "float", "private"]);
  POSIX_SPECIAL_BUILTINS_NONEVAL = new Set([
    ":",
    "break",
    "continue",
    "return",
    "exit",
    "shift",
    "times",
    "set",
    "export",
    "readonly",
    "unset",
  ]);
});
//@ chunk-nzz6y5xm.js:57760-58561 layout
function checkZshReadDivergence(operand, flag, bareNameOnly, varScope, bareAssignmentNames) {
  if (operand === undefined) return null;
  let [, name = "", rest = ""] = /^([A-Za-z_][A-Za-z0-9_]*)([\s\S]*)$/.exec(operand) ?? [];
  if (name === "" || (bareNameOnly ? rest === "" : rest !== "" && !/^[[?]/.test(rest))) return null;
  let trackedValue = varScope.get(name);
  if (
    !bareAssignmentNames.includes(name) &&
    !unsetNames.has(name) &&
    !declarationPrefixValues.has(name) &&
    (trackedValue === undefined || containsAnyPlaceholder(trackedValue))
  )
    return null;
  if (!isNestedRippleEnabled() || isRuleOffOrBashReading()) return null;
  let rest_2 = rest;
  let display = name;
  if (rest_2.startsWith("[")) {
    let bracketDepth = 0;
    let restEnd = rest_2.length;
    for (let k = 0; k < rest_2.length; k++)
      if (rest_2[k] === "[") bracketDepth++;
      else if (rest_2[k] === "]" && --bracketDepth === 0) {
        restEnd = k + 1;
        break;
      }
    display += "[\u2026]";
    rest_2 = rest_2.slice(restEnd);
  }
  if (rest_2 !== "") display += rest_2.startsWith("?") ? "?\u2026" : "\u2026";
  let reason = `In zsh, 'read ${redactPlaceholdersForDisplay(flag === null ? display : `${flag} ${display}`)}' can set ${name} differently from bash or leave it unchanged, and this command set or unset ${name} earlier, so ${name}'s value after the read can't be checked before the command runs`;
  if (!isLaterLoopPass) recordReadingRefusal(reason);
  return {
    kind: "too-complex",
    reason,
    differential: true,
  };
}
//@ chunk-nzz6y5xm.js:58561-65044 layout
/**
 * 按命令语义更新变量作用域：识别 builtin/command/noglob 包装（zsh/bash 行为不同时拒绝）、前缀赋值、declare 类、read（含 zsh read 分歧检查）、printf -v、unset、print、set -A、mapfile、cd/pushd/popd（标 PWD/OLDPWD 未知），以及声明前缀（declarationPrefix）模式下的赋值核对；写入受保护变量即 too-complex。
 */
function applyCommandVariableWrites(
  argv,
  envVars,
  varScope,
  bareAssignmentNames,
  hasPriorCommands,
  hasArithmetic,
) {
  let writtenNames = [];
  let assignedNames = [];
  let recordName = (word, alsoAssigned = true) => {
    let match = word.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (match) {
      writtenNames.push(match[0]);
      if (alsoAssigned) assignedNames.push(match[0]);
    }
  };
  let restArgv = argv;
  let wrappedComplex = false;
  let wrapper;
  let prefixWords = [];
  for (;;) {
    let word = restArgv[0];
    if (word === undefined) break;
    if (COMMAND_WRAPPER_BUILTINS.has(word)) {
      if ((wrapper === "builtin" || wrapper === "command") && word !== "builtin" && word !== "command") {
        if (word === "noglob" && !wrappedComplex)
          return {
            kind: "too-complex",
            reason: `'${wrapper} noglob' runs the wrapped command on zsh (for 'command', under POSIX_BUILTINS) but not bash \u2014 cannot statically model whether it executes`,
            nodeType: "command",
          };
        wrappedComplex = true;
      }
      let flagIndex = 1;
      while (flagIndex < restArgv.length && /^-[-pvV]*$/.test(restArgv[flagIndex])) {
        if (
          /[vV]/.test(restArgv[flagIndex]) ||
          (word === "builtin" && /p/.test(restArgv[flagIndex]) && isStagedPumpkinEnabled())
        )
          wrappedComplex = true;
        flagIndex++;
      }
      restArgv = restArgv.slice(flagIndex);
      wrapper = word;
    } else if (word === "!") {
      if (wrapper === "builtin" || wrapper === "command") wrappedComplex = true;
      restArgv = restArgv.slice(1);
      wrapper = undefined;
    } else if (/^[A-Za-z_]\w*(\[[^\]]*\])?\+?=/.test(word)) {
      if (wrapper !== undefined && ASSIGNING_WRAPPERS.has(wrapper) && isStagedPumpkinEnabled()) {
        if (!(SAFE_PREFIX_ASSIGN_RE.test(word) && !containsAnyPlaceholder(word)) && !wrappedComplex) {
          let result = wrappedGlobResult(wrapper, word);
          if (result) return result;
        }
        wrappedComplex = true;
      }
      let writtenBefore = writtenNames.length;
      recordName(word);
      prefixWords.push({
        word,
        target: writtenNames.length > writtenBefore ? writtenBefore : undefined,
      });
      restArgv = restArgv.slice(1);
      wrapper = undefined;
    } else {
      if (
        wrapper !== undefined &&
        ASSIGNING_WRAPPERS.has(wrapper) &&
        !wrappedComplex &&
        word !== "[" &&
        /[*?[]/.test(word) &&
        isStagedPumpkinEnabled()
      ) {
        let result = wrappedGlobResult(wrapper, word);
        if (result) return result;
      }
      break;
    }
  }
  let commandName = restArgv[0];
  if (commandName === undefined) for (let envVar of envVars) recordName(envVar.name);
  else if (DECLARATION_BUILTINS.has(commandName)) {
    let afterDoubleDash = false;
    for (let k = 1; k < restArgv.length; k++) {
      let word = restArgv[k];
      if (!afterDoubleDash && word === "--") {
        afterDoubleDash = true;
        continue;
      }
      if (!afterDoubleDash && /^[+-].*m/.test(word))
        return {
          kind: "too-complex",
          reason: `'${commandName} ${word}' (wrapped form) \u2014 zsh -m/+m pattern-assigns every matching variable; cannot statically model target set`,
          nodeType: "command",
        };
      if (!afterDoubleDash && word.startsWith("-")) continue;
      if (word.includes("=")) recordName(word);
    }
  } else if (commandName === "read" && isBashReadingMode());
  else if (commandName === "read") {
    let index = 1;
    let afterDoubleDash = false;
    let sawOperand = false;
    while (index < restArgv.length) {
      let word = restArgv[index];
      if (!afterDoubleDash && word === "--") {
        afterDoubleDash = true;
        index++;
        continue;
      }
      if (!afterDoubleDash && word.startsWith("-")) {
        if (READ_DATA_FLAGS.has(word)) {
          if (READ_FLAGS_WITH_CHECKED_OPERAND.has(word)) {
            let refusal = checkZshReadDivergence(
              restArgv[index + 1],
              word,
              false,
              varScope,
              bareAssignmentNames,
            );
            if (refusal) return refusal;
          }
          index += 2;
          continue;
        }
        let flagEndsCluster = false;
        for (let idx = 1; idx < word.length; idx++) {
          let flagChar = word[idx];
          if (flagChar === "a" || flagChar === "A") {
            let operand = idx < word.length - 1 ? word.slice(idx + 1) : restArgv[index + 1];
            if (operand) {
              let refusal = checkZshReadDivergence(
                operand,
                word.slice(0, idx + 1),
                true,
                varScope,
                bareAssignmentNames,
              );
              if (refusal) return refusal;
              recordName(operand);
              sawOperand = true;
            }
            flagEndsCluster = idx === word.length - 1;
            break;
          }
          if (READ_DATA_FLAGS.has("-" + flagChar)) {
            flagEndsCluster = idx === word.length - 1;
            if (flagEndsCluster && READ_FLAGS_WITH_CHECKED_OPERAND.has("-" + flagChar)) {
              let refusal = checkZshReadDivergence(
                restArgv[index + 1],
                word,
                false,
                varScope,
                bareAssignmentNames,
              );
              if (refusal) return refusal;
            }
            break;
          }
        }
        index += flagEndsCluster ? 2 : 1;
        continue;
      }
      let refusal = checkZshReadDivergence(word, null, true, varScope, bareAssignmentNames);
      if (refusal) return refusal;
      recordName(word);
      sawOperand = true;
      index++;
    }
    if (!sawOperand) writtenNames.push("REPLY");
  } else if (commandName === "printf")
    for (let k = 1; k < restArgv.length; k++) {
      let word = restArgv[k];
      if (word === "--" || !word.startsWith("-")) break;
      if (word === "-v") {
        if (restArgv[k + 1]) recordName(restArgv[k + 1]);
        k++;
        continue;
      }
      if (word.startsWith("-v")) recordName(word.slice(2));
    }
  else if (commandName === "getopts") {
    let skipCount = restArgv[1] === "--" ? 1 : 0;
    if (restArgv[2 + skipCount]) recordName(restArgv[2 + skipCount]);
    writtenNames.push("OPTARG");
    markVarUnknown(varScope, "OPTIND");
  } else if (commandName === "wait")
    for (let k = 1; k < restArgv.length; k++) {
      let word = restArgv[k];
      if (word === "--" || !word.startsWith("-")) break;
      for (let k_2 = 1; k_2 < word.length; k_2++)
        if (word[k_2] === "p") {
          if (k_2 < word.length - 1) recordName(word.slice(k_2 + 1));
          else if (restArgv[k + 1]) {
            recordName(restArgv[k + 1]);
            k++;
          }
          break;
        }
    }
  else if (!wrappedComplex && (commandName === "unset" || commandName === "unsetenv")) {
    let functionMode = false;
    let sawOperand = false;
    for (let idx = 1; idx < restArgv.length; idx++) {
      let name = restArgv[idx];
      if (name.startsWith("-")) {
        if (sawOperand)
          return {
            kind: "too-complex",
            reason: `'unset \u2026 ${name}' (wrapped form) \u2014 flag after name; getopt stops at first non-option`,
            nodeType: "command",
          };
        if (name !== "-f" && name !== "-v")
          return {
            kind: "too-complex",
            reason: `'unset ${name}' (wrapped form) \u2014 flag other than -f/-v (zsh -m pattern-unset, bash -n nameref) cannot be statically modelled`,
            nodeType: "command",
          };
        if (name === "-f") functionMode = true;
        continue;
      }
      sawOperand = true;
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
        return {
          kind: "too-complex",
          reason: `'unset ${name}' (wrapped form) \u2014 non-identifier operand may pathname-expand; cannot statically know which var is unset`,
          nodeType: "command",
        };
      if (functionMode || commandName === "unsetenv") {
        let refusal = uncertainValueResult(
          varScope.get(name),
          `'${name}' no longer has a statically known value at this unset (wrapped form) \u2014 cannot verify what the command leaves behind`,
          "command",
        );
        if (refusal !== null) return refusal;
        continue;
      }
      if (isAssignmentNameUnsafeForSandbox(name))
        return {
          kind: "too-complex",
          reason: `'unset' targets shell variable ${name} (exec-influencing / integer-attr / IFS / PS4)`,
          nodeType: "command",
        };
      if (hasArithmetic) {
        let refusal = divergentShapeResult(
          `'unset ${name}' is in a command carrying an expansion that can fail at runtime \u2014 whether the name is cleared cannot be statically verified`,
        );
        if (refusal) return refusal;
      }
      recordUnset(varScope, name, hasPriorCommands);
    }
  } else if (commandName === "print")
    for (let idx = 1; idx < restArgv.length; idx++) {
      let word = restArgv[idx];
      if (word === "--" || word === "-" || !word.startsWith("-")) break;
      let flagEndsCluster = false;
      for (let idx_2 = 1; idx_2 < word.length; idx_2++) {
        let flagChar = word[idx_2];
        if (flagChar === "v") {
          let operand = idx_2 < word.length - 1 ? word.slice(idx_2 + 1) : restArgv[idx + 1];
          if (operand) recordName(operand);
          flagEndsCluster = idx_2 === word.length - 1;
          break;
        }
        if (OPTION_LETTERS_TAKING_ARGUMENT.has("-" + flagChar)) {
          flagEndsCluster = idx_2 === word.length - 1;
          break;
        }
      }
      if (flagEndsCluster) idx++;
    }
  else if (commandName === "set")
    for (let k = 1; k < restArgv.length; k++) {
      let word = restArgv[k];
      if (word === "--" || !/^[-+]/.test(word)) break;
      let index = word.indexOf("A", 1);
      if (index === -1) {
        if (word.endsWith("o")) k++;
        continue;
      }
      if (index < word.length - 1) recordName(word.slice(index + 1));
      else if (restArgv[k + 1]) recordName(restArgv[k + 1]);
      break;
    }
  else if (commandName === "mapfile" || commandName === "readarray") {
    let sawOperand = false;
    for (let k = 1; k < restArgv.length; k++) {
      let word = restArgv[k];
      if (word.startsWith("-")) {
        if (/^-[dnOsuCc]$/.test(word)) k++;
        continue;
      }
      recordName(word);
      sawOperand = true;
    }
    if (!sawOperand) writtenNames.push("MAPFILE");
  } else if (
    !wrappedComplex &&
    (commandName === "cd" || commandName === "chdir" || commandName === "pushd" || commandName === "popd")
  ) {
    let skipsPwdUpdate = false;
    if (commandName === "pushd" || commandName === "popd")
      for (let k = 1; k < restArgv.length; k++) {
        let word = restArgv[k];
        if (word === "--") break;
        if (hasAnyShortFlagChar(word, "n")) {
          skipsPwdUpdate = true;
          break;
        }
        if (commandName === "popd" && (/^\+0*[1-9]/.test(word) || /^-0+$/.test(word))) {
          skipsPwdUpdate = true;
          break;
        }
      }
    if (!skipsPwdUpdate) {
      markVarUnknown(varScope, "PWD");
      markVarUnknown(varScope, "OLDPWD");
    }
    if (commandName === "pushd" || commandName === "popd") {
      markVarUnknown(varScope, "DIRSTACK");
      markVarUnknown(varScope, "dirstack");
    }
  }
  let declarationPrefixLength =
    commandName !== undefined && DECLARATION_BUILTINS_ZSH.has(commandName)
      ? envVars.length + prefixWords.length
      : 0;
  let prefixCountBefore = declarationPrefixCount;
  declarationPrefixCount += declarationPrefixLength;
  if (declarationPrefixLength > 0 && currentDeclarationPrefix === undefined) {
    let keepsValue =
      commandName === "export" ||
      commandName === "readonly" ||
      restArgv.some((restArg) => /^-[A-Za-z]*[xr]/.test(restArg));
    let keptNames = new Set();
    for (let arg of keepsValue ? restArgv.slice(1) : []) {
      let match = /^[A-Za-z_]\w*/.exec(arg);
      if (match !== null) keptNames.add(match[0]);
    }
    declarationPrefixBashKeeps = [
      ...(declarationPrefixBashKeeps ?? []),
      ...envVars.map((envVar) => keptNames.has(envVar.name)),
      ...prefixWords.map(({ word }) => keptNames.has(/^[A-Za-z_]\w*/.exec(word)?.[0] ?? "")),
    ];
  }
  if (declarationPrefixLength > 0 && currentDeclarationPrefix !== undefined) {
    let refusal = {
      kind: "too-complex",
      reason: `A variable set in front of ${commandName} in this command can't be checked before it runs`,
    };
    let prefixAssignments = [...envVars];
    for (let { word } of prefixWords) {
      let match = /^([A-Za-z_]\w*)(\+?)=([^]*)$/.exec(word);
      if (match === null) return refusal;
      let [, name = "", appendMark, value = ""] = match;
      prefixAssignments.push(
        appendMark === "+"
          ? {
              name,
              value,
              isAppend: true,
            }
          : {
              name,
              value,
            },
      );
    }
    if (
      currentDeclarationPrefix.length < prefixCountBefore + prefixAssignments.length ||
      (prefixWords.length > 0 && prefixAssignments.length > 1)
    )
      return refusal;
    for (let k = prefixWords.length - 1; k >= 0; k--) {
      let target = prefixWords[k]?.target;
      if (target !== undefined) writtenNames.splice(target, 1);
    }
    for (let [index, assignment] of prefixAssignments.entries()) {
      if (currentDeclarationPrefix[prefixCountBefore + index] !== true) continue;
      let existingPrefixValue = assignment.isAppend ? varScope.get(assignment.name) : "";
      let existingValue =
        existingPrefixValue === undefined ? undefined : stripUncertainPrefix(existingPrefixValue);
      if (containsAnyPlaceholder(assignment.value) || isAssignmentNameUnsafeForSandbox(assignment.name))
        return refusal;
      if (existingValue === undefined || containsAnyPlaceholder(existingValue))
        return refusal.kind === "too-complex" &&
          !readingDivergentShapes &&
          existingPrefixValue?.includes(UNCERTAIN_VAR_PLACEHOLDER) === true
          ? {
              ...refusal,
              divergentShape: true,
            }
          : refusal;
      if (hasArithmetic) {
        let refusal = divergentShapeResult(
          `'${assignment.name}' is appended to by a command carrying an expansion that can fail at runtime \u2014 whether the append happens cannot be statically verified`,
        );
        if (refusal) return refusal;
      }
      let newValue =
        (existingValue === existingPrefixValue ? "" : UNCERTAIN_PREFIX) + existingValue + assignment.value;
      varScope.set(assignment.name, newValue);
      declarationPrefixValues.set(assignment.name, existingValue + assignment.value);
    }
  }
  if (
    commandName !== undefined &&
    envVars.length > 0 &&
    !(declarationPrefixLength > 0 && currentDeclarationPrefix !== undefined) &&
    POSIX_SPECIAL_BUILTINS_NONEVAL.has(commandName)
  )
    for (let envVar of envVars) recordName(envVar.name);
  for (let writtenName of writtenNames) {
    if (isAssignmentNameUnsafeForSandbox(writtenName))
      return {
        kind: "too-complex",
        reason: `'${commandName ?? envVars[0]?.name}' writes shell variable ${writtenName} (exec-influencing / integer-attr / IFS) \u2014 value cannot be statically verified`,
        nodeType: "command",
      };
    markVarUnknown(varScope, writtenName);
  }
  bareAssignmentNames.push(...assignedNames);
  return null;
}
//@ chunk-nzz6y5xm.js:65044-65265 layout
function wrappedGlobResult(commandName, word) {
  return readingDivergentShapes
    ? null
    : {
        kind: "too-complex",
        reason: `'${commandName} ${redactPlaceholdersForDisplay(word)}' has a pattern the shell may expand, so this command can't be checked before it runs`,
        nodeType: "command",
        divergentShape: true,
        keepsRemovalVerdict: true,
      };
}
//@ chunk-nzz6y5xm.js:65265-65329 layout
var ASSIGNMENT_WORD_RE = /^([A-Za-z_]\w*)(?:\[[\s\S]*?\])?(\+?)=([\s\S]*)$/;
var RE_EXPANSION_FACTOR = 16;
//@ chunk-nzz6y5xm.js:65329-66682 layout
function checkRedirectReadsPrefixVar(children, command, redirects, commands, varScope, bareAssignmentNames) {
  let assignments = [...command.envVars];
  let wordNodes = argvWordNodes.get(command.argv);
  let sawNonAssignment = false;
  for (let [index, word] of command.argv.entries()) {
    let [, name, appendMark, value] = ASSIGNMENT_WORD_RE.exec(word) ?? [];
    let [, subscriptName] = /^([A-Za-z_]\w*)\[/.exec(word) ?? [];
    if (name !== undefined && value !== undefined)
      assignments.push({
        name,
        value,
        isAppend: appendMark === "+",
        word: wordNodes?.[index],
        isOtherElement: /^\w+\[[1-9]\d*\]/.test(word),
      });
    else if (subscriptName !== undefined) {
      assignments.push({
        name: subscriptName,
        value: VAR_PLACEHOLDER,
      });
      sawNonAssignment = true;
    } else if (
      !sawNonAssignment &&
      (assignments.length > command.envVars.length || !/^(?:time|coproc|!|-p|--)$/.test(word))
    )
      return null;
  }
  let assignedNames = new Set(assignments.map((assignment) => assignment.name));
  let filtered = children.filter(
    (child) =>
      (child?.type === "file_redirect" || child?.type === "herestring_redirect") &&
      findReferencedVar(child, assignedNames) !== null,
  );
  if (filtered.length === 0) return null;
  let refusal = divergentShapeResult(
    "A redirect in this command may read a variable the same command sets, and shells can differ on which value it gets",
  );
  if (refusal)
    return refusal.kind === "too-complex"
      ? {
          ...refusal,
          keepsRemovalVerdict: true,
        }
      : refusal;
  let varScope_2 = new Map(varScope);
  let seenNames = new Set();
  for (let { name, value, isAppend, word, isOtherElement } of assignments) {
    let resolvedValue = value;
    if (word !== undefined && findReferencedVar(word, seenNames) !== null) {
      let extraCommands = [];
      let walked = consumeReExpansionBudget(word)
        ? walkArgument(word, extraCommands, varScope_2, bareAssignmentNames)
        : undefined;
      resolvedValue = typeof walked === "string" ? ASSIGNMENT_WORD_RE.exec(walked)?.[3] : undefined;
      if (resolvedValue !== undefined) {
        let index = commands.findIndex((command_2) => command_2.argv === command.argv);
        commands.splice(index === -1 ? commands.length : index, 0, ...extraCommands);
      }
    }
    if (isOtherElement) continue;
    let existing = isAppend ? varScope_2.get(name) : "";
    if (existing === undefined || resolvedValue === undefined) markVarUnknown(varScope_2, name);
    else varScope_2.set(name, existing + resolvedValue);
    seenNames.add(name);
  }
  for (let redirect of filtered) {
    if (!consumeReExpansionBudget(redirect)) continue;
    let commandsBefore = commands.length;
    if (redirect.type === "file_redirect") {
      let result = walkFileRedirect(redirect, commands, varScope_2, bareAssignmentNames);
      commands.length = commandsBefore;
      if (!("kind" in result)) redirects.push(result);
      continue;
    }
    if (walkHerestringRedirect(redirect, commands, varScope_2, bareAssignmentNames))
      commands.length = commandsBefore;
  }
  return null;
}
//@ chunk-nzz6y5xm.js:66682-66754 layout
function consumeReExpansionBudget(node) {
  if (node.text.length > reExpansionBudget) return false;
  reExpansionBudget -= node.text.length;
  return true;
}
//@ chunk-nzz6y5xm.js:66754-69376 fingerprint (2.1.88 match: walkCommand, 0.698)
/**
 * 把一个 command 节点变成 SimpleCommand：逐子节点处理前缀赋值（同命令内前缀互相引用即拒绝）、command_name（环境清洗开启时命令名不能是变量）、参数（以 - 开头且含运行期内容拒绝）、$var、file/herestring 重定向；之后检查重定向读前缀变量、按命令更新变量作用域（applyCommandVariableWrites）。text 字段在含 $ 或换行时用重新加引号的 argv 重建。
 */
function walkCommand(node, extraRedirects, innerCommands, varScope, bareAssignmentNames) {
  let substitutionCountBefore = substitutionCount;
  let carveOutCountBefore = quoteScanCarveOutCount;
  let innerCommandCount = innerCommands.length;
  let argv = [];
  let argvNodes = [];
  if (readingDivergentShapes) argvWordNodes.set(argv, argvNodes);
  let argvUnquotedGlob = [];
  let envVars = [];
  let redirects = [...extraRedirects];
  let scopeBeforeRedirects = node.children.some((child) => child && REDIRECT_NODE_TYPES.has(child.type))
    ? new Map(varScope)
    : null;
  let arithmeticPrefixIndex = 0;
  let hasArithmetic = false;
  for (let child of node.children) {
    if (!child) continue;
    let hasArithmeticChild = containsArithmeticExpansion(child);
    switch (((hasArithmetic ||= hasArithmeticChild), child.type)) {
      case "variable_assignment": {
        if (envVars.length > 0) {
          let referencedVar = findReferencedVar(child, new Set(envVars.map((envVar) => envVar.name)));
          if (referencedVar !== null)
            return {
              kind: "too-complex",
              reason: `Env-prefix value references \`$${referencedVar}\` assigned by an earlier env-prefix in the same command \u2014 runtime sees the earlier assignment, static analysis does not`,
              nodeType: "variable_assignment",
            };
        }
        let assignment = walkVariableAssignment(child, innerCommands, varScope, bareAssignmentNames);
        if ("kind" in assignment) return assignment;
        if (isIntegerVarAssignUnsafe(assignment.name, assignment.value))
          return {
            kind: "too-complex",
            reason: `${assignment.name} has integer attribute \u2014 env-prefix arith-evals value, which can execute subscript command substitution or abort/diverge at runtime`,
            nodeType: "variable_assignment",
          };
        envVars.push(
          assignment.isAppend
            ? {
                name: assignment.name,
                value: assignment.value,
                isAppend: true,
              }
            : {
                name: assignment.name,
                value: assignment.value,
              },
        );
        if (hasArithmeticChild) arithmeticPrefixIndex = envVars.length - 1;
        break;
      }
      case "command_name": {
        let commandNode = child.children[0] ?? child;
        if (isScrubEnabled()) {
          if (commandNode.type === "simple_expansion" || commandNode.type === "expansion")
            return tooComplex(commandNode);
          if (
            (commandNode.type === "string" || commandNode.type === "concatenation") &&
            containsExpansionNode(commandNode)
          )
            return tooComplex(commandNode);
        }
        let commandName = walkArgument(commandNode, innerCommands, varScope, bareAssignmentNames);
        if (typeof commandName !== "string") return commandName;
        argv.push(commandName);
        argvNodes.push(commandNode);
        argvUnquotedGlob.push(hasUnquotedGlob(commandNode.text) || nodeHasUnquotedGlob(commandNode));
        break;
      }
      case "word":
      case "number":
      case "raw_string":
      case "string":
      case "concatenation":
      case "arithmetic_expansion": {
        let arg = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
        if (typeof arg !== "string") return arg;
        if (/^--?[\nA-Za-z0-9_]/.test(arg) && containsAnyPlaceholder(arg))
          return {
            kind: "too-complex",
            reason: "Argument starting with `-` contains runtime-determined content",
            nodeType: child.type,
          };
        argv.push(arg);
        argvNodes.push(child);
        argvUnquotedGlob.push(hasUnquotedGlob(child.text) || nodeHasUnquotedGlob(child));
        break;
      }
      case "simple_expansion": {
        substitutionCount++;
        let v = resolveSimpleExpansion(child, varScope, false);
        if (typeof v !== "string") return v;
        argv.push(v);
        argvNodes.push(child);
        argvUnquotedGlob.push(true);
        break;
      }
      case "file_redirect": {
        let firstEnvName = envVars[0]?.name;
        if (firstEnvName !== undefined && hasArithmeticChild) {
          let refusal = prefixAssignmentMayFailResult(firstEnvName);
          if (refusal) return refusal;
        }
        let result = walkFileRedirect(child, innerCommands, varScope, bareAssignmentNames);
        if ("kind" in result) return result;
        redirects.push(result);
        break;
      }
      case "herestring_redirect": {
        substitutionCount++;
        let firstEnvName = envVars[0]?.name;
        if (firstEnvName !== undefined && hasArithmeticChild) {
          let refusal = prefixAssignmentMayFailResult(firstEnvName);
          if (refusal) return refusal;
        }
        let failure = walkHerestringRedirect(child, innerCommands, varScope, bareAssignmentNames);
        if (failure) return failure;
        break;
      }
      default:
        return tooComplex(child);
    }
  }
  if (scopeBeforeRedirects) {
    let refusal = checkRedirectReadsPrefixVar(
      node.children,
      {
        argv,
        envVars,
      },
      redirects,
      innerCommands,
      varScope,
      bareAssignmentNames,
    );
    if (refusal) return refusal;
  }
  let firstEnvName = envVars[0]?.name;
  if (arithmeticPrefixIndex > 0 && firstEnvName !== undefined) {
    let refusal = prefixAssignmentMayFailResult(firstEnvName);
    if (refusal) return refusal;
  }
  {
    let refusal = applyCommandVariableWrites(
      argv,
      envVars,
      varScope,
      bareAssignmentNames,
      innerCommandCount > 0,
      hasArithmetic,
    );
    if (refusal) return refusal;
  }
  if (scopeBeforeRedirects) mergeScopeAfterConditional(varScope, scopeBeforeRedirects);
  let quoteWord = (word, index) =>
    word === "" || /["'\\ \t\n$`;|&<>(){}#]/.test(word) || (index === 0 && word.includes("="))
      ? `'${word.replaceAll("'", "'\\''")}'`
      : word;
  let text =
    /\$[A-Za-z_]/.test(node.text) ||
    node.text.includes(`
`)
      ? [
          ...envVars.map((envVar) => `${envVar.name}=${quoteWord(envVar.value)}`),
          ...argv.map((arg, index) => quoteWord(arg, index)),
        ].join(" ")
      : node.text;
  let hasUnquotedGlob_2 = hasUnquotedGlob(node.text);
  return {
    kind: "simple",
    commands: [
      {
        argv,
        envVars,
        redirects,
        text,
        hasUnquotedGlob: hasUnquotedGlob_2,
        argvSourceLiteral: substitutionCount === substitutionCountBefore,
        carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== carveOutCountBefore,
        argvUnquotedGlob,
      },
    ],
    bareAssignmentNames: [],
  };
}
//@ chunk-nzz6y5xm.js:69376-69389 layout
var GLOB_CHARS = "*?[";
//@ chunk-nzz6y5xm.js:69389-69720 layout
function nodeHasUnquotedGlob(child) {
  switch (child.type) {
    case "word":
    case "number":
      for (let i = 0; i < child.text.length; i++)
        if (child.text[i] === "\\") i++;
        else if (GLOB_CHARS.includes(child.text[i])) return true;
      return false;
    case "string":
    case "raw_string":
    case "simple_expansion":
    case "arithmetic_expansion":
      return false;
    case "concatenation":
      return child.children.some((child) => child !== null && nodeHasUnquotedGlob(child));
    default:
      return true;
  }
}
//@ chunk-nzz6y5xm.js:69720-70577 layout
/**
 * 递归分析 $(…)：要求子节点之间只有空白/分号/续行（否则“bytes no parsed node accounts for”），内部命令以复制的作用域收集进同一命令列表，空替换补一条 true 命令。
 */
function walkCommandSubstitution(node, innerCommands, varScope, bareAssignmentNames) {
  if (allowPlainUnquotedHeredocs && collectCommandSubstitution(node, "heredoc_redirect"))
    return tooComplex(node);
  let innerScope = new Map(varScope);
  let innerCommandCount = innerCommands.length;
  let sawContent = false;
  {
    let buffer = Buffer.from(node.text, "utf8");
    let isGapByte = (byte) =>
      byte === 32 || byte === 9 || byte === 10 || byte === 13 || byte === 59 || byte === 38;
    let isOnlyGap = (start, end) => {
      let index = start;
      while (index < end) {
        let byte = buffer[index];
        if (isGapByte(byte)) index++;
        else if (
          byte === 92 &&
          (buffer[index + 1] === 10 || (buffer[index + 1] === 13 && buffer[index + 2] === 10))
        )
          index += buffer[index + 1] === 13 ? 3 : 2;
        else return false;
      }
      return true;
    };
    let cursor = 0;
    for (let child of node.children) {
      if (!child) continue;
      let childStart = child.startIndex - node.startIndex;
      if (!isOnlyGap(cursor, childStart))
        return {
          kind: "too-complex",
          reason: "command substitution contains bytes no parsed node accounts for",
        };
      cursor = child.endIndex - node.startIndex;
    }
    if (!isOnlyGap(cursor, buffer.length))
      return {
        kind: "too-complex",
        reason: "command substitution contains bytes no parsed node accounts for",
      };
  }
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "$(" || child.type === "`" || child.type === ")") continue;
    if (child.type !== "comment") sawContent = true;
    let commands = collectCommands(child, innerCommands, innerScope, bareAssignmentNames);
    if (commands) return commands;
  }
  if (sawContent && innerCommands.length === innerCommandCount) pushTrueCommand(innerCommands, node);
  return null;
}
//@ chunk-nzz6y5xm.js:70577-73087 fingerprint (2.1.88 match: walkArgument, 0.634)
/**
 * 把参数节点解析成字符串：word（拒绝花括号展开、转义花括号、漏解析的 $ 或反引号、被吞的引号）、number、raw_string、string、concatenation（拒绝子节点间遗漏字节、zsh $name[expr]）、算术展开（返回 VAR_PLACEHOLDER）、$var；其余 too-complex。
 */
function walkArgument(node, innerCommands, varScope, bareAssignmentNames) {
  if (!node)
    return {
      kind: "too-complex",
      reason: "Null argument node",
    };
  switch (node.type) {
    case "word": {
      if (BRACE_EXPANSION_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Word contains brace expansion syntax",
          nodeType: "word",
          differential: true,
        };
      if (BRACE_ESCAPED_CLOSE_RE.test(node.text) || BRACE_ESCAPED_OPEN_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Brace body contains backslash-escaped brace",
          nodeType: "word",
          differential: true,
        };
      if (WORD_LEAF_EXPANSION_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Word contains unescaped ` or $ \u2014 parser missed expansion",
          nodeType: "word",
          differential: true,
        };
      if (WORD_LEAF_QUOTE_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Word contains unescaped quote \u2014 parser absorbed quote into brace-body word",
          nodeType: "word",
        };
      return node.text.replace(/\\(.)/g, "$1");
    }
    case "number":
      if (node.children.length > 0)
        return {
          kind: "too-complex",
          reason: "Number node contains expansion (NN# arithmetic base syntax)",
          nodeType: node.children[0]?.type,
        };
      return node.text;
    case "raw_string":
      return stripRawString(node.text);
    case "string":
      return walkString(node, innerCommands, varScope, bareAssignmentNames);
    case "concatenation": {
      if (BRACE_EXPANSION_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Brace expansion",
          nodeType: "concatenation",
          differential: true,
        };
      if (BRACE_ESCAPED_CLOSE_RE.test(node.text) || BRACE_ESCAPED_OPEN_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Brace body contains backslash-escaped brace",
          nodeType: "concatenation",
          differential: true,
        };
      let result = "";
      let sawBraceWord = false;
      let startIndex = node.startIndex;
      for (let k = 0; k < node.children.length; k++) {
        let childNode = node.children[k];
        if (!childNode) continue;
        if (childNode.startIndex > startIndex)
          return {
            kind: "too-complex",
            reason:
              "Concatenation has unparsed bytes between children \u2014 parser dropped content that shell will see",
            nodeType: "concatenation",
          };
        startIndex = childNode.endIndex;
        if (childNode.type === "word" && childNode.text.includes("{")) sawBraceWord = true;
        if (
          (childNode.type === "simple_expansion" || childNode.type === "expansion") &&
          (node.children[k + 1]?.text.startsWith("[") || /^:[a-zA-Z&]/.test(node.children[k + 1]?.text ?? ""))
        )
          return {
            kind: "too-complex",
            reason: "zsh $name[expr] / $name:mod in bare concatenation \u2014 recursive eval",
            nodeType: "concatenation",
            differential: true,
          };
        let part = walkArgument(childNode, innerCommands, varScope, bareAssignmentNames);
        if (typeof part !== "string") return part;
        result += part;
      }
      if (sawBraceWord && (result.includes(",") || result.includes("..")))
        return {
          kind: "too-complex",
          reason: "Brace expansion (unquoted `{` in concatenation with `,`/`..`)",
          nodeType: "concatenation",
        };
      if (ZSH_TILDE_BRACKET_RE.test(result))
        return {
          kind: "too-complex",
          reason: "zsh ~[ dynamic directory syntax (post-collapse)",
          nodeType: "concatenation",
          differential: true,
        };
      if (ZSH_EQUALS_EXPANSION_RE.test(result))
        return {
          kind: "too-complex",
          reason: "zsh =cmd expansion (post-collapse)",
          nodeType: "concatenation",
          differential: true,
        };
      return result;
    }
    case "arithmetic_expansion": {
      substitutionCount++;
      let err = walkArithmetic(node);
      if (err) return err;
      return VAR_PLACEHOLDER;
    }
    case "simple_expansion":
      substitutionCount++;
      return resolveSimpleExpansion(node, varScope, false);
    default:
      return tooComplex(node);
  }
}
//@ chunk-nzz6y5xm.js:73087-75743 fingerprint (2.1.88 match: walkString, 0.508)
/**
 * 解析双引号字符串：拼接 string_content，处理 $（拒绝 $[...]、zsh $+ 等前缀标志）、$(cat <<EOF) 安全内联、其他命令替换（递归收集并以 CMDSUB_PLACEHOLDER 代替）、$var（按作用域取值）、算术展开；子节点间间隙含反引号时拒绝。
 */
function walkString(node, innerCommands, varScope, bareAssignmentNames) {
  let result = "";
  let cursor = -1;
  let sawPlaceholder = false;
  let sawContent = false;
  let sawEmptyExpansion = false;
  for (let child of node.children) {
    if (!child) continue;
    if (cursor !== -1 && child.startIndex > cursor) {
      let str = Buffer.from(node.text, "utf8")
        .subarray(cursor - node.startIndex, child.startIndex - node.startIndex)
        .toString("utf8");
      if (str.includes("`"))
        return {
          kind: "too-complex",
          reason:
            "Unanalyzable backtick body in double-quoted string gap \u2014 shell-evaluated value unknown",
          nodeType: "string",
          differential: true,
        };
      if (str.length > 0) {
        result += str;
        sawContent = true;
      }
    }
    switch (((cursor = child.endIndex), child.type)) {
      case '"':
        cursor = child.endIndex;
        break;
      case "string_content":
        result += child.text.replace(/\\\n/g, "").replace(/\\([$`"\\])/g, "$1");
        sawContent = true;
        break;
      case DOLLAR: {
        let index = node.children.indexOf(child);
        let nextNode = node.children[index + 1];
        if (nextNode?.type === "string_content") {
          if (nextNode.text.startsWith("["))
            return {
              kind: "too-complex",
              reason: "Legacy $[...] arithmetic inside double-quotes \u2014 recursive subscript eval",
              nodeType: "string",
              differential: true,
            };
          if (/^[+^=~]/.test(nextNode.text))
            return {
              kind: "too-complex",
              reason: "zsh $+/$^/$=/$~ prefix-flag expansion \u2014 value defeats downstream content checks",
              nodeType: "string",
              differential: true,
            };
          let previousNode = node.children[index - 1];
          if (
            /^:[a-zA-Z&]/.test(nextNode.text) &&
            previousNode?.type === "simple_expansion" &&
            previousNode.endIndex === child.startIndex &&
            previousNode.children.some((child) => child?.type === "special_variable_name")
          )
            return {
              kind: "too-complex",
              reason: 'zsh "$name[expr]" / "$name:mod" inside double-quotes \u2014 recursive eval',
              nodeType: "string",
              differential: true,
            };
        }
        result += DOLLAR;
        sawContent = true;
        break;
      }
      case "command_substitution": {
        let heredocBody = extractSafeCatHeredoc(child);
        if (heredocBody === "DANGEROUS") return tooComplex(child);
        if (heredocBody !== null) {
          let trimmed = heredocBody.replace(/\n+$/, "");
          if (QUOTE_OR_BACKSLASH_RE.test(child.text)) quoteScanCarveOutCount++;
          if (
            trimmed.includes(`
`)
          ) {
            if (/^--?[A-Za-z0-9]/.test(result + trimmed))
              return {
                kind: "too-complex",
                reason: "cat-heredoc body would make the argument start with option syntax",
                nodeType: "command_substitution",
              };
            catHeredocInlineCount++;
            result +=
              `
` + CMDSUB_PLACEHOLDER;
            sawContent = true;
            break;
          }
          catHeredocInlineCount++;
          result += trimmed;
          sawContent = true;
          break;
        }
        let err = walkCommandSubstitution(child, innerCommands, varScope, bareAssignmentNames);
        if (err) return err;
        substitutionCount++;
        result += CMDSUB_PLACEHOLDER;
        sawPlaceholder = true;
        break;
      }
      case "simple_expansion": {
        substitutionCount++;
        let err = resolveSimpleExpansion(child, varScope, true);
        if (typeof err !== "string") return err;
        {
          let nextNode = node.children[node.children.indexOf(child) + 1];
          let any = child.children.some((child) => child?.type === "special_variable_name");
          if (
            nextNode?.type === "string_content" &&
            (nextNode.text.startsWith("[") ||
              /^:[a-zA-Z&]/.test(nextNode.text) ||
              (any && ZSH_SUBSCRIPT_OR_MODIFIER_RE.test(nextNode.text)))
          )
            return {
              kind: "too-complex",
              reason: 'zsh "$name[expr]" / "$name:mod" inside double-quotes \u2014 recursive eval',
              nodeType: "string",
              differential: true,
            };
        }
        if (containsAnyPlaceholder(err)) sawPlaceholder = true;
        else if (err !== "") sawContent = true;
        else sawEmptyExpansion = true;
        result += err;
        break;
      }
      case "arithmetic_expansion": {
        let err = walkArithmetic(child);
        if (err) return err;
        substitutionCount++;
        result += VAR_PLACEHOLDER;
        sawPlaceholder = true;
        break;
      }
      default:
        return tooComplex(child);
    }
  }
  if (sawPlaceholder) {
    if ([...result.replaceAll(CMDSUB_PLACEHOLDER, "").replaceAll(VAR_PLACEHOLDER, "")].length <= 1)
      return tooComplex(node);
  }
  if (!sawContent && !sawPlaceholder && !sawEmptyExpansion && node.text.length > 2) {
    let sliced = node.text.slice(1, -1);
    if (sliced.includes("`") || sliced.includes("$("))
      return {
        kind: "too-complex",
        reason: "Delimiters-only string node contains unparsed command substitution",
        nodeType: "string",
        differential: true,
      };
    return sliced;
  }
  return result;
}
//@ chunk-nzz6y5xm.js:75743-75864 layout
var ARITH_LITERAL_TOKEN_RE =
  /^(?:[0-9]+|0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z]+|[-+*/%^&|~!<>=?:(),]+|<<|>>|\*\*|&&|\|\||[<>=!]=|\$\(\(|\)\))$/;
//@ chunk-nzz6y5xm.js:75864-76293 fingerprint (2.1.88 match: walkArithmetic, 1)
/**
 * 校验算术展开：叶子只能是数字字面量或运算符，引用变量即 too-complex。
 */
function walkArithmetic(node) {
  for (let child of node.children) {
    if (!child) continue;
    if (child.children.length === 0) {
      if (!ARITH_LITERAL_TOKEN_RE.test(child.text))
        return {
          kind: "too-complex",
          reason: `Arithmetic expansion references variable or non-literal: ${child.text}`,
          nodeType: "arithmetic_expansion",
        };
      continue;
    }
    switch (child.type) {
      case "binary_expression":
      case "unary_expression":
      case "ternary_expression":
      case "parenthesized_expression": {
        let err = walkArithmetic(child);
        if (err) return err;
        break;
      }
      default:
        return tooComplex(child);
    }
  }
  return null;
}
//@ chunk-nzz6y5xm.js:76293-76395 layout
function pushTrueCommand(commands, node) {
  commands.push({
    argv: ["true"],
    envVars: [],
    redirects: [],
    text: node.text,
    hasUnquotedGlob: hasUnquotedGlob(node.text),
  });
}
//@ chunk-nzz6y5xm.js:76395-76508 layout
function containsArithmeticExpansion(child) {
  if (child.type === "arithmetic_expansion") return true;
  for (let child_2 of child.children) if (child_2 && containsArithmeticExpansion(child_2)) return true;
  return false;
}
//@ chunk-nzz6y5xm.js:76508-77187 fingerprint (2.1.88 match: extractSafeCatHeredoc, 0.926)
/**
 * 识别 $(cat <<'EOF' … EOF) 这种安全的字面量替换：只含一个 cat 命令和一个合法 heredoc 时返回正文；正文含 /proc/*\/environ 或危险 awk 程序时返回 'DANGEROUS'；否则 null。
 */
function extractSafeCatHeredoc(subNode) {
  let stmt = null;
  for (let child of subNode.children) {
    if (!child) continue;
    if (child.type === "$(" || child.type === ")") continue;
    if (child.type === "redirected_statement" && stmt === null) stmt = child;
    else return null;
  }
  if (!stmt) return null;
  let sawCat = false;
  let body = null;
  for (let child of stmt.children) {
    if (!child) continue;
    if (child.type === "command") {
      let cmdChildren = child.children.filter((child) => child);
      if (cmdChildren.length !== 1) return null;
      let nameNode = cmdChildren[0];
      if (nameNode?.type !== "command_name" || nameNode.text !== "cat") return null;
      sawCat = true;
    } else if (child.type === "heredoc_redirect") {
      if (walkHeredocRedirect(child) !== null) return null;
      for (let hc of child.children) {
        if (hc?.type === "<<-") return null;
        if (hc?.type === "heredoc_body") body = hc.text;
      }
    } else return null;
  }
  if (!sawCat || body === null) return null;
  if (PROC_ENVIRON_RE.test(body)) return "DANGEROUS";
  if (awkProgramHasExecBridge(body) !== false) return "DANGEROUS";
  return body;
}
//@ chunk-nzz6y5xm.js:77187-78771 fingerprint (2.1.88 match: walkVariableAssignment, 0.966)
/**
 * 解析 NAME=value / NAME+=value：命令替换值记为 CMDSUB_PLACEHOLDER，$var 按作用域解析，其余经 walkArgument；返回 {name, value, isAppend} 或 too-complex。
 */
function walkVariableAssignment(node, innerCommands, varScope, bareAssignmentNames) {
  let name = null;
  let value = "";
  let isAppend = false;
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "variable_name") name = child.text;
    else if (child.type === "=" || child.type === "+=") {
      isAppend = child.type === "+=";
      continue;
    } else if (child.type === "command_substitution") {
      let err = walkCommandSubstitution(child, innerCommands, varScope, bareAssignmentNames);
      if (err) return err;
      value = CMDSUB_PLACEHOLDER;
    } else if (child.type === "simple_expansion") {
      let v = resolveSimpleExpansion(child, varScope, true);
      if (typeof v !== "string") return v;
      value = v;
    } else {
      let v = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
      if (typeof v !== "string") return v;
      value = v;
    }
  }
  if (name === null)
    return {
      kind: "too-complex",
      reason: "Variable assignment without name",
      nodeType: "variable_assignment",
    };
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
    return {
      kind: "too-complex",
      reason: `Invalid variable name (bash treats as command): ${name}`,
      nodeType: "variable_assignment",
    };
  if (name === "IFS")
    return {
      kind: "too-complex",
      reason: "IFS assignment changes word-splitting \u2014 cannot model statically",
      nodeType: "variable_assignment",
    };
  if (name === "PS4" || name === "PROMPT4") {
    if (isAppend)
      return {
        kind: "too-complex",
        reason: "PS4 += cannot be statically verified \u2014 combine into a single PS4= assignment",
        nodeType: "variable_assignment",
      };
    if (containsAnyPlaceholder(value))
      return {
        kind: "too-complex",
        reason: "PS4 value derived from cmdsub/variable \u2014 runtime unknowable",
        nodeType: "variable_assignment",
      };
    if (!/^[A-Za-z0-9 _+:./=[\]-]*$/.test(value.replace(/\$\{[A-Za-z_][A-Za-z0-9_]*\}/g, "")))
      return {
        kind: "too-complex",
        reason: "PS4 value outside safe charset \u2014 only ${VAR} refs and [A-Za-z0-9 _+:.=/[]-] allowed",
        nodeType: "variable_assignment",
      };
  }
  if (value.includes("~") && !readingDivergentShapes)
    return {
      kind: "too-complex",
      reason: "Tilde in assignment value \u2014 bash may expand at assignment time",
      nodeType: "variable_assignment",
    };
  return {
    name,
    value,
    isAppend,
  };
}
//@ chunk-nzz6y5xm.js:78771-79365 facade-majority
/**
 * bash/zsh 会隐式改写的特殊变量集合（_、RANDOM、SECONDS、REPLY、PIPESTATUS、BASH_REMATCH、MATCH、OPTARG、PS1 等），这些变量的值不能当作已跟踪的常量。
 */
var BASH_IMPLICITLY_REBOUND_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nzz6y5xm.js:78771", () => {
  BASH_IMPLICITLY_REBOUND_VARS = new Set([
    "_",
    "RANDOM",
    "SECONDS",
    "LINENO",
    "BASH_COMMAND",
    "FUNCNAME",
    "EPOCHSECONDS",
    "EPOCHREALTIME",
    "SRANDOM",
    "BASHPID",
    "BASH_MONOSECONDS",
    "BASH_TRAPSIG",
    "HISTCMD",
    "ERRNO",
    "REPLY",
    "reply",
    "PIPESTATUS",
    "pipestatus",
    "BASH_SOURCE",
    "DIRSTACK",
    "GROUPS",
    "BASH_ARGV",
    "BASH_ARGC",
    "BASH_SUBSHELL",
    "BASH_LINENO",
    "BASH_ARGV0",
    "BASH_REMATCH",
    "MATCH",
    "match",
    "MBEGIN",
    "MEND",
    "mbegin",
    "mend",
    "OPTARG",
    "OPTIND",
    "argv",
    "FIGNORE",
    "fignore",
    "PSVAR",
    "psvar",
    "WATCH",
    "watch",
    "HISTCHARS",
    "histchars",
    "PS1",
    "PROMPT",
    "prompt",
    "PS2",
    "PROMPT2",
    "PS3",
    "PROMPT3",
    "PS4",
    "PROMPT4",
    "RPS1",
    "RPROMPT",
    "RPS2",
    "RPROMPT2",
  ]);
});
//@ chunk-nzz6y5xm.js:79365-80041 fingerprint (2.1.88 match: resolveSimpleExpansion, 0.526)
/**
 * 解析 $var：作用域里有值时返回值（不确定值→too-complex+divergentShape；动态变量只在引号内且是安全环境变量时返回占位符；裸用时空值或含空白/通配的值拒绝）；HOME 取本机 homedir；引号内的安全环境变量与特殊变量返回 VAR_PLACEHOLDER；其余 too-complex。
 */
function resolveSimpleExpansion(node, varScope, insideString) {
  let varName = null;
  let isSpecial = false;
  for (let child of node.children) {
    if (child?.type === "variable_name") {
      varName = child.text;
      break;
    }
    if (child?.type === "special_variable_name") {
      varName = child.text;
      isSpecial = true;
      break;
    }
  }
  if (varName === null) return tooComplex(node);
  let trackedValue = varScope.get(varName);
  let value = trackedValue === undefined ? undefined : stripUncertainPrefix(trackedValue);
  if (value !== undefined) {
    if (value.includes(UNCERTAIN_VAR_PLACEHOLDER)) {
      let failure = tooComplex(node);
      return failure.kind === "too-complex" && !readingDivergentShapes
        ? {
            ...failure,
            divergentShape: true,
          }
        : failure;
    }
    if (BASH_IMPLICITLY_REBOUND_VARS.has(varName))
      return insideString && SAFE_ENV_VARS.has(varName) && varName !== "BASHPID"
        ? VAR_PLACEHOLDER
        : tooComplex(node);
    if (containsAnyPlaceholder(value)) {
      if (!insideString) return tooComplex(node);
      usedAssignedValue ||= value !== VAR_PLACEHOLDER && value !== CMDSUB_PLACEHOLDER;
      return value;
    }
    if (!insideString) {
      if (value === "") return tooComplex(node);
      if (BARE_VAR_UNSAFE_RE.test(value)) return tooComplex(node);
    }
    usedAssignedValue = true;
    return value;
  }
  if (varName === "HOME") {
    let home = homedir();
    if (!insideString && (home === "" || BARE_VAR_UNSAFE_RE.test(home))) return tooComplex(node);
    return home;
  }
  if (insideString) {
    if (SAFE_ENV_VARS.has(varName)) return VAR_PLACEHOLDER;
    if (isSpecial && (SPECIAL_VAR_NAMES.has(varName) || /^[0-9]+$/.test(varName))) return VAR_PLACEHOLDER;
  }
  return tooComplex(node);
}
//@ chunk-nzz6y5xm.js:80041-80066 layout
function markLoopWritesUnknown(varScope, node) {
  markWrittenVarsUnknown(node, varScope);
}
//@ chunk-nzz6y5xm.js:80066-80413 layout
/**
 * later 轮次下重新遍历循环体（嵌套超过 MAX_LOOP_NESTING=5 即 too-complex），返回循环中值被改变的变量名；保存/恢复相关模块级状态。
 */
function collectLoopWrites(loopNode, commands, varScope, bareAssignmentNames) {
  if (!isLaterLoopPass || loopNode === currentLoopNode) return [];
  if (loopDepth >= MAX_LOOP_NESTING)
    return {
      kind: "too-complex",
      reason: "Loops nested too deeply to follow the variables they change",
      nodeType: loopNode.type,
    };
  let probeScope = new Map(varScope);
  let savedLoopNode = currentLoopNode;
  let savedUsedAssignedValue = usedAssignedValue;
  let savedUncertainWrite = sawUncertainWrite;
  let savedPrefixCount = declarationPrefixCount;
  let savedBashKeeps = declarationPrefixBashKeeps;
  let savedPrefixValues = declarationPrefixValues;
  let savedPrefixInBranch = prefixAssignInBranch;
  declarationPrefixValues = new Map(savedPrefixValues);
  currentLoopNode = loopNode;
  loopDepth++;
  let commands_2 = collectCommands(loopNode, [...commands], probeScope, [...bareAssignmentNames]);
  loopDepth--;
  currentLoopNode = savedLoopNode;
  usedAssignedValue = savedUsedAssignedValue;
  sawUncertainWrite = savedUncertainWrite;
  declarationPrefixCount = savedPrefixCount;
  declarationPrefixBashKeeps = savedBashKeeps;
  declarationPrefixValues = savedPrefixValues;
  prefixAssignInBranch = savedPrefixInBranch;
  return commands_2 ?? [...varScope.keys()].filter((key) => probeScope.get(key) !== varScope.get(key));
}
//@ chunk-nzz6y5xm.js:80413-80928 layout
function markUnsetOperandsUnknown(operands, varScope) {
  let markAllUnknown = () => {
    for (let key of varScope.keys()) markVarUnknown(varScope, key);
  };
  for (let operand of operands) {
    if (operand?.type === "unset" && operand.text === "unsetenv") return;
    if (
      !operand ||
      operand.type === "unset" ||
      operand.type === "file_redirect" ||
      operand.type === "heredoc_redirect" ||
      operand.type === "herestring_redirect"
    )
      continue;
    if (operand.type === "variable_name") {
      markVarUnknown(varScope, operand.text.replace(/\\/g, ""));
      continue;
    }
    if (operand.type === "word") {
      if (operand.text.startsWith("-")) {
        if (operand.text === "--" || /^-[fvn]+$/.test(operand.text)) continue;
        markAllUnknown();
        continue;
      }
      if (/^\\?[A-Za-z_][A-Za-z0-9_]*$/.test(operand.text)) {
        markVarUnknown(varScope, operand.text.replace(/^\\/, ""));
        continue;
      }
    }
    markAllUnknown();
  }
}
//@ chunk-nzz6y5xm.js:80928-81367 layout
function staticWordValue(child) {
  if (!child) return null;
  switch (child.type) {
    case "word":
    case "number":
      return child.text.replace(/\\(.)/g, "$1");
    case "raw_string":
      return child.text.slice(1, -1);
    case "string": {
      let filtered = child.children.filter((child) => child && child.type !== '"');
      if (filtered.length === 0) return "";
      if (filtered.length === 1 && filtered[0]?.type === "string_content") return filtered[0].text;
      return null;
    }
    case "concatenation": {
      let joined = "";
      for (let child_2 of child.children) {
        let part = staticWordValue(child_2);
        if (part === null) return null;
        joined += part;
      }
      return joined;
    }
    default:
      return null;
  }
}
//@ chunk-nzz6y5xm.js:81367-84159 layout
/**
 * 遍历子树，把可能被写入的变量在作用域中标为未知（赋值、for 变量、read/mapfile/unset、包装命令中的赋值等；跳过函数定义/子 shell/替换与后台命令）。用于循环与 while 条件。
 */
function markWrittenVarsUnknown(node, varScope) {
  if (
    node.type === "function_definition" ||
    node.type === "subshell" ||
    node.type === "command_substitution" ||
    node.type === "process_substitution"
  )
    return;
  if (node.type === "pipeline") {
    let lastCommand = null;
    for (let child of node.children) if (child && !SEPARATOR_TYPES.has(child.type)) lastCommand = child;
    if (lastCommand) markWrittenVarsUnknown(lastCommand, varScope);
    return;
  }
  if (node.type === "list" || node.type === "program") {
    let children = node.children;
    for (let i = 0; i < children.length; i++) {
      let child = children[i];
      if (!child || SEPARATOR_TYPES.has(child.type)) continue;
      let nextIndex = i + 1;
      while (nextIndex < children.length && !children[nextIndex]) nextIndex++;
      if (children[nextIndex]?.type === "&") continue;
      markWrittenVarsUnknown(child, varScope);
    }
    return;
  }
  if (node.type === "variable_assignment") {
    for (let child of node.children)
      if (child?.type === "variable_name") {
        markVarUnknown(varScope, child.text);
        break;
      }
  }
  if (node.type === "for_statement") {
    for (let child of node.children)
      if (child?.type === "variable_name") {
        markVarUnknown(varScope, child.text);
        break;
      }
  }
  if (node.type === "unset_command") markUnsetOperandsUnknown(node.children, varScope);
  if (node.type === "command") {
    let commandName;
    let commandNode;
    let words = [];
    let wordNodes = [];
    let sawName = false;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "command_name") {
        commandNode = child;
        commandName = staticWordValue(child.children[0] ?? child) ?? undefined;
        sawName = true;
      } else if (
        !sawName ||
        child.type === "file_redirect" ||
        child.type === "herestring_redirect" ||
        child.type === "heredoc_redirect"
      );
      else {
        words.push(staticWordValue(child) ?? "");
        wordNodes.push(child);
      }
    }
    let wrappedComplex = false;
    let previousWrapper;
    while (commandName !== undefined && (COMMAND_WRAPPER_BUILTINS.has(commandName) || commandName === "!")) {
      if (
        (previousWrapper === "builtin" || previousWrapper === "command") &&
        commandName !== "builtin" &&
        commandName !== "command" &&
        commandName !== "noglob"
      )
        wrappedComplex = true;
      let currentWrapper = commandName === "!" ? undefined : commandName;
      while (words.length > 0) {
        let word = words[0];
        if (/^-[-pvV]*$/.test(word)) {
          if (
            /[vV]/.test(word) ||
            (currentWrapper === "builtin" && /p/.test(word) && isStagedPumpkinEnabled())
          )
            wrappedComplex = true;
          words.shift();
          wordNodes.shift();
        } else if (/^[A-Za-z_]\w*(\[[^\]]*\])?\+?=/.test(word)) {
          if (
            currentWrapper !== undefined &&
            ASSIGNING_WRAPPERS.has(currentWrapper) &&
            ((SAFE_PREFIX_ASSIGN_RE.test(word) && !containsAnyPlaceholder(word)) || readingDivergentShapes) &&
            isStagedPumpkinEnabled()
          )
            wrappedComplex = true;
          let name = word.match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
          markVarUnknown(varScope, name);
          words.shift();
          wordNodes.shift();
          currentWrapper = undefined;
        } else break;
      }
      previousWrapper = currentWrapper;
      commandName = words.shift();
      wordNodes.shift();
    }
    let args = words;
    let markName = (arg) => {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(arg)) markVarUnknown(varScope, arg);
    };
    if (commandName === "read" && !isBashReadingMode()) {
      markVarUnknown(varScope, "REPLY");
      let index = 0;
      let afterDoubleDash = false;
      while (index < args.length) {
        let arg = args[index];
        if (!afterDoubleDash && arg === "--") {
          afterDoubleDash = true;
          index++;
          continue;
        }
        if (!afterDoubleDash && arg.startsWith("-")) {
          if (READ_DATA_FLAGS.has(arg)) {
            index += 2;
            continue;
          }
          let flagEndsCluster = false;
          for (let k = 1; k < arg.length; k++) {
            let flagChar = arg[k];
            if (flagChar === "a" || flagChar === "A") {
              markName(k < arg.length - 1 ? arg.slice(k + 1) : (args[index + 1] ?? ""));
              flagEndsCluster = k === arg.length - 1;
              break;
            }
            if (READ_DATA_FLAGS.has("-" + flagChar)) {
              flagEndsCluster = k === arg.length - 1;
              break;
            }
          }
          index += flagEndsCluster ? 2 : 1;
          continue;
        }
        markName(arg);
        index++;
      }
    } else if (commandName === "mapfile" || commandName === "readarray") {
      markVarUnknown(varScope, "MAPFILE");
      for (let k = 0; k < args.length; k++) {
        let arg = args[k];
        if (arg.startsWith("-")) {
          if (/^-[dnOsuCc]$/.test(arg)) k++;
          continue;
        }
        markName(arg);
      }
    } else if (commandName === "unset" && !wrappedComplex) markUnsetOperandsUnknown(wordNodes, varScope);
    let nameNode = commandNode?.children[0];
    let commandText = nameNode?.type === "word" ? nameNode.text.replace(/\\(.)/g, "$1") : undefined;
    let walkAssignments =
      commandText !== undefined &&
      !POSIX_SPECIAL_BUILTINS_NONEVAL.has(commandText) &&
      !COMMAND_WRAPPER_BUILTINS.has(commandText) &&
      !(currentDeclarationPrefix === undefined ? DECLARATION_BUILTINS : DECLARATION_BUILTINS_ZSH).has(
        commandText,
      );
    for (let child of node.children)
      if (child && (child.type !== "variable_assignment" || !walkAssignments))
        markWrittenVarsUnknown(child, varScope);
    return;
  }
  if (node.type === "declaration_command") {
    for (let child of node.children)
      if (
        child?.type === "string" ||
        child?.type === "raw_string" ||
        child?.type === "word" ||
        child?.type === "number" ||
        child?.type === "concatenation" ||
        child?.type === "variable_name"
      ) {
        let replaced = child.text.replace(/['"\\]/g, "");
        let match = /^([A-Za-z_][A-Za-z0-9_]*)\+?=/.exec(replaced);
        if (match) markVarUnknown(varScope, match[1]);
        else {
          let index = replaced.indexOf("=");
          if (index > 0 && replaced.lastIndexOf("$", index - 1) !== -1)
            for (let key of [...varScope.keys()]) markVarUnknown(varScope, key);
        }
      }
  }
  for (let child of node.children) if (child) markWrittenVarsUnknown(child, varScope);
}
//@ chunk-nzz6y5xm.js:84159-84324 layout
function mergeScopeInto(target, branchScope) {
  for (let [name, value] of branchScope) {
    let existing = target.get(name);
    if (existing !== undefined && existing !== value) {
      let stripped = stripUncertainPrefix(value);
      if (declarationPrefixValues.get(name) === stripped && stripUncertainPrefix(existing) !== stripped)
        prefixAssignInBranch = true;
      markVarUnknown(target, name);
    }
  }
  for (let key of target.keys()) if (!branchScope.has(key)) markVarUnknown(target, key);
}
//@ chunk-nzz6y5xm.js:84324-84559 fingerprint (2.1.88 match: applyVarToScope, 1)
/**
 * 把赋值写入变量作用域：分支内或值冲突时标为未知（VAR_PLACEHOLDER），+= 累加，否则覆盖。
 */
function applyVarToScope(varScope, assignment, markUnknown = false) {
  if (markUnknown) {
    markVarUnknown(varScope, assignment.name);
    return;
  }
  if (assignment.isAppend && !varScope.has(assignment.name)) return;
  let existing = varScope.get(assignment.name);
  if (
    existing !== undefined &&
    existing !== assignment.value &&
    !assignment.isAppend &&
    !containsAnyPlaceholder(assignment.value)
  ) {
    markVarUnknown(varScope, assignment.name);
    return;
  }
  let combined = assignment.isAppend ? (existing ?? "") + assignment.value : assignment.value;
  varScope.set(assignment.name, combined);
}
//@ chunk-nzz6y5xm.js:84559-84595 file-local
function stripRawString(text) {
  return text.slice(1, -1);
}
//@ chunk-nzz6y5xm.js:84595-84739 layout
function containsExpansionNode(node) {
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "simple_expansion" || child.type === "expansion") return true;
    if (containsExpansionNode(child)) return true;
  }
  return false;
}
//@ chunk-nzz6y5xm.js:84739-84903 layout
function tildeVarName(text) {
  if (text === "~" || text.startsWith("~/")) return "HOME";
  if (text === "~+" || text.startsWith("~+/")) return "PWD";
  if (text === "~-" || text.startsWith("~-/")) return "OLDPWD";
  return null;
}
//@ chunk-nzz6y5xm.js:84903-85186 layout
function findReferencedVar(child, names) {
  let isDefinition = child.type === "variable_assignment";
  for (let child_2 of child.children) {
    if (!child_2) continue;
    if (child_2.type === "variable_name") {
      if (isDefinition) continue;
      if (names.has(child_2.text)) return child_2.text;
    }
    if (child_2.type === "word") {
      let tildeName = tildeVarName(child_2.text);
      if (tildeName !== null && names.has(tildeName)) return tildeName;
    }
    let referencedVar = findReferencedVar(child_2, names);
    if (referencedVar !== null) return referencedVar;
  }
  return null;
}
//@ chunk-nzz6y5xm.js:85186-85571 fingerprint (2.1.88 match: tooComplex, 0.517)
/**
 * 把无法分析的节点转成 too-complex：ERROR 节点按是否为 $+非 ASCII 给不同理由，其他类型用 DANGEROUS_TYPES 中的中文化描述（如“A nested command”）。
 */
function tooComplex(node) {
  if (node.type === "ERROR")
    return {
      kind: "too-complex",
      reason:
        isDollarNonAsciiName(node.text) || (node.text.startsWith("${") && hasZshMultibyteName(node.text))
          ? "A $ followed by non-ASCII text in this command can't be checked before it runs"
          : "Parse error",
      nodeType: node.type,
    };
  let label = DANGEROUS_TYPES.get(node.type);
  return {
    kind: "too-complex",
    reason: `${label === undefined ? "This command" : `${label} in this command`} can't be checked before it runs`,
    nodeType: node.type,
  };
}
//@ chunk-nzz6y5xm.js:85571-86644 fingerprint (2.1.88 match: DANGEROUS_TYPES, 0.477)
/**
 * 节点类型 → 用户可读描述（A variable、A nested command、A here-document…），tooComplex 生成理由时使用。
 */
var DANGEROUS_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-nzz6y5xm.js:85571", () => {
  DANGEROUS_TYPES = new Map([
    ["simple_expansion", "A variable"],
    ["expansion", "A variable in braces"],
    ["command_substitution", "A nested command"],
    ["process_substitution", "A command used as a file"],
    ["brace_expression", "A brace pattern"],
    ["ansi_c_string", "Text with escape codes"],
    ["translated_string", "Translatable text"],
    ["test_command", "A test in brackets"],
    ["herestring_redirect", "A here-string"],
    ["heredoc_redirect", "A here-document"],
    ["subshell", "A group in parentheses"],
    ["compound_statement", "A group in braces or double parentheses"],
    ["for_statement", "A for or select loop"],
    ["c_style_for_statement", "A counting for loop"],
    ["while_statement", "A while or until loop"],
    ["until_statement", "An until loop"],
    ["if_statement", "An if statement"],
    ["case_statement", "A case statement"],
    ["function_definition", "A function definition"],
    ["array", "A list of values"],
    ["string", "Quoted text"],
    ["file_redirect", "A file redirect"],
    ["pipeline", "A pipeline"],
    ["concatenation", "Joined pieces of text"],
    ["variable_assignment", "A variable assignment"],
    ["variable_assignments", "Variable assignments"],
  ]);
});
//@ chunk-nzz6y5xm.js:86644-87089 facade-majority
/**
 * 提取文本中所有 ${…} 的内部内容（尊重引号与嵌套）。
 */
function liveBracedExpansionBodies(text) {
  let bodies = [];
  let index = 0;
  let inSingleQuote = false;
  let inDoubleQuote = false;
  while (index < text.length) {
    let char = text[index];
    if (char === "\\" && !inSingleQuote) {
      index += 2;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      index++;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      index++;
      continue;
    }
    if (!inSingleQuote && char === "$" && text[index + 1] === "{") {
      let depth = 1;
      let bodyStart = index + 2;
      let innerSingle = false;
      let innerDouble = false;
      while (bodyStart < text.length && depth > 0) {
        let innerChar = text[bodyStart];
        if (innerChar === "\\" && !innerSingle) {
          bodyStart += 2;
          continue;
        }
        if (innerChar === "'" && !innerDouble) innerSingle = !innerSingle;
        else if (innerChar === '"' && !innerSingle) innerDouble = !innerDouble;
        else if (!innerSingle && !innerDouble) {
          if (innerChar === "{") depth++;
          else if (innerChar === "}") depth--;
        }
        bodyStart++;
      }
      bodies.push(text.slice(index + 2, depth === 0 ? bodyStart - 1 : bodyStart));
      index = bodyStart;
      continue;
    }
    index++;
  }
  return bodies;
}
//@ chunk-nzz6y5xm.js:87089-87365 facade-majority
/**
 * 去掉反斜杠转义（保留会影响引号或展开的转义），单引号区原样保留，用于比较命令文本的字面形态。
 */
function stripLiteralQuotedRegions(text) {
  let out = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  for (let k = 0; k < text.length; k++) {
    let char = text[k];
    if (inSingleQuote) {
      if (char === "'") {
        inSingleQuote = false;
        out += char;
      }
      continue;
    }
    if (char === "\\" && !inSingleQuote) {
      let escaped = text[k + 1];
      k++;
      if (escaped !== undefined && !"$'\"`\\".includes(escaped)) out += escaped;
      continue;
    }
    if (char === '"') {
      inDoubleQuote = !inDoubleQuote;
      out += char;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = true;
      out += char;
      continue;
    }
    out += char;
  }
  return out;
}
//@ chunk-nzz6y5xm.js:87365-87608 facade-majority
/**
 * 去掉引号内的内容和转义字符，只保留未加引号的部分。
 */
function stripQuotedRegions(text) {
  let out = "";
  let quote;
  for (let i = 0; i < text.length; i++) {
    let char = text[i];
    if (quote === "'") {
      if (char === "'") quote = undefined;
      continue;
    }
    if (quote === '"') {
      if (char === "\\") i++;
      else if (char === '"') quote = undefined;
      continue;
    }
    if (char === "\\") {
      i++;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    out += char;
  }
  return out;
}
//@ chunk-nzz6y5xm.js:87608-87820 facade-majority
/**
 * 会写变量的 zsh 模块函数名（strftime、zstat、zselect、zftp 等），以及会写变量的 zsh 内建集合（zformat、zparseopts、zstyle、vared……）。
 */
var ZSH_MODULE_NAME_WRITERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ZSH_VAR_WRITING_BUILTINS;
deferInit("chunk-nzz6y5xm.js:87608", () => {
  ZSH_MODULE_NAME_WRITERS = [
    "strftime",
    "pcre_match",
    "zstat",
    "zselect",
    "zgetattr",
    "zlistattr",
    "ztie",
    "zuntie",
    "syserror",
    "zsystem",
    "zftp",
    "zcurses",
  ];
  ZSH_VAR_WRITING_BUILTINS = new Set([
    "zformat",
    "zparseopts",
    "zstyle",
    "zregexparse",
    "getln",
    "vared",
    ...ZSH_MODULE_NAME_WRITERS,
  ]);
});
//@ chunk-nzz6y5xm.js:87820-88062 layout
function zshStatWritesVarReason(commandName, args) {
  return commandName === "stat" && args.some((arg) => /^-[gnNolLtTrs]*[AH]/.test(arg)) && noteRefusal()
    ? "'stat' with -A or -H \u2014 zsh's stat builtin stores its result in the variable that option names, so a tracked value cannot be statically verified"
    : null;
}
//@ chunk-nzz6y5xm.js:88062-88461 facade-majority (2.1.88 match: ZSH_DANGEROUS_BUILTINS, 0.649)
/**
 * zsh 危险内建集合（zmodload、emulate、sysopen、zpty、ztcp、zf_rm……、setopt、autoload，以及会写变量的内建），checkSemantics 遇到即拒绝；同一语句定义 find 的执行/写类动作集合 FIND_EXEC_ACTIONS（-exec、-delete、-fprint 等）。
 */
var ZSH_DANGEROUS_BUILTINS; // deferred: uses ZSH_MODULE_NAME_WRITERS of its import cycle while loading; runs once the cycle is complete
var FIND_EXEC_ACTIONS;
deferInit("chunk-nzz6y5xm.js:88062", () => {
  ZSH_DANGEROUS_BUILTINS = new Set([
    "zmodload",
    "emulate",
    "sysopen",
    "sysread",
    "syswrite",
    "sysseek",
    "zpty",
    "ztcp",
    "zsocket",
    "zf_rm",
    "zf_mv",
    "zf_ln",
    "zf_chmod",
    "zf_chown",
    "zf_mkdir",
    "zf_rmdir",
    "zf_chgrp",
    "repeat",
    "foreach",
    "zcompile",
    "setopt",
    "unsetopt",
    "disable",
    "shopt",
    "autoload",
    "functions",
    ...ZSH_VAR_WRITING_BUILTINS,
  ]);
  FIND_EXEC_ACTIONS = new Set([
    "-exec",
    "-execdir",
    "-ok",
    "-okdir",
    "-delete",
    "-rm",
    "-fprint",
    "-fprint0",
    "-fprintf",
    "-fls",
    "-files0-from",
  ]);
});
//@ chunk-nzz6y5xm.js:88461-88502 facade-majority
function isFindDangerousAction(action) {
  return FIND_EXEC_ACTIONS.has(action) && isRmModifierAllowed(action);
}
//@ chunk-nzz6y5xm.js:88502-89048 layout
/**
 * 匹配 find 的 -newerXY 谓词。
 */
var FIND_ARG_TAKING_PREDICATES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FIND_NEWER_XY_RE_2;
var FIND_NEWER_XY_RE;
var FIND_ACTION_FLAG_RE;
deferInit("chunk-nzz6y5xm.js:88502", () => {
  FIND_ARG_TAKING_PREDICATES = new Set([
    "-name",
    "-iname",
    "-path",
    "-ipath",
    "-lname",
    "-ilname",
    "-regex",
    "-iregex",
    "-wholename",
    "-iwholename",
    "-samefile",
    "-newer",
    "-anewer",
    "-cnewer",
    "-mnewer",
    "-perm",
    "-user",
    "-group",
    "-uid",
    "-gid",
    "-size",
    "-type",
    "-xtype",
    "-fstype",
    "-inum",
    "-links",
    "-used",
    "-context",
    "-amin",
    "-cmin",
    "-mmin",
    "-atime",
    "-ctime",
    "-mtime",
    "-mindepth",
    "-maxdepth",
    "-printf",
    "-regextype",
    "-D",
    "-f",
    "-flags",
    "-Bnewer",
    "-Btime",
    "-Bmin",
    "-files0-from",
    "-xattrname",
  ]);
  FIND_NEWER_XY_RE_2 = /^-newer[aBcm][aBcmt]$/;
  FIND_NEWER_XY_RE = /^-(?:[EHLPXdsx]*D|f|[dsx]*[EHLPX][EHLPXdsx]*f)$/;
  FIND_ACTION_FLAG_RE = /^-[dsx]+f$/;
});
//@ chunk-nzz6y5xm.js:89048-89105 facade-majority
function findWordTakesOperand(word) {
  return FIND_ARG_TAKING_PREDICATES.has(word) || FIND_NEWER_XY_RE_2.test(word) || FIND_NEWER_XY_RE.test(word);
}
//@ chunk-nzz6y5xm.js:89105-89139 facade-majority
function findWordTakesFlagValue(word) {
  return FIND_NEWER_XY_RE.test(word);
}
//@ chunk-nzz6y5xm.js:89139-89173 facade-majority
function isAmbiguousFindWord(word) {
  return FIND_ACTION_FLAG_RE.test(word);
}
//@ chunk-nzz6y5xm.js:89173-89408 facade-majority (2.1.88 match: EVAL_LIKE_BUILTINS, 0.812)
/**
 * eval 类内建集合（eval、source、.、exec、trap、alias、let、mapfile、bind、complete……），这类命令的参数会被当成代码执行；同时定义 awk 程序名集合，以及 awk 读取程序文件的选项正则。
 */
var EVAL_LIKE_BUILTINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var AWK_NAMES;
var AWK_PROGRAM_FILE_OPT_RE;
deferInit("chunk-nzz6y5xm.js:89173", () => {
  EVAL_LIKE_BUILTINS = new Set([
    "eval",
    "source",
    ".",
    "exec",
    "nocorrect",
    "fc",
    "coproc",
    "trap",
    "enable",
    "mapfile",
    "readarray",
    "hash",
    "bind",
    "complete",
    "compgen",
    "alias",
    "let",
  ]);
  AWK_NAMES = new Set(["awk", "gawk", "mawk", "nawk"]);
  AWK_PROGRAM_FILE_OPT_RE = /^(?:-[FvW]$|--(?:fie|a$|as))/;
});
//@ chunk-nzz6y5xm.js:89408-90160 facade-majority
/**
 * 检查 awk 程序文本：system()、命令管道/getline、@load/@include/间接调用、extension()、/inet/ 网络套接字，命中返回理由，否则 false。
 */
function awkProgramHasExecBridge(program) {
  if (/(?<![A-Za-z_])system[\s\\]*\(/.test(program))
    return "awk program contains system() which executes arbitrary commands";
  if (/(?:^|[^|])\|&?[^/|%";#{}]*"/.test(program) || /(?:^|[^|])\|&?[\s\\]*getline\b/.test(program))
    return 'awk program contains a command pipe (| "cmd" or | getline) which executes arbitrary commands';
  if (/@[\s\\]*(?:load|include)\b|@[\s\\]*\w+(?:::\w+)?(?:\[[^\]]*\])*[\s\\]*\(/.test(program))
    return "awk program contains @load/@include or an @indirect call which can execute arbitrary code";
  if (/(?<![A-Za-z_])extension[\s\\]*\(/.test(program))
    return "awk program contains extension() which loads arbitrary native code (legacy gawk)";
  if (/"\/inet[46]?\//.test(program))
    return "awk program opens a gawk /inet/ network socket which can exfiltrate data";
  return false;
}
//@ chunk-nzz6y5xm.js:90160-90590 facade-majority
/**
 * shell 程序名集合（POSIX shell、busybox/toybox/wsl/su 等 applet、fish/csh、cmd/powershell）、可透明剥离的启动包装（time、command、env、nice、nohup、sudo、doas、timeout……）和不处理的执行包装（watch、setsid、strace、flock、unshare……）。
 */
var POSIX_SHELL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var APPLET_SHELL_NAMES;
var SHELL_PROGRAM_NAMES;
var TRANSPARENT_LAUNCHER_NAMES;
var UNHANDLED_EXEC_WRAPPERS;
deferInit("chunk-nzz6y5xm.js:90160", () => {
  POSIX_SHELL_NAMES = new Set(["bash", "sh", "zsh", "dash", "ksh", "mksh", "ash", "hush", "rbash"]);
  APPLET_SHELL_NAMES = new Set(["busybox", "toybox", "wsl", "su", "runuser"]);
  SHELL_PROGRAM_NAMES = new Set([
    ...POSIX_SHELL_NAMES,
    "fish",
    "csh",
    "tcsh",
    "rsh",
    ...APPLET_SHELL_NAMES,
    "cmd",
    "powershell",
    "pwsh",
  ]);
  TRANSPARENT_LAUNCHER_NAMES = new Set([
    "time",
    "command",
    "builtin",
    "noglob",
    "env",
    "nice",
    "nohup",
    "sudo",
    "doas",
    "stdbuf",
    "timeout",
  ]);
  UNHANDLED_EXEC_WRAPPERS = new Set([
    "watch",
    "ionice",
    "chrt",
    "setsid",
    "taskset",
    "strace",
    "ltrace",
    "script",
    "flock",
    "unshare",
    "nsenter",
  ]);
});
//@ chunk-nzz6y5xm.js:90590-90644 layout
function isZshDangerousBuiltin(name) {
  return ZSH_DANGEROUS_BUILTINS.has(name) && (!ZSH_VAR_WRITING_BUILTINS.has(name) || noteRefusal());
}
//@ chunk-nzz6y5xm.js:90644-90742 facade-majority
/**
 * 命令名是否为 eval 类内建、zsh 危险内建、exec 包装或 rm/rmdir。
 */
function isSandboxAutoAllowUnsafeBase(name) {
  let baseName = stripPathAndExe(name);
  return (
    EVAL_LIKE_BUILTINS.has(name) ||
    isZshDangerousBuiltin(name) ||
    UNHANDLED_EXEC_WRAPPERS.has(name) ||
    UNHANDLED_EXEC_WRAPPERS.has(baseName) ||
    baseName === "rm" ||
    baseName === "rmdir"
  );
}
//@ chunk-nzz6y5xm.js:90742-92602 facade-majority
/**
 * Bash 语义检查用的常量表：会对下标求值的选项（test -v、printf -v、read -a…）、算术比较运算符、声明类关键字与内建、set -o 安全选项与字母，以及影响命令查找/执行的变量名（PATH、BASH_ENV、LANG、LC_* 等）。
 */
var SUBSCRIPT_EVAL_FLAGS; // deferred: uses ZSH_MODULE_NAME_WRITERS of its import cycle while loading; runs once the cycle is complete
var TEST_ARITH_CMP_OPS;
var TEST_ARITH_NUMERIC_RE;
var BARE_SUBSCRIPT_NAME_BUILTINS;
var DECLARATION_KEYWORDS;
var PRINT_PROMPT_FLAG;
var DECLARATION_LIKE_BUILTINS;
var SET_O_SAFE_OPTS;
var SET_O_SAFE_LETTERS;
var EXEC_INFLUENCING_VARS;
var INTEGER_ATTR_DEFAULT_VARS;
deferInit("chunk-nzz6y5xm.js:90742", () => {
  SUBSCRIPT_EVAL_FLAGS = {
    test: new Set(["-v", "-R", "-t"]),
    "[": new Set(["-v", "-R", "-t"]),
    "[[": new Set(["-v", "-R", "-t"]),
    printf: new Set(["-v"]),
    read: new Set(["-a"]),
    unset: new Set(["-v"]),
    wait: new Set(["-p"]),
  };
  TEST_ARITH_CMP_OPS = new Set(["-eq", "-ne", "-lt", "-le", "-gt", "-ge"]);
  TEST_ARITH_NUMERIC_RE = /^-?(0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z]+|[0-9]+)$/;
  BARE_SUBSCRIPT_NAME_BUILTINS = new Set(["read", "unset"]);
  DECLARATION_KEYWORDS = new Set([
    "declare",
    "typeset",
    "local",
    "export",
    "readonly",
    "private",
    "float",
    "integer",
  ]);
  PRINT_PROMPT_FLAG = /^[+-][-+\w]*P/;
  DECLARATION_LIKE_BUILTINS = new Set([
    "declare",
    "typeset",
    "local",
    "export",
    "readonly",
    "print",
    "getopts",
    "set",
    "zparseopts",
    "zformat",
    "zstyle",
    ...ZSH_MODULE_NAME_WRITERS,
    "autoload",
    "shift",
    "exit",
    "return",
    "break",
    "continue",
    "bye",
    "logout",
    "vared",
    "private",
    "getln",
    "zregexparse",
    "float",
    "integer",
  ]);
  SET_O_SAFE_OPTS = new Set([
    "pipefail",
    "errexit",
    "nounset",
    "xtrace",
    "noglob",
    "noclobber",
    "verbose",
    "monitor",
    "notify",
    "vi",
    "emacs",
    "errtrace",
    "functrace",
    "hashall",
    "physical",
    "ignoreeof",
  ]);
  SET_O_SAFE_LETTERS = new Set(["e", "u", "x", "f", "C", "v", "m", "b", "E", "T", "h", "P", "n"]);
  EXEC_INFLUENCING_VARS = new Set([
    "path",
    "home",
    "dirstack",
    "tmpprefix",
    "bash_env",
    "env",
    "cdpath",
    "globignore",
    "shell",
    "fpath",
    "bash_loadables_path",
    "module_path",
    "manpath",
    "mailpath",
    "readnullcmd",
    "nullcmd",
    "histfile",
    "zdotdir",
    "functions",
    "commands",
    "aliases",
    "galiases",
    "saliases",
    "bash_cmds",
    "bash_aliases",
    "execignore",
    "bash_source_path",
    "lang",
    "language",
    "lc_all",
    "lc_ctype",
    "lc_collate",
    "lc_messages",
    "lc_numeric",
    "lc_time",
    "histchars",
    "textdomain",
    "textdomaindir",
  ]);
  INTEGER_ATTR_DEFAULT_VARS = new Set([
    "RANDOM",
    "SECONDS",
    "LINENO",
    "OPTIND",
    "MAILCHECK",
    "HISTCMD",
    "SRANDOM",
    "EPOCHSECONDS",
    "EPOCHREALTIME",
    "BASHPID",
    "BASH_MONOSECONDS",
    "BASH_TRAPSIG",
    "COLUMNS",
    "LINES",
    "SHLVL",
    "ERRNO",
    "TMOUT",
    "HISTSIZE",
    "SAVEHIST",
    "TRY_BLOCK_ERROR",
    "TRY_BLOCK_INTERRUPT",
    "KEYTIMEOUT",
    "LISTMAX",
    "LOGCHECK",
    "PERIOD",
    "FUNCNEST",
    "UID",
    "EUID",
    "GID",
    "EGID",
    "REPORTTIME",
    "REPORTMEMORY",
    "DIRSTACKSIZE",
    "BAUD",
    "ZLE_RPROMPT_INDENT",
    "MBEGIN",
    "MEND",
    "PPID",
    "ARGC",
    "ZSH_SUBSHELL",
    "TTYIDLE",
    "status",
  ]);
});
//@ chunk-nzz6y5xm.js:92602-92766 layout
function isIntegerVarAssignUnsafe(name, value) {
  if (!INTEGER_ATTR_DEFAULT_VARS.has(name)) return false;
  if (value.includes("[") || value.includes("`") || /\$\(/.test(value) || containsAnyPlaceholder(value))
    return true;
  if (!/^(0|[1-9][0-9]{0,17})$/.test(value)) return true;
  return false;
}
//@ chunk-nzz6y5xm.js:92766-92893 facade-majority
/**
 * 是否为影响命令查找/执行的变量（PATH、HOME、IFS 之外的 fpath/cdpath/LANG/LC_* 等，及 LD_*\/DYLD_*\/BASH_FUNC_* 前缀），大小写不敏感。
 */
function isExecInfluencingVar(name) {
  let lower = name.toLowerCase();
  return (
    EXEC_INFLUENCING_VARS.has(lower) ||
    lower.startsWith("ld_") ||
    lower.startsWith("dyld_") ||
    lower.startsWith("bash_func_")
  );
}
//@ chunk-nzz6y5xm.js:92893-92971 facade-majority
/**
 * 受保护 shell 变量：执行影响变量、IFS、PS4、PROMPT4 或整数属性变量。ShellSnapshot 解析导出变量时也用它过滤。
 */
function isAssignmentNameUnsafeForSandbox(name) {
  return (
    isExecInfluencingVar(name) ||
    name === "IFS" ||
    name === "PS4" ||
    name === "PROMPT4" ||
    INTEGER_ATTR_DEFAULT_VARS.has(name)
  );
}
//@ chunk-nzz6y5xm.js:92971-93232 facade-majority
/**
 * read 内建的选项表：带数据参数的选项、需再检查参数的选项、数值参数选项与数值正则；另有带下标变量名正则、组合短选项里吃参数的字母、/proc/*\/environ 正则和“换行后 #”正则。
 */
var READ_DATA_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var READ_FLAGS_WITH_CHECKED_OPERAND;
var READ_NUMERIC_ARG_FLAGS;
var READ_NUMERIC_OPERAND_RE;
var SUBSCRIPTED_NAME_RE;
var OPTION_LETTERS_TAKING_ARGUMENT;
var PROC_ENVIRON_RE;
var NEWLINE_HASH_RE;
deferInit("chunk-nzz6y5xm.js:92971", () => {
  READ_DATA_FLAGS = new Set(["-p", "-d", "-n", "-N", "-t", "-u", "-i"]);
  READ_FLAGS_WITH_CHECKED_OPERAND = new Set(["-p", "-t", "-n"]);
  READ_NUMERIC_ARG_FLAGS = new Set(["-t", "-n", "-N"]);
  READ_NUMERIC_OPERAND_RE = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/;
  SUBSCRIPTED_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*\[/;
  OPTION_LETTERS_TAKING_ARGUMENT = new Set(["-f", "-C", "-x", "-X", "-u"]);
  PROC_ENVIRON_RE = /\/proc\/.*\/environ/;
  NEWLINE_HASH_RE = /\n\s*#/;
});
//@ chunk-nzz6y5xm.js:93232-105826 facade-majority (2.1.88 match: checkSemantics, 0.488)
/**
 * 对 simple 结果做语义检查（2.1.88 checkSemantics 的扩展）：先剥去 time/nohup/timeout/nice/env/stdbuf/command/builtin/noglob/xargs 包装（参数不规范即拒绝），再检查命令名为空/占位符/片段、test -v 等下标求值、eval 类内建、zsh 危险内建、awk 危险程序、find -exec 类、shell 关键字作命令名、/proc/*\/environ、换行后 #（kind:'newline-hash'）等。返回 {ok:true} 或 {ok:false, reason, kind?}。
 */
function checkSemantics(commands, options) {
  let useSourceGlob = options?.sourceGlobRecord !== false;
  let firstFailure = null;
  for (let cmd of commands) {
    let argv = cmd.argv;
    let sawXargs = false;
    for (;;) {
      let baseName = argv[0] === undefined ? undefined : stripPathAndExe(argv[0]);
      let wrapperName =
        baseName === "time" ||
        baseName === "nohup" ||
        baseName === "timeout" ||
        baseName === "nice" ||
        baseName === "stdbuf" ||
        baseName === "env" ||
        baseName === "command" ||
        baseName === "xargs"
          ? baseName
          : argv[0];
      if (wrapperName === "time" || wrapperName === "nohup") {
        argv = argv.slice(1);
        if (argv[0] !== undefined && !/^[\w./~+-]+$/.test(argv[0]))
          return {
            ok: false,
            reason: `'${wrapperName} ${argv[0]}' can't be checked before it runs`,
          };
      } else if (wrapperName === "timeout") {
        let i = 1;
        while (i < argv.length) {
          let arg = argv[i];
          if (arg === "--foreground" || arg === "--preserve-status" || arg === "--verbose") i++;
          else if (/^--(?:kill-after|signal)=[A-Za-z0-9_.+-]+$/.test(arg)) i++;
          else if (
            (arg === "--kill-after" || arg === "--signal") &&
            argv[i + 1] &&
            /^[A-Za-z0-9_.+-]+$/.test(argv[i + 1])
          )
            i += 2;
          else if (arg.startsWith("--"))
            return {
              ok: false,
              reason: `'timeout ${arg}' can't be checked before it runs`,
            };
          else if (arg === "-v") i++;
          else if ((arg === "-k" || arg === "-s") && argv[i + 1] && /^[A-Za-z0-9_.+-]+$/.test(argv[i + 1]))
            i += 2;
          else if (/^-[ks][A-Za-z0-9_.+-]+$/.test(arg)) i++;
          else if (arg.startsWith("-"))
            return {
              ok: false,
              reason: `'timeout ${arg}' can't be checked before it runs`,
            };
          else break;
        }
        if (argv[i] && /^\d+(?:\.\d+)?[smhd]?$/.test(argv[i])) argv = argv.slice(i + 1);
        else if (argv[i])
          return {
            ok: false,
            reason: `timeout duration '${argv[i]}' can't be checked before it runs`,
          };
        else break;
      } else if (wrapperName === "nice") {
        if (argv[1] === "-n" && argv[2] && /^-?\d+$/.test(argv[2])) argv = argv.slice(3);
        else if (argv[1] && /^-\d+$/.test(argv[1])) argv = argv.slice(2);
        else if (argv[1] && (/[$(`]/.test(argv[1]) || containsAnyPlaceholder(argv[1])))
          return {
            ok: false,
            reason: `nice argument '${argv[1]}' contains expansion \u2014 cannot statically determine wrapped command`,
          };
        else argv = argv.slice(1);
      } else if (wrapperName === "env") {
        let i = 1;
        while (i < argv.length) {
          let arg = argv[i];
          if (arg.includes("=") && !arg.startsWith("-")) i++;
          else if (arg === "-i" || arg === "-0" || arg === "-v") i++;
          else if (arg === "-u" && argv[i + 1]) i += 2;
          else if (arg.startsWith("-"))
            return {
              ok: false,
              reason: `'env ${arg}' can't be checked before it runs`,
            };
          else break;
        }
        if (i < argv.length) argv = argv.slice(i);
        else break;
      } else if (wrapperName === "stdbuf") {
        let i = 1;
        while (i < argv.length) {
          let arg = argv[i];
          if (STDBUF_SHORT_SEP_RE.test(arg) && argv[i + 1]) i += 2;
          else if (STDBUF_SHORT_FUSED_RE.test(arg)) i++;
          else if (STDBUF_LONG_RE.test(arg)) i++;
          else if (arg.startsWith("-"))
            return {
              ok: false,
              reason: `'stdbuf ${arg}' can't be checked before it runs`,
            };
          else break;
        }
        if (i > 1 && i < argv.length) argv = argv.slice(i);
        else break;
      } else if (wrapperName === "command") {
        let index = 1;
        let isPrintMode = false;
        while (index < argv.length && argv[index].startsWith("-") && argv[index] !== "--") {
          let flag = argv[index];
          if (!/^-[pvV]+$/.test(flag))
            return {
              ok: false,
              reason: `'command ${flag}' can't be checked before it runs`,
            };
          if (flag.includes("v") || flag.includes("V")) isPrintMode = true;
          index++;
        }
        if (argv[index] === "--") index++;
        if (isPrintMode || index >= argv.length) break;
        argv = argv.slice(index);
      } else if (argv[0] === "builtin" || argv[0] === "noglob") {
        let skipCount = argv[0] === "builtin" && argv[1] === "--" ? 2 : 1;
        if (skipCount < argv.length) argv = argv.slice(skipCount);
        else break;
      } else if (wrapperName === "xargs") {
        if (argv.length >= 2 && !argv[1].startsWith("-")) {
          argv = argv.slice(1);
          sawXargs = true;
        } else break;
      } else break;
    }
    let commandName = argv[0];
    if (commandName === undefined) continue;
    let baseName = stripPathAndExe(commandName);
    if (commandName === "")
      return {
        ok: false,
        reason: "Empty command name \u2014 argv[0] may not reflect what bash runs",
      };
    if (containsAnyPlaceholder(commandName))
      return {
        ok: false,
        reason: "Command name is runtime-determined (placeholder argv[0])",
      };
    if (commandName.startsWith("-") || commandName.startsWith("|") || commandName.startsWith("&"))
      return {
        ok: false,
        reason: "Command appears to be an incomplete fragment",
      };
    let dangerFlags = getOwn(SUBSCRIPT_EVAL_FLAGS, baseName);
    let isTestCommand = baseName === "test" || baseName === "[" || baseName === "[[";
    if (dangerFlags !== undefined)
      for (let i = 1; i < argv.length; i++) {
        let arg = argv[i];
        let operand = argv[i + 1];
        if (
          dangerFlags.has(arg) &&
          operand !== undefined &&
          (operand.includes("[") || containsAnyPlaceholder(operand))
        )
          return {
            ok: false,
            reason: `'${baseName} ${arg}' operand contains array subscript or runtime-determined value \u2014 bash evaluates $(cmd) in subscripts`,
          };
        if (isTestCommand) {
          if (arg === "-t" && operand !== undefined && !TEST_ARITH_NUMERIC_RE.test(operand))
            return {
              ok: false,
              reason: `'${baseName} -t' operand is non-numeric \u2014 zsh arith-evals identifiers (may run $(cmd))`,
            };
          continue;
        }
        if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-" && !arg.includes("[")) {
          for (let flag of dangerFlags)
            if (flag.length === 2 && arg.includes(flag[1])) {
              let operand = argv[i + 1];
              if (operand !== undefined && (operand.includes("[") || containsAnyPlaceholder(operand)))
                return {
                  ok: false,
                  reason: `'${baseName} ${flag}' (combined in '${arg}') operand contains array subscript \u2014 bash evaluates $(cmd) in subscripts`,
                };
            }
        }
        if (arg.length > 2 && arg[0] === "-" && baseName !== "read")
          for (let flag of dangerFlags) {
            if (flag.length !== 2) continue;
            let index = arg.indexOf(flag[1], 1);
            if (index === -1 || index === arg.length - 1) continue;
            let sliced = arg.slice(index + 1);
            if (/[A-Za-z_][A-Za-z0-9_]*\[/.test(sliced) || containsAnyPlaceholder(sliced))
              return {
                ok: false,
                reason: `'${baseName} ${flag}' (fused in '${arg}') operand contains array subscript \u2014 bash evaluates $(cmd) in subscripts`,
              };
          }
      }
    if (isTestCommand)
      for (let i = 2; i < argv.length; i++) {
        if (!TEST_ARITH_CMP_OPS.has(argv[i])) continue;
        for (let operand of [argv[i - 1], argv[i + 1]]) {
          if (operand === undefined) continue;
          if (operand.includes("[") || !TEST_ARITH_NUMERIC_RE.test(operand))
            return {
              ok: false,
              reason: `'${baseName} ... ${argv[i]} ...' operand is non-numeric \u2014 \`[[\` arithmetically evaluates identifiers/subscripts (may run $(cmd))`,
            };
        }
      }
    if (BARE_SUBSCRIPT_NAME_BUILTINS.has(baseName)) {
      let awaitingOperand = false;
      for (let k = 1; k < argv.length; k++) {
        let arg = argv[k];
        if (awaitingOperand !== false) {
          let pendingKind = awaitingOperand;
          awaitingOperand = false;
          if (pendingKind === "numeric" && !READ_NUMERIC_OPERAND_RE.test(arg))
            return {
              ok: false,
              reason: `'read ${argv[k - 1]}' operand '${arg}' is non-numeric \u2014 zsh arith-evals subscripts/expressions (may run $(cmd))`,
            };
          if (
            pendingKind === "prompt" &&
            (SUBSCRIPTED_NAME_RE.test(arg) ||
              (arg[0] === "-" && /[A-Za-z_][A-Za-z0-9_]*\[/.test(arg)) ||
              arg.includes(CMDSUB_PLACEHOLDER))
          )
            return {
              ok: false,
              reason: `'read ${argv[k - 1]}' operand '${arg}' is a subscripted NAME, dash-prefixed with a subscript, or runtime-determined \u2014 zsh -p takes no operand; may arith-eval the subscript and run $(cmd)`,
            };
          continue;
        }
        if (arg[0] === "-") {
          if (baseName === "read") {
            if (READ_NUMERIC_ARG_FLAGS.has(arg)) awaitingOperand = "numeric";
            else if (arg === "-p") awaitingOperand = "prompt";
            else if (READ_DATA_FLAGS.has(arg)) awaitingOperand = "string";
            else if (arg.length > 2)
              for (let k = 1; k < arg.length; k++) {
                let fusedFlag = "-" + arg[k];
                let isNumericFlag = READ_NUMERIC_ARG_FLAGS.has(fusedFlag);
                if (isNumericFlag || READ_DATA_FLAGS.has(fusedFlag)) {
                  if (k === arg.length - 1)
                    awaitingOperand = isNumericFlag ? "numeric" : fusedFlag === "-p" ? "prompt" : "string";
                  else if (isNumericFlag && !READ_NUMERIC_OPERAND_RE.test(arg.slice(k + 1)))
                    return {
                      ok: false,
                      reason: `'read ${fusedFlag}' (fused in '${arg}') operand is non-numeric \u2014 zsh arith-evals subscripts/expressions (may run $(cmd))`,
                    };
                  else if (fusedFlag === "-p") {
                    let sliced = arg.slice(k + 1);
                    if (/[A-Za-z_][A-Za-z0-9_]*\[/.test(sliced) || sliced.includes(CMDSUB_PLACEHOLDER))
                      return {
                        ok: false,
                        reason: `'read -p' fused remainder '${sliced}' contains a subscripted identifier or cmdsub \u2014 on zsh (-p is no-arg) this may reach matheval via a following option and run $(cmd)`,
                      };
                  }
                  break;
                }
              }
          }
          continue;
        }
        if (arg.includes("[") || containsAnyPlaceholder(arg))
          return {
            ok: false,
            reason: `'${baseName}' positional NAME '${arg}' contains array subscript or runtime-determined value \u2014 bash evaluates $(cmd) in subscripts`,
          };
      }
    }
    if (DECLARATION_LIKE_BUILTINS.has(baseName)) {
      let isDeclareLike = baseName === "declare" || baseName === "typeset" || baseName === "local";
      let keepsValue = isDeclareLike || baseName === "export" || baseName === "readonly";
      let hasFunctionFlagScope = isDeclareLike || baseName === "readonly";
      let sawFunctionFlag = false;
      let sawUpperFlag = false;
      for (let idx = 1; idx < argv.length; idx++) {
        let arg = argv[idx];
        if (hasFunctionFlagScope) {
          if (/^[+-].*f/.test(arg)) sawFunctionFlag = true;
          if (/^[+-].*[uU]/.test(arg)) sawUpperFlag = true;
          if (sawFunctionFlag && sawUpperFlag)
            return {
              ok: false,
              reason: `'${baseName}' with both -f and -u/-U flags (reached as plain command via wrapper/quote) \u2014 zsh marks a function for autoload (synonym of 'autoload')`,
            };
        }
        if (isDeclareLike && DECLARE_SEMANTIC_FLAG_RE.test(arg))
          return {
            ok: false,
            reason: `'${baseName}' with -n/-i/-a/-A/-E/-F/-L/-R/-Z/-l/-u flag (reached as plain command via wrapper/quote) changes assignment eval semantics`,
          };
        if (DECLARATION_KEYWORDS.has(baseName) && /^[+-].*[iluEFLRZ]/.test(arg))
          return {
            ok: false,
            reason: `'${baseName}' with -i/-E/-F/-L/-R/-Z/-l/-u flag (reached as plain command via wrapper/quote) \u2014 zsh bin_typeset mathevals, width-truncates, or case-converts the value`,
          };
        if ((keepsValue || baseName === "private") && /^[+-].*m/.test(arg))
          return {
            ok: false,
            reason: `'${baseName}' with -m/+m flag (reached as plain command via wrapper/quote) \u2014 zsh pattern-assigns every matching variable`,
          };
        if (DECLARATION_KEYWORDS.has(baseName) && /^[+-].*T/.test(arg))
          return {
            ok: false,
            reason: `'${baseName} -T' creates a user-defined zsh tied pair \u2014 tracked literals for its operands are unreliable`,
          };
        let hasSubscriptExpansion = arg.includes("[") && /[$`]/.test(arg);
        if (hasSubscriptExpansion || containsAnyPlaceholder(arg))
          return {
            ok: false,
            reason: hasSubscriptExpansion
              ? `'${baseName}' operand '${redactPlaceholdersForDisplay(arg)}' contains array subscript with expansion \u2014 shell arith-evals $(cmd) in subscripts`
              : `'${baseName}' operand '${redactPlaceholdersForDisplay(arg)}' is runtime-determined and may carry an array subscript \u2014 shell arith-evals $(cmd) in subscripts`,
          };
        if ((baseName === "float" || baseName === "integer") && !/^[+-]/.test(arg))
          return {
            ok: false,
            reason: `zsh '${baseName}' operand \u2014 implicit typeset -E/-i arithmetically evaluates the (existing or assigned) value`,
          };
      }
      let refusal =
        keepsValue && commandName === baseName ? checkDeclarationOptions(baseName, argv.slice(1)) : null;
      if (refusal !== null)
        return {
          ok: false,
          reason: refusal,
        };
      let _ =
        commandName === baseName && (options?.hasLoop !== false || cmd !== commands.at(-1))
          ? checkDeclarationContext(baseName, argv.slice(1))
          : null;
      if (_ !== null)
        return {
          ok: false,
          reason: _,
        };
    }
    if (baseName === "printf")
      for (let k = 1; k < argv.length; k++) {
        let arg = argv[k];
        let hasSubscriptExpansion = arg.includes("[") && /[$`]/.test(arg);
        if (hasSubscriptExpansion || containsAnyPlaceholder(arg))
          return {
            ok: false,
            reason: hasSubscriptExpansion
              ? `printf operand '${redactPlaceholdersForDisplay(arg)}' contains array subscript with expansion \u2014 zsh arith-evals %d/%i operands (may run $(cmd))`
              : `printf operand '${redactPlaceholdersForDisplay(arg)}' is runtime-determined and may carry an array subscript \u2014 zsh arith-evals %d/%i operands (may run $(cmd))`,
          };
      }
    if (baseName === "set")
      for (let k = 1; k < argv.length; k++) {
        let arg = argv[k];
        if (arg === "--") break;
        if (!/^[-+]/.test(arg)) continue;
        for (let k_2 = 1; k_2 < arg.length; k_2++) {
          let letter = arg[k_2];
          if (letter === "o") {
            let option = k_2 < arg.length - 1 ? arg.slice(k_2 + 1) : argv[k + 1];
            if (
              option !== undefined &&
              option !== "" &&
              !SET_O_SAFE_OPTS.has(option.toLowerCase().replace(/[_-]/g, ""))
            )
              return {
                ok: false,
                reason: `'set -o/+o ${option}' changes shell parsing/globbing state \u2014 can enable globsubst/extendedglob and defeat static analysis`,
              };
            if (k_2 === arg.length - 1) k++;
            break;
          }
          if (letter === "A") break;
          if (!SET_O_SAFE_LETTERS.has(letter))
            return {
              ok: false,
              reason: `'set ${arg[0]}${letter}' changes shell option state (allexport/keyword/\u2026) \u2014 defeats static env-var analysis; see SET_O_SAFE_LETTERS`,
            };
        }
      }
    if (baseName === "print" && argv.some((arg) => PRINT_PROMPT_FLAG.test(arg)))
      return {
        ok: false,
        reason: "What 'print -P' expands can't be checked before it runs",
      };
    if (baseName === "jobs")
      for (let k = 1; k < argv.length; k++) {
        let arg = argv[k];
        if (/^[+-].*x/.test(arg))
          return {
            ok: false,
            reason: "What 'jobs -x' starts can't be checked before it runs",
          };
      }
    if (SHELL_KEYWORDS.has(commandName))
      return {
        ok: false,
        reason: `Shell keyword '${baseName}' as command name \u2014 tree-sitter mis-parse`,
      };
    if (sawXargs) {
      if (baseName === "find" || baseName === "jq")
        return {
          ok: false,
          reason: `What xargs adds to ${baseName} can't be checked before it runs`,
        };
      if (AWK_NAMES.has(baseName)) {
        let hasProgram = false;
        for (let k = 1; k < argv.length; k++) {
          let arg = argv[k];
          if (arg === "--") {
            hasProgram = k + 1 < argv.length;
            break;
          }
          if (arg === "-" || !arg.startsWith("-")) {
            hasProgram = true;
            break;
          }
          if (!arg.includes("=") && AWK_PROGRAM_FILE_OPT_RE.test(arg)) k++;
        }
        if (!hasProgram)
          return {
            ok: false,
            reason: `The program xargs gives ${baseName} can't be checked before it runs`,
          };
      }
    }
    if (baseName === "jq") {
      for (let arg of argv) {
        if (/\bsystem\s*\(/.test(arg))
          return {
            ok: false,
            reason: "jq command contains system() function which executes arbitrary commands",
          };
        if (/\b(?:include|import)\b/.test(arg))
          return {
            ok: false,
            reason:
              'jq command contains include/import \u2014 modules can load arbitrary .jq files via {search:"."} and call env or other builtins',
          };
      }
      if (
        argv.some((arg) =>
          /^(?:-[A-Za-z]*[fL]|--(?:from-file|rawfile|slurpfile|library-path)(?:$|=))/.test(arg),
        )
      )
        return {
          ok: false,
          reason: "jq command contains dangerous flags that could execute code or read arbitrary files",
        };
    }
    if (AWK_NAMES.has(baseName)) {
      if (cmd.hasUnquotedGlob || (useSourceGlob && hasSourceUnquotedGlob(cmd)))
        return {
          ok: false,
          reason:
            "awk command contains unquoted glob characters \u2014 could glob-expand to a planted program or flag before awk runs",
        };
      for (let arg of argv) {
        let reason = awkProgramHasExecBridge(arg);
        if (reason !== false)
          return {
            ok: false,
            reason,
          };
        if (containsAnyPlaceholder(arg))
          return {
            ok: false,
            reason: "awk is given text that can't be checked before it runs",
          };
      }
      if (
        argv.some((arg) => /^-[bcCghIkMnNOPrsStV]*[fEileDW]/.test(arg) || /^--(?:fil|e|i|lo|s|de)/.test(arg))
      )
        return {
          ok: false,
          reason: "awk has an option that can't be checked before it runs",
        };
    }
    if (baseName === "find") {
      if (cmd.hasUnquotedGlob || (useSourceGlob && hasSourceUnquotedGlob(cmd)))
        return {
          ok: false,
          reason:
            "find contains unquoted glob characters \u2014 could glob-expand to a dangerous action before find runs",
        };
      let afterFlagValue = false;
      for (let k = 1; k < argv.length; k++) {
        let arg = argv[k];
        let previousWasFlagValue = afterFlagValue;
        afterFlagValue = false;
        if (isFindDangerousAction(arg))
          return {
            ok: false,
            reason: `find with '${arg}' executes commands or modifies files \u2014 cannot be auto-allowed by a Bash(find:*) prefix rule`,
          };
        if (isAmbiguousFindWord(arg))
          return {
            ok: false,
            reason: `find option '${arg}' is read differently by different versions of find \u2014 could hide a following action`,
          };
        if (!previousWasFlagValue && findWordTakesFlagValue(arg)) {
          afterFlagValue = true;
          continue;
        }
        if (!previousWasFlagValue && findWordTakesOperand(arg)) {
          k++;
          continue;
        }
        if (containsAnyPlaceholder(arg))
          return {
            ok: false,
            reason: "find argument is runtime-determined \u2014 could resolve to a dangerous action",
          };
        if (/[[\]*?]/.test(arg))
          return {
            ok: false,
            reason: `find argument '${arg}' contains glob characters \u2014 could glob-expand to a dangerous action`,
          };
      }
    }
    if (isZshDangerousBuiltin(commandName))
      return {
        ok: false,
        reason: `Zsh builtin '${baseName}' can bypass security checks`,
      };
    let refusal = zshStatWritesVarReason(commandName, argv.slice(1));
    if (refusal !== null)
      return {
        ok: false,
        reason: refusal,
      };
    if (EVAL_LIKE_BUILTINS.has(commandName))
      if (baseName === "fc" && !argv.slice(1).some((arg) => /^[+-].*[es]/.test(arg)));
      else if (baseName === "compgen" && !argv.slice(1).some((arg) => /^[+-].*[CFW]/.test(arg)));
      else
        return {
          ok: false,
          reason: `'${baseName}' evaluates arguments as shell code`,
        };
    if (UNHANDLED_EXEC_WRAPPERS.has(baseName) && argv.length > 1)
      return {
        ok: false,
        reason: `What '${baseName}' starts can't be checked before it runs`,
      };
    for (let arg of cmd.argv)
      if (arg.includes("/proc/") && PROC_ENVIRON_RE.test(arg))
        return {
          ok: false,
          reason: "Accesses /proc/*/environ which may expose secrets",
        };
    for (let redirect of cmd.redirects)
      if (redirect.target.includes("/proc/") && PROC_ENVIRON_RE.test(redirect.target))
        return {
          ok: false,
          reason: "Accesses /proc/*/environ which may expose secrets",
        };
    for (let arg of cmd.argv)
      if (
        arg.includes(`
`) &&
        NEWLINE_HASH_RE.test(arg)
      )
        firstFailure ??= {
          ok: false,
          kind: "newline-hash",
          reason: "Newline followed by # inside a quoted argument can hide arguments from path validation",
        };
    for (let envVar of cmd.envVars)
      if (
        envVar.value.includes(`
`) &&
        NEWLINE_HASH_RE.test(envVar.value)
      )
        firstFailure ??= {
          ok: false,
          kind: "newline-hash",
          reason: "Newline followed by # inside an env var value can hide arguments from path validation",
        };
    for (let redirect of cmd.redirects)
      if (
        redirect.target.includes(`
`) &&
        NEWLINE_HASH_RE.test(redirect.target)
      )
        firstFailure ??= {
          ok: false,
          kind: "newline-hash",
          reason: "Newline followed by # inside a redirect target can hide arguments from path validation",
        };
  }
  if (firstFailure) return firstFailure;
  return {
    ok: true,
  };
}
//@ chunk-9jzjcqxe.js:5577-5743 fingerprint (2.1.88 match: walkHeredocRedirect, 0.621)
/**
 * 重定向相关的操作符与节点类型集合（< > >> << <<- <<< <& >& &> &>> >| 以及 file_descriptor、heredoc_*），判断重定向子节点是否只含这些记号。
 */
var REDIRECT_OPERATOR_TOKENS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9jzjcqxe.js:5577", () => {
  REDIRECT_OPERATOR_TOKENS = new Set([
    "<",
    ">",
    ">>",
    "<<",
    "<<-",
    "<<<",
    "<&",
    ">&",
    "&>",
    "&>>",
    ">|",
    ">&-",
    "<&-",
    "file_descriptor",
    "heredoc_start",
    "heredoc_body",
    "heredoc_content",
    "heredoc_end",
  ]);
});
//@ chunk-5xgkngpb.js:1139641-1139805 fingerprint (2.1.88 match: parseForSecurity, 0.86)
/**
 * 快速判断命令是否含 zsh 危险命令：能安全解析时用 AST argv，否则用 splitCommand + tryParseShellCommand 回退，逐条交给 validateZshDangerousCommands。
 */
function hasZshDangerousCommand(cmd) {
  let root = cmd.length > SPLIT_MAX_LEN ? null : getParserModule()?.parse(cmd);
  let parsed = root ? parseForSecurityFromAst(cmd, root) : undefined;
  return (
    parsed?.kind === "simple"
      ? parsed.commands.map((command) => command.argv)
      : splitCommand(cmd).map(getCommandArgv)
  ).some((argv) => isXargsToSafeFilter(stripCommandBuiltinPrefixes(argv)));
}
//@ chunk-5xgkngpb.js:1147250-1147289 fingerprint (2.1.88 match: walkHerestringRedirect, 1)
var INPUT_REDIRECT_OPS_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1147250", () => {
  INPUT_REDIRECT_OPS_2 = new Set(["<", "<<", "<<<", "<&"]);
});
//@ chunk-5xgkngpb.js:1150718-1150798 placement
/**
 * 匹配命令开头的 command/builtin/noglob 包装前缀；stripCommandPrefixes 循环剥除。
 */
var COMMAND_PREFIX_STRIP_RE = /^(?:(?:command(?:[ \t]+-p+)*|builtin)(?:[ \t]+--)?|noglob)[ \t]+(?!-)/;
//@ chunk-5xgkngpb.js:1150798-1150869 placement
/**
 * 循环剥掉 command/builtin/noglob 前缀，得到实际执行的命令文本。
 */
function stripCommandPrefixes(text) {
  let stripped = text;
  while (COMMAND_PREFIX_STRIP_RE.test(stripped)) stripped = stripped.replace(COMMAND_PREFIX_STRIP_RE, "");
  return stripped;
}
//@ chunk-5xgkngpb.js:1150869-1151003 placement
/**
 * 判断语法树中是否含子 shell 或复合语句节点。
 */
function hasSubshellNode(node) {
  if (node.type === "subshell" || node.type === "compound_statement") return true;
  for (let child of node.children) if (child && hasSubshellNode(child)) return true;
  return false;
}
//@ chunk-5xgkngpb.js:1151003-1151073 fingerprint (2.1.88 match: STRUCTURAL_TYPES, 1)
/**
 * 结构性节点类型集合：program、list、pipeline、redirected_statement，遍历时只下钻不当作命令。
 */
var STRUCTURAL_TYPES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1151003", () => {
  STRUCTURAL_TYPES_2 = new Set(["program", "list", "pipeline", "redirected_statement"]);
});
export {
  parseForSecurityFromAst,
  parseForSecurity,
  containsRuntimePlaceholder,
  containsAnyPlaceholder,
  redactPlaceholdersForDisplay,
  awkProgramHasExecBridge,
  isFindDangerousAction,
  INPUT_REDIRECT_OPS_2,
  POSIX_SHELL_NAMES,
  TEST_ARITH_CMP_OPS,
  TEST_ARITH_NUMERIC_RE,
  isAmbiguousFindWord,
  findWordTakesFlagValue,
  findWordTakesOperand,
  hasSourceUnquotedGlob,
  STRUCTURAL_TYPES_2,
  hasSubshellNode,
  stripCommandPrefixes,
  BACKSLASH_ESCAPED_SPACE_RE,
  CONTROL_CHAR_RE,
  LONE_SURROGATE_RE,
  BACKSLASH_LINE_CONTINUATION_RE,
  ZSH_TILDE_BRACKET_RE,
  ZSH_EQUALS_EXPANSION_RE,
  ZSH_NUMERIC_GLOB_RE,
  WORD_LEAF_EXPANSION_RE,
  scanSameLineStatementSplits,
  stripQuotedRegions,
  REDIRECT_OPERATOR_TOKENS,
  WORD_LEAF_QUOTE_RE,
  runWithRefusalTracking,
  deletePlaceholders,
  noteRefusal,
  CMDSUB_PLACEHOLDER,
  hasZshDangerousCommand,
  isAssignmentNameUnsafeForSandbox,
  isSandboxAutoAllowUnsafeBase,
  AWK_NAMES,
  PRINT_PROMPT_FLAG,
  SET_O_SAFE_OPTS,
  SET_O_SAFE_LETTERS,
  DECLARATION_LIKE_BUILTINS,
  declarationPrefixReadings,
  checkSemantics,
  nodeTypeId,
  UNICODE_WHITESPACE_RE,
  stripLiteralQuotedRegions,
  EVAL_LIKE_BUILTINS,
  UNHANDLED_EXEC_WRAPPERS,
  ZSH_DANGEROUS_BUILTINS,
  liveBracedExpansionBodies,
  SUBSCRIPT_EVAL_FLAGS,
  BARE_SUBSCRIPT_NAME_BUILTINS,
  SHELL_PROGRAM_NAMES,
  TRANSPARENT_LAUNCHER_NAMES,
  ZSH_MODULE_NAME_WRITERS,
  failsSubstitutionTextCheck,
  isExecInfluencingVar,
  startsWithAnyPlaceholder,
  INTEGER_ATTR_DEFAULT_VARS,
  ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE,
  containsStandaloneCondCloser,
  BASH_IMPLICITLY_REBOUND_VARS,
  POSIX_SPECIAL_BUILTINS_NONEVAL,
  APPLET_SHELL_NAMES,
  READ_DATA_FLAGS,
  READ_NUMERIC_ARG_FLAGS,
  READ_NUMERIC_OPERAND_RE,
};
