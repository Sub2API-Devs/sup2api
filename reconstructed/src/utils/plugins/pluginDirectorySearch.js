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
import {
  objectSchema,
  stringSchema,
  array,
  literal,
  unknown,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
  objectSchema({
    id: stringSchema().min(1),
    name: stringSchema().min(1),
    summary: stringSchema().optional().catch(undefined),
    description: stringSchema().optional().catch(undefined),
    release: objectSchema({
      version: stringSchema(),
    })
      .optional()
      .catch(undefined),
    publisher: objectSchema({
      name: stringSchema(),
    })
      .optional()
      .catch(undefined),
    links: objectSchema({
      documentation: stringSchema().optional().catch(undefined),
    })
      .optional()
      .catch(undefined),
    surfaces: array(stringSchema()).optional().catch(undefined),
    source: objectSchema({
      type: literal("directory"),
      repository: objectSchema({
        url: stringSchema().min(1),
        path: stringSchema().optional(),
        reviewed_commit: stringSchema().optional(),
      }),
    }),
    checks: objectSchema({
      review: objectSchema({
        state: stringSchema(),
        by: objectSchema({
          type: stringSchema(),
        })
          .optional()
          .catch(undefined),
      }),
    }),
  }),
);
//@ chunk-snyt4d6y.js:1347-1395 placement
function parseDirectoryListing(listing) {
  return directoryPageSchema().safeParse(stripNullFields(listing)).data;
}
//@ chunk-snyt4d6y.js:1395-1575 placement
/**
 * 插件目录仓库地址是否允许
 */
function isAllowedDirectoryRepoUrl(url) {
  if (normalizeGithubRepoSlug(url) !== null) return true;
  if (!url.startsWith("https://") || isUnsafeRemoteUrl(url)) return false;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return !isGithubDotCom(parsed.hostname) && !isHost(parsed.hostname, "ssh.github.com");
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
  objectSchema({
    data: array(unknown()).nullish(),
    next_page: stringSchema().nullish(),
  }),
);
//@ chunk-snyt4d6y.js:1847-1918 placement
function isPluginDirectoryAccessAllowed() {
  return isPolicyAllowed("allow_plugin_directory_search") && pluginDirectoryPolicyBlock() === null;
}
//@ chunk-snyt4d6y.js:1918-2149 placement
function pluginDirectoryPolicyRefusalReason() {
  let kind = policyDenyKind("allow_plugin_directory_search");
  return (
    (kind === "cache_miss" || kind === "unregistered"
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
  let trimmedQuery = truncateToLength(query.trim(), PLUGIN_DIRECTORY_MAX_PAGES);
  let hasQuery = trimmedQuery !== "";
  let isContinuation = pageToken !== undefined;
  let startTime = performance.now();
  if (!isPolicyAllowed("allow_plugin_directory_search")) {
    let kind = policyDenyKind("allow_plugin_directory_search");
    logDirectorySearch("unavailable", startTime, hasQuery, isContinuation, {
      cause: fromEnum("policy"),
    });
    logFeatureBad(
      "plugin_directory_search",
      kind === "org_denied"
        ? "policy_denied"
        : kind === "unregistered"
          ? "policy_mirror_unregistered"
          : kind === "route_missing"
            ? "policy_route_missing"
            : "policy_cache_miss",
    );
    return {
      ok: false,
      reason: "unavailable",
      cause: "policy",
      message:
        (kind === "cache_miss" || kind === "unregistered"
          ? null
          : policyDeniedReason("allow_plugin_directory_search", "it", "is")) ??
        "your organization's policy could not be checked yet; try again in a moment",
      blockedBy: kind === "org_denied" || kind === "latched" ? "policy_limit" : undefined,
    };
  }
  let block = pluginDirectoryPolicyBlock();
  if (block !== null) {
    logDirectorySearch("unavailable", startTime, hasQuery, isContinuation, {
      cause: fromEnum("policy"),
    });
    return {
      ok: false,
      reason: "unavailable",
      cause: "policy",
      message: "it is blocked by your organization",
      blockedBy: block,
    };
  }
  let listings = [];
  let skipped = 0;
  let requestCount = 0;
  let nextToken = pageToken;
  try {
    do {
      let uRLSearchParams = new URLSearchParams({
        limit: String(pageSize),
        visibility: PUBLIC,
      });
      if (include !== undefined) uRLSearchParams.set("include", include);
      if (hasQuery) uRLSearchParams.set("q", trimmedQuery);
      if (nextToken !== undefined) uRLSearchParams.set("page", nextToken);
      let response = await apiClient.get(`${PLUGIN_DIRECTORY_API_PATH}?${uRLSearchParams}`, {
        auth: "none",
        publicPluginDirectoryCatalog: true,
        timeout: MAX_DIRECTORY_QUERY_LENGTH,
        maxContentLength: MAX_DIRECTORY_RESPONSE_BYTES,
        signal,
        validateStatus: () => true,
      });
      requestCount++;
      if (!response.ok) {
        let essentialOnly = response.reason === "essential-traffic-only";
        let cause = essentialOnly ? "essential-traffic-only" : "data-residency";
        logDirectorySearch("unavailable", startTime, hasQuery, isContinuation, {
          cause: fromEnum(cause),
        });
        logFeatureSad("plugin_directory_search", essentialOnly ? "essential_traffic_only" : "data_residency");
        return {
          ok: false,
          reason: "unavailable",
          cause,
        };
      }
      if (response.status === 404) {
        logDirectorySearch("not_served", startTime, hasQuery, isContinuation, {
          http_status: 404,
        });
        logFeatureSad("plugin_directory_search", "not_served");
        return {
          ok: false,
          reason: "not-served",
        };
      }
      if (response.status >= 400) {
        logDirectorySearch("failed", startTime, hasQuery, isContinuation, {
          error_kind: fromEnum("http"),
          http_status: response.status,
        });
        logFeatureBad("plugin_directory_search", `http_${response.status}`);
        let message;
        if (response.status === 400 && isContinuation)
          message = "it could not continue this results page; search again to start from the first page";
        else if (response.status === 429 || response.status >= 500)
          message = "it is temporarily unavailable; try again shortly";
        else message = `the request failed (HTTP ${response.status})`;
        let retryAfter =
          response.status === 429 || response.status === 503
            ? response.response.headers["retry-after"]
            : undefined;
        let retryAfterMs = parseRetryAfterMs(typeof retryAfter === "string" ? retryAfter : undefined);
        return {
          ok: false,
          reason: "failed",
          message,
          ...(retryAfterMs !== undefined && {
            retryAfterMs: Math.min(retryAfterMs, DIRECTORY_SEARCH_CACHE_TTL_MS),
          }),
        };
      }
      let parseResult = directoryPageWrapperSchema().safeParse(response.data);
      if (!parseResult.success) {
        logDirectorySearch("failed", startTime, hasQuery, isContinuation, {
          error_kind: fromEnum("invalid_schema"),
        });
        logFeatureBad("plugin_directory_search", "invalid_schema");
        return {
          ok: false,
          reason: "failed",
          message: "it returned a response Claude Code could not read",
        };
      }
      for (let raw of parseResult.data.data ?? []) {
        let directoryListing = parseDirectoryListing(raw);
        if (directoryListing) listings.push(directoryListing);
        else skipped++;
      }
      nextToken = parseResult.data.next_page || undefined;
    } while (
      listings.length < pageSize &&
      nextToken !== undefined &&
      requestCount < PLUGIN_DIRECTORY_MAX_RESULTS
    );
    let chasedOut = listings.length === 0 && nextToken !== undefined;
    let dropToken = chasedOut && !keepTokenWhenEmpty;
    if (dropToken) nextToken = undefined;
    logDirectorySearch("success", startTime, hasQuery, isContinuation, {
      result_count: listings.length,
      skipped_count: skipped,
      request_count: requestCount,
      has_more: nextToken !== undefined,
      chase_exhausted: chasedOut,
    });
    logFeatureOk("plugin_directory_search");
    return {
      ok: true,
      page: {
        listings,
        nextPageToken: nextToken,
        skippedRows: skipped,
        truncated: dropToken || undefined,
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
    logDirectorySearch("failed", startTime, hasQuery, isContinuation, {
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
function stripNullFields(value) {
  if (Array.isArray(value)) return value.map(stripNullFields);
  if (isPlainObject(value)) {
    let result = {};
    for (let [key, value_2] of Object.entries(value))
      if (value_2 !== null) result[key] = stripNullFields(value_2);
    return result;
  }
  return value;
}
//@ chunk-snyt4d6y.js:5595-5749 placement
/**
 * 记录插件目录搜索遥测
 */
function logDirectorySearch(outcome, startTime, hasQuery, isContinuation, extra = {}) {
  logEvent("tengu_plugin_directory_search", {
    outcome: fromEnum(outcome),
    has_query: hasQuery,
    is_continuation: isContinuation,
    duration_ms: Math.round(performance.now() - startTime),
    ...extra,
  });
}
export {
  parseDirectoryListing,
  searchPluginDirectory,
  isPluginDirectoryAccessAllowed,
  isDirectoryListingReviewerMarked,
  pluginDirectoryPolicyRefusalReason,
  pluginDirectoryUnavailableCause,
};
