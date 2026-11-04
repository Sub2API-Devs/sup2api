/**
 * cli/startup/launcherHostLogin.ts
 *
 * 2.1.316 新增：启动器宿主登录校验与启动钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (8)
 * attribution: placement 8
 */
import {
  usableLauncherHostLoginToken,
  takeLauncherHostLoginEnd,
  launcherHostLoginRefusal,
  forgetLauncherHostLogin,
  learnLauncherHostLoginIdentity,
} from "../../utils/auth/launcherHostLogin.js";
import {
  clearOAuthTokenCache,
  validateForceLoginOrg,
  launcherSignInMethodRefusal,
} from "../../utils/auth.js";
import { refreshGrowthBookAfterAuthChange } from "../../services/analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { validateOauthToken } from "../../services/oauth/validateOauthToken.js";
import {
  processSessionStartHooks,
  takePendingHookSessionTitle,
  processSetupHooks,
} from "../../utils/sessionStart.js";
import { cacheHookSessionTitle } from "../../utils/sessionStorage.js";

//@ chunk-3wek6r2k.js:16735-16911 placement
function settleLauncherHostLogin(identity) {
  if (usableLauncherHostLoginToken() === null) {
    if (!takeLauncherHostLoginEnd()) return identity;
    clearOAuthTokenCache();
    refreshGrowthBookAfterAuthChange();
    return identity.valid && launcherHostLoginRefusal() === "login_method_pin"
      ? (launcherClaudeAiLoginRefusal() ?? identity)
      : identity;
  }
  let refusal = identity.valid ? launcherClaudeAiLoginRefusal() : identity;
  if (refusal === null) return identity;
  forgetLauncherHostLogin();
  clearOAuthTokenCache();
  return refusal;
}
//@ chunk-3wek6r2k.js:16911-17243 placement
function forgetLauncherHostLoginForCloud(options) {
  if (
    (options.remote !== null ||
      options.teleport !== null ||
      options.poolId !== null ||
      options.environmentQuery !== null ||
      options.projectFlag !== null ||
      options.projectBrowse !== null) &&
    forgetLauncherHostLogin() &&
    takeLauncherHostLoginEnd()
  ) {
    logForDebugging(
      "[launcher-host-login] the desktop app's sign-in is over for this process (session_elsewhere)",
      {
        level: "warn",
      },
    );
    logFeatureBad("auth_launcher_host_login", "session_elsewhere");
    clearOAuthTokenCache();
    refreshGrowthBookAfterAuthChange();
  }
}
//@ chunk-3wek6r2k.js:17243-17429 placement
async function validateLoginIdentity(token) {
  let info = await validateOauthToken(token);
  let organizationUuid = info?.organization_uuid;
  let accountUuid = info?.account_uuid;
  return typeof organizationUuid === "string" &&
    organizationUuid !== "" &&
    typeof accountUuid === "string" &&
    accountUuid !== ""
    ? {
        organizationUuid,
        accountUuid,
      }
    : null;
}
//@ chunk-3wek6r2k.js:17429-18214 placement
/**
 * 校验桌面应用替换的登录令牌（launcher-host-login）：组织校验、身份是否与启动身份一致。
 */
async function verifyLauncherHostLogin(credentials, token) {
  let refusal = launcherClaudeAiLoginRefusal();
  let verdict = null;
  if (refusal !== null)
    verdict = {
      verdict: "refused",
      why: refusal.reason,
    };
  else {
    let [startupIdentity, identity] = await Promise.all([
      learnLauncherHostLoginIdentity(validateLoginIdentity),
      validateLoginIdentity(token),
    ]);
    let orgCheck = await validateForceLoginOrg(credentials, undefined, {
      accessToken: token,
      organizationUuid: identity?.organizationUuid,
    });
    let refusal = launcherClaudeAiLoginRefusal();
    if (refusal !== null)
      verdict = {
        verdict: "refused",
        why: refusal.reason,
      };
    else if (!orgCheck.valid)
      verdict = {
        verdict: orgCheck.reason === "org_verify_failed" ? "unverified" : "refused",
        why: orgCheck.reason,
      };
    else if (identity === null)
      verdict = {
        verdict: "unverified",
        why: "identity_not_learned",
      };
    else if (startupIdentity === null)
      verdict = {
        verdict: "held_unknown",
        why: "identity_not_learned",
      };
    else if (
      startupIdentity.organizationUuid !== identity.organizationUuid ||
      startupIdentity.accountUuid !== identity.accountUuid
    )
      verdict = {
        verdict: "refused",
        why: "not_the_startup_identity",
      };
  }
  if (verdict === null) return "allowed";
  logForDebugging(
    `[launcher-host-login] the desktop app's replacement sign-in is not taken (${verdict.why})`,
    {
      level: "warn",
    },
  );
  return verdict.verdict;
}
//@ chunk-3wek6r2k.js:18214-18425 placement
function launcherClaudeAiLoginRefusal() {
  let refusal = launcherSignInMethodRefusal();
  return refusal === null
    ? null
    : {
        valid: false,
        reason: "managed_settings_invalid",
        message: `The sign-in the desktop app provided is a claude.ai sign-in, which the settings in force do not allow.

${refusal}`,
      };
}
//@ chunk-3wek6r2k.js:18425-18905 placement
async function runStartupHooks(trigger, options) {
  switch (options.kind) {
    case "session-start": {
      let result = await processSessionStartHooks(trigger, options.source, {
        sessionId: options.sessionId,
        agentType: options.agentType,
        model: options.model,
        forceSyncExecution: options.forceSyncExecution,
        orphaned: options.orphaned,
        newPluginsOnly: options.newPluginsOnly,
        storageV5: options.storageV5,
        credentials: options.credentials,
      });
      if (options.orphaned?.aborted) return result;
      let title = takePendingHookSessionTitle();
      if (title) cacheHookSessionTitle(title);
      return result;
    }
    case "setup":
      return processSetupHooks(trigger, options.trigger, {
        forceSyncExecution: options.forceSyncExecution,
        storageV5: options.storageV5,
        credentials: options.credentials,
      });
  }
}
//@ chunk-3wek6r2k.js:18905-18992 placement
function joinPromptAppend(base, append) {
  if (!append) return base;
  if (!base) return append;
  return `${base.replace(/\r?\n$/, "")}

${append}`;
}
//@ chunk-3wek6r2k.js:18992-19020 placement
var HOSTED_RULES_FLAG = "tengu_harp_voatavo";
export {
  settleLauncherHostLogin,
  runStartupHooks,
  verifyLauncherHostLogin,
  forgetLauncherHostLoginForCloud,
  joinPromptAppend,
  HOSTED_RULES_FLAG,
  validateLoginIdentity,
};
