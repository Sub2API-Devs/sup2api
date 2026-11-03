/**
 * utils/github/repoVisibility.ts
 *
 * 仓库可见性检查（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (14)
 * attribution: placement 14
 */
import { env, antEnv } from "../env.js";
import { getAutoModeConfigOrDefault } from "../permissions/permissionSetup.js";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_26, create_6 } from "../../../vendor/zod/lib/index.mjs";
import { isAllowedGitRemote } from "../git/builderGit/gitEnv.js";
import { detectCurrentRepositoryWithHost } from "../detectRepository.js";
import { logEvent } from "../../services/analytics/index.js";
import { logError } from "../log.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isGithubDotCom, githubApiBase } from "../git/githubUrl.js";
import { getGitHostKind } from "../gitHosts.js";
import { isTelemetryDisabled } from "../privacyLevel.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { rk } from "./ghToken.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { claudeCodeUserAgent } from "../http.js";

/**
 * 自动模式是否检查仓库可见性（环境变量或配置 repoVisibility）。
 */
//@ chunk-s61vbvea.js:525349-525507 placement
function isRepoVisibilityCheckEnabled() {
  if (env.CLAUDE_CODE_EVAL_CONFINED) return !1;
  let CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY = antEnv.CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY;
  if (CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY !== void 0) return CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY;
  return getAutoModeConfigOrDefault()?.repoVisibility === !0;
}
//@ chunk-s61vbvea.js:525507-525535 placement
var A$ = "2022-11-28",
  ok = 3000;
/**
 * 按 主机/仓库 缓存可见性、正在进行的查询与已记录的策略拒绝。
 */
//@ chunk-s61vbvea.js:525535-526415 placement
class RepoVisibilityCache {
  visibilityByHostSlug = new Map();
  policyDeniedLogged = new Set();
  inFlightByHostSlug = new Map();
  lookup(e, n) {
    return this.visibilityByHostSlug.get(`${e}/${n}`);
  }
  markPolicyDenied(e, n) {
    let r = `${e}/${n}`;
    if (this.policyDeniedLogged.has(r)) return !1;
    return (this.policyDeniedLogged.add(r), !0);
  }
  record(e, n, r) {
    this.visibilityByHostSlug.set(`${e}/${n}`, r);
  }
  running(e, n) {
    return this.inFlightByHostSlug.get(`${e}/${n}`);
  }
  track(e, n, r, s) {
    let h = `${e}/${n}`,
      y = r
        .then((S) => {
          if (this.inFlightByHostSlug.get(h) === y) s(S);
          return S;
        })
        .finally(() => {
          if (this.inFlightByHostSlug.get(h) === y) this.inFlightByHostSlug.delete(h);
        });
    return (this.inFlightByHostSlug.set(h, y), y);
  }
  entries() {
    return Array.from(this.visibilityByHostSlug, ([e, n]) => {
      let index = e.indexOf("/");
      return { host: e.slice(0, index), slug: e.slice(index + 1), visibility: n };
    });
  }
  clear() {
    (this.visibilityByHostSlug.clear(), this.policyDeniedLogged.clear(), this.inFlightByHostSlug.clear());
  }
}
//@ chunk-s61vbvea.js:526415-526440 placement
var P$ = new HostScoped(() => new RepoVisibilityCache());
//@ chunk-s61vbvea.js:526440-526477 placement
function Oi() {
  return P$.of(getRootSession().host);
}
/**
 * 可见性缓存的外部访问接口。
 */
//@ chunk-s61vbvea.js:526477-526603 placement
var repoVisibilityStore = {
  lookup: (e, n) => Oi().lookup(e, n),
  record: (e, n, r) => Oi().record(e, n, r),
  entries: () => Oi().entries(),
  clear: () => Oi().clear(),
};
//@ chunk-s61vbvea.js:526603-526673 placement
function oqe(e) {
  return e.replace(/[^a-zA-Z0-9._/-]/g, "").slice(0, 128);
}
//@ chunk-s61vbvea.js:526673-526775 placement
var REPO_VISIBILITY_RESPONSE_SCHEMA = DoctorLazy(() =>
  create({
    visibility: create_26(["public", "private", "internal"]).optional(),
    private: create_6().optional(),
  }),
);
/**
 * 有效可见性（internal 等按私有主机规则判断为 private）。
 */
//@ chunk-s61vbvea.js:526775-526929 placement
function effectiveVisibility(e) {
  if (e.visibility === "public" || e.visibility === "private") return e.visibility;
  return isAllowedGitRemote(`https://${e.host}/${e.slug}`) ? "private" : e.visibility;
}
/**
 * 检测当前目录的仓库并查询其可见性。
 */
//@ chunk-s61vbvea.js:526929-527039 placement
async function checkCurrentRepoVisibility(e, n) {
  let r = await detectCurrentRepositoryWithHost(e, { skipCache: !0 });
  if (!r) return null;
  return checkRepoVisibility(r.host, r.owner, r.name, n);
}
//@ chunk-s61vbvea.js:527039-527507 placement
async function checkRepoVisibility(e, n, r, s) {
  let h = `${n}/${r}`,
    y = Oi(),
    lookup = y.lookup(e, h);
  if (lookup !== void 0) {
    if (s !== void 0) s.lookup = "hit";
    return { slug: h, host: e, visibility: lookup };
  }
  let running = y.running(e, h);
  if (running !== void 0) {
    if (s !== void 0) s.lookup = "joined";
    return { slug: h, host: e, visibility: await running };
  }
  if (s !== void 0) s.lookup = "fetched";
  let R = {},
    track = await y.track(e, h, classifyGitHost(e, n, r, R), (P) => {
      if ((logVisibilityLookupTiming(R), P === "unverified")) {
        if (y.markPolicyDenied(e, h)) Ii("policy_denied");
      } else y.record(e, h, P);
    });
  return { slug: h, host: e, visibility: track };
}
/**
 * 记录可见性查询耗时（令牌、请求）。
 */
//@ chunk-s61vbvea.js:527507-527685 placement
function logVisibilityLookupTiming(e) {
  if (e.tokenMs === void 0) return;
  try {
    logEvent("tengu_auto_mode_repo_visibility_lookup_timed", {
      token_ms: e.tokenMs,
      had_token: e.hadToken,
      request_ms: e.requestMs,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-s61vbvea.js:527685-527765 placement
function Ii(e) {
  logEvent("tengu_auto_mode_repo_visibility_lookup_failed", { reason: fromEnum(e) });
}
//@ chunk-s61vbvea.js:527765-528763 placement
async function classifyGitHost(e, n, r, s) {
  if (!isGithubDotCom(e)) {
    let w = getGitHostKind(e);
    return (Ii(w === "gitlab" || w === "bitbucket" ? w : "other_host"), "unknown");
  }
  let h = `${githubApiBase(e)}/repos/${encodeURIComponent(n)}/${encodeURIComponent(r)}`;
  if (isTelemetryDisabled()) return "unknown";
  if (!isPolicyAllowed("allow_repo_visibility_probe")) return "unverified";
  let y,
    S = () => {
      if (s !== void 0 && y !== void 0) s.requestMs ??= Date.now() - y;
    };
  try {
    let now = Date.now(),
      R = await rk(e);
    if (s !== void 0) ((s.tokenMs = Date.now() - now), (s.hadToken = R !== null));
    y = Date.now();
    let { data: x } = await externalHttp.get(h, {
      headers: {
        ...(R && { Authorization: `Bearer ${R}` }),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": A$,
        "User-Agent": claudeCodeUserAgent(),
      },
      timeout: ok,
      signal: AbortSignal.timeout(ok),
      maxRedirects: 0,
    });
    S();
    let safeParse = REPO_VISIBILITY_RESPONSE_SCHEMA().safeParse(x);
    if (!safeParse.success) return (Ii("parse_error"), "unknown");
    let visibility = safeParse.data.visibility;
    if (visibility === "public") return "public";
    if (visibility === "private" || visibility === "internal") return "private";
    if (safeParse.data.private === !0) return "private";
    if (safeParse.data.private === !1) return "public";
    return (Ii("missing_fields"), "unknown");
  } catch {
    return (S(), Ii("http_error"), "unknown");
  }
}

export {
  oqe,
  effectiveVisibility,
  repoVisibilityStore,
  isRepoVisibilityCheckEnabled,
  checkCurrentRepoVisibility,
  checkRepoVisibility,
};
