/**
 * tools/WebSearchTool/UI.tsx
 *
 * WebSearch 进度与结果渲染（混入一个触发判定 schema）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/WebSearchTool/UI.tsx
 * pieces: chunk-ah34pb7m.js (4), chunk-kxyd0g16.js (4)
 * attribution: affinity 1, fingerprint 3, placement 2, callgraph-fingerprint 1, sole-consumer 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_15, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { OUTPUT_SIZE_LIMITS } from "../../constants/outputLimits.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { env } from "../../utils/env.js";
import { ccrSessionIdForRefs } from "../../utils/claudeAiSync/sessionRefsGate.js";
import { fetchViaCcrWorker } from "../WebFetchTool/ccrWorkerFetch.js";
import { neutralizeForgedMarkup } from "../../utils/subagentOutputScan.js";
import { neutralizeConfusableTags } from "../../utils/confusables.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { RESERVED_XML_TAGS } from "../../constants/xml.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-kxyd0g16.js:39121-39381 placement
/**
 * CCR 网页搜索代理结果的缓存值。
 */
var CcrWebSearchResponseSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var WEB_SEARCH_TIMEOUT_MS;
var ccrWebSearchResult;
var MAX_SNIPPET_CHARS;
var MAX_RESULT_BYTES;
deferInit("chunk-kxyd0g16.js:39121", () => {
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
  ccrWebSearchResult = OUTPUT_SIZE_LIMITS;
  MAX_SNIPPET_CHARS = 500;
  MAX_RESULT_BYTES = 2048;
});
//@ chunk-kxyd0g16.js:39381-39494 placement
function shouldUseCcrWebSearchProxy(session) {
  if (getAPIProvider() !== "firstParty") return false;
  if (!env.CLAUDE_CODE_WEBSEARCH_USE_CCR_PROXY) return false;
  return !!ccrSessionIdForRefs(session);
}
//@ chunk-kxyd0g16.js:39494-40157 callgraph-fingerprint = renderToolUseMessage (0.208)
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
  let remainingChars = ccrWebSearchResult;
  return {
    ok: true,
    results: viaCcrWorker.data.results
      .filter((result) => result.url)
      .flatMap((result) => {
        if (!env.CLAUDE_CODE_WEBSEARCH_CITATIONS)
          return [
            {
              title: result.title,
              url: result.url,
            },
          ];
        if (sanitizeSearchText(result.url, MAX_RESULT_BYTES) !== result.url) return [];
        let snippet = sanitizeSearchText(result.snippet, Math.min(WEB_SEARCH_TIMEOUT_MS, remainingChars));
        remainingChars -= snippet.length;
        return [
          {
            title: sanitizeSearchText(result.title, MAX_SNIPPET_CHARS),
            url: result.url,
            ...(snippet && {
              snippet,
            }),
          },
        ];
      }),
  };
}
//@ chunk-kxyd0g16.js:40157-40238 sole-consumer
/**
 * 对搜索结果文本做截断与伪造标签中和，避免注入。
 */
function sanitizeSearchText(text, maxChars) {
  return neutralizeForgedMarkup(
    neutralizeConfusableTags("system-reminder", truncateToLength(text.trimStart(), maxChars)),
    RESERVED_XML_TAGS,
  ).trim();
}
//@ chunk-ah34pb7m.js:29385-29468 affinity
function countSearchResultBlocks(blocks) {
  let count = 0;
  for (let block of blocks) if (block != null && typeof block !== "string") count++;
  return count;
}
//@ chunk-ah34pb7m.js:29468-29830 fingerprint = renderToolUseProgressMessage (0.651)
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
//@ chunk-ah34pb7m.js:29830-30138 fingerprint = renderToolResultMessage (0.695)
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
//@ chunk-ah34pb7m.js:243111-243164 fingerprint = getSearchSummary (0.655)
/**
 * 子代理 UI 用：本次是否有搜索或读取动作（searchCount 或 readCount > 0）。
 */
function hasSearchOrReadActivity(results) {
  return results.searchCount > 0 || results.readCount > 0;
}
export {
  hasSearchOrReadActivity,
  renderToolResultMessage_9,
  renderToolUseProgressMessage_4,
  shouldUseCcrWebSearchProxy,
  ccrProxyWebSearch,
};
