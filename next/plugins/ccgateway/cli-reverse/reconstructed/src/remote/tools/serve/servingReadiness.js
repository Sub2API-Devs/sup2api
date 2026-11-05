/**
 * remote/tools/serve/servingReadiness.ts
 *
 * 2.1.316 新增。远程工具服务就绪闸：等待插件 hook、托管设置、策略限制与首次开关拉取。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1rt6ktyk.js (5)
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

//@ chunk-1rt6ktyk.js:522-533 placement
var FIRST_FLAG_FETCH_WAIT_MS = 3000;
//@ chunk-1rt6ktyk.js:533-665 placement
/**
 * 远程工具服务就绪闸：等待插件 hook、托管设置、策略限制与首次开关拉取。
 */
function createServingReadiness(options = {}) {
  let firstFlagFetchWaitMs = options.firstFlagFetchWaitMs ?? FIRST_FLAG_FETCH_WAIT_MS;
  let readyFlag = false;
  let waitPromise;
  return {
    get ready() {
      return readyFlag;
    },
    whenReady: () =>
      (waitPromise ??= awaitServingReadiness(firstFlagFetchWaitMs).then(() => {
        readyFlag = true;
        warnMissingPluginHooks();
      })),
  };
}
//@ chunk-1rt6ktyk.js:665-1252 placement
/**
 * 并行等待插件 hook、远程托管设置、策略限制、首次开关拉取
 */
async function awaitServingReadiness(budgetMs) {
  let startTime = performance.now();
  try {
    getHooksConfigFromSnapshot();
  } catch (error) {
    logError(toError(error));
  }
  let flagFetchLanded = false;
  let [pluginHookMs, managedSettingsMs, policyLimitsMs, flagFetchMs] = await Promise.all([
    timedWait("the plugin-hook registration pass", async () => {
      await pendingPluginHookRegistration();
    }),
    timedWait("the remote managed-settings load", waitForRemoteManagedSettingsToLoad),
    timedWait("the policy-limits load", waitForPolicyLimitsToLoad),
    timedWait("the first flag fetch", async () => {
      let { timedOut } = await waitForInitialize({
        initialize: initializeGrowthBook,
        budgetMs,
      });
      flagFetchLanded = !timedOut;
    }),
  ]);
  logForDebugging(
    `[remote-tools] ready to judge calls after ${Math.round(performance.now() - startTime)}ms: waited ${pluginHookMs}ms for plugin hooks, ${managedSettingsMs}ms for remote managed settings, ${policyLimitsMs}ms for policy limits, ${flagFetchMs}ms for the first flag fetch (${flagFetchLanded ? "landed" : "not heard in time"})`,
  );
}
//@ chunk-1rt6ktyk.js:1252-1456 placement
/**
 * 计时等待一个前置步骤，失败继续
 */
async function timedWait(label, wait) {
  let startTime = performance.now();
  try {
    await wait();
  } catch (error) {
    logForDebugging(`[remote-tools] waiting for ${label} failed; serving goes on without it`, {
      level: "error",
    });
    logError(toError(error));
  }
  return Math.round(performance.now() - startTime);
}
//@ chunk-1rt6ktyk.js:1456-1673 placement
/**
 * 服务调用缺少插件下发的 hook 时报错
 */
async function warnMissingPluginHooks() {
  try {
    let cause = (await pluginHooksUnknownCause(false)) ?? (await failedPluginHookRegistration());
    if (cause !== undefined)
      logForDebugging(
        `[remote-tools] plugin-delivered hooks are missing from the calls this machine serves, as from its own: ${cause}`,
        {
          level: "error",
        },
      );
  } catch (error) {
    logError(toError(error));
  }
}
export { createServingReadiness };
