/**
 * utils/agenticSessionSearch.ts
 *
 * 跨会话检索（send-to-project）：挑选干净的近期会话、截取转写摘要、汇总工具与 MCP 调用
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/agenticSessionSearch.ts
 * pieces: chunk-dz3q485w.js (3)
 * attribution: fingerprint 1, layout 1, callgraph-witnessed 1
 */
import {
  SESSION_HEAD_CHARS,
  SESSION_TAIL_CHARS,
  MAX_SESSIONS_SCANNED,
  normalizeNewlinesAndPaths,
  USER_TEXT_CHARS_PER_TURN,
  ASSISTANT_TEXT_CHARS_PER_TURN,
  emptyCallCounts,
  countMcpCallsByServer,
} from "../services/projects/toolsUsedSummary.js";
import { truncateToLength, takeLastChars } from "./stringUtils.js";
import { resolveSessionFilePath_2 } from "./sessionStoragePortable.js";
import { scanTranscriptForSuppression, loadFullLog } from "./sessionStorage.js";
import { logForDebugging } from "./debug.js";
import { errorMessage } from "./errors.js";
import { formatTranscriptForFacets } from "../commands/insights.js";
import { stripAnsiAndControls } from "./printableName.js";
import { localIsoDate } from "../services/projects/contextFile.js";
import { tagUntrustedArtifactContent } from "./messages/untrustedArtifactContent.js";

//@ chunk-dz3q485w.js:25436-25549 fingerprint = logContainsQuery (0.517)
/**
 * 会话标题：自定义标题 > AI 标题 > 摘要 > 首条提示 > "untitled session"。
 */
function getSessionDisplayTitle(log) {
  return (
    log.customTitle ??
    log.aiTitle ??
    log.summary ??
    (log.firstPrompt !== "" ? log.firstPrompt : "untitled session")
  );
}
//@ chunk-dz3q485w.js:25549-25692 layout
function elideMiddle(text) {
  if (text.length <= SESSION_HEAD_CHARS + SESSION_TAIL_CHARS) return text;
  return `${truncateToLength(text, SESSION_HEAD_CHARS).trimEnd()}
[\u2026 middle of the session omitted \u2026]
${takeLastChars(text, SESSION_TAIL_CHARS).trimStart()}`;
}
//@ chunk-dz3q485w.js:25692-26683 callgraph-witnessed = agenticSessionSearch (0.059)
/**
 * 读取最近的会话日志（只取通过检查的），生成标题/日期/分支/转写摘要列表，汇总 MCP 调用、使用过的工具与时间跨度。
 */
async function collectSessionsForProject(context, storageV5) {
  let sliced = context.sessions.logs.filter(resolveSessionFilePath_2).slice(0, MAX_SESSIONS_SCANNED);
  let results = await Promise.all(
    sliced.map((S) =>
      S.fullPath === undefined
        ? null
        : scanTranscriptForSuppression(S.fullPath, {}, storageV5).catch(() => null),
    ),
  );
  let matchingLogs = sliced.filter((S, P) => results[P] === "clean");
  let nonMatchingLogs = (
    await Promise.all(
      matchingLogs.map((log) =>
        loadFullLog(log, {
          storageV5,
        }).catch((error) => {
          logForDebugging(`send-to-project: could not load a session transcript: ${errorMessage(error)}`);
          return log;
        }),
      ),
    )
  )
    .map((log) => ({
      log,
      transcript: normalizeNewlinesAndPaths(
        elideMiddle(
          formatTranscriptForFacets(log.messages, {
            userTextChars: USER_TEXT_CHARS_PER_TURN,
            assistantTextChars: ASSISTANT_TEXT_CHARS_PER_TURN,
          }).join(`
`),
        ),
      ),
    }))
    .filter((S) => S.transcript !== "");
  let model = emptyCallCounts();
  for (let { log } of nonMatchingLogs) countMcpCallsByServer(log.messages, model);
  let sessions = nonMatchingLogs.map(({ log, transcript }) => ({
    title: truncateToLength(stripAnsiAndControls(getSessionDisplayTitle(log)).replace(/\s+/g, " "), 120),
    date: localIsoDate(log.modified),
    branch: log.gitBranch === undefined ? null : stripAnsiAndControls(log.gitBranch),
    transcript,
  }));
  let relevantLogs = nonMatchingLogs.map(({ log }) => log.modified.getTime());
  let span =
    relevantLogs.length === 0
      ? null
      : {
          oldest: new Date(Math.min(...relevantLogs)),
          newest: new Date(Math.max(...relevantLogs)),
        };
  let j = new Set();
  for (let { log } of nonMatchingLogs)
    for (let P of [
      ...(log.toolsUsed ?? []),
      ...tagUntrustedArtifactContent(log.messages, undefined, true, true),
    ])
      j.add(P);
  return {
    sessions,
    mcpCalls: model,
    toolsUsed: [...j],
    sessionsParsed: nonMatchingLogs.length,
    span,
  };
}
export { collectSessionsForProject };
