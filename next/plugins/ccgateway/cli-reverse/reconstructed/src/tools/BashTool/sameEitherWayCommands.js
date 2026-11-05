/**
 * tools/BashTool/sameEitherWayCommands.ts
 *
 * 2.1.316 新增：沙箱内外效果相同的命令
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (7)
 * attribution: placement 7
 */
import { stripLiteralQuotedRegions } from "../../utils/bash/ast.js";
import { SPLIT_MAX_LEN } from "../../utils/bash/commands.js";
import { getParserModule } from "../../utils/bash/bashParser.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4955904-4956418 placement
/**
 * 沙箱内外差异检测用常量：zsh nomatch/等号错误、PIPESTATUS 使用、分词相关赋值、zsh 模拟模式、列表值、节点类型集合与"内外效果相同"的命令。
 */
var ZSH_NOMATCH_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ZSH_EQUALS_ERROR_RE;
var ZSH_EQUALS_NOT_FOUND_RE;
var PIPESTATUS_RE;
var WORD_SPLIT_HINT_RE;
var SHWORDSPLIT_RE;
var MULTI_WORD_RE;
var SPLIT_CONTEXT_TYPES;
var FOR_BODY_TYPES;
var SAME_EITHER_WAY_COMMANDS;
var SAME_EITHER_WAY_FEATURE;
deferInit("chunk-5xgkngpb.js:4955904", () => {
  ZSH_NOMATCH_RE = /^(?:\(eval\)|[A-Za-z_][\w-]*)(?::\d+)?: no matches found: /m;
  ZSH_EQUALS_ERROR_RE = /^\(eval\):\d+: \S+ not found$/m;
  ZSH_EQUALS_NOT_FOUND_RE = /^(?:\(eval\)|[A-Za-z_][\w-]*)(?::\d+)?: command not found: =\S+$/m;
  PIPESTATUS_RE = /\$\{?PIPESTATUS\b/;
  WORD_SPLIT_HINT_RE = /=["'$`]|\b(?:for|select)\s/;
  SHWORDSPLIT_RE = /sh_?word_?split|\bemulate\s+(?:-\w+\s+)*(?:sh|ksh|bash)\b/i;
  MULTI_WORD_RE = /\S\s+\S/;
  SPLIT_CONTEXT_TYPES = new Set([
    "command",
    "command_name",
    "declaration_command",
    "unset_command",
    "for_statement",
    "array",
  ]);
  FOR_BODY_TYPES = new Set([";", "do_group"]);
  SAME_EITHER_WAY_COMMANDS = new Set(["echo", "print", "eval"]);
  SAME_EITHER_WAY_FEATURE = "same_either_way_command";
});
//@ chunk-5xgkngpb.js:4956418-4956633 placement
/**
 * 检测命令与输出中的 shell 方言问题：zsh nomatch/等号错误、使用 PIPESTATUS、依赖 bash 分词。
 */
function detectShellDialectIssues(command, output) {
  return {
    zsh_nomatch_error: ZSH_NOMATCH_RE.test(output),
    zsh_equals_error: ZSH_EQUALS_ERROR_RE.test(output),
    zsh_equals_as_command_error: ZSH_EQUALS_NOT_FOUND_RE.test(output),
    bash_pipestatus_use:
      command.includes("PIPESTATUS") && PIPESTATUS_RE.test(stripLiteralQuotedRegions(command)),
    bash_word_split_use: usesBashWordSplitting(command),
  };
}
//@ chunk-5xgkngpb.js:4956633-4956924 placement
function usesBashWordSplitting(command) {
  if (
    !command.includes("$") ||
    command.length > SPLIT_MAX_LEN ||
    !WORD_SPLIT_HINT_RE.test(command) ||
    SHWORDSPLIT_RE.test(command)
  )
    return false;
  let uses = {
    lists: new Set(),
    captured: new Set(),
    split: new Set(),
    iterated: new Set(),
  };
  let astRoot = getParserModule()?.parse(command);
  if (!astRoot) return false;
  collectWordSplitUses(astRoot, "", uses);
  return (
    [...uses.split].some((name) => uses.lists.has(name)) ||
    [...uses.iterated].some((name) => uses.captured.has(name))
  );
}
//@ chunk-5xgkngpb.js:4956924-4957873 placement
/**
 * 遍历语法树收集分词相关信息：被展开到会分词位置的变量、赋值为多词字符串或数组的变量、捕获命令输出的变量、for 循环迭代的变量。
 */
function collectWordSplitUses(node, contextType, uses) {
  let effectiveContext = node.type;
  switch (node.type) {
    case "simple_expansion":
    case "expansion": {
      let expansionVariable = getExpansionVariable(node);
      if (expansionVariable !== undefined && SPLIT_CONTEXT_TYPES.has(contextType))
        uses.split.add(expansionVariable);
      return;
    }
    case "concatenation":
      effectiveContext = contextType;
      break;
    case "command": {
      let found = node.children.find((child) => child.type === "command_name");
      if (found && SAME_EITHER_WAY_COMMANDS.has(found.text)) effectiveContext = SAME_EITHER_WAY_FEATURE;
      break;
    }
    case "variable_assignment": {
      let [nameNode, operatorNode, valueNode] = node.children;
      if (
        contextType === "command" ||
        contextType === SAME_EITHER_WAY_FEATURE ||
        nameNode?.type !== "variable_name" ||
        !valueNode
      )
        break;
      if (
        (valueNode.type === "string" && valueNode.children.length === 3 ? valueNode.children[1] : valueNode)
          ?.type === "command_substitution"
      )
        uses.captured.add(nameNode.text);
      else if (isMultiWordString(valueNode, operatorNode?.type === "+=")) uses.lists.add(nameNode.text);
      else if (valueNode.type === "array" && operatorNode?.type === "=")
        recordSingleVariable(valueNode.children.slice(1, -1), uses.iterated);
      break;
    }
    case "for_statement": {
      let found = node.children.find((child) => child.type === "variable_name");
      if (found && node.children.some((child) => isMultiWordString(child, false))) uses.lists.add(found.text);
      let inEnd = node.children.findIndex((child) => child.type === "in") + 1;
      let index = node.children.findIndex((child) => FOR_BODY_TYPES.has(child.type));
      recordSingleVariable(node.children.slice(inEnd, index), uses.iterated);
      break;
    }
  }
  for (let child of node.children) collectWordSplitUses(child, effectiveContext, uses);
}
//@ chunk-5xgkngpb.js:4957873-4958036 placement
function getExpansionVariable(node) {
  let expectedLength = node.type === "simple_expansion" ? 2 : node.type === "expansion" ? 3 : 0;
  let nameNode = node.children[1];
  return node.children.length === expectedLength && nameNode?.type === "variable_name"
    ? nameNode.text
    : undefined;
}
//@ chunk-5xgkngpb.js:4958036-4958113 placement
/**
 * 若某段单词只有一个变量引用，把该变量名记入“被迭代变量”集合，用于判断循环里读环境变量。
 */
function recordSingleVariable(nodes, iterated) {
  let name = nodes[0] && getExpansionVariable(nodes[0]);
  if (nodes.length === 1 && name !== undefined) iterated.add(name);
}
//@ chunk-5xgkngpb.js:4958113-4958329 placement
function isMultiWordString(node, isAppend) {
  if (node.type !== "string" && node.type !== "raw_string") return false;
  let sliced = node.text.slice(1, -1);
  for (let child of node.children)
    if (child.type !== '"' && child.type !== "string_content") sliced = sliced.replace(child.text, "x");
  return MULTI_WORD_RE.test(isAppend ? `x${sliced}` : sliced);
}
export { detectShellDialectIssues };
