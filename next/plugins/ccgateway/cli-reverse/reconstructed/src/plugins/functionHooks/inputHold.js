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
import { isBackgroundTasksOff } from "../../tools/AgentTool/backgroundGates.js";
import { getStrictToolResultPairing } from "../../bootstrap/state.js";
import { isBareMode } from "../../utils/envUtils.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { runIgnoringAbort } from "./dispatch/dispatchScope.js";
import { isUnknownPluginSpawnedAgent } from "../../tools/AgentTool/pluginSpawnNote.js";
import { count } from "../../utils/collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:577937-578014 placement
/**
 * tengu_violin_rosin 等条件
 */
function isInputHoldOn() {
  return (
    getFeatureValue_SESSION_PINNED("tengu_violin_rosin", false) === true &&
    !isBackgroundTasksOff() &&
    !getStrictToolResultPairing() &&
    !isBareMode()
  );
}
//@ chunk-e6aww6q8.js:578014-578062 placement
/**
 * 开关 tengu_zinc_harbor（默认关）：控制插件输入暂扣是否启用。
 */
function isZincHarborOn() {
  return getFeatureValue_SESSION_PINNED("tengu_zinc_harbor", false);
}
//@ chunk-e6aww6q8.js:578062-578103 placement
/**
 * 代理派生来源
 */
var spawnProvenanceOf = (agentTaskId) => getPluginRegistry().spawnProvenance.get(agentTaskId);
//@ chunk-e6aww6q8.js:578103-578143 placement
/**
 * 是否无名引导
 */
var isUnnamedSteered = (agentTaskId) => getPluginRegistry().unnamedSteered.has(agentTaskId);
//@ chunk-e6aww6q8.js:578143-578179 placement
/**
 * 暂扣原因槽
 */
var holdReasonSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:578143", () => {
  holdReasonSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-e6aww6q8.js:578179-578226 placement
/**
 * 插件输入拒绝开关
 */
var isPluginInputRefusalOn = () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_plugin_input_refusal", true);
//@ chunk-e6aww6q8.js:578226-578261 placement
/**
 * 插件输入暂扣槽
 */
var pluginInputHoldSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:578226", () => {
  pluginInputHoldSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-e6aww6q8.js:578261-578425 placement
/**
 * 插件输入被暂扣的原因：会话被 Stop 且之后无人输入，或宿主限制给出的原因；特性 tengu_plugin_input_refusal 关闭时为 undefined。
 */
function pluginInputHoldReason() {
  let stoppedSession = pluginInputHoldSlot.get()?.session.deref();
  let reason =
    stoppedSession !== undefined && stoppedSession === currentSurfaceBinding()
      ? "the session was stopped and nobody has sent input since"
      : holdReasonSlot.get()?.();
  return isPluginInputRefusalOn() ? reason : undefined;
}
//@ chunk-e6aww6q8.js:578425-578484 placement
/**
 * 插件是否暂扣输入
 */
function isHeldByPlugin() {
  let isHeld = true;
  runIgnoringAbort(() => {
    isHeld = pluginInputHoldReason() !== undefined;
  });
  return isHeld;
}
//@ chunk-e6aww6q8.js:578484-578596 placement
/**
 * 插件输入被暂扣时，Bash/PowerShell 命令不转入后台而直接结束的说明。
 */
var ENDED_INSTEAD_OF_BACKGROUND_MESSAGE =
  "Ended instead of moving to the background: plugins' input is held, by a Stop or by the host's limits.";
//@ chunk-e6aww6q8.js:578596-578674 placement
/**
 * 是否应暂扣
 */
function shouldHoldForPlugin(ctx) {
  return (
    (ctx.hookCaller === undefined ? isUnknownPluginSpawnedAgent(ctx) : !ctx.hookServesModel) &&
    isHeldByPlugin()
  );
}
//@ chunk-e6aww6q8.js:578674-578747 placement
/**
 * 空对象
 */
var EMPTY_HOLD_TARGET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var heldInputBySession;
deferInit("chunk-e6aww6q8.js:578674", () => {
  EMPTY_HOLD_TARGET = {};
  heldInputBySession = identity_2(
    {
      bySession: new WeakMap(),
    },
    (state) => {
      state.bySession = new WeakMap();
    },
  );
});
//@ chunk-e6aww6q8.js:578747-578886 placement
/**
 * 输入被暂扣时，把一个待入队动作（可带命令与清除时行为）存到当前会话的暂扣列表。
 */
function holdQueuedInput(queueIt, command, secondCommand) {
  let session = currentSurfaceBinding() ?? EMPTY_HOLD_TARGET;
  let held = heldInputBySession.bySession.get(session) ?? [];
  held.push({
    queueIt,
    ...(command && {
      command,
    }),
    ...(secondCommand && {
      atClear: secondCommand,
    }),
  });
  heldInputBySession.bySession.set(session, held);
}
//@ chunk-e6aww6q8.js:578886-579141 placement
/**
 * 取消排队时清空暂扣列表（保留 atClear 为 stays 的项），执行各项的清除回调，返回被丢弃的命令。
 */
function clearHeldInput() {
  let session = currentSurfaceBinding() ?? EMPTY_HOLD_TARGET;
  let held = heldInputBySession.bySession.get(session) ?? [];
  let filtered = held.filter((entry) => entry.atClear !== "stays");
  let flattened = filtered.flatMap((entry) => entry.command ?? []);
  heldInputBySession.bySession.set(
    session,
    held.filter((entry) => entry.atClear === "stays"),
  );
  filtered.forEach((entry) => {
    if (typeof entry.atClear === "function") runIgnoringAbort(entry.atClear);
  });
  return flattened;
}
//@ chunk-e6aww6q8.js:579141-579245 placement
/**
 * 统计当前会话暂扣列表里满足条件的命令数。
 */
function countHeldCommands(predicate) {
  let session = currentSurfaceBinding() ?? EMPTY_HOLD_TARGET;
  return count(
    heldInputBySession.bySession.get(session) ?? [],
    (entry) => entry.command !== undefined && predicate(entry.command),
  );
}
//@ chunk-e6aww6q8.js:579245-579305 placement
/**
 * 暂扣期间推迟执行
 */
function wrapHoldAware(ctx) {
  let run = (e) => (shouldHoldForPlugin(ctx) ? holdQueuedInput(() => run(e)) : e());
  return run;
}
//@ chunk-e6aww6q8.js:579305-579480 placement
/**
 * 释放当前会话暂扣的输入：逐项执行入队（若仍被暂扣则重新暂存）。
 */
function releaseHeldInput() {
  let session = currentSurfaceBinding() ?? EMPTY_HOLD_TARGET;
  let held = heldInputBySession.bySession.get(session) ?? [];
  heldInputBySession.bySession.delete(session);
  held.forEach((entry) =>
    runIgnoringAbort(() =>
      entry.command !== undefined && isHeldByPlugin()
        ? holdQueuedInput(entry.queueIt, entry.command, entry.atClear)
        : entry.queueIt(),
    ),
  );
}
//@ chunk-e6aww6q8.js:579480-579516 placement
/**
 * 清暂扣并释放
 */
function clearHeldInputAndReason() {
  pluginInputHoldSlot.set(undefined);
  releaseHeldInput();
}
export {
  isZincHarborOn,
  shouldHoldForPlugin,
  holdQueuedInput,
  spawnProvenanceOf,
  isHeldByPlugin,
  isPluginInputRefusalOn,
  countHeldCommands,
  pluginInputHoldSlot,
  clearHeldInput,
  wrapHoldAware,
  isUnnamedSteered,
  pluginInputHoldReason,
  isInputHoldOn,
  ENDED_INSTEAD_OF_BACKGROUND_MESSAGE,
  clearHeldInputAndReason,
  holdReasonSlot,
  releaseHeldInput,
};
