/**
 * remote/tools/serve/servingReadiness.ts
 *
 * 2.1.316 新增。远程工具服务就绪闸：等待插件 hook、托管设置、策略限制与首次开关拉取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t28c2dsj.js (5)
 * attribution: placement 5
 */
import { getHooksConfigFromSnapshot } from "../../../utils/hooks/hooksConfigSnapshot.js";
import { logError } from "../../../utils/log.js";
import { toError } from "../../../utils/errors.js";
import {
  pendingPluginHookRegistration,
  pluginHooksUnknownCause,
  failedPluginHookRegistration,
} from "../../../utils/plugins/loadPluginHooks.js";
import { waitForRemoteManagedSettingsToLoad } from "../../../services/remoteManagedSettings/loader.js";
import { waitForPolicyLimitsToLoad } from "../../../services/policyLimits/PolicyLimitsClient.js";
import { waitForInitialize } from "../../../utils/startupFlagWait.js";
import { initializeGrowthBook } from "../../../services/analytics/growthbook.js";
import { logForDebugging } from "../../../utils/debug.js";

//@ chunk-t28c2dsj.js:522-533 placement
var f = 3000;
/**
 * 远程工具服务就绪闸：等待插件 hook、托管设置、策略限制与首次开关拉取。
 */
//@ chunk-t28c2dsj.js:533-665 placement
function createServingReadiness(e = {}) {
  let r = e.firstFlagFetchWaitMs ?? f,
    o = !1,
    i;
  return {
    get ready() {
      return o;
    },
    whenReady: () =>
      (i ??= awaitServingReadiness(r).then(() => {
        ((o = !0), warnMissingPluginHooks());
      })),
  };
}
/**
 * 并行等待插件 hook、远程托管设置、策略限制、首次开关拉取
 */
//@ chunk-t28c2dsj.js:665-1252 placement
async function awaitServingReadiness(e) {
  let startTime = performance.now();
  try {
    getHooksConfigFromSnapshot();
  } catch (error) {
    logError(toError(error));
  }
  let o = !1,
    [i, a, m, g] = await Promise.all([
      timedWait("the plugin-hook registration pass", async () => {
        await pendingPluginHookRegistration();
      }),
      timedWait("the remote managed-settings load", waitForRemoteManagedSettingsToLoad),
      timedWait("the policy-limits load", waitForPolicyLimitsToLoad),
      timedWait("the first flag fetch", async () => {
        let { timedOut: timedOut } = await waitForInitialize({
          initialize: initializeGrowthBook,
          budgetMs: e,
        });
        o = !timedOut;
      }),
    ]);
  logForDebugging(
    `[remote-tools] ready to judge calls after ${Math.round(performance.now() - startTime)}ms: waited ${i}ms for plugin hooks, ${a}ms for remote managed settings, ${m}ms for policy limits, ${g}ms for the first flag fetch (${o ? "landed" : "not heard in time"})`,
  );
}
/**
 * 计时等待一个前置步骤，失败继续
 */
//@ chunk-t28c2dsj.js:1252-1456 placement
async function timedWait(e, r) {
  let startTime = performance.now();
  try {
    await r();
  } catch (error) {
    (logForDebugging(`[remote-tools] waiting for ${e} failed; serving goes on without it`, {
      level: "error",
    }),
      logError(toError(error)));
  }
  return Math.round(performance.now() - startTime);
}
/**
 * 服务调用缺少插件下发的 hook 时报错
 */
//@ chunk-t28c2dsj.js:1456-1673 placement
async function warnMissingPluginHooks() {
  try {
    let e = (await pluginHooksUnknownCause(!1)) ?? (await failedPluginHookRegistration());
    if (e !== void 0)
      logForDebugging(
        `[remote-tools] plugin-delivered hooks are missing from the calls this machine serves, as from its own: ${e}`,
        { level: "error" },
      );
  } catch (error) {
    logError(toError(error));
  }
}

export { createServingReadiness };
