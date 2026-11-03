/**
 * tools/WebSearchTool/WebSearchTool.ts
 *
 * WebSearch 工具：搜索预算、CCR 代理或 web_search_20250305 服务端工具的次级查询，结果映射与引用模式
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/WebSearchTool/WebSearchTool.ts
 * pieces: chunk-kxyd0g16.js (6)
 * attribution: fingerprint 4, placement 1, layout 1
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, A, U, u, Ue, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { getWebSearchFastMode, WEBSEARCH, ALLOW_WEB_SEARCH, getWebSearchPrompt, _Qo } from "./prompt.js";
import { logForDebugging } from "../../utils/debug.js";
import { truncate } from "../../utils/format.js";
import { JT } from "../../constants/outputLimits.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { isPolicyAllowed } from "../../services/policyLimits/policyEvidence.js";
import { getAPIProvider, isClaudePlatformProvider } from "../../utils/model/providers.js";
import { vertexModelSupportsWebSearch } from "../../utils/betas.js";
import { getCanonicalName } from "../../utils/model/canonicalModelName.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { maxWebSearchesPerSession } from "./searchBudget.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { getIsNonInteractiveSession, getStickyBetas } from "../../bootstrap/state.js";
import { plural } from "../../utils/stringUtils.js";
import { showSettingsHint } from "../../utils/entrypointKinds.js";
import { BASH_TOOL_NAME } from "../BashTool/toolName.js";
import { shouldUseCcrWebSearchProxy, ccrProxyWebSearch } from "./UI.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { createUserMessage, extractTextContent_2 } from "../../utils/messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getSmallFastModel } from "../../utils/model/smallFastModel.js";
import { foundrySupportsCapability } from "../../services/api/foundryCapabilities.js";
import { queryModelWithStreaming } from "../../services/api/claude.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { forkStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { env } from "../../utils/env.js";

/**
 * WebSearch 输入 schema：query（≥2 字符）、allowed_domains、blocked_domains；Ts 在快搜实验开启时追加 mode（standard/extended，默认 extended，描述取远程配置）；bs 为单条搜索结果块 schema。
 */
//@ chunk-kxyd0g16.js:40238-40942 fingerprint = inputSchema (0.49)
var webSearchInputSchema = DoctorLazy(() =>
    zodStrictObject({
      query: o().min(2).describe("The search query to use"),
      allowed_domains: A(o()).optional().describe("Only include search results from these domains"),
      blocked_domains: A(o()).optional().describe("Never include search results from these domains"),
    }),
  ),
  webSearchInputSchemaWithMode = DoctorLazy(() =>
    webSearchInputSchema().extend({
      mode: U(["standard", "extended"])
        .describe(getWebSearchFastMode()?.mode_description ?? "")
        .prefault("extended"),
    }),
  ),
  searchResultBlockSchema = DoctorLazy(() => {
    let e = u({
      title: o().describe("The title of the search result"),
      url: o().describe("The URL of the search result"),
      snippet: o().optional().describe("Page text. PostToolUse hooks get it; tool_use_result does not."),
    });
    return u({
      tool_use_id: o().describe("ID of the tool use"),
      content: A(e).describe("Array of search hits"),
    });
  });
/**
 * 返回去掉 snippet 字段的对象（归属疑似错误）。
 */
//@ chunk-kxyd0g16.js:40942-40981 placement = getSnippet (0.688)
function omitSnippet({ snippet: snippet, ...r }) {
  return r;
}
/**
 * WebSearch 输出 schema：query、results（结果块或模型文字混排）、durationSeconds、searchCount。
 */
//@ chunk-kxyd0g16.js:40981-41296 fingerprint = outputSchema (0.735)
var outputSchema = DoctorLazy(() =>
  u({
    query: o().describe("The search query that was executed"),
    results: A(Ue([searchResultBlockSchema(), o()])).describe(
      "Search results and/or text commentary from the model",
    ),
    durationSeconds: E().describe("Time taken to complete the search operation"),
    searchCount: E().optional().describe("Number of web searches performed"),
  }),
);
/**
 * 把次级查询的 content 块整理成输出：server_tool_use 处切分文字段，web_search_tool_result 转成 {tool_use_id, content:[{title,url}]}，错误块转成 "Web search error: <code>"；searchCount 取两类块计数的最大值。
 */
//@ chunk-kxyd0g16.js:41296-41839 fingerprint = makeOutputFromSearchResponse (0.949)
function makeOutputFromSearchResponse(result, query, durationSeconds) {
  let results = [],
    textAcc = "",
    h = 0,
    y = 0;
  for (let block of result) {
    if (block.type === "server_tool_use") {
      if ((h++, textAcc.trim().length > 0)) results.push(textAcc.trim());
      textAcc = "";
      continue;
    }
    if (block.type === "web_search_tool_result") {
      if ((y++, !Array.isArray(block.content))) {
        let errorMessage = `Web search error: ${block.content.error_code}`;
        (logForDebugging(errorMessage, { level: "error" }), results.push(errorMessage));
        continue;
      }
      let hits = block.content.map((S) => ({ title: S.title, url: S.url }));
      results.push({ tool_use_id: block.tool_use_id, content: hits });
    }
    if (block.type === "text") textAcc += block.text;
  }
  if (textAcc.trim().length > 0) results.push(textAcc.trim());
  return { query: query, results: results, durationSeconds: durationSeconds, searchCount: Math.max(h, y) };
}
/**
 * 工具使用摘要：截断后的 query。
 */
//@ chunk-kxyd0g16.js:41839-41901 layout
function getWebSearchToolUseSummary(e) {
  if (!e?.query) return null;
  return truncate(e.query, JT);
}
/**
 * WebSearch 工具定义（name "WebSearch"，shouldDefer，只读可并发，maxResultSizeChars 100000）。isEnabled：需要 allow_web_search 开关，且 API 提供方为 firstParty（或 gI 判定的兼容方）/foundry，vertex 看模型是否支持，gateway 一律关。call：先扣会话/轮次搜索预算（用尽时返回不搜索的说明，禁止用 curl/浏览器绕开）；有 CCR 代理时走代理；否则用 web_search_20250305 服务端工具（max_uses 8，强制 toolChoice）发起一次次级流式查询，从流里解析 query 增量与结果数做进度。checkPermissions 返回 passthrough + localSettings allow 建议。
 */
//@ chunk-kxyd0g16.js:41901-49449 fingerprint = WebSearchTool (0.584)
var WebSearchTool = buildTool({
  name: WEBSEARCH,
  searchHint: "search the web for current information",
  backgrounding: "detach",
  maxResultSizeChars: 1e5,
  shouldDefer: !0,
  async description(e) {
    return `Claude wants to search the web for: ${e.query}`;
  },
  userFacingName() {
    return "Web Search";
  },
  getToolUseSummary: getWebSearchToolUseSummary,
  getActivityDescription(e) {
    let r = getWebSearchToolUseSummary(e);
    return r ? `Searching for ${r}` : "Searching the web";
  },
  isEnabled() {
    if (!isPolicyAllowed(ALLOW_WEB_SEARCH)) return !1;
    let e = getAPIProvider();
    if (e === "firstParty" || isClaudePlatformProvider(e)) return !0;
    if (e === "gateway") return !1;
    if (e === "vertex") return vertexModelSupportsWebSearch(getCanonicalName(getMainLoopModel()));
    if (e === "foundry") return !0;
    return !1;
  },
  get inputSchema() {
    return getWebSearchFastMode() ? webSearchInputSchemaWithMode() : webSearchInputSchema();
  },
  get outputSchema() {
    return outputSchema();
  },
  isConcurrencySafe() {
    return !0;
  },
  isReadOnly() {
    return !0;
  },
  coerceInput(e) {
    if (getWebSearchFastMode() || !isPlainObject(e) || !("mode" in e)) return null;
    let { mode: mode, ...n } = e;
    return { input: n, shapeClass: "mode_while_off" };
  },
  toAutoClassifierInput(e) {
    return e.query;
  },
  async prompt({ model: e, leanPrompt: r }) {
    let n = getWebSearchPrompt(e, r),
      s = getWebSearchFastMode()?.web_search_addendum;
    return s
      ? `${n.trimEnd()}

${s}
`
      : n;
  },
  renderToolUseMessage({ query: e, allowed_domains: r, blocked_domains: n }, { verbose: s }) {
    if (!e) return null;
    let f = "";
    if (e) f += `"${e}"`;
    if (s) {
      if (r && r.length > 0) f += `, only allowing domains: ${r.join(", ")}`;
      if (n && n.length > 0) f += `, blocking domains: ${n.join(", ")}`;
    }
    return f;
  },
  extractSearchText() {
    return "";
  },
  create(e) {
    return {
      async checkPermissions(r) {
        return {
          behavior: "passthrough",
          message: "WebSearchTool requires permission.",
          suggestions: [
            {
              type: "addRules",
              rules: [{ toolName: WEBSEARCH }],
              behavior: "allow",
              destination: "localSettings",
            },
          ],
        };
      },
      async validateInput(r) {
        let { query: query, allowed_domains: allowed_domains, blocked_domains: blocked_domains } = r;
        if (!query.length) return { result: !1, message: "Error: Missing query", errorCode: 1 };
        if (allowed_domains?.length && blocked_domains?.length)
          return {
            result: !1,
            message: "Error: Cannot specify both allowed_domains and blocked_domains in the same request",
            errorCode: 2,
          };
        return { result: !0 };
      },
      async call(r, { signal: n, onProgress: s, timing: f }) {
        let ctx = e,
          startTime = performance.now(),
          { query: query } = r,
          searchProfile = _Qo(r) ? "fast" : void 0,
          webSearchBudget = ctx.taskRegistry.getWebSearchBudget();
        if (!webSearchBudget.tryConsume()) {
          let maxSearches = maxWebSearchesPerSession(),
            refillsPerHour = webSearchBudget.refillsPerHour(),
            msUntilNextCall = webSearchBudget.msUntilNextCall();
          logFeatureBad("tool_web_search", "web_search_session_cap", {
            max_web_searches_per_session: maxSearches,
            web_search_refills_per_hour: refillsPerHour,
            ...(Number.isFinite(msUntilNextCall) && { ms_until_next_web_search: msUntilNextCall }),
          });
          let budgetScope = getIsNonInteractiveSession() ? "turn" : "session",
            Se = `${maxSearches} ${WEBSEARCH} ${plural(maxSearches, "call")}`,
            we = refillsPerHour > 0,
            Cn =
              budgetScope === "turn"
                ? `limit: ${Se} per turn, shared by every agent in it`
                : `limit: ${Se}, shared by every agent in this session; it does not refill`,
            vn = we
              ? `limit: ${Se} shared by every agent in this ${budgetScope}; the budget refills at about ${refillsPerHour} ${plural(refillsPerHour, "call")} per hour, so searching becomes possible again later in the ${budgetScope}`
              : Cn,
            En = we
              ? "Do not pause or wait for the refill: continue with the information already gathered and say so in your answer"
              : "Continue with the information already gathered instead of searching again, and say so in your answer",
            jt = [
              ...(budgetScope === "turn"
                ? ["tell the user they can send a follow-up message after this reply to continue the search"]
                : []),
              ...(showSettingsHint()
                ? [
                    budgetScope === "turn"
                      ? "ask them to raise CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION"
                      : "ask the user to raise CLAUDE_CODE_MAX_WEB_SEARCHES_PER_SESSION",
                  ]
                : []),
            ],
            On = jt.length > 0 ? ` If more searches are genuinely needed, ${jt.join(", or ")}.` : "";
          return {
            data: {
              query: query,
              results: [
                `Web search was not performed: this ${budgetScope}'s web search budget is used up (${vn}). ${En}; do not work around the limit by querying search engines with curl or wget from ${BASH_TOOL_NAME}, by querying them in a browser or through a computer-use tool, or by searching or fetching through a third-party reader, proxy or archive service.${On}`,
              ],
              durationSeconds: 0,
              searchCount: 0,
            },
          };
        }
        if (shouldUseCcrWebSearchProxy(ctx.session)) {
          let ee = f?.mark("external"),
            proxyResult = await ccrProxyWebSearch(
              ctx.session,
              query,
              n,
              { allowed_domains: r.allowed_domains, blocked_domains: r.blocked_domains },
              searchProfile,
            ).finally(ee),
            se = (performance.now() - startTime) / 1000;
          if (!proxyResult.ok)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              jsonStringify({
                error_type: proxyResult.errorType,
                source: proxyResult.source,
                message: proxyResult.errorMessage,
              }),
              "web-search-ccr-proxy",
            );
          if (s)
            s({
              type: "progress",
              toolUseID: "ccr-proxy-search-1",
              data: {
                type: "search_results_received",
                resultCount: proxyResult.results.length,
                query: query,
              },
            });
          return {
            data: {
              query: query,
              results: [
                {
                  tool_use_id: "ccr-proxy-search-1",
                  content:
                    ctx.agentId === void 0 ? proxyResult.results : proxyResult.results.map(omitSnippet),
                },
              ],
              durationSeconds: se,
              searchCount: 1,
            },
          };
        }
        let R = createUserMessage({ content: "Perform a web search for the query: " + query }),
          I = {
            type: "web_search_20250305",
            name: "web_search",
            allowed_domains: r.allowed_domains,
            blocked_domains: r.blocked_domains,
            max_uses: 8,
            ...(searchProfile && { search_profile: searchProfile }),
          },
          searchModel = getFeatureValue_CACHED_MAY_BE_STALE("tengu_plum_vx3", !1)
            ? getSmallFastModel()
            : ctx.mainLoopModel();
        if (getAPIProvider() === "foundry" && !foundrySupportsCapability(searchModel, "web_search"))
          throw Error("Web search is not available on this Foundry deployment.");
        let B = f?.mark("model"),
          V = queryModelWithStreaming({
            messages: [R],
            systemPrompt: asSystemPrompt([
              "You run a web search for another Claude model, which is waiting on the result and can search again. Search once, then reply with a brief summary of the results.",
            ]),
            thinkingConfig: { type: "disabled", mechanical: !0 },
            tools: [],
            signal: n,
            options: {
              getToolPermissionContext: async () => ctx.permissions(),
              model: searchModel,
              toolChoice: { type: "tool", name: "web_search" },
              isNonInteractiveSession: ctx.isNonInteractiveSession,
              hasAppendSystemPrompt: !!ctx.appendSystemPrompt,
              extraToolSchemas: [I],
              querySource: "web_search_tool",
              enablePromptCaching: !1,
              agents: ctx.agentDefinitions.activeAgents,
              mcpTools: [],
              agentId: ctx.agentId,
              agentContext: ctx.agentContext,
              credentials: ctx.credentials,
              storageV5: ctx.storageV5,
              stickyBetas: forkStickyBetaLatches(getStickyBetas()),
              proactivityLevel: ctx.proactivityLevel(),
              ...ctx.helperEffortFor(searchModel),
            },
          }),
          q = [],
          currentServerToolUseId = null,
          partialInputJson = "",
          progressCounter = 0,
          queryByToolUseId = new Map(),
          apiErrorText = null;
        for await (let streamEvent of V) {
          if (streamEvent.type === "assistant") {
            if (streamEvent.isApiErrorMessage) {
              apiErrorText = streamEvent.truncatedAfterOutput
                ? "The search was cut off before any results arrived. Try again."
                : extractTextContent_2(streamEvent.message.content);
              continue;
            }
            q.push(...streamEvent.message.content);
            continue;
          }
          if (streamEvent.type !== "stream_event") continue;
          if (streamEvent.event?.type === "content_block_start") {
            let contentBlock = streamEvent.event.content_block;
            if (contentBlock?.type === "server_tool_use") {
              ((currentServerToolUseId = contentBlock.id), (partialInputJson = ""));
              continue;
            }
            if (contentBlock?.type === "web_search_tool_result") {
              let tool_use_id = contentBlock.tool_use_id,
                Se = queryByToolUseId.get(tool_use_id) || query,
                content = contentBlock.content;
              if ((progressCounter++, s))
                s({
                  type: "progress",
                  toolUseID: tool_use_id || `search-progress-${progressCounter}`,
                  data: {
                    type: "search_results_received",
                    resultCount: Array.isArray(content) ? content.length : 0,
                    query: Se,
                  },
                });
            }
            continue;
          }
          if (streamEvent.event?.type !== "content_block_delta" || !currentServerToolUseId) continue;
          let delta = streamEvent.event.delta;
          if (delta?.type !== "input_json_delta" || !delta.partial_json) continue;
          partialInputJson += delta.partial_json;
          try {
            let match = partialInputJson.match(/"query"\s*:\s*"((?:[^"\\]|\\.)*)"/);
            if (!match?.[1]) continue;
            let ie = jsonParse('"' + match[1] + '"');
            if (
              queryByToolUseId.has(currentServerToolUseId) &&
              queryByToolUseId.get(currentServerToolUseId) === ie
            )
              continue;
            if ((queryByToolUseId.set(currentServerToolUseId, ie), progressCounter++, s))
              s({
                type: "progress",
                toolUseID: `search-progress-${progressCounter}`,
                data: { type: "query_update", query: ie },
              });
          } catch {}
        }
        if ((B?.(), getAPIProvider() === "foundry" && !foundrySupportsCapability(searchModel, "web_search")))
          throw Error("Web search is not available on this Foundry deployment.");
        let he = (performance.now() - startTime) / 1000,
          lt = makeOutputFromSearchResponse(q, query, he);
        if (apiErrorText !== null && lt.results.length === 0)
          throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            apiErrorText,
            "web-search-side-query-api-error",
          );
        return { data: lt };
      },
    };
  },
  stripForCreation: (e) => ({
    ...e,
    results: e.results?.map((r) =>
      r == null || typeof r === "string" ? r : { ...r, content: r.content?.map(omitSnippet) },
    ),
  }),
  mapToolResultToToolResultBlockParam(e, r) {
    let { query: query, results: results } = e,
      flattened = (results ?? []).flatMap((y) =>
        y == null || typeof y === "string" ? [] : (y.content ?? []),
      );
    if (env.CLAUDE_CODE_WEBSEARCH_CITATIONS && flattened.some((y) => y.snippet))
      return {
        tool_use_id: r,
        type: "tool_result",
        content: flattened.map((y) => ({
          type: "search_result",
          source: y.url,
          title: y.title || y.url,
          content: [{ type: "text", text: y.snippet || y.title || y.url }],
          citations: { enabled: !0 },
        })),
      };
    let resultText = `Web search results for query: "${query}"

`;
    return (
      (results ?? []).forEach((y) => {
        if (y == null) return;
        if (typeof y === "string")
          resultText +=
            y +
            `

`;
        else if (y.content?.length > 0)
          resultText += `Links: ${jsonStringify(y.content)}

`;
        else
          resultText += `No links found.

`;
      }),
      (resultText += `
REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.`),
      { tool_use_id: r, type: "tool_result", content: resultText.trim() }
    );
  },
});

export { WebSearchTool };
