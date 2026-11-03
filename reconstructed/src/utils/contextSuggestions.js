/**
 * utils/contextSuggestions.ts
 *
 * /context 的优化建议：上下文将满、大工具结果、Read 结果膨胀、记忆文件过大、自动压缩被关闭。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/contextSuggestions.ts
 * pieces: chunk-10q8r8ck.js (8)
 * attribution: callgraph-witnessed 1, fingerprint 7
 */
import { isEnvTruthy } from "./envUtils.js";
import { formatTokens } from "./format.js";
import { BASH_TOOL_NAME } from "../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../tools/GrepTool/prompt.js";
import { WEBFETCH } from "../tools/WebFetchTool/prompt.js";
import { getDisplayPath } from "./file.js";

/**
 * 5000
 */
//@ chunk-10q8r8ck.js:13077-13118 callgraph-witnessed = NEAR_CAPACITY_PERCENT (0)
var LARGE_TOOL_PERCENT = 15,
  LARGE_TOOL_MIN_TOKENS = 1e4,
  READ_BLOAT_PERCENT = 5,
  NEAR_CAPACITY_PERCENT = 80,
  MEMORY_BLOAT_PERCENT = 5,
  MEMORY_BLOAT_MIN_TOKENS = 5000;
/**
 * 依次运行各检查并按严重度、可节省 token 排序。
 */
//@ chunk-10q8r8ck.js:13118-13318 fingerprint = generateContextSuggestions (1)
function generateContextSuggestions(data) {
  let suggestions = [];
  return (
    checkNearCapacity(data, suggestions),
    checkLargeToolResults(data, suggestions),
    checkReadResultBloat(data, suggestions),
    checkMemoryBloat(data, suggestions),
    checkAutoCompactDisabled(data, suggestions),
    suggestions.sort((m, i) => {
      if (m.severity !== i.severity) return m.severity === "warning" ? -1 : 1;
      return (i.savingsTokens ?? 0) - (m.savingsTokens ?? 0);
    }),
    suggestions
  );
}
/**
 * 上下文 ≥80% 时给出警告（视自动压缩状态给不同说明）。
 */
//@ chunk-10q8r8ck.js:13318-13749 fingerprint = checkNearCapacity (0.824)
function checkNearCapacity(data, suggestions) {
  if (data.totalTokens > data.rawMaxTokens) return;
  if (data.percentage >= NEAR_CAPACITY_PERCENT)
    suggestions.push({
      severity: "warning",
      title: `Context is ${data.percentage}% full`,
      detail: data.isAutoCompactEnabled
        ? "Autocompact will trigger soon, which discards older messages. Use /compact now to control what gets kept."
        : isEnvTruthy(process.env.DISABLE_COMPACT)
          ? "Compaction is disabled."
          : "Autocompact is disabled. Use /compact to free space, or enable autocompact in /config.",
    });
}
/**
 * 单个工具调用+结果 ≥15% 且 ≥1 万 token 时给出建议。
 */
//@ chunk-10q8r8ck.js:13749-13962 fingerprint = checkLargeToolResults (1)
function checkLargeToolResults(data, suggestions) {
  if (!data.messageBreakdown) return;
  for (let tool of data.messageBreakdown.toolCallsByType) {
    let i = tool.callTokens + tool.resultTokens,
      l = (i / data.rawMaxTokens) * 100;
    if (l < LARGE_TOOL_PERCENT || i < LARGE_TOOL_MIN_TOKENS) continue;
    let suggestion = getLargeToolSuggestion(tool.name, i, l);
    if (suggestion) suggestions.push(suggestion);
  }
}
/**
 * 针对 Bash/PowerShell/Read/Grep/WebFetch/其他工具的具体建议文案与可节省估算。
 */
//@ chunk-10q8r8ck.js:13962-15404 fingerprint = getLargeToolSuggestion (0.918)
function getLargeToolSuggestion(toolName, tokens, percent) {
  let tokenStr = formatTokens(tokens);
  switch (toolName) {
    case BASH_TOOL_NAME:
    case POWERSHELL_TOOL_NAME:
      return {
        severity: "warning",
        title: `${toolName} results using ${tokenStr} tokens (${percent.toFixed(0)}%)`,
        detail:
          toolName === POWERSHELL_TOOL_NAME
            ? "Pipe output through Select-Object -First/-Last or Select-String to reduce result size. Avoid Get-Content on large files \u2014 use Read with offset/limit instead."
            : "Pipe output through head, tail, or grep to reduce result size. Avoid cat on large files \u2014 use Read with offset/limit instead.",
        savingsTokens: Math.floor(tokens * 0.5),
      };
    case FILE_READ_TOOL_NAME:
      return {
        severity: "info",
        title: `Read results using ${tokenStr} tokens (${percent.toFixed(0)}%)`,
        detail:
          "Use offset and limit parameters to read only the sections you need. Avoid re-reading entire files when you only need a few lines.",
        savingsTokens: Math.floor(tokens * 0.3),
      };
    case GREP_TOOL_NAME:
      return {
        severity: "info",
        title: `Grep results using ${tokenStr} tokens (${percent.toFixed(0)}%)`,
        detail:
          "Add more specific patterns or use the glob or type parameter to narrow file types. Consider Glob for file discovery instead of Grep.",
        savingsTokens: Math.floor(tokens * 0.3),
      };
    case WEBFETCH:
      return {
        severity: "info",
        title: `WebFetch results using ${tokenStr} tokens (${percent.toFixed(0)}%)`,
        detail:
          "Web page content can be very large. Consider extracting only the specific information needed.",
        savingsTokens: Math.floor(tokens * 0.4),
      };
    default:
      if (percent >= 20)
        return {
          severity: "info",
          title: `${toolName} using ${tokenStr} tokens (${percent.toFixed(0)}%)`,
          detail: "This tool is consuming a significant portion of context.",
          savingsTokens: Math.floor(tokens * 0.2),
        };
      return null;
  }
}
/**
 * Read 结果 ≥5% 且 ≥1 万 token（且未被大工具规则覆盖）时建议引用早先读取或分段读。
 */
//@ chunk-10q8r8ck.js:15404-15925 fingerprint = checkReadResultBloat (1)
function checkReadResultBloat(data, suggestions) {
  if (!data.messageBreakdown) return;
  let readTool = data.messageBreakdown.toolCallsByType.find((x) => x.name === FILE_READ_TOOL_NAME);
  if (!readTool) return;
  let l = readTool.callTokens + readTool.resultTokens,
    u = (l / data.rawMaxTokens) * 100,
    c = (readTool.resultTokens / data.rawMaxTokens) * 100;
  if (u >= LARGE_TOOL_PERCENT && l >= LARGE_TOOL_MIN_TOKENS) return;
  if (c >= READ_BLOAT_PERCENT && readTool.resultTokens >= LARGE_TOOL_MIN_TOKENS)
    suggestions.push({
      severity: "info",
      title: `File reads using ${formatTokens(readTool.resultTokens)} tokens (${c.toFixed(0)}%)`,
      detail:
        "If you are re-reading files, consider referencing earlier reads. Use offset/limit for large files.",
      savingsTokens: Math.floor(readTool.resultTokens * 0.3),
    });
}
/**
 * 记忆文件 ≥5% 且 ≥5000 token 时列出最大的三个并建议 /memory 清理。
 */
//@ chunk-10q8r8ck.js:15925-16344 fingerprint = checkMemoryBloat (1)
function checkMemoryBloat(data, suggestions) {
  let totalMemoryTokens = data.memoryFiles.reduce((sum, u) => sum + u.tokens, 0),
    memoryPercent = (totalMemoryTokens / data.rawMaxTokens) * 100;
  if (memoryPercent >= MEMORY_BLOAT_PERCENT && totalMemoryTokens >= MEMORY_BLOAT_MIN_TOKENS) {
    let largestFiles = [...data.memoryFiles]
      .sort((u, c) => c.tokens - u.tokens)
      .slice(0, 3)
      .map((u) => `${getDisplayPath(u.path)} (${formatTokens(u.tokens)})`)
      .join(", ");
    suggestions.push({
      severity: "info",
      title: `Memory files using ${formatTokens(totalMemoryTokens)} tokens (${memoryPercent.toFixed(0)}%)`,
      detail: `Largest: ${largestFiles}. Use /memory to review and prune stale entries.`,
      savingsTokens: Math.floor(totalMemoryTokens * 0.3),
    });
  }
}
/**
 * 自动压缩关闭且上下文 50–80% 时提示开启。
 */
//@ chunk-10q8r8ck.js:16344-16647 fingerprint = checkAutoCompactDisabled (0.946)
function checkAutoCompactDisabled(data, suggestions) {
  if (
    !data.isAutoCompactEnabled &&
    !isEnvTruthy(process.env.DISABLE_COMPACT) &&
    data.percentage >= 50 &&
    data.percentage < NEAR_CAPACITY_PERCENT
  )
    suggestions.push({
      severity: "info",
      title: "Autocompact is disabled",
      detail:
        "Without autocompact, you will hit context limits and lose the conversation. Enable it in /config or use /compact manually.",
    });
}

export { generateContextSuggestions };
