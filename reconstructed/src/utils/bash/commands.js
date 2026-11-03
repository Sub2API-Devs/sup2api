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
import { containsSubstitution, N } from "./_new/containsSubstitution.js";
import {
  findCommandNode,
  extractCommandArguments,
  UNESCAPED_SHELL_OPERATOR_RE,
  TRAILING_BACKSLASH_RE,
  ARGUMENT_TYPES_2,
} from "./parser.js";
import { dedupeMapKeys } from "../../tools/BashTool/bashCommandHelpers.js";

//@ chunk-38axkkfw.js:312-355 placement
function hasParserLexingDifferential(str) {
  return BACKSLASH_ESCAPED_SPACE_RE.test(str) || hasStatementLexingDifferential(str);
}
/**
 * 用一组正则粗查命令文本是否有语句级的词法分歧形态（bash 与 zsh 断句不同），命中即不信任按语句拆分的结果。
 */
//@ chunk-38axkkfw.js:355-455 placement
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
/**
 * AST 中是否有 ERROR 节点。
 */
//@ chunk-38axkkfw.js:455-517 placement = nodeTypeId (1)
function parseHasErrorNode(nodeType) {
  return nodeType.type === "ERROR" || nodeType.children.some(parseHasErrorNode);
}
//@ chunk-38axkkfw.js:517-626 placement = STRUCTURAL_TYPES (0.852)
var COMPOUND_TYPES = new Set(["program", "list", "pipeline"]),
  SEPARATOR_TYPES = new Set([
    "&&",
    "||",
    "|",
    ";",
    "&",
    "|&",
    `
`,
  ]),
  SPLIT_MAX_LEN = 1e4,
  P = 65536,
  U = 16;
/**
 * 把复合命令拆成子命令文本：超长则整体返回，解析失败返回原文；递归 program、list、pipeline，跳过分隔符、注释和重定向，叶子命令按原文收集。
 */
//@ chunk-38axkkfw.js:626-1031 placement
function splitCommand(e) {
  if (!e) return [];
  if (e.length > SPLIT_MAX_LEN) return [e];
  let parse = getParserModule().parse(e);
  if (!parse) return [e];
  let r = [],
    s = (i) => {
      if (SEPARATOR_TYPES.has(i.type) || i.type === "comment") return;
      if (i.type === "redirected_statement") {
        for (let n of i.children) if (!n.type.endsWith("_redirect")) s(n);
        return;
      }
      if (COMPOUND_TYPES.has(i.type)) {
        for (let n of i.children) s(n);
        return;
      }
      r.push(i.text);
    };
  return (s(parse.type === "ERROR" && parse.children[0]?.type === "program" ? parse.children[0] : parse), r);
}
/**
 * 判断最后一个子命令是否以 && 接在前一条之后（会因前一条失败而不执行）；超长或解析失败时保守返回 true。
 */
//@ chunk-38axkkfw.js:1031-1385 placement
function lastCommandIsAndGated(e) {
  if (e.length > SPLIT_MAX_LEN) return !0;
  let parse = getParserModule().parse(e);
  if (parse?.type !== "program") return !0;
  let r = parse;
  while (r !== void 0 && (COMPOUND_TYPES.has(r.type) || r.type === "redirected_statement")) {
    let lastIndex = r.children.findLastIndex(
      (i) => !SEPARATOR_TYPES.has(i.type) && i.type !== "comment" && !i.type.endsWith("_redirect"),
    );
    if (r.type === "list" && r.children[lastIndex - 1]?.type === "&&") return !0;
    r = r.children[lastIndex];
  }
  return !1;
}
/**
 * 解析命令并返回其中所有嵌套 command 节点的文本，超长或解析失败返回空数组。
 */
//@ chunk-38axkkfw.js:1385-1468 placement
function nestedCommandSpans(e) {
  if (!e || e.length > SPLIT_MAX_LEN) return [];
  let parse = getParserModule().parse(e);
  return parse ? nestedCommandSpansFromAst(parse) : [];
}
//@ chunk-38axkkfw.js:1468-1502 placement
function nestedCommandSpansFromAst(e) {
  return nestedCommandSpansOrOverrun(e) ?? [];
}
/**
 * 收集语法树里所有 command 节点文本，并展开 ${ …; } 函数替换体再解析；累计长度或嵌套层数超出预算（或严格模式下函数体无法解析）时返回 null。
 */
//@ chunk-38axkkfw.js:1502-1829 placement
function nestedCommandSpansOrOverrun(e, { unparsedBodyOverruns: t = !1 } = {}) {
  let r = [],
    s = P,
    i = U,
    n = !1,
    o = (l) => {
      if (n) return;
      if (l.type === "command") (r.push(l.text), (s -= l.text.length));
      let f = funsubBodyFromNode(l);
      if (f !== null) ((i -= 1), (s -= f.length));
      if (s < 0 || i < 0) {
        n = !0;
        return;
      }
      if (f !== null) {
        let u = getParserModule()?.parse(f);
        if (u) o(u);
        else if (t) n = !0;
        return;
      }
      for (let u of l.children) o(u);
    };
  return (o(e), n ? null : r);
}
/**
 * 从 expansion/ERROR 节点中取出 ${ …} 或 ${| …} 函数替换（funsub）的命令体，去掉前导 | 与尾部分号；不是函数替换返回 null。
 */
//@ chunk-38axkkfw.js:1829-2063 placement
function funsubBodyFromNode(e) {
  if (e.type !== "expansion" && e.type !== "ERROR") return null;
  let text = e.text;
  if (!/^\$\{[ \t\n|]/.test(text)) return null;
  let r = text.endsWith("}") ? text.length - 1 : text.length;
  return text.slice(2, r).trim().replace(/^\|/, "").replace(/;$/, "").trim();
}
/**
 * 严格拆分：超长或解析失败返回 null，否则返回结构化的子命令列表。
 */
//@ chunk-38axkkfw.js:2063-2160 placement
function splitCommandStrict(command) {
  if (!command || command.length > SPLIT_MAX_LEN) return null;
  let parse = getParserModule().parse(command);
  if (!parse) return null;
  return collectStatementTexts(parse);
}
/**
 * 为排除命令匹配做拆分：解析有错误节点、同行语句粘连、含命令替换或其他危险结构、zsh 括号展开、反引号时返回 null；任一子命令不满足条件也返回 null。
 */
//@ chunk-38axkkfw.js:2160-2392 placement
function splitCommandForExemptionMatch(target) {
  if (!target || target.length > SPLIT_MAX_LEN) return null;
  let parse = getParserModule().parse(target);
  if (!parse) return null;
  if (
    parseHasErrorNode(parse) ||
    scanSameLineStatementSplits(parse) !== null ||
    containsSubstitution(parse) ||
    D(parse) ||
    hasZshExecutableParenInBraceExpansion(target)
  )
    return null;
  if (target.includes("`")) return null;
  let r = collectStatementTexts(parse);
  if (r === null) return null;
  return r.some(isUnsafeRedirectTarget) ? null : r;
}
//@ chunk-38axkkfw.js:2392-2476 placement
var O = /(?<!\$)\{|(?<=[$\\]\$)\{|\$'|\$"/,
  k = /[;&|<>\n]/,
  B = /(?:^|[ \t])[-/]/,
  F = /[()]/;
//@ chunk-38axkkfw.js:2476-2574 placement
function H(e) {
  let search = e.search(/(?<!\$)\{|(?<=[$\\]\$)\{/);
  return search === -1 || /['"\\]/.test(e.slice(search));
}
//@ chunk-38axkkfw.js:2574-2741 placement
function isUnsafeRedirectTarget(e) {
  if (O.test(e) && hasShellExpansion(e)) return !0;
  let t = stripQuotedRegions(e),
    replaced = e.replace(/['"\\]/g, "");
  if (O.test(t) && (k.test(t) || F.test(t) || (B.test(replaced) && H(e)))) return !0;
  return Y.test(e) || isSimpleTarget(e);
}
//@ chunk-38axkkfw.js:2741-2782 placement
var Y = /\$\(|`|<\(|>\(|\$\[|\$\{[ \t\n|]/;
//@ chunk-38axkkfw.js:2782-3016 placement
function isSimpleTarget(target) {
  let t;
  for (let r = 0; r < target.length; r++) {
    let s = target[r];
    if (t !== void 0) {
      if (t === '"' && s === "\\") r++;
      else if (s === t) t = void 0;
      continue;
    }
    if (s === "\\") {
      r++;
      continue;
    }
    if (s === "'" || s === '"') {
      t = s;
      continue;
    }
    if (s === "$" && target[r + 1] === '"') return !0;
  }
  return !1;
}
//@ chunk-38axkkfw.js:3016-3070 placement
var Z = new Set(["file_descriptor", "number", ">&", "<&"]);
//@ chunk-38axkkfw.js:3070-3161 placement
function D(e) {
  if (e.type.endsWith("_redirect")) {
    if (!isSimpleFdRedirect(e)) return !0;
  }
  return e.children.some(D);
}
/**
 * 判断重定向节点是否只由简单的文件描述符/数字/单词组成（2 或 3 个子节点、无嵌套）。
 */
//@ chunk-38axkkfw.js:3161-3462 placement
function isSimpleFdRedirect(e) {
  let mapped = e.children.map((s) => s.type);
  if (!(
    (mapped.length === 2 && mapped[0] !== "file_descriptor") ||
    (mapped.length === 3 && mapped[0] === "file_descriptor")
  ))
    return !1;
  return e.children.every((s) => {
    if (!Z.has(s.type) || s.children.length !== 0) return !1;
    return s.type === "number" || s.type === "file_descriptor" ? /^\d+$/.test(s.text) : !0;
  });
}
/**
 * 遍历语法树收集各简单命令/赋值的文本（穿过复合语句、否定、重定向语句）；遇到子 shell 或无法识别的节点返回 null。
 */
//@ chunk-38axkkfw.js:3462-3953 placement
function collectStatementTexts(e) {
  let t = [],
    r = !0,
    s = (i) => {
      if (!r) return;
      if (SEPARATOR_TYPES.has(i.type) || i.type === "comment") return;
      if (i.type === "redirected_statement") {
        for (let n of i.children) {
          if (n.type.endsWith("_redirect")) {
            if (containsCommandSubshell(n)) {
              r = !1;
              return;
            }
            continue;
          }
          s(n);
        }
        return;
      }
      if (COMPOUND_TYPES.has(i.type)) {
        for (let n of i.children) s(n);
        return;
      }
      if (i.type === "negated_command") {
        for (let n of i.children) if (n.type !== "!") s(n);
        return;
      }
      if (i.type === "command" || i.type === "variable_assignment") {
        if (containsCommandSubshell(i)) {
          r = !1;
          return;
        }
        t.push(i.text);
        return;
      }
      r = !1;
    };
  return (s(e), r ? t : null);
}
//@ chunk-38axkkfw.js:3953-4110 placement
function containsCommandSubshell(e) {
  let t = e.type === "command" || e.type === "variable_assignment";
  for (let r of e.children) {
    if (r.type === "subshell" && t) return !0;
    if (containsCommandSubshell(r)) return !0;
  }
  return !1;
}
/**
 * 是否有带 ( 的 expansion 节点（zsh 会在花括号展开里执行括号内容）；超长或解析失败保守返回 true。
 */
//@ chunk-38axkkfw.js:4110-4333 placement
function hasZshExecutableParenInBraceExpansion(e) {
  if (!e) return !1;
  if (e.length > SPLIT_MAX_LEN) return !0;
  let t = getParserModule()?.parse(e);
  if (!t) return !0;
  let r = !1,
    s = (i) => {
      if (r) return;
      if (i.type === "expansion" && i.text.includes("(")) {
        r = !0;
        return;
      }
      for (let n of i.children) s(n);
    };
  return (s(t), r);
}
/**
 * shell-quote 风格回退：解析命令并返回第一条命令的去引号参数列表；超长或失败返回空数组。
 */
//@ chunk-38axkkfw.js:4333-4458 placement = tryParseShellCommand (0)
function getCommandArgv(e) {
  if (!e || e.length > SPLIT_MAX_LEN) return [];
  let parse = getParserModule().parse(e);
  if (!parse) return [];
  let r = findCommandNode(parse, null);
  if (!r) return [];
  return extractCommandArguments(r);
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
  if (EXPANSION_NODE_TYPES.has(commandsAndOperators.type)) return !0;
  return commandsAndOperators.children.some(filterControlOperators);
}
/**
 * 子树中是否有重定向节点在运算符后跟了多于一个词（多余的词会变成命令的隐藏参数）。
 */
//@ chunk-38axkkfw.js:5089-5417 placement
function hasRedirectWithExtraWords(e) {
  if (e.type.endsWith("_redirect")) {
    let filtered = e.children.filter((n) => !REDIRECT_OPERATOR_TOKENS.has(n.type)),
      any = e.children.some((n) => n.type === ">&-" || n.type === "<&-"),
      s =
        !any &&
        e.children.some((n) => n.type === ">&" || n.type === "<&") &&
        filtered.some((n) => unquoteNodeText(n).startsWith("-")),
      i = e.type === "heredoc_redirect" || any || s ? 0 : 1;
    if (filtered.length > i) return !0;
  }
  return e.children.some(hasRedirectWithExtraWords);
}
//@ chunk-38axkkfw.js:5417-5671 placement
function hasUnquotedHeredoc(e) {
  if (e.type === "heredoc_redirect") {
    let r = e.children.find((i) => i.type === "heredoc_start")?.text ?? "";
    if (
      !(
        r.length >= 2 &&
        ((r.startsWith("'") && r.endsWith("'")) || (r.startsWith('"') && r.endsWith('"')))
      ) ||
      r.includes("\\")
    )
      return !0;
  }
  return e.children.some(hasUnquotedHeredoc);
}
/**
 * 判断命令的重定向目标是否要到运行时才能确定（含变量、展开、额外单词、= 开头的词等）；只检查调用方判定为相关的命令；超长、存在词法分歧或解析出错时返回 true。
 */
//@ chunk-38axkkfw.js:5671-6680 placement
function commandRedirectsAreRuntimeDetermined(e, t) {
  if (!e) return !1;
  if (e.length > SPLIT_MAX_LEN || hasParserLexingDifferential(e)) return !0;
  let parse = getParserModule().parse(e);
  if (!parse || parseHasErrorNode(parse)) return !0;
  let s = (o) =>
      hasRedirectWithExtraWords(o) ||
      hasUnquotedHeredoc(o) ||
      filterControlOperators(o) ||
      N(o) ||
      (o.type !== "heredoc_redirect" && hasShellExpansion(o.text)) ||
      (o.type !== "heredoc_redirect" &&
        !o.children.every(
          (l) => REDIRECT_OPERATOR_TOKENS.has(l.type) || isStaticWordNode(l, /\s/.test(l.text)),
        )) ||
      (o.type !== "heredoc_redirect" && o.children.some((l) => l.type === "word" && l.text.startsWith("="))),
    i = (o) => {
      if (EXPANSION_NODE_TYPES.has(o.type)) return;
      if (o.type === "command") return o;
      let l;
      for (let f of o.children) {
        if (f.type.endsWith("_redirect")) continue;
        let u = i(f);
        if (u) l = u;
      }
      return l;
    },
    n = (o) => {
      if (EXPANSION_NODE_TYPES.has(o.type)) return !1;
      if (o.type === "redirected_statement") {
        let l = o.children.find((u) => u.type === "command") ?? i(o),
          f = l ? t(l.text) : !0;
        for (let u of o.children)
          if (u.type.endsWith("_redirect")) {
            if (f && s(u)) return !0;
          } else if (n(u)) return !0;
        return !1;
      }
      if (o.type === "command") {
        let l = t(o.text);
        for (let f of o.children)
          if (f.type.endsWith("_redirect")) {
            if (l && s(f)) return !0;
          } else if (n(f)) return !0;
        return !1;
      }
      if (o.type.endsWith("_redirect")) return s(o);
      return o.children.some(n);
    };
  return n(parse);
}
/**
 * 判断参数节点是否为静态文本：拼接节点逐个检查；word 不含展开、未转义操作符、结尾反斜杠（可选不含引号）；字符串引号完整。
 */
//@ chunk-38axkkfw.js:6795-7180 placement
function isStaticWordNode(e, t = !1) {
  if (e.type === "concatenation") return e.children.every((r) => isStaticWordNode(r, t));
  if (e.type === "word") {
    if (WORD_LEAF_EXPANSION_RE.test(e.text)) return !1;
    if (UNESCAPED_SHELL_OPERATOR_RE.test(e.text) || TRAILING_BACKSLASH_RE.test(e.text)) return !1;
    if (t && WORD_LEAF_QUOTE_RE.test(e.text)) return !1;
    return !0;
  }
  if (e.type === "string" || e.type === "raw_string") {
    let r = e.type === "raw_string" ? "'" : '"';
    return e.text.length >= 2 && e.text.startsWith(r) && e.text.endsWith(r);
  }
  return ARGUMENT_TYPES_2.has(e.type);
}
/**
 * 逐字符扫描命令文本，判断是否含变量/命令替换、ANSI-C 字符串、通配符、=( 或大括号展开等会被 shell 展开的内容；引号未闭合也视为有。
 */
//@ chunk-38axkkfw.js:7180-7927 placement
function hasShellExpansion(text) {
  let quote = null,
    inBrace = !1,
    braceHasSeparator = !1;
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
      if (ch === "`") return !0;
      if (ch === "$" && /[A-Za-z0-9_{(@*#?$!-]/.test(text[index + 1] ?? "")) return !0;
      if (ch === '"') quote = null;
      continue;
    }
    if (ch === "\\") {
      index++;
      continue;
    }
    if (ch === "`") return !0;
    if (ch === "$" && (text[index + 1] === "'" || text[index + 1] === '"')) return !0;
    if (ch === "$" && /[A-Za-z0-9_{(@*#?$!-]/.test(text[index + 1] ?? "")) return !0;
    if (ch === "=" && text[index + 1] === "(") return !0;
    if (ch === "*" || ch === "?" || ch === "[") return !0;
    if (ch === "'" || ch === '"') {
      quote = ch;
      continue;
    }
    if (
      ch ===
      `
`
    )
      return !1;
    if (ch === " " || ch === "\t") {
      ((inBrace = !1), (braceHasSeparator = !1));
      continue;
    }
    if (ch === "{") {
      inBrace = !0;
      continue;
    }
    if (inBrace && (ch === "," || (ch === "." && text[index + 1] === "."))) {
      braceHasSeparator = !0;
      continue;
    }
    if (ch === "}" && inBrace && braceHasSeparator) return !0;
  }
  return quote !== null;
}
/**
 * 判断单条命令的 argv 是否要到运行时才能确定：必须恰好一条简单命令、无替换、展开和异常重定向，且所有参数都是静态字面量，否则返回 true。
 */
//@ chunk-38axkkfw.js:7927-8478 placement
function commandArgvIsRuntimeDetermined(e) {
  if (!e || e.length > SPLIT_MAX_LEN) return !0;
  if (hasParserLexingDifferential(e)) return !0;
  if (hasShellExpansion(e)) return !0;
  let parse = getParserModule().parse(e);
  if (!parse || parseHasErrorNode(parse)) return !0;
  let filtered = parse.children.filter((i) => i.type !== "comment");
  if (
    filtered.length !== 1 ||
    (filtered[0].type !== "command" &&
      !(
        filtered[0].type === "redirected_statement" && filtered[0].children.some((i) => i.type === "command")
      ))
  )
    return !0;
  if (
    filterControlOperators(parse) ||
    N(parse) ||
    hasRedirectWithExtraWords(parse) ||
    hasUnquotedHeredoc(parse)
  )
    return !0;
  let s = findCommandNode(parse, null);
  if (!s) return !0;
  for (let i of s.children) {
    if (i.type === "command_name" || i.type === "variable_assignment") continue;
    if (i.type.endsWith("_redirect")) continue;
    if (!isStaticWordNode(i, /\s/.test(i.text))) return !0;
  }
  return !1;
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
/**
 * 从命令中提取输出重定向（> >> &> >| >&）：返回 {commandWithoutRedirections, redirections:[{target, operator}], hasDangerousRedirection, dangerousRedirectionReason}；目标含 ~ 通配 ! = 或变量、多目标、<& 异常、/dev/tcp|udp 等标为危险（shell_expansion / network_device）。
 */
//@ chunk-38axkkfw.js:8726-11128 placement = extractOutputRedirections (0.149)
function extractOutputRedirections(cmd) {
  let emptyResult = {
    commandWithoutRedirections: cmd,
    redirections: [],
    hasDangerousRedirection: !1,
    dangerousRedirectionReason: void 0,
  };
  if (!cmd || cmd.length > SPLIT_MAX_LEN) return emptyResult;
  let parse = getParserModule().parse(cmd);
  if (!parse) return emptyResult;
  let redirections = [],
    hasDangerous = !1,
    dangerReason,
    visitRedirects = (u) => {
      if (u.type === "file_redirect") {
        let operator = null,
          isFdDup = !1,
          targetNode = null,
          L = 0;
        for (let c of u.children)
          if (c.type === ">" || c.type === "&>" || c.type === ">|") operator = ">";
          else if (c.type === ">>" || c.type === "&>>" || c.type === ">>|") operator = ">>";
          else if (c.type === ">&") ((operator = ">"), (isFdDup = !0));
          else if (c.type === "<&") {
            let filtered = u.children.filter((p) => p !== c && p.type !== "file_descriptor");
            if (filtered.length > 1 || filtered.some((p) => unquoteNodeText(p).startsWith("-"))) {
              if (((hasDangerous = !0), dangerReason !== "network_device")) dangerReason = "shell_expansion";
            }
            return;
          } else if (c.type === ">&-" || c.type === "<&-") {
            if (u.children.filter((match) => match !== c && match.type !== "file_descriptor").length > 0) {
              if (((hasDangerous = !0), dangerReason !== "network_device")) dangerReason = "shell_expansion";
            }
            return;
          } else if (c.type === "<") {
            let filtered = u.children.filter((env) => env !== c && env.type !== "file_descriptor");
            if (filtered.length > 1) {
              if (((hasDangerous = !0), dangerReason !== "network_device")) dangerReason = "shell_expansion";
              return;
            }
            let p = filtered[0];
            if (p) {
              let m = unquoteNodeText(p);
              if (/^\/dev\/(tcp|udp)\//.test(m)) ((hasDangerous = !0), (dangerReason = "network_device"));
            }
            return;
          } else if (c.type !== "file_descriptor") ((targetNode = c), L++);
        if (!operator || !targetNode) return;
        if (L > 1) {
          if (((hasDangerous = !0), dangerReason !== "network_device")) dangerReason = "shell_expansion";
          return;
        }
        if (isFdDup && unquoteNodeText(targetNode).startsWith("-")) {
          if (((hasDangerous = !0), dangerReason !== "network_device")) dangerReason = "shell_expansion";
          return;
        }
        if (targetNode.type === "number" && targetNode.children.length === 0 && isFdDup) return;
        if (!(
          (targetNode.type === "word" && targetNode.children.length === 0) ||
          (targetNode.type === "number" && targetNode.children.length === 0) ||
          targetNode.type === "raw_string" ||
          (targetNode.type === "string" &&
            !targetNode.children.some((c) => c.type !== "string_content" && c.type !== '"'))
        )) {
          if (((hasDangerous = !0), dangerReason !== "network_device")) dangerReason = "shell_expansion";
          return;
        }
        let target = unquoteNodeText(targetNode);
        if (/^~|[*?[]/.test(target)) {
          if (((hasDangerous = !0), dangerReason !== "network_device")) dangerReason = "shell_expansion";
          return;
        }
        if (target.startsWith("!") || target.startsWith("=")) {
          if (((hasDangerous = !0), dangerReason !== "network_device")) dangerReason = "shell_expansion";
          return;
        }
        if (isFdDup && !/^[A-Za-z0-9./_-]+$/.test(target)) {
          if (((hasDangerous = !0), dangerReason !== "network_device")) dangerReason = "shell_expansion";
          return;
        }
        if (/^\/dev\/(tcp|udp)\//.test(target)) {
          ((hasDangerous = !0), (dangerReason = "network_device"));
          return;
        }
        redirections.push({ target: target, operator: operator });
        return;
      }
      for (let d of u.children) visitRedirects(d);
    };
  visitRedirects(parse);
  let keptParts = [],
    collectNonRedirect = (u) => {
      if (u.type === "comment") return;
      if (u.type === "redirected_statement") {
        for (let d of u.children) if (!d.type.endsWith("_redirect")) collectNonRedirect(d);
        return;
      }
      if (COMPOUND_TYPES.has(u.type)) {
        for (let d of u.children) collectNonRedirect(d);
        return;
      }
      keptParts.push(u.text);
    };
  return (
    collectNonRedirect(
      parse.type === "ERROR" && parse.children[0]?.type === "program" ? parse.children[0] : parse,
    ),
    {
      commandWithoutRedirections: keptParts.length > 0 ? keptParts.join(" ") : cmd,
      redirections: redirections,
      hasDangerousRedirection: hasDangerous,
      dangerousRedirectionReason: dangerReason,
    }
  );
}
/**
 * 扫描字符串（用于 test 等命令参数）：未在单引号内的 $var 返回 'variable'，未加引号的 * ? [..] 返回 'glob'，否则 false；处理转义、反引号、注释与双引号。
 */
//@ chunk-e6aww6q8.js:1149287-1150001 fingerprint = hasDangerousExpansion (0.641)
function classifyDangerousExpansion(target) {
  let inSingleQuote = !1,
    inDoubleQuote = !1,
    inBacktick = !1,
    escaped = !1,
    sawGlob = !1,
    inBracket = !1,
    atWordStart = !0;
  for (let L = 0; L < target.length; L++) {
    let ch = target[L];
    if (escaped) {
      ((escaped = !1), (atWordStart = !1));
      continue;
    }
    if (ch === "\\" && !inSingleQuote) {
      if (
        target[L + 1] ===
        `
`
      ) {
        L++;
        continue;
      }
      escaped = !0;
      continue;
    }
    if (inBacktick) {
      if (ch === "`") ((inBacktick = !1), (atWordStart = !1));
      continue;
    }
    if (ch === "`" && !inSingleQuote) {
      ((inBacktick = !0), (atWordStart = !1));
      continue;
    }
    if (ch === "#" && atWordStart && !inSingleQuote && !inDoubleQuote) {
      while (
        L < target.length &&
        target[L] !==
          `
`
      )
        L++;
      atWordStart = !0;
      continue;
    }
    if (ch === "'" && !inDoubleQuote) {
      ((inSingleQuote = !inSingleQuote), (atWordStart = !1));
      continue;
    }
    if (ch === '"' && !inSingleQuote) {
      ((inDoubleQuote = !inDoubleQuote), (atWordStart = !1));
      continue;
    }
    if (inSingleQuote) continue;
    if (ch === "$") {
      let q = target[L + 1];
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
      ((inBracket = !1), (atWordStart = !0));
      continue;
    }
    if (((atWordStart = !1), ch === "?" || ch === "*")) {
      sawGlob = !0;
      continue;
    }
    if (ch === "[") {
      inBracket = !0;
      continue;
    }
    if (ch === "]" && inBracket) sawGlob = !0;
  }
  return sawGlob ? "glob" : !1;
}
/**
 * 把子命令判定结果组装成 Map（子命令文本→判定）；同一子命令文本出现多次时把它的重定向拼进键名以区分。
 */
//@ chunk-e6aww6q8.js:1231407-1231663 fingerprint = handleRedirection (0.395)
function labelSubcommandResults(subcommands, astCommands, decisions) {
  let occurrences = new Map();
  for (let h of subcommands) occurrences.set(h, (occurrences.get(h) ?? 0) + 1);
  return dedupeMapKeys(
    decisions.map((h, y) => {
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
        h,
      ];
    }),
  );
}
/**
 * 递归判断语法树中是否含 comment 节点。
 */
//@ chunk-r01896cg.js:23179-23263 fingerprint = isCommandList (0.464)
function hasCommentNode(command) {
  return command.children.some(
    (varName) => varName !== void 0 && (varName.type === "comment" || hasCommentNode(varName)),
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
