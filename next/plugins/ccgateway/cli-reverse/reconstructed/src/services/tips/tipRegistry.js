/**
 * services/tips/tipRegistry.ts
 *
 * spinner/启动提示注册表：约 70 条内置提示（内容、相关性判断、冷却会话数）、市场插件推荐提示与会话级缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tips/tipRegistry.ts
 * pieces: chunk-4t8fx0s8.js (36), chunk-5nte8cwj.js (1)
 * attribution: sole-consumer 23, fingerprint 3, layout 8, affinity 1, file-local 1, placement 1
 */
import { buildDesktopDeepLink } from "../../utils/desktopDeepLink.js";
import { getSessionsSinceTipShown } from "./tipHistory.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  record,
  stringSchema,
  unknown,
  objectSchema,
  _enum,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { getClaudeCodeMcpConfigs, doesEnterpriseMcpConfigExist, hasManagedMcpPolicy } from "../mcp/config.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { identity } from "../../utils/identity.js";
import { getGlobalConfig, customApiKeyResponsesOf } from "../../utils/config.js";
import { isRemoteSessionAvailable, alwaysFalseRemoteMode } from "../../remote/remoteMode.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import {
  shouldAllowManagedHooksOnly,
  shouldDisableAllHooksIncludingManaged,
} from "../../utils/hooks/hooksConfigSnapshot.js";
import { isRestrictedToPluginOnly } from "../../utils/settings/pluginOnlyPolicy.js";
import { getEverConnectedClaudeAiMcpSet } from "../mcp/claudeai.js";
import { mcpInfoFromString } from "../mcp/mcpStringUtils.js";
import {
  getSettings_DEPRECATED,
  getSettingsForSource,
  getInitialSettings_2,
} from "../../utils/settings/settings.js";
import { isBuiltinPluginId } from "../../plugins/builtinPlugins.js";
import { DEFAULT_SECURITY_SEAT_PLUGIN } from "../remoteManagedSettings/seating.js";
import { areHooksModulesActive } from "../analytics/growthbookCredentials.js";
import {
  getTotalInputTokens,
  getTotalCacheCreationInputTokens,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import { isAutoModeActive } from "../../utils/permissions/autoModeState.js";
import { isAutoModeGateEnabled } from "../../utils/permissions/permissionSetup.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad } from "../analytics/featureTelemetry.js";
import {
  loadKnownMarketplacesSafe,
  getMarketplaceCacheOnly,
} from "../../utils/plugins/marketplaceManager.js";
import {
  getPluginSuggestionMarketplaces,
  isMarketplaceSourceDeclaredByPolicy,
  isPluginBlockedByPolicy,
} from "../../utils/plugins/marketplacePolicy.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import {
  hasRelevanceSignals,
  matchRelevanceSignal,
  pluginRelevanceRoots,
} from "../../utils/plugins/pluginRelevance.js";
import { color } from "../../components/design-system/color.js";
import { getGhAuthStatus } from "../../utils/github/ghAuthStatus.js";
import { countConcurrentSessions, isBgSession } from "../../utils/concurrentSessions.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isPluginInstalled } from "../../utils/plugins/installedPluginsManager.js";
import { loadMarkdownFilesCached } from "../../utils/markdownConfigLoader.js";
import { getCwd } from "../../utils/cwd.js";
import { remoteFileStateKeys } from "../../utils/remoteFileState.js";
import { isDesktopCommandEnabled } from "../../commands/desktop/index.js";
import { getPlatform } from "../../utils/platform.js";
import { isClaudeAISubscriber, isMaxSubscriber, is1PApiCustomer } from "../../utils/auth.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import {
  hasWorkflowSizeSetting as hasWorkflowSizeSetting_2,
  workflowSizeSetting,
} from "../../utils/workflowSizeGuideline.js";
import { meetsAvailabilityRequirement, isCommandEnabled } from "../../commands.js";
import {
  listUnseenTeamArtifacts,
  logTeamArtifactTipShown,
  markTeamArtifactsSeen,
  formatTeamArtifactTip,
  hasUnseenTeamArtifacts,
} from "./teamArtifactTips.js";
import {
  parsePromoCampaign,
  promoCreditAmount,
  canClaimPromoCredit,
  shouldShowPromoUpsell,
} from "../api/featureOfTheWeek.js";
import {
  formatCurrency,
  getCachedReferrerReward,
  formatMinorUnits,
  checkCachedPassesEligibility,
} from "../api/referral.js";
import { tipLifetimeShownCount } from "./tipIds.js";
import { getShortcutDisplay } from "../../keybindings/shortcutFormat.js";
import { getWorktreeCount } from "../../utils/git.js";
import { colorCommand } from "../../commands/color/index.js";
import {
  getCurrentSessionAgentColor,
  isTranscriptPersistenceDisabled,
  isCustomTitleEnabled,
} from "../../utils/sessionStorage.js";
import { LEFT_ARROW, UP_ARROW, DOWN_ARROW } from "../../constants/figures.js";
import { isFleetBackgroundAllowed } from "../../utils/backgroundHandoff.js";
import { env } from "../../utils/env.js";
import {
  shouldOfferTerminalSetup,
  getNativeCSIuTerminalDisplayName_2,
} from "../../commands/terminalSetup/terminalSetup.js";
import { isXtermJs } from "../../ink/terminal.js";
import { sequential } from "../../utils/sequential.js";
import {
  isVSCodeInstalled,
  isCursorInstalled,
  isWindsurfInstalled,
  isSupportedTerminal,
  getSortedIdeLockfiles,
  getRunningIDEsCached,
} from "../../utils/ide.js";
import { getCachedRemoteHost } from "../../utils/detectRepository.js";
import { getGitHostKind } from "../../utils/gitHosts.js";
import { fileHistoryEnabled } from "../../utils/fileHistory.js";
import { UNBIND_EXAMPLE } from "../../skills/bundled/keybindings.js";
import { getChatActionDisplayText } from "../../keybindings/loadUserBindings.js";
import { shouldShowEffortHint } from "../../utils/effort.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { is1PApiCustomerOnFirstParty } from "../../commands/c4eUpsell.js";
import { getDesktopUpsellConfig } from "../../components/DesktopUpsell/DesktopUpsellStartup.js";
import { isBundledSkillGatedOff } from "../../skills/bundledSkillsGate.js";
import { DESIGN, LOOP, CODE_REVIEW } from "../../skills/bundled/bundledSkillNames.js";
import { isDesignSyncEnabled } from "../designSync/gates.js";
import { isArtifactToolEnabled } from "../artifacts/artifactToolGates.js";
import { getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import { commandPolicyGateAllows } from "../policyLimits/policyVerdicts.js";
import { CLOUD_SESSIONS_POLICY } from "../cloudSessions/cloudSessionsPolicy.js";
import { isWebSetupEnabled } from "../cloudSessions/webSetup.js";
import { GITHUB_CONNECTION_STATUS_CACHE } from "../../commands/remote-setup/api.js";
import {
  isRemoteControlOfferable,
  getRemoteControlAtStartup,
  isRunningInRemoteEnvironment,
} from "../../bridge/bridgeGates.js";
import { getUntriedRemoteSurface, isPushUpsellEligible } from "./remoteControlNudges.js";
import { isVoiceModeAvailable, hasVoiceSettings } from "../../voice/voiceModeEnabled.js";
import { isAntBuild } from "../../utils/envUtils.js";
import { isFullscreenEnvEnabled, isAutoOffDecision, getFullscreenDecision } from "../../utils/fullscreen.js";
import { hasFullscreenBootFailures } from "../../utils/fullscreenBootGuard.js";
import { FOCUS_ON_TIP, FOCUS_TIP_MAX, TEACH_TIP_TEXT } from "./focusTips.js";
import { isFocusModeEnabled } from "../../utils/focusMode.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { getOutputStyleConfig } from "../../constants/outputStyles.js";
import {
  ultrareviewQuota,
  freeReviewsBadge,
  isUltrareviewSurfaceOn,
  hasRunUltrareview,
  refreshUltrareviewQuota,
} from "../api/ultrareviewQuota.js";
import { getUserSpecifiedModelSetting } from "../../utils/model/smallFastModel.js";
import { YOU_SHOULD_KNOW_PLUGIN_TIP } from "./youShouldKnowTip.js";
import { isWorkflowsAvailable } from "../../utils/workflows/workflowGates.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import { isKairosCronEnabled } from "../../tools/ScheduleCronTool/prompt.js";
import { computeDisusedPlugins } from "./pluginDisuseTip.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { isTeamOnboardingShareEnabled } from "../../commands/team-onboarding/api.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { loadCustomTips, excludesDefaultTips } from "./spinnerTipsOverride.js";
import {
  isFirstPartyApiBackend,
  getAPIProvider,
  isFirstPartyAnthropicBaseUrl,
} from "../../utils/model/providers.js";

//@ chunk-5nte8cwj.js:1501-1546 placement
/**
 * 是否能构造出桌面深链（构造失败为 false）。
 */
async function hasDesktopDeepLink() {
  return (await buildDesktopDeepLink()) !== null;
}
//@ chunk-4t8fx0s8.js:13854-13907 sole-consumer
/**
 * 给定 id 列表里，除当前提示外是否有仍在冷却期内（展示过的会话数不足）的提示。
 */
function anyRecentTipShown(tipIds, tipId, cooldownSessions) {
  return tipIds.some(
    (otherTipId) => otherTipId !== tipId && getSessionsSinceTipShown(otherTipId) < cooldownSessions,
  );
}
//@ chunk-4t8fx0s8.js:13907-14961 sole-consumer
/**
 * 内容链接提示的常量与 schema：白名单域名、允许的路径/锚点、标签文字、链接提示 id 与冷却/展示上限。
 */
var TENGU_ENUMERATED_LOCKET = "tengu_enumerated_locket";
var CONTENT_LINK_TIPS_2 = "content_link_tips";
var CONTENT_LINK_LABELS = ["docs", "article", "guide", "video"];
var CONTENT_LINK_LABEL_TEXT = {
  docs: "Read the docs",
  article: "Read the article",
  guide: "Read the guide",
  video: "Watch the video",
};
var TRUSTED_LINK_HOSTS = ["claude.com", "code.claude.com", "claude.dev", "academy.claude.com"];
var LINK_HOSTS_WITH_VIDEO = [...TRUSTED_LINK_HOSTS, "www.youtube.com"];
var DOC_PATH_PREFIXES = ["/docs/", "/resources/"];
var YOUTUBE_SEARCH_REGEX = /^\?v=[\w-]+$/;
var URL_PATHNAME_REGEX = /^\/[\w./-]*$/;
var URL_HASH_REGEX = /^(#[\w-]+)?$/;
var CONTROL_CHAR_REGEX = /\p{Cc}/u;
var contentLinkSchema = DoctorLazy(() => record(stringSchema(), unknown()).nullable());
var contentLinkUrlSchema = DoctorLazy(() =>
  objectSchema({
    url: stringSchema().refine((rawUrl) => {
      let parsedUrl = URL.parse(rawUrl);
      return (
        parsedUrl !== null &&
        !CONTROL_CHAR_REGEX.test(rawUrl) &&
        parsedUrl.protocol === "https:" &&
        LINK_HOSTS_WITH_VIDEO.includes(parsedUrl.hostname) &&
        URL_PATHNAME_REGEX.test(parsedUrl.pathname) &&
        !parsedUrl.pathname.includes("..") &&
        URL_HASH_REGEX.test(parsedUrl.hash) &&
        (parsedUrl.hostname === "www.youtube.com"
          ? parsedUrl.pathname === "/watch" && YOUTUBE_SEARCH_REGEX.test(parsedUrl.search)
          : parsedUrl.search === "" &&
            (parsedUrl.hostname !== "claude.com" ||
              DOC_PATH_PREFIXES.some((prefix) => `${parsedUrl.pathname}/`.startsWith(prefix)))) &&
        parsedUrl.username === "" &&
        parsedUrl.password === "" &&
        parsedUrl.port === ""
      );
    }),
    label: _enum(CONTENT_LINK_LABELS),
  }).optional(),
);
var CONTENT_LINK_TIP_IDS = [
  "content-link-hooks",
  "content-link-mcp",
  "content-link-mods",
  "content-link-long-sessions",
  "content-link-auto-mode",
  "content-link-team-workflows",
];
var CONTENT_LINK_COOLDOWN_SESSIONS = 5;
var DEFAULT_COOLDOWN_SESSIONS = 20;
var DEFAULT_MAX_LIFETIME_SHOWS = 3;
var FIRST_RUN_STARTUPS = 20;
var AUTO_MODE_STARTUPS = 10;
var AUTO_MODE_TRIGGER_STARTUPS = 10;
var LARGE_INPUT_TOKEN_THRESHOLD = 100;
var HOOKS_TIP_INPUT_TOKENS = 150000;
//@ chunk-4t8fx0s8.js:14961-15343 sole-consumer
/**
 * 支持超链接时，为提示文字追加从配置表取得的内容链接（白名单域名加 utm 参数），以"· 链接"形式附在句尾。
 */
function appendContentLink(tipId, text, context) {
  let link = supportsHyperlinks() ? getContentLink(tipId, context.session.host) : undefined;
  if (link === undefined) return text;
  let url = new URL(link.url);
  if (TRUSTED_LINK_HOSTS.includes(url.hostname)) {
    url.searchParams.set("utm_source", "claude_code");
    url.searchParams.set("utm_medium", "tip");
    url.searchParams.set("utm_campaign", CONTENT_LINK_TIPS_2);
    url.searchParams.set("utm_content", tipId);
  }
  let hyperlink = createHyperlink(url.toString(), CONTENT_LINK_LABEL_TEXT[link.label], {
    themeName: context.theme,
  });
  return `${text.replace(/\.$/, "")} \xB7 ${hyperlink}`;
}
//@ chunk-4t8fx0s8.js:15343-15787 sole-consumer
/**
 * 提示注册表的宿主状态：缓存是否配置了 MCP 服务器（惰性读取一次），以及是否已报告过无效链接。
 */
class TipHostState {
  mcpServersConfigured = undefined;
  invalidLinkReported = false;
  get hasReadMcpServers() {
    return this.mcpServersConfigured !== undefined;
  }
  hasMcpServersConfigured(storageV5) {
    this.mcpServersConfigured ??= getClaudeCodeMcpConfigs(
      {},
      {
        storageV5,
      },
    ).then(({ servers }) => Object.keys(servers).length > 0);
    return this.mcpServersConfigured;
  }
  claimInvalidLinkReport() {
    let isFirst = !this.invalidLinkReported;
    this.invalidLinkReported = true;
    return isFirst;
  }
  forget() {
    this.mcpServersConfigured = undefined;
    this.invalidLinkReported = false;
  }
}
//@ chunk-4t8fx0s8.js:15787-17070 sole-consumer
/**
 * 按宿主缓存的提示状态，以及一组"内容链接"提示（hooks、MCP、mods、长会话 /context、auto 模式、团队工作方式），各带触发条件。
 */
var tipHostStateByHost = new HostScoped(() => identity(new TipHostState(), (state) => state.forget()));
var CONTENT_LINK_TIPS = [
  getRelevantTips({
    id: "content-link-hooks",
    text: "Run your own scripts on Claude Code events with hooks",
    isTriggered: () =>
      getGlobalConfig().numStartups > FIRST_RUN_STARTUPS &&
      !isRemoteSessionAvailable() &&
      !hasConfiguredHooks() &&
      !isCustomizationDisabled("hooks") &&
      !shouldAllowManagedHooksOnly() &&
      !shouldDisableAllHooksIncludingManaged() &&
      !isRestrictedToPluginOnly("hooks"),
  }),
  getRelevantTips({
    id: "content-link-mcp",
    text: "Connect Claude to your tools and data with MCP",
    isTriggered: async (context) =>
      getGlobalConfig().numStartups > AUTO_MODE_STARTUPS &&
      !isRemoteSessionAvailable() &&
      !isCustomizationDisabled("mcpAutoDiscovered") &&
      !isRestrictedToPluginOnly("mcp") &&
      !doesEnterpriseMcpConfigExist() &&
      !hasManagedMcpPolicy() &&
      getEverConnectedClaudeAiMcpSet().size === 0 &&
      ![...(context.toolsUsed ?? [])].some((toolName) => mcpInfoFromString(toolName)) &&
      !(await tipHostStateByHost.of(context.session.host).hasMcpServersConfigured(context.storageV5)),
  }),
  getRelevantTips({
    id: "content-link-mods",
    text: "Change how Claude Code looks and behaves with a mod",
    isTriggered: () => {
      let settings_DEPRECATED = getSettings_DEPRECATED();
      let hasCustomization =
        settings_DEPRECATED.statusLine !== undefined ||
        hasConfiguredHooks() ||
        Object.entries(settings_DEPRECATED.enabledPlugins ?? {}).some(
          ([key, value]) => Boolean(value) && !isBuiltinPluginId(key),
        );
      let allowManagedModsOnly =
        getSettingsForSource("policySettings")?.pluginConfigs?.[DEFAULT_SECURITY_SEAT_PLUGIN]?.options
          ?.allowManagedModsOnly;
      return (
        hasCustomization &&
        !isRemoteSessionAvailable() &&
        (allowManagedModsOnly === undefined || allowManagedModsOnly === false) &&
        areHooksModulesActive()
      );
    },
  }),
  getRelevantTips({
    id: "content-link-long-sessions",
    text: "Long session? Run /context to see what fills it",
    advertisedCommand: "context",
    isTriggered: () => getTotalInputTokens() + getTotalCacheCreationInputTokens() >= HOOKS_TIP_INPUT_TOKENS,
  }),
  getRelevantTips({
    id: "content-link-auto-mode",
    text: "Skip most permission prompts with auto mode",
    isTriggered: () =>
      getGlobalConfig().numStartups > AUTO_MODE_TRIGGER_STARTUPS &&
      !isAutoModeActive() &&
      isAutoModeGateEnabled(),
  }),
  getRelevantTips({
    id: "content-link-team-workflows",
    text: "See how the Claude Code team works day to day",
    isTriggered: () => getGlobalConfig().numStartups > LARGE_INPUT_TOKEN_THRESHOLD,
  }),
];
//@ chunk-4t8fx0s8.js:17070-17363 sole-consumer
function getContentLink(tipId, host) {
  let tableResult = contentLinkSchema().safeParse(
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ENUMERATED_LOCKET, null),
  );
  let linkResult = contentLinkUrlSchema().safeParse(tableResult.data?.[tipId]);
  if (!tableResult.success || !linkResult.success) {
    logForDebugging(`Ignoring an invalid content link for tip ${tipId}`, {
      level: "warn",
    });
    if (tipHostStateByHost.of(host).claimInvalidLinkReport())
      logFeatureSad("tips_content_link_table", tableResult.success ? "invalid_entry" : "invalid_table");
  }
  return linkResult.data;
}
//@ chunk-4t8fx0s8.js:17363-17420 sole-consumer
/**
 * 设置里是否配置了任何 hooks（用于 hooks 相关提示的相关性判断）。
 */
function hasConfiguredHooks() {
  return Object.keys(getSettings_DEPRECATED().hooks ?? {}).length > 0;
}
//@ chunk-4t8fx0s8.js:17420-17661 fingerprint (2.1.88 match: getRelevantTips, 0.417)
function getRelevantTips({ id, text, advertisedCommand, isTriggered }) {
  return {
    id,
    cooldownSessions: DEFAULT_COOLDOWN_SESSIONS,
    maxLifetimeShows: DEFAULT_MAX_LIFETIME_SHOWS,
    advertisedCommand,
    content: async (context) => appendContentLink(id, text, context),
    isRelevant: async (context) =>
      supportsHyperlinks() &&
      (await isTriggered(context)) &&
      getContentLink(id, context.session.host) !== undefined &&
      !anyRecentTipShown(CONTENT_LINK_TIP_IDS, id, CONTENT_LINK_COOLDOWN_SESSIONS),
  };
}
//@ chunk-4t8fx0s8.js:17661-17689 layout
var MARKETPLACE_PLUGIN_TIP_PREFIX = "marketplace-plugin:";
//@ chunk-4t8fx0s8.js:17689-19564 layout
/**
 * 提示系统的会话级缓存：已知市场、市场插件提示列表、会话数、桌面版是否安装、gh 登录状态与失败提示 id。
 */
class TipSessionCache {
  knownMarketplaces = undefined;
  marketplacePluginTips = undefined;
  sessionCountInFlight = undefined;
  desktopInstalled = undefined;
  ghAuthStatus = undefined;
  failedTipIds = new Set();
  getKnownMarketplaces(storageV5) {
    this.knownMarketplaces ??= loadKnownMarketplacesSafe(storageV5);
    return this.knownMarketplaces;
  }
  getMarketplacePluginTips(storageV5) {
    this.marketplacePluginTips ??= this.loadMarketplacePluginTips(storageV5);
    return this.marketplacePluginTips;
  }
  async loadMarketplacePluginTips(storageV5) {
    let marketplaces = new Set(getPluginSuggestionMarketplaces());
    if (marketplaces.size === 0) return [];
    return this.buildMarketplacePluginTips(
      marketplaces,
      await this.getKnownMarketplaces(storageV5),
      storageV5,
    );
  }
  async buildMarketplacePluginTips(marketplaces, knownMarketplaces, storageV5) {
    let tips = [];
    for (let marketplace of marketplaces) {
      let known = knownMarketplaces[marketplace];
      if (!known) continue;
      if (
        marketplace !== CLAUDE_PLUGINS_OFFICIAL &&
        !isMarketplaceSourceDeclaredByPolicy(marketplace, known.source)
      ) {
        logForDebugging(
          `Skipping plugin suggestion tips for marketplace "${marketplace}": its registered source is not declared in managed settings (extraKnownMarketplaces or strictKnownMarketplaces)`,
        );
        continue;
      }
      let cache = await getMarketplaceCacheOnly(marketplace, storageV5).catch(() => null);
      if (!cache) continue;
      for (let plugin of cache.plugins) {
        let relevance = plugin.relevance;
        let hasSignals = hasRelevanceSignals(plugin.name, relevance);
        if (!hasSignals) continue;
        if (
          marketplace === CLAUDE_PLUGINS_OFFICIAL &&
          externalTips.some((externalTip) => externalTip.id === `${plugin.name}-plugin`)
        )
          continue;
        let topic =
          relevance?.topic ??
          plugin.name
            .split("-")
            .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
            .join("-");
        let id =
          marketplace === CLAUDE_PLUGINS_OFFICIAL
            ? `${MARKETPLACE_PLUGIN_TIP_PREFIX}${plugin.name}`
            : `${MARKETPLACE_PLUGIN_TIP_PREFIX}${plugin.name}@${marketplace}`;
        tips.push({
          id,
          pluginId: `${plugin.name}@${marketplace}`,
          advertisedCommand: "plugin",
          priority: 1,
          providerAgnostic: true,
          cooldownSessions: 3,
          content: async (context) => {
            let accent = color("suggestion", context.theme);
            return `Working with ${topic}? Install the ${plugin.name} plugin:
${accent(`/plugin install ${plugin.name}@${marketplace}`)}`;
          },
          isRelevant: async (context) =>
            shouldSuggestOfficialPlugin(this, plugin.name, context, hasSignals, marketplace),
        });
      }
    }
    return tips;
  }
  getDesktopInstalled() {
    this.desktopInstalled ??= hasDesktopDeepLink();
    return this.desktopInstalled;
  }
  getGhAuthStatus() {
    this.ghAuthStatus ??= getGhAuthStatus({
      allowNetworkFallbackForOldGh: false,
    });
    return this.ghAuthStatus;
  }
  countSessionsOnce(storageV5) {
    if (this.sessionCountInFlight !== undefined) return this.sessionCountInFlight;
    let pending = countConcurrentSessions(storageV5).finally(() => {
      if (this.sessionCountInFlight === pending) this.sessionCountInFlight = undefined;
    });
    this.sessionCountInFlight = pending;
    return pending;
  }
}
//@ chunk-4t8fx0s8.js:19564-19588 layout
var tipRegistryStateByHost = new HostScoped(() => new TipSessionCache());
//@ chunk-4t8fx0s8.js:19588-19716 layout
function countSessionsCached(context) {
  if (isStorageV5Enabled() && context?.storageV5 !== undefined)
    return tipRegistryStateByHost.of(context.session.host).countSessionsOnce(context.storageV5);
  return countConcurrentSessions(context?.storageV5);
}
//@ chunk-4t8fx0s8.js:19716-19893 layout
/**
 * 是否推荐安装某官方插件：官方市场已登记、插件未安装且未被托管设置管理、并有推荐理由。
 */
async function shouldSuggestOfficialPlugin(
  cache,
  pluginName,
  context,
  relevance,
  marketplace = CLAUDE_PLUGINS_OFFICIAL,
) {
  if (!(await cache.getKnownMarketplaces(context.storageV5))[marketplace]) return false;
  if (isPluginInstalled(`${pluginName}@${marketplace}`)) return false;
  if (isPluginBlockedByPolicy(`${pluginName}@${marketplace}`)) return false;
  return (await matchRelevanceSignal(relevance, context)) !== null;
}
//@ chunk-4t8fx0s8.js:19893-20015 layout
async function hasUserDefinedCustomization(customizationKind, storageV5) {
  try {
    return (await loadMarkdownFilesCached(customizationKind, getCwd(), storageV5)).length > 0;
  } catch (error) {
    logForDebugging(`hasUserDefined(${customizationKind}) failed: ${error}`);
    return false;
  }
}
//@ chunk-4t8fx0s8.js:20015-20247 layout
/**
 * 识别前端项目用的文件扩展名正则与常见前端开发服务器命令名。
 */
var FRONTEND_FILE_PATTERN =
  /\.(html?|css|s[ac]ss|less|[jt]sx|vue|svelte|astro|png|jpe?g|gif|svg|webp|avif|ico)$/i;
var FRONTEND_DEV_SERVER_COMMANDS = new Set([
  "vite",
  "next",
  "nuxt",
  "astro",
  "gatsby",
  "ng",
  "parcel",
  "webpack-dev-server",
  "serve",
  "http-server",
  "live-server",
  "browser-sync",
]);
//@ chunk-4t8fx0s8.js:20247-20420 fingerprint (2.1.88 match: isMarketplacePluginRelevant, 0.708)
function isMarketplacePluginRelevant(context) {
  let { bashTools, readFileState } = context ?? {};
  if (bashTools) {
    for (let bashTool of bashTools) if (FRONTEND_DEV_SERVER_COMMANDS.has(bashTool)) return true;
  }
  if (readFileState) {
    let isPluginRoot = pluginRelevanceRoots();
    for (let fileKey of remoteFileStateKeys(readFileState))
      if (FRONTEND_FILE_PATTERN.test(fileKey) && !isPluginRoot(fileKey)) return true;
  }
  return false;
}
//@ chunk-4t8fx0s8.js:20420-20464 affinity
/**
 * 桌面版提示的阈值常量（最少会话数、最大展示次数）。
 */
var TIP_SHOW_LIMIT = 2;
var DESKTOP_IOS_SIMULATOR = "desktop-ios-simulator";
var DESKTOP_TIP_MIN_SESSIONS = 15;
var DESKTOP_TIP_MAX_SHOWS = 5;
//@ chunk-4t8fx0s8.js:20464-20620 sole-consumer
function isIosSimulatorTipRelevant(context) {
  if (!isDesktopCommandEnabled() || getPlatform() !== "macos") return false;
  if (!isClaudeAISubscriber() || hasComplianceTaint("hipaa")) return false;
  if (!context.devIntents?.has("ios_app")) return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_magical_pixel", false);
}
//@ chunk-4t8fx0s8.js:20620-20751 sole-consumer
function enterpriseOnlyNote(ctx) {
  return `available in Claude for Enterprise \xB7 ${createHyperlink(
    "https://clau.de/enterprise",
    "Learn more",
    {
      themeName: ctx.theme,
    },
  )}`;
}
//@ chunk-4t8fx0s8.js:20751-20824 sole-consumer
/**
 * c4e 系列提示的 id 列表与冷却阈值。
 */
var C4E_TIP_COOLDOWN_SESSIONS = 15;
var C4E_TIP_IDS = ["c4e-desktop", "c4e-remote-sessions", "c4e-ultrareview"];
var C4E_TIP_COOLDOWN = 5;
//@ chunk-4t8fx0s8.js:20824-20856 sole-consumer
/**
 * c4e 系列提示最近是否展示过。
 */
function anyC4eTipRecentlyShown(tipId) {
  return anyRecentTipShown(C4E_TIP_IDS, tipId, C4E_TIP_COOLDOWN);
}
//@ chunk-4t8fx0s8.js:20856-20931 sole-consumer
/**
 * workflow-size 系列提示的 id 与冷却阈值。
 */
var WORKFLOW_SIZE_TIP_IDS = ["workflow-size-prompting", "workflow-size-prompting-ambient"];
var WORKFLOW_SIZE_TIP_COOLDOWN = 12;
//@ chunk-4t8fx0s8.js:20931-20963 sole-consumer
/**
 * workflow-size 提示最近是否展示过。
 */
function anyWorkflowSizeTipRecentlyShown(tipId) {
  return anyRecentTipShown(WORKFLOW_SIZE_TIP_IDS, tipId, WORKFLOW_SIZE_TIP_COOLDOWN);
}
//@ chunk-4t8fx0s8.js:20963-21022 sole-consumer
/**
 * artifact 系列提示的 id 与冷却阈值。
 */
var ARTIFACT_TIP_IDS = ["artifact-publish-plan", "artifact-duplicate"];
var ARTIFACT_TIP_COOLDOWN = 5;
//@ chunk-4t8fx0s8.js:21022-21055 sole-consumer
/**
 * artifact 提示最近是否展示过。
 */
function anyArtifactTipRecentlyShown(tipId) {
  return anyRecentTipShown(ARTIFACT_TIP_IDS, tipId, ARTIFACT_TIP_COOLDOWN);
}
//@ chunk-4t8fx0s8.js:21055-21070 sole-consumer
var GITHUB_TIP_COOLDOWN_SESSIONS = 10;
var GITHUB_TIP_MAX_SHOWS = 4;
//@ chunk-4t8fx0s8.js:21070-21139 sole-consumer
/**
 * 当前是否设置了 workflow size 指引。
 */
function hasWorkflowSizeSetting() {
  return (
    hasWorkflowSizeSetting_2() || workflowSizeSetting(getGlobalConfig().workflowSizeGuideline) !== undefined
  );
}
//@ chunk-4t8fx0s8.js:21260-21283 sole-consumer
/**
 * 取外部提示列表。
 */
function getExternalTips() {
  return externalTips;
}
//@ chunk-4t8fx0s8.js:21283-21306 sole-consumer
/**
 * 取额外提示列表（目前为空）。
 */
function getExtraTips() {
  return EXTRA_TIPS;
}
//@ chunk-4t8fx0s8.js:21306-21338 sole-consumer
/**
 * 合并外部提示与额外提示。
 */
function getAllTips() {
  return [...externalTips, ...EXTRA_TIPS];
}
//@ chunk-4t8fx0s8.js:21338-21405 sole-consumer
/**
 * 判断给定 id 是否属于外部或额外提示。
 */
function isKnownTipId(tipId) {
  return (
    externalTips.some((externalTip) => externalTip.id === tipId) || EXTRA_TIPS.some((tip) => tip.id === tipId)
  );
}
//@ chunk-4t8fx0s8.js:21405-21649 sole-consumer
/**
 * 判断提示要推广的内置命令在当前会话是否可用（远程模式下先按远程过滤）；找不到命令时，非远程视为可用。
 */
async function isAdvertisedCommandAvailable(advertisedCommand) {
  let { filterCommandsForRemoteMode, getBuiltinCommands } = await import("../../commands.js");
  let isRemote = isRemoteSessionAvailable();
  let filtered = (isRemote ? filterCommandsForRemoteMode(getBuiltinCommands()) : getBuiltinCommands()).filter(
    (command) => command.name === advertisedCommand || command.aliases?.includes(advertisedCommand),
  );
  if (filtered.length === 0) return !isRemote;
  return filtered.some((command) => meetsAvailabilityRequirement(command) && isCommandEnabled(command));
}
//@ chunk-4t8fx0s8.js:21649-44371 fingerprint (2.1.88 match: externalTips, 0.568)
/**
 * 内置提示表（约 70 条）：每条有 id、content（可异步生成）、cooldownSessions、isRelevant 判定，涵盖 plan 模式、worktree、/memory、终端设置、桌面版、远程控制等。
 */
var externalTips = [
  {
    id: "team-artifacts",
    priority: 4,
    content: async (ctx) => {
      let unseen = await listUnseenTeamArtifacts(ctx.session, ctx.storageV5).catch((error) => {
        logFeatureSad(
          "tips_team_artifact_show",
          error instanceof Error ? "content_scan_error" : "content_unknown_error",
        );
        return [];
      });
      if (unseen.length === 0) return "";
      logTeamArtifactTipShown(unseen);
      markTeamArtifactsSeen(ctx.session, ctx.storageV5);
      return formatTeamArtifactTip(unseen);
    },
    cooldownSessions: 1,
    isRelevant: async (ctx) => hasUnseenTeamArtifacts(ctx.session, ctx.storageV5),
  },
  {
    id: "fotw-campaign",
    priority: 4,
    content: async () => {
      let promoCampaign = parsePromoCampaign();
      if (!promoCampaign?.command) return "";
      let credit = promoCreditAmount();
      if (!credit) return "";
      let priceLabel = formatCurrency(credit.amountMinorUnits, credit.currency, "fit");
      let commandLabel = promoCampaign.tipBlurb
        ? `/${promoCampaign.command} ${promoCampaign.tipBlurb}`
        : `/${promoCampaign.command}`;
      let blurb =
        promoCampaign.tips?.[tipLifetimeShownCount("fotw-campaign") % promoCampaign.tips.length] ?? "";
      if (blurb) return `${blurb} Try it for ${priceLabel} in usage credits.`;
      return `${promoCampaign.titleLabel ?? "Feature of the week:"} ${commandLabel}. Try it for ${priceLabel} in usage credits.`;
    },
    cooldownSessions: 1,
    isRelevant: async () => canClaimPromoCredit(),
  },
  {
    id: "fotw-campaign-upsell",
    priority: 4,
    content: async () => {
      let promoCampaign = parsePromoCampaign();
      if (!promoCampaign?.command) return "";
      let blurb =
        promoCampaign.tips?.[tipLifetimeShownCount("fotw-campaign-upsell") % promoCampaign.tips.length] ?? "";
      if (blurb) return blurb;
      let commandLabel = promoCampaign.tipBlurb
        ? `/${promoCampaign.command} ${promoCampaign.tipBlurb}`
        : `/${promoCampaign.command}`;
      return `${promoCampaign.titleLabel ?? "Feature of the week:"} ${commandLabel}.`;
    },
    cooldownSessions: 1,
    isRelevant: async () => shouldShowPromoUpsell(),
  },
  {
    id: "powerup-onboarding",
    priority: 3,
    providerAgnostic: true,
    content: async (ctx) =>
      `New to Claude Code? Run ${color("suggestion", ctx.theme)("/powerup")} for a quick interactive tutorial`,
    cooldownSessions: 1,
    async isRelevant() {
      let globalConfig = getGlobalConfig();
      if (globalConfig.numStartups >= 10) return false;
      if (globalConfig.powerupsUnlocked?.length) return false;
      return getFeatureValue_CACHED_MAY_BE_STALE("tengu_alder_compass", false);
    },
  },
  {
    id: "new-user-warmup",
    priority: 2,
    providerAgnostic: true,
    content: async () =>
      "Start with small features or bug fixes, tell Claude to propose a plan, and verify its suggested edits",
    cooldownSessions: 3,
    async isRelevant() {
      return getGlobalConfig().numStartups < 10;
    },
  },
  {
    id: "plan-mode-for-complex-tasks",
    priority: 2,
    providerAgnostic: true,
    content: async (ctx) =>
      appendContentLink(
        "plan-mode-for-complex-tasks",
        `Use Plan Mode to prepare for a complex request before making changes. Press ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} twice to enable.`,
        ctx,
      ),
    cooldownSessions: 5,
    isRelevant: async () => {
      let globalConfig = getGlobalConfig();
      return (
        (globalConfig.lastPlanModeUse ? (Date.now() - globalConfig.lastPlanModeUse) / 86400000 : 1 / 0) > 7
      );
    },
  },
  {
    id: "default-permission-mode-config",
    providerAgnostic: true,
    advertisedCommand: "config",
    content: async () => "Use /config to change your default permission mode (including Plan Mode)",
    cooldownSessions: 10,
    isRelevant: async () => {
      try {
        let config = getGlobalConfig();
        let settings = getSettings_DEPRECATED();
        let hasUsedPlanMode = Boolean(config.lastPlanModeUse);
        let hasDefaultMode = Boolean(settings?.permissions?.defaultMode);
        return hasUsedPlanMode && !hasDefaultMode;
      } catch (error) {
        logForDebugging(`Failed to check default-permission-mode-config tip relevance: ${error}`, {
          level: "warn",
        });
        return false;
      }
    },
  },
  {
    id: "git-worktrees",
    providerAgnostic: true,
    content: async (ctx) =>
      appendContentLink(
        "git-worktrees",
        "Use git worktrees to run multiple Claude sessions in parallel.",
        ctx,
      ),
    cooldownSessions: 10,
    isRelevant: async () => {
      try {
        let config = getGlobalConfig();
        return (await getWorktreeCount()) <= 1 && config.numStartups > 50;
      } catch (error) {
        return false;
      }
    },
  },
  {
    id: "color-when-multi-clauding",
    providerAgnostic: true,
    content: async () =>
      "Running multiple Claude sessions? Use /color and /rename to tell them apart at a glance.",
    cooldownSessions: 10,
    isRelevant: async (ctx) => {
      if (colorCommand.isHidden) return false;
      if (getCurrentSessionAgentColor()) return false;
      return (await countSessionsCached(ctx)) >= 2;
    },
  },
  {
    id: "agents-view-multiclauding",
    priority: 3,
    providerAgnostic: true,
    maxLifetimeShows: 5,
    cooldownSessions: 1,
    content: async (ctx) => {
      let paint = color("suggestion", ctx.theme);
      return appendContentLink(
        "agents-view-multiclauding",
        `Running multiple Claude sessions? Press ${paint(LEFT_ARROW)} on an empty prompt to see them all in one place`,
        ctx,
      );
    },
    isRelevant: async (ctx) => {
      if (!isFleetBackgroundAllowed()) return false;
      if (isTranscriptPersistenceDisabled()) return false;
      let globalConfig = getGlobalConfig();
      if (globalConfig.leftArrowOpensAgents === false) return false;
      if (isBgSession()) return false;
      if (globalConfig.hasOpenedAgentsView || globalConfig.hasUsedAgentsFleet) return false;
      return (await countSessionsCached(ctx)) >= 2;
    },
  },
  {
    id: "terminal-setup",
    providerAgnostic: true,
    content: async () =>
      env.terminal === "Apple_Terminal"
        ? "Run /terminal-setup to enable convenient terminal integration like Option + Enter for new line and more"
        : "Run /terminal-setup to enable convenient terminal integration like Shift + Enter for new line and more",
    cooldownSessions: 10,
    async isRelevant() {
      if (!shouldOfferTerminalSetup()) return false;
      let config = getGlobalConfig();
      if (env.terminal === "Apple_Terminal") return !config.optionAsMetaKeyInstalled;
      return !config.shiftEnterKeyBindingInstalled;
    },
  },
  {
    id: "vscode-gpu-accel-garbled-glyphs",
    providerAgnostic: true,
    maxLifetimeShows: 5,
    content: async () =>
      "Corrupted terminal glyphs? Disable terminal GPU acceleration in settings or run /terminal-setup",
    cooldownSessions: 8,
    async isRelevant() {
      return isXtermJs();
    },
  },
  {
    id: "shift-enter",
    providerAgnostic: true,
    content: async () =>
      env.terminal === "Apple_Terminal"
        ? "Press Option+Enter to send a multi-line message"
        : "Press Shift+Enter to send a multi-line message",
    cooldownSessions: 10,
    async isRelevant() {
      let config = getGlobalConfig();
      return Boolean(
        (env.terminal === "Apple_Terminal"
          ? config.optionAsMetaKeyInstalled
          : config.shiftEnterKeyBindingInstalled) && config.numStartups > 3,
      );
    },
  },
  {
    id: "shift-enter-setup",
    providerAgnostic: true,
    content: async () =>
      env.terminal === "Apple_Terminal"
        ? "Run /terminal-setup to enable Option+Enter for new lines"
        : "Run /terminal-setup to enable Shift+Enter for new lines",
    cooldownSessions: 10,
    async isRelevant() {
      if (!shouldOfferTerminalSetup()) return false;
      let config = getGlobalConfig();
      return !(env.terminal === "Apple_Terminal"
        ? config.optionAsMetaKeyInstalled
        : config.shiftEnterKeyBindingInstalled);
    },
  },
  {
    id: "memory-command",
    providerAgnostic: true,
    content: async (ctx) =>
      appendContentLink("memory-command", "Use /memory to view and manage Claude memory", ctx),
    cooldownSessions: 15,
    advertisedCommand: "memory",
    async isRelevant() {
      return getGlobalConfig().memoryUsageCount <= 0;
    },
  },
  {
    id: "theme-command",
    providerAgnostic: true,
    content: async () => "Use /theme to change the color theme",
    cooldownSessions: 20,
    isRelevant: async () => true,
  },
  {
    id: "colorterm-truecolor",
    providerAgnostic: true,
    content: async () => "Try setting environment variable COLORTERM=truecolor for richer colors",
    cooldownSessions: 30,
    isRelevant: async () => !env.COLORTERM && sequential.level < 3,
  },
  {
    id: "powershell-tool-env",
    providerAgnostic: true,
    content: async () => "Set CLAUDE_CODE_USE_POWERSHELL_TOOL=1 to enable the PowerShell tool (preview)",
    cooldownSessions: 10,
    isRelevant: async () =>
      getPlatform() === "windows" && process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL === undefined,
  },
  {
    id: "status-line",
    providerAgnostic: true,
    content: async (ctx) =>
      appendContentLink(
        "status-line",
        "Use /statusline to set up a custom status line that will display beneath the input box",
        ctx,
      ),
    cooldownSessions: 25,
    advertisedCommand: "statusline",
    isRelevant: async () =>
      !shouldAllowManagedHooksOnly() && getSettings_DEPRECATED().statusLine === undefined,
  },
  {
    id: "prompt-queue",
    providerAgnostic: true,
    content: async () => "Hit Enter to queue up additional messages while Claude is working.",
    cooldownSessions: 5,
    async isRelevant() {
      return getGlobalConfig().promptQueueUseCount <= 3;
    },
  },
  {
    id: "enter-to-steer-in-relatime",
    providerAgnostic: true,
    content: async () => "Send messages to Claude while it works to steer Claude in real-time",
    cooldownSessions: 20,
    isRelevant: async () => true,
  },
  {
    id: "vscode-command-install",
    providerAgnostic: true,
    content: async () =>
      `Open the Command Palette (Cmd+Shift+P) and run "Shell Command: Install '${env.terminal === "vscode" ? "code" : env.terminal}' command in PATH" to enable IDE integration`,
    cooldownSessions: 0,
    async isRelevant() {
      if (!getNativeCSIuTerminalDisplayName_2()) return false;
      if (getPlatform() !== "macos") return false;
      switch (env.terminal) {
        case "vscode":
          return !(await isVSCodeInstalled());
        case "cursor":
          return !(await isCursorInstalled());
        case "windsurf":
          return !(await isWindsurfInstalled());
        default:
          return false;
      }
    },
  },
  {
    id: "ide-upsell-external-terminal",
    providerAgnostic: true,
    advertisedCommand: "ide",
    content: async () => "Connect Claude to your IDE \xB7 /ide",
    cooldownSessions: 4,
    async isRelevant() {
      if (isSupportedTerminal()) return false;
      if ((await getSortedIdeLockfiles()).length !== 0) return false;
      return (await getRunningIDEsCached()).length > 0;
    },
  },
  {
    id: "install-github-app",
    content: async (ctx) =>
      appendContentLink(
        "install-github-app",
        "Run /install-github-app to tag @claude right from your Github issues and PRs",
        ctx,
      ),
    cooldownSessions: 10,
    advertisedCommand: "install-github-app",
    async isRelevant() {
      if (getGlobalConfig().githubActionSetupCount) return false;
      let cachedRemoteHost = getCachedRemoteHost();
      let hostKind = cachedRemoteHost ? getGitHostKind(cachedRemoteHost) : null;
      return hostKind !== "gitlab" && hostKind !== "bitbucket";
    },
  },
  {
    id: "install-slack-app",
    content: async (ctx) =>
      appendContentLink("install-slack-app", "Run /install-slack-app to use Claude in Slack", ctx),
    cooldownSessions: 10,
    advertisedCommand: "install-slack-app",
    isRelevant: async () => !getGlobalConfig().slackAppInstallCount,
  },
  {
    id: "install-slack-app-mcp",
    content: async () =>
      "Using a Slack MCP? With Claude Tag you can @Claude directly in Slack \u2014 run /install-slack-app or share claude.com/product/tag with your org owner",
    cooldownSessions: 10,
    advertisedCommand: "install-slack-app",
    isRelevant: async (ctx) => {
      try {
        if (!isClaudeAISubscriber()) return false;
        if (getGlobalConfig().slackAppInstallCount) return false;
        let { servers } = await getClaudeCodeMcpConfigs(
          {},
          {
            storageV5: ctx?.storageV5,
          },
        );
        return Object.keys(servers).some((key) => key.toLowerCase().includes("slack"));
      } catch (error) {
        return false;
      }
    },
  },
  {
    id: "permissions",
    providerAgnostic: true,
    content: async (ctx) =>
      appendContentLink(
        "permissions",
        "Use /permissions to pre-approve and pre-deny bash, edit, and MCP tools",
        ctx,
      ),
    cooldownSessions: 10,
    advertisedCommand: "permissions",
    async isRelevant() {
      return getGlobalConfig().numStartups > 10 && !isRemoteSessionAvailable();
    },
  },
  {
    id: "drag-and-drop-images",
    providerAgnostic: true,
    content: async () => "Did you know you can drag and drop image files into your terminal?",
    cooldownSessions: 10,
    isRelevant: async () => !env.isSSH(),
  },
  {
    id: "paste-images-mac",
    providerAgnostic: true,
    content: async () => "Paste images into Claude Code using control+v (not cmd+v!)",
    cooldownSessions: 10,
    isRelevant: async () => getPlatform() === "macos",
  },
  {
    id: "double-esc",
    providerAgnostic: true,
    content: async () => "Double-tap esc to rewind the conversation to a previous point in time",
    cooldownSessions: 10,
    isRelevant: async () => !fileHistoryEnabled() && (!isRemoteSessionAvailable() || alwaysFalseRemoteMode()),
  },
  {
    id: "double-esc-code-restore",
    providerAgnostic: true,
    content: async (ctx) =>
      appendContentLink(
        "double-esc-code-restore",
        "Double-tap esc to rewind the code and/or conversation to a previous point in time",
        ctx,
      ),
    cooldownSessions: 10,
    isRelevant: async () => fileHistoryEnabled(),
  },
  {
    id: "continue",
    providerAgnostic: true,
    content: async () => "Run claude --continue or claude --resume to resume a conversation",
    cooldownSessions: 10,
    isRelevant: async () => true,
  },
  {
    id: "rename-conversation",
    providerAgnostic: true,
    content: async () => "Name your conversations with /rename to find them easily in /resume later",
    cooldownSessions: 15,
    isRelevant: async () => isCustomTitleEnabled() && getGlobalConfig().numStartups > 10,
  },
  {
    id: "custom-commands",
    providerAgnostic: true,
    content: async (ctx) =>
      appendContentLink(
        "custom-commands",
        "Create skills by adding .md files to .claude/skills/ in your project or ~/.claude/skills/ for skills that work in any project",
        ctx,
      ),
    cooldownSessions: 15,
    async isRelevant(ctx) {
      let config = getGlobalConfig();
      return (
        !isCustomizationDisabled("skills") &&
        config.numStartups > 10 &&
        !(await hasUserDefinedCustomization("skills", ctx?.storageV5))
      );
    },
  },
  {
    id: "shift-tab",
    providerAgnostic: true,
    async content(ctx) {
      let cycleKey = UNBIND_EXAMPLE() ?? "shift+tab";
      return appendContentLink(
        "shift-tab",
        `Hit ${cycleKey} to cycle between manual mode, auto-accept edit mode, and plan mode`,
        ctx,
      );
    },
    cooldownSessions: 10,
    async isRelevant() {
      if (getIsNonInteractiveSession()) return false;
      return UNBIND_EXAMPLE() !== null;
    },
  },
  {
    id: "image-paste",
    providerAgnostic: true,
    content: async () =>
      `Use ${getShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v")} to paste images from your clipboard`,
    cooldownSessions: 20,
    isRelevant: async () => true,
  },
  {
    id: "effort-step-keys",
    providerAgnostic: true,
    content: async () =>
      `Press ${getChatActionDisplayText("chat:increaseEffort") ?? `shift+${UP_ARROW}`} or ${getChatActionDisplayText("chat:decreaseEffort") ?? `shift+${DOWN_ARROW}`} at the prompt to raise or lower the effort level for this session`,
    cooldownSessions: 10,
    isRelevant: async () =>
      shouldShowEffortHint(getMainLoopModel()) &&
      typeof getChatActionDisplayText("chat:increaseEffort") === "string" &&
      typeof getChatActionDisplayText("chat:decreaseEffort") === "string",
  },
  {
    id: "agent-flag",
    providerAgnostic: true,
    content: async (ctx) =>
      appendContentLink(
        "agent-flag",
        "Use --agent <agent_name> to directly start a conversation with a subagent",
        ctx,
      ),
    cooldownSessions: 15,
    async isRelevant(ctx) {
      let config = getGlobalConfig();
      return (
        !isCustomizationDisabled("agents") &&
        config.numStartups > 5 &&
        (await hasUserDefinedCustomization("agents", ctx?.storageV5))
      );
    },
  },
  {
    id: "desktop-app",
    advertisedCommand: "desktop",
    content: async (ctx) =>
      `Run Claude Code locally or remotely using the Claude desktop app \xB7 run ${color("suggestion", ctx.theme)("/desktop")}`,
    cooldownSessions: 15,
    isRelevant: async (ctx) =>
      isDesktopCommandEnabled() &&
      !is1PApiCustomerOnFirstParty() &&
      !(await tipRegistryStateByHost.of(ctx.session.host).getDesktopInstalled()),
  },
  {
    id: "desktop-third-party",
    providerAgnostic: true,
    content: async (ctx) =>
      `Run Claude Code in the Claude desktop app with your cloud provider or LLM gateway \xB7 ${createHyperlink(
        "https://clau.de/desktop-3p",
        "clau.de/desktop-3p",
        {
          themeName: ctx.theme,
        },
      )}`,
    cooldownSessions: 15,
    isRelevant: async (ctx) =>
      isDesktopCommandEnabled() &&
      isThirdPartyProvider() &&
      !(await tipRegistryStateByHost.of(ctx.session.host).getDesktopInstalled()),
  },
  {
    id: "desktop-shortcut",
    advertisedCommand: "desktop",
    content: async (ctx) =>
      `Continue your session in Claude Code Desktop with ${color("suggestion", ctx.theme)("/desktop")}`,
    cooldownSessions: 15,
    isRelevant: async () => isDesktopCommandEnabled() && getDesktopUpsellConfig().enable_shortcut_tip,
  },
  {
    id: "desktop-contextual",
    advertisedCommand: "desktop",
    priority: 1,
    content: async (ctx) => {
      let paint = color("suggestion", ctx.theme);
      if (await tipRegistryStateByHost.of(ctx.session.host).getDesktopInstalled())
        return `Working on UI? See a live preview in Claude Code Desktop \xB7 run ${paint("/desktop")}`;
      return `Working on UI? Claude Code Desktop has live preview and inline images \xB7 ${paint("clau.de/desktop")}`;
    },
    cooldownSessions: 15,
    isRelevant: async (ctx) => {
      if (!isDesktopCommandEnabled()) return false;
      if (!getDesktopUpsellConfig().enable_contextual_tip) return false;
      if (!isMarketplacePluginRelevant(ctx)) return false;
      return !(
        isIosSimulatorTipRelevant(ctx) &&
        getSessionsSinceTipShown(DESKTOP_IOS_SIMULATOR) >= DESKTOP_TIP_MIN_SESSIONS &&
        tipLifetimeShownCount(DESKTOP_IOS_SIMULATOR) < DESKTOP_TIP_MAX_SHOWS
      );
    },
  },
  {
    id: DESKTOP_IOS_SIMULATOR,
    advertisedCommand: "desktop",
    priority: 1,
    content: async (ctx) =>
      `In Claude Code Desktop, each session gets its own iOS Simulator pane, where Claude tests your app, fixes what it finds, and checks again. \xB7 run ${color("suggestion", ctx.theme)("/desktop")}`,
    cooldownSessions: DESKTOP_TIP_MIN_SESSIONS,
    maxLifetimeShows: DESKTOP_TIP_MAX_SHOWS,
    isRelevant: async (ctx) => isIosSimulatorTipRelevant(ctx),
  },
  {
    id: "claude-design-contextual",
    priority: 1,
    content: async (ctx) =>
      `Use Claude Design to mock up screens before you build \xB7 ${createHyperlink(
        "https://claude.ai/design?utm_source=claude_code&utm_medium=tip&utm_campaign=tengu_cedar_plume",
        "claude.ai/design",
        {
          themeName: ctx.theme,
        },
      )}`,
    cooldownSessions: 15,
    isRelevant: async (ctx) => {
      if (!isClaudeAISubscriber()) return false;
      if (!isMarketplacePluginRelevant(ctx)) return false;
      return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cedar_plume", false);
    },
  },
  {
    id: "claude-design-command",
    advertisedCommand: "design",
    priority: 1,
    content: async (ctx) =>
      `Working on UI? Run ${color("suggestion", ctx.theme)("/design")} to mock up a few directions before you build`,
    cooldownSessions: 15,
    isRelevant: async (ctx) => {
      if (!isMarketplacePluginRelevant(ctx)) return false;
      if (isBundledSkillGatedOff(DESIGN)) return false;
      let aliasModule = await import("../../skills/bundled/artifactTypeAlias.js");
      if (
        aliasModule.isArtifactTypeAliasEnabled() &&
        !aliasModule.orgAllowsArtifactTypeAlias(aliasModule.DESIGN_TYPE_ALIAS)
      )
        return false;
      return isDesignSyncEnabled();
    },
  },
  {
    id: "artifact-publish-plan",
    priority: 3,
    maxLifetimeShows: 5,
    cooldownSessions: 5,
    content: async () =>
      "Working on a plan or design doc? Ask Claude to publish it as an artifact \u2014 a polished web page you can open in your browser.",
    isRelevant: async () =>
      !anyArtifactTipRecentlyShown("artifact-publish-plan") &&
      isArtifactToolEnabled() &&
      getArtifactPublishStubDir() === null,
  },
  {
    id: "artifact-duplicate",
    priority: 3,
    maxLifetimeShows: 5,
    cooldownSessions: 5,
    content: async () =>
      "See an artifact you'd like to build on? Duplicate, in its title menu, gives you your own editable copy.",
    isRelevant: async () =>
      !anyArtifactTipRecentlyShown("artifact-duplicate") &&
      isArtifactToolEnabled() &&
      getArtifactPublishStubDir() === null,
  },
  {
    id: "web-app",
    content: async () => "Run tasks in the cloud while you keep coding locally \xB7 clau.de/web",
    cooldownSessions: 15,
    isRelevant: async () =>
      !is1PApiCustomerOnFirstParty() && commandPolicyGateAllows(CLOUD_SESSIONS_POLICY.policy),
  },
  {
    id: "web-setup-github",
    advertisedCommand: "web-setup",
    priority: 1,
    cooldownSessions: GITHUB_TIP_COOLDOWN_SESSIONS,
    maxLifetimeShows: GITHUB_TIP_MAX_SHOWS,
    content: async (ctx) =>
      `Run ${color("suggestion", ctx.theme)("/web-setup")} to use cloud sessions with the GitHub account gh is signed in to`,
    isRelevant: async (ctx) => {
      if (getIsNonInteractiveSession() || !isClaudeAISubscriber() || !isWebSetupEnabled()) return false;
      let cachedRemoteHost = getCachedRemoteHost();
      let hostKind = cachedRemoteHost ? getGitHostKind(cachedRemoteHost) : null;
      if (hostKind === "gitlab" || hostKind === "bitbucket") return false;
      if (
        tipLifetimeShownCount("web-setup-github") >= GITHUB_TIP_MAX_SHOWS ||
        getSessionsSinceTipShown("web-setup-github") < GITHUB_TIP_COOLDOWN_SESSIONS
      )
        return false;
      if ((await tipRegistryStateByHost.of(ctx.session.host).getGhAuthStatus()).status !== "authenticated")
        return false;
      return (
        GITHUB_CONNECTION_STATUS_CACHE.of(ctx.session.host).peek(ctx.credentials, ctx.storageV5) ===
        "not_connected"
      );
    },
  },
  {
    id: "remote-control",
    content: async (ctx) => {
      let paint = color("suggestion", ctx.theme);
      return `Control this session from ${createHyperlink(
        "https://claude.com/download#mobile",
        "the Claude mobile app",
        {
          themeName: ctx.theme,
        },
      )} \xB7 run ${paint("/remote-control")}`;
    },
    cooldownSessions: 15,
    isRelevant: async () =>
      isRemoteControlOfferable() && !getGlobalConfig().hasUsedRemoteControl && !getRemoteControlAtStartup(),
  },
  {
    id: "remote-control-next-surface",
    content: async (ctx) => {
      let [href, linkText, suffix] =
        getUntriedRemoteSurface() === "web"
          ? ["https://claude.ai/code", "claude.ai/code", " on any browser"]
          : ["https://claude.com/download#mobile", "the Claude mobile app", ""];
      return `You can also drive this session from ${createHyperlink(href, linkText, {
        themeName: ctx.theme,
      })}${suffix}`;
    },
    cooldownSessions: 15,
    maxLifetimeShows: 3,
    isRelevant: async () => {
      if (!isRemoteControlOfferable() || !getRemoteControlAtStartup()) return false;
      if (getUntriedRemoteSurface() === undefined) return false;
      return getFeatureValue_CACHED_MAY_BE_STALE("tengu_maple_rung", false);
    },
  },
  {
    id: "push-notif",
    content: async (ctx) =>
      `Get pinged on your phone when long tasks finish \xB7 enable push notifications in ${color("suggestion", ctx.theme)("/config")}`,
    cooldownSessions: 15,
    isRelevant: async () => isPushUpsellEligible(),
  },
  {
    id: "voice-mode",
    content: async () => "Use /voice to enable push-to-talk dictation",
    cooldownSessions: 10,
    advertisedCommand: "voice",
    isRelevant: async () =>
      isVoiceModeAvailable() &&
      !hasVoiceSettings(getInitialSettings_2()) &&
      !isAntBuild() &&
      !env.CLAUDE_CODE_REMOTE &&
      !env.isSSH(),
  },
  {
    id: "no-flicker",
    providerAgnostic: true,
    content: async () =>
      "Try the new fullscreen renderer \u2014 flicker-free output, mouse support, auto-copy on select \xB7 /tui fullscreen",
    cooldownSessions: 10,
    advertisedCommand: "tui",
    isRelevant: async () =>
      !isFullscreenEnvEnabled() &&
      getInitialSettings_2().tui === undefined &&
      !hasFullscreenBootFailures() &&
      !isAutoOffDecision(getFullscreenDecision()),
  },
  {
    id: "focus-view",
    providerAgnostic: true,
    content: async () => FOCUS_ON_TIP,
    cooldownSessions: C4E_TIP_COOLDOWN_SESSIONS,
    advertisedCommand: "focus",
    isRelevant: async (ctx) => {
      if (!isFullscreenEnvEnabled() || getInitialSettings_2().viewMode !== undefined || isFocusModeEnabled())
        return false;
      if (
        getInitialSettings_2().spinnerTipsEnabled === false ||
        getSessionsSinceTipShown("focus-view") < C4E_TIP_COOLDOWN_SESSIONS
      )
        return false;
      switch (getFeatureValue_CACHED_MAY_BE_STALE("tengu_linear_fog", "off")) {
        case "holdout":
          return false;
        case "after_long_turn":
          return (ctx.lastTurnToolUseCount ?? 0) >= FOCUS_TIP_MAX;
        default:
          return true;
      }
    },
  },
  {
    id: "explanatory-output-style",
    priority: 1,
    providerAgnostic: true,
    content: async () => TEACH_TIP_TEXT,
    cooldownSessions: 15,
    maxLifetimeShows: 3,
    advertisedCommand: "config",
    isRelevant: async (ctx) =>
      (ctx.explanationRequestCount ?? 0) >= TIP_SHOW_LIMIT &&
      !isRemoteSessionAvailable() &&
      isSettingSourceEnabled("localSettings") &&
      getSettingsForSource("flagSettings")?.outputStyle === undefined &&
      getSettingsForSource("policySettings")?.outputStyle === undefined &&
      (await getOutputStyleConfig()) === null,
  },
  {
    id: "console-api-key",
    content: async (ctx) =>
      `Build your AI product with Claude API. Run ${color("suggestion", ctx.theme)("/claude-api")} to get started`,
    cooldownSessions: 15,
    isRelevant: async () => {
      if (!isClaudeAISubscriber() || !isMaxSubscriber()) return false;
      let globalConfig = getGlobalConfig();
      if (globalConfig.primaryApiKey) return false;
      if (customApiKeyResponsesOf(globalConfig).approved.length > 0) return false;
      if (env.ANTHROPIC_API_KEY) return false;
      if (globalConfig.numStartups <= 10) return false;
      return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kestrel_arch", "off") === "on";
    },
  },
  {
    id: "c4e-desktop",
    content: async (ctx) =>
      `Run Claude Code locally or remotely using the Claude desktop app \u2014 ${enterpriseOnlyNote(ctx)}`,
    cooldownSessions: 15,
    isRelevant: async () => {
      if (!is1PApiCustomerOnFirstParty() || anyC4eTipRecentlyShown("c4e-desktop")) return false;
      return isDesktopCommandEnabled();
    },
  },
  {
    id: "c4e-remote-sessions",
    content: async (ctx) =>
      `Run tasks in the cloud while you keep coding locally \u2014 ${enterpriseOnlyNote(ctx)}`,
    cooldownSessions: 15,
    isRelevant: async () => is1PApiCustomerOnFirstParty() && !anyC4eTipRecentlyShown("c4e-remote-sessions"),
  },
  {
    id: "c4e-ultrareview",
    content: async (ctx) =>
      `/ultrareview runs a deep, multi-agent review of your changes \u2014 ${enterpriseOnlyNote(ctx)}`,
    cooldownSessions: 15,
    advertisedCommand: "ultrareview",
    isRelevant: async () => is1PApiCustomerOnFirstParty() && !anyC4eTipRecentlyShown("c4e-ultrareview"),
  },
  {
    id: "ultrareview-awareness",
    priority: 1,
    cooldownSessions: 8,
    content: async (ctx) => {
      let paint = color("suggestion", ctx.theme);
      let quota = ultrareviewQuota();
      let badge =
        quota !== null && quota.reviews_remaining > 0
          ? ` \u2014 ${freeReviewsBadge(quota.reviews_remaining)}`
          : "";
      return `Run ${paint("/ultrareview")} for a cloud-based multi-agent review that finds and verifies bugs in your branch${badge}`;
    },
    isRelevant: async (ctx) => {
      if (!isUltrareviewSurfaceOn("startup_tip")) return false;
      if (hasRunUltrareview()) return false;
      refreshUltrareviewQuota(ctx.credentials);
      return true;
    },
  },
  {
    id: "opusplan-mode-reminder",
    providerAgnostic: true,
    content: async () =>
      `Your default model setting is Opus Plan Mode. Press ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} twice to activate Plan Mode and plan with Claude Opus.`,
    cooldownSessions: 2,
    async isRelevant() {
      let config = getGlobalConfig();
      let isOpusPlan = getUserSpecifiedModelSetting() === "opusplan";
      let daysSinceLastUse = config.lastPlanModeUse
        ? (Date.now() - config.lastPlanModeUse) / 86400000
        : 1 / 0;
      return isOpusPlan && daysSinceLastUse > 3;
    },
  },
  {
    id: "frontend-design-plugin",
    priority: 1,
    providerAgnostic: true,
    content: async (ctx) => `Working with HTML/CSS? Install the frontend-design plugin:
${color("suggestion", ctx.theme)(`/plugin install frontend-design@${CLAUDE_PLUGINS_OFFICIAL}`)}`,
    cooldownSessions: 3,
    maxLifetimeShows: 3,
    advertisedCommand: "plugin",
    isRelevant: async (ctx) =>
      shouldSuggestOfficialPlugin(tipRegistryStateByHost.of(ctx.session.host), "frontend-design", ctx, {
        filesRead: ["**/*.html", "**/*.css", "**/*.htm"],
      }),
  },
  YOU_SHOULD_KNOW_PLUGIN_TIP,
  {
    id: "subagent-fanout-nudge",
    providerAgnostic: true,
    content: async (ctx) =>
      `Say ${color("suggestion", ctx.theme)('"fan out subagents"')} and Claude sends a team. Each one digs deep so nothing gets missed.`,
    cooldownSessions: 3,
    isRelevant: async () => !isClaudeAISubscriber(),
  },
  {
    id: "workflow-size-prompting",
    providerAgnostic: true,
    advertisedCommand: "config",
    priority: 1,
    content: async (ctx) => {
      let paint = color("suggestion", ctx.theme);
      return `You can control how big a workflow is just by prompting. Try ${paint('"use a small workflow, 5 agents max"')}, or set a default with ${paint("Dynamic workflow size")} in ${paint("/config")}.`;
    },
    cooldownSessions: 5,
    isRelevant: async (ctx) =>
      isWorkflowsAvailable() &&
      !hasWorkflowSizeSetting() &&
      (ctx?.toolsUsed?.has(WORKFLOW_TOOL_NAME) ?? false) &&
      !anyWorkflowSizeTipRecentlyShown("workflow-size-prompting"),
  },
  {
    id: "workflow-size-prompting-ambient",
    providerAgnostic: true,
    advertisedCommand: "config",
    content: async (ctx) => {
      let paint = color("suggestion", ctx.theme);
      return `You can control how big a workflow is just by prompting. Ask for a small workflow, cap it with ${paint('"use at most 5 agents"')}, or set a default with ${paint("Dynamic workflow size")} in ${paint("/config")}.`;
    },
    cooldownSessions: 12,
    isRelevant: async (ctx) =>
      isWorkflowsAvailable() &&
      !hasWorkflowSizeSetting() &&
      !(ctx?.toolsUsed?.has(WORKFLOW_TOOL_NAME) ?? false) &&
      !anyWorkflowSizeTipRecentlyShown("workflow-size-prompting-ambient"),
  },
  {
    id: "loop-command-nudge",
    providerAgnostic: true,
    content: async (ctx) =>
      `${color("suggestion", ctx.theme)(`/${LOOP}`)} runs any prompt on a recurring schedule. Great for monitoring deploys, babysitting PRs, or polling status.`,
    cooldownSessions: 3,
    isRelevant: async () => {
      if (isRunningInRemoteEnvironment()) return false;
      if (!isKairosCronEnabled()) return false;
      return !isClaudeAISubscriber();
    },
  },
  {
    id: "code-review-low-fast",
    providerAgnostic: true,
    content: async (ctx) => {
      let paint = color("suggestion", ctx.theme);
      return appendContentLink(
        "code-review-low-fast",
        `For a fast, cheap code review, try ${paint("/code-review low")}. It runs the built-in skill at its lightest effort level.`,
        ctx,
      );
    },
    cooldownSessions: 8,
    isRelevant: async () => {
      let skillUsage = getGlobalConfig().skillUsage ?? {};
      return Object.keys(skillUsage).some((key) => {
        if (key === CODE_REVIEW) return false;
        return key
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .includes("codereview");
      });
    },
  },
  {
    id: "plugin-disuse-review",
    providerAgnostic: true,
    advertisedCommand: "plugin",
    content: async (ctx) => {
      let paint = color("suggestion", ctx.theme);
      let disusedPlugins = await computeDisusedPlugins();
      let oldest = disusedPlugins[0];
      if (!oldest) return "";
      if (disusedPlugins.length === 1)
        return `You haven't used the ${sequential.bold(oldest.name)} plugin lately. Disable it with ${paint("/plugin")} to free up context and speed up startup.`;
      return `You have ${disusedPlugins.length} plugins you haven't used lately. Disable them with ${paint("/plugin")} to free up context and speed up startup.`;
    },
    cooldownSessions: 30,
    isRelevant: async () => (await computeDisusedPlugins()).length > 0,
  },
  {
    id: "goal-command-nudge",
    content: async (ctx) => {
      let paint = color("suggestion", ctx.theme);
      return appendContentLink(
        "goal-command-nudge",
        `Set an objective with ${paint("/goal")} \u2014 Claude keeps working until it's met`,
        ctx,
      );
    },
    cooldownSessions: 3,
    isRelevant: async () => is1PApiCustomer(),
  },
  {
    id: "guest-passes",
    content: async (ctx) => {
      let claude = color("claude", ctx.theme);
      let reward = getCachedReferrerReward();
      return reward
        ? `Share Claude Code and earn ${claude(formatMinorUnits(reward))} in usage credits \xB7 ${claude("/passes")}`
        : `You have free guest passes to share \xB7 ${claude("/passes")}`;
    },
    cooldownSessions: 3,
    isRelevant: async () => {
      if (getGlobalConfig().hasVisitedPasses) return false;
      let { eligible } = checkCachedPassesEligibility();
      return eligible;
    },
  },
  {
    id: "feedback-command",
    content: async () => "Use /feedback to help us improve!",
    cooldownSessions: 15,
    async isRelevant() {
      if (!isFeedbackAllowed()) return false;
      return getGlobalConfig().numStartups > 5;
    },
  },
  {
    id: "team-onboarding-share",
    advertisedCommand: "team-onboarding",
    content: async (ctx) =>
      `Run ${color("suggestion", ctx.theme)("/team-onboarding")} to turn your Claude usage into an onboarding guide \u2014 share it with your team in one link`,
    cooldownSessions: 5,
    async isRelevant() {
      let globalConfig = getGlobalConfig();
      if (globalConfig.numStartups < 15) return false;
      if (
        globalConfig.teamOnboardingLastUsedAt !== undefined &&
        Date.now() - globalConfig.teamOnboardingLastUsedAt < 2592000000
      )
        return false;
      return isTeamOnboardingShareEnabled();
    },
  },
  ...CONTENT_LINK_TIPS,
];
var EXTRA_TIPS = [];
//@ chunk-4t8fx0s8.js:44371-44645 layout
async function isTipRelevantSafe(tip, ctx) {
  let failureMessage = "tip advertisedCommand check threw";
  try {
    if (tip.advertisedCommand !== undefined && !(await isAdvertisedCommandAvailable(tip.advertisedCommand)))
      return false;
    failureMessage = "tip isRelevant threw";
    return await tip.isRelevant(ctx);
  } catch (error) {
    tipRegistryStateByHost.of(ctx.session.host).failedTipIds.add(tip.id);
    logError(withTelemetryMessage(toError(error), failureMessage));
    return false;
  }
}
//@ chunk-4t8fx0s8.js:44645-45162 file-local
async function getCustomTips(ctx) {
  let state = tipRegistryStateByHost.of(ctx.session.host);
  let { tips, trustedCount } = await loadCustomTips(ctx.session.host);
  let filtered = tips.filter((tip) => getSessionsSinceTipShown(tip.id) >= tip.cooldownSessions);
  if (trustedCount > 0 && excludesDefaultTips()) return filtered;
  let builtinTips = [
    ...externalTips,
    ...EXTRA_TIPS,
    ...(await state.getMarketplacePluginTips(ctx.storageV5)),
  ];
  let restrictThirdParty = !isFirstPartyApiBackend();
  let filtered_2 = builtinTips.filter((tip) => !state.failedTipIds.has(tip.id));
  let candidates = restrictThirdParty ? filtered_2.filter((tip) => tip.providerAgnostic) : filtered_2;
  let isRelevant = await Promise.all(candidates.map((tip) => isTipRelevantSafe(tip, ctx)));
  return [
    ...candidates
      .filter((content, index) => isRelevant[index])
      .filter((tip) => getSessionsSinceTipShown(tip.id) >= tip.cooldownSessions)
      .filter(
        (tip) => tip.maxLifetimeShows === undefined || tipLifetimeShownCount(tip.id) < tip.maxLifetimeShows,
      ),
    ...filtered,
  ];
}
//@ chunk-4t8fx0s8.js:45162-45351 sole-consumer
function isThirdPartyProvider() {
  switch (getAPIProvider()) {
    case "bedrock":
    case "mantle":
    case "vertex":
    case "foundry":
    case "gateway":
      return true;
    case "anthropicAws":
    case "anthropicGoogleCloud":
      return false;
    case "firstParty":
      return !isFirstPartyAnthropicBaseUrl();
  }
}
export {
  MARKETPLACE_PLUGIN_TIP_PREFIX,
  TipSessionCache,
  getExternalTips,
  getExtraTips,
  isAdvertisedCommandAvailable,
  getAllTips,
  getCustomTips,
  isMarketplacePluginRelevant,
  isKnownTipId,
  isTipRelevantSafe,
  tipRegistryStateByHost,
};
