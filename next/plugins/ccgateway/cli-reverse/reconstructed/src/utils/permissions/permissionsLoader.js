/**
 * utils/permissions/permissionsLoader.ts
 *
 * 从 settings 各层加载权限规则与 additionalDirectories（托管独占、工作区信任门控、评测受限），以及向 settings 增删规则。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/permissionsLoader.ts
 * pieces: chunk-9s2vygnp.js (45), chunk-t58ha4ac.js (1)
 * attribution: placement 3, facade-majority 24, layout 17, file-local 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getSessionFunctionHooks } from "../hooks/sessionHooks.js";
import { isOfficialMarketplaceRef, hasSimilarMarketplaceName } from "../plugins/marketplaceNames.js";
import { getVouchedPolicyPluginIds } from "../plugins/managedPlugins.js";
import {
  isOrganizationHookPolicyPending,
  isHookPolicyUnanswered,
  markOrganizationAskHeld,
} from "../../commands/goal/goal.js";
import { hasGuardHooks_2 } from "../../schemas/hookEntryValidation.js";
import { shouldSkipSessionHooksByPolicy } from "../hooks/hooksConfigSnapshot.js";
import { logError } from "../log.js";
import {
  getSettingsForSource,
  getAdminAuthoredPolicySettings,
  projectSettingsAliasesUserSettings,
  getLegacyLocalSettingsFilePath,
  parseSettingsFile,
  updateSettingsForSourceWithTransform,
} from "../settings/settings.js";
import { isSourceAdminTrusted } from "../settings/pluginOnlyPolicy.js";
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import {
  marketplaceOf,
  marketplaceSuffix,
  isOfficialMarketplaceName_3,
} from "../plugins/pluginIdentifier.js";
import {
  SYNCED,
  ANTHROPIC_SKILLS_PLUGIN_ID,
  INLINE_PLUGIN_MARKETPLACE,
  SKILLS_DIR,
  BUILTIN,
} from "../telemetry/pluginTelemetry.js";
import { nfcLower } from "../stringUtils.js";
import { isHostEntrypoint } from "../entrypointKinds.js";
import {
  isNpmResolutionVouchedByPolicy,
  isOfficialMarketplaceSourceVouched,
  isMarketplaceSourceVouchedByPolicy,
} from "../plugins/marketplacePolicy.js";
import { pluginManifestPathSchemas } from "../plugins/schemas.js";
import { HostScoped } from "../hostScoped.js";
import {
  getRootSession,
  getPrintOutputFormat,
  getOriginalCwdOrNull,
  getAdditionalDirectoriesForClaudeMd,
  isWorkspaceRestricted,
  getSessionTrustAccepted,
  isHomeDirectorySession,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import { stripControlChars } from "../settings/writeQueues.js";
import { logForDebugging } from "../debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isBgSession } from "../concurrentSessions.js";
import {
  getSettingSourceName,
  getEnabledSettingSources,
  EDITABLE_SETTING_SOURCES as EDITABLE_SETTING_SOURCES_2,
} from "../settings/constants.js";
import { normalizeRuleString, parseRuleValue } from "./legacyWildcardRules.js";
import { env, describeGlobalConfigFile } from "../env.js";
import {
  isWorkspacePersistedTrusted,
  isLocalSettingsGitTracked,
  checkHasTrustDialogAccepted,
  isLocalSettingsGitTrackedInIndex,
  getGlobalConfig,
  getWorkspacePersistedTrustKey,
  saveGlobalConfig,
  DEFAULT_PROJECT_CONFIG,
  ignoresPersistedTrust,
  PERSISTED_TRUST_IGNORED,
} from "../config.js";
import { jsonStringify } from "../slowOperations.js";
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
import { isPlainObject } from "../isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9s2vygnp.js:1118-1237 placement
/**
 * 取命令的来源仓库：插件命令取插件仓库，内置命令取其会话函数钩子，其他为 undefined。
 */
function getCommandRepository(hook) {
  if (hook.source === "plugin") return hook.pluginInfo?.repository;
  return hook.source === "bundled" ? getSessionFunctionHooks(hook.hooks) : undefined;
}
//@ chunk-9s2vygnp.js:1237-1269 placement
/**
 * isVouchedMarketplaceRef：官方或受信策略插件的市场引用。
 */
var isVouchedMarketplaceRef = (ref) =>
  isOfficialMarketplaceRef(ref) || hasSimilarMarketplaceName(ref, getVouchedPolicyPluginIds());
//@ chunk-9s2vygnp.js:1269-1446 placement
/**
 * 是否加载权限规则（信任与远程设置状态）。
 */
function shouldLoadPermissionRules(hooks, marketplaceRef) {
  if (!isOrganizationHookPolicyPending() || !hasGuardHooks_2(hooks)) return false;
  try {
    if (shouldSkipSessionHooksByPolicy()) return true;
  } catch (error) {
    logError(error);
    return true;
  }
  if (!isHookPolicyUnanswered()) return false;
  let shouldHold = true;
  try {
    shouldHold = marketplaceRef === undefined || !isVouchedMarketplaceRef(marketplaceRef);
  } catch (error) {
    logError(error);
  }
  if (shouldHold) markOrganizationAskHeld();
  return shouldHold;
}
//@ chunk-9s2vygnp.js:1446-1526 facade-majority (2.1.88 match: shouldAllowManagedPermissionRulesOnly, 1)
/**
 * policySettings.allowManagedPermissionRulesOnly=true 时只使用托管策略里的权限规则。
 */
function shouldAllowManagedPermissionRulesOnly() {
  return getSettingsForSource("policySettings")?.allowManagedPermissionRulesOnly === true;
}
//@ chunk-9s2vygnp.js:1526-1552 facade-majority
function shouldShowAlwaysAllowOptions() {
  return !shouldAllowManagedPermissionRulesOnly();
}
//@ chunk-9s2vygnp.js:1552-1600 layout
function isToolGrantAllowed(source, pluginOrigin, fromHostCatalog = false) {
  return frontmatterToolGrantWithheldReason(source, pluginOrigin, fromHostCatalog) === undefined;
}
//@ chunk-9s2vygnp.js:1600-1738 facade-majority
/**
 * 前置声明（frontmatter）里 allowed-tools 授权被扣留的原因：仅托管规则模式且来源非托管 → managed_rules_only；限制个人配置时来自个人配置 → personal_config。
 */
function frontmatterToolGrantWithheldReason(source, pluginOrigin, fromHostCatalog = false) {
  if (shouldAllowManagedPermissionRulesOnly()) {
    if (!(source === "plugin" ? isVouchedPluginOrigin(pluginOrigin) : isSourceAdminTrusted(source)))
      return "managed_rules_only";
  }
  return isPersonalConfigRestricted() && !fromHostCatalog && isUntrustedRuleOrigin(source, pluginOrigin)
    ? "personal_config"
    : undefined;
}
//@ chunk-9s2vygnp.js:1738-2065 layout
/**
 * 规则来源是否不可信：用户设置或未知来源；插件来自非组织 claude.ai 市场、未认证的同步市场或指定的内联插件时也视为不可信。
 */
function isUntrustedRuleOrigin(source, pluginOrigin) {
  if (source === undefined || source === "userSettings") return true;
  if (source !== "plugin") return false;
  let marketplaceSource = pluginOrigin?.marketplaceSource;
  if (
    marketplaceSource?.source === "claudeai" &&
    marketplaceSource.scope !== "org" &&
    marketplaceSource.scope !== "default"
  )
    return true;
  let id = pluginOrigin?.id;
  if (id === undefined) return true;
  switch (marketplaceOf(id) ?? marketplaceSuffix(id)) {
    case SYNCED:
      return pluginOrigin?.officiallyAttested !== true;
    case INLINE_PLUGIN_MARKETPLACE:
      return nfcLower(id) === ANTHROPIC_SKILLS_PLUGIN_ID;
    default:
      return false;
  }
}
//@ chunk-9s2vygnp.js:2065-2503 layout
/**
 * 插件来源是否被担保：内置；同步市场需官方认证；npm 需策略担保的解析；官方市场名需官方来源；其他需策略担保的市场源。
 */
function isVouchedPluginOrigin(pluginOrigin) {
  let id = pluginOrigin?.id;
  if (id === undefined) return false;
  let marketplace = marketplaceOf(id) ?? marketplaceSuffix(id);
  switch (marketplace) {
    case undefined:
    case SKILLS_DIR:
      return false;
    case INLINE_PLUGIN_MARKETPLACE:
      return (
        nfcLower(id) !== ANTHROPIC_SKILLS_PLUGIN_ID &&
        !(isHostEntrypoint() && getAdminAuthoredPolicySettings()?.allowManagedPermissionRulesOnly === true)
      );
    case BUILTIN:
      return true;
    case SYNCED:
      return pluginOrigin?.officiallyAttested === true;
    case pluginManifestPathSchemas:
      return (
        pluginOrigin?.npmResolution !== undefined &&
        isNpmResolutionVouchedByPolicy(pluginOrigin.npmResolution)
      );
    default:
      break;
  }
  if (pluginOrigin?.marketplaceSource === undefined) return false;
  return (
    (isOfficialMarketplaceName_3(marketplace) &&
      isOfficialMarketplaceSourceVouched(pluginOrigin.marketplaceSource)) ||
    isMarketplaceSourceVouchedByPolicy(pluginOrigin.marketplaceSource, pluginOrigin.home)
  );
}
//@ chunk-9s2vygnp.js:2503-2528 layout
var warnedGrantHosts; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9s2vygnp.js:2503", () => {
  warnedGrantHosts = new HostScoped(() => new Set());
});
//@ chunk-9s2vygnp.js:2528-2565 facade-majority
function getIgnoredFrontmatterToolGrants() {
  return warnedGrantHosts.of(getRootSession().host);
}
//@ chunk-9s2vygnp.js:2565-3762 facade-majority
/**
 * 报告被忽略的 skill/command frontmatter allowed-tools：记告警（区分 allowManagedPermissionRulesOnly 与 CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG），上报 tengu_frontmatter_grant_withheld，文本模式下也打印到 stderr。
 */
function reportIgnoredFrontmatterToolGrants(skillName, origin, tools, reason = "managed_rules_only") {
  let originLabel = "pluginId" in origin ? origin.pluginId : getRuleSourceLabel(origin.source);
  let originKind =
    "pluginId" in origin
      ? marketplaceOf(origin.pluginId) === SKILLS_DIR
        ? "plugin_skills_dir"
        : "plugin_other"
      : origin.source;
  let sourceLabel = stripControlChars(`/${skillName} (${originLabel})`);
  let isPersonalConfig = reason === "personal_config";
  logForDebugging(
    isPersonalConfig
      ? `Ignoring allowed-tools ${stripControlChars(tools.join(", "))} from ${sourceLabel}: this session does not let your own skills and commands pre-approve tools (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG).`
      : `Ignoring allowed-tools ${stripControlChars(tools.join(", "))} from ${sourceLabel}: permission rules are restricted to managed settings (allowManagedPermissionRulesOnly).`,
    {
      level: "warn",
    },
  );
  if (!isPersonalConfig) warnedGrantHosts.of(getRootSession().host).add(sourceLabel);
  logEvent("tengu_frontmatter_grant_withheld", {
    origin: fromEnum(originKind),
    tool_count: tools.length,
    ...(isPersonalConfig && {
      reason: fromEnum(reason),
    }),
  });
  if (getPrintOutputFormat() === "text" && !isBgSession())
    console.error(
      isPersonalConfig
        ? `allowed-tools from ${sourceLabel} ignored: this session doesn't let your own skills and commands pre-approve tools (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG), so their tool calls are checked like any other call, and their inline shell commands run only if this session's permission rules already allow them.`
        : `allowed-tools from ${sourceLabel} ignored: your organization restricts permission rules to managed settings (allowManagedPermissionRulesOnly). Ask an admin to add the rules it needs to managed settings.`,
    );
}
//@ chunk-9s2vygnp.js:3762-3979 layout
function getRuleSourceLabel(source) {
  switch (source) {
    case "userSettings":
    case "projectSettings":
    case "localSettings":
    case "flagSettings":
    case "policySettings":
      return getSettingSourceName(source);
    case "builtin":
    case "bundled":
    case "mcp":
    case "memoryStore":
    case "plugin":
      return source;
  }
}
//@ chunk-9s2vygnp.js:3979-4157 facade-majority
/**
 * 命令/skill 实际生效的 allowed-tools：读取工具列表；带有被扣留的钩子或授权被扣留时返回空。
 */
async function armedAllowedToolsOf(command) {
  let tools = (await command.getAllowedTools?.()) ?? command.allowedTools ?? [];
  let rulesHeld = shouldLoadPermissionRules(command.hooks, getCommandRepository(command));
  if (tools.length === 0 || rulesHeld) return [];
  return isToolGrantAllowed(command.source, getPluginOriginInfo(command), command.fromHostCatalog === true)
    ? tools
    : [];
}
//@ chunk-9s2vygnp.js:4157-4403 layout
function getPluginOriginInfo(command) {
  return command.source === "plugin"
    ? {
        id: command.pluginInfo?.repository,
        officiallyAttested: command.pluginInfo?.officiallyAttested,
        marketplaceSource: command.pluginInfo?.marketplaceSource,
        npmResolution: command.pluginInfo?.npmResolution,
        home: command.pluginInfo?.home,
      }
    : undefined;
}
//@ chunk-9s2vygnp.js:4403-4451 facade-majority (2.1.88 match: _temp0, 1)
function arePluginHooksHeld(a_5) {
  return isPersonalConfigRestricted() && isUntrustedRuleOrigin("plugin", pluginGrantProvenanceOf(a_5));
}
//@ chunk-9s2vygnp.js:4451-4575 facade-majority
/**
 * 插件授权的来源信息：插件 id、是否官方认证、市场来源。
 */
function pluginGrantProvenanceOf(origin) {
  return {
    id: origin.source,
    officiallyAttested: origin.officialAttestation !== undefined,
    marketplaceSource: origin.marketplaceSource,
  };
}
//@ chunk-9s2vygnp.js:4575-4628 facade-majority
function takesNarrowingModeOnly(selectedAgent) {
  return (
    isRestrictedPersonalAgent(selectedAgent) ||
    shouldLoadPermissionRules(selectedAgent.hooks, selectedAgent.plugin)
  );
}
//@ chunk-9s2vygnp.js:4628-4770 facade-majority
/**
 * 代理是否属于被限制的个人配置（运行时注册的不算）。
 */
function isRestrictedPersonalAgent(agent) {
  if (!isPersonalConfigRestricted() || agent.registeredAtRunTime === true) return false;
  return isUntrustedRuleOrigin(
    agent.source,
    agent.source === "plugin"
      ? (agent.pluginProvenance ?? {
          id: agent.plugin,
        })
      : undefined,
  );
}
//@ chunk-9s2vygnp.js:4770-4840 facade-majority
/**
 * 命令的钩子是否被扣留：开启个人配置限制、非宿主目录来源且来源受限。
 */
function areCommandHooksHeld(command) {
  return (
    isPersonalConfigRestricted() &&
    command.fromHostCatalog !== true &&
    isUntrustedRuleOrigin(command.source, getPluginOriginInfo(command))
  );
}
//@ chunk-9s2vygnp.js:4840-4869 file-local
var SUPPORTED_RULE_BEHAVIORS = ["allow", "deny", "ask"];
//@ chunk-9s2vygnp.js:4869-5051 facade-majority (2.1.88 match: deletePermissionRuleFromSettings, 1)
/**
 * 把一个 settings JSON 的 permissions.allow/deny/ask 转成规则对象列表（带来源）。
 */
function settingsJsonToRules(data, source) {
  if (!data || !data.permissions) return [];
  let { permissions } = data;
  let rules = [];
  for (let behavior of SUPPORTED_RULE_BEHAVIORS) {
    let behaviorArray = permissions[behavior];
    if (behaviorArray)
      for (let ruleString of behaviorArray)
        rules.push({
          source,
          ruleBehavior: behavior,
          ruleValue: normalizeRuleString(ruleString, behavior),
        });
  }
  return rules;
}
//@ chunk-9s2vygnp.js:5051-5106 facade-majority
/**
 * CLAUDE_CODE_EVAL_CONFINED（插件评测）下为真：忽略 settings 的 allow 规则与额外目录。
 */
function settingsGrantsConfined() {
  return env.CLAUDE_CODE_EVAL_CONFINED === true;
}
//@ chunk-9s2vygnp.js:5106-5190 facade-majority
/**
 * 加载 settings 各层的权限规则；评测受限模式下去掉 allow 规则。
 */
function loadAllPermissionRulesFromDisk(options = {}) {
  let rules = loadSettingsPermissionRules(options);
  return settingsGrantsConfined() ? rules.filter((rule) => rule.ruleBehavior !== "allow") : rules;
}
//@ chunk-9s2vygnp.js:5190-5682 layout
/**
 * 托管独占时只读 policySettings；否则读全部启用层。工作区未受信任时丢弃 projectSettings/localSettings 的 allow 规则并给出一次性警告。
 */
function loadSettingsPermissionRules(options = {}) {
  if (shouldAllowManagedPermissionRulesOnly()) return getPermissionRulesForSource("policySettings");
  let rules = [];
  for (let source of getEnabledSettingSources()) rules.push(...getPermissionRulesForSource(source));
  if (!(options.strictPersistedTrust ?? isWorkspacePersistedTrusted())) {
    let { gateProject, gateLocal } = getProjectGrantGates();
    let gatedFiles = new Set();
    let filtered = rules.filter((rule) => {
      if (rule.ruleBehavior !== "allow") return true;
      if (rule.source === "projectSettings" && gateProject) {
        gatedFiles.add(".claude/settings.json");
        return false;
      }
      if (rule.source === "localSettings" && gateLocal) {
        gatedFiles.add(".claude/settings.local.json");
        return false;
      }
      return true;
    });
    if (filtered.length !== rules.length)
      warnDroppedUntrustedGrants("permissions.allow", rules.length - filtered.length, [...gatedFiles]);
    return filtered;
  }
  return rules;
}
//@ chunk-9s2vygnp.js:5682-5991 facade-majority
/**
 * 仓库内的设置来源：projectSettings，以及在 settings.local.json 被 git 跟踪（或曾见过被跟踪）时加上 localSettings；首次发现被跟踪时持久化标记。
 */
function repoResidentSettingSources(storage) {
  let originalCwdOrNull = getOriginalCwdOrNull();
  if (originalCwdOrNull === null) return ["projectSettings", "localSettings"];
  let state = GIT_TRACKED_LOCAL_SETTINGS_STATE.of(getRootSession().host);
  let isTracked = isLocalSettingsGitTracked({
    onIndeterminate: "tracked",
  });
  if (isTracked && checkHasTrustDialogAccepted()) {
    state.markTracked(originalCwdOrNull);
    if (!state.persistIssued(originalCwdOrNull) && isLocalSettingsGitTrackedInIndex()) {
      state.markPersistIssued(originalCwdOrNull);
      markLocalSettingsSeenGitTracked(storage);
    }
  }
  return isTracked || state.isTracked(originalCwdOrNull) || hasSeenGitTrackedLocalSettings()
    ? ["projectSettings", "localSettings"]
    : ["projectSettings"];
}
//@ chunk-9s2vygnp.js:5991-6198 layout
class GitTrackedLocalSettingsState {
  tracked = new Set();
  persisted = new Set();
  isTracked(workspace) {
    return this.tracked.has(workspace);
  }
  markTracked(workspace) {
    this.tracked.add(workspace);
  }
  persistIssued(workspace) {
    return this.persisted.has(workspace);
  }
  markPersistIssued(workspace) {
    this.persisted.add(workspace);
  }
}
//@ chunk-9s2vygnp.js:6198-6221 layout
var GIT_TRACKED_LOCAL_SETTINGS_STATE; // deferred: uses GitTrackedLocalSettingsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-9s2vygnp.js:6198", () => {
  GIT_TRACKED_LOCAL_SETTINGS_STATE = new HostScoped(() => new GitTrackedLocalSettingsState());
});
//@ chunk-9s2vygnp.js:6221-6297 layout
function hasSeenGitTrackedLocalSettings() {
  return getGlobalConfig().projects?.[getWorkspacePersistedTrustKey()]?.localSettingsSeenGitTracked === true;
}
//@ chunk-9s2vygnp.js:6297-6496 layout
function markLocalSettingsSeenGitTracked(storage) {
  let workspacePersistedTrustKey = getWorkspacePersistedTrustKey();
  saveGlobalConfig((config) => {
    if (config.projects?.[workspacePersistedTrustKey]?.localSettingsSeenGitTracked === true) return config;
    return {
      ...config,
      projects: {
        ...config.projects,
        [workspacePersistedTrustKey]: {
          ...(config.projects?.[workspacePersistedTrustKey] ?? DEFAULT_PROJECT_CONFIG),
          localSettingsSeenGitTracked: true,
        },
      },
    };
  }, storage);
}
//@ chunk-9s2vygnp.js:6496-6772 facade-majority
/**
 * 汇总各层 settings 声明的 additionalDirectories，区分只由仓库控制层（project/local）声明的目录 repoOnly。
 */
function additionalDirectoryProvenance(expand, storage) {
  let repoSources = repoResidentSettingSources(storage);
  let dirsOfSources = (sources) =>
    new Set(
      sources.flatMap((source) =>
        (getSettingsForSource(source)?.permissions?.additionalDirectories ?? []).flatMap(expand),
      ),
    );
  let repoDirs = dirsOfSources(repoSources);
  let otherDirs = new Set([
    ...dirsOfSources(getEnabledSettingSources().filter((source) => !repoSources.includes(source))),
    ...getAdditionalDirectoriesForClaudeMd().flatMap(expand),
  ]);
  for (let dir of otherDirs) repoDirs.delete(dir);
  return {
    declared: new Set([...repoDirs, ...otherDirs]),
    repoOnly: repoDirs,
  };
}
//@ chunk-9s2vygnp.js:6772-7267 facade-majority
/**
 * 读取 settings 各层 permissions.additionalDirectories；未受信任工作区跳过 project/local 层并告警；评测受限模式返回空。
 */
function loadTrustedAdditionalDirectoriesFromDisk(options = {}) {
  if (settingsGrantsConfined()) return [];
  let strictPersistedTrust = options.strictPersistedTrust ?? isWorkspacePersistedTrusted();
  let { gateProject, gateLocal } = strictPersistedTrust
    ? {
        gateProject: false,
        gateLocal: false,
      }
    : getProjectGrantGates();
  let directories = [];
  let count = 0;
  let gatedFiles = new Set();
  for (let source of getEnabledSettingSources()) {
    let additionalDirectories = getSettingsForSource(source)?.permissions?.additionalDirectories ?? [];
    if (gateProject && source === "projectSettings" && additionalDirectories.length > 0) {
      count += additionalDirectories.length;
      gatedFiles.add(".claude/settings.json");
      continue;
    }
    if (gateLocal && source === "localSettings" && additionalDirectories.length > 0) {
      count += additionalDirectories.length;
      gatedFiles.add(".claude/settings.local.json");
      continue;
    }
    directories.push(...additionalDirectories);
  }
  if (count > 0) warnDroppedUntrustedGrants("permissions.additionalDirectories", count, [...gatedFiles]);
  return directories;
}
//@ chunk-9s2vygnp.js:7267-7352 facade-majority
/**
 * 返回 {gateProject, gateLocal}：projectSettings 与 userSettings 不是同一文件（且工作区未信任）时 gateProject；localSettings 被 git 跟踪时 gateLocal。
 */
function getProjectGrantGates() {
  return {
    gateProject: !projectSettingsAliasesUserSettings(),
    gateLocal: isLocalSettingsGitTracked({
      onIndeterminate: "untracked",
    }),
  };
}
//@ chunk-9s2vygnp.js:7352-7504 layout
function sourceGrantsPermissions(source) {
  if (!getEnabledSettingSources().includes(source)) return false;
  return (
    getPermissionRulesForSource(source).some((rule) => rule.ruleBehavior === "allow") ||
    (getSettingsForSource(source)?.permissions?.additionalDirectories?.length ?? 0) > 0
  );
}
//@ chunk-9s2vygnp.js:7504-7636 facade-majority
/**
 * 工作区信任闸门的豁免：CLAUDE_CODE_SANDBOXED、远程/SDK/非交互等环境不施加项目授权闸门。
 */
function isGatedGrantsBackstopExempt() {
  if (env.CLAUDE_CODE_SANDBOXED) return true;
  if (isWorkspaceRestricted()) return true;
  if (getSessionTrustAccepted()) return true;
  if (isBgSession()) return true;
  if (isHomeDirectorySession()) return true;
  return isWorkspacePersistedTrusted();
}
//@ chunk-9s2vygnp.js:7636-7680 layout
function shouldWarnUntrustedGrants() {
  if (isGatedGrantsBackstopExempt()) return false;
  return workspaceHasGatedGrants();
}
//@ chunk-9s2vygnp.js:7680-7786 facade-majority
/**
 * 工作区是否有被信任闸门挡住的授权：被闸门的 projectSettings/localSettings 中确有授权项。
 */
function workspaceHasGatedGrants() {
  let { gateProject, gateLocal } = getProjectGrantGates();
  return (
    (gateProject && sourceGrantsPermissions("projectSettings")) ||
    (gateLocal && sourceGrantsPermissions("localSettings"))
  );
}
//@ chunk-9s2vygnp.js:7786-7914 layout
class OnceWarner {
  warned = new Set();
  firstTimeFor(key) {
    if (this.warned.has(key)) return false;
    this.warned.add(key);
    return true;
  }
  reset() {
    this.warned.clear();
  }
}
//@ chunk-9s2vygnp.js:7914-7937 layout
var DROPPED_GRANTS_WARNER; // deferred: uses OnceWarner of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-9s2vygnp.js:7914", () => {
  DROPPED_GRANTS_WARNER = new HostScoped(() => new OnceWarner());
});
//@ chunk-9s2vygnp.js:7937-7991 facade-majority
function firstGatedTrustDiagnosticFor(key) {
  return DROPPED_GRANTS_WARNER.of(getRootSession().host).firstTimeFor(key);
}
//@ chunk-9s2vygnp.js:7991-8698 layout
/**
 * 未受信任工作区丢弃 project/local 的放宽项时，每类只警告一次（stderr 说明如何信任工作区）。
 */
function warnDroppedUntrustedGrants(settingKey, count, files) {
  if (!DROPPED_GRANTS_WARNER.of(getRootSession().host).firstTimeFor(settingKey)) return;
  logForDebugging(
    `Dropped ${count} project-scoped ${settingKey} entr${count === 1 ? "y" : "ies"} \u2014 workspace not yet trusted`,
  );
  if (!getIsNonInteractiveSession() && (!checkHasTrustDialogAccepted() || shouldWarnUntrustedGrants()))
    return;
  let filesDescription = files.length > 0 ? files.join(" and ") : ".claude/ settings";
  let ignorePrefix = `Ignoring ${count} ${settingKey} ${count === 1 ? "entry" : "entries"} from ${filesDescription}: `;
  if (getOriginalCwdOrNull() === null) {
    console.error(`${ignorePrefix}a session with no working directory is never trusted.`);
    return;
  }
  if (ignoresPersistedTrust()) {
    console.error(
      `${ignorePrefix}${PERSISTED_TRUST_IGNORED}. Put ${count === 1 ? "it" : "them"} in user or managed settings instead.`,
    );
    return;
  }
  let workspacePersistedTrustKey = getWorkspacePersistedTrustKey();
  console.error(
    ignorePrefix +
      `this workspace has not been trusted. Run Claude Code interactively here once and accept the trust dialog, or set projects[${jsonStringify(workspacePersistedTrustKey)}].hasTrustDialogAccepted: true in ${describeGlobalConfigFile()}.`,
  );
}
//@ chunk-9s2vygnp.js:8698-8741 facade-majority
function getPermissionRulesForSource(source) {
  let settingsData = getSettingsForSource(source);
  return settingsJsonToRules(settingsData, source);
}
//@ chunk-9s2vygnp.js:8741-8750 layout
var EDITABLE_SETTING_SOURCES; // deferred: uses EDITABLE_SETTING_SOURCES (../settings/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-9s2vygnp.js:8741", () => {
  EDITABLE_SETTING_SOURCES = EDITABLE_SETTING_SOURCES_2;
});
//@ chunk-9s2vygnp.js:8750-9355 facade-majority (2.1.88 match: settingsJsonToRules, 0.708)
/**
 * 从可编辑 settings 文件删除一条规则（按规范化串比较）；localSettings 另查实际文件确认。
 */
async function deletePermissionRuleFromSettings(data, storageV5) {
  if (!EDITABLE_SETTING_SOURCES.includes(data.source)) return false;
  let ruleValue = permissionRuleValueFromString(data.ruleValue);
  let identity = data.ruleBehavior === "allow" ? parseRuleValue(ruleValue) : ruleValue;
  try {
    let inLegacyFile = false;
    if (data.source === "localSettings") {
      let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
      if (legacyLocalSettingsFilePath)
        inLegacyFile = !!parseSettingsFile(legacyLocalSettingsFilePath).settings?.permissions?.[
          data.ruleBehavior
        ]?.some((raw) => parseRuleValue(raw) === identity);
    }
    let removed = false;
    let { error } = await updateSettingsForSourceWithTransform(
      data.source,
      (settings) => {
        let behaviorArray = settings?.permissions?.[data.ruleBehavior];
        if (!behaviorArray || !behaviorArray.some((raw) => parseRuleValue(raw) === identity)) return null;
        removed = true;
        return {
          permissions: {
            [data.ruleBehavior]: behaviorArray.filter((raw) => parseRuleValue(raw) !== identity),
          },
        };
      },
      undefined,
      storageV5,
    );
    if (error) return false;
    if (!removed && inLegacyFile) {
      let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
      if (legacyLocalSettingsFilePath)
        return !parseSettingsFile(legacyLocalSettingsFilePath).settings?.permissions?.[
          data.ruleBehavior
        ]?.some((raw) => parseRuleValue(raw) === identity);
    }
    return removed || inLegacyFile;
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-9s2vygnp.js:9355-9827 facade-majority (2.1.88 match: addPermissionRulesToSettings, 0.548)
/**
 * 把规则追加写入某层 settings（去重）；托管独占时拒绝。
 */
async function addPermissionRulesToSettings({ ruleValues, ruleBehavior }, destination, storage) {
  if (shouldAllowManagedPermissionRulesOnly()) return false;
  if (ruleValues.length < 1) return true;
  let ruleStrings = ruleValues.map(permissionRuleValueFromString);
  try {
    let updateResult = await updateSettingsForSourceWithTransform(
      destination,
      (currentSettings) => {
        let existingRules = currentSettings?.permissions?.[ruleBehavior] || [];
        let existingRulesSet = new Set(
          existingRules.map((raw) => permissionRuleValueFromString(normalizeRuleString(raw, ruleBehavior))),
        );
        let newRules = ruleStrings.filter((rule) => !existingRulesSet.has(rule));
        if (newRules.length === 0) return null;
        return {
          permissions: {
            [ruleBehavior]: [...existingRules, ...newRules],
          },
        };
      },
      undefined,
      storage,
    );
    if (updateResult.error) throw updateResult.error;
    return true;
  } catch (error) {
    logForDebugging(
      `Failed to add permission rules to ${destination} settings: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-t58ha4ac.js:6190-6445 fingerprint (2.1.88 match: getEmptyPermissionSettingsJson, 0.687)
/**
 * 从设置对象中只提取限制性权限（deny 与 ask 的字符串数组），没有则返回 null。
 */
function extractRestrictivePermissions(settings) {
  let { permissions } = settings;
  if (!isPlainObject(permissions)) return null;
  let flattened = ["deny", "ask"].flatMap((behavior) => {
    let rawList = permissions[behavior];
    let rules = Array.isArray(rawList) ? rawList.filter((entry) => typeof entry === "string") : [];
    return rules.length === 0 ? [] : [[behavior, rules]];
  });
  return flattened.length === 0
    ? null
    : {
        permissions: Object.fromEntries(flattened),
      };
}
export {
  loadAllPermissionRulesFromDisk,
  loadTrustedAdditionalDirectoriesFromDisk,
  shouldAllowManagedPermissionRulesOnly,
  additionalDirectoryProvenance,
  settingsGrantsConfined,
  deletePermissionRuleFromSettings,
  isGatedGrantsBackstopExempt,
  workspaceHasGatedGrants,
  getPermissionRulesForSource,
  settingsJsonToRules,
  getProjectGrantGates,
  isRestrictedPersonalAgent,
  getIgnoredFrontmatterToolGrants,
  isVouchedMarketplaceRef,
  arePluginHooksHeld,
  shouldLoadPermissionRules,
  frontmatterToolGrantWithheldReason,
  reportIgnoredFrontmatterToolGrants,
  repoResidentSettingSources,
  armedAllowedToolsOf,
  firstGatedTrustDiagnosticFor,
  pluginGrantProvenanceOf,
  takesNarrowingModeOnly,
  getCommandRepository,
  areCommandHooksHeld,
  shouldShowAlwaysAllowOptions,
  addPermissionRulesToSettings,
  extractRestrictivePermissions,
};
