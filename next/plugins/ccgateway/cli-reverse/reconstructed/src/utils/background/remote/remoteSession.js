/**
 * utils/background/remote/remoteSession.ts
 *
 * 后台云会话资格检查（eval 限制、组织策略、登录、git 仓库与远端、GitHub App/账号连接）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/background/remote/remoteSession.ts
 * pieces: chunk-8nz8g4ca.js (1), chunk-e6aww6q8.js (16)
 * attribution: placement 16, fingerprint 1
 */
import { env } from "../../env.js";
import { isPolicyAllowed as isPolicyAllowed_3 } from "../../../services/policyLimits/policyEvidence.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { hasFreshSubscriberToken } from "../../../commands/review/ultrareviewPreconditions.js";
import { detectCurrentRepositoryWithHost, isNestedGitLabProject } from "../../detectRepository.js";
import {
  isConsoleProfileSessionsCredential,
  sessionsApiAccessToken,
  cloudSessionsSignInRefusal,
} from "../../teleport/api.js";
import {
  fetchRemoteEnvironmentsForEligibility,
  isInGitRepo,
  checkGithubAppInstalled,
} from "./preconditions.js";
import { getEnvironmentSelectionInfo, isCcpoolId } from "../../teleport/environmentSelection.js";
import { checkGate_CACHED_OR_BLOCKING } from "../../../services/analytics/growthbook.js";
import { getCwd } from "../../cwd.js";
import { findGitRoot } from "../../git.js";
import { isGithubDotCom } from "../../git/githubUrl.js";
import { getRemoteSessionUrl } from "../../../constants/product.js";
import { createSignal } from "../../signal.js";
import { HostScoped } from "../../hostScoped.js";
import { getRootSession, getOriginalCwd } from "../../../bootstrap/state.js";
import { sessionIdBody } from "../../../bridge/sessionIdCompat.js";
import { getRemoteCaps } from "../../../remote/remoteMode.js";
import { getStoredOauthAccountInfo } from "../../auth.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1775166-1776430 fingerprint (2.1.88 match: checkBackgroundRemoteSessionEligibility, 0.664)
/**
 * 依次检查：CLAUDE_CODE_EVAL_CONFINED、策略 allow_remote_sessions、登录状态、是否在 git 仓库、是否有 GitHub 远端（允许 bundle 时可跳过）、GitHub App/账号连接；返回错误列表并记 bg_remote_eligibility_check。
 */
async function checkBackgroundRemoteSessionEligibility({
  allowBundle = false,
  cwd,
  storageV5,
  credentials,
} = {}) {
  let errors = [];
  if (env.CLAUDE_CODE_EVAL_CONFINED) {
    errors.push({
      type: "eval_confined",
    });
    return errors;
  }
  if (!isPolicyAllowed_3("allow_remote_sessions")) {
    errors.push({
      type: "policy_blocked",
    });
    logFeatureSad("bg_remote_eligibility_check", "policy_blocked");
    return errors;
  }
  let [needsLogin, currentRepositoryWithHost] = await Promise.all([
    hasFreshSubscriberToken(credentials),
    detectCurrentRepositoryWithHost(cwd),
  ]);
  let repository =
    currentRepositoryWithHost && isNestedGitLabProject(currentRepositoryWithHost)
      ? null
      : currentRepositoryWithHost;
  let environments = null;
  let consoleNeedsLogin =
    isConsoleProfileSessionsCredential() && (await sessionsApiAccessToken(true)) === undefined;
  if (needsLogin)
    errors.push({
      type: "not_logged_in",
    });
  else if (consoleNeedsLogin)
    errors.push({
      type: "not_logged_in",
      message: cloudSessionsSignInRefusal(),
    });
  else
    try {
      environments = await fetchRemoteEnvironmentsForEligibility(storageV5, credentials);
    } catch {
      errors.push({
        type: "not_logged_in",
      });
    }
  let id = getEnvironmentSelectionInfo().id;
  let hasByocEnvironment =
    isCcpoolId(id) ||
    (id !== undefined &&
      environments !== null &&
      environments.some((environment) => environment.environment_id === id && environment.kind === "byoc"));
  let bundleAllowed =
    allowBundle &&
    (env.CCR_FORCE_BUNDLE ||
      env.CCR_ENABLE_BUNDLE ||
      (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bundle_seed_enabled")));
  if (!(await isInGitRepo(cwd)))
    errors.push({
      type: "not_in_git_repo",
      cwd: cwd ?? getCwd(),
    });
  else if (bundleAllowed && findGitRoot(cwd ?? getCwd()) !== null);
  else if (repository === null)
    errors.push({
      type: "no_git_remote",
    });
  else if (!hasByocEnvironment && isGithubDotCom(repository.host) && !consoleNeedsLogin) {
    let hasGithubApp = await checkGithubAppInstalled(repository.owner, repository.name);
    if (hasGithubApp.linkedAccountAccess === "github_not_connected")
      errors.push({
        type: "github_not_connected",
      });
    else if (!hasGithubApp.appInstalled)
      errors.push({
        type: "github_app_not_installed",
        transient: hasGithubApp.transient,
        ...(hasGithubApp.serverMessage && {
          serverMessage: hasGithubApp.serverMessage,
        }),
      });
  }
  if (errors.length === 0) logFeatureOk("bg_remote_eligibility_check");
  else logFeatureBad("bg_remote_eligibility_check", errors[0].type);
  return errors;
}
//@ chunk-e6aww6q8.js:1804021-1804095 placement
/**
 * 构造远程会话的 URL（带上 SESSION_INGRESS_URL）。
 */
function remoteSessionUrl(sessionId) {
  return getRemoteSessionUrl(sessionId, process.env.SESSION_INGRESS_URL, {
    from: "cli",
  });
}
//@ chunk-e6aww6q8.js:1804095-1804119 placement
/**
 * 占位实现，恒返回 false。
 */
function alwaysFalsePlaceholder() {
  return false;
}
//@ chunk-e6aww6q8.js:1804156-1804179 placement
/**
 * 占位实现，恒返回 undefined。
 */
function stubSessionTeam(tags) {
  return;
}
//@ chunk-e6aww6q8.js:1804179-1804327 placement
class RemoteSessionTeamState {
  known = new Map();
  teamReadsUnderWay = new Map();
  isOnATeam = new Map();
  hasLoggedNoAnswer = new Set();
  teamName = new Map();
  teamNameAskedAs = new Map();
  changed = createSignal();
}
//@ chunk-e6aww6q8.js:1804327-1804354 placement
/**
 * 按宿主隔离的远程会话团队状态缓存。
 */
var remoteSessionTeamByHost; // deferred: uses RemoteSessionTeamState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1804327", () => {
  remoteSessionTeamByHost = new HostScoped(() => new RemoteSessionTeamState());
});
//@ chunk-e6aww6q8.js:1804354-1804392 placement
/**
 * 取出当前宿主的远程会话团队状态。
 */
function getRemoteSessionTeamState() {
  return remoteSessionTeamByHost.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1804392-1804488 placement
/**
 * 记录某会话所属的团队并通知变更。
 */
function recordRemoteSessionTeam(sessionId, tags) {
  let team = stubSessionTeam(tags);
  if (team !== undefined) {
    let remoteSessionTeamState = getRemoteSessionTeamState();
    remoteSessionTeamState.known.set(sessionIdBody(sessionId), team);
    remoteSessionTeamState.changed.emit();
  }
}
//@ chunk-e6aww6q8.js:1804488-1804600 placement
/**
 * 当前会话的账号键（与给定团队一致时返回）。
 */
function sessionAccountKeyOrUndefined(team) {
  let sessionId = getRemoteCaps()?.sessionId;
  if (sessionId === undefined || getRemoteSessionTeamState().known.get(sessionIdBody(sessionId)) !== team)
    return;
  return `${sessionIdBody(sessionId)} ${accountAndOrgKey()}`;
}
//@ chunk-e6aww6q8.js:1804600-1804683 placement
/**
 * 账号与组织的组合键。
 */
function accountAndOrgKey() {
  let storedOauthAccountInfo = getStoredOauthAccountInfo();
  return `${storedOauthAccountInfo?.accountUuid ?? ""} ${storedOauthAccountInfo?.organizationUuid ?? ""}`;
}
//@ chunk-e6aww6q8.js:1804683-1804721 placement
/**
 * 当前会话的团队键（个人）。
 */
function currentSessionTeamKey() {
  return sessionAccountKeyOrUndefined("personal");
}
//@ chunk-e6aww6q8.js:1804721-1804883 placement
/**
 * 返回当前会话所属的团队（个人或团队），未知时 undefined。
 */
function sessionTeamOrUndefined() {
  let sessionTeamKey = currentSessionTeamKey();
  if (sessionTeamKey !== undefined)
    return getRemoteSessionTeamState().isOnATeam.get(sessionTeamKey) === true ? "personal" : undefined;
  let sessionId = getRemoteCaps()?.sessionId;
  return sessionId === undefined
    ? undefined
    : getRemoteSessionTeamState().known.get(sessionIdBody(sessionId));
}
//@ chunk-e6aww6q8.js:1804883-1804932 placement
/**
 * 订阅远程会话团队状态的变更。
 */
function onSessionTeamChanged(listener) {
  return getRemoteSessionTeamState().changed.subscribe(listener);
}
//@ chunk-e6aww6q8.js:1804982-1805029 placement
/**
 * 工作区受信任时返回远程会话。
 */
function remoteSessionIfTrusted() {
  return noRemoteSession(getOriginalCwd(), {
    ifTrusted: true,
  });
}
//@ chunk-e6aww6q8.js:1805029-1805068 placement
/**
 * 占位实现，恒返回 false（不返回远程会话）。
 */
function noRemoteSession(originalCwd, { ifTrusted }) {
  return false;
}
//@ chunk-e6aww6q8.js:1805068-1805090 placement
/**
 * 占位实现，恒返回 undefined（无展示用会话状态）。
 */
function noDisplaySessionStatus() {
  return;
}
//@ chunk-8nz8g4ca.js:191-608 placement
/**
 * 把远程会话状态映射为展示用状态（已归档、失败、需要操作、空闲等）。
 */
function toDisplaySessionStatus(session) {
  switch (session.status) {
    case "archived":
      return "archived";
    case "failed":
      return "failed";
    case "paused":
      return session.worker_status === "requires_action" ? "requires_action" : "idle";
    default:
      switch (session.worker_status) {
        case undefined:
        case "":
        case "WORKER_STATUS_UNSPECIFIED":
          return "pending";
        case "running":
          return session.connection_status === "disconnected" ? "idle" : "running";
        case "requires_action":
          return "requires_action";
        default:
          return "idle";
      }
  }
}
export {
  checkBackgroundRemoteSessionEligibility,
  remoteSessionUrl,
  alwaysFalsePlaceholder,
  onSessionTeamChanged,
  sessionTeamOrUndefined,
  currentSessionTeamKey,
  toDisplaySessionStatus,
  recordRemoteSessionTeam,
  remoteSessionIfTrusted,
  noDisplaySessionStatus,
};
