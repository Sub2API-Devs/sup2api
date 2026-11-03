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
import { Ole } from "../../../utils/settings/policyHelper/helperRemote.js";
import { getClaudeAIOAuthTokensAsync, shouldUseWIFAuth } from "../../../utils/auth.js";
import { isOAuthTokenExpired } from "../../../services/oauth/client.js";
import {
  hasGrowthBookInitializeStarted,
  initializeGrowthBook,
  stopPeriodicGrowthBookRefresh,
  PLUGIN_HOOKS_MODULES_GATE,
} from "../../../services/analytics/growthbook.js";
import { DoctorLazy } from "../util.js";
import { u, pe, o, oe } from "../../../../vendor/zod/v4/classic/schemas.js";
import {
  HOOKS_MODULES_DEFAULT,
  areHooksModulesAllowed,
  checkHooksModulesFlag,
  areHooksModulesActive,
} from "../../../services/analytics/growthbookCredentials.js";
import { withDeadline } from "../../../utils/sleep.js";
import { drainConfigWrites, readGlobalConfigFromDiskOrThrow } from "../../../utils/config.js";
import { qM } from "../../../utils/startupFlagWait.js";
import { R_n, fFi, cFi, YNe, HOOKS_MODULES_OFF_REASONS } from "../../../utils/plugins/hooksModulesRollout.js";
import { rYr } from "../../../utils/plugins/hooksModulesLoadGate.js";
import { logForDebugging } from "../../../utils/debug.js";
import { errorMessage } from "../../../utils/errors.js";
import { sessionFactsRestored } from "../../../utils/auth/personProxyAuthHelper.js";

//@ chunk-16wxtfnh.js:692-703 placement
var Fwo = {};
//@ chunk-16wxtfnh.js:703-1108 placement
Ar(Fwo, {
  IS_WORKTREE_LAUNCH: () => IS_WORKTREE_LAUNCH,
  SAVE_FAILURE: () => SAVE_FAILURE,
  SIGN_IN_MARGIN_MS: () => SIGN_IN_MARGIN_MS,
  default: () => Fwo,
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
  let r = e[0] === "--file",
    any = e.some((i) => i.startsWith("-"));
  return r ? "file" : any ? "other" : "run";
}
//@ chunk-16wxtfnh.js:1211-1222 placement
var IS_WORKTREE_LAUNCH = !1;
//@ chunk-16wxtfnh.js:1222-1395 placement
async function sessionHoldsEarlyFetch() {
  let e = getBasePolicySettings();
  return (
    Ole() ||
    e?.policyHelpers != null ||
    e?.policyHelper != null ||
    import("./chunk-n0rgk8w9.js").then((r) => r.pendingSettingsEnvBlocksEarlyGb(IS_WORKTREE_LAUNCH))
  );
}
//@ chunk-16wxtfnh.js:1395-1449 placement
var earlyFetchVetoed = () =>
  Promise.resolve()
    .then(sessionHoldsEarlyFetch)
    .catch(() => !0);
//@ chunk-16wxtfnh.js:1449-1463 placement
var SIGN_IN_MARGIN_MS = 60000;
//@ chunk-16wxtfnh.js:1463-1549 placement
async function signInNearsExpiry() {
  let e = await getClaudeAIOAuthTokensAsync();
  return e !== null && isOAuthTokenExpired(e.expiresAt, Date.now() + SIGN_IN_MARGIN_MS);
}
//@ chunk-16wxtfnh.js:1549-1615 placement
var fetchRefreshesSignIn = () =>
  Promise.resolve()
    .then(() => shouldUseWIFAuth() || signInNearsExpiry())
    .catch(() => !0);
//@ chunk-16wxtfnh.js:1615-1658 placement
function flagClientQuieted() {
  if (hasGrowthBookInitializeStarted())
    initializeGrowthBook().then(stopPeriodicGrowthBookRefresh, stopPeriodicGrowthBookRefresh);
}
//@ chunk-16wxtfnh.js:1658-1727 placement = getFeatureValue_CACHED_MAY_BE_STALE (1)
var savedFlags = DoctorLazy(() => u({ cachedGrowthBookFeatures: pe(o(), oe()).optional() }));
//@ chunk-16wxtfnh.js:1727-1858 placement = getFeatureValue_CACHED_MAY_BE_STALE (1)
function isSavedSwitchOf(e) {
  let safeParse = savedFlags().safeParse(e),
    s = safeParse.success ? safeParse.data.cachedGrowthBookFeatures?.[PLUGIN_HOOKS_MODULES_GATE] : void 0;
  return typeof s === "boolean" ? s : HOOKS_MODULES_DEFAULT;
}
//@ chunk-16wxtfnh.js:1858-2029 placement
var SAVE_FAILURE =
  "the rollout switch was fetched, but its value could not be saved for the test files to read: the settings file is busy or cannot be written. Run the tests again";
//@ chunk-16wxtfnh.js:2029-2130 placement
async function switchSaveSettled() {
  return (
    await withDeadline(drainConfigWrites(), qM),
    R_n() &&
    areHooksModulesAllowed() &&
    !rYr() &&
    !isSavedSwitchOf(await readGlobalConfigFromDiskOrThrow(void 0))
      ? SAVE_FAILURE
      : null
  );
}
//@ chunk-16wxtfnh.js:2130-2275 placement
var switchFetched = () =>
  fFi()
    .finally(flagClientQuieted)
    .then(switchSaveSettled)
    .catch(
      (e) => (
        logForDebugging("claude plugin test: the hold for the rollout flag failed: " + errorMessage(e), {
          level: "error",
        }),
        null
      ),
    );
//@ chunk-16wxtfnh.js:2275-2575 placement
async function pluginTestGatesOf({ helperError: helperError, form: form, envPin: envPin }) {
  if (form === "file") cFi();
  let i = helperError === null && form === "run",
    n = i ? ((await sessionFactsRestored(envPin))?.reason ?? null) : helperError,
    a =
      i && n === null && !R_n() && !(await earlyFetchVetoed()) && !(await fetchRefreshesSignIn())
        ? await switchFetched()
        : null;
  return (
    await checkHooksModulesFlag(),
    {
      helperError: n ?? a,
      isRolloutOn: areHooksModulesAllowed(),
      isSwitchSaved: YNe(),
      canLoadUserModules: areHooksModulesActive(),
    }
  );
}
/**
 * claude plugin test 运行前的拒绝检查：hooks 模块被关闭、开关保存失败、登录将过期等情况下给出原因。
 */
//@ chunk-16wxtfnh.js:2575-3100 placement
function pluginTestRefusal({
  helperError: helperError,
  isRolloutOn: isRolloutOn,
  isSwitchSaved: isSwitchSaved,
  canLoadUserModules: canLoadUserModules,
}) {
  if (helperError !== null) return helperError;
  if (!isRolloutOn)
    return isSwitchSaved
      ? `hooks modules are turned off in this process: ${HOOKS_MODULES_OFF_REASONS.saved}. Start \`claude\` once with network access, then run the tests again; if this message returns, installed mods are turned off remotely`
      : `hooks modules are turned off in this process: ${HOOKS_MODULES_OFF_REASONS.served}, and a plugin's tests run only while it is on`;
  return canLoadUserModules
    ? void 0
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
