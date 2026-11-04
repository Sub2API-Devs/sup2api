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
import {
  jsxProd_default_2,
  Fragment,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { StatusRow } from "../components/Settings/Status.js";
import { hasPolicySettings } from "./plugins/managedPluginSeating.js";
import { Box, Text, Link } from "../ink/components/Text.js";
import { capitalize, plural } from "./stringUtils.js";
import { getCwdOrNull } from "./cwd.js";
import {
  getLargeMemoryFiles,
  getOversizedMemoryWarning,
  getMaxMemoryFileChars,
  getWithheldInstructionFiles,
} from "./claudemd.js";
import { formatNumber, formatTokens } from "./format.js";
import { isClaudeMdLoadingDisabled } from "./settings/customizationDisabled.js";
import {
  takeShownInstructionFiles,
  withheldInstructionNotice,
  moreInstructionFilesText,
} from "./instructionFileAccess.js";
import {
  getAuthTokenSource,
  isClaudeAISubscriber,
  getAnthropicApiKeyWithSourceSafe,
  getApiKeyFromConfigOrMacOSKeychain,
  describeHowToDisableAuthTokenSource,
} from "./auth.js";
import { getAgentDescriptionsTotalTokens } from "./statusNoticeHelpers.js";
import {
  MCP_CONNECTED_TTL_MS,
  needsAuthNoticeServers,
  MCP_CONNECTION_CHECKS,
} from "../components/LogoV2/LogoV2.js";
import { getModelSourceAnnotation } from "./model/modelDisplay.js";
import { MIGRATIONS } from "../hooks/notifs/useModelMigrationNotifications.js";
import { ModelSourceNotice, InfoNotice, oauthExpiryWarning } from "../components/LogoV2/Notices.js";
import { messagingSocketServerSlot, messagingSocketUnavailableReason } from "./messagingSocket/setup.js";
import { formatModelRestrictedNotice, displayModelName } from "./model/validateModel.js";
import { MODEL_WINDOW_DOCS_URL, MODEL_CONFIG_DOCS_URL } from "../services/compact/unknownModelNotice.js";
import { uniq } from "./collections.js";
import { hasComplianceTaint, POLICY_LIMITED_NOTICE } from "../services/policyLimits/complianceTaints.js";
import { getRemoteSettingsLoadState, describeFetchFailure } from "../services/cloudSessions/eligibility.js";
import { getPolicyNotice } from "../services/policyLimits/cacheStamp.js";
import { isDebugMode, isDebugToStdErr, getDebugLogPath } from "./debug.js";
import { env } from "./env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isBridgeEnabled } from "../bridge/bridgeEntitlement.js";
import { isPolicyLimitsCacheLoaded } from "../services/policyLimits/policyEvidence.js";
import { getRemoteControlPolicyVerdict } from "../bridge/bridgeGates.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useNoticeImpression, useNoticeImpressionEnabled } from "../components/LogoV2/CondensedLogo.js";
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
import { pickStartupAnnouncement as pickStartupAnnouncement_2 } from "../services/startupAnnouncements.js";
import {
  parsePromoCampaign,
  canClaimPromoCredit,
  shouldShowPromoUpsell,
} from "../services/api/featureOfTheWeek.js";
import { shouldShowFotw, FeatureOfTheWeekNotice } from "../components/LogoV2/FeatureOfTheWeekNudge.js";
import { StartupAnnouncementNotice } from "../components/LogoV2/StartupAnnouncement.js";
import {
  PROMO_CREDIT_NOTICE_ID,
  shouldShowPromoCreditNotice,
  PromoCreditNotice,
  SubscriptionSwitchNotice,
} from "../components/LogoV2/PromoNotices.js";
import {
  CC_CE_MIGRATE_MAX_IMPRESSIONS_LIMIT,
  CC_CE_MIGRATE_MAX_IMPRESSIONS,
} from "./subscriptionNoticeIds.js";
import { shouldShowCeMigrateNotice, CeMigrateNotice } from "../components/LogoV2/CeMigrateNotice.js";
import {
  API_CREDIT_LINK,
  API_CREDIT_MAX_ASKS,
  getApiCreditLinkText,
  shouldSuppressApiCreditLinkNotice,
  isPassesEligibleBeforeLaunch,
  ApiCreditLinkNotice,
} from "../components/LogoV2/ApiCreditLinkNotice.js";
import { arePromoOffersAllowed } from "./planTiers.js";
import { isSessionRestored } from "./sessionRestore.js";
import { isActingAsBgJob, isUnattendedInteractiveSession } from "./concurrentSessions.js";
import {
  isFullscreenDownsellActive,
  FullscreenDownsellNotice,
} from "../components/LogoV2/FullscreenDownsell.js";
import { createRoot } from "../ink.js";
import { announcementState } from "../services/announcements/announcementState.js";
import { init_react_production, useContext, useEffect } from "../../vendor/react/cjs/react.production.js";
import { appStoreContext } from "../state/AppState.js";
import { useTerminalViewport } from "../ink/components/Input.js";
import { APP_CONTEXT } from "../../vendor/convert-to-spaces/dist/index.js";
import { markSecurityWarningsSeen } from "./permissions/securityWarnings.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:96305-96352 placement
function oauthExpiryWarningText() {
  return logFeatureOk("oauth_expiry_warning");
}
//@ chunk-ag5x7vhf.js:96352-96426 placement
function logPowerupDiscoveryShown() {
  return logEvent("tengu_powerup_discovery_shown", {
    arm: fromEnum("banner"),
  });
}
//@ chunk-ag5x7vhf.js:96426-96973 placement
/**
 * 提示优先级表与安全模式提示定义（安全模式时禁用全部自定义）。
 */
var NOTICE_PRIORITIES = {
  org: 30,
  launch: 20,
  campaign: 15,
  promo: 10,
  hint: 5,
};
var SAFE_MODE_NOTICE = {
  id: "safe-mode",
  tier: "warning",
  type: "warning",
  isActive: () => isSafeMode(),
  render: () =>
    jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default_2(StatusRow, {
          status: "warning",
          children: [
            "Safe mode: all customizations are disabled (CLAUDE.md, skills, plugins, hooks, MCP, agents, and more)",
            hasPolicySettings() &&
              jsxProd_default_2(Fragment, {
                children: [
                  " \xB7 ",
                  "managed hooks and settings policy from your organization still apply; managed plugins, skills, CLAUDE.md, and MCP servers do not",
                ],
              }),
          ],
        }),
        jsxProd_default(Box, {
          paddingLeft: 2,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: `${capitalize(getSafeModeExitHint())} to re-enable`,
          }),
        }),
      ],
    }),
};
var EXTRA_WARNING_NOTICES = [];
//@ chunk-ag5x7vhf.js:96973-97006 placement
function displayPathOf(file) {
  return toDisplayPath(file.path);
}
//@ chunk-ag5x7vhf.js:97006-97115 placement
function toDisplayPath(path) {
  let cwdOrNull = getCwdOrNull();
  let relativePath = cwdOrNull !== null && path.startsWith(cwdOrNull) ? relative(cwdOrNull, path) : path;
  return relativePath === ".." || relativePath.startsWith(`..${sep}`) ? path : relativePath;
}
//@ chunk-ag5x7vhf.js:97115-105242 placement
/**
 * 内存文件过大/超总量的提示：列出最大的指令文件及各自字符数。
 */
var LARGE_MEMORY_FILES_NOTICE = {
  id: "large-memory-files",
  tier: "warning",
  type: "warning",
  isActive: (ctx) =>
    getLargeMemoryFiles(ctx.memoryFiles).length > 0 || getOversizedMemoryWarning(ctx.memoryFiles) !== null,
  render: (ctx) => {
    let largeMemoryFiles = getLargeMemoryFiles(ctx.memoryFiles);
    let maxMemoryFileChars = getMaxMemoryFileChars();
    let oversizedMemoryWarning = getOversizedMemoryWarning(ctx.memoryFiles);
    return jsxProd_default_2(Fragment, {
      children: [
        oversizedMemoryWarning &&
          jsxProd_default_2(StatusRow, {
            status: "warning",
            children: [
              jsxProd_default_2(Text, {
                bold: true,
                children: [oversizedMemoryWarning.summary.fileCount, " instruction files"],
              }),
              " add up to ",
              formatNumber(oversizedMemoryWarning.summary.totalChars),
              " chars, over the",
              " ",
              formatNumber(oversizedMemoryWarning.summary.totalLimitChars),
              "-char total limit \xB7 largest:",
              " ",
              oversizedMemoryWarning.largest
                .map((file) => `${displayPathOf(file)} (${formatNumber(file.content.length)})`)
                .join(", "),
              jsxProd_default(Text, {
                dimColor: true,
                children: " \xB7 /memory to free up context",
              }),
            ],
          }),
        largeMemoryFiles.map((largeMemoryFile) =>
          jsxProd_default_2(
            StatusRow,
            {
              status: "warning",
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: displayPathOf(largeMemoryFile),
                }),
                " is over the",
                " ",
                formatNumber(maxMemoryFileChars),
                "-char limit (",
                formatNumber(largeMemoryFile.content.length),
                " chars)",
                jsxProd_default(Text, {
                  dimColor: true,
                  children: " \xB7 /memory to free up context",
                }),
              ],
            },
            largeMemoryFile.path,
          ),
        ),
      ],
    });
  },
};
var WITHHELD_MEMORY_FILES_NOTICE = {
  id: "withheld-memory-files",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => !isClaudeMdLoadingDisabled() && getWithheldInstructionFiles(ctx.session).length > 0,
  render: (ctx) => {
    let withheld = takeShownInstructionFiles(getWithheldInstructionFiles(ctx.session));
    return jsxProd_default_2(Fragment, {
      children: [
        withheld.shown.map(({ path, why }) => {
          let notice = withheldInstructionNotice(why, toDisplayPath(path));
          return jsxProd_default_2(
            Box,
            {
              flexDirection: "column",
              children: [
                jsxProd_default(StatusRow, {
                  status: "warning",
                  children: notice.lead,
                }),
                jsxProd_default_2(Box, {
                  paddingLeft: 2,
                  flexDirection: "row",
                  children: [
                    jsxProd_default(Box, {
                      flexShrink: 0,
                      marginRight: 1,
                      children: jsxProd_default(Text, {
                        children: notice.mark,
                      }),
                    }),
                    jsxProd_default(Text, {
                      bold: true,
                      wrap: "truncate-start",
                      children: notice.path,
                    }),
                  ],
                }),
              ],
            },
            path,
          );
        }),
        withheld.more > 0 &&
          jsxProd_default(StatusRow, {
            status: "warning",
            children: moreInstructionFilesText(withheld),
          }),
      ],
    });
  },
};
var CLAUDE_AI_EXTERNAL_TOKEN_NOTICE = {
  id: "claude-ai-external-token",
  tier: "warning",
  type: "warning",
  isActive: () => {
    let authTokenSource = getAuthTokenSource();
    return (
      isClaudeAISubscriber() &&
      (authTokenSource.source === "ANTHROPIC_AUTH_TOKEN" || authTokenSource.source === "apiKeyHelper")
    );
  },
  render: () => {
    let authTokenSource = getAuthTokenSource();
    return jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(StatusRow, {
        status: "warning",
        children: [
          authTokenSource.source,
          " overriding Claude subscription login",
          jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 unset it or /logout to sign it out",
          }),
        ],
      }),
    });
  },
};
var API_KEY_CONFLICT_NOTICE = {
  id: "api-key-conflict",
  tier: "warning",
  type: "warning",
  isActive: () => {
    let { source } = getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    return (
      !!getApiKeyFromConfigOrMacOSKeychain() && (source === "ANTHROPIC_API_KEY" || source === "apiKeyHelper")
    );
  },
  render: () => {
    let { source } = getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    return jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(StatusRow, {
        status: "warning",
        children: [
          source,
          " overriding saved Console key",
          jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 unset it or /logout to clear the saved key",
          }),
        ],
      }),
    });
  },
};
var BOTH_AUTH_METHODS_NOTICE = {
  id: "both-auth-methods",
  tier: "warning",
  type: "warning",
  isActive: () => {
    let { source } = getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    let authTokenSource = getAuthTokenSource();
    return (
      source !== "none" &&
      authTokenSource.source !== "none" &&
      !(source === "apiKeyHelper" && authTokenSource.source === "apiKeyHelper")
    );
  },
  render: () => {
    let { source } = getAnthropicApiKeyWithSourceSafe({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    let authTokenSource = getAuthTokenSource();
    return jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        jsxProd_default_2(StatusRow, {
          status: "warning",
          children: [
            "Both ",
            authTokenSource.source,
            " and ",
            source,
            " set \xB7 auth may not work as expected",
          ],
        }),
        jsxProd_default_2(Box, {
          flexDirection: "column",
          paddingLeft: 2,
          children: [
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "\xB7 to use",
                " ",
                authTokenSource.source === "claude.ai" ? "claude.ai" : authTokenSource.source,
                ":",
                " ",
                source === "ANTHROPIC_API_KEY"
                  ? 'Unset the ANTHROPIC_API_KEY environment variable, or claude /logout then say "No" to the API key approval before login.'
                  : source === "apiKeyHelper"
                    ? "Unset the apiKeyHelper setting."
                    : "claude /logout",
              ],
            }),
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "\xB7 to use ",
                source,
                ":",
                " ",
                describeHowToDisableAuthTokenSource(authTokenSource.source),
              ],
            }),
          ],
        }),
      ],
    });
  },
};
var LARGE_AGENT_DESCRIPTIONS_NOTICE = {
  id: "large-agent-descriptions",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => getAgentDescriptionsTotalTokens(ctx.agentDefinitions) > MCP_CONNECTED_TTL_MS,
  render: (ctx) => {
    let agentDescriptionsTotalTokens = getAgentDescriptionsTotalTokens(ctx.agentDefinitions);
    return jsxProd_default_2(StatusRow, {
      status: "warning",
      children: [
        "Agent descriptions are over the",
        " ",
        formatNumber(MCP_CONNECTED_TTL_MS),
        "-token limit (~",
        formatNumber(agentDescriptionsTotalTokens),
        " tokens)",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" ", "\xB7 ask Claude to trim agent descriptions in .claude/agents/"],
        }),
      ],
    });
  },
};
var MODEL_SOURCE_NOTICE = {
  id: "model-source",
  tier: "info",
  type: "info",
  isActive: (ctx) =>
    ctx.modelRestrictedWarning === null && (getModelSourceAnnotation() !== "" || MIGRATIONS()),
  render: () => jsxProd_default(ModelSourceNotice, {}),
};
var MCP_NEEDS_AUTH_NOTICE = {
  id: "mcp-needs-auth",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => ctx.mcpNeedsAuthCount > 0,
  render: (ctx) =>
    jsxProd_default_2(StatusRow, {
      status: "warning",
      children: [
        ctx.mcpNeedsAuthCount,
        " MCP",
        " ",
        plural(ctx.mcpNeedsAuthCount, "server needs", "servers need"),
        " ",
        "authentication",
        jsxProd_default(Text, {
          dimColor: true,
          children: " \xB7 run /mcp",
        }),
      ],
    }),
};
var CROSS_SESSION_MESSAGING_OFF_NOTICE = {
  id: "cross-session-messaging-off",
  tier: "warning",
  type: "warning",
  isActive: (ctx) =>
    messagingSocketServerSlot.of(ctx.session.host).lastStartFailureCause === "socket_dir_refused",
  render: (ctx) =>
    jsxProd_default_2(StatusRow, {
      status: "warning",
      children: [
        "Cross-session messaging is off:",
        " ",
        messagingSocketUnavailableReason(messagingSocketServerSlot.of(ctx.session.host)) ??
          "its socket directory could not be set up",
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            " ",
            "\xB7 restart with --debug-file ",
            "<path>",
            " to write a debug log explaining why",
          ],
        }),
      ],
    }),
};
var MODEL_DEPRECATION_NOTICE = {
  id: "model-deprecation",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => ctx.modelDeprecationWarning !== null,
  render: (ctx) =>
    ctx.modelDeprecationWarning === null
      ? null
      : jsxProd_default_2(StatusRow, {
          status: "warning",
          children: [
            ctx.modelDeprecationWarning.message,
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [" \xB7 ", ctx.modelDeprecationWarning.action],
            }),
          ],
        }),
};
var MODEL_RESTRICTED_NOTICE = {
  id: "model-restricted",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => ctx.modelRestrictedWarning !== null,
  render: (ctx) =>
    ctx.modelRestrictedWarning === null
      ? null
      : jsxProd_default(StatusRow, {
          status: "warning",
          children: formatModelRestrictedNotice(
            ctx.modelRestrictedWarning.requested,
            ctx.modelRestrictedWarning.effective,
          ),
        }),
};
var MODEL_UNRECOGNIZED_NOTICE = {
  id: "model-unrecognized",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => ctx.unknownModelWindowWarning !== null,
  render: (ctx) =>
    ctx.unknownModelWindowWarning === null
      ? null
      : jsxProd_default_2(StatusRow, {
          status: "warning",
          children: [
            `Model "${displayModelName(ctx.unknownModelWindowWarning.model)}" isn't recognized`,
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                " \xB7 ",
                "context assumed to be",
                " ",
                formatTokens(ctx.unknownModelWindowWarning.window),
                " tokens \xB7 update Claude Code, or see",
                " ",
                jsxProd_default(Link, {
                  url: MODEL_WINDOW_DOCS_URL,
                  fallback: MODEL_CONFIG_DOCS_URL,
                  children: "the docs",
                }),
              ],
            }),
          ],
        }),
};
var AUTO_COMPACT_WINDOW_ENV_NOTICE = {
  id: "auto-compact-window-env",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => ctx.autoCompactWindowEnvWarning !== null,
  render: (ctx) =>
    ctx.autoCompactWindowEnvWarning === null
      ? null
      : jsxProd_default(StatusRow, {
          status: "warning",
          children: ctx.autoCompactWindowEnvWarning,
        }),
};
var UNUSABLE_MANAGED_MCP_NOTICE = {
  id: "unusable-managed-mcp",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => ctx.unusableManagedMcpConfigMessage !== null,
  render: (ctx) =>
    ctx.unusableManagedMcpConfigMessage === null
      ? null
      : jsxProd_default(StatusRow, {
          status: "warning",
          children: ctx.unusableManagedMcpConfigMessage,
        }),
};
var SANDBOX_DENIES_ON_ANOTHER_HOST_NOTICE = {
  id: "sandbox-denies-on-another-host",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => ctx.sandboxDeniesOnAnotherHostCount > 0,
  render: (ctx) =>
    jsxProd_default_2(StatusRow, {
      status: "warning",
      children: [
        ctx.sandboxDeniesOnAnotherHostCount,
        " sandbox deny",
        " ",
        plural(ctx.sandboxDeniesOnAnotherHostCount, "path"),
        " on another computer",
        " ",
        plural(ctx.sandboxDeniesOnAnotherHostCount, "is", "are"),
        " not enforced",
        jsxProd_default(Text, {
          dimColor: true,
          children: " \xB7 /status for details",
        }),
      ],
    }),
};
var SECURITY_WARNINGS_NOTICE = {
  id: "security-warnings",
  tier: "warning",
  type: "warning",
  isActive: (ctx) => ctx.securityWarnings.length > 0,
  render: (ctx) =>
    jsxProd_default(Fragment, {
      children: uniq(ctx.securityWarnings.map((securityWarning) => securityWarning.text)).map((text) =>
        jsxProd_default(
          StatusRow,
          {
            status: "warning",
            children: text,
          },
          text,
        ),
      ),
    }),
};
var HIPAA_COMPLIANCE_NOTICE = {
  id: "hipaa-compliance",
  tier: "warning",
  type: "info",
  isActive: () => hasComplianceTaint("hipaa"),
  render: () =>
    jsxProd_default_2(StatusRow, {
      status: "info",
      children: [
        POLICY_LIMITED_NOTICE,
        jsxProd_default(Text, {
          dimColor: true,
          children: " \xB7 /status for details",
        }),
      ],
    }),
};
var REMOTE_MANAGED_SETTINGS_FAILED_NOTICE = {
  id: "remote-managed-settings-failed",
  tier: "warning",
  type: "warning",
  isActive: () => {
    let remoteSettingsLoadState = getRemoteSettingsLoadState();
    return remoteSettingsLoadState?.state === "failed" || remoteSettingsLoadState?.state === "stale_cache";
  },
  render: () => {
    let remoteSettingsLoadState = getRemoteSettingsLoadState();
    if (remoteSettingsLoadState?.state !== "failed" && remoteSettingsLoadState?.state !== "stale_cache")
      return null;
    let failureText = describeFetchFailure(
      remoteSettingsLoadState.failure.errorKind,
      remoteSettingsLoadState.failure.httpStatus,
    );
    return jsxProd_default_2(StatusRow, {
      status: "warning",
      children: [
        "Remote managed settings failed to load (",
        failureText,
        ")",
        remoteSettingsLoadState.state === "stale_cache"
          ? remoteSettingsLoadState.transportEnvWithheld
            ? " \xB7 using cached policy (proxy/CA/provider env withheld)"
            : " \xB7 using cached policy"
          : remoteSettingsLoadState.restrictionsOnly
            ? " \xB7 the cached policy's restrictions still apply"
            : " \xB7 no remote policy applied",
        jsxProd_default(Text, {
          dimColor: true,
          children: " \xB7 /status for details",
        }),
      ],
    });
  },
};
var MONITORING_NOTICE = {
  id: "monitoring-notice",
  tier: "warning",
  type: "info",
  isActive: () => getPolicyNotice() !== null,
  render: () => {
    let policyNotice = getPolicyNotice();
    if (!policyNotice) return null;
    return jsxProd_default_2(StatusRow, {
      status: "info",
      children: [
        policyNotice.text,
        policyNotice.url
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                " \xB7 ",
                jsxProd_default(Link, {
                  url: policyNotice.url,
                  fallback: policyNotice.url,
                  children: "learn more",
                }),
              ],
            })
          : null,
      ],
    });
  },
};
var DEBUG_MODE_NOTICE = {
  id: "debug-mode",
  tier: "info",
  type: "info",
  isActive: () => isDebugMode(),
  render: () =>
    jsxProd_default_2(InfoNotice, {
      children: ["Debug mode enabled \xB7 logging to", " ", isDebugToStdErr() ? "stderr" : getDebugLogPath()],
    }),
};
var TMUX_SESSION_NOTICE = {
  id: "tmux-session",
  tier: "info",
  type: "info",
  isActive: () => !!env.CLAUDE_CODE_TMUX_SESSION,
  render: () =>
    jsxProd_default_2(InfoNotice, {
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
};
var REMOTE_CONTROL_AUTO_ON = "remote-control-auto-on";
var REMOTE_CONTROL_AUTO_ON_MAX_SEEN = 3;
//@ chunk-ag5x7vhf.js:105242-105456 placement
function shouldShowRemoteControlAutoOnNotice(ctx) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_harbor_notice", true)) return false;
  if (!ctx.replBridgeAutoOnByDefault) return false;
  if (!isBridgeEnabled()) return false;
  if (!isPolicyLimitsCacheLoaded()) return false;
  if (getRemoteControlPolicyVerdict() !== "allowed") return false;
  return (
    (getGlobalConfig().seenNotifications?.[REMOTE_CONTROL_AUTO_ON] ?? 0) < REMOTE_CONTROL_AUTO_ON_MAX_SEEN
  );
}
//@ chunk-ag5x7vhf.js:105456-105590 placement
function markRemoteControlAutoOnSeen(storageV5) {
  saveGlobalConfig((config) => {
    let seenNotifications = config.seenNotifications ?? {};
    let seenCount = seenNotifications[REMOTE_CONTROL_AUTO_ON] ?? 0;
    if (seenCount >= REMOTE_CONTROL_AUTO_ON_MAX_SEEN) return config;
    return {
      ...config,
      seenNotifications: {
        ...seenNotifications,
        [REMOTE_CONTROL_AUTO_ON]: seenCount + 1,
      },
    };
  }, storageV5);
}
//@ chunk-ag5x7vhf.js:105693-106018 placement
/**
 * 登录即将过期时显示的状态行：剩余天数与 /login 续期提示。
 */
function OAuthExpiryStatusRow() {
  let $ = useMemoCache(2);
  useNoticeImpression("oauth-expiry", oauthExpiryWarningText);
  let row;
  let early;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    early = EARLY_RETURN_SENTINEL;
    k: {
      let expiry = oauthExpiryWarning();
      if (!expiry) {
        early = null;
        break k;
      }
      row = jsxProd_default_2(StatusRow, {
        status: "warning",
        children: [
          "Your login expires in ",
          expiry.daysLeft,
          " ",
          plural(expiry.daysLeft, "day"),
          jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 run /login to renew",
          }),
        ],
      });
    }
    $[0] = row;
    $[1] = early;
  } else {
    row = $[0];
    early = $[1];
  }
  if (early !== EARLY_RETURN_SENTINEL) return early;
  return row;
}
//@ chunk-ag5x7vhf.js:106018-106161 fingerprint = jetbrainsPluginNotice (0.336)
var jetbrainsPluginNotice = {
  id: REMOTE_CONTROL_AUTO_ON,
  tier: "info",
  type: "info",
  claimsFirstShow: () => (getGlobalConfig().seenNotifications?.[REMOTE_CONTROL_AUTO_ON] ?? 0) === 0,
  isActive: (ctx) => shouldShowRemoteControlAutoOnNotice(ctx),
  render: (ctx) =>
    jsxProd_default(RemoteControlAutoOnNotice, {
      ctx,
    }),
};
//@ chunk-ag5x7vhf.js:106161-106973 placement
/**
 * 远程控制默认开启提示：说明可在手机/桌面应用或 claude.ai 查看进度和回复会话，要只留在本终端可运行 /remote-control；挂载时记一次已看到。
 */
function RemoteControlAutoOnNotice(props) {
  let $ = useMemoCache(10);
  let { ctx } = props;
  let { storageV5 } = ctx;
  let markSeen;
  if ($[0] !== storageV5) {
    markSeen = () => markRemoteControlAutoOnSeen(storageV5);
    $[0] = storageV5;
    $[1] = markSeen;
  } else markSeen = $[1];
  useNoticeImpression(REMOTE_CONTROL_AUTO_ON, markSeen);
  let sessionUrl;
  if ($[2] !== ctx.replBridgeSessionUrl) {
    sessionUrl = ctx.replBridgeSessionUrl ?? `${getClaudeAiBaseUrl()}/code`;
    $[2] = ctx.replBridgeSessionUrl;
    $[3] = sessionUrl;
  } else sessionUrl = $[3];
  let sessionUrl_2 = sessionUrl;
  let title;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    title = jsxProd_default(Text, {
      bold: true,
      children: "Keep working from anywhere",
    });
    $[4] = title;
  } else title = $[4];
  let link;
  if ($[5] !== sessionUrl_2) {
    link = jsxProd_default(Text, {
      color: "text",
      children: jsxProd_default(Link, {
        url: sessionUrl_2,
        fallback: sessionUrl_2,
        children: "claude.ai",
      }),
    });
    $[5] = sessionUrl_2;
    $[6] = link;
  } else link = $[6];
  let commandText;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    commandText = jsxProd_default(Text, {
      color: "text",
      children: "/remote-control",
    });
    $[7] = commandText;
  } else commandText = $[7];
  let content;
  if ($[8] !== link) {
    content = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        title,
        jsxProd_default_2(Text, {
          dimColor: true,
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
    });
    $[8] = link;
    $[9] = content;
  } else content = $[9];
  return content;
}
//@ chunk-ag5x7vhf.js:106973-107086 placement
var POWERUP_DISCOVERY_NOTICE = {
  id: "powerup-discovery",
  tier: "info",
  type: "info",
  isActive: () => getOnboardingShownThisSession() && resolvePowerupDiscoveryArm() === "banner",
  render: () => jsxProd_default(PowerupDiscoveryNotice, {}),
};
//@ chunk-ag5x7vhf.js:107086-107214 placement
function PowerupDiscoveryNotice() {
  let $ = useMemoCache(1);
  useNoticeImpression("powerup-discovery", logPowerupDiscoveryShown);
  let element;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    element = jsxProd_default(InfoNotice, {
      children: POWERUP_DISCOVERY_COPY.banner,
    });
    $[0] = element;
  } else element = $[0];
  return element;
}
//@ chunk-ag5x7vhf.js:107214-109962 placement
/**
 * 紧急提示、频道、提示缓存关闭等一组 info/warning 状态提示定义。
 */
var EMERGENCY_TIP_NOTICE; // deferred: uses NOTICE_PRIORITIES of its import cycle while loading; runs once the cycle is complete
var CHANNELS_NOTICE;
var PROMPT_CACHING_DISABLED_NOTICE;
var AUTO_MODE_DEFAULT_NOTICE;
var COMPANY_ANNOUNCEMENT_NOTICE;
var SAVED_MODEL_SUCCESSOR_NOTICE;
var STARTUP_ANNOUNCEMENT_NOTICE;
var PROMO_CREDIT_NOTICE;
var FEATURE_OF_THE_WEEK_NOTICE;
var CC_CE_MIGRATE_NOTICE;
var API_CREDIT_LINK_NOTICE;
var GUEST_PASSES_NOTICE;
var FULLSCREEN_DOWNSELL_NOTICE;
var SUBSCRIPTION_SWITCH_NOTICE;
var ALL_STATUS_NOTICES;
deferInit("chunk-ag5x7vhf.js:107214", () => {
  EMERGENCY_TIP_NOTICE = {
    id: "emergency-tip",
    tier: "warning",
    type: "warning",
    isActive: () => isEmergencyTipShown(getTipOfFeed()),
    render: () => jsxProd_default(EmergencyTip, {}),
  };
  CHANNELS_NOTICE = {
    id: "channels",
    tier: "info",
    type: "info",
    isActive: () => getAllowedChannels().length > 0,
    render: () => jsxProd_default(ChannelsNotice, {}),
  };
  PROMPT_CACHING_DISABLED_NOTICE = {
    id: "prompt-caching-disabled",
    tier: "warning",
    type: "warning",
    isActive: () => promptCachingDisabledVars().length > 0,
    render: () => {
      let disabledVars = promptCachingDisabledVars();
      return jsxProd_default_2(StatusRow, {
        status: "warning",
        children: [
          "Prompt caching off (",
          disabledVars.join(", "),
          "), requests will be slower and cost more",
          jsxProd_default(Text, {
            dimColor: true,
            children: " \xB7 unset it to re-enable",
          }),
        ],
      });
    },
  };
  AUTO_MODE_DEFAULT_NOTICE = {
    id: AUTO_MODE_DEFAULT,
    tier: "announcement",
    type: "info",
    promo: false,
    priority: NOTICE_PRIORITIES.org,
    claimsFirstShow: () => shouldShowAutoDefaultNotice("auto"),
    isActive: () => shouldShowAutoDefaultNotice("auto"),
    render: () => jsxProd_default(AutoModeDefaultNotice, {}),
  };
  COMPANY_ANNOUNCEMENT_NOTICE = {
    id: "company-announcement",
    tier: "announcement",
    type: "info",
    promo: false,
    priority: NOTICE_PRIORITIES.org,
    isActive: () => hasCompanyAnnouncements(),
    render: () => jsxProd_default(CompanyAnnouncementNotice, {}),
  };
  SAVED_MODEL_SUCCESSOR_NOTICE = {
    id: SAVED_MODEL_SUCCESSOR,
    tier: "announcement",
    type: "info",
    promo: false,
    priority: NOTICE_PRIORITIES.promo,
    showAccentBar: () => false,
    releasesSlot: () => savedModelSuccessor() === undefined,
    heldOut: () => isModelSuccessorNoticeHidden(),
    isActive: (ctx) => {
      let successor = ctx.isLaunchPromptPending() ? undefined : savedModelSuccessor();
      return (
        successor !== undefined &&
        shouldShowModelSuccessorNotice(successor) &&
        getShortcutDisplay("chat:defaultToNewerModel", "Chat", "ctrl+y") !== ""
      );
    },
    render: () => jsxProd_default(ModelSuccessorNotice, {}),
  };
  STARTUP_ANNOUNCEMENT_NOTICE = {
    id: "startup-announcement",
    tier: "announcement",
    type: "info",
    promo: false,
    priority: NOTICE_PRIORITIES.launch,
    isActive: () =>
      pickStartupAnnouncement_2(false) !== undefined &&
      !(parsePromoCampaign()?.isTopPriorityAnnouncement === true && shouldShowFotw()),
    showAccentBar: () => pickStartupAnnouncement_2(false)?.accentBar !== false,
    render: () => jsxProd_default(StartupAnnouncementNotice, {}),
  };
  PROMO_CREDIT_NOTICE = {
    id: PROMO_CREDIT_NOTICE_ID,
    tier: "announcement",
    type: "info",
    promo: false,
    priority: NOTICE_PRIORITIES.campaign,
    isActive: (ctx) => shouldShowPromoCreditNotice(ctx.session),
    render: () => jsxProd_default(PromoCreditNotice, {}),
  };
  FEATURE_OF_THE_WEEK_NOTICE = {
    id: "fotw-nudge",
    tier: "announcement",
    type: "info",
    promo: false,
    priority: NOTICE_PRIORITIES.campaign,
    isActive: () => shouldShowFotw(),
    render: () => jsxProd_default(FeatureOfTheWeekNotice, {}),
  };
  CC_CE_MIGRATE_NOTICE = {
    id: "cc-ce-migrate",
    tier: "announcement",
    type: "info",
    promo: true,
    maxImpressions: CC_CE_MIGRATE_MAX_IMPRESSIONS_LIMIT,
    priority: NOTICE_PRIORITIES.campaign,
    isActive: () => shouldShowCeMigrateNotice(),
    render: () => jsxProd_default(CeMigrateNotice, {}),
  };
  API_CREDIT_LINK_NOTICE = {
    id: API_CREDIT_LINK,
    tier: "announcement",
    type: "info",
    promo: true,
    maxImpressions: API_CREDIT_MAX_ASKS,
    priority: NOTICE_PRIORITIES.promo,
    releasesSlot: () => getApiCreditLinkText() === null || !arePromoOffersAllowed(),
    heldOut: () => shouldSuppressApiCreditLinkNotice(),
    isActive: (ctx) =>
      isPassesEligibleBeforeLaunch() &&
      !canClaimPromoCredit() &&
      !shouldShowPromoUpsell() &&
      !ctx.isLaunchPromptPending() &&
      !isSessionRestored(ctx.session.host) &&
      !isActingAsBgJob() &&
      !env.CLAUDE_BRIDGE_REATTACH_SESSION,
    render: () => jsxProd_default(ApiCreditLinkNotice, {}),
  };
  GUEST_PASSES_NOTICE = {
    id: "guest-passes",
    tier: "announcement",
    type: "info",
    promo: true,
    maxImpressions: 3,
    priority: NOTICE_PRIORITIES.promo,
    isActive: (ctx) =>
      shouldShowGuestPassesUpsell(ctx.storageV5) && !canClaimPromoCredit() && !shouldShowPromoUpsell(),
    render: () => jsxProd_default(GuestPassesNotice, {}),
  };
  FULLSCREEN_DOWNSELL_NOTICE = {
    id: "fullscreen-downsell",
    tier: "announcement",
    type: "info",
    promo: false,
    priority: NOTICE_PRIORITIES.hint,
    claimsFirstShow: () => (getGlobalConfig().fullscreenDownsellSeenCount ?? 0) === 0,
    isActive: () => env.CLAUDE_CODE_TUI_JUST_SWITCHED === undefined && isFullscreenDownsellActive(),
    render: () => jsxProd_default(FullscreenDownsellNotice, {}),
  };
  SUBSCRIPTION_SWITCH_NOTICE = {
    id: "subscription-switch",
    tier: "announcement",
    type: "info",
    promo: true,
    maxImpressions: CC_CE_MIGRATE_MAX_IMPRESSIONS,
    priority: NOTICE_PRIORITIES.promo,
    isActive: (ctx) => ctx.existingClaudeSubscription !== null,
    render: (ctx) =>
      ctx.existingClaudeSubscription === null
        ? null
        : jsxProd_default(SubscriptionSwitchNotice, {
            subscriptionType: ctx.existingClaudeSubscription,
          }),
  };
  ALL_STATUS_NOTICES = [
    SAFE_MODE_NOTICE,
    ...EXTRA_WARNING_NOTICES,
    LARGE_MEMORY_FILES_NOTICE,
    WITHHELD_MEMORY_FILES_NOTICE,
    LARGE_AGENT_DESCRIPTIONS_NOTICE,
    CLAUDE_AI_EXTERNAL_TOKEN_NOTICE,
    API_KEY_CONFLICT_NOTICE,
    BOTH_AUTH_METHODS_NOTICE,
    CHANNELS_NOTICE,
    PROMPT_CACHING_DISABLED_NOTICE,
    EMERGENCY_TIP_NOTICE,
    MODEL_SOURCE_NOTICE,
    MODEL_DEPRECATION_NOTICE,
    MODEL_RESTRICTED_NOTICE,
    MODEL_UNRECOGNIZED_NOTICE,
    AUTO_COMPACT_WINDOW_ENV_NOTICE,
    UNUSABLE_MANAGED_MCP_NOTICE,
    SECURITY_WARNINGS_NOTICE,
    SANDBOX_DENIES_ON_ANOTHER_HOST_NOTICE,
    MCP_NEEDS_AUTH_NOTICE,
    CROSS_SESSION_MESSAGING_OFF_NOTICE,
    REMOTE_MANAGED_SETTINGS_FAILED_NOTICE,
    HIPAA_COMPLIANCE_NOTICE,
    MONITORING_NOTICE,
    DEBUG_MODE_NOTICE,
    TMUX_SESSION_NOTICE,
    createRoot,
    AUTO_MODE_DEFAULT_NOTICE,
    jetbrainsPluginNotice,
    POWERUP_DISCOVERY_NOTICE,
    COMPANY_ANNOUNCEMENT_NOTICE,
    STARTUP_ANNOUNCEMENT_NOTICE,
    SAVED_MODEL_SUCCESSOR_NOTICE,
    PROMO_CREDIT_NOTICE,
    FEATURE_OF_THE_WEEK_NOTICE,
    CC_CE_MIGRATE_NOTICE,
    API_CREDIT_LINK_NOTICE,
    GUEST_PASSES_NOTICE,
    SUBSCRIPTION_SWITCH_NOTICE,
    FULLSCREEN_DOWNSELL_NOTICE,
  ];
});
//@ chunk-ag5x7vhf.js:109962-110014 placement
function activeStatusNotices(ctx) {
  return ALL_STATUS_NOTICES.filter((notice) => notice.isActive(ctx));
}
//@ chunk-ag5x7vhf.js:110014-110217 placement
function promptCachingDisabledVars() {
  return [
    "DISABLE_PROMPT_CACHING",
    "DISABLE_PROMPT_CACHING_HAIKU",
    "DISABLE_PROMPT_CACHING_OPUS",
    "DISABLE_PROMPT_CACHING_SONNET",
    "DISABLE_PROMPT_CACHING_FABLE",
  ].filter((envVar) => isEnvTruthy(process.env[envVar]));
}
//@ chunk-ag5x7vhf.js:110217-110310 placement
function isNoticeTierShown(tier, enabledTiers) {
  switch (tier) {
    case "error":
    case "warning":
    case "info":
    case "announcement":
      return true;
  }
}
//@ chunk-ag5x7vhf.js:110310-110373 placement
var INFO_NOTICE_ORDER = ["debug-mode", "model-source", "channels", "tmux-session"];
//@ chunk-ag5x7vhf.js:110373-110587 placement
function noticeSortKey(notice) {
  if (notice.tier === "announcement") {
    let priority = notice.priority ?? 0;
    if (priority >= NOTICE_PRIORITIES.org) return [0, -priority];
    if (priority >= NOTICE_PRIORITIES.launch) return [1, -priority];
    if (priority >= NOTICE_PRIORITIES.campaign) return [2, -priority];
    return [4, -priority];
  }
  let index = INFO_NOTICE_ORDER.indexOf(notice.id);
  return [3, index === -1 ? INFO_NOTICE_ORDER.length : index];
}
//@ chunk-ag5x7vhf.js:110587-111275 placement
/**
 * 决定状态区公告位：首次选择时跳过 heldOut 的公告并锁定获胜者；之后始终显示同一公告（除非已释放），并修正溢出计数。
 */
function resolveAnnouncementSlot(candidates, tierVisibility, fallbackGovernance) {
  let state = announcementState();
  let governance = state.announcementSlotGovernance ?? fallbackGovernance;
  if (state.announcementSlotWinner === null) {
    let candidates_2 = candidates;
    let slot = selectNotices(candidates_2, tierVisibility, governance).slot;
    while (slot?.heldOut?.() === true) {
      let id = slot.id;
      candidates_2 = candidates_2.filter((candidate) => candidate.id !== id);
      slot = selectNotices(candidates_2, tierVisibility, governance).slot;
    }
    let selection = selectNotices(dropHeldOutNotices(candidates_2, slot), tierVisibility, governance);
    if (selection.slot !== null) {
      state.announcementSlotWinner = selection.slot;
      state.announcementSlotGovernance = {
        suppressPromos: governance.suppressPromos,
      };
    }
    return selection;
  }
  let announcementSlotWinner = state.announcementSlotWinner;
  let current = selectNotices(
    dropHeldOutNotices(candidates, announcementSlotWinner),
    tierVisibility,
    governance,
  );
  if (state.announcementSlotReleased || announcementSlotWinner.releasesSlot?.() === true) {
    state.announcementSlotReleased = true;
    return {
      ...current,
      slot: null,
      slotOverflowCount: 0,
    };
  }
  if (current.slot?.id === announcementSlotWinner.id) return current;
  let overflow = current.slot === null ? 0 : current.slotOverflowCount + 1;
  let isStillListed = candidates.some((candidate) => candidate.id === announcementSlotWinner.id);
  return {
    ...current,
    slot: announcementSlotWinner,
    slotOverflowCount: Math.max(0, overflow - (isStillListed ? 1 : 0)),
  };
}
//@ chunk-ag5x7vhf.js:111275-111320 placement
function selectStatusNotices(notices, tierVisibility, governance) {
  return selectNotices(dropHeldOutNotices(notices, null), tierVisibility, governance);
}
//@ chunk-ag5x7vhf.js:111320-111392 placement
function dropHeldOutNotices(notices, heldNotice) {
  return notices.filter((notice) => notice.heldOut === undefined || notice.id === heldNotice?.id);
}
//@ chunk-ag5x7vhf.js:111392-111905 placement
function selectNotices(notices, tierVisibility, { suppressPromos }) {
  let filtered = notices.filter(
    (notice) => isNoticeTierShown(notice.tier, tierVisibility) && !(notice.promo === true && suppressPromos),
  );
  let warnings = filtered.filter(
    (notice) => notice.antOnly !== true && notice.tier !== "info" && notice.tier !== "announcement",
  );
  let ant = isEnvTruthy(env.IS_DEMO) ? [] : filtered.filter((notice) => notice.antOnly === true);
  let filtered_2 = filtered.filter(
    (notice) => notice.antOnly !== true && (notice.tier === "info" || notice.tier === "announcement"),
  );
  let slotNotice = filtered_2.find((notice) => notice.claimsFirstShow?.() === true) ?? null;
  if (slotNotice === null)
    for (let notice of filtered_2) {
      if (slotNotice === null) {
        slotNotice = notice;
        continue;
      }
      let [candidateRank, candidateOrder] = noticeSortKey(notice);
      let [slotRank, slotOrder] = noticeSortKey(slotNotice);
      if (candidateRank < slotRank || (candidateRank === slotRank && candidateOrder < slotOrder))
        slotNotice = notice;
    }
  return {
    warnings,
    slot: slotNotice,
    slotOverflowCount: slotNotice === null ? 0 : filtered_2.length - 1,
    ant,
  };
}
//@ chunk-ag5x7vhf.js:111905-111909 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:111905", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:111909-112284 placement
/**
 * 不可见的触发组件：在可见视口中且有需要认证的 MCP 服务器时，触发认证提示检查。
 */
function McpAuthNoticeTrigger(props) {
  let $ = useMemoCache(9);
  let { count, storageV5 } = props;
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let store = useContext(appStoreContext);
  let [viewportRef, , , isVisible] = useTerminalViewport();
  let effect;
  let deps;
  if (
    $[0] !== isVisible ||
    $[1] !== count ||
    $[2] !== noticeImpressionEnabled ||
    $[3] !== storageV5 ||
    $[4] !== store
  ) {
    effect = () => {
      if (!noticeImpressionEnabled || store === null || count === 0 || isVisible() !== true) {
        return;
      }
      needsAuthNoticeServers(store.getState().mcp.clients, MCP_CONNECTION_CHECKS, storageV5);
    };
    deps = [noticeImpressionEnabled, store, count, storageV5, isVisible];
    $[0] = isVisible;
    $[1] = count;
    $[2] = noticeImpressionEnabled;
    $[3] = storageV5;
    $[4] = store;
    $[5] = effect;
    $[6] = deps;
  } else {
    effect = $[5];
    deps = $[6];
  }
  useEffect(effect, deps);
  let element;
  if ($[7] !== viewportRef) {
    element = jsxProd_default(Box, {
      ref: viewportRef,
    });
    $[7] = viewportRef;
    $[8] = element;
  } else element = $[8];
  return element;
}
//@ chunk-ag5x7vhf.js:112284-112288 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:112284", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:112288-112344 placement
function seenKeysOf(row) {
  return row.seenKey === undefined ? [] : [row.seenKey];
}
//@ chunk-ag5x7vhf.js:112344-112777 placement
/**
 * 不可见的跟踪组件：提示行出现在可见视口时记录已展示，未展示时订阅帧刷新直到记录成功。
 */
function NoticeVisibilityTracker(props) {
  let $ = useMemoCache(9);
  let { rows, storageV5 } = props;
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let { subscribeFrames } = useContext(APP_CONTEXT);
  let [viewportRef, , , isVisible] = useTerminalViewport();
  let effect;
  let deps;
  if (
    $[0] !== isVisible ||
    $[1] !== noticeImpressionEnabled ||
    $[2] !== rows ||
    $[3] !== storageV5 ||
    $[4] !== subscribeFrames
  ) {
    effect = () => {
      let seenKeys = rows.flatMap(seenKeysOf);
      if (!noticeImpressionEnabled || seenKeys.length === 0 || isUnattendedInteractiveSession()) {
        return;
      }
      if (markSecurityWarningsIfVisible(isVisible, seenKeys, storageV5)) {
        return;
      }
      let unsubscribe = subscribeFrames(() => {
        if (markSecurityWarningsIfVisible(isVisible, seenKeys, storageV5)) unsubscribe();
      });
      return unsubscribe;
    };
    deps = [noticeImpressionEnabled, rows, storageV5, isVisible, subscribeFrames];
    $[0] = isVisible;
    $[1] = noticeImpressionEnabled;
    $[2] = rows;
    $[3] = storageV5;
    $[4] = subscribeFrames;
    $[5] = effect;
    $[6] = deps;
  } else {
    effect = $[5];
    deps = $[6];
  }
  useEffect(effect, deps);
  let element;
  if ($[7] !== viewportRef) {
    element = jsxProd_default(Box, {
      ref: viewportRef,
    });
    $[7] = viewportRef;
    $[8] = element;
  } else element = $[8];
  return element;
}
//@ chunk-ag5x7vhf.js:112777-112841 placement
function markSecurityWarningsIfVisible(isVisible, seenKeys, storageV5) {
  let visible = isVisible();
  if (visible === true) markSecurityWarningsSeen(seenKeys, storageV5);
  return visible !== null;
}
//@ chunk-ag5x7vhf.js:112841-112856 placement
function noopMountEffect() {}
//@ chunk-ag5x7vhf.js:112856-112894 placement
function selectSetupIssues(ctx) {
  return ctx.setupIssues;
}
//@ chunk-ag5x7vhf.js:117948-117952 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:117948", () => {
  init_react_production();
});
//@ chunk-ag5x7vhf.js:117952-117956 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:117952", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:312870-312946 fingerprint = getActiveNotices (0.424)
function getActiveNotices(toolUseContext, guard) {
  return {
    ...toolUseContext,
    isMidTurn: guard.isActive,
    dispatchedOverBridge: true,
  };
}
export {
  getActiveNotices,
  noopMountEffect,
  selectSetupIssues,
  resolveAnnouncementSlot,
  selectStatusNotices,
  activeStatusNotices,
  McpAuthNoticeTrigger,
  NoticeVisibilityTracker,
  OAuthExpiryStatusRow,
};
