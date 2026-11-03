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
import { J_, policyBlockReason, IJ } from "./marketplaceNames.js";
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
var qe = { source: "pluginDirectory" };
/**
 * 插件是否被托管策略显式禁用（policySettings.enabledPlugins 中为 false，含别名）。
 */
//@ chunk-f3qhjfah.js:45090-45192 placement = getManagedPluginNames (1)
function isPluginBlockedByPolicy(e) {
  let enabledPlugins = getSettingsForSource("policySettings")?.enabledPlugins;
  return [e, officialPluginId(e) ?? e].some((r) => lookupByPluginAliases(enabledPlugins, r) === !1);
}
/**
 * 读托管策略 policySettings.strictKnownMarketplaces（允许名单），未设返回 null。
 */
//@ chunk-f3qhjfah.js:45192-45309 placement = getStrictKnownMarketplaces (1)
function getStrictKnownMarketplaces() {
  let policySettings = getSettingsForSource("policySettings");
  if (!policySettings?.strictKnownMarketplaces) return null;
  return policySettings.strictKnownMarketplaces;
}
/**
 * ~/.claude/skills/ 自动加载为 @skills-dir 插件是否被允许：blockedMarketplaces 含 {source:"skills-dir"} 则否；有 strictKnownMarketplaces 时需显式列出 skills-dir。
 */
//@ chunk-f3qhjfah.js:45309-45441 placement
function areLocalPluginDirsAllowedByPolicy() {
  if (getBlockedMarketplaces()?.some((n) => n.source === "skills-dir")) return !1;
  let e = getStrictKnownMarketplaces();
  return e === null || e.some((n) => n.source === "skills-dir");
}
/**
 * skills-dir 插件被策略阻止时的提示（如何在 strictKnownMarketplaces 中放行）。
 */
//@ chunk-f3qhjfah.js:45441-45707 placement
function localPluginDirsBlockedMessage(e) {
  return `Plugins from ${e}/ are blocked by your organization's managed settings (strictKnownMarketplaces or blockedMarketplaces). Ask your administrator to add {"source":"skills-dir"} to strictKnownMarketplaces, or remove it from blockedMarketplaces.`;
}
/**
 * 托管策略 disableSideloadFlags 是否开启（禁用 --plugin-dir/--plugin-url 等会话侧载）。
 */
//@ chunk-f3qhjfah.js:45707-45776 placement
function areSideloadFlagsDisabledByPolicy() {
  return getSettingsForSource("policySettings")?.disableSideloadFlags === !0;
}
/**
 * command 来源插件是否不可运行：组织设置尚未读到（unanswered）时一律视为禁用，否则看托管策略。
 */
//@ chunk-f3qhjfah.js:45776-45835 placement
function areCommandPluginSourcesDisabledByPolicy() {
  if (J_() === "unanswered") return !0;
  return commandPluginSourcesDisabledBySettings();
}
/**
 * 托管策略是否禁用 command 来源插件：显式 disableCommandPluginSources 优先；否则 allowManagedHooksOnly 开启时（除少数例外）视为禁用。
 */
//@ chunk-f3qhjfah.js:45835-46135 placement
function commandPluginSourcesDisabledBySettings() {
  let e = getSettingsForSource("policySettings");
  if (e?.disableCommandPluginSources !== void 0) return e.disableCommandPluginSources === !0;
  if (e?.allowManagedHooksOnly !== !0) return !1;
  let n = getParsedParentManagedSettings();
  return !(
    n?.disableAllHooks === !0 &&
    n.allowManagedHooksOnly !== !0 &&
    !parentTierWithOrganizationLocksHooks() &&
    !getAdminPolicyTierSettings().some((r) => r.allowManagedHooksOnly === !0)
  );
}
/**
 * 托管策略 disablePluginDirectory 是否禁用内置插件目录市场（anthropic-plugin-directory）。
 */
//@ chunk-f3qhjfah.js:46135-46237 placement
function isPluginDirectoryDisabledByPolicy() {
  {
    let e = getSettingsForSource("policySettings")?.disablePluginDirectory;
    return e !== void 0 && e !== !1;
  }
  return !1;
}
/**
 * 插件目录市场不可用的原因：managed_setting（disablePluginDirectory）、blocklist、allowlist（未列入 strictKnownMarketplaces）、policy_limit（组织策略 allow_plugin_directory_search）；可用返回 null。
 */
//@ chunk-f3qhjfah.js:46237-46456 placement
function pluginDirectoryPolicyBlock() {
  {
    if (isPluginDirectoryDisabledByPolicy()) return "managed_setting";
    if (isSourceInBlocklist(qe)) return "blocklist";
    if (!isSourceAllowedByPolicy(qe)) return "allowlist";
    let e = policyDenyKind("allow_plugin_directory_search");
    return e === "org_denied" || e === "latched" ? "policy_limit" : null;
  }
  return null;
}
/**
 * 插件目录不可用原因对应的一句提示文本（可用时为空串）。
 */
//@ chunk-f3qhjfah.js:46456-46506 placement
function pluginDirectoryPolicyBlockHint() {
  let e = pluginDirectoryPolicyBlock();
  return e === null ? "" : policyBlockReason(e);
}
/**
 * git URL 是否被 hostPattern 类托管策略限制（blockedMarketplaces/strictKnownMarketplaces 中有 hostPattern 时，按主机匹配判断）。
 */
//@ chunk-f3qhjfah.js:46506-46892 placement
function isListingRepositoryBlockedByHostPolicy(e) {
  let filtered = (getBlockedMarketplaces() ?? []).filter(isHostPatternEntry),
    filtered_2 = (getStrictKnownMarketplaces() ?? []).filter(isHostPatternEntry);
  if (filtered.length === 0 && filtered_2.length === 0) return !1;
  if (e === void 0) return !0;
  let s = { source: "git", url: e },
    a = getPolicyHostOfSource(s);
  if (isUnsafeGitUrl(e) || isUnsafeRemoteUrl(e) || v(e) || a === null || a === "") return !0;
  if (
    filtered.some(
      (l) =>
        !isValidPolicyRegex(l.hostPattern) || doesSourceMatchHostPattern(s, l, { blocklistDirection: !0 }),
    )
  )
    return !0;
  let matches = /^https:\/\//i.test(e);
  return (
    filtered_2.length > 0 &&
    !(matches && a !== "" && filtered_2.some((l) => fullMatchesRegex(a, l.hostPattern)))
  );
}
/**
 * 远程托管设置是否已获同意（非远程来源视为已同意）。
 */
//@ chunk-f3qhjfah.js:46892-46937 placement
function policyTierCommandsMayRun() {
  return getPolicySettingsOrigin() !== "remote" || isRemoteManagedSettingsVerifiedAndApprovedForSession();
}
//@ chunk-f3qhjfah.js:46937-46964 placement
function canPolicyDeclarationExemptHelper() {
  return !IJ();
}
//@ chunk-f3qhjfah.js:46964-47281 placement
var REMOTE_POLICY_NOT_APPROVED_MESSAGE =
  "it is declared by remotely managed settings that this session could not verify with the server, or that have not been approved on this machine yet \u2014 make sure Claude Code can reach your managed-settings server, and approve the managed-settings dialog once in an interactive session (or ask your admin)";
/**
 * 市场在托管锁定下不能更新的原因：组织设置未读到 → organization_unanswered；command 来源禁用时，不在 policySettings.extraKnownMarketplaces 中声明的市场 → lockdown；远程策略未同意 → remote_policy_unconsented。
 */
//@ chunk-f3qhjfah.js:47281-47698 placement
function headersHelperPolicyRefusal(e, n) {
  if (J_() === "unanswered") return "organization_unanswered";
  if (!areCommandPluginSourcesDisabledByPolicy()) return null;
  if (e === void 0 || !canPolicyDeclarationExemptHelper()) return "lockdown";
  if (!policyTierCommandsMayRun()) return "remote_policy_unconsented";
  let r = getSettingsForSource("policySettings")?.extraKnownMarketplaces ?? {};
  if (e.source === "settings" && n !== void 0)
    return (Object.hasOwn(r, n) ? r[n] : void 0)?.source.source !== "settings" ? "lockdown" : null;
  return Object.values(r).some((s) => areSourcesEqual(e, s.source)) ? null : "lockdown";
}
/**
 * 市场是否处于托管锁定（getMarketplaceLockdownReason 非空）。
 */
//@ chunk-f3qhjfah.js:47698-47739 placement
function isHeadersHelperDisabledByPolicy(e, n) {
  return headersHelperPolicyRefusal(e, n) !== null;
}
/**
 * 生成“N 个市场未更新（托管策略/等待组织设置）”的提示文本。
 */
//@ chunk-f3qhjfah.js:47739-47980 placement
function marketplacesRefusedByPolicyClause(e, n = []) {
  let r = n.length > 0 ? `: ${n.map((a) => printablePluginName(a)).join(", ")}` : "",
    s =
      J_() === "unanswered"
        ? "(waiting for your organization's settings)"
        : "(managed policy) \u2014 ask your admin";
  return `${e} ${plural(e, "marketplace")} not updated ${s}${r}`;
}
//@ chunk-f3qhjfah.js:47980-48190 placement
var COMMAND_SOURCES_DISABLED_MESSAGE =
  "Command-sourced plugins are disabled by your organization's managed settings (disableCommandPluginSources / allowManagedHooksOnly). The plugin was not installed or updated and its command was not run.";
/**
 * 组织设置未读到时，在全局 organizationAsk 中记下有 command 来源插件/市场被暂缓，供之后提示。
 */
//@ chunk-f3qhjfah.js:48190-48317 placement
function noteHeldForTheAnswer(e) {
  if (J_() === "unanswered") {
    let organizationAsk = getPluginRegistry().organizationAsk;
    ((organizationAsk.isCommandHeld = !0), (organizationAsk.isMarketplaceHeld ||= e === "marketplace"));
  }
}
/**
 * command 来源插件被拒绝时给用户的说明（区分“组织设置还没读到”和“策略禁用”）。
 */
//@ chunk-f3qhjfah.js:48317-48658 placement
function commandPluginSourcesDisabledMessage() {
  return J_() === "unanswered"
    ? "Command-sourced plugins aren't running in this session yet. Your organization's settings haven't been read, so it isn't known whether it allows them. The plugin was not installed or updated and its command was not run. They'll run once your organization's settings are read, if it allows them."
    : COMMAND_SOURCES_DISABLED_MESSAGE;
}
//@ chunk-f3qhjfah.js:48658-48740 placement
var SIDELOAD_FLAGS_BLOCKED_PHRASE = "disabled by your organization's managed settings (disableSideloadFlags)";
/**
 * --plugin-dir 等会话侧载参数被 disableSideloadFlags 禁用时的错误文本。
 */
//@ chunk-f3qhjfah.js:48740-49053 placement
function sideloadFlagsBlockedMessage(e) {
  return `${e.join(", ")} ${e.length === 1 ? "is" : "are"} ${SIDELOAD_FLAGS_BLOCKED_PHRASE}. Plugins, custom agents, and MCP servers can only be loaded from sources your administrator has approved. Ask your administrator to remove disableSideloadFlags from managed settings, or use an approved marketplace / settings file instead.`;
}
/**
 * 托管策略是否对市场来源有限制（设置了 strictKnownMarketplaces，或 blockedMarketplaces 中有 skills-dir/pluginDirectory 之外的条目）。
 */
//@ chunk-f3qhjfah.js:49161-49283 placement
function isMarketplaceRestrictionPolicyActive() {
  let e = getBlockedMarketplaces();
  return (
    getStrictKnownMarketplaces() !== null ||
    (e !== null && e.some((n) => n.source !== "skills-dir" && n.source !== "pluginDirectory"))
  );
}
/**
 * 无参数时同 hasMarketplaceSourcePolicy；给定来源时判断该来源是否不被策略允许。
 */
//@ chunk-f3qhjfah.js:49283-49329 placement
function isSourceDisallowedOrUnverifiable(e) {
  return e === void 0 ? isMarketplaceRestrictionPolicyActive() : !isSourceAllowedByPolicy(e);
}
/**
 * 读托管策略 pluginTrustMessage（安装插件信任提示里附加的组织说明）。
 */
//@ chunk-f3qhjfah.js:49329-49392 placement = getPluginTrustMessage (1)
function getPluginTrustMessage() {
  return getSettingsForSource("policySettings")?.pluginTrustMessage;
}
//@ chunk-f3qhjfah.js:49392-49469 placement
function getPluginSuggestionMarketplaces() {
  return getSettingsForSource("policySettings")?.pluginSuggestionMarketplaces ?? [];
}
//@ chunk-f3qhjfah.js:49469-49625 placement
function isMarketplaceSourceDeclaredByPolicy(e, n) {
  let r = getAdminAuthoredPolicySettings(),
    s = r?.extraKnownMarketplaces?.[e]?.source;
  if (s && areSourcesEqual(n, s)) return !0;
  return (
    allowListEntriesThatVouch(r?.strictKnownMarketplaces)?.some((a) => matchesStrictMarketplaceEntry(n, a)) ??
    !1
  );
}
//@ chunk-f3qhjfah.js:49625-49726 placement
function isMarketplaceNameDeclaredByPolicy(e, n) {
  let r = nfcLower(e);
  return Object.keys(n?.extraKnownMarketplaces ?? {}).some((s) => nfcLower(s) === r);
}
//@ chunk-f3qhjfah.js:49726-50820 placement
function isMarketplaceSourceVouchedByPolicy(e, n, r) {
  if (e.source === "claudeai") {
    let g = currentOrgUuid();
    return (
      g !== null &&
      e.organizationUuid.toLowerCase() === g.toLowerCase() &&
      (e.scope === "org" || e.scope === "default")
    );
  }
  let s = r ? r.policySettings : getAdminAuthoredPolicySettings(),
    a = r?.declaredUnder,
    c = s?.extraKnownMarketplaces,
    l = redactMarketplaceSource(e);
  if (l === null) return !1;
  if (l.source === "npm" && (l.registry === void 0 || !isValidNpmPackageName(l.package))) return !1;
  if (
    l.source === "settings" &&
    l.plugins.some((plugin) => {
      if (typeof plugin.source !== "object") return !0;
      switch (plugin.source.source) {
        case "npm":
          return plugin.source.registry === void 0 || !isValidNpmPackageName(plugin.source.package);
        case "url":
        case "github":
        case "git-subdir":
        case "archive":
          return !1;
        default:
          return !0;
      }
    })
  )
    return !1;
  if (
    c !== void 0 &&
    Object.entries(c).some(([g, f]) => {
      if (a !== void 0 && nfcLower(g) !== nfcLower(a)) return !1;
      let m = normalizeLocalMarketplaceSource(f.source, n),
        h = redactMarketplaceSource(m);
      return h !== null && areSourcesEqual(l, h) && installVersion(l, h);
    })
  )
    return !0;
  if (a !== void 0) return !1;
  return (
    allowListEntriesThatVouch(s?.strictKnownMarketplaces)?.some((g) => {
      if (g.source === "hostPattern" || g.source === "pathPattern" || g.source === "pluginDirectory")
        return !1;
      if (l.source === "github" && g.source === "github" && (g.path || void 0) !== (l.path || void 0))
        return !1;
      let f = normalizeLocalMarketplaceSource(g, n),
        m = redactMarketplaceSource(f);
      return m !== null && matchesStrictMarketplaceEntry(l, m) && installVersion(l, m);
    }) ?? !1
  );
}
//@ chunk-f3qhjfah.js:50820-50998 placement = installVersion (0.793)
function installVersion(e, n) {
  if (e.source !== "npm") return !0;
  if (n.source !== "npm" || e.registry === void 0 || n.registry === void 0) return !1;
  let r = normalizeBaseUrl(e.registry),
    s = normalizeBaseUrl(n.registry);
  return r !== null && r === s;
}
/**
 * 规范化基础 URL：主机名规范化、路径补尾部 /（安装器使用）。
 */
//@ chunk-f3qhjfah.js:50998-51158 placement = isPreapprovedUrl (1)
function normalizeBaseUrl(url) {
  let n;
  try {
    n = new URL(url);
  } catch {
    return null;
  }
  if (((n.hostname = normalizeGitHost(n.hostname)), !n.pathname.endsWith("/"))) n.pathname = `${n.pathname}/`;
  return n.toString();
}
//@ chunk-f3qhjfah.js:51158-51404 placement
function isNpmResolutionVouchedByPolicy(e) {
  let n = allowListEntriesThatVouch(getAdminAuthoredPolicySettings()?.strictKnownMarketplaces);
  if (!n) return !1;
  let r;
  try {
    r = new URL(e.tarballUrl);
  } catch {
    return !1;
  }
  let s = decodeSafeUrlPath(r);
  if (s === null) return !1;
  return n.some(
    (a) =>
      a.source === "npm" && a.registry !== void 0 && matchesNpmPolicyEntry(a, e.packageName, r, s, "allow"),
  );
}
//@ chunk-f3qhjfah.js:51404-51701 placement
function isOfficialMarketplaceSourceVouched(e) {
  if (e.source !== "github" && e.source !== "git") return !1;
  if (e.source === "git") {
    if (e.url.includes("://")) {
      let n;
      try {
        n = new URL(e.url).protocol;
      } catch {
        n = null;
      }
      if (n === null || !xn.has(n)) return !1;
    } else if (parseScpLikeUrl(e.url) === null) return !1;
  }
  return isAnthropicsMarketplaceSource(e) && (e.ref || void 0) === void 0 && (e.path || void 0) === void 0;
}
//@ chunk-f3qhjfah.js:51701-51759 placement
var xn = new Set(["https:", "ssh:", "git+https:", "git+ssh:"]);
/**
 * 从市场来源取规范化主机名（IP 字面量返回 null）。
 */
//@ chunk-f3qhjfah.js:52373-52429 placement
function extractHostFromSource(e) {
  let n = getNonIpHostFromSource(e);
  return n === null ? null : normalizeGitHost(n);
}
//@ chunk-f3qhjfah.js:52429-52486 placement
function getNonIpHostFromSource(e) {
  let n = extractHostFromSource_2(e);
  return n !== null && isBracketedIpv6Host(n) ? null : n;
}
/**
 * 主机是否为 [IPv6] 字面量。
 */
//@ chunk-f3qhjfah.js:52486-52563 placement
function isBracketedIpv6Host(e) {
  return e.startsWith("[") && e.endsWith("]") && isIpv4MappedOrTranslatedIpv6(e.slice(1, -1));
}
//@ chunk-f3qhjfah.js:52563-52590 placement
function v(e) {
  return isSuspiciousUrl(e);
}
/**
 * strictKnownMarketplaces 中所有 hostPattern 字符串。
 */
//@ chunk-f3qhjfah.js:53710-53795 placement = doesSourceMatchHostPattern (1)
function getHostPatternsFromAllowlist() {
  let e = getStrictKnownMarketplaces();
  if (!e) return [];
  return e.filter(isHostPatternEntry).map((n) => n.hostPattern);
}
/**
 * URL 主机名规范化后返回（解析失败原样）。
 */
//@ chunk-f3qhjfah.js:54124-54224 placement
function canonicalFetchSourceUrl(e) {
  try {
    let n = new URL(e);
    return ((n.hostname = normalizeGitHost(n.hostname)), n.toString());
  } catch {
    return e;
  }
}
/**
 * owner/repo 是否属于给定 owner。
 */
//@ chunk-f3qhjfah.js:54224-54362 placement
function isRepoUnderOwner(e, n) {
  let parts = e.split("/");
  if (parts.length !== 2) return !1;
  let [s, a] = parts;
  if (s === void 0 || a === void 0 || !isValidGithubOwner(s) || !isValidGithubOwner(a)) return !1;
  return s === n;
}
//@ chunk-f3qhjfah.js:54362-54786 placement
function doesRepoMatchBlocklistEntry(e, n) {
  let r = normalizeRepoPath(n),
    s = parseGithubOwnerWildcard(e);
  if (s === null) {
    if (e.includes("*"))
      logForDebugging(
        `Invalid owner-wildcard repo in policy settings blockedMarketplaces: ${e} (only "<owner>/*" is supported); entry only matches a literally identical repo string`,
        { level: "error" },
      );
    return r === e || n === e;
  }
  let parts = r.split("/");
  if (parts.length !== 2) return !1;
  let [c, l] = parts;
  if (c === void 0 || l === void 0 || !isValidGithubOwner(c) || !GITHUB_NAME_SEGMENT_RE.test(l)) return !1;
  return c.toLowerCase() === s.toLowerCase();
}
/**
 * 来源是否命中托管策略 blockedMarketplaces（hostPattern、pathPattern 或来源等价比较）。
 */
//@ chunk-f3qhjfah.js:55910-56104 placement = isSourceAllowedByPolicy (0.876)
function isSourceInBlocklist(source) {
  let allowlist = getBlockedMarketplaces();
  if (allowlist === null) return !1;
  return allowlist.some((allowed) => {
    if (allowed.source === "hostPattern")
      return doesSourceMatchHostPattern(source, allowed, { blocklistDirection: !0 });
    if (allowed.source === "pathPattern") return doesSourceMatchPathPattern(source, allowed);
    return areSourcesEquivalentForBlocklist(source, allowed);
  });
}
//@ chunk-f3qhjfah.js:56104-56353 placement
function isSourceAllowedByPolicy(e) {
  if (e.source === "git" && (isUnsafeGitUrl(e.url) || v(e.url)) && isMarketplaceRestrictionPolicyActive())
    return !1;
  let n = extractHostFromSource_2(e);
  if (n !== null && isBracketedIpv6Host(n) && isMarketplaceRestrictionPolicyActive()) return !1;
  if (e.source === "pluginDirectory" && isPluginDirectoryDisabledByPolicy()) return !1;
  if (isSourceInBlocklist(e)) return !1;
  let r = getStrictKnownMarketplaces();
  if (r === null) return !0;
  return r.some((s) => matchesStrictMarketplaceEntry(e, s));
}
//@ chunk-f3qhjfah.js:56353-57846 placement
function npmResolutionPolicyRefusal(e) {
  let n = getBlockedMarketplaces(),
    r = getStrictKnownMarketplaces();
  if (n === null && r === null) return null;
  let s;
  try {
    s = new URL(e.tarballUrl);
  } catch {
    s = null;
  }
  let a = printablePluginName(e.packageName);
  if (s === null)
    return `${a} cannot be used: the registry answered with a download URL that could not be parsed, and your organization restricts plugin sources`;
  let c = normalizeGitHost(s.hostname),
    l = s.port ? `${c}:${s.port}` : c,
    g = decodeSafeUrlPath(s);
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
          return (
            logForDebugging(`Invalid hostPattern regex in policy settings: ${h.hostPattern}`, {
              level: "error",
            }),
            m === "block"
          );
        }
      default:
        return !1;
    }
  };
  if (n?.some(f("block")))
    return `${a} cannot be used: it resolves to ${l}, which your organization's managed settings block (blockedMarketplaces)`;
  if (r !== null && !r.some(f("allow")))
    return `${a} cannot be used: it resolves to ${l}, which is not among the plugin sources your organization allows (strictKnownMarketplaces). Ask your administrator to add an npm or hostPattern entry for it.`;
  return null;
}
//@ chunk-f3qhjfah.js:57846-57950 placement
function matchesNpmPolicyEntry(e, n, r, s, a) {
  return (
    matchesNpmPackagePattern(e.package, n) &&
    (e.registry === void 0 || (isUnderRegistryUrl(r, s, e.registry) ?? a === "block"))
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
function isUnderRegistryUrl(e, n, r) {
  let s;
  try {
    s = new URL(r);
  } catch {
    return null;
  }
  if (
    e.protocol !== s.protocol ||
    normalizeGitHost(e.hostname) !== normalizeGitHost(s.hostname) ||
    (e.port || nt(e.protocol)) !== (s.port || nt(s.protocol))
  )
    return !1;
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
function nt(e) {
  return e === "https:" ? "443" : e === "http:" ? "80" : "";
}
/**
 * 判断市场来源是否匹配策略中的一条 strictKnownMarketplaces：git 源先排除不安全 URL；hostPattern/pathPattern 按模式匹配； github 支持 owner/* 通配（ref/path 也要一致）；其余比较来源是否相同。
 */
//@ chunk-f3qhjfah.js:58559-59319 placement
function matchesStrictMarketplaceEntry(e, n) {
  if (e.source === "git" && (isUnsafeRemoteUrl(e.url) || v(e.url))) return !1;
  if (n.source === "hostPattern") {
    if ((e.source === "github" || e.source === "git") && e.path && !isSafeRelativePath(e.path)) return !1;
    if (e.source === "claudeai" && e.scope !== "org" && e.scope !== "default") return !1;
    return doesSourceMatchHostPattern(e, n);
  }
  if (n.source === "pathPattern") return doesSourceMatchPathPattern(e, n);
  if (e.source === "github" && n.source === "github") {
    let r = parseGithubOwnerWildcard(n.repo);
    if (r === null && n.repo.includes("*"))
      logForDebugging(
        `Invalid owner-wildcard repo in policy settings strictKnownMarketplaces: ${n.repo} (only "<owner>/*" is supported); entry only matches a literally identical repo string`,
        { level: "error" },
      );
    if (r !== null)
      return (
        isRepoUnderOwner(e.repo, r) &&
        (n.ref || void 0) === (e.ref || void 0) &&
        (n.path ? n.path === (e.path || void 0) : !e.path || isSafeRelativePath(e.path))
      );
  }
  if (n.source === "skills-dir") return !1;
  return areSourcesEqual(e, n);
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
  v,
  doesRepoMatchBlocklistEntry,
  commandPluginSourcesDisabledBySettings,
  SIDELOAD_FLAGS_BLOCKED_PHRASE,
  getPluginTrustMessage,
};
