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
import { hasManagedPlugins } from "../plugins/managedPlugins.js";
import { logError } from "../log.js";
import { toError } from "../errors.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { hasLink } from "../hasLink.js";
import { isHookRegistrationPending } from "../plugins/loadPluginHooks.js";
import { isModuleAdmitted } from "../plugins/functionHooks/admission.js";
import { matchesSingleKeyFilter } from "../hooks/functionHookMatchers.js";
import { Re } from "../../../runtime/bun-runtime.js";
import { require_api } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { require_core } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { env } from "../env.js";
import { perfettoRecorder, isPerfettoRecording } from "./perfettoTracing.js";
import { HostScoped } from "../hostScoped.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "../envUtils.js";
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
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";

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
function hasPromptHooks(n) {
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
                n === "queue-record" &&
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
function isPromptHookObserved(n) {
  return hasPromptHooks(n) || hasManagedPluginsSafe();
}
//@ chunk-a9ek44g8.js:1539-1570 placement
var otelApi_4 = Re(require_api(), 1);
var otelCore_3 = Re(require_core(), 1);
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
function truncateContentForTelemetry(n) {
  let e = otelContentMaxLength();
  if (n.length <= e)
    return {
      content: n,
      truncated: false,
    };
  let s = `

[TRUNCATED - Content exceeds ${e >= 1024 ? `${Math.floor(e / 1024)}KB` : `${e} character`} limit]`;
  if (s.length >= e)
    return {
      content: n.slice(0, e),
      truncated: true,
    };
  return {
    content: n.slice(0, e - s.length) + s,
    truncated: true,
  };
}
//@ chunk-a9ek44g8.js:7527-7599 sole-consumer
function perfettoStartLlmRequest(n) {
  let e = perfettoRecorder();
  if (!e) return "";
  return e.startLLMRequestSpan(n);
}
//@ chunk-a9ek44g8.js:7599-7668 sole-consumer
function endPerfettoLlmSpan(perfettoSpanId, e) {
  let r = perfettoRecorder();
  if (!r || !perfettoSpanId) return;
  r.endLLMRequestSpan(perfettoSpanId, e);
}
//@ chunk-a9ek44g8.js:7668-7738 sole-consumer
function startPerfettoToolSpan(n, e) {
  let r = perfettoRecorder();
  if (!r) return "";
  return r.startToolSpan(n, e);
}
//@ chunk-a9ek44g8.js:7738-7801 sole-consumer
function endPerfettoToolSpan(perfettoSpanId, e) {
  let r = perfettoRecorder();
  if (!r || !perfettoSpanId) return;
  r.endToolSpan(perfettoSpanId, e);
}
//@ chunk-a9ek44g8.js:7801-7872 sole-consumer
function startPerfettoUserInputSpan(n) {
  let e = perfettoRecorder();
  if (!e) return "";
  return e.startUserInputSpan(n);
}
//@ chunk-a9ek44g8.js:7872-7940 sole-consumer
function endPerfettoUserInputSpan(perfettoSpanId, e) {
  let r = perfettoRecorder();
  if (!r || !perfettoSpanId) return;
  r.endUserInputSpan(perfettoSpanId, e);
}
//@ chunk-a9ek44g8.js:7940-8003 sole-consumer
function perfettoEmitInstant(n, e, r) {
  let s = perfettoRecorder();
  if (!s) return;
  s.emitInstant(n, e, r);
}
//@ chunk-a9ek44g8.js:8003-8076 sole-consumer
function startPerfettoInteractionSpan(n) {
  let e = perfettoRecorder();
  if (!e) return "";
  return e.startInteractionSpan(n);
}
//@ chunk-a9ek44g8.js:8076-8142 sole-consumer
function endPerfettoInteractionSpan(perfettoSpanId) {
  let e = perfettoRecorder();
  if (!e || !perfettoSpanId) return;
  e.endInteractionSpan(perfettoSpanId);
}
//@ chunk-a9ek44g8.js:8142-8418 sole-consumer
/**
 * 会话追踪的 OTel 上下文键：cc.interaction_state、cc.tool_state、cc.blocked_state、cc.execution_state、cc.subagent_state、cc.turn_trace_contexts。
 */
var spanAttributesByContext = new WeakMap();
var INTERACTION_STATE_KEY = otelApi_4.createContextKey("cc.interaction_state");
var TOOL_STATE_KEY = otelApi_4.createContextKey("cc.tool_state");
var BLOCKED_STATE_KEY = otelApi_4.createContextKey("cc.blocked_state");
var EXECUTION_STATE_KEY = otelApi_4.createContextKey("cc.execution_state");
var SUBAGENT_STATE_KEY = otelApi_4.createContextKey("cc.subagent_state");
var TURN_TRACE_CONTEXTS_KEY = otelApi_4.createContextKey("cc.turn_trace_contexts");
//@ chunk-a9ek44g8.js:8418-8442 sole-consumer
class InteractionSequenceState {
  lastSequence = 0;
}
//@ chunk-a9ek44g8.js:8442-8467 sole-consumer
var interactionSequenceByHost = new HostScoped(() => new InteractionSequenceState());
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
function noopEndToolExecutionSpan(n, e) {
  return;
}
//@ chunk-a9ek44g8.js:8707-8743 layout
function setSpanError(n, e) {
  n.setStatus(buildErrorSpanStatus(e));
}
//@ chunk-a9ek44g8.js:8743-8845 layout
function setToolUseIdAttributes(span, e) {
  if (!e) return;
  span.setAttribute("tool_use_id", e);
  span.setAttribute("gen_ai.tool.call.id", e);
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
  let n = {};
  let sessionId = getSessionId();
  if (SAFE_ATTRIBUTE_VALUE_RE.test(sessionId)) n["session.id"] = sessionId;
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (
    CLAUDE_CODE_REMOTE_SESSION_ID !== undefined &&
    SAFE_ATTRIBUTE_VALUE_RE.test(CLAUDE_CODE_REMOTE_SESSION_ID)
  )
    n["ccr.session.id"] = CLAUDE_CODE_REMOTE_SESSION_ID;
  return n;
}
//@ chunk-a9ek44g8.js:9243-9316 layout
function getSpanBaseAttributes() {
  return {
    ...(isTracingRedacted() ? getRedactedSessionAttributes() : getTelemetryAttributes()),
    "gen_ai.provider.name": getGenAiProviderName(getAPIProvider()),
  };
}
//@ chunk-a9ek44g8.js:9316-9493 layout
var SPAN_SAFE_ATTRIBUTE_NAMES = new Set(["rpc.service", "mcp_tool"]);
var SAFE_ATTRIBUTE_VALUE_RE = /^[A-Za-z0-9_.-]{1,64}$/;
var ATTRIBUTE_VALUE_PATTERNS = {
  [HEARTHBOT]: /^[a-z][a-z0-9_]{0,39}$/,
  [CLAUDE_CODE_REMOTE]: /^[A-Za-z][A-Za-z0-9_]{0,39}$/,
  playwright: /^browser_[a-z_]{1,40}$/,
};
//@ chunk-a9ek44g8.js:9493-9718 layout
/**
 * span 中的工具名脱敏：只放行白名单内的 MCP 工具名，其余 MCP 记 mcp_other，带 __ 的记 other。
 */
function sanitizeToolNameForSpan(n) {
  if (n.startsWith("mcp__")) {
    let [, e, ...r] = n.split("__");
    let s =
      e !== undefined && Object.hasOwn(ATTRIBUTE_VALUE_PATTERNS, e) ? ATTRIBUTE_VALUE_PATTERNS[e] : undefined;
    return s !== undefined && s.test(r.join("__")) && SAFE_ATTRIBUTE_VALUE_RE.test(n) ? n : "mcp_other";
  }
  return !n.includes("__") && SAFE_ATTRIBUTE_VALUE_RE.test(n) ? n : "other";
}
//@ chunk-a9ek44g8.js:9718-9805 layout
function safeQuerySourceName(n) {
  let replaced = normalizeAgentQuerySource(n)?.replaceAll(":", ".");
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
function getLiveSpanState(n) {
  let e = getActiveContext().getValue(n);
  return e && !e.ended ? e : undefined;
}
//@ chunk-a9ek44g8.js:10311-10435 callgraph-fingerprint = ensureCleanupInterval (0.174)
function ensureCleanupInterval(n, e) {
  spanAttributesByContext.set(e.span, e);
  let r = otelApi_4.trace.setSpan(e.priorContext, e.span).setValue(n, e);
  otelContextManager.enterWith(r);
  if (n === INTERACTION_STATE_KEY) setHostOtelContext(r);
}
//@ chunk-a9ek44g8.js:10435-10560 layout
function endSpanState(n, e) {
  e.ended = true;
  if (n === INTERACTION_STATE_KEY && getHostOtelContext()?.getValue(n) === e) setHostOtelContext(undefined);
  if (getActiveContext().getValue(n) === e) otelContextManager.enterWith(e.priorContext);
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
function queuedSendLinks(n) {
  if (!n) return [];
  return n.linked.flatMap(({ traceparent }) => {
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
function setAgentIdAttributes(span, e) {
  if (isMainAgent(e)) return;
  let r = e.agentId !== undefined ? relayedId(e.agentId) : undefined;
  if (r !== undefined) span.setAttribute("agent_id", r);
  let s = e.parentAgentId !== undefined ? relayedId(e.parentAgentId) : undefined;
  if (s !== undefined) span.setAttribute("parent_agent_id", s);
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
function getConversationIdAttributes(n) {
  switch (n.agentType) {
    case "main":
      return getMainConversationIdAttributes();
    case "subagent": {
      if (n.isMainSession) return getMainConversationIdAttributes();
      let e = relayedId(n.agentId);
      return e !== undefined
        ? {
            "gen_ai.conversation.id": e,
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
function startInteractionSpan(n, e) {
  let perfettoSpanId = isPerfettoRecording() ? startPerfettoInteractionSpan(n) : undefined;
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
  let promptToLog = tracer_2 ? "<REDACTED>" : redactIfDisabled(n);
  let h = ++interactionSequenceByHost.of(getRootSession().host).lastSequence;
  let attributes = createSpanAttributes("interaction", {
    "gen_ai.operation.name": "invoke_agent",
    ...getMainConversationIdAttributes(),
    user_prompt: promptToLog,
    user_prompt_length: tracer_2 ? 0 : n.length,
    "interaction.sequence": h,
  });
  let p = isTracingRedacted() ? e : undefined;
  let g = p?.parent
    ? traceContextPropagator.extract(
        activeContext,
        {
          traceparent: p.parent.traceparent,
        },
        otelApi_4.defaultTextMapGetter,
      )
    : activeContext;
  let m =
    g === activeContext && getIsNonInteractiveSession() && env.TRACEPARENT
      ? otelApi_4.propagation.extract(activeContext, {
          traceparent: env.TRACEPARENT,
          tracestate: env.TRACESTATE,
        })
      : activeContext;
  let b = g !== activeContext ? g : m;
  attributes["parent.source"] = g !== activeContext ? "event" : m !== activeContext ? "env" : "none";
  let spanId = queuedSendLinks(p);
  attributes.queued_sends = spanId.length;
  let span = tracer.startSpan(
    "claude_code.interaction",
    {
      attributes,
      links: spanId,
    },
    b,
  );
  if (!isTracingRedacted() && !tracer_2) addBetaInteractionAttributes(span, n);
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
function getCurrentSpan(prompt, e, content) {
  let liveSpanState = getLiveSpanState(INTERACTION_STATE_KEY);
  if (
    prompt === undefined ||
    liveSpanState?.promptHandle !== prompt ||
    (liveSpanState.isPromptHeld !== true && content === e)
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
function withInteractionSpan(n, e, r) {
  let [contexts, o] = typeof e === "function" ? [undefined, e] : [e, r];
  return withTurnTraceContexts(contexts, () => {
    let activeContext = getActiveContext();
    startInteractionSpan(n, contexts);
    let activeContext_2 = getActiveContext();
    try {
      return otelContextManager.with(activeContext_2, o);
    } finally {
      if (getActiveContext() === activeContext_2) otelContextManager.enterWith(activeContext);
    }
  });
}
//@ chunk-a9ek44g8.js:13169-13267 layout
function withTurnTraceContexts(contexts, e, fallbackTraceparent) {
  let s = {
    contexts,
    fallbackTraceparent,
  };
  return otelContextManager.with(getActiveContext().setValue(TURN_TRACE_CONTEXTS_KEY, s), e);
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
function startLLMRequestSpan(model, agentContext, newContext, messagesForAPI, o, querySource, u) {
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
  let g = getActiveContext().getValue(TOOL_STATE_KEY);
  let m = isTracingRedacted() ? stripAnyVersatileSuffix(model) : model;
  let attributes = createSpanAttributes("llm_request", {
    model: m,
    "gen_ai.system": "anthropic",
    "gen_ai.request.model": m,
    "llm_request.context": g
      ? "tool"
      : getLiveSpanState(INTERACTION_STATE_KEY)
        ? "interaction"
        : "standalone",
    speed: o ? "fast" : "normal",
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
  if (!isTracingRedacted()) addBetaLLMRequestAttributes(span, newContext, messagesForAPI, u, agentContext);
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
function recordLlmRequestAttempt(n, { attempt, clientRequestId }) {
  let s = {
    attempt,
  };
  if (clientRequestId !== undefined) s.client_request_id = clientRequestId;
  if (n && isSessionTracingEnabled()) n.addEvent("gen_ai.request.attempt", s);
  perfettoEmitInstant("LLM Attempt", "api,attempt", s);
}
//@ chunk-a9ek44g8.js:14643-14682 layout
var traceContextPropagator = new otelCore_3.W3CTraceContextPropagator();
//@ chunk-a9ek44g8.js:14682-14801 layout
/**
 * 解析 W3C traceparent 字符串为 SpanContext。
 */
function parseTraceparent(traceparent) {
  let e = traceContextPropagator.extract(
    otelApi_4.ROOT_CONTEXT,
    {
      traceparent,
    },
    otelApi_4.defaultTextMapGetter,
  );
  return otelApi_4.trace.getSpanContext(e);
}
//@ chunk-a9ek44g8.js:14801-16622 fingerprint = endLLMRequestSpan (0.561)
function endLLMRequestSpan(span, metadata) {
  if (!span) return;
  let r = spanAttributesByContext.get(span);
  if (!r || r.ended) return;
  r.ended = true;
  let max = Math.max(0, Math.round(performance.now() - r.startTime));
  if (metadata?.error !== undefined)
    metadata = {
      ...metadata,
      error: redactAccountMemoryText(
        metadata.accountMemoryKeys ?? (() => accountMemoryRedactionKeys(getRootSession().host)),
        metadata.querySource,
        metadata.error,
      ),
    };
  if (r.perfettoSpanId)
    endPerfettoLlmSpan(r.perfettoSpanId, {
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
  r.span.setAttributes(endAttributes);
  if (metadata?.stopReason !== undefined) {
    r.span.setAttribute("stop_reason", metadata.stopReason);
    r.span.setAttribute("gen_ai.response.finish_reasons", [metadata.stopReason]);
  }
  if (metadata?.success === false) r.span.setStatus(buildErrorSpanStatus(metadata.error));
  if (metadata?.traceresponse) {
    let spanId = parseTraceparent(metadata.traceresponse);
    if (spanId)
      r.span.addLink({
        context: spanId,
        attributes: {
          "link.type": "parent_of",
        },
      });
  }
  r.span.end();
}
//@ chunk-a9ek44g8.js:16622-17392 fingerprint = startToolSpan (0.573)
function startToolSpan(toolName, agentContext, r, toolInput, toolUseID, a = false) {
  let perfettoSpanId = isPerfettoRecording() ? startPerfettoToolSpan(toolName, r) : undefined;
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
  let g = isTracingRedacted() ? spanId : toolName;
  let mcpToolDetails = extractMcpToolDetails(g);
  let attributes = createSpanAttributes("tool", {
    tool_name: g,
    tool_name_safe: spanId,
    "gen_ai.operation.name": "execute_tool",
    "gen_ai.tool.name": mcpToolDetails?.mcpToolName ?? g,
    ...(mcpToolDetails && {
      "anthropic.mcp.server.name": mcpToolDetails.serverName,
    }),
    ...(agentContext && getConversationIdAttributes(agentContext)),
    ...r,
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
  setToolUseIdAttributes(span, toolUseID);
  if (toolInput && !isTracingRedacted()) addBetaToolInputAttributes(span, toolName, toolInput, a);
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
function startToolExecutionSpan(agentContext, toolUseID) {
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
  setToolUseIdAttributes(span, toolUseID);
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
function endToolExecutionSpan(n) {
  if (!isSessionTracingEnabled()) return;
  let liveSpanState = getLiveSpanState(EXECUTION_STATE_KEY);
  if (!liveSpanState) return;
  let s = {
    duration_ms: Math.max(0, Math.round(performance.now() - liveSpanState.startTime)),
  };
  if (n) {
    if (n.success !== undefined) s.success = n.success;
    if (n.success === false && !n.interrupted) s["error.type"] = "tool_error";
    Object.assign(s, buildSpanErrorAttributes(n.error, n.errorClass));
  }
  liveSpanState.span.setAttributes(s);
  if (n?.success === false) liveSpanState.span.setStatus(buildErrorSpanStatus(n.error));
  liveSpanState.span.end();
  endSpanState(EXECUTION_STATE_KEY, liveSpanState);
}
//@ chunk-a9ek44g8.js:18850-19231 fingerprint = endToolSpan (0.787)
function endToolSpan(toolSpan, e, resultTokens, s = false) {
  let toolSpanContext = toolSpan ? spanAttributesByContext.get(toolSpan) : getLiveSpanState(TOOL_STATE_KEY);
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
  if (e && true && !isTracingRedacted()) {
    let toolName = toolSpanContext.attributes.tool_name || "unknown";
    addBetaToolResultAttributes(endAttributes, toolName, e, s);
  }
  if (resultTokens !== undefined) endAttributes.result_tokens = resultTokens;
  toolSpanContext.span.setAttributes(endAttributes);
  toolSpanContext.span.end();
  endSpanState(TOOL_STATE_KEY, toolSpanContext);
}
//@ chunk-a9ek44g8.js:19231-19290 layout
function shouldRecordToolContent(n) {
  return (
    isSessionTracingEnabled() && isToolContentLoggingEnabled() && !isTracingRedacted() && n.isRecording()
  );
}
//@ chunk-a9ek44g8.js:19290-19463 layout
function stringifyToolContentForSpan(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content.map((e) => (e?.type === "text" ? String(e.text) : `[${String(e?.type ?? "unknown")}]`))
    .join(`
`);
}
//@ chunk-a9ek44g8.js:19463-19740 fingerprint = addToolContentEvent (0.901)
function addToolContentEvent(toolSpan, e, r) {
  if (!shouldRecordToolContent(toolSpan)) return;
  let currentSpanCtx = spanAttributesByContext.get(toolSpan);
  if (!currentSpanCtx || currentSpanCtx.ended) return;
  let processedAttributes = {};
  for (let [key, value] of Object.entries(r))
    if (typeof value === "string") {
      let { content, truncated } = truncateContentForTelemetry(value);
      processedAttributes[key] = content;
      if (truncated) {
        processedAttributes[`${key}_truncated`] = true;
        processedAttributes[`${key}_original_length`] = value.length;
      }
    } else processedAttributes[key] = value;
  currentSpanCtx.span.addEvent(e, processedAttributes);
}
//@ chunk-a9ek44g8.js:19740-19970 file-local
function getSpanId(span) {
  if (!isSessionTracingEnabled()) return;
  let e = span.spanContext();
  if (!e.traceId || e.traceId === "00000000000000000000000000000000") return;
  let r = otelApi_4.trace.setSpan(otelApi_4.context.active(), span);
  let s = {};
  traceContextPropagator.inject(r, s, otelApi_4.defaultTextMapSetter);
  return s.traceparent;
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
  let r = traceContextPropagator.extract(
    activeContext,
    {
      traceparent,
    },
    otelApi_4.defaultTextMapGetter,
  );
  return r === activeContext ? undefined : r;
}
//@ chunk-a9ek44g8.js:20177-20231 layout
function runInContext(traceparentContext, e) {
  return traceparentContext === undefined ? e() : otelContextManager.with(traceparentContext, e);
}
//@ chunk-a9ek44g8.js:20231-20414 file-local
function endToolExecutionSpan_2(n, e) {
  if (!isPerfettoTracingEnabled()) return;
  return getTracer().startSpan(
    n,
    {
      attributes: {
        ...getSpanBaseAttributes(),
        "span.type": e.spanType,
        ...(isTracingRedacted() ? wi(e.attrs ?? {}, (r, s) => SPAN_SAFE_ATTRIBUTE_NAMES.has(s)) : e.attrs),
        ...(!isTracingRedacted() && e.contentAttrs),
      },
    },
    getActiveContext(),
  );
}
//@ chunk-a9ek44g8.js:20414-20822 layout
async function withToolExecutionSpan(n, e, r) {
  let s = endToolExecutionSpan_2(n, e);
  if (!s) return r(undefined);
  let o = otelApi_4.trace.setSpan(getActiveContext(), s);
  return otelContextManager.with(o, async () => {
    try {
      return await r(s);
    } catch (error) {
      if (!e.isExpectedError?.(error)) {
        let u =
          error instanceof Error && e.withholdErrorText?.(error)
            ? describeErrorWithoutText(error)
            : undefined;
        if (error instanceof Error && !isTracingRedacted())
          s.recordException(
            u === undefined
              ? error
              : {
                  name: error.name,
                  message: u,
                },
          );
        setSpanError(s, u ?? (error instanceof Error ? error.message : String(error)));
      }
      throw error;
    } finally {
      s.end();
    }
  });
}
//@ chunk-a9ek44g8.js:20822-21218 callgraph-witnessed = executeInSpan (0.244)
function executeInSpan(n) {
  if (!isPerfettoTracingEnabled()) return;
  let tracer = getActiveContext();
  let r = relayedId(n.agentId);
  let ctx = n.parentAgentId !== undefined ? relayedId(n.parentAgentId) : undefined;
  let attributes = createSpanAttributes("subagent.spawn", {
    ...(r !== undefined && {
      agent_id: r,
    }),
    agent_type: isTracingRedacted() && !n.isBuiltIn ? "custom" : n.agentType,
    ...(ctx !== undefined && {
      parent_agent_id: ctx,
    }),
  });
  let a = getTracer().startSpan(
    "claude_code.subagent.spawn",
    {
      attributes,
    },
    tracer,
  );
  ensureCleanupInterval(SUBAGENT_STATE_KEY, {
    span: a,
    startTime: performance.now(),
    attributes,
    priorContext: tracer,
  });
  return a;
}
//@ chunk-a9ek44g8.js:21218-21430 layout
/**
 * 结束子代理 span。
 */
function endSubagentSpan(n, e) {
  if (!n) return;
  let r = spanAttributesByContext.get(n);
  if (!r || r.ended) return;
  if (e?.success !== undefined) n.setAttribute("success", e.success);
  if (e?.error) {
    n.setAttributes(buildSpanErrorAttributes(e.error, e.errorClass));
    setSpanError(n, e.error);
  }
  n.end();
  endSpanState(SUBAGENT_STATE_KEY, r);
}
//@ chunk-a9ek44g8.js:21430-21463 layout
function isAnyBetaTracingEnabled() {
  return isBetaTracingEnabled() || isPerfettoTracingEnabled();
}
//@ chunk-a9ek44g8.js:21463-21822 fingerprint = startHookSpan (0.866)
function startHookSpan(hookEvent, hookNameForTelemetry, numHooks, hookDefinitionsJson, o) {
  if (!isAnyBetaTracingEnabled()) return otelApi_4.trace.getActiveSpan() || getTracer().startSpan("dummy");
  let tracer = getTracer();
  let activeContext = getActiveContext();
  let { content } = truncateContentForTelemetry(hookDefinitionsJson);
  let attributes = createSpanAttributes("hook", {
    ...getConversationIdAttributes(o),
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
  let r = spanAttributesByContext.get(span);
  if (!r || r.ended) return;
  r.ended = true;
  let endAttributes = {
    duration_ms: Math.max(0, Math.round(performance.now() - r.startTime)),
  };
  if (metadata) {
    if (metadata.numSuccess !== undefined) endAttributes.num_success = metadata.numSuccess;
    if (metadata.numBlocking !== undefined) endAttributes.num_blocking = metadata.numBlocking;
    if (metadata.numNonBlockingError !== undefined)
      endAttributes.num_non_blocking_error = metadata.numNonBlockingError;
    if (metadata.numCancelled !== undefined) endAttributes.num_cancelled = metadata.numCancelled;
  }
  r.span.setAttributes(endAttributes);
  if (metadata && (metadata.numNonBlockingError ?? 0) > 0)
    r.span.setStatus(buildErrorSpanStatus(`${metadata.numNonBlockingError} hook(s) failed`));
  r.span.end();
}
//@ chunk-aepeg2w5.js:857456-857516 fingerprint = isToolContentLoggingEnabled (1)
function isToolContentLoggingEnabled() {
  return isEnvTruthy(process.env.OTEL_LOG_TOOL_CONTENT);
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
