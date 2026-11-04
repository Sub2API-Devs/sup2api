/**
 * plugins/functionHooks/pluginLifecycle.ts
 *
 * 2.1.316 新增：插件函数钩子的启用、禁用与生命周期事件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { identity as identity_2 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { emptyToolHooksSecond } from "./toolCallHooks.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:84992-85025 placement
/**
 * gapMs 8000 / capMs 60000
 */
var RELOAD_BACKOFF = {
  gapMs: 8000,
  capMs: 60000,
};
//@ chunk-e6aww6q8.js:85025-85082 placement
/**
 * 重载控制器槽
 */
var reloadControllerSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:85025", () => {
  reloadControllerSlot = identity_2(createValueSlot(), (slot) => {
    slot.get()?.dispose();
    slot.set(undefined);
  });
});
//@ chunk-e6aww6q8.js:85082-85094 placement
/**
 * 250
 */
var RELOAD_SETTLE_MS = 250;
//@ chunk-e6aww6q8.js:85094-85130 placement
/**
 * 待处理重载槽
 */
var pendingReloadSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:85094", () => {
  pendingReloadSlot = identity_2(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-e6aww6q8.js:85130-85171 placement
/**
 * limit 5 / gap 2000 / quiet 10000
 */
var RELOAD_STORM_LIMITS = {
  limit: 5,
  gapMs: 2000,
  quietMs: 1e4,
};
//@ chunk-e6aww6q8.js:85171-85209 placement
/**
 * 重载定时槽
 */
var reloadTimerSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:85171", () => {
  reloadTimerSlot = identity_2(createValueSlot(), (slot) => {
    slot.set(undefined);
  });
});
//@ chunk-e6aww6q8.js:85209-85247 placement
/**
 * 重载原因槽
 */
var reloadReasonSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:85209", () => {
  reloadReasonSlot = identity_2(createValueSlot(), (slot) => {
    slot.set(undefined);
  });
});
//@ chunk-e6aww6q8.js:85247-85312 placement
/**
 * 记录原因并清掉定时器
 */
function noteReloadReason(reason) {
  reloadReasonSlot.set(reason);
  let cancelTimer = reloadTimerSlot.get();
  reloadTimerSlot.set(undefined);
  cancelTimer?.();
}
//@ chunk-e6aww6q8.js:85312-85429 placement
/**
 * 释放某插件对 MCP 服务器/命令的暂扣（若有），忽略错误。
 */
var releaseServerHold = (hold) =>
  hold === undefined
    ? Promise.resolve()
    : (reloadControllerSlot.get()?.release(hold) ?? Promise.resolve()).then(
        () => {
          return;
        },
        () => {
          return;
        },
      );
//@ chunk-e6aww6q8.js:85429-85537 placement
/**
 * 工具调用前释放调用所属 MCP 服务器的插件暂扣。
 */
function releaseToolServerHold(tool) {
  let serverName = tool.mcpInfo?.serverName;
  let { registered } = emptyToolHooksSecond;
  return releaseServerHold(serverName === undefined ? undefined : registered.ownerOfKey(serverName));
}
export {
  pendingReloadSlot,
  noteReloadReason,
  releaseToolServerHold,
  reloadControllerSlot,
  reloadReasonSlot,
  reloadTimerSlot,
  RELOAD_SETTLE_MS,
  RELOAD_BACKOFF,
  RELOAD_STORM_LIMITS,
  releaseServerHold,
};
