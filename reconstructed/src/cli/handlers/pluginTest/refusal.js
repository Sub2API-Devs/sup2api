/**
 * cli/handlers/pluginTest/refusal.ts
 *
 * 2.1.316 新增。claude plugin test 运行前的拒绝检查：hooks 模块被关闭、开关保存失败、登录将过期等情况下给出原因。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-16wxtfnh.js (17)
 * attribution: placement 17
 */
import { Ar } from "../../../../runtime/bun-runtime.js";
import { getBasePolicySettings } from "../../../utils/settings/settings.js";
import { hasRemoteHelperState } from "../../../utils/settings/policyHelper/helperRemote.js";
import { getClaudeAIOAuthTokensAsync, shouldUseWIFAuth } from "../../../utils/auth.js";
import { isOAuthTokenExpired } from "../../../services/oauth/client.js";
import {
  hasGrowthBookInitializeStarted,
  initializeGrowthBook,
  stopPeriodicGrowthBookRefresh,
  PLUGIN_HOOKS_MODULES_GATE,
} from "../../../services/analytics/growthbook.js";
import { DoctorLazy } from "../util.js";
import { u, record, string, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import {
  HOOKS_MODULES_DEFAULT,
  areHooksModulesAllowed,
  checkHooksModulesFlag,
  areHooksModulesActive,
} from "../../../services/analytics/growthbookCredentials.js";
import { withDeadline } from "../../../utils/sleep.js";
import { drainConfigWrites, readGlobalConfigFromDiskOrThrow } from "../../../utils/config.js";
import { EVENT_LOGGING_FLAG_WAIT_MS } from "../../../utils/startupFlagWait.js";
import {
  isServedGateSource,
  waitForRolloutUnlessServed,
  markFollowConsumed,
  isDiskSourceWithCredential,
  HOOKS_MODULES_OFF_REASONS,
} from "../../../utils/plugins/hooksModulesRollout.js";
import { hooksModulesGateSourceChanged } from "../../../utils/plugins/hooksModulesLoadGate.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { sessionFactsRestored } from "../../../utils/auth/personProxyAuthHelper.js";

//@ chunk-16wxtfnh.js:692-703 placement
/**
 * plugin test 拒绝原因模块的导出容器（pluginTestRefusal、SAVE_FAILURE、SIGN_IN_MARGIN_MS 等）。
 */
var PLUGIN_TEST_REFUSAL_EXPORTS = {};
//@ chunk-16wxtfnh.js:703-1108 placement
Ar(PLUGIN_TEST_REFUSAL_EXPORTS, {
  IS_WORKTREE_LAUNCH: () => IS_WORKTREE_LAUNCH,
  SAVE_FAILURE: () => SAVE_FAILURE,
  SIGN_IN_MARGIN_MS: () => SIGN_IN_MARGIN_MS,
  default: () => PLUGIN_TEST_REFUSAL_EXPORTS,
  earlyFetchVetoed: () => earlyFetchVetoed,
  fetchRefreshesSignIn: () => fetchRefreshesSignIn,
  flagClientQuieted: () => flagClientQuieted,
  isSavedSwitchOf: () => isSavedSwitchOf,
  pluginTestFormOf: () => pluginTestFormOf,
  pluginTestGatesOf: () => pluginTestGatesOf,
  pluginTestRefusal: () => pluginTestRefusal,
  savedFlags: () => savedFlags,
  sessionHoldsEarlyFetch: () => sessionHoldsEarlyFetch,
  signInNearsExpiry: () => signInNearsExpiry,
  switchFetched: () => switchFetched,
  switchSaveSettled: () => switchSaveSettled,
});
//@ chunk-16wxtfnh.js:1108-1211 placement
function pluginTestFormOf(e) {
  let r = e[0] === "--file";
  let any = e.some((i) => i.startsWith("-"));
  return r ? "file" : any ? "other" : "run";
}
//@ chunk-16wxtfnh.js:1211-1222 placement
var IS_WORKTREE_LAUNCH = false;
//@ chunk-16wxtfnh.js:1222-1395 placement
async function sessionHoldsEarlyFetch() {
  let basePolicySettings = getBasePolicySettings();
  return (
    hasRemoteHelperState() ||
    basePolicySettings?.policyHelpers != null ||
    basePolicySettings?.policyHelper != null ||
    import("./chunk-n0rgk8w9.js").then((r) => r.pendingSettingsEnvBlocksEarlyGb(IS_WORKTREE_LAUNCH))
  );
}
//@ chunk-16wxtfnh.js:1395-1449 placement
var earlyFetchVetoed = () =>
  Promise.resolve()
    .then(sessionHoldsEarlyFetch)
    .catch(() => true);
//@ chunk-16wxtfnh.js:1449-1463 placement
var SIGN_IN_MARGIN_MS = 60000;
//@ chunk-16wxtfnh.js:1463-1549 placement
async function signInNearsExpiry() {
  let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync();
  return (
    claudeAIOAuthTokens !== null &&
    isOAuthTokenExpired(claudeAIOAuthTokens.expiresAt, Date.now() + SIGN_IN_MARGIN_MS)
  );
}
//@ chunk-16wxtfnh.js:1549-1615 placement
var fetchRefreshesSignIn = () =>
  Promise.resolve()
    .then(() => shouldUseWIFAuth() || signInNearsExpiry())
    .catch(() => true);
//@ chunk-16wxtfnh.js:1615-1658 placement
function flagClientQuieted() {
  if (hasGrowthBookInitializeStarted())
    initializeGrowthBook().then(stopPeriodicGrowthBookRefresh, stopPeriodicGrowthBookRefresh);
}
//@ chunk-16wxtfnh.js:1658-1727 placement = getFeatureValue_CACHED_MAY_BE_STALE (1)
var savedFlags = DoctorLazy(() =>
  u({
    cachedGrowthBookFeatures: record(string(), unknown()).optional(),
  }),
);
//@ chunk-16wxtfnh.js:1727-1858 placement = getFeatureValue_CACHED_MAY_BE_STALE (1)
function isSavedSwitchOf(globalConfigFromDiskOrThrow) {
  let r = savedFlags().safeParse(globalConfigFromDiskOrThrow);
  let s = r.success ? r.data.cachedGrowthBookFeatures?.[PLUGIN_HOOKS_MODULES_GATE] : undefined;
  return typeof s === "boolean" ? s : HOOKS_MODULES_DEFAULT;
}
//@ chunk-16wxtfnh.js:1858-2029 placement
var SAVE_FAILURE =
  "the rollout switch was fetched, but its value could not be saved for the test files to read: the settings file is busy or cannot be written. Run the tests again";
//@ chunk-16wxtfnh.js:2029-2130 placement
async function switchSaveSettled() {
  await withDeadline(drainConfigWrites(), EVENT_LOGGING_FLAG_WAIT_MS);
  return isServedGateSource() &&
    areHooksModulesAllowed() &&
    !hooksModulesGateSourceChanged() &&
    !isSavedSwitchOf(await readGlobalConfigFromDiskOrThrow(undefined))
    ? SAVE_FAILURE
    : null;
}
//@ chunk-16wxtfnh.js:2130-2275 placement
var switchFetched = () =>
  waitForRolloutUnlessServed()
    .finally(flagClientQuieted)
    .then(switchSaveSettled)
    .catch((error) => {
      logForDebugging("claude plugin test: the hold for the rollout flag failed: " + errorMessage(error), {
        level: "error",
      });
      return null;
    });
//@ chunk-16wxtfnh.js:2275-2575 placement
async function pluginTestGatesOf({ helperError, form, envPin }) {
  if (form === "file") markFollowConsumed();
  let i = helperError === null && form === "run";
  let n = i ? ((await sessionFactsRestored(envPin))?.reason ?? null) : helperError;
  let a =
    i && n === null && !isServedGateSource() && !(await earlyFetchVetoed()) && !(await fetchRefreshesSignIn())
      ? await switchFetched()
      : null;
  await checkHooksModulesFlag();
  return {
    helperError: n ?? a,
    isRolloutOn: areHooksModulesAllowed(),
    isSwitchSaved: isDiskSourceWithCredential(),
    canLoadUserModules: areHooksModulesActive(),
  };
}
//@ chunk-16wxtfnh.js:2575-3100 placement
/**
 * claude plugin test 运行前的拒绝检查：hooks 模块被关闭、开关保存失败、登录将过期等情况下给出原因。
 */
function pluginTestRefusal({ helperError, isRolloutOn, isSwitchSaved, canLoadUserModules }) {
  if (helperError !== null) return helperError;
  if (!isRolloutOn)
    return isSwitchSaved
      ? `hooks modules are turned off in this process: ${HOOKS_MODULES_OFF_REASONS.saved}. Start \`claude\` once with network access, then run the tests again; if this message returns, installed mods are turned off remotely`
      : `hooks modules are turned off in this process: ${HOOKS_MODULES_OFF_REASONS.served}, and a plugin's tests run only while it is on`;
  return canLoadUserModules
    ? undefined
    : "hooks modules are turned off here (disableAllHooks, allowManagedHooksOnly or a policy)";
}
export {
  IS_WORKTREE_LAUNCH,
  SAVE_FAILURE,
  SIGN_IN_MARGIN_MS,
  earlyFetchVetoed,
  fetchRefreshesSignIn,
  flagClientQuieted,
  isSavedSwitchOf,
  pluginTestFormOf,
  pluginTestGatesOf,
  pluginTestRefusal,
  savedFlags,
  sessionHoldsEarlyFetch,
  signInNearsExpiry,
  switchFetched,
  switchSaveSettled,
};
