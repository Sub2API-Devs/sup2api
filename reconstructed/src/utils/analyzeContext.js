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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
} from "path";
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
import { oauth401DedupByHost } from "./_new/oauth401DedupByHost.js";
import { getModelBetas } from "./betas.js";
import { computeContentHash } from "./commitAttribution.js";
import { getNonDeferrableBuiltins } from "./toolSearch.js";
import { toolToApiDefinition, isStellarDriftEnabled } from "./api.js";
import { toolMatchesName, findToolByName } from "../Tool.js";
import { STRUCTUREDOUTPUT } from "../tools/SyntheticOutputTool/SyntheticOutputTool.js";
import { getCachedSystemContext, mergeByPath, getNonMemoryInstructionFiles } from "../context.js";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../entrypoints/sdk/coreSchemas.js";
import { isClaudeMdLoadingDisabled } from "./settings/customizationDisabled.js";
import { D_e } from "../components/memory/MemoryFileSelector.js";
import { getMemoryFilesCached } from "./claudemd.js";
import { hideAliasedV1Tools } from "../services/tools/batchTools.js";
import { TJ } from "../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { countToolTokensPerItem } from "./settings/mdm/constants.js";
import { SKILL } from "../tools/SkillTool/skillToolNames.js";
import { getSkillToolInfo, mergedSkillListing, skillListingTokenCounts } from "../tools/SkillTool/prompt.js";
import { gl } from "./cwd.js";
import { B7 } from "./commandPredicates.js";
import { getCommandName as getCommandName_2 } from "../commands.js";
import { i3 } from "./permissions/permissionRulePayload.js";
import { skillSourceOf } from "../plugins/functionHooks/skillPromptHooks.js";
import { env } from "./env.js";
import { computeMcpInstructionsDelta } from "./mcpInstructionsDelta.js";
import { isConnectedOrCached } from "../skills/bundled/scheduleRemoteAgents.js";
import { getMcpServerInstructionBlocks } from "./attachments.js";
import { compareStringsGrouped } from "./stringUtils.js";
import { normalizeMessagesForAPI } from "./messages.js";
import { shouldEchoWireToolInputs } from "./wireToolInputEcho.js";
import { awaitArtifactRosterSafe } from "../services/artifacts/rosterWait.js";
import { Hrt } from "../services/api/declaredToolSet.js";
import { getRuntimeMainLoopModel } from "./model/planModeModel.js";
import { isAutoCompactEnabled } from "../services/compact/compactSettings.js";
import { getAutoCompactWindow, estimateTokensSinceAnchor } from "../services/compact/autoCompact.js";
import { getModelContextInfo } from "./model/modelContextInfo.js";
import { getSystemPrompt } from "../constants/prompts.js";
import { u6 } from "./systemPrompt.js";
import { Us } from "../services/projects/threadRows.js";
import { met, j_e } from "./contextAttachments/promptSnapshot.js";
import { getLastApiUsage } from "./tokens.js";
import { effectiveContextWindow, oQt, rjr } from "../services/compact/autoCompactWindow.js";

//@ chunk-e6aww6q8.js:2371933-2371999 fingerprint = MANUAL_COMPACT_BUFFER_NAME (0.536)
var AUTOCOMPACT_BUFFER_LABEL = "Autocompact buffer",
  ive = "Compact buffer",
  eV = "Free space";
/**
 * /context 分类的种类：Free space、Autocompact/Compact buffer、延迟加载项、已使用。
 */
//@ chunk-e6aww6q8.js:2371999-2372134 layout
function getContextCategoryKind(e) {
  if (e.name === eV) return "free";
  if (e.name === AUTOCOMPACT_BUFFER_LABEL || e.name === ive) return "buffer";
  if (e.isDeferred) return "deferred";
  return "used";
}
//@ chunk-e6aww6q8.js:2372134-2372145 layout
var TOOL_DEFINITION_TOKEN_OVERHEAD = 500;
/**
 * 按权重把整数总量分配到各项（最大余数法），用于把 token 换算成网格格子数。
 */
//@ chunk-e6aww6q8.js:2372145-2372385 layout
function distributeProportionally(total, weights) {
  let reduced = weights.reduce((w, L) => w + L, 0),
    mapped = weights.map((w) => (reduced > 0 ? (w / reduced) * total : total / weights.length)),
    mapped_2 = mapped.map((w) => Math.floor(w)),
    y = total - mapped_2.reduce((w, L) => w + L, 0),
    sorted = [...mapped.keys()].sort((w, L) => mapped[L] - mapped_2[L] - (mapped[w] - mapped_2[w]));
  for (let w of sorted) {
    if (y <= 0) break;
    ((mapped_2[w] += 1), (y -= 1));
  }
  return mapped_2;
}
//@ chunk-e6aww6q8.js:2372385-2372766 layout
function createCountEach(e, n) {
  return async (r) => {
    if (!n || r.length < 2)
      return Promise.all(r.map(async (L) => (await e([{ role: "user", content: L }], [])) || 0));
    let filtered = [...r.keys()].filter((L) => r[L].trim()),
      mapped = r.map(() => 0);
    if (filtered.length === 0) return mapped;
    let mapped_2 = filtered.map((L) => ({ type: "text", text: r[L] })),
      S = (await e([{ role: "user", content: mapped_2 }], [])) || 0,
      w = distributeProportionally(
        S,
        filtered.map((L) => roughTokenCountEstimation(r[L])),
      );
    for (let [L, G] of filtered.entries()) mapped[G] = w[L];
    return mapped;
  };
}
/**
 * 计 token：count_tokens 不可用时退回本地估算。
 */
//@ chunk-e6aww6q8.js:2372766-2372966 fingerprint = countTokensWithFallback (0.652)
function countTokensWithFallback(messages, tools) {
  return async (r, s) => {
    try {
      let result = await messages(r, s);
      if (result !== null) return result;
    } catch (err) {
      if (!isAbortError(err)) logError(err);
    }
    return (
      logForDebugging(`analyzeContext: count unavailable, estimating locally (${s.length} tools)`),
      tools(r, s)
    );
  };
}
/**
 * 创建 token 计数器；full 模式且 tengu_context_usage_bulk_counts 打开时，把多段文本放进一次 count_tokens 请求批量计数。
 */
//@ chunk-e6aww6q8.js:2372966-2373102 layout
function createTokenCounter(e, n, r) {
  let s = createContextTokenCounter(e, n, r),
    h = e === "full" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_context_usage_bulk_counts", !1);
  return { ...s, countEach: createCountEach(s.count, h), bulk: h };
}
/**
 * 构造 /context 用的 token 计数器：summary 模式用按字节比例的粗估；否则调用计数 API（按宿主对 401 去重并按内容缓存），失败时回退到粗估。
 */
//@ chunk-e6aww6q8.js:2373102-2373477 placement
function createContextTokenCounter(e, n, r) {
  let s = getMainLoopModel(),
    h = bytesPerTokenForModel(s),
    y = (G, q) => {
      let Z = 0;
      for (let Se of G) Z += roughTokenCountEstimationForContent(Se.content, h);
      if (q.length > 0)
        Z += roughTokenCountEstimationForFileType(jsonStringify(q), "json") + TOOL_DEFINITION_TOKEN_OVERHEAD;
      return Z;
    };
  if (e === "summary") {
    let G = async (q, Z) => y(q, Z);
    return { count: G, countTranscript: G };
  }
  let S = (G, q) => countMessagesTokensWithAPI(G, q, s, { credentials: r }),
    of = oauth401DedupByHost.of(n),
    L = jsonStringify([toProviderWireModelId(s), getModelBetas(s)]);
  return {
    count: countTokensWithFallback(
      (G, q) => of.run(computeContentHash(L + jsonStringify([G, q])), () => S(G, q)),
      y,
    ),
    countTranscript: countTokensWithFallback(S, y),
  };
}
/**
 * 把工具列表转成 API 工具定义（标记延迟/列出、带记录的描述与条目），用于上下文分析。
 */
//@ chunk-e6aww6q8.js:2373477-2373815 placement
async function toolsToApiDefinitions(e, n, r, s, h, y) {
  let { isDeferredToolByEngine: isDeferredToolByEngine } = await import("./chunk-pk01bzyd.js"),
    w = getNonDeferrableBuiltins();
  return Promise.all(
    e.map((L) =>
      toolToApiDefinition(L, {
        getToolPermissionContext: n,
        tools: e,
        agents: r?.activeAgents ?? [],
        model: s,
        enginePlacement: isDeferredToolByEngine(L, w) ? "deferred" : "listed",
        recordedDescription: h?.get(L.name),
        recordedEntry: toolMatchesName(L, STRUCTUREDOUTPUT) ? void 0 : y?.get(L.name),
      }),
    ),
  );
}
/**
 * 计算一组工具定义的 token 数（走 count_tokens，失败时本地估算），扣除固定开销。
 */
//@ chunk-e6aww6q8.js:2374050-2374347 fingerprint = countToolDefinitionTokens (0.863)
async function countToolDefinitionTokens(
  e,
  n,
  r,
  s,
  h,
  y,
  S,
  w = (L, G) => countMessagesTokensWithAPI(L, G, void 0, { credentials: h }),
) {
  let L = await toolsToApiDefinitions(e, n, r, s, y, S),
    result = await w([], L);
  if (result === null || result === 0) {
    let toolNames = e.map((Z) => Z.name).join(", ");
    logForDebugging(
      `countToolDefinitionTokens returned ${result} for ${e.length} tools: ${toolNames.slice(0, 100)}${toolNames.length > 100 ? "..." : ""}`,
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
      .find((s) => s.trim().length > 0) ?? "";
  return firstLine.length > 40 ? firstLine.slice(0, 40) + "\u2026" : firstLine;
}
//@ chunk-e6aww6q8.js:2374513-2375019 fingerprint = countSystemTokens (0.767)
async function countSystemTokens(e, n, r, s, h) {
  let y = r ? {} : await getCachedSystemContext(e),
    namedEntries = [
      ...n
        .filter((content) => content.length > 0 && content !== SYSTEM_PROMPT_DYNAMIC_BOUNDARY)
        .map((content) => ({ name: extractSectionName(content), content: content })),
      ...Object.entries(y)
        .filter(([, Z]) => Z.length > 0)
        .map(([Z, Se]) => ({ name: Z, content: Se })),
    ],
    w = 0;
  if (namedEntries.length < 1)
    return { systemPromptTokens: 0, systemPromptSections: [], redirectedContextTokens: 0 };
  let L = await h(namedEntries.map(({ content: content }) => content)),
    systemPromptSections = namedEntries.map((entry, Se) => ({ name: entry.name, tokens: L[Se] || 0 }));
  return {
    systemPromptTokens: L.reduce((sum, tokens) => sum + (tokens || 0), 0),
    systemPromptSections: systemPromptSections,
    redirectedContextTokens: 0,
  };
}
//@ chunk-e6aww6q8.js:2375019-2375386 fingerprint = countMemoryFileTokens (0.796)
async function countMemoryFileTokens(e, n, r) {
  if (isClaudeMdLoadingDisabled()) return { memoryFileDetails: [], claudeMdTokens: 0 };
  let s = mergeByPath(D_e(await getMemoryFilesCached(e, !1, n)), await getNonMemoryInstructionFiles(e)),
    memoryFileDetails = [],
    claudeMdTokens = 0;
  if (s.length < 1) return { memoryFileDetails: [], claudeMdTokens: 0 };
  let S = await r(s.map((file) => file.content));
  for (let [w, L] of s.entries()) {
    let G = S[w] ?? 0;
    ((claudeMdTokens += G), memoryFileDetails.push({ path: L.path, type: L.type, tokens: G }));
  }
  return { claudeMdTokens: claudeMdTokens, memoryFileDetails: memoryFileDetails };
}
//@ chunk-e6aww6q8.js:2375386-2376771 fingerprint = countBuiltInToolTokens (0.727)
async function countBuiltInToolTokens(e, n, r, s, h, y, S, w, L, G, q) {
  let Z = hideAliasedV1Tools(TJ(e).filter((tool) => !tool.isMcp));
  if (Z.length < 1)
    return {
      builtInToolTokens: 0,
      deferredBuiltinDetails: [],
      deferredBuiltinTokens: 0,
      systemToolDetails: [],
    };
  let { isToolSearchEnabled: isToolSearchEnabled } = await import("./chunk-emm38ary.js"),
    { isDeferredToolInConversation: isDeferredToolInConversation } = await import("./chunk-pk01bzyd.js"),
    we = await isToolSearchEnabled(s ?? "", e, n, r?.activeAgents ?? [], "analyzeBuiltIn", y, w),
    Ee = (Et) => isDeferredToolInConversation(Et, S, e),
    alwaysLoadedTools = Z.filter((Et) => !Ee(Et)),
    deferredBuiltinTools = Z.filter(Ee),
    alwaysLoadedTokens =
      alwaysLoadedTools.length > 0
        ? await countToolDefinitionTokens(alwaysLoadedTools, n, r, s, void 0, w, L, G)
        : 0,
    We = [];
  if (deferredBuiltinTools.length === 0)
    return {
      builtInToolTokens: alwaysLoadedTokens,
      deferredBuiltinDetails: [],
      deferredBuiltinTokens: 0,
      systemToolDetails: We,
    };
  if (!we) {
    let Et = await countToolDefinitionTokens(deferredBuiltinTools, n, r, s, void 0, w, L, G);
    return {
      builtInToolTokens: alwaysLoadedTokens + Et,
      deferredBuiltinDetails: [],
      deferredBuiltinTokens: 0,
      systemToolDetails: We,
    };
  }
  let ze = [],
    lt = 0,
    Je = 0,
    loadedToolNames = new Set();
  if (h) {
    let deferredToolNameSet = new Set(deferredBuiltinTools.map((yt) => yt.name));
    for (let msg of h)
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
  let pt = await countToolTokensPerItem(deferredBuiltinTools, n, r, s, w, L, G, q);
  for (let [Et, yt] of deferredBuiltinTools.entries()) {
    let gt = pt[Et] ?? 0,
      isLoaded = loadedToolNames.has(yt.name);
    if ((ze.push({ name: yt.name, tokens: gt, isLoaded: isLoaded }), (Je += gt), isLoaded)) lt += gt;
  }
  return {
    builtInToolTokens: alwaysLoadedTokens + lt,
    deferredBuiltinDetails: ze,
    deferredBuiltinTokens: Je - lt,
    systemToolDetails: We,
  };
}
//@ chunk-e6aww6q8.js:2376771-2376803 layout
function findSkillTool(e) {
  return findToolByName(e, SKILL);
}
//@ chunk-e6aww6q8.js:2376803-2377107 fingerprint = countSlashCommandTokens (1)
async function countSlashCommandTokens(e, n, r, s, h, y, S, w) {
  let L = await getSkillToolInfo(gl(), B7(s), h),
    slashCommandTool = findSkillTool(e);
  if (!slashCommandTool)
    return { slashCommandTokens: 0, commandInfo: { totalCommands: 0, includedCommands: 0 } };
  return {
    slashCommandTokens: await countToolDefinitionTokens([slashCommandTool], n, r, void 0, void 0, y, S, w),
    commandInfo: { totalCommands: L.totalCommands, includedCommands: L.includedCommands },
  };
}
//@ chunk-e6aww6q8.js:2377107-2377953 fingerprint = countSkillTokens (0.611)
async function countSkillTokens(e, n, r, s, h, y, S, w, L, G, q, Z) {
  try {
    let { merged: merged, included: included } = await mergedSkillListing(y, S, w),
      slashCommandTool = findSkillTool(e);
    if (!slashCommandTool)
      return { skillTokens: 0, skillInfo: { totalSkills: 0, includedSkills: 0, skillFrontmatter: [] } };
    let Ee = await countToolDefinitionTokens([slashCommandTool], n, r, void 0, void 0, L, G, q),
      Ae = skillListingTokenCounts(included, s, h),
      skillFrontmatter = included.map((skill) => ({
        name: getCommandName_2(skill),
        source:
          skill.type === "prompt" && i3(skill.pluginInfo?.repository) ? "syncedSkills" : skillSourceOf(skill),
        pluginName: skill.type === "prompt" ? skill.pluginInfo?.pluginManifest.name : void 0,
        ...(Z &&
          skill.type === "prompt" &&
          skill.pluginInfo !== void 0 && { pluginId: skill.pluginInfo.repository }),
        ...(Z &&
          skill.type === "prompt" &&
          skill.skillFile?.path !== void 0 && { path: skill.skillFile.path }),
        tokens: Ae.get(skill.name) ?? 0,
      })),
      Me = merged.length;
    return {
      skillTokens: Ee,
      skillInfo: { totalSkills: Me, includedSkills: included.length, skillFrontmatter: skillFrontmatter },
    };
  } catch (error) {
    return (
      logError(toError(error)),
      { skillTokens: 0, skillInfo: { totalSkills: 0, includedSkills: 0, skillFrontmatter: [] } }
    );
  }
}
//@ chunk-e6aww6q8.js:2377953-2379476 fingerprint = countMcpToolTokens (0.832)
async function countMcpToolTokens(
  e,
  n,
  r,
  s,
  h,
  y,
  S,
  w,
  L,
  G = (q, Z) => countMessagesTokensWithAPI(q, Z, void 0, { credentials: y }),
) {
  let mcpTools = e.filter((tool) => tool.isMcp),
    mcpToolDetails = [],
    Se = await countToolDefinitionTokens(mcpTools, n, r, s, void 0, w, L, G),
    totalTokens = Math.max(0, (Se || 0) - TOOL_DEFINITION_TOKEN_OVERHEAD),
    estimates = await Promise.all(
      mcpTools.map(async (gt) =>
        roughTokenCountEstimation(
          jsonStringify({
            name: gt.name,
            description: await gt.prompt({
              getToolPermissionContext: n,
              tools: e,
              agents: r?.activeAgents ?? [],
            }),
            input_schema: gt.inputJSONSchema ?? {},
          }),
        ),
      ),
    ),
    estimateTotal = estimates.reduce((gt, At) => gt + At, 0) || 1,
    mcpToolTokensByTool = estimates.map((gt) => Math.round((gt / estimateTotal) * totalTokens)),
    { isToolSearchEnabled: isToolSearchEnabled } = await import("./chunk-emm38ary.js"),
    { isDeferredToolInConversation: isDeferredToolInConversation } = await import("./chunk-pk01bzyd.js"),
    We = await isToolSearchEnabled(s, e, n, r?.activeAgents ?? [], "analyzeMcp", y, w),
    ze = TJ(e),
    lt =
      ze === e
        ? new Set()
        : (() => {
            let gt = new Set(ze.map((At) => At.name));
            return new Set(mcpTools.map((At) => At.name).filter((At) => !gt.has(At)));
          })(),
    loadedMcpToolNames = new Set();
  if (We && h) {
    let mcpToolNameSet = new Set(mcpTools.map((At) => At.name));
    for (let msg of h)
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
  let nt = getNonDeferrableBuiltins();
  for (let [gt, At] of mcpTools.entries()) {
    let It = lt.has(At.name);
    mcpToolDetails.push({
      name: At.name,
      serverName: At.name.split("__")[1] || "unknown",
      tokens: It ? 0 : mcpToolTokensByTool[gt],
      isLoaded:
        !It &&
        (loadedMcpToolNames.has(At.name) ||
          !isDeferredToolInConversation(At, S, e, { nonDeferrableBuiltins: nt })),
    });
  }
  let pt = 0;
  for (let [gt, At] of mcpTools.entries()) if (lt.has(At.name)) pt += mcpToolTokensByTool[gt];
  let Et = 0,
    yt = 0;
  for (let detail of mcpToolDetails)
    if (detail.isLoaded) Et += detail.tokens;
    else if (We) yt += detail.tokens;
  return {
    mcpToolTokens: We
      ? Et
      : lt.size === mcpTools.length && mcpTools.length > 0
        ? 0
        : Math.max(0, totalTokens - pt),
    mcpToolDetails: mcpToolDetails,
    deferredToolTokens: yt,
    loadedMcpToolNames: loadedMcpToolNames,
  };
}
/**
 * MCP 服务器 instructions 占用的 token；CLAUDE_CODE_DISABLE_ATTACHMENTS 或 CLAUDE_CODE_SIMPLE 时为 0。
 */
//@ chunk-e6aww6q8.js:2379476-2380044 layout
async function countMcpInstructionsTokens(e, n) {
  if (env.CLAUDE_CODE_DISABLE_ATTACHMENTS || env.CLAUDE_CODE_SIMPLE)
    return { mcpInstructionsTokens: 0, mcpInstructionsDetails: [] };
  let sorted = [
    ...computeMcpInstructionsDelta(e.filter(isConnectedOrCached), getMcpServerInstructionBlocks(e)).entries(),
  ].sort(([S], [w]) => compareStringsGrouped(S, w));
  if (sorted.length === 0) return { mcpInstructionsTokens: 0, mcpInstructionsDetails: [] };
  let joined = sorted.map(([, S]) => S).join(`

`),
    h = (await n([{ role: "user", content: joined }], [])) ?? 0;
  if (h === 0) return { mcpInstructionsTokens: 0, mcpInstructionsDetails: [] };
  let y = distributeProportionally(
    h,
    sorted.map(([, S]) => roughTokenCountEstimation(S)),
  );
  return {
    mcpInstructionsTokens: h,
    mcpInstructionsDetails: sorted.map(([S], w) => ({ serverName: S, tokens: y[w] ?? 0 })),
  };
}
//@ chunk-e6aww6q8.js:2380044-2380450 fingerprint = countCustomAgentTokens (0.812)
async function countCustomAgentTokens(e, n, r) {
  let customAgents = e.activeAgents.filter((activeAgent) => activeAgent.source !== "built-in"),
    agentDetails = [],
    agentTokens = 0,
    S = await n(customAgents.map((agent) => [agent.agentType, agent.whenToUse].join(" ")));
  for (let [w, L] of customAgents.entries()) {
    let tokens = S[w] || 0;
    ((agentTokens += tokens || 0),
      agentDetails.push({
        agentType: L.agentType,
        source: L.source,
        ...(r && L.source === "plugin" && { pluginId: L.plugin }),
        ...(r && L.filePath !== void 0 && isAbsolute_39(L.filePath) && { path: L.filePath }),
        tokens: tokens || 0,
      }));
  }
  return { agentTokens: agentTokens, agentDetails: agentDetails };
}
//@ chunk-e6aww6q8.js:2380450-2380710 fingerprint = processAssistantMessage (1)
function processAssistantMessage(msg, breakdown) {
  for (let block of msg.message.content) {
    let blockStr = jsonStringify(block),
      blockTokens = roughTokenCountEstimation(blockStr);
    if ("type" in block && block.type === "tool_use") {
      breakdown.toolCallTokens += blockTokens;
      let toolName = ("name" in block ? block.name : void 0) || "unknown";
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
    let blockStr = jsonStringify(block),
      blockTokens = roughTokenCountEstimation(blockStr);
    if ("type" in block && block.type === "tool_result") {
      breakdown.toolResultTokens += blockTokens;
      let toolUseId = "tool_use_id" in block ? block.tool_use_id : void 0,
        toolName = (toolUseId ? toolUseIdToName.get(toolUseId) : void 0) || "unknown";
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
/**
 * 按消息类型（assistant 工具调用、user 工具结果、附件）累计估算 token，并按工具名分类。
 */
//@ chunk-e6aww6q8.js:2381268-2382161 fingerprint = approximateMessageTokens (0.831)
async function approximateMessageTokens(e, n, r) {
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
    },
    toolUseIdToName = new Map();
  for (let S of e)
    if (S.type === "assistant") {
      for (let block of S.message.content)
        if ("type" in block && block.type === "tool_use") {
          let L = "id" in block ? block.id : void 0,
            toolName = ("name" in block ? block.name : void 0) || "unknown";
          if (L) toolUseIdToName.set(L, toolName);
        }
    }
  for (let S of e)
    if (S.type === "assistant") processAssistantMessage(S, breakdown);
    else if (S.type === "user") processUserMessage(S, breakdown, toolUseIdToName);
    else if (S.type === "attachment") processAttachment(S, breakdown);
  let y = n
    ? 0
    : await r(
        normalizeMessagesForAPI(
          e.filter(
            (S) =>
              !(
                S.type === "attachment" &&
                (S.attachment.type === "instructions" || S.attachment.type === "mcp_instructions_delta")
              ),
          ),
          void 0,
          void 0,
          { echoWireToolInputs: shouldEchoWireToolInputs(e), echoApiBlockOrder: isStellarDriftEnabled() },
        ).map((S) => {
          if (S.type === "assistant") return { role: "assistant", content: S.message.content };
          return S.message;
        }),
        [],
      );
  return ((breakdown.totalTokens = y ?? 0), breakdown);
}
/**
 * /context 的统计：分别计算系统提示、工具定义、MCP 工具、自定义 agent、记忆文件、技能、斜杠命令、消息与附件的 token，加上自动压缩缓冲与剩余空间，生成分类数据和网格。
 */
//@ chunk-e6aww6q8.js:2382161-2388424 fingerprint = analyzeContextUsage (0.756)
async function analyzeContextUsage(e, n, r, s, h, y) {
  let {
    session: session,
    terminalWidth: terminalWidth,
    toolUseContext: toolUseContext,
    mainThreadAgentDefinition: mainThreadAgentDefinition,
    originalMessages: originalMessages,
    configuredWindow: configuredWindow,
    excludeDynamicSections: excludeDynamicSections,
    detail: detail = "full",
    localPaths: localPaths = !1,
  } = y;
  await awaitArtifactRosterSafe(s);
  let Ee = toolUseContext?.credentials,
    {
      count: count,
      countTranscript: countTranscript,
      countEach: countEach,
      bulk: bulk,
    } = createTokenCounter(detail, session.host, Ee),
    runtimeModel = Hrt(toolUseContext ?? {}),
    effectiveSystemPrompt = getRuntimeMainLoopModel({ permissionMode: (await r()).mode, mainLoopModel: n }),
    Je = isAutoCompactEnabled() ? configuredWindow : void 0,
    { window: nt, source: source } = getAutoCompactWindow(getModelContextInfo(effectiveSystemPrompt), Je),
    Et = toolUseContext?.options.mcpClients ?? toolUseContext?.getMcp?.().clients ?? [],
    skillResult = await getSystemPrompt(s, effectiveSystemPrompt, {
      excludeDynamicSections: excludeDynamicSections,
      analysisOnly: !0,
    }),
    gt = u6({
      mainThreadAgentDefinition: mainThreadAgentDefinition,
      toolUseContext: { options: { ...(toolUseContext?.options ?? {}), tools: s, mcpClients: Et } },
      customSystemPrompt: toolUseContext?.options.customSystemPrompt,
      defaultSystemPrompt: skillResult,
      appendSystemPrompt: toolUseContext?.options.appendSystemPrompt,
      analysisOnly: !0,
    }),
    At,
    It;
  if (toolUseContext !== void 0) {
    let yr = Us(e);
    ((At = met(yr, toolUseContext.options)), (It = j_e(yr, toolUseContext.options)));
  }
  let Yt = At?.systemPrompt ?? gt,
    qt = It?.toolDescriptions,
    Zt = It?.toolEntries,
    rn = originalMessages ?? e,
    pn = getLastApiUsage(rn),
    no = pn && pn.input_tokens + pn.cache_creation_input_tokens + pn.cache_read_input_tokens > 0 ? pn : null,
    hn = no ? no.input_tokens + no.cache_creation_input_tokens + no.cache_read_input_tokens : null,
    [
      { systemPromptTokens: ho, systemPromptSections: yn, redirectedContextTokens: Kn },
      { claudeMdTokens: Xn, memoryFileDetails: fo },
      { builtInToolTokens: To, deferredBuiltinDetails: bo, deferredBuiltinTokens: vn, systemToolDetails: co },
      { mcpToolTokens: So, mcpToolDetails: ko, deferredToolTokens: un },
      { mcpInstructionsTokens: ao, mcpInstructionsDetails: $o },
      { agentTokens: yo, agentDetails: Ho },
      { slashCommandTokens: rr, commandInfo: br },
      Hr,
    ] = await Promise.all([
      countSystemTokens(
        session,
        Yt,
        excludeDynamicSections && toolUseContext?.options.customSystemPrompt === void 0,
        count,
        countEach,
      ),
      countMemoryFileTokens(session, toolUseContext?.storageV5, countEach),
      countBuiltInToolTokens(s, r, h, effectiveSystemPrompt, e, Ee, runtimeModel, qt, Zt, count, bulk),
      countMcpToolTokens(s, r, h, effectiveSystemPrompt, e, Ee, runtimeModel, qt, Zt, count),
      countMcpInstructionsTokens(Et, count),
      countCustomAgentTokens(h, countEach, localPaths),
      countSlashCommandTokens(
        s,
        r,
        h,
        toolUseContext?.getMcp?.().commands ?? [],
        toolUseContext?.storageV5,
        qt,
        Zt,
        count,
      ),
      approximateMessageTokens(e, hn !== null, countTranscript),
    ]),
    skillInfo = (
      await countSkillTokens(
        s,
        r,
        h,
        effectiveSystemPrompt,
        n,
        toolUseContext?.getMcp?.().commands ?? [],
        toolUseContext?.agentId,
        toolUseContext?.storageV5,
        qt,
        Zt,
        count,
        localPaths,
      )
    ).skillInfo,
    skillFrontmatterTokens = skillInfo.skillFrontmatter.reduce((sum, skill) => sum + skill.tokens, 0),
    Cr = Hr.totalTokens + Kn,
    isAutoCompact = isAutoCompactEnabled(),
    Oo = isAutoCompact ? effectiveContextWindow(getModelContextInfo(n), Je) - oQt : void 0,
    jr = [];
  if (ho > 0) jr.push({ id: "system_prompt", name: "System prompt", tokens: ho, color: "promptBorder" });
  let Or = To - skillFrontmatterTokens;
  if (Or > 0) jr.push({ id: "system_tools", name: "System tools", tokens: Or, color: "inactive" });
  if (So > 0) jr.push({ id: "mcp_tools", name: "MCP tools", tokens: So, color: "cyan_FOR_SUBAGENTS_ONLY" });
  if (ao > 0)
    jr.push({
      id: "mcp_instructions",
      name: "MCP server instructions",
      tokens: ao,
      color: "green_FOR_SUBAGENTS_ONLY",
    });
  if (un > 0)
    jr.push({
      id: "mcp_tools_deferred",
      name: "MCP tools (deferred)",
      tokens: un,
      color: "inactive",
      isDeferred: !0,
    });
  if (vn > 0)
    jr.push({
      id: "system_tools_deferred",
      name: "System tools (deferred)",
      tokens: vn,
      color: "inactive",
      isDeferred: !0,
    });
  if (yo > 0) jr.push({ id: "custom_agents", name: "Custom agents", tokens: yo, color: "permission" });
  if (Xn > 0) jr.push({ id: "memory_files", name: "Memory files", tokens: Xn, color: "claude" });
  if (skillFrontmatterTokens > 0)
    jr.push({ id: "skills", name: "Skills", tokens: skillFrontmatterTokens, color: "warning" });
  let Io = 0,
    zo;
  if (!(isAutoCompact && source === "auto")) {
    if (isAutoCompact && Oo !== void 0)
      ((Io = nt - Oo), (zo = { id: "autocompact_buffer", name: AUTOCOMPACT_BUFFER_LABEL }));
    else if (!isAutoCompact) ((Io = rjr), (zo = { id: "compact_buffer", name: ive }));
  }
  let Es = null;
  if (hn !== null) {
    let actualUsage = jr.reduce((sum, cat) => sum + (cat.isDeferred ? 0 : cat.tokens), 0),
      Kr = nt - actualUsage - Io,
      Li = estimateTokensSinceAnchor(rn, bytesPerTokenForModel(effectiveSystemPrompt)),
      Qs = Math.max(0, hn - actualUsage) + Li;
    ((Cr = Math.max(0, Math.min(Qs, Kr))), (Es = actualUsage + Qs));
  }
  let max = Math.max(
    0,
    Cr -
      Hr.toolCallTokens -
      Hr.toolResultTokens -
      Hr.attachmentTokens -
      Hr.assistantMessageTokens -
      Hr.userMessageTokens -
      Kn,
  );
  if (Cr > 0) jr.push({ id: "messages", name: "Messages", tokens: Cr, color: "purple_FOR_SUBAGENTS_ONLY" });
  let reduced = jr.reduce((yr, Kr) => yr + (Kr.isDeferred ? 0 : Kr.tokens), 0);
  if (zo) jr.push({ ...zo, tokens: Io, color: "inactive" });
  let freeTokens = Math.max(0, nt - reduced - Io);
  jr.push({ id: "free_space", name: eV, tokens: freeTokens, color: "promptBorder" });
  let as = Es ?? reduced,
    Vi = terminalWidth && terminalWidth < 80,
    ji = nt >= 1e6,
    Wi = Vi ? 5 : ji ? 20 : 10,
    ii = ji ? 10 : Vi ? 5 : 10,
    wa = Wi * ii,
    mapped = jr
      .filter((cat) => !cat.isDeferred)
      .map((cat) => ({
        ...cat,
        squares:
          cat.name === eV
            ? Math.round((cat.tokens / nt) * wa)
            : Math.max(1, Math.round((cat.tokens / nt) * wa)),
        percentageOfTotal: Math.round((cat.tokens / nt) * 100),
      }));
  function createCategorySquares(category) {
    let Kr = [],
      Li = (category.tokens / nt) * wa,
      wholeSquares = Math.floor(Li),
      Hi = Li - wholeSquares;
    for (let Xa = 0; Xa < category.squares; Xa++) {
      let squareFullness = 1;
      if (Xa === wholeSquares && Hi > 0) squareFullness = Hi;
      Kr.push({
        color: category.color,
        isFilled: !0,
        categoryName: category.name,
        tokens: category.tokens,
        percentage: category.percentageOfTotal,
        squareFullness: squareFullness,
      });
    }
    return Kr;
  }
  let $a = [],
    reservedCategory = mapped.find((cat) => cat.name === AUTOCOMPACT_BUFFER_LABEL || cat.name === ive),
    nonReservedCategories = mapped.filter(
      (cat) => cat.name !== AUTOCOMPACT_BUFFER_LABEL && cat.name !== ive && cat.name !== eV,
    );
  for (let cat of nonReservedCategories) {
    let squares = createCategorySquares(cat);
    for (let square of squares) if ($a.length < wa) $a.push(square);
  }
  let Vs = reservedCategory ? reservedCategory.squares : 0,
    freeSpaceCat = jr.find((yr) => yr.name === eV),
    jo = wa - Vs;
  while ($a.length < jo)
    $a.push({
      color: "promptBorder",
      isFilled: !0,
      categoryName: eV,
      tokens: freeSpaceCat?.tokens || 0,
      percentage: freeSpaceCat ? Math.round((freeSpaceCat.tokens / nt) * 100) : 0,
      squareFullness: 1,
    });
  if (reservedCategory) {
    let squares = createCategorySquares(reservedCategory);
    for (let square of squares) if ($a.length < wa) $a.push(square);
  }
  let Qr = [];
  for (let yr = 0; yr < ii; yr++) Qr.push($a.slice(yr * Wi, (yr + 1) * Wi));
  let toolsMap = new Map();
  for (let [yr, Kr] of Hr.toolCallsByType.entries()) {
    let Li = toolsMap.get(yr) || { callTokens: 0, resultTokens: 0 };
    toolsMap.set(yr, { ...Li, callTokens: Kr });
  }
  for (let [yr, Kr] of Hr.toolResultsByType.entries()) {
    let Li = toolsMap.get(yr) || { callTokens: 0, resultTokens: 0 };
    toolsMap.set(yr, { ...Li, resultTokens: Kr });
  }
  let toolsByTypeArray = Array.from(toolsMap.entries())
      .map(([yr, { callTokens: Kr, resultTokens: Li }]) => ({ name: yr, callTokens: Kr, resultTokens: Li }))
      .sort((yr, Kr) => Kr.callTokens + Kr.resultTokens - (yr.callTokens + yr.resultTokens)),
    attachmentsByTypeArray = Array.from(Hr.attachmentsByType.entries())
      .map(([yr, Kr]) => ({ name: yr, tokens: Kr }))
      .sort((yr, Kr) => Kr.tokens - yr.tokens),
    Di = {
      toolCallTokens: Hr.toolCallTokens,
      toolResultTokens: Hr.toolResultTokens,
      attachmentTokens: Hr.attachmentTokens,
      assistantMessageTokens: Hr.assistantMessageTokens,
      userMessageTokens: Hr.userMessageTokens,
      redirectedContextTokens: Kn,
      unattributedTokens: max,
      toolCallsByType: toolsByTypeArray,
      attachmentsByType: attachmentsByTypeArray,
    };
  return {
    categories: jr.map((yr) => ({ ...yr, kind: getContextCategoryKind(yr) })),
    totalTokens: as,
    maxTokens: nt,
    rawMaxTokens: nt,
    autocompactSource: source,
    percentage: Math.round((as / nt) * 100),
    gridRows: Qr,
    model: effectiveSystemPrompt,
    memoryFiles: fo,
    mcpTools: ko,
    ...(localPaths && { mcpInstructions: $o }),
    deferredBuiltinTools: void 0,
    systemTools: void 0,
    systemPromptSections: void 0,
    agents: Ho,
    slashCommands:
      rr > 0
        ? { totalCommands: br.totalCommands, includedCommands: br.includedCommands, tokens: rr }
        : void 0,
    skills:
      skillFrontmatterTokens > 0
        ? {
            totalSkills: skillInfo.totalSkills,
            includedSkills: skillInfo.includedSkills,
            tokens: skillFrontmatterTokens,
            skillFrontmatter: skillInfo.skillFrontmatter,
          }
        : void 0,
    autoCompactThreshold: Oo,
    isAutoCompactEnabled: isAutoCompact,
    messageBreakdown: Di,
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
