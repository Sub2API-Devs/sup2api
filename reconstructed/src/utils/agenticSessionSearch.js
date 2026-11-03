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
import { en, tn, Qo, ln, es, ts, Te, countMcpCallsByServer } from "../services/projects/toolsUsedSummary.js";
import { truncateToLength, takeLastChars } from "./stringUtils.js";
import { resolveSessionFilePath_2 } from "./sessionStoragePortable.js";
import { scanTranscriptForSuppression, loadFullLog } from "./sessionStorage.js";
import { logForDebugging } from "./debug.js";
import { errorMessage } from "./errors.js";
import { formatTranscriptForFacets } from "../commands/insights.js";
import { stripAnsiAndControls } from "./printableName.js";
import { localIsoDate } from "../services/projects/contextFile.js";
import { tagUntrustedArtifactContent } from "./messages/untrustedArtifactContent.js";

/**
 * 会话标题：自定义标题 > AI 标题 > 摘要 > 首条提示 > "untitled session"。
 */
//@ chunk-dz3q485w.js:25436-25549 fingerprint = logContainsQuery (0.517)
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
  if (text.length <= en + tn) return text;
  return `${truncateToLength(text, en).trimEnd()}
[\u2026 middle of the session omitted \u2026]
${takeLastChars(text, tn).trimStart()}`;
}
/**
 * 读取最近的会话日志（只取通过检查的），生成标题/日期/分支/转写摘要列表，汇总 MCP 调用、使用过的工具与时间跨度。
 */
//@ chunk-dz3q485w.js:25692-26683 callgraph-witnessed = agenticSessionSearch (0.059)
async function collectSessionsForProject(context, storageV5) {
  let sliced = context.sessions.logs.filter(resolveSessionFilePath_2).slice(0, Qo),
    results = await Promise.all(
      sliced.map((S) =>
        S.fullPath === void 0
          ? null
          : scanTranscriptForSuppression(S.fullPath, {}, storageV5).catch(() => null),
      ),
    ),
    matchingLogs = sliced.filter((S, P) => results[P] === "clean"),
    nonMatchingLogs = (
      await Promise.all(
        matchingLogs.map((log) =>
          loadFullLog(log, { storageV5: storageV5 }).catch(
            (P) => (
              logForDebugging(`send-to-project: could not load a session transcript: ${errorMessage(P)}`),
              log
            ),
          ),
        ),
      )
    )
      .map((log) => ({
        log: log,
        transcript: ln(
          elideMiddle(
            formatTranscriptForFacets(log.messages, { userTextChars: es, assistantTextChars: ts }).join(`
`),
          ),
        ),
      }))
      .filter((S) => S.transcript !== ""),
    model = Te();
  for (let { log: log } of nonMatchingLogs) countMcpCallsByServer(log.messages, model);
  let mapped = nonMatchingLogs.map(({ log: log, transcript: transcript }) => ({
      title: truncateToLength(stripAnsiAndControls(getSessionDisplayTitle(log)).replace(/\s+/g, " "), 120),
      date: localIsoDate(log.modified),
      branch: log.gitBranch === void 0 ? null : stripAnsiAndControls(log.gitBranch),
      transcript: transcript,
    })),
    relevantLogs = nonMatchingLogs.map(({ log: log }) => log.modified.getTime()),
    y =
      relevantLogs.length === 0
        ? null
        : { oldest: new Date(Math.min(...relevantLogs)), newest: new Date(Math.max(...relevantLogs)) },
    j = new Set();
  for (let { log: log } of nonMatchingLogs)
    for (let P of [...(log.toolsUsed ?? []), ...tagUntrustedArtifactContent(log.messages, void 0, !0, !0)])
      j.add(P);
  return {
    sessions: mapped,
    mcpCalls: model,
    toolsUsed: [...j],
    sessionsParsed: nonMatchingLogs.length,
    span: y,
  };
}

export { collectSessionsForProject };
