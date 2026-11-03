/**
 * utils/analyzeContext.ts
 *
 * /context 统计：分别计算系统提示、工具、MCP、agent、记忆文件、技能、命令、消息的 token 与剩余空间
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/analyzeContext.ts
 * pieces: chunk-e6aww6q8.js (25)
 * attribution: fingerprint 15, layout 7, placement 2, file-local 1
 */
import { isAbsolute } from "path";
import {
  roughTokenCountEstimation,
  roughTokenCountEstimationForContent,
  roughTokenCountEstimationForFileType,
  countMessagesTokensWithAPI,
  roughTokenCountEstimationForObject,
} from "../services/tokenEstimation.js";
import { isAbortError, toError } from "./errors.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { getMainLoopModel, toProviderWireModelId } from "./model/model.js";
import { bytesPerTokenForModel } from "./model/modelDisplay.js";
import { jsonStringify } from "./slowOperations.js";
import { oauth401DedupByHost } from "./auth.js";
import { getModelBetas } from "./betas.js";
import { computeContentHash } from "./commitAttribution.js";
import { getNonDeferrableBuiltins } from "./toolSearch.js";
import { toolToApiDefinition, isStellarDriftEnabled } from "./api.js";
import { toolMatchesName, findToolByName } from "../Tool.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { getCachedSystemContext, mergeByPath, getNonMemoryInstructionFiles } from "../context.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../entrypoints/sdk/coreSchemas.js";
import { isClaudeMdLoadingDisabled } from "./settings/customizationDisabled.js";
import { filterAutoMemWhenDisabled } from "../components/memory/MemoryFileSelector.js";
import { getMemoryFilesCached } from "./claudemd.js";
import { hideAliasedV1Tools } from "../services/tools/batchTools.js";
import { identityValue as identityValue_2 } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { countToolTokensPerItem } from "./settings/mdm/constants.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import { getSkillToolInfo, mergedSkillListing, skillListingTokenCounts } from "../tools/SkillTool/prompt.js";
import { getCwdOrNull } from "./cwd.js";
import { mcpPromptCommandsWithReserved } from "./commandPredicates.js";
import { getCommandName as getCommandName_2 } from "../commands.js";
import { isSyncedMarketplacePlugin } from "./permissions/permissionRulePayload.js";
import { skillSourceOf } from "../plugins/functionHooks/skillPromptHooks.js";
import { env } from "./env.js";
import { computeMcpInstructionsDelta } from "./mcpInstructionsDelta.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { getMcpServerInstructionBlocks } from "./attachments.js";
import { compareStringsGrouped } from "./stringUtils.js";
import { normalizeMessagesForAPI } from "./messages.js";
import { shouldEchoWireToolInputs } from "./wireToolInputEcho.js";
import { awaitArtifactRosterSafe } from "../services/artifacts/rosterWait.js";
import { cachedDeclaredTools } from "../services/api/declaredToolSet.js";
import { getRuntimeMainLoopModel } from "./model/planModeModel.js";
import { isAutoCompactEnabled } from "../services/compact/compactSettings.js";
import { getAutoCompactWindow, estimateTokensSinceAnchor } from "../services/compact/autoCompact.js";
import { getModelContextInfo } from "./model/modelContextInfo.js";
import { getSystemPrompt } from "../constants/prompts.js";
import { effectiveSystemPromptText } from "./systemPrompt.js";
import { messagesSinceCompactBoundary } from "../services/projects/threadRows.js";
import { promptSnapshotUnlessRenderPoint, snapshotIfEnabled } from "./contextAttachments/promptSnapshot.js";
import { getLastApiUsage } from "./tokens.js";
import {
  effectiveContextWindow,
  MIN_WINDOW_TOKENS,
  MAX_WINDOW_TOKENS,
} from "../services/compact/autoCompactWindow.js";

//@ chunk-e6aww6q8.js:2371933-2371999 fingerprint = MANUAL_COMPACT_BUFFER_NAME (0.536)
/**
 * /context 分类里的 “Compact buffer” 名称。
 */
var AUTOCOMPACT_BUFFER_LABEL = "Autocompact buffer";
var COMPACT_BUFFER_LABEL = "Compact buffer";
var FREE_SPACE_LABEL = "Free space";
//@ chunk-e6aww6q8.js:2371999-2372134 layout
/**
 * /context 分类的种类：Free space、Autocompact/Compact buffer、延迟加载项、已使用。
 */
function getContextCategoryKind(e) {
  if (e.name === FREE_SPACE_LABEL) return "free";
  if (e.name === AUTOCOMPACT_BUFFER_LABEL || e.name === COMPACT_BUFFER_LABEL) return "buffer";
  if (e.isDeferred) return "deferred";
  return "used";
}
//@ chunk-e6aww6q8.js:2372134-2372145 layout
var TOOL_DEFINITION_TOKEN_OVERHEAD = 500;
//@ chunk-e6aww6q8.js:2372145-2372385 layout
/**
 * 按权重把整数总量分配到各项（最大余数法），用于把 token 换算成网格格子数。
 */
function distributeProportionally(total, weights) {
  let reduced = weights.reduce((acc, weight) => acc + weight, 0);
  let mapped = weights.map((weight) => (reduced > 0 ? (weight / reduced) * total : total / weights.length));
  let mapped_2 = mapped.map((w) => Math.floor(w));
  let y = total - mapped_2.reduce((acc, L) => acc + L, 0);
  let sorted = [...mapped.keys()].sort((w, L) => mapped[L] - mapped_2[L] - (mapped[w] - mapped_2[w]));
  for (let w of sorted) {
    if (y <= 0) break;
    mapped_2[w] += 1;
    y -= 1;
  }
  return mapped_2;
}
//@ chunk-e6aww6q8.js:2372385-2372766 layout
function createCountEach(count, n) {
  return async (r) => {
    if (!n || r.length < 2)
      return Promise.all(
        r.map(
          async (content) =>
            (await count(
              [
                {
                  role: "user",
                  content,
                },
              ],
              [],
            )) || 0,
        ),
      );
    let filtered = [...r.keys()].filter((key) => r[key].trim());
    let mapped = r.map(() => 0);
    if (filtered.length === 0) return mapped;
    let content = filtered.map((L) => ({
      type: "text",
      text: r[L],
    }));
    let total =
      (await count(
        [
          {
            role: "user",
            content,
          },
        ],
        [],
      )) || 0;
    let w = distributeProportionally(
      total,
      filtered.map((L) => roughTokenCountEstimation(r[L])),
    );
    for (let [L, G] of filtered.entries()) mapped[G] = w[L];
    return mapped;
  };
}
//@ chunk-e6aww6q8.js:2372766-2372966 fingerprint = countTokensWithFallback (0.652)
/**
 * 计 token：count_tokens 不可用时退回本地估算。
 */
function countTokensWithFallback(messages, tools) {
  return async (r, s) => {
    try {
      let result = await messages(r, s);
      if (result !== null) return result;
    } catch (err) {
      if (!isAbortError(err)) logError(err);
    }
    logForDebugging(`analyzeContext: count unavailable, estimating locally (${s.length} tools)`);
    return tools(r, s);
  };
}
//@ chunk-e6aww6q8.js:2372966-2373102 layout
/**
 * 创建 token 计数器；full 模式且 tengu_context_usage_bulk_counts 打开时，把多段文本放进一次 count_tokens 请求批量计数。
 */
function createTokenCounter(detail, host, credentials) {
  let contextTokenCounter = createContextTokenCounter(detail, host, credentials);
  let h = detail === "full" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_context_usage_bulk_counts", false);
  return {
    ...contextTokenCounter,
    countEach: createCountEach(contextTokenCounter.count, h),
    bulk: h,
  };
}
//@ chunk-e6aww6q8.js:2373102-2373477 placement
/**
 * 构造 /context 用的 token 计数器：summary 模式用按字节比例的粗估；否则调用计数 API（按宿主对 401 去重并按内容缓存），失败时回退到粗估。
 */
function createContextTokenCounter(e, n, credentials) {
  let mainLoopModel = getMainLoopModel();
  let h = bytesPerTokenForModel(mainLoopModel);
  let tools = (G, q) => {
    let Z = 0;
    for (let Se of G) Z += roughTokenCountEstimationForContent(Se.content, h);
    if (q.length > 0)
      Z += roughTokenCountEstimationForFileType(jsonStringify(q), "json") + TOOL_DEFINITION_TOKEN_OVERHEAD;
    return Z;
  };
  if (e === "summary") {
    let G = async (q, Z) => tools(q, Z);
    return {
      count: G,
      countTranscript: G,
    };
  }
  let messages = (G, q) =>
    countMessagesTokensWithAPI(G, q, mainLoopModel, {
      credentials,
    });
  let w = oauth401DedupByHost.of(n);
  let L = jsonStringify([toProviderWireModelId(mainLoopModel), getModelBetas(mainLoopModel)]);
  return {
    count: countTokensWithFallback(
      (G, q) => w.run(computeContentHash(L + jsonStringify([G, q])), () => messages(G, q)),
      tools,
    ),
    countTranscript: countTokensWithFallback(messages, tools),
  };
}
//@ chunk-e6aww6q8.js:2373477-2373815 placement
/**
 * 把工具列表转成 API 工具定义（标记延迟/列出、带记录的描述与条目），用于上下文分析。
 */
async function toolsToApiDefinitions(e, getToolPermissionContext, r, model, h, y) {
  let { isDeferredToolByEngine } = await import("./chunk-pk01bzyd.js");
  let nonDeferrableBuiltins = getNonDeferrableBuiltins();
  return Promise.all(
    e.map((L) =>
      toolToApiDefinition(L, {
        getToolPermissionContext,
        tools: e,
        agents: r?.activeAgents ?? [],
        model,
        enginePlacement: isDeferredToolByEngine(L, nonDeferrableBuiltins) ? "deferred" : "listed",
        recordedDescription: h?.get(L.name),
        recordedEntry: toolMatchesName(L, STRUCTUREDOUTPUT) ? undefined : y?.get(L.name),
      }),
    ),
  );
}
//@ chunk-e6aww6q8.js:2374050-2374347 fingerprint = countToolDefinitionTokens (0.863)
/**
 * 计算一组工具定义的 token 数（走 count_tokens，失败时本地估算），扣除固定开销。
 */
async function countToolDefinitionTokens(
  tools,
  getToolPermissionContext,
  agentInfo,
  model,
  credentials,
  y,
  S,
  w = (L, G) =>
    countMessagesTokensWithAPI(L, G, undefined, {
      credentials,
    }),
) {
  let L = await toolsToApiDefinitions(tools, getToolPermissionContext, agentInfo, model, y, S);
  let result = await w([], L);
  if (result === null || result === 0) {
    let toolNames = tools.map((t) => t.name).join(", ");
    logForDebugging(
      `countToolDefinitionTokens returned ${result} for ${tools.length} tools: ${toolNames.slice(0, 100)}${toolNames.length > 100 ? "..." : ""}`,
    );
  }
  return result ?? 0;
}
//@ chunk-e6aww6q8.js:2374347-2374513 file-local
function extractSectionName(content) {
  let headingMatch = content.match(/^#+\s+(.+)$/m);
  if (headingMatch) return headingMatch[1].trim();
  let firstLine =
    content
      .split(
        `
`,
      )
      .find((line) => line.trim().length > 0) ?? "";
  return firstLine.length > 40 ? firstLine.slice(0, 40) + "\u2026" : firstLine;
}
//@ chunk-e6aww6q8.js:2374513-2375019 fingerprint = countSystemTokens (0.767)
async function countSystemTokens(session, systemPrompt, r, count, countEach) {
  let systemContext = r ? {} : await getCachedSystemContext(session);
  let namedEntries = [
    ...systemPrompt
      .filter((content) => content.length > 0 && content !== SYSTEM_PROMPT_DYNAMIC_BOUNDARY)
      .map((content) => ({
        name: extractSectionName(content),
        content,
      })),
    ...Object.entries(systemContext)
      .filter(([, content]) => content.length > 0)
      .map(([name, content]) => ({
        name,
        content,
      })),
  ];
  let w = 0;
  if (namedEntries.length < 1)
    return {
      systemPromptTokens: 0,
      systemPromptSections: [],
      redirectedContextTokens: 0,
    };
  let systemTokenCounts = await countEach(namedEntries.map(({ content }) => content));
  let systemPromptSections = namedEntries.map((entry, i) => ({
    name: entry.name,
    tokens: systemTokenCounts[i] || 0,
  }));
  return {
    systemPromptTokens: systemTokenCounts.reduce((sum, tokens) => sum + (tokens || 0), 0),
    systemPromptSections,
    redirectedContextTokens: 0,
  };
}
//@ chunk-e6aww6q8.js:2375019-2375386 fingerprint = countMemoryFileTokens (0.796)
async function countMemoryFileTokens(session, storageV5, countEach) {
  if (isClaudeMdLoadingDisabled())
    return {
      memoryFileDetails: [],
      claudeMdTokens: 0,
    };
  let memoryFilesData = mergeByPath(
    filterAutoMemWhenDisabled(await getMemoryFilesCached(session, false, storageV5)),
    await getNonMemoryInstructionFiles(session),
  );
  let memoryFileDetails = [];
  let claudeMdTokens = 0;
  if (memoryFilesData.length < 1)
    return {
      memoryFileDetails: [],
      claudeMdTokens: 0,
    };
  let S = await countEach(memoryFilesData.map((file) => file.content));
  for (let [w, file] of memoryFilesData.entries()) {
    let tokens = S[w] ?? 0;
    claudeMdTokens += tokens;
    memoryFileDetails.push({
      path: file.path,
      type: file.type,
      tokens,
    });
  }
  return {
    claudeMdTokens,
    memoryFileDetails,
  };
}
//@ chunk-e6aww6q8.js:2375386-2376771 fingerprint = countBuiltInToolTokens (0.727)
async function countBuiltInToolTokens(
  tools,
  getToolPermissionContext,
  agentInfo,
  model,
  messages,
  credentials,
  runtimeModel,
  toolDescriptions,
  toolEntries,
  count,
  bulk,
) {
  let builtInTools = hideAliasedV1Tools(identityValue_2(tools).filter((tool) => !tool.isMcp));
  if (builtInTools.length < 1)
    return {
      builtInToolTokens: 0,
      deferredBuiltinDetails: [],
      deferredBuiltinTokens: 0,
      systemToolDetails: [],
    };
  let { isToolSearchEnabled } = await import("./chunk-emm38ary.js");
  let { isDeferredToolInConversation } = await import("./chunk-pk01bzyd.js");
  let we = await isToolSearchEnabled(
    model ?? "",
    tools,
    getToolPermissionContext,
    agentInfo?.activeAgents ?? [],
    "analyzeBuiltIn",
    credentials,
    toolDescriptions,
  );
  let Ee = (t) => isDeferredToolInConversation(t, runtimeModel, tools);
  let alwaysLoadedTools = builtInTools.filter((t) => !Ee(t));
  let deferredBuiltinTools = builtInTools.filter(Ee);
  let alwaysLoadedTokens =
    alwaysLoadedTools.length > 0
      ? await countToolDefinitionTokens(
          alwaysLoadedTools,
          getToolPermissionContext,
          agentInfo,
          model,
          undefined,
          toolDescriptions,
          toolEntries,
          count,
        )
      : 0;
  let systemToolDetails = [];
  if (deferredBuiltinTools.length === 0)
    return {
      builtInToolTokens: alwaysLoadedTokens,
      deferredBuiltinDetails: [],
      deferredBuiltinTokens: 0,
      systemToolDetails,
    };
  if (!we) {
    let Et = await countToolDefinitionTokens(
      deferredBuiltinTools,
      getToolPermissionContext,
      agentInfo,
      model,
      undefined,
      toolDescriptions,
      toolEntries,
      count,
    );
    return {
      builtInToolTokens: alwaysLoadedTokens + Et,
      deferredBuiltinDetails: [],
      deferredBuiltinTokens: 0,
      systemToolDetails,
    };
  }
  let deferredBuiltinDetails = [];
  let loadedDeferredTokens = 0;
  let totalDeferredTokens = 0;
  let loadedToolNames = new Set();
  if (messages) {
    let deferredToolNameSet = new Set(deferredBuiltinTools.map((t) => t.name));
    for (let msg of messages)
      if (msg.type === "assistant") {
        for (let block of msg.message.content)
          if (
            "type" in block &&
            block.type === "tool_use" &&
            "name" in block &&
            typeof block.name === "string" &&
            deferredToolNameSet.has(block.name)
          )
            loadedToolNames.add(block.name);
        for (let gt of msg.batchToolUses ?? [])
          if (deferredToolNameSet.has(gt.name)) loadedToolNames.add(gt.name);
      }
  }
  let tokensByTool = await countToolTokensPerItem(
    deferredBuiltinTools,
    getToolPermissionContext,
    agentInfo,
    model,
    toolDescriptions,
    toolEntries,
    count,
    bulk,
  );
  for (let [i, tool] of deferredBuiltinTools.entries()) {
    let tokens = tokensByTool[i] ?? 0;
    let isLoaded = loadedToolNames.has(tool.name);
    deferredBuiltinDetails.push({
      name: tool.name,
      tokens,
      isLoaded,
    });
    totalDeferredTokens += tokens;
    if (isLoaded) loadedDeferredTokens += tokens;
  }
  return {
    builtInToolTokens: alwaysLoadedTokens + loadedDeferredTokens,
    deferredBuiltinDetails,
    deferredBuiltinTokens: totalDeferredTokens - loadedDeferredTokens,
    systemToolDetails,
  };
}
//@ chunk-e6aww6q8.js:2376771-2376803 layout
function findSkillTool(tools) {
  return findToolByName(tools, SKILL);
}
//@ chunk-e6aww6q8.js:2376803-2377107 fingerprint = countSlashCommandTokens (1)
async function countSlashCommandTokens(
  tools,
  getToolPermissionContext,
  agentInfo,
  s,
  storageV5,
  toolDescriptions,
  toolEntries,
  count,
) {
  let info = await getSkillToolInfo(getCwdOrNull(), mcpPromptCommandsWithReserved(s), storageV5);
  let slashCommandTool = findSkillTool(tools);
  if (!slashCommandTool)
    return {
      slashCommandTokens: 0,
      commandInfo: {
        totalCommands: 0,
        includedCommands: 0,
      },
    };
  return {
    slashCommandTokens: await countToolDefinitionTokens(
      [slashCommandTool],
      getToolPermissionContext,
      agentInfo,
      undefined,
      undefined,
      toolDescriptions,
      toolEntries,
      count,
    ),
    commandInfo: {
      totalCommands: info.totalCommands,
      includedCommands: info.includedCommands,
    },
  };
}
//@ chunk-e6aww6q8.js:2377107-2377953 fingerprint = countSkillTokens (0.611)
async function countSkillTokens(
  tools,
  getToolPermissionContext,
  agentInfo,
  effectiveSystemPrompt,
  model,
  y,
  agentId,
  storageV5,
  toolDescriptions,
  toolEntries,
  count,
  localPaths,
) {
  try {
    let { merged, included } = await mergedSkillListing(y, agentId, storageV5);
    let slashCommandTool = findSkillTool(tools);
    if (!slashCommandTool)
      return {
        skillTokens: 0,
        skillInfo: {
          totalSkills: 0,
          includedSkills: 0,
          skillFrontmatter: [],
        },
      };
    let skillTokens = await countToolDefinitionTokens(
      [slashCommandTool],
      getToolPermissionContext,
      agentInfo,
      undefined,
      undefined,
      toolDescriptions,
      toolEntries,
      count,
    );
    let Ae = skillListingTokenCounts(included, effectiveSystemPrompt, model);
    let skillFrontmatter = included.map((skill) => ({
      name: getCommandName_2(skill),
      source:
        skill.type === "prompt" && isSyncedMarketplacePlugin(skill.pluginInfo?.repository)
          ? "syncedSkills"
          : skillSourceOf(skill),
      pluginName: skill.type === "prompt" ? skill.pluginInfo?.pluginManifest.name : undefined,
      ...(localPaths &&
        skill.type === "prompt" &&
        skill.pluginInfo !== undefined && {
          pluginId: skill.pluginInfo.repository,
        }),
      ...(localPaths &&
        skill.type === "prompt" &&
        skill.skillFile?.path !== undefined && {
          path: skill.skillFile.path,
        }),
      tokens: Ae.get(skill.name) ?? 0,
    }));
    let totalSkills = merged.length;
    return {
      skillTokens,
      skillInfo: {
        totalSkills,
        includedSkills: included.length,
        skillFrontmatter,
      },
    };
  } catch (error) {
    logError(toError(error));
    return {
      skillTokens: 0,
      skillInfo: {
        totalSkills: 0,
        includedSkills: 0,
        skillFrontmatter: [],
      },
    };
  }
}
//@ chunk-e6aww6q8.js:2377953-2379476 fingerprint = countMcpToolTokens (0.832)
async function countMcpToolTokens(
  tools,
  getToolPermissionContext,
  agentInfo,
  model,
  messages,
  credentials,
  runtimeModel,
  toolDescriptions,
  toolEntries,
  count = (q, Z) =>
    countMessagesTokensWithAPI(q, Z, undefined, {
      credentials,
    }),
) {
  let mcpTools = tools.filter((tool) => tool.isMcp);
  let mcpToolDetails = [];
  let totalTokensRaw = await countToolDefinitionTokens(
    mcpTools,
    getToolPermissionContext,
    agentInfo,
    model,
    undefined,
    toolDescriptions,
    toolEntries,
    count,
  );
  let totalTokens = Math.max(0, (totalTokensRaw || 0) - TOOL_DEFINITION_TOKEN_OVERHEAD);
  let estimates = await Promise.all(
    mcpTools.map(async (t) =>
      roughTokenCountEstimation(
        jsonStringify({
          name: t.name,
          description: await t.prompt({
            getToolPermissionContext,
            tools,
            agents: agentInfo?.activeAgents ?? [],
          }),
          input_schema: t.inputJSONSchema ?? {},
        }),
      ),
    ),
  );
  let estimateTotal = estimates.reduce((acc, e) => acc + e, 0) || 1;
  let mcpToolTokensByTool = estimates.map((e) => Math.round((e / estimateTotal) * totalTokens));
  let { isToolSearchEnabled } = await import("./chunk-emm38ary.js");
  let { isDeferredToolInConversation } = await import("./chunk-pk01bzyd.js");
  let isDeferred = await isToolSearchEnabled(
    model,
    tools,
    getToolPermissionContext,
    agentInfo?.activeAgents ?? [],
    "analyzeMcp",
    credentials,
    toolDescriptions,
  );
  let ze = identityValue_2(tools);
  let lt =
    ze === tools
      ? new Set()
      : (() => {
          let gt = new Set(ze.map((At) => At.name));
          return new Set(mcpTools.map((mcpTool) => mcpTool.name).filter((At) => !gt.has(At)));
        })();
  let loadedMcpToolNames = new Set();
  if (isDeferred && messages) {
    let mcpToolNameSet = new Set(mcpTools.map((t) => t.name));
    for (let msg of messages)
      if (msg.type === "assistant") {
        for (let block of msg.message.content)
          if (
            "type" in block &&
            block.type === "tool_use" &&
            "name" in block &&
            typeof block.name === "string" &&
            mcpToolNameSet.has(block.name)
          )
            loadedMcpToolNames.add(block.name);
      }
  }
  let nonDeferrableBuiltins = getNonDeferrableBuiltins();
  for (let [i, tool] of mcpTools.entries()) {
    let It = lt.has(tool.name);
    mcpToolDetails.push({
      name: tool.name,
      serverName: tool.name.split("__")[1] || "unknown",
      tokens: It ? 0 : mcpToolTokensByTool[i],
      isLoaded:
        !It &&
        (loadedMcpToolNames.has(tool.name) ||
          !isDeferredToolInConversation(tool, runtimeModel, tools, {
            nonDeferrableBuiltins,
          })),
    });
  }
  let pt = 0;
  for (let [gt, At] of mcpTools.entries()) if (lt.has(At.name)) pt += mcpToolTokensByTool[gt];
  let Et = 0;
  let deferredToolTokens = 0;
  for (let detail of mcpToolDetails)
    if (detail.isLoaded) Et += detail.tokens;
    else if (isDeferred) deferredToolTokens += detail.tokens;
  return {
    mcpToolTokens: isDeferred
      ? Et
      : lt.size === mcpTools.length && mcpTools.length > 0
        ? 0
        : Math.max(0, totalTokens - pt),
    mcpToolDetails,
    deferredToolTokens,
    loadedMcpToolNames,
  };
}
//@ chunk-e6aww6q8.js:2379476-2380044 layout
/**
 * MCP 服务器 instructions 占用的 token；CLAUDE_CODE_DISABLE_ATTACHMENTS 或 CLAUDE_CODE_SIMPLE 时为 0。
 */
async function countMcpInstructionsTokens(e, count) {
  if (env.CLAUDE_CODE_DISABLE_ATTACHMENTS || env.CLAUDE_CODE_SIMPLE)
    return {
      mcpInstructionsTokens: 0,
      mcpInstructionsDetails: [],
    };
  let sorted = [
    ...computeMcpInstructionsDelta(e.filter(isConnectedOrCached), getMcpServerInstructionBlocks(e)).entries(),
  ].sort(([S], [w]) => compareStringsGrouped(S, w));
  if (sorted.length === 0)
    return {
      mcpInstructionsTokens: 0,
      mcpInstructionsDetails: [],
    };
  let content = sorted.map(([, S]) => S).join(`

`);
  let total =
    (await count(
      [
        {
          role: "user",
          content,
        },
      ],
      [],
    )) ?? 0;
  if (total === 0)
    return {
      mcpInstructionsTokens: 0,
      mcpInstructionsDetails: [],
    };
  let y = distributeProportionally(
    total,
    sorted.map(([, S]) => roughTokenCountEstimation(S)),
  );
  return {
    mcpInstructionsTokens: total,
    mcpInstructionsDetails: sorted.map(([S], i) => ({
      serverName: S,
      tokens: y[i] ?? 0,
    })),
  };
}
//@ chunk-e6aww6q8.js:2380044-2380450 fingerprint = countCustomAgentTokens (0.812)
async function countCustomAgentTokens(agentDefinitions, countEach, localPaths) {
  let customAgents = agentDefinitions.activeAgents.filter((activeAgent) => activeAgent.source !== "built-in");
  let agentDetails = [];
  let agentTokens = 0;
  let tokenCounts = await countEach(
    customAgents.map((agent) => [agent.agentType, agent.whenToUse].join(" ")),
  );
  for (let [i, L] of customAgents.entries()) {
    let tokens = tokenCounts[i] || 0;
    agentTokens += tokens || 0;
    agentDetails.push({
      agentType: L.agentType,
      source: L.source,
      ...(localPaths &&
        L.source === "plugin" && {
          pluginId: L.plugin,
        }),
      ...(localPaths &&
        L.filePath !== undefined &&
        isAbsolute(L.filePath) && {
          path: L.filePath,
        }),
      tokens: tokens || 0,
    });
  }
  return {
    agentTokens,
    agentDetails,
  };
}
//@ chunk-e6aww6q8.js:2380450-2380710 fingerprint = processAssistantMessage (1)
function processAssistantMessage(msg, breakdown) {
  for (let block of msg.message.content) {
    let blockStr = jsonStringify(block);
    let blockTokens = roughTokenCountEstimation(blockStr);
    if ("type" in block && block.type === "tool_use") {
      breakdown.toolCallTokens += blockTokens;
      let toolName = ("name" in block ? block.name : undefined) || "unknown";
      breakdown.toolCallsByType.set(toolName, (breakdown.toolCallsByType.get(toolName) || 0) + blockTokens);
    } else breakdown.assistantMessageTokens += blockTokens;
  }
}
//@ chunk-e6aww6q8.js:2380710-2381108 fingerprint = processUserMessage (1)
function processUserMessage(msg, breakdown, toolUseIdToName) {
  if (typeof msg.message.content === "string") {
    let tokens = roughTokenCountEstimation(msg.message.content);
    breakdown.userMessageTokens += tokens;
    return;
  }
  for (let block of msg.message.content) {
    let blockStr = jsonStringify(block);
    let blockTokens = roughTokenCountEstimation(blockStr);
    if ("type" in block && block.type === "tool_result") {
      breakdown.toolResultTokens += blockTokens;
      let toolUseId = "tool_use_id" in block ? block.tool_use_id : undefined;
      let toolName = (toolUseId ? toolUseIdToName.get(toolUseId) : undefined) || "unknown";
      breakdown.toolResultsByType.set(
        toolName,
        (breakdown.toolResultsByType.get(toolName) || 0) + blockTokens,
      );
    } else breakdown.userMessageTokens += blockTokens;
  }
}
//@ chunk-e6aww6q8.js:2381108-2381268 fingerprint = processAttachment (1)
function processAttachment(msg, breakdown) {
  let contentStr = roughTokenCountEstimationForObject(msg.attachment);
  breakdown.attachmentTokens += contentStr;
  let attachType = msg.attachment.type || "unknown";
  breakdown.attachmentsByType.set(
    attachType,
    (breakdown.attachmentsByType.get(attachType) || 0) + contentStr,
  );
}
//@ chunk-e6aww6q8.js:2381268-2382161 fingerprint = approximateMessageTokens (0.831)
/**
 * 按消息类型（assistant 工具调用、user 工具结果、附件）累计估算 token，并按工具名分类。
 */
async function approximateMessageTokens(messages, n, countTranscript) {
  let breakdown = {
    totalTokens: 0,
    toolCallTokens: 0,
    toolResultTokens: 0,
    attachmentTokens: 0,
    assistantMessageTokens: 0,
    userMessageTokens: 0,
    toolCallsByType: new Map(),
    toolResultsByType: new Map(),
    attachmentsByType: new Map(),
  };
  let toolUseIdToName = new Map();
  for (let msg of messages)
    if (msg.type === "assistant") {
      for (let block of msg.message.content)
        if ("type" in block && block.type === "tool_use") {
          let toolUseId = "id" in block ? block.id : undefined;
          let toolName = ("name" in block ? block.name : undefined) || "unknown";
          if (toolUseId) toolUseIdToName.set(toolUseId, toolName);
        }
    }
  for (let msg of messages)
    if (msg.type === "assistant") processAssistantMessage(msg, breakdown);
    else if (msg.type === "user") processUserMessage(msg, breakdown, toolUseIdToName);
    else if (msg.type === "attachment") processAttachment(msg, breakdown);
  let approximateMessageTokens = n
    ? 0
    : await countTranscript(
        normalizeMessagesForAPI(
          messages.filter(
            (S) =>
              !(
                S.type === "attachment" &&
                (S.attachment.type === "instructions" || S.attachment.type === "mcp_instructions_delta")
              ),
          ),
          undefined,
          undefined,
          {
            echoWireToolInputs: shouldEchoWireToolInputs(messages),
            echoApiBlockOrder: isStellarDriftEnabled(),
          },
        ).map((S) => {
          if (S.type === "assistant")
            return {
              role: "assistant",
              content: S.message.content,
            };
          return S.message;
        }),
        [],
      );
  breakdown.totalTokens = approximateMessageTokens ?? 0;
  return breakdown;
}
//@ chunk-e6aww6q8.js:2382161-2388424 fingerprint = analyzeContextUsage (0.756)
/**
 * /context 的统计：分别计算系统提示、工具定义、MCP 工具、自定义 agent、记忆文件、技能、斜杠命令、消息与附件的 token，加上自动压缩缓冲与剩余空间，生成分类数据和网格。
 */
async function analyzeContextUsage(messages, model, getToolPermissionContext, tools, agentDefinitions, y) {
  let {
    session,
    terminalWidth,
    toolUseContext,
    mainThreadAgentDefinition,
    originalMessages,
    configuredWindow,
    excludeDynamicSections,
    detail = "full",
    localPaths = false,
  } = y;
  await awaitArtifactRosterSafe(tools);
  let credentials = toolUseContext?.credentials;
  let { count, countTranscript, countEach, bulk } = createTokenCounter(detail, session.host, credentials);
  let runtimeModel = cachedDeclaredTools(toolUseContext ?? {});
  let runtimeModel_2 = getRuntimeMainLoopModel({
    permissionMode: (await getToolPermissionContext()).mode,
    mainLoopModel: model,
  });
  let Je = isAutoCompactEnabled() ? configuredWindow : undefined;
  let { window: contextWindow, source } = getAutoCompactWindow(getModelContextInfo(runtimeModel_2), Je);
  let Et = toolUseContext?.options.mcpClients ?? toolUseContext?.getMcp?.().clients ?? [];
  let defaultSystemPrompt = await getSystemPrompt(tools, runtimeModel_2, {
    excludeDynamicSections,
    analysisOnly: true,
  });
  let gt = effectiveSystemPromptText({
    mainThreadAgentDefinition,
    toolUseContext: {
      options: {
        ...(toolUseContext?.options ?? {}),
        tools,
        mcpClients: Et,
      },
    },
    customSystemPrompt: toolUseContext?.options.customSystemPrompt,
    defaultSystemPrompt,
    appendSystemPrompt: toolUseContext?.options.appendSystemPrompt,
    analysisOnly: true,
  });
  let At;
  let It;
  if (toolUseContext !== undefined) {
    let yr = messagesSinceCompactBoundary(messages);
    At = promptSnapshotUnlessRenderPoint(yr, toolUseContext.options);
    It = snapshotIfEnabled(yr, toolUseContext.options);
  }
  let systemPrompt = At?.systemPrompt ?? gt;
  let toolDescriptions = It?.toolDescriptions;
  let toolEntries = It?.toolEntries;
  let rn = originalMessages ?? messages;
  let lastApiUsage = getLastApiUsage(rn);
  let no =
    lastApiUsage &&
    lastApiUsage.input_tokens +
      lastApiUsage.cache_creation_input_tokens +
      lastApiUsage.cache_read_input_tokens >
      0
      ? lastApiUsage
      : null;
  let hn = no ? no.input_tokens + no.cache_creation_input_tokens + no.cache_read_input_tokens : null;
  let [
    { systemPromptTokens, systemPromptSections, redirectedContextTokens: Kn },
    { claudeMdTokens, memoryFileDetails },
    { builtInToolTokens, deferredBuiltinDetails, deferredBuiltinTokens, systemToolDetails },
    { mcpToolTokens, mcpToolDetails, deferredToolTokens },
    { mcpInstructionsTokens: ao, mcpInstructionsDetails: $o },
    { agentTokens, agentDetails },
    { slashCommandTokens, commandInfo },
    messageBreakdown,
  ] = await Promise.all([
    countSystemTokens(
      session,
      systemPrompt,
      excludeDynamicSections && toolUseContext?.options.customSystemPrompt === undefined,
      count,
      countEach,
    ),
    countMemoryFileTokens(session, toolUseContext?.storageV5, countEach),
    countBuiltInToolTokens(
      tools,
      getToolPermissionContext,
      agentDefinitions,
      runtimeModel_2,
      messages,
      credentials,
      runtimeModel,
      toolDescriptions,
      toolEntries,
      count,
      bulk,
    ),
    countMcpToolTokens(
      tools,
      getToolPermissionContext,
      agentDefinitions,
      runtimeModel_2,
      messages,
      credentials,
      runtimeModel,
      toolDescriptions,
      toolEntries,
      count,
    ),
    countMcpInstructionsTokens(Et, count),
    countCustomAgentTokens(agentDefinitions, countEach, localPaths),
    countSlashCommandTokens(
      tools,
      getToolPermissionContext,
      agentDefinitions,
      toolUseContext?.getMcp?.().commands ?? [],
      toolUseContext?.storageV5,
      toolDescriptions,
      toolEntries,
      count,
    ),
    approximateMessageTokens(messages, hn !== null, countTranscript),
  ]);
  let skillInfo = (
    await countSkillTokens(
      tools,
      getToolPermissionContext,
      agentDefinitions,
      runtimeModel_2,
      model,
      toolUseContext?.getMcp?.().commands ?? [],
      toolUseContext?.agentId,
      toolUseContext?.storageV5,
      toolDescriptions,
      toolEntries,
      count,
      localPaths,
    )
  ).skillInfo;
  let skillFrontmatterTokens = skillInfo.skillFrontmatter.reduce((sum, skill) => sum + skill.tokens, 0);
  let Cr = messageBreakdown.totalTokens + Kn;
  let isAutoCompact = isAutoCompactEnabled();
  let Oo = isAutoCompact
    ? effectiveContextWindow(getModelContextInfo(model), Je) - MIN_WINDOW_TOKENS
    : undefined;
  let cats = [];
  if (systemPromptTokens > 0)
    cats.push({
      id: "system_prompt",
      name: "System prompt",
      tokens: systemPromptTokens,
      color: "promptBorder",
    });
  let systemToolsTokens = builtInToolTokens - skillFrontmatterTokens;
  if (systemToolsTokens > 0)
    cats.push({
      id: "system_tools",
      name: "System tools",
      tokens: systemToolsTokens,
      color: "inactive",
    });
  if (mcpToolTokens > 0)
    cats.push({
      id: "mcp_tools",
      name: "MCP tools",
      tokens: mcpToolTokens,
      color: "cyan_FOR_SUBAGENTS_ONLY",
    });
  if (ao > 0)
    cats.push({
      id: "mcp_instructions",
      name: "MCP server instructions",
      tokens: ao,
      color: "green_FOR_SUBAGENTS_ONLY",
    });
  if (deferredToolTokens > 0)
    cats.push({
      id: "mcp_tools_deferred",
      name: "MCP tools (deferred)",
      tokens: deferredToolTokens,
      color: "inactive",
      isDeferred: true,
    });
  if (deferredBuiltinTokens > 0)
    cats.push({
      id: "system_tools_deferred",
      name: "System tools (deferred)",
      tokens: deferredBuiltinTokens,
      color: "inactive",
      isDeferred: true,
    });
  if (agentTokens > 0)
    cats.push({
      id: "custom_agents",
      name: "Custom agents",
      tokens: agentTokens,
      color: "permission",
    });
  if (claudeMdTokens > 0)
    cats.push({
      id: "memory_files",
      name: "Memory files",
      tokens: claudeMdTokens,
      color: "claude",
    });
  if (skillFrontmatterTokens > 0)
    cats.push({
      id: "skills",
      name: "Skills",
      tokens: skillFrontmatterTokens,
      color: "warning",
    });
  let Io = 0;
  let zo;
  if (!(isAutoCompact && source === "auto")) {
    if (isAutoCompact && Oo !== undefined) {
      Io = contextWindow - Oo;
      zo = {
        id: "autocompact_buffer",
        name: AUTOCOMPACT_BUFFER_LABEL,
      };
    } else if (!isAutoCompact) {
      Io = MAX_WINDOW_TOKENS;
      zo = {
        id: "compact_buffer",
        name: COMPACT_BUFFER_LABEL,
      };
    }
  }
  let Es = null;
  if (hn !== null) {
    let actualUsage = cats.reduce((sum, cat) => sum + (cat.isDeferred ? 0 : cat.tokens), 0);
    let Kr = contextWindow - actualUsage - Io;
    let Li = estimateTokensSinceAnchor(rn, bytesPerTokenForModel(runtimeModel_2));
    let Qs = Math.max(0, hn - actualUsage) + Li;
    Cr = Math.max(0, Math.min(Qs, Kr));
    Es = actualUsage + Qs;
  }
  let unattributedTokens = Math.max(
    0,
    Cr -
      messageBreakdown.toolCallTokens -
      messageBreakdown.toolResultTokens -
      messageBreakdown.attachmentTokens -
      messageBreakdown.assistantMessageTokens -
      messageBreakdown.userMessageTokens -
      Kn,
  );
  if (Cr > 0)
    cats.push({
      id: "messages",
      name: "Messages",
      tokens: Cr,
      color: "purple_FOR_SUBAGENTS_ONLY",
    });
  let reduced = cats.reduce((acc, Kr) => acc + (Kr.isDeferred ? 0 : Kr.tokens), 0);
  if (zo)
    cats.push({
      ...zo,
      tokens: Io,
      color: "inactive",
    });
  let freeTokens = Math.max(0, contextWindow - reduced - Io);
  cats.push({
    id: "free_space",
    name: FREE_SPACE_LABEL,
    tokens: freeTokens,
    color: "promptBorder",
  });
  let as = Es ?? reduced;
  let isNarrowScreen = terminalWidth && terminalWidth < 80;
  let ji = contextWindow >= 1e6;
  let GRID_WIDTH = isNarrowScreen ? 5 : ji ? 20 : 10;
  let GRID_HEIGHT = ji ? 10 : isNarrowScreen ? 5 : 10;
  let TOTAL_SQUARES = GRID_WIDTH * GRID_HEIGHT;
  let mapped = cats
    .filter((cat) => !cat.isDeferred)
    .map((cat) => ({
      ...cat,
      squares:
        cat.name === FREE_SPACE_LABEL
          ? Math.round((cat.tokens / contextWindow) * TOTAL_SQUARES)
          : Math.max(1, Math.round((cat.tokens / contextWindow) * TOTAL_SQUARES)),
      percentageOfTotal: Math.round((cat.tokens / contextWindow) * 100),
    }));
  function createCategorySquares(category) {
    let squares = [];
    let exactSquares = (category.tokens / contextWindow) * TOTAL_SQUARES;
    let wholeSquares = Math.floor(exactSquares);
    let fractionalPart = exactSquares - wholeSquares;
    for (let i = 0; i < category.squares; i++) {
      let squareFullness = 1;
      if (i === wholeSquares && fractionalPart > 0) squareFullness = fractionalPart;
      squares.push({
        color: category.color,
        isFilled: true,
        categoryName: category.name,
        tokens: category.tokens,
        percentage: category.percentageOfTotal,
        squareFullness,
      });
    }
    return squares;
  }
  let gridSquares = [];
  let reservedCategory = mapped.find(
    (cat) => cat.name === AUTOCOMPACT_BUFFER_LABEL || cat.name === COMPACT_BUFFER_LABEL,
  );
  let nonReservedCategories = mapped.filter(
    (cat) =>
      cat.name !== AUTOCOMPACT_BUFFER_LABEL &&
      cat.name !== COMPACT_BUFFER_LABEL &&
      cat.name !== FREE_SPACE_LABEL,
  );
  for (let cat of nonReservedCategories) {
    let squares = createCategorySquares(cat);
    for (let square of squares) if (gridSquares.length < TOTAL_SQUARES) gridSquares.push(square);
  }
  let reservedSquareCount = reservedCategory ? reservedCategory.squares : 0;
  let freeSpaceCat = cats.find((yr) => yr.name === FREE_SPACE_LABEL);
  let freeSpaceTarget = TOTAL_SQUARES - reservedSquareCount;
  while (gridSquares.length < freeSpaceTarget)
    gridSquares.push({
      color: "promptBorder",
      isFilled: true,
      categoryName: FREE_SPACE_LABEL,
      tokens: freeSpaceCat?.tokens || 0,
      percentage: freeSpaceCat ? Math.round((freeSpaceCat.tokens / contextWindow) * 100) : 0,
      squareFullness: 1,
    });
  if (reservedCategory) {
    let squares = createCategorySquares(reservedCategory);
    for (let square of squares) if (gridSquares.length < TOTAL_SQUARES) gridSquares.push(square);
  }
  let gridRows = [];
  for (let i = 0; i < GRID_HEIGHT; i++)
    gridRows.push(gridSquares.slice(i * GRID_WIDTH, (i + 1) * GRID_WIDTH));
  let toolsMap = new Map();
  for (let [name, tokens] of messageBreakdown.toolCallsByType.entries()) {
    let existing = toolsMap.get(name) || {
      callTokens: 0,
      resultTokens: 0,
    };
    toolsMap.set(name, {
      ...existing,
      callTokens: tokens,
    });
  }
  for (let [name, tokens] of messageBreakdown.toolResultsByType.entries()) {
    let existing = toolsMap.get(name) || {
      callTokens: 0,
      resultTokens: 0,
    };
    toolsMap.set(name, {
      ...existing,
      resultTokens: tokens,
    });
  }
  let toolsByTypeArray = Array.from(toolsMap.entries())
    .map(([name, { callTokens, resultTokens }]) => ({
      name,
      callTokens,
      resultTokens,
    }))
    .sort((yr, Kr) => Kr.callTokens + Kr.resultTokens - (yr.callTokens + yr.resultTokens));
  let attachmentsByTypeArray = Array.from(messageBreakdown.attachmentsByType.entries())
    .map(([name, tokens]) => ({
      name,
      tokens,
    }))
    .sort((yr, Kr) => Kr.tokens - yr.tokens);
  let formattedMessageBreakdown = {
    toolCallTokens: messageBreakdown.toolCallTokens,
    toolResultTokens: messageBreakdown.toolResultTokens,
    attachmentTokens: messageBreakdown.attachmentTokens,
    assistantMessageTokens: messageBreakdown.assistantMessageTokens,
    userMessageTokens: messageBreakdown.userMessageTokens,
    redirectedContextTokens: Kn,
    unattributedTokens,
    toolCallsByType: toolsByTypeArray,
    attachmentsByType: attachmentsByTypeArray,
  };
  return {
    categories: cats.map((yr) => ({
      ...yr,
      kind: getContextCategoryKind(yr),
    })),
    totalTokens: as,
    maxTokens: contextWindow,
    rawMaxTokens: contextWindow,
    autocompactSource: source,
    percentage: Math.round((as / contextWindow) * 100),
    gridRows,
    model: runtimeModel_2,
    memoryFiles: memoryFileDetails,
    mcpTools: mcpToolDetails,
    ...(localPaths && {
      mcpInstructions: $o,
    }),
    deferredBuiltinTools: undefined,
    systemTools: undefined,
    systemPromptSections: undefined,
    agents: agentDetails,
    slashCommands:
      slashCommandTokens > 0
        ? {
            totalCommands: commandInfo.totalCommands,
            includedCommands: commandInfo.includedCommands,
            tokens: slashCommandTokens,
          }
        : undefined,
    skills:
      skillFrontmatterTokens > 0
        ? {
            totalSkills: skillInfo.totalSkills,
            includedSkills: skillInfo.includedSkills,
            tokens: skillFrontmatterTokens,
            skillFrontmatter: skillInfo.skillFrontmatter,
          }
        : undefined,
    autoCompactThreshold: Oo,
    isAutoCompactEnabled: isAutoCompact,
    messageBreakdown: formattedMessageBreakdown,
    apiUsage: no,
  };
}
export {
  getContextCategoryKind,
  analyzeContextUsage,
  countToolDefinitionTokens,
  TOOL_DEFINITION_TOKEN_OVERHEAD,
  toolsToApiDefinitions,
  distributeProportionally,
};
