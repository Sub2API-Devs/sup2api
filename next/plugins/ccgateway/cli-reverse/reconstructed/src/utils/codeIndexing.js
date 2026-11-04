/**
 * utils/codeIndexing.ts
 *
 * 从 shell 命令或 MCP 服务器名识别代码索引工具（sourcegraph、cody、aider 等），用于统计
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/codeIndexing.ts
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: fingerprint 2, callgraph-witnessed 1
 */
import { getOwn } from "./objectSafety.js";

//@ chunk-e6aww6q8.js:4757189-4758807 fingerprint (2.1.88 match: MCP_SERVER_PATTERNS, 0.862)
/**
 * 代码索引工具识别表：CLI 命令名映射与 MCP 服务器名正则。
 */
var CLI_COMMAND_PATTERNS = {
  src: "sourcegraph",
  cody: "cody",
  aider: "aider",
  tabby: "tabby",
  tabnine: "tabnine",
  augment: "augment",
  pieces: "pieces",
  qodo: "qodo",
  aide: "aide",
  hound: "hound",
  seagoat: "seagoat",
  bloop: "bloop",
  gitloop: "gitloop",
  q: "amazon-q",
  gemini: "gemini",
};
var MCP_SERVER_PATTERNS = [
  {
    pattern: /^sourcegraph$/i,
    tool: "sourcegraph",
  },
  {
    pattern: /^cody$/i,
    tool: "cody",
  },
  {
    pattern: /^openctx$/i,
    tool: "openctx",
  },
  {
    pattern: /^aider$/i,
    tool: "aider",
  },
  {
    pattern: /^continue$/i,
    tool: "continue",
  },
  {
    pattern: /^github[-_]?copilot$/i,
    tool: "github-copilot",
  },
  {
    pattern: /^copilot$/i,
    tool: "github-copilot",
  },
  {
    pattern: /^cursor$/i,
    tool: "cursor",
  },
  {
    pattern: /^tabby$/i,
    tool: "tabby",
  },
  {
    pattern: /^codeium$/i,
    tool: "codeium",
  },
  {
    pattern: /^tabnine$/i,
    tool: "tabnine",
  },
  {
    pattern: /^augment[-_]?code$/i,
    tool: "augment",
  },
  {
    pattern: /^augment$/i,
    tool: "augment",
  },
  {
    pattern: /^windsurf$/i,
    tool: "windsurf",
  },
  {
    pattern: /^aide$/i,
    tool: "aide",
  },
  {
    pattern: /^codestory$/i,
    tool: "aide",
  },
  {
    pattern: /^pieces$/i,
    tool: "pieces",
  },
  {
    pattern: /^qodo$/i,
    tool: "qodo",
  },
  {
    pattern: /^amazon[-_]?q$/i,
    tool: "amazon-q",
  },
  {
    pattern: /^gemini[-_]?code[-_]?assist$/i,
    tool: "gemini",
  },
  {
    pattern: /^gemini$/i,
    tool: "gemini",
  },
  {
    pattern: /^hound$/i,
    tool: "hound",
  },
  {
    pattern: /^seagoat$/i,
    tool: "seagoat",
  },
  {
    pattern: /^bloop$/i,
    tool: "bloop",
  },
  {
    pattern: /^gitloop$/i,
    tool: "gitloop",
  },
  {
    pattern: /^claude[-_]?context$/i,
    tool: "claude-context",
  },
  {
    pattern: /^code[-_]?index[-_]?mcp$/i,
    tool: "code-index-mcp",
  },
  {
    pattern: /^code[-_]?index$/i,
    tool: "code-index-mcp",
  },
  {
    pattern: /^local[-_]?code[-_]?search$/i,
    tool: "local-code-search",
  },
  {
    pattern: /^codebase$/i,
    tool: "autodev-codebase",
  },
  {
    pattern: /^autodev[-_]?codebase$/i,
    tool: "autodev-codebase",
  },
  {
    pattern: /^code[-_]?context$/i,
    tool: "claude-context",
  },
];
//@ chunk-e6aww6q8.js:4758807-4758997 fingerprint (2.1.88 match: detectCodeIndexingFromCommand, 1)
/**
 * 从 shell 命令首词（npx/bunx 时取第二词）识别代码索引工具（sourcegraph/cody/aider 等）。
 */
function detectCodeIndexingFromCommand(command) {
  let trimmed = command.trim();
  let firstWord = trimmed.split(/\s+/)[0]?.toLowerCase();
  if (!firstWord) return;
  if (firstWord === "npx" || firstWord === "bunx") {
    let secondWord = trimmed.split(/\s+/)[1]?.toLowerCase();
    let pattern = secondWord && getOwn(CLI_COMMAND_PATTERNS, secondWord);
    if (pattern) return pattern;
  }
  return getOwn(CLI_COMMAND_PATTERNS, firstWord);
}
//@ chunk-e6aww6q8.js:4758997-4759074 callgraph-witnessed (2.1.88 match: detectCodeIndexingFromMcpServerName, 1)
/**
 * 从 MCP 服务器名识别代码索引工具。
 */
function detectCodeIndexingFromMcpServerName(serverName) {
  for (let { pattern, tool } of MCP_SERVER_PATTERNS) if (pattern.test(serverName)) return tool;
  return;
}
export { detectCodeIndexingFromMcpServerName, detectCodeIndexingFromCommand };
