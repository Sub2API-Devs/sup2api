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
import { promClient_2, otelApi } from "./gatewayIdentityAttributes.js";
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
  warnedNoEventLogger = false;
}
//@ chunk-p52gp8zk.js:14702-14727 placement
var otelEventStateByHost = new HostScoped(() => new OTelEventState());
//@ chunk-p52gp8zk.js:14727-14772 layout = isUserPromptLoggingEnabled (1)
function isUserPromptLoggingEnabled_2() {
  return env.OTEL_LOG_USER_PROMPTS;
}
//@ chunk-p52gp8zk.js:14772-14814 fingerprint = redactIfDisabled (1)
/**
 * OTEL_LOG_USER_PROMPTS 未开启时返回 <REDACTED>。
 */
function redactIfDisabled(content) {
  return isUserPromptLoggingEnabled_2() ? content : "<REDACTED>";
}
//@ chunk-p52gp8zk.js:14814-14977 layout = redactIfDisabled (0.762)
function redactIfDisabled_2(content) {
  if (content === undefined)
    return {
      prompt: "<REDACTED>",
      prompt_text: "<REDACTED>",
    };
  let n = isUserPromptLoggingEnabled_2()
    ? redactAccountMemoryText(() => accountMemoryRedactionKeys(getRootSession().host), undefined, content)
    : redactIfDisabled(content);
  return {
    prompt: n,
    prompt_text: n,
  };
}
//@ chunk-p52gp8zk.js:14977-15055 layout
function isAssistantResponseLoggingEnabled() {
  return env.OTEL_LOG_ASSISTANT_RESPONSES ?? env.OTEL_LOG_USER_PROMPTS;
}
//@ chunk-p52gp8zk.js:15055-15095 layout
var traceContextPropagator = new promClient_2.W3CTraceContextPropagator();
//@ chunk-p52gp8zk.js:15095-15314 layout
function getEventContext() {
  let e = activeOtelContext();
  let spanContext = otelApi.trace.getSpanContext(e);
  if (spanContext && otelApi.isSpanContextValid(spanContext)) return e;
  if (getIsNonInteractiveSession() && env.TRACEPARENT)
    return traceContextPropagator.extract(
      e,
      {
        traceparent: env.TRACEPARENT,
        tracestate: env.TRACESTATE,
      },
      otelApi.defaultTextMapGetter,
    );
  return;
}
//@ chunk-p52gp8zk.js:15314-16085 fingerprint = logOTelEvent (0.668)
/**
 * 发 OTel 事件（claude_code.<name>）：属性含 getTelemetryAttributes、event.name/timestamp/sequence、prompt.id、workspace.host_paths、agent id；无事件 logger 时可跳过。
 */
async function logOTelEvent(e, metadata = {}, agentContext, hookOrigin) {
  let s = otelEventStateByHost.of(getRootSession().host);
  if (
    s.warnedNoEventLogger &&
    getEventLogger() === null &&
    !isOTelInitPending() &&
    !env.CLAUDE_CODE_DISABLE_OTEL_EVENT_SKIP &&
    eventRecordQueue.isIdle() &&
    eventRecordQueue.getRoad()?.isWatched(hookOrigin) === false
  )
    return;
  let attributes = {
    ...getTelemetryAttributes(),
    "event.name": e,
    "event.timestamp": new Date().toISOString(),
    "event.sequence": s.nextSequence++,
  };
  let promptId = getPromptId();
  if (promptId) attributes["prompt.id"] = promptId;
  let workspaceDir = env.CLAUDE_CODE_WORKSPACE_HOST_PATHS;
  if (workspaceDir) attributes["workspace.host_paths"] = workspaceDir.split("|");
  Object.assign(attributes, getWorkflowSpanAttributes(agentContext));
  for (let [key, value] of Object.entries(isDiskless() ? maskModelIdsInRecord(metadata) : metadata)) {
    let g = key === "error" && isDiskless() && !/^[a-z0-9_]+$/.test(String(value));
    if (value !== undefined && !g) attributes[key] = value;
  }
  try {
    Object.assign(attributes, agentAttributes(agentContext));
  } catch (error) {
    logForDebugging(`[3P telemetry] Agent ids not stamped: ${String(error)}`, {
      level: "warn",
    });
  }
  let loggedAt = new Date();
  let eventContext = getEventContext();
  await eventRecordQueue.route(
    () =>
      buildEventRecord({
        event: e,
        attributes,
        loggedAt,
        eventContext,
      }),
    hookOrigin,
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
