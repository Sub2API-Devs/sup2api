/**
 * services/tips/tipRegistry.ts
 *
 * spinner/启动提示注册表：约 70 条内置提示（内容、相关性判断、冷却会话数）、市场插件推荐提示与会话级缓存
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tips/tipRegistry.ts
 * pieces: chunk-4t8fx0s8.js (36)
 * attribution: sole-consumer 23, fingerprint 3, layout 8, affinity 1, file-local 1
 */
import { getSessionsSinceTipShown } from "./tipHistory.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { pe, o, oe, u, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { createHyperlink } from "../../utils/hyperlink.js";
import { getClaudeCodeMcpConfigs, doesEnterpriseMcpConfigExist, hasManagedMcpPolicy } from "../mcp/config.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { ge } from "../../utils/identity.js";
import { getGlobalConfig, customApiKeyResponsesOf } from "../../utils/config.js";
import { wt, uwr } from "../../remote/remoteMode.js";
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
import { Tte } from "../remoteManagedSettings/seating.js";
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
import { hasRelevanceSignals, matchRelevanceSignal, pMr } from "../../utils/plugins/pluginRelevance.js";
import { color } from "../../components/design-system/color.js";
import { wFs } from "./_new/tipRegistry.helpers-5nte.js";
import { getGhAuthStatus } from "../../utils/github/ghAuthStatus.js";
import { countConcurrentSessions, isBgSession } from "../../utils/concurrentSessions.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { isPluginInstalled } from "../../utils/plugins/installedPluginsManager.js";
import { loadMarkdownFilesCached } from "../../utils/markdownConfigLoader.js";
import { getCwd } from "../../utils/cwd.js";
import { bAt } from "../../utils/remoteFileState.js";
import { isDesktopCommandEnabled } from "../../commands/desktop/index.js";
import { getPlatform } from "../../utils/platform.js";
import { isClaudeAISubscriber, isMaxSubscriber, is1PApiCustomer } from "../../utils/auth.js";
import { hasComplianceTaint } from "../policyLimits/complianceTaints.js";
import { hasWorkflowSizeSetting, workflowSizeSetting } from "../../utils/workflowSizeGuideline.js";
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
import { Soe } from "./tipIds.js";
import { getShortcutDisplay } from "../../keybindings/shortcutFormat.js";
import { getWorktreeCount } from "../../utils/git.js";
import { colorCommand } from "../../commands/color/index.js";
import {
  getCurrentSessionAgentColor,
  isTranscriptPersistenceDisabled,
  isCustomTitleEnabled,
} from "../../utils/sessionStorage.js";
import { LEFT_ARROW, UP_ARROW, DOWN_ARROW } from "../../utils/permissions/autoModeRulesPrompt.js";
import { aze } from "../../utils/backgroundHandoff.js";
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
import { jwt } from "../../commands/c4eUpsell.js";
import { getDesktopUpsellConfig } from "../../components/DesktopUpsell/DesktopUpsellStartup.js";
import { Jme } from "../../skills/bundledSkillsGate.js";
import { DESIGN, LOOP, CODE_REVIEW } from "../../skills/bundled/bundledSkillNames.js";
import { isDesignSyncEnabled } from "../designSync/gates.js";
import { isArtifactToolEnabled } from "../artifacts/artifactToolGates.js";
import { getArtifactPublishStubDir } from "../../tools/ArtifactTool/constants.js";
import { commandPolicyGateAllows } from "../policyLimits/policyVerdicts.js";
import { CLOUD_SESSIONS_POLICY } from "../cloudSessions/cloudSessionsPolicy.js";
import { isWebSetupEnabled } from "../cloudSessions/webSetup.js";
import { ZV } from "../../commands/remote-setup/api.js";
import {
  isRemoteControlOfferable,
  getRemoteControlAtStartup,
  isRunningInRemoteEnvironment,
} from "../../bridge/bridgeGates.js";
import { getUntriedRemoteSurface, QTo } from "./remoteControlNudges.js";
import { Vvt, Kti } from "../../voice/voiceModeEnabled.js";
import { isAntBuild } from "../../utils/envUtils.js";
import { isFullscreenEnvEnabled, isAutoOffDecision, getFullscreenDecision } from "../../utils/fullscreen.js";
import { hasFullscreenBootFailures } from "../../utils/fullscreenBootGuard.js";
import { FOCUS_ON_TIP, FOCUS_TIP_MAX, TEACH_TIP_TEXT } from "./focusTips.js";
import { dFe } from "../../utils/focusMode.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { getOutputStyleConfig } from "../../constants/outputStyles.js";
import { B2n, pPo, zLr, fPo, uPo } from "../api/ultrareviewQuota.js";
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

//@ chunk-4t8fx0s8.js:13854-13907 sole-consumer
function w(e, n, s) {
  return e.some((r) => r !== n && getSessionsSinceTipShown(r) < s);
}
//@ chunk-4t8fx0s8.js:13907-14961 sole-consumer
var TENGU_ENUMERATED_LOCKET = "tengu_enumerated_locket",
  CONTENT_LINK_TIPS_2 = "content_link_tips",
  Se = ["docs", "article", "guide", "video"],
  ye = {
    docs: "Read the docs",
    article: "Read the article",
    guide: "Read the guide",
    video: "Watch the video",
  },
  x = ["claude.com", "code.claude.com", "claude.dev", "academy.claude.com"],
  we = [...x, "www.youtube.com"],
  ve = ["/docs/", "/resources/"],
  Ce = /^\?v=[\w-]+$/,
  ke = /^\/[\w./-]*$/,
  Re = /^(#[\w-]+)?$/,
  Ae = /\p{Cc}/u,
  Ie = DoctorLazy(() => pe(o(), oe()).nullable()),
  Ee = DoctorLazy(() =>
    u({
      url: o().refine((e) => {
        let parse = URL.parse(e);
        return (
          parse !== null &&
          !Ae.test(e) &&
          parse.protocol === "https:" &&
          we.includes(parse.hostname) &&
          ke.test(parse.pathname) &&
          !parse.pathname.includes("..") &&
          Re.test(parse.hash) &&
          (parse.hostname === "www.youtube.com"
            ? parse.pathname === "/watch" && Ce.test(parse.search)
            : parse.search === "" &&
              (parse.hostname !== "claude.com" || ve.some((s) => `${parse.pathname}/`.startsWith(s)))) &&
          parse.username === "" &&
          parse.password === "" &&
          parse.port === ""
        );
      }),
      label: U(Se),
    }).optional(),
  ),
  Oe = [
    "content-link-hooks",
    "content-link-mcp",
    "content-link-mods",
    "content-link-long-sessions",
    "content-link-auto-mode",
    "content-link-team-workflows",
  ],
  Pe = 5,
  Le = 20,
  Me = 3,
  Ne = 20,
  Ue = 10,
  De = 10,
  $e = 100,
  Fe = 150000;
/**
 * 支持超链接时，为提示文字追加从配置表取得的内容链接（白名单域名加 utm 参数），以"· 链接"形式附在句尾。
 */
//@ chunk-4t8fx0s8.js:14961-15343 sole-consumer
function appendContentLink(e, n, s) {
  let r = supportsHyperlinks() ? getContentLink(e, s.session.host) : void 0;
  if (r === void 0) return n;
  let a = new URL(r.url);
  if (x.includes(a.hostname))
    (a.searchParams.set("utm_source", "claude_code"),
      a.searchParams.set("utm_medium", "tip"),
      a.searchParams.set("utm_campaign", CONTENT_LINK_TIPS_2),
      a.searchParams.set("utm_content", e));
  let g = createHyperlink(a.toString(), ye[r.label], { themeName: s.theme });
  return `${n.replace(/\.$/, "")} \xB7 ${g}`;
}
/**
 * 提示注册表的宿主状态：缓存是否配置了 MCP 服务器（惰性读取一次），以及是否已报告过无效链接。
 */
//@ chunk-4t8fx0s8.js:15343-15787 sole-consumer
class TipHostState {
  mcpServersConfigured = void 0;
  invalidLinkReported = !1;
  get hasReadMcpServers() {
    return this.mcpServersConfigured !== void 0;
  }
  hasMcpServersConfigured(e) {
    return (
      (this.mcpServersConfigured ??= getClaudeCodeMcpConfigs({}, { storageV5: e }).then(
        ({ servers: servers }) => Object.keys(servers).length > 0,
      )),
      this.mcpServersConfigured
    );
  }
  claimInvalidLinkReport() {
    let e = !this.invalidLinkReported;
    return ((this.invalidLinkReported = !0), e);
  }
  forget() {
    ((this.mcpServersConfigured = void 0), (this.invalidLinkReported = !1));
  }
}
/**
 * 按宿主缓存的提示状态，以及一组"内容链接"提示（hooks、MCP、mods、长会话 /context、auto 模式、团队工作方式），各带触发条件。
 */
//@ chunk-4t8fx0s8.js:15787-17070 sole-consumer
var tipHostStateByHost = new HostScoped(() => ge(new TipHostState(), (e) => e.forget())),
  CONTENT_LINK_TIPS = [
    getRelevantTips({
      id: "content-link-hooks",
      text: "Run your own scripts on Claude Code events with hooks",
      isTriggered: () =>
        getGlobalConfig().numStartups > Ne &&
        !wt() &&
        !F() &&
        !isCustomizationDisabled("hooks") &&
        !shouldAllowManagedHooksOnly() &&
        !shouldDisableAllHooksIncludingManaged() &&
        !isRestrictedToPluginOnly("hooks"),
    }),
    getRelevantTips({
      id: "content-link-mcp",
      text: "Connect Claude to your tools and data with MCP",
      isTriggered: async (e) =>
        getGlobalConfig().numStartups > Ue &&
        !wt() &&
        !isCustomizationDisabled("mcpAutoDiscovered") &&
        !isRestrictedToPluginOnly("mcp") &&
        !doesEnterpriseMcpConfigExist() &&
        !hasManagedMcpPolicy() &&
        getEverConnectedClaudeAiMcpSet().size === 0 &&
        ![...(e.toolsUsed ?? [])].some((n) => mcpInfoFromString(n)) &&
        !(await tipHostStateByHost.of(e.session.host).hasMcpServersConfigured(e.storageV5)),
    }),
    getRelevantTips({
      id: "content-link-mods",
      text: "Change how Claude Code looks and behaves with a mod",
      isTriggered: () => {
        let e = getSettings_DEPRECATED(),
          n =
            e.statusLine !== void 0 ||
            F() ||
            Object.entries(e.enabledPlugins ?? {}).some(([r, a]) => Boolean(a) && !isBuiltinPluginId(r)),
          s = getSettingsForSource("policySettings")?.pluginConfigs?.[Tte]?.options?.allowManagedModsOnly;
        return n && !wt() && (s === void 0 || s === !1) && areHooksModulesActive();
      },
    }),
    getRelevantTips({
      id: "content-link-long-sessions",
      text: "Long session? Run /context to see what fills it",
      advertisedCommand: "context",
      isTriggered: () => getTotalInputTokens() + getTotalCacheCreationInputTokens() >= Fe,
    }),
    getRelevantTips({
      id: "content-link-auto-mode",
      text: "Skip most permission prompts with auto mode",
      isTriggered: () => getGlobalConfig().numStartups > De && !isAutoModeActive() && isAutoModeGateEnabled(),
    }),
    getRelevantTips({
      id: "content-link-team-workflows",
      text: "See how the Claude Code team works day to day",
      isTriggered: () => getGlobalConfig().numStartups > $e,
    }),
  ];
//@ chunk-4t8fx0s8.js:17070-17363 sole-consumer
function getContentLink(e, n) {
  let safeParse = Ie().safeParse(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_ENUMERATED_LOCKET, null)),
    safeParse_2 = Ee().safeParse(safeParse.data?.[e]);
  if (!safeParse.success || !safeParse_2.success) {
    if (
      (logForDebugging(`Ignoring an invalid content link for tip ${e}`, { level: "warn" }),
      tipHostStateByHost.of(n).claimInvalidLinkReport())
    )
      logFeatureSad("tips_content_link_table", safeParse.success ? "invalid_entry" : "invalid_table");
  }
  return safeParse_2.data;
}
//@ chunk-4t8fx0s8.js:17363-17420 sole-consumer
function F() {
  return Object.keys(getSettings_DEPRECATED().hooks ?? {}).length > 0;
}
//@ chunk-4t8fx0s8.js:17420-17661 fingerprint = getRelevantTips (0.417)
function getRelevantTips({
  id: id,
  text: text,
  advertisedCommand: advertisedCommand,
  isTriggered: isTriggered,
}) {
  return {
    id: id,
    cooldownSessions: Le,
    maxLifetimeShows: Me,
    advertisedCommand: advertisedCommand,
    content: async (a) => appendContentLink(id, text, a),
    isRelevant: async (a) =>
      supportsHyperlinks() &&
      (await isTriggered(a)) &&
      getContentLink(id, a.session.host) !== void 0 &&
      !w(Oe, id, Pe),
  };
}
//@ chunk-4t8fx0s8.js:17661-17689 layout
var MARKETPLACE_PLUGIN_TIP_PREFIX = "marketplace-plugin:";
/**
 * 提示系统的会话级缓存：已知市场、市场插件提示列表、会话数、桌面版是否安装、gh 登录状态与失败提示 id。
 */
//@ chunk-4t8fx0s8.js:17689-19564 layout
class TipSessionCache {
  knownMarketplaces = void 0;
  marketplacePluginTips = void 0;
  sessionCountInFlight = void 0;
  desktopInstalled = void 0;
  ghAuthStatus = void 0;
  failedTipIds = new Set();
  getKnownMarketplaces(e) {
    return ((this.knownMarketplaces ??= loadKnownMarketplacesSafe(e)), this.knownMarketplaces);
  }
  getMarketplacePluginTips(e) {
    return ((this.marketplacePluginTips ??= this.loadMarketplacePluginTips(e)), this.marketplacePluginTips);
  }
  async loadMarketplacePluginTips(e) {
    let n = new Set(getPluginSuggestionMarketplaces());
    if (n.size === 0) return [];
    return this.buildMarketplacePluginTips(n, await this.getKnownMarketplaces(e), e);
  }
  async buildMarketplacePluginTips(e, n, s) {
    let r = [];
    for (let a of e) {
      let g = n[a];
      if (!g) continue;
      if (a !== CLAUDE_PLUGINS_OFFICIAL && !isMarketplaceSourceDeclaredByPolicy(a, g.source)) {
        logForDebugging(
          `Skipping plugin suggestion tips for marketplace "${a}": its registered source is not declared in managed settings (extraKnownMarketplaces or strictKnownMarketplaces)`,
        );
        continue;
      }
      let S = await getMarketplaceCacheOnly(a, s).catch(() => null);
      if (!S) continue;
      for (let plugin of S.plugins) {
        let relevance = plugin.relevance,
          b = hasRelevanceSignals(plugin.name, relevance);
        if (!b) continue;
        if (a === CLAUDE_PLUGINS_OFFICIAL && externalTips.some((h) => h.id === `${plugin.name}-plugin`))
          continue;
        let D =
            relevance?.topic ??
            plugin.name
              .split("-")
              .map((h) => (h ? h.charAt(0).toUpperCase() + h.slice(1) : h))
              .join("-"),
          c =
            a === CLAUDE_PLUGINS_OFFICIAL
              ? `${MARKETPLACE_PLUGIN_TIP_PREFIX}${plugin.name}`
              : `${MARKETPLACE_PLUGIN_TIP_PREFIX}${plugin.name}@${a}`;
        r.push({
          id: c,
          pluginId: `${plugin.name}@${a}`,
          advertisedCommand: "plugin",
          priority: 1,
          providerAgnostic: !0,
          cooldownSessions: 3,
          content: async (h) => {
            let le = color("suggestion", h.theme);
            return `Working with ${D}? Install the ${plugin.name} plugin:
${le(`/plugin install ${plugin.name}@${a}`)}`;
          },
          isRelevant: async (h) => shouldSuggestOfficialPlugin(this, plugin.name, h, b, a),
        });
      }
    }
    return r;
  }
  getDesktopInstalled() {
    return ((this.desktopInstalled ??= wFs()), this.desktopInstalled);
  }
  getGhAuthStatus() {
    return ((this.ghAuthStatus ??= getGhAuthStatus({ allowNetworkFallbackForOldGh: !1 })), this.ghAuthStatus);
  }
  countSessionsOnce(e) {
    if (this.sessionCountInFlight !== void 0) return this.sessionCountInFlight;
    let n = countConcurrentSessions(e).finally(() => {
      if (this.sessionCountInFlight === n) this.sessionCountInFlight = void 0;
    });
    return ((this.sessionCountInFlight = n), n);
  }
}
//@ chunk-4t8fx0s8.js:19564-19588 layout
var tipRegistryStateByHost = new HostScoped(() => new TipSessionCache());
//@ chunk-4t8fx0s8.js:19588-19716 layout
function countSessionsCached(e) {
  if (isStorageV5Enabled() && e?.storageV5 !== void 0)
    return tipRegistryStateByHost.of(e.session.host).countSessionsOnce(e.storageV5);
  return countConcurrentSessions(e?.storageV5);
}
/**
 * 是否推荐安装某官方插件：官方市场已登记、插件未安装且未被托管设置管理、并有推荐理由。
 */
//@ chunk-4t8fx0s8.js:19716-19893 layout
async function shouldSuggestOfficialPlugin(e, n, s, r, a = CLAUDE_PLUGINS_OFFICIAL) {
  if (!(await e.getKnownMarketplaces(s.storageV5))[a]) return !1;
  if (isPluginInstalled(`${n}@${a}`)) return !1;
  if (isPluginBlockedByPolicy(`${n}@${a}`)) return !1;
  return (await matchRelevanceSignal(r, s)) !== null;
}
//@ chunk-4t8fx0s8.js:19893-20015 layout
async function hasUserDefinedCustomization(e, n) {
  try {
    return (await loadMarkdownFilesCached(e, getCwd(), n)).length > 0;
  } catch (error) {
    return (logForDebugging(`hasUserDefined(${e}) failed: ${error}`), !1);
  }
}
//@ chunk-4t8fx0s8.js:20015-20247 layout
var FRONTEND_FILE_PATTERN =
    /\.(html?|css|s[ac]ss|less|[jt]sx|vue|svelte|astro|png|jpe?g|gif|svg|webp|avif|ico)$/i,
  xe = new Set([
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
//@ chunk-4t8fx0s8.js:20247-20420 fingerprint = isMarketplacePluginRelevant (0.708)
function isMarketplacePluginRelevant(e) {
  let { bashTools: bashTools, readFileState: readFileState } = e ?? {};
  if (bashTools) {
    for (let r of bashTools) if (xe.has(r)) return !0;
  }
  if (readFileState) {
    let r = pMr();
    for (let a of bAt(readFileState)) if (FRONTEND_FILE_PATTERN.test(a) && !r(a)) return !0;
  }
  return !1;
}
//@ chunk-4t8fx0s8.js:20420-20464 affinity
var TIP_SHOW_LIMIT = 2,
  DESKTOP_IOS_SIMULATOR = "desktop-ios-simulator",
  X = 15,
  q = 5;
//@ chunk-4t8fx0s8.js:20464-20620 sole-consumer
function isIosSimulatorTipRelevant(e) {
  if (!isDesktopCommandEnabled() || getPlatform() !== "macos") return !1;
  if (!isClaudeAISubscriber() || hasComplianceTaint("hipaa")) return !1;
  if (!e.devIntents?.has("ios_app")) return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_magical_pixel", !1);
}
//@ chunk-4t8fx0s8.js:20620-20751 sole-consumer
function enterpriseOnlyNote(e) {
  return `available in Claude for Enterprise \xB7 ${createHyperlink("https://clau.de/enterprise", "Learn more", { themeName: e.theme })}`;
}
//@ chunk-4t8fx0s8.js:20751-20824 sole-consumer
var Z = 15,
  Be = ["c4e-desktop", "c4e-remote-sessions", "c4e-ultrareview"],
  He = 5;
//@ chunk-4t8fx0s8.js:20824-20856 sole-consumer
function M(e) {
  return w(Be, e, He);
}
//@ chunk-4t8fx0s8.js:20856-20931 sole-consumer
var Ge = ["workflow-size-prompting", "workflow-size-prompting-ambient"],
  Ve = 12;
//@ chunk-4t8fx0s8.js:20931-20963 sole-consumer
function J(e) {
  return w(Ge, e, Ve);
}
//@ chunk-4t8fx0s8.js:20963-21022 sole-consumer
var ze = ["artifact-publish-plan", "artifact-duplicate"],
  je = 5;
//@ chunk-4t8fx0s8.js:21022-21055 sole-consumer
function ee(e) {
  return w(ze, e, je);
}
//@ chunk-4t8fx0s8.js:21055-21070 sole-consumer
var te = 10,
  ne = 4;
//@ chunk-4t8fx0s8.js:21070-21139 sole-consumer
function se() {
  return hasWorkflowSizeSetting() || workflowSizeSetting(getGlobalConfig().workflowSizeGuideline) !== void 0;
}
//@ chunk-4t8fx0s8.js:21260-21283 sole-consumer
function Lo() {
  return externalTips;
}
//@ chunk-4t8fx0s8.js:21283-21306 sole-consumer
function Mo() {
  return A;
}
//@ chunk-4t8fx0s8.js:21306-21338 sole-consumer
function No() {
  return [...externalTips, ...A];
}
//@ chunk-4t8fx0s8.js:21338-21405 sole-consumer
function Uo(e) {
  return externalTips.some((n) => n.id === e) || A.some((n) => n.id === e);
}
/**
 * 判断提示要推广的内置命令在当前会话是否可用（远程模式下先按远程过滤）；找不到命令时，非远程视为可用。
 */
//@ chunk-4t8fx0s8.js:21405-21649 sole-consumer
async function isAdvertisedCommandAvailable(e) {
  let { filterCommandsForRemoteMode: filterCommandsForRemoteMode, getBuiltinCommands: getBuiltinCommands } =
      await import("./chunk-aeccp9b6.js"),
    r = wt(),
    filtered = (r ? filterCommandsForRemoteMode(getBuiltinCommands()) : getBuiltinCommands()).filter(
      (S) => S.name === e || S.aliases?.includes(e),
    );
  if (filtered.length === 0) return !r;
  return filtered.some((S) => meetsAvailabilityRequirement(S) && isCommandEnabled(S));
}
/**
 * 内置提示表（约 70 条）：每条有 id、content（可异步生成）、cooldownSessions、isRelevant 判定，涵盖 plan 模式、worktree、/memory、终端设置、桌面版、远程控制等。
 */
//@ chunk-4t8fx0s8.js:21649-44371 fingerprint = externalTips (0.568)
var externalTips = [
    {
      id: "team-artifacts",
      priority: 4,
      content: async (e) => {
        let n = await listUnseenTeamArtifacts(e.session, e.storageV5).catch(
          (s) => (
            logFeatureSad(
              "tips_team_artifact_show",
              s instanceof Error ? "content_scan_error" : "content_unknown_error",
            ),
            []
          ),
        );
        if (n.length === 0) return "";
        return (
          logTeamArtifactTipShown(n),
          markTeamArtifactsSeen(e.session, e.storageV5),
          formatTeamArtifactTip(n)
        );
      },
      cooldownSessions: 1,
      isRelevant: async (e) => hasUnseenTeamArtifacts(e.session, e.storageV5),
    },
    {
      id: "fotw-campaign",
      priority: 4,
      content: async () => {
        let e = parsePromoCampaign();
        if (!e?.command) return "";
        let n = promoCreditAmount();
        if (!n) return "";
        let s = formatCurrency(n.amountMinorUnits, n.currency, "fit"),
          r = e.tipBlurb ? `/${e.command} ${e.tipBlurb}` : `/${e.command}`,
          a = e.tips?.[Soe("fotw-campaign") % e.tips.length] ?? "";
        if (a) return `${a} Try it for ${s} in usage credits.`;
        return `${e.titleLabel ?? "Feature of the week:"} ${r}. Try it for ${s} in usage credits.`;
      },
      cooldownSessions: 1,
      isRelevant: async () => canClaimPromoCredit(),
    },
    {
      id: "fotw-campaign-upsell",
      priority: 4,
      content: async () => {
        let e = parsePromoCampaign();
        if (!e?.command) return "";
        let n = e.tips?.[Soe("fotw-campaign-upsell") % e.tips.length] ?? "";
        if (n) return n;
        let s = e.tipBlurb ? `/${e.command} ${e.tipBlurb}` : `/${e.command}`;
        return `${e.titleLabel ?? "Feature of the week:"} ${s}.`;
      },
      cooldownSessions: 1,
      isRelevant: async () => shouldShowPromoUpsell(),
    },
    {
      id: "powerup-onboarding",
      priority: 3,
      providerAgnostic: !0,
      content: async (e) =>
        `New to Claude Code? Run ${color("suggestion", e.theme)("/powerup")} for a quick interactive tutorial`,
      cooldownSessions: 1,
      async isRelevant() {
        let e = getGlobalConfig();
        if (e.numStartups >= 10) return !1;
        if (e.powerupsUnlocked?.length) return !1;
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_alder_compass", !1);
      },
    },
    {
      id: "new-user-warmup",
      priority: 2,
      providerAgnostic: !0,
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
      providerAgnostic: !0,
      content: async (e) =>
        appendContentLink(
          "plan-mode-for-complex-tasks",
          `Use Plan Mode to prepare for a complex request before making changes. Press ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} twice to enable.`,
          e,
        ),
      cooldownSessions: 5,
      isRelevant: async () => {
        let e = getGlobalConfig();
        return (e.lastPlanModeUse ? (Date.now() - e.lastPlanModeUse) / 86400000 : 1 / 0) > 7;
      },
    },
    {
      id: "default-permission-mode-config",
      providerAgnostic: !0,
      advertisedCommand: "config",
      content: async () => "Use /config to change your default permission mode (including Plan Mode)",
      cooldownSessions: 10,
      isRelevant: async () => {
        try {
          let e = getGlobalConfig(),
            n = getSettings_DEPRECATED(),
            s = Boolean(e.lastPlanModeUse),
            r = Boolean(n?.permissions?.defaultMode);
          return s && !r;
        } catch (error) {
          return (
            logForDebugging(`Failed to check default-permission-mode-config tip relevance: ${error}`, {
              level: "warn",
            }),
            !1
          );
        }
      },
    },
    {
      id: "git-worktrees",
      providerAgnostic: !0,
      content: async (e) =>
        appendContentLink(
          "git-worktrees",
          "Use git worktrees to run multiple Claude sessions in parallel.",
          e,
        ),
      cooldownSessions: 10,
      isRelevant: async () => {
        try {
          let e = getGlobalConfig();
          return (await getWorktreeCount()) <= 1 && e.numStartups > 50;
        } catch (error) {
          return !1;
        }
      },
    },
    {
      id: "color-when-multi-clauding",
      providerAgnostic: !0,
      content: async () =>
        "Running multiple Claude sessions? Use /color and /rename to tell them apart at a glance.",
      cooldownSessions: 10,
      isRelevant: async (e) => {
        if (colorCommand.isHidden) return !1;
        if (getCurrentSessionAgentColor()) return !1;
        return (await countSessionsCached(e)) >= 2;
      },
    },
    {
      id: "agents-view-multiclauding",
      priority: 3,
      providerAgnostic: !0,
      maxLifetimeShows: 5,
      cooldownSessions: 1,
      content: async (e) => {
        let n = color("suggestion", e.theme);
        return appendContentLink(
          "agents-view-multiclauding",
          `Running multiple Claude sessions? Press ${n(LEFT_ARROW)} on an empty prompt to see them all in one place`,
          e,
        );
      },
      isRelevant: async (e) => {
        if (!aze()) return !1;
        if (isTranscriptPersistenceDisabled()) return !1;
        let n = getGlobalConfig();
        if (n.leftArrowOpensAgents === !1) return !1;
        if (isBgSession()) return !1;
        if (n.hasOpenedAgentsView || n.hasUsedAgentsFleet) return !1;
        return (await countSessionsCached(e)) >= 2;
      },
    },
    {
      id: "terminal-setup",
      providerAgnostic: !0,
      content: async () =>
        env.terminal === "Apple_Terminal"
          ? "Run /terminal-setup to enable convenient terminal integration like Option + Enter for new line and more"
          : "Run /terminal-setup to enable convenient terminal integration like Shift + Enter for new line and more",
      cooldownSessions: 10,
      async isRelevant() {
        if (!shouldOfferTerminalSetup()) return !1;
        let e = getGlobalConfig();
        if (env.terminal === "Apple_Terminal") return !e.optionAsMetaKeyInstalled;
        return !e.shiftEnterKeyBindingInstalled;
      },
    },
    {
      id: "vscode-gpu-accel-garbled-glyphs",
      providerAgnostic: !0,
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
      providerAgnostic: !0,
      content: async () =>
        env.terminal === "Apple_Terminal"
          ? "Press Option+Enter to send a multi-line message"
          : "Press Shift+Enter to send a multi-line message",
      cooldownSessions: 10,
      async isRelevant() {
        let e = getGlobalConfig();
        return Boolean(
          (env.terminal === "Apple_Terminal"
            ? e.optionAsMetaKeyInstalled
            : e.shiftEnterKeyBindingInstalled) && e.numStartups > 3,
        );
      },
    },
    {
      id: "shift-enter-setup",
      providerAgnostic: !0,
      content: async () =>
        env.terminal === "Apple_Terminal"
          ? "Run /terminal-setup to enable Option+Enter for new lines"
          : "Run /terminal-setup to enable Shift+Enter for new lines",
      cooldownSessions: 10,
      async isRelevant() {
        if (!shouldOfferTerminalSetup()) return !1;
        let e = getGlobalConfig();
        return !(env.terminal === "Apple_Terminal"
          ? e.optionAsMetaKeyInstalled
          : e.shiftEnterKeyBindingInstalled);
      },
    },
    {
      id: "memory-command",
      providerAgnostic: !0,
      content: async (e) =>
        appendContentLink("memory-command", "Use /memory to view and manage Claude memory", e),
      cooldownSessions: 15,
      advertisedCommand: "memory",
      async isRelevant() {
        return getGlobalConfig().memoryUsageCount <= 0;
      },
    },
    {
      id: "theme-command",
      providerAgnostic: !0,
      content: async () => "Use /theme to change the color theme",
      cooldownSessions: 20,
      isRelevant: async () => !0,
    },
    {
      id: "colorterm-truecolor",
      providerAgnostic: !0,
      content: async () => "Try setting environment variable COLORTERM=truecolor for richer colors",
      cooldownSessions: 30,
      isRelevant: async () => !env.COLORTERM && sequential.level < 3,
    },
    {
      id: "powershell-tool-env",
      providerAgnostic: !0,
      content: async () => "Set CLAUDE_CODE_USE_POWERSHELL_TOOL=1 to enable the PowerShell tool (preview)",
      cooldownSessions: 10,
      isRelevant: async () =>
        getPlatform() === "windows" && process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL === void 0,
    },
    {
      id: "status-line",
      providerAgnostic: !0,
      content: async (e) =>
        appendContentLink(
          "status-line",
          "Use /statusline to set up a custom status line that will display beneath the input box",
          e,
        ),
      cooldownSessions: 25,
      advertisedCommand: "statusline",
      isRelevant: async () =>
        !shouldAllowManagedHooksOnly() && getSettings_DEPRECATED().statusLine === void 0,
    },
    {
      id: "prompt-queue",
      providerAgnostic: !0,
      content: async () => "Hit Enter to queue up additional messages while Claude is working.",
      cooldownSessions: 5,
      async isRelevant() {
        return getGlobalConfig().promptQueueUseCount <= 3;
      },
    },
    {
      id: "enter-to-steer-in-relatime",
      providerAgnostic: !0,
      content: async () => "Send messages to Claude while it works to steer Claude in real-time",
      cooldownSessions: 20,
      isRelevant: async () => !0,
    },
    {
      id: "vscode-command-install",
      providerAgnostic: !0,
      content: async () =>
        `Open the Command Palette (Cmd+Shift+P) and run "Shell Command: Install '${env.terminal === "vscode" ? "code" : env.terminal}' command in PATH" to enable IDE integration`,
      cooldownSessions: 0,
      async isRelevant() {
        if (!getNativeCSIuTerminalDisplayName_2()) return !1;
        if (getPlatform() !== "macos") return !1;
        switch (env.terminal) {
          case "vscode":
            return !(await isVSCodeInstalled());
          case "cursor":
            return !(await isCursorInstalled());
          case "windsurf":
            return !(await isWindsurfInstalled());
          default:
            return !1;
        }
      },
    },
    {
      id: "ide-upsell-external-terminal",
      providerAgnostic: !0,
      advertisedCommand: "ide",
      content: async () => "Connect Claude to your IDE \xB7 /ide",
      cooldownSessions: 4,
      async isRelevant() {
        if (isSupportedTerminal()) return !1;
        if ((await getSortedIdeLockfiles()).length !== 0) return !1;
        return (await getRunningIDEsCached()).length > 0;
      },
    },
    {
      id: "install-github-app",
      content: async (e) =>
        appendContentLink(
          "install-github-app",
          "Run /install-github-app to tag @claude right from your Github issues and PRs",
          e,
        ),
      cooldownSessions: 10,
      advertisedCommand: "install-github-app",
      async isRelevant() {
        if (getGlobalConfig().githubActionSetupCount) return !1;
        let e = getCachedRemoteHost(),
          n = e ? getGitHostKind(e) : null;
        return n !== "gitlab" && n !== "bitbucket";
      },
    },
    {
      id: "install-slack-app",
      content: async (e) =>
        appendContentLink("install-slack-app", "Run /install-slack-app to use Claude in Slack", e),
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
      isRelevant: async (e) => {
        try {
          if (!isClaudeAISubscriber()) return !1;
          if (getGlobalConfig().slackAppInstallCount) return !1;
          let { servers: servers } = await getClaudeCodeMcpConfigs({}, { storageV5: e?.storageV5 });
          return Object.keys(servers).some((s) => s.toLowerCase().includes("slack"));
        } catch (error) {
          return !1;
        }
      },
    },
    {
      id: "permissions",
      providerAgnostic: !0,
      content: async (e) =>
        appendContentLink(
          "permissions",
          "Use /permissions to pre-approve and pre-deny bash, edit, and MCP tools",
          e,
        ),
      cooldownSessions: 10,
      advertisedCommand: "permissions",
      async isRelevant() {
        return getGlobalConfig().numStartups > 10 && !wt();
      },
    },
    {
      id: "drag-and-drop-images",
      providerAgnostic: !0,
      content: async () => "Did you know you can drag and drop image files into your terminal?",
      cooldownSessions: 10,
      isRelevant: async () => !env.isSSH(),
    },
    {
      id: "paste-images-mac",
      providerAgnostic: !0,
      content: async () => "Paste images into Claude Code using control+v (not cmd+v!)",
      cooldownSessions: 10,
      isRelevant: async () => getPlatform() === "macos",
    },
    {
      id: "double-esc",
      providerAgnostic: !0,
      content: async () => "Double-tap esc to rewind the conversation to a previous point in time",
      cooldownSessions: 10,
      isRelevant: async () => !fileHistoryEnabled() && (!wt() || uwr()),
    },
    {
      id: "double-esc-code-restore",
      providerAgnostic: !0,
      content: async (e) =>
        appendContentLink(
          "double-esc-code-restore",
          "Double-tap esc to rewind the code and/or conversation to a previous point in time",
          e,
        ),
      cooldownSessions: 10,
      isRelevant: async () => fileHistoryEnabled(),
    },
    {
      id: "continue",
      providerAgnostic: !0,
      content: async () => "Run claude --continue or claude --resume to resume a conversation",
      cooldownSessions: 10,
      isRelevant: async () => !0,
    },
    {
      id: "rename-conversation",
      providerAgnostic: !0,
      content: async () => "Name your conversations with /rename to find them easily in /resume later",
      cooldownSessions: 15,
      isRelevant: async () => isCustomTitleEnabled() && getGlobalConfig().numStartups > 10,
    },
    {
      id: "custom-commands",
      providerAgnostic: !0,
      content: async (e) =>
        appendContentLink(
          "custom-commands",
          "Create skills by adding .md files to .claude/skills/ in your project or ~/.claude/skills/ for skills that work in any project",
          e,
        ),
      cooldownSessions: 15,
      async isRelevant(e) {
        let n = getGlobalConfig();
        return (
          !isCustomizationDisabled("skills") &&
          n.numStartups > 10 &&
          !(await hasUserDefinedCustomization("skills", e?.storageV5))
        );
      },
    },
    {
      id: "shift-tab",
      providerAgnostic: !0,
      async content(e) {
        let n = UNBIND_EXAMPLE() ?? "shift+tab";
        return appendContentLink(
          "shift-tab",
          `Hit ${n} to cycle between manual mode, auto-accept edit mode, and plan mode`,
          e,
        );
      },
      cooldownSessions: 10,
      async isRelevant() {
        if (getIsNonInteractiveSession()) return !1;
        return UNBIND_EXAMPLE() !== null;
      },
    },
    {
      id: "image-paste",
      providerAgnostic: !0,
      content: async () =>
        `Use ${getShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v")} to paste images from your clipboard`,
      cooldownSessions: 20,
      isRelevant: async () => !0,
    },
    {
      id: "effort-step-keys",
      providerAgnostic: !0,
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
      providerAgnostic: !0,
      content: async (e) =>
        appendContentLink(
          "agent-flag",
          "Use --agent <agent_name> to directly start a conversation with a subagent",
          e,
        ),
      cooldownSessions: 15,
      async isRelevant(e) {
        let n = getGlobalConfig();
        return (
          !isCustomizationDisabled("agents") &&
          n.numStartups > 5 &&
          (await hasUserDefinedCustomization("agents", e?.storageV5))
        );
      },
    },
    {
      id: "desktop-app",
      advertisedCommand: "desktop",
      content: async (e) =>
        `Run Claude Code locally or remotely using the Claude desktop app \xB7 run ${color("suggestion", e.theme)("/desktop")}`,
      cooldownSessions: 15,
      isRelevant: async (e) =>
        isDesktopCommandEnabled() &&
        !jwt() &&
        !(await tipRegistryStateByHost.of(e.session.host).getDesktopInstalled()),
    },
    {
      id: "desktop-third-party",
      providerAgnostic: !0,
      content: async (e) =>
        `Run Claude Code in the Claude desktop app with your cloud provider or LLM gateway \xB7 ${createHyperlink("https://clau.de/desktop-3p", "clau.de/desktop-3p", { themeName: e.theme })}`,
      cooldownSessions: 15,
      isRelevant: async (e) =>
        isDesktopCommandEnabled() &&
        isThirdPartyProvider() &&
        !(await tipRegistryStateByHost.of(e.session.host).getDesktopInstalled()),
    },
    {
      id: "desktop-shortcut",
      advertisedCommand: "desktop",
      content: async (e) =>
        `Continue your session in Claude Code Desktop with ${color("suggestion", e.theme)("/desktop")}`,
      cooldownSessions: 15,
      isRelevant: async () => isDesktopCommandEnabled() && getDesktopUpsellConfig().enable_shortcut_tip,
    },
    {
      id: "desktop-contextual",
      advertisedCommand: "desktop",
      priority: 1,
      content: async (e) => {
        let n = color("suggestion", e.theme);
        if (await tipRegistryStateByHost.of(e.session.host).getDesktopInstalled())
          return `Working on UI? See a live preview in Claude Code Desktop \xB7 run ${n("/desktop")}`;
        return `Working on UI? Claude Code Desktop has live preview and inline images \xB7 ${n("clau.de/desktop")}`;
      },
      cooldownSessions: 15,
      isRelevant: async (e) => {
        if (!isDesktopCommandEnabled()) return !1;
        if (!getDesktopUpsellConfig().enable_contextual_tip) return !1;
        if (!isMarketplacePluginRelevant(e)) return !1;
        return !(
          isIosSimulatorTipRelevant(e) &&
          getSessionsSinceTipShown(DESKTOP_IOS_SIMULATOR) >= X &&
          Soe(DESKTOP_IOS_SIMULATOR) < q
        );
      },
    },
    {
      id: DESKTOP_IOS_SIMULATOR,
      advertisedCommand: "desktop",
      priority: 1,
      content: async (e) =>
        `In Claude Code Desktop, each session gets its own iOS Simulator pane, where Claude tests your app, fixes what it finds, and checks again. \xB7 run ${color("suggestion", e.theme)("/desktop")}`,
      cooldownSessions: X,
      maxLifetimeShows: q,
      isRelevant: async (e) => isIosSimulatorTipRelevant(e),
    },
    {
      id: "claude-design-contextual",
      priority: 1,
      content: async (e) =>
        `Use Claude Design to mock up screens before you build \xB7 ${createHyperlink("https://claude.ai/design?utm_source=claude_code&utm_medium=tip&utm_campaign=tengu_cedar_plume", "claude.ai/design", { themeName: e.theme })}`,
      cooldownSessions: 15,
      isRelevant: async (e) => {
        if (!isClaudeAISubscriber()) return !1;
        if (!isMarketplacePluginRelevant(e)) return !1;
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_cedar_plume", !1);
      },
    },
    {
      id: "claude-design-command",
      advertisedCommand: "design",
      priority: 1,
      content: async (e) =>
        `Working on UI? Run ${color("suggestion", e.theme)("/design")} to mock up a few directions before you build`,
      cooldownSessions: 15,
      isRelevant: async (e) => {
        if (!isMarketplacePluginRelevant(e)) return !1;
        if (Jme(DESIGN)) return !1;
        let n = await import("./chunk-ykkf1x45.js");
        if (n.isArtifactTypeAliasEnabled() && !n.orgAllowsArtifactTypeAlias(n.DESIGN_TYPE_ALIAS)) return !1;
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
        !ee("artifact-publish-plan") && isArtifactToolEnabled() && getArtifactPublishStubDir() === null,
    },
    {
      id: "artifact-duplicate",
      priority: 3,
      maxLifetimeShows: 5,
      cooldownSessions: 5,
      content: async () =>
        "See an artifact you'd like to build on? Duplicate, in its title menu, gives you your own editable copy.",
      isRelevant: async () =>
        !ee("artifact-duplicate") && isArtifactToolEnabled() && getArtifactPublishStubDir() === null,
    },
    {
      id: "web-app",
      content: async () => "Run tasks in the cloud while you keep coding locally \xB7 clau.de/web",
      cooldownSessions: 15,
      isRelevant: async () => !jwt() && commandPolicyGateAllows(CLOUD_SESSIONS_POLICY.policy),
    },
    {
      id: "web-setup-github",
      advertisedCommand: "web-setup",
      priority: 1,
      cooldownSessions: te,
      maxLifetimeShows: ne,
      content: async (e) =>
        `Run ${color("suggestion", e.theme)("/web-setup")} to use cloud sessions with the GitHub account gh is signed in to`,
      isRelevant: async (e) => {
        if (getIsNonInteractiveSession() || !isClaudeAISubscriber() || !isWebSetupEnabled()) return !1;
        let n = getCachedRemoteHost(),
          s = n ? getGitHostKind(n) : null;
        if (s === "gitlab" || s === "bitbucket") return !1;
        if (Soe("web-setup-github") >= ne || getSessionsSinceTipShown("web-setup-github") < te) return !1;
        if ((await tipRegistryStateByHost.of(e.session.host).getGhAuthStatus()).status !== "authenticated")
          return !1;
        return ZV.of(e.session.host).peek(e.credentials, e.storageV5) === "not_connected";
      },
    },
    {
      id: "remote-control",
      content: async (e) => {
        let n = color("suggestion", e.theme);
        return `Control this session from ${createHyperlink("https://claude.com/download#mobile", "the Claude mobile app", { themeName: e.theme })} \xB7 run ${n("/remote-control")}`;
      },
      cooldownSessions: 15,
      isRelevant: async () =>
        isRemoteControlOfferable() && !getGlobalConfig().hasUsedRemoteControl && !getRemoteControlAtStartup(),
    },
    {
      id: "remote-control-next-surface",
      content: async (e) => {
        let [n, s, r] =
          getUntriedRemoteSurface() === "web"
            ? ["https://claude.ai/code", "claude.ai/code", " on any browser"]
            : ["https://claude.com/download#mobile", "the Claude mobile app", ""];
        return `You can also drive this session from ${createHyperlink(n, s, { themeName: e.theme })}${r}`;
      },
      cooldownSessions: 15,
      maxLifetimeShows: 3,
      isRelevant: async () => {
        if (!isRemoteControlOfferable() || !getRemoteControlAtStartup()) return !1;
        if (getUntriedRemoteSurface() === void 0) return !1;
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_maple_rung", !1);
      },
    },
    {
      id: "push-notif",
      content: async (e) =>
        `Get pinged on your phone when long tasks finish \xB7 enable push notifications in ${color("suggestion", e.theme)("/config")}`,
      cooldownSessions: 15,
      isRelevant: async () => QTo(),
    },
    {
      id: "voice-mode",
      content: async () => "Use /voice to enable push-to-talk dictation",
      cooldownSessions: 10,
      advertisedCommand: "voice",
      isRelevant: async () =>
        Vvt() && !Kti(getInitialSettings_2()) && !isAntBuild() && !env.CLAUDE_CODE_REMOTE && !env.isSSH(),
    },
    {
      id: "no-flicker",
      providerAgnostic: !0,
      content: async () =>
        "Try the new fullscreen renderer \u2014 flicker-free output, mouse support, auto-copy on select \xB7 /tui fullscreen",
      cooldownSessions: 10,
      advertisedCommand: "tui",
      isRelevant: async () =>
        !isFullscreenEnvEnabled() &&
        getInitialSettings_2().tui === void 0 &&
        !hasFullscreenBootFailures() &&
        !isAutoOffDecision(getFullscreenDecision()),
    },
    {
      id: "focus-view",
      providerAgnostic: !0,
      content: async () => FOCUS_ON_TIP,
      cooldownSessions: Z,
      advertisedCommand: "focus",
      isRelevant: async (e) => {
        if (!isFullscreenEnvEnabled() || getInitialSettings_2().viewMode !== void 0 || dFe()) return !1;
        if (getInitialSettings_2().spinnerTipsEnabled === !1 || getSessionsSinceTipShown("focus-view") < Z)
          return !1;
        switch (getFeatureValue_CACHED_MAY_BE_STALE("tengu_linear_fog", "off")) {
          case "holdout":
            return !1;
          case "after_long_turn":
            return (e.lastTurnToolUseCount ?? 0) >= FOCUS_TIP_MAX;
          default:
            return !0;
        }
      },
    },
    {
      id: "explanatory-output-style",
      priority: 1,
      providerAgnostic: !0,
      content: async () => TEACH_TIP_TEXT,
      cooldownSessions: 15,
      maxLifetimeShows: 3,
      advertisedCommand: "config",
      isRelevant: async (e) =>
        (e.explanationRequestCount ?? 0) >= TIP_SHOW_LIMIT &&
        !wt() &&
        isSettingSourceEnabled("localSettings") &&
        getSettingsForSource("flagSettings")?.outputStyle === void 0 &&
        getSettingsForSource("policySettings")?.outputStyle === void 0 &&
        (await getOutputStyleConfig()) === null,
    },
    {
      id: "console-api-key",
      content: async (e) =>
        `Build your AI product with Claude API. Run ${color("suggestion", e.theme)("/claude-api")} to get started`,
      cooldownSessions: 15,
      isRelevant: async () => {
        if (!isClaudeAISubscriber() || !isMaxSubscriber()) return !1;
        let e = getGlobalConfig();
        if (e.primaryApiKey) return !1;
        if (customApiKeyResponsesOf(e).approved.length > 0) return !1;
        if (env.ANTHROPIC_API_KEY) return !1;
        if (e.numStartups <= 10) return !1;
        return getFeatureValue_CACHED_MAY_BE_STALE("tengu_kestrel_arch", "off") === "on";
      },
    },
    {
      id: "c4e-desktop",
      content: async (e) =>
        `Run Claude Code locally or remotely using the Claude desktop app \u2014 ${enterpriseOnlyNote(e)}`,
      cooldownSessions: 15,
      isRelevant: async () => {
        if (!jwt() || M("c4e-desktop")) return !1;
        return isDesktopCommandEnabled();
      },
    },
    {
      id: "c4e-remote-sessions",
      content: async (e) =>
        `Run tasks in the cloud while you keep coding locally \u2014 ${enterpriseOnlyNote(e)}`,
      cooldownSessions: 15,
      isRelevant: async () => jwt() && !M("c4e-remote-sessions"),
    },
    {
      id: "c4e-ultrareview",
      content: async (e) =>
        `/ultrareview runs a deep, multi-agent review of your changes \u2014 ${enterpriseOnlyNote(e)}`,
      cooldownSessions: 15,
      advertisedCommand: "ultrareview",
      isRelevant: async () => jwt() && !M("c4e-ultrareview"),
    },
    {
      id: "ultrareview-awareness",
      priority: 1,
      cooldownSessions: 8,
      content: async (e) => {
        let n = color("suggestion", e.theme),
          s = B2n(),
          r = s !== null && s.reviews_remaining > 0 ? ` \u2014 ${pPo(s.reviews_remaining)}` : "";
        return `Run ${n("/ultrareview")} for a cloud-based multi-agent review that finds and verifies bugs in your branch${r}`;
      },
      isRelevant: async (e) => {
        if (!zLr("startup_tip")) return !1;
        if (fPo()) return !1;
        return (uPo(e.credentials), !0);
      },
    },
    {
      id: "opusplan-mode-reminder",
      providerAgnostic: !0,
      content: async () =>
        `Your default model setting is Opus Plan Mode. Press ${getShortcutDisplay("chat:cycleMode", "Chat", "shift+tab")} twice to activate Plan Mode and plan with Claude Opus.`,
      cooldownSessions: 2,
      async isRelevant() {
        let e = getGlobalConfig(),
          s = getUserSpecifiedModelSetting() === "opusplan",
          r = e.lastPlanModeUse ? (Date.now() - e.lastPlanModeUse) / 86400000 : 1 / 0;
        return s && r > 3;
      },
    },
    {
      id: "frontend-design-plugin",
      priority: 1,
      providerAgnostic: !0,
      content: async (e) => `Working with HTML/CSS? Install the frontend-design plugin:
${color("suggestion", e.theme)(`/plugin install frontend-design@${CLAUDE_PLUGINS_OFFICIAL}`)}`,
      cooldownSessions: 3,
      maxLifetimeShows: 3,
      advertisedCommand: "plugin",
      isRelevant: async (e) =>
        shouldSuggestOfficialPlugin(tipRegistryStateByHost.of(e.session.host), "frontend-design", e, {
          filesRead: ["**/*.html", "**/*.css", "**/*.htm"],
        }),
    },
    YOU_SHOULD_KNOW_PLUGIN_TIP,
    {
      id: "subagent-fanout-nudge",
      providerAgnostic: !0,
      content: async (e) =>
        `Say ${color("suggestion", e.theme)('"fan out subagents"')} and Claude sends a team. Each one digs deep so nothing gets missed.`,
      cooldownSessions: 3,
      isRelevant: async () => !isClaudeAISubscriber(),
    },
    {
      id: "workflow-size-prompting",
      providerAgnostic: !0,
      advertisedCommand: "config",
      priority: 1,
      content: async (e) => {
        let n = color("suggestion", e.theme);
        return `You can control how big a workflow is just by prompting. Try ${n('"use a small workflow, 5 agents max"')}, or set a default with ${n("Dynamic workflow size")} in ${n("/config")}.`;
      },
      cooldownSessions: 5,
      isRelevant: async (e) =>
        isWorkflowsAvailable() &&
        !se() &&
        (e?.toolsUsed?.has(WORKFLOW_TOOL_NAME) ?? !1) &&
        !J("workflow-size-prompting"),
    },
    {
      id: "workflow-size-prompting-ambient",
      providerAgnostic: !0,
      advertisedCommand: "config",
      content: async (e) => {
        let n = color("suggestion", e.theme);
        return `You can control how big a workflow is just by prompting. Ask for a small workflow, cap it with ${n('"use at most 5 agents"')}, or set a default with ${n("Dynamic workflow size")} in ${n("/config")}.`;
      },
      cooldownSessions: 12,
      isRelevant: async (e) =>
        isWorkflowsAvailable() &&
        !se() &&
        !(e?.toolsUsed?.has(WORKFLOW_TOOL_NAME) ?? !1) &&
        !J("workflow-size-prompting-ambient"),
    },
    {
      id: "loop-command-nudge",
      providerAgnostic: !0,
      content: async (e) =>
        `${color("suggestion", e.theme)(`/${LOOP}`)} runs any prompt on a recurring schedule. Great for monitoring deploys, babysitting PRs, or polling status.`,
      cooldownSessions: 3,
      isRelevant: async () => {
        if (isRunningInRemoteEnvironment()) return !1;
        if (!isKairosCronEnabled()) return !1;
        return !isClaudeAISubscriber();
      },
    },
    {
      id: "code-review-low-fast",
      providerAgnostic: !0,
      content: async (e) => {
        let n = color("suggestion", e.theme);
        return appendContentLink(
          "code-review-low-fast",
          `For a fast, cheap code review, try ${n("/code-review low")}. It runs the built-in skill at its lightest effort level.`,
          e,
        );
      },
      cooldownSessions: 8,
      isRelevant: async () => {
        let e = getGlobalConfig().skillUsage ?? {};
        return Object.keys(e).some((n) => {
          if (n === CODE_REVIEW) return !1;
          return n
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .includes("codereview");
        });
      },
    },
    {
      id: "plugin-disuse-review",
      providerAgnostic: !0,
      advertisedCommand: "plugin",
      content: async (e) => {
        let n = color("suggestion", e.theme),
          s = await computeDisusedPlugins(),
          r = s[0];
        if (!r) return "";
        if (s.length === 1)
          return `You haven't used the ${sequential.bold(r.name)} plugin lately. Disable it with ${n("/plugin")} to free up context and speed up startup.`;
        return `You have ${s.length} plugins you haven't used lately. Disable them with ${n("/plugin")} to free up context and speed up startup.`;
      },
      cooldownSessions: 30,
      isRelevant: async () => (await computeDisusedPlugins()).length > 0,
    },
    {
      id: "goal-command-nudge",
      content: async (e) => {
        let n = color("suggestion", e.theme);
        return appendContentLink(
          "goal-command-nudge",
          `Set an objective with ${n("/goal")} \u2014 Claude keeps working until it's met`,
          e,
        );
      },
      cooldownSessions: 3,
      isRelevant: async () => is1PApiCustomer(),
    },
    {
      id: "guest-passes",
      content: async (e) => {
        let n = color("claude", e.theme),
          s = getCachedReferrerReward();
        return s
          ? `Share Claude Code and earn ${n(formatMinorUnits(s))} in usage credits \xB7 ${n("/passes")}`
          : `You have free guest passes to share \xB7 ${n("/passes")}`;
      },
      cooldownSessions: 3,
      isRelevant: async () => {
        if (getGlobalConfig().hasVisitedPasses) return !1;
        let { eligible: eligible } = checkCachedPassesEligibility();
        return eligible;
      },
    },
    {
      id: "feedback-command",
      content: async () => "Use /feedback to help us improve!",
      cooldownSessions: 15,
      async isRelevant() {
        if (!isFeedbackAllowed()) return !1;
        return getGlobalConfig().numStartups > 5;
      },
    },
    {
      id: "team-onboarding-share",
      advertisedCommand: "team-onboarding",
      content: async (e) =>
        `Run ${color("suggestion", e.theme)("/team-onboarding")} to turn your Claude usage into an onboarding guide \u2014 share it with your team in one link`,
      cooldownSessions: 5,
      async isRelevant() {
        let e = getGlobalConfig();
        if (e.numStartups < 15) return !1;
        if (e.teamOnboardingLastUsedAt !== void 0 && Date.now() - e.teamOnboardingLastUsedAt < 2592000000)
          return !1;
        return isTeamOnboardingShareEnabled();
      },
    },
    ...CONTENT_LINK_TIPS,
  ],
  A = [];
//@ chunk-4t8fx0s8.js:44371-44645 layout
async function isTipRelevantSafe(e, n) {
  let s = "tip advertisedCommand check threw";
  try {
    if (e.advertisedCommand !== void 0 && !(await isAdvertisedCommandAvailable(e.advertisedCommand)))
      return !1;
    return ((s = "tip isRelevant threw"), await e.isRelevant(n));
  } catch (error) {
    return (
      tipRegistryStateByHost.of(n.session.host).failedTipIds.add(e.id),
      logError(withTelemetryMessage(toError(error), s)),
      !1
    );
  }
}
//@ chunk-4t8fx0s8.js:44645-45162 file-local
async function getCustomTips(e) {
  let of = tipRegistryStateByHost.of(e.session.host),
    { tips: tips, trustedCount: trustedCount } = await loadCustomTips(e.session.host),
    filtered = tips.filter((c) => getSessionsSinceTipShown(c.id) >= c.cooldownSessions);
  if (trustedCount > 0 && excludesDefaultTips()) return filtered;
  let g = [...externalTips, ...A, ...(await of.getMarketplacePluginTips(e.storageV5))],
    S = !isFirstPartyApiBackend(),
    filtered_2 = g.filter((c) => !of.failedTipIds.has(c.id)),
    k = S ? filtered_2.filter((c) => c.providerAgnostic) : filtered_2,
    results = await Promise.all(k.map((c) => isTipRelevantSafe(c, e)));
  return [
    ...k
      .filter((content, h) => results[h])
      .filter((c) => getSessionsSinceTipShown(c.id) >= c.cooldownSessions)
      .filter((c) => c.maxLifetimeShows === void 0 || Soe(c.id) < c.maxLifetimeShows),
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
      return !0;
    case "anthropicAws":
    case "anthropicGoogleCloud":
      return !1;
    case "firstParty":
      return !isFirstPartyAnthropicBaseUrl();
  }
}
