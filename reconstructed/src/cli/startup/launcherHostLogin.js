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
function settleLauncherHostLogin(e) {
  if (usableLauncherHostLoginToken() === null) {
    if (!takeLauncherHostLoginEnd()) return e;
    clearOAuthTokenCache();
    refreshGrowthBookAfterAuthChange();
    return e.valid && launcherHostLoginRefusal() === "login_method_pin"
      ? (launcherClaudeAiLoginRefusal() ?? e)
      : e;
  }
  let o = e.valid ? launcherClaudeAiLoginRefusal() : e;
  if (o === null) return e;
  forgetLauncherHostLogin();
  clearOAuthTokenCache();
  return o;
}
//@ chunk-3wek6r2k.js:16911-17243 placement
function forgetLauncherHostLoginForCloud(e) {
  if (
    (e.remote !== null ||
      e.teleport !== null ||
      e.poolId !== null ||
      e.environmentQuery !== null ||
      e.projectFlag !== null ||
      e.projectBrowse !== null) &&
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
async function validateLoginIdentity(e) {
  let o = await validateOauthToken(e);
  let organizationUuid = o?.organization_uuid;
  let accountUuid = o?.account_uuid;
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
async function verifyLauncherHostLogin(credentials, o) {
  let n = launcherClaudeAiLoginRefusal();
  let r = null;
  if (n !== null)
    r = {
      verdict: "refused",
      why: n.reason,
    };
  else {
    let [u, p] = await Promise.all([
      learnLauncherHostLoginIdentity(validateLoginIdentity),
      validateLoginIdentity(o),
    ]);
    let h = await validateForceLoginOrg(credentials, undefined, {
      accessToken: o,
      organizationUuid: p?.organizationUuid,
    });
    let S = launcherClaudeAiLoginRefusal();
    if (S !== null)
      r = {
        verdict: "refused",
        why: S.reason,
      };
    else if (!h.valid)
      r = {
        verdict: h.reason === "org_verify_failed" ? "unverified" : "refused",
        why: h.reason,
      };
    else if (p === null)
      r = {
        verdict: "unverified",
        why: "identity_not_learned",
      };
    else if (u === null)
      r = {
        verdict: "held_unknown",
        why: "identity_not_learned",
      };
    else if (u.organizationUuid !== p.organizationUuid || u.accountUuid !== p.accountUuid)
      r = {
        verdict: "refused",
        why: "not_the_startup_identity",
      };
  }
  if (r === null) return "allowed";
  logForDebugging(`[launcher-host-login] the desktop app's replacement sign-in is not taken (${r.why})`, {
    level: "warn",
  });
  return r.verdict;
}
//@ chunk-3wek6r2k.js:18214-18425 placement
function launcherClaudeAiLoginRefusal() {
  let e = launcherSignInMethodRefusal();
  return e === null
    ? null
    : {
        valid: false,
        reason: "managed_settings_invalid",
        message: `The sign-in the desktop app provided is a claude.ai sign-in, which the settings in force do not allow.

${e}`,
      };
}
//@ chunk-3wek6r2k.js:18425-18905 placement
async function runStartupHooks(trigger, o) {
  switch (o.kind) {
    case "session-start": {
      let n = await processSessionStartHooks(trigger, o.source, {
        sessionId: o.sessionId,
        agentType: o.agentType,
        model: o.model,
        forceSyncExecution: o.forceSyncExecution,
        orphaned: o.orphaned,
        newPluginsOnly: o.newPluginsOnly,
        storageV5: o.storageV5,
        credentials: o.credentials,
      });
      if (o.orphaned?.aborted) return n;
      let r = takePendingHookSessionTitle();
      if (r) cacheHookSessionTitle(r);
      return n;
    }
    case "setup":
      return processSetupHooks(trigger, o.trigger, {
        forceSyncExecution: o.forceSyncExecution,
        storageV5: o.storageV5,
        credentials: o.credentials,
      });
  }
}
//@ chunk-3wek6r2k.js:18905-18992 placement
function joinPromptAppend(e, o) {
  if (!o) return e;
  if (!e) return o;
  return `${e.replace(/\r?\n$/, "")}

${o}`;
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
