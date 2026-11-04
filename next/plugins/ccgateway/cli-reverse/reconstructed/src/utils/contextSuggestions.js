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

//@ chunk-10q8r8ck.js:13077-13118 callgraph-witnessed (2.1.88 match: NEAR_CAPACITY_PERCENT, 0)
/**
 * 5000
 */
var LARGE_TOOL_PERCENT = 15;
var LARGE_TOOL_MIN_TOKENS = 1e4;
var READ_BLOAT_PERCENT = 5;
var NEAR_CAPACITY_PERCENT = 80;
var MEMORY_BLOAT_PERCENT = 5;
var MEMORY_BLOAT_MIN_TOKENS = 5000;
//@ chunk-10q8r8ck.js:13118-13318 fingerprint (2.1.88 match: generateContextSuggestions, 1)
/**
 * 依次运行各检查并按严重度、可节省 token 排序。
 */
function generateContextSuggestions(data) {
  let suggestions = [];
  checkNearCapacity(data, suggestions);
  checkLargeToolResults(data, suggestions);
  checkReadResultBloat(data, suggestions);
  checkMemoryBloat(data, suggestions);
  checkAutoCompactDisabled(data, suggestions);
  suggestions.sort((leftSuggestion, rightSuggestion) => {
    if (leftSuggestion.severity !== rightSuggestion.severity)
      return leftSuggestion.severity === "warning" ? -1 : 1;
    return (rightSuggestion.savingsTokens ?? 0) - (leftSuggestion.savingsTokens ?? 0);
  });
  return suggestions;
}
//@ chunk-10q8r8ck.js:13318-13749 fingerprint (2.1.88 match: checkNearCapacity, 0.824)
/**
 * 上下文 ≥80% 时给出警告（视自动压缩状态给不同说明）。
 */
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
//@ chunk-10q8r8ck.js:13749-13962 fingerprint (2.1.88 match: checkLargeToolResults, 1)
/**
 * 单个工具调用+结果 ≥15% 且 ≥1 万 token 时给出建议。
 */
function checkLargeToolResults(data, suggestions) {
  if (!data.messageBreakdown) return;
  for (let tool of data.messageBreakdown.toolCallsByType) {
    let totalToolTokens = tool.callTokens + tool.resultTokens;
    let percent = (totalToolTokens / data.rawMaxTokens) * 100;
    if (percent < LARGE_TOOL_PERCENT || totalToolTokens < LARGE_TOOL_MIN_TOKENS) continue;
    let suggestion = getLargeToolSuggestion(tool.name, totalToolTokens, percent);
    if (suggestion) suggestions.push(suggestion);
  }
}
//@ chunk-10q8r8ck.js:13962-15404 fingerprint (2.1.88 match: getLargeToolSuggestion, 0.918)
/**
 * 针对 Bash/PowerShell/Read/Grep/WebFetch/其他工具的具体建议文案与可节省估算。
 */
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
//@ chunk-10q8r8ck.js:15404-15925 fingerprint (2.1.88 match: checkReadResultBloat, 1)
/**
 * Read 结果 ≥5% 且 ≥1 万 token（且未被大工具规则覆盖）时建议引用早先读取或分段读。
 */
function checkReadResultBloat(data, suggestions) {
  if (!data.messageBreakdown) return;
  let readTool = data.messageBreakdown.toolCallsByType.find((t) => t.name === FILE_READ_TOOL_NAME);
  if (!readTool) return;
  let totalReadTokens = readTool.callTokens + readTool.resultTokens;
  let totalReadPercent = (totalReadTokens / data.rawMaxTokens) * 100;
  let readPercent = (readTool.resultTokens / data.rawMaxTokens) * 100;
  if (totalReadPercent >= LARGE_TOOL_PERCENT && totalReadTokens >= LARGE_TOOL_MIN_TOKENS) return;
  if (readPercent >= READ_BLOAT_PERCENT && readTool.resultTokens >= LARGE_TOOL_MIN_TOKENS)
    suggestions.push({
      severity: "info",
      title: `File reads using ${formatTokens(readTool.resultTokens)} tokens (${readPercent.toFixed(0)}%)`,
      detail:
        "If you are re-reading files, consider referencing earlier reads. Use offset/limit for large files.",
      savingsTokens: Math.floor(readTool.resultTokens * 0.3),
    });
}
//@ chunk-10q8r8ck.js:15925-16344 fingerprint (2.1.88 match: checkMemoryBloat, 1)
/**
 * 记忆文件 ≥5% 且 ≥5000 token 时列出最大的三个并建议 /memory 清理。
 */
function checkMemoryBloat(data, suggestions) {
  let totalMemoryTokens = data.memoryFiles.reduce((sum, memoryFile) => sum + memoryFile.tokens, 0);
  let memoryPercent = (totalMemoryTokens / data.rawMaxTokens) * 100;
  if (memoryPercent >= MEMORY_BLOAT_PERCENT && totalMemoryTokens >= MEMORY_BLOAT_MIN_TOKENS) {
    let largestFiles = [...data.memoryFiles]
      .sort((leftFile, rightFile) => rightFile.tokens - leftFile.tokens)
      .slice(0, 3)
      .map((memoryFile) => `${getDisplayPath(memoryFile.path)} (${formatTokens(memoryFile.tokens)})`)
      .join(", ");
    suggestions.push({
      severity: "info",
      title: `Memory files using ${formatTokens(totalMemoryTokens)} tokens (${memoryPercent.toFixed(0)}%)`,
      detail: `Largest: ${largestFiles}. Use /memory to review and prune stale entries.`,
      savingsTokens: Math.floor(totalMemoryTokens * 0.3),
    });
  }
}
//@ chunk-10q8r8ck.js:16344-16647 fingerprint (2.1.88 match: checkAutoCompactDisabled, 0.946)
/**
 * 自动压缩关闭且上下文 50–80% 时提示开启。
 */
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
