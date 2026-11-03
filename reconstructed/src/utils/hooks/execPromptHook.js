/**
 * utils/hooks/execPromptHook.ts
 *
 * prompt 型钩子：用小模型按 JSON {ok, reason, impossible} 判断条件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hooks/execPromptHook.ts
 * pieces: chunk-e6aww6q8.js (7)
 * attribution: sole-consumer 2, fingerprint 1, layout 1, placement 3
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  indexOfKmp,
  HOOK_OK_SEMANTICS,
  nonBlockingHookErrorResult,
  hookResponseSchema,
} from "./hookHelpers.js";
import { getContentText, createUserMessage, extractTextContent_2 } from "../messages.js";
import { substituteArguments } from "../argumentSubstitution.js";
import { logForDebugging, createAttachmentMessage_2 } from "../debug.js";
import { getSmallFastModel } from "../model/smallFastModel.js";
import { aO } from "./hookConcurrency.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import { queryModelWithoutStreaming } from "../../services/api/claude.js";
import { asSystemPrompt } from "../systemPromptType.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { forkStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { getStickyBetas } from "../../bootstrap/state.js";
import { currentProactivityLevel } from "../../Tool.js";
import { isPromptTooLongMessage_2 } from "../../services/api/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../model/telemetryModelName.js";
import { safeParseJSON, $U } from "../json.js";
import { truncateWithCount } from "../stringUtils.js";
import { promptEndingFields } from "../../entrypoints/sdk/coreSchemas.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { errorMessage } from "../errors.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { totalTokensOf } from "../messages/usageAndStopReason.js";
import { roughTokenCountEstimationForContent } from "../../services/tokenEstimation.js";
import { jsonStringify } from "../slowOperations.js";
import { has1mSuffix, modelHasNative1MContext } from "../model/contextWindow1m.js";
import { rlt } from "../model/model.js";
import { groupByApiRound } from "../../services/compact/compact.js";

//@ chunk-e6aww6q8.js:3385228-3385240 sole-consumer
var MAX_REPEATED_PROMPT_CHARS = 500;
//@ chunk-e6aww6q8.js:3385240-3385340 sole-consumer
function transcriptMentions(e, n) {
  return (e ?? []).some(
    (r) => r.type === "user" && indexOfKmp(getContentText(r.message.content) ?? "", n, 0) !== -1,
  );
}
/**
 * 执行 prompt 钩子：把提示词（Stop 系事件包装成停止条件判断）连同对话历史发给小模型，要求 JSON {ok, reason, impossible}；ok=false 阻断（非 Stop 事件默认结束回合，continueOnBlock 可改），impossible 只对 Stop 有效；默认 30s 超时，提示过长时减半历史重试。
 */
//@ chunk-e6aww6q8.js:3385340-3390612 fingerprint = execPromptHook (0.669)
async function execPromptHook(e, n, r, s, h, y, S, w, L) {
  let G = w || `hook-${randomUUID_33()}`,
    q = r === "Stop" || r === "SubagentStop";
  try {
    let Z = q
        ? `Based on the conversation transcript above, has the following stopping condition been satisfied? Answer based on transcript evidence only.

Condition: ${e.prompt}`
        : e.prompt,
      processedPrompt = substituteArguments(Z, s);
    logForDebugging(`Hooks: Processing prompt hook with prompt: ${processedPrompt}`);
    let userMessage = createUserMessage({ content: processedPrompt }),
      we = e.model ?? getSmallFastModel(),
      Ee = (lt) =>
        S && S.length > 0 ? [...truncateStopHookTranscript(S, we, lt), userMessage] : [userMessage],
      Ae = Ee();
    logForDebugging(`Hooks: Querying model with ${Ae.length} messages`);
    let Ie = aO(e, 30000),
      now = Date.now(),
      { signal: combinedSignal, cleanup: cleanupSignal } = createCombinedAbortSignal(h, { timeoutMs: Ie });
    try {
      let lt = `You are evaluating a stop-condition hook in Claude Code. Read the conversation transcript carefully, then judge whether the user-provided condition is satisfied.

${HOOK_OK_SEMANTICS}

Your response must be a JSON object with one of these shapes:
- {"ok": true, "reason": "<quote evidence from the transcript that satisfies the condition>"}
- {"ok": false, "reason": "<quote what is missing or what blocks the condition>"}
- {"ok": false, "impossible": true, "reason": "<explain why the condition can never be satisfied>"}

Always include a "reason" field, quoting specific text from the transcript whenever possible. If the transcript does not contain clear evidence that the condition is satisfied, return {"ok": false, "reason": "insufficient evidence in transcript"}.

Only use {"ok": false, "impossible": true} when the condition is genuinely unachievable in this session \u2014 for example: the condition is self-contradictory, it depends on a resource or capability that is unavailable, or the assistant has explicitly tried, exhausted reasonable approaches, and stated it cannot be done. Apply your own judgment when deciding this \u2014 the assistant claiming the goal is impossible is evidence, not proof; independently confirm the condition is genuinely unachievable rather than deferring to the assistant's self-assessment. Do not use it just because the goal has not been reached yet or because progress is slow. When in doubt, return {"ok": false} without "impossible".`,
        Je = `You are evaluating a hook in Claude Code. The user's text says what to check. Decide whether the action may go ahead.

${HOOK_OK_SEMANTICS}

Your response must be a JSON object with one of these shapes:
- {"ok": true, "reason": "<why the action may go ahead>"}
- {"ok": false, "reason": "<why the action is blocked>"}

Always include a "reason" field.`,
        nt = (It) =>
          queryModelWithoutStreaming({
            messages: It,
            systemPrompt: asSystemPrompt([q ? lt : Je]),
            thinkingConfig: { type: "disabled", mechanical: !0 },
            tools: [],
            signal: combinedSignal,
            options: {
              async getToolPermissionContext() {
                return getToolPermissionContext(y);
              },
              model: we,
              toolChoice: void 0,
              isNonInteractiveSession: !0,
              hasAppendSystemPrompt: !1,
              agents: [],
              querySource: "hook_prompt",
              promptTooLongIsHandled: !0,
              mcpTools: [],
              agentId: y.agentId,
              agentContext: y.agentContext,
              credentials: y.credentials,
              stickyBetas: forkStickyBetaLatches(getStickyBetas()),
              proactivityLevel: currentProactivityLevel(y),
              outputFormat: {
                type: "json_schema",
                schema: {
                  type: "object",
                  properties: {
                    ok: { type: "boolean" },
                    reason: { type: "string" },
                    impossible: { type: "boolean" },
                  },
                  required: ["ok", "reason"],
                  additionalProperties: !1,
                },
              },
            },
          }),
        response = await nt(Ae);
      if (isPromptTooLongMessage_2(response) && S && S.length > 0)
        (logEvent("tengu_hook_prompt_too_long_retry", { evaluatorModel: telemetrySafeModelName(we) }),
          (Ae = Ee(PROMPT_TOO_LONG_RETRY_RATIO / 2)),
          logForDebugging(`Hooks: evaluator prompt too long; retrying with ${Ae.length} messages`),
          (response = await nt(Ae)));
      if ((cleanupSignal(), response.isApiErrorMessage)) {
        let trimmed = extractTextContent_2(response.message.content).trim();
        return (
          logForDebugging(`Hooks: prompt-hook evaluator API error: ${trimmed}`, { level: "error" }),
          nonBlockingHookErrorResult(e, {
            hookName: n,
            toolUseID: G,
            hookEvent: r,
            stderr: `Hook evaluator API error: ${trimmed}`,
            stdout: "",
          })
        );
      }
      let fullResponse = extractTextContent_2(response.message.content).trim();
      logForDebugging(`Hooks: Model response: ${fullResponse}`);
      let gt = safeParseJSON($U(fullResponse), !1);
      if (!gt)
        return (
          logForDebugging(`Hooks: error parsing response as JSON: ${fullResponse}`),
          nonBlockingHookErrorResult(e, {
            hookName: n,
            toolUseID: G,
            hookEvent: r,
            stderr: "JSON validation failed",
            stdout: fullResponse,
          })
        );
      let parsed = hookResponseSchema().safeParse(gt);
      if (!parsed.success)
        return (
          logForDebugging(
            `Hooks: model response does not conform to expected schema: ${parsed.error.message}`,
          ),
          nonBlockingHookErrorResult(e, {
            hookName: n,
            toolUseID: G,
            hookEvent: r,
            stderr: `Schema validation failed: ${parsed.error.message}`,
            stdout: fullResponse,
          })
        );
      if (!parsed.data.ok) {
        if (parsed.data.impossible === !0 && q)
          return (
            logForDebugging(`Hooks: Prompt hook condition judged impossible: ${parsed.data.reason}`),
            {
              hook: e,
              outcome: "success",
              impossible: !0,
              stopReason: parsed.data.reason,
              message: createAttachmentMessage_2({
                type: "hook_success",
                hookName: n,
                toolUseID: G,
                hookEvent: r,
                content: "",
              }),
            }
          );
        logForDebugging(`Hooks: Prompt hook condition was not met: ${parsed.data.reason}`);
        let It = transcriptMentions(S, `[${e.prompt}]:`)
          ? truncateWithCount(e.prompt, MAX_REPEATED_PROMPT_CHARS)
          : e.prompt;
        return {
          hook: e,
          outcome: "blocking",
          blockingError: {
            blockingError: `[${It}]: ${parsed.data.reason}`,
            command: It,
            ...promptEndingFields(r, { reason: parsed.data.reason }),
          },
          preventContinuation: !q && e.continueOnBlock !== !0,
          stopReason: parsed.data.reason,
        };
      }
      return (
        logForDebugging(`Hooks: Prompt hook condition was met: ${parsed.data.reason}`),
        {
          hook: e,
          outcome: "success",
          stopReason: parsed.data.reason,
          message: createAttachmentMessage_2({
            type: "hook_success",
            hookName: n,
            toolUseID: G,
            hookEvent: r,
            content: "",
          }),
        }
      );
    } catch (error) {
      if ((cleanupSignal(), combinedSignal.aborted)) {
        let Je = !y.abortController.signal.aborted;
        if (Je) {
          let nt = Date.now() - now,
            min = Math.min(Ie, L ?? 1 / 0);
          (logForDebugging(`Hooks: prompt hook (${r}) timed out after ${nt}ms (limit ${min}ms)`, {
            level: "warn",
          }),
            logEvent("tengu_hook_prompt_timeout", {
              hookEvent: fromEnum(r),
              timeoutMs: min,
              durationMs: nt,
            }));
        }
        return { hook: e, outcome: "cancelled", timedOut: Je };
      }
      throw error;
    }
  } catch (error) {
    let errorMsg = errorMessage(error);
    return (
      logForDebugging(`Hooks: Prompt hook error: ${errorMsg}`),
      nonBlockingHookErrorResult(e, {
        hookName: n,
        toolUseID: G,
        hookEvent: r,
        stderr: `Error executing prompt hook: ${errorMsg}`,
        stdout: "",
      })
    );
  }
}
//@ chunk-e6aww6q8.js:3390612-3390624 layout
var PROMPT_TOO_LONG_RETRY_RATIO = 0.5;
//@ chunk-e6aww6q8.js:3390624-3390805 placement = getTokenUsage (0.835)
function getTokenUsage_2(message) {
  for (let n = message.length - 1; n >= 0; n--) {
    let r = message[n];
    if (
      r.type === "assistant" &&
      "usage" in r.message &&
      r.message.model !== SYNTHETIC_MODEL &&
      r.isUnmetered !== !0
    )
      return totalTokensOf(r.message.usage);
  }
  return 0;
}
//@ chunk-e6aww6q8.js:3390805-3390941 placement
function estimateMessagesTokens(e) {
  let n = 0;
  for (let r of e)
    n +=
      r.type === "assistant" || r.type === "user"
        ? roughTokenCountEstimationForContent(r.message.content)
        : jsonStringify(r).length / 4;
  return Math.ceil(n);
}
/**
 * Stop 钩子提示评估时截断过长的转录。
 */
//@ chunk-e6aww6q8.js:3390941-3391747 placement
function truncateStopHookTranscript(e, n, r = PROMPT_TOO_LONG_RETRY_RATIO) {
  let s = has1mSuffix(n) || modelHasNative1MContext(n) ? 1e6 : rlt,
    floored = Math.floor(s * r);
  if (getTokenUsage_2(e) <= floored) return e;
  let y = groupByApiRound(e),
    S = 0,
    w = y.length;
  for (let q = y.length - 1; q >= 0; q--) {
    let Z = estimateMessagesTokens(y[q]);
    if (w < y.length && S + Z > floored) break;
    ((S += Z), (w = q));
  }
  let flat = y.slice(w).flat(),
    G = e.length - flat.length;
  if (G <= 0) return e;
  return (
    logForDebugging(
      `Hooks: truncated Stop transcript ${e.length}\u2192${flat.length} msgs (budget ${floored}, model ${n})`,
    ),
    logEvent("tengu_hook_prompt_transcript_truncated", {
      droppedMessages: G,
      keptMessages: flat.length,
      budget: floored,
      evaluatorModel: telemetrySafeModelName(n),
    }),
    [
      createUserMessage({
        content: `[Earlier conversation truncated to fit the hook evaluator's context window \u2014 ${G} earlier messages omitted. Evaluate the condition against the recent transcript below; if the required evidence may be in the omitted prefix, return {"ok": false, "reason": "insufficient evidence in transcript"}.]`,
      }),
      ...flat,
    ]
  );
}

export { execPromptHook };
