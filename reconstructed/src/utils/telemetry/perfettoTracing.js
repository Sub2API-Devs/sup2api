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

//@ chunk-a9ek44g8.js:7159-7182 placement
class ft {
  recorder = null;
}
//@ chunk-a9ek44g8.js:7182-7207 placement
var $t = new HostScoped(() => new ft());
//@ chunk-a9ek44g8.js:7207-7252 placement
function A() {
  return $t.of(getRootSession().host).recorder;
}
/**
 * Perfetto 追踪初始化（外部构建只记一行调试日志，CLAUDE_CODE_PERFETTO_TRACE）。
 */
//@ chunk-a9ek44g8.js:7252-7368 fingerprint = initializePerfettoTracing (0.442)
function initializePerfettoTracing() {
  let envValue = env.CLAUDE_CODE_PERFETTO_TRACE;
  logForDebugging(`[Perfetto] initializePerfettoTracing called, env value: ${envValue}`);
}
//@ chunk-a9ek44g8.js:7368-7401 placement
function Rqe() {
  return A() !== null;
}
//@ chunk-a9ek44g8.js:7401-7467 placement
function Anr(n, e, r) {
  let s = A();
  if (!s) return;
  s.registerAgent(n, e, r);
}
//@ chunk-a9ek44g8.js:7467-7527 placement
function xqe(n) {
  let e = A();
  if (!e) return;
  e.unregisterAgent(n);
}
//@ chunk-e6aww6q8.js:1291797-1291919 fingerprint = registerAgent (0.327)
function registerAgent(agentId, agentName, parentAgentId) {
  let s = agentId?.agentId ?? parentAgentId,
    h = agentId?.agentContext;
  return h !== void 0 && isWebFetchSubagentContext(h) && TOOL_AND_BATCH_HOOK_EVENTS.has(agentName)
    ? [s, h.parentAgentId ?? parentAgentId]
    : [s];
}

export { registerAgent, Rqe, Anr, xqe, initializePerfettoTracing, A };
