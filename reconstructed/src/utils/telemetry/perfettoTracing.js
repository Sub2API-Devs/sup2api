/**
 * utils/telemetry/perfettoTracing.ts
 *
 * Perfetto 追踪（外部构建基本为空）与代理注册。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/perfettoTracing.ts
 * pieces: chunk-a9ek44g8.js (7), chunk-e6aww6q8.js (1)
 * attribution: placement 6, fingerprint 2
 */
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { logForDebugging } from "../debug.js";
import { isWebFetchSubagentContext } from "../../tools/WebFetchTool/harnessNotes.js";
import { TOOL_AND_BATCH_HOOK_EVENTS } from "../hooks/hookEvents.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a9ek44g8.js:7159-7182 placement
class PerfettoState {
  recorder = null;
}
//@ chunk-a9ek44g8.js:7182-7207 placement
var perfettoStateByHost; // deferred: uses PerfettoState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a9ek44g8.js:7182", () => {
  perfettoStateByHost = new HostScoped(() => new PerfettoState());
});
//@ chunk-a9ek44g8.js:7207-7252 placement
function perfettoRecorder() {
  return perfettoStateByHost.of(getRootSession().host).recorder;
}
//@ chunk-a9ek44g8.js:7252-7368 fingerprint = initializePerfettoTracing (0.442)
/**
 * Perfetto 追踪初始化（外部构建只记一行调试日志，CLAUDE_CODE_PERFETTO_TRACE）。
 */
function initializePerfettoTracing() {
  let envValue = env.CLAUDE_CODE_PERFETTO_TRACE;
  logForDebugging(`[Perfetto] initializePerfettoTracing called, env value: ${envValue}`);
}
//@ chunk-a9ek44g8.js:7368-7401 placement
/**
 * 是否正在做 Perfetto 追踪。
 */
function isPerfettoRecording() {
  return perfettoRecorder() !== null;
}
//@ chunk-a9ek44g8.js:7401-7467 placement
/**
 * 注册 Perfetto 代理。
 */
function registerPerfettoAgent(agentId, metadata, attributes) {
  let recorder = perfettoRecorder();
  if (!recorder) return;
  recorder.registerAgent(agentId, metadata, attributes);
}
//@ chunk-a9ek44g8.js:7467-7527 placement
/**
 * 注销 Perfetto 代理。
 */
function unregisterPerfettoAgent(agentId) {
  let recorder = perfettoRecorder();
  if (!recorder) return;
  recorder.unregisterAgent(agentId);
}
//@ chunk-e6aww6q8.js:1291797-1291919 fingerprint = registerAgent (0.327)
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
  isPerfettoRecording,
  registerPerfettoAgent,
  unregisterPerfettoAgent,
  initializePerfettoTracing,
  perfettoRecorder,
};
