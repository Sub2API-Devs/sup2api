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
import { u, o, A, T, oe } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { cgr } from "../telemetry/memorySummary.js";
import { parseRetryAfterMs } from "../../bridge/debugUtils.js";
import { classifyAxiosError } from "../errors.js";
import { logForDebugging } from "../debug.js";
import { isPlainObject } from "../isPlainObject.js";
import { logEvent } from "../../services/analytics/index.js";

/**
 * 插件目录搜索的上限与 schema
 */
//@ chunk-snyt4d6y.js:759-1347 placement
var PLUGIN_DIRECTORY_LIMITS = 25,
  PUBLIC = "public",
  B = 3,
  G = 200,
  H = 8000,
  Y = 3600000,
  q = 8388608,
  F = DoctorLazy(() =>
    u({
      id: o().min(1),
      name: o().min(1),
      summary: o()
        .optional()
        .catch(void 0),
      description: o()
        .optional()
        .catch(void 0),
      release: u({ version: o() })
        .optional()
        .catch(void 0),
      publisher: u({ name: o() })
        .optional()
        .catch(void 0),
      links: u({
        documentation: o()
          .optional()
          .catch(void 0),
      })
        .optional()
        .catch(void 0),
      surfaces: A(o())
        .optional()
        .catch(void 0),
      source: u({
        type: T("directory"),
        repository: u({ url: o().min(1), path: o().optional(), reviewed_commit: o().optional() }),
      }),
      checks: u({
        review: u({
          state: o(),
          by: u({ type: o() })
            .optional()
            .catch(void 0),
        }),
      }),
    }),
  );
//@ chunk-snyt4d6y.js:1347-1395 placement
function parseDirectoryListing(e) {
  return F().safeParse(stripNullFields(e)).data;
}
/**
 * 插件目录仓库地址是否允许
 */
//@ chunk-snyt4d6y.js:1395-1575 placement
function isAllowedDirectoryRepoUrl(e) {
  if (normalizeGithubRepoSlug(e) !== null) return !0;
  if (!e.startsWith("https://") || isUnsafeRemoteUrl(e)) return !1;
  let n;
  try {
    n = new URL(e);
  } catch {
    return !1;
  }
  return !isGithubDotCom(n.hostname) && !isHost(n.hostname, "ssh.github.com");
}
//@ chunk-snyt4d6y.js:1575-1782 placement
function isDirectoryListingReviewerMarked(e) {
  let { state: state, by: by } = e.checks.review;
  if (state !== "done") return !1;
  switch (by?.type) {
    case "partner":
      return isAllowedDirectoryRepoUrl(e.source.repository.url);
    case "anthropic":
      return isAnthropicsGithubRepo(e.source.repository.url);
    default:
      return !1;
  }
}
//@ chunk-snyt4d6y.js:1782-1847 placement
var V = DoctorLazy(() => u({ data: A(oe()).nullish(), next_page: o().nullish() }));
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
/**
 * 搜索插件目录，受组织策略 allow_plugin_directory_search 控制。
 */
//@ chunk-snyt4d6y.js:2223-5454 placement
async function searchPluginDirectory({
  query: query,
  pageToken: pageToken,
  signal: signal,
  pageSize: pageSize = PLUGIN_DIRECTORY_LIMITS,
  include: include,
  keepTokenWhenEmpty: keepTokenWhenEmpty = !1,
}) {
  let M = truncateToLength(query.trim(), G),
    l = M !== "",
    d = pageToken !== void 0,
    startTime = performance.now();
  if (!isPolicyAllowed("allow_plugin_directory_search")) {
    let i = policyDenyKind("allow_plugin_directory_search");
    return (
      logDirectorySearch("unavailable", startTime, l, d, { cause: fromEnum("policy") }),
      logFeatureBad(
        "plugin_directory_search",
        i === "org_denied"
          ? "policy_denied"
          : i === "unregistered"
            ? "policy_mirror_unregistered"
            : i === "route_missing"
              ? "policy_route_missing"
              : "policy_cache_miss",
      ),
      {
        ok: !1,
        reason: "unavailable",
        cause: "policy",
        message:
          (i === "cache_miss" || i === "unregistered"
            ? null
            : policyDeniedReason("allow_plugin_directory_search", "it", "is")) ??
          "your organization's policy could not be checked yet; try again in a moment",
        blockedBy: i === "org_denied" || i === "latched" ? "policy_limit" : void 0,
      }
    );
  }
  let C = pluginDirectoryPolicyBlock();
  if (C !== null)
    return (
      logDirectorySearch("unavailable", startTime, l, d, { cause: fromEnum("policy") }),
      {
        ok: !1,
        reason: "unavailable",
        cause: "policy",
        message: "it is blocked by your organization",
        blockedBy: C,
      }
    );
  let E = [],
    v = 0,
    S = 0,
    b = pageToken;
  try {
    do {
      let uRLSearchParams = new URLSearchParams({ limit: String(pageSize), visibility: PUBLIC });
      if (include !== void 0) uRLSearchParams.set("include", include);
      if (l) uRLSearchParams.set("q", M);
      if (b !== void 0) uRLSearchParams.set("page", b);
      let r = await apiClient.get(`${cgr}?${uRLSearchParams}`, {
        auth: "none",
        publicPluginDirectoryCatalog: !0,
        timeout: H,
        maxContentLength: q,
        signal: signal,
        validateStatus: () => !0,
      });
      if ((S++, !r.ok)) {
        let y = r.reason === "essential-traffic-only",
          R = y ? "essential-traffic-only" : "data-residency";
        return (
          logDirectorySearch("unavailable", startTime, l, d, { cause: fromEnum(R) }),
          logFeatureSad("plugin_directory_search", y ? "essential_traffic_only" : "data_residency"),
          { ok: !1, reason: "unavailable", cause: R }
        );
      }
      if (r.status === 404)
        return (
          logDirectorySearch("not_served", startTime, l, d, { http_status: 404 }),
          logFeatureSad("plugin_directory_search", "not_served"),
          { ok: !1, reason: "not-served" }
        );
      if (r.status >= 400) {
        (logDirectorySearch("failed", startTime, l, d, {
          error_kind: fromEnum("http"),
          http_status: r.status,
        }),
          logFeatureBad("plugin_directory_search", `http_${r.status}`));
        let y;
        if (r.status === 400 && d)
          y = "it could not continue this results page; search again to start from the first page";
        else if (r.status === 429 || r.status >= 500) y = "it is temporarily unavailable; try again shortly";
        else y = `the request failed (HTTP ${r.status})`;
        let R = r.status === 429 || r.status === 503 ? r.response.headers["retry-after"] : void 0,
          j = parseRetryAfterMs(typeof R === "string" ? R : void 0);
        return {
          ok: !1,
          reason: "failed",
          message: y,
          ...(j !== void 0 && { retryAfterMs: Math.min(j, Y) }),
        };
      }
      let safeParse = V().safeParse(r.data);
      if (!safeParse.success)
        return (
          logDirectorySearch("failed", startTime, l, d, { error_kind: fromEnum("invalid_schema") }),
          logFeatureBad("plugin_directory_search", "invalid_schema"),
          { ok: !1, reason: "failed", message: "it returned a response Claude Code could not read" }
        );
      for (let y of safeParse.data.data ?? []) {
        let R = parseDirectoryListing(y);
        if (R) E.push(R);
        else v++;
      }
      b = safeParse.data.next_page || void 0;
    } while (E.length < pageSize && b !== void 0 && S < B);
    let i = E.length === 0 && b !== void 0,
      k = i && !keepTokenWhenEmpty;
    if (k) b = void 0;
    return (
      logDirectorySearch("success", startTime, l, d, {
        result_count: E.length,
        skipped_count: v,
        request_count: S,
        has_more: b !== void 0,
        chase_exhausted: i,
      }),
      logFeatureOk("plugin_directory_search"),
      { ok: !0, page: { listings: E, nextPageToken: b, skippedRows: v, truncated: k || void 0 } }
    );
  } catch (error) {
    if (signal?.aborted) return { ok: !1, reason: "aborted" };
    let { kind: kind, status: status, message: message } = classifyAxiosError(error);
    return (
      logForDebugging(`plugin directory search failed (${kind}${status ? ` ${status}` : ""}): ${message}`),
      logDirectorySearch("failed", startTime, l, d, {
        error_kind: fromEnum(kind),
        ...(status !== void 0 && { http_status: status }),
      }),
      logFeatureBad("plugin_directory_search", kind),
      {
        ok: !1,
        reason: "failed",
        message:
          status === void 0 && kind !== "other"
            ? "it could not be reached; check your network connection"
            : "the request failed",
      }
    );
  }
}
//@ chunk-snyt4d6y.js:5454-5595 placement
function stripNullFields(e) {
  if (Array.isArray(e)) return e.map(stripNullFields);
  if (isPlainObject(e)) {
    let n = {};
    for (let [h, w] of Object.entries(e)) if (w !== null) n[h] = stripNullFields(w);
    return n;
  }
  return e;
}
/**
 * 记录插件目录搜索遥测
 */
//@ chunk-snyt4d6y.js:5595-5749 placement
function logDirectorySearch(e, n, h, w, P = {}) {
  logEvent("tengu_plugin_directory_search", {
    outcome: fromEnum(e),
    has_query: h,
    is_continuation: w,
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
