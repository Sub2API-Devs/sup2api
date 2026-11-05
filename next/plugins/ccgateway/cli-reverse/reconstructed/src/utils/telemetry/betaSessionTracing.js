/**
 * utils/telemetry/betaSessionTracing.ts
 *
 * beta 详细追踪：ENABLE_BETA_TRACING_DETAILED + BETA_TRACING_ENDPOINT，给 span 附加提示词/响应/工具输入输出（带哈希与截断）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/betaSessionTracing.ts
 * pieces: chunk-3bj63apf.js (1), chunk-4qbrxszq.js (17)
 * attribution: fingerprint 10, placement 3, callgraph-witnessed 1, file-local 1, layout 3
 */
import { createHash } from "crypto";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import {
  getRootSession,
  isDiskless,
  getIsNonInteractiveSession,
  getSessionId,
} from "../../bootstrap/state.js";
import { env } from "../env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import { collectToolUseIds } from "./messageContentAttributes.js";
import {
  accountMemoryRedactionKeys,
  redactAccountMemoryText,
  redactWithIndex,
  applyRedactions,
  notRecordedReason,
  notRecordedLength,
} from "./accountMemoryRedaction.js";
import { isUserPromptLoggingEnabled, logOTelEvent } from "./events.js";
import { truncateContentForTelemetry, isToolContentLoggingEnabled } from "./sessionTracing.js";
import {
  sanitizeToolNameForAnalytics,
  isToolDetailsLoggingEnabled,
} from "../../services/analytics/metadata.js";
import {
  MAX_HEADLINE_LENGTH_2,
  normalizeWhitespace,
  truncateWithEllipsis,
} from "../../services/sessionStatus/sessionStateClassifier.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-4qbrxszq.js:2223-2316 placement
class BetaTracingState {
  seenHashes = new Set();
  lastReportedMessage = new Map();
  emittedUserPromptForSessionId = undefined;
}
//@ chunk-4qbrxszq.js:2316-2342 placement
var betaTracingStateBySession; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4qbrxszq.js:2316", () => {
  betaTracingStateBySession = new SessionRootSlot(() => new BetaTracingState());
});
//@ chunk-4qbrxszq.js:2342-2425 placement
/**
 * 压缩后清空 beta 追踪的哈希与消息记录。
 */
function clearBetaTracingState() {
  let state = betaTracingStateBySession.of(getRootSession());
  state.seenHashes.clear();
  state.lastReportedMessage.clear();
}
//@ chunk-4qbrxszq.js:2425-2576 fingerprint (2.1.88 match: isBetaTracingEnabled, 0.764)
/**
 * beta 追踪：ENABLE_BETA_TRACING_DETAILED 且设了 BETA_TRACING_ENDPOINT、非 diskless，并且非交互或 tengu_trace_lantern 开启。
 */
function isBetaTracingEnabled() {
  if (!(env.ENABLE_BETA_TRACING_DETAILED && Boolean(process.env.BETA_TRACING_ENDPOINT) && !isDiskless()))
    return false;
  return getIsNonInteractiveSession() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_trace_lantern", false);
}
//@ chunk-4qbrxszq.js:2576-2646 callgraph-witnessed (2.1.88 match: shortHash, 1)
function shortHash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}
//@ chunk-4qbrxszq.js:2646-2680 fingerprint (2.1.88 match: hashSystemPrompt, 1)
function hashSystemPrompt(systemPrompt) {
  return `sp_${shortHash(systemPrompt)}`;
}
//@ chunk-4qbrxszq.js:2680-2742 fingerprint (2.1.88 match: hashMessage, 1)
function hashMessage(message) {
  let content = jsonStringify(message.message.content);
  return `msg_${shortHash(content)}`;
}
//@ chunk-4qbrxszq.js:2742-2853 file-local
function extractSystemReminderContent(text) {
  return /^<system-reminder>\n?([\s\S]*?)\n?<\/system-reminder>$/.exec(text.trim())?.[1]?.trim() || null;
}
//@ chunk-4qbrxszq.js:2853-3469 fingerprint (2.1.88 match: formatMessagesForContext, 0.894)
function formatMessagesForContext(messages, includeUser) {
  let contextParts = [];
  let systemReminders = [];
  for (let message of messages) {
    if (message.type === "api_system") {
      systemReminders.push(message.message.content);
      continue;
    }
    let content = message.message.content;
    if (typeof content === "string") {
      let reminderContent = extractSystemReminderContent(content);
      if (reminderContent) systemReminders.push(reminderContent);
      else if (includeUser)
        contextParts.push(`[USER]
${content}`);
    } else if (Array.isArray(content)) {
      for (let block of content)
        if (block.type === "text") {
          let reminderContent = extractSystemReminderContent(block.text);
          if (reminderContent) systemReminders.push(reminderContent);
          else if (includeUser)
            contextParts.push(`[USER]
${block.text}`);
        } else if (block.type === "tool_result") {
          if (typeof block.content === "string") {
            let reminderContent = extractSystemReminderContent(block.content);
            if (reminderContent) systemReminders.push(reminderContent);
            else if (includeUser)
              contextParts.push(`[TOOL RESULT: ${block.tool_use_id}]
${block.content}`);
          } else if (includeUser)
            contextParts.push(`[TOOL RESULT: ${block.tool_use_id}]
${jsonStringify(block.content)}`);
        }
    }
  }
  return {
    contextParts,
    systemReminders,
  };
}
//@ chunk-4qbrxszq.js:3469-3571 layout
function contextPartsFor(messages, withheldReason) {
  let { systemReminders } = formatMessagesForContext(messages, false);
  return {
    contextParts: [withheldReason],
    systemReminders: systemReminders.map(() => withheldReason),
  };
}
//@ chunk-4qbrxszq.js:3571-3707 layout
function redactToolUseIds(newMessages, messagesForAPI, memoryKeys) {
  let toolUseIds = collectToolUseIds(
    newMessages.map((keptMessage) => keptMessage.message),
    memoryKeys,
    messagesForAPI.map((redactedMessage) => redactedMessage.message),
  );
  return newMessages.map((keptMessages, index) =>
    toolUseIds[index] === keptMessages.message
      ? keptMessages
      : {
          ...keptMessages,
          message: toolUseIds[index],
        },
  );
}
//@ chunk-4qbrxszq.js:3707-3732 layout
var accountMemoryKeysForSession = () => accountMemoryRedactionKeys(getRootSession().host);
//@ chunk-4qbrxszq.js:3732-3955 fingerprint (2.1.88 match: addBetaInteractionAttributes, 1)
function addBetaInteractionAttributes(span, userPrompt) {
  if (!isBetaTracingEnabled() || !isUserPromptLoggingEnabled()) return;
  let { content: truncatedPrompt, truncated } = truncateContentForTelemetry(`[USER PROMPT]
${redactAccountMemoryText(() => accountMemoryRedactionKeys(getRootSession().host), undefined, userPrompt)}`);
  span.setAttributes({
    new_context: truncatedPrompt,
    ...(truncated && {
      new_context_truncated: true,
      new_context_original_length: userPrompt.length,
    }),
  });
}
//@ chunk-4qbrxszq.js:3955-6503 fingerprint (2.1.88 match: addBetaLLMRequestAttributes, 0.795)
function addBetaLLMRequestAttributes(span, newContext, messagesForAPI, memoryKeys, tracer) {
  if (!isBetaTracingEnabled()) return;
  let state = betaTracingStateBySession.of(getRootSession());
  let redactWithKeys = (keySet) =>
    messagesForAPI !== undefined && memoryKeys === undefined
      ? {
          withheld: "account_memory_text_not_identified",
        }
      : redactWithIndex(memoryKeys ?? accountMemoryKeysForSession, newContext?.querySource, keySet);
  let redactPrompt = (userSystemPrompt) => {
    let promptHash = redactWithKeys((keySet_2) => applyRedactions(userSystemPrompt, keySet_2));
    return "withheld" in promptHash ? notRecordedReason(promptHash.withheld) : promptHash.value;
  };
  if (newContext?.systemPrompt) {
    let { systemPrompt } = newContext;
    let promptHash = hashSystemPrompt(systemPrompt);
    let redactedPrompt;
    let getRedactedPrompt = () =>
      (redactedPrompt ??= redactWithKeys((redact_3) => applyRedactions(systemPrompt, redact_3)));
    span.setAttribute("system_prompt_hash", promptHash);
    if (isUserPromptLoggingEnabled()) {
      let redactedPrompt_2 = getRedactedPrompt();
      span.setAttribute(
        "system_prompt_preview",
        "withheld" in redactedPrompt_2
          ? notRecordedReason(redactedPrompt_2.withheld)
          : redactedPrompt_2.value.slice(0, 500),
      );
    }
    span.setAttribute("system_prompt_length", newContext.systemPrompt.length);
    let previewResult = isUserPromptLoggingEnabled() ? getRedactedPrompt() : undefined;
    if (previewResult !== undefined && "value" in previewResult && !state.seenHashes.has(promptHash)) {
      state.seenHashes.add(promptHash);
      let { content: truncatedPrompt, truncated } = truncateContentForTelemetry(previewResult.value);
      logOTelEvent(
        "system_prompt",
        {
          system_prompt_hash: promptHash,
          system_prompt: truncatedPrompt,
          system_prompt_length: String(newContext.systemPrompt.length),
          ...(truncated && {
            system_prompt_truncated: "true",
          }),
        },
        tracer,
      );
    }
  }
  if (newContext?.userSystemPrompt && isUserPromptLoggingEnabled()) {
    let sessionId = getSessionId();
    if (state.emittedUserPromptForSessionId !== sessionId) {
      state.emittedUserPromptForSessionId = sessionId;
      let { content: truncatedPrompt, truncated } = truncateContentForTelemetry(
        redactPrompt(newContext.userSystemPrompt),
      );
      span.setAttributes({
        user_system_prompt: truncatedPrompt,
        ...(truncated && {
          user_system_prompt_truncated: true,
          user_system_prompt_original_length: newContext.userSystemPrompt.length,
        }),
      });
    }
  }
  if (newContext?.tools)
    try {
      let toolsWithHashes = jsonParse(newContext.tools).map((tool) => {
        let toolJson = jsonStringify(tool);
        let toolHash = shortHash(toolJson);
        return {
          name: typeof tool.name === "string" ? tool.name : "unknown",
          hash: toolHash,
          json: toolJson,
        };
      });
      span.setAttribute(
        "tools",
        jsonStringify(
          toolsWithHashes.map(({ name, hash }) => ({
            name,
            hash,
          })),
        ),
      );
      span.setAttribute("tools_count", toolsWithHashes.length);
      for (let { name, hash, json } of toolsWithHashes)
        if (!state.seenHashes.has(`tool_${hash}`)) {
          state.seenHashes.add(`tool_${hash}`);
          let { content: truncatedTool, truncated } = truncateContentForTelemetry(json);
          logOTelEvent(
            "tool",
            {
              tool_name: sanitizeToolNameForAnalytics(name),
              tool_hash: hash,
              tool: truncatedTool,
              ...(truncated && {
                tool_truncated: "true",
              }),
            },
            tracer,
          );
        }
    } catch {
      span.setAttribute("tools_parse_error", true);
    }
  if (messagesForAPI && messagesForAPI.length > 0 && newContext?.querySource) {
    let querySource = newContext.querySource;
    let lastHash = state.lastReportedMessage.get(querySource);
    let startIndex = 0;
    if (lastHash) {
      let message = messagesForAPI[lastHash.index];
      if (message && hashMessage(message) === lastHash.hash) startIndex = lastHash.index + 1;
    }
    let newMessages = messagesForAPI
      .slice(startIndex)
      .filter((m) => m.type === "user" || m.type === "api_system");
    if (newMessages.length > 0) {
      let logEnabled = isUserPromptLoggingEnabled();
      let formatted = logEnabled
        ? redactWithKeys((redact_4) =>
            formatMessagesForContext(redactToolUseIds(newMessages, messagesForAPI, redact_4), true),
          )
        : {
            value: formatMessagesForContext(newMessages, false),
          };
      let { contextParts, systemReminders } =
        "withheld" in formatted
          ? contextPartsFor(newMessages, notRecordedReason(formatted.withheld))
          : formatted.value;
      span.setAttribute("new_context_message_count", newMessages.length);
      if (systemReminders.length > 0) span.setAttribute("system_reminders_count", systemReminders.length);
      if (contextParts.length > 0 && logEnabled) {
        let fullContext = contextParts.join(`

---

`);
        let { content: truncatedContext, truncated } = truncateContentForTelemetry(fullContext);
        span.setAttributes({
          new_context: truncatedContext,
          ...(truncated && {
            new_context_truncated: true,
            new_context_original_length: fullContext.length,
          }),
        });
      }
      if (systemReminders.length > 0 && logEnabled) {
        let fullReminders = systemReminders.join(`

---

`);
        let { content: truncatedReminders, truncated: remindersTruncated } =
          truncateContentForTelemetry(fullReminders);
        span.setAttributes({
          system_reminders: truncatedReminders,
          ...(remindersTruncated && {
            system_reminders_truncated: true,
            system_reminders_original_length: fullReminders.length,
          }),
        });
      }
    }
    let lastIndex = messagesForAPI.length - 1;
    let message = messagesForAPI[lastIndex];
    if (message)
      state.lastReportedMessage.set(querySource, {
        index: lastIndex,
        hash: hashMessage(message),
      });
  }
}
//@ chunk-4qbrxszq.js:6503-6812 fingerprint (2.1.88 match: addBetaLLMResponseAttributes, 0.81)
function addBetaLLMResponseAttributes(endAttributes, metadata) {
  if (!isBetaTracingEnabled() || !isUserPromptLoggingEnabled() || !metadata) return;
  let redactOutput = (modelOutput) =>
    redactAccountMemoryText(metadata.accountMemoryKeys, metadata.querySource, modelOutput);
  if (metadata.modelOutput !== undefined) {
    let { content: modelOutput, truncated: outputTruncated } = truncateContentForTelemetry(
      redactOutput(metadata.modelOutput),
    );
    endAttributes["response.model_output"] = modelOutput;
    if (outputTruncated) {
      endAttributes["response.model_output_truncated"] = true;
      endAttributes["response.model_output_original_length"] = metadata.modelOutput.length;
    }
  }
}
//@ chunk-4qbrxszq.js:6812-7024 fingerprint (2.1.88 match: addBetaToolInputAttributes, 1)
function addBetaToolInputAttributes(span, toolName, toolInput, notRecorded = false) {
  if (!isBetaTracingEnabled() || !isToolDetailsLoggingEnabled()) return;
  let { content: truncatedInput, truncated } = truncateContentForTelemetry(`[TOOL INPUT: ${toolName}]
${notRecorded ? notRecordedLength(toolInput) : toolInput}`);
  span.setAttributes({
    tool_input: truncatedInput,
    ...(truncated && {
      tool_input_truncated: true,
      tool_input_original_length: toolInput.length,
    }),
  });
}
//@ chunk-4qbrxszq.js:7024-7225 fingerprint (2.1.88 match: addBetaToolResultAttributes, 1)
function addBetaToolResultAttributes(endAttributes, toolName, toolContent, notRecorded = false) {
  if (!isBetaTracingEnabled() || !isToolContentLoggingEnabled()) return;
  let { content: truncatedResult, truncated } = truncateContentForTelemetry(`[TOOL RESULT: ${toolName}]
${notRecorded ? notRecordedLength(toolContent) : toolContent}`);
  endAttributes.new_context = truncatedResult;
  if (truncated) {
    endAttributes.new_context_truncated = true;
    endAttributes.new_context_original_length = toolContent.length;
  }
}
//@ chunk-3bj63apf.js:16244-16399 fingerprint (2.1.88 match: truncateContent, 0.694)
function truncateContent(content, maxSize = MAX_HEADLINE_LENGTH_2) {
  let normalized = normalizeWhitespace(content);
  if (normalized.length <= maxSize)
    return {
      text: normalized,
      truncated: false,
    };
  let index = normalized.lastIndexOf(" ", maxSize - 1);
  let cutIndex = index >= maxSize / 2 ? index : maxSize - 1;
  return {
    text: truncateWithEllipsis(normalized, cutIndex + 1),
    truncated: true,
  };
}
export {
  isBetaTracingEnabled,
  truncateContent,
  addBetaInteractionAttributes,
  addBetaLLMRequestAttributes,
  addBetaLLMResponseAttributes,
  addBetaToolInputAttributes,
  addBetaToolResultAttributes,
  clearBetaTracingState,
};
