/**
 * utils/telemetry/events.ts
 *
 * OTel 事件 logOTelEvent（claude_code.<name>）、序号、提示词脱敏（OTEL_LOG_USER_PROMPTS）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/events.ts
 * pieces: chunk-4qbrxszq.js (1), chunk-a0xc6evk.js (9)
 * attribution: fingerprint 3, placement 2, layout 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a0xc6evk.js:10256-10303 placement
class OTelEventState {
  nextSequence = 0;
  warnedNoEventLogger = false;
}
//@ chunk-a0xc6evk.js:10303-10328 placement
var otelEventStateByHost; // deferred: uses OTelEventState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a0xc6evk.js:10303", () => {
  otelEventStateByHost = new HostScoped(() => new OTelEventState());
});
//@ chunk-a0xc6evk.js:10328-10373 layout (2.1.88 match: isUserPromptLoggingEnabled, 1)
function isUserPromptLoggingEnabled_2() {
  return env.OTEL_LOG_USER_PROMPTS;
}
//@ chunk-a0xc6evk.js:10373-10415 fingerprint (2.1.88 match: redactIfDisabled, 1)
/**
 * OTEL_LOG_USER_PROMPTS 未开启时返回 <REDACTED>。
 */
function redactIfDisabled(content) {
  return isUserPromptLoggingEnabled_2() ? content : "<REDACTED>";
}
//@ chunk-a0xc6evk.js:10415-10578 layout (2.1.88 match: redactIfDisabled, 0.762)
function redactIfDisabled_2(content) {
  if (content === undefined)
    return {
      prompt: "<REDACTED>",
      prompt_text: "<REDACTED>",
    };
  let redacted = isUserPromptLoggingEnabled_2()
    ? redactAccountMemoryText(() => accountMemoryRedactionKeys(getRootSession().host), undefined, content)
    : redactIfDisabled(content);
  return {
    prompt: redacted,
    prompt_text: redacted,
  };
}
//@ chunk-a0xc6evk.js:10578-10656 layout
function isAssistantResponseLoggingEnabled() {
  return env.OTEL_LOG_ASSISTANT_RESPONSES ?? env.OTEL_LOG_USER_PROMPTS;
}
//@ chunk-a0xc6evk.js:10656-10695 layout
var traceContextPropagator; // deferred: uses otelApi (./gatewayIdentityAttributes.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a0xc6evk.js:10656", () => {
  traceContextPropagator = new promClient_2.W3CTraceContextPropagator();
});
//@ chunk-a0xc6evk.js:10695-10914 layout
function getEventContext() {
  let context = activeOtelContext();
  let spanContext = otelApi.trace.getSpanContext(context);
  if (spanContext && otelApi.isSpanContextValid(spanContext)) return context;
  if (getIsNonInteractiveSession() && env.TRACEPARENT)
    return traceContextPropagator.extract(
      context,
      {
        traceparent: env.TRACEPARENT,
        tracestate: env.TRACESTATE,
      },
      otelApi.defaultTextMapGetter,
    );
  return;
}
//@ chunk-a0xc6evk.js:10914-11684 fingerprint (2.1.88 match: logOTelEvent, 0.669)
/**
 * 发 OTel 事件（claude_code.<name>）：属性含 getTelemetryAttributes、event.name/timestamp/sequence、prompt.id、workspace.host_paths、agent id；无事件 logger 时可跳过。
 */
async function logOTelEvent(event, metadata = {}, agentContext, hookOrigin) {
  let state = otelEventStateByHost.of(getRootSession().host);
  if (
    state.warnedNoEventLogger &&
    getEventLogger() === null &&
    !isOTelInitPending() &&
    !env.CLAUDE_CODE_DISABLE_OTEL_EVENT_SKIP &&
    eventRecordQueue.isIdle() &&
    eventRecordQueue.getRoad()?.isWatched(hookOrigin) === false
  )
    return;
  let attributes = {
    ...getTelemetryAttributes(),
    "event.name": event,
    "event.timestamp": new Date().toISOString(),
    "event.sequence": state.nextSequence++,
  };
  let promptId = getPromptId();
  if (promptId) attributes["prompt.id"] = promptId;
  let workspaceDir = env.CLAUDE_CODE_WORKSPACE_HOST_PATHS;
  if (workspaceDir) attributes["workspace.host_paths"] = workspaceDir.split("|");
  Object.assign(attributes, getWorkflowSpanAttributes(agentContext));
  for (let [key, value] of Object.entries(isDiskless() ? maskModelIdsInRecord(metadata) : metadata)) {
    let eventContext = key === "error" && isDiskless() && !/^[a-z0-9_]+$/.test(String(value));
    if (value !== undefined && !eventContext) attributes[key] = value;
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
        event,
        attributes,
        loggedAt,
        eventContext,
      }),
    hookOrigin,
  );
}
//@ chunk-4qbrxszq.js:2179-2223 fingerprint (2.1.88 match: isUserPromptLoggingEnabled, 1)
function isUserPromptLoggingEnabled() {
  return env.OTEL_LOG_USER_PROMPTS;
}
export {
  logOTelEvent,
  isUserPromptLoggingEnabled,
  isAssistantResponseLoggingEnabled,
  otelEventStateByHost,
  redactIfDisabled_2,
};
