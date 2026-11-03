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
import { u, E, string, M } from "../../vendor/zod/v4/classic/schemas.js";
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
var glabProbeRegistry = new HostScoped(() => new GlabProbeState());
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
var GitlabMrSchema = DoctorLazy(() =>
  u({
    iid: E().int().min(1).max(Number.MAX_SAFE_INTEGER),
    state: string(),
    draft: M().optional(),
    detailed_merge_status: string().optional(),
    web_url: string(),
  }),
);
//@ chunk-s61vbvea.js:550721-550767 placement
function tryParseJson(stdout) {
  try {
    return jsonParse(stdout);
  } catch {
    return;
  }
}
//@ chunk-s61vbvea.js:550767-550875 placement
function hasErrorObject(e) {
  return (
    typeof e === "object" && e !== null && "error" in e && typeof e.error === "object" && e.error !== null
  );
}
//@ chunk-s61vbvea.js:550875-550980 placement
function isMrUrlForIid(webUrl, n) {
  if (webUrl.length > MAX_REPO_URL_CHARS || !regExp_2_2.test(webUrl)) return false;
  return Number(webUrl.slice(webUrl.lastIndexOf("/") + 1)) === n;
}
//@ chunk-s61vbvea.js:550980-551090 placement
function mrBadgeState(state, n, detailedMergeStatus) {
  if (state !== "opened") return null;
  if (n) return "draft";
  return detailedMergeStatus === "mergeable" ? "approved" : "pending";
}
//@ chunk-s61vbvea.js:551090-551202 placement
function reportGlabFailure(e) {
  logFeatureBad("gitlab_mr_badge", e);
  logForDebugging(`glab MR badge poll failed: ${e}`, {
    level: "warn",
  });
  return "fetch-failed";
}
//@ chunk-s61vbvea.js:551202-552187 placement
/**
 * 用 gh/glab 查询当前分支 PR 状态
 */
async function fetchPrStatus(e) {
  if (isEssentialTrafficOnly()) return null;
  let n = glabProbeRegistry.of(e);
  if (!n.isGlabOnPath()) return null;
  let r = repoOwnerFromRemote();
  if (r === null) return null;
  if (getGitHostKind(r) === "github") return null;
  if (n.unauthenticatedHosts.has(r)) return null;
  let s = await execFileNoThrow("glab", ["mr", "view", "-F", "json"], {
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
  if (s.code !== 0) {
    if (GLAB_UNAUTHENTICATED_RE.test(s.stdout) || GLAB_UNAUTHENTICATED_RE.test(s.stderr)) {
      n.unauthenticatedHosts.add(r);
      return null;
    }
    let R = tryParseJson(s.stdout);
    if (R === undefined) return reportGlabFailure("glab_unresponsive");
    if (hasErrorObject(R)) return null;
    return reportGlabFailure("glab_unresponsive");
  }
  let h = tryParseJson(s.stdout);
  if (h === undefined) return reportGlabFailure("parse_failed");
  if (hasErrorObject(h)) return null;
  let y = GitlabMrSchema().safeParse(h);
  if (!y.success) return reportGlabFailure("parse_failed");
  let S = y.data;
  if (!isMrUrlForIid(S.web_url, S.iid)) {
    logFeatureBad("gitlab_mr_badge", "web_url_rejected");
    return null;
  }
  let w = mrBadgeState(S.state, S.draft === true, S.detailed_merge_status);
  if (w === null) return null;
  n.emitOkOnce();
  return {
    number: S.iid,
    url: S.web_url,
    reviewState: w,
    kind: "mr",
  };
}
//@ chunk-s61vbvea.js:552187-552254 placement
var PR_URL_RE = /^https:\/\/([\w.-]+)\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)\b/;
//@ chunk-s61vbvea.js:552254-552368 placement
/**
 * 解析 PR URL（主机、所有者、仓库、编号）。
 */
function parsePrUrl(e) {
  let match = e.match(PR_URL_RE);
  if (!match) return null;
  return {
    url: e,
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
  directStateForBranch(e) {
    if (this.directState?.branch !== e)
      this.directState = {
        branch: e,
        etag: null,
        pr: null,
        reviewDecision: "",
        lastReviewFetchAt: 0,
        redirectedListUrl: null,
      };
    return this.directState;
  }
  logAuthState(e) {
    if (e === this.lastLoggedGhAuthState) return;
    this.lastLoggedGhAuthState = e;
    logEvent("tengu_gh_pr_status_auth_state", {
      auth_state: fromEnum(e),
    });
  }
  rememberBaseRepo(e) {
    this.baseRepoCache = e;
    return e;
  }
  backOffUntil(ghBackoffUntil) {
    this.ghBackoffUntil = ghBackoffUntil;
  }
  backOffFromResponse(e) {
    let n = Number(e.headers.get("retry-after"));
    let r = Number(e.headers.get("x-ratelimit-reset"));
    this.ghBackoffUntil =
      Number.isFinite(n) && n > 0
        ? Date.now() + n * 1000
        : Number.isFinite(r) && r > 0
          ? r * 1000
          : Date.now() + RATE_LIMIT_BACKOFF_MS;
  }
  notePersistedCacheBody(e) {
    if (e === this.lastPersistedCacheBody) return false;
    this.lastPersistedCacheBody = e;
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
var prStatusFetcherRegistry = new HostScoped(() => new PrStatusFetcher());
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
function prStatusHint(e) {
  switch (e) {
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
async function getPrStatus(e) {
  if (!(await getIsGit())) return null;
  let [branch, defaultBranch] = await Promise.all([getBranch(), getDefaultBranch()]);
  if (branch === defaultBranch) return null;
  return (await (() => fetchPrStatusForBranch(branch))()) ?? (await fetchPrStatus(e));
}
//@ chunk-s61vbvea.js:554291-554523 layout
var PR_STATUS_CACHE_TTL_MS = 300000;
var PR_STATUS_API_VERSION = "2022-11-28";
var REDIRECT_STATUS_CODES = new Set([301, 302, 307, 308]);
var prSummarySchema = DoctorLazy(() =>
  create_15(
    create({
      number: create_3(),
      html_url: create_2(),
      draft: create_6(),
    }),
  ),
);
var prReviewDecisionSchema = DoctorLazy(() =>
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
  let S = currentPrStatusFetcher().directStateForBranch(branch);
  let w = S.pr && {
    ...S.pr,
    reviewDecision: S.reviewDecision,
  };
  let R = githubApiBase(originRepo.host);
  let origin = new URL(R).origin;
  let P = `${R}/repos/${baseRepo.owner}/${baseRepo.repo}/pulls?head=${encodeURIComponent(originRepo.owner)}:${encodeURIComponent(branch)}&state=open&per_page=1`;
  let j = false;
  let G;
  try {
    let signal = AbortSignal.timeout(GH_REQUEST_TIMEOUT_MS);
    let headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": PR_STATUS_API_VERSION,
      "User-Agent": claudeCodeUserAgent(),
      ...(S.etag && {
        "If-None-Match": S.etag,
      }),
    };
    let he = (href) =>
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
    let Se = await he(S.redirectedListUrl ?? P);
    let ce = REDIRECT_STATUS_CODES.has(Se.status) ? Se.headers.get("location") : null;
    let we = ce ? new URL(ce, P) : null;
    if (we?.origin === origin) {
      S.redirectedListUrl = we.href;
      Se = await he(we.href);
    }
    G = Se.status;
    if (Se.status === 304);
    else if (Se.ok) {
      S.etag = Se.headers.get("etag");
      j = true;
      let ie = prSummarySchema().safeParse(await Se.json());
      let Ee = ie.success ? ie.data[0] : undefined;
      if (Ee && S.pr?.number !== Ee.number) S.reviewDecision = "";
      S.pr = Ee
        ? {
            number: Ee.number,
            url: Ee.html_url,
            isDraft: Ee.draft,
          }
        : null;
    } else {
      if (Se.status === 401) clearGhTokenCache(originRepo.host);
      else if (Se.status === 403 || Se.status === 429) currentPrStatusFetcher().backOffFromResponse(Se);
      logFeatureBad(
        "github_pr_status_direct",
        Se.status === 401
          ? "unauthorized"
          : Se.status === 403 || Se.status === 429
            ? "rate_limited"
            : "http_error",
        {
          http_status: fromNumber(Se.status),
        },
      );
      logForDebugging(`[ghPrStatus] REST list ${Se.status} on ${originRepo.host}`, {
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
  let pr = S.pr;
  if (!pr) {
    logFeatureOk("github_pr_status_direct", {
      http_status: fromNumber(G),
      pr_found: false,
      review_fetched: false,
    });
    return null;
  }
  let reviewDecision = S.reviewDecision;
  let Q = false;
  let Z = j || Date.now() - S.lastReviewFetchAt >= PR_STATUS_CACHE_TTL_MS;
  if (Z) {
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
      if (S.pr?.number === pr.number) {
        S.reviewDecision = prReviewDecision;
        S.lastReviewFetchAt = lastReviewFetchAt;
      }
    } else Q = true;
  }
  let ee = {
    http_status: fromNumber(G),
    pr_found: true,
    review_fetched: Z,
  };
  if (Q) logFeatureSad("github_pr_status_direct", "review_decision_unavailable", ee);
  else logFeatureOk("github_pr_status_direct", ee);
  let ae =
    !Q &&
    w?.number === pr.number &&
    w.url === pr.url &&
    w.isDraft === pr.isDraft &&
    w.reviewDecision === reviewDecision;
  return {
    number: pr.number,
    url: pr.url,
    reviewState: deriveReviewState(pr.isDraft, reviewDecision),
    ...(ae && {
      notModified: true,
    }),
  };
}
//@ chunk-s61vbvea.js:557132-557701 layout
async function fetchPrReviewDecision(e, token, number) {
  let s = githubGraphqlUrl(e.host);
  let body = jsonStringify({
    query:
      "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewDecision}}}",
    variables: {
      o: e.owner,
      r: e.repo,
      n: number,
    },
  });
  try {
    let response = await fetch(s, {
      ...getProxyFetchOptions({
        url: s,
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
    let S = prReviewDecisionSchema().safeParse(await response.json());
    return S.success ? (S.data.data.repository?.pullRequest?.reviewDecision ?? "") : null;
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
function parseGitHubRemote(e) {
  let n = normalizeGitRemoteUrl(e);
  if (!n) return null;
  let parts = n.split("/");
  if (parts.length < 3) return null;
  let s = parts[0];
  if (/^[\d.]+$/.test(s) || /^\[?[0-9a-f:]+\]?$/i.test(s)) return null;
  return {
    host: s,
    owner: parts[1],
    repo: parts[2],
  };
}
//@ chunk-s61vbvea.js:557962-558038 layout
var prForkParentSchema = DoctorLazy(() =>
  create({
    parent: create({
      name: create_2(),
      owner: create({
        login: create_2(),
      }),
    }).nullish(),
  }),
);
//@ chunk-s61vbvea.js:558038-558372 layout
async function resolveBaseRepo(originRepo, token) {
  let r = `${originRepo.host}/${originRepo.owner}/${originRepo.repo}`;
  let baseRepoCache = currentPrStatusFetcher().baseRepoCache;
  if (baseRepoCache?.forOrigin === r) return baseRepoCache;
  let upstreamRemoteUrl = await getUpstreamRemoteUrl();
  let y = upstreamRemoteUrl ? parseGitHubRemote(upstreamRemoteUrl) : null;
  if (y && y.host === originRepo.host)
    return currentPrStatusFetcher().rememberBaseRepo({
      forOrigin: r,
      owner: y.owner,
      repo: y.repo,
    });
  let repoParent = await fetchRepoParent(originRepo, token);
  return currentPrStatusFetcher().rememberBaseRepo({
    forOrigin: r,
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
async function fetchRepoParent(e, n) {
  let s = `${githubApiBase(e.host)}/repos/${e.owner}/${e.repo}`;
  try {
    let response = await fetch(s, {
      ...getProxyFetchOptions({
        url: s,
      }),
      method: "GET",
      headers: {
        Authorization: `Bearer ${n}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": PR_STATUS_API_VERSION,
        "User-Agent": claudeCodeUserAgent(),
      },
      redirect: "error",
      signal: AbortSignal.timeout(GH_REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    let y = prForkParentSchema().safeParse(await response.json());
    let parent = y.success ? y.data.parent : null;
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
function getPrStatusColor(e) {
  switch (e.state) {
    case "MERGED":
      return "merged";
    case "CLOSED":
    case "DRAFT":
      return "inactive";
    case "OPEN": {
      if (e.checks.failed > 0 || e.review === "CHANGES_REQUESTED") return "error";
      if (e.checks.pending === 0 && e.review !== "REVIEW_REQUIRED") return "success";
      return "warning";
    }
  }
}
//@ chunk-s61vbvea.js:559267-559611 layout
function summarizeCheckRuns(statusCheckRollup) {
  let n = 0;
  let r = 0;
  let s = 0;
  for (let h of statusCheckRollup ?? []) {
    let upper = (h.conclusion ?? h.state)?.toUpperCase();
    if (upper === "SUCCESS" || upper === "NEUTRAL" || upper === "SKIPPED") n++;
    else if (upper === "FAILURE" || upper === "ERROR") r++;
    else if (
      upper == null ||
      upper === "ACTION_REQUIRED" ||
      upper === "PENDING" ||
      upper === "EXPECTED" ||
      h.status?.toUpperCase() !== "COMPLETED"
    )
      s++;
    else r++;
  }
  return {
    passed: n,
    failed: r,
    pending: s,
  };
}
//@ chunk-s61vbvea.js:559611-560217 fingerprint = fetchPrStatus (0.483)
async function fetchPrStatus_2(e) {
  let { stdout, code } = await execFileNoThrow(
    "gh",
    [
      "pr",
      "view",
      e,
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
function fetchPrStatusByUrl(e) {
  if (isEssentialTrafficOnly() || isGhApiBackedOff()) return Promise.resolve(null);
  return currentPrStatusFetcher()
    .prStatusByUrl(e)
    .catch(() => null);
}
//@ chunk-s61vbvea.js:560321-560535 placement
function expandPrUrlTemplate(e, n) {
  if (!n) return e;
  let prUrl = parsePrUrl(e);
  if (!prUrl) return e;
  return n
    .replaceAll("{host}", prUrl.host)
    .replaceAll("{owner}", prUrl.owner)
    .replaceAll("{repo}", prUrl.repo)
    .replaceAll("{number}", String(prUrl.num))
    .replaceAll("{url}", e);
}
//@ chunk-s61vbvea.js:560535-560582 placement
/**
 * 有模板时把 PR URL 中的占位符展开，否则原样返回。
 */
function expandPrUrlIfTemplate(url, appState) {
  if (appState) return expandPrUrlTemplate(url, appState);
  return url;
}
//@ chunk-s61vbvea.js:560582-561144 placement
/**
 * GraphQL PR 响应 schema 与字段列表。
 */
var GraphqlPrSchema = DoctorLazy(() => {
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
var PR_GRAPHQL_FIELDS = [
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
//@ chunk-s61vbvea.js:561144-561655 placement
function summarizeChecks(checkRunCountsByState, statusContextCountsByState) {
  let r = 0;
  let s = 0;
  let h = 0;
  for (let { state, count } of checkRunCountsByState ?? [])
    switch (state) {
      case "SUCCESS":
      case "NEUTRAL":
      case "SKIPPED":
        r += count;
        break;
      case "FAILURE":
      case "CANCELLED":
      case "TIMED_OUT":
      case "STALE":
      case "STARTUP_FAILURE":
        s += count;
        break;
      case "ACTION_REQUIRED":
      case "IN_PROGRESS":
      case "QUEUED":
      case "PENDING":
      case "WAITING":
      case "REQUESTED":
      case "COMPLETED":
        h += count;
        break;
      default:
        s += count;
    }
  for (let { state, count } of statusContextCountsByState ?? [])
    switch (state) {
      case "SUCCESS":
        r += count;
        break;
      case "FAILURE":
      case "ERROR":
        s += count;
        break;
      default:
        h += count;
    }
  return {
    passed: r,
    failed: s,
    pending: h,
  };
}
//@ chunk-s61vbvea.js:561655-562119 placement
function prStateLabel(e) {
  let statusCheckRollup = e.commits.nodes[0]?.commit.statusCheckRollup ?? null;
  return {
    number: e.number,
    title: e.title,
    state: e.state === "MERGED" ? "MERGED" : e.state === "CLOSED" ? "CLOSED" : e.isDraft ? "DRAFT" : "OPEN",
    checks: summarizeChecks(
      statusCheckRollup?.contexts?.checkRunCountsByState,
      statusCheckRollup?.contexts?.statusContextCountsByState,
    ),
    review:
      e.reviewDecision === "APPROVED" ||
      e.reviewDecision === "CHANGES_REQUESTED" ||
      e.reviewDecision === "REVIEW_REQUIRED"
        ? e.reviewDecision
        : null,
    additions: e.additions,
    deletions: e.deletions,
  };
}
//@ chunk-s61vbvea.js:562119-562186 placement = cost (0.391)
function cost(e) {
  return e !== null && typeof e === "object" && !("cost" in e);
}
//@ chunk-s61vbvea.js:562186-562297 placement
function groupByKey(e, n) {
  let r = new Map();
  for (let s of e) {
    let h = n(s);
    let y = r.get(h);
    if (y) y.push(s);
    else r.set(h, [s]);
  }
  return r;
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
async function buildPrStatusQuery(e) {
  let n = new Map();
  let r = [];
  let s = null;
  if (e.length === 0 || isEssentialTrafficOnly() || isGhApiBackedOff()) {
    for (let w of e) n.set(w, null);
    return {
      statuses: n,
      rateLimit: s,
      unbatched: [],
    };
  }
  let h = [];
  for (let w of e) {
    let prUrl = parsePrUrl(w);
    if (prUrl) h.push(prUrl);
    else if (/\/pull\/\d+/.test(w)) r.push(w);
  }
  h.sort((w, R) => w.url.localeCompare(R.url));
  let y = [];
  for (let [w, R] of groupByKey(h, (x) => x.host))
    for (let x = 0; x < R.length; x += GRAPHQL_BATCH_SIZE)
      y.push({
        host: w,
        chunk: R.slice(x, x + GRAPHQL_BATCH_SIZE),
      });
  let S = limitConcurrency(GRAPHQL_CONCURRENCY, async ({ host, chunk }) => {
    if (isGhApiBackedOff()) {
      for (let se of chunk) n.set(se.url, null);
      return;
    }
    let x = new Map();
    let mapped = [...groupByKey(chunk, (se) => `${se.owner}/${se.repo}`)].map(([se, re], he) => {
      let [Se, ce] = se.split("/");
      let joined = re
        .map((ie, Ee) => {
          let Ie = `p${he}_${Ee}`;
          x.set(Ie, ie.url);
          return `${Ie}: pullRequest(number: ${ie.num}) { ...pr }`;
        })
        .join(" ");
      return `r${he}: repository(owner:"${Se}", name:"${ce}") { ${joined} }`;
    });
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
    let ee = null;
    if (stdout.trim())
      try {
        ee = jsonParse(stdout);
      } catch {
        ee = null;
      }
    if (!ee?.data) {
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
      for (let se of chunk) n.set(se.url, null);
      return;
    }
    let rateLimit = ee.data.rateLimit;
    if (rateLimit) {
      if (!s || rateLimit.remaining < s.remaining) s = rateLimit;
      if (rateLimit.remaining < 50)
        currentPrStatusFetcher().backOffUntil(
          Date.parse(rateLimit.resetAt) || Date.now() + RATE_LIMIT_BACKOFF_MS,
        );
    }
    for (let [key, value] of Object.entries(ee.data)) {
      if (!key.startsWith("r") || !cost(value)) continue;
      for (let [key, value_2] of Object.entries(value)) {
        let ce = x.get(key);
        if (!ce) continue;
        let we = GraphqlPrSchema().safeParse(value_2);
        if (!we.success && value_2 !== null) {
          let { issues } = we.error;
          let mapped = issues.slice(0, 8).map((issue) => issue.path.join(".") || "the node itself");
          let Ie = Array.isArray(ee.errors) ? ee.errors.length : 0;
          logForDebugging(
            `[ghPrStatus] a PR in the batch reply from ${host} has an unexpected shape (gh exit ${code}; GraphQL errors: ${Ie}; bad or missing: ${mapped.join(", ")}); keeping its last-known status`,
          );
          if (!currentPrStatusFetcher().malformedBatchNodeLogged) {
            currentPrStatusFetcher().malformedBatchNodeLogged = true;
            let ke = new Set(issues.map((issue) => issue.path.findLast((We) => typeof We === "string")));
            logFeatureSad("github_pr_status_batch", "malformed_node", {
              gh_exit_nonzero: code !== 0,
              graphql_errors: Ie,
              github_dot_com: isGithubDotCom(host),
              bad_fields: fromEnumArr(PR_GRAPHQL_FIELDS.filter((Me) => ke.has(Me))),
            });
          }
        }
        n.set(ce, we.success ? prStateLabel(we.data) : null);
      }
    }
    for (let se of x.values()) if (!n.has(se)) n.set(se, null);
  });
  await Promise.all(y.map(S));
  return {
    statuses: n,
    rateLimit: s,
    unbatched: r,
  };
}
//@ chunk-s61vbvea.js:565418-565498 placement
var prStatusCachePath = () => join(getClaudeConfigDir(), "gh-pr-status-cache.json");
var Mk = STORAGE_SPACES.state("gh-pr-status-cache");
//@ chunk-s61vbvea.js:565498-565868 placement
function persistPrStatusCache(e, n) {
  let r = {};
  for (let [h, y] of e) if (y) r[h] = y;
  let s = jsonStringify(r);
  if (s === "{}" || !currentPrStatusFetcher().notePersistedCacheBody(s)) return Promise.resolve();
  if (isStorageV5Enabled() && n)
    return Promise.resolve()
      .then(() =>
        n.write(Mk, s, {
          mode: 438 & ~process.umask(),
        }),
      )
      .then((h) => {
        if (!h.ok) logForDebugging(`persistPrStatusCache: ${h.error.code}`);
      })
      .catch((error) => {
        logForDebugging(`persistPrStatusCache: ${errorMessage(error)}`);
      });
  return writeFileAtomic(prStatusCachePath(), s).catch(() => {});
}
//@ chunk-s61vbvea.js:565868-566109 placement
var CachedPrStatusSchema = DoctorLazy(() =>
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
//@ chunk-s61vbvea.js:566109-566408 placement
function parsePrStatusCache(e) {
  let n = new Map();
  let r;
  try {
    r = jsonParse(e);
  } catch {
    return n;
  }
  if (r === null || typeof r !== "object" || Array.isArray(r)) return n;
  let s = 0;
  for (let [key, value] of Object.entries(r)) {
    let S = CachedPrStatusSchema().safeParse(value);
    if (S.success) n.set(key, S.data);
    else s++;
  }
  if (s > 0) logForDebugging(`loadPrStatusCache: dropped ${s} malformed cache entries`);
  return n;
}
//@ chunk-s61vbvea.js:566408-566825 placement
async function loadPrStatusCache(e) {
  if (e) {
    let n;
    try {
      n = await e.read([Mk]);
    } catch (error) {
      logForDebugging(`loadPrStatusCache: ${errorMessage(error)}`);
      return new Map();
    }
    if (!n.ok) {
      logForDebugging(`loadPrStatusCache: ${n.error.code}`);
      return new Map();
    }
    let r = n.value.items[0];
    if (!r?.found) return new Map();
    let s;
    try {
      s = Buffer.from(r.value).toString("utf-8");
    } catch (error) {
      logForDebugging(`loadPrStatusCache: ${errorMessage(error)}`);
      return new Map();
    }
    return parsePrStatusCache(s);
  }
  try {
    let file = await readFile(prStatusCachePath(), "utf8");
    return parsePrStatusCache(file);
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
  let n = canonicalGitRoot ? findRepoRemoteSlug(canonicalGitRoot) : null;
  let r = n ? GERRIT_HOST_RE.exec(n) : null;
  let s = r?.[1];
  let h = r ? n.slice(r[0].length).replace(/^a\//, "") : undefined;
  if (!s || !h || s.endsWith("-review")) return null;
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
  let w = code === 0 ? [...stdout.matchAll(GERRIT_CHANGE_ID_RE)].at(-1)?.[1] : undefined;
  if (!w) return null;
  let R = `${s}-review.googlesource.com`;
  let x;
  try {
    let G = await externalHttp.get(`https://${R}/changes/?q=change:${w}+status:open&n=5`, {
      timeout: GERRIT_QUERY_TIMEOUT_MS,
      responseType: "text",
      maxRedirects: 0,
      withCredentials: false,
      transformResponse: (q) => q,
    });
    let L = typeof G.data === "string" ? G.data : "";
    x = jsonParse(L.startsWith(")]}'") ? L.slice(4) : L);
  } catch {
    return null;
  }
  let P = Array.isArray(x)
    ? x.find((G) => typeof G?.project === "string" && G.project.toLowerCase() === h)
    : undefined;
  if (!P || typeof P._number !== "number") return null;
  let j = `https://${R}/c/${P.project}/+/${P._number}`;
  return regExp_18.test(j)
    ? {
        url: j,
        project: P.project,
        number: P._number,
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
