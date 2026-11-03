/**
 * utils/bash/ParsedCommand.ts
 *
 * 基于 AST 的 ParsedCommand：管道分段、去掉输出重定向、取输出重定向，单条缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/ParsedCommand.ts
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: callgraph-witnessed 3, fingerprint 4, file-last-pair 1
 */
import { analyzeCommand } from "./treeSitterAnalysis.js";
import { $dt, BIt, KPn } from "./bashParserFlags.js";

/**
 * 深度优先访问 AST 每个节点。
 */
//@ chunk-e6aww6q8.js:1053980-1054036 callgraph-witnessed = visitNodes (0)
function visitNodes(node, visitor) {
  visitor(node);
  for (let child of node.children) visitNodes(child, visitor);
}
/**
 * 收集所有 pipeline 中 | / |& 的字节区间并排序。
 */
//@ chunk-e6aww6q8.js:1054036-1054221 fingerprint = extractPipePositions (0.858)
function extractPipePositions(rootNode) {
  let pipePositions = [];
  return (
    visitNodes(rootNode, (node) => {
      if (node.type === "pipeline") {
        for (let child of node.children)
          if (child.type === "|" || child.type === "|&")
            pipePositions.push([child.startIndex, child.endIndex]);
      }
    }),
    pipePositions.sort((r, s) => r[0] - s[0])
  );
}
/**
 * 收集 > / >> 文件重定向的 {startIndex, endIndex, target, operator}。
 */
//@ chunk-e6aww6q8.js:1054221-1054484 fingerprint = extractRedirectionNodes (0.822)
function extractRedirectionNodes(rootNode) {
  let redirections = [];
  return (
    visitNodes(rootNode, (node) => {
      if (node.type === "file_redirect") {
        let children = node.children,
          opIndex = children.findIndex((w) => w.type === ">" || w.type === ">>"),
          opNode = children[opIndex],
          targetNode = opIndex >= 0 ? children[opIndex + 1] : void 0;
        if (opNode && targetNode)
          redirections.push({
            startIndex: node.startIndex,
            endIndex: targetNode.endIndex,
            target: targetNode.text,
            operator: opNode.type,
          });
      }
    }),
    redirections
  );
}
/**
 * 基于 AST 的命令对象：getPipeSegments 按管道字节位置切段，withoutOutputRedirections 按字节删除输出重定向并规整空白，getOutputRedirections 返回 {target, operator}；还携带 treeSitterAnalysis（引号上下文、复合结构、危险模式）。
 */
//@ chunk-e6aww6q8.js:1054484-1055523 fingerprint = TreeSitterParsedCommand (1)
class TreeSitterParsedCommand {
  originalCommand;
  commandBytes;
  pipePositions;
  redirectionNodes;
  treeSitterAnalysis;
  constructor(command, pipePositions, redirectionNodes, treeSitterAnalysis) {
    ((this.originalCommand = command),
      (this.commandBytes = Buffer.from(command, "utf8")),
      (this.pipePositions = pipePositions),
      (this.redirectionNodes = redirectionNodes),
      (this.treeSitterAnalysis = treeSitterAnalysis));
  }
  toString() {
    return this.originalCommand;
  }
  getPipeSegments() {
    if (this.pipePositions.length === 0) return [this.originalCommand];
    let segments = [],
      cursor = 0;
    for (let [s, h] of this.pipePositions) {
      let trimmed = this.commandBytes.subarray(cursor, s).toString("utf8").trim();
      if (trimmed) segments.push(trimmed);
      cursor = h;
    }
    let trimmed = this.commandBytes.subarray(cursor).toString("utf8").trim();
    if (trimmed) segments.push(trimmed);
    return segments;
  }
  withoutOutputRedirections() {
    if (this.redirectionNodes.length === 0) return this.originalCommand;
    let sorted = [...this.redirectionNodes].sort((r, s) => s.startIndex - r.startIndex),
      commandBytes = this.commandBytes;
    for (let r of sorted)
      commandBytes = Buffer.concat([
        commandBytes.subarray(0, r.startIndex),
        commandBytes.subarray(r.endIndex),
      ]);
    return commandBytes
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
    return this.redirectionNodes.map(({ target: target, operator: operator }) => ({
      target: target,
      operator: operator,
    }));
  }
}
/**
 * 由已解析的 AST 根构建 TreeSitterParsedCommand（管道位置、重定向、analyzeCommand 结果）。
 */
//@ chunk-e6aww6q8.js:1055523-1055598 callgraph-witnessed = buildParsedCommandFromRoot (0)
function buildParsedCommandFromRoot(command, root) {
  let pipePositions = extractPipePositions(root),
    redirectionNodes = extractRedirectionNodes(root),
    analysis = analyzeCommand(root, command);
  return new TreeSitterParsedCommand(command, pipePositions, redirectionNodes, analysis);
}
/**
 * 动态导入 parser 模块解析命令并构建 TreeSitterParsedCommand；失败返回 null（316 已无正则回退）。
 */
//@ chunk-e6aww6q8.js:1055598-1055760 fingerprint = doParse (0.655)
async function doParse(command) {
  if (!command) return null;
  try {
    let { parseCommand: parseCommand } = await import("./chunk-52jrbcze.js"),
      data = await parseCommand(command);
    if (data) return buildParsedCommandFromRoot(command, data.rootNode);
  } catch {}
  return null;
}
/**
 * ParsedCommand 的实现类：只缓存上一条命令的解析 Promise；在“关闭”上下文（$dt）中直接解析不缓存，命中缓存时若期间触发过关键字规则则调用 KPn 记录。
 */
//@ chunk-e6aww6q8.js:1055760-1056000 file-last-pair
class CachedParsedCommand {
  lastCommand;
  lastResult;
  async parse(command) {
    if ($dt()) return doParse(command);
    if (command !== this.lastCommand || this.lastResult === void 0)
      ((this.lastCommand = command), (this.lastResult = BIt(!1, () => doParse(command))));
    let { result: n, fired: fired } = await this.lastResult;
    if (fired) KPn();
    return n;
  }
}
/**
 * 全局 ParsedCommand 单例，parse(command) 返回 TreeSitterParsedCommand 或 null。
 */
//@ chunk-e6aww6q8.js:1056000-1056016 callgraph-witnessed = ParsedCommand (0)
var ParsedCommand = new CachedParsedCommand();

export { ParsedCommand, buildParsedCommandFromRoot };
