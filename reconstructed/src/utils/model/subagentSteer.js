/**
 * utils/model/subagentSteer.ts
 *
 * 2.1.316 新增："委派子代理"的成本提示段落；读取子代理引导设置（环境变量 CLAUDE_CODE_THISTLE_GREBE、客户端数据、tengu_thistle_grebe）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (16)
 * attribution: placement 16
 */
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession, getSessionId } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-aepeg2w5.js:71810-71839 placement
var TENGU_THISTLE_GREBE = "tengu_thistle_grebe";
//@ chunk-aepeg2w5.js:71839-72011 placement
class SteerSourceRegistry {
  clientData = null;
  feature = null;
  registerClientData(clientData) {
    let clientData_2 = this.clientData;
    this.clientData = clientData;
    return clientData_2;
  }
  registerFeature(feature) {
    let feature_2 = this.feature;
    this.feature = feature;
    return feature_2;
  }
}
//@ chunk-aepeg2w5.js:72011-72025 placement
var steerSourceRegistry = new SteerSourceRegistry();
//@ chunk-aepeg2w5.js:72025-72374 placement
/**
 * 子代理调度引导状态（模型下限、提示模型、锁存值）。
 */
class SubagentSteerState {
  modelSteerFloor = null;
  promptModel = undefined;
  latched = undefined;
  hostCostSteerLoggedFor = undefined;
  registerModelFloor(modelSteerFloor) {
    let modelSteerFloor_2 = this.modelSteerFloor;
    this.modelSteerFloor = modelSteerFloor;
    return modelSteerFloor_2;
  }
  recordPromptModel(promptModel) {
    if (this.latched === undefined && this.promptModel === undefined) this.promptModel = promptModel;
  }
  latch(latched) {
    this.latched = latched;
  }
  resetLatch() {
    this.latched = undefined;
    this.promptModel = undefined;
  }
}
//@ chunk-aepeg2w5.js:72374-72400 placement
var subagentSteerSlot = new SessionRootSlot(() => new SubagentSteerState());
//@ chunk-aepeg2w5.js:72400-72432 placement
function currentSubagentSteer() {
  return subagentSteerSlot.of(getRootSession());
}
//@ chunk-aepeg2w5.js:72432-72479 placement
/**
 * 为子代理引导登记客户端数据读取器。
 */
function registerSteerClientData(e) {
  return steerSourceRegistry.registerClientData(e);
}
//@ chunk-aepeg2w5.js:72479-72523 placement
/**
 * 为子代理引导登记特性读取器。
 */
function registerSteerFeature(getFeatureValue_CACHED_MAY_BE_STALE) {
  return steerSourceRegistry.registerFeature(getFeatureValue_CACHED_MAY_BE_STALE);
}
//@ chunk-aepeg2w5.js:72523-72573 placement
/**
 * 登记子代理引导的模型下限。
 */
function registerSteerModelFloor(e) {
  return currentSubagentSteer().registerModelFloor(e);
}
//@ chunk-aepeg2w5.js:72573-72615 placement
/**
 * 记录子代理引导时的提示模型。
 */
function recordSteerPromptModel(e) {
  currentSubagentSteer().recordPromptModel(e);
}
//@ chunk-aepeg2w5.js:72615-72698 placement
function normalizeSteerMode(e) {
  return e === "default" || e === "no_nudges" || e === "counter_steer" ? e : undefined;
}
//@ chunk-aepeg2w5.js:72698-73092 placement
/**
 * 读取子代理引导设置（环境变量 CLAUDE_CODE_THISTLE_GREBE、客户端数据、tengu_thistle_grebe）。
 */
function readSubagentSteer(e) {
  let n = normalizeSteerMode(env.CLAUDE_CODE_THISTLE_GREBE);
  if (n)
    return {
      steer: n,
      source: "env",
    };
  let r;
  try {
    r = normalizeSteerMode(steerSourceRegistry.clientData?.()?.[TENGU_THISTLE_GREBE]);
  } catch {}
  if (r)
    return {
      steer: r,
      source: "clientData",
    };
  let s = normalizeSteerMode(steerSourceRegistry.feature?.(TENGU_THISTLE_GREBE, null));
  if (s)
    return {
      steer: s,
      source: "growthbook",
    };
  let { promptModel } = e;
  if (promptModel !== undefined) {
    let y = normalizeSteerMode(e.modelSteerFloor?.(promptModel));
    if (y)
      return {
        steer: y,
        source: "model",
      };
  }
  return {
    steer: "default",
    source: "default",
  };
}
//@ chunk-aepeg2w5.js:73092-73280 placement
/**
 * 取锁存的子代理引导值并上报一次。
 */
function getSubagentSteer() {
  let e = currentSubagentSteer();
  if (e.latched !== undefined) return e.latched;
  let { steer, source } = readSubagentSteer(e);
  e.latch(steer);
  if (steer !== "default")
    logEvent("tengu_subagent_steer_applied", {
      steer: fromEnum(steer),
      source: fromEnum(source),
    });
  return steer;
}
//@ chunk-aepeg2w5.js:73280-73407 placement
/**
 * 每个会话上报一次宿主成本引导已应用（tengu_witty_dewdrop_applied）。
 */
function logHostCostSteerApplied() {
  let e = currentSubagentSteer();
  let sessionId = getSessionId();
  if (e.hostCostSteerLoggedFor !== sessionId) {
    e.hostCostSteerLoggedFor = sessionId;
    logEvent("tengu_witty_dewdrop_applied", {});
  }
}
//@ chunk-aepeg2w5.js:73407-73440 placement
/**
 * 重置子代理引导的锁存状态。
 */
function resetSteerLatch() {
  currentSubagentSteer().resetLatch();
}
//@ chunk-aepeg2w5.js:73440-74889 placement
/**
 * "委派子代理"的成本提示段落。
 */
var DELEGATION_GUIDANCE = `## Delegating to subagents

Subagents multiply cost and time: each one re-establishes context, re-explores, and reports back, and you then re-read its report. Delegate only when the payoff clearly exceeds that overhead. Before spawning, apply these tests:

- Do the work inline when it is a small, bounded sub-task \u2014 a few file reads, one search, a short edit, a single check. Do not spawn a subagent for work you could finish yourself in a handful of tool calls.
- Do not fan out multiple subagents on a single small task. Parallel subagents are for genuinely independent, sizeable tracks (unrelated modules, a wide multi-file investigation), not for splitting one modest job into pieces.
- Do not spawn a subagent to review, re-verify, or double-check work you can verify inline. Verification that fits in your own loop belongs in your own loop.
- If you delegate, commit to the delegation: do not redo the subagent's work while waiting, and do not re-derive its findings once it reports. If you find yourself repeating what a subagent is doing, you should not have spawned it.
- Keep spawn counts low. One well-briefed subagent for a large independent chunk is worth more than several loosely-briefed ones; brief it precisely the first time rather than launching, waiting, and re-briefing.

Delegate for work that is genuinely independent, large enough to justify a fresh context, or naturally parallel. Otherwise, do it yourself.`;
export {
  getSubagentSteer,
  registerSteerModelFloor,
  recordSteerPromptModel,
  DELEGATION_GUIDANCE,
  registerSteerClientData,
  registerSteerFeature,
  resetSteerLatch,
  logHostCostSteerApplied,
};
