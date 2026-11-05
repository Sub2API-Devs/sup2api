/**
 * utils/analyzeContext.ts
 *
 * /context 统计：分别计算系统提示、工具、MCP、agent、记忆文件、技能、命令、消息的 token 与剩余空间
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/analyzeContext.ts
 * pieces: chunk-5xgkngpb.js (25)
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
import { matchesToolName, findToolByName } from "../Tool.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { getCachedSystemContext, mergeByPath, getNonMemoryInstructionFiles } from "../context.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../entrypoints/sdk/coreSchemas.js";
import { isClaudeMdLoadingDisabled } from "./settings/customizationDisabled.js";
import { filterAutoMemWhenDisabled } from "../components/memory/MemoryFileSelector.js";
import { getMemoryFilesCached } from "./claudemd.js";
import { hideAliasedV1Tools } from "../services/tools/batchTools.js";
import { hideCodeModeOnlyTools } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
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

//@ chunk-5xgkngpb.js:2427293-2427359 fingerprint (2.1.88 match: MANUAL_COMPACT_BUFFER_NAME, 0.536)
/**
 * /context 分类里的 “Compact buffer” 名称。
 */
var AUTOCOMPACT_BUFFER_LABEL = "Autocompact buffer";
var COMPACT_BUFFER_LABEL = "Compact buffer";
var FREE_SPACE_LABEL = "Free space";
//@ chunk-5xgkngpb.js:2427359-2427494 layout
/**
 * /context 分类的种类：Free space、Autocompact/Compact buffer、延迟加载项、已使用。
 */
function getContextCategoryKind(category) {
  if (category.name === FREE_SPACE_LABEL) return "free";
  if (category.name === AUTOCOMPACT_BUFFER_LABEL || category.name === COMPACT_BUFFER_LABEL) return "buffer";
  if (category.isDeferred) return "deferred";
  return "used";
}
//@ chunk-5xgkngpb.js:2427494-2427505 layout
var TOOL_DEFINITION_TOKEN_OVERHEAD = 500;
//@ chunk-5xgkngpb.js:2427505-2427745 layout
/**
 * 按权重把整数总量分配到各项（最大余数法），用于把 token 换算成网格格子数。
 */
function distributeProportionally(total, weights) {
  let reduced = weights.reduce((acc, weight) => acc + weight, 0);
  let mapped = weights.map((weight) => (reduced > 0 ? (weight / reduced) * total : total / weights.length));
  let mapped_2 = mapped.map((exact) => Math.floor(exact));
  let remainingUnits = total - mapped_2.reduce((acc, value) => acc + value, 0);
  let sorted = [...mapped.keys()].sort(
    (indexA, indexB) => mapped[indexB] - mapped_2[indexB] - (mapped[indexA] - mapped_2[indexA]),
  );
  for (let index of sorted) {
    if (remainingUnits <= 0) break;
    mapped_2[index] += 1;
    remainingUnits -= 1;
  }
  return mapped_2;
}
//@ chunk-5xgkngpb.js:2427745-2428126 layout
function createCountEach(count, useBulk) {
  return async (texts) => {
    if (!useBulk || texts.length < 2)
      return Promise.all(
        texts.map(
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
    let filtered = [...texts.keys()].filter((key) => texts[key].trim());
    let mapped = texts.map(() => 0);
    if (filtered.length === 0) return mapped;
    let content = filtered.map((index) => ({
      type: "text",
      text: texts[index],
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
    let weights = distributeProportionally(
      total,
      filtered.map((index) => roughTokenCountEstimation(texts[index])),
    );
    for (let [position, index] of filtered.entries()) mapped[index] = weights[position];
    return mapped;
  };
}
//@ chunk-5xgkngpb.js:2428126-2428326 fingerprint (2.1.88 match: countTokensWithFallback, 0.653)
/**
 * 计 token：count_tokens 不可用时退回本地估算。
 */
function countTokensWithFallback(messages, tools) {
  return async (mappedMessages, apiTools) => {
    try {
      let result = await messages(mappedMessages, apiTools);
      if (result !== null) return result;
    } catch (err) {
      if (!isAbortError(err)) logError(err);
    }
    logForDebugging(`analyzeContext: count unavailable, estimating locally (${apiTools.length} tools)`);
    return tools(mappedMessages, apiTools);
  };
}
//@ chunk-5xgkngpb.js:2428326-2428462 layout
/**
 * 创建 token 计数器；full 模式且 tengu_context_usage_bulk_counts 打开时，把多段文本放进一次 count_tokens 请求批量计数。
 */
function createTokenCounter(detailLevel, host, credentials) {
  let contextTokenCounter = createContextTokenCounter(detailLevel, host, credentials);
  let bulkCountsEnabled =
    detailLevel === "full" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_context_usage_bulk_counts", false);
  return {
    ...contextTokenCounter,
    countEach: createCountEach(contextTokenCounter.count, bulkCountsEnabled),
    bulk: bulkCountsEnabled,
  };
}
//@ chunk-5xgkngpb.js:2428462-2428843 placement
/**
 * 构造 /context 用的 token 计数器：summary 模式用按字节比例的粗估；否则调用计数 API（按宿主对 401 去重并按内容缓存），失败时回退到粗估。
 */
function createContextTokenCounter(detailLevel, host, credentials) {
  let mainLoopModel = getMainLoopModel();
  let bytesPerToken = bytesPerTokenForModel(mainLoopModel);
  let tools = (messages, toolDefs) => {
    let tokenCount = 0;
    for (let message of messages)
      tokenCount += roughTokenCountEstimationForContent(message.content, bytesPerToken);
    if (toolDefs.length > 0)
      tokenCount +=
        roughTokenCountEstimationForFileType(jsonStringify(toolDefs), "json") +
        TOOL_DEFINITION_TOKEN_OVERHEAD;
    return tokenCount;
  };
  if (detailLevel === "summary") {
    let estimateCount = async (messages, toolDefs) => tools(messages, toolDefs);
    return {
      count: estimateCount,
      countTranscript: estimateCount,
    };
  }
  let messages = (messages, toolDefs) =>
    countMessagesTokensWithAPI(messages, toolDefs, mainLoopModel, {
      credentials,
    });
  let oauthDedup = oauth401DedupByHost.of(host);
  let modelFingerprint = jsonStringify([toProviderWireModelId(mainLoopModel), getModelBetas(mainLoopModel)]);
  return {
    count: countTokensWithFallback(
      (messages_2, toolDefs) =>
        oauthDedup.run(computeContentHash(modelFingerprint + jsonStringify([messages_2, toolDefs])), () =>
          messages(messages_2, toolDefs),
        ),
      tools,
    ),
    countTranscript: countTokensWithFallback(messages, tools),
  };
}
//@ chunk-5xgkngpb.js:2428843-2429181 placement
/**
 * 把工具列表转成 API 工具定义（标记延迟/列出、带记录的描述与条目），用于上下文分析。
 */
async function toolsToApiDefinitions(
  tools,
  getToolPermissionContext,
  agentInfo,
  model,
  toolDescriptions,
  toolEntries,
) {
  let { isDeferredToolByEngine } = await import("../tools/ToolSearchTool/prompt.js");
  let nonDeferrableBuiltins = getNonDeferrableBuiltins();
  return Promise.all(
    tools.map((tool) =>
      toolToApiDefinition(tool, {
        getToolPermissionContext,
        tools,
        agents: agentInfo?.activeAgents ?? [],
        model,
        enginePlacement: isDeferredToolByEngine(tool, nonDeferrableBuiltins) ? "deferred" : "listed",
        recordedDescription: toolDescriptions?.get(tool.name),
        recordedEntry: matchesToolName(tool, STRUCTUREDOUTPUT) ? undefined : toolEntries?.get(tool.name),
      }),
    ),
  );
}
//@ chunk-5xgkngpb.js:2429416-2429715 fingerprint (2.1.88 match: countToolDefinitionTokens, 0.863)
/**
 * 计算一组工具定义的 token 数（走 count_tokens，失败时本地估算），扣除固定开销。
 */
async function countToolDefinitionTokens(
  tools,
  getToolPermissionContext,
  agentInfo,
  model,
  credentials,
  toolDescriptions,
  toolEntries,
  countFn = (messages, toolDefs) =>
    countMessagesTokensWithAPI(messages, toolDefs, undefined, {
      credentials,
    }),
) {
  let apiTools = await toolsToApiDefinitions(
    tools,
    getToolPermissionContext,
    agentInfo,
    model,
    toolDescriptions,
    toolEntries,
  );
  let result = await countFn([], apiTools);
  if (result === null || result === 0) {
    let toolNames = tools.map((t) => t.name).join(", ");
    logForDebugging(
      `countToolDefinitionTokens returned ${result} for ${tools.length} tools: ${toolNames.slice(0, 100)}${toolNames.length > 100 ? "..." : ""}`,
    );
  }
  return result ?? 0;
}
//@ chunk-5xgkngpb.js:2429715-2429881 file-local
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
//@ chunk-5xgkngpb.js:2429881-2430403 fingerprint (2.1.88 match: countSystemTokens, 0.768)
async function countSystemTokens(session, systemPrompt, skipSystemContext, count, countEach) {
  let systemContext = skipSystemContext ? {} : await getCachedSystemContext(session);
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
  let redirectedContextTokens = 0;
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
//@ chunk-5xgkngpb.js:2430403-2430770 fingerprint (2.1.88 match: countMemoryFileTokens, 0.796)
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
  let tokenCounts = await countEach(memoryFilesData.map((file) => file.content));
  for (let [index, file] of memoryFilesData.entries()) {
    let tokens = tokenCounts[index] ?? 0;
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
//@ chunk-5xgkngpb.js:2430770-2432159 fingerprint (2.1.88 match: countBuiltInToolTokens, 0.711)
async function countBuiltInToolTokens(
  tools,
  getToolPermissionContext,
  agentInfo,
  model,
  messages,
  credentials,
  runtimeModel,
  context,
  agent,
  counter,
  batch,
) {
  let builtInTools = hideAliasedV1Tools(hideCodeModeOnlyTools(tools).filter((tool) => !tool.isMcp));
  if (builtInTools.length < 1)
    return {
      builtInToolTokens: 0,
      deferredBuiltinDetails: [],
      deferredBuiltinTokens: 0,
      systemToolDetails: [],
    };
  let { isToolSearchEnabled } = await import("./toolSearch.js");
  let { isDeferredToolInConversation } = await import("../tools/ToolSearchTool/prompt.js");
  let toolSearchEnabled = await isToolSearchEnabled(
    model ?? "",
    tools,
    getToolPermissionContext,
    agentInfo?.activeAgents ?? [],
    "analyzeBuiltIn",
    credentials,
    context,
  );
  let isDeferredInConversation = (t) => isDeferredToolInConversation(t, runtimeModel, tools);
  let alwaysLoadedTools = builtInTools.filter((t) => !isDeferredInConversation(t));
  let deferredBuiltinTools = builtInTools.filter(isDeferredInConversation);
  let alwaysLoadedTokens =
    alwaysLoadedTools.length > 0
      ? await countToolDefinitionTokens(
          alwaysLoadedTools,
          getToolPermissionContext,
          agentInfo,
          model,
          undefined,
          context,
          agent,
          counter,
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
  if (!toolSearchEnabled) {
    let deferredTokens = await countToolDefinitionTokens(
      deferredBuiltinTools,
      getToolPermissionContext,
      agentInfo,
      model,
      undefined,
      context,
      agent,
      counter,
    );
    return {
      builtInToolTokens: alwaysLoadedTokens + deferredTokens,
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
        for (let batchToolUse of msg.batchToolUses ?? [])
          if (deferredToolNameSet.has(batchToolUse.name)) loadedToolNames.add(batchToolUse.name);
      }
  }
  let tokensByTool = await countToolTokensPerItem(
    deferredBuiltinTools,
    getToolPermissionContext,
    agentInfo,
    model,
    context,
    agent,
    counter,
    batch,
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
//@ chunk-5xgkngpb.js:2432159-2432191 layout
function findSkillTool(tools) {
  return findToolByName(tools, SKILL);
}
//@ chunk-5xgkngpb.js:2432191-2432495 fingerprint (2.1.88 match: countSlashCommandTokens, 1)
async function countSlashCommandTokens(
  tools,
  getToolPermissionContext,
  agentInfo,
  mcpPromptCommands,
  storageV5,
  toolDescriptions,
  toolEntries,
  count,
) {
  let info = await getSkillToolInfo(
    getCwdOrNull(),
    mcpPromptCommandsWithReserved(mcpPromptCommands),
    storageV5,
  );
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
//@ chunk-5xgkngpb.js:2432495-2433344 fingerprint (2.1.88 match: countSkillTokens, 0.611)
async function countSkillTokens(
  tools,
  getToolPermissionContext,
  agentInfo,
  countModel,
  budgetModel,
  cwd,
  includeHidden,
  storageV5,
  toolDescriptions,
  toolEntries,
  count,
  localPaths,
) {
  try {
    let { merged, included } = await mergedSkillListing(cwd, includeHidden, storageV5);
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
    let tokensBySkill = skillListingTokenCounts(included, countModel, budgetModel);
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
      tokens: tokensBySkill.get(skill.name) ?? 0,
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
//@ chunk-5xgkngpb.js:2433344-2434873 fingerprint (2.1.88 match: countMcpToolTokens, 0.823)
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
  count = (messages, toolDefs) =>
    countMessagesTokensWithAPI(messages, toolDefs, undefined, {
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
  let { isToolSearchEnabled } = await import("./toolSearch.js");
  let { isDeferredToolInConversation } = await import("../tools/ToolSearchTool/prompt.js");
  let isDeferred = await isToolSearchEnabled(
    model,
    tools,
    getToolPermissionContext,
    agentInfo?.activeAgents ?? [],
    "analyzeMcp",
    credentials,
    toolDescriptions,
  );
  let aliasedTools = hideCodeModeOnlyTools(tools);
  let droppedToolNames =
    aliasedTools === tools
      ? new Set()
      : (() => {
          let aliasedNames = new Set(aliasedTools.map((tool) => tool.name));
          return new Set(mcpTools.map((mcpTool) => mcpTool.name).filter((name) => !aliasedNames.has(name)));
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
    let isDropped = droppedToolNames.has(tool.name);
    mcpToolDetails.push({
      name: tool.name,
      serverName: tool.name.split("__")[1] || "unknown",
      tokens: isDropped ? 0 : mcpToolTokensByTool[i],
      isLoaded:
        !isDropped &&
        (loadedMcpToolNames.has(tool.name) ||
          !isDeferredToolInConversation(tool, runtimeModel, tools, {
            nonDeferrableBuiltins,
          })),
    });
  }
  let droppedTokens = 0;
  for (let [index, tool] of mcpTools.entries())
    if (droppedToolNames.has(tool.name)) droppedTokens += mcpToolTokensByTool[index];
  let loadedTokens = 0;
  let deferredToolTokens = 0;
  for (let detail of mcpToolDetails)
    if (detail.isLoaded) loadedTokens += detail.tokens;
    else if (isDeferred) deferredToolTokens += detail.tokens;
  return {
    mcpToolTokens: isDeferred
      ? loadedTokens
      : droppedToolNames.size === mcpTools.length && mcpTools.length > 0
        ? 0
        : Math.max(0, totalTokens - droppedTokens),
    mcpToolDetails,
    deferredToolTokens,
    loadedMcpToolNames,
  };
}
//@ chunk-5xgkngpb.js:2434873-2435441 layout
/**
 * MCP 服务器 instructions 占用的 token；CLAUDE_CODE_DISABLE_ATTACHMENTS 或 CLAUDE_CODE_SIMPLE 时为 0。
 */
async function countMcpInstructionsTokens(mcpClients, count) {
  if (env.CLAUDE_CODE_DISABLE_ATTACHMENTS || env.CLAUDE_CODE_SIMPLE)
    return {
      mcpInstructionsTokens: 0,
      mcpInstructionsDetails: [],
    };
  let sorted = [
    ...computeMcpInstructionsDelta(
      mcpClients.filter(isConnectedOrCached),
      getMcpServerInstructionBlocks(mcpClients),
    ).entries(),
  ].sort(([serverA], [serverB]) => compareStringsGrouped(serverA, serverB));
  if (sorted.length === 0)
    return {
      mcpInstructionsTokens: 0,
      mcpInstructionsDetails: [],
    };
  let content = sorted.map(([, instructions]) => instructions).join(`

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
  let tokensByServer = distributeProportionally(
    total,
    sorted.map(([, instructions]) => roughTokenCountEstimation(instructions)),
  );
  return {
    mcpInstructionsTokens: total,
    mcpInstructionsDetails: sorted.map(([serverName], i) => ({
      serverName,
      tokens: tokensByServer[i] ?? 0,
    })),
  };
}
//@ chunk-5xgkngpb.js:2435441-2435847 fingerprint (2.1.88 match: countCustomAgentTokens, 0.812)
async function countCustomAgentTokens(agentDefinitions, countEach, localPaths) {
  let customAgents = agentDefinitions.activeAgents.filter((activeAgent) => activeAgent.source !== "built-in");
  let agentDetails = [];
  let agentTokens = 0;
  let tokenCounts = await countEach(
    customAgents.map((agent) => [agent.agentType, agent.whenToUse].join(" ")),
  );
  for (let [i, agent] of customAgents.entries()) {
    let tokens = tokenCounts[i] || 0;
    agentTokens += tokens || 0;
    agentDetails.push({
      agentType: agent.agentType,
      source: agent.source,
      ...(localPaths &&
        agent.source === "plugin" && {
          pluginId: agent.plugin,
        }),
      ...(localPaths &&
        agent.filePath !== undefined &&
        isAbsolute(agent.filePath) && {
          path: agent.filePath,
        }),
      tokens: tokens || 0,
    });
  }
  return {
    agentTokens,
    agentDetails,
  };
}
//@ chunk-5xgkngpb.js:2435847-2436107 fingerprint (2.1.88 match: processAssistantMessage, 1)
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
//@ chunk-5xgkngpb.js:2436107-2436505 fingerprint (2.1.88 match: processUserMessage, 1)
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
//@ chunk-5xgkngpb.js:2436505-2436665 fingerprint (2.1.88 match: processAttachment, 1)
function processAttachment(msg, breakdown) {
  let contentStr = roughTokenCountEstimationForObject(msg.attachment);
  breakdown.attachmentTokens += contentStr;
  let attachType = msg.attachment.type || "unknown";
  breakdown.attachmentsByType.set(
    attachType,
    (breakdown.attachmentsByType.get(attachType) || 0) + contentStr,
  );
}
//@ chunk-5xgkngpb.js:2436665-2437558 fingerprint (2.1.88 match: approximateMessageTokens, 0.819)
/**
 * 按消息类型（assistant 工具调用、user 工具结果、附件）累计估算 token，并按工具名分类。
 */
async function approximateMessageTokens(messages, skipTranscriptCount, countTranscript) {
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
  let approximateMessageTokens = skipTranscriptCount
    ? 0
    : await countTranscript(
        normalizeMessagesForAPI(
          messages.filter(
            (message) =>
              !(
                message.type === "attachment" &&
                (message.attachment.type === "instructions" ||
                  message.attachment.type === "mcp_instructions_delta")
              ),
          ),
          undefined,
          undefined,
          {
            echoWireToolInputs: shouldEchoWireToolInputs(messages),
            echoApiBlockOrder: isStellarDriftEnabled(),
          },
        ).map((message) => {
          if (message.type === "assistant")
            return {
              role: "assistant",
              content: message.message.content,
            };
          return message.message;
        }),
        [],
      );
  breakdown.totalTokens = approximateMessageTokens ?? 0;
  return breakdown;
}
//@ chunk-5xgkngpb.js:2437558-2443824 fingerprint (2.1.88 match: analyzeContextUsage, 0.758)
/**
 * /context 的统计：分别计算系统提示、工具定义、MCP 工具、自定义 agent、记忆文件、技能、斜杠命令、消息与附件的 token，加上自动压缩缓冲与剩余空间，生成分类数据和网格。
 */
async function analyzeContextUsage(
  messages,
  model,
  getToolPermissionContext,
  tools,
  agentDefinitions,
  options,
) {
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
  } = options;
  await awaitArtifactRosterSafe(tools);
  let credentials = toolUseContext?.credentials;
  let { count, countTranscript, countEach, bulk } = createTokenCounter(detail, session.host, credentials);
  let runtimeModel = cachedDeclaredTools(toolUseContext ?? {});
  let runtimeModel_2 = getRuntimeMainLoopModel({
    permissionMode: (await getToolPermissionContext()).mode,
    mainLoopModel: model,
  });
  let configuredWindowTokens = isAutoCompactEnabled() ? configuredWindow : undefined;
  let { window: contextWindow, source } = getAutoCompactWindow(
    getModelContextInfo(runtimeModel_2),
    configuredWindowTokens,
  );
  let mcpClients = toolUseContext?.options.mcpClients ?? toolUseContext?.getMcp?.().clients ?? [];
  let defaultSystemPrompt = await getSystemPrompt(tools, runtimeModel_2, {
    excludeDynamicSections,
    analysisOnly: true,
  });
  let effectiveSystemPrompt = effectiveSystemPromptText({
    mainThreadAgentDefinition,
    toolUseContext: {
      options: {
        ...(toolUseContext?.options ?? {}),
        tools,
        mcpClients,
      },
    },
    customSystemPrompt: toolUseContext?.options.customSystemPrompt,
    defaultSystemPrompt,
    appendSystemPrompt: toolUseContext?.options.appendSystemPrompt,
    analysisOnly: true,
  });
  let promptSnapshot;
  let baselineSnapshot;
  if (toolUseContext !== undefined) {
    let postCompactMessages = messagesSinceCompactBoundary(messages);
    promptSnapshot = promptSnapshotUnlessRenderPoint(postCompactMessages, toolUseContext.options);
    baselineSnapshot = snapshotIfEnabled(postCompactMessages, toolUseContext.options);
  }
  let systemPrompt = promptSnapshot?.systemPrompt ?? effectiveSystemPrompt;
  let toolDescriptions = baselineSnapshot?.toolDescriptions;
  let toolEntries = baselineSnapshot?.toolEntries;
  let sourceMessages = originalMessages ?? messages;
  let lastApiUsage = getLastApiUsage(sourceMessages);
  let apiUsage =
    lastApiUsage &&
    lastApiUsage.input_tokens +
      lastApiUsage.cache_creation_input_tokens +
      lastApiUsage.cache_read_input_tokens >
      0
      ? lastApiUsage
      : null;
  let apiUsageTokens = apiUsage
    ? apiUsage.input_tokens + apiUsage.cache_creation_input_tokens + apiUsage.cache_read_input_tokens
    : null;
  let [
    { systemPromptTokens, systemPromptSections, redirectedContextTokens },
    { claudeMdTokens, memoryFileDetails },
    { builtInToolTokens, deferredBuiltinDetails, deferredBuiltinTokens, systemToolDetails },
    { mcpToolTokens, mcpToolDetails, deferredToolTokens },
    { mcpInstructionsTokens, mcpInstructionsDetails },
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
    countMcpInstructionsTokens(mcpClients, count),
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
    approximateMessageTokens(messages, apiUsageTokens !== null, countTranscript),
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
  let messageTokens = messageBreakdown.totalTokens + redirectedContextTokens;
  let isAutoCompact = isAutoCompactEnabled();
  let autoCompactThreshold = isAutoCompact
    ? effectiveContextWindow(getModelContextInfo(model), configuredWindowTokens) - MIN_WINDOW_TOKENS
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
  if (mcpInstructionsTokens > 0)
    cats.push({
      id: "mcp_instructions",
      name: "MCP server instructions",
      tokens: mcpInstructionsTokens,
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
  let bufferTokens = 0;
  let bufferCategory;
  if (!(isAutoCompact && source === "auto")) {
    if (isAutoCompact && autoCompactThreshold !== undefined) {
      bufferTokens = contextWindow - autoCompactThreshold;
      bufferCategory = {
        id: "autocompact_buffer",
        name: AUTOCOMPACT_BUFFER_LABEL,
      };
    } else if (!isAutoCompact) {
      bufferTokens = MAX_WINDOW_TOKENS;
      bufferCategory = {
        id: "compact_buffer",
        name: COMPACT_BUFFER_LABEL,
      };
    }
  }
  let apiTotalTokens = null;
  if (apiUsageTokens !== null) {
    let actualUsage = cats.reduce((sum, cat) => sum + (cat.isDeferred ? 0 : cat.tokens), 0);
    let remainingWindowTokens = contextWindow - actualUsage - bufferTokens;
    let sinceAnchorTokens = estimateTokensSinceAnchor(sourceMessages, bytesPerTokenForModel(runtimeModel_2));
    let apiDerivedTokens = Math.max(0, apiUsageTokens - actualUsage) + sinceAnchorTokens;
    messageTokens = Math.max(0, Math.min(apiDerivedTokens, remainingWindowTokens));
    apiTotalTokens = actualUsage + apiDerivedTokens;
  }
  let unattributedTokens = Math.max(
    0,
    messageTokens -
      messageBreakdown.toolCallTokens -
      messageBreakdown.toolResultTokens -
      messageBreakdown.attachmentTokens -
      messageBreakdown.assistantMessageTokens -
      messageBreakdown.userMessageTokens -
      redirectedContextTokens,
  );
  if (messageTokens > 0)
    cats.push({
      id: "messages",
      name: "Messages",
      tokens: messageTokens,
      color: "purple_FOR_SUBAGENTS_ONLY",
    });
  let reduced = cats.reduce((acc, category) => acc + (category.isDeferred ? 0 : category.tokens), 0);
  if (bufferCategory)
    cats.push({
      ...bufferCategory,
      tokens: bufferTokens,
      color: "inactive",
    });
  let freeTokens = Math.max(0, contextWindow - reduced - bufferTokens);
  cats.push({
    id: "free_space",
    name: FREE_SPACE_LABEL,
    tokens: freeTokens,
    color: "promptBorder",
  });
  let totalTokens = apiTotalTokens ?? reduced;
  let isNarrowScreen = terminalWidth && terminalWidth < 80;
  let isLargeWindow = contextWindow >= 1e6;
  let GRID_WIDTH = isNarrowScreen ? 5 : isLargeWindow ? 20 : 10;
  let GRID_HEIGHT = isLargeWindow ? 10 : isNarrowScreen ? 5 : 10;
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
  let freeSpaceCat = cats.find((freeSpaceCategory) => freeSpaceCategory.name === FREE_SPACE_LABEL);
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
    .sort(
      (leftTool, rightTool) =>
        rightTool.callTokens + rightTool.resultTokens - (leftTool.callTokens + leftTool.resultTokens),
    );
  let attachmentsByTypeArray = Array.from(messageBreakdown.attachmentsByType.entries())
    .map(([name, tokens]) => ({
      name,
      tokens,
    }))
    .sort((leftAttachment, rightAttachment) => rightAttachment.tokens - leftAttachment.tokens);
  let formattedMessageBreakdown = {
    toolCallTokens: messageBreakdown.toolCallTokens,
    toolResultTokens: messageBreakdown.toolResultTokens,
    attachmentTokens: messageBreakdown.attachmentTokens,
    assistantMessageTokens: messageBreakdown.assistantMessageTokens,
    userMessageTokens: messageBreakdown.userMessageTokens,
    redirectedContextTokens,
    unattributedTokens,
    toolCallsByType: toolsByTypeArray,
    attachmentsByType: attachmentsByTypeArray,
  };
  return {
    categories: cats.map((category) => ({
      ...category,
      kind: getContextCategoryKind(category),
    })),
    totalTokens,
    maxTokens: contextWindow,
    rawMaxTokens: contextWindow,
    autocompactSource: source,
    percentage: Math.round((totalTokens / contextWindow) * 100),
    gridRows,
    model: runtimeModel_2,
    memoryFiles: memoryFileDetails,
    mcpTools: mcpToolDetails,
    ...(localPaths && {
      mcpInstructions: mcpInstructionsDetails,
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
    autoCompactThreshold,
    isAutoCompactEnabled: isAutoCompact,
    messageBreakdown: formattedMessageBreakdown,
    apiUsage,
  };
}
export {
  getContextCategoryKind,
  countToolDefinitionTokens,
  TOOL_DEFINITION_TOKEN_OVERHEAD,
  toolsToApiDefinitions,
  distributeProportionally,
  analyzeContextUsage,
};
