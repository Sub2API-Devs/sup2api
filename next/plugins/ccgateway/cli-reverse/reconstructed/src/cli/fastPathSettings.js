/**
 * cli/fastPathSettings.ts
 *
 * 2.1.316 新增。快速路径命令（daemon、self-hosted runner、Chrome MCP）只加载必要的设置与托管策略助手，不走完整初始化。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-htxj5m5d.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession, setGatewayRequiredByHostPolicyReader } from "../bootstrap/state.js";
import { applySettingSourcesFlagFromArgv } from "../main.js";
import { isStorageV5Enabled } from "../utils/hoverRest.js";
import { enableConfigs, getGlobalConfig } from "../utils/config.js";
import { commandSyncNameState } from "../utils/settings/commandSyncNames.js";
import { ensureMdmLoaded } from "../utils/settings/mdm/mdmLoader.js";
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

//@ chunk-htxj5m5d.js:619-822 placement
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
//@ chunk-htxj5m5d.js:822-845 placement
var FAST_PATH_SETTINGS_SLOT = new HostScoped(() => new FastPathSettingsState());
//@ chunk-htxj5m5d.js:845-880 placement
function fastPathSettings() {
  return FAST_PATH_SETTINGS_SLOT.of(getRootSession().host);
}
//@ chunk-htxj5m5d.js:880-1787 placement
/**
 * 快速路径命令（daemon、self-hosted runner、Chrome MCP）只加载必要的设置与托管策略助手，不走完整初始化。
 */
async function ensureFastPathSettingsLoaded(options) {
  if (!fastPathSettings().claimSettingsLoad()) return;
  applySettingSourcesFlagFromArgv();
  let backend = isStorageV5Enabled() ? options?.backend : undefined;
  if (isStorageV5Enabled() && backend !== undefined) {
    let [
      { seedUserSettings },
      { primeWindowsCredManBackendEnabled },
      { primeRemoteManagedSettingsCache },
      { primeWorkspaceRoots },
    ] = await Promise.all([
      import("../utils/settings/settingsPrime.js"),
      import("../utils/secureStorage/index.js"),
      import("../services/remoteManagedSettings/HELPER_CONSENT_STATE_ID.lazy.js"),
      import("../utils/workspaceRoots.js"),
    ]);
    await primeWorkspaceRoots(backend);
    await Promise.all([enableConfigs(backend), seedUserSettings(backend, commandSyncNameState())]);
    primeWindowsCredManBackendEnabled(
      getGlobalConfig().cachedGrowthBookFeatures?.tengu_windows_credman === true,
    );
    await primeRemoteManagedSettingsCache(backend);
  } else await enableConfigs();
  await ensureMdmLoaded();
  await ensureKeychainPrefetchCompleted(KEYCHAIN_PREFETCH_FASTPATH_BUDGET_MS);
  if (isStorageV5Enabled() && backend !== undefined) {
    let [{ credentialsStoreFor }, { primeFileDescriptorCredentials }, { primeStoredLoginCopy }] =
      await Promise.all([
        import("../utils/secureStorage/credentialsFileStore.js"),
        import("../utils/fileDescriptorCredentials.js"),
        import("../utils/auth.js"),
      ]);
    let store = credentialsStoreFor(backend);
    if (store !== undefined) {
      await primeFileDescriptorCredentials(store, {
        bgAuthSnapshot: "leave",
      });
      await primeStoredLoginCopy(store);
    }
  }
  setGatewayRequiredByHostPolicyReader(withoutHostManagedProviderVars);
  applySafeConfigEnvironmentVariables();
  let error = checkPolicyVersionBounds();
  if (error) {
    process.stderr.write(`${error}
`);
    process.exit(1);
  }
}
//@ chunk-htxj5m5d.js:1787-1953 placement
async function runFastPathPolicyHelper() {
  let state = fastPathSettings();
  if (state.helperResult) return state.helperResult.error;
  let run = state.beginHelperRun();
  run.error = await runPolicyHelperPass(
    getBasePolicySettings(),
    getBasePolicySettingsOrigin(),
    getPolicyHelperSourceLoadErrors(),
  );
  if (hasRemoteHelperState()) applySafeConfigEnvironmentVariables();
  return run.error;
}
//@ chunk-htxj5m5d.js:1953-2001 placement
async function loadFastPathPolicy(options) {
  await ensureFastPathSettingsLoaded(options);
  return runFastPathPolicyHelper();
}
export { ensureFastPathSettingsLoaded, loadFastPathPolicy, runFastPathPolicyHelper };
