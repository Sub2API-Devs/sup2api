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
import { ghTokenOrNull } from "./ghToken.js";
import { externalHttp } from "../../services/http/externalHttp.js";
import { claudeCodeUserAgent } from "../http.js";

//@ chunk-s61vbvea.js:525349-525507 placement
/**
 * 自动模式是否检查仓库可见性（环境变量或配置 repoVisibility）。
 */
function isRepoVisibilityCheckEnabled() {
  if (env.CLAUDE_CODE_EVAL_CONFINED) return false;
  let CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY = antEnv.CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY;
  if (CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY !== undefined) return CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY;
  return getAutoModeConfigOrDefault()?.repoVisibility === true;
}
//@ chunk-s61vbvea.js:525507-525535 placement
var VISIBILITY_API_VERSION = "2022-11-28";
var VISIBILITY_LOOKUP_TIMEOUT_MS = 3000;
//@ chunk-s61vbvea.js:525535-526415 placement
/**
 * 按 主机/仓库 缓存可见性、正在进行的查询与已记录的策略拒绝。
 */
class RepoVisibilityCache {
  visibilityByHostSlug = new Map();
  policyDeniedLogged = new Set();
  inFlightByHostSlug = new Map();
  lookup(e, n) {
    return this.visibilityByHostSlug.get(`${e}/${n}`);
  }
  markPolicyDenied(e, n) {
    let r = `${e}/${n}`;
    if (this.policyDeniedLogged.has(r)) return false;
    this.policyDeniedLogged.add(r);
    return true;
  }
  record(e, n, r) {
    this.visibilityByHostSlug.set(`${e}/${n}`, r);
  }
  running(e, n) {
    return this.inFlightByHostSlug.get(`${e}/${n}`);
  }
  track(e, n, r, s) {
    let h = `${e}/${n}`;
    let y = r
      .then((S) => {
        if (this.inFlightByHostSlug.get(h) === y) s(S);
        return S;
      })
      .finally(() => {
        if (this.inFlightByHostSlug.get(h) === y) this.inFlightByHostSlug.delete(h);
      });
    this.inFlightByHostSlug.set(h, y);
    return y;
  }
  entries() {
    return Array.from(this.visibilityByHostSlug, ([e, n]) => {
      let index = e.indexOf("/");
      return {
        host: e.slice(0, index),
        slug: e.slice(index + 1),
        visibility: n,
      };
    });
  }
  clear() {
    this.visibilityByHostSlug.clear();
    this.policyDeniedLogged.clear();
    this.inFlightByHostSlug.clear();
  }
}
//@ chunk-s61vbvea.js:526415-526440 placement
var repoVisibilityCacheRegistry = new HostScoped(() => new RepoVisibilityCache());
//@ chunk-s61vbvea.js:526440-526477 placement
function currentRepoVisibilityCache() {
  return repoVisibilityCacheRegistry.of(getRootSession().host);
}
//@ chunk-s61vbvea.js:526477-526603 placement
/**
 * 可见性缓存的外部访问接口。
 */
var repoVisibilityStore = {
  lookup: (e, n) => currentRepoVisibilityCache().lookup(e, n),
  record: (e, n, r) => currentRepoVisibilityCache().record(e, n, r),
  entries: () => currentRepoVisibilityCache().entries(),
  clear: () => currentRepoVisibilityCache().clear(),
};
//@ chunk-s61vbvea.js:526603-526673 placement
/**
 * 清洗用作缓存键的字符串（只留字母数字与 ._/-，截断 128）。
 */
function sanitizeCacheKey(slug) {
  return slug.replace(/[^a-zA-Z0-9._/-]/g, "").slice(0, 128);
}
//@ chunk-s61vbvea.js:526673-526775 placement
var REPO_VISIBILITY_RESPONSE_SCHEMA = DoctorLazy(() =>
  create({
    visibility: create_26(["public", "private", "internal"]).optional(),
    private: create_6().optional(),
  }),
);
//@ chunk-s61vbvea.js:526775-526929 placement
/**
 * 有效可见性（internal 等按私有主机规则判断为 private）。
 */
function effectiveVisibility(e) {
  if (e.visibility === "public" || e.visibility === "private") return e.visibility;
  return isAllowedGitRemote(`https://${e.host}/${e.slug}`) ? "private" : e.visibility;
}
//@ chunk-s61vbvea.js:526929-527039 placement
/**
 * 检测当前目录的仓库并查询其可见性。
 */
async function checkCurrentRepoVisibility(e, n) {
  let currentRepositoryWithHost = await detectCurrentRepositoryWithHost(e, {
    skipCache: true,
  });
  if (!currentRepositoryWithHost) return null;
  return checkRepoVisibility(
    currentRepositoryWithHost.host,
    currentRepositoryWithHost.owner,
    currentRepositoryWithHost.name,
    n,
  );
}
//@ chunk-s61vbvea.js:527039-527507 placement
async function checkRepoVisibility(host, owner, name, s) {
  let h = `${owner}/${name}`;
  let y = currentRepoVisibilityCache();
  let S = y.lookup(host, h);
  if (S !== undefined) {
    if (s !== undefined) s.lookup = "hit";
    return {
      slug: h,
      host,
      visibility: S,
    };
  }
  let w = y.running(host, h);
  if (w !== undefined) {
    if (s !== undefined) s.lookup = "joined";
    return {
      slug: h,
      host,
      visibility: await w,
    };
  }
  if (s !== undefined) s.lookup = "fetched";
  let R = {};
  let visibility = await y.track(host, h, classifyGitHost(host, owner, name, R), (P) => {
    logVisibilityLookupTiming(R);
    if (P === "unverified") {
      if (y.markPolicyDenied(host, h)) logVisibilityLookupFailed("policy_denied");
    } else y.record(host, h, P);
  });
  return {
    slug: h,
    host,
    visibility,
  };
}
//@ chunk-s61vbvea.js:527507-527685 placement
/**
 * 记录可见性查询耗时（令牌、请求）。
 */
function logVisibilityLookupTiming(e) {
  if (e.tokenMs === undefined) return;
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
function logVisibilityLookupFailed(e) {
  logEvent("tengu_auto_mode_repo_visibility_lookup_failed", {
    reason: fromEnum(e),
  });
}
//@ chunk-s61vbvea.js:527765-528763 placement
async function classifyGitHost(e, n, r, s) {
  if (!isGithubDotCom(e)) {
    let gitHostKind = getGitHostKind(e);
    logVisibilityLookupFailed(
      gitHostKind === "gitlab" || gitHostKind === "bitbucket" ? gitHostKind : "other_host",
    );
    return "unknown";
  }
  let h = `${githubApiBase(e)}/repos/${encodeURIComponent(n)}/${encodeURIComponent(r)}`;
  if (isTelemetryDisabled()) return "unknown";
  if (!isPolicyAllowed("allow_repo_visibility_probe")) return "unverified";
  let y;
  let S = () => {
    if (s !== undefined && y !== undefined) s.requestMs ??= Date.now() - y;
  };
  try {
    let now = Date.now();
    let R = await ghTokenOrNull(e);
    if (s !== undefined) {
      s.tokenMs = Date.now() - now;
      s.hadToken = R !== null;
    }
    y = Date.now();
    let { data: x } = await externalHttp.get(h, {
      headers: {
        ...(R && {
          Authorization: `Bearer ${R}`,
        }),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": VISIBILITY_API_VERSION,
        "User-Agent": claudeCodeUserAgent(),
      },
      timeout: VISIBILITY_LOOKUP_TIMEOUT_MS,
      signal: AbortSignal.timeout(VISIBILITY_LOOKUP_TIMEOUT_MS),
      maxRedirects: 0,
    });
    S();
    let P = REPO_VISIBILITY_RESPONSE_SCHEMA().safeParse(x);
    if (!P.success) {
      logVisibilityLookupFailed("parse_error");
      return "unknown";
    }
    let visibility = P.data.visibility;
    if (visibility === "public") return "public";
    if (visibility === "private" || visibility === "internal") return "private";
    if (P.data.private === true) return "private";
    if (P.data.private === false) return "public";
    logVisibilityLookupFailed("missing_fields");
    return "unknown";
  } catch {
    S();
    logVisibilityLookupFailed("http_error");
    return "unknown";
  }
}
export {
  sanitizeCacheKey,
  effectiveVisibility,
  repoVisibilityStore,
  isRepoVisibilityCheckEnabled,
  checkCurrentRepoVisibility,
  checkRepoVisibility,
};
