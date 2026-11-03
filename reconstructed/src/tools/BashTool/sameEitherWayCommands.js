/**
 * tools/BashTool/sameEitherWayCommands.ts
 *
 * 2.1.316 新增：沙箱内外效果相同的命令
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: placement 7
 */
import { stripLiteralQuotedRegions } from "../../utils/bash/ast.js";
import { SPLIT_MAX_LEN } from "../../utils/bash/commands.js";
import { getParserModule } from "../../utils/bash/bashParser.js";

/**
 * 沙箱内外差异检测用常量：zsh nomatch/等号错误、PIPESTATUS 使用、分词相关赋值、zsh 模拟模式、列表值、节点类型集合与"内外效果相同"的命令。
 */
//@ chunk-e6aww6q8.js:4817273-4817715 placement
var ZSH_NOMATCH_RE = /^(?:\(eval\)|[A-Za-z_][\w-]*)(?::\d+)?: no matches found: /m,
  ZSH_EQUALS_ERROR_RE = /^\(eval\):\d+: \S+ not found$/m,
  PIPESTATUS_RE = /\$\{?PIPESTATUS\b/,
  WORD_SPLIT_HINT_RE = /=["'$`]|\b(?:for|select)\s/,
  SHWORDSPLIT_RE = /sh_?word_?split|\bemulate\s+(?:-\w+\s+)*(?:sh|ksh|bash)\b/i,
  MULTI_WORD_RE = /\S\s+\S/,
  SPLIT_CONTEXT_TYPES = new Set([
    "command",
    "command_name",
    "declaration_command",
    "unset_command",
    "for_statement",
    "array",
  ]),
  FOR_BODY_TYPES = new Set([";", "do_group"]),
  SAME_EITHER_WAY_COMMANDS = new Set(["echo", "print", "eval"]),
  SAME_EITHER_WAY_FEATURE = "same_either_way_command";
/**
 * 检测命令与输出中的 shell 方言问题：zsh nomatch/等号错误、使用 PIPESTATUS、依赖 bash 分词。
 */
//@ chunk-e6aww6q8.js:4817715-4817890 placement
function detectShellDialectIssues(e, n) {
  return {
    zsh_nomatch_error: ZSH_NOMATCH_RE.test(n),
    zsh_equals_error: ZSH_EQUALS_ERROR_RE.test(n),
    bash_pipestatus_use: e.includes("PIPESTATUS") && PIPESTATUS_RE.test(stripLiteralQuotedRegions(e)),
    bash_word_split_use: usesBashWordSplitting(e),
  };
}
//@ chunk-e6aww6q8.js:4817890-4818181 placement
function usesBashWordSplitting(e) {
  if (!e.includes("$") || e.length > SPLIT_MAX_LEN || !WORD_SPLIT_HINT_RE.test(e) || SHWORDSPLIT_RE.test(e))
    return !1;
  let n = { lists: new Set(), captured: new Set(), split: new Set(), iterated: new Set() },
    r = getParserModule()?.parse(e);
  if (!r) return !1;
  return (
    collectWordSplitUses(r, "", n),
    [...n.split].some((s) => n.lists.has(s)) || [...n.iterated].some((s) => n.captured.has(s))
  );
}
/**
 * 遍历语法树收集分词相关信息：被展开到会分词位置的变量、赋值为多词字符串或数组的变量、捕获命令输出的变量、for 循环迭代的变量。
 */
//@ chunk-e6aww6q8.js:4818181-4819130 placement
function collectWordSplitUses(e, n, r) {
  let s = e.type;
  switch (e.type) {
    case "simple_expansion":
    case "expansion": {
      let h = getExpansionVariable(e);
      if (h !== void 0 && SPLIT_CONTEXT_TYPES.has(n)) r.split.add(h);
      return;
    }
    case "concatenation":
      s = n;
      break;
    case "command": {
      let found = e.children.find((y) => y.type === "command_name");
      if (found && SAME_EITHER_WAY_COMMANDS.has(found.text)) s = SAME_EITHER_WAY_FEATURE;
      break;
    }
    case "variable_assignment": {
      let [h, y, S] = e.children;
      if (n === "command" || n === SAME_EITHER_WAY_FEATURE || h?.type !== "variable_name" || !S) break;
      if (
        (S.type === "string" && S.children.length === 3 ? S.children[1] : S)?.type === "command_substitution"
      )
        r.captured.add(h.text);
      else if (isMultiWordString(S, y?.type === "+=")) r.lists.add(h.text);
      else if (S.type === "array" && y?.type === "=") i4n(S.children.slice(1, -1), r.iterated);
      break;
    }
    case "for_statement": {
      let found = e.children.find((w) => w.type === "variable_name");
      if (found && e.children.some((w) => isMultiWordString(w, !1))) r.lists.add(found.text);
      let y = e.children.findIndex((w) => w.type === "in") + 1,
        index = e.children.findIndex((w) => FOR_BODY_TYPES.has(w.type));
      i4n(e.children.slice(y, index), r.iterated);
      break;
    }
  }
  for (let h of e.children) collectWordSplitUses(h, s, r);
}
//@ chunk-e6aww6q8.js:4819130-4819293 placement
function getExpansionVariable(e) {
  let n = e.type === "simple_expansion" ? 2 : e.type === "expansion" ? 3 : 0,
    r = e.children[1];
  return e.children.length === n && r?.type === "variable_name" ? r.text : void 0;
}
//@ chunk-e6aww6q8.js:4819293-4819370 placement
function i4n(e, n) {
  let r = e[0] && getExpansionVariable(e[0]);
  if (e.length === 1 && r !== void 0) n.add(r);
}
//@ chunk-e6aww6q8.js:4819370-4819586 placement
function isMultiWordString(e, n) {
  if (e.type !== "string" && e.type !== "raw_string") return !1;
  let sliced = e.text.slice(1, -1);
  for (let s of e.children)
    if (s.type !== '"' && s.type !== "string_content") sliced = sliced.replace(s.text, "x");
  return MULTI_WORD_RE.test(n ? `x${sliced}` : sliced);
}

export { detectShellDialectIssues };
