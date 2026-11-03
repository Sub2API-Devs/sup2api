/**
 * utils/statusNoticeDefinitions.tsx
 *
 * 状态提示定义：同时存在两种认证方式、JetBrains 插件等启动提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/statusNoticeDefinitions.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-ag5x7vhf.js (33)
 * attribution: fingerprint 2, placement 32
 */
import { relative, sep } from "path";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { isSafeMode, getSafeModeExitHint, isEnvTruthy } from "./envUtils.js";
import { r, Fragment, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { StatusRow } from "../components/Settings/Status.js";
import { hasPolicySettings } from "./plugins/managedPluginSeating.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { capitalize, plural } from "./stringUtils.js";
import { gl } from "./cwd.js";
import {
  getLargeMemoryFiles,
  getOversizedMemoryWarning,
  getMaxMemoryFileChars,
  getWithheldInstructionFiles,
} from "./claudemd.js";
import { formatNumber, formatTokens } from "./format.js";
import { isClaudeMdLoadingDisabled } from "./settings/customizationDisabled.js";
import { fjt, withheldInstructionNotice, yfn } from "./instructionFileAccess.js";
import {
  getAuthTokenSource,
  isClaudeAISubscriber,
  getAnthropicApiKeyWithSourceSafe,
  getApiKeyFromConfigOrMacOSKeychain,
  describeHowToDisableAuthTokenSource,
} from "./auth.js";
import { getAgentDescriptionsTotalTokens } from "./statusNoticeHelpers.js";
import { nm, needsAuthNoticeServers, Qr } from "../components/LogoV2/LogoV2.js";
import { getModelSourceAnnotation } from "./model/modelDisplay.js";
import { MIGRATIONS } from "../hooks/notifs/useModelMigrationNotifications.js";
import { ModelSourceNotice, InfoNotice, oauthExpiryWarning } from "../components/LogoV2/Notices.js";
import { don, messagingSocketUnavailableReason } from "./messagingSocket/setup.js";
import { formatModelRestrictedNotice, displayModelName } from "./model/validateModel.js";
import { MODEL_WINDOW_DOCS_URL, MODEL_CONFIG_DOCS_URL } from "../services/compact/unknownModelNotice.js";
import { uniq } from "./collections.js";
import { hasComplianceTaint, POLICY_LIMITED_NOTICE } from "../services/policyLimits/complianceTaints.js";
import { getRemoteSettingsLoadState, describeFetchFailure } from "../services/cloudSessions/eligibility.js";
import { DRt } from "../services/policyLimits/cacheStamp.js";
import { isDebugMode, isDebugToStdErr, getDebugLogPath } from "./debug.js";
import { env } from "./env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isBridgeEnabled } from "../bridge/bridgeEntitlement.js";
import { isPolicyLimitsCacheLoaded } from "../services/policyLimits/policyEvidence.js";
import { getRemoteControlPolicyVerdict } from "../bridge/bridgeGates.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { at, Dt } from "../components/LogoV2/CondensedLogo.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { getClaudeAiBaseUrl } from "../constants/product.js";
import { getOnboardingShownThisSession, getAllowedChannels } from "../bootstrap/state.js";
import { resolvePowerupDiscoveryArm, POWERUP_DISCOVERY_COPY } from "../commands/powerup/discoveryCopy.js";
import { isEmergencyTipShown, getTipOfFeed, EmergencyTip } from "../components/LogoV2/EmergencyTip.js";
import { ChannelsNotice } from "../components/LogoV2/ChannelsNotice.js";
import {
  AUTO_MODE_DEFAULT,
  shouldShowAutoDefaultNotice,
} from "../components/LogoV2/AutoModeDefaultNotice.js";
import { AutoModeDefaultNotice } from "../components/CustomSelect/select.js";
import {
  hasCompanyAnnouncements,
  CompanyAnnouncementNotice,
  shouldShowGuestPassesUpsell,
  GuestPassesNotice,
} from "../components/LogoV2/GuestPassesUpsell.js";
import {
  SAVED_MODEL_SUCCESSOR,
  savedModelSuccessor,
  isModelSuccessorNoticeHidden,
  shouldShowModelSuccessorNotice,
  ModelSuccessorNotice,
} from "../components/LogoV2/ModelSuccessorNotice.js";
import { getShortcutDisplay } from "../keybindings/shortcutFormat.js";
import { pickStartupAnnouncement } from "../services/startupAnnouncements.js";
import {
  parsePromoCampaign,
  canClaimPromoCredit,
  shouldShowPromoUpsell,
} from "../services/api/featureOfTheWeek.js";
import { Sl, FeatureOfTheWeekNotice } from "../components/LogoV2/FeatureOfTheWeekNudge.js";
import { StartupAnnouncementNotice } from "../components/LogoV2/StartupAnnouncement.js";
import {
  PROMO_CREDIT_NOTICE_ID,
  shouldShowPromoCreditNotice,
  PromoCreditNotice,
  SubscriptionSwitchNotice,
} from "../components/LogoV2/PromoNotices.js";
import { tHr, ZLr } from "./subscriptionNoticeIds.js";
import { shouldShowCeMigrateNotice, CeMigrateNotice } from "../components/LogoV2/CeMigrateNotice.js";
import {
  API_CREDIT_LINK,
  Fm,
  getApiCreditLinkText,
  shouldSuppressApiCreditLinkNotice,
  isPassesEligibleBeforeLaunch,
  ApiCreditLinkNotice,
} from "../components/LogoV2/ApiCreditLinkNotice.js";
import { arePromoOffersAllowed } from "./planTiers.js";
import { Xj } from "./sessionRestore.js";
import { isActingAsBgJob, isUnattendedInteractiveSession } from "./concurrentSessions.js";
import {
  isFullscreenDownsellActive,
  FullscreenDownsellNotice,
} from "../components/LogoV2/FullscreenDownsell.js";
import { createRoot } from "../ink.js";
import { announcementState } from "../services/announcements/announcementState.js";
import { j, Se, P } from "../../vendor/react/cjs/react.production.js";
import { gM } from "../state/AppState.js";
import { useTerminalViewport } from "../ink/components/Input.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { markSecurityWarningsSeen } from "./permissions/securityWarnings.js";

//@ chunk-ag5x7vhf.js:96305-96352 placement
function oauthExpiryWarningText() {
  return logFeatureOk("oauth_expiry_warning");
}
//@ chunk-ag5x7vhf.js:96352-96426 placement
function logPowerupDiscoveryShown() {
  return logEvent("tengu_powerup_discovery_shown", { arm: fromEnum("banner") });
}
//@ chunk-ag5x7vhf.js:96426-96973 placement
var NOTICE_PRIORITIES = { org: 30, launch: 20, campaign: 15, promo: 10, hint: 5 },
  J0 = {
    id: "safe-mode",
    tier: "warning",
    type: "warning",
    isActive: () => isSafeMode(),
    render: () =>
      r(Fragment, {
        children: [
          r(StatusRow, {
            status: "warning",
            children: [
              "Safe mode: all customizations are disabled (CLAUDE.md, skills, plugins, hooks, MCP, agents, and more)",
              hasPolicySettings() &&
                r(Fragment, {
                  children: [
                    " \xB7 ",
                    "managed hooks and settings policy from your organization still apply; managed plugins, skills, CLAUDE.md, and MCP servers do not",
                  ],
                }),
            ],
          }),
          e(Box, {
            paddingLeft: 2,
            children: e(Text, {
              dimColor: !0,
              children: `${capitalize(getSafeModeExitHint())} to re-enable`,
            }),
          }),
        ],
      }),
  },
  Q0 = [];
//@ chunk-ag5x7vhf.js:96973-97006 placement
function _S(m) {
  return toDisplayPath(m.path);
}
//@ chunk-ag5x7vhf.js:97006-97115 placement
function toDisplayPath(m) {
  let h = gl(),
    x = h !== null && m.startsWith(h) ? relative(h, m) : m;
  return x === ".." || x.startsWith(`..${sep}`) ? m : x;
}
/**
 * 启动提示定义表（large-memory-files、safe-mode、emergency-tip、channels、prompt-caching-disabled、debug-mode 等）。
 */
//@ chunk-ag5x7vhf.js:97115-105242 placement
var LARGE_MEMORY_FILES_NOTICE = {
    id: "large-memory-files",
    tier: "warning",
    type: "warning",
    isActive: (m) =>
      getLargeMemoryFiles(m.memoryFiles).length > 0 || getOversizedMemoryWarning(m.memoryFiles) !== null,
    render: (m) => {
      let h = getLargeMemoryFiles(m.memoryFiles),
        x = getMaxMemoryFileChars(),
        T = getOversizedMemoryWarning(m.memoryFiles);
      return r(Fragment, {
        children: [
          T &&
            r(StatusRow, {
              status: "warning",
              children: [
                r(Text, { bold: !0, children: [T.summary.fileCount, " instruction files"] }),
                " add up to ",
                formatNumber(T.summary.totalChars),
                " chars, over the",
                " ",
                formatNumber(T.summary.totalLimitChars),
                "-char total limit \xB7 largest:",
                " ",
                T.largest.map((k) => `${_S(k)} (${formatNumber(k.content.length)})`).join(", "),
                e(Text, { dimColor: !0, children: " \xB7 /memory to free up context" }),
              ],
            }),
          h.map((k) =>
            r(
              StatusRow,
              {
                status: "warning",
                children: [
                  e(Text, { bold: !0, children: _S(k) }),
                  " is over the",
                  " ",
                  formatNumber(x),
                  "-char limit (",
                  formatNumber(k.content.length),
                  " chars)",
                  e(Text, { dimColor: !0, children: " \xB7 /memory to free up context" }),
                ],
              },
              k.path,
            ),
          ),
        ],
      });
    },
  },
  eI = {
    id: "withheld-memory-files",
    tier: "warning",
    type: "warning",
    isActive: (m) => !isClaudeMdLoadingDisabled() && getWithheldInstructionFiles(m.session).length > 0,
    render: (m) => {
      let h = fjt(getWithheldInstructionFiles(m.session));
      return r(Fragment, {
        children: [
          h.shown.map(({ path: path, why: why }) => {
            let k = withheldInstructionNotice(why, toDisplayPath(path));
            return r(
              Box,
              {
                flexDirection: "column",
                children: [
                  e(StatusRow, { status: "warning", children: k.lead }),
                  r(Box, {
                    paddingLeft: 2,
                    flexDirection: "row",
                    children: [
                      e(Box, { flexShrink: 0, marginRight: 1, children: e(Text, { children: k.mark }) }),
                      e(Text, { bold: !0, wrap: "truncate-start", children: k.path }),
                    ],
                  }),
                ],
              },
              path,
            );
          }),
          h.more > 0 && e(StatusRow, { status: "warning", children: yfn(h) }),
        ],
      });
    },
  },
  tI = {
    id: "claude-ai-external-token",
    tier: "warning",
    type: "warning",
    isActive: () => {
      let m = getAuthTokenSource();
      return isClaudeAISubscriber() && (m.source === "ANTHROPIC_AUTH_TOKEN" || m.source === "apiKeyHelper");
    },
    render: () => {
      let m = getAuthTokenSource();
      return e(Box, {
        marginTop: 1,
        children: r(StatusRow, {
          status: "warning",
          children: [
            m.source,
            " overriding Claude subscription login",
            e(Text, { dimColor: !0, children: " \xB7 unset it or /logout to sign it out" }),
          ],
        }),
      });
    },
  },
  oI = {
    id: "api-key-conflict",
    tier: "warning",
    type: "warning",
    isActive: () => {
      let { source: source } = getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 });
      return (
        !!getApiKeyFromConfigOrMacOSKeychain() &&
        (source === "ANTHROPIC_API_KEY" || source === "apiKeyHelper")
      );
    },
    render: () => {
      let { source: source } = getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 });
      return e(Box, {
        marginTop: 1,
        children: r(StatusRow, {
          status: "warning",
          children: [
            source,
            " overriding saved Console key",
            e(Text, { dimColor: !0, children: " \xB7 unset it or /logout to clear the saved key" }),
          ],
        }),
      });
    },
  },
  nI = {
    id: "both-auth-methods",
    tier: "warning",
    type: "warning",
    isActive: () => {
      let { source: source } = getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }),
        h = getAuthTokenSource();
      return (
        source !== "none" &&
        h.source !== "none" &&
        !(source === "apiKeyHelper" && h.source === "apiKeyHelper")
      );
    },
    render: () => {
      let { source: source } = getAnthropicApiKeyWithSourceSafe({ skipRetrievingKeyFromApiKeyHelper: !0 }),
        h = getAuthTokenSource();
      return r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          r(StatusRow, {
            status: "warning",
            children: ["Both ", h.source, " and ", source, " set \xB7 auth may not work as expected"],
          }),
          r(Box, {
            flexDirection: "column",
            paddingLeft: 2,
            children: [
              r(Text, {
                dimColor: !0,
                children: [
                  "\xB7 to use",
                  " ",
                  h.source === "claude.ai" ? "claude.ai" : h.source,
                  ":",
                  " ",
                  source === "ANTHROPIC_API_KEY"
                    ? 'Unset the ANTHROPIC_API_KEY environment variable, or claude /logout then say "No" to the API key approval before login.'
                    : source === "apiKeyHelper"
                      ? "Unset the apiKeyHelper setting."
                      : "claude /logout",
                ],
              }),
              r(Text, {
                dimColor: !0,
                children: ["\xB7 to use ", source, ":", " ", describeHowToDisableAuthTokenSource(h.source)],
              }),
            ],
          }),
        ],
      });
    },
  },
  rI = {
    id: "large-agent-descriptions",
    tier: "warning",
    type: "warning",
    isActive: (m) => getAgentDescriptionsTotalTokens(m.agentDefinitions) > nm,
    render: (m) => {
      let h = getAgentDescriptionsTotalTokens(m.agentDefinitions);
      return r(StatusRow, {
        status: "warning",
        children: [
          "Agent descriptions are over the",
          " ",
          formatNumber(nm),
          "-token limit (~",
          formatNumber(h),
          " tokens)",
          r(Text, {
            dimColor: !0,
            children: [" ", "\xB7 ask Claude to trim agent descriptions in .claude/agents/"],
          }),
        ],
      });
    },
  },
  sI = {
    id: "model-source",
    tier: "info",
    type: "info",
    isActive: (m) => m.modelRestrictedWarning === null && (getModelSourceAnnotation() !== "" || MIGRATIONS()),
    render: () => e(ModelSourceNotice, {}),
  },
  aI = {
    id: "mcp-needs-auth",
    tier: "warning",
    type: "warning",
    isActive: (m) => m.mcpNeedsAuthCount > 0,
    render: (m) =>
      r(StatusRow, {
        status: "warning",
        children: [
          m.mcpNeedsAuthCount,
          " MCP",
          " ",
          plural(m.mcpNeedsAuthCount, "server needs", "servers need"),
          " ",
          "authentication",
          e(Text, { dimColor: !0, children: " \xB7 run /mcp" }),
        ],
      }),
  },
  cI = {
    id: "cross-session-messaging-off",
    tier: "warning",
    type: "warning",
    isActive: (m) => don.of(m.session.host).lastStartFailureCause === "socket_dir_refused",
    render: (m) =>
      r(StatusRow, {
        status: "warning",
        children: [
          "Cross-session messaging is off:",
          " ",
          messagingSocketUnavailableReason(don.of(m.session.host)) ??
            "its socket directory could not be set up",
          r(Text, {
            dimColor: !0,
            children: [
              " ",
              "\xB7 restart with --debug-file ",
              "<path>",
              " to write a debug log explaining why",
            ],
          }),
        ],
      }),
  },
  uI = {
    id: "model-deprecation",
    tier: "warning",
    type: "warning",
    isActive: (m) => m.modelDeprecationWarning !== null,
    render: (m) =>
      m.modelDeprecationWarning === null
        ? null
        : r(StatusRow, {
            status: "warning",
            children: [
              m.modelDeprecationWarning.message,
              r(Text, { dimColor: !0, children: [" \xB7 ", m.modelDeprecationWarning.action] }),
            ],
          }),
  },
  dI = {
    id: "model-restricted",
    tier: "warning",
    type: "warning",
    isActive: (m) => m.modelRestrictedWarning !== null,
    render: (m) =>
      m.modelRestrictedWarning === null
        ? null
        : e(StatusRow, {
            status: "warning",
            children: formatModelRestrictedNotice(
              m.modelRestrictedWarning.requested,
              m.modelRestrictedWarning.effective,
            ),
          }),
  },
  mI = {
    id: "model-unrecognized",
    tier: "warning",
    type: "warning",
    isActive: (m) => m.unknownModelWindowWarning !== null,
    render: (m) =>
      m.unknownModelWindowWarning === null
        ? null
        : r(StatusRow, {
            status: "warning",
            children: [
              `Model "${displayModelName(m.unknownModelWindowWarning.model)}" isn't recognized`,
              r(Text, {
                dimColor: !0,
                children: [
                  " \xB7 ",
                  "context assumed to be",
                  " ",
                  formatTokens(m.unknownModelWindowWarning.window),
                  " tokens \xB7 update Claude Code, or see",
                  " ",
                  e(Link, {
                    url: MODEL_WINDOW_DOCS_URL,
                    fallback: MODEL_CONFIG_DOCS_URL,
                    children: "the docs",
                  }),
                ],
              }),
            ],
          }),
  },
  pI = {
    id: "auto-compact-window-env",
    tier: "warning",
    type: "warning",
    isActive: (m) => m.autoCompactWindowEnvWarning !== null,
    render: (m) =>
      m.autoCompactWindowEnvWarning === null
        ? null
        : e(StatusRow, { status: "warning", children: m.autoCompactWindowEnvWarning }),
  },
  fI = {
    id: "unusable-managed-mcp",
    tier: "warning",
    type: "warning",
    isActive: (m) => m.unusableManagedMcpConfigMessage !== null,
    render: (m) =>
      m.unusableManagedMcpConfigMessage === null
        ? null
        : e(StatusRow, { status: "warning", children: m.unusableManagedMcpConfigMessage }),
  },
  gI = {
    id: "sandbox-denies-on-another-host",
    tier: "warning",
    type: "warning",
    isActive: (m) => m.sandboxDeniesOnAnotherHostCount > 0,
    render: (m) =>
      r(StatusRow, {
        status: "warning",
        children: [
          m.sandboxDeniesOnAnotherHostCount,
          " sandbox deny",
          " ",
          plural(m.sandboxDeniesOnAnotherHostCount, "path"),
          " on another computer",
          " ",
          plural(m.sandboxDeniesOnAnotherHostCount, "is", "are"),
          " not enforced",
          e(Text, { dimColor: !0, children: " \xB7 /status for details" }),
        ],
      }),
  },
  hI = {
    id: "security-warnings",
    tier: "warning",
    type: "warning",
    isActive: (m) => m.securityWarnings.length > 0,
    render: (m) =>
      e(Fragment, {
        children: uniq(m.securityWarnings.map((securityWarning) => securityWarning.text)).map((h) =>
          e(StatusRow, { status: "warning", children: h }, h),
        ),
      }),
  },
  yI = {
    id: "hipaa-compliance",
    tier: "warning",
    type: "info",
    isActive: () => hasComplianceTaint("hipaa"),
    render: () =>
      r(StatusRow, {
        status: "info",
        children: [POLICY_LIMITED_NOTICE, e(Text, { dimColor: !0, children: " \xB7 /status for details" })],
      }),
  },
  bI = {
    id: "remote-managed-settings-failed",
    tier: "warning",
    type: "warning",
    isActive: () => {
      let m = getRemoteSettingsLoadState();
      return m?.state === "failed" || m?.state === "stale_cache";
    },
    render: () => {
      let m = getRemoteSettingsLoadState();
      if (m?.state !== "failed" && m?.state !== "stale_cache") return null;
      let h = describeFetchFailure(m.failure.errorKind, m.failure.httpStatus);
      return r(StatusRow, {
        status: "warning",
        children: [
          "Remote managed settings failed to load (",
          h,
          ")",
          m.state === "stale_cache"
            ? m.transportEnvWithheld
              ? " \xB7 using cached policy (proxy/CA/provider env withheld)"
              : " \xB7 using cached policy"
            : m.restrictionsOnly
              ? " \xB7 the cached policy's restrictions still apply"
              : " \xB7 no remote policy applied",
          e(Text, { dimColor: !0, children: " \xB7 /status for details" }),
        ],
      });
    },
  },
  SI = {
    id: "monitoring-notice",
    tier: "warning",
    type: "info",
    isActive: () => DRt() !== null,
    render: () => {
      let m = DRt();
      if (!m) return null;
      return r(StatusRow, {
        status: "info",
        children: [
          m.text,
          m.url
            ? r(Text, {
                dimColor: !0,
                children: [" \xB7 ", e(Link, { url: m.url, fallback: m.url, children: "learn more" })],
              })
            : null,
        ],
      });
    },
  },
  wI = {
    id: "debug-mode",
    tier: "info",
    type: "info",
    isActive: () => isDebugMode(),
    render: () =>
      r(InfoNotice, {
        children: [
          "Debug mode enabled \xB7 logging to",
          " ",
          isDebugToStdErr() ? "stderr" : getDebugLogPath(),
        ],
      }),
  },
  xI = {
    id: "tmux-session",
    tier: "info",
    type: "info",
    isActive: () => !!env.CLAUDE_CODE_TMUX_SESSION,
    render: () =>
      r(InfoNotice, {
        children: [
          "tmux session: ",
          env.CLAUDE_CODE_TMUX_SESSION,
          " \xB7 detach with",
          " ",
          env.CLAUDE_CODE_TMUX_PREFIX_CONFLICTS
            ? `${env.CLAUDE_CODE_TMUX_PREFIX} ${env.CLAUDE_CODE_TMUX_PREFIX} d (press prefix twice - Claude uses ${env.CLAUDE_CODE_TMUX_PREFIX})`
            : `${env.CLAUDE_CODE_TMUX_PREFIX} d`,
        ],
      }),
  },
  REMOTE_CONTROL_AUTO_ON = "remote-control-auto-on",
  US = 3;
//@ chunk-ag5x7vhf.js:105242-105456 placement
function shouldShowRemoteControlAutoOnNotice(m) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_harbor_notice", !0)) return !1;
  if (!m.replBridgeAutoOnByDefault) return !1;
  if (!isBridgeEnabled()) return !1;
  if (!isPolicyLimitsCacheLoaded()) return !1;
  if (getRemoteControlPolicyVerdict() !== "allowed") return !1;
  return (getGlobalConfig().seenNotifications?.[REMOTE_CONTROL_AUTO_ON] ?? 0) < US;
}
//@ chunk-ag5x7vhf.js:105456-105590 placement
function markRemoteControlAutoOnSeen(m) {
  saveGlobalConfig((h) => {
    let x = h.seenNotifications ?? {},
      T = x[REMOTE_CONTROL_AUTO_ON] ?? 0;
    if (T >= US) return h;
    return { ...h, seenNotifications: { ...x, [REMOTE_CONTROL_AUTO_ON]: T + 1 } };
  }, m);
}
/**
 * 登录即将过期时显示的状态行：剩余天数与 /login 续期提示。
 */
//@ chunk-ag5x7vhf.js:105693-106018 placement
function OAuthExpiryStatusRow() {
  let m = w(2);
  at("oauth-expiry", oauthExpiryWarningText);
  let h, x;
  if (m[0] === MEMO_CACHE_SENTINEL) {
    x = EARLY_RETURN_SENTINEL;
    k: {
      let T = oauthExpiryWarning();
      if (!T) {
        x = null;
        break k;
      }
      h = r(StatusRow, {
        status: "warning",
        children: [
          "Your login expires in ",
          T.daysLeft,
          " ",
          plural(T.daysLeft, "day"),
          e(Text, { dimColor: !0, children: " \xB7 run /login to renew" }),
        ],
      });
    }
    ((m[0] = h), (m[1] = x));
  } else ((h = m[0]), (x = m[1]));
  if (x !== EARLY_RETURN_SENTINEL) return x;
  return h;
}
//@ chunk-ag5x7vhf.js:106018-106161 fingerprint = jetbrainsPluginNotice (0.336)
var jetbrainsPluginNotice = {
  id: REMOTE_CONTROL_AUTO_ON,
  tier: "info",
  type: "info",
  claimsFirstShow: () => (getGlobalConfig().seenNotifications?.[REMOTE_CONTROL_AUTO_ON] ?? 0) === 0,
  isActive: (m) => shouldShowRemoteControlAutoOnNotice(m),
  render: (m) => e(RemoteControlAutoOnNotice, { ctx: m }),
};
/**
 * 远程控制默认开启提示：说明可在手机/桌面应用或 claude.ai 查看进度和回复会话，要只留在本终端可运行 /remote-control；挂载时记一次已看到。
 */
//@ chunk-ag5x7vhf.js:106161-106973 placement
function RemoteControlAutoOnNotice(m) {
  let $ = w(10),
    { ctx: ctx } = m,
    { storageV5: storageV5 } = ctx,
    markSeen;
  if ($[0] !== storageV5)
    ((markSeen = () => markRemoteControlAutoOnSeen(storageV5)), ($[0] = storageV5), ($[1] = markSeen));
  else markSeen = $[1];
  at(REMOTE_CONTROL_AUTO_ON, markSeen);
  let I;
  if ($[2] !== ctx.replBridgeSessionUrl)
    ((I = ctx.replBridgeSessionUrl ?? `${getClaudeAiBaseUrl()}/code`),
      ($[2] = ctx.replBridgeSessionUrl),
      ($[3] = I));
  else I = $[3];
  let sessionUrl = I,
    title;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((title = e(Text, { bold: !0, children: "Keep working from anywhere" })), ($[4] = title));
  else title = $[4];
  let link;
  if ($[5] !== sessionUrl)
    ((link = e(Text, {
      color: "text",
      children: e(Link, { url: sessionUrl, fallback: sessionUrl, children: "claude.ai" }),
    })),
      ($[5] = sessionUrl),
      ($[6] = link));
  else link = $[6];
  let commandText;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((commandText = e(Text, { color: "text", children: "/remote-control" })), ($[7] = commandText));
  else commandText = $[7];
  let content;
  if ($[8] !== link)
    ((content = r(Box, {
      flexDirection: "column",
      children: [
        title,
        r(Text, {
          dimColor: !0,
          children: [
            "Check progress or reply to any session from the mobile app, desktop app, or",
            " ",
            link,
            ". To keep a session in this terminal only, run",
            " ",
            commandText,
          ],
        }),
      ],
    })),
      ($[8] = link),
      ($[9] = content));
  else content = $[9];
  return content;
}
//@ chunk-ag5x7vhf.js:106973-107086 placement
var POWERUP_DISCOVERY_NOTICE = {
  id: "powerup-discovery",
  tier: "info",
  type: "info",
  isActive: () => getOnboardingShownThisSession() && resolvePowerupDiscoveryArm() === "banner",
  render: () => e(PowerupDiscoveryNotice, {}),
};
//@ chunk-ag5x7vhf.js:107086-107214 placement
function PowerupDiscoveryNotice() {
  let m = w(1);
  at("powerup-discovery", logPowerupDiscoveryShown);
  let h;
  if (m[0] === MEMO_CACHE_SENTINEL)
    ((h = e(InfoNotice, { children: POWERUP_DISCOVERY_COPY.banner })), (m[0] = h));
  else h = m[0];
  return h;
}
//@ chunk-ag5x7vhf.js:107214-109962 placement
var EMERGENCY_TIP_NOTICE = {
    id: "emergency-tip",
    tier: "warning",
    type: "warning",
    isActive: () => isEmergencyTipShown(getTipOfFeed()),
    render: () => e(EmergencyTip, {}),
  },
  II = {
    id: "channels",
    tier: "info",
    type: "info",
    isActive: () => getAllowedChannels().length > 0,
    render: () => e(ChannelsNotice, {}),
  },
  EI = {
    id: "prompt-caching-disabled",
    tier: "warning",
    type: "warning",
    isActive: () => promptCachingDisabledVars().length > 0,
    render: () => {
      let m = promptCachingDisabledVars();
      return r(StatusRow, {
        status: "warning",
        children: [
          "Prompt caching off (",
          m.join(", "),
          "), requests will be slower and cost more",
          e(Text, { dimColor: !0, children: " \xB7 unset it to re-enable" }),
        ],
      });
    },
  },
  DI = {
    id: AUTO_MODE_DEFAULT,
    tier: "announcement",
    type: "info",
    promo: !1,
    priority: NOTICE_PRIORITIES.org,
    claimsFirstShow: () => shouldShowAutoDefaultNotice("auto"),
    isActive: () => shouldShowAutoDefaultNotice("auto"),
    render: () => e(AutoModeDefaultNotice, {}),
  },
  AI = {
    id: "company-announcement",
    tier: "announcement",
    type: "info",
    promo: !1,
    priority: NOTICE_PRIORITIES.org,
    isActive: () => hasCompanyAnnouncements(),
    render: () => e(CompanyAnnouncementNotice, {}),
  },
  NI = {
    id: SAVED_MODEL_SUCCESSOR,
    tier: "announcement",
    type: "info",
    promo: !1,
    priority: NOTICE_PRIORITIES.promo,
    showAccentBar: () => !1,
    releasesSlot: () => savedModelSuccessor() === void 0,
    heldOut: () => isModelSuccessorNoticeHidden(),
    isActive: (m) => {
      let h = m.isLaunchPromptPending() ? void 0 : savedModelSuccessor();
      return (
        h !== void 0 &&
        shouldShowModelSuccessorNotice(h) &&
        getShortcutDisplay("chat:defaultToNewerModel", "Chat", "ctrl+y") !== ""
      );
    },
    render: () => e(ModelSuccessorNotice, {}),
  },
  PI = {
    id: "startup-announcement",
    tier: "announcement",
    type: "info",
    promo: !1,
    priority: NOTICE_PRIORITIES.launch,
    isActive: () =>
      pickStartupAnnouncement(!1) !== void 0 &&
      !(parsePromoCampaign()?.isTopPriorityAnnouncement === !0 && Sl()),
    showAccentBar: () => pickStartupAnnouncement(!1)?.accentBar !== !1,
    render: () => e(StartupAnnouncementNotice, {}),
  },
  OI = {
    id: PROMO_CREDIT_NOTICE_ID,
    tier: "announcement",
    type: "info",
    promo: !1,
    priority: NOTICE_PRIORITIES.campaign,
    isActive: (m) => shouldShowPromoCreditNotice(m.session),
    render: () => e(PromoCreditNotice, {}),
  },
  UI = {
    id: "fotw-nudge",
    tier: "announcement",
    type: "info",
    promo: !1,
    priority: NOTICE_PRIORITIES.campaign,
    isActive: () => Sl(),
    render: () => e(FeatureOfTheWeekNotice, {}),
  },
  BI = {
    id: "cc-ce-migrate",
    tier: "announcement",
    type: "info",
    promo: !0,
    maxImpressions: tHr,
    priority: NOTICE_PRIORITIES.campaign,
    isActive: () => shouldShowCeMigrateNotice(),
    render: () => e(CeMigrateNotice, {}),
  },
  FI = {
    id: API_CREDIT_LINK,
    tier: "announcement",
    type: "info",
    promo: !0,
    maxImpressions: Fm,
    priority: NOTICE_PRIORITIES.promo,
    releasesSlot: () => getApiCreditLinkText() === null || !arePromoOffersAllowed(),
    heldOut: () => shouldSuppressApiCreditLinkNotice(),
    isActive: (m) =>
      isPassesEligibleBeforeLaunch() &&
      !canClaimPromoCredit() &&
      !shouldShowPromoUpsell() &&
      !m.isLaunchPromptPending() &&
      !Xj(m.session.host) &&
      !isActingAsBgJob() &&
      !env.CLAUDE_BRIDGE_REATTACH_SESSION,
    render: () => e(ApiCreditLinkNotice, {}),
  },
  VI = {
    id: "guest-passes",
    tier: "announcement",
    type: "info",
    promo: !0,
    maxImpressions: 3,
    priority: NOTICE_PRIORITIES.promo,
    isActive: (m) =>
      shouldShowGuestPassesUpsell(m.storageV5) && !canClaimPromoCredit() && !shouldShowPromoUpsell(),
    render: () => e(GuestPassesNotice, {}),
  },
  WI = {
    id: "fullscreen-downsell",
    tier: "announcement",
    type: "info",
    promo: !1,
    priority: NOTICE_PRIORITIES.hint,
    claimsFirstShow: () => (getGlobalConfig().fullscreenDownsellSeenCount ?? 0) === 0,
    isActive: () => env.CLAUDE_CODE_TUI_JUST_SWITCHED === void 0 && isFullscreenDownsellActive(),
    render: () => e(FullscreenDownsellNotice, {}),
  },
  jI = {
    id: "subscription-switch",
    tier: "announcement",
    type: "info",
    promo: !0,
    maxImpressions: ZLr,
    priority: NOTICE_PRIORITIES.promo,
    isActive: (m) => m.existingClaudeSubscription !== null,
    render: (m) =>
      m.existingClaudeSubscription === null
        ? null
        : e(SubscriptionSwitchNotice, { subscriptionType: m.existingClaudeSubscription }),
  },
  zI = [
    J0,
    ...Q0,
    LARGE_MEMORY_FILES_NOTICE,
    eI,
    rI,
    tI,
    oI,
    nI,
    II,
    EI,
    EMERGENCY_TIP_NOTICE,
    sI,
    uI,
    dI,
    mI,
    pI,
    fI,
    hI,
    gI,
    aI,
    cI,
    bI,
    yI,
    SI,
    wI,
    xI,
    createRoot,
    DI,
    jetbrainsPluginNotice,
    POWERUP_DISCOVERY_NOTICE,
    AI,
    PI,
    NI,
    OI,
    UI,
    BI,
    FI,
    VI,
    jI,
    WI,
  ];
//@ chunk-ag5x7vhf.js:109962-110014 placement
function activeStatusNotices(m) {
  return zI.filter((h) => h.isActive(m));
}
//@ chunk-ag5x7vhf.js:110014-110217 placement
function promptCachingDisabledVars() {
  return [
    "DISABLE_PROMPT_CACHING",
    "DISABLE_PROMPT_CACHING_HAIKU",
    "DISABLE_PROMPT_CACHING_OPUS",
    "DISABLE_PROMPT_CACHING_SONNET",
    "DISABLE_PROMPT_CACHING_FABLE",
  ].filter((m) => isEnvTruthy(process.env[m]));
}
//@ chunk-ag5x7vhf.js:110217-110310 placement
function isNoticeTierShown(m, h) {
  switch (m) {
    case "error":
    case "warning":
    case "info":
    case "announcement":
      return !0;
  }
}
//@ chunk-ag5x7vhf.js:110310-110373 placement
var PS = ["debug-mode", "model-source", "channels", "tmux-session"];
//@ chunk-ag5x7vhf.js:110373-110587 placement
function noticeSortKey(m) {
  if (m.tier === "announcement") {
    let x = m.priority ?? 0;
    if (x >= NOTICE_PRIORITIES.org) return [0, -x];
    if (x >= NOTICE_PRIORITIES.launch) return [1, -x];
    if (x >= NOTICE_PRIORITIES.campaign) return [2, -x];
    return [4, -x];
  }
  let index = PS.indexOf(m.id);
  return [3, index === -1 ? PS.length : index];
}
/**
 * 决定状态区公告位：首次选择时跳过 heldOut 的公告并锁定获胜者；之后始终显示同一公告（除非已释放），并修正溢出计数。
 */
//@ chunk-ag5x7vhf.js:110587-111275 placement
function resolveAnnouncementSlot(m, h, x) {
  let state = announcementState(),
    governance = state.announcementSlotGovernance ?? x;
  if (state.announcementSlotWinner === null) {
    let candidates = m,
      slot = selectNotices(candidates, h, governance).slot;
    while (slot?.heldOut?.() === !0) {
      let id = slot.id;
      ((candidates = candidates.filter((K) => K.id !== id)),
        (slot = selectNotices(candidates, h, governance).slot));
    }
    let selection = selectNotices(Xm(candidates, slot), h, governance);
    if (selection.slot !== null)
      ((state.announcementSlotWinner = selection.slot),
        (state.announcementSlotGovernance = { suppressPromos: governance.suppressPromos }));
    return selection;
  }
  let announcementSlotWinner = state.announcementSlotWinner,
    current = selectNotices(Xm(m, announcementSlotWinner), h, governance);
  if (state.announcementSlotReleased || announcementSlotWinner.releasesSlot?.() === !0)
    return ((state.announcementSlotReleased = !0), { ...current, slot: null, slotOverflowCount: 0 });
  if (current.slot?.id === announcementSlotWinner.id) return current;
  let overflow = current.slot === null ? 0 : current.slotOverflowCount + 1,
    isStillListed = m.some((L) => L.id === announcementSlotWinner.id);
  return {
    ...current,
    slot: announcementSlotWinner,
    slotOverflowCount: Math.max(0, overflow - (isStillListed ? 1 : 0)),
  };
}
//@ chunk-ag5x7vhf.js:111275-111320 placement
function Zm(m, h, x) {
  return selectNotices(Xm(m, null), h, x);
}
//@ chunk-ag5x7vhf.js:111320-111392 placement
function Xm(m, h) {
  return m.filter((x) => x.heldOut === void 0 || x.id === h?.id);
}
//@ chunk-ag5x7vhf.js:111392-111905 placement
function selectNotices(m, h, { suppressPromos: suppressPromos }) {
  let filtered = m.filter((A) => isNoticeTierShown(A.tier, h) && !(A.promo === !0 && suppressPromos)),
    filtered_2 = filtered.filter((A) => A.antOnly !== !0 && A.tier !== "info" && A.tier !== "announcement"),
    _ = isEnvTruthy(env.IS_DEMO) ? [] : filtered.filter((A) => A.antOnly === !0),
    filtered_3 = filtered.filter((A) => A.antOnly !== !0 && (A.tier === "info" || A.tier === "announcement")),
    D = filtered_3.find((A) => A.claimsFirstShow?.() === !0) ?? null;
  if (D === null)
    for (let A of filtered_3) {
      if (D === null) {
        D = A;
        continue;
      }
      let [L, V] = noticeSortKey(A),
        [W, z] = noticeSortKey(D);
      if (L < W || (L === W && V < z)) D = A;
    }
  return { warnings: filtered_2, slot: D, slotOverflowCount: D === null ? 0 : filtered_3.length - 1, ant: _ };
}
//@ chunk-ag5x7vhf.js:111905-111909 placement
j();
/**
 * 不可见的触发组件：在可见视口中且有需要认证的 MCP 服务器时，触发认证提示检查。
 */
//@ chunk-ag5x7vhf.js:111909-112284 placement
function McpAuthNoticeTrigger(m) {
  let D = w(9),
    { count: count, storageV5: storageV5 } = m,
    T = Dt(),
    k = Se(gM),
    [_, , , I] = useTerminalViewport(),
    A,
    L;
  if (D[0] !== I || D[1] !== count || D[2] !== T || D[3] !== storageV5 || D[4] !== k)
    ((A = () => {
      if (!T || k === null || count === 0 || I() !== !0) {
        return;
      }
      needsAuthNoticeServers(k.getState().mcp.clients, Qr, storageV5);
    }),
      (L = [T, k, count, storageV5, I]),
      (D[0] = I),
      (D[1] = count),
      (D[2] = T),
      (D[3] = storageV5),
      (D[4] = k),
      (D[5] = A),
      (D[6] = L));
  else ((A = D[5]), (L = D[6]));
  P(A, L);
  let V;
  if (D[7] !== _) ((V = e(Box, { ref: _ })), (D[7] = _), (D[8] = V));
  else V = D[8];
  return V;
}
//@ chunk-ag5x7vhf.js:112284-112288 placement
j();
//@ chunk-ag5x7vhf.js:112288-112344 placement
function XI(K) {
  return K.seenKey === void 0 ? [] : [K.seenKey];
}
/**
 * 不可见的跟踪组件：提示行出现在可见视口时记录已展示，未展示时订阅帧刷新直到记录成功。
 */
//@ chunk-ag5x7vhf.js:112344-112777 placement
function NoticeVisibilityTracker(m) {
  let D = w(9),
    { rows: rows, storageV5: storageV5 } = m,
    T = Dt(),
    { subscribeFrames: subscribeFrames } = Se(kp),
    [_, , , I] = useTerminalViewport(),
    A,
    L;
  if (D[0] !== I || D[1] !== T || D[2] !== rows || D[3] !== storageV5 || D[4] !== subscribeFrames)
    ((A = () => {
      let flattened = rows.flatMap(XI);
      if (!T || flattened.length === 0 || isUnattendedInteractiveSession()) {
        return;
      }
      if (Il(I, flattened, storageV5)) {
        return;
      }
      let W = subscribeFrames(() => {
        if (Il(I, flattened, storageV5)) W();
      });
      return W;
    }),
      (L = [T, rows, storageV5, I, subscribeFrames]),
      (D[0] = I),
      (D[1] = T),
      (D[2] = rows),
      (D[3] = storageV5),
      (D[4] = subscribeFrames),
      (D[5] = A),
      (D[6] = L));
  else ((A = D[5]), (L = D[6]));
  P(A, L);
  let z;
  if (D[7] !== _) ((z = e(Box, { ref: _ })), (D[7] = _), (D[8] = z));
  else z = D[8];
  return z;
}
//@ chunk-ag5x7vhf.js:112777-112841 placement
function Il(m, h, x) {
  let T = m();
  if (T === !0) markSecurityWarningsSeen(h, x);
  return T !== null;
}
//@ chunk-ag5x7vhf.js:112841-112856 placement
function vE() {}
//@ chunk-ag5x7vhf.js:112856-112894 placement
function selectSetupIssues(ut) {
  return ut.setupIssues;
}
//@ chunk-ag5x7vhf.js:117948-117952 placement
j();
//@ chunk-ag5x7vhf.js:117952-117956 placement
j();
//@ chunk-18hwfzwa.js:312870-312946 fingerprint = getActiveNotices (0.424)
function getActiveNotices(h, x) {
  return { ...h, isMidTurn: x.isActive, dispatchedOverBridge: !0 };
}

export {
  getActiveNotices,
  vE,
  selectSetupIssues,
  resolveAnnouncementSlot,
  Zm,
  activeStatusNotices,
  McpAuthNoticeTrigger,
  NoticeVisibilityTracker,
  OAuthExpiryStatusRow,
};
