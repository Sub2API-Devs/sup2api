/**
 * tools/AgentTool/loadAgentsDir.ts
 *
 * 代理定义加载：markdown/JSON 解析、--agents 校验、多来源合并、插件运行时注册代理、MCP 依赖判定与缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/AgentTool/loadAgentsDir.ts
 * pieces: chunk-0tkmvwy0.js (2), chunk-e6aww6q8.js (41)
 * attribution: sole-consumer 1, fingerprint 6, placement 7, facade-exports 19, layout 9, file-local 1
 */
import { basename } from "path";
import { env } from "../../utils/env.js";
import { getIsNonInteractiveSession, getRootSession } from "../../bootstrap/state.js";
import { isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  isPolicyAllowed as isPolicyAllowed_3,
  getResponseFromCache,
} from "../../services/policyLimits/policyEvidence.js";
import { ALLOW_WEB_FETCH } from "../WebFetchTool/prompt.js";
import { raceWithAbortSignalPastInterrupt } from "../../utils/abortController.js";
import { AbortError as AbortError_2 } from "../../utils/errors.js";
import { GENERAL_PURPOSE_AGENT } from "./built-in/generalPurposeAgent.js";
import { isSafeMode } from "../../utils/envUtils.js";
import { STATUSLINE_SETUP_AGENT } from "./built-in/statuslineSetup.js";
import { isAgentViewDisabled } from "../../utils/fleetGates.js";
import { isExplorePlanAgentsEnabled } from "./builtInAgentGate.js";
import { EXPLORE_AGENT } from "./built-in/exploreAgent.js";
import { PLAN_AGENT } from "./built-in/planAgent.js";
import { WEB_FETCH_BUILTIN_AGENT } from "./built-in/webFetchAgent.js";
import { CLAUDE_CODE_GUIDE_AGENT } from "./built-in/claudeCodeGuideAgent.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  union,
  string,
  record,
  _enum,
  u,
  array,
  E,
  preprocess,
  M,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { McpServerConfigSchema } from "../../services/mcp/types.js";
import { EFFORT_LEVELS, parseEffortValue } from "../../utils/effort.js";
import { normalizePermissionModeAlias, PERMISSION_MODES } from "../../types/permissions.js";
import { HooksSchema } from "../../schemas/hooks.js";
import { TRANSPORT_LABELS, GLOBAL_CONFIG_FIELD_KINDS } from "../../utils/config.js";
import { hasUntrustedMcpServerEntries, checkAgentOriginTrust } from "./agentTrust.js";
import { isRestrictedPersonalAgent } from "../../utils/permissions/permissionsLoader.js";
import { logForDebugging } from "../../utils/debug.js";
import { isRestrictedToPluginOnly, isSourceAdminTrusted } from "../../utils/settings/pluginOnlyPolicy.js";
import { isBuiltinMcpServerName } from "../../services/mcp/builtinServerNames.js";
import { unaddableTransportReason } from "../../services/mcp/config.js";
import {
  compareByBaseDirDepth,
  loadMarkdownFilesCached,
  parseAgentToolsFromFrontmatter,
  parseSlashCommandToolsFromFrontmatter,
} from "../../utils/markdownConfigLoader.js";
import { compareStringsGrouped } from "../../utils/stringUtils.js";
import { getHostState, keyOrNull } from "../../utils/hostEnvironment.js";
import { managedFolderCondition } from "../../plugins/functionHooks/sites/promptContextSites.js";
import { logError } from "../../utils/log.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { loadPluginAgents, validatePluginAgentFrontmatter } from "../../utils/plugins/loadPluginAgents.js";
import { groupPluginSourcesByName } from "../../utils/telemetry/pluginTelemetry.js";
import { setAgentColor, AGENT_COLOR_NAMES } from "./agentColorManager.js";
import { getPluginRegistry, clearPluginAgents } from "../../utils/plugins/pluginLoadState.js";
import { pluginDisplayKey } from "../../utils/plugins/pluginIdentifier.js";
import { MAX_CLEAN_IDENTIFIER_LENGTH } from "../../utils/sanitization.js";
import {
  hasNestedHooks,
  PLUGIN_NON_HOOK_KEYS,
  UNLOADABLE_GUARD_NOTE,
  validateHooksSetting,
} from "../../schemas/hookEntryValidation.js";
import { isAutoMemoryEnabled } from "../../memdir/paths.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { loadAgentMemoryPrompt } from "./agentMemory.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { stripBom } from "../../utils/json.js";
import { checkFrontmatterShadow } from "../../utils/frontmatterSchema.js";
import {
  parsePositiveIntFromFrontmatter,
  parseBoundedIntFromFrontmatter,
  parseExperimentalCacheTtl,
} from "../../utils/frontmatterParser.js";
import { uniq } from "../../utils/collections.js";
import { getMcpServerNameOfTool } from "../../services/mcp/utils.js";

//@ chunk-e6aww6q8.js:2207198-2207321 placement
function getBuiltInAgentsMode() {
  if (env.CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS && getIsNonInteractiveSession()) return "none";
  if (isCoordinatorMode_2()) return "coordinator";
  return "default";
}
//@ chunk-e6aww6q8.js:2207321-2207367 placement
/**
 * 每 host 的 WebFetch 代理开关缓存。
 */
class WebFetchAgentFlagState {
  enabled = undefined;
  policyAllowed = undefined;
}
//@ chunk-e6aww6q8.js:2207367-2207394 placement
var webFetchAgentFlagSlots = new HostScoped(() => new WebFetchAgentFlagState());
//@ chunk-e6aww6q8.js:2207394-2207433 placement
/**
 * 取当前 host 的 WebFetch 代理开关状态。
 */
function webFetchAgentFlagState() {
  return webFetchAgentFlagSlots.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:2207433-2207547 placement
function isWebFetchAgentFlagOn() {
  let e = webFetchAgentFlagState();
  e.enabled ??=
    env.CLAUDE_CODE_WEB_FETCH_AGENT ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_clever_orbit", false);
  return e.enabled;
}
//@ chunk-e6aww6q8.js:2207547-2207751 placement
function isWebFetchAgentEnabled() {
  if (!isWebFetchAgentFlagOn() || env.CLAUDE_CODE_SIMPLE || env.CLAUDE_CODE_DISABLE_WEB_FETCH) return false;
  let e = webFetchAgentFlagState();
  let policyAllowed = e.policyAllowed;
  if (policyAllowed === undefined) {
    policyAllowed = isPolicyAllowed_3(ALLOW_WEB_FETCH);
    if (getResponseFromCache() !== null) e.policyAllowed = policyAllowed;
  }
  return policyAllowed && getBuiltInAgentsMode() === "default";
}
//@ chunk-e6aww6q8.js:2209386-2209627 facade-exports
async function loadListedAgentDefinition(e, signal) {
  if (e.source !== "plugin" || e.loadDefinition === undefined) return e;
  let r = await (signal === undefined
    ? e.loadDefinition()
    : raceWithAbortSignalPastInterrupt(e.loadDefinition(), signal, () => new AbortError_2()));
  if (r === undefined || r.agentType !== e.agentType || r.source !== "plugin") return;
  return r;
}
//@ chunk-e6aww6q8.js:2357250-2357674 facade-exports = getBuiltInAgents (0.599)
/**
 * 内建代理列表：CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS（非交互）→ 空；coordinator 模式 → worker；否则 general-purpose、statusline-setup（非 --safe-mode）、claude（未禁用 agent view 时）、Explore+Plan（oG 开关）、web-fetch（V2：WebFetch 可用且策略允许）、claude-code-guide（非 SDK 入口）。
 */
function getBuiltInAgents() {
  let builtInAgentsMode = getBuiltInAgentsMode();
  if (builtInAgentsMode === "none") return [];
  if (builtInAgentsMode === "coordinator") {
    let { getCoordinatorAgents } = require("./chunk-ncsga3m8.js");
    return getCoordinatorAgents();
  }
  let n = [GENERAL_PURPOSE_AGENT];
  if (!isSafeMode()) n.push(STATUSLINE_SETUP_AGENT);
  if (!isAgentViewDisabled()) {
    let { CLAUDE_AGENT } = require("./chunk-57rpad5y.js");
    n.push(CLAUDE_AGENT);
  }
  if (isExplorePlanAgentsEnabled()) n.push(EXPLORE_AGENT, PLAN_AGENT);
  if (isWebFetchAgentEnabled()) n.push(WEB_FETCH_BUILTIN_AGENT);
  if (
    env.CLAUDE_CODE_ENTRYPOINT !== "sdk-ts" &&
    env.CLAUDE_CODE_ENTRYPOINT !== "sdk-py" &&
    env.CLAUDE_CODE_ENTRYPOINT !== "sdk-cli"
  )
    n.push(CLAUDE_CODE_GUIDE_AGENT);
  return n;
}
//@ chunk-e6aww6q8.js:2357674-2357713 layout
/**
 * 代理定义的 mcpServers 字段 schema。
 */
var mcpServerConfigListSchema = DoctorLazy(() =>
  union([string(), record(string(), McpServerConfigSchema())]),
);
//@ chunk-e6aww6q8.js:2357713-2357764 placement = WORKTREE_TAG (0.703)
/**
 * 代理定义 isolation 字段 schema：worktree/remote。旧版名 WORKTREE_TAG 为错配。
 */
var agentIsolationSchema = DoctorLazy(() => _enum(["worktree", "remote"]).optional());
//@ chunk-e6aww6q8.js:2357764-2357828 layout
/**
 * 可选字符串 schema：去空白后为空视为未设置。
 */
var optionalTrimmedStringSchema = DoctorLazy(() =>
  string()
    .optional()
    .transform((e) => e?.trim() || undefined),
);
//@ chunk-e6aww6q8.js:2357828-2357893 layout
/**
 * 可选字符串 schema：空串视为未设置。
 */
var optionalNonEmptyStringSchema = DoctorLazy(() =>
  string()
    .optional()
    .transform((e) => (e?.trim() ? e : undefined)),
);
//@ chunk-e6aww6q8.js:2357893-2358619 fingerprint = AgentJsonSchema (0.704)
/**
 * --agents JSON 里单个代理的 schema（description/prompt/tools/disallowedTools/model/effort/permissionMode/mcpServers/hooks/maxTurns/autoCompactWindow/skills/initialPrompt/memory/background/omitClaudeMd/isolation/observer…）。
 */
var AgentJsonSchema = DoctorLazy(() =>
  u({
    description: string().min(1, "Description cannot be empty"),
    tools: array(string()).optional(),
    disallowedTools: array(string()).optional(),
    prompt: string(),
    model: string()
      .trim()
      .min(1, "Model cannot be empty")
      .transform((m) => (m.toLowerCase() === "inherit" ? "inherit" : m))
      .optional(),
    effort: union([_enum(EFFORT_LEVELS), E().int()]).optional(),
    permissionMode: preprocess(normalizePermissionModeAlias, _enum(PERMISSION_MODES)).optional(),
    mcpServers: array(mcpServerConfigListSchema()).optional(),
    hooks: HooksSchema().optional(),
    maxTurns: E().int().positive().optional(),
    autoCompactWindow: E().int().min(TRANSPORT_LABELS).max(GLOBAL_CONFIG_FIELD_KINDS).optional(),
    skills: array(string()).optional(),
    initialPrompt: string().optional(),
    memory: _enum(["user", "project", "local"]).optional(),
    background: M().optional(),
    omitClaudeMd: M().optional(),
    isolation: agentIsolationSchema(),
    observer: optionalTrimmedStringSchema(),
    observerMessage: optionalNonEmptyStringSchema(),
    observeSubagents: M().optional(),
  }),
);
//@ chunk-e6aww6q8.js:2358619-2358699 facade-exports
function agentMcpSource(e) {
  return e.fromAdditionalDirectory ? "additionalDirectory" : e.source;
}
//@ chunk-e6aww6q8.js:2358699-2359725 facade-exports
function agentMcpSpecsToScopedConfigs(e) {
  if (!e.mcpServers?.length) return {};
  if (hasUntrustedMcpServerEntries(e)) {
    checkAgentOriginTrust(e, "mainThread", "mcpServers");
    return {};
  }
  if (isRestrictedPersonalAgent(e)) {
    logForDebugging(
      `[Agent: ${e.agentType}] Skipping frontmatter MCP servers: your own agents can't define their own MCP servers in this session (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)`,
    );
    return {};
  }
  if (isRestrictedToPluginOnly("mcp") && !isSourceAdminTrusted(e.source)) {
    logForDebugging(
      `[Agent: ${e.agentType}] Skipping frontmatter MCP servers: strictPluginOnlyCustomization locks MCP to plugin-only (agent source: ${e.source})`,
    );
    return {};
  }
  let n = {};
  for (let mcpServer of e.mcpServers) {
    if (typeof mcpServer === "string") continue;
    let entries = Object.entries(mcpServer);
    if (entries.length !== 1) {
      logForDebugging(`[Agent: ${e.agentType}] Invalid MCP server spec: expected exactly one key`, {
        level: "warn",
      });
      continue;
    }
    let [h, y] = entries[0];
    if (isBuiltinMcpServerName(h)) {
      logForDebugging(`[Agent: ${e.agentType}] Skipping reserved MCP server name '${h}' in frontmatter`, {
        level: "warn",
      });
      continue;
    }
    let S = unaddableTransportReason(y.type);
    if (S !== null) {
      logForDebugging(
        `[Agent: ${e.agentType}] Skipping ${S} MCP transport '${y.type}' for '${h}' in frontmatter`,
        {
          level: "warn",
        },
      );
      continue;
    }
    n[h] = {
      ...y,
      scope: "agent",
      agentSource: agentMcpSource(e),
    };
  }
  return n;
}
//@ chunk-e6aww6q8.js:2359725-2359754 layout
var agentDefinitionsRecordSchema = DoctorLazy(() => record(string(), AgentJsonSchema()));
//@ chunk-e6aww6q8.js:2359754-2359848 facade-exports = estimateSkillFrontmatterTokens (0.714)
/**
 * 把代理定义列表映射为 {name: agentType, description: whenToUse, model}；旧版名 estimateSkillFrontmatterTokens 配错。
 */
function toAgentInfos(skill) {
  return skill.map((n) => ({
    name: n.agentType,
    description: n.whenToUse,
    model: n.model,
  }));
}
//@ chunk-e6aww6q8.js:2359848-2359892 facade-exports = _temp1 (1)
function isBuiltInAgent(a_9) {
  return a_9.source === "built-in";
}
//@ chunk-e6aww6q8.js:2359892-2359935 facade-exports = _temp0 (1)
function isPluginAgent(a_5) {
  return a_5.source === "plugin";
}
//@ chunk-e6aww6q8.js:2359935-2360473 facade-exports = getActiveAgentsFromList (0.94)
/**
 * 按优先级合并代理定义（built-in < plugin < user < project < flag < policy，后者覆盖同名），按类型名排序返回活动代理。
 */
function getActiveAgentsFromList(allAgents) {
  let builtInAgents = allAgents.filter((agent) => agent.source === "built-in");
  let pluginAgents = allAgents.filter((agent) => agent.source === "plugin");
  let userAgents = allAgents.filter((agent) => agent.source === "userSettings");
  let projectAgents = [
    ...allAgents.filter((agent) => agent.source === "projectSettings" && agent.fromAdditionalDirectory),
    ...allAgents
      .filter((agent) => agent.source === "projectSettings" && !agent.fromAdditionalDirectory)
      .sort(compareByBaseDirDepth),
  ];
  let managedAgents = allAgents.filter((agent) => agent.source === "policySettings");
  let flagAgents = allAgents.filter((agent) => agent.source === "flagSettings");
  let agentGroups = [builtInAgents, pluginAgents, userAgents, projectAgents, flagAgents, managedAgents];
  let agentMap = new Map();
  for (let agents of agentGroups) for (let agent of agents) agentMap.set(agent.agentType, agent);
  return Array.from(agentMap.values()).sort((q, Z) => compareStringsGrouped(q.agentType, Z.agentType));
}
//@ chunk-e6aww6q8.js:2360473-2360569 layout
/**
 * 诊断文本净化：控制/格式字符换空格、折叠空白、截 200 字。
 */
function sanitizeAgentDiagnostic(text) {
  return text
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}
//@ chunk-e6aww6q8.js:2360569-2360735 layout
function describeAgentDefinitionLocation(e) {
  if (e.filePath) return e.filePath;
  if (isPluginAgent(e)) return `plugin '${e.plugin}'`;
  if (e.baseDir && e.filename) return `${e.baseDir}/${e.filename}.md`;
  return e.source;
}
//@ chunk-e6aww6q8.js:2360735-2361204 file-local
/**
 * 找出重复的代理定义：同来源、同 baseDir、同 agentType 出现两次以上（内建除外），返回 [{agentType, source, locations, oneIsActive}]，用于 /agents 与诊断提示。
 */
function findDuplicateAgentDefinitions(e, activeAgents) {
  let r = new Set(activeAgents);
  let s = new Map();
  for (let y of e) {
    if (y.source === "built-in") continue;
    let S = `${y.source}\x00${y.baseDir ?? ""}\x00${y.agentType}`;
    let w = s.get(S);
    if (w) w.push(y);
    else s.set(S, [y]);
  }
  let h = [];
  for (let y of s.values()) {
    if (y.length < 2) continue;
    y.sort((S, w) => Number(r.has(w)) - Number(r.has(S)));
    h.push({
      agentType: sanitizeAgentDiagnostic(y[0].agentType),
      source: y[0].source,
      locations: y.map((S) => sanitizeAgentDiagnostic(describeAgentDefinitionLocation(S))),
      oneIsActive: r.has(y[0]),
    });
  }
  return h.sort((y, S) => compareStringsGrouped(y.agentType, S.agentType));
}
//@ chunk-e6aww6q8.js:2361204-2361266 facade-exports = getDeferredToolTokenCount (1)
/**
 * 在上下文对象上补 allAgents 与 activeAgents（由代理定义列表计算）。
 */
function rebuildAgentDefinitions(e, n) {
  return {
    ...e,
    allAgents: n,
    activeAgents: getActiveAgentsFromList(n),
  };
}
//@ chunk-e6aww6q8.js:2361266-2361446 facade-exports = hasRequiredMcpServers (1)
/**
 * 代理 requiredMcpServers 的每个模式都能在可用服务器名中找到（子串、大小写不敏感）。
 */
function hasRequiredMcpServers(agent, availableServers) {
  if (!agent.requiredMcpServers || agent.requiredMcpServers.length === 0) return true;
  return agent.requiredMcpServers.every((pattern) =>
    availableServers.some((server) => server.toLowerCase().includes(pattern.toLowerCase())),
  );
}
//@ chunk-e6aww6q8.js:2361446-2361495 facade-exports
/**
 * 过滤掉缺少所需 MCP 服务器的代理。
 */
function filterAgentsByMcpRequirements(agents, availableServers) {
  return agents.filter((agent) => hasRequiredMcpServers(agent, availableServers));
}
//@ chunk-e6aww6q8.js:2361495-2361630 facade-exports
/**
 * 按 cwd 等参数缓存 getAgentDefinitionsWithOverrides 的结果（Promise）。
 */
function getAgentDefinitionsWithOverrides(cwd, n) {
  let agentDefinitions = getHostState().agentDefinitions;
  let s = `${managedFolderCondition()}${keyOrNull(cwd)}`;
  let h = agentDefinitions.get(s);
  if (h !== undefined) return h;
  let agentDefinitionsWithOverrides = getAgentDefinitionsWithOverrides_2(cwd, n);
  agentDefinitions.set(s, agentDefinitionsWithOverrides);
  return agentDefinitionsWithOverrides;
}
//@ chunk-e6aww6q8.js:2361630-2361693 facade-exports
/**
 * getAgentDefinitionsCached 出错时记录错误并返回给定回退值。
 */
function agentReadForTheSeat(e, n, r) {
  try {
    return getAgentDefinitionsWithOverrides(n, r);
  } catch (error) {
    logError(error);
    return e;
  }
}
//@ chunk-e6aww6q8.js:2361693-2362792 fingerprint = getAgentDefinitionsWithOverrides (0.639)
/**
 * 加载全部代理定义：--bare 等限制下只给内建代理；否则读取 .claude/agents 等 markdown、其他目录项目代理、插件代理、运行时注册代理，合并去重、报告重名并登记颜色。
 */
async function getAgentDefinitionsWithOverrides_2(cwd, n) {
  if (isCustomizationDisabled("agents")) {
    let builtInAgents = getBuiltInAgents();
    return {
      activeAgents: builtInAgents,
      allAgents: builtInAgents,
    };
  }
  try {
    let markdownFiles = (await loadMarkdownFilesCached("agents", cwd, n))
      .map((G) => {
        let { filePath, baseDir, frontmatter, content, source } = G;
        let agent = parseAgentFromMarkdown(filePath, baseDir, frontmatter, content, source);
        if (!agent) {
          if (!frontmatter.name) return null;
          let errorMsg = getParseError(frontmatter);
          logForDebugging(`Failed to parse agent from ${filePath}: ${errorMsg}`);
          logEvent("tengu_agent_parse_error", {
            error: errorMsg,
            location: fromEnum(source),
          });
          return null;
        }
        if (G.fromAdditionalDirectory) agent.fromAdditionalDirectory = true;
        return agent;
      })
      .filter((agent) => agent !== null);
    if (!isRestrictedToPluginOnly("agents")) markdownFiles.push(...getHostState().projectAgentsElsewhere);
    let y = await loadPluginAgents(n).catch((error) => {
      logError(error);
      return [];
    });
    let w = [...getBuiltInAgents(), ...y, ...getRuntimeRegisteredPluginAgents(), ...markdownFiles];
    let activeAgents = getActiveAgentsFromList(w);
    for (let G of findDuplicateAgentDefinitions(w, activeAgents))
      logForDebugging(
        `[agents] Duplicate agent name '${G.agentType}' (${G.source}): ${G.locations.join(", ")}${G.oneIsActive ? ` \u2014 active: ${G.locations[0]}` : ""}`,
      );
    groupPluginSourcesByName(
      "agent",
      [...w, ...activeAgents].map((G) => ({
        name: G.agentType,
        source: G.source,
      })),
      {
        resolves: true,
      },
    );
    for (let agent of activeAgents) if (agent.color) setAgentColor(agent.agentType, agent.color);
    return {
      activeAgents,
      allAgents: w,
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    logForDebugging(`Error loading agent definitions: ${errorMessage}`);
    logError(error);
    let builtInAgents = getBuiltInAgents();
    return {
      activeAgents: builtInAgents,
      allAgents: builtInAgents,
    };
  }
}
//@ chunk-e6aww6q8.js:2362792-2363142 layout
/**
 * 插件在运行时注册的代理（registeredAgents），转换为 source=plugin、registeredAtRunTime 的定义。
 */
function getRuntimeRegisteredPluginAgents() {
  return [...getPluginRegistry().registeredAgents.values()].flatMap(
    ({ plugin, pluginId, pluginRoot, spec }) => {
      let { name: h, ...definition } = spec;
      let agentFromJson = parseAgentFromJson(
        `${pluginDisplayKey(plugin, pluginId)}:${h}`,
        definition,
        "userSettings",
      );
      if (agentFromJson === null) return [];
      let { source, baseDir, fromAdditionalDirectory, ...q } = agentFromJson;
      return [
        {
          ...q,
          source: "plugin",
          plugin: pluginId,
          filename: h,
          registeredAtRunTime: true,
          registeringPluginRoot: pluginRoot,
        },
      ];
    },
  );
}
//@ chunk-e6aww6q8.js:2363142-2363213 facade-exports
/**
 * 是否是运行时注册的插件代理。
 */
function isRunTimeRegisteredAgent(agent) {
  return agent.source === "plugin" && agent.registeredAtRunTime === true;
}
//@ chunk-e6aww6q8.js:2363213-2363409 facade-exports = isCustomAgent (0.879)
/**
 * 把运行时注册的插件代理插到 plugin/built-in 段之后。
 */
function withLiveRegisteredAgents(agents) {
  let filtered = agents.filter((agent) => !isRunTimeRegisteredAgent(agent));
  let runtimeRegisteredPluginAgents = getRuntimeRegisteredPluginAgents();
  if (runtimeRegisteredPluginAgents.length === 0) return filtered;
  let lastIndex = filtered.findLastIndex((h) => h.source === "plugin" || h.source === "built-in");
  return [
    ...filtered.slice(0, lastIndex + 1),
    ...runtimeRegisteredPluginAgents,
    ...filtered.slice(lastIndex + 1),
  ];
}
//@ chunk-e6aww6q8.js:2363409-2363487 facade-exports
/**
 * 清空代理定义缓存与 markdown 文件缓存。
 */
function clearAgentDefinitionsCache() {
  getHostState().agentDefinitions.clear();
  getHostState().markdownFiles.clear();
  clearPluginAgents();
}
//@ chunk-e6aww6q8.js:2363487-2364027 fingerprint = getParseError (0.505)
/**
 * 代理 frontmatter 解析失败的原因文本（缺 name/description、name 以 - 开头、过长、含 ":"）。
 */
function getParseError(frontmatter) {
  let { name: n, description } = frontmatter;
  if (!n || typeof n !== "string") return lit_2('Missing required "name" field in frontmatter');
  if (n.startsWith("-")) return lit_2('Invalid "name": names must not start with "-"');
  if (n.length > MAX_CLEAN_IDENTIFIER_LENGTH)
    return lit_2(`Invalid "name": names must be at most ${MAX_CLEAN_IDENTIFIER_LENGTH} characters`);
  if (n.normalize("NFKC").includes(":"))
    return lit_2('Invalid "name": names must not contain ":" (reserved for plugin namespacing)');
  if (!description || typeof description !== "string")
    return lit_2('Missing required "description" field in frontmatter');
  return lit_2("Unknown parsing error");
}
//@ chunk-e6aww6q8.js:2364027-2364722 fingerprint = parseHooksFromFrontmatter (0.392)
/**
 * 解析 frontmatter hooks；PreToolUse/PermissionRequest 写在顶层（hooks 之外）时报错。
 */
function parseHooksFromFrontmatter(frontmatter, agentType) {
  if (hasNestedHooks(frontmatter, PLUGIN_NON_HOOK_KEYS)) {
    logForDebugging(
      `Agent '${agentType}': PreToolUse/PermissionRequest is declared at the frontmatter top level, outside "hooks" \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      {
        level: "error",
      },
    );
    return {
      hooks: undefined,
      unloadableGuard: true,
    };
  }
  if (!frontmatter.hooks)
    return {
      hooks: undefined,
      unloadableGuard: false,
    };
  let r = validateHooksSetting(frontmatter.hooks);
  for (let note of r.notes)
    logForDebugging(`Agent '${sanitizeAgentDiagnostic(agentType)}': ${note}`, {
      level: "warn",
    });
  if (r.unloadableGuards.length > 0) {
    logForDebugging(
      `Agent '${sanitizeAgentDiagnostic(agentType)}' not loaded: ${r.unloadableGuards.join("; ")} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
      {
        level: "error",
      },
    );
    return {
      hooks: undefined,
      unloadableGuard: true,
    };
  }
  let result = HooksSchema().safeParse(frontmatter.hooks);
  if (!result.success) {
    logForDebugging(
      `Invalid hooks in agent '${sanitizeAgentDiagnostic(agentType)}': ${result.error.message}`,
    );
    return {
      hooks: undefined,
      unloadableGuard: true,
    };
  }
  return {
    hooks: result.data,
    unloadableGuard: false,
  };
}
//@ chunk-e6aww6q8.js:2364722-2366212 fingerprint = parseAgentFromJson (0.756)
/**
 * 从 JSON 定义解析单个代理（--agents / 插件注册）。
 */
function parseAgentFromJson(name, definition, source = "flagSettings") {
  try {
    if (name.startsWith("-")) {
      logForDebugging(
        `Agent '${sanitizeAgentDiagnostic(name)}' has an invalid name: names must not start with '-'`,
        {
          level: "error",
        },
      );
      return null;
    }
    let parsed = AgentJsonSchema().parse(definition);
    let tools = parseAgentToolsFromFrontmatter(parsed.tools);
    if (isAutoMemoryEnabled() && parsed.memory && tools !== undefined) {
      let toolSet = new Set(tools);
      for (let tool of [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME])
        if (!toolSet.has(tool)) tools = [...tools, tool];
    }
    let disallowedTools =
      parsed.disallowedTools !== undefined
        ? parseAgentToolsFromFrontmatter(parsed.disallowedTools)
        : undefined;
    let systemPrompt = parsed.prompt;
    return {
      agentType: name,
      whenToUse: parsed.description,
      ...(tools !== undefined && {
        tools,
      }),
      ...(disallowedTools !== undefined && {
        disallowedTools,
      }),
      getSystemPrompt: (L) => {
        if (isAutoMemoryEnabled() && parsed.memory)
          return (
            systemPrompt +
            `

` +
            loadAgentMemoryPrompt(name, parsed.memory, L?.toolUseContext?.storageV5, L?.primedAgentMemory)
          );
        return systemPrompt;
      },
      source,
      ...(parsed.model && {
        model: parsed.model,
      }),
      ...(parsed.effort !== undefined && {
        effort: parsed.effort,
      }),
      ...(parsed.permissionMode && {
        permissionMode: parsed.permissionMode,
      }),
      ...(parsed.mcpServers &&
        parsed.mcpServers.length > 0 && {
          mcpServers: parsed.mcpServers,
        }),
      ...(parsed.hooks && {
        hooks: parsed.hooks,
      }),
      ...(parsed.maxTurns !== undefined && {
        maxTurns: parsed.maxTurns,
      }),
      ...(parsed.autoCompactWindow !== undefined && {
        autoCompactWindow: parsed.autoCompactWindow,
      }),
      ...(parsed.skills &&
        parsed.skills.length > 0 && {
          skills: parsed.skills,
        }),
      ...(parsed.initialPrompt && {
        initialPrompt: parsed.initialPrompt,
      }),
      ...(parsed.background && {
        background: parsed.background,
      }),
      ...(parsed.omitClaudeMd && {
        omitClaudeMd: parsed.omitClaudeMd,
      }),
      ...(parsed.memory && {
        memory: parsed.memory,
      }),
      ...(parsed.isolation && {
        isolation: parsed.isolation,
      }),
      ...(parsed.observer && {
        observer: parsed.observer,
      }),
      ...(parsed.observerMessage && {
        observerMessage: parsed.observerMessage,
      }),
      ...(parsed.observeSubagents === false && {
        observeSubagents: false,
      }),
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    logForDebugging(`Error parsing agent '${sanitizeAgentDiagnostic(name)}' from JSON: ${errorMessage}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-e6aww6q8.js:2366212-2366465 facade-exports = parseAgentsFromJson (1)
/**
 * 解析 --agents JSON 字符串为代理定义列表。
 */
function parseAgentsFromJson(agentsJson, source = "flagSettings") {
  try {
    let parsed = agentDefinitionsRecordSchema().parse(agentsJson);
    return Object.entries(parsed)
      .map(([name, def]) => parseAgentFromJson(name, def, source))
      .filter((agent) => agent !== null);
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    logForDebugging(`Error parsing agents from JSON: ${errorMessage}`, {
      level: "error",
    });
    return [];
  }
}
//@ chunk-e6aww6q8.js:2366465-2366476 layout
var MAX_LISTED_ISSUES = 20;
//@ chunk-e6aww6q8.js:2366476-2366597 layout
function formatIssueList(issues) {
  if (issues.length <= MAX_LISTED_ISSUES)
    return issues.join(`
`);
  return [...issues.slice(0, MAX_LISTED_ISSUES), `\u2026and ${issues.length - MAX_LISTED_ISSUES} more`].join(`
`);
}
//@ chunk-e6aww6q8.js:2366597-2367009 facade-exports
/**
 * 校验 --agents JSON 并返回人可读的问题列表（最多 20 条），无问题返回 null。
 */
function validateAgentsJson(agentsJson) {
  let n;
  try {
    n = jsonParse(stripBom(agentsJson));
  } catch (error) {
    return `invalid JSON: ${sanitizeAgentDiagnostic(error instanceof Error ? error.message : String(error))}`;
  }
  let r = agentDefinitionsRecordSchema().safeParse(n);
  if (!r.success)
    return formatIssueList(
      r.error.issues.map((issue) =>
        issue.path.length > 0
          ? `${sanitizeAgentDiagnostic(issue.path.join("."))}: ${issue.message}`
          : issue.message,
      ),
    );
  let filtered = Object.keys(r.data).filter((key) => key.startsWith("-"));
  if (filtered.length > 0)
    return formatIssueList(
      filtered.map((h) => `${sanitizeAgentDiagnostic(h)}: agent names must not start with '-'`),
    );
  return null;
}
//@ chunk-e6aww6q8.js:2367009-2370917 facade-exports = parseAgentFromMarkdown (0.66)
/**
 * 从 markdown frontmatter 解析代理定义：校验 name/description，读取 tools、disallowedTools、model、color、background、omitClaudeMd、memory、isolation、effort、permissionMode、maxTurns、autoCompactWindow、mcpServers、hooks、skills、observer 等，非法值记录并忽略。
 */
function parseAgentFromMarkdown(
  filePath,
  baseDir,
  frontmatter,
  content,
  source,
  { parsedElsewhere: y = false } = {},
) {
  try {
    let { name: agentType, description: whenToUse } = frontmatter;
    if (!agentType || typeof agentType !== "string") return null;
    if (agentType.startsWith("-")) {
      logForDebugging(
        `Agent file ${sanitizeAgentDiagnostic(filePath)} has invalid name '${sanitizeAgentDiagnostic(agentType)}': names must not start with '-'`,
        {
          level: "error",
        },
      );
      return null;
    }
    if (agentType.length > MAX_CLEAN_IDENTIFIER_LENGTH) {
      logForDebugging(
        `Agent file ${sanitizeAgentDiagnostic(filePath)} has invalid name '${sanitizeAgentDiagnostic(agentType)}': names must be at most ${MAX_CLEAN_IDENTIFIER_LENGTH} characters`,
        {
          level: "error",
        },
      );
      return null;
    }
    if (agentType.normalize("NFKC").includes(":")) {
      logForDebugging(
        `Agent file ${sanitizeAgentDiagnostic(filePath)} has invalid name '${sanitizeAgentDiagnostic(agentType)}': names must not contain ':' (reserved for plugin namespacing)`,
        {
          level: "error",
        },
      );
      return null;
    }
    if (!y) checkFrontmatterShadow("agent", frontmatter);
    validatePluginAgentFrontmatter({
      subject: "Agent file",
      filePath,
      frontmatter,
    });
    if (!whenToUse || typeof whenToUse !== "string") {
      logForDebugging(`Agent file ${filePath} is missing required 'description' in frontmatter`);
      return null;
    }
    whenToUse = whenToUse.replaceAll(
      "\\n",
      `
`,
    );
    let { color, model: modelRaw } = frontmatter;
    let model;
    if (typeof modelRaw === "string" && modelRaw.trim().length > 0) {
      let trimmed = modelRaw.trim();
      model = trimmed.toLowerCase() === "inherit" ? "inherit" : trimmed;
    }
    let backgroundRaw = frontmatter.background;
    if (
      backgroundRaw !== undefined &&
      backgroundRaw !== "true" &&
      backgroundRaw !== "false" &&
      backgroundRaw !== true &&
      backgroundRaw !== false
    )
      logForDebugging(
        `Agent file ${filePath} has invalid background value '${backgroundRaw}'. Must be 'true', 'false', or omitted.`,
      );
    let background = backgroundRaw === "true" || backgroundRaw === true ? true : undefined;
    let omitClaudeMd = frontmatter.omitClaudeMd;
    let we = omitClaudeMd === "true" || omitClaudeMd === true ? true : undefined;
    let VALID_MEMORY_SCOPES = ["user", "project", "local"];
    let memoryRaw = frontmatter.memory;
    let memory;
    if (memoryRaw !== undefined)
      if (VALID_MEMORY_SCOPES.includes(memoryRaw)) memory = memoryRaw;
      else
        logForDebugging(
          `Agent file ${filePath} has invalid memory value '${memoryRaw}'. Valid options: ${VALID_MEMORY_SCOPES.join(", ")}`,
        );
    let VALID_ISOLATION_MODES = ["worktree", "remote"];
    let isolationRaw = frontmatter.isolation;
    let isolation;
    if (isolationRaw !== undefined)
      if (VALID_ISOLATION_MODES.includes(isolationRaw)) isolation = isolationRaw;
      else
        logForDebugging(
          `Agent file ${filePath} has invalid isolation value '${isolationRaw}'. Valid options: ${VALID_ISOLATION_MODES.join(", ")}`,
        );
    let effortRaw = frontmatter.effort;
    let parsedEffort = effortRaw !== undefined ? parseEffortValue(effortRaw) : undefined;
    if (effortRaw !== undefined && parsedEffort === undefined)
      logForDebugging(
        `Agent file ${filePath} has invalid effort '${effortRaw}'. Valid options: ${EFFORT_LEVELS.join(", ")} or an integer`,
      );
    let permissionModeRaw = normalizePermissionModeAlias(frontmatter.permissionMode);
    let isValidPermissionMode = permissionModeRaw && PERMISSION_MODES.includes(permissionModeRaw);
    if (permissionModeRaw && !isValidPermissionMode) {
      let errorMsg = `Agent file ${filePath} has invalid permissionMode '${permissionModeRaw}'. Valid options: ${PERMISSION_MODES.join(", ")}`;
      logForDebugging(errorMsg);
    }
    let maxTurnsRaw = frontmatter.maxTurns;
    let maxTurns = parsePositiveIntFromFrontmatter(maxTurnsRaw);
    if (maxTurnsRaw !== undefined && maxTurns === undefined)
      logForDebugging(
        `Agent file ${filePath} has invalid maxTurns '${maxTurnsRaw}'. Must be a positive integer.`,
      );
    let autoCompactWindow = frontmatter.autoCompactWindow;
    let boundedIntFromFrontmatter = parseBoundedIntFromFrontmatter(autoCompactWindow);
    if (autoCompactWindow !== undefined && boundedIntFromFrontmatter === undefined)
      logForDebugging(
        `Agent file ${filePath} has invalid autoCompactWindow '${autoCompactWindow}'. Must be an integer from ${TRANSPORT_LABELS} to ${GLOBAL_CONFIG_FIELD_KINDS}.`,
        {
          level: "warn",
        },
      );
    let maxTurns_2 = parseExperimentalCacheTtl(frontmatter);
    let filename = basename(filePath, ".md");
    let tools = parseAgentToolsFromFrontmatter(frontmatter.tools);
    if (isAutoMemoryEnabled() && memory && tools !== undefined) {
      let toolSet = new Set(tools);
      for (let tool of [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME])
        if (!toolSet.has(tool)) tools = [...tools, tool];
    }
    let disallowedToolsRaw = frontmatter.disallowedTools;
    let disallowedTools =
      disallowedToolsRaw !== undefined ? parseAgentToolsFromFrontmatter(disallowedToolsRaw) : undefined;
    let skills = parseSlashCommandToolsFromFrontmatter(frontmatter.skills);
    let initialPrompt = frontmatter.initialPrompt;
    let hn = typeof initialPrompt === "string" && initialPrompt.trim() ? initialPrompt : undefined;
    let observer = frontmatter.observer;
    let yn = typeof observer === "string" && observer.trim() ? observer.trim() : undefined;
    let observerMessage = frontmatter.observerMessage;
    let Xn = typeof observerMessage === "string" && observerMessage.trim() ? observerMessage : undefined;
    let observeSubagents = frontmatter.observeSubagents;
    let To = observeSubagents === "false" || observeSubagents === false ? false : undefined;
    let mcpServersRaw = frontmatter.mcpServers;
    let mcpServers;
    if (Array.isArray(mcpServersRaw))
      mcpServers = mcpServersRaw
        .map((item) => {
          let result = mcpServerConfigListSchema().safeParse(item);
          if (result.success) return result.data;
          logForDebugging(
            `Agent file ${filePath} has invalid mcpServers item: ${jsonStringify(item)}. Error: ${result.error.message}`,
          );
          return null;
        })
        .filter((item) => item !== null);
    let { hooks, unloadableGuard } = parseHooksFromFrontmatter(frontmatter, agentType);
    if (unloadableGuard) return null;
    let systemPrompt = content.trim();
    return {
      baseDir,
      agentType,
      whenToUse,
      ...(tools !== undefined && {
        tools,
      }),
      ...(disallowedTools !== undefined && {
        disallowedTools,
      }),
      ...(skills !== undefined && {
        skills,
      }),
      ...(hn !== undefined && {
        initialPrompt: hn,
      }),
      ...(mcpServers !== undefined &&
        mcpServers.length > 0 && {
          mcpServers,
        }),
      ...(hooks !== undefined && {
        hooks,
      }),
      getSystemPrompt: (ao) => {
        if (isAutoMemoryEnabled() && memory) {
          let memoryPrompt = loadAgentMemoryPrompt(
            agentType,
            memory,
            ao?.toolUseContext?.storageV5,
            ao?.primedAgentMemory,
          );
          return (
            systemPrompt +
            `

` +
            memoryPrompt
          );
        }
        return systemPrompt;
      },
      source,
      filename,
      filePath,
      ...(color &&
        typeof color === "string" &&
        AGENT_COLOR_NAMES.includes(color) && {
          color,
        }),
      ...(model !== undefined && {
        model,
      }),
      ...(parsedEffort !== undefined && {
        effort: parsedEffort,
      }),
      ...(isValidPermissionMode && {
        permissionMode: permissionModeRaw,
      }),
      ...(maxTurns !== undefined && {
        maxTurns,
      }),
      ...(boundedIntFromFrontmatter !== undefined && {
        autoCompactWindow: boundedIntFromFrontmatter,
      }),
      ...(maxTurns_2 !== undefined && {
        cacheTtl: maxTurns_2,
      }),
      ...(background && {
        background,
      }),
      ...(we && {
        omitClaudeMd: we,
      }),
      ...(memory && {
        memory,
      }),
      ...(isolation && {
        isolation,
      }),
      ...(yn !== undefined && {
        observer: yn,
      }),
      ...(Xn !== undefined && {
        observerMessage: Xn,
      }),
      ...(To !== undefined && {
        observeSubagents: To,
      }),
    };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    logForDebugging(`Error parsing agent from ${filePath}: ${errorMessage}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-0tkmvwy0.js:5898-5940 sole-consumer
/**
 * 从一组工具中取出去重后的 MCP 服务器名。
 */
var getMcpServerNamesOfTools = (availableServers) =>
  uniq(availableServers.flatMap((e) => getMcpServerNameOfTool(e) ?? []));
//@ chunk-0tkmvwy0.js:5940-6083 fingerprint = hasRequiredMcpServers (1)
/**
 * 返回代理 requiredMcpServers 中没有任何可用 MCP 服务器匹配（子串、大小写不敏感）的项。
 */
function hasRequiredMcpServers_2(agent, availableServers) {
  let mapped = getMcpServerNamesOfTools(availableServers).map((pattern) => pattern.toLowerCase());
  return (agent.requiredMcpServers ?? []).filter(
    (pattern) => !mapped.some((server) => server.includes(pattern.toLowerCase())),
  );
}
export {
  getAgentDefinitionsWithOverrides,
  rebuildAgentDefinitions,
  isBuiltInAgent,
  isWebFetchAgentEnabled,
  agentMcpSource,
  loadListedAgentDefinition,
  isPluginAgent,
  hasRequiredMcpServers_2,
  hasRequiredMcpServers,
  withLiveRegisteredAgents,
  toAgentInfos,
  getActiveAgentsFromList,
  parseAgentsFromJson,
  validateAgentsJson,
  getBuiltInAgents,
  agentReadForTheSeat,
  clearAgentDefinitionsCache,
  filterAgentsByMcpRequirements,
  agentMcpSpecsToScopedConfigs,
  isWebFetchAgentFlagOn,
  isRunTimeRegisteredAgent,
  AgentJsonSchema,
  parseAgentFromMarkdown,
};
