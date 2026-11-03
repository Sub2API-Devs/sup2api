/**
 * utils/telemetry/events.ts
 *
 * OTel 事件 logOTelEvent（claude_code.<name>）、序号、提示词脱敏（OTEL_LOG_USER_PROMPTS）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/events.ts
 * pieces: chunk-a9ek44g8.js (1), chunk-p52gp8zk.js (9)
 * attribution: fingerprint 3, placement 2, layout 5
 */
import { HostScoped } from "../hostScoped.js";
import { env } from "../env.js";
import { redactAccountMemoryText, accountMemoryRedactionKeys } from "./accountMemoryRedaction.js";
import {
  getRootSession,
  getIsNonInteractiveSession,
  getEventLogger,
  isOTelInitPending,
  getPromptId,
  isDiskless,
} from "../../bootstrap/state.js";
import { Ae, C } from "./gatewayIdentityAttributes.js";
import { activeOtelContext } from "./messageContentAttributes.js";
import { eventRecordQueue, buildEventRecord } from "./thirdPartyEventRecords.js";
import { getTelemetryAttributes } from "../telemetryAttributes.js";
import { getWorkflowSpanAttributes } from "../agentContext.js";
import { maskModelIdsInRecord } from "../model/modelCatalog/catalogEntries.js";
import { agentAttributes } from "./repositoryAttributes.js";
import { logForDebugging } from "../debug.js";

//@ chunk-p52gp8zk.js:14655-14702 placement
class OTelEventState {
  nextSequence = 0;
  warnedNoEventLogger = !1;
}
//@ chunk-p52gp8zk.js:14702-14727 placement
var otelEventStateByHost = new HostScoped(() => new OTelEventState());
//@ chunk-p52gp8zk.js:14727-14772 layout = isUserPromptLoggingEnabled (1)
function isUserPromptLoggingEnabled_2() {
  return env.OTEL_LOG_USER_PROMPTS;
}
/**
 * OTEL_LOG_USER_PROMPTS 未开启时返回 <REDACTED>。
 */
//@ chunk-p52gp8zk.js:14772-14814 fingerprint = redactIfDisabled (1)
function redactIfDisabled(content) {
  return isUserPromptLoggingEnabled_2() ? content : "<REDACTED>";
}
//@ chunk-p52gp8zk.js:14814-14977 layout = redactIfDisabled (0.762)
function redactIfDisabled_2(content) {
  if (content === void 0) return { prompt: "<REDACTED>", prompt_text: "<REDACTED>" };
  let n = isUserPromptLoggingEnabled_2()
    ? redactAccountMemoryText(() => accountMemoryRedactionKeys(getRootSession().host), void 0, content)
    : redactIfDisabled(content);
  return { prompt: n, prompt_text: n };
}
//@ chunk-p52gp8zk.js:14977-15055 layout
function isAssistantResponseLoggingEnabled() {
  return env.OTEL_LOG_ASSISTANT_RESPONSES ?? env.OTEL_LOG_USER_PROMPTS;
}
//@ chunk-p52gp8zk.js:15055-15095 layout
var nt = new Ae.W3CTraceContextPropagator();
//@ chunk-p52gp8zk.js:15095-15314 layout
function getEventContext() {
  let e = activeOtelContext(),
    spanContext = C.trace.getSpanContext(e);
  if (spanContext && C.isSpanContextValid(spanContext)) return e;
  if (getIsNonInteractiveSession() && env.TRACEPARENT)
    return nt.extract(
      e,
      { traceparent: env.TRACEPARENT, tracestate: env.TRACESTATE },
      C.defaultTextMapGetter,
    );
  return;
}
/**
 * 发 OTel 事件（claude_code.<name>）：属性含 getTelemetryAttributes、event.name/timestamp/sequence、prompt.id、workspace.host_paths、agent id；无事件 logger 时可跳过。
 */
//@ chunk-p52gp8zk.js:15314-16085 fingerprint = logOTelEvent (0.668)
async function logOTelEvent(e, n = {}, o, r) {
  let of = otelEventStateByHost.of(getRootSession().host);
  if (
    of.warnedNoEventLogger &&
    getEventLogger() === null &&
    !isOTelInitPending() &&
    !env.CLAUDE_CODE_DISABLE_OTEL_EVENT_SKIP &&
    eventRecordQueue.isIdle() &&
    eventRecordQueue.getRoad()?.isWatched(r) === !1
  )
    return;
  let attributes = {
      ...getTelemetryAttributes(),
      "event.name": e,
      "event.timestamp": new Date().toISOString(),
      "event.sequence": of.nextSequence++,
    },
    promptId = getPromptId();
  if (promptId) attributes["prompt.id"] = promptId;
  let workspaceDir = env.CLAUDE_CODE_WORKSPACE_HOST_PATHS;
  if (workspaceDir) attributes["workspace.host_paths"] = workspaceDir.split("|");
  Object.assign(attributes, getWorkflowSpanAttributes(o));
  for (let [m, E] of Object.entries(isDiskless() ? maskModelIdsInRecord(n) : n)) {
    let g = m === "error" && isDiskless() && !/^[a-z0-9_]+$/.test(String(E));
    if (E !== void 0 && !g) attributes[m] = E;
  }
  try {
    Object.assign(attributes, agentAttributes(o));
  } catch (error) {
    logForDebugging(`[3P telemetry] Agent ids not stamped: ${String(error)}`, { level: "warn" });
  }
  let date = new Date(),
    y = getEventContext();
  await eventRecordQueue.route(
    () => buildEventRecord({ event: e, attributes: attributes, loggedAt: date, eventContext: y }),
    r,
  );
}
//@ chunk-a9ek44g8.js:2113-2157 fingerprint = isUserPromptLoggingEnabled (1)
function isUserPromptLoggingEnabled() {
  return env.OTEL_LOG_USER_PROMPTS;
}

export {
  logOTelEvent,
  isUserPromptLoggingEnabled,
  redactIfDisabled_2,
  isAssistantResponseLoggingEnabled,
  otelEventStateByHost,
};
