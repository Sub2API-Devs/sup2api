/**
 * plugins/functionHooks/inputHold.ts
 *
 * 2.1.316 新增：插件对输入框的暂扣（hold）管理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { uf } from "../../tools/AgentTool/backgroundGates.js";
import { getStrictToolResultPairing } from "../../bootstrap/state.js";
import { isBareMode } from "../../utils/envUtils.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { lp } from "./surfaceBinding.js";
import { Km } from "./dispatch/dispatchScope.js";
import { isUnknownPluginSpawnedAgent } from "../../tools/AgentTool/pluginSpawnNote.js";
import { count } from "../../utils/collections.js";

//@ chunk-e6aww6q8.js:577937-578014 placement
function L0e() {
  return (
    getFeatureValue_SESSION_PINNED("tengu_violin_rosin", !1) === !0 &&
    !uf() &&
    !getStrictToolResultPairing() &&
    !isBareMode()
  );
}
//@ chunk-e6aww6q8.js:578014-578062 placement
function tH() {
  return getFeatureValue_SESSION_PINNED("tengu_zinc_harbor", !1);
}
//@ chunk-e6aww6q8.js:578062-578103 placement
var j9n = (e) => getPluginRegistry().spawnProvenance.get(e);
//@ chunk-e6aww6q8.js:578103-578143 placement
var Nce = (e) => getPluginRegistry().unnamedSteered.has(e);
//@ chunk-e6aww6q8.js:578143-578179 placement
var q$o = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:578179-578226 placement
var kBr = () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_input_refusal", !0);
//@ chunk-e6aww6q8.js:578226-578261 placement
var RZ = ge(to(), (e) => e.set(void 0));
/**
 * 插件输入被暂扣的原因：会话被 Stop 且之后无人输入，或宿主限制给出的原因；特性 tengu_plugin_input_refusal 关闭时为 undefined。
 */
//@ chunk-e6aww6q8.js:578261-578425 placement
function pluginInputHoldReason() {
  let e = RZ.get()?.session.deref(),
    r =
      e !== void 0 && e === lp() ? "the session was stopped and nobody has sent input since" : q$o.get()?.();
  return kBr() ? r : void 0;
}
//@ chunk-e6aww6q8.js:578425-578484 placement
function xZ() {
  let e = !0;
  return (
    Km(() => {
      e = pluginInputHoldReason() !== void 0;
    }),
    e
  );
}
/**
 * 插件输入被暂扣时，Bash/PowerShell 命令不转入后台而直接结束的说明。
 */
//@ chunk-e6aww6q8.js:578484-578596 placement
var ENDED_INSTEAD_OF_BACKGROUND_MESSAGE =
  "Ended instead of moving to the background: plugins' input is held, by a Stop or by the host's limits.";
//@ chunk-e6aww6q8.js:578596-578674 placement
function PCe(e) {
  return (e.hookCaller === void 0 ? isUnknownPluginSpawnedAgent(e) : !e.hookServesModel) && xZ();
}
//@ chunk-e6aww6q8.js:578674-578747 placement
var Fce = {},
  S0 = ge({ bySession: new WeakMap() }, (e) => {
    e.bySession = new WeakMap();
  });
/**
 * 输入被暂扣时，把一个待入队动作（可带命令与清除时行为）存到当前会话的暂扣列表。
 */
//@ chunk-e6aww6q8.js:578747-578886 placement
function holdQueuedInput(e, n, r) {
  let s = lp() ?? Fce,
    h = S0.bySession.get(s) ?? [];
  (h.push({ queueIt: e, ...(n && { command: n }), ...(r && { atClear: r }) }), S0.bySession.set(s, h));
}
/**
 * 取消排队时清空暂扣列表（保留 atClear 为 stays 的项），执行各项的清除回调，返回被丢弃的命令。
 */
//@ chunk-e6aww6q8.js:578886-579141 placement
function clearHeldInput() {
  let e = lp() ?? Fce,
    n = S0.bySession.get(e) ?? [],
    filtered = n.filter((h) => h.atClear !== "stays"),
    flattened = filtered.flatMap((h) => h.command ?? []);
  return (
    S0.bySession.set(
      e,
      n.filter((h) => h.atClear === "stays"),
    ),
    filtered.forEach((h) => {
      if (typeof h.atClear === "function") Km(h.atClear);
    }),
    flattened
  );
}
/**
 * 统计当前会话暂扣列表里满足条件的命令数。
 */
//@ chunk-e6aww6q8.js:579141-579245 placement
function countHeldCommands(e) {
  let n = lp() ?? Fce;
  return count(S0.bySession.get(n) ?? [], (r) => r.command !== void 0 && e(r.command));
}
//@ chunk-e6aww6q8.js:579245-579305 placement
function I3n(e) {
  let n = (r) => (PCe(e) ? holdQueuedInput(() => n(r)) : r());
  return n;
}
/**
 * 释放当前会话暂扣的输入：逐项执行入队（若仍被暂扣则重新暂存）。
 */
//@ chunk-e6aww6q8.js:579305-579480 placement
function releaseHeldInput() {
  let e = lp() ?? Fce,
    n = S0.bySession.get(e) ?? [];
  (S0.bySession.delete(e),
    n.forEach((r) =>
      Km(() =>
        r.command !== void 0 && xZ() ? holdQueuedInput(r.queueIt, r.command, r.atClear) : r.queueIt(),
      ),
    ));
}
//@ chunk-e6aww6q8.js:579480-579516 placement
function CBr() {
  (RZ.set(void 0), releaseHeldInput());
}

export {
  tH,
  PCe,
  holdQueuedInput,
  j9n,
  xZ,
  kBr,
  countHeldCommands,
  RZ,
  clearHeldInput,
  I3n,
  Nce,
  pluginInputHoldReason,
  L0e,
  ENDED_INSTEAD_OF_BACKGROUND_MESSAGE,
  CBr,
  q$o,
  releaseHeldInput,
};
