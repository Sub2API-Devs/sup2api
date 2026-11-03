/**
 * utils/plugins/pluginDirectorySearch.ts
 *
 * 2.1.316 新增。搜索插件目录，受组织策略 allow_plugin_directory_search 控制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-snyt4d6y.js (11)
 * attribution: placement 11
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, array, literal, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { normalizeGithubRepoSlug } from "./parseMarketplaceInput.js";
import { isUnsafeRemoteUrl, isGithubDotCom, isHost } from "../git/githubUrl.js";
import { isAnthropicsGithubRepo } from "./schemas.js";
import {
  isPolicyAllowed,
  policyDenyKind,
  policyDeniedReason,
} from "../../services/policyLimits/policyVerdicts.js";
import { pluginDirectoryPolicyBlock } from "./marketplacePolicy.js";
import { truncateToLength } from "../stringUtils.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { apiClient } from "../../services/routines/routinesApi.js";
import { PLUGIN_DIRECTORY_API_PATH } from "../telemetry/memorySummary.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { classifyAxiosError } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { isPlainObject } from "../isPlainObject.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-snyt4d6y.js:759-1347 placement
/**
 * 插件目录搜索的上限与 schema
 */
var PLUGIN_DIRECTORY_LIMITS = 25;
var PUBLIC = "public";
var PLUGIN_DIRECTORY_MAX_RESULTS = 3;
var PLUGIN_DIRECTORY_MAX_PAGES = 200;
var MAX_DIRECTORY_QUERY_LENGTH = 8000;
var DIRECTORY_SEARCH_CACHE_TTL_MS = 3600000;
var MAX_DIRECTORY_RESPONSE_BYTES = 8388608;
var directoryPageSchema = DoctorLazy(() =>
  u({
    id: string().min(1),
    name: string().min(1),
    summary: string().optional().catch(undefined),
    description: string().optional().catch(undefined),
    release: u({
      version: string(),
    })
      .optional()
      .catch(undefined),
    publisher: u({
      name: string(),
    })
      .optional()
      .catch(undefined),
    links: u({
      documentation: string().optional().catch(undefined),
    })
      .optional()
      .catch(undefined),
    surfaces: array(string()).optional().catch(undefined),
    source: u({
      type: literal("directory"),
      repository: u({
        url: string().min(1),
        path: string().optional(),
        reviewed_commit: string().optional(),
      }),
    }),
    checks: u({
      review: u({
        state: string(),
        by: u({
          type: string(),
        })
          .optional()
          .catch(undefined),
      }),
    }),
  }),
);
//@ chunk-snyt4d6y.js:1347-1395 placement
function parseDirectoryListing(e) {
  return directoryPageSchema().safeParse(stripNullFields(e)).data;
}
//@ chunk-snyt4d6y.js:1395-1575 placement
/**
 * 插件目录仓库地址是否允许
 */
function isAllowedDirectoryRepoUrl(url) {
  if (normalizeGithubRepoSlug(url) !== null) return true;
  if (!url.startsWith("https://") || isUnsafeRemoteUrl(url)) return false;
  let n;
  try {
    n = new URL(url);
  } catch {
    return false;
  }
  return !isGithubDotCom(n.hostname) && !isHost(n.hostname, "ssh.github.com");
}
//@ chunk-snyt4d6y.js:1575-1782 placement
function isDirectoryListingReviewerMarked(listing) {
  let { state, by } = listing.checks.review;
  if (state !== "done") return false;
  switch (by?.type) {
    case "partner":
      return isAllowedDirectoryRepoUrl(listing.source.repository.url);
    case "anthropic":
      return isAnthropicsGithubRepo(listing.source.repository.url);
    default:
      return false;
  }
}
//@ chunk-snyt4d6y.js:1782-1847 placement
var directoryPageWrapperSchema = DoctorLazy(() =>
  u({
    data: array(unknown()).nullish(),
    next_page: string().nullish(),
  }),
);
//@ chunk-snyt4d6y.js:1847-1918 placement
function isPluginDirectoryAccessAllowed() {
  return isPolicyAllowed("allow_plugin_directory_search") && pluginDirectoryPolicyBlock() === null;
}
//@ chunk-snyt4d6y.js:1918-2149 placement
function pluginDirectoryPolicyRefusalReason() {
  let e = policyDenyKind("allow_plugin_directory_search");
  return (
    (e === "cache_miss" || e === "unregistered"
      ? null
      : policyDeniedReason("allow_plugin_directory_search", "it", "is")) ??
    "your organization's policy could not be checked yet; try again in a moment"
  );
}
//@ chunk-snyt4d6y.js:2149-2223 placement
function pluginDirectoryUnavailableCause() {
  if (isPluginDirectoryAccessAllowed() || pluginDirectoryPolicyBlock() !== null) return null;
  return "policy-not-known";
}
//@ chunk-snyt4d6y.js:2223-5454 placement
/**
 * 搜索插件目录，受组织策略 allow_plugin_directory_search 控制。
 */
async function searchPluginDirectory({
  query,
  pageToken,
  signal,
  pageSize = PLUGIN_DIRECTORY_LIMITS,
  include,
  keepTokenWhenEmpty = false,
}) {
  let M = truncateToLength(query.trim(), PLUGIN_DIRECTORY_MAX_PAGES);
  let l = M !== "";
  let d = pageToken !== undefined;
  let startTime = performance.now();
  if (!isPolicyAllowed("allow_plugin_directory_search")) {
    let i = policyDenyKind("allow_plugin_directory_search");
    logDirectorySearch("unavailable", startTime, l, d, {
      cause: fromEnum("policy"),
    });
    logFeatureBad(
      "plugin_directory_search",
      i === "org_denied"
        ? "policy_denied"
        : i === "unregistered"
          ? "policy_mirror_unregistered"
          : i === "route_missing"
            ? "policy_route_missing"
            : "policy_cache_miss",
    );
    return {
      ok: false,
      reason: "unavailable",
      cause: "policy",
      message:
        (i === "cache_miss" || i === "unregistered"
          ? null
          : policyDeniedReason("allow_plugin_directory_search", "it", "is")) ??
        "your organization's policy could not be checked yet; try again in a moment",
      blockedBy: i === "org_denied" || i === "latched" ? "policy_limit" : undefined,
    };
  }
  let C = pluginDirectoryPolicyBlock();
  if (C !== null) {
    logDirectorySearch("unavailable", startTime, l, d, {
      cause: fromEnum("policy"),
    });
    return {
      ok: false,
      reason: "unavailable",
      cause: "policy",
      message: "it is blocked by your organization",
      blockedBy: C,
    };
  }
  let E = [];
  let v = 0;
  let S = 0;
  let b = pageToken;
  try {
    do {
      let uRLSearchParams = new URLSearchParams({
        limit: String(pageSize),
        visibility: PUBLIC,
      });
      if (include !== undefined) uRLSearchParams.set("include", include);
      if (l) uRLSearchParams.set("q", M);
      if (b !== undefined) uRLSearchParams.set("page", b);
      let r = await apiClient.get(`${PLUGIN_DIRECTORY_API_PATH}?${uRLSearchParams}`, {
        auth: "none",
        publicPluginDirectoryCatalog: true,
        timeout: MAX_DIRECTORY_QUERY_LENGTH,
        maxContentLength: MAX_DIRECTORY_RESPONSE_BYTES,
        signal,
        validateStatus: () => true,
      });
      S++;
      if (!r.ok) {
        let y = r.reason === "essential-traffic-only";
        let R = y ? "essential-traffic-only" : "data-residency";
        logDirectorySearch("unavailable", startTime, l, d, {
          cause: fromEnum(R),
        });
        logFeatureSad("plugin_directory_search", y ? "essential_traffic_only" : "data_residency");
        return {
          ok: false,
          reason: "unavailable",
          cause: R,
        };
      }
      if (r.status === 404) {
        logDirectorySearch("not_served", startTime, l, d, {
          http_status: 404,
        });
        logFeatureSad("plugin_directory_search", "not_served");
        return {
          ok: false,
          reason: "not-served",
        };
      }
      if (r.status >= 400) {
        logDirectorySearch("failed", startTime, l, d, {
          error_kind: fromEnum("http"),
          http_status: r.status,
        });
        logFeatureBad("plugin_directory_search", `http_${r.status}`);
        let y;
        if (r.status === 400 && d)
          y = "it could not continue this results page; search again to start from the first page";
        else if (r.status === 429 || r.status >= 500) y = "it is temporarily unavailable; try again shortly";
        else y = `the request failed (HTTP ${r.status})`;
        let R = r.status === 429 || r.status === 503 ? r.response.headers["retry-after"] : undefined;
        let retryAfterMs = parseRetryAfterMs(typeof R === "string" ? R : undefined);
        return {
          ok: false,
          reason: "failed",
          message: y,
          ...(retryAfterMs !== undefined && {
            retryAfterMs: Math.min(retryAfterMs, DIRECTORY_SEARCH_CACHE_TTL_MS),
          }),
        };
      }
      let x = directoryPageWrapperSchema().safeParse(r.data);
      if (!x.success) {
        logDirectorySearch("failed", startTime, l, d, {
          error_kind: fromEnum("invalid_schema"),
        });
        logFeatureBad("plugin_directory_search", "invalid_schema");
        return {
          ok: false,
          reason: "failed",
          message: "it returned a response Claude Code could not read",
        };
      }
      for (let y of x.data.data ?? []) {
        let directoryListing = parseDirectoryListing(y);
        if (directoryListing) E.push(directoryListing);
        else v++;
      }
      b = x.data.next_page || undefined;
    } while (E.length < pageSize && b !== undefined && S < PLUGIN_DIRECTORY_MAX_RESULTS);
    let i = E.length === 0 && b !== undefined;
    let k = i && !keepTokenWhenEmpty;
    if (k) b = undefined;
    logDirectorySearch("success", startTime, l, d, {
      result_count: E.length,
      skipped_count: v,
      request_count: S,
      has_more: b !== undefined,
      chase_exhausted: i,
    });
    logFeatureOk("plugin_directory_search");
    return {
      ok: true,
      page: {
        listings: E,
        nextPageToken: b,
        skippedRows: v,
        truncated: k || undefined,
      },
    };
  } catch (error) {
    if (signal?.aborted)
      return {
        ok: false,
        reason: "aborted",
      };
    let { kind, status, message } = classifyAxiosError(error);
    logForDebugging(`plugin directory search failed (${kind}${status ? ` ${status}` : ""}): ${message}`);
    logDirectorySearch("failed", startTime, l, d, {
      error_kind: fromEnum(kind),
      ...(status !== undefined && {
        http_status: status,
      }),
    });
    logFeatureBad("plugin_directory_search", kind);
    return {
      ok: false,
      reason: "failed",
      message:
        status === undefined && kind !== "other"
          ? "it could not be reached; check your network connection"
          : "the request failed",
    };
  }
}
//@ chunk-snyt4d6y.js:5454-5595 placement
function stripNullFields(e) {
  if (Array.isArray(e)) return e.map(stripNullFields);
  if (isPlainObject(e)) {
    let n = {};
    for (let [key, value] of Object.entries(e)) if (value !== null) n[key] = stripNullFields(value);
    return n;
  }
  return e;
}
//@ chunk-snyt4d6y.js:5595-5749 placement
/**
 * 记录插件目录搜索遥测
 */
function logDirectorySearch(e, n, hasQuery, isContinuation, P = {}) {
  logEvent("tengu_plugin_directory_search", {
    outcome: fromEnum(e),
    has_query: hasQuery,
    is_continuation: isContinuation,
    duration_ms: Math.round(performance.now() - n),
    ...P,
  });
}
export {
  parseDirectoryListing,
  searchPluginDirectory,
  isPluginDirectoryAccessAllowed,
  isDirectoryListingReviewerMarked,
};
