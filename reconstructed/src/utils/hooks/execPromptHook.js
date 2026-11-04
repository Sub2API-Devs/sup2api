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
import { randomUUID } from "crypto";
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
import { hookTimeoutMs } from "./hookConcurrency.js";
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
import { safeParseJSON, stripJsonCodeFence } from "../json.js";
import { truncateWithCount } from "../stringUtils.js";
import { promptEndingFields } from "../../entrypoints/sdk/coreSchemas.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { errorMessage } from "../errors.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { totalTokensOf } from "../messages/usageAndStopReason.js";
import { roughTokenCountEstimationForContent } from "../../services/tokenEstimation.js";
import { jsonStringify } from "../slowOperations.js";
import { has1mSuffix_2, modelHasNative1MContext } from "../model/contextWindow1m.js";
import { CONTEXT_WINDOW_THRESHOLD } from "../model/model.js";
import { groupByApiRound } from "../../services/compact/compact.js";

//@ chunk-e6aww6q8.js:3385228-3385240 sole-consumer
var MAX_REPEATED_PROMPT_CHARS = 500;
//@ chunk-e6aww6q8.js:3385240-3385340 sole-consumer
function transcriptMentions(messages, needle) {
  return (messages ?? []).some(
    (message) =>
      message.type === "user" && indexOfKmp(getContentText(message.message.content) ?? "", needle, 0) !== -1,
  );
}
//@ chunk-e6aww6q8.js:3385340-3390612 fingerprint = execPromptHook (0.669)
/**
 * 执行 prompt 钩子：把提示词（Stop 系事件包装成停止条件判断）连同对话历史发给小模型，要求 JSON {ok, reason, impossible}；ok=false 阻断（非 Stop 事件默认结束回合，continueOnBlock 可改），impossible 只对 Stop 有效；默认 30s 超时，提示过长时减半历史重试。
 */
async function execPromptHook(
  hook,
  hookName,
  hookEvent,
  jsonInput,
  signal,
  toolUseContext,
  messages,
  toolUseID,
  hookTimeoutMs_2,
) {
  let effectiveToolUseID = toolUseID || `hook-${randomUUID()}`;
  let isStopEvent = hookEvent === "Stop" || hookEvent === "SubagentStop";
  try {
    let promptText = isStopEvent
      ? `Based on the conversation transcript above, has the following stopping condition been satisfied? Answer based on transcript evidence only.

Condition: ${hook.prompt}`
      : hook.prompt;
    let processedPrompt = substituteArguments(promptText, jsonInput);
    logForDebugging(`Hooks: Processing prompt hook with prompt: ${processedPrompt}`);
    let userMessage = createUserMessage({
      content: processedPrompt,
    });
    let model = hook.model ?? getSmallFastModel();
    let buildMessages = (ratio) =>
      messages && messages.length > 0
        ? [...truncateStopHookTranscript(messages, model, ratio), userMessage]
        : [userMessage];
    let messages_2 = buildMessages();
    logForDebugging(`Hooks: Querying model with ${messages_2.length} messages`);
    let hookTimeoutMs_3 = hookTimeoutMs(hook, 30000);
    let now = Date.now();
    let { signal: combinedSignal, cleanup: cleanupSignal } = createCombinedAbortSignal(signal, {
      timeoutMs: hookTimeoutMs_3,
    });
    try {
      let stopSystemPrompt = `You are evaluating a stop-condition hook in Claude Code. Read the conversation transcript carefully, then judge whether the user-provided condition is satisfied.

${HOOK_OK_SEMANTICS}

Your response must be a JSON object with one of these shapes:
- {"ok": true, "reason": "<quote evidence from the transcript that satisfies the condition>"}
- {"ok": false, "reason": "<quote what is missing or what blocks the condition>"}
- {"ok": false, "impossible": true, "reason": "<explain why the condition can never be satisfied>"}

Always include a "reason" field, quoting specific text from the transcript whenever possible. If the transcript does not contain clear evidence that the condition is satisfied, return {"ok": false, "reason": "insufficient evidence in transcript"}.

Only use {"ok": false, "impossible": true} when the condition is genuinely unachievable in this session \u2014 for example: the condition is self-contradictory, it depends on a resource or capability that is unavailable, or the assistant has explicitly tried, exhausted reasonable approaches, and stated it cannot be done. Apply your own judgment when deciding this \u2014 the assistant claiming the goal is impossible is evidence, not proof; independently confirm the condition is genuinely unachievable rather than deferring to the assistant's self-assessment. Do not use it just because the goal has not been reached yet or because progress is slow. When in doubt, return {"ok": false} without "impossible".`;
      let hookSystemPrompt = `You are evaluating a hook in Claude Code. The user's text says what to check. Decide whether the action may go ahead.

${HOOK_OK_SEMANTICS}

Your response must be a JSON object with one of these shapes:
- {"ok": true, "reason": "<why the action may go ahead>"}
- {"ok": false, "reason": "<why the action is blocked>"}

Always include a "reason" field.`;
      let queryWith = (messages) =>
        queryModelWithoutStreaming({
          messages,
          systemPrompt: asSystemPrompt([isStopEvent ? stopSystemPrompt : hookSystemPrompt]),
          thinkingConfig: {
            type: "disabled",
            mechanical: true,
          },
          tools: [],
          signal: combinedSignal,
          options: {
            async getToolPermissionContext() {
              return getToolPermissionContext(toolUseContext);
            },
            model,
            toolChoice: undefined,
            isNonInteractiveSession: true,
            hasAppendSystemPrompt: false,
            agents: [],
            querySource: "hook_prompt",
            promptTooLongIsHandled: true,
            mcpTools: [],
            agentId: toolUseContext.agentId,
            agentContext: toolUseContext.agentContext,
            credentials: toolUseContext.credentials,
            stickyBetas: forkStickyBetaLatches(getStickyBetas()),
            proactivityLevel: currentProactivityLevel(toolUseContext),
            outputFormat: {
              type: "json_schema",
              schema: {
                type: "object",
                properties: {
                  ok: {
                    type: "boolean",
                  },
                  reason: {
                    type: "string",
                  },
                  impossible: {
                    type: "boolean",
                  },
                },
                required: ["ok", "reason"],
                additionalProperties: false,
              },
            },
          },
        });
      let response = await queryWith(messages_2);
      if (isPromptTooLongMessage_2(response) && messages && messages.length > 0) {
        logEvent("tengu_hook_prompt_too_long_retry", {
          evaluatorModel: telemetrySafeModelName(model),
        });
        messages_2 = buildMessages(PROMPT_TOO_LONG_RETRY_RATIO / 2);
        logForDebugging(`Hooks: evaluator prompt too long; retrying with ${messages_2.length} messages`);
        response = await queryWith(messages_2);
      }
      cleanupSignal();
      if (response.isApiErrorMessage) {
        let trimmed = extractTextContent_2(response.message.content).trim();
        logForDebugging(`Hooks: prompt-hook evaluator API error: ${trimmed}`, {
          level: "error",
        });
        return nonBlockingHookErrorResult(hook, {
          hookName,
          toolUseID: effectiveToolUseID,
          hookEvent,
          stderr: `Hook evaluator API error: ${trimmed}`,
          stdout: "",
        });
      }
      let fullResponse = extractTextContent_2(response.message.content).trim();
      logForDebugging(`Hooks: Model response: ${fullResponse}`);
      let json = safeParseJSON(stripJsonCodeFence(fullResponse), false);
      if (!json) {
        logForDebugging(`Hooks: error parsing response as JSON: ${fullResponse}`);
        return nonBlockingHookErrorResult(hook, {
          hookName,
          toolUseID: effectiveToolUseID,
          hookEvent,
          stderr: "JSON validation failed",
          stdout: fullResponse,
        });
      }
      let parsed = hookResponseSchema().safeParse(json);
      if (!parsed.success) {
        logForDebugging(`Hooks: model response does not conform to expected schema: ${parsed.error.message}`);
        return nonBlockingHookErrorResult(hook, {
          hookName,
          toolUseID: effectiveToolUseID,
          hookEvent,
          stderr: `Schema validation failed: ${parsed.error.message}`,
          stdout: fullResponse,
        });
      }
      if (!parsed.data.ok) {
        if (parsed.data.impossible === true && isStopEvent) {
          logForDebugging(`Hooks: Prompt hook condition judged impossible: ${parsed.data.reason}`);
          return {
            hook,
            outcome: "success",
            impossible: true,
            stopReason: parsed.data.reason,
            message: createAttachmentMessage_2({
              type: "hook_success",
              hookName,
              toolUseID: effectiveToolUseID,
              hookEvent,
              content: "",
            }),
          };
        }
        logForDebugging(`Hooks: Prompt hook condition was not met: ${parsed.data.reason}`);
        let reasonText = transcriptMentions(messages, `[${hook.prompt}]:`)
          ? truncateWithCount(hook.prompt, MAX_REPEATED_PROMPT_CHARS)
          : hook.prompt;
        return {
          hook,
          outcome: "blocking",
          blockingError: {
            blockingError: `[${reasonText}]: ${parsed.data.reason}`,
            command: reasonText,
            ...promptEndingFields(hookEvent, {
              reason: parsed.data.reason,
            }),
          },
          preventContinuation: !isStopEvent && hook.continueOnBlock !== true,
          stopReason: parsed.data.reason,
        };
      }
      logForDebugging(`Hooks: Prompt hook condition was met: ${parsed.data.reason}`);
      return {
        hook,
        outcome: "success",
        stopReason: parsed.data.reason,
        message: createAttachmentMessage_2({
          type: "hook_success",
          hookName,
          toolUseID: effectiveToolUseID,
          hookEvent,
          content: "",
        }),
      };
    } catch (error) {
      cleanupSignal();
      if (combinedSignal.aborted) {
        let timedOut = !toolUseContext.abortController.signal.aborted;
        if (timedOut) {
          let durationMs = Date.now() - now;
          let min = Math.min(hookTimeoutMs_3, hookTimeoutMs_2 ?? 1 / 0);
          logForDebugging(
            `Hooks: prompt hook (${hookEvent}) timed out after ${durationMs}ms (limit ${min}ms)`,
            {
              level: "warn",
            },
          );
          logEvent("tengu_hook_prompt_timeout", {
            hookEvent: fromEnum(hookEvent),
            timeoutMs: min,
            durationMs,
          });
        }
        return {
          hook,
          outcome: "cancelled",
          timedOut,
        };
      }
      throw error;
    }
  } catch (error) {
    let errorMsg = errorMessage(error);
    logForDebugging(`Hooks: Prompt hook error: ${errorMsg}`);
    return nonBlockingHookErrorResult(hook, {
      hookName,
      toolUseID: effectiveToolUseID,
      hookEvent,
      stderr: `Error executing prompt hook: ${errorMsg}`,
      stdout: "",
    });
  }
}
//@ chunk-e6aww6q8.js:3390612-3390624 layout
var PROMPT_TOO_LONG_RETRY_RATIO = 0.5;
//@ chunk-e6aww6q8.js:3390624-3390805 placement = getTokenUsage (0.835)
function getTokenUsage_2(message) {
  for (let idx = message.length - 1; idx >= 0; idx--) {
    let message_2 = message[idx];
    if (
      message_2.type === "assistant" &&
      "usage" in message_2.message &&
      message_2.message.model !== SYNTHETIC_MODEL &&
      message_2.isUnmetered !== true
    )
      return totalTokensOf(message_2.message.usage);
  }
  return 0;
}
//@ chunk-e6aww6q8.js:3390805-3390941 placement
function estimateMessagesTokens(messages) {
  let total = 0;
  for (let message of messages)
    total +=
      message.type === "assistant" || message.type === "user"
        ? roughTokenCountEstimationForContent(message.message.content)
        : jsonStringify(message).length / 4;
  return Math.ceil(total);
}
//@ chunk-e6aww6q8.js:3390941-3391747 placement
/**
 * Stop 钩子提示评估时截断过长的转录。
 */
function truncateStopHookTranscript(messages, model, ratio = PROMPT_TOO_LONG_RETRY_RATIO) {
  let windowSize = has1mSuffix_2(model) || modelHasNative1MContext(model) ? 1e6 : CONTEXT_WINDOW_THRESHOLD;
  let floored = Math.floor(windowSize * ratio);
  if (getTokenUsage_2(messages) <= floored) return messages;
  let rounds = groupByApiRound(messages);
  let keptTokens = 0;
  let keptFrom = rounds.length;
  for (let idx = rounds.length - 1; idx >= 0; idx--) {
    let roundTokens = estimateMessagesTokens(rounds[idx]);
    if (keptFrom < rounds.length && keptTokens + roundTokens > floored) break;
    keptTokens += roundTokens;
    keptFrom = idx;
  }
  let keptMessages = rounds.slice(keptFrom).flat();
  let droppedCount = messages.length - keptMessages.length;
  if (droppedCount <= 0) return messages;
  logForDebugging(
    `Hooks: truncated Stop transcript ${messages.length}\u2192${keptMessages.length} msgs (budget ${floored}, model ${model})`,
  );
  logEvent("tengu_hook_prompt_transcript_truncated", {
    droppedMessages: droppedCount,
    keptMessages: keptMessages.length,
    budget: floored,
    evaluatorModel: telemetrySafeModelName(model),
  });
  return [
    createUserMessage({
      content: `[Earlier conversation truncated to fit the hook evaluator's context window \u2014 ${droppedCount} earlier messages omitted. Evaluate the condition against the recent transcript below; if the required evidence may be in the omitted prefix, return {"ok": false, "reason": "insufficient evidence in transcript"}.]`,
    }),
    ...keptMessages,
  ];
}
export { execPromptHook };
