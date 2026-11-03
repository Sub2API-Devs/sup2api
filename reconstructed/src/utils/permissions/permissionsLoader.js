/**
 * utils/permissions/permissionsLoader.ts
 *
 * 从 settings 各层加载权限规则与 additionalDirectories（托管独占、工作区信任门控、评测受限），以及向 settings 增删规则。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/permissionsLoader.ts
 * pieces: chunk-anrta56w.js (45), chunk-bwpc82tt.js (1)
 * attribution: placement 3, facade-majority 24, layout 17, file-local 1, fingerprint 1
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
import { SYNCED, wOn, INLINE_PLUGIN_MARKETPLACE, SKILLS_DIR, BUILTIN } from "../telemetry/pluginTelemetry.js";
import { nfcLower } from "../stringUtils.js";
import { isHostEntrypoint } from "../entrypointKinds.js";
import {
  isNpmResolutionVouchedByPolicy,
  isOfficialMarketplaceSourceVouched,
  isMarketplaceSourceVouchedByPolicy,
} from "../plugins/marketplacePolicy.js";
import { NPM } from "../plugins/schemas.js";
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
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
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
import { formatPermissionRule } from "./disallowedToolsFlag.js";
import { isPlainObject } from "../isPlainObject.js";

/**
 * 取命令的来源仓库：插件命令取插件仓库，内置命令取其会话函数钩子，其他为 undefined。
 */
//@ chunk-anrta56w.js:1051-1170 placement
function getCommandRepository(e) {
  if (e.source === "plugin") return e.pluginInfo?.repository;
  return e.source === "bundled" ? getSessionFunctionHooks(e.hooks) : void 0;
}
//@ chunk-anrta56w.js:1170-1202 placement
var yYt = (e) => isOfficialMarketplaceRef(e) || hasSimilarMarketplaceName(e, getVouchedPolicyPluginIds());
/**
 * 是否加载权限规则（信任与远程设置状态）。
 */
//@ chunk-anrta56w.js:1202-1379 placement
function shouldLoadPermissionRules(e, r) {
  if (!isOrganizationHookPolicyPending() || !hasGuardHooks_2(e)) return !1;
  try {
    if (shouldSkipSessionHooksByPolicy()) return !0;
  } catch (error) {
    return (logError(error), !0);
  }
  if (!isHookPolicyUnanswered()) return !1;
  let o = !0;
  try {
    o = r === void 0 || !yYt(r);
  } catch (error) {
    logError(error);
  }
  if (o) markOrganizationAskHeld();
  return o;
}
/**
 * policySettings.allowManagedPermissionRulesOnly=true 时只使用托管策略里的权限规则。
 */
//@ chunk-anrta56w.js:1379-1459 facade-majority = shouldAllowManagedPermissionRulesOnly (1)
function shouldAllowManagedPermissionRulesOnly() {
  return getSettingsForSource("policySettings")?.allowManagedPermissionRulesOnly === !0;
}
//@ chunk-anrta56w.js:1459-1485 facade-majority
function shouldShowAlwaysAllowOptions() {
  return !shouldAllowManagedPermissionRulesOnly();
}
//@ chunk-anrta56w.js:1485-1533 layout
function G(e, r, o = !1) {
  return frontmatterToolGrantWithheldReason(e, r, o) === void 0;
}
/**
 * 前置声明（frontmatter）里 allowed-tools 授权被扣留的原因：仅托管规则模式且来源非托管 → managed_rules_only；限制个人配置时来自个人配置 → personal_config。
 */
//@ chunk-anrta56w.js:1533-1671 facade-majority
function frontmatterToolGrantWithheldReason(e, r, o = !1) {
  if (shouldAllowManagedPermissionRulesOnly()) {
    if (!(e === "plugin" ? isVouchedPluginOrigin(r) : isSourceAdminTrusted(e))) return "managed_rules_only";
  }
  return isPersonalConfigRestricted() && !o && isUntrustedRuleOrigin(e, r) ? "personal_config" : void 0;
}
/**
 * 规则来源是否不可信：用户设置或未知来源；插件来自非组织 claude.ai 市场、未认证的同步市场或指定的内联插件时也视为不可信。
 */
//@ chunk-anrta56w.js:1671-1998 layout
function isUntrustedRuleOrigin(e, r) {
  if (e === void 0 || e === "userSettings") return !0;
  if (e !== "plugin") return !1;
  let o = r?.marketplaceSource;
  if (o?.source === "claudeai" && o.scope !== "org" && o.scope !== "default") return !0;
  let n = r?.id;
  if (n === void 0) return !0;
  switch (marketplaceOf(n) ?? marketplaceSuffix(n)) {
    case SYNCED:
      return r?.officiallyAttested !== !0;
    case INLINE_PLUGIN_MARKETPLACE:
      return nfcLower(n) === wOn;
    default:
      return !1;
  }
}
/**
 * 插件来源是否被担保：内置；同步市场需官方认证；npm 需策略担保的解析；官方市场名需官方来源；其他需策略担保的市场源。
 */
//@ chunk-anrta56w.js:1998-2436 layout
function isVouchedPluginOrigin(e) {
  let r = e?.id;
  if (r === void 0) return !1;
  let o = marketplaceOf(r) ?? marketplaceSuffix(r);
  switch (o) {
    case void 0:
    case SKILLS_DIR:
      return !1;
    case INLINE_PLUGIN_MARKETPLACE:
      return (
        nfcLower(r) !== wOn &&
        !(isHostEntrypoint() && getAdminAuthoredPolicySettings()?.allowManagedPermissionRulesOnly === !0)
      );
    case BUILTIN:
      return !0;
    case SYNCED:
      return e?.officiallyAttested === !0;
    case NPM:
      return e?.npmResolution !== void 0 && isNpmResolutionVouchedByPolicy(e.npmResolution);
    default:
      break;
  }
  if (e?.marketplaceSource === void 0) return !1;
  return (
    (isOfficialMarketplaceName_3(o) && isOfficialMarketplaceSourceVouched(e.marketplaceSource)) ||
    isMarketplaceSourceVouchedByPolicy(e.marketplaceSource, e.home)
  );
}
//@ chunk-anrta56w.js:2436-2461 layout
var h = new HostScoped(() => new Set());
//@ chunk-anrta56w.js:2461-2498 facade-majority
function getIgnoredFrontmatterToolGrants() {
  return h.of(getRootSession().host);
}
/**
 * 报告被忽略的 skill/command frontmatter allowed-tools：记告警（区分 allowManagedPermissionRulesOnly 与 CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG），上报 tengu_frontmatter_grant_withheld，文本模式下也打印到 stderr。
 */
//@ chunk-anrta56w.js:2498-3696 facade-majority
function reportIgnoredFrontmatterToolGrants(e, r, o, n = "managed_rules_only") {
  let s = "pluginId" in r ? r.pluginId : getRuleSourceLabel(r.source),
    u =
      "pluginId" in r
        ? marketplaceOf(r.pluginId) === SKILLS_DIR
          ? "plugin_skills_dir"
          : "plugin_other"
        : r.source,
    d = stripControlChars(`/${e} (${s})`),
    g = n === "personal_config";
  if (
    (logForDebugging(
      g
        ? `Ignoring allowed-tools ${stripControlChars(o.join(", "))} from ${d}: this session does not let your own skills and commands pre-approve tools (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG).`
        : `Ignoring allowed-tools ${stripControlChars(o.join(", "))} from ${d}: permission rules are restricted to managed settings (allowManagedPermissionRulesOnly).`,
      { level: "warn" },
    ),
    !g)
  )
    h.of(getRootSession().host).add(d);
  if (
    (logEvent("tengu_frontmatter_grant_withheld", {
      origin: fromEnum(u),
      tool_count: o.length,
      ...(g && { reason: fromEnum(n) }),
    }),
    getPrintOutputFormat() === "text" && !isBgSession())
  )
    console.error(
      g
        ? `allowed-tools from ${d} ignored: this session doesn't let your own skills and commands pre-approve tools (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG), so their tool calls are checked like any other call, and their inline shell commands run only if this session's permission rules already allow them.`
        : `allowed-tools from ${d} ignored: your organization restricts permission rules to managed settings (allowManagedPermissionRulesOnly). Ask an admin to add the rules it needs to managed settings.`,
    );
}
//@ chunk-anrta56w.js:3696-3913 layout
function getRuleSourceLabel(e) {
  switch (e) {
    case "userSettings":
    case "projectSettings":
    case "localSettings":
    case "flagSettings":
    case "policySettings":
      return getSettingSourceName(e);
    case "builtin":
    case "bundled":
    case "mcp":
    case "memoryStore":
    case "plugin":
      return e;
  }
}
/**
 * 命令/skill 实际生效的 allowed-tools：读取工具列表；带有被扣留的钩子或授权被扣留时返回空。
 */
//@ chunk-anrta56w.js:3913-4091 facade-majority
async function armedAllowedToolsOf(e) {
  let r = (await e.getAllowedTools?.()) ?? e.allowedTools ?? [],
    o = shouldLoadPermissionRules(e.hooks, getCommandRepository(e));
  if (r.length === 0 || o) return [];
  return G(e.source, getPluginOriginInfo(e), e.fromHostCatalog === !0) ? r : [];
}
//@ chunk-anrta56w.js:4091-4337 layout
function getPluginOriginInfo(e) {
  return e.source === "plugin"
    ? {
        id: e.pluginInfo?.repository,
        officiallyAttested: e.pluginInfo?.officiallyAttested,
        marketplaceSource: e.pluginInfo?.marketplaceSource,
        npmResolution: e.pluginInfo?.npmResolution,
        home: e.pluginInfo?.home,
      }
    : void 0;
}
//@ chunk-anrta56w.js:4337-4385 facade-majority = _temp0 (1)
function arePluginHooksHeld(a_5) {
  return isPersonalConfigRestricted() && isUntrustedRuleOrigin("plugin", pluginGrantProvenanceOf(a_5));
}
/**
 * 插件授权的来源信息：插件 id、是否官方认证、市场来源。
 */
//@ chunk-anrta56w.js:4385-4509 facade-majority
function pluginGrantProvenanceOf(e) {
  return {
    id: e.source,
    officiallyAttested: e.officialAttestation !== void 0,
    marketplaceSource: e.marketplaceSource,
  };
}
//@ chunk-anrta56w.js:4509-4562 facade-majority
function takesNarrowingModeOnly(e) {
  return isRestrictedPersonalAgent(e) || shouldLoadPermissionRules(e.hooks, e.plugin);
}
/**
 * 代理是否属于被限制的个人配置（运行时注册的不算）。
 */
//@ chunk-anrta56w.js:4562-4704 facade-majority
function isRestrictedPersonalAgent(e) {
  if (!isPersonalConfigRestricted() || e.registeredAtRunTime === !0) return !1;
  return isUntrustedRuleOrigin(
    e.source,
    e.source === "plugin" ? (e.pluginProvenance ?? { id: e.plugin }) : void 0,
  );
}
/**
 * 命令的钩子是否被扣留：开启个人配置限制、非宿主目录来源且来源受限。
 */
//@ chunk-anrta56w.js:4704-4774 facade-majority
function areCommandHooksHeld(e) {
  return (
    isPersonalConfigRestricted() &&
    e.fromHostCatalog !== !0 &&
    isUntrustedRuleOrigin(e.source, getPluginOriginInfo(e))
  );
}
//@ chunk-anrta56w.js:4774-4803 file-local
var SUPPORTED_RULE_BEHAVIORS = ["allow", "deny", "ask"];
/**
 * 把一个 settings JSON 的 permissions.allow/deny/ask 转成规则对象列表（带来源）。
 */
//@ chunk-anrta56w.js:4803-4983 facade-majority = settingsJsonToRules (1)
function settingsJsonToRules(data, source) {
  if (!data || !data.permissions) return [];
  let { permissions: permissions } = data,
    rules = [];
  for (let behavior of SUPPORTED_RULE_BEHAVIORS) {
    let behaviorArray = permissions[behavior];
    if (behaviorArray)
      for (let ruleString of behaviorArray)
        rules.push({
          source: source,
          ruleBehavior: behavior,
          ruleValue: permissionRuleValueFromString(ruleString),
        });
  }
  return rules;
}
/**
 * CLAUDE_CODE_EVAL_CONFINED（插件评测）下为真：忽略 settings 的 allow 规则与额外目录。
 */
//@ chunk-anrta56w.js:4983-5038 facade-majority
function settingsGrantsConfined() {
  return env.CLAUDE_CODE_EVAL_CONFINED === !0;
}
/**
 * 加载 settings 各层的权限规则；评测受限模式下去掉 allow 规则。
 */
//@ chunk-anrta56w.js:5038-5122 facade-majority
function loadAllPermissionRulesFromDisk(options = {}) {
  let rules = loadSettingsPermissionRules(options);
  return settingsGrantsConfined() ? rules.filter((o) => o.ruleBehavior !== "allow") : rules;
}
/**
 * 托管独占时只读 policySettings；否则读全部启用层。工作区未受信任时丢弃 projectSettings/localSettings 的 allow 规则并给出一次性警告。
 */
//@ chunk-anrta56w.js:5122-5614 layout
function loadSettingsPermissionRules(options = {}) {
  if (shouldAllowManagedPermissionRulesOnly()) return getPermissionRulesForSource("policySettings");
  let rules = [];
  for (let o of getEnabledSettingSources()) rules.push(...getPermissionRulesForSource(o));
  if (!(options.strictPersistedTrust ?? isWorkspacePersistedTrusted())) {
    let { gateProject: gateProject, gateLocal: gateLocal } = getProjectGrantGates(),
      s = new Set(),
      filtered = rules.filter((d) => {
        if (d.ruleBehavior !== "allow") return !0;
        if (d.source === "projectSettings" && gateProject) return (s.add(".claude/settings.json"), !1);
        if (d.source === "localSettings" && gateLocal) return (s.add(".claude/settings.local.json"), !1);
        return !0;
      });
    if (filtered.length !== rules.length)
      warnDroppedUntrustedGrants("permissions.allow", rules.length - filtered.length, [...s]);
    return filtered;
  }
  return rules;
}
/**
 * 仓库内的设置来源：projectSettings，以及在 settings.local.json 被 git 跟踪（或曾见过被跟踪）时加上 localSettings；首次发现被跟踪时持久化标记。
 */
//@ chunk-anrta56w.js:5614-5923 facade-majority
function repoResidentSettingSources(e) {
  let r = getOriginalCwdOrNull();
  if (r === null) return ["projectSettings", "localSettings"];
  let of = GIT_TRACKED_LOCAL_SETTINGS_STATE.of(getRootSession().host),
    n = isLocalSettingsGitTracked({ onIndeterminate: "tracked" });
  if (n && checkHasTrustDialogAccepted()) {
    if ((of.markTracked(r), !of.persistIssued(r) && isLocalSettingsGitTrackedInIndex()))
      (of.markPersistIssued(r), markLocalSettingsSeenGitTracked(e));
  }
  return n || of.isTracked(r) || hasSeenGitTrackedLocalSettings()
    ? ["projectSettings", "localSettings"]
    : ["projectSettings"];
}
//@ chunk-anrta56w.js:5923-6130 layout
class GitTrackedLocalSettingsState {
  tracked = new Set();
  persisted = new Set();
  isTracked(e) {
    return this.tracked.has(e);
  }
  markTracked(e) {
    this.tracked.add(e);
  }
  persistIssued(e) {
    return this.persisted.has(e);
  }
  markPersistIssued(e) {
    this.persisted.add(e);
  }
}
//@ chunk-anrta56w.js:6130-6153 layout
var GIT_TRACKED_LOCAL_SETTINGS_STATE = new HostScoped(() => new GitTrackedLocalSettingsState());
//@ chunk-anrta56w.js:6153-6229 layout
function hasSeenGitTrackedLocalSettings() {
  return getGlobalConfig().projects?.[getWorkspacePersistedTrustKey()]?.localSettingsSeenGitTracked === !0;
}
//@ chunk-anrta56w.js:6229-6428 layout
function markLocalSettingsSeenGitTracked(e) {
  let r = getWorkspacePersistedTrustKey();
  saveGlobalConfig((o) => {
    if (o.projects?.[r]?.localSettingsSeenGitTracked === !0) return o;
    return {
      ...o,
      projects: {
        ...o.projects,
        [r]: { ...(o.projects?.[r] ?? DEFAULT_PROJECT_CONFIG), localSettingsSeenGitTracked: !0 },
      },
    };
  }, e);
}
/**
 * 汇总各层 settings 声明的 additionalDirectories，区分只由仓库控制层（project/local）声明的目录 repoOnly。
 */
//@ chunk-anrta56w.js:6428-6704 facade-majority
function additionalDirectoryProvenance(e, r) {
  let o = repoResidentSettingSources(r),
    n = (d) =>
      new Set(
        d.flatMap((g) => (getSettingsForSource(g)?.permissions?.additionalDirectories ?? []).flatMap(e)),
      ),
    s = n(o),
    u = new Set([
      ...n(getEnabledSettingSources().filter((d) => !o.includes(d))),
      ...getAdditionalDirectoriesForClaudeMd().flatMap(e),
    ]);
  for (let d of u) s.delete(d);
  return { declared: new Set([...s, ...u]), repoOnly: s };
}
/**
 * 读取 settings 各层 permissions.additionalDirectories；未受信任工作区跳过 project/local 层并告警；评测受限模式返回空。
 */
//@ chunk-anrta56w.js:6704-7199 facade-majority
function loadTrustedAdditionalDirectoriesFromDisk(e = {}) {
  if (settingsGrantsConfined()) return [];
  let r = e.strictPersistedTrust ?? isWorkspacePersistedTrusted(),
    { gateProject: gateProject, gateLocal: gateLocal } = r
      ? { gateProject: !1, gateLocal: !1 }
      : getProjectGrantGates(),
    s = [],
    u = 0,
    d = new Set();
  for (let g of getEnabledSettingSources()) {
    let f = getSettingsForSource(g)?.permissions?.additionalDirectories ?? [];
    if (gateProject && g === "projectSettings" && f.length > 0) {
      ((u += f.length), d.add(".claude/settings.json"));
      continue;
    }
    if (gateLocal && g === "localSettings" && f.length > 0) {
      ((u += f.length), d.add(".claude/settings.local.json"));
      continue;
    }
    s.push(...f);
  }
  if (u > 0) warnDroppedUntrustedGrants("permissions.additionalDirectories", u, [...d]);
  return s;
}
/**
 * 返回 {gateProject, gateLocal}：projectSettings 与 userSettings 不是同一文件（且工作区未信任）时 gateProject；localSettings 被 git 跟踪时 gateLocal。
 */
//@ chunk-anrta56w.js:7199-7284 facade-majority
function getProjectGrantGates() {
  return {
    gateProject: !projectSettingsAliasesUserSettings(),
    gateLocal: isLocalSettingsGitTracked({ onIndeterminate: "untracked" }),
  };
}
//@ chunk-anrta56w.js:7284-7436 layout
function sourceGrantsPermissions(e) {
  if (!getEnabledSettingSources().includes(e)) return !1;
  return (
    getPermissionRulesForSource(e).some((r) => r.ruleBehavior === "allow") ||
    (getSettingsForSource(e)?.permissions?.additionalDirectories?.length ?? 0) > 0
  );
}
/**
 * 工作区信任闸门的豁免：CLAUDE_CODE_SANDBOXED、远程/SDK/非交互等环境不施加项目授权闸门。
 */
//@ chunk-anrta56w.js:7436-7568 facade-majority
function isGatedGrantsBackstopExempt() {
  if (env.CLAUDE_CODE_SANDBOXED) return !0;
  if (isWorkspaceRestricted()) return !0;
  if (getSessionTrustAccepted()) return !0;
  if (isBgSession()) return !0;
  if (isHomeDirectorySession()) return !0;
  return isWorkspacePersistedTrusted();
}
//@ chunk-anrta56w.js:7568-7612 layout
function shouldWarnUntrustedGrants() {
  if (isGatedGrantsBackstopExempt()) return !1;
  return workspaceHasGatedGrants();
}
/**
 * 工作区是否有被信任闸门挡住的授权：被闸门的 projectSettings/localSettings 中确有授权项。
 */
//@ chunk-anrta56w.js:7612-7718 facade-majority
function workspaceHasGatedGrants() {
  let { gateProject: gateProject, gateLocal: gateLocal } = getProjectGrantGates();
  return (
    (gateProject && sourceGrantsPermissions("projectSettings")) ||
    (gateLocal && sourceGrantsPermissions("localSettings"))
  );
}
//@ chunk-anrta56w.js:7718-7846 layout
class OnceWarner {
  warned = new Set();
  firstTimeFor(e) {
    if (this.warned.has(e)) return !1;
    return (this.warned.add(e), !0);
  }
  reset() {
    this.warned.clear();
  }
}
//@ chunk-anrta56w.js:7846-7869 layout
var DROPPED_GRANTS_WARNER = new HostScoped(() => new OnceWarner());
//@ chunk-anrta56w.js:7869-7923 facade-majority
function firstGatedTrustDiagnosticFor(e) {
  return DROPPED_GRANTS_WARNER.of(getRootSession().host).firstTimeFor(e);
}
/**
 * 未受信任工作区丢弃 project/local 的放宽项时，每类只警告一次（stderr 说明如何信任工作区）。
 */
//@ chunk-anrta56w.js:7923-8631 layout
function warnDroppedUntrustedGrants(settingKey, count, files) {
  if (!DROPPED_GRANTS_WARNER.of(getRootSession().host).firstTimeFor(settingKey)) return;
  if (
    (logForDebugging(
      `Dropped ${count} project-scoped ${settingKey} entr${count === 1 ? "y" : "ies"} \u2014 workspace not yet trusted`,
    ),
    !getIsNonInteractiveSession() && (!checkHasTrustDialogAccepted() || shouldWarnUntrustedGrants()))
  )
    return;
  let n = files.length > 0 ? files.join(" and ") : ".claude/ settings",
    s = `Ignoring ${count} ${settingKey} ${count === 1 ? "entry" : "entries"} from ${n}: `;
  if (getOriginalCwdOrNull() === null) {
    console.error(`${s}a session with no working directory is never trusted.`);
    return;
  }
  if (ignoresPersistedTrust()) {
    console.error(
      `${s}${PERSISTED_TRUST_IGNORED}. Put ${count === 1 ? "it" : "them"} in user or managed settings instead.`,
    );
    return;
  }
  let u = getWorkspacePersistedTrustKey();
  console.error(
    s +
      `this workspace has not been trusted. Run Claude Code interactively here once and accept the trust dialog, or set projects[${jsonStringify(u)}].hasTrustDialogAccepted: true in ${describeGlobalConfigFile()}.`,
  );
}
//@ chunk-anrta56w.js:8631-8674 facade-majority
function getPermissionRulesForSource(e) {
  let r = getSettingsForSource(e);
  return settingsJsonToRules(r, e);
}
//@ chunk-anrta56w.js:8674-8683 layout
var EDITABLE_SETTING_SOURCES = EDITABLE_SETTING_SOURCES_2;
/**
 * 从可编辑 settings 文件删除一条规则（按规范化串比较）；localSettings 另查实际文件确认。
 */
//@ chunk-anrta56w.js:8683-9266 facade-majority = deletePermissionRuleFromSettings (0.709)
async function deletePermissionRuleFromSettings(e, r) {
  if (!EDITABLE_SETTING_SOURCES.includes(e.source)) return !1;
  let ruleString = formatPermissionRule(e.ruleValue),
    normalizeEntry = (raw) => formatPermissionRule(permissionRuleValueFromString(raw));
  try {
    let s = !1;
    if (e.source === "localSettings") {
      let g = getLegacyLocalSettingsFilePath();
      if (g)
        s = !!parseSettingsFile(g).settings?.permissions?.[e.ruleBehavior]?.some(
          (raw) => normalizeEntry(raw) === ruleString,
        );
    }
    let u = !1,
      { error: error } = await updateSettingsForSourceWithTransform(
        e.source,
        (g) => {
          let f = g?.permissions?.[e.ruleBehavior];
          if (!f || !f.some((p) => normalizeEntry(p) === ruleString)) return null;
          return (
            (u = !0),
            { permissions: { [e.ruleBehavior]: f.filter((p) => normalizeEntry(p) !== ruleString) } }
          );
        },
        void 0,
        r,
      );
    if (error) return !1;
    if (!u && s) {
      let g = getLegacyLocalSettingsFilePath();
      if (g)
        return !parseSettingsFile(g).settings?.permissions?.[e.ruleBehavior]?.some(
          (raw) => normalizeEntry(raw) === ruleString,
        );
    }
    return u || s;
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 把规则追加写入某层 settings（去重）；托管独占时拒绝。
 */
//@ chunk-anrta56w.js:9266-9736 facade-majority = addPermissionRulesToSettings (0.549)
async function addPermissionRulesToSettings(
  { ruleValues: ruleValues, ruleBehavior: ruleBehavior },
  destination,
  storage,
) {
  if (shouldAllowManagedPermissionRulesOnly()) return !1;
  if (ruleValues.length < 1) return !0;
  let ruleStrings = ruleValues.map(formatPermissionRule);
  try {
    let u = await updateSettingsForSourceWithTransform(
      destination,
      (d) => {
        let g = d?.permissions?.[ruleBehavior] || [],
          existingRulesSet = new Set(
            g.map((raw) => formatPermissionRule(permissionRuleValueFromString(raw))),
          ),
          newRules = ruleStrings.filter((rule) => !existingRulesSet.has(rule));
        if (newRules.length === 0) return null;
        return { permissions: { [ruleBehavior]: [...g, ...newRules] } };
      },
      void 0,
      storage,
    );
    if (u.error) throw u.error;
    return !0;
  } catch (error) {
    return (
      logForDebugging(
        `Failed to add permission rules to ${destination} settings: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      !1
    );
  }
}
/**
 * 从设置对象中只提取限制性权限（deny 与 ask 的字符串数组），没有则返回 null。
 */
//@ chunk-bwpc82tt.js:6091-6346 fingerprint = getEmptyPermissionSettingsJson (0.688)
function extractRestrictivePermissions(settings) {
  let { permissions: permissions } = settings;
  if (!isPlainObject(permissions)) return null;
  let flattened = ["deny", "ask"].flatMap((r) => {
    let s = permissions[r],
      i = Array.isArray(s) ? s.filter((c) => typeof c === "string") : [];
    return i.length === 0 ? [] : [[r, i]];
  });
  return flattened.length === 0 ? null : { permissions: Object.fromEntries(flattened) };
}

export {
  shouldAllowManagedPermissionRulesOnly,
  getIgnoredFrontmatterToolGrants,
  isRestrictedPersonalAgent,
  loadAllPermissionRulesFromDisk,
  settingsGrantsConfined,
  deletePermissionRuleFromSettings,
  armedAllowedToolsOf,
  takesNarrowingModeOnly,
  getPermissionRulesForSource,
  settingsJsonToRules,
  getProjectGrantGates,
  isGatedGrantsBackstopExempt,
  workspaceHasGatedGrants,
  loadTrustedAdditionalDirectoriesFromDisk,
  firstGatedTrustDiagnosticFor,
  arePluginHooksHeld,
  shouldShowAlwaysAllowOptions,
  addPermissionRulesToSettings,
  getCommandRepository,
  areCommandHooksHeld,
  shouldLoadPermissionRules,
  additionalDirectoryProvenance,
  repoResidentSettingSources,
  yYt,
  pluginGrantProvenanceOf,
  extractRestrictivePermissions,
  frontmatterToolGrantWithheldReason,
  reportIgnoredFrontmatterToolGrants,
};
