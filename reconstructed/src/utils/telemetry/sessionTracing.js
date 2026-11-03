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
import { Ol } from "../../../vendor/@opentelemetry/api/build/src/index.js";
import { Qm } from "../../../vendor/@opentelemetry/core/build/src/index.js";
import { env } from "../env.js";
import { A, Rqe } from "./perfettoTracing.js";
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
import { Bn } from "../model/modelIds.js";
import { extractMcpToolDetails, isToolDetailsLoggingEnabled } from "../../services/analytics/metadata.js";
import { wi } from "../../../vendor/lodash-es/_inlinedHelpers.js";

//@ chunk-a9ek44g8.js:1088-1148 placement
function Rbn() {
  try {
    return hasManagedPlugins();
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
//@ chunk-a9ek44g8.js:1148-1262 placement
function hasCommandRunHooks() {
  try {
    return getPluginRegistry().loadedModules.some(
      (loadedModule) => !hasLink(loadedModule) && loadedModule.hooks("command.run"),
    );
  } catch (error) {
    return (logError(toError(error)), !0);
  }
}
/**
 * 是否有影响提示提交的插件钩子（prompt.submit/session.append）。
 */
//@ chunk-a9ek44g8.js:1262-1503 placement
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
    return (logError(toError(error)), !0);
  }
}
//@ chunk-a9ek44g8.js:1503-1539 placement
function isPromptHookObserved(n) {
  return hasPromptHooks(n) || Rbn();
}
//@ chunk-a9ek44g8.js:1539-1570 placement
var c = Re(Ol(), 1),
  Et = Re(Qm(), 1);
//@ chunk-a9ek44g8.js:1607-1620 placement
var Lt = 61440;
//@ chunk-a9ek44g8.js:1620-1831 placement
function otelContentMaxLength() {
  return Math.min(
    env.CLAUDE_CODE_OTEL_CONTENT_MAX_LENGTH ?? Lt,
    env.OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT ?? 1 / 0,
    env.OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT ?? 1 / 0,
    env.OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT ?? 1 / 0,
  );
}
//@ chunk-a9ek44g8.js:1831-2113 placement
function truncateContentForTelemetry(n) {
  let e = otelContentMaxLength();
  if (n.length <= e) return { content: n, truncated: !1 };
  let s = `

[TRUNCATED - Content exceeds ${e >= 1024 ? `${Math.floor(e / 1024)}KB` : `${e} character`} limit]`;
  if (s.length >= e) return { content: n.slice(0, e), truncated: !0 };
  return { content: n.slice(0, e - s.length) + s, truncated: !0 };
}
//@ chunk-a9ek44g8.js:7527-7599 sole-consumer
function perfettoStartLlmRequest(n) {
  let e = A();
  if (!e) return "";
  return e.startLLMRequestSpan(n);
}
//@ chunk-a9ek44g8.js:7599-7668 sole-consumer
function lt(n, e) {
  let r = A();
  if (!r || !n) return;
  r.endLLMRequestSpan(n, e);
}
//@ chunk-a9ek44g8.js:7668-7738 sole-consumer
function mt(n, e) {
  let r = A();
  if (!r) return "";
  return r.startToolSpan(n, e);
}
//@ chunk-a9ek44g8.js:7738-7801 sole-consumer
function ht(n, e) {
  let r = A();
  if (!r || !n) return;
  r.endToolSpan(n, e);
}
//@ chunk-a9ek44g8.js:7801-7872 sole-consumer
function _t(n) {
  let e = A();
  if (!e) return "";
  return e.startUserInputSpan(n);
}
//@ chunk-a9ek44g8.js:7872-7940 sole-consumer
function St(n, e) {
  let r = A();
  if (!r || !n) return;
  r.endUserInputSpan(n, e);
}
//@ chunk-a9ek44g8.js:7940-8003 sole-consumer
function perfettoEmitInstant(n, e, r) {
  let s = A();
  if (!s) return;
  s.emitInstant(n, e, r);
}
//@ chunk-a9ek44g8.js:8003-8076 sole-consumer
function bt(n) {
  let e = A();
  if (!e) return "";
  return e.startInteractionSpan(n);
}
//@ chunk-a9ek44g8.js:8076-8142 sole-consumer
function yt(n) {
  let e = A();
  if (!e || !n) return;
  e.endInteractionSpan(n);
}
/**
 * 会话追踪的 OTel 上下文键：cc.interaction_state、cc.tool_state、cc.blocked_state、cc.execution_state、cc.subagent_state、cc.turn_trace_contexts。
 */
//@ chunk-a9ek44g8.js:8142-8418 sole-consumer
var spanAttributesByContext = new WeakMap(),
  INTERACTION_STATE_KEY = c.createContextKey("cc.interaction_state"),
  TOOL_STATE_KEY = c.createContextKey("cc.tool_state"),
  BLOCKED_STATE_KEY = c.createContextKey("cc.blocked_state"),
  EXECUTION_STATE_KEY = c.createContextKey("cc.execution_state"),
  SUBAGENT_STATE_KEY = c.createContextKey("cc.subagent_state"),
  TURN_TRACE_CONTEXTS_KEY = c.createContextKey("cc.turn_trace_contexts");
//@ chunk-a9ek44g8.js:8418-8442 sole-consumer
class xt {
  lastSequence = 0;
}
//@ chunk-a9ek44g8.js:8442-8467 sole-consumer
var Ft = new HostScoped(() => new xt());
/**
 * CLAUDE_CODE_ENHANCED_TELEMETRY_BETA（或 ENABLE_ENHANCED_TELEMETRY_BETA）为真时启用会话追踪 span。
 */
//@ chunk-a9ek44g8.js:8467-8625 fingerprint = isEnhancedTelemetryEnabled (0.624)
function isEnhancedTelemetryEnabled() {
  let env = process.env.CLAUDE_CODE_ENHANCED_TELEMETRY_BETA ?? process.env.ENABLE_ENHANCED_TELEMETRY_BETA;
  if (isEnvTruthy(env)) return !0;
  if (isEnvDefinedFalsy(env)) return !1;
  return !1;
}
/**
 * 会话追踪是否启用：增强遥测或 beta 追踪任一开启。
 */
//@ chunk-a9ek44g8.js:8625-8658 layout
function isSessionTracingEnabled() {
  return isEnhancedTelemetryEnabled() || isBetaTracingEnabled();
}
//@ chunk-a9ek44g8.js:8658-8682 layout
function isPerfettoTracingEnabled() {
  return !1;
}
//@ chunk-a9ek44g8.js:8682-8707 layout
function Cnr(n, e) {
  return;
}
//@ chunk-a9ek44g8.js:8707-8743 layout
function setSpanError(n, e) {
  n.setStatus(buildErrorSpanStatus(e));
}
//@ chunk-a9ek44g8.js:8743-8845 layout
function setToolUseIdAttributes(n, e) {
  if (!e) return;
  (n.setAttribute("tool_use_id", e), n.setAttribute("gen_ai.tool.call.id", e));
}
/**
 * 把 API 提供方映射成 gen_ai.provider.name（aws.bedrock、gcp.vertex_ai、anthropic）。
 */
//@ chunk-a9ek44g8.js:8845-9062 layout
function getGenAiProviderName(n) {
  switch (n) {
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
  let n = {},
    e = getSessionId();
  if (O.test(e)) n["session.id"] = e;
  let CLAUDE_CODE_REMOTE_SESSION_ID = env.CLAUDE_CODE_REMOTE_SESSION_ID;
  if (CLAUDE_CODE_REMOTE_SESSION_ID !== void 0 && O.test(CLAUDE_CODE_REMOTE_SESSION_ID))
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
var SPAN_SAFE_ATTRIBUTE_NAMES = new Set(["rpc.service", "mcp_tool"]),
  O = /^[A-Za-z0-9_.-]{1,64}$/,
  At = {
    [HEARTHBOT]: /^[a-z][a-z0-9_]{0,39}$/,
    [CLAUDE_CODE_REMOTE]: /^[A-Za-z][A-Za-z0-9_]{0,39}$/,
    playwright: /^browser_[a-z_]{1,40}$/,
  };
/**
 * span 中的工具名脱敏：只放行白名单内的 MCP 工具名，其余 MCP 记 mcp_other，带 __ 的记 other。
 */
//@ chunk-a9ek44g8.js:9493-9718 layout
function sanitizeToolNameForSpan(n) {
  if (n.startsWith("mcp__")) {
    let [, e, ...r] = n.split("__"),
      s = e !== void 0 && Object.hasOwn(At, e) ? At[e] : void 0;
    return s !== void 0 && s.test(r.join("__")) && O.test(n) ? n : "mcp_other";
  }
  return !n.includes("__") && O.test(n) ? n : "other";
}
//@ chunk-a9ek44g8.js:9718-9805 layout
function jt(n) {
  let e = normalizeAgentQuerySource(n)?.replaceAll(":", ".");
  return e !== void 0 && O.test(e) ? e : void 0;
}
//@ chunk-a9ek44g8.js:9805-9843 layout
var ERROR_CLASS_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,47}$/;
//@ chunk-a9ek44g8.js:9843-9982 layout
function buildSpanErrorAttributes(n, e) {
  let r = e?.replace(/[^A-Za-z0-9_]/g, "_");
  return {
    ...(n !== void 0 && !isTracingRedacted() && { error: n }),
    ...(r !== void 0 && ERROR_CLASS_PATTERN.test(r) && { error_class: r }),
  };
}
//@ chunk-a9ek44g8.js:9982-10063 layout
function describeErrorWithoutText(n) {
  return `${n.name} (${n.message.length} chars; text not recorded)`;
}
//@ chunk-a9ek44g8.js:10063-10138 layout
function buildErrorSpanStatus(n) {
  return { code: c.SpanStatusCode.ERROR, ...(n && !isTracingRedacted() && { message: n }) };
}
//@ chunk-a9ek44g8.js:10138-10221 fingerprint = getTracer (0.932)
function getTracer() {
  return c.trace.getTracer("com.anthropic.claude_code.tracing", "1.0.0");
}
//@ chunk-a9ek44g8.js:10221-10247 layout
function getActiveContext() {
  return activeOtelContext();
}
//@ chunk-a9ek44g8.js:10247-10311 layout
function getLiveSpanState(n) {
  let e = getActiveContext().getValue(n);
  return e && !e.ended ? e : void 0;
}
//@ chunk-a9ek44g8.js:10311-10435 callgraph-fingerprint = ensureCleanupInterval (0.174)
function ensureCleanupInterval(n, e) {
  spanAttributesByContext.set(e.span, e);
  let setValue = c.trace.setSpan(e.priorContext, e.span).setValue(n, e);
  if ((otelContextManager.enterWith(setValue), n === INTERACTION_STATE_KEY)) setHostOtelContext(setValue);
}
//@ chunk-a9ek44g8.js:10435-10560 layout
function endSpanState(n, e) {
  if (((e.ended = !0), n === INTERACTION_STATE_KEY && getHostOtelContext()?.getValue(n) === e))
    setHostOtelContext(void 0);
  if (getActiveContext().getValue(n) === e) otelContextManager.enterWith(e.priorContext);
}
//@ chunk-a9ek44g8.js:10560-10614 fingerprint = createSpanAttributes (1)
function createSpanAttributes(spanType, customAttributes = {}) {
  return { ...getSpanBaseAttributes(), "span.type": spanType, ...customAttributes };
}
//@ chunk-a9ek44g8.js:10614-10767 layout
function queuedSendLinks(n) {
  if (!n) return [];
  return n.linked.flatMap(({ traceparent: traceparent }) => {
    let r = parseTraceparent(traceparent);
    return r ? [{ context: r, attributes: { "link.type": "queued_send" } }] : [];
  });
}
//@ chunk-a9ek44g8.js:10767-10805 layout
function getTurnTraceContexts() {
  return getActiveContext().getValue(TURN_TRACE_CONTEXTS_KEY);
}
//@ chunk-a9ek44g8.js:10805-10842 layout
function Rnr() {
  return getTurnTraceContexts()?.contexts;
}
//@ chunk-a9ek44g8.js:10842-10978 layout
function getUpstreamTraceparent() {
  let n = getTurnTraceContexts();
  return isCcsTenant() &&
    getAPIProvider() === "firstParty" &&
    assumesFirstPartyBaseUrl() &&
    !isActualFirstPartyAnthropicBaseUrl()
    ? (n?.contexts?.parent?.traceparent ?? n?.fallbackTraceparent)
    : void 0;
}
//@ chunk-a9ek44g8.js:10978-11027 layout
function s5r() {
  let n = getTurnTraceContexts();
  if (n) n.contexts = void 0;
}
//@ chunk-a9ek44g8.js:11027-11259 layout
function setAgentIdAttributes(n, e) {
  if (isMainAgent(e)) return;
  let r = e.agentId !== void 0 ? relayedId(e.agentId) : void 0;
  if (r !== void 0) n.setAttribute("agent_id", r);
  let s = e.parentAgentId !== void 0 ? relayedId(e.parentAgentId) : void 0;
  if (s !== void 0) n.setAttribute("parent_agent_id", s);
}
//@ chunk-a9ek44g8.js:11259-11337 layout
function getMainConversationIdAttributes() {
  let n = getSessionId();
  return !isTracingRedacted() || O.test(n) ? { "gen_ai.conversation.id": n } : {};
}
//@ chunk-a9ek44g8.js:11337-11535 layout
function getConversationIdAttributes(n) {
  switch (n.agentType) {
    case "main":
      return getMainConversationIdAttributes();
    case "subagent": {
      if (n.isMainSession) return getMainConversationIdAttributes();
      let e = relayedId(n.agentId);
      return e !== void 0 ? { "gen_ai.conversation.id": e } : {};
    }
    case "teammate":
      return {};
  }
}
/**
 * 开始一次用户交互的 claude_code.interaction span。
 */
//@ chunk-a9ek44g8.js:11535-12593 fingerprint = startInteractionSpan (0.527)
function startInteractionSpan(n, e) {
  let r = Rqe() ? bt(n) : void 0,
    s = getActiveContext();
  if (!isSessionTracingEnabled()) {
    if (r) {
      let dummySpan = c.trace.getActiveSpan() || getTracer().startSpan("dummy");
      return (
        ensureCleanupInterval(INTERACTION_STATE_KEY, {
          span: dummySpan,
          startTime: performance.now(),
          attributes: { "span.type": "interaction" },
          perfettoSpanId: r,
          priorContext: s,
        }),
        dummySpan
      );
    }
    return c.trace.getActiveSpan() || getTracer().startSpan("dummy");
  }
  let o = getTracer(),
    tracer = isPromptHookObserved(),
    u = tracer ? "<REDACTED>" : redactIfDisabled(n),
    h = ++Ft.of(getRootSession().host).lastSequence,
    attributes = createSpanAttributes("interaction", {
      "gen_ai.operation.name": "invoke_agent",
      ...getMainConversationIdAttributes(),
      user_prompt: u,
      user_prompt_length: tracer ? 0 : n.length,
      "interaction.sequence": h,
    }),
    p = isTracingRedacted() ? e : void 0,
    g = p?.parent
      ? traceContextPropagator.extract(s, { traceparent: p.parent.traceparent }, c.defaultTextMapGetter)
      : s,
    m =
      g === s && getIsNonInteractiveSession() && env.TRACEPARENT
        ? c.propagation.extract(s, { traceparent: env.TRACEPARENT, tracestate: env.TRACESTATE })
        : s,
    b = g !== s ? g : m;
  attributes["parent.source"] = g !== s ? "event" : m !== s ? "env" : "none";
  let spanId = queuedSendLinks(p);
  attributes.queued_sends = spanId.length;
  let startSpan = o.startSpan("claude_code.interaction", { attributes: attributes, links: spanId }, b);
  if (!isTracingRedacted() && !tracer) addBetaInteractionAttributes(startSpan, n);
  return (
    ensureCleanupInterval(INTERACTION_STATE_KEY, {
      span: startSpan,
      startTime: performance.now(),
      attributes: attributes,
      perfettoSpanId: r,
      priorContext: s,
      promptHandle: Symbol("interaction prompt"),
      isPromptHeld: tracer,
    }),
    startSpan
  );
}
//@ chunk-a9ek44g8.js:12593-12691 layout = redactIfDisabled (0.778)
function redactIfDisabled(content) {
  return env.OTEL_LOG_USER_PROMPTS && !isTracingRedacted()
    ? redactAccountMemoryText(() => accountMemoryRedactionKeys(getRootSession().host), void 0, content)
    : "<REDACTED>";
}
//@ chunk-a9ek44g8.js:12691-12732 layout
function xbn() {
  return getLiveSpanState(INTERACTION_STATE_KEY)?.promptHandle;
}
//@ chunk-a9ek44g8.js:12732-12992 file-local
function getCurrentSpan(n, e, r) {
  let s = getLiveSpanState(INTERACTION_STATE_KEY);
  if (n === void 0 || s?.promptHandle !== n || (s.isPromptHeld !== !0 && r === e)) return;
  if (
    ((s.isPromptHeld = r === void 0),
    s.span.setAttributes({
      user_prompt: r === void 0 ? "<REDACTED>" : redactIfDisabled(r),
      user_prompt_length: r?.length ?? 0,
    }),
    !isTracingRedacted())
  )
    addBetaInteractionAttributes(s.span, r ?? "<REDACTED>");
}
//@ chunk-a9ek44g8.js:12992-13169 layout
function withInteractionSpan(n, e, r) {
  let [s, o] = typeof e === "function" ? [void 0, e] : [e, r];
  return withTurnTraceContexts(s, () => {
    let a = getActiveContext();
    startInteractionSpan(n, s);
    let u = getActiveContext();
    try {
      return otelContextManager.with(u, o);
    } finally {
      if (getActiveContext() === u) otelContextManager.enterWith(a);
    }
  });
}
//@ chunk-a9ek44g8.js:13169-13267 layout
function withTurnTraceContexts(n, e, r) {
  let s = { contexts: n, fallbackTraceparent: r };
  return otelContextManager.with(getActiveContext().setValue(TURN_TRACE_CONTEXTS_KEY, s), e);
}
//@ chunk-a9ek44g8.js:13267-13503 fingerprint = endInteractionSpan (0.841)
function endInteractionSpan() {
  let n = getLiveSpanState(INTERACTION_STATE_KEY);
  if (!n) return;
  if (n.perfettoSpanId) yt(n.perfettoSpanId);
  if (!isSessionTracingEnabled()) {
    endSpanState(INTERACTION_STATE_KEY, n);
    return;
  }
  let max = Math.max(0, Math.round(performance.now() - n.startTime));
  (n.span.setAttributes({ "interaction.duration_ms": max }),
    n.span.end(),
    endSpanState(INTERACTION_STATE_KEY, n));
}
//@ chunk-a9ek44g8.js:13503-14459 fingerprint = startLLMRequestSpan (0.751)
function startLLMRequestSpan(n, e, r, s, o, a, u) {
  let h = Rqe()
      ? perfettoStartLlmRequest({ model: n, querySource: a ?? r?.querySource, messageId: void 0 })
      : void 0,
    f = getActiveContext();
  if (!isSessionTracingEnabled()) {
    if (h) {
      let dummySpan = c.trace.getActiveSpan() || getTracer().startSpan("dummy");
      return (
        spanAttributesByContext.set(dummySpan, {
          span: dummySpan,
          startTime: performance.now(),
          attributes: { model: n },
          perfettoSpanId: h,
          priorContext: f,
        }),
        dummySpan
      );
    }
    return c.trace.getActiveSpan() || getTracer().startSpan("dummy");
  }
  let tracer = getTracer(),
    g = getActiveContext().getValue(TOOL_STATE_KEY),
    m = isTracingRedacted() ? Bn(n) : n,
    attributes = createSpanAttributes("llm_request", {
      model: m,
      "gen_ai.system": "anthropic",
      "gen_ai.request.model": m,
      "llm_request.context": g
        ? "tool"
        : getLiveSpanState(INTERACTION_STATE_KEY)
          ? "interaction"
          : "standalone",
      speed: o ? "fast" : "normal",
      ...(e && getConversationIdAttributes(e)),
    }),
    span = tracer.startSpan("claude_code.llm_request", { attributes: attributes }, f);
  if (r?.querySource && !isTracingRedacted()) span.setAttribute("query_source", r.querySource);
  let spanId = jt(a ?? r?.querySource);
  if (spanId !== void 0) span.setAttribute("query_source_safe", spanId);
  if (e && !isMainAgent(e)) {
    if ((setAgentIdAttributes(span, e), !isTracingRedacted()))
      span.setAttributes(getWorkflowSpanAttributes(e));
  }
  if (!isTracingRedacted()) addBetaLLMRequestAttributes(span, r, s, u, e);
  return (
    spanAttributesByContext.set(span, {
      span: span,
      startTime: performance.now(),
      attributes: attributes,
      perfettoSpanId: h,
      priorContext: f,
    }),
    span
  );
}
//@ chunk-a9ek44g8.js:14459-14643 layout
function recordLlmRequestAttempt(n, { attempt: attempt, clientRequestId: clientRequestId }) {
  let s = { attempt: attempt };
  if (clientRequestId !== void 0) s.client_request_id = clientRequestId;
  if (n && isSessionTracingEnabled()) n.addEvent("gen_ai.request.attempt", s);
  perfettoEmitInstant("LLM Attempt", "api,attempt", s);
}
//@ chunk-a9ek44g8.js:14643-14682 layout
var traceContextPropagator = new Et.W3CTraceContextPropagator();
/**
 * 解析 W3C traceparent 字符串为 SpanContext。
 */
//@ chunk-a9ek44g8.js:14682-14801 layout
function parseTraceparent(n) {
  let extract = traceContextPropagator.extract(c.ROOT_CONTEXT, { traceparent: n }, c.defaultTextMapGetter);
  return c.trace.getSpanContext(extract);
}
//@ chunk-a9ek44g8.js:14801-16622 fingerprint = endLLMRequestSpan (0.561)
function endLLMRequestSpan(span, metadata) {
  if (!span) return;
  let r = spanAttributesByContext.get(span);
  if (!r || r.ended) return;
  r.ended = !0;
  let max = Math.max(0, Math.round(performance.now() - r.startTime));
  if (metadata?.error !== void 0)
    metadata = {
      ...metadata,
      error: redactAccountMemoryText(
        metadata.accountMemoryKeys ?? (() => accountMemoryRedactionKeys(getRootSession().host)),
        metadata.querySource,
        metadata.error,
      ),
    };
  if (r.perfettoSpanId)
    lt(r.perfettoSpanId, {
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
  let endAttributes = { duration_ms: max };
  if (metadata) {
    if (metadata.inputTokens !== void 0) endAttributes.input_tokens = metadata.inputTokens;
    if (metadata.outputTokens !== void 0) endAttributes.output_tokens = metadata.outputTokens;
    if (metadata.cacheReadTokens !== void 0) endAttributes.cache_read_tokens = metadata.cacheReadTokens;
    if (metadata.cacheCreationTokens !== void 0)
      endAttributes.cache_creation_tokens = metadata.cacheCreationTokens;
    if (metadata.success !== void 0) endAttributes.success = metadata.success;
    if (metadata.statusCode !== void 0) endAttributes.status_code = metadata.statusCode;
    if (
      (Object.assign(endAttributes, buildSpanErrorAttributes(metadata.error, metadata.errorClass)),
      metadata.attempt !== void 0)
    )
      endAttributes.attempt = metadata.attempt;
    if (metadata.hasToolCall !== void 0) endAttributes["response.has_tool_call"] = metadata.hasToolCall;
    if (metadata.requestId !== void 0)
      ((endAttributes.request_id = metadata.requestId),
        (endAttributes["gen_ai.response.id"] = metadata.requestId));
    if (metadata.clientRequestId !== void 0) endAttributes.client_request_id = metadata.clientRequestId;
    if (metadata.ttftMs !== void 0) endAttributes.ttft_ms = metadata.ttftMs;
    if (metadata.firstContentMs !== void 0) endAttributes.first_content_ms = metadata.firstContentMs;
    if (metadata.effort !== void 0) endAttributes.effort = metadata.effort;
    if (!isTracingRedacted()) addBetaLLMResponseAttributes(endAttributes, metadata);
  }
  if ((r.span.setAttributes(endAttributes), metadata?.stopReason !== void 0))
    (r.span.setAttribute("stop_reason", metadata.stopReason),
      r.span.setAttribute("gen_ai.response.finish_reasons", [metadata.stopReason]));
  if (metadata?.success === !1) r.span.setStatus(buildErrorSpanStatus(metadata.error));
  if (metadata?.traceresponse) {
    let spanId = parseTraceparent(metadata.traceresponse);
    if (spanId) r.span.addLink({ context: spanId, attributes: { "link.type": "parent_of" } });
  }
  r.span.end();
}
//@ chunk-a9ek44g8.js:16622-17392 fingerprint = startToolSpan (0.573)
function startToolSpan(n, e, r, s, o, a = !1) {
  let u = Rqe() ? mt(n, r) : void 0,
    h = getActiveContext();
  if (!isSessionTracingEnabled()) {
    if (u) {
      let dummySpan = c.trace.getActiveSpan() || getTracer().startSpan("dummy");
      return (
        ensureCleanupInterval(TOOL_STATE_KEY, {
          span: dummySpan,
          startTime: performance.now(),
          attributes: { "span.type": "tool", tool_name: n },
          perfettoSpanId: u,
          priorContext: h,
        }),
        dummySpan
      );
    }
    return c.trace.getActiveSpan() || getTracer().startSpan("dummy");
  }
  let f = getTracer(),
    spanId = sanitizeToolNameForSpan(n),
    g = isTracingRedacted() ? spanId : n,
    m = extractMcpToolDetails(g),
    attributes = createSpanAttributes("tool", {
      tool_name: g,
      tool_name_safe: spanId,
      "gen_ai.operation.name": "execute_tool",
      "gen_ai.tool.name": m?.mcpToolName ?? g,
      ...(m && { "anthropic.mcp.server.name": m.serverName }),
      ...(e && getConversationIdAttributes(e)),
      ...r,
    }),
    span = f.startSpan("claude_code.tool", { attributes: attributes }, h);
  if (e && !isMainAgent(e)) {
    if ((setAgentIdAttributes(span, e), !isTracingRedacted()))
      span.setAttributes(getWorkflowSpanAttributes(e));
  }
  if ((setToolUseIdAttributes(span, o), s && !isTracingRedacted())) addBetaToolInputAttributes(span, n, s, a);
  return (
    ensureCleanupInterval(TOOL_STATE_KEY, {
      span: span,
      startTime: performance.now(),
      attributes: attributes,
      perfettoSpanId: u,
      priorContext: h,
    }),
    span
  );
}
//@ chunk-a9ek44g8.js:17392-17917 fingerprint = startToolBlockedOnUserSpan (0.886)
function startToolBlockedOnUserSpan(n) {
  let e = Rqe() ? _t("tool_permission") : void 0,
    r = getActiveContext();
  if (!isSessionTracingEnabled()) {
    if (e) {
      let dummySpan = c.trace.getActiveSpan() || getTracer().startSpan("dummy");
      return (
        ensureCleanupInterval(BLOCKED_STATE_KEY, {
          span: dummySpan,
          startTime: performance.now(),
          attributes: { "span.type": "tool.blocked_on_user" },
          perfettoSpanId: e,
          priorContext: r,
        }),
        dummySpan
      );
    }
    return c.trace.getActiveSpan() || getTracer().startSpan("dummy");
  }
  let tracer = getTracer(),
    o = createSpanAttributes("tool.blocked_on_user", getConversationIdAttributes(n)),
    span = tracer.startSpan("claude_code.tool.blocked_on_user", { attributes: o }, r);
  return (
    ensureCleanupInterval(BLOCKED_STATE_KEY, {
      span: span,
      startTime: performance.now(),
      attributes: o,
      perfettoSpanId: e,
      priorContext: r,
    }),
    span
  );
}
//@ chunk-a9ek44g8.js:17917-18198 file-local
function endToolBlockedOnUserSpan(decision, source) {
  let spanId = getLiveSpanState(BLOCKED_STATE_KEY);
  if (!spanId) return;
  if (spanId.perfettoSpanId) St(spanId.perfettoSpanId, { decision: decision, source: source });
  if (!isSessionTracingEnabled()) {
    endSpanState(BLOCKED_STATE_KEY, spanId);
    return;
  }
  let attributes = { duration_ms: Math.max(0, Math.round(performance.now() - spanId.startTime)) };
  if (decision) attributes.decision = decision;
  if (source) attributes.source = source;
  (spanId.span.setAttributes(attributes), spanId.span.end(), endSpanState(BLOCKED_STATE_KEY, spanId));
}
//@ chunk-a9ek44g8.js:18198-18475 fingerprint = startToolExecutionSpan (0.831)
function startToolExecutionSpan(n, e) {
  let tracer = getActiveContext();
  if (!isSessionTracingEnabled()) return c.trace.getActiveSpan() || getTracer().startSpan("dummy");
  let s = getTracer(),
    o = createSpanAttributes("tool.execution", getConversationIdAttributes(n)),
    span = s.startSpan("claude_code.tool.execution", { attributes: o }, tracer);
  return (
    setToolUseIdAttributes(span, e),
    ensureCleanupInterval(EXECUTION_STATE_KEY, {
      span: span,
      startTime: performance.now(),
      attributes: o,
      priorContext: tracer,
    }),
    span
  );
}
/**
 * 结束工具执行 span（耗时、成功、错误）。
 */
//@ chunk-a9ek44g8.js:18475-18850 layout
function endToolExecutionSpan(n) {
  if (!isSessionTracingEnabled()) return;
  let e = getLiveSpanState(EXECUTION_STATE_KEY);
  if (!e) return;
  let s = { duration_ms: Math.max(0, Math.round(performance.now() - e.startTime)) };
  if (n) {
    if (n.success !== void 0) s.success = n.success;
    if (n.success === !1 && !n.interrupted) s["error.type"] = "tool_error";
    Object.assign(s, buildSpanErrorAttributes(n.error, n.errorClass));
  }
  if ((e.span.setAttributes(s), n?.success === !1)) e.span.setStatus(buildErrorSpanStatus(n.error));
  (e.span.end(), endSpanState(EXECUTION_STATE_KEY, e));
}
//@ chunk-a9ek44g8.js:18850-19231 fingerprint = endToolSpan (0.787)
function endToolSpan(n, e, r, s = !1) {
  let o = n ? spanAttributesByContext.get(n) : getLiveSpanState(TOOL_STATE_KEY);
  if (!o || o.ended) return;
  if (o.perfettoSpanId) ht(o.perfettoSpanId, { success: !0, resultTokens: r });
  if (!isSessionTracingEnabled()) {
    endSpanState(TOOL_STATE_KEY, o);
    return;
  }
  let endAttributes = { duration_ms: Math.max(0, Math.round(performance.now() - o.startTime)) };
  if (e && !0 && !isTracingRedacted()) {
    let toolName = o.attributes.tool_name || "unknown";
    addBetaToolResultAttributes(endAttributes, toolName, e, s);
  }
  if (r !== void 0) endAttributes.result_tokens = r;
  (o.span.setAttributes(endAttributes), o.span.end(), endSpanState(TOOL_STATE_KEY, o));
}
//@ chunk-a9ek44g8.js:19231-19290 layout
function shouldRecordToolContent(n) {
  return (
    isSessionTracingEnabled() && isToolContentLoggingEnabled() && !isTracingRedacted() && n.isRecording()
  );
}
//@ chunk-a9ek44g8.js:19290-19463 layout
function stringifyToolContentForSpan(n) {
  if (typeof n === "string") return n;
  if (!Array.isArray(n)) return "";
  return n.map((e) => (e?.type === "text" ? String(e.text) : `[${String(e?.type ?? "unknown")}]`)).join(`
`);
}
//@ chunk-a9ek44g8.js:19463-19740 fingerprint = addToolContentEvent (0.901)
function addToolContentEvent(n, e, r) {
  if (!shouldRecordToolContent(n)) return;
  let s = spanAttributesByContext.get(n);
  if (!s || s.ended) return;
  let processedAttributes = {};
  for (let [a, u] of Object.entries(r))
    if (typeof u === "string") {
      let { content: content, truncated: truncated } = truncateContentForTelemetry(u);
      if (((processedAttributes[a] = content), truncated))
        ((processedAttributes[`${a}_truncated`] = !0),
          (processedAttributes[`${a}_original_length`] = u.length));
    } else processedAttributes[a] = u;
  s.span.addEvent(e, processedAttributes);
}
//@ chunk-a9ek44g8.js:19740-19970 file-local
function getSpanId(span) {
  if (!isSessionTracingEnabled()) return;
  let spanContext = span.spanContext();
  if (!spanContext.traceId || spanContext.traceId === "00000000000000000000000000000000") return;
  let setSpan = c.trace.setSpan(c.context.active(), span),
    s = {};
  return (traceContextPropagator.inject(setSpan, s, c.defaultTextMapSetter), s.traceparent);
}
//@ chunk-a9ek44g8.js:19970-20055 layout
function getActiveSpanId() {
  if (!isSessionTracingEnabled()) return;
  let span = c.trace.getSpan(getActiveContext());
  if (!span) return;
  return getSpanId(span);
}
/**
 * 由 traceparent 提取上下文。
 */
//@ chunk-a9ek44g8.js:20055-20177 layout
function extractTraceparentContext(n) {
  if (!n || !isSessionTracingEnabled()) return;
  let e = getActiveContext(),
    extract = traceContextPropagator.extract(e, { traceparent: n }, c.defaultTextMapGetter);
  return extract === e ? void 0 : extract;
}
//@ chunk-a9ek44g8.js:20177-20231 layout
function runInContext(n, e) {
  return n === void 0 ? e() : otelContextManager.with(n, e);
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
  if (!s) return r(void 0);
  let setSpan = c.trace.setSpan(getActiveContext(), s);
  return otelContextManager.with(setSpan, async () => {
    try {
      return await r(s);
    } catch (error) {
      if (!e.isExpectedError?.(error)) {
        let u =
          error instanceof Error && e.withholdErrorText?.(error) ? describeErrorWithoutText(error) : void 0;
        if (error instanceof Error && !isTracingRedacted())
          s.recordException(u === void 0 ? error : { name: error.name, message: u });
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
  let tracer = getActiveContext(),
    r = relayedId(n.agentId),
    ctx = n.parentAgentId !== void 0 ? relayedId(n.parentAgentId) : void 0,
    o = createSpanAttributes("subagent.spawn", {
      ...(r !== void 0 && { agent_id: r }),
      agent_type: isTracingRedacted() && !n.isBuiltIn ? "custom" : n.agentType,
      ...(ctx !== void 0 && { parent_agent_id: ctx }),
    }),
    startSpan = getTracer().startSpan("claude_code.subagent.spawn", { attributes: o }, tracer);
  return (
    ensureCleanupInterval(SUBAGENT_STATE_KEY, {
      span: startSpan,
      startTime: performance.now(),
      attributes: o,
      priorContext: tracer,
    }),
    startSpan
  );
}
/**
 * 结束子代理 span。
 */
//@ chunk-a9ek44g8.js:21218-21430 layout
function endSubagentSpan(n, e) {
  if (!n) return;
  let r = spanAttributesByContext.get(n);
  if (!r || r.ended) return;
  if (e?.success !== void 0) n.setAttribute("success", e.success);
  if (e?.error) (n.setAttributes(buildSpanErrorAttributes(e.error, e.errorClass)), setSpanError(n, e.error));
  (n.end(), endSpanState(SUBAGENT_STATE_KEY, r));
}
//@ chunk-a9ek44g8.js:21430-21463 layout
function isAnyBetaTracingEnabled() {
  return isBetaTracingEnabled() || isPerfettoTracingEnabled();
}
//@ chunk-a9ek44g8.js:21463-21822 fingerprint = startHookSpan (0.866)
function startHookSpan(n, e, r, s, o) {
  if (!isAnyBetaTracingEnabled()) return c.trace.getActiveSpan() || getTracer().startSpan("dummy");
  let tracer = getTracer(),
    u = getActiveContext(),
    { content: content } = truncateContentForTelemetry(s),
    attributes = createSpanAttributes("hook", {
      ...getConversationIdAttributes(o),
      hook_event: n,
      hook_name: isTracingRedacted() ? n : e,
      num_hooks: r,
      ...(isToolDetailsLoggingEnabled() && !isTracingRedacted() && { hook_definitions: content }),
    }),
    span = tracer.startSpan("claude_code.hook", { attributes: attributes }, u);
  return (
    spanAttributesByContext.set(span, {
      span: span,
      startTime: performance.now(),
      attributes: attributes,
      priorContext: u,
    }),
    span
  );
}
//@ chunk-a9ek44g8.js:21822-22365 fingerprint = endHookSpan (0.837)
function endHookSpan(span, metadata) {
  if (!isAnyBetaTracingEnabled()) return;
  let r = spanAttributesByContext.get(span);
  if (!r || r.ended) return;
  r.ended = !0;
  let endAttributes = { duration_ms: Math.max(0, Math.round(performance.now() - r.startTime)) };
  if (metadata) {
    if (metadata.numSuccess !== void 0) endAttributes.num_success = metadata.numSuccess;
    if (metadata.numBlocking !== void 0) endAttributes.num_blocking = metadata.numBlocking;
    if (metadata.numNonBlockingError !== void 0)
      endAttributes.num_non_blocking_error = metadata.numNonBlockingError;
    if (metadata.numCancelled !== void 0) endAttributes.num_cancelled = metadata.numCancelled;
  }
  if ((r.span.setAttributes(endAttributes), metadata && (metadata.numNonBlockingError ?? 0) > 0))
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
  Rnr,
  isPerfettoTracingEnabled,
  truncateContentForTelemetry,
  withToolExecutionSpan,
  withInteractionSpan,
  endInteractionSpan,
  xbn,
  s5r,
  getSpanId,
  getUpstreamTraceparent,
  recordLlmRequestAttempt,
  startLLMRequestSpan,
  hasPromptHooks,
  startHookSpan,
  endHookSpan,
  Rbn,
  isEnhancedTelemetryEnabled,
  isToolContentLoggingEnabled,
  endToolExecutionSpan_2,
  Cnr,
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
