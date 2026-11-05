/**
 * utils/github/repoVisibility.ts
 *
 * 仓库可见性检查（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (14)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:442452-442610 placement
/**
 * 自动模式是否检查仓库可见性（环境变量或配置 repoVisibility）。
 */
function isRepoVisibilityCheckEnabled() {
  if (env.CLAUDE_CODE_EVAL_CONFINED) return false;
  let CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY = antEnv.CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY;
  if (CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY !== undefined) return CLAUDE_CODE_AUTO_MODE_REPO_VISIBILITY;
  return getAutoModeConfigOrDefault()?.repoVisibility === true;
}
//@ chunk-7jxyna5q.js:442610-442638 placement
var VISIBILITY_API_VERSION = "2022-11-28";
var VISIBILITY_LOOKUP_TIMEOUT_MS = 3000;
//@ chunk-7jxyna5q.js:442638-443518 placement
/**
 * 按 主机/仓库 缓存可见性、正在进行的查询与已记录的策略拒绝。
 */
class RepoVisibilityCache {
  visibilityByHostSlug = new Map();
  policyDeniedLogged = new Set();
  inFlightByHostSlug = new Map();
  lookup(host, slug) {
    return this.visibilityByHostSlug.get(`${host}/${slug}`);
  }
  markPolicyDenied(host, ownerRepo) {
    let key = `${host}/${ownerRepo}`;
    if (this.policyDeniedLogged.has(key)) return false;
    this.policyDeniedLogged.add(key);
    return true;
  }
  record(host, ownerRepo, visibility) {
    this.visibilityByHostSlug.set(`${host}/${ownerRepo}`, visibility);
  }
  running(host, ownerRepo) {
    return this.inFlightByHostSlug.get(`${host}/${ownerRepo}`);
  }
  track(host, ownerRepo, visibility, probe) {
    let key = `${host}/${ownerRepo}`;
    let promise = visibility
      .then((value) => {
        if (this.inFlightByHostSlug.get(key) === promise) probe(value);
        return value;
      })
      .finally(() => {
        if (this.inFlightByHostSlug.get(key) === promise) this.inFlightByHostSlug.delete(key);
      });
    this.inFlightByHostSlug.set(key, promise);
    return promise;
  }
  entries() {
    return Array.from(this.visibilityByHostSlug, ([host, entry]) => {
      let index = host.indexOf("/");
      return {
        host: host.slice(0, index),
        slug: host.slice(index + 1),
        visibility: entry,
      };
    });
  }
  clear() {
    this.visibilityByHostSlug.clear();
    this.policyDeniedLogged.clear();
    this.inFlightByHostSlug.clear();
  }
}
//@ chunk-7jxyna5q.js:443518-443543 placement
var repoVisibilityCacheRegistry; // deferred: uses RepoVisibilityCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:443518", () => {
  repoVisibilityCacheRegistry = new HostScoped(() => new RepoVisibilityCache());
});
//@ chunk-7jxyna5q.js:443543-443580 placement
function currentRepoVisibilityCache() {
  return repoVisibilityCacheRegistry.of(getRootSession().host);
}
//@ chunk-7jxyna5q.js:443580-443706 placement
/**
 * 可见性缓存的外部访问接口。
 */
var repoVisibilityStore = {
  lookup: (host, ownerRepo) => currentRepoVisibilityCache().lookup(host, ownerRepo),
  record: (host, ownerRepo, visibility) => currentRepoVisibilityCache().record(host, ownerRepo, visibility),
  entries: () => currentRepoVisibilityCache().entries(),
  clear: () => currentRepoVisibilityCache().clear(),
};
//@ chunk-7jxyna5q.js:443706-443776 placement
/**
 * 清洗用作缓存键的字符串（只留字母数字与 ._/-，截断 128）。
 */
function sanitizeCacheKey(slug) {
  return slug.replace(/[^a-zA-Z0-9._/-]/g, "").slice(0, 128);
}
//@ chunk-7jxyna5q.js:443776-443878 placement
var REPO_VISIBILITY_RESPONSE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:443776", () => {
  REPO_VISIBILITY_RESPONSE_SCHEMA = DoctorLazy(() =>
    create({
      visibility: create_26(["public", "private", "internal"]).optional(),
      private: create_6().optional(),
    }),
  );
});
//@ chunk-7jxyna5q.js:443878-444032 placement
/**
 * 有效可见性（internal 等按私有主机规则判断为 private）。
 */
function effectiveVisibility(lookup) {
  if (lookup.visibility === "public" || lookup.visibility === "private") return lookup.visibility;
  return isAllowedGitRemote(`https://${lookup.host}/${lookup.slug}`) ? "private" : lookup.visibility;
}
//@ chunk-7jxyna5q.js:444032-444142 placement
/**
 * 检测当前目录的仓库并查询其可见性。
 */
async function checkCurrentRepoVisibility(lookup, unused) {
  let currentRepositoryWithHost = await detectCurrentRepositoryWithHost(lookup, {
    skipCache: true,
  });
  if (!currentRepositoryWithHost) return null;
  return checkRepoVisibility(
    currentRepositoryWithHost.host,
    currentRepositoryWithHost.owner,
    currentRepositoryWithHost.name,
    unused,
  );
}
//@ chunk-7jxyna5q.js:444142-444610 placement
async function checkRepoVisibility(host, owner, name, owner_2) {
  let slug = `${owner}/${name}`;
  let cache = currentRepoVisibilityCache();
  let cached = cache.lookup(host, slug);
  if (cached !== undefined) {
    if (owner_2 !== undefined) owner_2.lookup = "hit";
    return {
      slug,
      host,
      visibility: cached,
    };
  }
  let inFlight = cache.running(host, slug);
  if (inFlight !== undefined) {
    if (owner_2 !== undefined) owner_2.lookup = "joined";
    return {
      slug,
      host,
      visibility: await inFlight,
    };
  }
  if (owner_2 !== undefined) owner_2.lookup = "fetched";
  let record = {};
  let visibility = await cache.track(host, slug, classifyGitHost(host, owner, name, record), (result) => {
    logVisibilityLookupTiming(record);
    if (result === "unverified") {
      if (cache.markPolicyDenied(host, slug)) logVisibilityLookupFailed("policy_denied");
    } else cache.record(host, slug, result);
  });
  return {
    slug,
    host,
    visibility,
  };
}
//@ chunk-7jxyna5q.js:444610-444788 placement
/**
 * 记录可见性查询耗时（令牌、请求）。
 */
function logVisibilityLookupTiming(record) {
  if (record.tokenMs === undefined) return;
  try {
    logEvent("tengu_auto_mode_repo_visibility_lookup_timed", {
      token_ms: record.tokenMs,
      had_token: record.hadToken,
      request_ms: record.requestMs,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7jxyna5q.js:444788-444868 placement
function logVisibilityLookupFailed(record) {
  logEvent("tengu_auto_mode_repo_visibility_lookup_failed", {
    reason: fromEnum(record),
  });
}
//@ chunk-7jxyna5q.js:444868-445866 placement
async function classifyGitHost(host, owner, name, record) {
  if (!isGithubDotCom(host)) {
    let gitHostKind = getGitHostKind(host);
    logVisibilityLookupFailed(
      gitHostKind === "gitlab" || gitHostKind === "bitbucket" ? gitHostKind : "other_host",
    );
    return "unknown";
  }
  let url = `${githubApiBase(host)}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
  if (isTelemetryDisabled()) return "unknown";
  if (!isPolicyAllowed("allow_repo_visibility_probe")) return "unverified";
  let data;
  let markAnswered = () => {
    if (record !== undefined && data !== undefined) record.requestMs ??= Date.now() - data;
  };
  try {
    let now = Date.now();
    let token = await ghTokenOrNull(host);
    if (record !== undefined) {
      record.tokenMs = Date.now() - now;
      record.hadToken = token !== null;
    }
    data = Date.now();
    let { data: payload } = await externalHttp.get(url, {
      headers: {
        ...(token && {
          Authorization: `Bearer ${token}`,
        }),
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": VISIBILITY_API_VERSION,
        "User-Agent": claudeCodeUserAgent(),
      },
      timeout: VISIBILITY_LOOKUP_TIMEOUT_MS,
      signal: AbortSignal.timeout(VISIBILITY_LOOKUP_TIMEOUT_MS),
      maxRedirects: 0,
    });
    markAnswered();
    let parsed = REPO_VISIBILITY_RESPONSE_SCHEMA().safeParse(payload);
    if (!parsed.success) {
      logVisibilityLookupFailed("parse_error");
      return "unknown";
    }
    let visibility = parsed.data.visibility;
    if (visibility === "public") return "public";
    if (visibility === "private" || visibility === "internal") return "private";
    if (parsed.data.private === true) return "private";
    if (parsed.data.private === false) return "public";
    logVisibilityLookupFailed("missing_fields");
    return "unknown";
  } catch {
    markAnswered();
    logVisibilityLookupFailed("http_error");
    return "unknown";
  }
}
export {
  checkCurrentRepoVisibility,
  sanitizeCacheKey,
  effectiveVisibility,
  checkRepoVisibility,
  isRepoVisibilityCheckEnabled,
  repoVisibilityStore,
};
