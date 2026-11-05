/**
 * utils/bash/ParsedCommand.ts
 *
 * 基于 AST 的 ParsedCommand：管道分段、去掉输出重定向、取输出重定向，单条缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/ParsedCommand.ts
 * pieces: chunk-5xgkngpb.js (8)
 * attribution: callgraph-witnessed 3, fingerprint 4, file-last-pair 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { analyzeCommand } from "./treeSitterAnalysis.js";
import { isGuardOff, isInReExpansion, runGuarded, markGuardFired } from "./bashParserFlags.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1049219-1049275 callgraph-witnessed (2.1.88 match: visitNodes, 0)
/**
 * 深度优先访问 AST 每个节点。
 */
function visitNodes(node, visitor) {
  visitor(node);
  for (let child of node.children) visitNodes(child, visitor);
}
//@ chunk-5xgkngpb.js:1049275-1049460 fingerprint (2.1.88 match: extractPipePositions, 0.859)
/**
 * 收集所有 pipeline 中 | / |& 的字节区间并排序。
 */
function extractPipePositions(rootNode) {
  let pipePositions = [];
  visitNodes(rootNode, (node) => {
    if (node.type === "pipeline") {
      for (let child of node.children)
        if (child.type === "|" || child.type === "|&") pipePositions.push([child.startIndex, child.endIndex]);
    }
  });
  return pipePositions.sort((leftRange, rightRange) => leftRange[0] - rightRange[0]);
}
//@ chunk-5xgkngpb.js:1049460-1049723 fingerprint (2.1.88 match: extractRedirectionNodes, 0.822)
/**
 * 收集 > / >> 文件重定向的 {startIndex, endIndex, target, operator}。
 */
function extractRedirectionNodes(rootNode) {
  let redirections = [];
  visitNodes(rootNode, (node) => {
    if (node.type === "file_redirect") {
      let children = node.children;
      let opIndex = children.findIndex((child) => child.type === ">" || child.type === ">>");
      let opNode = children[opIndex];
      let targetNode = opIndex >= 0 ? children[opIndex + 1] : undefined;
      if (opNode && targetNode)
        redirections.push({
          startIndex: node.startIndex,
          endIndex: targetNode.endIndex,
          target: targetNode.text,
          operator: opNode.type,
        });
    }
  });
  return redirections;
}
//@ chunk-5xgkngpb.js:1049723-1050762 fingerprint (2.1.88 match: TreeSitterParsedCommand, 1)
/**
 * 基于 AST 的命令对象：getPipeSegments 按管道字节位置切段，withoutOutputRedirections 按字节删除输出重定向并规整空白，getOutputRedirections 返回 {target, operator}；还携带 treeSitterAnalysis（引号上下文、复合结构、危险模式）。
 */
class TreeSitterParsedCommand {
  originalCommand;
  commandBytes;
  pipePositions;
  redirectionNodes;
  treeSitterAnalysis;
  constructor(command, pipePositions, redirectionNodes, treeSitterAnalysis) {
    this.originalCommand = command;
    this.commandBytes = Buffer.from(command, "utf8");
    this.pipePositions = pipePositions;
    this.redirectionNodes = redirectionNodes;
    this.treeSitterAnalysis = treeSitterAnalysis;
  }
  toString() {
    return this.originalCommand;
  }
  getPipeSegments() {
    if (this.pipePositions.length === 0) return [this.originalCommand];
    let segments = [];
    let cursor = 0;
    for (let [pipePos, pipeEnd] of this.pipePositions) {
      let segment = this.commandBytes.subarray(cursor, pipePos).toString("utf8").trim();
      if (segment) segments.push(segment);
      cursor = pipeEnd;
    }
    let lastSegment = this.commandBytes.subarray(cursor).toString("utf8").trim();
    if (lastSegment) segments.push(lastSegment);
    return segments;
  }
  withoutOutputRedirections() {
    if (this.redirectionNodes.length === 0) return this.originalCommand;
    let sorted = [...this.redirectionNodes].sort(
      (leftRedir, rightRedir) => rightRedir.startIndex - leftRedir.startIndex,
    );
    let result = this.commandBytes;
    for (let redir of sorted)
      result = Buffer.concat([result.subarray(0, redir.startIndex), result.subarray(redir.endIndex)]);
    return result
      .toString("utf8")
      .replace(/[ \t]+/g, " ")
      .replace(
        /[ \t]*\n[ \t]*/g,
        `
`,
      )
      .trim();
  }
  getOutputRedirections() {
    return this.redirectionNodes.map(({ target, operator }) => ({
      target,
      operator,
    }));
  }
}
//@ chunk-5xgkngpb.js:1050762-1050837 callgraph-witnessed (2.1.88 match: buildParsedCommandFromRoot, 0)
/**
 * 由已解析的 AST 根构建 TreeSitterParsedCommand（管道位置、重定向、analyzeCommand 结果）。
 */
function buildParsedCommandFromRoot(command, root) {
  let pipePositions = extractPipePositions(root);
  let redirectionNodes = extractRedirectionNodes(root);
  let analysis = analyzeCommand(root, command);
  return new TreeSitterParsedCommand(command, pipePositions, redirectionNodes, analysis);
}
//@ chunk-5xgkngpb.js:1050837-1050999 fingerprint (2.1.88 match: doParse, 0.655)
/**
 * 动态导入 parser 模块解析命令并构建 TreeSitterParsedCommand；失败返回 null（316 已无正则回退）。
 */
async function doParse(command) {
  if (!command) return null;
  try {
    let { parseCommand } = await import("./parser.js");
    let data = await parseCommand(command);
    if (data) return buildParsedCommandFromRoot(command, data.rootNode);
  } catch {}
  return null;
}
//@ chunk-5xgkngpb.js:1050999-1051246 file-last-pair
/**
 * ParsedCommand 的实现类：只缓存上一条命令的解析 Promise；在“关闭”上下文（$dt）中直接解析不缓存，命中缓存时若期间触发过关键字规则则调用 KPn 记录。
 */
class CachedParsedCommand {
  lastCommand;
  lastResult;
  async parse(command) {
    if (isGuardOff() || isInReExpansion()) return doParse(command);
    if (command !== this.lastCommand || this.lastResult === undefined) {
      this.lastCommand = command;
      this.lastResult = runGuarded(false, () => doParse(command));
    }
    let { result, fired } = await this.lastResult;
    if (fired) markGuardFired();
    return result;
  }
}
//@ chunk-5xgkngpb.js:1051246-1051262 callgraph-witnessed (2.1.88 match: ParsedCommand, 0)
/**
 * 全局 ParsedCommand 单例，parse(command) 返回 TreeSitterParsedCommand 或 null。
 */
var ParsedCommand; // deferred: uses CachedParsedCommand of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1051246", () => {
  ParsedCommand = new CachedParsedCommand();
});
export { ParsedCommand, buildParsedCommandFromRoot };
