/**
 * utils/telemetry/perfettoTracing.ts
 *
 * Perfetto 追踪（外部构建基本为空）与代理注册。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/perfettoTracing.ts
 * pieces: chunk-4qbrxszq.js (7), chunk-5xgkngpb.js (1)
 * attribution: placement 6, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { isWebFetchSubagentContext } from "../../tools/WebFetchTool/harnessNotes.js";
import { TOOL_AND_BATCH_HOOK_EVENTS } from "../hooks/hookEvents.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-4qbrxszq.js:7225-7248 placement
class PerfettoState {
  recorder = null;
}
//@ chunk-4qbrxszq.js:7248-7273 placement
var perfettoStateByHost; // deferred: uses PerfettoState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4qbrxszq.js:7248", () => {
  perfettoStateByHost = new HostScoped(() => new PerfettoState());
});
//@ chunk-4qbrxszq.js:7273-7318 placement
function perfettoRecorder() {
  return perfettoStateByHost.of(getRootSession().host).recorder;
}
//@ chunk-4qbrxszq.js:7318-7434 fingerprint (2.1.88 match: initializePerfettoTracing, 0.443)
/**
 * Perfetto 追踪初始化（外部构建只记一行调试日志，CLAUDE_CODE_PERFETTO_TRACE）。
 */
function initializePerfettoTracing() {
  let envValue = env.CLAUDE_CODE_PERFETTO_TRACE;
  logForDebugging(`[Perfetto] initializePerfettoTracing called, env value: ${envValue}`);
}
//@ chunk-4qbrxszq.js:7434-7467 placement
/**
 * 是否正在做 Perfetto 追踪。
 */
function isPerfettoRecording() {
  return perfettoRecorder() !== null;
}
//@ chunk-4qbrxszq.js:7467-7533 placement
/**
 * 注册 Perfetto 代理。
 */
function registerPerfettoAgent(agentId, metadata, attributes) {
  let recorder = perfettoRecorder();
  if (!recorder) return;
  recorder.registerAgent(agentId, metadata, attributes);
}
//@ chunk-4qbrxszq.js:7533-7593 placement
/**
 * 注销 Perfetto 代理。
 */
function unregisterPerfettoAgent(agentId) {
  let recorder = perfettoRecorder();
  if (!recorder) return;
  recorder.unregisterAgent(agentId);
}
//@ chunk-5xgkngpb.js:1290630-1290752 fingerprint (2.1.88 match: registerAgent, 0.327)
function registerAgent(agentId, agentName, parentAgentId) {
  let agentId_2 = agentId?.agentId ?? parentAgentId;
  let agentContext = agentId?.agentContext;
  return agentContext !== undefined &&
    isWebFetchSubagentContext(agentContext) &&
    TOOL_AND_BATCH_HOOK_EVENTS.has(agentName)
    ? [agentId_2, agentContext.parentAgentId ?? parentAgentId]
    : [agentId_2];
}
export {
  registerAgent,
  unregisterPerfettoAgent,
  initializePerfettoTracing,
  perfettoRecorder,
  isPerfettoRecording,
  registerPerfettoAgent,
};
