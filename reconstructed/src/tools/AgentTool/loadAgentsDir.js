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
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
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
import { C2t } from "../../utils/fleetGates.js";
import { oG } from "./builtInAgentGate.js";
import { EXPLORE_AGENT } from "./built-in/exploreAgent.js";
import { PLAN_AGENT } from "./built-in/planAgent.js";
import { WEB_FETCH_BUILTIN_AGENT } from "./built-in/webFetchAgent.js";
import { CLAUDE_CODE_GUIDE_AGENT } from "./built-in/claudeCodeGuideAgent.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { Ue, o, pe, U, u, A, E, Ka, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { McpServerConfigSchema } from "../../services/mcp/types.js";
import { EFFORT_LEVELS, parseEffortValue } from "../../utils/effort.js";
import { normalizePermissionModeAlias, PERMISSION_MODES } from "../../types/permissions.js";
import { HooksSchema } from "../../schemas/hooks.js";
import { Kx, d0 } from "../../utils/config.js";
import { w1r, checkAgentOriginTrust } from "./agentTrust.js";
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
import { W1 } from "../../plugins/functionHooks/sites/promptContextSites.js";
import { logError } from "../../utils/log.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { loadPluginAgents, validatePluginAgentFrontmatter } from "../../utils/plugins/loadPluginAgents.js";
import { groupPluginSourcesByName } from "../../utils/telemetry/pluginTelemetry.js";
import { setAgentColor, AGENT_COLOR_NAMES } from "./agentColorManager.js";
import { getPluginRegistry, clearPluginAgents } from "../../utils/plugins/pluginLoadState.js";
import { pluginDisplayKey } from "../../utils/plugins/pluginIdentifier.js";
import { RI } from "../../utils/sanitization.js";
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
import { Wo } from "../../utils/json.js";
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
class xin {
  enabled = void 0;
  policyAllowed = void 0;
}
//@ chunk-e6aww6q8.js:2207367-2207394 placement
var qar = new HostScoped(() => new xin());
//@ chunk-e6aww6q8.js:2207394-2207433 placement
function Pin() {
  return qar.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:2207433-2207547 placement
function isWebFetchAgentFlagOn() {
  let e = Pin();
  return (
    (e.enabled ??=
      env.CLAUDE_CODE_WEB_FETCH_AGENT ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_clever_orbit", !1)),
    e.enabled
  );
}
//@ chunk-e6aww6q8.js:2207547-2207751 placement
function isWebFetchAgentEnabled() {
  if (!isWebFetchAgentFlagOn() || env.CLAUDE_CODE_SIMPLE || env.CLAUDE_CODE_DISABLE_WEB_FETCH) return !1;
  let e = Pin(),
    policyAllowed = e.policyAllowed;
  if (policyAllowed === void 0) {
    if (((policyAllowed = isPolicyAllowed_3(ALLOW_WEB_FETCH)), getResponseFromCache() !== null))
      e.policyAllowed = policyAllowed;
  }
  return policyAllowed && getBuiltInAgentsMode() === "default";
}
//@ chunk-e6aww6q8.js:2209386-2209627 facade-exports
async function loadListedAgentDefinition(e, n) {
  if (e.source !== "plugin" || e.loadDefinition === void 0) return e;
  let r = await (n === void 0
    ? e.loadDefinition()
    : raceWithAbortSignalPastInterrupt(e.loadDefinition(), n, () => new AbortError_2()));
  if (r === void 0 || r.agentType !== e.agentType || r.source !== "plugin") return;
  return r;
}
/**
 * 内建代理列表：CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS（非交互）→ 空；coordinator 模式 → worker；否则 general-purpose、statusline-setup（非 --safe-mode）、claude（未禁用 agent view 时）、Explore+Plan（oG 开关）、web-fetch（V2：WebFetch 可用且策略允许）、claude-code-guide（非 SDK 入口）。
 */
//@ chunk-e6aww6q8.js:2357250-2357674 facade-exports = getBuiltInAgents (0.599)
function getBuiltInAgents() {
  let e = getBuiltInAgentsMode();
  if (e === "none") return [];
  if (e === "coordinator") {
    let { getCoordinatorAgents: getCoordinatorAgents } = require("./chunk-ncsga3m8.js");
    return getCoordinatorAgents();
  }
  let n = [GENERAL_PURPOSE_AGENT];
  if (!isSafeMode()) n.push(STATUSLINE_SETUP_AGENT);
  if (!C2t()) {
    let { CLAUDE_AGENT: CLAUDE_AGENT } = require("./chunk-57rpad5y.js");
    n.push(CLAUDE_AGENT);
  }
  if (oG()) n.push(EXPLORE_AGENT, PLAN_AGENT);
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
var rve = DoctorLazy(() => Ue([o(), pe(o(), McpServerConfigSchema())]));
/**
 * 代理定义 isolation 字段 schema：worktree/remote。旧版名 WORKTREE_TAG 为错配。
 */
//@ chunk-e6aww6q8.js:2357713-2357764 placement = WORKTREE_TAG (0.703)
var agentIsolationSchema = DoctorLazy(() => U(["worktree", "remote"]).optional());
//@ chunk-e6aww6q8.js:2357764-2357828 layout
var Zan = DoctorLazy(() =>
  o()
    .optional()
    .transform((e) => e?.trim() || void 0),
);
//@ chunk-e6aww6q8.js:2357828-2357893 layout
var eln = DoctorLazy(() =>
  o()
    .optional()
    .transform((e) => (e?.trim() ? e : void 0)),
);
/**
 * --agents JSON 里单个代理的 schema（description/prompt/tools/disallowedTools/model/effort/permissionMode/mcpServers/hooks/maxTurns/autoCompactWindow/skills/initialPrompt/memory/background/omitClaudeMd/isolation/observer…）。
 */
//@ chunk-e6aww6q8.js:2357893-2358619 fingerprint = AgentJsonSchema (0.704)
var AgentJsonSchema = DoctorLazy(() =>
  u({
    description: o().min(1, "Description cannot be empty"),
    tools: A(o()).optional(),
    disallowedTools: A(o()).optional(),
    prompt: o(),
    model: o()
      .trim()
      .min(1, "Model cannot be empty")
      .transform((e) => (e.toLowerCase() === "inherit" ? "inherit" : e))
      .optional(),
    effort: Ue([U(EFFORT_LEVELS), E().int()]).optional(),
    permissionMode: Ka(normalizePermissionModeAlias, U(PERMISSION_MODES)).optional(),
    mcpServers: A(rve()).optional(),
    hooks: HooksSchema().optional(),
    maxTurns: E().int().positive().optional(),
    autoCompactWindow: E().int().min(Kx).max(d0).optional(),
    skills: A(o()).optional(),
    initialPrompt: o().optional(),
    memory: U(["user", "project", "local"]).optional(),
    background: M().optional(),
    omitClaudeMd: M().optional(),
    isolation: agentIsolationSchema(),
    observer: Zan(),
    observerMessage: eln(),
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
  if (w1r(e)) return (checkAgentOriginTrust(e, "mainThread", "mcpServers"), {});
  if (isRestrictedPersonalAgent(e))
    return (
      logForDebugging(
        `[Agent: ${e.agentType}] Skipping frontmatter MCP servers: your own agents can't define their own MCP servers in this session (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)`,
      ),
      {}
    );
  if (isRestrictedToPluginOnly("mcp") && !isSourceAdminTrusted(e.source))
    return (
      logForDebugging(
        `[Agent: ${e.agentType}] Skipping frontmatter MCP servers: strictPluginOnlyCustomization locks MCP to plugin-only (agent source: ${e.source})`,
      ),
      {}
    );
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
        { level: "warn" },
      );
      continue;
    }
    n[h] = { ...y, scope: "agent", agentSource: agentMcpSource(e) };
  }
  return n;
}
//@ chunk-e6aww6q8.js:2359725-2359754 layout
var agentDefinitionsRecordSchema = DoctorLazy(() => pe(o(), AgentJsonSchema()));
/**
 * 把代理定义列表映射为 {name: agentType, description: whenToUse, model}；旧版名 estimateSkillFrontmatterTokens 配错。
 */
//@ chunk-e6aww6q8.js:2359754-2359848 facade-exports = estimateSkillFrontmatterTokens (0.714)
function toAgentInfos(skill) {
  return skill.map((n) => ({ name: n.agentType, description: n.whenToUse, model: n.model }));
}
//@ chunk-e6aww6q8.js:2359848-2359892 facade-exports = _temp1 (1)
function isBuiltInAgent(a_9) {
  return a_9.source === "built-in";
}
//@ chunk-e6aww6q8.js:2359892-2359935 facade-exports = _temp0 (1)
function isPluginAgent(a_5) {
  return a_5.source === "plugin";
}
/**
 * 按优先级合并代理定义（built-in < plugin < user < project < flag < policy，后者覆盖同名），按类型名排序返回活动代理。
 */
//@ chunk-e6aww6q8.js:2359935-2360473 facade-exports = getActiveAgentsFromList (0.94)
function getActiveAgentsFromList(allAgents) {
  let builtInAgents = allAgents.filter((q) => q.source === "built-in"),
    pluginAgents = allAgents.filter((q) => q.source === "plugin"),
    userAgents = allAgents.filter((q) => q.source === "userSettings"),
    y = [
      ...allAgents.filter((q) => q.source === "projectSettings" && q.fromAdditionalDirectory),
      ...allAgents
        .filter((q) => q.source === "projectSettings" && !q.fromAdditionalDirectory)
        .sort(compareByBaseDirDepth),
    ],
    managedAgents = allAgents.filter((q) => q.source === "policySettings"),
    flagAgents = allAgents.filter((q) => q.source === "flagSettings"),
    agentGroups = [builtInAgents, pluginAgents, userAgents, y, flagAgents, managedAgents],
    agentMap = new Map();
  for (let agents of agentGroups) for (let agent of agents) agentMap.set(agent.agentType, agent);
  return Array.from(agentMap.values()).sort((q, Z) => compareStringsGrouped(q.agentType, Z.agentType));
}
/**
 * 诊断文本净化：控制/格式字符换空格、折叠空白、截 200 字。
 */
//@ chunk-e6aww6q8.js:2360473-2360569 layout
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
/**
 * 找出重复的代理定义：同来源、同 baseDir、同 agentType 出现两次以上（内建除外），返回 [{agentType, source, locations, oneIsActive}]，用于 /agents 与诊断提示。
 */
//@ chunk-e6aww6q8.js:2360735-2361204 file-local
function findDuplicateAgentDefinitions(e, n) {
  let r = new Set(n),
    s = new Map();
  for (let y of e) {
    if (y.source === "built-in") continue;
    let S = `${y.source}\x00${y.baseDir ?? ""}\x00${y.agentType}`,
      w = s.get(S);
    if (w) w.push(y);
    else s.set(S, [y]);
  }
  let h = [];
  for (let y of s.values()) {
    if (y.length < 2) continue;
    (y.sort((S, w) => Number(r.has(w)) - Number(r.has(S))),
      h.push({
        agentType: sanitizeAgentDiagnostic(y[0].agentType),
        source: y[0].source,
        locations: y.map((S) => sanitizeAgentDiagnostic(describeAgentDefinitionLocation(S))),
        oneIsActive: r.has(y[0]),
      }));
  }
  return h.sort((y, S) => compareStringsGrouped(y.agentType, S.agentType));
}
/**
 * 在上下文对象上补 allAgents 与 activeAgents（由代理定义列表计算）。
 */
//@ chunk-e6aww6q8.js:2361204-2361266 facade-exports = getDeferredToolTokenCount (1)
function rebuildAgentDefinitions(e, n) {
  return { ...e, allAgents: n, activeAgents: getActiveAgentsFromList(n) };
}
/**
 * 代理 requiredMcpServers 的每个模式都能在可用服务器名中找到（子串、大小写不敏感）。
 */
//@ chunk-e6aww6q8.js:2361266-2361446 facade-exports = hasRequiredMcpServers (1)
function hasRequiredMcpServers(agent, availableServers) {
  if (!agent.requiredMcpServers || agent.requiredMcpServers.length === 0) return !0;
  return agent.requiredMcpServers.every((pattern) =>
    availableServers.some((server) => server.toLowerCase().includes(pattern.toLowerCase())),
  );
}
/**
 * 过滤掉缺少所需 MCP 服务器的代理。
 */
//@ chunk-e6aww6q8.js:2361446-2361495 facade-exports
function filterAgentsByMcpRequirements(agents, availableServers) {
  return agents.filter((agent) => hasRequiredMcpServers(agent, availableServers));
}
/**
 * 按 cwd 等参数缓存 getAgentDefinitionsWithOverrides 的结果（Promise）。
 */
//@ chunk-e6aww6q8.js:2361495-2361630 facade-exports
function getAgentDefinitionsWithOverrides(e, n) {
  let agentDefinitions = getHostState().agentDefinitions,
    s = `${W1()}${keyOrNull(e)}`,
    h = agentDefinitions.get(s);
  if (h !== void 0) return h;
  let y = getAgentDefinitionsWithOverrides_2(e, n);
  return (agentDefinitions.set(s, y), y);
}
/**
 * getAgentDefinitionsCached 出错时记录错误并返回给定回退值。
 */
//@ chunk-e6aww6q8.js:2361630-2361693 facade-exports
function agentReadForTheSeat(e, n, r) {
  try {
    return getAgentDefinitionsWithOverrides(n, r);
  } catch (error) {
    return (logError(error), e);
  }
}
/**
 * 加载全部代理定义：--bare 等限制下只给内建代理；否则读取 .claude/agents 等 markdown、其他目录项目代理、插件代理、运行时注册代理，合并去重、报告重名并登记颜色。
 */
//@ chunk-e6aww6q8.js:2361693-2362792 fingerprint = getAgentDefinitionsWithOverrides (0.639)
async function getAgentDefinitionsWithOverrides_2(e, n) {
  if (isCustomizationDisabled("agents")) {
    let builtInAgents = getBuiltInAgents();
    return { activeAgents: builtInAgents, allAgents: builtInAgents };
  }
  try {
    let customAgents = (await loadMarkdownFilesCached("agents", e, n))
      .map((G) => {
        let {
            filePath: filePath,
            baseDir: baseDir,
            frontmatter: frontmatter,
            content: content,
            source: source,
          } = G,
          agent = parseAgentFromMarkdown(filePath, baseDir, frontmatter, content, source);
        if (!agent) {
          if (!frontmatter.name) return null;
          let errorMsg = getParseError(frontmatter);
          return (
            logForDebugging(`Failed to parse agent from ${filePath}: ${errorMsg}`),
            logEvent("tengu_agent_parse_error", { error: errorMsg, location: fromEnum(source) }),
            null
          );
        }
        if (G.fromAdditionalDirectory) agent.fromAdditionalDirectory = !0;
        return agent;
      })
      .filter((agent) => agent !== null);
    if (!isRestrictedToPluginOnly("agents")) customAgents.push(...getHostState().projectAgentsElsewhere);
    let y = await loadPluginAgents(n).catch((G) => (logError(G), [])),
      w = [...getBuiltInAgents(), ...y, ...getRuntimeRegisteredPluginAgents(), ...customAgents],
      activeAgents = getActiveAgentsFromList(w);
    for (let G of findDuplicateAgentDefinitions(w, activeAgents))
      logForDebugging(
        `[agents] Duplicate agent name '${G.agentType}' (${G.source}): ${G.locations.join(", ")}${G.oneIsActive ? ` \u2014 active: ${G.locations[0]}` : ""}`,
      );
    groupPluginSourcesByName(
      "agent",
      [...w, ...activeAgents].map((G) => ({ name: G.agentType, source: G.source })),
      { resolves: !0 },
    );
    for (let agent of activeAgents) if (agent.color) setAgentColor(agent.agentType, agent.color);
    return { activeAgents: activeAgents, allAgents: w };
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    (logForDebugging(`Error loading agent definitions: ${errorMessage}`), logError(error));
    let builtInAgents = getBuiltInAgents();
    return { activeAgents: builtInAgents, allAgents: builtInAgents };
  }
}
/**
 * 插件在运行时注册的代理（registeredAgents），转换为 source=plugin、registeredAtRunTime 的定义。
 */
//@ chunk-e6aww6q8.js:2362792-2363142 layout
function getRuntimeRegisteredPluginAgents() {
  return [...getPluginRegistry().registeredAgents.values()].flatMap(
    ({ plugin: plugin, pluginId: pluginId, pluginRoot: pluginRoot, spec: spec }) => {
      let { name: h, ...y } = spec,
        S = parseAgentFromJson(`${pluginDisplayKey(plugin, pluginId)}:${h}`, y, "userSettings");
      if (S === null) return [];
      let { source: source, baseDir: baseDir, fromAdditionalDirectory: fromAdditionalDirectory, ...q } = S;
      return [
        {
          ...q,
          source: "plugin",
          plugin: pluginId,
          filename: h,
          registeredAtRunTime: !0,
          registeringPluginRoot: pluginRoot,
        },
      ];
    },
  );
}
/**
 * 是否是运行时注册的插件代理。
 */
//@ chunk-e6aww6q8.js:2363142-2363213 facade-exports
function isRunTimeRegisteredAgent(agent) {
  return agent.source === "plugin" && agent.registeredAtRunTime === !0;
}
/**
 * 把运行时注册的插件代理插到 plugin/built-in 段之后。
 */
//@ chunk-e6aww6q8.js:2363213-2363409 facade-exports = isCustomAgent (0.879)
function withLiveRegisteredAgents(agents) {
  let filtered = agents.filter((h) => !isRunTimeRegisteredAgent(h)),
    r = getRuntimeRegisteredPluginAgents();
  if (r.length === 0) return filtered;
  let lastIndex = filtered.findLastIndex((h) => h.source === "plugin" || h.source === "built-in");
  return [...filtered.slice(0, lastIndex + 1), ...r, ...filtered.slice(lastIndex + 1)];
}
/**
 * 清空代理定义缓存与 markdown 文件缓存。
 */
//@ chunk-e6aww6q8.js:2363409-2363487 facade-exports
function clearAgentDefinitionsCache() {
  (getHostState().agentDefinitions.clear(), getHostState().markdownFiles.clear(), clearPluginAgents());
}
/**
 * 代理 frontmatter 解析失败的原因文本（缺 name/description、name 以 - 开头、过长、含 ":"）。
 */
//@ chunk-e6aww6q8.js:2363487-2364027 fingerprint = getParseError (0.505)
function getParseError(frontmatter) {
  let { name: n, description: description } = frontmatter;
  if (!n || typeof n !== "string") return lit_2('Missing required "name" field in frontmatter');
  if (n.startsWith("-")) return lit_2('Invalid "name": names must not start with "-"');
  if (n.length > RI) return lit_2(`Invalid "name": names must be at most ${RI} characters`);
  if (n.normalize("NFKC").includes(":"))
    return lit_2('Invalid "name": names must not contain ":" (reserved for plugin namespacing)');
  if (!description || typeof description !== "string")
    return lit_2('Missing required "description" field in frontmatter');
  return lit_2("Unknown parsing error");
}
/**
 * 解析 frontmatter hooks；PreToolUse/PermissionRequest 写在顶层（hooks 之外）时报错。
 */
//@ chunk-e6aww6q8.js:2364027-2364722 fingerprint = parseHooksFromFrontmatter (0.392)
function parseHooksFromFrontmatter(frontmatter, agentType) {
  if (hasNestedHooks(frontmatter, PLUGIN_NON_HOOK_KEYS))
    return (
      logForDebugging(
        `Agent '${agentType}': PreToolUse/PermissionRequest is declared at the frontmatter top level, outside "hooks" \u2014 ${UNLOADABLE_GUARD_NOTE}`,
        { level: "error" },
      ),
      { hooks: void 0, unloadableGuard: !0 }
    );
  if (!frontmatter.hooks) return { hooks: void 0, unloadableGuard: !1 };
  let r = validateHooksSetting(frontmatter.hooks);
  for (let note of r.notes)
    logForDebugging(`Agent '${sanitizeAgentDiagnostic(agentType)}': ${note}`, { level: "warn" });
  if (r.unloadableGuards.length > 0)
    return (
      logForDebugging(
        `Agent '${sanitizeAgentDiagnostic(agentType)}' not loaded: ${r.unloadableGuards.join("; ")} \u2014 ${UNLOADABLE_GUARD_NOTE}`,
        { level: "error" },
      ),
      { hooks: void 0, unloadableGuard: !0 }
    );
  let result = HooksSchema().safeParse(frontmatter.hooks);
  if (!result.success)
    return (
      logForDebugging(
        `Invalid hooks in agent '${sanitizeAgentDiagnostic(agentType)}': ${result.error.message}`,
      ),
      { hooks: void 0, unloadableGuard: !0 }
    );
  return { hooks: result.data, unloadableGuard: !1 };
}
/**
 * 从 JSON 定义解析单个代理（--agents / 插件注册）。
 */
//@ chunk-e6aww6q8.js:2364722-2366212 fingerprint = parseAgentFromJson (0.756)
function parseAgentFromJson(name, definition, source = "flagSettings") {
  try {
    if (name.startsWith("-"))
      return (
        logForDebugging(
          `Agent '${sanitizeAgentDiagnostic(name)}' has an invalid name: names must not start with '-'`,
          { level: "error" },
        ),
        null
      );
    let parsed = AgentJsonSchema().parse(definition),
      tools = parseAgentToolsFromFrontmatter(parsed.tools);
    if (isAutoMemoryEnabled() && parsed.memory && tools !== void 0) {
      let toolSet = new Set(tools);
      for (let tool of [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME])
        if (!toolSet.has(tool)) tools = [...tools, tool];
    }
    let y =
        parsed.disallowedTools !== void 0 ? parseAgentToolsFromFrontmatter(parsed.disallowedTools) : void 0,
      systemPrompt = parsed.prompt;
    return {
      agentType: name,
      whenToUse: parsed.description,
      ...(tools !== void 0 && { tools: tools }),
      ...(y !== void 0 && { disallowedTools: y }),
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
      source: source,
      ...(parsed.model && { model: parsed.model }),
      ...(parsed.effort !== void 0 && { effort: parsed.effort }),
      ...(parsed.permissionMode && { permissionMode: parsed.permissionMode }),
      ...(parsed.mcpServers && parsed.mcpServers.length > 0 && { mcpServers: parsed.mcpServers }),
      ...(parsed.hooks && { hooks: parsed.hooks }),
      ...(parsed.maxTurns !== void 0 && { maxTurns: parsed.maxTurns }),
      ...(parsed.autoCompactWindow !== void 0 && { autoCompactWindow: parsed.autoCompactWindow }),
      ...(parsed.skills && parsed.skills.length > 0 && { skills: parsed.skills }),
      ...(parsed.initialPrompt && { initialPrompt: parsed.initialPrompt }),
      ...(parsed.background && { background: parsed.background }),
      ...(parsed.omitClaudeMd && { omitClaudeMd: parsed.omitClaudeMd }),
      ...(parsed.memory && { memory: parsed.memory }),
      ...(parsed.isolation && { isolation: parsed.isolation }),
      ...(parsed.observer && { observer: parsed.observer }),
      ...(parsed.observerMessage && { observerMessage: parsed.observerMessage }),
      ...(parsed.observeSubagents === !1 && { observeSubagents: !1 }),
    };
  } catch (error) {
    let h = error instanceof Error ? error.message : String(error);
    return (
      logForDebugging(`Error parsing agent '${sanitizeAgentDiagnostic(name)}' from JSON: ${h}`, {
        level: "error",
      }),
      null
    );
  }
}
/**
 * 解析 --agents JSON 字符串为代理定义列表。
 */
//@ chunk-e6aww6q8.js:2366212-2366465 facade-exports = parseAgentsFromJson (1)
function parseAgentsFromJson(agentsJson, source = "flagSettings") {
  try {
    let parsed = agentDefinitionsRecordSchema().parse(agentsJson);
    return Object.entries(parsed)
      .map(([s, h]) => parseAgentFromJson(s, h, source))
      .filter((agent) => agent !== null);
  } catch (error) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    return (logForDebugging(`Error parsing agents from JSON: ${errorMessage}`, { level: "error" }), []);
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
/**
 * 校验 --agents JSON 并返回人可读的问题列表（最多 20 条），无问题返回 null。
 */
//@ chunk-e6aww6q8.js:2366597-2367009 facade-exports
function validateAgentsJson(agentsJson) {
  let n;
  try {
    n = jsonParse(Wo(agentsJson));
  } catch (error) {
    return `invalid JSON: ${sanitizeAgentDiagnostic(error instanceof Error ? error.message : String(error))}`;
  }
  let safeParse = agentDefinitionsRecordSchema().safeParse(n);
  if (!safeParse.success)
    return formatIssueList(
      safeParse.error.issues.map((issue) =>
        issue.path.length > 0
          ? `${sanitizeAgentDiagnostic(issue.path.join("."))}: ${issue.message}`
          : issue.message,
      ),
    );
  let filtered = Object.keys(safeParse.data).filter((h) => h.startsWith("-"));
  if (filtered.length > 0)
    return formatIssueList(
      filtered.map((h) => `${sanitizeAgentDiagnostic(h)}: agent names must not start with '-'`),
    );
  return null;
}
/**
 * 从 markdown frontmatter 解析代理定义：校验 name/description，读取 tools、disallowedTools、model、color、background、omitClaudeMd、memory、isolation、effort、permissionMode、maxTurns、autoCompactWindow、mcpServers、hooks、skills、observer 等，非法值记录并忽略。
 */
//@ chunk-e6aww6q8.js:2367009-2370917 facade-exports = parseAgentFromMarkdown (0.66)
function parseAgentFromMarkdown(
  filePath,
  baseDir,
  frontmatter,
  content,
  source,
  { parsedElsewhere: y = !1 } = {},
) {
  try {
    let { name: S, description: description } = frontmatter;
    if (!S || typeof S !== "string") return null;
    if (S.startsWith("-"))
      return (
        logForDebugging(
          `Agent file ${sanitizeAgentDiagnostic(filePath)} has invalid name '${sanitizeAgentDiagnostic(S)}': names must not start with '-'`,
          { level: "error" },
        ),
        null
      );
    if (S.length > RI)
      return (
        logForDebugging(
          `Agent file ${sanitizeAgentDiagnostic(filePath)} has invalid name '${sanitizeAgentDiagnostic(S)}': names must be at most ${RI} characters`,
          { level: "error" },
        ),
        null
      );
    if (S.normalize("NFKC").includes(":"))
      return (
        logForDebugging(
          `Agent file ${sanitizeAgentDiagnostic(filePath)} has invalid name '${sanitizeAgentDiagnostic(S)}': names must not contain ':' (reserved for plugin namespacing)`,
          { level: "error" },
        ),
        null
      );
    if (!y) checkFrontmatterShadow("agent", frontmatter);
    if (
      (validatePluginAgentFrontmatter({
        subject: "Agent file",
        filePath: filePath,
        frontmatter: frontmatter,
      }),
      !description || typeof description !== "string")
    )
      return (
        logForDebugging(`Agent file ${filePath} is missing required 'description' in frontmatter`),
        null
      );
    description = description.replaceAll(
      "\\n",
      `
`,
    );
    let { color: color, model: model } = frontmatter,
      q;
    if (typeof model === "string" && model.trim().length > 0) {
      let trimmed = model.trim();
      q = trimmed.toLowerCase() === "inherit" ? "inherit" : trimmed;
    }
    let background = frontmatter.background;
    if (
      background !== void 0 &&
      background !== "true" &&
      background !== "false" &&
      background !== !0 &&
      background !== !1
    )
      logForDebugging(
        `Agent file ${filePath} has invalid background value '${background}'. Must be 'true', 'false', or omitted.`,
      );
    let Se = background === "true" || background === !0 ? !0 : void 0,
      omitClaudeMd = frontmatter.omitClaudeMd,
      we = omitClaudeMd === "true" || omitClaudeMd === !0 ? !0 : void 0,
      VALID_MEMORY_SCOPES = ["user", "project", "local"],
      memory = frontmatter.memory,
      Ie;
    if (memory !== void 0)
      if (VALID_MEMORY_SCOPES.includes(memory)) Ie = memory;
      else
        logForDebugging(
          `Agent file ${filePath} has invalid memory value '${memory}'. Valid options: ${VALID_MEMORY_SCOPES.join(", ")}`,
        );
    let Me = ["worktree", "remote"],
      isolation = frontmatter.isolation,
      ze;
    if (isolation !== void 0)
      if (Me.includes(isolation)) ze = isolation;
      else
        logForDebugging(
          `Agent file ${filePath} has invalid isolation value '${isolation}'. Valid options: ${Me.join(", ")}`,
        );
    let effort = frontmatter.effort,
      Je = effort !== void 0 ? parseEffortValue(effort) : void 0;
    if (effort !== void 0 && Je === void 0)
      logForDebugging(
        `Agent file ${filePath} has invalid effort '${effort}'. Valid options: ${EFFORT_LEVELS.join(", ")} or an integer`,
      );
    let nt = normalizePermissionModeAlias(frontmatter.permissionMode),
      isValidPermissionMode = nt && PERMISSION_MODES.includes(nt);
    if (nt && !isValidPermissionMode) {
      let errorMsg = `Agent file ${filePath} has invalid permissionMode '${nt}'. Valid options: ${PERMISSION_MODES.join(", ")}`;
      logForDebugging(errorMsg);
    }
    let maxTurns = frontmatter.maxTurns,
      yt = parsePositiveIntFromFrontmatter(maxTurns);
    if (maxTurns !== void 0 && yt === void 0)
      logForDebugging(
        `Agent file ${filePath} has invalid maxTurns '${maxTurns}'. Must be a positive integer.`,
      );
    let autoCompactWindow = frontmatter.autoCompactWindow,
      At = parseBoundedIntFromFrontmatter(autoCompactWindow);
    if (autoCompactWindow !== void 0 && At === void 0)
      logForDebugging(
        `Agent file ${filePath} has invalid autoCompactWindow '${autoCompactWindow}'. Must be an integer from ${Kx} to ${d0}.`,
        { level: "warn" },
      );
    let maxTurns_2 = parseExperimentalCacheTtl(frontmatter),
      filename = basename_42(filePath, ".md"),
      tools = parseAgentToolsFromFrontmatter(frontmatter.tools);
    if (isAutoMemoryEnabled() && Ie && tools !== void 0) {
      let toolSet = new Set(tools);
      for (let tool of [FILE_WRITE_TOOL_NAME, FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME])
        if (!toolSet.has(tool)) tools = [...tools, tool];
    }
    let disallowedTools = frontmatter.disallowedTools,
      rn = disallowedTools !== void 0 ? parseAgentToolsFromFrontmatter(disallowedTools) : void 0,
      skills = parseSlashCommandToolsFromFrontmatter(frontmatter.skills),
      initialPrompt = frontmatter.initialPrompt,
      hn = typeof initialPrompt === "string" && initialPrompt.trim() ? initialPrompt : void 0,
      observer = frontmatter.observer,
      yn = typeof observer === "string" && observer.trim() ? observer.trim() : void 0,
      observerMessage = frontmatter.observerMessage,
      Xn = typeof observerMessage === "string" && observerMessage.trim() ? observerMessage : void 0,
      observeSubagents = frontmatter.observeSubagents,
      To = observeSubagents === "false" || observeSubagents === !1 ? !1 : void 0,
      mcpServers = frontmatter.mcpServers,
      vn;
    if (Array.isArray(mcpServers))
      vn = mcpServers
        .map((item) => {
          let result = rve().safeParse(item);
          if (result.success) return result.data;
          return (
            logForDebugging(
              `Agent file ${filePath} has invalid mcpServers item: ${jsonStringify(item)}. Error: ${result.error.message}`,
            ),
            null
          );
        })
        .filter((item) => item !== null);
    let { hooks: hooks, unloadableGuard: unloadableGuard } = parseHooksFromFrontmatter(frontmatter, S);
    if (unloadableGuard) return null;
    let systemPrompt = content.trim();
    return {
      baseDir: baseDir,
      agentType: S,
      whenToUse: description,
      ...(tools !== void 0 && { tools: tools }),
      ...(rn !== void 0 && { disallowedTools: rn }),
      ...(skills !== void 0 && { skills: skills }),
      ...(hn !== void 0 && { initialPrompt: hn }),
      ...(vn !== void 0 && vn.length > 0 && { mcpServers: vn }),
      ...(hooks !== void 0 && { hooks: hooks }),
      getSystemPrompt: (ao) => {
        if (isAutoMemoryEnabled() && Ie) {
          let $o = loadAgentMemoryPrompt(S, Ie, ao?.toolUseContext?.storageV5, ao?.primedAgentMemory);
          return (
            systemPrompt +
            `

` +
            $o
          );
        }
        return systemPrompt;
      },
      source: source,
      filename: filename,
      filePath: filePath,
      ...(color && typeof color === "string" && AGENT_COLOR_NAMES.includes(color) && { color: color }),
      ...(q !== void 0 && { model: q }),
      ...(Je !== void 0 && { effort: Je }),
      ...(isValidPermissionMode && { permissionMode: nt }),
      ...(yt !== void 0 && { maxTurns: yt }),
      ...(At !== void 0 && { autoCompactWindow: At }),
      ...(maxTurns_2 !== void 0 && { cacheTtl: maxTurns_2 }),
      ...(Se && { background: Se }),
      ...(we && { omitClaudeMd: we }),
      ...(Ie && { memory: Ie }),
      ...(ze && { isolation: ze }),
      ...(yn !== void 0 && { observer: yn }),
      ...(Xn !== void 0 && { observerMessage: Xn }),
      ...(To !== void 0 && { observeSubagents: To }),
    };
  } catch (error) {
    let w = error instanceof Error ? error.message : String(error);
    return (logForDebugging(`Error parsing agent from ${filePath}: ${w}`, { level: "error" }), null);
  }
}
/**
 * 从一组工具中取出去重后的 MCP 服务器名。
 */
//@ chunk-0tkmvwy0.js:5898-5940 sole-consumer
var getMcpServerNamesOfTools = (n) => uniq(n.flatMap((e) => getMcpServerNameOfTool(e) ?? []));
/**
 * 返回代理 requiredMcpServers 中没有任何可用 MCP 服务器匹配（子串、大小写不敏感）的项。
 */
//@ chunk-0tkmvwy0.js:5940-6083 fingerprint = hasRequiredMcpServers (1)
function hasRequiredMcpServers_2(agent, availableServers) {
  let mapped = getMcpServerNamesOfTools(availableServers).map((pattern) => pattern.toLowerCase());
  return (agent.requiredMcpServers ?? []).filter(
    (server) => !mapped.some((y) => y.includes(server.toLowerCase())),
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
