/**
 * cli/fastPathSettings.ts
 *
 * 2.1.316 新增。快速路径命令（daemon、self-hosted runner、Chrome MCP）只加载必要的设置与托管策略助手，不走完整初始化。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-25mxxtgv.js (6)
 * attribution: placement 6
 */
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession, setGatewayRequiredByHostPolicyReader } from "../bootstrap/state.js";
import { applySettingSourcesFlagFromArgv } from "../main.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { enableConfigs, getGlobalConfig } from "../utils/config.js";
import { is } from "../utils/settings/commandSyncNames.js";
import { t1e } from "../utils/settings/managedPluginTiers.js";
import {
  ensureKeychainPrefetchCompleted,
  KEYCHAIN_PREFETCH_FASTPATH_BUDGET_MS,
} from "../utils/secureStorage/keychainPrefetch.js";
import { withoutHostManagedProviderVars } from "../utils/managedEnv.js";
import { applySafeConfigEnvironmentVariables } from "../utils/managedEnvApply.js";
import { checkPolicyVersionBounds } from "../utils/versionBounds.js";
import { runPolicyHelperPass } from "../utils/settings/policyHelper/policyHelper.js";
import {
  getBasePolicySettings,
  getBasePolicySettingsOrigin,
  getPolicyHelperSourceLoadErrors,
} from "../utils/settings/settings.js";
import { Ole } from "../utils/settings/policyHelper/helperRemote.js";

/**
 * 快速路径设置加载状态
 */
//@ chunk-25mxxtgv.js:619-822 placement
class FastPathSettingsState {
  settingsLoaded = !1;
  helperResult = null;
  claimSettingsLoad() {
    if (this.settingsLoaded) return !1;
    return ((this.settingsLoaded = !0), !0);
  }
  beginHelperRun() {
    return ((this.helperResult = { error: null }), this.helperResult);
  }
}
//@ chunk-25mxxtgv.js:822-845 placement
var p = new HostScoped(() => new FastPathSettingsState());
//@ chunk-25mxxtgv.js:845-880 placement
function l() {
  return p.of(getRootSession().host);
}
/**
 * 快速路径命令（daemon、self-hosted runner、Chrome MCP）只加载必要的设置与托管策略助手，不走完整初始化。
 */
//@ chunk-25mxxtgv.js:880-1787 placement
async function ensureFastPathSettingsLoaded(t) {
  if (!l().claimSettingsLoad()) return;
  applySettingSourcesFlagFromArgv();
  let e = isStorageV5Enabled() ? t?.backend : void 0;
  if (isStorageV5Enabled() && e !== void 0) {
    let [
      { seedUserSettings: o },
      { primeWindowsCredManBackendEnabled: i },
      { primeRemoteManagedSettingsCache: a },
      { primeWorkspaceRoots: r },
    ] = await Promise.all([
      import("./chunk-0yd7prrv.js"),
      import("./chunk-qfg23ew5.js"),
      import("./chunk-3h7517tw.js"),
      import("./chunk-rk4keqdb.js"),
    ]);
    (await r(e),
      await Promise.all([enableConfigs(e), o(e, is())]),
      i(getGlobalConfig().cachedGrowthBookFeatures?.tengu_windows_credman === !0),
      await a(e));
  } else await enableConfigs();
  if (
    (await t1e(),
    await ensureKeychainPrefetchCompleted(KEYCHAIN_PREFETCH_FASTPATH_BUDGET_MS),
    isStorageV5Enabled() && e !== void 0)
  ) {
    let [{ credentialsStoreFor: o }, { primeFileDescriptorCredentials: i }, { primeStoredLoginCopy: a }] =
        await Promise.all([
          import("./chunk-y36z1q7c.js"),
          import("./chunk-szwzw7ss.js"),
          import("./chunk-7v0gj88m.js"),
        ]),
      r = o(e);
    if (r !== void 0) (await i(r, { bgAuthSnapshot: "leave" }), await a(r));
  }
  (setGatewayRequiredByHostPolicyReader(withoutHostManagedProviderVars),
    applySafeConfigEnvironmentVariables());
  let n = checkPolicyVersionBounds();
  if (n)
    (process.stderr.write(`${n}
`),
      process.exit(1));
}
//@ chunk-25mxxtgv.js:1787-1953 placement
async function runFastPathPolicyHelper() {
  let t = l();
  if (t.helperResult) return t.helperResult.error;
  let beginHelperRun = t.beginHelperRun();
  if (
    ((beginHelperRun.error = await runPolicyHelperPass(
      getBasePolicySettings(),
      getBasePolicySettingsOrigin(),
      getPolicyHelperSourceLoadErrors(),
    )),
    Ole())
  )
    applySafeConfigEnvironmentVariables();
  return beginHelperRun.error;
}
//@ chunk-25mxxtgv.js:1953-2001 placement
async function loadFastPathPolicy(t) {
  return (await ensureFastPathSettingsLoaded(t), runFastPathPolicyHelper());
}

export { ensureFastPathSettingsLoaded, runFastPathPolicyHelper, loadFastPathPolicy };
