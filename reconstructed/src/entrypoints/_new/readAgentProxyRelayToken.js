/**
 * entrypoints/_new/readAgentProxyRelayToken.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vbtpanx5.js (6)
 * attribution: sole-consumer-new 6
 */
import { NO_CORE_AT_CHAIN_BOTTOM } from "../../plugins/functionHooks/eventCatalog.js";
import { ge } from "../../utils/identity.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { jme } from "../../plugins/functionHooks/dispatch/chain.js";
import { modulesHookingEvent } from "../../plugins/functionHooks/hookDispatch.js";
import { hasLink } from "../../utils/hasLink.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { eventRecordQueue } from "../../utils/telemetry/thirdPartyEventRecords.js";
import { isHttpMcpServeInvocation } from "../mcpServeArgs.js";
import { nk } from "../../utils/subprocessEnvLoader.js";
import { markDescriptorAnnouncementConsumed } from "../../bootstrap/state.js";
import { disableCoreDumps } from "../../utils/processHardening.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { readFromInheritedDescriptor } from "../../utils/authFileDescriptor.js";
import { managedSettingsAskState, hasManagedSettingsCached } from "../../cli/headlessCloud/attachServe.js";
import { IJ } from "../../utils/plugins/marketplaceNames.js";
import { logError } from "../../utils/log.js";
import { onGrowthBookRefresh } from "../../services/analytics/growthbook.js";
import { VRi, qRi } from "../../utils/settings/policyHelper/helperRemote.js";
import {
  getBasePolicySettings,
  getBasePolicySettingsOrigin,
  getPolicyHelperSourceLoadErrors,
} from "../../utils/settings/settings.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";

/**
 * 以 telemetry.log 调用插件链底端的默认实现。
 */
//@ chunk-vbtpanx5.js:2848-2972 sole-consumer-new
function logPluginTelemetry(e, r) {
  return NO_CORE_AT_CHAIN_BOTTOM("telemetry.log", {
    origin: r?.hookOrigin,
    signal: r?.signal,
    ...(r?.engineRaised && { engineRaised: !0 }),
  })(e);
}
//@ chunk-vbtpanx5.js:2972-3422 sole-consumer-new
var CC_PLUGIN_TELEMETRY = "cc-plugin-telemetry",
  b = ge({ lookupFault: !1 }, (e) => {
    e.lookupFault = !1;
  }),
  j = {
    send: (e, r, f) => logPluginTelemetry(e, { signal: r, hookOrigin: f, engineRaised: !0 }),
    isWatched: (e) => {
      try {
        return (
          getPluginRegistry().hooksRespawns.size > 0 ||
          jme() ||
          !modulesHookingEvent("telemetry.log", e).every((r) => r.name === CC_PLUGIN_TELEMETRY && hasLink(r))
        );
      } catch (error) {
        if (!b.lookupFault)
          ((b.lookupFault = !0),
            logForDebugging(
              `[3P telemetry] Could not tell whether a hook watches telemetry.log, so event records are built while this fails: ${errorMessage(error)}`,
              { level: "error" },
            ));
        return !0;
      }
    },
  };
//@ chunk-vbtpanx5.js:3422-3437 sole-consumer-new
eventRecordQueue.setRoad(j);
/**
 * http 方式 mcp serve 启动时从 CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR 指定的继承描述符读出代理中继 token（先关闭核心转储；描述符非法或存在 IPC 通道时拒绝），并从环境变量中删除该键。
 */
//@ chunk-vbtpanx5.js:3437-4407 sole-consumer-new
function readAgentProxyRelayToken() {
  {
    if (!isHttpMcpServeInvocation()) return;
    let tokenFd = nk.CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR;
    if ((nk.unset("CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR"), tokenFd === void 0)) return;
    if (tokenFd.trim()) markDescriptorAnnouncementConsumed("CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR");
    let warn = (p) => logForDebugging(`[agent-proxy] ${p}`, { level: "warn" });
    if ((disableCoreDumps(warn), !/^[1-9][0-9]{0,5}$/.test(tokenFd) || Number(tokenFd) < 3)) {
      (warn(
        "CCR_AGENT_PROXY_TOKEN_FILE_DESCRIPTOR is not a descriptor number of 3 or more; no relay token was read",
      ),
        logFeatureBad("agent_proxy_init", "agent_proxy_init_token_fd_malformed"));
      return;
    }
    if (typeof process.send === "function") {
      (warn(
        "this process has an IPC channel, which no launcher of a tool daemon opens; no relay token was read",
      ),
        logFeatureBad("agent_proxy_init", "agent_proxy_init_token_fd_ipc"));
      return;
    }
    let f = readFromInheritedDescriptor(Number(tokenFd), "agent proxy relay's token");
    if (f === null) {
      (warn(
        "the relay's token was announced but not read (the line above says why); if its descriptor was empty, something else may have read it first",
      ),
        logFeatureBad("agent_proxy_init", "agent_proxy_init_token_fd_unread"));
      return;
    }
    return f;
  }
  return;
}
/**
 * 启动时确定组织 ask 状态并订阅 GrowthBook 刷新；失败时记录错误。
 */
//@ chunk-vbtpanx5.js:4407-4590 sole-consumer-new
function initOrganizationAsk() {
  if (managedSettingsAskState.asks !== void 0) return;
  managedSettingsAskState.asks = IJ;
  try {
    syncOrganizationAskPolicy();
  } catch (error) {
    (logForDebugging("organization ask: not settled at start-up; settings reads go by the launch alone", {
      level: "error",
    }),
      logError(error));
  }
  onGrowthBookRefresh(syncOrganizationAskPolicy);
}
/**
 * 组织 ask 状态变化时重新应用策略设置并通知 policySettings 变更。
 */
//@ chunk-vbtpanx5.js:4590-4813 sole-consumer-new
function syncOrganizationAskPolicy() {
  let e = hasManagedSettingsCached(),
    told = managedSettingsAskState.told;
  if (told !== void 0 && told !== e) {
    if (e)
      VRi(() => ({
        settings: getBasePolicySettings(),
        origin: getBasePolicySettingsOrigin(),
        loadErrors: getPolicyHelperSourceLoadErrors(),
      }));
    else
      qRi(() => ({
        settings: getBasePolicySettings(),
        origin: getBasePolicySettingsOrigin(),
        loadErrors: getPolicyHelperSourceLoadErrors(),
      }));
    settingsChangeDetector.notifyChange("policySettings");
  }
  managedSettingsAskState.told = e;
}

export { readAgentProxyRelayToken, initOrganizationAsk };
