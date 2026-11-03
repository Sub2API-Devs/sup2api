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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text, Box } from "../../ink/components/Text.js";
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

//@ chunk-ah34pb7m.js:29385-29468 affinity
function countSearchResultBlocks(m) {
  let d = 0;
  for (let c of m) if (c != null && typeof c !== "string") d++;
  return d;
}
/**
 * WebSearch 进度渲染：query_update 显示 "Searching: …"，search_results_received 显示结果数。
 */
//@ chunk-ah34pb7m.js:29468-29830 fingerprint = renderToolUseProgressMessage (0.651)
function renderToolUseProgressMessage_4(progressMessages) {
  if (progressMessages.length === 0) return null;
  let at = progressMessages.at(-1);
  if (!at?.data) return null;
  let data = at.data;
  switch (data.type) {
    case "query_update":
      return e(MessageResponse, {
        children: r(Text, { dimColor: !0, children: ["Searching: ", data.query] }),
      });
    case "search_results_received":
      return e(MessageResponse, {
        children: r(Text, {
          dimColor: !0,
          children: ["Found ", data.resultCount, ' results for "', data.query, '"'],
        }),
      });
    default:
      return null;
  }
}
/**
 * WebSearch 结果渲染："Did N searches in Xs/ms"。
 */
//@ chunk-ah34pb7m.js:29830-30138 fingerprint = renderToolResultMessage (0.695)
function renderToolResultMessage_9(output) {
  let d = output.searchCount ?? countSearchResultBlocks(output.results ?? []),
    timeDisplay =
      output.durationSeconds >= 1
        ? `${Math.round(output.durationSeconds)}s`
        : `${Math.round(output.durationSeconds * 1000)}ms`;
  return e(Box, {
    justifyContent: "space-between",
    width: "100%",
    children: e(MessageResponse, {
      height: 1,
      children: r(Text, { children: ["Did ", d, " search", d !== 1 ? "es" : "", " in ", timeDisplay] }),
    }),
  });
}
/**
 * 子代理 UI 用：本次是否有搜索或读取动作（searchCount 或 readCount > 0）。
 */
//@ chunk-ah34pb7m.js:243111-243164 fingerprint = getSearchSummary (0.655)
function hasSearchOrReadActivity(results) {
  return results.searchCount > 0 || results.readCount > 0;
}
//@ chunk-kxyd0g16.js:39121-39381 placement
var CcrWebSearchResponseSchema = DoctorLazy(() =>
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
      error: create({ error_type: create_2(), error_message: create_2() }).nullable().optional(),
    }),
  ),
  WEB_SEARCH_TIMEOUT_MS = 1e4,
  gs = OUTPUT_SIZE_LIMITS,
  MAX_SNIPPET_CHARS = 500,
  MAX_RESULT_BYTES = 2048;
//@ chunk-kxyd0g16.js:39381-39494 placement
function shouldUseCcrWebSearchProxy(e) {
  if (getAPIProvider() !== "firstParty") return !1;
  if (!env.CLAUDE_CODE_WEBSEARCH_USE_CCR_PROXY) return !1;
  return !!ccrSessionIdForRefs(e);
}
/**
 * 经 CCR 代理（route "web-search"）执行搜索；CLAUDE_CODE_WEBSEARCH_CITATIONS 开启时保留并截断 snippet、标题，丢弃超长 URL。
 */
//@ chunk-kxyd0g16.js:39494-40157 callgraph-fingerprint = renderToolUseMessage (0.208)
async function ccrProxyWebSearch(e, r, n, s, f) {
  let h = await fetchViaCcrWorker({
    session: e,
    route: "web-search",
    toolName: "WebSearch",
    logLabel: "websearch-proxy",
    targetErrorLabel: "search error",
    body: {
      query: r,
      ...(s?.allowed_domains?.length && { allowed_domains: s.allowed_domains }),
      ...(s?.blocked_domains?.length && { blocked_domains: s.blocked_domains }),
      ...(f && { search_profile: f }),
    },
    schema: CcrWebSearchResponseSchema(),
    signal: n,
  });
  if (!h.ok) return h;
  let y = gs;
  return {
    ok: !0,
    results: h.data.results
      .filter((k) => k.url)
      .flatMap((k) => {
        if (!env.CLAUDE_CODE_WEBSEARCH_CITATIONS) return [{ title: k.title, url: k.url }];
        if (yt(k.url, MAX_RESULT_BYTES) !== k.url) return [];
        let w = yt(k.snippet, Math.min(WEB_SEARCH_TIMEOUT_MS, y));
        return (
          (y -= w.length),
          [{ title: yt(k.title, MAX_SNIPPET_CHARS), url: k.url, ...(w && { snippet: w }) }]
        );
      }),
  };
}
//@ chunk-kxyd0g16.js:40157-40238 sole-consumer
function yt(e, r) {
  return neutralizeForgedMarkup(
    neutralizeConfusableTags("system-reminder", truncateToLength(e.trimStart(), r)),
    RESERVED_XML_TAGS,
  ).trim();
}

export {
  hasSearchOrReadActivity,
  renderToolResultMessage_9,
  renderToolUseProgressMessage_4,
  shouldUseCcrWebSearchProxy,
  ccrProxyWebSearch,
};
