/**
 * tools/WebSearchTool/WebSearchTool.ts
 *
 * WebSearch 工具：搜索预算、CCR 代理或 web_search_20250305 服务端工具的次级查询，结果映射与引用模式
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/WebSearchTool/WebSearchTool.ts
 * pieces: chunk-fmnbrxwy.js (8)
 * attribution: placement 3, fingerprint 4, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isSomething,
  fastSearchModeConfig,
  WEBSEARCH,
  ALLOW_WEB_SEARCH,
  getWebSearchPrompt,
  isStandardSearchMode,
} from "./prompt.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  zodStrictObject,
  stringSchema,
  array,
  _enum,
  objectSchema,
  union,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { truncate } from "../../utils/format.js";
import { MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
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
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import { env } from "../../utils/env.js";
import { shouldUseCcrWebSearchProxy, ccrProxyWebSearch } from "./UI.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { createUserMessage, extractTextContent_2 } from "../../utils/messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getSmallFastModel } from "../../utils/model/smallFastModel.js";
import { foundrySupportsCapability } from "../../services/api/foundryCapabilities.js";
import { queryModelWithStreaming } from "../../services/api/claude.js";
import { asSystemPrompt } from "../../utils/systemPromptType.js";
import { forkStickyBetaLatches } from "../../bootstrap/stateSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fmnbrxwy.js:54115-54127 placement
var searchService = null;
//@ chunk-fmnbrxwy.js:54127-54162 placement
function getSearchService() {
  return isSomething() ? searchService : null;
}
//@ chunk-fmnbrxwy.js:54162-54866 fingerprint (2.1.88 match: inputSchema, 0.489)
/**
 * WebSearch 输入 schema：query（≥2 字符）、allowed_domains、blocked_domains；Ts 在快搜实验开启时追加 mode（standard/extended，默认 extended，描述取远程配置）；bs 为单条搜索结果块 schema。
 */
var webSearchInputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var webSearchInputSchemaWithMode;
var searchResultBlockSchema;
deferInit("chunk-fmnbrxwy.js:54162", () => {
  webSearchInputSchema = DoctorLazy(() =>
    zodStrictObject({
      query: stringSchema().min(2).describe("The search query to use"),
      allowed_domains: array(stringSchema())
        .optional()
        .describe("Only include search results from these domains"),
      blocked_domains: array(stringSchema())
        .optional()
        .describe("Never include search results from these domains"),
    }),
  );
  webSearchInputSchemaWithMode = DoctorLazy(() =>
    webSearchInputSchema().extend({
      mode: _enum(["standard", "extended"])
        .describe(fastSearchModeConfig()?.mode_description ?? "")
        .prefault("extended"),
    }),
  );
  searchResultBlockSchema = DoctorLazy(() => {
    let searchHitSchema = objectSchema({
      title: stringSchema().describe("The title of the search result"),
      url: stringSchema().describe("The URL of the search result"),
      snippet: stringSchema()
        .optional()
        .describe("Page text. PostToolUse hooks get it; tool_use_result does not."),
    });
    return objectSchema({
      tool_use_id: stringSchema().describe("ID of the tool use"),
      content: array(searchHitSchema).describe("Array of search hits"),
    });
  });
});
//@ chunk-fmnbrxwy.js:54866-54905 placement
/**
 * 返回去掉 snippet 字段的对象（归属疑似错误）。
 */
function omitSnippet({ snippet, ...rest }) {
  return rest;
}
//@ chunk-fmnbrxwy.js:54905-55220 fingerprint (2.1.88 match: outputSchema, 0.735)
/**
 * WebSearch 输出 schema：query、results（结果块或模型文字混排）、durationSeconds、searchCount。
 */
var outputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:54905", () => {
  outputSchema = DoctorLazy(() =>
    objectSchema({
      query: stringSchema().describe("The search query that was executed"),
      results: array(union([searchResultBlockSchema(), stringSchema()])).describe(
        "Search results and/or text commentary from the model",
      ),
      durationSeconds: numberSchema().describe("Time taken to complete the search operation"),
      searchCount: numberSchema().optional().describe("Number of web searches performed"),
    }),
  );
});
//@ chunk-fmnbrxwy.js:55220-55763 fingerprint (2.1.88 match: makeOutputFromSearchResponse, 0.95)
/**
 * 把次级查询的 content 块整理成输出：server_tool_use 处切分文字段，web_search_tool_result 转成 {tool_use_id, content:[{title,url}]}，错误块转成 "Web search error: <code>"；searchCount 取两类块计数的最大值。
 */
function makeOutputFromSearchResponse(result, query, durationSeconds) {
  let results = [];
  let textAcc = "";
  let searchCount = 0;
  let resultCount = 0;
  for (let block of result) {
    if (block.type === "server_tool_use") {
      searchCount++;
      if (textAcc.trim().length > 0) results.push(textAcc.trim());
      textAcc = "";
      continue;
    }
    if (block.type === "web_search_tool_result") {
      resultCount++;
      if (!Array.isArray(block.content)) {
        let errorMessage = `Web search error: ${block.content.error_code}`;
        logForDebugging(errorMessage, {
          level: "error",
        });
        results.push(errorMessage);
        continue;
      }
      let hits = block.content.map((hit) => ({
        title: hit.title,
        url: hit.url,
      }));
      results.push({
        tool_use_id: block.tool_use_id,
        content: hits,
      });
    }
    if (block.type === "text") textAcc += block.text;
  }
  if (textAcc.trim().length > 0) results.push(textAcc.trim());
  return {
    query,
    results,
    durationSeconds,
    searchCount: Math.max(searchCount, resultCount),
  };
}
//@ chunk-fmnbrxwy.js:55763-55825 layout
/**
 * 工具使用摘要：截断后的 query。
 */
function getWebSearchToolUseSummary(input) {
  if (!input?.query) return null;
  return truncate(input.query, MAX_DESCRIPTION_CHARS);
}
//@ chunk-fmnbrxwy.js:55825-64163 fingerprint (2.1.88 match: WebSearchTool, 0.56)
/**
 * WebSearch 工具定义（name "WebSearch"，shouldDefer，只读可并发，maxResultSizeChars 100000）。isEnabled：需要 allow_web_search 开关，且 API 提供方为 firstParty（或 gI 判定的兼容方）/foundry，vertex 看模型是否支持，gateway 一律关。call：先扣会话/轮次搜索预算（用尽时返回不搜索的说明，禁止用 curl/浏览器绕开）；有 CCR 代理时走代理；否则用 web_search_20250305 服务端工具（max_uses 8，强制 toolChoice）发起一次次级流式查询，从流里解析 query 增量与结果数做进度。checkPermissions 返回 passthrough + localSettings allow 建议。
 */
var WebSearchTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fmnbrxwy.js:55825", () => {
  WebSearchTool = buildTool({
    name: WEBSEARCH,
    searchHint: "search the web for current information",
    backgrounding: "detach",
    maxResultSizeChars: 1e5,
    shouldDefer: true,
    async description(input) {
      return `Claude wants to search the web for: ${input.query}`;
    },
    userFacingName() {
      return "Web Search";
    },
    getToolUseSummary: getWebSearchToolUseSummary,
    getActivityDescription(input) {
      let summary = getWebSearchToolUseSummary(input);
      return summary ? `Searching for ${summary}` : "Searching the web";
    },
    isEnabled() {
      if (!isPolicyAllowed(ALLOW_WEB_SEARCH)) return false;
      let provider = getAPIProvider();
      if (provider === "firstParty" || isClaudePlatformProvider(provider)) return true;
      if (provider === "gateway") return false;
      if (provider === "vertex") return vertexModelSupportsWebSearch(getCanonicalName(getMainLoopModel()));
      if (provider === "foundry") return true;
      return false;
    },
    get inputSchema() {
      return fastSearchModeConfig() ? webSearchInputSchemaWithMode() : webSearchInputSchema();
    },
    get outputSchema() {
      return outputSchema();
    },
    isConcurrencySafe() {
      return true;
    },
    isReadOnly() {
      return true;
    },
    coerceInput(input) {
      if (fastSearchModeConfig() || !isPlainObject(input) || !("mode" in input)) return null;
      let { mode, ...rest } = input;
      return {
        input: rest,
        shapeClass: "mode_while_off",
      };
    },
    toAutoClassifierInput(input) {
      return getSearchService()?.queryAsSent(input.query, input) ?? input.query;
    },
    async prompt({ model, leanPrompt }) {
      let webSearchPrompt = getWebSearchPrompt(model, leanPrompt);
      let servicePrompt =
        getSearchService()?.SEARCH_SERVICE_PROMPT ?? fastSearchModeConfig()?.web_search_addendum;
      return servicePrompt
        ? `${webSearchPrompt.trimEnd()}

${servicePrompt}
`
        : webSearchPrompt;
    },
    renderToolUseMessage(
      { query, allowed_domains: allowedDomains, blocked_domains: blockedDomains },
      { verbose },
    ) {
      if (!query) return null;
      let summary = "";
      if (query) summary += `"${query}"`;
      if (verbose) {
        if (allowedDomains && allowedDomains.length > 0)
          summary += `, only allowing domains: ${allowedDomains.join(", ")}`;
        if (blockedDomains && blockedDomains.length > 0)
          summary += `, blocking domains: ${blockedDomains.join(", ")}`;
      }
      return summary;
    },
    extractSearchText() {
      return "";
    },
    create(toolContext) {
      return {
        async checkPermissions(_input) {
          return {
            behavior: "passthrough",
            message: "WebSearchTool requires permission.",
            suggestions: [
              {
                type: "addRules",
                rules: [
                  {
                    toolName: WEBSEARCH,
                  },
                ],
                behavior: "allow",
                destination: "localSettings",
              },
            ],
          };
        },
        async validateInput(input) {
          let { query, allowed_domains, blocked_domains } = input;
          if (!query.length)
            return {
              result: false,
              message: "Error: Missing query",
              errorCode: 1,
            };
          if (allowed_domains?.length && blocked_domains?.length)
            return {
              result: false,
              message: "Error: Cannot specify both allowed_domains and blocked_domains in the same request",
              errorCode: 2,
            };
          let serviceRefusal = getSearchService()?.searchServiceInputRefusal(query, input);
          if (serviceRefusal)
            return {
              result: false,
              message: serviceRefusal,
              errorCode: 3,
            };
          return {
            result: true,
          };
        },
        async call(input, { signal, onProgress, timing }) {
          let ctx = toolContext;
          let startTime = performance.now();
          let { query } = input;
          let searchProfile = isStandardSearchMode(input) ? "fast" : undefined;
          let webSearchBudget = ctx.taskRegistry.getWebSearchBudget();
          if (!webSearchBudget.tryConsume()) {
            let maxSearches = maxWebSearchesPerSession();
            let refillsPerHour = webSearchBudget.refillsPerHour();
            let msUntilNextCall = webSearchBudget.msUntilNextCall();
            logFeatureBad("tool_web_search", "web_search_session_cap", {
              max_web_searches_per_session: maxSearches,
              web_search_refills_per_hour: refillsPerHour,
              ...(Number.isFinite(msUntilNextCall) && {
                ms_until_next_web_search: msUntilNextCall,
              }),
            });
            let budgetScope = getIsNonInteractiveSession() ? "turn" : "session";
            let limitText = `${maxSearches} ${WEBSEARCH} ${plural(maxSearches, "call")}`;
            let refills = refillsPerHour > 0;
            let noRefillText =
              budgetScope === "turn"
                ? `limit: ${limitText} per turn, shared by every agent in it`
                : `limit: ${limitText}, shared by every agent in this session; it does not refill`;
            let refillText = refills
              ? `limit: ${limitText} shared by every agent in this ${budgetScope}; the budget refills at about ${refillsPerHour} ${plural(refillsPerHour, "call")} per hour, so searching becomes possible again later in the ${budgetScope}`
              : noRefillText;
            let adviceText = refills
              ? "Do not pause or wait for the refill: continue with the information already gathered and say so in your answer"
              : "Continue with the information already gathered instead of searching again, and say so in your answer";
            let messageLines = [
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
            ];
            let endExternalMark =
              messageLines.length > 0
                ? ` If more searches are genuinely needed, ${messageLines.join(", or ")}.`
                : "";
            return {
              data: {
                query,
                results: [
                  `Web search was not performed: this ${budgetScope}'s web search budget is used up (${refillText}). ${adviceText}; do not work around the limit by querying search engines with curl or wget from ${BASH_TOOL_NAME}, by querying them in a browser or through a computer-use tool, or by searching or fetching through a third-party reader, proxy or archive service.${endExternalMark}`,
                ],
                durationSeconds: 0,
                searchCount: 0,
              },
            };
          }
          let service = getSearchService();
          if (service) {
            let markExternal = timing?.mark("external");
            let serviceResult = await service
              .searchViaSearchService(query, input, signal, () => webSearchBudget.acquireDirectSearchSlot())
              .finally(markExternal);
            if (!serviceResult.ok)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                serviceResult.message,
                "web-search-service",
              );
            onProgress?.({
              type: "progress",
              toolUseID: "search-service-1",
              data: {
                type: "search_results_received",
                resultCount: serviceResult.results.length,
                query,
              },
            });
            return {
              data: {
                query,
                results: [
                  {
                    tool_use_id: "search-service-1",
                    content:
                      ctx.agentId !== undefined && env.CLAUDE_CODE_WEBSEARCH_CITATIONS
                        ? serviceResult.results.map(omitSnippet)
                        : serviceResult.results,
                  },
                  ...(serviceResult.leftOut > 0
                    ? [
                        `${serviceResult.leftOut} ${plural(serviceResult.leftOut, "result")} left out by allowed_domains or blocked_domains.`,
                      ]
                    : []),
                ],
                durationSeconds: (performance.now() - startTime) / 1000,
                searchCount: 1,
              },
            };
          }
          if (shouldUseCcrWebSearchProxy(ctx.session)) {
            let proxyMark = timing?.mark("external");
            let proxyResult = await ccrProxyWebSearch(
              ctx.session,
              query,
              signal,
              {
                allowed_domains: input.allowed_domains,
                blocked_domains: input.blocked_domains,
              },
              searchProfile,
            ).finally(proxyMark);
            let durationSeconds = (performance.now() - startTime) / 1000;
            if (!proxyResult.ok)
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                jsonStringify({
                  error_type: proxyResult.errorType,
                  source: proxyResult.source,
                  message: proxyResult.errorMessage,
                }),
                "web-search-ccr-proxy",
              );
            if (onProgress)
              onProgress({
                type: "progress",
                toolUseID: "ccr-proxy-search-1",
                data: {
                  type: "search_results_received",
                  resultCount: proxyResult.results.length,
                  query,
                },
              });
            return {
              data: {
                query,
                results: [
                  {
                    tool_use_id: "ccr-proxy-search-1",
                    content:
                      ctx.agentId === undefined ? proxyResult.results : proxyResult.results.map(omitSnippet),
                  },
                ],
                durationSeconds,
                searchCount: 1,
              },
            };
          }
          let userMessage = createUserMessage({
            content: "Perform a web search for the query: " + query,
          });
          let toolSchema = {
            type: "web_search_20250305",
            name: "web_search",
            allowed_domains: input.allowed_domains,
            blocked_domains: input.blocked_domains,
            max_uses: 8,
            ...(searchProfile && {
              search_profile: searchProfile,
            }),
          };
          let searchModel = getFeatureValue_CACHED_MAY_BE_STALE("tengu_plum_vx3", false)
            ? getSmallFastModel()
            : ctx.mainLoopModel();
          if (getAPIProvider() === "foundry" && !foundrySupportsCapability(searchModel, "web_search"))
            throw Error("Web search is not available on this Foundry deployment.");
          let modelMark = timing?.mark("model");
          let queryStream = queryModelWithStreaming({
            messages: [userMessage],
            systemPrompt: asSystemPrompt([
              "You run a web search for another Claude model, which is waiting on the result and can search again. Search once, then reply with a brief summary of the results.",
            ]),
            thinkingConfig: {
              type: "disabled",
              mechanical: true,
            },
            tools: [],
            signal,
            options: {
              getToolPermissionContext: async () => ctx.permissions(),
              model: searchModel,
              toolChoice: {
                type: "tool",
                name: "web_search",
              },
              isNonInteractiveSession: ctx.isNonInteractiveSession,
              hasAppendSystemPrompt: !!ctx.appendSystemPrompt,
              extraToolSchemas: [toolSchema],
              querySource: "web_search_tool",
              enablePromptCaching: false,
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
          });
          let result = [];
          let currentServerToolUseId = null;
          let partialInputJson = "";
          let progressCounter = 0;
          let queryByToolUseId = new Map();
          let apiErrorText = null;
          for await (let streamEvent of queryStream) {
            if (streamEvent.type === "assistant") {
              if (streamEvent.isApiErrorMessage) {
                apiErrorText = streamEvent.truncatedAfterOutput
                  ? "The search was cut off before any results arrived. Try again."
                  : extractTextContent_2(streamEvent.message.content);
                continue;
              }
              result.push(...streamEvent.message.content);
              continue;
            }
            if (streamEvent.type !== "stream_event") continue;
            if (streamEvent.event?.type === "content_block_start") {
              let contentBlock = streamEvent.event.content_block;
              if (contentBlock?.type === "server_tool_use") {
                currentServerToolUseId = contentBlock.id;
                partialInputJson = "";
                continue;
              }
              if (contentBlock?.type === "web_search_tool_result") {
                let toolUseId = contentBlock.tool_use_id;
                let query_2 = queryByToolUseId.get(toolUseId) || query;
                let content = contentBlock.content;
                progressCounter++;
                if (onProgress)
                  onProgress({
                    type: "progress",
                    toolUseID: toolUseId || `search-progress-${progressCounter}`,
                    data: {
                      type: "search_results_received",
                      resultCount: Array.isArray(content) ? content.length : 0,
                      query: query_2,
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
              let queryMatch = partialInputJson.match(/"query"\s*:\s*"((?:[^"\\]|\\.)*)"/);
              if (!queryMatch?.[1]) continue;
              let query = jsonParse('"' + queryMatch[1] + '"');
              if (
                queryByToolUseId.has(currentServerToolUseId) &&
                queryByToolUseId.get(currentServerToolUseId) === query
              )
                continue;
              queryByToolUseId.set(currentServerToolUseId, query);
              progressCounter++;
              if (onProgress)
                onProgress({
                  type: "progress",
                  toolUseID: `search-progress-${progressCounter}`,
                  data: {
                    type: "query_update",
                    query,
                  },
                });
            } catch {}
          }
          modelMark?.();
          if (getAPIProvider() === "foundry" && !foundrySupportsCapability(searchModel, "web_search"))
            throw Error("Web search is not available on this Foundry deployment.");
          let durationSeconds = (performance.now() - startTime) / 1000;
          let outputFromSearchResponse = makeOutputFromSearchResponse(result, query, durationSeconds);
          if (apiErrorText !== null && outputFromSearchResponse.results.length === 0)
            throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              apiErrorText,
              "web-search-side-query-api-error",
            );
          return {
            data: outputFromSearchResponse,
          };
        },
      };
    },
    stripForCreation: (output) => ({
      ...output,
      results: output.results?.map((result) =>
        result == null || typeof result === "string"
          ? result
          : {
              ...result,
              content: result.content?.map(omitSnippet),
            },
      ),
    }),
    mapToolResultToToolResultBlockParam(output, toolUseId) {
      let { query, results } = output;
      let flattened = (results ?? []).flatMap((result) =>
        result == null || typeof result === "string" ? [] : (result.content ?? []),
      );
      if (env.CLAUDE_CODE_WEBSEARCH_CITATIONS && flattened.some((contentItem) => contentItem.snippet))
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: flattened.map((contentItem) => ({
            type: "search_result",
            source: contentItem.url,
            title: contentItem.title || contentItem.url,
            content: [
              {
                type: "text",
                text: contentItem.snippet || contentItem.title || contentItem.url,
              },
            ],
            citations: {
              enabled: true,
            },
          })),
        };
      let resultText = `Web search results for query: "${query}"

`;
      (results ?? []).forEach((result) => {
        if (result == null) return;
        if (typeof result === "string")
          resultText +=
            result +
            `

`;
        else if (result.content?.length > 0)
          resultText += `Links: ${jsonStringify(result.content)}

`;
        else
          resultText += `No links found.

`;
      });
      resultText += `
REMINDER: You MUST include the sources above in your response to the user using markdown hyperlinks.`;
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: resultText.trim(),
      };
    },
  });
});
export { WebSearchTool };
