/**
 * services/awaySummary.ts
 *
 * 316 中此路径实际是 Artifact 评论自动回复的“快速确认”句生成（小模型、96 tokens、≤400 字符），不是旧版的离开摘要。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/awaySummary.ts
 * pieces: chunk-7jj28n8t.js (10)
 * attribution: placement 10
 */
import { isEnvDefinedFalsy, isEnvTruthy } from "../utils/envUtils.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { getInitialSettings_2 } from "../utils/settings/settings.js";
import { env } from "../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { hasCcrSurface } from "./classifierSummary.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "./analytics/featureTelemetry.js";
import { logForDebugging } from "../utils/debug.js";
import { getLastCacheSafeParams, runForkedAgent } from "../utils/forkedAgent.js";
import { createUserMessage } from "../utils/messages.js";
import { truncateAtWord } from "../utils/stringUtils.js";
import { Cb } from "./orgMemory/promptIndex.js";

/**
 * 判断离开摘要功能是否开启：环境变量 CLAUDE_CODE_ENABLE_AWAY_SUMMARY 优先，非交互会话关闭，设置 awaySummaryEnabled 为 false 时关闭。
 */
//@ chunk-7jj28n8t.js:600-769 placement
function isAwaySummaryEnabled() {
  let envClaudeCodeEnableAwaySummary = process.env.CLAUDE_CODE_ENABLE_AWAY_SUMMARY;
  if (isEnvDefinedFalsy(envClaudeCodeEnableAwaySummary)) return !1;
  if (isEnvTruthy(envClaudeCodeEnableAwaySummary)) return !0;
  if (getIsNonInteractiveSession()) return !1;
  if (getInitialSettings_2()?.awaySummaryEnabled === !1) return !1;
  return !0;
}
//@ chunk-7jj28n8t.js:769-878 placement
function isRemoteRecapEnabled() {
  let CLAUDE_CODE_ENABLE_REMOTE_RECAP = env.CLAUDE_CODE_ENABLE_REMOTE_RECAP;
  if (CLAUDE_CODE_ENABLE_REMOTE_RECAP !== void 0) return CLAUDE_CODE_ENABLE_REMOTE_RECAP;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_moth", !1);
}
/**
 * 远程（CCR）会话回合结束时启动一次离开摘要生成（非后台会话、存在 CCR 界面且 CLAUDE_CODE_ENABLE_REMOTE_RECAP / tengu_harbor_moth 开启，每个回合只启动一次）。
 */
//@ chunk-7jj28n8t.js:878-1016 placement
function maybeStartCcrRecap(e, a) {
  if (!a.onMetadataChanged) return;
  if (isBgSession() || !hasCcrSurface() || !isRemoteRecapEnabled()) return;
  if (e.startedForTurnEnd) return;
  ((e.startedForTurnEnd = !0), generateCcrRecap(e, a));
}
//@ chunk-7jj28n8t.js:1016-1055 placement
function rFs(e) {
  e.startedForTurnEnd = !0;
}
//@ chunk-7jj28n8t.js:1055-1094 placement
function oFs(e) {
  e.startedForTurnEnd = !1;
}
//@ chunk-7jj28n8t.js:1094-1120 placement
function aCo(e) {
  e.reset();
}
/**
 * 生成离开摘要并作为 recap 元数据推送：中止上一次生成；若新回合已开始则丢弃；记 ccr_recap_generate 埋点。
 */
//@ chunk-7jj28n8t.js:1120-1545 placement
async function generateCcrRecap(e, a) {
  e.inFlight?.abort();
  let abortController = new AbortController();
  e.inFlight = abortController;
  let n = await generateAwaySummary(abortController.signal);
  if (abortController.signal.aborted) return;
  if (n.kind !== "ok") {
    if (n.kind !== "no-turn") logFeatureBad("ccr_recap_generate", n.kind);
    return;
  }
  if (a.getState() === "running") {
    logForDebugging("[awaySummary] ccr recap dropped: new turn already running");
    return;
  }
  if ((a.notifyMetadataChanged({ recap: n.text }), n.capped)) logFeatureSad("ccr_recap_generate", "capped");
  else logFeatureOk("ccr_recap_generate");
}
//@ chunk-7jj28n8t.js:1545-1813 placement
var AWAY_SUMMARY_PROMPT =
    "The user stepped away and is coming back. Recap in under 40 words, 1-2 plain sentences, no markdown. Lead with the overall goal and current task, then the one next action. Skip root-cause narrative, fix internals, secondary to-dos, and em-dash tangents.",
  AWAY_SUMMARY_MAX_CHARS = 400;
/**
 * 生成离开摘要（40 词内），无缓存参数时重建，失败记录。
 */
//@ chunk-7jj28n8t.js:1813-2968 placement
async function generateAwaySummary(e, a) {
  let r = getLastCacheSafeParams();
  if (!r && a) {
    if (e.aborted) return { kind: "aborted" };
    try {
      r = await a();
    } catch (error) {
      return (logForDebugging(`[awaySummary] fallback params rebuild failed: ${error}`), { kind: "failed" });
    }
    if (e.aborted) return { kind: "aborted" };
  }
  if (!r) return (logForDebugging("[awaySummary] no CacheSafeParams saved, skipping"), { kind: "no-turn" });
  let abortController = new AbortController();
  e.addEventListener("abort", () => abortController.abort(), { once: !0 });
  try {
    let { messages: messages } = await runForkedAgent({
      promptMessages: [createUserMessage({ content: AWAY_SUMMARY_PROMPT })],
      cacheSafeParams: r,
      overrides: { abortController: abortController },
      canUseTool: async () => ({
        behavior: "deny",
        message: "Away summary cannot use tools",
        decisionReason: { type: "other", reason: "away_summary" },
      }),
      querySource: "away_summary",
      forkLabel: "away_summary",
      maxTurns: 1,
      skipCacheWrite: !0,
      skipTranscript: !0,
    });
    if (e.aborted) return { kind: "aborted" };
    let found = messages.find((c) => c.type === "assistant" && c.isApiErrorMessage);
    if (found) return { kind: "api-error", text: assistantText([found], !0) };
    let s = assistantText(messages, !1),
      d = s.length > AWAY_SUMMARY_MAX_CHARS;
    if (d) {
      let c = truncateAtWord(s, AWAY_SUMMARY_MAX_CHARS);
      (logForDebugging(`[awaySummary] recap capped from ${s.length} to ${c.length} chars`), (s = c));
    }
    return s ? { kind: "ok", text: s, capped: d } : { kind: "failed" };
  } catch (error) {
    if (e.aborted) return { kind: "aborted" };
    return (logForDebugging(`[awaySummary] generation failed: ${error}`), { kind: "failed" });
  }
}
//@ chunk-7jj28n8t.js:2968-3158 placement
function assistantText(e, a) {
  return Cb(
    e
      .flatMap((r) => (r.type === "assistant" && (a || !r.isApiErrorMessage) ? r.message.content : []))
      .filter((r) => r.type === "text")
      .map((r) => ("text" in r ? r.text : ""))
      .join(""),
  ).trim();
}

export { isAwaySummaryEnabled, maybeStartCcrRecap, aCo, rFs, oFs, generateAwaySummary };
