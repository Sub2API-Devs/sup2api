/**
 * utils/bash/treeSitterAnalysis.ts
 *
 * AST 辅助分析：引号上下文三种视图、顶层复合结构、运算符节点、危险模式（命令/进程替换、参数展开、heredoc、注释）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/treeSitterAnalysis.ts
 * pieces: chunk-8wvtd8sr.js (1), chunk-e6aww6q8.js (10)
 * attribution: fingerprint 6, file-local 4, layout 1
 */
import { typeOf, typeUrlOf } from "../../tools/ArtifactTool/permissions/dbWriteInputs.js";

/**
 * 收集 AST 中单引号串、$'…'、双引号串、引号分界的 heredoc 的字节区间。
 */
//@ chunk-e6aww6q8.js:1050226-1050740 fingerprint = collectQuoteSpans (1)
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
      for (let child of node.children) if (child) collectQuoteSpans(child, out, !0);
      return;
    case "heredoc_redirect": {
      let s = !1;
      for (let child of node.children)
        if (child && child.type === "heredoc_start") {
          let first = child.text[0];
          s = first === "'" || first === '"' || first === "\\";
          break;
        }
      if (s) {
        out.heredoc.push([node.startIndex, node.endIndex]);
        return;
      }
      break;
    }
  }
  for (let child of node.children) if (child) collectQuoteSpans(child, out, inDouble);
}
//@ chunk-e6aww6q8.js:1050740-1050825 file-local
function buildPositionSet(spans) {
  let set = new Set();
  for (let [r, s] of spans) for (let h = r; h < s; h++) set.add(h);
  return set;
}
//@ chunk-e6aww6q8.js:1050825-1050935 file-local
function dropContainedSpans(spans) {
  return spans.filter(
    (n, r) =>
      !spans.some(
        (other, h) => h !== r && other[0] <= n[0] && other[1] >= n[1] && (other[0] < n[0] || other[1] > n[1]),
      ),
  );
}
//@ chunk-e6aww6q8.js:1050935-1051070 file-local
function removeSpans(command, spans) {
  if (spans.length === 0) return command;
  let sorted = dropContainedSpans(spans).sort((h, y) => y[0] - h[0]),
    result = command;
  for (let [h, y] of sorted) result = result.slice(0, h) + result.slice(y);
  return result;
}
//@ chunk-e6aww6q8.js:1051070-1051213 file-local
function replaceSpansKeepQuotes(command, spans) {
  if (spans.length === 0) return command;
  let sorted = dropContainedSpans(spans).sort((h, y) => y[0] - h[0]),
    result = command;
  for (let [h, y, S, w] of sorted) result = result.slice(0, h) + S + w + result.slice(y);
  return result;
}
/**
 * 生成三种去引号视图：withDoubleQuotes（只去单引号内容与双引号定界符）、fullyUnquoted（去掉所有引号区间）、unquotedKeepQuoteChars（清空引号内容但保留引号字符）。供基于文本的危险模式检查。
 */
//@ chunk-e6aww6q8.js:1051213-1051802 fingerprint = extractQuoteContext (1)
function extractQuoteContext(rootNode, command) {
  let spans = { raw: [], ansiC: [], double: [], heredoc: [] };
  collectQuoteSpans(rootNode, spans, !1);
  let { raw: raw, ansiC: ansiC, double: double, heredoc: heredoc } = spans,
    allQuoteSpans = [...raw, ...ansiC, ...double, ...heredoc],
    singleQuoteSet = buildPositionSet([...raw, ...ansiC, ...heredoc]),
    doubleQuoteDelimSet = new Set();
  for (let [we, Ee] of double) (doubleQuoteDelimSet.add(we), doubleQuoteDelimSet.add(Ee - 1));
  let withDoubleQuotes = "";
  for (let we = 0; we < command.length; we++) {
    if (singleQuoteSet.has(we)) continue;
    if (doubleQuoteDelimSet.has(we)) continue;
    withDoubleQuotes += command[we];
  }
  let fullyUnquoted = removeSpans(command, allQuoteSpans),
    spansWithQuoteChars = [];
  for (let [we, Ee] of raw) spansWithQuoteChars.push([we, Ee, "'", "'"]);
  for (let [we, Ee] of ansiC) spansWithQuoteChars.push([we, Ee, "$'", "'"]);
  for (let [we, Ee] of double) spansWithQuoteChars.push([we, Ee, '"', '"']);
  for (let [we, Ee] of heredoc) spansWithQuoteChars.push([we, Ee, "", ""]);
  let unquotedKeepQuoteChars = replaceSpansKeepQuotes(command, spansWithQuoteChars);
  return {
    withDoubleQuotes: withDoubleQuotes,
    fullyUnquoted: fullyUnquoted,
    unquotedKeepQuoteChars: unquotedKeepQuoteChars,
  };
}
/**
 * 提取顶层复合结构：运算符序列（&& || ;）、各段文本，以及是否有管道、子 shell、命令组。
 */
//@ chunk-e6aww6q8.js:1051802-1053276 fingerprint = extractCompoundStructure (0.888)
function extractCompoundStructure(rootNode, command) {
  let r = rootNode,
    s = [],
    h = [],
    y = !1,
    S = !1,
    w = !1,
    L = new Set([
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
          if (listChild.type === "&&" || listChild.type === "||") s.push(listChild.type);
          else if (
            listChild.type === "list" ||
            listChild.type === "redirected_statement" ||
            listChild.type === "pipeline" ||
            listChild.type === "negated_command" ||
            L.has(listChild.type)
          )
            walkTopLevel({ ...node, children: [listChild] });
          else if (listChild.type === "subshell") ((y = !0), h.push(listChild.text));
          else if (listChild.type === "compound_statement") ((S = !0), h.push(listChild.text));
          else h.push(listChild.text);
        }
      else if (child.type === ";") s.push(";");
      else if (child.type === "pipeline") ((w = !0), h.push(child.text), walkTopLevel(child));
      else if (child.type === "subshell") ((y = !0), h.push(child.text));
      else if (child.type === "compound_statement") ((S = !0), h.push(child.text));
      else if (
        child.type === "command" ||
        child.type === "declaration_command" ||
        child.type === "variable_assignment"
      )
        h.push(child.text);
      else if (child.type === "redirected_statement") {
        let Se = !1;
        for (let inner of child.children) {
          if (!inner || inner.type === "file_redirect") continue;
          ((Se = !0), walkTopLevel({ ...child, children: [inner] }));
        }
        if (!Se) h.push(child.text);
      } else if (child.type === "negated_command") (h.push(child.text), walkTopLevel(child));
      else if (L.has(child.type)) {
        if (child.type !== "do_group" && child.type !== "elif_clause" && child.type !== "else_clause")
          h.push(child.text);
        walkTopLevel(child);
      } else if (child.children.length > 0) walkTopLevel(child);
    }
  }
  if ((walkTopLevel(r), h.length === 0)) h.push(command);
  return {
    hasCompoundOperators: s.length > 0,
    hasPipeline: w,
    hasSubshell: y,
    hasCommandGroup: S,
    operators: s,
    segments: h,
  };
}
/**
 * AST 中是否有 ; && || 或 list 节点。
 */
//@ chunk-e6aww6q8.js:1053276-1053462 layout = hasActualOperatorNodes (1)
function hasActualOperatorNodes(rootNode) {
  let n = rootNode;
  function walk(node) {
    if (node.type === ";" || node.type === "&&" || node.type === "||") return !0;
    if (node.type === "list") return !0;
    for (let child of node.children) if (child && walk(child)) return !0;
    return !1;
  }
  return walk(n);
}
/**
 * 统计 AST 中是否出现命令替换、进程替换、参数展开、heredoc、注释。
 */
//@ chunk-e6aww6q8.js:1053462-1053850 fingerprint = extractDangerousPatterns (1)
function extractDangerousPatterns(rootNode) {
  let n = rootNode,
    r = !1,
    s = !1,
    h = !1,
    y = !1,
    S = !1;
  function walk(node) {
    switch (node.type) {
      case "command_substitution":
        r = !0;
        break;
      case "process_substitution":
        s = !0;
        break;
      case "expansion":
        h = !0;
        break;
      case "heredoc_redirect":
        y = !0;
        break;
      case "comment":
        S = !0;
        break;
    }
    for (let child of node.children) if (child) walk(child);
  }
  return (
    walk(n),
    {
      hasCommandSubstitution: r,
      hasProcessSubstitution: s,
      hasParameterExpansion: h,
      hasHeredoc: y,
      hasComment: S,
    }
  );
}
/**
 * 汇总 AST 分析：quoteContext、compoundStructure、hasActualOperatorNodes、dangerousPatterns。
 */
//@ chunk-e6aww6q8.js:1053850-1053980 fingerprint = analyzeCommand (1)
function analyzeCommand(rootNode, command) {
  return {
    quoteContext: extractQuoteContext(rootNode, command),
    compoundStructure: extractCompoundStructure(rootNode, command),
    hasActualOperatorNodes: hasActualOperatorNodes(rootNode),
    dangerousPatterns: extractDangerousPatterns(rootNode),
  };
}
/**
 * 判断工具输入是否为带过滤条件的 action='list' 调用，某工具的 checkPermissions 据此补默认 scope。旧版名 hasActualOperatorNodes 误配，与 Bash 无关。
 */
//@ chunk-8wvtd8sr.js:106702-106809 fingerprint = hasActualOperatorNodes (1)
function isListActionInput(rootNode) {
  return (
    typeof rootNode === "object" &&
    rootNode !== null &&
    rootNode.action === "list" &&
    (typeOf(rootNode) !== void 0 || typeUrlOf(rootNode) !== void 0)
  );
}

export { isListActionInput, analyzeCommand };
