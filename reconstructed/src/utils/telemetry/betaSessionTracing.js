/**
 * utils/telemetry/betaSessionTracing.ts
 *
 * beta 详细追踪：ENABLE_BETA_TRACING_DETAILED + BETA_TRACING_ENDPOINT，给 span 附加提示词/响应/工具输入输出（带哈希与截断）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/betaSessionTracing.ts
 * pieces: chunk-a9ek44g8.js (17), chunk-spwda8nt.js (1)
 * attribution: placement 3, fingerprint 10, callgraph-witnessed 1, file-local 1, layout 3
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
  MAX_HEADLINE_LENGTH,
  normalizeWhitespace,
  truncateWithEllipsis,
} from "../../services/sessionStatus/sessionStateClassifier.js";

//@ chunk-a9ek44g8.js:2157-2250 placement
class it {
  seenHashes = new Set();
  lastReportedMessage = new Map();
  emittedUserPromptForSessionId = void 0;
}
//@ chunk-a9ek44g8.js:2250-2276 placement
var at = new SessionRootSlot(() => new it());
//@ chunk-a9ek44g8.js:2276-2359 placement
function Moi() {
  let of = at.of(getRootSession());
  (of.seenHashes.clear(), of.lastReportedMessage.clear());
}
/**
 * beta 追踪：ENABLE_BETA_TRACING_DETAILED 且设了 BETA_TRACING_ENDPOINT、非 diskless，并且非交互或 tengu_trace_lantern 开启。
 */
//@ chunk-a9ek44g8.js:2359-2510 fingerprint = isBetaTracingEnabled (0.764)
function isBetaTracingEnabled() {
  if (!(env.ENABLE_BETA_TRACING_DETAILED && Boolean(process.env.BETA_TRACING_ENDPOINT) && !isDiskless()))
    return !1;
  return getIsNonInteractiveSession() || getFeatureValue_CACHED_MAY_BE_STALE("tengu_trace_lantern", !1);
}
//@ chunk-a9ek44g8.js:2510-2580 callgraph-witnessed = shortHash (1)
function shortHash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}
//@ chunk-a9ek44g8.js:2580-2614 fingerprint = hashSystemPrompt (1)
function hashSystemPrompt(systemPrompt) {
  return `sp_${shortHash(systemPrompt)}`;
}
//@ chunk-a9ek44g8.js:2614-2676 fingerprint = hashMessage (1)
function hashMessage(message) {
  let content = jsonStringify(message.message.content);
  return `msg_${shortHash(content)}`;
}
//@ chunk-a9ek44g8.js:2676-2787 file-local
function extractSystemReminderContent(text) {
  return /^<system-reminder>\n?([\s\S]*?)\n?<\/system-reminder>$/.exec(text.trim())?.[1]?.trim() || null;
}
//@ chunk-a9ek44g8.js:2787-3403 fingerprint = formatMessagesForContext (0.893)
function formatMessagesForContext(n, e) {
  let r = [],
    s = [];
  for (let message of n) {
    if (message.type === "api_system") {
      s.push(message.message.content);
      continue;
    }
    let content = message.message.content;
    if (typeof content === "string") {
      let reminderContent = extractSystemReminderContent(content);
      if (reminderContent) s.push(reminderContent);
      else if (e)
        r.push(`[USER]
${content}`);
    } else if (Array.isArray(content)) {
      for (let block of content)
        if (block.type === "text") {
          let reminderContent = extractSystemReminderContent(block.text);
          if (reminderContent) s.push(reminderContent);
          else if (e)
            r.push(`[USER]
${block.text}`);
        } else if (block.type === "tool_result") {
          if (typeof block.content === "string") {
            let reminderContent = extractSystemReminderContent(block.content);
            if (reminderContent) s.push(reminderContent);
            else if (e)
              r.push(`[TOOL RESULT: ${block.tool_use_id}]
${block.content}`);
          } else if (e)
            r.push(`[TOOL RESULT: ${block.tool_use_id}]
${jsonStringify(block.content)}`);
        }
    }
  }
  return { contextParts: r, systemReminders: s };
}
//@ chunk-a9ek44g8.js:3403-3505 layout
function contextPartsFor(n, e) {
  let { systemReminders: systemReminders } = formatMessagesForContext(n, !1);
  return { contextParts: [e], systemReminders: systemReminders.map(() => e) };
}
//@ chunk-a9ek44g8.js:3505-3641 layout
function redactToolUseIds(n, e, r) {
  let s = collectToolUseIds(
    n.map((o) => o.message),
    r,
    e.map((o) => o.message),
  );
  return n.map((o, a) => (s[a] === o.message ? o : { ...o, message: s[a] }));
}
//@ chunk-a9ek44g8.js:3641-3666 layout
var Dt = () => accountMemoryRedactionKeys(getRootSession().host);
//@ chunk-a9ek44g8.js:3666-3889 fingerprint = addBetaInteractionAttributes (1)
function addBetaInteractionAttributes(span, userPrompt) {
  if (!isBetaTracingEnabled() || !isUserPromptLoggingEnabled()) return;
  let { content: truncatedPrompt, truncated: truncated } = truncateContentForTelemetry(`[USER PROMPT]
${redactAccountMemoryText(() => accountMemoryRedactionKeys(getRootSession().host), void 0, userPrompt)}`);
  span.setAttributes({
    new_context: truncatedPrompt,
    ...(truncated && { new_context_truncated: !0, new_context_original_length: userPrompt.length }),
  });
}
//@ chunk-a9ek44g8.js:3889-6437 fingerprint = addBetaLLMRequestAttributes (0.795)
function addBetaLLMRequestAttributes(n, e, r, s, o) {
  if (!isBetaTracingEnabled()) return;
  let of = at.of(getRootSession()),
    u = (f) =>
      r !== void 0 && s === void 0
        ? { withheld: "account_memory_text_not_identified" }
        : redactWithIndex(s ?? Dt, e?.querySource, f),
    h = (f) => {
      let promptHash = u((g) => applyRedactions(f, g));
      return "withheld" in promptHash ? notRecordedReason(promptHash.withheld) : promptHash.value;
    };
  if (e?.systemPrompt) {
    let { systemPrompt: systemPrompt } = e,
      p = hashSystemPrompt(systemPrompt),
      g,
      m = () => (g ??= u((d) => applyRedactions(systemPrompt, d)));
    if ((n.setAttribute("system_prompt_hash", p), isUserPromptLoggingEnabled())) {
      let d = m();
      n.setAttribute(
        "system_prompt_preview",
        "withheld" in d ? notRecordedReason(d.withheld) : d.value.slice(0, 500),
      );
    }
    n.setAttribute("system_prompt_length", e.systemPrompt.length);
    let b = isUserPromptLoggingEnabled() ? m() : void 0;
    if (b !== void 0 && "value" in b && !of.seenHashes.has(p)) {
      of.seenHashes.add(p);
      let { content: content, truncated: truncated } = truncateContentForTelemetry(b.value);
      logOTelEvent(
        "system_prompt",
        {
          system_prompt_hash: p,
          system_prompt: content,
          system_prompt_length: String(e.systemPrompt.length),
          ...(truncated && { system_prompt_truncated: "true" }),
        },
        o,
      );
    }
  }
  if (e?.userSystemPrompt && isUserPromptLoggingEnabled()) {
    let f = getSessionId();
    if (of.emittedUserPromptForSessionId !== f) {
      of.emittedUserPromptForSessionId = f;
      let { content: truncatedPrompt, truncated: truncated } = truncateContentForTelemetry(
        h(e.userSystemPrompt),
      );
      n.setAttributes({
        user_system_prompt: truncatedPrompt,
        ...(truncated && {
          user_system_prompt_truncated: !0,
          user_system_prompt_original_length: e.userSystemPrompt.length,
        }),
      });
    }
  }
  if (e?.tools)
    try {
      let toolsWithHashes = jsonParse(e.tools).map((tool) => {
        let toolJson = jsonStringify(tool),
          toolHash = shortHash(toolJson);
        return {
          name: typeof tool.name === "string" ? tool.name : "unknown",
          hash: toolHash,
          json: toolJson,
        };
      });
      (n.setAttribute(
        "tools",
        jsonStringify(toolsWithHashes.map(({ name: g, hash: hash }) => ({ name: g, hash: hash }))),
      ),
        n.setAttribute("tools_count", toolsWithHashes.length));
      for (let { name: name, hash: hash, json: json } of toolsWithHashes)
        if (!of.seenHashes.has(`tool_${hash}`)) {
          of.seenHashes.add(`tool_${hash}`);
          let { content: truncatedTool, truncated: truncated } = truncateContentForTelemetry(json);
          logOTelEvent(
            "tool",
            {
              tool_name: sanitizeToolNameForAnalytics(name),
              tool_hash: hash,
              tool: truncatedTool,
              ...(truncated && { tool_truncated: "true" }),
            },
            o,
          );
        }
    } catch {
      n.setAttribute("tools_parse_error", !0);
    }
  if (r && r.length > 0 && e?.querySource) {
    let querySource = e.querySource,
      lastHash = of.lastReportedMessage.get(querySource),
      g = 0;
    if (lastHash) {
      let S = r[lastHash.index];
      if (S && hashMessage(S) === lastHash.hash) g = lastHash.index + 1;
    }
    let newMessages = r.slice(g).filter((S) => S.type === "user" || S.type === "api_system");
    if (newMessages.length > 0) {
      let S = isUserPromptLoggingEnabled(),
        E = S
          ? u((M) => formatMessagesForContext(redactToolUseIds(newMessages, r, M), !0))
          : { value: formatMessagesForContext(newMessages, !1) },
        { contextParts: contextParts, systemReminders: systemReminders } =
          "withheld" in E ? contextPartsFor(newMessages, notRecordedReason(E.withheld)) : E.value;
      if ((n.setAttribute("new_context_message_count", newMessages.length), systemReminders.length > 0))
        n.setAttribute("system_reminders_count", systemReminders.length);
      if (contextParts.length > 0 && S) {
        let joined = contextParts.join(`

---

`),
          { content: truncatedContext, truncated: truncated } = truncateContentForTelemetry(joined);
        n.setAttributes({
          new_context: truncatedContext,
          ...(truncated && { new_context_truncated: !0, new_context_original_length: joined.length }),
        });
      }
      if (systemReminders.length > 0 && S) {
        let joined = systemReminders.join(`

---

`),
          { content: truncatedReminders, truncated: remindersTruncated } =
            truncateContentForTelemetry(joined);
        n.setAttributes({
          system_reminders: truncatedReminders,
          ...(remindersTruncated && {
            system_reminders_truncated: !0,
            system_reminders_original_length: joined.length,
          }),
        });
      }
    }
    let b = r.length - 1,
      d = r[b];
    if (d) of.lastReportedMessage.set(querySource, { index: b, hash: hashMessage(d) });
  }
}
//@ chunk-a9ek44g8.js:6437-6746 fingerprint = addBetaLLMResponseAttributes (0.81)
function addBetaLLMResponseAttributes(endAttributes, metadata) {
  if (!isBetaTracingEnabled() || !isUserPromptLoggingEnabled() || !metadata) return;
  let r = (s) => redactAccountMemoryText(metadata.accountMemoryKeys, metadata.querySource, s);
  if (metadata.modelOutput !== void 0) {
    let { content: modelOutput, truncated: outputTruncated } = truncateContentForTelemetry(
      r(metadata.modelOutput),
    );
    if (((endAttributes["response.model_output"] = modelOutput), outputTruncated))
      ((endAttributes["response.model_output_truncated"] = !0),
        (endAttributes["response.model_output_original_length"] = metadata.modelOutput.length));
  }
}
//@ chunk-a9ek44g8.js:6746-6958 fingerprint = addBetaToolInputAttributes (1)
function addBetaToolInputAttributes(n, e, r, s = !1) {
  if (!isBetaTracingEnabled() || !isToolDetailsLoggingEnabled()) return;
  let { content: truncatedInput, truncated: truncated } = truncateContentForTelemetry(`[TOOL INPUT: ${e}]
${s ? notRecordedLength(r) : r}`);
  n.setAttributes({
    tool_input: truncatedInput,
    ...(truncated && { tool_input_truncated: !0, tool_input_original_length: r.length }),
  });
}
//@ chunk-a9ek44g8.js:6958-7159 fingerprint = addBetaToolResultAttributes (1)
function addBetaToolResultAttributes(n, e, r, s = !1) {
  if (!isBetaTracingEnabled() || !isToolContentLoggingEnabled()) return;
  let { content: truncatedResult, truncated: truncated } = truncateContentForTelemetry(`[TOOL RESULT: ${e}]
${s ? notRecordedLength(r) : r}`);
  if (((n.new_context = truncatedResult), truncated))
    ((n.new_context_truncated = !0), (n.new_context_original_length = r.length));
}
//@ chunk-spwda8nt.js:16240-16395 fingerprint = truncateContent (0.693)
function truncateContent(content, maxSize = MAX_HEADLINE_LENGTH) {
  let t = normalizeWhitespace(content);
  if (t.length <= maxSize) return { text: t, truncated: !1 };
  let index = t.lastIndexOf(" ", maxSize - 1),
    i = index >= maxSize / 2 ? index : maxSize - 1;
  return { text: truncateWithEllipsis(t, i + 1), truncated: !0 };
}

export {
  isBetaTracingEnabled,
  addBetaInteractionAttributes,
  addBetaLLMRequestAttributes,
  addBetaLLMResponseAttributes,
  addBetaToolInputAttributes,
  addBetaToolResultAttributes,
  Moi,
  truncateContent,
};
