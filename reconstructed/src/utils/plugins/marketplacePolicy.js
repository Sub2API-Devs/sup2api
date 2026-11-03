/**
 * utils/plugins/marketplacePolicy.ts
 *
 * 2.1.316 新增：marketplace 来源策略：组织策略担保、阻止名单匹配、npm 解析与 headersHelper 拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f3qhjfah.js (52)
 * attribution: placement 52
 */
import {
  getSettingsForSource,
  getParsedParentManagedSettings,
  parentTierWithOrganizationLocksHooks,
  getAdminPolicyTierSettings,
  getPolicySettingsOrigin,
  getAdminAuthoredPolicySettings,
  allowListEntriesThatVouch,
} from "../settings/settings.js";
import { officialPluginId } from "./pluginIdentifier.js";
import { lookupByPluginAliases } from "./pluginConfigSources.js";
import {
  getBlockedMarketplaces,
  isHostPatternEntry,
  getPolicyHostOfSource,
  isValidPolicyRegex,
  doesSourceMatchHostPattern,
  fullMatchesRegex,
  areSourcesEqual,
  extractHostFromSource_2,
  doesSourceMatchPathPattern,
  areSourcesEquivalentForBlocklist,
  isSafeRelativePath,
} from "./marketplaceHelpers.js";
import {
  marketplaceNameAnswerState,
  policyBlockReason,
  managedMarketplaceAnswerFlag,
} from "./marketplaceNames.js";
import { policyDenyKind } from "../../services/policyLimits/policyVerdicts.js";
import {
  isUnsafeGitUrl,
  redactMarketplaceSource,
  isValidNpmPackageName,
  isAnthropicsMarketplaceSource,
  isValidGithubOwner,
  normalizeRepoPath,
  parseGithubOwnerWildcard,
  GITHUB_NAME_SEGMENT_RE,
} from "./schemas.js";
import { isUnsafeRemoteUrl } from "../git/githubUrl.js";
import { isRemoteManagedSettingsVerifiedAndApprovedForSession } from "../../services/remoteManagedSettings/remoteSettingsState.js";
import { printablePluginName } from "../../components/ManagedSettingsSecurityDialog/utils.js";
import { plural, nfcLower } from "../stringUtils.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import { currentOrgUuid } from "./syncedItems.js";
import { normalizeLocalMarketplaceSource } from "./localMarketplacePaths.js";
import { normalizeGitHost, isSuspiciousUrl } from "../fsBoundRead.js";
import { parseScpLikeUrl } from "../gitHosts.js";
import { isIpv4MappedOrTranslatedIpv6 } from "../network/privateHostCheck.js";
import { logForDebugging } from "../debug.js";

//@ chunk-f3qhjfah.js:45056-45090 placement
var PLUGIN_DIRECTORY_SOURCE = {
  source: "pluginDirectory",
};
//@ chunk-f3qhjfah.js:45090-45192 placement = getManagedPluginNames (1)
/**
 * 插件是否被托管策略显式禁用（policySettings.enabledPlugins 中为 false，含别名）。
 */
function isPluginBlockedByPolicy(e) {
  let enabledPlugins = getSettingsForSource("policySettings")?.enabledPlugins;
  return [e, officialPluginId(e) ?? e].some((r) => lookupByPluginAliases(enabledPlugins, r) === false);
}
//@ chunk-f3qhjfah.js:45192-45309 placement = getStrictKnownMarketplaces (1)
/**
 * 读托管策略 policySettings.strictKnownMarketplaces（允许名单），未设返回 null。
 */
function getStrictKnownMarketplaces() {
  let policySettings = getSettingsForSource("policySettings");
  if (!policySettings?.strictKnownMarketplaces) return null;
  return policySettings.strictKnownMarketplaces;
}
//@ chunk-f3qhjfah.js:45309-45441 placement
/**
 * ~/.claude/skills/ 自动加载为 @skills-dir 插件是否被允许：blockedMarketplaces 含 {source:"skills-dir"} 则否；有 strictKnownMarketplaces 时需显式列出 skills-dir。
 */
function areLocalPluginDirsAllowedByPolicy() {
  if (getBlockedMarketplaces()?.some((n) => n.source === "skills-dir")) return false;
  let strictKnownMarketplaces = getStrictKnownMarketplaces();
  return (
    strictKnownMarketplaces === null ||
    strictKnownMarketplaces.some((strictKnownMarketplace) => strictKnownMarketplace.source === "skills-dir")
  );
}
//@ chunk-f3qhjfah.js:45441-45707 placement
/**
 * skills-dir 插件被策略阻止时的提示（如何在 strictKnownMarketplaces 中放行）。
 */
function localPluginDirsBlockedMessage(e) {
  return `Plugins from ${e}/ are blocked by your organization's managed settings (strictKnownMarketplaces or blockedMarketplaces). Ask your administrator to add {"source":"skills-dir"} to strictKnownMarketplaces, or remove it from blockedMarketplaces.`;
}
//@ chunk-f3qhjfah.js:45707-45776 placement
/**
 * 托管策略 disableSideloadFlags 是否开启（禁用 --plugin-dir/--plugin-url 等会话侧载）。
 */
function areSideloadFlagsDisabledByPolicy() {
  return getSettingsForSource("policySettings")?.disableSideloadFlags === true;
}
//@ chunk-f3qhjfah.js:45776-45835 placement
/**
 * command 来源插件是否不可运行：组织设置尚未读到（unanswered）时一律视为禁用，否则看托管策略。
 */
function areCommandPluginSourcesDisabledByPolicy() {
  if (marketplaceNameAnswerState() === "unanswered") return true;
  return commandPluginSourcesDisabledBySettings();
}
//@ chunk-f3qhjfah.js:45835-46135 placement
/**
 * 托管策略是否禁用 command 来源插件：显式 disableCommandPluginSources 优先；否则 allowManagedHooksOnly 开启时（除少数例外）视为禁用。
 */
function commandPluginSourcesDisabledBySettings() {
  let settingsForSource = getSettingsForSource("policySettings");
  if (settingsForSource?.disableCommandPluginSources !== undefined)
    return settingsForSource.disableCommandPluginSources === true;
  if (settingsForSource?.allowManagedHooksOnly !== true) return false;
  let parsedParentManagedSettings = getParsedParentManagedSettings();
  return !(
    parsedParentManagedSettings?.disableAllHooks === true &&
    parsedParentManagedSettings.allowManagedHooksOnly !== true &&
    !parentTierWithOrganizationLocksHooks() &&
    !getAdminPolicyTierSettings().some((r) => r.allowManagedHooksOnly === true)
  );
}
//@ chunk-f3qhjfah.js:46135-46237 placement
/**
 * 托管策略 disablePluginDirectory 是否禁用内置插件目录市场（anthropic-plugin-directory）。
 */
function isPluginDirectoryDisabledByPolicy() {
  {
    let disablePluginDirectory = getSettingsForSource("policySettings")?.disablePluginDirectory;
    return disablePluginDirectory !== undefined && disablePluginDirectory !== false;
  }
  return false;
}
//@ chunk-f3qhjfah.js:46237-46456 placement
/**
 * 插件目录市场不可用的原因：managed_setting（disablePluginDirectory）、blocklist、allowlist（未列入 strictKnownMarketplaces）、policy_limit（组织策略 allow_plugin_directory_search）；可用返回 null。
 */
function pluginDirectoryPolicyBlock() {
  {
    if (isPluginDirectoryDisabledByPolicy()) return "managed_setting";
    if (isSourceInBlocklist(PLUGIN_DIRECTORY_SOURCE)) return "blocklist";
    if (!isSourceAllowedByPolicy(PLUGIN_DIRECTORY_SOURCE)) return "allowlist";
    let e = policyDenyKind("allow_plugin_directory_search");
    return e === "org_denied" || e === "latched" ? "policy_limit" : null;
  }
  return null;
}
//@ chunk-f3qhjfah.js:46456-46506 placement
/**
 * 插件目录不可用原因对应的一句提示文本（可用时为空串）。
 */
function pluginDirectoryPolicyBlockHint() {
  let e = pluginDirectoryPolicyBlock();
  return e === null ? "" : policyBlockReason(e);
}
//@ chunk-f3qhjfah.js:46506-46892 placement
/**
 * git URL 是否被 hostPattern 类托管策略限制（blockedMarketplaces/strictKnownMarketplaces 中有 hostPattern 时，按主机匹配判断）。
 */
function isListingRepositoryBlockedByHostPolicy(e) {
  let filtered = (getBlockedMarketplaces() ?? []).filter(isHostPatternEntry);
  let filtered_2 = (getStrictKnownMarketplaces() ?? []).filter(isHostPatternEntry);
  if (filtered.length === 0 && filtered_2.length === 0) return false;
  if (e === undefined) return true;
  let s = {
    source: "git",
    url: e,
  };
  let policyHostOfSource = getPolicyHostOfSource(s);
  if (
    isUnsafeGitUrl(e) ||
    isUnsafeRemoteUrl(e) ||
    isSuspiciousMarketplaceUrl(e) ||
    policyHostOfSource === null ||
    policyHostOfSource === ""
  )
    return true;
  if (
    filtered.some(
      (l) =>
        !isValidPolicyRegex(l.hostPattern) ||
        doesSourceMatchHostPattern(s, l, {
          blocklistDirection: true,
        }),
    )
  )
    return true;
  let matches = /^https:\/\//i.test(e);
  return (
    filtered_2.length > 0 &&
    !(
      matches &&
      policyHostOfSource !== "" &&
      filtered_2.some((l) => fullMatchesRegex(policyHostOfSource, l.hostPattern))
    )
  );
}
//@ chunk-f3qhjfah.js:46892-46937 placement
/**
 * 远程托管设置是否已获同意（非远程来源视为已同意）。
 */
function policyTierCommandsMayRun() {
  return getPolicySettingsOrigin() !== "remote" || isRemoteManagedSettingsVerifiedAndApprovedForSession();
}
//@ chunk-f3qhjfah.js:46937-46964 placement
function canPolicyDeclarationExemptHelper() {
  return !managedMarketplaceAnswerFlag();
}
//@ chunk-f3qhjfah.js:46964-47281 placement
var REMOTE_POLICY_NOT_APPROVED_MESSAGE =
  "it is declared by remotely managed settings that this session could not verify with the server, or that have not been approved on this machine yet \u2014 make sure Claude Code can reach your managed-settings server, and approve the managed-settings dialog once in an interactive session (or ask your admin)";
//@ chunk-f3qhjfah.js:47281-47698 placement
/**
 * 市场在托管锁定下不能更新的原因：组织设置未读到 → organization_unanswered；command 来源禁用时，不在 policySettings.extraKnownMarketplaces 中声明的市场 → lockdown；远程策略未同意 → remote_policy_unconsented。
 */
function headersHelperPolicyRefusal(e, n) {
  if (marketplaceNameAnswerState() === "unanswered") return "organization_unanswered";
  if (!areCommandPluginSourcesDisabledByPolicy()) return null;
  if (e === undefined || !canPolicyDeclarationExemptHelper()) return "lockdown";
  if (!policyTierCommandsMayRun()) return "remote_policy_unconsented";
  let extraKnownMarketplaces = getSettingsForSource("policySettings")?.extraKnownMarketplaces ?? {};
  if (e.source === "settings" && n !== undefined)
    return (Object.hasOwn(extraKnownMarketplaces, n) ? extraKnownMarketplaces[n] : undefined)?.source
      .source !== "settings"
      ? "lockdown"
      : null;
  return Object.values(extraKnownMarketplaces).some((s) => areSourcesEqual(e, s.source)) ? null : "lockdown";
}
//@ chunk-f3qhjfah.js:47698-47739 placement
/**
 * 市场是否处于托管锁定（getMarketplaceLockdownReason 非空）。
 */
function isHeadersHelperDisabledByPolicy(e, n) {
  return headersHelperPolicyRefusal(e, n) !== null;
}
//@ chunk-f3qhjfah.js:47739-47980 placement
/**
 * 生成“N 个市场未更新（托管策略/等待组织设置）”的提示文本。
 */
function marketplacesRefusedByPolicyClause(e, n = []) {
  let r = n.length > 0 ? `: ${n.map((a) => printablePluginName(a)).join(", ")}` : "";
  let s =
    marketplaceNameAnswerState() === "unanswered"
      ? "(waiting for your organization's settings)"
      : "(managed policy) \u2014 ask your admin";
  return `${e} ${plural(e, "marketplace")} not updated ${s}${r}`;
}
//@ chunk-f3qhjfah.js:47980-48190 placement
var COMMAND_SOURCES_DISABLED_MESSAGE =
  "Command-sourced plugins are disabled by your organization's managed settings (disableCommandPluginSources / allowManagedHooksOnly). The plugin was not installed or updated and its command was not run.";
//@ chunk-f3qhjfah.js:48190-48317 placement
/**
 * 组织设置未读到时，在全局 organizationAsk 中记下有 command 来源插件/市场被暂缓，供之后提示。
 */
function noteHeldForTheAnswer(e) {
  if (marketplaceNameAnswerState() === "unanswered") {
    let organizationAsk = getPluginRegistry().organizationAsk;
    organizationAsk.isCommandHeld = true;
    organizationAsk.isMarketplaceHeld ||= e === "marketplace";
  }
}
//@ chunk-f3qhjfah.js:48317-48658 placement
/**
 * command 来源插件被拒绝时给用户的说明（区分“组织设置还没读到”和“策略禁用”）。
 */
function commandPluginSourcesDisabledMessage() {
  return marketplaceNameAnswerState() === "unanswered"
    ? "Command-sourced plugins aren't running in this session yet. Your organization's settings haven't been read, so it isn't known whether it allows them. The plugin was not installed or updated and its command was not run. They'll run once your organization's settings are read, if it allows them."
    : COMMAND_SOURCES_DISABLED_MESSAGE;
}
//@ chunk-f3qhjfah.js:48658-48740 placement
var SIDELOAD_FLAGS_BLOCKED_PHRASE = "disabled by your organization's managed settings (disableSideloadFlags)";
//@ chunk-f3qhjfah.js:48740-49053 placement
/**
 * --plugin-dir 等会话侧载参数被 disableSideloadFlags 禁用时的错误文本。
 */
function sideloadFlagsBlockedMessage(e) {
  return `${e.join(", ")} ${e.length === 1 ? "is" : "are"} ${SIDELOAD_FLAGS_BLOCKED_PHRASE}. Plugins, custom agents, and MCP servers can only be loaded from sources your administrator has approved. Ask your administrator to remove disableSideloadFlags from managed settings, or use an approved marketplace / settings file instead.`;
}
//@ chunk-f3qhjfah.js:49161-49283 placement
/**
 * 托管策略是否对市场来源有限制（设置了 strictKnownMarketplaces，或 blockedMarketplaces 中有 skills-dir/pluginDirectory 之外的条目）。
 */
function isMarketplaceRestrictionPolicyActive() {
  let blockedMarketplaces = getBlockedMarketplaces();
  return (
    getStrictKnownMarketplaces() !== null ||
    (blockedMarketplaces !== null &&
      blockedMarketplaces.some(
        (blockedMarketplace) =>
          blockedMarketplace.source !== "skills-dir" && blockedMarketplace.source !== "pluginDirectory",
      ))
  );
}
//@ chunk-f3qhjfah.js:49283-49329 placement
/**
 * 无参数时同 hasMarketplaceSourcePolicy；给定来源时判断该来源是否不被策略允许。
 */
function isSourceDisallowedOrUnverifiable(source) {
  return source === undefined ? isMarketplaceRestrictionPolicyActive() : !isSourceAllowedByPolicy(source);
}
//@ chunk-f3qhjfah.js:49329-49392 placement = getPluginTrustMessage (1)
/**
 * 读托管策略 pluginTrustMessage（安装插件信任提示里附加的组织说明）。
 */
function getPluginTrustMessage() {
  return getSettingsForSource("policySettings")?.pluginTrustMessage;
}
//@ chunk-f3qhjfah.js:49392-49469 placement
function getPluginSuggestionMarketplaces() {
  return getSettingsForSource("policySettings")?.pluginSuggestionMarketplaces ?? [];
}
//@ chunk-f3qhjfah.js:49469-49625 placement
function isMarketplaceSourceDeclaredByPolicy(e, source) {
  let adminAuthoredPolicySettings = getAdminAuthoredPolicySettings();
  let source_2 = adminAuthoredPolicySettings?.extraKnownMarketplaces?.[e]?.source;
  if (source_2 && areSourcesEqual(source, source_2)) return true;
  return (
    allowListEntriesThatVouch(adminAuthoredPolicySettings?.strictKnownMarketplaces)?.some((a) =>
      matchesStrictMarketplaceEntry(source, a),
    ) ?? false
  );
}
//@ chunk-f3qhjfah.js:49625-49726 placement
function isMarketplaceNameDeclaredByPolicy(e, n) {
  let r = nfcLower(e);
  return Object.keys(n?.extraKnownMarketplaces ?? {}).some((key) => nfcLower(key) === r);
}
//@ chunk-f3qhjfah.js:49726-50820 placement
function isMarketplaceSourceVouchedByPolicy(marketplaceSource, n, r) {
  if (marketplaceSource.source === "claudeai") {
    let g = currentOrgUuid();
    return (
      g !== null &&
      marketplaceSource.organizationUuid.toLowerCase() === g.toLowerCase() &&
      (marketplaceSource.scope === "org" || marketplaceSource.scope === "default")
    );
  }
  let s = r ? r.policySettings : getAdminAuthoredPolicySettings();
  let declaredUnder = r?.declaredUnder;
  let extraKnownMarketplaces = s?.extraKnownMarketplaces;
  let l = redactMarketplaceSource(marketplaceSource);
  if (l === null) return false;
  if (l.source === "npm" && (l.registry === undefined || !isValidNpmPackageName(l.package))) return false;
  if (
    l.source === "settings" &&
    l.plugins.some((plugin) => {
      if (typeof plugin.source !== "object") return true;
      switch (plugin.source.source) {
        case "npm":
          return plugin.source.registry === undefined || !isValidNpmPackageName(plugin.source.package);
        case "url":
        case "github":
        case "git-subdir":
        case "archive":
          return false;
        default:
          return true;
      }
    })
  )
    return false;
  if (
    extraKnownMarketplaces !== undefined &&
    Object.entries(extraKnownMarketplaces).some(([key, value]) => {
      if (declaredUnder !== undefined && nfcLower(key) !== nfcLower(declaredUnder)) return false;
      let m = normalizeLocalMarketplaceSource(value.source, n);
      let h = redactMarketplaceSource(m);
      return h !== null && areSourcesEqual(l, h) && installVersion(l, h);
    })
  )
    return true;
  if (declaredUnder !== undefined) return false;
  return (
    allowListEntriesThatVouch(s?.strictKnownMarketplaces)?.some((g) => {
      if (g.source === "hostPattern" || g.source === "pathPattern" || g.source === "pluginDirectory")
        return false;
      if (l.source === "github" && g.source === "github" && (g.path || undefined) !== (l.path || undefined))
        return false;
      let f = normalizeLocalMarketplaceSource(g, n);
      let m = redactMarketplaceSource(f);
      return m !== null && matchesStrictMarketplaceEntry(l, m) && installVersion(l, m);
    }) ?? false
  );
}
//@ chunk-f3qhjfah.js:50820-50998 placement = installVersion (0.793)
function installVersion(e, n) {
  if (e.source !== "npm") return true;
  if (n.source !== "npm" || e.registry === undefined || n.registry === undefined) return false;
  let r = normalizeBaseUrl(e.registry);
  let s = normalizeBaseUrl(n.registry);
  return r !== null && r === s;
}
//@ chunk-f3qhjfah.js:50998-51158 placement = isPreapprovedUrl (1)
/**
 * 规范化基础 URL：主机名规范化、路径补尾部 /（安装器使用）。
 */
function normalizeBaseUrl(url) {
  let n;
  try {
    n = new URL(url);
  } catch {
    return null;
  }
  n.hostname = normalizeGitHost(n.hostname);
  if (!n.pathname.endsWith("/")) n.pathname = `${n.pathname}/`;
  return n.toString();
}
//@ chunk-f3qhjfah.js:51158-51404 placement
function isNpmResolutionVouchedByPolicy(npmResolution) {
  let n = allowListEntriesThatVouch(getAdminAuthoredPolicySettings()?.strictKnownMarketplaces);
  if (!n) return false;
  let r;
  try {
    r = new URL(npmResolution.tarballUrl);
  } catch {
    return false;
  }
  let s = decodeSafeUrlPath(r);
  if (s === null) return false;
  return n.some(
    (a) =>
      a.source === "npm" &&
      a.registry !== undefined &&
      matchesNpmPolicyEntry(a, npmResolution.packageName, r, s, "allow"),
  );
}
//@ chunk-f3qhjfah.js:51404-51701 placement
function isOfficialMarketplaceSourceVouched(e) {
  if (e.source !== "github" && e.source !== "git") return false;
  if (e.source === "git") {
    if (e.url.includes("://")) {
      let n;
      try {
        n = new URL(e.url).protocol;
      } catch {
        n = null;
      }
      if (n === null || !GIT_SOURCE_PROTOCOLS.has(n)) return false;
    } else if (parseScpLikeUrl(e.url) === null) return false;
  }
  return (
    isAnthropicsMarketplaceSource(e) &&
    (e.ref || undefined) === undefined &&
    (e.path || undefined) === undefined
  );
}
//@ chunk-f3qhjfah.js:51701-51759 placement
var GIT_SOURCE_PROTOCOLS = new Set(["https:", "ssh:", "git+https:", "git+ssh:"]);
//@ chunk-f3qhjfah.js:52373-52429 placement
/**
 * 从市场来源取规范化主机名（IP 字面量返回 null）。
 */
function extractHostFromSource(e) {
  let nonIpHostFromSource = getNonIpHostFromSource(e);
  return nonIpHostFromSource === null ? null : normalizeGitHost(nonIpHostFromSource);
}
//@ chunk-f3qhjfah.js:52429-52486 placement
function getNonIpHostFromSource(source) {
  let hostFromSource = extractHostFromSource_2(source);
  return hostFromSource !== null && isBracketedIpv6Host(hostFromSource) ? null : hostFromSource;
}
//@ chunk-f3qhjfah.js:52486-52563 placement
/**
 * 主机是否为 [IPv6] 字面量。
 */
function isBracketedIpv6Host(e) {
  return e.startsWith("[") && e.endsWith("]") && isIpv4MappedOrTranslatedIpv6(e.slice(1, -1));
}
//@ chunk-f3qhjfah.js:52563-52590 placement
/**
 * isSuspiciousMarketplaceUrl：可疑的市场 URL。
 */
function isSuspiciousMarketplaceUrl(url) {
  return isSuspiciousUrl(url);
}
//@ chunk-f3qhjfah.js:53710-53795 placement = doesSourceMatchHostPattern (1)
/**
 * strictKnownMarketplaces 中所有 hostPattern 字符串。
 */
function getHostPatternsFromAllowlist() {
  let allowlist = getStrictKnownMarketplaces();
  if (!allowlist) return [];
  return allowlist.filter(isHostPatternEntry).map((entry) => entry.hostPattern);
}
//@ chunk-f3qhjfah.js:54124-54224 placement
/**
 * URL 主机名规范化后返回（解析失败原样）。
 */
function canonicalFetchSourceUrl(url) {
  try {
    let n = new URL(url);
    n.hostname = normalizeGitHost(n.hostname);
    return n.toString();
  } catch {
    return url;
  }
}
//@ chunk-f3qhjfah.js:54224-54362 placement
/**
 * owner/repo 是否属于给定 owner。
 */
function isRepoUnderOwner(repo, githubOwnerWildcard) {
  let parts = repo.split("/");
  if (parts.length !== 2) return false;
  let [s, a] = parts;
  if (s === undefined || a === undefined || !isValidGithubOwner(s) || !isValidGithubOwner(a)) return false;
  return s === githubOwnerWildcard;
}
//@ chunk-f3qhjfah.js:54362-54786 placement
function doesRepoMatchBlocklistEntry(e, n) {
  let r = normalizeRepoPath(n);
  let githubOwnerWildcard = parseGithubOwnerWildcard(e);
  if (githubOwnerWildcard === null) {
    if (e.includes("*"))
      logForDebugging(
        `Invalid owner-wildcard repo in policy settings blockedMarketplaces: ${e} (only "<owner>/*" is supported); entry only matches a literally identical repo string`,
        {
          level: "error",
        },
      );
    return r === e || n === e;
  }
  let parts = r.split("/");
  if (parts.length !== 2) return false;
  let [c, l] = parts;
  if (c === undefined || l === undefined || !isValidGithubOwner(c) || !GITHUB_NAME_SEGMENT_RE.test(l))
    return false;
  return c.toLowerCase() === githubOwnerWildcard.toLowerCase();
}
//@ chunk-f3qhjfah.js:55910-56104 placement = isSourceAllowedByPolicy (0.876)
/**
 * 来源是否命中托管策略 blockedMarketplaces（hostPattern、pathPattern 或来源等价比较）。
 */
function isSourceInBlocklist(source) {
  let allowlist = getBlockedMarketplaces();
  if (allowlist === null) return false;
  return allowlist.some((allowed) => {
    if (allowed.source === "hostPattern")
      return doesSourceMatchHostPattern(source, allowed, {
        blocklistDirection: true,
      });
    if (allowed.source === "pathPattern") return doesSourceMatchPathPattern(source, allowed);
    return areSourcesEquivalentForBlocklist(source, allowed);
  });
}
//@ chunk-f3qhjfah.js:56104-56353 placement
function isSourceAllowedByPolicy(source) {
  if (
    source.source === "git" &&
    (isUnsafeGitUrl(source.url) || isSuspiciousMarketplaceUrl(source.url)) &&
    isMarketplaceRestrictionPolicyActive()
  )
    return false;
  let hostFromSource = extractHostFromSource_2(source);
  if (
    hostFromSource !== null &&
    isBracketedIpv6Host(hostFromSource) &&
    isMarketplaceRestrictionPolicyActive()
  )
    return false;
  if (source.source === "pluginDirectory" && isPluginDirectoryDisabledByPolicy()) return false;
  if (isSourceInBlocklist(source)) return false;
  let strictKnownMarketplaces = getStrictKnownMarketplaces();
  if (strictKnownMarketplaces === null) return true;
  return strictKnownMarketplaces.some((strictKnownMarketplace) =>
    matchesStrictMarketplaceEntry(source, strictKnownMarketplace),
  );
}
//@ chunk-f3qhjfah.js:56353-57846 placement
function npmResolutionPolicyRefusal(e) {
  let blockedMarketplaces = getBlockedMarketplaces();
  let strictKnownMarketplaces = getStrictKnownMarketplaces();
  if (blockedMarketplaces === null && strictKnownMarketplaces === null) return null;
  let s;
  try {
    s = new URL(e.tarballUrl);
  } catch {
    s = null;
  }
  let a = printablePluginName(e.packageName);
  if (s === null)
    return `${a} cannot be used: the registry answered with a download URL that could not be parsed, and your organization restricts plugin sources`;
  let c = normalizeGitHost(s.hostname);
  let l = s.port ? `${c}:${s.port}` : c;
  let g = decodeSafeUrlPath(s);
  if (g === null)
    return `${a} cannot be used: the registry answered with a download URL whose path climbs or cannot be decoded, and your organization restricts plugin sources`;
  if (isBracketedIpv6Host(s.hostname) && isMarketplaceRestrictionPolicyActive())
    return `${a} cannot be used: it downloads from ${l}, an IPv6 spelling of an IPv4 address, which your organization's plugin source rules cannot check. Ask whoever runs the registry to serve it from a hostname or an IPv4 address.`;
  let f = (m) => (h) => {
    switch (h.source) {
      case "npm":
        return matchesNpmPolicyEntry(h, e.packageName, s, g, m);
      case "hostPattern":
        try {
          return m === "block"
            ? new RegExp(h.hostPattern).test(c)
            : fullMatchesRegex(c, h.hostPattern) && s.protocol === "https:";
        } catch {
          logForDebugging(`Invalid hostPattern regex in policy settings: ${h.hostPattern}`, {
            level: "error",
          });
          return m === "block";
        }
      default:
        return false;
    }
  };
  if (blockedMarketplaces?.some(f("block")))
    return `${a} cannot be used: it resolves to ${l}, which your organization's managed settings block (blockedMarketplaces)`;
  if (strictKnownMarketplaces !== null && !strictKnownMarketplaces.some(f("allow")))
    return `${a} cannot be used: it resolves to ${l}, which is not among the plugin sources your organization allows (strictKnownMarketplaces). Ask your administrator to add an npm or hostPattern entry for it.`;
  return null;
}
//@ chunk-f3qhjfah.js:57846-57950 placement
function matchesNpmPolicyEntry(e, packageName, r, s, a) {
  return (
    matchesNpmPackagePattern(e.package, packageName) &&
    (e.registry === undefined || (isUnderRegistryUrl(r, s, e.registry) ?? a === "block"))
  );
}
//@ chunk-f3qhjfah.js:57950-58054 placement
function matchesNpmPackagePattern(e, n) {
  if (e.endsWith("/*") && e.startsWith("@")) return n.startsWith(e.slice(0, -1));
  return e === n;
}
//@ chunk-f3qhjfah.js:58054-58200 placement
function decodeSafeUrlPath(e) {
  let n;
  try {
    n = decodeURIComponent(e.pathname);
  } catch {
    return null;
  }
  if (n.includes("\\") || /(^|\/)\.\.?(\/|$)/.test(n)) return null;
  return n;
}
//@ chunk-f3qhjfah.js:58200-58498 placement
function isUnderRegistryUrl(e, n, registry) {
  let s;
  try {
    s = new URL(registry);
  } catch {
    return null;
  }
  if (
    e.protocol !== s.protocol ||
    normalizeGitHost(e.hostname) !== normalizeGitHost(s.hostname) ||
    (e.port || defaultPortForScheme(e.protocol)) !== (s.port || defaultPortForScheme(s.protocol))
  )
    return false;
  let a;
  try {
    a = decodeURIComponent(s.pathname);
  } catch {
    return null;
  }
  if (!a.endsWith("/")) a = `${a}/`;
  return n.startsWith(a);
}
//@ chunk-f3qhjfah.js:58498-58559 placement
function defaultPortForScheme(protocol) {
  return protocol === "https:" ? "443" : protocol === "http:" ? "80" : "";
}
//@ chunk-f3qhjfah.js:58559-59319 placement
/**
 * 判断市场来源是否匹配策略中的一条 strictKnownMarketplaces：git 源先排除不安全 URL；hostPattern/pathPattern 按模式匹配； github 支持 owner/* 通配（ref/path 也要一致）；其余比较来源是否相同。
 */
function matchesStrictMarketplaceEntry(source, pattern) {
  if (source.source === "git" && (isUnsafeRemoteUrl(source.url) || isSuspiciousMarketplaceUrl(source.url)))
    return false;
  if (pattern.source === "hostPattern") {
    if (
      (source.source === "github" || source.source === "git") &&
      source.path &&
      !isSafeRelativePath(source.path)
    )
      return false;
    if (source.source === "claudeai" && source.scope !== "org" && source.scope !== "default") return false;
    return doesSourceMatchHostPattern(source, pattern);
  }
  if (pattern.source === "pathPattern") return doesSourceMatchPathPattern(source, pattern);
  if (source.source === "github" && pattern.source === "github") {
    let githubOwnerWildcard = parseGithubOwnerWildcard(pattern.repo);
    if (githubOwnerWildcard === null && pattern.repo.includes("*"))
      logForDebugging(
        `Invalid owner-wildcard repo in policy settings strictKnownMarketplaces: ${pattern.repo} (only "<owner>/*" is supported); entry only matches a literally identical repo string`,
        {
          level: "error",
        },
      );
    if (githubOwnerWildcard !== null)
      return (
        isRepoUnderOwner(source.repo, githubOwnerWildcard) &&
        (pattern.ref || undefined) === (source.ref || undefined) &&
        (pattern.path
          ? pattern.path === (source.path || undefined)
          : !source.path || isSafeRelativePath(source.path))
      );
  }
  if (pattern.source === "skills-dir") return false;
  return areSourcesEqual(source, pattern);
}
export {
  isSourceAllowedByPolicy,
  areCommandPluginSourcesDisabledByPolicy,
  policyTierCommandsMayRun,
  isSourceDisallowedOrUnverifiable,
  isPluginBlockedByPolicy,
  commandPluginSourcesDisabledMessage,
  areSideloadFlagsDisabledByPolicy,
  sideloadFlagsBlockedMessage,
  pluginDirectoryPolicyBlockHint,
  areLocalPluginDirsAllowedByPolicy,
  localPluginDirsBlockedMessage,
  pluginDirectoryPolicyBlock,
  headersHelperPolicyRefusal,
  isHeadersHelperDisabledByPolicy,
  noteHeldForTheAnswer,
  canonicalFetchSourceUrl,
  REMOTE_POLICY_NOT_APPROVED_MESSAGE,
  canPolicyDeclarationExemptHelper,
  getStrictKnownMarketplaces,
  npmResolutionPolicyRefusal,
  isMarketplaceRestrictionPolicyActive,
  isSourceInBlocklist,
  isPluginDirectoryDisabledByPolicy,
  isOfficialMarketplaceSourceVouched,
  getPluginSuggestionMarketplaces,
  isMarketplaceSourceDeclaredByPolicy,
  isNpmResolutionVouchedByPolicy,
  isMarketplaceSourceVouchedByPolicy,
  isMarketplaceNameDeclaredByPolicy,
  marketplacesRefusedByPolicyClause,
  isListingRepositoryBlockedByHostPolicy,
  extractHostFromSource,
  getHostPatternsFromAllowlist,
  isSuspiciousMarketplaceUrl,
  doesRepoMatchBlocklistEntry,
  commandPluginSourcesDisabledBySettings,
  SIDELOAD_FLAGS_BLOCKED_PHRASE,
  getPluginTrustMessage,
};
