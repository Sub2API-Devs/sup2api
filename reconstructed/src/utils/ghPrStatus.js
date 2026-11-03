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
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import {
  readFile,
  readFile as readFile_2,
  readFile as readFile_3,
  readFile as readFile_4,
} from "fs/promises";
import { w0 } from "./which.js";
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
import { u, E, o, M } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";
import { L8e, regExp_2 as regExp_2_2, regExp as regExp_18 } from "./detectRepository.js";
import { isEssentialTrafficOnly } from "./privacyLevel.js";
import { getGitHostKind } from "./gitHosts.js";
import { execFileNoThrow } from "./execFileNoThrow.js";
import { createSignal } from "./signal.js";
import { memoizeWithTTL } from "./memoize.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromNumber, lit, fromEnumArr } from "../services/analytics/safeMetadata.js";
import { getRootSession } from "../bootstrap/state.js";
import { create_15, create, create_3, create_2, create_6, create_26 } from "../../vendor/zod/lib/index.mjs";
import { getGhTokenCached, sp } from "./github/ghToken.js";
import { isGithubDotCom, sameHost, githubApiBase, eMi } from "./git/githubUrl.js";
import { claudeCodeUserAgent } from "./http.js";
import { getProxyFetchOptions } from "./proxy.js";
import { sanitizeErrorName, sanitizeErrnoForTelemetry, errorMessage } from "./errors.js";
import { limitConcurrency } from "./concurrencyLimit.js";
import { getClaudeConfigDir } from "./envUtils.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { writeFileAtomic } from "./atomicPublishWrite.js";
import { isWorkspacePersistedTrusted } from "./config.js";
import { freeze as freeze_6 } from "./git/gitSafeEnv.js";
import { externalHttp } from "../services/http/externalHttp.js";

//@ chunk-s61vbvea.js:550055-550122 placement
var rU = 2500,
  hk = /^\s*\S+ has not been authenticated with glab\s*$/m;
//@ chunk-s61vbvea.js:550122-550362 placement
class GlabProbeState {
  glabOnPath;
  unauthenticatedHosts = new Set();
  okEmitted = !1;
  isGlabOnPath() {
    if (this.glabOnPath === void 0) this.glabOnPath = w0("glab") !== null;
    return this.glabOnPath;
  }
  emitOkOnce() {
    if (this.okEmitted) return;
    (logFeatureOk("gitlab_mr_badge"), (this.okEmitted = !0));
  }
}
//@ chunk-s61vbvea.js:550362-550387 placement
var oU = new HostScoped(() => new GlabProbeState());
//@ chunk-s61vbvea.js:550387-550572 placement
function repoOwnerFromRemote() {
  try {
    let e = findCanonicalGitRoot(getCwd());
    if (!e) return null;
    let n = findRepoRemoteSlug(e);
    if (!n) return null;
    return firstLineOf(n, "/") || null;
  } catch (error) {
    return (logForDebugging(`glab MR badge repo probe failed: ${error}`, { level: "warn" }), null);
  }
}
//@ chunk-s61vbvea.js:550572-550721 placement
var GitlabMrSchema = DoctorLazy(() =>
  u({
    iid: E().int().min(1).max(Number.MAX_SAFE_INTEGER),
    state: o(),
    draft: M().optional(),
    detailed_merge_status: o().optional(),
    web_url: o(),
  }),
);
//@ chunk-s61vbvea.js:550721-550767 placement
function yk(e) {
  try {
    return jsonParse(e);
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
function isMrUrlForIid(e, n) {
  if (e.length > L8e || !regExp_2_2.test(e)) return !1;
  return Number(e.slice(e.lastIndexOf("/") + 1)) === n;
}
//@ chunk-s61vbvea.js:550980-551090 placement
function mrBadgeState(e, n, r) {
  if (e !== "opened") return null;
  if (n) return "draft";
  return r === "mergeable" ? "approved" : "pending";
}
//@ chunk-s61vbvea.js:551090-551202 placement
function reportGlabFailure(e) {
  return (
    logFeatureBad("gitlab_mr_badge", e),
    logForDebugging(`glab MR badge poll failed: ${e}`, { level: "warn" }),
    "fetch-failed"
  );
}
/**
 * 用 gh/glab 查询当前分支 PR 状态
 */
//@ chunk-s61vbvea.js:551202-552187 placement
async function fetchPrStatus(e) {
  if (isEssentialTrafficOnly()) return null;
  let of = oU.of(e);
  if (!of.isGlabOnPath()) return null;
  let r = repoOwnerFromRemote();
  if (r === null) return null;
  if (getGitHostKind(r) === "github") return null;
  if (of.unauthenticatedHosts.has(r)) return null;
  let s = await execFileNoThrow("glab", ["mr", "view", "-F", "json"], {
    timeout: rU,
    preserveOutputOnError: !0,
    useCwd: !0,
    env: { ...process.env, GITLAB_TOKEN: void 0, GITLAB_ACCESS_TOKEN: void 0, OAUTH_TOKEN: void 0 },
  });
  if (s.code !== 0) {
    if (hk.test(s.stdout) || hk.test(s.stderr)) return (of.unauthenticatedHosts.add(r), null);
    let R = yk(s.stdout);
    if (R === void 0) return reportGlabFailure("glab_unresponsive");
    if (hasErrorObject(R)) return null;
    return reportGlabFailure("glab_unresponsive");
  }
  let h = yk(s.stdout);
  if (h === void 0) return reportGlabFailure("parse_failed");
  if (hasErrorObject(h)) return null;
  let safeParse = GitlabMrSchema().safeParse(h);
  if (!safeParse.success) return reportGlabFailure("parse_failed");
  let S = safeParse.data;
  if (!isMrUrlForIid(S.web_url, S.iid)) return (logFeatureBad("gitlab_mr_badge", "web_url_rejected"), null);
  let w = mrBadgeState(S.state, S.draft === !0, S.detailed_merge_status);
  if (w === null) return null;
  return (of.emitOkOnce(), { number: S.iid, url: S.web_url, reviewState: w, kind: "mr" });
}
//@ chunk-s61vbvea.js:552187-552254 placement
var cU = /^https:\/\/([\w.-]+)\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)\b/;
/**
 * 解析 PR URL（主机、所有者、仓库、编号）。
 */
//@ chunk-s61vbvea.js:552254-552368 placement
function parsePrUrl(e) {
  let match = e.match(cU);
  if (!match) return null;
  return { url: e, host: match[1], owner: match[2], repo: match[3], num: Number(match[4]) };
}
//@ chunk-s61vbvea.js:552368-552381 placement
var ap = 60000;
//@ chunk-s61vbvea.js:552381-553785 placement
class PrStatusFetcher {
  #e = createSignal();
  bump = {
    ...this.#e,
    emit: () => {
      ((this.pollerNotModifiedStreak = 0), this.#e.emit());
    },
  };
  pollerDisabled = !1;
  pollerBadStreak = 0;
  pollerNotModifiedStreak = 0;
  directState = null;
  lastLoggedGhAuthState = null;
  malformedBatchNodeLogged = !1;
  batchReplyOverCapLogged = !1;
  baseRepoCache = void 0;
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
    ((this.lastLoggedGhAuthState = e),
      logEvent("tengu_gh_pr_status_auth_state", { auth_state: fromEnum(e) }));
  }
  rememberBaseRepo(e) {
    return ((this.baseRepoCache = e), e);
  }
  backOffUntil(e) {
    this.ghBackoffUntil = e;
  }
  backOffFromResponse(e) {
    let n = Number(e.headers.get("retry-after")),
      r = Number(e.headers.get("x-ratelimit-reset"));
    this.ghBackoffUntil =
      Number.isFinite(n) && n > 0
        ? Date.now() + n * 1000
        : Number.isFinite(r) && r > 0
          ? r * 1000
          : Date.now() + ap;
  }
  notePersistedCacheBody(e) {
    if (e === this.lastPersistedCacheBody) return !1;
    return ((this.lastPersistedCacheBody = e), !0);
  }
  reset() {
    ((this.pollerDisabled = !1),
      (this.pollerBadStreak = 0),
      (this.pollerNotModifiedStreak = 0),
      (this.directState = null),
      (this.lastLoggedGhAuthState = null),
      (this.malformedBatchNodeLogged = !1),
      (this.batchReplyOverCapLogged = !1),
      (this.baseRepoCache = void 0),
      (this.ghBackoffUntil = 0),
      (this.lastPersistedCacheBody = ""),
      this.prStatusByUrl.cache.clear());
  }
}
//@ chunk-s61vbvea.js:553785-553810 placement
var pU = new HostScoped(() => new PrStatusFetcher());
//@ chunk-s61vbvea.js:553810-553847 placement
function zM() {
  return pU.of(getRootSession().host);
}
/**
 * PR 状态不可用时的提示。
 */
//@ chunk-s61vbvea.js:553847-553977 placement
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
  let [r, s] = await Promise.all([getBranch(), getDefaultBranch()]);
  if (r === s) return null;
  return (await (() => fetchPrStatusForBranch(r))()) ?? (await fetchPrStatus(e));
}
//@ chunk-s61vbvea.js:554291-554523 layout
var PR_STATUS_CACHE_TTL_MS = 300000,
  vk = "2022-11-28",
  hU = new Set([301, 302, 307, 308]),
  SU = DoctorLazy(() => create_15(create({ number: create_3(), html_url: create_2(), draft: create_6() }))),
  _U = DoctorLazy(() =>
    create({
      data: create({
        repository: create({
          pullRequest: create({ reviewDecision: create_2().nullable() }).nullable(),
        }).nullable(),
      }),
    }),
  );
/**
 * 查询当前分支对应 PR 的状态（GitHub REST + GraphQL reviewDecision、check runs），用于页脚 PR 状态；主分支或仅必要流量时不查。
 */
//@ chunk-s61vbvea.js:554523-557132 layout
async function fetchPrStatusForBranch(e) {
  let now = Date.now();
  if (isEssentialTrafficOnly() || ql()) return null;
  if (e === "main" || e === "master") return null;
  let r = await getOriginRepo();
  if (!r) return null;
  let s = await getGhTokenCached(r.host);
  if (s.kind !== "token") {
    if (!isGithubDotCom(r.host) && !sameHost(process.env.GH_HOST, r.host)) return null;
    return (
      zM().logAuthState(s.kind === "gh-missing" ? "gh_missing" : "needs_auth"),
      sp(r.host),
      s.kind === "gh-missing" ? "gh-missing" : "needs-auth"
    );
  }
  zM().logAuthState("token_present");
  let token = s.token,
    y = await resolveBaseRepo(r, token),
    directStateForBranch = zM().directStateForBranch(e),
    w = directStateForBranch.pr && {
      ...directStateForBranch.pr,
      reviewDecision: directStateForBranch.reviewDecision,
    },
    R = githubApiBase(r.host),
    origin = new URL(R).origin,
    P = `${R}/repos/${y.owner}/${y.repo}/pulls?head=${encodeURIComponent(r.owner)}:${encodeURIComponent(e)}&state=open&per_page=1`,
    j = !1,
    G;
  try {
    let timeout = AbortSignal.timeout(GH_REQUEST_TIMEOUT_MS),
      re = {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": vk,
        "User-Agent": claudeCodeUserAgent(),
        ...(directStateForBranch.etag && { "If-None-Match": directStateForBranch.etag }),
      },
      he = (ie) =>
        fetch(ie, {
          ...getProxyFetchOptions({ url: ie }),
          keepalive: !1,
          method: "GET",
          headers: re,
          redirect: "manual",
          signal: timeout,
        }),
      Se = await he(directStateForBranch.redirectedListUrl ?? P),
      ce = hU.has(Se.status) ? Se.headers.get("location") : null,
      we = ce ? new URL(ce, P) : null;
    if (we?.origin === origin) ((directStateForBranch.redirectedListUrl = we.href), (Se = await he(we.href)));
    if (((G = Se.status), Se.status === 304));
    else if (Se.ok) {
      ((directStateForBranch.etag = Se.headers.get("etag")), (j = !0));
      let safeParse = SU().safeParse(await Se.json()),
        Ee = safeParse.success ? safeParse.data[0] : void 0;
      if (Ee && directStateForBranch.pr?.number !== Ee.number) directStateForBranch.reviewDecision = "";
      directStateForBranch.pr = Ee ? { number: Ee.number, url: Ee.html_url, isDraft: Ee.draft } : null;
    } else {
      if (Se.status === 401) sp(r.host);
      else if (Se.status === 403 || Se.status === 429) zM().backOffFromResponse(Se);
      return (
        logFeatureBad(
          "github_pr_status_direct",
          Se.status === 401
            ? "unauthorized"
            : Se.status === 403 || Se.status === 429
              ? "rate_limited"
              : "http_error",
          { http_status: fromNumber(Se.status) },
        ),
        logForDebugging(`[ghPrStatus] REST list ${Se.status} on ${r.host}`, { level: "debug" }),
        "fetch-failed"
      );
    }
  } catch (error) {
    return (
      logFeatureBad("github_pr_status_direct", "fetch_threw", {
        error_name: sanitizeErrorName(error) ?? lit("unknown"),
        errno_code: sanitizeErrnoForTelemetry(error) ?? sanitizeErrnoForTelemetry(error?.cause) ?? lit(""),
      }),
      "fetch-failed"
    );
  }
  let pr = directStateForBranch.pr;
  if (!pr)
    return (
      logFeatureOk("github_pr_status_direct", {
        http_status: fromNumber(G),
        pr_found: !1,
        review_fetched: !1,
      }),
      null
    );
  let reviewDecision = directStateForBranch.reviewDecision,
    Q = !1,
    Z = j || Date.now() - directStateForBranch.lastReviewFetchAt >= PR_STATUS_CACHE_TTL_MS;
  if (Z) {
    let se = await fetchPrReviewDecision({ host: r.host, owner: y.owner, repo: y.repo }, token, pr.number);
    if (se !== null) {
      if (((reviewDecision = se), directStateForBranch.pr?.number === pr.number))
        ((directStateForBranch.reviewDecision = se), (directStateForBranch.lastReviewFetchAt = now));
    } else Q = !0;
  }
  let ee = { http_status: fromNumber(G), pr_found: !0, review_fetched: Z };
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
    ...(ae && { notModified: !0 }),
  };
}
//@ chunk-s61vbvea.js:557132-557701 layout
async function fetchPrReviewDecision(e, n, r) {
  let s = eMi(e.host),
    h = jsonStringify({
      query:
        "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewDecision}}}",
      variables: { o: e.owner, r: e.repo, n: r },
    });
  try {
    let y = await fetch(s, {
      ...getProxyFetchOptions({ url: s }),
      keepalive: !1,
      method: "POST",
      headers: {
        Authorization: `Bearer ${n}`,
        "Content-Type": "application/json",
        "User-Agent": claudeCodeUserAgent(),
      },
      body: h,
      redirect: "error",
      signal: AbortSignal.timeout(GH_REQUEST_TIMEOUT_MS),
    });
    if (!y.ok) return null;
    let safeParse = _U().safeParse(await y.json());
    return safeParse.success ? (safeParse.data.data.repository?.pullRequest?.reviewDecision ?? "") : null;
  } catch {
    return null;
  }
}
//@ chunk-s61vbvea.js:557701-557759 layout
async function getOriginRepo() {
  let e = await getRemoteUrl();
  return e ? parseGitHubRemote(e) : null;
}
/**
 * 把 git remote URL 解析为 {host, owner, repo}（拒绝 IP 主机）。
 */
//@ chunk-s61vbvea.js:557759-557962 layout
function parseGitHubRemote(e) {
  let n = normalizeGitRemoteUrl(e);
  if (!n) return null;
  let parts = n.split("/");
  if (parts.length < 3) return null;
  let s = parts[0];
  if (/^[\d.]+$/.test(s) || /^\[?[0-9a-f:]+\]?$/i.test(s)) return null;
  return { host: s, owner: parts[1], repo: parts[2] };
}
//@ chunk-s61vbvea.js:557962-558038 layout
var EU = DoctorLazy(() =>
  create({ parent: create({ name: create_2(), owner: create({ login: create_2() }) }).nullish() }),
);
//@ chunk-s61vbvea.js:558038-558372 layout
async function resolveBaseRepo(e, n) {
  let r = `${e.host}/${e.owner}/${e.repo}`,
    baseRepoCache = zM().baseRepoCache;
  if (baseRepoCache?.forOrigin === r) return baseRepoCache;
  let h = await getUpstreamRemoteUrl(),
    y = h ? parseGitHubRemote(h) : null;
  if (y && y.host === e.host) return zM().rememberBaseRepo({ forOrigin: r, owner: y.owner, repo: y.repo });
  let S = await fetchRepoParent(e, n);
  return zM().rememberBaseRepo({ forOrigin: r, ...(S ?? { owner: e.owner, repo: e.repo }) });
}
//@ chunk-s61vbvea.js:558372-558547 layout
async function getUpstreamRemoteUrl() {
  let { stdout: stdout, code: code } = await execFileNoThrow(
    "git",
    ["config", "--get", "remote.upstream.url"],
    { timeout: 2000, preserveOutputOnError: !1 },
  );
  return code === 0 && stdout.trim() ? stdout.trim() : null;
}
//@ chunk-s61vbvea.js:558547-558998 layout
async function fetchRepoParent(e, n) {
  let s = `${githubApiBase(e.host)}/repos/${e.owner}/${e.repo}`;
  try {
    let h = await fetch(s, {
      ...getProxyFetchOptions({ url: s }),
      method: "GET",
      headers: {
        Authorization: `Bearer ${n}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": vk,
        "User-Agent": claudeCodeUserAgent(),
      },
      redirect: "error",
      signal: AbortSignal.timeout(GH_REQUEST_TIMEOUT_MS),
    });
    if (!h.ok) return null;
    let safeParse = EU().safeParse(await h.json()),
      S = safeParse.success ? safeParse.data.parent : null;
    return S ? { owner: S.owner.login, repo: S.name } : null;
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
function summarizeCheckRuns(e) {
  let n = 0,
    r = 0,
    s = 0;
  for (let h of e ?? []) {
    let y = (h.conclusion ?? h.state)?.toUpperCase();
    if (y === "SUCCESS" || y === "NEUTRAL" || y === "SKIPPED") n++;
    else if (y === "FAILURE" || y === "ERROR") r++;
    else if (
      y == null ||
      y === "ACTION_REQUIRED" ||
      y === "PENDING" ||
      y === "EXPECTED" ||
      h.status?.toUpperCase() !== "COMPLETED"
    )
      s++;
    else r++;
  }
  return { passed: n, failed: r, pending: s };
}
//@ chunk-s61vbvea.js:559611-560217 fingerprint = fetchPrStatus (0.483)
async function fetchPrStatus_2(e) {
  let { stdout: stdout, code: code } = await execFileNoThrow(
    "gh",
    [
      "pr",
      "view",
      e,
      "--json",
      "number,title,state,isDraft,statusCheckRollup,reviewDecision,additions,deletions",
    ],
    { timeout: GH_REQUEST_TIMEOUT_MS, preserveOutputOnError: !1 },
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
/**
 * 按 URL 查 PR 状态（仅必要流量时不查）。
 */
//@ chunk-s61vbvea.js:560217-560321 placement
function fetchPrStatusByUrl(e) {
  if (isEssentialTrafficOnly() || ql()) return Promise.resolve(null);
  return zM()
    .prStatusByUrl(e)
    .catch(() => null);
}
//@ chunk-s61vbvea.js:560321-560535 placement
function expandPrUrlTemplate(e, n) {
  if (!n) return e;
  let r = parsePrUrl(e);
  if (!r) return e;
  return n
    .replaceAll("{host}", r.host)
    .replaceAll("{owner}", r.owner)
    .replaceAll("{repo}", r.repo)
    .replaceAll("{number}", String(r.num))
    .replaceAll("{url}", e);
}
//@ chunk-s61vbvea.js:560535-560582 placement
function See(e, n) {
  if (n) return expandPrUrlTemplate(e, n);
  return e;
}
/**
 * GraphQL PR 响应 schema 与字段列表。
 */
//@ chunk-s61vbvea.js:560582-561144 placement
var GraphqlPrSchema = DoctorLazy(() => {
    let stateCountsSchema = create_15(create({ state: create_2(), count: create_3() })).nullable(),
      rollupSchema = create({
        contexts: create({
          checkRunCountsByState: stateCountsSchema,
          statusContextCountsByState: stateCountsSchema,
        }).nullable(),
      }),
      commitNodeSchema = create({ commit: create({ statusCheckRollup: rollupSchema.nullable() }) });
    return create({
      number: create_3(),
      title: create_2(),
      state: create_2(),
      isDraft: create_6(),
      reviewDecision: create_2().nullable(),
      additions: create_3(),
      deletions: create_3(),
      commits: create({ nodes: create_15(commitNodeSchema.nullable()) }),
    });
  }),
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
//@ chunk-s61vbvea.js:561144-561655 placement
function summarizeChecks(e, n) {
  let r = 0,
    s = 0,
    h = 0;
  for (let { state: state, count: count } of e ?? [])
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
  for (let { state: state, count: count } of n ?? [])
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
  return { passed: r, failed: s, pending: h };
}
//@ chunk-s61vbvea.js:561655-562119 placement
function prStateLabel(e) {
  let n = e.commits.nodes[0]?.commit.statusCheckRollup ?? null;
  return {
    number: e.number,
    title: e.title,
    state: e.state === "MERGED" ? "MERGED" : e.state === "CLOSED" ? "CLOSED" : e.isDraft ? "DRAFT" : "OPEN",
    checks: summarizeChecks(n?.contexts?.checkRunCountsByState, n?.contexts?.statusContextCountsByState),
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
    let h = n(s),
      y = r.get(h);
    if (y) y.push(s);
    else r.set(h, [s]);
  }
  return r;
}
/**
 * PR GraphQL 片段与批量查询参数。
 */
//@ chunk-s61vbvea.js:562297-562642 placement
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
}`,
  GRAPHQL_BATCH_SIZE = 20,
  GRAPHQL_CONCURRENCY = 6,
  GRAPHQL_TIMEOUT_MS = 15000,
  MAX_RESPONSE_BYTES = 200000,
  RATE_LIMIT_BACKOFF = "30s",
  RATE_LIMIT_RE = /rate limit/i;
//@ chunk-s61vbvea.js:562642-562694 placement
function ql() {
  return Date.now() < zM().ghBackoffUntil;
}
//@ chunk-s61vbvea.js:562694-565418 placement
async function buildPrStatusQuery(e) {
  let n = new Map(),
    r = [],
    s = null;
  if (e.length === 0 || isEssentialTrafficOnly() || ql()) {
    for (let w of e) n.set(w, null);
    return { statuses: n, rateLimit: s, unbatched: [] };
  }
  let h = [];
  for (let w of e) {
    let R = parsePrUrl(w);
    if (R) h.push(R);
    else if (/\/pull\/\d+/.test(w)) r.push(w);
  }
  h.sort((w, R) => w.url.localeCompare(R.url));
  let y = [];
  for (let [w, R] of groupByKey(h, (x) => x.host))
    for (let x = 0; x < R.length; x += GRAPHQL_BATCH_SIZE)
      y.push({ host: w, chunk: R.slice(x, x + GRAPHQL_BATCH_SIZE) });
  let S = limitConcurrency(GRAPHQL_CONCURRENCY, async ({ host: host, chunk: chunk }) => {
    if (ql()) {
      for (let se of chunk) n.set(se.url, null);
      return;
    }
    let x = new Map(),
      mapped = [...groupByKey(chunk, (se) => `${se.owner}/${se.repo}`)].map(([se, re], he) => {
        let [Se, ce] = se.split("/"),
          joined = re
            .map((ie, Ee) => {
              let Ie = `p${he}_${Ee}`;
              return (x.set(Ie, ie.url), `${Ie}: pullRequest(number: ${ie.num}) { ...pr }`);
            })
            .join(" ");
        return `r${he}: repository(owner:"${Se}", name:"${ce}") { ${joined} }`;
      }),
      G = `${PR_GRAPHQL_FRAGMENT}
query { rateLimit{cost remaining resetAt} ${mapped.join(" ")} }`,
      {
        stdout: stdout,
        stderr: stderr,
        code: code,
        maxBufferExceeded: maxBufferExceeded,
      } = await execFileNoThrow(
        "gh",
        ["api", "graphql", "--hostname", host, "--cache", RATE_LIMIT_BACKOFF, "-F", "query=@-"],
        { timeout: GRAPHQL_TIMEOUT_MS, input: G, preserveOutputOnError: !0, maxBuffer: MAX_RESPONSE_BYTES },
      ),
      ee = null;
    if (stdout.trim())
      try {
        ee = jsonParse(stdout);
      } catch {
        ee = null;
      }
    if (!ee?.data) {
      if (maxBufferExceeded) {
        if (
          (logForDebugging(
            `[ghPrStatus] batch reply from ${host} is over the cap of ${MAX_RESPONSE_BYTES} characters; keeping last-known`,
          ),
          !zM().batchReplyOverCapLogged)
        )
          ((zM().batchReplyOverCapLogged = !0),
            logFeatureSad("github_pr_status_batch", "reply_over_cap", {
              github_dot_com: isGithubDotCom(host),
            }));
      } else if (RATE_LIMIT_RE.test(stderr) || RATE_LIMIT_RE.test(stdout))
        (zM().backOffUntil(Date.now() + ap),
          logForDebugging(`[ghPrStatus] GitHub rate-limited on ${host}; backing off 60s`, { level: "warn" }));
      else logForDebugging(`[ghPrStatus] batch query failed on ${host} (exit ${code}); keeping last-known`);
      for (let se of chunk) n.set(se.url, null);
      return;
    }
    let rateLimit = ee.data.rateLimit;
    if (rateLimit) {
      if (!s || rateLimit.remaining < s.remaining) s = rateLimit;
      if (rateLimit.remaining < 50) zM().backOffUntil(Date.parse(rateLimit.resetAt) || Date.now() + ap);
    }
    for (let [se, re] of Object.entries(ee.data)) {
      if (!se.startsWith("r") || !cost(re)) continue;
      for (let [he, Se] of Object.entries(re)) {
        let ce = x.get(he);
        if (!ce) continue;
        let safeParse = GraphqlPrSchema().safeParse(Se);
        if (!safeParse.success && Se !== null) {
          let { issues: issues } = safeParse.error,
            mapped = issues.slice(0, 8).map((ke) => ke.path.join(".") || "the node itself"),
            Ie = Array.isArray(ee.errors) ? ee.errors.length : 0;
          if (
            (logForDebugging(
              `[ghPrStatus] a PR in the batch reply from ${host} has an unexpected shape (gh exit ${code}; GraphQL errors: ${Ie}; bad or missing: ${mapped.join(", ")}); keeping its last-known status`,
            ),
            !zM().malformedBatchNodeLogged)
          ) {
            zM().malformedBatchNodeLogged = !0;
            let ke = new Set(issues.map((Me) => Me.path.findLast((We) => typeof We === "string")));
            logFeatureSad("github_pr_status_batch", "malformed_node", {
              gh_exit_nonzero: code !== 0,
              graphql_errors: Ie,
              github_dot_com: isGithubDotCom(host),
              bad_fields: fromEnumArr(PR_GRAPHQL_FIELDS.filter((Me) => ke.has(Me))),
            });
          }
        }
        n.set(ce, safeParse.success ? prStateLabel(safeParse.data) : null);
      }
    }
    for (let se of x.values()) if (!n.has(se)) n.set(se, null);
  });
  return (await Promise.all(y.map(S)), { statuses: n, rateLimit: s, unbatched: r });
}
//@ chunk-s61vbvea.js:565418-565498 placement
var Ik = () => join_20(getClaudeConfigDir(), "gh-pr-status-cache.json"),
  state = STORAGE_SPACES.state("gh-pr-status-cache");
//@ chunk-s61vbvea.js:565498-565868 placement
function persistPrStatusCache(e, n) {
  let r = {};
  for (let [h, y] of e) if (y) r[h] = y;
  let s = jsonStringify(r);
  if (s === "{}" || !zM().notePersistedCacheBody(s)) return Promise.resolve();
  if (isStorageV5Enabled() && n)
    return Promise.resolve()
      .then(() => n.write(state, s, { mode: 438 & ~process.umask() }))
      .then((h) => {
        if (!h.ok) logForDebugging(`persistPrStatusCache: ${h.error.code}`);
      })
      .catch((h) => {
        logForDebugging(`persistPrStatusCache: ${errorMessage(h)}`);
      });
  return writeFileAtomic(Ik(), s).catch(() => {});
}
//@ chunk-s61vbvea.js:565868-566109 placement
var CachedPrStatusSchema = DoctorLazy(() =>
  create({
    number: create_3(),
    title: create_2(),
    state: create_26(["OPEN", "MERGED", "CLOSED", "DRAFT"]),
    checks: create({ passed: create_3(), failed: create_3(), pending: create_3() }),
    review: create_26(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED"]).nullable(),
    additions: create_3(),
    deletions: create_3(),
  }),
);
//@ chunk-s61vbvea.js:566109-566408 placement
function parsePrStatusCache(e) {
  let n = new Map(),
    r;
  try {
    r = jsonParse(e);
  } catch {
    return n;
  }
  if (r === null || typeof r !== "object" || Array.isArray(r)) return n;
  let s = 0;
  for (let [h, y] of Object.entries(r)) {
    let safeParse = CachedPrStatusSchema().safeParse(y);
    if (safeParse.success) n.set(h, safeParse.data);
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
      n = await e.read([state]);
    } catch (error) {
      return (logForDebugging(`loadPrStatusCache: ${errorMessage(error)}`), new Map());
    }
    if (!n.ok) return (logForDebugging(`loadPrStatusCache: ${n.error.code}`), new Map());
    let r = n.value.items[0];
    if (!r?.found) return new Map();
    let s;
    try {
      s = Buffer.from(r.value).toString("utf-8");
    } catch (error) {
      return (logForDebugging(`loadPrStatusCache: ${errorMessage(error)}`), new Map());
    }
    return parsePrStatusCache(s);
  }
  try {
    let n = await readFile_4(Ik(), "utf8");
    return parsePrStatusCache(n);
  } catch {
    return new Map();
  }
}
//@ chunk-s61vbvea.js:566825-566918 placement
var UU = /^([a-z0-9-]+)\.googlesource\.com\//,
  jU = /^Change-Id:\s*(I[0-9a-f]{40})\s*$/gm,
  Dk = 4000;
//@ chunk-s61vbvea.js:566918-567893 placement
async function findGerritReview() {
  if (isEssentialTrafficOnly() || !isWorkspacePersistedTrusted(getCwd())) return null;
  let e = findCanonicalGitRoot(getCwd()),
    n = e ? findRepoRemoteSlug(e) : null,
    r = n ? UU.exec(n) : null,
    s = r?.[1],
    h = r ? n.slice(r[0].length).replace(/^a\//, "") : void 0;
  if (!s || !h || s.endsWith("-review")) return null;
  let { stdout: stdout, code: code } = await execFileNoThrow(
      gitExe(),
      [...freeze_6, "log", "-1", "--format=%B"],
      { timeout: Dk, maxBuffer: 65536, preserveOutputOnError: !1, useCwd: !0 },
    ),
    w = code === 0 ? [...stdout.matchAll(jU)].at(-1)?.[1] : void 0;
  if (!w) return null;
  let R = `${s}-review.googlesource.com`,
    x;
  try {
    let G = await externalHttp.get(`https://${R}/changes/?q=change:${w}+status:open&n=5`, {
        timeout: Dk,
        responseType: "text",
        maxRedirects: 0,
        withCredentials: !1,
        transformResponse: (q) => q,
      }),
      L = typeof G.data === "string" ? G.data : "";
    x = jsonParse(L.startsWith(")]}'") ? L.slice(4) : L);
  } catch {
    return null;
  }
  let P = Array.isArray(x)
    ? x.find((G) => typeof G?.project === "string" && G.project.toLowerCase() === h)
    : void 0;
  if (!P || typeof P._number !== "number") return null;
  let j = `https://${R}/c/${P.project}/+/${P._number}`;
  return regExp_18.test(j) ? { url: j, project: P.project, number: P._number } : null;
}

export {
  See,
  zM,
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
