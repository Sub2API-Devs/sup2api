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
import { stripMemoryTags } from "./orgMemory/promptIndex.js";

//@ chunk-7jj28n8t.js:600-769 placement
/**
 * 判断离开摘要功能是否开启：环境变量 CLAUDE_CODE_ENABLE_AWAY_SUMMARY 优先，非交互会话关闭，设置 awaySummaryEnabled 为 false 时关闭。
 */
function isAwaySummaryEnabled() {
  let envClaudeCodeEnableAwaySummary = process.env.CLAUDE_CODE_ENABLE_AWAY_SUMMARY;
  if (isEnvDefinedFalsy(envClaudeCodeEnableAwaySummary)) return false;
  if (isEnvTruthy(envClaudeCodeEnableAwaySummary)) return true;
  if (getIsNonInteractiveSession()) return false;
  if (getInitialSettings_2()?.awaySummaryEnabled === false) return false;
  return true;
}
//@ chunk-7jj28n8t.js:769-878 placement
function isRemoteRecapEnabled() {
  let CLAUDE_CODE_ENABLE_REMOTE_RECAP = env.CLAUDE_CODE_ENABLE_REMOTE_RECAP;
  if (CLAUDE_CODE_ENABLE_REMOTE_RECAP !== undefined) return CLAUDE_CODE_ENABLE_REMOTE_RECAP;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_harbor_moth", false);
}
//@ chunk-7jj28n8t.js:878-1016 placement
/**
 * 远程（CCR）会话回合结束时启动一次离开摘要生成（非后台会话、存在 CCR 界面且 CLAUDE_CODE_ENABLE_REMOTE_RECAP / tengu_harbor_moth 开启，每个回合只启动一次）。
 */
function maybeStartCcrRecap(ccrRecap, sessionState) {
  if (!sessionState.onMetadataChanged) return;
  if (isBgSession() || !hasCcrSurface() || !isRemoteRecapEnabled()) return;
  if (ccrRecap.startedForTurnEnd) return;
  ccrRecap.startedForTurnEnd = true;
  generateCcrRecap(ccrRecap, sessionState);
}
//@ chunk-7jj28n8t.js:1016-1055 placement
/**
 * 标记本回合已启动过 recap（避免同一回合重复生成）。
 */
function markRecapStartedForTurnEnd(ccrRecap) {
  ccrRecap.startedForTurnEnd = true;
}
//@ chunk-7jj28n8t.js:1055-1094 placement
/**
 * 清除“本回合已启动 recap”标记。
 */
function clearRecapStartedForTurnEnd(ccrRecap) {
  ccrRecap.startedForTurnEnd = false;
}
//@ chunk-7jj28n8t.js:1094-1120 placement
/**
 * 重置 recap 状态（清空在途生成与标记）。
 */
function resetRecapState(ccrRecap) {
  ccrRecap.reset();
}
//@ chunk-7jj28n8t.js:1120-1545 placement
/**
 * 生成离开摘要并作为 recap 元数据推送：中止上一次生成；若新回合已开始则丢弃；记 ccr_recap_generate 埋点。
 */
async function generateCcrRecap(state, session) {
  state.inFlight?.abort();
  let abortController = new AbortController();
  state.inFlight = abortController;
  let awaySummary = await generateAwaySummary(abortController.signal);
  if (abortController.signal.aborted) return;
  if (awaySummary.kind !== "ok") {
    if (awaySummary.kind !== "no-turn") logFeatureBad("ccr_recap_generate", awaySummary.kind);
    return;
  }
  if (session.getState() === "running") {
    logForDebugging("[awaySummary] ccr recap dropped: new turn already running");
    return;
  }
  session.notifyMetadataChanged({
    recap: awaySummary.text,
  });
  if (awaySummary.capped) logFeatureSad("ccr_recap_generate", "capped");
  else logFeatureOk("ccr_recap_generate");
}
//@ chunk-7jj28n8t.js:1545-1813 placement
var AWAY_SUMMARY_PROMPT =
  "The user stepped away and is coming back. Recap in under 40 words, 1-2 plain sentences, no markdown. Lead with the overall goal and current task, then the one next action. Skip root-cause narrative, fix internals, secondary to-dos, and em-dash tangents.";
var AWAY_SUMMARY_MAX_CHARS = 400;
//@ chunk-7jj28n8t.js:1813-2968 placement
/**
 * 生成离开摘要（40 词内），无缓存参数时重建，失败记录。
 */
async function generateAwaySummary(signal, rebuildParams) {
  let lastCacheSafeParams = getLastCacheSafeParams();
  if (!lastCacheSafeParams && rebuildParams) {
    if (signal.aborted)
      return {
        kind: "aborted",
      };
    try {
      lastCacheSafeParams = await rebuildParams();
    } catch (error) {
      logForDebugging(`[awaySummary] fallback params rebuild failed: ${error}`);
      return {
        kind: "failed",
      };
    }
    if (signal.aborted)
      return {
        kind: "aborted",
      };
  }
  if (!lastCacheSafeParams) {
    logForDebugging("[awaySummary] no CacheSafeParams saved, skipping");
    return {
      kind: "no-turn",
    };
  }
  let abortController = new AbortController();
  signal.addEventListener("abort", () => abortController.abort(), {
    once: true,
  });
  try {
    let { messages } = await runForkedAgent({
      promptMessages: [
        createUserMessage({
          content: AWAY_SUMMARY_PROMPT,
        }),
      ],
      cacheSafeParams: lastCacheSafeParams,
      overrides: {
        abortController,
      },
      canUseTool: async () => ({
        behavior: "deny",
        message: "Away summary cannot use tools",
        decisionReason: {
          type: "other",
          reason: "away_summary",
        },
      }),
      querySource: "away_summary",
      forkLabel: "away_summary",
      maxTurns: 1,
      skipCacheWrite: true,
      skipTranscript: true,
    });
    if (signal.aborted)
      return {
        kind: "aborted",
      };
    let found = messages.find((message) => message.type === "assistant" && message.isApiErrorMessage);
    if (found)
      return {
        kind: "api-error",
        text: assistantText([found], true),
      };
    let summaryText = assistantText(messages, false);
    let wasCapped = summaryText.length > AWAY_SUMMARY_MAX_CHARS;
    if (wasCapped) {
      let shortened = truncateAtWord(summaryText, AWAY_SUMMARY_MAX_CHARS);
      logForDebugging(`[awaySummary] recap capped from ${summaryText.length} to ${shortened.length} chars`);
      summaryText = shortened;
    }
    return summaryText
      ? {
          kind: "ok",
          text: summaryText,
          capped: wasCapped,
        }
      : {
          kind: "failed",
        };
  } catch (error) {
    if (signal.aborted)
      return {
        kind: "aborted",
      };
    logForDebugging(`[awaySummary] generation failed: ${error}`);
    return {
      kind: "failed",
    };
  }
}
//@ chunk-7jj28n8t.js:2968-3158 placement
function assistantText(messages, includeApiErrors) {
  return stripMemoryTags(
    messages
      .flatMap((message) =>
        message.type === "assistant" && (includeApiErrors || !message.isApiErrorMessage)
          ? message.message.content
          : [],
      )
      .filter((block) => block.type === "text")
      .map((block) => ("text" in block ? block.text : ""))
      .join(""),
  ).trim();
}
export {
  isAwaySummaryEnabled,
  maybeStartCcrRecap,
  resetRecapState,
  markRecapStartedForTurnEnd,
  clearRecapStartedForTurnEnd,
  generateAwaySummary,
};
