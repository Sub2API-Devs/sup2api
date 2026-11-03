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
import { commandSyncNameState } from "../utils/settings/commandSyncNames.js";
import { ensureMdmLoaded } from "../utils/settings/managedPluginTiers.js";
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
import { hasRemoteHelperState } from "../utils/settings/policyHelper/helperRemote.js";

//@ chunk-25mxxtgv.js:619-822 placement
/**
 * 快速路径设置加载状态
 */
class FastPathSettingsState {
  settingsLoaded = false;
  helperResult = null;
  claimSettingsLoad() {
    if (this.settingsLoaded) return false;
    this.settingsLoaded = true;
    return true;
  }
  beginHelperRun() {
    this.helperResult = {
      error: null,
    };
    return this.helperResult;
  }
}
//@ chunk-25mxxtgv.js:822-845 placement
var FAST_PATH_SETTINGS_SLOT = new HostScoped(() => new FastPathSettingsState());
//@ chunk-25mxxtgv.js:845-880 placement
function fastPathSettings() {
  return FAST_PATH_SETTINGS_SLOT.of(getRootSession().host);
}
//@ chunk-25mxxtgv.js:880-1787 placement
/**
 * 快速路径命令（daemon、self-hosted runner、Chrome MCP）只加载必要的设置与托管策略助手，不走完整初始化。
 */
async function ensureFastPathSettingsLoaded(t) {
  if (!fastPathSettings().claimSettingsLoad()) return;
  applySettingSourcesFlagFromArgv();
  let backend = isStorageV5Enabled() ? t?.backend : undefined;
  if (isStorageV5Enabled() && backend !== undefined) {
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
    await r(backend);
    await Promise.all([enableConfigs(backend), o(backend, commandSyncNameState())]);
    i(getGlobalConfig().cachedGrowthBookFeatures?.tengu_windows_credman === true);
    await a(backend);
  } else await enableConfigs();
  await ensureMdmLoaded();
  await ensureKeychainPrefetchCompleted(KEYCHAIN_PREFETCH_FASTPATH_BUDGET_MS);
  if (isStorageV5Enabled() && backend !== undefined) {
    let [{ credentialsStoreFor: o }, { primeFileDescriptorCredentials: i }, { primeStoredLoginCopy: a }] =
      await Promise.all([
        import("./chunk-y36z1q7c.js"),
        import("./chunk-szwzw7ss.js"),
        import("./chunk-7v0gj88m.js"),
      ]);
    let r = o(backend);
    if (r !== undefined) {
      await i(r, {
        bgAuthSnapshot: "leave",
      });
      await a(r);
    }
  }
  setGatewayRequiredByHostPolicyReader(withoutHostManagedProviderVars);
  applySafeConfigEnvironmentVariables();
  let n = checkPolicyVersionBounds();
  if (n) {
    process.stderr.write(`${n}
`);
    process.exit(1);
  }
}
//@ chunk-25mxxtgv.js:1787-1953 placement
async function runFastPathPolicyHelper() {
  let t = fastPathSettings();
  if (t.helperResult) return t.helperResult.error;
  let e = t.beginHelperRun();
  e.error = await runPolicyHelperPass(
    getBasePolicySettings(),
    getBasePolicySettingsOrigin(),
    getPolicyHelperSourceLoadErrors(),
  );
  if (hasRemoteHelperState()) applySafeConfigEnvironmentVariables();
  return e.error;
}
//@ chunk-25mxxtgv.js:1953-2001 placement
async function loadFastPathPolicy(options) {
  await ensureFastPathSettingsLoaded(options);
  return runFastPathPolicyHelper();
}
export { ensureFastPathSettingsLoaded, runFastPathPolicyHelper, loadFastPathPolicy };
