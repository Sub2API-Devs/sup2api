/**
 * utils/ghPrStatus.ts
 *
 * 查询当前分支 PR 状态（GitHub REST/GraphQL：PR、reviewDecision、check runs、fork parent），供页脚显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ghPrStatus.ts
 * pieces: chunk-s61vbvea.js (51)
 * attribution: placement 36, layout 13, fingerprint 2
 */
import { join } from "path";
import { readFile } from "fs/promises";
import { bunWhichSync } from "./which.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { HostScoped } from "./hostScoped.js";
import {
  findCanonicalGitRoot,
  findRepoRemoteSlug,
  getIsGit,
  getBranch,
  getDefaultBranch,
  getRemoteUrl,
  normalizeGitRemoteUrl,
  gitExe,
} from "./git.js";
import { getCwd } from "./cwd.js";
import { firstLineOf } from "./stringUtils.js";
import { logForDebugging } from "./debug.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import {
  objectSchema,
  numberSchema,
  stringSchema,
  booleanSchema,
} from "../../vendor/zod/v4/classic/schemas.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";
import { MAX_REPO_URL_CHARS, regExp_2 as regExp_2_2, regExp as regExp_18 } from "./detectRepository.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { getGitHostKind } from "./gitHosts.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { createSignal } from "./signal.js";
import { memoizeWithTTL } from "./memoize.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromNumber, lit, fromEnumArr } from "../services/analytics/safeMetadata.js";
import { getRootSession } from "../bootstrap/state.js";
import { create_15, create, create_3, create_2, create_6, create_26 } from "../../vendor/zod/lib/index.mjs";
import { getGhTokenCached, clearGhTokenCache } from "./github/ghToken.js";
import { isGithubDotCom, sameHost, githubApiBase, githubGraphqlUrl } from "./git/githubUrl.js";
import { claudeCodeUserAgent } from "./http.js";
import { getProxyFetchOptions } from "./proxy.js";
import { sanitizeErrorName, sanitizeErrnoForTelemetry, errorMessage } from "./errors.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { writeFileAtomic } from "./atomicPublishWrite.js";
import { isWorkspacePersistedTrusted } from "./config.js";
import { GIT_SAFE_GLOBAL_ARGS } from "./git/gitSafeEnv.js";
import { externalHttp } from "../services/http/externalHttp.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:550055-550122 placement
var GLAB_TIMEOUT_MS = 2500;
var GLAB_UNAUTHENTICATED_RE = /^\s*\S+ has not been authenticated with glab\s*$/m;
//@ chunk-s61vbvea.js:550122-550362 placement
class GlabProbeState {
  glabOnPath;
  unauthenticatedHosts = new Set();
  okEmitted = false;
  isGlabOnPath() {
    if (this.glabOnPath === undefined) this.glabOnPath = bunWhichSync("glab") !== null;
    return this.glabOnPath;
  }
  emitOkOnce() {
    if (this.okEmitted) return;
    logFeatureOk("gitlab_mr_badge");
    this.okEmitted = true;
  }
}
//@ chunk-s61vbvea.js:550362-550387 placement
var glabProbeRegistry; // deferred: uses GlabProbeState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:550362", () => {
  glabProbeRegistry = new HostScoped(() => new GlabProbeState());
});
//@ chunk-s61vbvea.js:550387-550572 placement
function repoOwnerFromRemote() {
  try {
    let canonicalGitRoot = findCanonicalGitRoot(getCwd());
    if (!canonicalGitRoot) return null;
    let repoRemoteSlug = findRepoRemoteSlug(canonicalGitRoot);
    if (!repoRemoteSlug) return null;
    return firstLineOf(repoRemoteSlug, "/") || null;
  } catch (error) {
    logForDebugging(`glab MR badge repo probe failed: ${error}`, {
      level: "warn",
    });
    return null;
  }
}
//@ chunk-s61vbvea.js:550572-550721 placement
var GitlabMrSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:550572", () => {
  GitlabMrSchema = DoctorLazy(() =>
    objectSchema({
      iid: numberSchema().int().min(1).max(Number.MAX_SAFE_INTEGER),
      state: stringSchema(),
      draft: booleanSchema().optional(),
      detailed_merge_status: stringSchema().optional(),
      web_url: stringSchema(),
    }),
  );
});
//@ chunk-s61vbvea.js:550721-550767 placement
function tryParseJson(stdout) {
  try {
    return jsonParse(stdout);
  } catch {
    return;
  }
}
//@ chunk-s61vbvea.js:550767-550875 placement
function hasErrorObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof value.error === "object" &&
    value.error !== null
  );
}
//@ chunk-s61vbvea.js:550875-550980 placement
function isMrUrlForIid(webUrl, iid) {
  if (webUrl.length > MAX_REPO_URL_CHARS || !regExp_2_2.test(webUrl)) return false;
  return Number(webUrl.slice(webUrl.lastIndexOf("/") + 1)) === iid;
}
//@ chunk-s61vbvea.js:550980-551090 placement
function mrBadgeState(state, isDraft, detailedMergeStatus) {
  if (state !== "opened") return null;
  if (isDraft) return "draft";
  return detailedMergeStatus === "mergeable" ? "approved" : "pending";
}
//@ chunk-s61vbvea.js:551090-551202 placement
function reportGlabFailure(code) {
  logFeatureBad("gitlab_mr_badge", code);
  logForDebugging(`glab MR badge poll failed: ${code}`, {
    level: "warn",
  });
  return "fetch-failed";
}
//@ chunk-s61vbvea.js:551202-552187 placement
/**
 * 用 gh/glab 查询当前分支 PR 状态
 */
async function fetchPrStatus(host) {
  if (isEssentialTrafficOnly()) return null;
  let probe = glabProbeRegistry.of(host);
  if (!probe.isGlabOnPath()) return null;
  let repoHost = repoOwnerFromRemote();
  if (repoHost === null) return null;
  if (getGitHostKind(repoHost) === "github") return null;
  if (probe.unauthenticatedHosts.has(repoHost)) return null;
  let result = await execFileNoThrow("glab", ["mr", "view", "-F", "json"], {
    timeout: GLAB_TIMEOUT_MS,
    preserveOutputOnError: true,
    useCwd: true,
    env: {
      ...process.env,
      GITLAB_TOKEN: undefined,
      GITLAB_ACCESS_TOKEN: undefined,
      OAUTH_TOKEN: undefined,
    },
  });
  if (result.code !== 0) {
    if (GLAB_UNAUTHENTICATED_RE.test(result.stdout) || GLAB_UNAUTHENTICATED_RE.test(result.stderr)) {
      probe.unauthenticatedHosts.add(repoHost);
      return null;
    }
    let parsed = tryParseJson(result.stdout);
    if (parsed === undefined) return reportGlabFailure("glab_unresponsive");
    if (hasErrorObject(parsed)) return null;
    return reportGlabFailure("glab_unresponsive");
  }
  let parsed = tryParseJson(result.stdout);
  if (parsed === undefined) return reportGlabFailure("parse_failed");
  if (hasErrorObject(parsed)) return null;
  let validated = GitlabMrSchema().safeParse(parsed);
  if (!validated.success) return reportGlabFailure("parse_failed");
  let mr = validated.data;
  if (!isMrUrlForIid(mr.web_url, mr.iid)) {
    logFeatureBad("gitlab_mr_badge", "web_url_rejected");
    return null;
  }
  let reviewState = mrBadgeState(mr.state, mr.draft === true, mr.detailed_merge_status);
  if (reviewState === null) return null;
  probe.emitOkOnce();
  return {
    number: mr.iid,
    url: mr.web_url,
    reviewState,
    kind: "mr",
  };
}
//@ chunk-s61vbvea.js:552187-552254 placement
var PR_URL_RE = /^https:\/\/([\w.-]+)\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)\b/;
//@ chunk-s61vbvea.js:552254-552368 placement
/**
 * 解析 PR URL（主机、所有者、仓库、编号）。
 */
function parsePrUrl(text) {
  let match = text.match(PR_URL_RE);
  if (!match) return null;
  return {
    url: text,
    host: match[1],
    owner: match[2],
    repo: match[3],
    num: Number(match[4]),
  };
}
//@ chunk-s61vbvea.js:552368-552381 placement
var RATE_LIMIT_BACKOFF_MS = 60000;
//@ chunk-s61vbvea.js:552381-553785 placement
class PrStatusFetcher {
  #e = createSignal();
  bump = {
    ...this.#e,
    emit: () => {
      this.pollerNotModifiedStreak = 0;
      this.#e.emit();
    },
  };
  pollerDisabled = false;
  pollerBadStreak = 0;
  pollerNotModifiedStreak = 0;
  directState = null;
  lastLoggedGhAuthState = null;
  malformedBatchNodeLogged = false;
  batchReplyOverCapLogged = false;
  baseRepoCache = undefined;
  prStatusByUrl = memoizeWithTTL(fetchPrStatus_2, 30000);
  ghBackoffUntil = 0;
  lastPersistedCacheBody = "";
  directStateForBranch(branch) {
    if (this.directState?.branch !== branch)
      this.directState = {
        branch,
        etag: null,
        pr: null,
        reviewDecision: "",
        lastReviewFetchAt: 0,
        redirectedListUrl: null,
      };
    return this.directState;
  }
  logAuthState(authState) {
    if (authState === this.lastLoggedGhAuthState) return;
    this.lastLoggedGhAuthState = authState;
    logEvent("tengu_gh_pr_status_auth_state", {
      auth_state: fromEnum(authState),
    });
  }
  rememberBaseRepo(baseRepo) {
    this.baseRepoCache = baseRepo;
    return baseRepo;
  }
  backOffUntil(ghBackoffUntil) {
    this.ghBackoffUntil = ghBackoffUntil;
  }
  backOffFromResponse(response) {
    let retryAfterSeconds = Number(response.headers.get("retry-after"));
    let rateLimitResetSeconds = Number(response.headers.get("x-ratelimit-reset"));
    this.ghBackoffUntil =
      Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? Date.now() + retryAfterSeconds * 1000
        : Number.isFinite(rateLimitResetSeconds) && rateLimitResetSeconds > 0
          ? rateLimitResetSeconds * 1000
          : Date.now() + RATE_LIMIT_BACKOFF_MS;
  }
  notePersistedCacheBody(body) {
    if (body === this.lastPersistedCacheBody) return false;
    this.lastPersistedCacheBody = body;
    return true;
  }
  reset() {
    this.pollerDisabled = false;
    this.pollerBadStreak = 0;
    this.pollerNotModifiedStreak = 0;
    this.directState = null;
    this.lastLoggedGhAuthState = null;
    this.malformedBatchNodeLogged = false;
    this.batchReplyOverCapLogged = false;
    this.baseRepoCache = undefined;
    this.ghBackoffUntil = 0;
    this.lastPersistedCacheBody = "";
    this.prStatusByUrl.cache.clear();
  }
}
//@ chunk-s61vbvea.js:553785-553810 placement
var prStatusFetcherRegistry; // deferred: uses PrStatusFetcher of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:553785", () => {
  prStatusFetcherRegistry = new HostScoped(() => new PrStatusFetcher());
});
//@ chunk-s61vbvea.js:553810-553847 placement
/**
 * 取当前宿主的 PR 状态获取器。
 */
function currentPrStatusFetcher() {
  return prStatusFetcherRegistry.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:553847-553977 placement
/**
 * PR 状态不可用时的提示。
 */
function prStatusHint(hint) {
  switch (hint) {
    case "needs-auth":
      return "gh auth login for PR status";
    case "gh-missing":
      return "install gh for PR status";
  }
}
//@ chunk-s61vbvea.js:553977-553989 layout
var GH_REQUEST_TIMEOUT_MS = 5000;
//@ chunk-s61vbvea.js:553989-554142 fingerprint = deriveReviewState (1)
function deriveReviewState(isDraft, reviewDecision) {
  if (isDraft) return "draft";
  switch (reviewDecision) {
    case "APPROVED":
      return "approved";
    case "CHANGES_REQUESTED":
      return "changes_requested";
    default:
      return "pending";
  }
}
//@ chunk-s61vbvea.js:554142-554291 layout
async function getPrStatus(host) {
  if (!(await getIsGit())) return null;
  let [branch, defaultBranch] = await Promise.all([getBranch(), getDefaultBranch()]);
  if (branch === defaultBranch) return null;
  return (await (() => fetchPrStatusForBranch(branch))()) ?? (await fetchPrStatus(host));
}
//@ chunk-s61vbvea.js:554291-554523 layout
var PR_STATUS_CACHE_TTL_MS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PR_STATUS_API_VERSION;
var REDIRECT_STATUS_CODES;
var prSummarySchema;
var prReviewDecisionSchema;
deferInit("chunk-s61vbvea.js:554291", () => {
  PR_STATUS_CACHE_TTL_MS = 300000;
  PR_STATUS_API_VERSION = "2022-11-28";
  REDIRECT_STATUS_CODES = new Set([301, 302, 307, 308]);
  prSummarySchema = DoctorLazy(() =>
    create_15(
      create({
        number: create_3(),
        html_url: create_2(),
        draft: create_6(),
      }),
    ),
  );
  prReviewDecisionSchema = DoctorLazy(() =>
    create({
      data: create({
        repository: create({
          pullRequest: create({
            reviewDecision: create_2().nullable(),
          }).nullable(),
        }).nullable(),
      }),
    }),
  );
});
//@ chunk-s61vbvea.js:554523-557132 layout
/**
 * 查询当前分支对应 PR 的状态（GitHub REST + GraphQL reviewDecision、check runs），用于页脚 PR 状态；主分支或仅必要流量时不查。
 */
async function fetchPrStatusForBranch(branch) {
  let lastReviewFetchAt = Date.now();
  if (isEssentialTrafficOnly() || isGhApiBackedOff()) return null;
  if (branch === "main" || branch === "master") return null;
  let originRepo = await getOriginRepo();
  if (!originRepo) return null;
  let ghToken = await getGhTokenCached(originRepo.host);
  if (ghToken.kind !== "token") {
    if (!isGithubDotCom(originRepo.host) && !sameHost(process.env.GH_HOST, originRepo.host)) return null;
    currentPrStatusFetcher().logAuthState(ghToken.kind === "gh-missing" ? "gh_missing" : "needs_auth");
    clearGhTokenCache(originRepo.host);
    return ghToken.kind === "gh-missing" ? "gh-missing" : "needs-auth";
  }
  currentPrStatusFetcher().logAuthState("token_present");
  let token = ghToken.token;
  let baseRepo = await resolveBaseRepo(originRepo, token);
  let directState = currentPrStatusFetcher().directStateForBranch(branch);
  let previousPr = directState.pr && {
    ...directState.pr,
    reviewDecision: directState.reviewDecision,
  };
  let apiBase = githubApiBase(originRepo.host);
  let origin = new URL(apiBase).origin;
  let listUrl = `${apiBase}/repos/${baseRepo.owner}/${baseRepo.repo}/pulls?head=${encodeURIComponent(originRepo.owner)}:${encodeURIComponent(branch)}&state=open&per_page=1`;
  let gotFreshList = false;
  let httpStatus;
  try {
    let signal = AbortSignal.timeout(GH_REQUEST_TIMEOUT_MS);
    let headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": PR_STATUS_API_VERSION,
      "User-Agent": claudeCodeUserAgent(),
      ...(directState.etag && {
        "If-None-Match": directState.etag,
      }),
    };
    let fetchWithHeaders = (href) =>
      fetch(href, {
        ...getProxyFetchOptions({
          url: href,
        }),
        keepalive: false,
        method: "GET",
        headers,
        redirect: "manual",
        signal,
      });
    let response = await fetchWithHeaders(directState.redirectedListUrl ?? listUrl);
    let redirectLocation = REDIRECT_STATUS_CODES.has(response.status)
      ? response.headers.get("location")
      : null;
    let redirectUrl = redirectLocation ? new URL(redirectLocation, listUrl) : null;
    if (redirectUrl?.origin === origin) {
      directState.redirectedListUrl = redirectUrl.href;
      response = await fetchWithHeaders(redirectUrl.href);
    }
    httpStatus = response.status;
    if (response.status === 304);
    else if (response.ok) {
      directState.etag = response.headers.get("etag");
      gotFreshList = true;
      let parsedList = prSummarySchema().safeParse(await response.json());
      let summary = parsedList.success ? parsedList.data[0] : undefined;
      if (summary && directState.pr?.number !== summary.number) directState.reviewDecision = "";
      directState.pr = summary
        ? {
            number: summary.number,
            url: summary.html_url,
            isDraft: summary.draft,
          }
        : null;
    } else {
      if (response.status === 401) clearGhTokenCache(originRepo.host);
      else if (response.status === 403 || response.status === 429)
        currentPrStatusFetcher().backOffFromResponse(response);
      logFeatureBad(
        "github_pr_status_direct",
        response.status === 401
          ? "unauthorized"
          : response.status === 403 || response.status === 429
            ? "rate_limited"
            : "http_error",
        {
          http_status: fromNumber(response.status),
        },
      );
      logForDebugging(`[ghPrStatus] REST list ${response.status} on ${originRepo.host}`, {
        level: "debug",
      });
      return "fetch-failed";
    }
  } catch (error) {
    logFeatureBad("github_pr_status_direct", "fetch_threw", {
      error_name: sanitizeErrorName(error) ?? lit("unknown"),
      errno_code: sanitizeErrnoForTelemetry(error) ?? sanitizeErrnoForTelemetry(error?.cause) ?? lit(""),
    });
    return "fetch-failed";
  }
  let pr = directState.pr;
  if (!pr) {
    logFeatureOk("github_pr_status_direct", {
      http_status: fromNumber(httpStatus),
      pr_found: false,
      review_fetched: false,
    });
    return null;
  }
  let reviewDecision = directState.reviewDecision;
  let reviewUnavailable = false;
  let shouldFetchReview =
    gotFreshList || Date.now() - directState.lastReviewFetchAt >= PR_STATUS_CACHE_TTL_MS;
  if (shouldFetchReview) {
    let prReviewDecision = await fetchPrReviewDecision(
      {
        host: originRepo.host,
        owner: baseRepo.owner,
        repo: baseRepo.repo,
      },
      token,
      pr.number,
    );
    if (prReviewDecision !== null) {
      reviewDecision = prReviewDecision;
      if (directState.pr?.number === pr.number) {
        directState.reviewDecision = prReviewDecision;
        directState.lastReviewFetchAt = lastReviewFetchAt;
      }
    } else reviewUnavailable = true;
  }
  let telemetryFields = {
    http_status: fromNumber(httpStatus),
    pr_found: true,
    review_fetched: shouldFetchReview,
  };
  if (reviewUnavailable)
    logFeatureSad("github_pr_status_direct", "review_decision_unavailable", telemetryFields);
  else logFeatureOk("github_pr_status_direct", telemetryFields);
  let unchanged =
    !reviewUnavailable &&
    previousPr?.number === pr.number &&
    previousPr.url === pr.url &&
    previousPr.isDraft === pr.isDraft &&
    previousPr.reviewDecision === reviewDecision;
  return {
    number: pr.number,
    url: pr.url,
    reviewState: deriveReviewState(pr.isDraft, reviewDecision),
    ...(unchanged && {
      notModified: true,
    }),
  };
}
//@ chunk-s61vbvea.js:557132-557701 layout
async function fetchPrReviewDecision(repoRef, token, number) {
  let graphqlUrl = githubGraphqlUrl(repoRef.host);
  let body = jsonStringify({
    query:
      "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewDecision}}}",
    variables: {
      o: repoRef.owner,
      r: repoRef.repo,
      n: number,
    },
  });
  try {
    let response = await fetch(graphqlUrl, {
      ...getProxyFetchOptions({
        url: graphqlUrl,
      }),
      keepalive: false,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": claudeCodeUserAgent(),
      },
      body,
      redirect: "error",
      signal: AbortSignal.timeout(GH_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    let parsed = prReviewDecisionSchema().safeParse(await response.json());
    return parsed.success ? (parsed.data.data.repository?.pullRequest?.reviewDecision ?? "") : null;
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:557701-557759 layout
async function getOriginRepo() {
  let remoteUrl = await getRemoteUrl();
  return remoteUrl ? parseGitHubRemote(remoteUrl) : null;
}
//@ chunk-s61vbvea.js:557759-557962 layout
/**
 * 把 git remote URL 解析为 {host, owner, repo}（拒绝 IP 主机）。
 */
function parseGitHubRemote(remoteUrl) {
  let normalized = normalizeGitRemoteUrl(remoteUrl);
  if (!normalized) return null;
  let parts = normalized.split("/");
  if (parts.length < 3) return null;
  let host = parts[0];
  if (/^[\d.]+$/.test(host) || /^\[?[0-9a-f:]+\]?$/i.test(host)) return null;
  return {
    host,
    owner: parts[1],
    repo: parts[2],
  };
}
//@ chunk-s61vbvea.js:557962-558038 layout
var prForkParentSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:557962", () => {
  prForkParentSchema = DoctorLazy(() =>
    create({
      parent: create({
        name: create_2(),
        owner: create({
          login: create_2(),
        }),
      }).nullish(),
    }),
  );
});
//@ chunk-s61vbvea.js:558038-558372 layout
async function resolveBaseRepo(originRepo, token) {
  let originKey = `${originRepo.host}/${originRepo.owner}/${originRepo.repo}`;
  let baseRepoCache = currentPrStatusFetcher().baseRepoCache;
  if (baseRepoCache?.forOrigin === originKey) return baseRepoCache;
  let remoteUrl = await getUpstreamRemoteUrl();
  let upstreamRepo = remoteUrl ? parseGitHubRemote(remoteUrl) : null;
  if (upstreamRepo && upstreamRepo.host === originRepo.host)
    return currentPrStatusFetcher().rememberBaseRepo({
      forOrigin: originKey,
      owner: upstreamRepo.owner,
      repo: upstreamRepo.repo,
    });
  let repoParent = await fetchRepoParent(originRepo, token);
  return currentPrStatusFetcher().rememberBaseRepo({
    forOrigin: originKey,
    ...(repoParent ?? {
      owner: originRepo.owner,
      repo: originRepo.repo,
    }),
  });
}
//@ chunk-s61vbvea.js:558372-558547 layout
async function getUpstreamRemoteUrl() {
  let { stdout, code } = await execFileNoThrow("git", ["config", "--get", "remote.upstream.url"], {
    timeout: 2000,
    preserveOutputOnError: false,
  });
  return code === 0 && stdout.trim() ? stdout.trim() : null;
}
//@ chunk-s61vbvea.js:558547-558998 layout
async function fetchRepoParent(originRepo, token) {
  let repoUrl = `${githubApiBase(originRepo.host)}/repos/${originRepo.owner}/${originRepo.repo}`;
  try {
    let response = await fetch(repoUrl, {
      ...getProxyFetchOptions({
        url: repoUrl,
      }),
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": PR_STATUS_API_VERSION,
        "User-Agent": claudeCodeUserAgent(),
      },
      redirect: "error",
      signal: AbortSignal.timeout(GH_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    let parsed = prForkParentSchema().safeParse(await response.json());
    let parent = parsed.success ? parsed.data.parent : null;
    return parent
      ? {
          owner: parent.owner.login,
          repo: parent.name,
        }
      : null;
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:558998-559267 layout
function getPrStatusColor(prStatus) {
  switch (prStatus.state) {
    case "MERGED":
      return "merged";
    case "CLOSED":
    case "DRAFT":
      return "inactive";
    case "OPEN": {
      if (prStatus.checks.failed > 0 || prStatus.review === "CHANGES_REQUESTED") return "error";
      if (prStatus.checks.pending === 0 && prStatus.review !== "REVIEW_REQUIRED") return "success";
      return "warning";
    }
  }
}
//@ chunk-s61vbvea.js:559267-559611 layout
function summarizeCheckRuns(statusCheckRollup) {
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  for (let check of statusCheckRollup ?? []) {
    let upper = (check.conclusion ?? check.state)?.toUpperCase();
    if (upper === "SUCCESS" || upper === "NEUTRAL" || upper === "SKIPPED") passedCount++;
    else if (upper === "FAILURE" || upper === "ERROR") failedCount++;
    else if (
      upper == null ||
      upper === "ACTION_REQUIRED" ||
      upper === "PENDING" ||
      upper === "EXPECTED" ||
      check.status?.toUpperCase() !== "COMPLETED"
    )
      pendingCount++;
    else failedCount++;
  }
  return {
    passed: passedCount,
    failed: failedCount,
    pending: pendingCount,
  };
}
//@ chunk-s61vbvea.js:559611-560217 fingerprint = fetchPrStatus (0.483)
async function fetchPrStatus_2(prUrl) {
  let { stdout, code } = await execFileNoThrow(
    "gh",
    [
      "pr",
      "view",
      prUrl,
      "--json",
      "number,title,state,isDraft,statusCheckRollup,reviewDecision,additions,deletions",
    ],
    {
      timeout: GH_REQUEST_TIMEOUT_MS,
      preserveOutputOnError: false,
    },
  );
  if (code !== 0 || !stdout.trim()) return null;
  try {
    let data = jsonParse(stdout);
    return {
      number: data.number,
      title: data.title,
      state:
        data.state === "MERGED"
          ? "MERGED"
          : data.state === "CLOSED"
            ? "CLOSED"
            : data.isDraft
              ? "DRAFT"
              : "OPEN",
      checks: summarizeCheckRuns(data.statusCheckRollup),
      review:
        data.reviewDecision === "APPROVED" ||
        data.reviewDecision === "CHANGES_REQUESTED" ||
        data.reviewDecision === "REVIEW_REQUIRED"
          ? data.reviewDecision
          : null,
      additions: data.additions,
      deletions: data.deletions,
    };
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:560217-560321 placement
/**
 * 按 URL 查 PR 状态（仅必要流量时不查）。
 */
function fetchPrStatusByUrl(prUrl) {
  if (isEssentialTrafficOnly() || isGhApiBackedOff()) return Promise.resolve(null);
  return currentPrStatusFetcher()
    .prStatusByUrl(prUrl)
    .catch(() => null);
}
//@ chunk-s61vbvea.js:560321-560535 placement
function expandPrUrlTemplate(template, pattern) {
  if (!pattern) return template;
  let prUrl = parsePrUrl(template);
  if (!prUrl) return template;
  return pattern
    .replaceAll("{host}", prUrl.host)
    .replaceAll("{owner}", prUrl.owner)
    .replaceAll("{repo}", prUrl.repo)
    .replaceAll("{number}", String(prUrl.num))
    .replaceAll("{url}", template);
}
//@ chunk-s61vbvea.js:560535-560582 placement
/**
 * 有模板时把 PR URL 中的占位符展开，否则原样返回。
 */
function expandPrUrlIfTemplate(template, pattern) {
  if (pattern) return expandPrUrlTemplate(template, pattern);
  return template;
}
//@ chunk-s61vbvea.js:560582-561144 placement
/**
 * GraphQL PR 响应 schema 与字段列表。
 */
var GraphqlPrSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var PR_GRAPHQL_FIELDS;
deferInit("chunk-s61vbvea.js:560582", () => {
  GraphqlPrSchema = DoctorLazy(() => {
    let stateCountsSchema = create_15(
      create({
        state: create_2(),
        count: create_3(),
      }),
    ).nullable();
    let rollupSchema = create({
      contexts: create({
        checkRunCountsByState: stateCountsSchema,
        statusContextCountsByState: stateCountsSchema,
      }).nullable(),
    });
    let commitNodeSchema = create({
      commit: create({
        statusCheckRollup: rollupSchema.nullable(),
      }),
    });
    return create({
      number: create_3(),
      title: create_2(),
      state: create_2(),
      isDraft: create_6(),
      reviewDecision: create_2().nullable(),
      additions: create_3(),
      deletions: create_3(),
      commits: create({
        nodes: create_15(commitNodeSchema.nullable()),
      }),
    });
  });
  PR_GRAPHQL_FIELDS = [
    "number",
    "title",
    "state",
    "isDraft",
    "reviewDecision",
    "additions",
    "deletions",
    "commits",
    "nodes",
    "commit",
    "statusCheckRollup",
    "contexts",
    "checkRunCountsByState",
    "statusContextCountsByState",
    "count",
  ];
});
//@ chunk-s61vbvea.js:561144-561655 placement
function summarizeChecks(checkRunCountsByState, statusContextCountsByState) {
  let passedCount = 0;
  let failedCount = 0;
  let pendingCount = 0;
  for (let { state, count } of checkRunCountsByState ?? [])
    switch (state) {
      case "SUCCESS":
      case "NEUTRAL":
      case "SKIPPED":
        passedCount += count;
        break;
      case "FAILURE":
      case "CANCELLED":
      case "TIMED_OUT":
      case "STALE":
      case "STARTUP_FAILURE":
        failedCount += count;
        break;
      case "ACTION_REQUIRED":
      case "IN_PROGRESS":
      case "QUEUED":
      case "PENDING":
      case "WAITING":
      case "REQUESTED":
      case "COMPLETED":
        pendingCount += count;
        break;
      default:
        failedCount += count;
    }
  for (let { state, count } of statusContextCountsByState ?? [])
    switch (state) {
      case "SUCCESS":
        passedCount += count;
        break;
      case "FAILURE":
      case "ERROR":
        failedCount += count;
        break;
      default:
        pendingCount += count;
    }
  return {
    passed: passedCount,
    failed: failedCount,
    pending: pendingCount,
  };
}
//@ chunk-s61vbvea.js:561655-562119 placement
function prStateLabel(node) {
  let statusCheckRollup = node.commits.nodes[0]?.commit.statusCheckRollup ?? null;
  return {
    number: node.number,
    title: node.title,
    state:
      node.state === "MERGED"
        ? "MERGED"
        : node.state === "CLOSED"
          ? "CLOSED"
          : node.isDraft
            ? "DRAFT"
            : "OPEN",
    checks: summarizeChecks(
      statusCheckRollup?.contexts?.checkRunCountsByState,
      statusCheckRollup?.contexts?.statusContextCountsByState,
    ),
    review:
      node.reviewDecision === "APPROVED" ||
      node.reviewDecision === "CHANGES_REQUESTED" ||
      node.reviewDecision === "REVIEW_REQUIRED"
        ? node.reviewDecision
        : null,
    additions: node.additions,
    deletions: node.deletions,
  };
}
//@ chunk-s61vbvea.js:562119-562186 placement = cost (0.391)
function cost(repositoryNode) {
  return repositoryNode !== null && typeof repositoryNode === "object" && !("cost" in repositoryNode);
}
//@ chunk-s61vbvea.js:562186-562297 placement
function groupByKey(items, keyOf) {
  let groups = new Map();
  for (let item of items) {
    let groupKey = keyOf(item);
    let group = groups.get(groupKey);
    if (group) group.push(item);
    else groups.set(groupKey, [item]);
  }
  return groups;
}
//@ chunk-s61vbvea.js:562297-562642 placement
/**
 * PR GraphQL 片段与批量查询参数。
 */
var PR_GRAPHQL_FRAGMENT = `fragment pr on PullRequest {
  number title state isDraft additions deletions
  reviewDecision
  commits(last:1){nodes{commit{statusCheckRollup{
    state
    contexts(first:0){
      checkRunCountsByState{state count}
      statusContextCountsByState{state count}
    }
  }}}}
}`;
var GRAPHQL_BATCH_SIZE = 20;
var GRAPHQL_CONCURRENCY = 6;
var GRAPHQL_TIMEOUT_MS = 15000;
var MAX_RESPONSE_BYTES = 200000;
var RATE_LIMIT_BACKOFF = "30s";
var RATE_LIMIT_RE = /rate limit/i;
//@ chunk-s61vbvea.js:562642-562694 placement
function isGhApiBackedOff() {
  return Date.now() < currentPrStatusFetcher().ghBackoffUntil;
}
//@ chunk-s61vbvea.js:562694-565418 placement
async function buildPrStatusQuery(prUrls) {
  let statuses = new Map();
  let unbatched = [];
  let lowestRateLimit = null;
  if (prUrls.length === 0 || isEssentialTrafficOnly() || isGhApiBackedOff()) {
    for (let prUrl of prUrls) statuses.set(prUrl, null);
    return {
      statuses,
      rateLimit: lowestRateLimit,
      unbatched: [],
    };
  }
  let parsedUrls = [];
  for (let prUrl of prUrls) {
    let prUrl_2 = parsePrUrl(prUrl);
    if (prUrl_2) parsedUrls.push(prUrl_2);
    else if (/\/pull\/\d+/.test(prUrl)) unbatched.push(prUrl);
  }
  parsedUrls.sort((leftUrl, rightUrl) => leftUrl.url.localeCompare(rightUrl.url));
  let batches = [];
  for (let [host, hostPrs] of groupByKey(parsedUrls, (prUrl) => prUrl.host))
    for (let offset = 0; offset < hostPrs.length; offset += GRAPHQL_BATCH_SIZE)
      batches.push({
        host,
        chunk: hostPrs.slice(offset, offset + GRAPHQL_BATCH_SIZE),
      });
  let runBatch = limitConcurrency(GRAPHQL_CONCURRENCY, async ({ host, chunk }) => {
    if (isGhApiBackedOff()) {
      for (let prUrl of chunk) statuses.set(prUrl.url, null);
      return;
    }
    let aliasToUrl = new Map();
    let mapped = [...groupByKey(chunk, (prUrl) => `${prUrl.owner}/${prUrl.repo}`)].map(
      ([repoKey, repoPrs], repoIndex) => {
        let [owner, repoName] = repoKey.split("/");
        let joined = repoPrs
          .map((prUrl, prIndex) => {
            let alias = `p${repoIndex}_${prIndex}`;
            aliasToUrl.set(alias, prUrl.url);
            return `${alias}: pullRequest(number: ${prUrl.num}) { ...pr }`;
          })
          .join(" ");
        return `r${repoIndex}: repository(owner:"${owner}", name:"${repoName}") { ${joined} }`;
      },
    );
    let input = `${PR_GRAPHQL_FRAGMENT}
query { rateLimit{cost remaining resetAt} ${mapped.join(" ")} }`;
    let { stdout, stderr, code, maxBufferExceeded } = await execFileNoThrow(
      "gh",
      ["api", "graphql", "--hostname", host, "--cache", RATE_LIMIT_BACKOFF, "-F", "query=@-"],
      {
        timeout: GRAPHQL_TIMEOUT_MS,
        input,
        preserveOutputOnError: true,
        maxBuffer: MAX_RESPONSE_BYTES,
      },
    );
    let reply = null;
    if (stdout.trim())
      try {
        reply = jsonParse(stdout);
      } catch {
        reply = null;
      }
    if (!reply?.data) {
      if (maxBufferExceeded) {
        logForDebugging(
          `[ghPrStatus] batch reply from ${host} is over the cap of ${MAX_RESPONSE_BYTES} characters; keeping last-known`,
        );
        if (!currentPrStatusFetcher().batchReplyOverCapLogged) {
          currentPrStatusFetcher().batchReplyOverCapLogged = true;
          logFeatureSad("github_pr_status_batch", "reply_over_cap", {
            github_dot_com: isGithubDotCom(host),
          });
        }
      } else if (RATE_LIMIT_RE.test(stderr) || RATE_LIMIT_RE.test(stdout)) {
        currentPrStatusFetcher().backOffUntil(Date.now() + RATE_LIMIT_BACKOFF_MS);
        logForDebugging(`[ghPrStatus] GitHub rate-limited on ${host}; backing off 60s`, {
          level: "warn",
        });
      } else logForDebugging(`[ghPrStatus] batch query failed on ${host} (exit ${code}); keeping last-known`);
      for (let prUrl of chunk) statuses.set(prUrl.url, null);
      return;
    }
    let rateLimit = reply.data.rateLimit;
    if (rateLimit) {
      if (!lowestRateLimit || rateLimit.remaining < lowestRateLimit.remaining) lowestRateLimit = rateLimit;
      if (rateLimit.remaining < 50)
        currentPrStatusFetcher().backOffUntil(
          Date.parse(rateLimit.resetAt) || Date.now() + RATE_LIMIT_BACKOFF_MS,
        );
    }
    for (let [key, value] of Object.entries(reply.data)) {
      if (!key.startsWith("r") || !cost(value)) continue;
      for (let [key, value_2] of Object.entries(value)) {
        let prUrl = aliasToUrl.get(key);
        if (!prUrl) continue;
        let parsedPr = GraphqlPrSchema().safeParse(value_2);
        if (!parsedPr.success && value_2 !== null) {
          let { issues } = parsedPr.error;
          let mapped = issues.slice(0, 8).map((issue) => issue.path.join(".") || "the node itself");
          let graphqlErrorCount = Array.isArray(reply.errors) ? reply.errors.length : 0;
          logForDebugging(
            `[ghPrStatus] a PR in the batch reply from ${host} has an unexpected shape (gh exit ${code}; GraphQL errors: ${graphqlErrorCount}; bad or missing: ${mapped.join(", ")}); keeping its last-known status`,
          );
          if (!currentPrStatusFetcher().malformedBatchNodeLogged) {
            currentPrStatusFetcher().malformedBatchNodeLogged = true;
            let badFieldSet = new Set(
              issues.map((issue) => issue.path.findLast((segment) => typeof segment === "string")),
            );
            logFeatureSad("github_pr_status_batch", "malformed_node", {
              gh_exit_nonzero: code !== 0,
              graphql_errors: graphqlErrorCount,
              github_dot_com: isGithubDotCom(host),
              bad_fields: fromEnumArr(PR_GRAPHQL_FIELDS.filter((fieldName) => badFieldSet.has(fieldName))),
            });
          }
        }
        statuses.set(prUrl, parsedPr.success ? prStateLabel(parsedPr.data) : null);
      }
    }
    for (let prUrl of aliasToUrl.values()) if (!statuses.has(prUrl)) statuses.set(prUrl, null);
  });
  await Promise.all(batches.map(runBatch));
  return {
    statuses,
    rateLimit: lowestRateLimit,
    unbatched,
  };
}
//@ chunk-s61vbvea.js:565418-565498 placement
var prStatusCachePath; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PR_STATUS_CACHE_STORAGE;
deferInit("chunk-s61vbvea.js:565418", () => {
  prStatusCachePath = () => join(getClaudeConfigDir(), "gh-pr-status-cache.json");
  PR_STATUS_CACHE_STORAGE = STORAGE_SPACES.state("gh-pr-status-cache");
});
//@ chunk-s61vbvea.js:565498-565868 placement
function persistPrStatusCache(statuses, storageV5) {
  let payload = {};
  for (let [prUrl, prStatus] of statuses) if (prStatus) payload[prUrl] = prStatus;
  let body = jsonStringify(payload);
  if (body === "{}" || !currentPrStatusFetcher().notePersistedCacheBody(body)) return Promise.resolve();
  if (isStorageV5Enabled() && storageV5)
    return Promise.resolve()
      .then(() =>
        storageV5.write(PR_STATUS_CACHE_STORAGE, body, {
          mode: 438 & ~process.umask(),
        }),
      )
      .then((writeResult) => {
        if (!writeResult.ok) logForDebugging(`persistPrStatusCache: ${writeResult.error.code}`);
      })
      .catch((error) => {
        logForDebugging(`persistPrStatusCache: ${errorMessage(error)}`);
      });
  return writeFileAtomic(prStatusCachePath(), body).catch(() => {});
}
//@ chunk-s61vbvea.js:565868-566109 placement
var CachedPrStatusSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:565868", () => {
  CachedPrStatusSchema = DoctorLazy(() =>
    create({
      number: create_3(),
      title: create_2(),
      state: create_26(["OPEN", "MERGED", "CLOSED", "DRAFT"]),
      checks: create({
        passed: create_3(),
        failed: create_3(),
        pending: create_3(),
      }),
      review: create_26(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED"]).nullable(),
      additions: create_3(),
      deletions: create_3(),
    }),
  );
});
//@ chunk-s61vbvea.js:566109-566408 placement
function parsePrStatusCache(text) {
  let statuses = new Map();
  let parsed;
  try {
    parsed = jsonParse(text);
  } catch {
    return statuses;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return statuses;
  let droppedCount = 0;
  for (let [key, value] of Object.entries(parsed)) {
    let parsedEntry = CachedPrStatusSchema().safeParse(value);
    if (parsedEntry.success) statuses.set(key, parsedEntry.data);
    else droppedCount++;
  }
  if (droppedCount > 0) logForDebugging(`loadPrStatusCache: dropped ${droppedCount} malformed cache entries`);
  return statuses;
}
//@ chunk-s61vbvea.js:566408-566825 placement
async function loadPrStatusCache(storageV5) {
  if (storageV5) {
    let readResult;
    try {
      readResult = await storageV5.read([PR_STATUS_CACHE_STORAGE]);
    } catch (error) {
      logForDebugging(`loadPrStatusCache: ${errorMessage(error)}`);
      return new Map();
    }
    if (!readResult.ok) {
      logForDebugging(`loadPrStatusCache: ${readResult.error.code}`);
      return new Map();
    }
    let item = readResult.value.items[0];
    if (!item?.found) return new Map();
    let text;
    try {
      text = Buffer.from(item.value).toString("utf-8");
    } catch (error) {
      logForDebugging(`loadPrStatusCache: ${errorMessage(error)}`);
      return new Map();
    }
    return parsePrStatusCache(text);
  }
  try {
    let text = await readFile(prStatusCachePath(), "utf8");
    return parsePrStatusCache(text);
  } catch {
    return new Map();
  }
}
//@ chunk-s61vbvea.js:566825-566918 placement
var GERRIT_HOST_RE = /^([a-z0-9-]+)\.googlesource\.com\//;
var GERRIT_CHANGE_ID_RE = /^Change-Id:\s*(I[0-9a-f]{40})\s*$/gm;
var GERRIT_QUERY_TIMEOUT_MS = 4000;
//@ chunk-s61vbvea.js:566918-567893 placement
async function findGerritReview() {
  if (isEssentialTrafficOnly() || !isWorkspacePersistedTrusted(getCwd())) return null;
  let canonicalGitRoot = findCanonicalGitRoot(getCwd());
  let remoteSlug = canonicalGitRoot ? findRepoRemoteSlug(canonicalGitRoot) : null;
  let hostMatch = remoteSlug ? GERRIT_HOST_RE.exec(remoteSlug) : null;
  let hostPrefix = hostMatch?.[1];
  let projectPath = hostMatch ? remoteSlug.slice(hostMatch[0].length).replace(/^a\//, "") : undefined;
  if (!hostPrefix || !projectPath || hostPrefix.endsWith("-review")) return null;
  let { stdout, code } = await execFileNoThrow(
    gitExe(),
    [...GIT_SAFE_GLOBAL_ARGS, "log", "-1", "--format=%B"],
    {
      timeout: GERRIT_QUERY_TIMEOUT_MS,
      maxBuffer: 65536,
      preserveOutputOnError: false,
      useCwd: true,
    },
  );
  let changeId = code === 0 ? [...stdout.matchAll(GERRIT_CHANGE_ID_RE)].at(-1)?.[1] : undefined;
  if (!changeId) return null;
  let reviewHost = `${hostPrefix}-review.googlesource.com`;
  let changes;
  try {
    let response = await externalHttp.get(
      `https://${reviewHost}/changes/?q=change:${changeId}+status:open&n=5`,
      {
        timeout: GERRIT_QUERY_TIMEOUT_MS,
        responseType: "text",
        maxRedirects: 0,
        withCredentials: false,
        transformResponse: (rawResponse) => rawResponse,
      },
    );
    let bodyText = typeof response.data === "string" ? response.data : "";
    changes = jsonParse(bodyText.startsWith(")]}'") ? bodyText.slice(4) : bodyText);
  } catch {
    return null;
  }
  let change = Array.isArray(changes)
    ? changes.find(
        (entry) => typeof entry?.project === "string" && entry.project.toLowerCase() === projectPath,
      )
    : undefined;
  if (!change || typeof change._number !== "number") return null;
  let changeUrl = `https://${reviewHost}/c/${change.project}/+/${change._number}`;
  return regExp_18.test(changeUrl)
    ? {
        url: changeUrl,
        project: change.project,
        number: change._number,
      }
    : null;
}
export {
  expandPrUrlIfTemplate,
  currentPrStatusFetcher,
  prStatusHint,
  getPrStatus,
  getPrStatusColor,
  buildPrStatusQuery,
  fetchPrStatusByUrl,
  loadPrStatusCache,
  persistPrStatusCache,
  findGerritReview,
  parsePrUrl,
};
