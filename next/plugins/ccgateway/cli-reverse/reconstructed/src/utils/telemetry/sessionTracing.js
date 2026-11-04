/**
 * utils/telemetry/sessionTracing.ts
 *
 * 会话追踪 span：claude_code.interaction / llm_request / tool / tool.execution / hook / subagent.spawn，属性脱敏与 gen_ai.* 语义。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/sessionTracing.ts
 * pieces: chunk-a9ek44g8.js (83), chunk-aepeg2w5.js (1)
 * attribution: placement 8, sole-consumer 12, fingerprint 15, layout 43, callgraph-fingerprint 1, file-local 4, callgraph-witnessed 1
 */
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
import { hasManagedPlugins } from "../plugins/managedPlugins.js";
import { logError } from "../log.js";
import { toError } from "../errors.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { hasLink } from "../hasLink.js";
import { isHookRegistrationPending } from "../plugins/loadPluginHooks.js";
import { isModuleAdmitted } from "../plugins/functionHooks/admission.js";
import { matchesSingleKeyFilter } from "../hooks/functionHookMatchers.js";
import { __toESM } from "../../../runtime/bun-runtime.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { env } from "../env.js";
import { perfettoRecorder, isPerfettoRecording } from "./perfettoTracing.js";
import { HostScoped } from "../hostScoped.js";
import {
  isBetaTracingEnabled,
  addBetaInteractionAttributes,
  addBetaLLMRequestAttributes,
  addBetaLLMResponseAttributes,
  addBetaToolInputAttributes,
  addBetaToolResultAttributes,
} from "./betaSessionTracing.js";
import { isTracesRelayed } from "./otlpRelay.js";
import {
  getSessionId,
  isCcsTenant,
  getRootSession,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import { getTelemetryAttributes } from "../telemetryAttributes.js";
import {
  getAPIProvider,
  assumesFirstPartyBaseUrl,
  isActualFirstPartyAnthropicBaseUrl,
} from "../model/providers.js";
import { HEARTHBOT, CLAUDE_CODE_REMOTE } from "../../services/mcp/ccrMetaMcp.js";
import { normalizeAgentQuerySource } from "../../services/api/requestHeaders.js";
import {
  activeOtelContext,
  otelContextManager,
  setHostOtelContext,
  getHostOtelContext,
} from "./messageContentAttributes.js";
import { isMainAgent, getWorkflowSpanAttributes } from "../agentContext.js";
import { relayedId } from "./repositoryAttributes.js";
import { redactAccountMemoryText, accountMemoryRedactionKeys } from "./accountMemoryRedaction.js";
import { stripAnyVersatileSuffix } from "../model/modelIds.js";
import { extractMcpToolDetails, isToolDetailsLoggingEnabled } from "../../services/analytics/metadata.js";
import { import_reject } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:857456-857516 fingerprint = isToolContentLoggingEnabled (1)
function isToolContentLoggingEnabled() {
  return isEnvTruthy(process.env.OTEL_LOG_TOOL_CONTENT);
}
//@ chunk-a9ek44g8.js:1088-1148 placement
/**
 * 是否有托管插件（出错按 true 处理）。
 */
function hasManagedPluginsSafe() {
  try {
    return hasManagedPlugins();
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-a9ek44g8.js:1148-1262 placement
function hasCommandRunHooks() {
  try {
    return getPluginRegistry().loadedModules.some(
      (loadedModule) => !hasLink(loadedModule) && loadedModule.hooks("command.run"),
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-a9ek44g8.js:1262-1503 placement
/**
 * 是否有影响提示提交的插件钩子（prompt.submit/session.append）。
 */
function hasPromptHooks(submitPath) {
  try {
    return (
      isHookRegistrationPending() ||
      hasCommandRunHooks() ||
      getPluginRegistry().loadedModules.some(
        (loadedModule) =>
          !hasLink(loadedModule) &&
          (loadedModule.hooks("prompt.submit") ||
            (loadedModule.hooks("session.append") &&
              !(
                submitPath === "queue-record" &&
                isModuleAdmitted(loadedModule) &&
                matchesSingleKeyFilter(loadedModule.matcherFor("session.append"), "door", "queue")
              ))),
      )
    );
  } catch (error) {
    logError(toError(error));
    return true;
  }
}
//@ chunk-a9ek44g8.js:1503-1539 placement
function isPromptHookObserved(submitPath) {
  return hasPromptHooks(submitPath) || hasManagedPluginsSafe();
}
//@ chunk-a9ek44g8.js:1539-1570 placement
var otelApi_4; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var otelCore_3;
deferInit("chunk-a9ek44g8.js:1539", () => {
  otelApi_4 = __toESM(require_api(), 1);
  otelCore_3 = __toESM(require_core(), 1);
});
//@ chunk-a9ek44g8.js:1607-1620 placement
var MAX_OTEL_CONTENT_CHARS = 61440;
//@ chunk-a9ek44g8.js:1620-1831 placement
function otelContentMaxLength() {
  return Math.min(
    env.CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH ?? MAX_OTEL_CONTENT_CHARS,
    env.OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT ?? 1 / 0,
    env.OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT ?? 1 / 0,
    env.OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT ?? 1 / 0,
  );
}
//@ chunk-a9ek44g8.js:1831-2113 placement
function truncateContentForTelemetry(text) {
  let maxLength = otelContentMaxLength();
  if (text.length <= maxLength)
    return {
      content: text,
      truncated: false,
    };
  let truncationNote = `

[TRUNCATED - Content exceeds ${maxLength >= 1024 ? `${Math.floor(maxLength / 1024)}KB` : `${maxLength} character`} limit]`;
  if (truncationNote.length >= maxLength)
    return {
      content: text.slice(0, maxLength),
      truncated: true,
    };
  return {
    content: text.slice(0, maxLength - truncationNote.length) + truncationNote,
    truncated: true,
  };
}
//@ chunk-a9ek44g8.js:7527-7599 sole-consumer
function perfettoStartLlmRequest(request) {
  let recorder = perfettoRecorder();
  if (!recorder) return "";
  return recorder.startLLMRequestSpan(request);
}
//@ chunk-a9ek44g8.js:7599-7668 sole-consumer
function endPerfettoLlmSpan(perfettoSpanId, metadata) {
  let recorder = perfettoRecorder();
  if (!recorder || !perfettoSpanId) return;
  recorder.endLLMRequestSpan(perfettoSpanId, metadata);
}
//@ chunk-a9ek44g8.js:7668-7738 sole-consumer
function startPerfettoToolSpan(toolName, metadata) {
  let recorder = perfettoRecorder();
  if (!recorder) return "";
  return recorder.startToolSpan(toolName, metadata);
}
//@ chunk-a9ek44g8.js:7738-7801 sole-consumer
function endPerfettoToolSpan(perfettoSpanId, metadata) {
  let recorder = perfettoRecorder();
  if (!recorder || !perfettoSpanId) return;
  recorder.endToolSpan(perfettoSpanId, metadata);
}
//@ chunk-a9ek44g8.js:7801-7872 sole-consumer
function startPerfettoUserInputSpan(input) {
  let recorder = perfettoRecorder();
  if (!recorder) return "";
  return recorder.startUserInputSpan(input);
}
//@ chunk-a9ek44g8.js:7872-7940 sole-consumer
function endPerfettoUserInputSpan(perfettoSpanId, metadata) {
  let recorder = perfettoRecorder();
  if (!recorder || !perfettoSpanId) return;
  recorder.endUserInputSpan(perfettoSpanId, metadata);
}
//@ chunk-a9ek44g8.js:7940-8003 sole-consumer
function perfettoEmitInstant(name, categories, attributes) {
  let recorder = perfettoRecorder();
  if (!recorder) return;
  recorder.emitInstant(name, categories, attributes);
}
//@ chunk-a9ek44g8.js:8003-8076 sole-consumer
function startPerfettoInteractionSpan(prompt) {
  let recorder = perfettoRecorder();
  if (!recorder) return "";
  return recorder.startInteractionSpan(prompt);
}
//@ chunk-a9ek44g8.js:8076-8142 sole-consumer
function endPerfettoInteractionSpan(perfettoSpanId) {
  let recorder = perfettoRecorder();
  if (!recorder || !perfettoSpanId) return;
  recorder.endInteractionSpan(perfettoSpanId);
}
//@ chunk-a9ek44g8.js:8142-8418 sole-consumer
/**
 * 会话追踪的 OTel 上下文键：cc.interaction_state、cc.tool_state、cc.blocked_state、cc.execution_state、cc.subagent_state、cc.turn_trace_contexts。
 */
var spanAttributesByContext; // deferred: uses otelApi_4 of its import cycle while loading; runs once the cycle is complete
var INTERACTION_STATE_KEY;
var TOOL_STATE_KEY;
var BLOCKED_STATE_KEY;
var EXECUTION_STATE_KEY;
var SUBAGENT_STATE_KEY;
var TURN_TRACE_CONTEXTS_KEY;
deferInit("chunk-a9ek44g8.js:8142", () => {
  spanAttributesByContext = new WeakMap();
  INTERACTION_STATE_KEY = otelApi_4.createContextKey("cc.interaction_state");
  TOOL_STATE_KEY = otelApi_4.createContextKey("cc.tool_state");
  BLOCKED_STATE_KEY = otelApi_4.createContextKey("cc.blocked_state");
  EXECUTION_STATE_KEY = otelApi_4.createContextKey("cc.execution_state");
  SUBAGENT_STATE_KEY = otelApi_4.createContextKey("cc.subagent_state");
  TURN_TRACE_CONTEXTS_KEY = otelApi_4.createContextKey("cc.turn_trace_contexts");
});
//@ chunk-a9ek44g8.js:8418-8442 sole-consumer
class InteractionSequenceState {
  lastSequence = 0;
}
//@ chunk-a9ek44g8.js:8442-8467 sole-consumer
var interactionSequenceByHost; // deferred: uses InteractionSequenceState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a9ek44g8.js:8442", () => {
  interactionSequenceByHost = new HostScoped(() => new InteractionSequenceState());
});
//@ chunk-a9ek44g8.js:8467-8625 fingerprint = isEnhancedTelemetryEnabled (0.624)
/**
 * CLAUDE_CODE_ENHANCED_TELEMETRY_BETA（或 ENABLE_ENHANCED_TELEMETRY_BETA）为真时启用会话追踪 span。
 */
function isEnhancedTelemetryEnabled() {
  let env = process.env.CLAUDE_CODE_ENHANCED_TELEMETRY_BETA ?? process.env.ENABLE_ENHANCED_TELEMETRY_BETA;
  if (isEnvTruthy(env)) return true;
  if (isEnvDefinedFalsy(env)) return false;
  return false;
}
//@ chunk-a9ek44g8.js:8625-8658 layout
/**
 * 会话追踪是否启用：增强遥测或 beta 追踪任一开启。
 */
function isSessionTracingEnabled() {
  return isEnhancedTelemetryEnabled() || isBetaTracingEnabled();
}
//@ chunk-a9ek44g8.js:8658-8682 layout
function isPerfettoTracingEnabled() {
  return false;
}
//@ chunk-a9ek44g8.js:8682-8707 layout
/**
 * 已弃用的工具执行 span 结束空实现。
 */
function noopEndToolExecutionSpan(span, error) {
  return;
}
//@ chunk-a9ek44g8.js:8707-8743 layout
function setSpanError(span, error) {
  span.setStatus(buildErrorSpanStatus(error));
}
//@ chunk-a9ek44g8.js:8743-8845 layout
function setToolUseIdAttributes(span, toolUseId) {
  if (!toolUseId) return;
  span.setAttribute("tool_use_id", toolUseId);
  span.setAttribute("gen_ai.tool.call.id", toolUseId);
}
//@ chunk-a9ek44g8.js:8845-9062 layout
/**
 * 把 API 提供方映射成 gen_ai.provider.name（aws.bedrock、gcp.vertex_ai、anthropic）。
 */
function getGenAiProviderName(apiProvider) {
  switch (apiProvider) {
    case "bedrock":
    case "mantle":
      return "aws.bedrock";
    case "vertex":
      return "gcp.vertex_ai";
    case "firstParty":
    case "anthropicAws":
    case "anthropicGoogleCloud":
    case "foundry":
    case "gateway":
      return "anthropic";
  }
}
//@ chunk-a9ek44g8.js:9062-9089 layout
function isTracingRedacted() {
  return isTracesRelayed();
}
//@ chunk-a9ek44g8.js:9089-9243 layout
function getRedactedSessionAttributes() {
  let attributes = {};
  let sessionId = getSessionId();
  if (SAFE_ATTRIBUTE_VALUE_RE.test(sessionId)) attributes["session.id"] = sessionId;
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (
    CLAUDE_CODE_REMOTE_SESSION_ID !== undefined &&
    SAFE_ATTRIBUTE_VALUE_RE.test(CLAUDE_CODE_REMOTE_SESSION_ID)
  )
    attributes["ccr.session.id"] = CLAUDE_CODE_REMOTE_SESSION_ID;
  return attributes;
}
//@ chunk-a9ek44g8.js:9243-9316 layout
function getSpanBaseAttributes() {
  return {
    ...(isTracingRedacted() ? getRedactedSessionAttributes() : getTelemetryAttributes()),
    "gen_ai.provider.name": getGenAiProviderName(getAPIProvider()),
  };
}
//@ chunk-a9ek44g8.js:9316-9493 layout
var SPAN_SAFE_ATTRIBUTE_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_ATTRIBUTE_VALUE_RE;
var ATTRIBUTE_VALUE_PATTERNS;
deferInit("chunk-a9ek44g8.js:9316", () => {
  SPAN_SAFE_ATTRIBUTE_NAMES = new Set(["rpc.service", "mcp_tool"]);
  SAFE_ATTRIBUTE_VALUE_RE = /^[A-Za-z0-9_.-]{1,64}$/;
  ATTRIBUTE_VALUE_PATTERNS = {
    [HEARTHBOT]: /^[a-z][a-z0-9_]{0,39}$/,
    [CLAUDE_CODE_REMOTE]: /^[A-Za-z][A-Za-z0-9_]{0,39}$/,
    playwright: /^browser_[a-z_]{1,40}$/,
  };
});
//@ chunk-a9ek44g8.js:9493-9718 layout
/**
 * span 中的工具名脱敏：只放行白名单内的 MCP 工具名，其余 MCP 记 mcp_other，带 __ 的记 other。
 */
function sanitizeToolNameForSpan(toolName) {
  if (toolName.startsWith("mcp__")) {
    let [, serverName, ...restParts] = toolName.split("__");
    let pattern =
      serverName !== undefined && Object.hasOwn(ATTRIBUTE_VALUE_PATTERNS, serverName)
        ? ATTRIBUTE_VALUE_PATTERNS[serverName]
        : undefined;
    return pattern !== undefined &&
      pattern.test(restParts.join("__")) &&
      SAFE_ATTRIBUTE_VALUE_RE.test(toolName)
      ? toolName
      : "mcp_other";
  }
  return !toolName.includes("__") && SAFE_ATTRIBUTE_VALUE_RE.test(toolName) ? toolName : "other";
}
//@ chunk-a9ek44g8.js:9718-9805 layout
function safeQuerySourceName(querySource) {
  let replaced = normalizeAgentQuerySource(querySource)?.replaceAll(":", ".");
  return replaced !== undefined && SAFE_ATTRIBUTE_VALUE_RE.test(replaced) ? replaced : undefined;
}
//@ chunk-a9ek44g8.js:9805-9843 layout
var ERROR_CLASS_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,47}$/;
//@ chunk-a9ek44g8.js:9843-9982 layout
function buildSpanErrorAttributes(error, errorClass) {
  let replaced = errorClass?.replace(/[^A-Za-z0-9_]/g, "_");
  return {
    ...(error !== undefined &&
      !isTracingRedacted() && {
        error,
      }),
    ...(replaced !== undefined &&
      ERROR_CLASS_PATTERN.test(replaced) && {
        error_class: replaced,
      }),
  };
}
//@ chunk-a9ek44g8.js:9982-10063 layout
function describeErrorWithoutText(error) {
  return `${error.name} (${error.message.length} chars; text not recorded)`;
}
//@ chunk-a9ek44g8.js:10063-10138 layout
function buildErrorSpanStatus(error) {
  return {
    code: otelApi_4.SpanStatusCode.ERROR,
    ...(error &&
      !isTracingRedacted() && {
        message: error,
      }),
  };
}
//@ chunk-a9ek44g8.js:10138-10221 fingerprint = getTracer (0.932)
function getTracer() {
  return otelApi_4.trace.getTracer("com.anthropic.claude_code.tracing", "1.0.0");
}
//@ chunk-a9ek44g8.js:10221-10247 layout
function getActiveContext() {
  return activeOtelContext();
}
//@ chunk-a9ek44g8.js:10247-10311 layout
function getLiveSpanState(stateKey) {
  let state = getActiveContext().getValue(stateKey);
  return state && !state.ended ? state : undefined;
}
//@ chunk-a9ek44g8.js:10311-10435 callgraph-fingerprint = ensureCleanupInterval (0.174)
function ensureCleanupInterval(stateKey, spanState) {
  spanAttributesByContext.set(spanState.span, spanState);
  let nextContext = otelApi_4.trace
    .setSpan(spanState.priorContext, spanState.span)
    .setValue(stateKey, spanState);
  otelContextManager.enterWith(nextContext);
  if (stateKey === INTERACTION_STATE_KEY) setHostOtelContext(nextContext);
}
//@ chunk-a9ek44g8.js:10435-10560 layout
function endSpanState(stateKey, spanState) {
  spanState.ended = true;
  if (stateKey === INTERACTION_STATE_KEY && getHostOtelContext()?.getValue(stateKey) === spanState)
    setHostOtelContext(undefined);
  if (getActiveContext().getValue(stateKey) === spanState)
    otelContextManager.enterWith(spanState.priorContext);
}
//@ chunk-a9ek44g8.js:10560-10614 fingerprint = createSpanAttributes (1)
function createSpanAttributes(spanType, customAttributes = {}) {
  return {
    ...getSpanBaseAttributes(),
    "span.type": spanType,
    ...customAttributes,
  };
}
//@ chunk-a9ek44g8.js:10614-10767 layout
function queuedSendLinks(traceContexts) {
  if (!traceContexts) return [];
  return traceContexts.linked.flatMap(({ traceparent }) => {
    let traceparent_2 = parseTraceparent(traceparent);
    return traceparent_2
      ? [
          {
            context: traceparent_2,
            attributes: {
              "link.type": "queued_send",
            },
          },
        ]
      : [];
  });
}
//@ chunk-a9ek44g8.js:10767-10805 layout
function getTurnTraceContexts() {
  return getActiveContext().getValue(TURN_TRACE_CONTEXTS_KEY);
}
//@ chunk-a9ek44g8.js:10805-10842 layout
/**
 * 取当前回合的追踪上下文数组。
 */
function turnTraceContextsOf() {
  return getTurnTraceContexts()?.contexts;
}
//@ chunk-a9ek44g8.js:10842-10978 layout
function getUpstreamTraceparent() {
  let turnTraceContexts = getTurnTraceContexts();
  return isCcsTenant() &&
    getAPIProvider() === "firstParty" &&
    assumesFirstPartyBaseUrl() &&
    !isActualFirstPartyAnthropicBaseUrl()
    ? (turnTraceContexts?.contexts?.parent?.traceparent ?? turnTraceContexts?.fallbackTraceparent)
    : undefined;
}
//@ chunk-a9ek44g8.js:10978-11027 layout
/**
 * 清空当前回合追踪上下文。
 */
function clearTurnTraceContexts() {
  let turnTraceContexts = getTurnTraceContexts();
  if (turnTraceContexts) turnTraceContexts.contexts = undefined;
}
//@ chunk-a9ek44g8.js:11027-11259 layout
function setAgentIdAttributes(span, agentContext) {
  if (isMainAgent(agentContext)) return;
  let agentId = agentContext.agentId !== undefined ? relayedId(agentContext.agentId) : undefined;
  if (agentId !== undefined) span.setAttribute("agent_id", agentId);
  let parentAgentId =
    agentContext.parentAgentId !== undefined ? relayedId(agentContext.parentAgentId) : undefined;
  if (parentAgentId !== undefined) span.setAttribute("parent_agent_id", parentAgentId);
}
//@ chunk-a9ek44g8.js:11259-11337 layout
function getMainConversationIdAttributes() {
  let sessionId = getSessionId();
  return !isTracingRedacted() || SAFE_ATTRIBUTE_VALUE_RE.test(sessionId)
    ? {
        "gen_ai.conversation.id": sessionId,
      }
    : {};
}
//@ chunk-a9ek44g8.js:11337-11535 layout
function getConversationIdAttributes(agentContext) {
  switch (agentContext.agentType) {
    case "main":
      return getMainConversationIdAttributes();
    case "subagent": {
      if (agentContext.isMainSession) return getMainConversationIdAttributes();
      let agentId = relayedId(agentContext.agentId);
      return agentId !== undefined
        ? {
            "gen_ai.conversation.id": agentId,
          }
        : {};
    }
    case "teammate":
      return {};
  }
}
//@ chunk-a9ek44g8.js:11535-12593 fingerprint = startInteractionSpan (0.527)
/**
 * 开始一次用户交互的 claude_code.interaction span。
 */
function startInteractionSpan(prompt, traceContexts) {
  let perfettoSpanId = isPerfettoRecording() ? startPerfettoInteractionSpan(prompt) : undefined;
  let activeContext = getActiveContext();
  if (!isSessionTracingEnabled()) {
    if (perfettoSpanId) {
      let dummySpan = otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
      ensureCleanupInterval(INTERACTION_STATE_KEY, {
        span: dummySpan,
        startTime: performance.now(),
        attributes: {
          "span.type": "interaction",
        },
        perfettoSpanId,
        priorContext: activeContext,
      });
      return dummySpan;
    }
    return otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
  }
  let tracer = getTracer();
  let tracer_2 = isPromptHookObserved();
  let promptToLog = tracer_2 ? "<REDACTED>" : redactIfDisabled(prompt);
  let sequence = ++interactionSequenceByHost.of(getRootSession().host).lastSequence;
  let attributes = createSpanAttributes("interaction", {
    "gen_ai.operation.name": "invoke_agent",
    ...getMainConversationIdAttributes(),
    user_prompt: promptToLog,
    user_prompt_length: tracer_2 ? 0 : prompt.length,
    "interaction.sequence": sequence,
  });
  let redactedContexts = isTracingRedacted() ? traceContexts : undefined;
  let eventContext = redactedContexts?.parent
    ? traceContextPropagator.extract(
        activeContext,
        {
          traceparent: redactedContexts.parent.traceparent,
        },
        otelApi_4.defaultTextMapGetter,
      )
    : activeContext;
  let envContext =
    eventContext === activeContext && getIsNonInteractiveSession() && env.TRACEPARENT
      ? otelApi_4.propagation.extract(activeContext, {
          traceparent: env.TRACEPARENT,
          tracestate: env.TRACESTATE,
        })
      : activeContext;
  let parentContext = eventContext !== activeContext ? eventContext : envContext;
  attributes["parent.source"] =
    eventContext !== activeContext ? "event" : envContext !== activeContext ? "env" : "none";
  let spanId = queuedSendLinks(redactedContexts);
  attributes.queued_sends = spanId.length;
  let span = tracer.startSpan(
    "claude_code.interaction",
    {
      attributes,
      links: spanId,
    },
    parentContext,
  );
  if (!isTracingRedacted() && !tracer_2) addBetaInteractionAttributes(span, prompt);
  ensureCleanupInterval(INTERACTION_STATE_KEY, {
    span,
    startTime: performance.now(),
    attributes,
    perfettoSpanId,
    priorContext: activeContext,
    promptHandle: Symbol("interaction prompt"),
    isPromptHeld: tracer_2,
  });
  return span;
}
//@ chunk-a9ek44g8.js:12593-12691 layout = redactIfDisabled (0.778)
function redactIfDisabled(content) {
  return env.OTEL_LOG_USER_PROMPTS && !isTracingRedacted()
    ? redactAccountMemoryText(() => accountMemoryRedactionKeys(getRootSession().host), undefined, content)
    : "<REDACTED>";
}
//@ chunk-a9ek44g8.js:12691-12732 layout
/**
 * 取当前交互 span 的提示句柄。
 */
function currentPromptHandle() {
  return getLiveSpanState(INTERACTION_STATE_KEY)?.promptHandle;
}
//@ chunk-a9ek44g8.js:12732-12992 file-local
function getCurrentSpan(prompt, previousContent, content) {
  let liveSpanState = getLiveSpanState(INTERACTION_STATE_KEY);
  if (
    prompt === undefined ||
    liveSpanState?.promptHandle !== prompt ||
    (liveSpanState.isPromptHeld !== true && content === previousContent)
  )
    return;
  liveSpanState.isPromptHeld = content === undefined;
  liveSpanState.span.setAttributes({
    user_prompt: content === undefined ? "<REDACTED>" : redactIfDisabled(content),
    user_prompt_length: content?.length ?? 0,
  });
  if (!isTracingRedacted()) addBetaInteractionAttributes(liveSpanState.span, content ?? "<REDACTED>");
}
//@ chunk-a9ek44g8.js:12992-13169 layout
function withInteractionSpan(prompt, contextsOrHandler, handler) {
  let [contexts, handler_2] =
    typeof contextsOrHandler === "function" ? [undefined, contextsOrHandler] : [contextsOrHandler, handler];
  return withTurnTraceContexts(contexts, () => {
    let activeContext = getActiveContext();
    startInteractionSpan(prompt, contexts);
    let activeContext_2 = getActiveContext();
    try {
      return otelContextManager.with(activeContext_2, handler_2);
    } finally {
      if (getActiveContext() === activeContext_2) otelContextManager.enterWith(activeContext);
    }
  });
}
//@ chunk-a9ek44g8.js:13169-13267 layout
function withTurnTraceContexts(contexts, handler, fallbackTraceparent) {
  let traceState = {
    contexts,
    fallbackTraceparent,
  };
  return otelContextManager.with(getActiveContext().setValue(TURN_TRACE_CONTEXTS_KEY, traceState), handler);
}
//@ chunk-a9ek44g8.js:13267-13503 fingerprint = endInteractionSpan (0.841)
function endInteractionSpan() {
  let spanContext = getLiveSpanState(INTERACTION_STATE_KEY);
  if (!spanContext) return;
  if (spanContext.perfettoSpanId) endPerfettoInteractionSpan(spanContext.perfettoSpanId);
  if (!isSessionTracingEnabled()) {
    endSpanState(INTERACTION_STATE_KEY, spanContext);
    return;
  }
  let duration = Math.max(0, Math.round(performance.now() - spanContext.startTime));
  spanContext.span.setAttributes({
    "interaction.duration_ms": duration,
  });
  spanContext.span.end();
  endSpanState(INTERACTION_STATE_KEY, spanContext);
}
//@ chunk-a9ek44g8.js:13503-14459 fingerprint = startLLMRequestSpan (0.751)
function startLLMRequestSpan(
  model,
  agentContext,
  newContext,
  messagesForAPI,
  isFast,
  querySource,
  accountMemoryKeys,
) {
  let perfettoSpanId = isPerfettoRecording()
    ? perfettoStartLlmRequest({
        model,
        querySource: querySource ?? newContext?.querySource,
        messageId: undefined,
      })
    : undefined;
  let activeContext = getActiveContext();
  if (!isSessionTracingEnabled()) {
    if (perfettoSpanId) {
      let dummySpan = otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
      spanAttributesByContext.set(dummySpan, {
        span: dummySpan,
        startTime: performance.now(),
        attributes: {
          model,
        },
        perfettoSpanId,
        priorContext: activeContext,
      });
      return dummySpan;
    }
    return otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
  }
  let tracer = getTracer();
  let toolSpanState = getActiveContext().getValue(TOOL_STATE_KEY);
  let modelForSpan = isTracingRedacted() ? stripAnyVersatileSuffix(model) : model;
  let attributes = createSpanAttributes("llm_request", {
    model: modelForSpan,
    "gen_ai.system": "anthropic",
    "gen_ai.request.model": modelForSpan,
    "llm_request.context": toolSpanState
      ? "tool"
      : getLiveSpanState(INTERACTION_STATE_KEY)
        ? "interaction"
        : "standalone",
    speed: isFast ? "fast" : "normal",
    ...(agentContext && getConversationIdAttributes(agentContext)),
  });
  let span = tracer.startSpan(
    "claude_code.llm_request",
    {
      attributes,
    },
    activeContext,
  );
  if (newContext?.querySource && !isTracingRedacted())
    span.setAttribute("query_source", newContext.querySource);
  let spanId = safeQuerySourceName(querySource ?? newContext?.querySource);
  if (spanId !== undefined) span.setAttribute("query_source_safe", spanId);
  if (agentContext && !isMainAgent(agentContext)) {
    setAgentIdAttributes(span, agentContext);
    if (!isTracingRedacted()) span.setAttributes(getWorkflowSpanAttributes(agentContext));
  }
  if (!isTracingRedacted())
    addBetaLLMRequestAttributes(span, newContext, messagesForAPI, accountMemoryKeys, agentContext);
  spanAttributesByContext.set(span, {
    span,
    startTime: performance.now(),
    attributes,
    perfettoSpanId,
    priorContext: activeContext,
  });
  return span;
}
//@ chunk-a9ek44g8.js:14459-14643 layout
function recordLlmRequestAttempt(span, { attempt, clientRequestId }) {
  let eventAttributes = {
    attempt,
  };
  if (clientRequestId !== undefined) eventAttributes.client_request_id = clientRequestId;
  if (span && isSessionTracingEnabled()) span.addEvent("gen_ai.request.attempt", eventAttributes);
  perfettoEmitInstant("LLM Attempt", "api,attempt", eventAttributes);
}
//@ chunk-a9ek44g8.js:14643-14682 layout
var traceContextPropagator; // deferred: uses otelApi_4 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a9ek44g8.js:14643", () => {
  traceContextPropagator = new otelCore_3.W3CTraceContextPropagator();
});
//@ chunk-a9ek44g8.js:14682-14801 layout
/**
 * 解析 W3C traceparent 字符串为 SpanContext。
 */
function parseTraceparent(traceparent) {
  let traceContext = traceContextPropagator.extract(
    otelApi_4.ROOT_CONTEXT,
    {
      traceparent,
    },
    otelApi_4.defaultTextMapGetter,
  );
  return otelApi_4.trace.getSpanContext(traceContext);
}
//@ chunk-a9ek44g8.js:14801-16622 fingerprint = endLLMRequestSpan (0.561)
function endLLMRequestSpan(span, metadata) {
  if (!span) return;
  let spanState = spanAttributesByContext.get(span);
  if (!spanState || spanState.ended) return;
  spanState.ended = true;
  let max = Math.max(0, Math.round(performance.now() - spanState.startTime));
  if (metadata?.error !== undefined)
    metadata = {
      ...metadata,
      error: redactAccountMemoryText(
        metadata.accountMemoryKeys ?? (() => accountMemoryRedactionKeys(getRootSession().host)),
        metadata.querySource,
        metadata.error,
      ),
    };
  if (spanState.perfettoSpanId)
    endPerfettoLlmSpan(spanState.perfettoSpanId, {
      ttftMs: metadata?.ttftMs,
      ttltMs: max,
      promptTokens: metadata?.inputTokens,
      outputTokens: metadata?.outputTokens,
      cacheReadTokens: metadata?.cacheReadTokens,
      cacheCreationTokens: metadata?.cacheCreationTokens,
      success: metadata?.success,
      error: metadata?.error,
      requestSetupMs: metadata?.requestSetupMs,
      attemptStartTimes: metadata?.attemptStartTimes,
      requestId: metadata?.requestId,
      clientRequestId: metadata?.clientRequestId,
    });
  if (!isSessionTracingEnabled()) return;
  let endAttributes = {
    duration_ms: max,
  };
  if (metadata) {
    if (metadata.inputTokens !== undefined) endAttributes.input_tokens = metadata.inputTokens;
    if (metadata.outputTokens !== undefined) endAttributes.output_tokens = metadata.outputTokens;
    if (metadata.cacheReadTokens !== undefined) endAttributes.cache_read_tokens = metadata.cacheReadTokens;
    if (metadata.cacheCreationTokens !== undefined)
      endAttributes.cache_creation_tokens = metadata.cacheCreationTokens;
    if (metadata.success !== undefined) endAttributes.success = metadata.success;
    if (metadata.statusCode !== undefined) endAttributes.status_code = metadata.statusCode;
    Object.assign(endAttributes, buildSpanErrorAttributes(metadata.error, metadata.errorClass));
    if (metadata.attempt !== undefined) endAttributes.attempt = metadata.attempt;
    if (metadata.hasToolCall !== undefined) endAttributes["response.has_tool_call"] = metadata.hasToolCall;
    if (metadata.requestId !== undefined) {
      endAttributes.request_id = metadata.requestId;
      endAttributes["gen_ai.response.id"] = metadata.requestId;
    }
    if (metadata.clientRequestId !== undefined) endAttributes.client_request_id = metadata.clientRequestId;
    if (metadata.ttftMs !== undefined) endAttributes.ttft_ms = metadata.ttftMs;
    if (metadata.firstContentMs !== undefined) endAttributes.first_content_ms = metadata.firstContentMs;
    if (metadata.effort !== undefined) endAttributes.effort = metadata.effort;
    if (!isTracingRedacted()) addBetaLLMResponseAttributes(endAttributes, metadata);
  }
  spanState.span.setAttributes(endAttributes);
  if (metadata?.stopReason !== undefined) {
    spanState.span.setAttribute("stop_reason", metadata.stopReason);
    spanState.span.setAttribute("gen_ai.response.finish_reasons", [metadata.stopReason]);
  }
  if (metadata?.success === false) spanState.span.setStatus(buildErrorSpanStatus(metadata.error));
  if (metadata?.traceresponse) {
    let spanId = parseTraceparent(metadata.traceresponse);
    if (spanId)
      spanState.span.addLink({
        context: spanId,
        attributes: {
          "link.type": "parent_of",
        },
      });
  }
  spanState.span.end();
}
//@ chunk-a9ek44g8.js:16622-17392 fingerprint = startToolSpan (0.573)
function startToolSpan(toolName, agentContext, extraAttributes, toolInput, toolUseId, notRecorded = false) {
  let perfettoSpanId = isPerfettoRecording() ? startPerfettoToolSpan(toolName, extraAttributes) : undefined;
  let activeContext = getActiveContext();
  if (!isSessionTracingEnabled()) {
    if (perfettoSpanId) {
      let dummySpan = otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
      ensureCleanupInterval(TOOL_STATE_KEY, {
        span: dummySpan,
        startTime: performance.now(),
        attributes: {
          "span.type": "tool",
          tool_name: toolName,
        },
        perfettoSpanId,
        priorContext: activeContext,
      });
      return dummySpan;
    }
    return otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
  }
  let tracer = getTracer();
  let spanId = sanitizeToolNameForSpan(toolName);
  let toolNameForSpan = isTracingRedacted() ? spanId : toolName;
  let mcpToolDetails = extractMcpToolDetails(toolNameForSpan);
  let attributes = createSpanAttributes("tool", {
    tool_name: toolNameForSpan,
    tool_name_safe: spanId,
    "gen_ai.operation.name": "execute_tool",
    "gen_ai.tool.name": mcpToolDetails?.mcpToolName ?? toolNameForSpan,
    ...(mcpToolDetails && {
      "anthropic.mcp.server.name": mcpToolDetails.serverName,
    }),
    ...(agentContext && getConversationIdAttributes(agentContext)),
    ...extraAttributes,
  });
  let span = tracer.startSpan(
    "claude_code.tool",
    {
      attributes,
    },
    activeContext,
  );
  if (agentContext && !isMainAgent(agentContext)) {
    setAgentIdAttributes(span, agentContext);
    if (!isTracingRedacted()) span.setAttributes(getWorkflowSpanAttributes(agentContext));
  }
  setToolUseIdAttributes(span, toolUseId);
  if (toolInput && !isTracingRedacted()) addBetaToolInputAttributes(span, toolName, toolInput, notRecorded);
  ensureCleanupInterval(TOOL_STATE_KEY, {
    span,
    startTime: performance.now(),
    attributes,
    perfettoSpanId,
    priorContext: activeContext,
  });
  return span;
}
//@ chunk-a9ek44g8.js:17392-17917 fingerprint = startToolBlockedOnUserSpan (0.886)
function startToolBlockedOnUserSpan(agentContext) {
  let perfettoSpanId = isPerfettoRecording() ? startPerfettoUserInputSpan("tool_permission") : undefined;
  let activeContext = getActiveContext();
  if (!isSessionTracingEnabled()) {
    if (perfettoSpanId) {
      let dummySpan = otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
      ensureCleanupInterval(BLOCKED_STATE_KEY, {
        span: dummySpan,
        startTime: performance.now(),
        attributes: {
          "span.type": "tool.blocked_on_user",
        },
        perfettoSpanId,
        priorContext: activeContext,
      });
      return dummySpan;
    }
    return otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
  }
  let tracer = getTracer();
  let attributes = createSpanAttributes("tool.blocked_on_user", getConversationIdAttributes(agentContext));
  let span = tracer.startSpan(
    "claude_code.tool.blocked_on_user",
    {
      attributes,
    },
    activeContext,
  );
  ensureCleanupInterval(BLOCKED_STATE_KEY, {
    span,
    startTime: performance.now(),
    attributes,
    perfettoSpanId,
    priorContext: activeContext,
  });
  return span;
}
//@ chunk-a9ek44g8.js:17917-18198 file-local
function endToolBlockedOnUserSpan(decision, source) {
  let blockedSpanContext = getLiveSpanState(BLOCKED_STATE_KEY);
  if (!blockedSpanContext) return;
  if (blockedSpanContext.perfettoSpanId)
    endPerfettoUserInputSpan(blockedSpanContext.perfettoSpanId, {
      decision,
      source,
    });
  if (!isSessionTracingEnabled()) {
    endSpanState(BLOCKED_STATE_KEY, blockedSpanContext);
    return;
  }
  let attributes = {
    duration_ms: Math.max(0, Math.round(performance.now() - blockedSpanContext.startTime)),
  };
  if (decision) attributes.decision = decision;
  if (source) attributes.source = source;
  blockedSpanContext.span.setAttributes(attributes);
  blockedSpanContext.span.end();
  endSpanState(BLOCKED_STATE_KEY, blockedSpanContext);
}
//@ chunk-a9ek44g8.js:18198-18475 fingerprint = startToolExecutionSpan (0.831)
function startToolExecutionSpan(agentContext, toolUseId) {
  let tracer = getActiveContext();
  if (!isSessionTracingEnabled()) return otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
  let tracer_2 = getTracer();
  let attributes = createSpanAttributes("tool.execution", getConversationIdAttributes(agentContext));
  let span = tracer_2.startSpan(
    "claude_code.tool.execution",
    {
      attributes,
    },
    tracer,
  );
  setToolUseIdAttributes(span, toolUseId);
  ensureCleanupInterval(EXECUTION_STATE_KEY, {
    span,
    startTime: performance.now(),
    attributes,
    priorContext: tracer,
  });
  return span;
}
//@ chunk-a9ek44g8.js:18475-18850 layout
/**
 * 结束工具执行 span（耗时、成功、错误）。
 */
function endToolExecutionSpan(metadata) {
  if (!isSessionTracingEnabled()) return;
  let liveSpanState = getLiveSpanState(EXECUTION_STATE_KEY);
  if (!liveSpanState) return;
  let attributes = {
    duration_ms: Math.max(0, Math.round(performance.now() - liveSpanState.startTime)),
  };
  if (metadata) {
    if (metadata.success !== undefined) attributes.success = metadata.success;
    if (metadata.success === false && !metadata.interrupted) attributes["error.type"] = "tool_error";
    Object.assign(attributes, buildSpanErrorAttributes(metadata.error, metadata.errorClass));
  }
  liveSpanState.span.setAttributes(attributes);
  if (metadata?.success === false) liveSpanState.span.setStatus(buildErrorSpanStatus(metadata.error));
  liveSpanState.span.end();
  endSpanState(EXECUTION_STATE_KEY, liveSpanState);
}
//@ chunk-a9ek44g8.js:18850-19231 fingerprint = endToolSpan (0.787)
function endToolSpan(toolUseId, toolContent, resultTokens, notRecorded = false) {
  let toolSpanContext = toolUseId ? spanAttributesByContext.get(toolUseId) : getLiveSpanState(TOOL_STATE_KEY);
  if (!toolSpanContext || toolSpanContext.ended) return;
  if (toolSpanContext.perfettoSpanId)
    endPerfettoToolSpan(toolSpanContext.perfettoSpanId, {
      success: true,
      resultTokens,
    });
  if (!isSessionTracingEnabled()) {
    endSpanState(TOOL_STATE_KEY, toolSpanContext);
    return;
  }
  let endAttributes = {
    duration_ms: Math.max(0, Math.round(performance.now() - toolSpanContext.startTime)),
  };
  if (toolContent && true && !isTracingRedacted()) {
    let toolName = toolSpanContext.attributes.tool_name || "unknown";
    addBetaToolResultAttributes(endAttributes, toolName, toolContent, notRecorded);
  }
  if (resultTokens !== undefined) endAttributes.result_tokens = resultTokens;
  toolSpanContext.span.setAttributes(endAttributes);
  toolSpanContext.span.end();
  endSpanState(TOOL_STATE_KEY, toolSpanContext);
}
//@ chunk-a9ek44g8.js:19231-19290 layout
function shouldRecordToolContent(span) {
  return (
    isSessionTracingEnabled() && isToolContentLoggingEnabled() && !isTracingRedacted() && span.isRecording()
  );
}
//@ chunk-a9ek44g8.js:19290-19463 layout
function stringifyToolContentForSpan(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((block) =>
    block?.type === "text" ? String(block.text) : `[${String(block?.type ?? "unknown")}]`,
  ).join(`
`);
}
//@ chunk-a9ek44g8.js:19463-19740 fingerprint = addToolContentEvent (0.901)
function addToolContentEvent(span, eventName, attributes) {
  if (!shouldRecordToolContent(span)) return;
  let currentSpanCtx = spanAttributesByContext.get(span);
  if (!currentSpanCtx || currentSpanCtx.ended) return;
  let processedAttributes = {};
  for (let [key, value] of Object.entries(attributes))
    if (typeof value === "string") {
      let { content, truncated } = truncateContentForTelemetry(value);
      processedAttributes[key] = content;
      if (truncated) {
        processedAttributes[`${key}_truncated`] = true;
        processedAttributes[`${key}_original_length`] = value.length;
      }
    } else processedAttributes[key] = value;
  currentSpanCtx.span.addEvent(eventName, processedAttributes);
}
//@ chunk-a9ek44g8.js:19740-19970 file-local
function getSpanId(span) {
  if (!isSessionTracingEnabled()) return;
  let spanContext = span.spanContext();
  if (!spanContext.traceId || spanContext.traceId === "00000000000000000000000000000000") return;
  let contextWithSpan = otelApi_4.trace.setSpan(otelApi_4.context.active(), span);
  let carrier = {};
  traceContextPropagator.inject(contextWithSpan, carrier, otelApi_4.defaultTextMapSetter);
  return carrier.traceparent;
}
//@ chunk-a9ek44g8.js:19970-20055 layout
function getActiveSpanId() {
  if (!isSessionTracingEnabled()) return;
  let span = otelApi_4.trace.getSpan(getActiveContext());
  if (!span) return;
  return getSpanId(span);
}
//@ chunk-a9ek44g8.js:20055-20177 layout
/**
 * 由 traceparent 提取上下文。
 */
function extractTraceparentContext(traceparent) {
  if (!traceparent || !isSessionTracingEnabled()) return;
  let activeContext = getActiveContext();
  let extractedContext = traceContextPropagator.extract(
    activeContext,
    {
      traceparent,
    },
    otelApi_4.defaultTextMapGetter,
  );
  return extractedContext === activeContext ? undefined : extractedContext;
}
//@ chunk-a9ek44g8.js:20177-20231 layout
function runInContext(traceparentContext, callback) {
  return traceparentContext === undefined
    ? callback()
    : otelContextManager.with(traceparentContext, callback);
}
//@ chunk-a9ek44g8.js:20231-20414 file-local
function endToolExecutionSpan_2(name, options) {
  if (!isPerfettoTracingEnabled()) return;
  return getTracer().startSpan(
    name,
    {
      attributes: {
        ...getSpanBaseAttributes(),
        "span.type": options.spanType,
        ...(isTracingRedacted()
          ? import_reject(options.attrs ?? {}, (key, attrName) => SPAN_SAFE_ATTRIBUTE_NAMES.has(attrName))
          : options.attrs),
        ...(!isTracingRedacted() && options.contentAttrs),
      },
    },
    getActiveContext(),
  );
}
//@ chunk-a9ek44g8.js:20414-20822 layout
async function withToolExecutionSpan(name, options, run) {
  let span = endToolExecutionSpan_2(name, options);
  if (!span) return run(undefined);
  let context = otelApi_4.trace.setSpan(getActiveContext(), span);
  return otelContextManager.with(context, async () => {
    try {
      return await run(span);
    } catch (error) {
      if (!options.isExpectedError?.(error)) {
        let errorText =
          error instanceof Error && options.withholdErrorText?.(error)
            ? describeErrorWithoutText(error)
            : undefined;
        if (error instanceof Error && !isTracingRedacted())
          span.recordException(
            errorText === undefined
              ? error
              : {
                  name: error.name,
                  message: errorText,
                },
          );
        setSpanError(span, errorText ?? (error instanceof Error ? error.message : String(error)));
      }
      throw error;
    } finally {
      span.end();
    }
  });
}
//@ chunk-a9ek44g8.js:20822-21218 callgraph-witnessed = executeInSpan (0.244)
function executeInSpan(agentContext) {
  if (!isPerfettoTracingEnabled()) return;
  let tracer = getActiveContext();
  let agentId = relayedId(agentContext.agentId);
  let ctx = agentContext.parentAgentId !== undefined ? relayedId(agentContext.parentAgentId) : undefined;
  let attributes = createSpanAttributes("subagent.spawn", {
    ...(agentId !== undefined && {
      agent_id: agentId,
    }),
    agent_type: isTracingRedacted() && !agentContext.isBuiltIn ? "custom" : agentContext.agentType,
    ...(ctx !== undefined && {
      parent_agent_id: ctx,
    }),
  });
  let span = getTracer().startSpan(
    "claude_code.subagent.spawn",
    {
      attributes,
    },
    tracer,
  );
  ensureCleanupInterval(SUBAGENT_STATE_KEY, {
    span,
    startTime: performance.now(),
    attributes,
    priorContext: tracer,
  });
  return span;
}
//@ chunk-a9ek44g8.js:21218-21430 layout
/**
 * 结束子代理 span。
 */
function endSubagentSpan(span, metadata) {
  if (!span) return;
  let spanState = spanAttributesByContext.get(span);
  if (!spanState || spanState.ended) return;
  if (metadata?.success !== undefined) span.setAttribute("success", metadata.success);
  if (metadata?.error) {
    span.setAttributes(buildSpanErrorAttributes(metadata.error, metadata.errorClass));
    setSpanError(span, metadata.error);
  }
  span.end();
  endSpanState(SUBAGENT_STATE_KEY, spanState);
}
//@ chunk-a9ek44g8.js:21430-21463 layout
function isAnyBetaTracingEnabled() {
  return isBetaTracingEnabled() || isPerfettoTracingEnabled();
}
//@ chunk-a9ek44g8.js:21463-21822 fingerprint = startHookSpan (0.866)
function startHookSpan(hookEvent, hookNameForTelemetry, numHooks, hookDefinitionsJson, agentContext) {
  if (!isAnyBetaTracingEnabled()) return otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
  let tracer = getTracer();
  let activeContext = getActiveContext();
  let { content } = truncateContentForTelemetry(hookDefinitionsJson);
  let attributes = createSpanAttributes("hook", {
    ...getConversationIdAttributes(agentContext),
    hook_event: hookEvent,
    hook_name: isTracingRedacted() ? hookEvent : hookNameForTelemetry,
    num_hooks: numHooks,
    ...(isToolDetailsLoggingEnabled() &&
      !isTracingRedacted() && {
        hook_definitions: content,
      }),
  });
  let span = tracer.startSpan(
    "claude_code.hook",
    {
      attributes,
    },
    activeContext,
  );
  spanAttributesByContext.set(span, {
    span,
    startTime: performance.now(),
    attributes,
    priorContext: activeContext,
  });
  return span;
}
//@ chunk-a9ek44g8.js:21822-22365 fingerprint = endHookSpan (0.837)
function endHookSpan(span, metadata) {
  if (!isAnyBetaTracingEnabled()) return;
  let spanState = spanAttributesByContext.get(span);
  if (!spanState || spanState.ended) return;
  spanState.ended = true;
  let endAttributes = {
    duration_ms: Math.max(0, Math.round(performance.now() - spanState.startTime)),
  };
  if (metadata) {
    if (metadata.numSuccess !== undefined) endAttributes.num_success = metadata.numSuccess;
    if (metadata.numBlocking !== undefined) endAttributes.num_blocking = metadata.numBlocking;
    if (metadata.numNonBlockingError !== undefined)
      endAttributes.num_non_blocking_error = metadata.numNonBlockingError;
    if (metadata.numCancelled !== undefined) endAttributes.num_cancelled = metadata.numCancelled;
  }
  spanState.span.setAttributes(endAttributes);
  if (metadata && (metadata.numNonBlockingError ?? 0) > 0)
    spanState.span.setStatus(buildErrorSpanStatus(`${metadata.numNonBlockingError} hook(s) failed`));
  spanState.span.end();
}
export {
  extractTraceparentContext,
  runInContext,
  executeInSpan,
  endSubagentSpan,
  isSessionTracingEnabled,
  isPromptHookObserved,
  getActiveSpanId,
  turnTraceContextsOf,
  isPerfettoTracingEnabled,
  truncateContentForTelemetry,
  withToolExecutionSpan,
  withInteractionSpan,
  endInteractionSpan,
  currentPromptHandle,
  clearTurnTraceContexts,
  getSpanId,
  getUpstreamTraceparent,
  recordLlmRequestAttempt,
  startLLMRequestSpan,
  hasPromptHooks,
  startHookSpan,
  endHookSpan,
  hasManagedPluginsSafe,
  isEnhancedTelemetryEnabled,
  isToolContentLoggingEnabled,
  endToolExecutionSpan_2,
  noopEndToolExecutionSpan,
  setSpanError,
  isTracingRedacted,
  startToolSpan,
  startToolBlockedOnUserSpan,
  endToolSpan,
  startToolExecutionSpan,
  addToolContentEvent,
  endToolExecutionSpan,
  shouldRecordToolContent,
  stringifyToolContentForSpan,
  describeErrorWithoutText,
  endToolBlockedOnUserSpan,
  endLLMRequestSpan,
  getCurrentSpan,
};
