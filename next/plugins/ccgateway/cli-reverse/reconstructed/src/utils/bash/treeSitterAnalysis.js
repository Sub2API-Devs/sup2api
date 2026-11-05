/**
 * utils/bash/treeSitterAnalysis.ts
 *
 * AST 辅助分析：引号上下文三种视图、顶层复合结构、运算符节点、危险模式（命令/进程替换、参数展开、heredoc、注释）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/treeSitterAnalysis.ts
 * pieces: chunk-5xgkngpb.js (10), chunk-xzmy9dn4.js (1)
 * attribution: fingerprint 6, file-local 4, placement 1
 */
import { typeOf, typeUrlOf } from "../../tools/ArtifactTool/permissions/dbWriteInputs.js";

//@ chunk-5xgkngpb.js:1045432-1045946 fingerprint (2.1.88 match: collectQuoteSpans, 1)
/**
 * 收集 AST 中单引号串、$'…'、双引号串、引号分界的 heredoc 的字节区间。
 */
function collectQuoteSpans(node, out, inDouble) {
  switch (node.type) {
    case "raw_string":
      out.raw.push([node.startIndex, node.endIndex]);
      return;
    case "ansi_c_string":
      out.ansiC.push([node.startIndex, node.endIndex]);
      return;
    case "string":
      if (!inDouble) out.double.push([node.startIndex, node.endIndex]);
      for (let child of node.children) if (child) collectQuoteSpans(child, out, true);
      return;
    case "heredoc_redirect": {
      let isQuoted = false;
      for (let child of node.children)
        if (child && child.type === "heredoc_start") {
          let first = child.text[0];
          isQuoted = first === "'" || first === '"' || first === "\\";
          break;
        }
      if (isQuoted) {
        out.heredoc.push([node.startIndex, node.endIndex]);
        return;
      }
      break;
    }
  }
  for (let child of node.children) if (child) collectQuoteSpans(child, out, inDouble);
}
//@ chunk-5xgkngpb.js:1045946-1046031 file-local
function buildPositionSet(spans) {
  let set = new Set();
  for (let [start, end] of spans) for (let i = start; i < end; i++) set.add(i);
  return set;
}
//@ chunk-5xgkngpb.js:1046031-1046141 file-local
function dropContainedSpans(spans) {
  return spans.filter(
    (span, i) =>
      !spans.some(
        (other, j) =>
          j !== i && other[0] <= span[0] && other[1] >= span[1] && (other[0] < span[0] || other[1] > span[1]),
      ),
  );
}
//@ chunk-5xgkngpb.js:1046141-1046276 file-local
function removeSpans(command, spans) {
  if (spans.length === 0) return command;
  let sorted = dropContainedSpans(spans).sort((leftSpan, rightSpan) => rightSpan[0] - leftSpan[0]);
  let result = command;
  for (let [start, end] of sorted) result = result.slice(0, start) + result.slice(end);
  return result;
}
//@ chunk-5xgkngpb.js:1046276-1046419 file-local
function replaceSpansKeepQuotes(command, spans) {
  if (spans.length === 0) return command;
  let sorted = dropContainedSpans(spans).sort((leftSpan, rightSpan) => rightSpan[0] - leftSpan[0]);
  let result = command;
  for (let [start, end, open, close] of sorted)
    result = result.slice(0, start) + open + close + result.slice(end);
  return result;
}
//@ chunk-5xgkngpb.js:1046419-1047010 fingerprint (2.1.88 match: extractQuoteContext, 1)
/**
 * 生成三种去引号视图：withDoubleQuotes（只去单引号内容与双引号定界符）、fullyUnquoted（去掉所有引号区间）、unquotedKeepQuoteChars（清空引号内容但保留引号字符）。供基于文本的危险模式检查。
 */
function extractQuoteContext(rootNode, command) {
  let spans = {
    raw: [],
    ansiC: [],
    double: [],
    heredoc: [],
  };
  collectQuoteSpans(rootNode, spans, false);
  let {
    raw: singleQuoteSpans,
    ansiC: ansiCSpans,
    double: doubleQuoteSpans,
    heredoc: quotedHeredocSpans,
  } = spans;
  let allQuoteSpans = [...singleQuoteSpans, ...ansiCSpans, ...doubleQuoteSpans, ...quotedHeredocSpans];
  let singleQuoteSet = buildPositionSet([...singleQuoteSpans, ...ansiCSpans, ...quotedHeredocSpans]);
  let doubleQuoteDelimSet = new Set();
  for (let [start, end] of doubleQuoteSpans) {
    doubleQuoteDelimSet.add(start);
    doubleQuoteDelimSet.add(end - 1);
  }
  let withDoubleQuotes = "";
  for (let i = 0; i < command.length; i++) {
    if (singleQuoteSet.has(i)) continue;
    if (doubleQuoteDelimSet.has(i)) continue;
    withDoubleQuotes += command[i];
  }
  let fullyUnquoted = removeSpans(command, allQuoteSpans);
  let spansWithQuoteChars = [];
  for (let [start, end] of singleQuoteSpans) spansWithQuoteChars.push([start, end, "'", "'"]);
  for (let [start, end] of ansiCSpans) spansWithQuoteChars.push([start, end, "$'", "'"]);
  for (let [start, end] of doubleQuoteSpans) spansWithQuoteChars.push([start, end, '"', '"']);
  for (let [start, end] of quotedHeredocSpans) spansWithQuoteChars.push([start, end, "", ""]);
  let unquotedKeepQuoteChars = replaceSpansKeepQuotes(command, spansWithQuoteChars);
  return {
    withDoubleQuotes,
    fullyUnquoted,
    unquotedKeepQuoteChars,
  };
}
//@ chunk-5xgkngpb.js:1047010-1048515 fingerprint (2.1.88 match: extractCompoundStructure, 0.889)
/**
 * 提取顶层复合结构：运算符序列（&& || ;）、各段文本，以及是否有管道、子 shell、命令组。
 */
function extractCompoundStructure(rootNode, command) {
  let n = rootNode;
  let operators = [];
  let segments = [];
  let hasSubshell = false;
  let hasCommandGroup = false;
  let hasPipeline = false;
  let compoundTypes = new Set([
    "if_statement",
    "while_statement",
    "for_statement",
    "c_style_for_statement",
    "case_statement",
    "function_definition",
    "do_group",
    "elif_clause",
    "else_clause",
  ]);
  function walkTopLevel(node) {
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "list")
        for (let listChild of child.children) {
          if (!listChild) continue;
          if (listChild.type === "&&" || listChild.type === "||") operators.push(listChild.type);
          else if (
            listChild.type === "list" ||
            listChild.type === "redirected_statement" ||
            listChild.type === "pipeline" ||
            listChild.type === "negated_command" ||
            compoundTypes.has(listChild.type)
          )
            walkTopLevel({
              ...node,
              children: [listChild],
            });
          else if (listChild.type === "subshell") {
            hasSubshell = true;
            segments.push(listChild.text);
          } else if (listChild.type === "compound_statement") {
            hasCommandGroup = true;
            segments.push(listChild.text);
          } else segments.push(listChild.text);
        }
      else if (child.type === ";") operators.push(";");
      else if (child.type === "pipeline") {
        hasPipeline = true;
        segments.push(child.text);
        walkTopLevel(child);
      } else if (child.type === "subshell") {
        hasSubshell = true;
        segments.push(child.text);
      } else if (child.type === "compound_statement") {
        hasCommandGroup = true;
        segments.push(child.text);
      } else if (
        child.type === "command" ||
        child.type === "declaration_command" ||
        child.type === "variable_assignment"
      )
        segments.push(child.text);
      else if (child.type === "redirected_statement") {
        let foundInner = false;
        for (let inner of child.children) {
          if (!inner || inner.type === "file_redirect") continue;
          foundInner = true;
          walkTopLevel({
            ...child,
            children: [inner],
          });
        }
        if (!foundInner) segments.push(child.text);
      } else if (child.type === "negated_command") {
        segments.push(child.text);
        walkTopLevel(child);
      } else if (compoundTypes.has(child.type)) {
        if (child.type !== "do_group" && child.type !== "elif_clause" && child.type !== "else_clause")
          segments.push(child.text);
        walkTopLevel(child);
      } else if (child.children.length > 0) walkTopLevel(child);
    }
  }
  walkTopLevel(n);
  if (segments.length === 0) segments.push(command);
  return {
    hasCompoundOperators: operators.length > 0,
    hasPipeline,
    hasSubshell,
    hasCommandGroup,
    operators,
    segments,
  };
}
//@ chunk-5xgkngpb.js:1048515-1048701 fingerprint (2.1.88 match: hasActualOperatorNodes, 1)
/**
 * AST 中是否有 ; && || 或 list 节点。
 */
function hasActualOperatorNodes(rootNode) {
  let node = rootNode;
  function walk(node) {
    if (node.type === ";" || node.type === "&&" || node.type === "||") return true;
    if (node.type === "list") return true;
    for (let child of node.children) if (child && walk(child)) return true;
    return false;
  }
  return walk(node);
}
//@ chunk-5xgkngpb.js:1048701-1049089 fingerprint (2.1.88 match: extractDangerousPatterns, 1)
/**
 * 统计 AST 中是否出现命令替换、进程替换、参数展开、heredoc、注释。
 */
function extractDangerousPatterns(rootNode) {
  let node = rootNode;
  let hasCommandSubstitution = false;
  let hasProcessSubstitution = false;
  let hasParameterExpansion = false;
  let hasHeredoc = false;
  let hasComment = false;
  function walk(node) {
    switch (node.type) {
      case "command_substitution":
        hasCommandSubstitution = true;
        break;
      case "process_substitution":
        hasProcessSubstitution = true;
        break;
      case "expansion":
        hasParameterExpansion = true;
        break;
      case "heredoc_redirect":
        hasHeredoc = true;
        break;
      case "comment":
        hasComment = true;
        break;
    }
    for (let child of node.children) if (child) walk(child);
  }
  walk(node);
  return {
    hasCommandSubstitution,
    hasProcessSubstitution,
    hasParameterExpansion,
    hasHeredoc,
    hasComment,
  };
}
//@ chunk-5xgkngpb.js:1049089-1049219 fingerprint (2.1.88 match: analyzeCommand, 1)
/**
 * 汇总 AST 分析：quoteContext、compoundStructure、hasActualOperatorNodes、dangerousPatterns。
 */
function analyzeCommand(rootNode, command) {
  return {
    quoteContext: extractQuoteContext(rootNode, command),
    compoundStructure: extractCompoundStructure(rootNode, command),
    hasActualOperatorNodes: hasActualOperatorNodes(rootNode),
    dangerousPatterns: extractDangerousPatterns(rootNode),
  };
}
//@ chunk-xzmy9dn4.js:107042-107149 placement (2.1.88 match: hasActualOperatorNodes, 1)
/**
 * 判断工具输入是否为带过滤条件的 action='list' 调用，某工具的 checkPermissions 据此补默认 scope。旧版名 hasActualOperatorNodes 误配，与 Bash 无关。
 */
function isListActionInput(rootNode) {
  return (
    typeof rootNode === "object" &&
    rootNode !== null &&
    rootNode.action === "list" &&
    (typeOf(rootNode) !== undefined || typeUrlOf(rootNode) !== undefined)
  );
}
export { isListActionInput, analyzeCommand };
