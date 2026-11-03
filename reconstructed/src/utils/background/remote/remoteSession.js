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
import { Jn } from "../../../remote/remoteMode.js";
import { getStoredOauthAccountInfo } from "../../auth.js";

/**
 * 依次检查：CLAUDE_CODE_EVAL_CONFINED、策略 allow_remote_sessions、登录状态、是否在 git 仓库、是否有 GitHub 远端（允许 bundle 时可跳过）、GitHub App/账号连接；返回错误列表并记 bg_remote_eligibility_check。
 */
//@ chunk-e6aww6q8.js:1775166-1776430 fingerprint = checkBackgroundRemoteSessionEligibility (0.664)
async function checkBackgroundRemoteSessionEligibility({
  allowBundle: e = !1,
  cwd: n,
  storageV5: r,
  credentials: s,
} = {}) {
  let errors = [];
  if (env.CLAUDE_CODE_EVAL_CONFINED) return (errors.push({ type: "eval_confined" }), errors);
  if (!isPolicyAllowed_3("allow_remote_sessions"))
    return (
      errors.push({ type: "policy_blocked" }),
      logFeatureSad("bg_remote_eligibility_check", "policy_blocked"),
      errors
    );
  let [y, S] = await Promise.all([hasFreshSubscriberToken(s), detectCurrentRepositoryWithHost(n)]),
    w = S && isNestedGitLabProject(S) ? null : S,
    L = null,
    G = isConsoleProfileSessionsCredential() && (await sessionsApiAccessToken(!0)) === void 0;
  if (y) errors.push({ type: "not_logged_in" });
  else if (G) errors.push({ type: "not_logged_in", message: cloudSessionsSignInRefusal() });
  else
    try {
      L = await fetchRemoteEnvironmentsForEligibility(r, s);
    } catch {
      errors.push({ type: "not_logged_in" });
    }
  let id = getEnvironmentSelectionInfo().id,
    Z =
      isCcpoolId(id) ||
      (id !== void 0 && L !== null && L.some((ke) => ke.environment_id === id && ke.kind === "byoc")),
    Se =
      e &&
      (env.CCR_FORCE_BUNDLE ||
        env.CCR_ENABLE_BUNDLE ||
        (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bundle_seed_enabled")));
  if (!(await isInGitRepo(n))) errors.push({ type: "not_in_git_repo", cwd: n ?? getCwd() });
  else if (Se && findGitRoot(n ?? getCwd()) !== null);
  else if (w === null) errors.push({ type: "no_git_remote" });
  else if (!Z && isGithubDotCom(w.host) && !G) {
    let hasGithubApp = await checkGithubAppInstalled(w.owner, w.name);
    if (hasGithubApp.linkedAccountAccess === "github_not_connected")
      errors.push({ type: "github_not_connected" });
    else if (!hasGithubApp.appInstalled)
      errors.push({
        type: "github_app_not_installed",
        transient: hasGithubApp.transient,
        ...(hasGithubApp.serverMessage && { serverMessage: hasGithubApp.serverMessage }),
      });
  }
  if (errors.length === 0) logFeatureOk("bg_remote_eligibility_check");
  else logFeatureBad("bg_remote_eligibility_check", errors[0].type);
  return errors;
}
//@ chunk-e6aww6q8.js:1804021-1804095 placement
function ZCe(e) {
  return getRemoteSessionUrl(e, process.env.SESSION_INGRESS_URL, { from: "cli" });
}
//@ chunk-e6aww6q8.js:1804095-1804119 placement
function c5s() {
  return !1;
}
//@ chunk-e6aww6q8.js:1804156-1804179 placement
function D7o(e) {
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
var L7o = new HostScoped(() => new RemoteSessionTeamState());
//@ chunk-e6aww6q8.js:1804354-1804392 placement
function QJ() {
  return L7o.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:1804392-1804488 placement
function u5s(e, n) {
  let r = D7o(n);
  if (r !== void 0) {
    let s = QJ();
    (s.known.set(sessionIdBody(e), r), s.changed.emit());
  }
}
//@ chunk-e6aww6q8.js:1804488-1804600 placement
function $7o(e) {
  let n = Jn()?.sessionId;
  if (n === void 0 || QJ().known.get(sessionIdBody(n)) !== e) return;
  return `${sessionIdBody(n)} ${U7o()}`;
}
//@ chunk-e6aww6q8.js:1804600-1804683 placement
function U7o() {
  let e = getStoredOauthAccountInfo();
  return `${e?.accountUuid ?? ""} ${e?.organizationUuid ?? ""}`;
}
//@ chunk-e6aww6q8.js:1804683-1804721 placement
function QUo() {
  return $7o("personal");
}
//@ chunk-e6aww6q8.js:1804721-1804883 placement
function f5s() {
  let e = QUo();
  if (e !== void 0) return QJ().isOnATeam.get(e) === !0 ? "personal" : void 0;
  let n = Jn()?.sessionId;
  return n === void 0 ? void 0 : QJ().known.get(sessionIdBody(n));
}
//@ chunk-e6aww6q8.js:1804883-1804932 placement
function ZUo(e) {
  return QJ().changed.subscribe(e);
}
//@ chunk-e6aww6q8.js:1804982-1805029 placement
function eBo() {
  return W7o(getOriginalCwd(), { ifTrusted: !0 });
}
//@ chunk-e6aww6q8.js:1805029-1805068 placement
function W7o(e, { ifTrusted: ifTrusted }) {
  return !1;
}
//@ chunk-e6aww6q8.js:1805068-1805090 placement
function p5s() {
  return;
}
/**
 * 把远程会话状态映射为展示用状态（已归档、失败、需要操作、空闲等）。
 */
//@ chunk-8nz8g4ca.js:191-608 placement
function toDisplaySessionStatus(e) {
  switch (e.status) {
    case "archived":
      return "archived";
    case "failed":
      return "failed";
    case "paused":
      return e.worker_status === "requires_action" ? "requires_action" : "idle";
    default:
      switch (e.worker_status) {
        case void 0:
        case "":
        case "WORKER_STATUS_UNSPECIFIED":
          return "pending";
        case "running":
          return e.connection_status === "disconnected" ? "idle" : "running";
        case "requires_action":
          return "requires_action";
        default:
          return "idle";
      }
  }
}

export {
  checkBackgroundRemoteSessionEligibility,
  ZCe,
  c5s,
  ZUo,
  f5s,
  QUo,
  toDisplaySessionStatus,
  u5s,
  eBo,
  p5s,
};
