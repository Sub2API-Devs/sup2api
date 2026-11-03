/**
 * services/PromptSuggestion/promptSuggestion.ts
 *
 * 提示建议（预测用户下一句）：开关判定、抑制原因（模式、限额、缓存冷）、fork 生成、结果过滤与遥测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/PromptSuggestion/promptSuggestion.ts
 * pieces: chunk-3sjj4q4c.js (19)
 * attribution: placement 6, fingerprint 8, layout 5
 */
import { env } from "../../utils/env.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { isTeammate } from "../../utils/teammate.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { getCurrentLimits } from "../claudeAiLimits.js";
import { hasKnownPlanTier } from "../../utils/planTiers.js";
import { count } from "../../utils/collections.js";
import { getLastAssistantMessage, createUserMessage } from "../../utils/messages.js";
import { isSuggestionBackOffActive, BACK_OFF_TURN_INTERVAL, tUt } from "./backOff.js";
import { generatePipelinedSuggestion } from "./speculation.js";
import { getTerminalFocus } from "../../ink/terminal-focus-state.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { createCacheSafeParams, runForkedAgent } from "../../utils/forkedAgent.js";
import { isMainAgent } from "../../utils/agentContext.js";
import { promptSuggestOp, nUo } from "../../plugins/functionHooks/promptSuggestHooks.js";
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
import { ye } from "../../utils/startupMarks.js";

//@ chunk-3sjj4q4c.js:956-1142 placement
var HAN_RE = /\p{Script=Han}/u,
  PHONETIC_SCRIPT_RE =
    /[\p{Script=Hiragana}\p{Script=Katakana}\u30fc\uff70\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u,
  HANGUL_RE = /\p{Script=Hangul}/u,
  LETTER_OR_DIGIT_RE = /[\p{L}\p{N}]/u;
//@ chunk-3sjj4q4c.js:1142-1205 placement
function y(e) {
  let { han: han, phonetic: phonetic, hangul: hangul } = countScriptChars(e);
  return han + phonetic + hangul;
}
//@ chunk-3sjj4q4c.js:1205-1392 placement
function countWordsMultilingual(e) {
  let trimmed = e.trim();
  if (trimmed === "") return 0;
  let t = 0;
  for (let o of trimmed.split(/\s+/)) {
    let { han: han, phonetic: phonetic, hangul: hangul, other: other } = countScriptChars(o);
    t += han === 0 && phonetic === 0 ? 1 : (other + hangul > 0 ? 1 : 0) + han / 2 + phonetic / 4;
  }
  return Math.ceil(t);
}
//@ chunk-3sjj4q4c.js:1392-1566 placement
function countScriptChars(e) {
  let n = 0,
    t = 0,
    o = 0,
    s = 0;
  for (let r of e)
    if (HAN_RE.test(r)) n++;
    else if (PHONETIC_SCRIPT_RE.test(r)) t++;
    else if (HANGUL_RE.test(r)) o++;
    else if (LETTER_OR_DIGIT_RE.test(r)) s++;
  return { han: n, phonetic: t, hangul: o, other: s };
}
//@ chunk-3sjj4q4c.js:1566-1631 placement
function nGe(e) {
  return e.status === "shown" || e.status === "accepted";
}
//@ chunk-3sjj4q4c.js:1631-1685 placement
function jBn(e) {
  return e.status === "empty" ? null : e.text;
}
/**
 * 是否启用提示建议：CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION 优先；否则需 tengu_chomp_inflection、交互会话、非 swarm 队员、设置 promptSuggestionEnabled 不为 false。记 tengu_prompt_suggestion_init。
 */
//@ chunk-3sjj4q4c.js:1685-2333 fingerprint = shouldEnablePromptSuggestion (1)
function shouldEnablePromptSuggestion() {
  let envOverride = env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION;
  if (envOverride === !1)
    return (logEvent("tengu_prompt_suggestion_init", { enabled: !1, source: lit("env") }), !1);
  if (envOverride === !0)
    return (logEvent("tengu_prompt_suggestion_init", { enabled: !0, source: lit("env") }), !0);
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_chomp_inflection", !1))
    return (logEvent("tengu_prompt_suggestion_init", { enabled: !1, source: lit("growthbook") }), !1);
  if (getIsNonInteractiveSession())
    return (logEvent("tengu_prompt_suggestion_init", { enabled: !1, source: lit("non_interactive") }), !1);
  if (isAgentSwarmsEnabled() && isTeammate())
    return (logEvent("tengu_prompt_suggestion_init", { enabled: !1, source: lit("swarm_teammate") }), !1);
  let enabled = getInitialSettings_2()?.promptSuggestionEnabled !== !1;
  return (logEvent("tengu_prompt_suggestion_init", { enabled: enabled, source: lit("setting") }), enabled);
}
/**
 * 只看 env 与设置的启用判断（不记遥测）。
 */
//@ chunk-3sjj4q4c.js:2333-2458 layout
function isPromptSuggestionSettingEnabled() {
  let CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION = env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION;
  if (CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION !== void 0) return CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION;
  return getInitialSettings_2()?.promptSuggestionEnabled !== !1;
}
/**
 * 应用状态层面的抑制原因：disabled、pending_permission、elicitation_active、plan_mode、rate_limit、usage_credits。
 */
//@ chunk-3sjj4q4c.js:2458-2985 fingerprint = getSuggestionSuppressReason (0.675)
function getSuggestionSuppressReason(e, n) {
  if (!e.promptSuggestionEnabled) return "disabled";
  if (e.pendingWorkerRequest || e.pendingSandboxRequest) return "pending_permission";
  if (
    e.mcp.clients.some(
      (client) => client.type === "connected" && (client.transportErrorState?.pendingElicitations ?? 0) > 0,
    )
  )
    return "elicitation_active";
  if (e.toolPermissionContext.mode === "plan") return "plan_mode";
  {
    let { status: status, overageInUse: overageInUse } = getCurrentLimits(),
      s = status === "allowed_warning" && env.CLAUDE_CODE_ENABLE_PROMPT_SUGGESTION === !0;
    if (status !== "allowed" && !s) return "rate_limit";
    if ((n ?? overageInUse === !0) && hasKnownPlanTier()) return "usage_credits";
  }
  return null;
}
/**
 * 生成前的各项检查（中止、对话太短、上次回答出错、抑制原因、缓存冷、未采用连击节流），通过后生成并过滤建议。
 */
//@ chunk-3sjj4q4c.js:2985-3673 fingerprint = tryGenerateSuggestion (0.653)
async function tryGenerateSuggestion(e, n, t, o, s, r) {
  if (e.signal.aborted) return (logSuggestionSuppressed("aborted", s), null);
  if (count(n, (S) => S.type === "assistant") < 2)
    return (logSuggestionSuppressed("early_conversation", s), null);
  let lastAssistantMessage = getLastAssistantMessage(n);
  if (lastAssistantMessage?.isApiErrorMessage)
    return (logSuggestionSuppressed("last_response_error", s), null);
  let appState = t(),
    f = getSuggestionSuppressReason(appState, o.toolUseContext.queryTracking?.billedToUsageCredits);
  if (f) return (logSuggestionSuppressed(f, s), null);
  let suppressReason = getCacheColdReason(lastAssistantMessage);
  if (suppressReason)
    return (logSuggestionSuppressed("cache_cold", s, { cacheColdBy: suppressReason }), null);
  if (r && isSuggestionBackOffActive()) {
    let S = r.eligibleTurns % BACK_OFF_TURN_INTERVAL === 0;
    if ((r.eligibleTurns++, !S)) return (logSuggestionSuppressed("unused_streak", s), null);
  }
  let { suggestion: suggestion, generationRequestId: generationRequestId } =
    await generatePipelinedSuggestion(e, o);
  if (e.signal.aborted) return (logSuggestionSuppressed("aborted", s), null);
  if (!suggestion) return (logSuggestionSuppressed("empty", s), null);
  if (shouldFilterSuggestion(suggestion, s)) return null;
  return { suggestion: suggestion, generationRequestId: generationRequestId };
}
/**
 * 主线程 REPL 每轮结束后触发：检查焦点，生成建议并放到输入框占位；被阻塞任务时写入 suggestedReply。
 */
//@ chunk-3sjj4q4c.js:3673-4710 fingerprint = executePromptSuggestion (0.473)
async function executePromptSuggestion(e, n) {
  if (!e.querySource?.startsWith("repl_main_thread")) return;
  let t = getTerminalFocus(),
    o = isBgSession(),
    s = o && n?.tempo === "blocked" && !n.block;
  if (o ? t !== "focused" && !s : t === "blurred") {
    logSuggestionSuppressed(o ? "bg_unattached" : "unfocused", "cli");
    return;
  }
  let promptSuggestion = e.toolUseContext.session.promptSuggestion,
    abortController = new AbortController();
  promptSuggestion.abortController = abortController;
  let cacheSafeParams = createCacheSafeParams(e);
  try {
    let p = await tryGenerateSuggestion(
      abortController,
      e.messages,
      e.toolUseContext.getAppState,
      cacheSafeParams,
      "cli",
      s ? void 0 : promptSuggestion,
    );
    if (!p) return;
    if (tUt() && isMainAgent(e.toolUseContext.agentContext)) {
      logSuggestionSuppressed("plugin_owns", "cli");
      return;
    }
    let f = !1,
      { isShown: isShown } = await promptSuggestOp({
        text: p.suggestion,
        origin: { kind: "suggestion" },
        signal: abortController.signal,
        place: (prev) => {
          if (abortController.signal.aborted) return { isShown: !1 };
          if (((f = !0), s))
            persistSuggestedReply(prev, n?.needs, e.toolUseContext.storageV5).catch(logJobWriteError);
          return nUo(prev, p.generationRequestId);
        },
      });
    if (abortController.signal.aborted) {
      logSuggestionSuppressed("aborted", "cli");
      return;
    }
    if (!isShown && f) logSuggestionSuppressed("timing", "cli");
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "APIUserAbortError")) {
      logSuggestionSuppressed("aborted", "cli");
      return;
    }
    (logFeatureBad("prompt_suggestion_generate", "api_error"), logError(toError(error)));
  } finally {
    if (promptSuggestion.abortController === abortController) promptSuggestion.abortController = null;
  }
}
/**
 * 被阻塞的后台任务状态里记录建议回复。
 */
//@ chunk-3sjj4q4c.js:4710-4899 layout
async function persistSuggestedReply(e, n, t) {
  if (redactSecrets(e) !== e) return;
  let o = getJobDir(getOwnJobShortId());
  invalidateJobStateCache(o);
  let s = await readJobState(o, t);
  if (s?.tempo !== "blocked" || s.needs !== n || s.suggestedReply === e) return;
  await writeStateAtomic(o, { ...s, suggestedReply: e }, t);
}
/**
 * 1e4
 */
//@ chunk-3sjj4q4c.js:4899-4909 layout
var CACHE_COLD_TOKEN_THRESHOLD = 1e4;
/**
 * 上次请求非缓存 token >1 万返回 uncached；加缓存写入超过时返回 cache_write（tengu_chomp_thaw 可放行）。
 */
//@ chunk-3sjj4q4c.js:4909-5142 layout
function getCacheColdReason(e) {
  if (!e) return null;
  let usage = e.message.usage,
    t = (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0);
  if (t > CACHE_COLD_TOKEN_THRESHOLD) return "uncached";
  let o = usage.cache_creation_input_tokens ?? 0;
  if (t + o <= CACHE_COLD_TOKEN_THRESHOLD) return null;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_chomp_thaw", !1) ? null : "cache_write";
}
/**
 * 提示建议的指令：预测用户接下来会输入什么（2–12 词），不确定就沉默。
 */
//@ chunk-3sjj4q4c.js:5142-6549 layout
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
/**
 * fork 一次（prompt_suggestion，拒绝工具）收集 assistant 文本候选与请求 id。
 */
//@ chunk-3sjj4q4c.js:6549-7215 fingerprint = generateSuggestion (0.932)
async function generateSuggestion(abortController, promptId, cacheSafeParams) {
  let canUseTool = async () => ({
      behavior: "deny",
      message: "No tools needed for suggestion",
      decisionReason: { type: "other", reason: "suggestion only" },
    }),
    result = await runForkedAgent({
      promptMessages: [createUserMessage({ content: abortController })],
      cacheSafeParams: cacheSafeParams,
      canUseTool: canUseTool,
      querySource: "prompt_suggestion",
      forkLabel: "prompt_suggestion",
      overrides: { abortController: promptId },
      skipTranscript: !0,
      skipCacheWrite: !0,
    }),
    firstAssistantMsg = result.messages.find((message) => message.type === "assistant"),
    generationRequestId =
      firstAssistantMsg?.type === "assistant" ? (firstAssistantMsg.requestId ?? null) : null,
    d = [];
  for (let msg of result.messages) {
    if (msg.type !== "assistant" || msg.isApiErrorMessage) continue;
    let textBlock = msg.message.content.find((_) => _.type === "text");
    if (textBlock?.type === "text") d.push(textBlock.text);
  }
  return { candidates: d, generationRequestId: generationRequestId };
}
/**
 * 过滤不合格建议：done、元文本、括号包裹、错误消息、前缀标签、词数过少/过多、过长、多句、格式化、评价语、Claude 口吻。
 */
//@ chunk-3sjj4q4c.js:8009-10528 fingerprint = shouldFilterSuggestion (1)
function shouldFilterSuggestion(e, n) {
  if (!e) return (logSuggestionSuppressed("empty", n), !0);
  let lower = e.toLowerCase(),
    o = countWordsMultilingual(e),
    filters = [
      [
        "done",
        () =>
          lower === "done" ||
          /^\P{L}*(\u5B8C\u4E86(\u3057\u307E\u3057\u305F)?|\u5B8C\u6210\u4E86?|\uC644\uB8CC\uB428?)\P{L}*$/u.test(
            e,
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
            e,
          ),
      ],
      [
        "meta_wrapped",
        () => /^(\(.*\)|\[.*\]|\uFF08.*\uFF09|\uFF3B.*\uFF3D|\u3010.*\u3011|\u3014.*\u3015)$/.test(e),
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
      ["prefixed_label", () => /^\w+:\s/.test(e)],
      [
        "too_few_words",
        () => {
          if (o >= 2) return !1;
          if (e.startsWith("/")) return !1;
          let r = y(e);
          if (r > 0) return r < 2;
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
      ["too_many_words", () => o > 12],
      ["too_long", () => e.length >= 100],
      ["multiple_sentences", () => /[.!?]\s+[A-Z]|[\u3002\uFF01\uFF1F]\s*[\p{L}\p{N}]/u.test(e)],
      ["has_formatting", () => /[\n*]|\*\*/.test(e)],
      [
        "evaluative",
        () =>
          /thanks|thank you|looks good|sounds good|that works|that worked|that's all|nice|great|perfect|makes sense|awesome|excellent/.test(
            lower,
          ) ||
          /^\P{L}*(\u3042\u308A\u304C\u3068\u3046(\u3054\u3056\u3044\u307E\u3059|\u3054\u3056\u3044\u307E\u3057\u305F)?|\u52A9\u304B\u308A\u307E\u3057\u305F|[\u8C22\u8B1D][\u8C22\u8B1D][\u4F60\u60A8]?|\u611F\u8C22[\u4F60\u60A8]?|\u611F\u8B1D\u3057\u307E\u3059|\uAC10\uC0AC\uD569\uB2C8\uB2E4|\uACE0\uB9C8\uC6CC\uC694?)(\P{L}|\u7684|$)/u.test(
            e,
          ) ||
          /(\u826F\u3055\u305D\u3046|\u3088\u3055\u305D\u3046|\u3044\u3044\u3067\u3059\u306D|\u770B\u8D77\u6765\u4E0D\u9519|\u592A\u597D\u4E86|\u5B8C\u74A7|\u5B8C\u7F8E|\uC88B\uB124\uC694)(\u3067\u3059|\u3067\u3059\u306D|\u3060\u306D)?\P{L}*$/u.test(
            e,
          ),
      ],
      [
        "claude_voice",
        () =>
          /^(let me|i'll|i've|i'm|i can|i would|i think|i notice|here's|here is|here are|that's|this is|this will|you can|you should|you could|sure,|of course|certainly|\u8BA9\u6211(?!\u4EEC)|\u6211\u6765|\u6211\u4F1A|\u6211\u5C06)/i.test(
            e,
          ),
      ],
    ];
  for (let [r, u] of filters) if (u()) return (logSuggestionSuppressed(r, n), !0);
  return !1;
}
/**
 * 记录建议被采纳/忽略及相似度、耗时。
 */
//@ chunk-3sjj4q4c.js:10528-10868 fingerprint = logSuggestionOutcome (0.808)
function logSuggestionOutcome(e, n, t, o) {
  let s = Math.round((n.length / (e.length || 1)) * 100) / 100,
    r = n.toLowerCase() === e.toLowerCase(),
    timeMs = Math.max(0, Date.now() - t);
  logEvent("tengu_prompt_suggestion", {
    source: lit("sdk"),
    outcome: lit(r ? "accepted" : "ignored"),
    prompt_id: lit("user_intent"),
    ...(o && { generationRequestId: ye(o) }),
    ...(r && { timeToAcceptMs: timeMs }),
    ...(!r && { timeToIgnoreMs: timeMs }),
    similarity: s,
  });
}
/**
 * 记录建议被抑制及原因。
 */
//@ chunk-3sjj4q4c.js:10868-11051 fingerprint = logSuggestionSuppressed (0.589)
function logSuggestionSuppressed(e, n, t) {
  logEvent("tengu_prompt_suggestion", {
    ...(n && { source: fromEnum(n) }),
    outcome: lit("suppressed"),
    reason: fromEnum(e),
    ...(t?.cacheColdBy && { cacheColdBy: fromEnum(t.cacheColdBy) }),
    prompt_id: lit("user_intent"),
  });
}

export {
  shouldEnablePromptSuggestion,
  isPromptSuggestionSettingEnabled,
  nGe,
  jBn,
  logSuggestionSuppressed,
  generateSuggestion,
  SUGGESTION_PROMPT,
  executePromptSuggestion,
  logSuggestionOutcome,
  tryGenerateSuggestion,
};
