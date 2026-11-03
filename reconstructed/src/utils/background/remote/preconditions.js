/**
 * utils/background/remote/preconditions.ts
 *
 * 已有模块；g2 补充 GitHub 前置条件错误
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/background/remote/preconditions.ts
 * pieces: chunk-s61vbvea.js (12)
 * attribution: fingerprint 4, layout 4, placement 4
 */
import { getIsClean, findGitRoot, gitExe } from "../../git.js";
import { fetchEnvironments } from "../../teleport/environments.js";
import { Dt } from "../../../../vendor/axios/dist/esm/axios.js";
import { logForDebugging } from "../../debug.js";
import { errorMessage } from "../../errors.js";
import { getCwd } from "../../cwd.js";
import { execFileNoThrowWithCwd } from "../../execFileNoThrow.js";
import { freeze as freeze_6 } from "../../git/gitSafeEnv.js";
import { isFirstPartyProvider } from "../../model/providers.js";
import {
  isConsoleProfileSessionsCredential,
  accountApiAccessToken,
  sessionsApiOrganizationUUID,
  getOAuthRequestHeaders,
} from "../../teleport/api.js";
import { hasProfileScope } from "../../auth.js";
import { getOauthConfig } from "../../../constants/oauth.js";
import { createAdminRequest } from "../../../services/api/adminRequests.js";
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, o } from "../../../../vendor/zod/v4/classic/schemas.js";
import { printableName } from "../../printableName.js";
import { jsonStringify } from "../../slowOperations.js";
import { isEssentialTrafficOnly } from "../../privacyLevel.js";

//@ chunk-s61vbvea.js:463956-464015 fingerprint = checkIsGitClean (1)
async function checkIsGitClean() {
  return await getIsClean({ ignoreUntracked: !0 });
}
/**
 * 拉取远程环境列表（401 抛出，其它错误返回 null）。
 */
//@ chunk-s61vbvea.js:464015-464208 layout
async function fetchRemoteEnvironmentsForEligibility(storageV5, credentials) {
  try {
    return await fetchEnvironments(void 0, storageV5, credentials);
  } catch (error) {
    if (Dt.isAxiosError(error) && error.response?.status === 401) throw error;
    return (logForDebugging(`fetchRemoteEnvironmentsForEligibility failed: ${errorMessage(error)}`), null);
  }
}
/**
 * 目录是否在 git 工作树内（或是已知的仓库根）。
 */
//@ chunk-s61vbvea.js:464208-464389 layout
async function isInGitRepo(cwd) {
  let n = cwd ?? getCwd();
  if (findGitRoot(n) !== null) return !0;
  let { stdout: stdout, code: code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...freeze_6, "rev-parse", "--is-inside-work-tree"],
    { cwd: n },
  );
  return code === 0 && stdout.trim() === "true";
}
/**
 * GitHub App 检查超时 15 秒；剩余时间少于 1 秒时不再请求重新同步。
 */
//@ chunk-s61vbvea.js:464389-464412 layout
var GITHUB_APP_CHECK_TIMEOUT_MS = 15000,
  MIN_RESYNC_BUDGET_MS = 1000;
/**
 * 调 /api/oauth/organizations/{org}/code/repos/{owner}/{repo} 查 GitHub App 是否安装；状态未定时可请求服务端重新同步；非一方 API、无 token、无组织时返回未安装。
 */
//@ chunk-s61vbvea.js:464412-467594 fingerprint = checkGithubAppInstalled (0.615)
async function checkGithubAppInstalled(owner, repo, signal, options) {
  if (!isFirstPartyProvider())
    return (
      logForDebugging(
        "checkGithubAppInstalled: not on the first-party provider, skipping the GitHub app check",
      ),
      {
        appInstalled: !1,
        defaultBranch: null,
        transient: !1,
        linkedAccountAccess: "inconclusive",
        httpStatus: null,
      }
    );
  try {
    let h = isConsoleProfileSessionsCredential(),
      y = await accountApiAccessToken(h);
    if (!y)
      return (
        logForDebugging("checkGithubAppInstalled: No access token found, assuming app not installed"),
        {
          appInstalled: !1,
          defaultBranch: null,
          transient: !1,
          linkedAccountAccess: "inconclusive",
          httpStatus: null,
        }
      );
    let S = await sessionsApiOrganizationUUID(h);
    if (!S) {
      let j = hasProfileScope();
      return (
        logForDebugging(
          j
            ? "checkGithubAppInstalled: No org UUID found (profile fetch null \u2014 possibly transient), assuming app not installed"
            : "checkGithubAppInstalled: No org UUID found (token lacks user:profile scope \u2014 deterministic), assuming app not installed",
        ),
        {
          appInstalled: !1,
          defaultBranch: null,
          transient: j,
          linkedAccountAccess: "inconclusive",
          httpStatus: null,
        }
      );
    }
    let url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${S}/code/repos/${owner}/${repo}`,
      headers = { ...getOAuthRequestHeaders(y), "x-organization-uuid": S };
    logForDebugging(`Checking GitHub app installation for ${owner}/${repo}`);
    let now = Date.now(),
      response = await Dt.get(url, {
        headers: headers,
        timeout: GITHUB_APP_CHECK_TIMEOUT_MS,
        signal: signal,
      });
    if (response.status === 200) {
      let j = response.data.repo?.default_branch || null;
      if (response.data.status) {
        let installed = response.data.status.app_installed;
        return (
          logForDebugging(`GitHub app ${installed ? "is" : "is not"} installed on ${owner}/${repo}`),
          {
            appInstalled: installed,
            defaultBranch: j,
            transient: !1,
            linkedAccountAccess: "ok",
            httpStatus: response.status,
          }
        );
      }
      if (response.data.status === null) {
        let G = GITHUB_APP_CHECK_TIMEOUT_MS - (Date.now() - now);
        if (options?.resyncUndetermined === !1 || G < MIN_RESYNC_BUDGET_MS)
          return (
            logForDebugging(
              `GitHub app status for ${owner}/${repo} is undetermined; not asking the server to resync it`,
            ),
            {
              appInstalled: !1,
              defaultBranch: j,
              transient: !0,
              linkedAccountAccess: "ok",
              httpStatus: response.status,
            }
          );
        return {
          ...(await createAdminRequest({
            orgUUID: S,
            accessToken: y,
            owner: response.data.repo?.owner?.login || owner,
            repo: response.data.repo?.name || repo,
            timeoutMs: G,
            signal: signal,
          })),
          defaultBranch: j,
          linkedAccountAccess: "ok",
          httpStatus: response.status,
        };
      }
      return (
        logForDebugging(
          `checkGithubAppInstalled: 200 without a status field for ${owner}/${repo}; treating the install state as unknown`,
        ),
        {
          appInstalled: !1,
          defaultBranch: j,
          transient: !0,
          linkedAccountAccess: "inconclusive",
          httpStatus: response.status,
        }
      );
    }
    return (
      logForDebugging(`checkGithubAppInstalled: Unexpected response status ${response.status}`),
      {
        appInstalled: !1,
        defaultBranch: null,
        transient: !0,
        linkedAccountAccess: "inconclusive",
        httpStatus: response.status,
      }
    );
  } catch (error) {
    if (Dt.isAxiosError(error)) {
      let status = error.response?.status,
        S = error.response?.headers ?? {},
        w = error.response?.data,
        R = classifyGithubPrecondition(status, error.response?.data),
        x = githubUserFacingError(status, error.response?.data),
        P =
          status === 403 &&
          (S["x-ratelimit-remaining"] === "0" ||
            S["retry-after"] !== void 0 ||
            [w?.error, w?.message].some((j) => typeof j === "string" && /rate limit/i.test(j)));
      if (status && status >= 400 && status < 500 && status !== 408 && status !== 429 && status !== 401 && !P)
        return (
          logForDebugging(
            `checkGithubAppInstalled: Got ${status} error, app likely not installed on ${owner}/${repo} (linked-account access: ${R})`,
          ),
          {
            appInstalled: !1,
            defaultBranch: null,
            transient: !1,
            linkedAccountAccess: R,
            httpStatus: status,
            ...(x && { serverMessage: x }),
          }
        );
      return (
        logForDebugging(
          `checkGithubAppInstalled error: ${errorMessage(error)} (linked-account access: ${R})`,
        ),
        {
          appInstalled: !1,
          defaultBranch: null,
          transient: R !== "github_not_connected",
          linkedAccountAccess: R,
          httpStatus: status ?? null,
          ...(x && { serverMessage: x }),
        }
      );
    }
    return (
      logForDebugging(`checkGithubAppInstalled error: ${errorMessage(error)}`),
      {
        appInstalled: !1,
        defaultBranch: null,
        transient: !0,
        linkedAccountAccess: "inconclusive",
        httpStatus: null,
      }
    );
  }
}
//@ chunk-s61vbvea.js:469320-469567 placement
function GITHUB_PRECONDITION_ERRORS({
  linkedAccountAccess: linkedAccountAccess,
  serverMessage: serverMessage,
  transient: transient,
}) {
  return linkedAccountAccess === "github_not_connected"
    ? { kind: "not_connected" }
    : linkedAccountAccess === "github_repo_not_found"
      ? { kind: "repo_not_found" }
      : serverMessage
        ? { kind: "policy_block", serverMessage: serverMessage }
        : { kind: transient ? "transient" : "other_no" };
}
//@ chunk-s61vbvea.js:469567-469739 placement
var githubErrorResponseSchema = DoctorLazy(() =>
  u({
    error: u({
      message: o()
        .optional()
        .catch(void 0),
      details: u({
        error_code: o().optional(),
        type: o().optional(),
        error_visibility: o()
          .optional()
          .catch(void 0),
      }),
    }),
  }),
);
/**
 * 根据 401/404 响应判断 GitHub 前置条件：需要授权、未安装应用或无法判断。
 */
//@ chunk-s61vbvea.js:469739-470060 placement
function classifyGithubPrecondition(e, n) {
  if (e !== 401 && e !== 404) return "inconclusive";
  let safeParse = githubErrorResponseSchema().safeParse(n),
    s = safeParse.success ? safeParse.data.error.details : void 0;
  if (e === 401 && s?.error_code === "auth_required" && s.type === "github") return "github_not_connected";
  if (e === 404 && s?.error_code === "github_resource_not_found") return "github_repo_not_found";
  return "inconclusive";
}
/**
 * 从 403 响应中提取面向用户的 GitHub 错误信息。
 */
//@ chunk-s61vbvea.js:470060-470421 placement
function githubUserFacingError(e, n) {
  if (e !== 403) return;
  let safeParse = githubErrorResponseSchema().safeParse(n);
  if (!safeParse.success) return;
  let { message: message, details: details } = safeParse.data.error;
  if (!message || details.error_visibility !== "user_facing") return;
  if (
    details.error_code !== "github_ip_allowlist" &&
    details.error_code !== "github_app_suspended" &&
    details.error_code !== "github_saml_sso_required" &&
    details.error_code !== "github_idp_conditional_access"
  )
    return;
  return printableName(message, 300);
}
/**
 * 只返回 GitHub App 是否已安装。
 */
//@ chunk-s61vbvea.js:470421-470485 layout
async function isGithubAppInstalled(owner, repo, signal) {
  return (await checkGithubAppInstalled(owner, repo, signal)).appInstalled;
}
//@ chunk-s61vbvea.js:470485-471223 fingerprint = checkGithubTokenSynced (0.98)
async function checkGithubTokenSynced() {
  try {
    let e = isConsoleProfileSessionsCredential(),
      n = await accountApiAccessToken(e);
    if (!n) return (logForDebugging("checkGithubTokenSynced: No access token found"), !1);
    let r = await sessionsApiOrganizationUUID(e);
    if (!r) return (logForDebugging("checkGithubTokenSynced: No org UUID found"), !1);
    let url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${r}/sync/github/auth`,
      headers = { ...getOAuthRequestHeaders(n), "x-organization-uuid": r };
    logForDebugging("Checking if GitHub token is synced via web-setup");
    let response = await Dt.get(url, { headers: headers, timeout: 15000 }),
      synced = response.status === 200 && response.data?.is_authenticated === !0;
    return (
      logForDebugging(
        `GitHub token synced: ${synced} (status=${response.status}, data=${jsonStringify(response.data)})`,
      ),
      synced
    );
  } catch (error) {
    if (Dt.isAxiosError(error)) {
      let status = error.response?.status;
      if (status && status >= 400 && status < 500)
        return (logForDebugging(`checkGithubTokenSynced: Got ${status}, token not synced`), !1);
    }
    return (logForDebugging(`checkGithubTokenSynced error: ${errorMessage(error)}`), !1);
  }
}
/**
 * 判断仓库的远程访问方式：github-app、token-sync 或 none（附原因）。
 */
//@ chunk-s61vbvea.js:471223-471582 fingerprint = checkRepoForRemoteAccess (0.6)
async function checkRepoForRemoteAccess(owner, repo) {
  let r = await checkGithubAppInstalled(owner, repo);
  if (r.appInstalled) return { hasAccess: !0, method: "github-app" };
  if (r.linkedAccountAccess === "github_not_connected")
    return { hasAccess: !1, method: "none", reason: "github_not_connected" };
  if (!isEssentialTrafficOnly() && (await checkGithubTokenSynced()))
    return { hasAccess: !0, method: "token-sync" };
  return { hasAccess: !1, method: "none", reason: r.transient ? "transient" : "no_access" };
}

export {
  isGithubAppInstalled,
  checkGithubAppInstalled,
  GITHUB_APP_CHECK_TIMEOUT_MS,
  MIN_RESYNC_BUDGET_MS,
  GITHUB_PRECONDITION_ERRORS,
  checkRepoForRemoteAccess,
  fetchRemoteEnvironmentsForEligibility,
  isInGitRepo,
  githubUserFacingError,
  checkIsGitClean,
};
