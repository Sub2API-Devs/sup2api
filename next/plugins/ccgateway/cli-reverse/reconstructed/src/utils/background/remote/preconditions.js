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
import { axios_default } from "../../../../vendor/axios/dist/esm/axios.js";
import { logForDebugging } from "../../debug.js";
import { errorMessage } from "../../errors.js";
import { getCwd } from "../../cwd.js";
import { execFileNoThrowWithCwd } from "../../execFileNoThrow.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../../git/gitSafeEnv.js";
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
import { objectSchema, stringSchema } from "../../../../vendor/zod/v4/classic/schemas.js";
import { printableName } from "../../printableName.js";
import { jsonStringify } from "../../slowOperations.js";
import { isEssentialTrafficOnly } from "../../privacyLevel.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:463956-464015 fingerprint (2.1.88 match: checkIsGitClean, 1)
async function checkIsGitClean() {
  return await getIsClean({
    ignoreUntracked: true,
  });
}
//@ chunk-s61vbvea.js:464015-464208 layout
/**
 * 拉取远程环境列表（401 抛出，其它错误返回 null）。
 */
async function fetchRemoteEnvironmentsForEligibility(storageV5, credentials) {
  try {
    return await fetchEnvironments(undefined, storageV5, credentials);
  } catch (error) {
    if (axios_default.isAxiosError(error) && error.response?.status === 401) throw error;
    logForDebugging(`fetchRemoteEnvironmentsForEligibility failed: ${errorMessage(error)}`);
    return null;
  }
}
//@ chunk-s61vbvea.js:464208-464389 layout
/**
 * 目录是否在 git 工作树内（或是已知的仓库根）。
 */
async function isInGitRepo(cwd) {
  let dir = cwd ?? getCwd();
  if (findGitRoot(dir) !== null) return true;
  let { stdout, code } = await execFileNoThrowWithCwd(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "rev-parse", "--is-inside-work-tree"],
    {
      cwd: dir,
    },
  );
  return code === 0 && stdout.trim() === "true";
}
//@ chunk-s61vbvea.js:464389-464412 layout
/**
 * GitHub App 检查超时 15 秒；剩余时间少于 1 秒时不再请求重新同步。
 */
var GITHUB_APP_CHECK_TIMEOUT_MS = 15000;
var MIN_RESYNC_BUDGET_MS = 1000;
//@ chunk-s61vbvea.js:464412-467594 fingerprint (2.1.88 match: checkGithubAppInstalled, 0.615)
/**
 * 调 /api/oauth/organizations/{org}/code/repos/{owner}/{repo} 查 GitHub App 是否安装；状态未定时可请求服务端重新同步；非一方 API、无 token、无组织时返回未安装。
 */
async function checkGithubAppInstalled(owner, repo, signal, options) {
  if (!isFirstPartyProvider()) {
    logForDebugging(
      "checkGithubAppInstalled: not on the first-party provider, skipping the GitHub app check",
    );
    return {
      appInstalled: false,
      defaultBranch: null,
      transient: false,
      linkedAccountAccess: "inconclusive",
      httpStatus: null,
    };
  }
  try {
    let consoleProfile = isConsoleProfileSessionsCredential();
    let accessToken = await accountApiAccessToken(consoleProfile);
    if (!accessToken) {
      logForDebugging("checkGithubAppInstalled: No access token found, assuming app not installed");
      return {
        appInstalled: false,
        defaultBranch: null,
        transient: false,
        linkedAccountAccess: "inconclusive",
        httpStatus: null,
      };
    }
    let orgUuid = await sessionsApiOrganizationUUID(consoleProfile);
    if (!orgUuid) {
      let hasProfile = hasProfileScope();
      logForDebugging(
        hasProfile
          ? "checkGithubAppInstalled: No org UUID found (profile fetch null \u2014 possibly transient), assuming app not installed"
          : "checkGithubAppInstalled: No org UUID found (token lacks user:profile scope \u2014 deterministic), assuming app not installed",
      );
      return {
        appInstalled: false,
        defaultBranch: null,
        transient: hasProfile,
        linkedAccountAccess: "inconclusive",
        httpStatus: null,
      };
    }
    let url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUuid}/code/repos/${owner}/${repo}`;
    let headers = {
      ...getOAuthRequestHeaders(accessToken),
      "x-organization-uuid": orgUuid,
    };
    logForDebugging(`Checking GitHub app installation for ${owner}/${repo}`);
    let now = Date.now();
    let response = await axios_default.get(url, {
      headers,
      timeout: GITHUB_APP_CHECK_TIMEOUT_MS,
      signal,
    });
    if (response.status === 200) {
      let defaultBranch = response.data.repo?.default_branch || null;
      if (response.data.status) {
        let installed = response.data.status.app_installed;
        logForDebugging(`GitHub app ${installed ? "is" : "is not"} installed on ${owner}/${repo}`);
        return {
          appInstalled: installed,
          defaultBranch,
          transient: false,
          linkedAccountAccess: "ok",
          httpStatus: response.status,
        };
      }
      if (response.data.status === null) {
        let remainingMs = GITHUB_APP_CHECK_TIMEOUT_MS - (Date.now() - now);
        if (options?.resyncUndetermined === false || remainingMs < MIN_RESYNC_BUDGET_MS) {
          logForDebugging(
            `GitHub app status for ${owner}/${repo} is undetermined; not asking the server to resync it`,
          );
          return {
            appInstalled: false,
            defaultBranch,
            transient: true,
            linkedAccountAccess: "ok",
            httpStatus: response.status,
          };
        }
        return {
          ...(await createAdminRequest({
            orgUUID: orgUuid,
            accessToken,
            owner: response.data.repo?.owner?.login || owner,
            repo: response.data.repo?.name || repo,
            timeoutMs: remainingMs,
            signal,
          })),
          defaultBranch,
          linkedAccountAccess: "ok",
          httpStatus: response.status,
        };
      }
      logForDebugging(
        `checkGithubAppInstalled: 200 without a status field for ${owner}/${repo}; treating the install state as unknown`,
      );
      return {
        appInstalled: false,
        defaultBranch,
        transient: true,
        linkedAccountAccess: "inconclusive",
        httpStatus: response.status,
      };
    }
    logForDebugging(`checkGithubAppInstalled: Unexpected response status ${response.status}`);
    return {
      appInstalled: false,
      defaultBranch: null,
      transient: true,
      linkedAccountAccess: "inconclusive",
      httpStatus: response.status,
    };
  } catch (error) {
    if (axios_default.isAxiosError(error)) {
      let status = error.response?.status;
      let headers = error.response?.headers ?? {};
      let data = error.response?.data;
      let linkedAccountAccess = classifyGithubPrecondition(status, error.response?.data);
      let serverMessage = githubUserFacingError(status, error.response?.data);
      let rateLimited =
        status === 403 &&
        (headers["x-ratelimit-remaining"] === "0" ||
          headers["retry-after"] !== undefined ||
          [data?.error, data?.message].some((text) => typeof text === "string" && /rate limit/i.test(text)));
      if (
        status &&
        status >= 400 &&
        status < 500 &&
        status !== 408 &&
        status !== 429 &&
        status !== 401 &&
        !rateLimited
      ) {
        logForDebugging(
          `checkGithubAppInstalled: Got ${status} error, app likely not installed on ${owner}/${repo} (linked-account access: ${linkedAccountAccess})`,
        );
        return {
          appInstalled: false,
          defaultBranch: null,
          transient: false,
          linkedAccountAccess,
          httpStatus: status,
          ...(serverMessage && {
            serverMessage,
          }),
        };
      }
      logForDebugging(
        `checkGithubAppInstalled error: ${errorMessage(error)} (linked-account access: ${linkedAccountAccess})`,
      );
      return {
        appInstalled: false,
        defaultBranch: null,
        transient: linkedAccountAccess !== "github_not_connected",
        linkedAccountAccess,
        httpStatus: status ?? null,
        ...(serverMessage && {
          serverMessage,
        }),
      };
    }
    logForDebugging(`checkGithubAppInstalled error: ${errorMessage(error)}`);
    return {
      appInstalled: false,
      defaultBranch: null,
      transient: true,
      linkedAccountAccess: "inconclusive",
      httpStatus: null,
    };
  }
}
//@ chunk-s61vbvea.js:469320-469567 placement
function GITHUB_PRECONDITION_ERRORS({ linkedAccountAccess, serverMessage, transient }) {
  return linkedAccountAccess === "github_not_connected"
    ? {
        kind: "not_connected",
      }
    : linkedAccountAccess === "github_repo_not_found"
      ? {
          kind: "repo_not_found",
        }
      : serverMessage
        ? {
            kind: "policy_block",
            serverMessage,
          }
        : {
            kind: transient ? "transient" : "other_no",
          };
}
//@ chunk-s61vbvea.js:469567-469739 placement
var githubErrorResponseSchema; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:469567", () => {
  githubErrorResponseSchema = DoctorLazy(() =>
    objectSchema({
      error: objectSchema({
        message: stringSchema().optional().catch(undefined),
        details: objectSchema({
          error_code: stringSchema().optional(),
          type: stringSchema().optional(),
          error_visibility: stringSchema().optional().catch(undefined),
        }),
      }),
    }),
  );
});
//@ chunk-s61vbvea.js:469739-470060 placement
/**
 * 根据 401/404 响应判断 GitHub 前置条件：需要授权、未安装应用或无法判断。
 */
function classifyGithubPrecondition(status, body) {
  if (status !== 401 && status !== 404) return "inconclusive";
  let parseResult = githubErrorResponseSchema().safeParse(body);
  let details = parseResult.success ? parseResult.data.error.details : undefined;
  if (status === 401 && details?.error_code === "auth_required" && details.type === "github")
    return "github_not_connected";
  if (status === 404 && details?.error_code === "github_resource_not_found") return "github_repo_not_found";
  return "inconclusive";
}
//@ chunk-s61vbvea.js:470060-470421 placement
/**
 * 从 403 响应中提取面向用户的 GitHub 错误信息。
 */
function githubUserFacingError(status, body) {
  if (status !== 403) return;
  let parseResult = githubErrorResponseSchema().safeParse(body);
  if (!parseResult.success) return;
  let { message, details } = parseResult.data.error;
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
//@ chunk-s61vbvea.js:470421-470485 layout
/**
 * 只返回 GitHub App 是否已安装。
 */
async function isGithubAppInstalled(owner, repo, signal) {
  return (await checkGithubAppInstalled(owner, repo, signal)).appInstalled;
}
//@ chunk-s61vbvea.js:470485-471223 fingerprint (2.1.88 match: checkGithubTokenSynced, 0.98)
async function checkGithubTokenSynced() {
  try {
    let consoleProfile = isConsoleProfileSessionsCredential();
    let accessToken = await accountApiAccessToken(consoleProfile);
    if (!accessToken) {
      logForDebugging("checkGithubTokenSynced: No access token found");
      return false;
    }
    let orgUUID = await sessionsApiOrganizationUUID(consoleProfile);
    if (!orgUUID) {
      logForDebugging("checkGithubTokenSynced: No org UUID found");
      return false;
    }
    let url = `${getOauthConfig().BASE_API_URL}/api/oauth/organizations/${orgUUID}/sync/github/auth`;
    let headers = {
      ...getOAuthRequestHeaders(accessToken),
      "x-organization-uuid": orgUUID,
    };
    logForDebugging("Checking if GitHub token is synced via web-setup");
    let response = await axios_default.get(url, {
      headers,
      timeout: 15000,
    });
    let synced = response.status === 200 && response.data?.is_authenticated === true;
    logForDebugging(
      `GitHub token synced: ${synced} (status=${response.status}, data=${jsonStringify(response.data)})`,
    );
    return synced;
  } catch (error) {
    if (axios_default.isAxiosError(error)) {
      let status = error.response?.status;
      if (status && status >= 400 && status < 500) {
        logForDebugging(`checkGithubTokenSynced: Got ${status}, token not synced`);
        return false;
      }
    }
    logForDebugging(`checkGithubTokenSynced error: ${errorMessage(error)}`);
    return false;
  }
}
//@ chunk-s61vbvea.js:471223-471582 fingerprint (2.1.88 match: checkRepoForRemoteAccess, 0.6)
/**
 * 判断仓库的远程访问方式：github-app、token-sync 或 none（附原因）。
 */
async function checkRepoForRemoteAccess(owner, repo) {
  let githubApp = await checkGithubAppInstalled(owner, repo);
  if (githubApp.appInstalled)
    return {
      hasAccess: true,
      method: "github-app",
    };
  if (githubApp.linkedAccountAccess === "github_not_connected")
    return {
      hasAccess: false,
      method: "none",
      reason: "github_not_connected",
    };
  if (!isEssentialTrafficOnly() && (await checkGithubTokenSynced()))
    return {
      hasAccess: true,
      method: "token-sync",
    };
  return {
    hasAccess: false,
    method: "none",
    reason: githubApp.transient ? "transient" : "no_access",
  };
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
