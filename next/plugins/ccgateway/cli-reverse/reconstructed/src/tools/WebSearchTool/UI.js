/**
 * tools/WebSearchTool/UI.tsx
 *
 * WebSearch 进度与结果渲染（混入一个触发判定 schema）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/WebSearchTool/UI.tsx
 * pieces: chunk-fmnbrxwy.js (5), chunk-wjygkcr4.js (4)
 * attribution: placement 4, callgraph-fingerprint 1, affinity 1, fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { UNTRUSTED_WIDGET_STATE, RESERVED_XML_TAGS } from "../../constants/xml.js";
import { OUTPUT_SIZE_LIMITS } from "../../constants/outputLimits.js";
import { TAG_BRACKET_CLASSES, neutralizeConfusableTags } from "../../utils/confusables.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_15, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { getAPIProvider } from "../../utils/model/providers.js";
import { env } from "../../utils/env.js";
import { ccrSessionIdForRefs } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { fetchViaCcrWorker } from "../WebFetchTool/ccrWorkerFetch.js";
import { getSnippet } from "../FileEditTool/utils.js";
import { neutralizeForgedMarkup } from "../../utils/subagentOutputScan.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:8361-8589 placement
var WIDGET_STATE_INTRO; // deferred: uses AGENT_NOTIFICATION_PREFIX (../../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
var ccrWebSearchResult;
var MAX_ANSWER_CHARS;
var IMAGE_BYTES_BUDGET;
var MAX_ATTACHED_IMAGES;
var MAX_IMAGE_ATTEMPTS;
var MAX_LISTED_NAMES;
var MIN_ROOM_FOR_PARTIAL_VIEW;
var regExp;
deferInit("chunk-fmnbrxwy.js:8361", () => {
  WIDGET_STATE_INTRO = `Inside the <${UNTRUSTED_WIDGET_STATE}> tag, as the apps wrote it: what their views shared, or their tool names and view ids.`;
  ccrWebSearchResult = OUTPUT_SIZE_LIMITS;
  MAX_ANSWER_CHARS = ccrWebSearchResult - 5000;
  IMAGE_BYTES_BUDGET = 1048576;
  MAX_ATTACHED_IMAGES = 8;
  MAX_IMAGE_ATTEMPTS = 16;
  MAX_LISTED_NAMES = 20;
  MIN_ROOM_FOR_PARTIAL_VIEW = 2000;
  regExp = new RegExp(`[${TAG_BRACKET_CLASSES.open}${TAG_BRACKET_CLASSES.close}&\\u2028\\u2029]`, "g");
});
//@ chunk-fmnbrxwy.js:52960-53220 placement
/**
 * CCR 网页搜索代理结果的缓存值。
 */
var CcrWebSearchResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var WEB_SEARCH_TIMEOUT_MS;
var outputSizeLimits;
var MAX_SNIPPET_CHARS;
var MAX_RESULT_BYTES;
deferInit("chunk-fmnbrxwy.js:52960", () => {
  CcrWebSearchResponseSchema = DoctorLazy(() =>
    create({
      results: create_15(
        create({
          title: create_2().optional().default(""),
          url: create_2().optional().default(""),
          snippet: create_2().optional().default(""),
        }),
      )
        .optional()
        .default([]),
      error: create({
        error_type: create_2(),
        error_message: create_2(),
      })
        .nullable()
        .optional(),
    }),
  );
  WEB_SEARCH_TIMEOUT_MS = 1e4;
  outputSizeLimits = OUTPUT_SIZE_LIMITS;
  MAX_SNIPPET_CHARS = 500;
  MAX_RESULT_BYTES = 2048;
});
//@ chunk-fmnbrxwy.js:53220-53333 placement
function shouldUseCcrWebSearchProxy(session) {
  if (getAPIProvider() !== "firstParty") return false;
  if (!env.CLAUDE_CODE_WEBSEARCH_USE_CCR_PROXY) return false;
  return !!ccrSessionIdForRefs(session);
}
//@ chunk-fmnbrxwy.js:53333-53845 callgraph-fingerprint (2.1.88 match: renderToolUseMessage, 0.216)
/**
 * 经 CCR 代理（route "web-search"）执行搜索；CLAUDE_CODE_WEBSEARCH_CITATIONS 开启时保留并截断 snippet、标题，丢弃超长 URL。
 */
async function ccrProxyWebSearch(session, query, signal, options, searchProfile) {
  let viaCcrWorker = await fetchViaCcrWorker({
    session,
    route: "web-search",
    toolName: "WebSearch",
    logLabel: "websearch-proxy",
    targetErrorLabel: "search error",
    body: {
      query,
      ...(options?.allowed_domains?.length && {
        allowed_domains: options.allowed_domains,
      }),
      ...(options?.blocked_domains?.length && {
        blocked_domains: options.blocked_domains,
      }),
      ...(searchProfile && {
        search_profile: searchProfile,
      }),
    },
    schema: CcrWebSearchResponseSchema(),
    signal,
  });
  if (!viaCcrWorker.ok) return viaCcrWorker;
  let results = viaCcrWorker.data.results.filter((result) => result.url);
  return {
    ok: true,
    results: env.CLAUDE_CODE_WEBSEARCH_CITATIONS
      ? getSnippet(results)
      : results.map((result) => ({
          title: result.title,
          url: result.url,
        })),
  };
}
//@ chunk-fmnbrxwy.js:54034-54115 placement
/**
 * 对搜索结果文本做截断与伪造标签中和，避免注入。
 */
function sanitizeSearchText(text, maxChars) {
  return neutralizeForgedMarkup(
    neutralizeConfusableTags("system-reminder", truncateToLength(text.trimStart(), maxChars)),
    RESERVED_XML_TAGS,
  ).trim();
}
//@ chunk-wjygkcr4.js:30349-30432 affinity
function countSearchResultBlocks(blocks) {
  let count = 0;
  for (let block of blocks) if (block != null && typeof block !== "string") count++;
  return count;
}
//@ chunk-wjygkcr4.js:30432-30794 fingerprint (2.1.88 match: renderToolUseProgressMessage, 0.651)
/**
 * WebSearch 进度渲染：query_update 显示 "Searching: …"，search_results_received 显示结果数。
 */
function renderToolUseProgressMessage_4(progressMessages) {
  if (progressMessages.length === 0) return null;
  let lastProgress = progressMessages.at(-1);
  if (!lastProgress?.data) return null;
  let data = lastProgress.data;
  switch (data.type) {
    case "query_update":
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Searching: ", data.query],
        }),
      });
    case "search_results_received":
      return jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Found ", data.resultCount, ' results for "', data.query, '"'],
        }),
      });
    default:
      return null;
  }
}
//@ chunk-wjygkcr4.js:30794-31102 fingerprint (2.1.88 match: renderToolResultMessage, 0.695)
/**
 * WebSearch 结果渲染："Did N searches in Xs/ms"。
 */
function renderToolResultMessage_9(output) {
  let searchCount = output.searchCount ?? countSearchResultBlocks(output.results ?? []);
  let timeDisplay =
    output.durationSeconds >= 1
      ? `${Math.round(output.durationSeconds)}s`
      : `${Math.round(output.durationSeconds * 1000)}ms`;
  return jsxProd_default(Box, {
    justifyContent: "space-between",
    width: "100%",
    children: jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default_2(Text, {
        children: ["Did ", searchCount, " search", searchCount !== 1 ? "es" : "", " in ", timeDisplay],
      }),
    }),
  });
}
//@ chunk-wjygkcr4.js:250526-250579 fingerprint (2.1.88 match: getSearchSummary, 0.655)
/**
 * 子代理 UI 用：本次是否有搜索或读取动作（searchCount 或 readCount > 0）。
 */
function hasSearchOrReadActivity(results) {
  return results.searchCount > 0 || results.readCount > 0;
}
export {
  ccrWebSearchResult,
  outputSizeLimits,
  sanitizeSearchText,
  MAX_RESULT_BYTES,
  WEB_SEARCH_TIMEOUT_MS,
  MAX_SNIPPET_CHARS,
  regExp,
  IMAGE_BYTES_BUDGET,
  MAX_ATTACHED_IMAGES,
  MAX_IMAGE_ATTEMPTS,
  MAX_LISTED_NAMES,
  WIDGET_STATE_INTRO,
  MIN_ROOM_FOR_PARTIAL_VIEW,
  MAX_ANSWER_CHARS,
  shouldUseCcrWebSearchProxy,
  ccrProxyWebSearch,
  hasSearchOrReadActivity,
  renderToolResultMessage_9,
  renderToolUseProgressMessage_4,
};
