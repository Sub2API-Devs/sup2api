/**
 * utils/bash/commands.ts
 *
 * 命令级工具：提取输出重定向并判断危险、扫描参数中的变量/通配、子命令判定结果组装；（另含被误归的随机名生成器）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/commands.ts
 * pieces: chunk-38axkkfw.js (34), chunk-e6aww6q8.js (2), chunk-r01896cg.js (1)
 * attribution: placement 34, fingerprint 3
 */
import {
  BACKSLASH_ESCAPED_SPACE_RE,
  CONTROL_CHAR_RE,
  LONE_SURROGATE_RE,
  BACKSLASH_LINE_CONTINUATION_RE,
  ZSH_TILDE_BRACKET_RE,
  ZSH_EQUALS_EXPANSION_RE,
  ZSH_NUMERIC_GLOB_RE,
  scanSameLineStatementSplits,
  stripQuotedRegions,
  REDIRECT_OPERATOR_TOKENS,
  WORD_LEAF_EXPANSION_RE,
  WORD_LEAF_QUOTE_RE,
} from "./ast.js";
import { getParserModule } from "./bashParser.js";
import {
  containsSubstitution,
  findCommandNode,
  extractCommandArguments,
  nodeContainsSubstitution,
  UNESCAPED_SHELL_OPERATOR_RE,
  TRAILING_BACKSLASH_RE,
  ARGUMENT_TYPES_2,
} from "./parser.js";
import { dedupeMapKeys } from "../../tools/BashTool/bashCommandHelpers.js";

//@ chunk-38axkkfw.js:312-355 placement
function hasParserLexingDifferential(str) {
  return BACKSLASH_ESCAPED_SPACE_RE.test(str) || hasStatementLexingDifferential(str);
}
//@ chunk-38axkkfw.js:355-455 placement
/**
 * 用一组正则粗查命令文本是否有语句级的词法分歧形态（bash 与 zsh 断句不同），命中即不信任按语句拆分的结果。
 */
function hasStatementLexingDifferential(e) {
  return (
    CONTROL_CHAR_RE.test(e) ||
    LONE_SURROGATE_RE.test(e) ||
    BACKSLASH_LINE_CONTINUATION_RE.test(e) ||
    ZSH_TILDE_BRACKET_RE.test(e) ||
    ZSH_EQUALS_EXPANSION_RE.test(e) ||
    ZSH_NUMERIC_GLOB_RE.test(e)
  );
}
//@ chunk-38axkkfw.js:455-517 placement = nodeTypeId (1)
/**
 * AST 中是否有 ERROR 节点。
 */
function parseHasErrorNode(nodeType) {
  return nodeType.type === "ERROR" || nodeType.children.some(parseHasErrorNode);
}
//@ chunk-38axkkfw.js:517-626 placement = STRUCTURAL_TYPES (0.852)
/**
 * 拆分子命令时的字符上限（65536）。
 */
var COMPOUND_TYPES = new Set(["program", "list", "pipeline"]);
var SEPARATOR_TYPES = new Set([
  "&&",
  "||",
  "|",
  ";",
  "&",
  "|&",
  `
`,
]);
var SPLIT_MAX_LEN = 1e4;
var MAX_SPLIT_CHARS = 65536;
var MAX_SPLIT_DEPTH = 16;
//@ chunk-38axkkfw.js:626-1031 placement
/**
 * 把复合命令拆成子命令文本：超长则整体返回，解析失败返回原文；递归 program、list、pipeline，跳过分隔符、注释和重定向，叶子命令按原文收集。
 */
function splitCommand(e) {
  if (!e) return [];
  if (e.length > SPLIT_MAX_LEN) return [e];
  let t = getParserModule().parse(e);
  if (!t) return [e];
  let r = [];
  let s = (child) => {
    if (SEPARATOR_TYPES.has(child.type) || child.type === "comment") return;
    if (child.type === "redirected_statement") {
      for (let child_2 of child.children) if (!child_2.type.endsWith("_redirect")) s(child_2);
      return;
    }
    if (COMPOUND_TYPES.has(child.type)) {
      for (let child_2 of child.children) s(child_2);
      return;
    }
    r.push(child.text);
  };
  s(t.type === "ERROR" && t.children[0]?.type === "program" ? t.children[0] : t);
  return r;
}
//@ chunk-38axkkfw.js:1031-1385 placement
/**
 * 判断最后一个子命令是否以 && 接在前一条之后（会因前一条失败而不执行）；超长或解析失败时保守返回 true。
 */
function lastCommandIsAndGated(e) {
  if (e.length > SPLIT_MAX_LEN) return true;
  let t = getParserModule().parse(e);
  if (t?.type !== "program") return true;
  let r = t;
  while (r !== undefined && (COMPOUND_TYPES.has(r.type) || r.type === "redirected_statement")) {
    let lastIndex = r.children.findLastIndex(
      (child) =>
        !SEPARATOR_TYPES.has(child.type) && child.type !== "comment" && !child.type.endsWith("_redirect"),
    );
    if (r.type === "list" && r.children[lastIndex - 1]?.type === "&&") return true;
    r = r.children[lastIndex];
  }
  return false;
}
//@ chunk-38axkkfw.js:1385-1468 placement
/**
 * 解析命令并返回其中所有嵌套 command 节点的文本，超长或解析失败返回空数组。
 */
function nestedCommandSpans(e) {
  if (!e || e.length > SPLIT_MAX_LEN) return [];
  let t = getParserModule().parse(e);
  return t ? nestedCommandSpansFromAst(t) : [];
}
//@ chunk-38axkkfw.js:1468-1502 placement
function nestedCommandSpansFromAst(e) {
  return nestedCommandSpansOrOverrun(e) ?? [];
}
//@ chunk-38axkkfw.js:1502-1829 placement
/**
 * 收集语法树里所有 command 节点文本，并展开 ${ …; } 函数替换体再解析；累计长度或嵌套层数超出预算（或严格模式下函数体无法解析）时返回 null。
 */
function nestedCommandSpansOrOverrun(e, { unparsedBodyOverruns: t = false } = {}) {
  let r = [];
  let s = MAX_SPLIT_CHARS;
  let i = MAX_SPLIT_DEPTH;
  let n = false;
  let o = (l) => {
    if (n) return;
    if (l.type === "command") {
      r.push(l.text);
      s -= l.text.length;
    }
    let f = funsubBodyFromNode(l);
    if (f !== null) {
      i -= 1;
      s -= f.length;
    }
    if (s < 0 || i < 0) {
      n = true;
      return;
    }
    if (f !== null) {
      let u = getParserModule()?.parse(f);
      if (u) o(u);
      else if (t) n = true;
      return;
    }
    for (let child of l.children) o(child);
  };
  o(e);
  return n ? null : r;
}
//@ chunk-38axkkfw.js:1829-2063 placement
/**
 * 从 expansion/ERROR 节点中取出 ${ …} 或 ${| …} 函数替换（funsub）的命令体，去掉前导 | 与尾部分号；不是函数替换返回 null。
 */
function funsubBodyFromNode(e) {
  if (e.type !== "expansion" && e.type !== "ERROR") return null;
  let text = e.text;
  if (!/^\$\{[ \t\n|]/.test(text)) return null;
  let r = text.endsWith("}") ? text.length - 1 : text.length;
  return text.slice(2, r).trim().replace(/^\|/, "").replace(/;$/, "").trim();
}
//@ chunk-38axkkfw.js:2063-2160 placement
/**
 * 严格拆分：超长或解析失败返回 null，否则返回结构化的子命令列表。
 */
function splitCommandStrict(command) {
  if (!command || command.length > SPLIT_MAX_LEN) return null;
  let t = getParserModule().parse(command);
  if (!t) return null;
  return collectStatementTexts(t);
}
//@ chunk-38axkkfw.js:2160-2392 placement
/**
 * 为排除命令匹配做拆分：解析有错误节点、同行语句粘连、含命令替换或其他危险结构、zsh 括号展开、反引号时返回 null；任一子命令不满足条件也返回 null。
 */
function splitCommandForExemptionMatch(target) {
  if (!target || target.length > SPLIT_MAX_LEN) return null;
  let t = getParserModule().parse(target);
  if (!t) return null;
  if (
    parseHasErrorNode(t) ||
    scanSameLineStatementSplits(t) !== null ||
    containsSubstitution(t) ||
    hasComplexRedirect(t) ||
    hasZshExecutableParenInBraceExpansion(target)
  )
    return null;
  if (target.includes("`")) return null;
  let statementTexts = collectStatementTexts(t);
  if (statementTexts === null) return null;
  return statementTexts.some(isUnsafeRedirectTarget) ? null : statementTexts;
}
//@ chunk-38axkkfw.js:2392-2476 placement
/**
 * 匹配花括号字面量或 $' / $" 引号起点。
 */
var BRACE_OR_DOLLAR_QUOTE_RE = /(?<!\$)\{|(?<=[$\\]\$)\{|\$'|\$"/;
var SHELL_SEPARATOR_CHARS_RE = /[;&|<>\n]/;
var LEADING_DASH_OR_SLASH_RE = /(?:^|[ \t])[-/]/;
var PAREN_CHARS_RE = /[()]/;
//@ chunk-38axkkfw.js:2476-2574 placement
/**
 * 判断花括号之后是否紧跟引号或反斜杠。
 */
function braceFollowedByQuote(e) {
  let t = e.search(/(?<!\$)\{|(?<=[$\\]\$)\{/);
  return t === -1 || /['"\\]/.test(e.slice(t));
}
//@ chunk-38axkkfw.js:2574-2741 placement
function isUnsafeRedirectTarget(e) {
  if (BRACE_OR_DOLLAR_QUOTE_RE.test(e) && hasShellExpansion(e)) return true;
  let t = stripQuotedRegions(e);
  let replaced = e.replace(/['"\\]/g, "");
  if (
    BRACE_OR_DOLLAR_QUOTE_RE.test(t) &&
    (SHELL_SEPARATOR_CHARS_RE.test(t) ||
      PAREN_CHARS_RE.test(t) ||
      (LEADING_DASH_OR_SLASH_RE.test(replaced) && braceFollowedByQuote(e)))
  )
    return true;
  return SUBSTITUTION_OR_PROCESS_SUB_RE.test(e) || isSimpleTarget(e);
}
//@ chunk-38axkkfw.js:2741-2782 placement
/**
 * 匹配命令替换、进程替换与参数展开起点。
 */
var SUBSTITUTION_OR_PROCESS_SUB_RE = /\$\(|`|<\(|>\(|\$\[|\$\{[ \t\n|]/;
//@ chunk-38axkkfw.js:2782-3016 placement
function isSimpleTarget(target) {
  let t;
  for (let i = 0; i < target.length; i++) {
    let s = target[i];
    if (t !== undefined) {
      if (t === '"' && s === "\\") i++;
      else if (s === t) t = undefined;
      continue;
    }
    if (s === "\\") {
      i++;
      continue;
    }
    if (s === "'" || s === '"') {
      t = s;
      continue;
    }
    if (s === "$" && target[i + 1] === '"') return true;
  }
  return false;
}
//@ chunk-38axkkfw.js:3016-3070 placement
/**
 * 简单文件描述符重定向的节点类型（file_descriptor、number、>&、<&）。
 */
var SIMPLE_FD_REDIRECT_TYPES = new Set(["file_descriptor", "number", ">&", "<&"]);
//@ chunk-38axkkfw.js:3070-3161 placement
/**
 * 判断重定向节点是否结构复杂（递归检查子节点）。
 */
function hasComplexRedirect(e) {
  if (e.type.endsWith("_redirect")) {
    if (!isSimpleFdRedirect(e)) return true;
  }
  return e.children.some(hasComplexRedirect);
}
//@ chunk-38axkkfw.js:3161-3462 placement
/**
 * 判断重定向节点是否只由简单的文件描述符/数字/单词组成（2 或 3 个子节点、无嵌套）。
 */
function isSimpleFdRedirect(e) {
  let mapped = e.children.map((child) => child.type);
  if (!(
    (mapped.length === 2 && mapped[0] !== "file_descriptor") ||
    (mapped.length === 3 && mapped[0] === "file_descriptor")
  ))
    return false;
  return e.children.every((child) => {
    if (!SIMPLE_FD_REDIRECT_TYPES.has(child.type) || child.children.length !== 0) return false;
    return child.type === "number" || child.type === "file_descriptor" ? /^\d+$/.test(child.text) : true;
  });
}
//@ chunk-38axkkfw.js:3462-3953 placement
/**
 * 遍历语法树收集各简单命令/赋值的文本（穿过复合语句、否定、重定向语句）；遇到子 shell 或无法识别的节点返回 null。
 */
function collectStatementTexts(e) {
  let t = [];
  let r = true;
  let s = (child) => {
    if (!r) return;
    if (SEPARATOR_TYPES.has(child.type) || child.type === "comment") return;
    if (child.type === "redirected_statement") {
      for (let child_2 of child.children) {
        if (child_2.type.endsWith("_redirect")) {
          if (containsCommandSubshell(child_2)) {
            r = false;
            return;
          }
          continue;
        }
        s(child_2);
      }
      return;
    }
    if (COMPOUND_TYPES.has(child.type)) {
      for (let child_2 of child.children) s(child_2);
      return;
    }
    if (child.type === "negated_command") {
      for (let child_2 of child.children) if (child_2.type !== "!") s(child_2);
      return;
    }
    if (child.type === "command" || child.type === "variable_assignment") {
      if (containsCommandSubshell(child)) {
        r = false;
        return;
      }
      t.push(child.text);
      return;
    }
    r = false;
  };
  s(e);
  return r ? t : null;
}
//@ chunk-38axkkfw.js:3953-4110 placement
function containsCommandSubshell(child) {
  let t = child.type === "command" || child.type === "variable_assignment";
  for (let child_2 of child.children) {
    if (child_2.type === "subshell" && t) return true;
    if (containsCommandSubshell(child_2)) return true;
  }
  return false;
}
//@ chunk-38axkkfw.js:4110-4333 placement
/**
 * 是否有带 ( 的 expansion 节点（zsh 会在花括号展开里执行括号内容）；超长或解析失败保守返回 true。
 */
function hasZshExecutableParenInBraceExpansion(e) {
  if (!e) return false;
  if (e.length > SPLIT_MAX_LEN) return true;
  let t = getParserModule()?.parse(e);
  if (!t) return true;
  let r = false;
  let s = (i) => {
    if (r) return;
    if (i.type === "expansion" && i.text.includes("(")) {
      r = true;
      return;
    }
    for (let child of i.children) s(child);
  };
  s(t);
  return r;
}
//@ chunk-38axkkfw.js:4333-4458 placement = tryParseShellCommand (0)
/**
 * shell-quote 风格回退：解析命令并返回第一条命令的去引号参数列表；超长或失败返回空数组。
 */
function getCommandArgv(e) {
  if (!e || e.length > SPLIT_MAX_LEN) return [];
  let t = getParserModule().parse(e);
  if (!t) return [];
  let commandNode = findCommandNode(t, null);
  if (!commandNode) return [];
  return extractCommandArguments(commandNode);
}
//@ chunk-38axkkfw.js:4458-4575 placement
var EXPANSION_NODE_TYPES = new Set([
  "command_substitution",
  "process_substitution",
  "expansion",
  "simple_expansion",
  "arithmetic_expansion",
]);
//@ chunk-38axkkfw.js:4575-4641 placement
function filterControlOperators(commandsAndOperators) {
  if (EXPANSION_NODE_TYPES.has(commandsAndOperators.type)) return true;
  return commandsAndOperators.children.some(filterControlOperators);
}
//@ chunk-38axkkfw.js:5089-5417 placement
/**
 * 子树中是否有重定向节点在运算符后跟了多于一个词（多余的词会变成命令的隐藏参数）。
 */
function hasRedirectWithExtraWords(e) {
  if (e.type.endsWith("_redirect")) {
    let filtered = e.children.filter((child) => !REDIRECT_OPERATOR_TOKENS.has(child.type));
    let any = e.children.some((child) => child.type === ">&-" || child.type === "<&-");
    let s =
      !any &&
      e.children.some((child) => child.type === ">&" || child.type === "<&") &&
      filtered.some((n) => unquoteNodeText(n).startsWith("-"));
    let i = e.type === "heredoc_redirect" || any || s ? 0 : 1;
    if (filtered.length > i) return true;
  }
  return e.children.some(hasRedirectWithExtraWords);
}
//@ chunk-38axkkfw.js:5417-5671 placement
function hasUnquotedHeredoc(e) {
  if (e.type === "heredoc_redirect") {
    let text = e.children.find((child) => child.type === "heredoc_start")?.text ?? "";
    if (
      !(
        text.length >= 2 &&
        ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"')))
      ) ||
      text.includes("\\")
    )
      return true;
  }
  return e.children.some(hasUnquotedHeredoc);
}
//@ chunk-38axkkfw.js:5671-6680 placement
/**
 * 判断命令的重定向目标是否要到运行时才能确定（含变量、展开、额外单词、= 开头的词等）；只检查调用方判定为相关的命令；超长、存在词法分歧或解析出错时返回 true。
 */
function commandRedirectsAreRuntimeDetermined(command, t) {
  if (!command) return false;
  if (command.length > SPLIT_MAX_LEN || hasParserLexingDifferential(command)) return true;
  let r = getParserModule().parse(command);
  if (!r || parseHasErrorNode(r)) return true;
  let s = (commandsAndOperators) =>
    hasRedirectWithExtraWords(commandsAndOperators) ||
    hasUnquotedHeredoc(commandsAndOperators) ||
    filterControlOperators(commandsAndOperators) ||
    nodeContainsSubstitution(commandsAndOperators) ||
    (commandsAndOperators.type !== "heredoc_redirect" && hasShellExpansion(commandsAndOperators.text)) ||
    (commandsAndOperators.type !== "heredoc_redirect" &&
      !commandsAndOperators.children.every(
        (child) => REDIRECT_OPERATOR_TOKENS.has(child.type) || isStaticWordNode(child, /\s/.test(child.text)),
      )) ||
    (commandsAndOperators.type !== "heredoc_redirect" &&
      commandsAndOperators.children.some((child) => child.type === "word" && child.text.startsWith("=")));
  let i = (o) => {
    if (EXPANSION_NODE_TYPES.has(o.type)) return;
    if (o.type === "command") return o;
    let l;
    for (let child of o.children) {
      if (child.type.endsWith("_redirect")) continue;
      let u = i(child);
      if (u) l = u;
    }
    return l;
  };
  let n = (child) => {
    if (EXPANSION_NODE_TYPES.has(child.type)) return false;
    if (child.type === "redirected_statement") {
      let l = child.children.find((child) => child.type === "command") ?? i(child);
      let f = l ? t(l.text) : true;
      for (let child_2 of child.children)
        if (child_2.type.endsWith("_redirect")) {
          if (f && s(child_2)) return true;
        } else if (n(child_2)) return true;
      return false;
    }
    if (child.type === "command") {
      let l = t(child.text);
      for (let child_2 of child.children)
        if (child_2.type.endsWith("_redirect")) {
          if (l && s(child_2)) return true;
        } else if (n(child_2)) return true;
      return false;
    }
    if (child.type.endsWith("_redirect")) return s(child);
    return child.children.some(n);
  };
  return n(r);
}
//@ chunk-38axkkfw.js:6795-7180 placement
/**
 * 判断参数节点是否为静态文本：拼接节点逐个检查；word 不含展开、未转义操作符、结尾反斜杠（可选不含引号）；字符串引号完整。
 */
function isStaticWordNode(child, t = false) {
  if (child.type === "concatenation") return child.children.every((child) => isStaticWordNode(child, t));
  if (child.type === "word") {
    if (WORD_LEAF_EXPANSION_RE.test(child.text)) return false;
    if (UNESCAPED_SHELL_OPERATOR_RE.test(child.text) || TRAILING_BACKSLASH_RE.test(child.text)) return false;
    if (t && WORD_LEAF_QUOTE_RE.test(child.text)) return false;
    return true;
  }
  if (child.type === "string" || child.type === "raw_string") {
    let r = child.type === "raw_string" ? "'" : '"';
    return child.text.length >= 2 && child.text.startsWith(r) && child.text.endsWith(r);
  }
  return ARGUMENT_TYPES_2.has(child.type);
}
//@ chunk-38axkkfw.js:7180-7927 placement
/**
 * 逐字符扫描命令文本，判断是否含变量/命令替换、ANSI-C 字符串、通配符、=( 或大括号展开等会被 shell 展开的内容；引号未闭合也视为有。
 */
function hasShellExpansion(text) {
  let quote = null;
  let inBrace = false;
  let braceHasSeparator = false;
  for (let index = 0; index < text.length; index++) {
    let ch = text[index];
    if (quote === "'") {
      if (ch === "'") quote = null;
      continue;
    }
    if (quote === '"') {
      if (ch === "\\" && index + 1 < text.length && '$`"\\'.includes(text[index + 1])) {
        index++;
        continue;
      }
      if (ch === "`") return true;
      if (ch === "$" && /[A-Za-z0-9_{(@*#?$!-]/.test(text[index + 1] ?? "")) return true;
      if (ch === '"') quote = null;
      continue;
    }
    if (ch === "\\") {
      index++;
      continue;
    }
    if (ch === "`") return true;
    if (ch === "$" && (text[index + 1] === "'" || text[index + 1] === '"')) return true;
    if (ch === "$" && /[A-Za-z0-9_{(@*#?$!-]/.test(text[index + 1] ?? "")) return true;
    if (ch === "=" && text[index + 1] === "(") return true;
    if (ch === "*" || ch === "?" || ch === "[") return true;
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (
      ch ===
      `
`
    )
      return false;
    if (ch === " " || ch === "\t") {
      inBrace = false;
      braceHasSeparator = false;
      continue;
    }
    if (ch === "{") {
      inBrace = true;
      continue;
    }
    if (inBrace && (ch === "," || (ch === "." && text[index + 1] === "."))) {
      braceHasSeparator = true;
      continue;
    }
    if (ch === "}" && inBrace && braceHasSeparator) return true;
  }
  return quote !== null;
}
//@ chunk-38axkkfw.js:7927-8478 placement
/**
 * 判断单条命令的 argv 是否要到运行时才能确定：必须恰好一条简单命令、无替换、展开和异常重定向，且所有参数都是静态字面量，否则返回 true。
 */
function commandArgvIsRuntimeDetermined(text) {
  if (!text || text.length > SPLIT_MAX_LEN) return true;
  if (hasParserLexingDifferential(text)) return true;
  if (hasShellExpansion(text)) return true;
  let commandsAndOperators = getParserModule().parse(text);
  if (!commandsAndOperators || parseHasErrorNode(commandsAndOperators)) return true;
  let filtered = commandsAndOperators.children.filter((child) => child.type !== "comment");
  if (
    filtered.length !== 1 ||
    (filtered[0].type !== "command" &&
      !(
        filtered[0].type === "redirected_statement" &&
        filtered[0].children.some((child) => child.type === "command")
      ))
  )
    return true;
  if (
    filterControlOperators(commandsAndOperators) ||
    nodeContainsSubstitution(commandsAndOperators) ||
    hasRedirectWithExtraWords(commandsAndOperators) ||
    hasUnquotedHeredoc(commandsAndOperators)
  )
    return true;
  let commandNode = findCommandNode(commandsAndOperators, null);
  if (!commandNode) return true;
  for (let child of commandNode.children) {
    if (child.type === "command_name" || child.type === "variable_assignment") continue;
    if (child.type.endsWith("_redirect")) continue;
    if (!isStaticWordNode(child, /\s/.test(child.text))) return true;
  }
  return false;
}
//@ chunk-38axkkfw.js:8478-8726 placement
function unquoteNodeText(e) {
  switch (e.type) {
    case "raw_string":
      return e.text.slice(1, -1);
    case "string":
      return e.text.slice(1, -1).replace(/\\([$`"\\\n])/g, (t, r) =>
        r ===
        `
`
          ? ""
          : r,
      );
    case "word":
      return e.text.replace(/\\([\s\S])/g, (t, r) =>
        r ===
        `
`
          ? ""
          : r,
      );
    default:
      return e.text;
  }
}
//@ chunk-38axkkfw.js:8726-11128 placement = extractOutputRedirections (0.149)
/**
 * 从命令中提取输出重定向（> >> &> >| >&）：返回 {commandWithoutRedirections, redirections:[{target, operator}], hasDangerousRedirection, dangerousRedirectionReason}；目标含 ~ 通配 ! = 或变量、多目标、<& 异常、/dev/tcp|udp 等标为危险（shell_expansion / network_device）。
 */
function extractOutputRedirections(cmd) {
  let emptyResult = {
    commandWithoutRedirections: cmd,
    redirections: [],
    hasDangerousRedirection: false,
    dangerousRedirectionReason: undefined,
  };
  if (!cmd || cmd.length > SPLIT_MAX_LEN) return emptyResult;
  let r = getParserModule().parse(cmd);
  if (!r) return emptyResult;
  let redirections = [];
  let hasDangerous = false;
  let dangerReason;
  let visitRedirects = (u) => {
    if (u.type === "file_redirect") {
      let operator = null;
      let isFdDup = false;
      let targetNode = null;
      let L = 0;
      for (let child of u.children)
        if (child.type === ">" || child.type === "&>" || child.type === ">|") operator = ">";
        else if (child.type === ">>" || child.type === "&>>" || child.type === ">>|") operator = ">>";
        else if (child.type === ">&") {
          operator = ">";
          isFdDup = true;
        } else if (child.type === "<&") {
          let filtered = u.children.filter(
            (child_2) => child_2 !== child && child_2.type !== "file_descriptor",
          );
          if (filtered.length > 1 || filtered.some((p) => unquoteNodeText(p).startsWith("-"))) {
            hasDangerous = true;
            if (dangerReason !== "network_device") dangerReason = "shell_expansion";
          }
          return;
        } else if (child.type === ">&-" || child.type === "<&-") {
          if (u.children.filter((match) => match !== child && match.type !== "file_descriptor").length > 0) {
            hasDangerous = true;
            if (dangerReason !== "network_device") dangerReason = "shell_expansion";
          }
          return;
        } else if (child.type === "<") {
          let filtered = u.children.filter((env) => env !== child && env.type !== "file_descriptor");
          if (filtered.length > 1) {
            hasDangerous = true;
            if (dangerReason !== "network_device") dangerReason = "shell_expansion";
            return;
          }
          let p = filtered[0];
          if (p) {
            let m = unquoteNodeText(p);
            if (/^\/dev\/(tcp|udp)\//.test(m)) {
              hasDangerous = true;
              dangerReason = "network_device";
            }
          }
          return;
        } else if (child.type !== "file_descriptor") {
          targetNode = child;
          L++;
        }
      if (!operator || !targetNode) return;
      if (L > 1) {
        hasDangerous = true;
        if (dangerReason !== "network_device") dangerReason = "shell_expansion";
        return;
      }
      if (isFdDup && unquoteNodeText(targetNode).startsWith("-")) {
        hasDangerous = true;
        if (dangerReason !== "network_device") dangerReason = "shell_expansion";
        return;
      }
      if (targetNode.type === "number" && targetNode.children.length === 0 && isFdDup) return;
      if (!(
        (targetNode.type === "word" && targetNode.children.length === 0) ||
        (targetNode.type === "number" && targetNode.children.length === 0) ||
        targetNode.type === "raw_string" ||
        (targetNode.type === "string" &&
          !targetNode.children.some((child) => child.type !== "string_content" && child.type !== '"'))
      )) {
        hasDangerous = true;
        if (dangerReason !== "network_device") dangerReason = "shell_expansion";
        return;
      }
      let target = unquoteNodeText(targetNode);
      if (/^~|[*?[]/.test(target)) {
        hasDangerous = true;
        if (dangerReason !== "network_device") dangerReason = "shell_expansion";
        return;
      }
      if (target.startsWith("!") || target.startsWith("=")) {
        hasDangerous = true;
        if (dangerReason !== "network_device") dangerReason = "shell_expansion";
        return;
      }
      if (isFdDup && !/^[A-Za-z0-9./_-]+$/.test(target)) {
        hasDangerous = true;
        if (dangerReason !== "network_device") dangerReason = "shell_expansion";
        return;
      }
      if (/^\/dev\/(tcp|udp)\//.test(target)) {
        hasDangerous = true;
        dangerReason = "network_device";
        return;
      }
      redirections.push({
        target,
        operator,
      });
      return;
    }
    for (let child of u.children) visitRedirects(child);
  };
  visitRedirects(r);
  let keptParts = [];
  let collectNonRedirect = (child) => {
    if (child.type === "comment") return;
    if (child.type === "redirected_statement") {
      for (let child_2 of child.children)
        if (!child_2.type.endsWith("_redirect")) collectNonRedirect(child_2);
      return;
    }
    if (COMPOUND_TYPES.has(child.type)) {
      for (let child_2 of child.children) collectNonRedirect(child_2);
      return;
    }
    keptParts.push(child.text);
  };
  collectNonRedirect(r.type === "ERROR" && r.children[0]?.type === "program" ? r.children[0] : r);
  return {
    commandWithoutRedirections: keptParts.length > 0 ? keptParts.join(" ") : cmd,
    redirections,
    hasDangerousRedirection: hasDangerous,
    dangerousRedirectionReason: dangerReason,
  };
}
//@ chunk-e6aww6q8.js:1149287-1150001 fingerprint = hasDangerousExpansion (0.641)
/**
 * 扫描字符串（用于 test 等命令参数）：未在单引号内的 $var 返回 'variable'，未加引号的 * ? [..] 返回 'glob'，否则 false；处理转义、反引号、注释与双引号。
 */
function classifyDangerousExpansion(target) {
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let inBacktick = false;
  let escaped = false;
  let sawGlob = false;
  let inBracket = false;
  let atWordStart = true;
  for (let idx = 0; idx < target.length; idx++) {
    let ch = target[idx];
    if (escaped) {
      escaped = false;
      atWordStart = false;
      continue;
    }
    if (ch === "\\" && !inSingleQuote) {
      if (
        target[idx + 1] ===
        `
`
      ) {
        idx++;
        continue;
      }
      escaped = true;
      continue;
    }
    if (inBacktick) {
      if (ch === "`") {
        inBacktick = false;
        atWordStart = false;
      }
      continue;
    }
    if (ch === "`" && !inSingleQuote) {
      inBacktick = true;
      atWordStart = false;
      continue;
    }
    if (ch === "#" && atWordStart && !inSingleQuote && !inDoubleQuote) {
      while (
        idx < target.length &&
        target[idx] !==
          `
`
      )
        idx++;
      atWordStart = true;
      continue;
    }
    if (ch === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      atWordStart = false;
      continue;
    }
    if (ch === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      atWordStart = false;
      continue;
    }
    if (inSingleQuote) continue;
    if (ch === "$") {
      let q = target[idx + 1];
      if (q && /[A-Za-z_@*#?!$0-9-]/.test(q)) return "variable";
    }
    if (inDoubleQuote) continue;
    if (
      ch === " " ||
      ch === "\t" ||
      ch ===
        `
` ||
      ch === "|" ||
      ch === "&" ||
      ch === ";" ||
      ch === "(" ||
      ch === ")" ||
      ch === "<" ||
      ch === ">"
    ) {
      inBracket = false;
      atWordStart = true;
      continue;
    }
    atWordStart = false;
    if (ch === "?" || ch === "*") {
      sawGlob = true;
      continue;
    }
    if (ch === "[") {
      inBracket = true;
      continue;
    }
    if (ch === "]" && inBracket) sawGlob = true;
  }
  return sawGlob ? "glob" : false;
}
//@ chunk-e6aww6q8.js:1231407-1231663 fingerprint = handleRedirection (0.395)
/**
 * 把子命令判定结果组装成 Map（子命令文本→判定）；同一子命令文本出现多次时把它的重定向拼进键名以区分。
 */
function labelSubcommandResults(subcommands, astCommands, decisions) {
  let occurrences = new Map();
  for (let subcommand of subcommands) occurrences.set(subcommand, (occurrences.get(subcommand) ?? 0) + 1);
  return dedupeMapKeys(
    decisions.map((decision, y) => {
      let S = subcommands[y];
      return [
        (occurrences.get(S) ?? 0) > 1
          ? [
              S,
              ...(astCommands[y]?.redirects ?? []).map(
                (L) => `${L.fd ?? ""}${L.op}${L.op === ">&" || L.op === "<&" ? "" : " "}${L.target}`,
              ),
            ].join(" ")
          : S,
        decision,
      ];
    }),
  );
}
//@ chunk-r01896cg.js:23179-23263 fingerprint = isCommandList (0.464)
/**
 * 递归判断语法树中是否含 comment 节点。
 */
function hasCommentNode(command) {
  return command.children.some(
    (varName) => varName !== undefined && (varName.type === "comment" || hasCommentNode(varName)),
  );
}
export {
  SPLIT_MAX_LEN,
  extractOutputRedirections,
  hasCommentNode,
  splitCommand,
  getCommandArgv,
  splitCommandStrict,
  hasZshExecutableParenInBraceExpansion,
  nestedCommandSpansFromAst,
  funsubBodyFromNode,
  nestedCommandSpansOrOverrun,
  nestedCommandSpans,
  labelSubcommandResults,
  commandArgvIsRuntimeDetermined,
  hasParserLexingDifferential,
  parseHasErrorNode,
  commandRedirectsAreRuntimeDetermined,
  classifyDangerousExpansion,
  hasStatementLexingDifferential,
  splitCommandForExemptionMatch,
  lastCommandIsAndGated,
};
