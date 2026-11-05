/**
 * services/PromptSuggestion/promptSuggestion.ts
 *
 * 提示建议（预测用户下一句）：开关判定、抑制原因（模式、限额、缓存冷）、fork 生成、结果过滤与遥测。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/PromptSuggestion/promptSuggestion.ts
 * pieces: chunk-rypxzpmd.js (19)
 * attribution: placement 6, fingerprint 8, layout 5
 */
import { env } from "../../utils/env.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { isTeammate } from "../../utils/teammate.js";
import { getInitialSettings } from "../../utils/settings/settings.js";
import { getCurrentLimits } from "../claudeAiLimits.js";
import { hasKnownPlanTier } from "../../utils/planTiers.js";
import { countWhere } from "../../utils/collections.js";
import { getLastAssistantMessage, createUserMessage } from "../../utils/messages.js";
import { isSuggestionBackOffActive, BACK_OFF_TURN_INTERVAL, isSuggestionOwnedByPlugin } from "./backOff.js";
import { generatePipelinedSuggestion } from "./speculation.js";
import { getTerminalFocus } from "../../ink/terminal-focus-state.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { createCacheSafeParams, runForkedAgent } from "../../utils/forkedAgent.js";
import { isMainAgent } from "../../utils/agentContext.js";
import { promptSuggestOp, proposeSuggestion } from "../../plugins/functionHooks/promptSuggestHooks.js";
import {
  logJobWriteError,
  getJobDir,
  getOwnJobShortId,
  invalidateJobStateCache,
  readJobState,
  writeStateAtomic,
} from "../daemon/jobState.js";
import { logFeatureBad } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { redactSecrets } from "../teamMemorySync/secretScanner.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";

//@ chunk-rypxzpmd.js:956-1142 placement
var HAN_RE = /\p{Script=Han}/u;
var PHONETIC_SCRIPT_RE =
  /[\p{Script=Hiragana}\p{Script=Katakana}\u30fc\uff70\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;
var HANGUL_RE = /\p{Script=Hangul}/u;
var LETTER_OR_DIGIT_RE = /[\p{L}\p{N}]/u;
//@ chunk-rypxzpmd.js:1142-1205 placement
function countCjkChars(text) {
  let { han, phonetic, hangul } = countScriptChars(text);
  return han + phonetic + hangul;
}
//@ chunk-rypxzpmd.js:1205-1392 placement
function countWordsMultilingual(suggestion) {
  let trimmed = suggestion.trim();
  if (trimmed === "") return 0;
  let wordCount = 0;
  for (let word of trimmed.split(/\s+/)) {
    let { han, phonetic, hangul, other } = countScriptChars(word);
    wordCount += han === 0 && phonetic === 0 ? 1 : (other + hangul > 0 ? 1 : 0) + han / 2 + phonetic / 4;
  }
  return Math.ceil(wordCount);
}
//@ chunk-rypxzpmd.js:1392-1566 placement
function countScriptChars(text) {
  let hanCount = 0;
  let phoneticCount = 0;
  let hangulCount = 0;
  let otherCount = 0;
  for (let char of text)
    if (HAN_RE.test(char)) hanCount++;
    else if (PHONETIC_SCRIPT_RE.test(char)) phoneticCount++;
    else if (HANGUL_RE.test(char)) hangulCount++;
    else if (LETTER_OR_DIGIT_RE.test(char)) otherCount++;
  return {
    han: hanCount,
    phonetic: phoneticCount,
    hangul: hangulCount,
    other: otherCount,
  };
}
//@ chunk-rypxzpmd.js:1566-1631 placement
/**
 * 提示建议状态是否为已展示（shown）或已接受（accepted）。
 */
function isShownOrAcceptedSuggestion(promptSuggestion) {
  return promptSuggestion.status === "shown" || promptSuggestion.status === "accepted";
}
//@ chunk-rypxzpmd.js:1631-1685 placement
/**
 * 提示建议的展示文本：状态为 empty 时返回 null，否则返回 text。
 */
function suggestionTextOrNull(suggestion) {
  return suggestion.status === "empty" ? null : suggestion.text;
}
//@ chunk-rypxzpmd.js:1685-2333 fingerprint (2.1.88 match: shouldEnablePromptSuggestion, 1)
/**
 * 是否启用提示建议：CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION 优先；否则需 tengu_chomp_inflection、交互会话、非 swarm 队员、设置 promptSuggestionEnabled 不为 false。记 tengu_prompt_suggestion_init。
 */
function shouldEnablePromptSuggestion() {
  let envOverride = env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION;
  if (envOverride === false) {
    logEvent("tengu_prompt_suggestion_init", {
      enabled: false,
      source: lit("env"),
    });
    return false;
  }
  if (envOverride === true) {
    logEvent("tengu_prompt_suggestion_init", {
      enabled: true,
      source: lit("env"),
    });
    return true;
  }
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_chomp_inflection", false)) {
    logEvent("tengu_prompt_suggestion_init", {
      enabled: false,
      source: lit("growthbook"),
    });
    return false;
  }
  if (getIsNonInteractiveSession()) {
    logEvent("tengu_prompt_suggestion_init", {
      enabled: false,
      source: lit("non_interactive"),
    });
    return false;
  }
  if (isAgentSwarmsEnabled() && isTeammate()) {
    logEvent("tengu_prompt_suggestion_init", {
      enabled: false,
      source: lit("swarm_teammate"),
    });
    return false;
  }
  let enabled = getInitialSettings()?.promptSuggestionEnabled !== false;
  logEvent("tengu_prompt_suggestion_init", {
    enabled,
    source: lit("setting"),
  });
  return enabled;
}
//@ chunk-rypxzpmd.js:2333-2458 layout
/**
 * 只看 env 与设置的启用判断（不记遥测）。
 */
function isPromptSuggestionSettingEnabled() {
  let CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION = env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION;
  if (CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION !== undefined) return CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION;
  return getInitialSettings()?.promptSuggestionEnabled !== false;
}
//@ chunk-rypxzpmd.js:2458-2985 fingerprint (2.1.88 match: getSuggestionSuppressReason, 0.674)
/**
 * 应用状态层面的抑制原因：disabled、pending_permission、elicitation_active、plan_mode、rate_limit、usage_credits。
 */
function getSuggestionSuppressReason(appState, billedToUsageCredits) {
  if (!appState.promptSuggestionEnabled) return "disabled";
  if (appState.pendingWorkerRequest || appState.pendingSandboxRequest) return "pending_permission";
  if (
    appState.mcp.clients.some(
      (client) => client.type === "connected" && (client.transportErrorState?.pendingElicitations ?? 0) > 0,
    )
  )
    return "elicitation_active";
  if (appState.toolPermissionContext.mode === "plan") return "plan_mode";
  {
    let { status, overageInUse } = getCurrentLimits();
    let warnAllowed = status === "allowed_warning" && env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION === true;
    if (status !== "allowed" && !warnAllowed) return "rate_limit";
    if ((billedToUsageCredits ?? overageInUse === true) && hasKnownPlanTier()) return "usage_credits";
  }
  return null;
}
//@ chunk-rypxzpmd.js:2985-3673 fingerprint (2.1.88 match: tryGenerateSuggestion, 0.653)
/**
 * 生成前的各项检查（中止、对话太短、上次回答出错、抑制原因、缓存冷、未采用连击节流），通过后生成并过滤建议。
 */
async function tryGenerateSuggestion(
  abortController,
  messages,
  getAppState,
  cacheSafeParams,
  promptId,
  promptSuggestion,
) {
  if (abortController.signal.aborted) {
    logSuggestionSuppressed("aborted", promptId);
    return null;
  }
  if (countWhere(messages, (m) => m.type === "assistant") < 2) {
    logSuggestionSuppressed("early_conversation", promptId);
    return null;
  }
  let lastAssistantMessage = getLastAssistantMessage(messages);
  if (lastAssistantMessage?.isApiErrorMessage) {
    logSuggestionSuppressed("last_response_error", promptId);
    return null;
  }
  let appState = getAppState();
  let suggestionSuppressReason = getSuggestionSuppressReason(
    appState,
    cacheSafeParams.toolUseContext.queryTracking?.billedToUsageCredits,
  );
  if (suggestionSuppressReason) {
    logSuggestionSuppressed(suggestionSuppressReason, promptId);
    return null;
  }
  let suppressReason = getCacheColdReason(lastAssistantMessage);
  if (suppressReason) {
    logSuggestionSuppressed("cache_cold", promptId, {
      cacheColdBy: suppressReason,
    });
    return null;
  }
  if (promptSuggestion && isSuggestionBackOffActive()) {
    let suppressReason = promptSuggestion.eligibleTurns % BACK_OFF_TURN_INTERVAL === 0;
    promptSuggestion.eligibleTurns++;
    if (!suppressReason) {
      logSuggestionSuppressed("unused_streak", promptId);
      return null;
    }
  }
  let { suggestion, generationRequestId } = await generatePipelinedSuggestion(
    abortController,
    cacheSafeParams,
  );
  if (abortController.signal.aborted) {
    logSuggestionSuppressed("aborted", promptId);
    return null;
  }
  if (!suggestion) {
    logSuggestionSuppressed("empty", promptId);
    return null;
  }
  if (shouldFilterSuggestion(suggestion, promptId)) return null;
  return {
    suggestion,
    generationRequestId,
  };
}
//@ chunk-rypxzpmd.js:3673-4710 fingerprint (2.1.88 match: executePromptSuggestion, 0.478)
/**
 * 主线程 REPL 每轮结束后触发：检查焦点，生成建议并放到输入框占位；被阻塞任务时写入 suggestedReply。
 */
async function executePromptSuggestion(context, lastResult) {
  if (!context.querySource?.startsWith("repl_main_thread")) return;
  let terminalFocus = getTerminalFocus();
  let isBackground = isBgSession();
  let isUnblockedTick = isBackground && lastResult?.tempo === "blocked" && !lastResult.block;
  if (isBackground ? terminalFocus !== "focused" && !isUnblockedTick : terminalFocus === "blurred") {
    logSuggestionSuppressed(isBackground ? "bg_unattached" : "unfocused", "cli");
    return;
  }
  let promptSuggestion = context.toolUseContext.session.promptSuggestion;
  let abortController = new AbortController();
  promptSuggestion.abortController = abortController;
  let cacheSafeParams = createCacheSafeParams(context);
  try {
    let generated = await tryGenerateSuggestion(
      abortController,
      context.messages,
      context.toolUseContext.getAppState,
      cacheSafeParams,
      "cli",
      isUnblockedTick ? undefined : promptSuggestion,
    );
    if (!generated) return;
    if (isSuggestionOwnedByPlugin() && isMainAgent(context.toolUseContext.agentContext)) {
      logSuggestionSuppressed("plugin_owns", "cli");
      return;
    }
    let placed = false;
    let { isShown } = await promptSuggestOp({
      text: generated.suggestion,
      origin: {
        kind: "suggestion",
      },
      signal: abortController.signal,
      place: (prev) => {
        if (abortController.signal.aborted)
          return {
            isShown: false,
          };
        placed = true;
        if (isUnblockedTick)
          persistSuggestedReply(prev, lastResult?.needs, context.toolUseContext.storageV5).catch(
            logJobWriteError,
          );
        return proposeSuggestion(prev, generated.generationRequestId);
      },
    });
    if (abortController.signal.aborted) {
      logSuggestionSuppressed("aborted", "cli");
      return;
    }
    if (!isShown && placed) logSuggestionSuppressed("timing", "cli");
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "APIUserAbortError")) {
      logSuggestionSuppressed("aborted", "cli");
      return;
    }
    logFeatureBad("prompt_suggestion_generate", "api_error");
    logError(toError(error));
  } finally {
    if (promptSuggestion.abortController === abortController) promptSuggestion.abortController = null;
  }
}
//@ chunk-rypxzpmd.js:4710-4899 layout
/**
 * 被阻塞的后台任务状态里记录建议回复。
 */
async function persistSuggestedReply(prev, needs, storageV5) {
  if (redactSecrets(prev) !== prev) return;
  let jobDir = getJobDir(getOwnJobShortId());
  invalidateJobStateCache(jobDir);
  let jobState = await readJobState(jobDir, storageV5);
  if (jobState?.tempo !== "blocked" || jobState.needs !== needs || jobState.suggestedReply === prev) return;
  await writeStateAtomic(
    jobDir,
    {
      ...jobState,
      suggestedReply: prev,
    },
    storageV5,
  );
}
//@ chunk-rypxzpmd.js:4899-4909 layout
/**
 * 1e4
 */
var CACHE_COLD_TOKEN_THRESHOLD = 1e4;
//@ chunk-rypxzpmd.js:4909-5142 layout
/**
 * 上次请求非缓存 token >1 万返回 uncached；加缓存写入超过时返回 cache_write（tengu_chomp_thaw 可放行）。
 */
function getCacheColdReason(lastAssistantMessage) {
  if (!lastAssistantMessage) return null;
  let usage = lastAssistantMessage.message.usage;
  let inputTokens = (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
  if (inputTokens > CACHE_COLD_TOKEN_THRESHOLD) return "uncached";
  let cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
  if (inputTokens + cacheCreationInputTokens <= CACHE_COLD_TOKEN_THRESHOLD) return null;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_chomp_thaw", false) ? null : "cache_write";
}
//@ chunk-rypxzpmd.js:5142-6549 layout
/**
 * 提示建议的指令：预测用户接下来会输入什么（2–12 词），不确定就沉默。
 */
var SUGGESTION_PROMPT = `[SUGGESTION MODE: Suggest what the user might naturally type next into Claude Code.]

FIRST: Look at the user's recent messages and original request.

Your job is to predict what THEY would type - not what you think they should do.

THE TEST: Would they think "I was just about to type that"?

EXAMPLES:
User asked "fix the bug and run tests", bug is fixed \u2192 "run the tests"
After code written \u2192 "try it out"
Claude offers options \u2192 suggest the one the user would likely pick, based on conversation
Claude asks to continue \u2192 "yes" or "go ahead"
Task complete, obvious follow-up \u2192 "commit this" or "push it"
After error or misunderstanding \u2192 silence (let them assess/correct)

Be specific: "run the tests" beats "continue".

NEVER SUGGEST:
- Evaluative ("looks good", "thanks")
- Questions ("what about...?")
- Claude-voice ("Let me...", "I'll...", "Here's...")
- New ideas they didn't ask about
- Multiple sentences

Stay silent if the next step isn't obvious from what the user said.

Stay silent if a suggestion could be unsafe or inappropriate \u2014 including any sensitive topic (security incidents, credentials, harm, private data). Even when the user is doing legitimate security or cybersecurity work, do not predict potentially unsafe actions.

Format: 2-12 words, match the user's style. Or nothing.

Reply with ONLY the suggestion, no quotes or explanation.`;
//@ chunk-rypxzpmd.js:6549-7215 fingerprint (2.1.88 match: generateSuggestion, 0.927)
/**
 * fork 一次（prompt_suggestion，拒绝工具）收集 assistant 文本候选与请求 id。
 */
async function generateSuggestion(abortController, promptId, cacheSafeParams) {
  let canUseTool = async () => ({
    behavior: "deny",
    message: "No tools needed for suggestion",
    decisionReason: {
      type: "other",
      reason: "suggestion only",
    },
  });
  let result = await runForkedAgent({
    promptMessages: [
      createUserMessage({
        content: abortController,
      }),
    ],
    cacheSafeParams,
    canUseTool,
    querySource: "prompt_suggestion",
    forkLabel: "prompt_suggestion",
    overrides: {
      abortController: promptId,
    },
    skipTranscript: true,
    skipCacheWrite: true,
  });
  let firstAssistantMsg = result.messages.find((m) => m.type === "assistant");
  let generationRequestId =
    firstAssistantMsg?.type === "assistant" ? (firstAssistantMsg.requestId ?? null) : null;
  let texts = [];
  for (let msg of result.messages) {
    if (msg.type !== "assistant" || msg.isApiErrorMessage) continue;
    let textBlock = msg.message.content.find((block) => block.type === "text");
    if (textBlock?.type === "text") texts.push(textBlock.text);
  }
  return {
    candidates: texts,
    generationRequestId,
  };
}
//@ chunk-rypxzpmd.js:8009-10528 fingerprint (2.1.88 match: shouldFilterSuggestion, 1)
/**
 * 过滤不合格建议：done、元文本、括号包裹、错误消息、前缀标签、词数过少/过多、过长、多句、格式化、评价语、Claude 口吻。
 */
function shouldFilterSuggestion(suggestion, promptId) {
  if (!suggestion) {
    logSuggestionSuppressed("empty", promptId);
    return true;
  }
  let lower = suggestion.toLowerCase();
  let wordCount = countWordsMultilingual(suggestion);
  let filters = [
    [
      "done",
      () =>
        lower === "done" ||
        /^\P{L}*(\u5B8C\u4E86(\u3057\u307E\u3057\u305F)?|\u5B8C\u6210\u4E86?|\uC644\uB8CC\uB428?)\P{L}*$/u.test(
          suggestion,
        ),
    ],
    [
      "meta_text",
      () =>
        lower === "nothing found" ||
        lower === "nothing found." ||
        lower.startsWith("nothing to suggest") ||
        lower.startsWith("no suggestion") ||
        /\bsilence is\b|\bstay(s|ing)? silent\b/.test(lower) ||
        /^\W*silence\W*$/.test(lower) ||
        /^\P{L}*(\u6C88\u9ED9|\u6C89\u9ED8|\u9759\u9ED8|\uCE68\uBB35|\u63D0\u6848(\u306A\u3057|\u306F\u3042\u308A\u307E\u305B\u3093)|\u7279\u306B(\u306A\u3057|\u3042\u308A\u307E\u305B\u3093)|[\u65E0\u6CA1\u6C92]\u6709?\u5EFA[\u8BAE\u8B70]|(\uC81C\uC548|\uD574\uB2F9)\s*\uC5C6\uC74C)\P{L}*$/u.test(
          suggestion,
        ),
    ],
    [
      "meta_wrapped",
      () => /^(\(.*\)|\[.*\]|\uFF08.*\uFF09|\uFF3B.*\uFF3D|\u3010.*\u3011|\u3014.*\u3015)$/.test(suggestion),
    ],
    [
      "error_message",
      () =>
        lower.startsWith("api error:") ||
        lower.startsWith("prompt is too long") ||
        lower.startsWith("request timed out") ||
        lower.startsWith("invalid api key") ||
        lower.startsWith("image was too large"),
    ],
    ["prefixed_label", () => /^\w+:\s/.test(suggestion)],
    [
      "too_few_words",
      () => {
        if (wordCount >= 2) return false;
        if (suggestion.startsWith("/")) return false;
        let cjkCount = countCjkChars(suggestion);
        if (cjkCount > 0) return cjkCount < 2;
        return !new Set([
          "yes",
          "yeah",
          "yep",
          "yea",
          "yup",
          "sure",
          "ok",
          "okay",
          "push",
          "commit",
          "deploy",
          "stop",
          "continue",
          "check",
          "exit",
          "quit",
          "no",
        ]).has(lower);
      },
    ],
    ["too_many_words", () => wordCount > 12],
    ["too_long", () => suggestion.length >= 100],
    ["multiple_sentences", () => /[.!?]\s+[A-Z]|[\u3002\uFF01\uFF1F]\s*[\p{L}\p{N}]/u.test(suggestion)],
    ["has_formatting", () => /[\n*]|\*\*/.test(suggestion)],
    [
      "evaluative",
      () =>
        /thanks|thank you|looks good|sounds good|that works|that worked|that's all|nice|great|perfect|makes sense|awesome|excellent/.test(
          lower,
        ) ||
        /^\P{L}*(\u3042\u308A\u304C\u3068\u3046(\u3054\u3056\u3044\u307E\u3059|\u3054\u3056\u3044\u307E\u3057\u305F)?|\u52A9\u304B\u308A\u307E\u3057\u305F|[\u8C22\u8B1D][\u8C22\u8B1D][\u4F60\u60A8]?|\u611F\u8C22[\u4F60\u60A8]?|\u611F\u8B1D\u3057\u307E\u3059|\uAC10\uC0AC\uD569\uB2C8\uB2E4|\uACE0\uB9C8\uC6CC\uC694?)(\P{L}|\u7684|$)/u.test(
          suggestion,
        ) ||
        /(\u826F\u3055\u305D\u3046|\u3088\u3055\u305D\u3046|\u3044\u3044\u3067\u3059\u306D|\u770B\u8D77\u6765\u4E0D\u9519|\u592A\u597D\u4E86|\u5B8C\u74A7|\u5B8C\u7F8E|\uC88B\uB124\uC694)(\u3067\u3059|\u3067\u3059\u306D|\u3060\u306D)?\P{L}*$/u.test(
          suggestion,
        ),
    ],
    [
      "claude_voice",
      () =>
        /^(let me|i'll|i've|i'm|i can|i would|i think|i notice|here's|here is|here are|that's|this is|this will|you can|you should|you could|sure,|of course|certainly|\u8BA9\u6211(?!\u4EEC)|\u6211\u6765|\u6211\u4F1A|\u6211\u5C06)/i.test(
          suggestion,
        ),
    ],
  ];
  for (let [reason, check] of filters)
    if (check()) {
      logSuggestionSuppressed(reason, promptId);
      return true;
    }
  return false;
}
//@ chunk-rypxzpmd.js:10528-10868 fingerprint (2.1.88 match: logSuggestionOutcome, 0.807)
/**
 * 记录建议被采纳/忽略及相似度、耗时。
 */
function logSuggestionOutcome(suggestion, userInput, emittedAt, generationRequestId) {
  let similarity = Math.round((userInput.length / (suggestion.length || 1)) * 100) / 100;
  let wasAccepted = userInput.toLowerCase() === suggestion.toLowerCase();
  let timeMs = Math.max(0, Date.now() - emittedAt);
  logEvent("tengu_prompt_suggestion", {
    source: lit("sdk"),
    outcome: lit(wasAccepted ? "accepted" : "ignored"),
    prompt_id: lit("user_intent"),
    ...(generationRequestId && {
      generationRequestId: sanitizeMarkName(generationRequestId),
    }),
    ...(wasAccepted && {
      timeToAcceptMs: timeMs,
    }),
    ...(!wasAccepted && {
      timeToIgnoreMs: timeMs,
    }),
    similarity,
  });
}
//@ chunk-rypxzpmd.js:10868-11051 fingerprint (2.1.88 match: logSuggestionSuppressed, 0.589)
/**
 * 记录建议被抑制及原因。
 */
function logSuggestionSuppressed(reason, source, details) {
  logEvent("tengu_prompt_suggestion", {
    ...(source && {
      source: fromEnum(source),
    }),
    outcome: lit("suppressed"),
    reason: fromEnum(reason),
    ...(details?.cacheColdBy && {
      cacheColdBy: fromEnum(details.cacheColdBy),
    }),
    prompt_id: lit("user_intent"),
  });
}
export {
  isPromptSuggestionSettingEnabled,
  logSuggestionOutcome,
  logSuggestionSuppressed,
  tryGenerateSuggestion,
  shouldEnablePromptSuggestion,
  generateSuggestion,
  SUGGESTION_PROMPT,
  suggestionTextOrNull,
  isShownOrAcceptedSuggestion,
  executePromptSuggestion,
};
