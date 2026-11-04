/**
 * bridge/bridgeEntitlement.ts
 *
 * 2.1.316 新增：非第一方提供商（gateway/bedrock/mantle/vertex 等）时给出"不支持 Remote Control"的说明文字；生成 Remote Control 诊断用的 GrowthBook 状态行（是否启用、被谁关闭、DISABLE_GROWTHBOOK、特性缓存新鲜度等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-71c4j971.js (35)
 * attribution: placement 35
 */
import {
  hasBridgeEntitlement,
  isBridgeFirstParty,
  prefetchBridgePlanInfo,
  isBridgeSubscriptionEligible,
} from "./bridgeEnabled.js";
import { mergedCommandNames } from "../utils/settings/commandSyncNames.js";
import {
  isRunningInRemoteEnvironment,
  ensurePolicyLimitsLoadedForDiagnostic,
  getRemoteControlPolicyVerdict,
} from "./bridgeGates.js";
import {
  checkGate_CACHED_OR_BLOCKING,
  isGrowthBookEnabled,
  hasFreshGrowthBookFeatures,
  refreshGrowthBookAfterAuthChange,
  getAllGrowthBookFeatures,
} from "../services/analytics/growthbook.js";
import {
  isPolicyLimitsCacheLoaded,
  policyKeyLabel,
  policyDenyKind,
  isSessionVerdictFromServerFetch,
  getResponseFromCache,
  isPolicyRouteMissing,
  isDeniedOnlyByLatch,
  hasNameableComplianceTaint,
  policyDeniedReason,
} from "../services/policyLimits/policyEvidence.js";
import {
  formatPolicyDisabledMessage,
  policyBlockedMessage,
  policy404Message,
  policyUnverifiedMessage,
} from "../services/policyLimits/policyMessages.js";
import {
  getComplianceTaints,
  hipaaTaintsOnly,
  getCurrentTaints,
} from "../services/policyLimits/complianceTaints.js";
import {
  REMOTE_CONTROL_TURNED_OFF_MESSAGE,
  REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE,
  REMOTE_CONTROL_POLICY_UNVERIFIED_MESSAGE,
} from "./remoteControlPolicy.js";
import {
  getPolicyLimitsIneligibleReason,
  PRINCIPALS_NEVER_SERVED,
  getPolicyCacheRevision,
} from "../services/policyLimits/policyState.js";
import { isBridgeEntitlementHintAvailable } from "./bridgeConfig.js";
import { nullStub3 } from "../utils/externalBuildStubs.js";
import {
  getOauthAccountInfo_2,
  getClaudeAIOAuthTokens,
  getConfiguredApiKeyHelper,
  getAnthropicApiKeyWithSource,
  getAuthTokenSource,
  describeHowToDisableAuthTokenSource,
  isClaudeAISubscriber,
  hasProfileScope,
} from "../utils/auth.js";
import { diagnoseBridgeDisabledByEnv } from "./bridgeDisabledDiagnosis.js";
import { env } from "../utils/env.js";
import { bridgeHostState } from "./bridgeHostState.js";
import { isDebugMode } from "../utils/debug.js";
import {
  THIRD_PARTY_PROVIDER_ENV_VARS,
  getAPIProvider,
  THIRD_PARTY_PROVIDER_LABELS,
  getSecondaryProvider,
  isActualFirstPartyAnthropicBaseUrl,
} from "../utils/model/providers.js";
import { isEnvTruthy, isBareMode } from "../utils/envUtils.js";
import { getGlobalConfig } from "../utils/config.js";
import { CLAUDE_AI_INFERENCE_SCOPE } from "../constants/oauth.js";

//@ chunk-71c4j971.js:3910-3950 placement
var SUBSCRIPTION_PLAN_NAMES = ["pro", "max", "team", "enterprise"];
//@ chunk-71c4j971.js:3950-4101 placement
function getBridgeEntitlementBlocker() {
  if (hasBridgeEntitlement()) return null;
  if (!hasClaudeAIInferenceScope()) return "not_signed_in";
  if (!isSubscriberSafe()) return "api_key_auth";
  if (!hasProfileScopeSafe()) return "no_profile_scope";
  return "not_in_rollout";
}
//@ chunk-71c4j971.js:4101-4123 placement
function isBridgeForceEnabledByBuild() {
  return false;
}
//@ chunk-71c4j971.js:4123-4185 placement
function isRemoteControlHardDisabled() {
  return mergedCommandNames()?.settings.disableRemoteControl === true;
}
//@ chunk-71c4j971.js:4185-4226 placement
function isBridgeEnabled() {
  if (isBridgeForceEnabledByBuild()) return true;
  return isBridgeEnabledByDefault();
}
//@ chunk-71c4j971.js:4226-4275 placement
function isBridgeEnabledByDefault() {
  if (isRemoteControlHardDisabled()) return false;
  return !isRunningInRemoteEnvironment() && hasBridgeEntitlement();
}
//@ chunk-71c4j971.js:4275-4299 placement
function isBridgeOffByAnOptInAlone() {
  return false;
}
//@ chunk-71c4j971.js:4299-4355 placement
function isRemoteControlDeploymentAvailable() {
  if (isBridgeForceEnabledByBuild()) return true;
  return !isRemoteControlHardDisabled() && !isRunningInRemoteEnvironment() && isBridgeFirstParty();
}
//@ chunk-71c4j971.js:4355-4404 placement
async function isBridgeEnabledBlocking(options) {
  return (await getBridgeBlockedCode(options)) === null;
}
//@ chunk-71c4j971.js:4404-4735 placement
async function getBridgeBlockedCode(options) {
  if (isBridgeForceEnabledByBuild()) return null;
  if (isRemoteControlHardDisabled()) return "managed_disabled";
  if (!isBridgeFirstParty()) return "not_first_party";
  if (isRunningInRemoteEnvironment()) return "cloud_session";
  if (!isSubscriberSafe()) return hasClaudeAIInferenceScope() ? "not_subscription_auth" : "not_signed_in";
  await prefetchBridgePlanInfo(options);
  if (isBridgeSubscriptionEligible() || (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bridge"))) return null;
  if (!isGrowthBookEnabled()) return "flags_disabled";
  return hasFreshGrowthBookFeatures() ? "gate_off" : "flags_unreachable";
}
//@ chunk-71c4j971.js:4735-4869 placement
/**
 * 远程控制被组织策略禁用的提示文案，以及一天的毫秒数和定时器允许的最大延迟（2^31−1 毫秒）。
 */
var REMOTE_CONTROL_POLICY_DISABLED =
  "Remote Control is disabled by your organization's policy. Contact your organization admin for access.";
var DAY_MS = 86400000;
var MAX_TIMER_MS = 2147483647;
//@ chunk-71c4j971.js:4869-4895 placement
function hasLoadedPolicyLimitsCache() {
  return isPolicyLimitsCacheLoaded();
}
//@ chunk-71c4j971.js:4895-4988 placement
function describeRemoteControlPolicyDenial() {
  let { featureLabel, verb } = policyKeyLabel("allow_remote_control");
  return formatPolicyDisabledMessage(
    featureLabel,
    verb,
    getComplianceTaints(),
    REMOTE_CONTROL_POLICY_DISABLED,
  );
}
//@ chunk-71c4j971.js:4988-5613 placement
function connectedBridgePolicyRefusal(isConnected) {
  let policyKeys = isConnected ? ["allow_remote_control", "allow_remote_sessions"] : ["allow_remote_control"];
  try {
    for (let policyKey of policyKeys) {
      let denyKind = policyDenyKind(policyKey);
      switch (denyKind) {
        case null:
        case "cache_miss":
        case "route_missing":
          continue;
        case "latched": {
          if (!isSessionVerdictFromServerFetch() && !isPrincipalNeverServedByPolicy()) continue;
          let { featureLabel, verb } = policyKeyLabel(policyKey);
          return {
            policy: policyKey,
            kind: denyKind,
            detail: policyBlockedMessage(featureLabel, verb),
          };
        }
        case "org_denied":
          if (
            getResponseFromCache()?.restrictions[policyKey]?.allowed !== false &&
            !isSessionVerdictFromServerFetch() &&
            !isPrincipalNeverServedByPolicy()
          )
            continue;
          return {
            policy: policyKey,
            kind: denyKind,
            detail:
              policyKey === "allow_remote_control"
                ? REMOTE_CONTROL_TURNED_OFF_MESSAGE
                : "Session mirroring was turned off by your organization's policy (allow_remote_sessions).",
          };
        default:
          return {
            policy: policyKey,
            kind: "org_denied",
            detail: REMOTE_CONTROL_TURNED_OFF_MESSAGE,
          };
      }
    }
    return null;
  } catch {
    return null;
  }
}
//@ chunk-71c4j971.js:5613-5667 placement
function isPrincipalNeverServedByPolicy() {
  let policyLimitsIneligibleReason = getPolicyLimitsIneligibleReason();
  return (
    policyLimitsIneligibleReason !== undefined && PRINCIPALS_NEVER_SERVED.has(policyLimitsIneligibleReason)
  );
}
//@ chunk-71c4j971.js:5667-5719 placement
var bridgeBlockedResult = (code, reason) => ({
  reason,
  code,
  orgPolicyDenied: false,
});
//@ chunk-71c4j971.js:5719-7973 placement
async function getBridgeDisabledDiagnosis() {
  if (isBridgeForceEnabledByBuild()) return null;
  if (!isBridgeFirstParty())
    return bridgeBlockedResult("not_first_party", describeNonFirstPartyBridgeBlock());
  if (isRunningInRemoteEnvironment())
    return bridgeBlockedResult("cloud_session", "Remote Control is not available inside a cloud session.");
  if (isRemoteControlHardDisabled())
    return bridgeBlockedResult("managed_disabled", REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE);
  if (!hasClaudeAIInferenceScope())
    return bridgeBlockedResult(
      "not_signed_in",
      "Remote Control requires a claude.ai subscription. Run `claude auth login` to sign in with your claude.ai account.",
    );
  if (!isSubscriberSafe())
    return bridgeBlockedResult(
      "not_subscription_auth",
      describeAuthPrecedenceBlocker({
        prefix: "Remote Control requires claude.ai subscription auth.",
        suffix: "to use Remote Control.",
      }),
    );
  await prefetchBridgePlanInfo(undefined);
  let hasEntitlementHint = isBridgeEntitlementHintAvailable();
  if (!hasEntitlementHint && !hasProfileScopeSafe())
    return bridgeBlockedResult(
      "token_scope_limited",
      nullStub3() ??
        "Remote Control requires a full-scope login token. Long-lived tokens (from `claude setup-token` or CLAUDE_CODE_OAUTH_TOKEN) are limited to inference-only for security reasons. Run `claude auth login` to use Remote Control.",
    );
  if (!hasEntitlementHint && !getOauthAccountInfo_2()?.organizationUuid)
    return bridgeBlockedResult(
      "no_organization",
      "Unable to determine your organization for Remote Control eligibility. Run `claude auth login` to refresh your account information.",
    );
  await ensurePolicyLimitsLoadedForDiagnostic();
  let remoteControlPolicyVerdict = getRemoteControlPolicyVerdict();
  if (remoteControlPolicyVerdict === "unavailable")
    return bridgeBlockedResult("policy_unverified", REMOTE_CONTROL_POLICY_UNVERIFIED_MESSAGE);
  if (remoteControlPolicyVerdict === "denied")
    return {
      reason: remoteControlPolicyMessage(),
      code: "org_policy_denied",
      orgPolicyDenied: true,
    };
  if (isBridgeSubscriptionEligible()) return null;
  if (!isGrowthBookEnabled()) {
    let blockingEnvVar = diagnoseBridgeDisabledByEnv();
    if (blockingEnvVar)
      return bridgeBlockedResult(
        "flags_disabled",
        `Remote Control requires feature-flag evaluation, which is disabled because ${blockingEnvVar} is set. Unset it (or run in a shell without it) to use Remote Control.`,
      );
    if (env.DISABLE_GROWTHBOOK)
      return bridgeBlockedResult(
        "flags_disabled",
        "Remote Control requires feature-flag evaluation, which is disabled because DISABLE_GROWTHBOOK is set. Unset it (or run in a shell without it) to use Remote Control.",
      );
    return bridgeBlockedResult(
      "flags_disabled",
      "Remote Control requires feature-flag evaluation, which is unavailable in this environment.",
    );
  }
  if (!(await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bridge"))) {
    if (!hasFreshGrowthBookFeatures()) {
      refreshGrowthBookAfterAuthChange();
      if (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bridge")) return null;
      if (!hasFreshGrowthBookFeatures())
        return bridgeBlockedResult(
          "flags_unreachable",
          "Couldn't verify Remote Control eligibility \u2014 the feature-flag service was unreachable (offline or blocked). Retry, or run with `--debug` / `claude doctor` for details.",
        );
    }
    return bridgeBlockedResult(
      "gate_off",
      "Remote Control isn't enabled for this account. If you recently changed plans, run `claude auth logout` then `claude auth login` to refresh your entitlements, or `claude doctor` for details.",
    );
  }
  return null;
}
//@ chunk-71c4j971.js:7973-8026 placement
async function getBridgeDisabledReasonAsync() {
  return (await getBridgeDisabledDiagnosis())?.reason ?? null;
}
//@ chunk-71c4j971.js:8026-8233 placement
function remoteControlPolicyMessage() {
  try {
    if (isPolicyRouteMissing()) return policy404Message("Remote Control");
    if (isDeniedOnlyByLatch("allow_remote_control")) return policyBlockedMessage("Remote Control", "is");
    if (!hasLoadedPolicyLimitsCache()) return policyUnverifiedMessage("Remote Control");
    if (!hasNameableComplianceTaint()) return REMOTE_CONTROL_POLICY_DISABLED;
    return describeRemoteControlPolicyDenial();
  } catch {
    return REMOTE_CONTROL_POLICY_UNVERIFIED_MESSAGE;
  }
}
//@ chunk-71c4j971.js:8233-8304 placement
var ORG_CONFIG_NOT_ADMIN_SETTING_DETAIL = "set by your organization's configuration, not an admin setting";
//@ chunk-71c4j971.js:8304-8490 placement
function isAuthoritativeTaintDenial({ policyVerdict, policyDenialIsAuthoritative, currentTaints }) {
  if (policyVerdict !== "denied" || !policyDenialIsAuthoritative) return false;
  try {
    return (
      !isPolicyRouteMissing() &&
      !isDeniedOnlyByLatch("allow_remote_control") &&
      hipaaTaintsOnly(currentTaints).length > 0
    );
  } catch {
    return false;
  }
}
//@ chunk-71c4j971.js:8490-8726 placement
function getRemoteControlPolicyLockReason() {
  if (isBridgeForceEnabledByBuild()) return null;
  if (isRemoteControlHardDisabled()) return REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE;
  let hostState = bridgeHostState();
  let policyCacheRevision = getPolicyCacheRevision();
  let remoteControlLockReason = hostState.remoteControlLockReason;
  if (
    remoteControlLockReason !== undefined &&
    remoteControlLockReason.policyCacheRevision === policyCacheRevision
  )
    return remoteControlLockReason.reason;
  let reason = describeRemoteControlPolicyVerdict();
  hostState.remoteControlLockReason = {
    policyCacheRevision,
    reason,
  };
  return reason;
}
//@ chunk-71c4j971.js:8726-8824 placement
function describeRemoteControlPolicyVerdict() {
  let remoteControlPolicyVerdict = getRemoteControlPolicyVerdict();
  if (remoteControlPolicyVerdict === "allowed") return null;
  if (remoteControlPolicyVerdict === "unavailable") return REMOTE_CONTROL_POLICY_UNVERIFIED_MESSAGE;
  return remoteControlPolicyMessage();
}
//@ chunk-71c4j971.js:8824-8955 placement (2.1.88 match: checkBridgePrerequisites, 0.556)
function remoteControlPolicyDeniedReason() {
  return policyDeniedReason(
    "allow_remote_control",
    "Remote Control",
    "is",
    "Remote Control is disabled by your organization's policy.",
  );
}
//@ chunk-71c4j971.js:8955-9928 placement
function getBridgeAuthDebugInfo() {
  if (!isDebugMode()) return "";
  let describeFlag = (value) => (value ? "set" : "unset");
  try {
    let claudeAIOAuthTokens = getClaudeAIOAuthTokens();
    let filtered = Object.values(THIRD_PARTY_PROVIDER_ENV_VARS).filter((envVarName) =>
      isEnvTruthy(process.env[envVarName]),
    );
    return [
      "",
      "[debug] Remote Control auth state:",
      `  isBareMode=${isBareMode()}`,
      `  hasOAuthAccessToken=${!!claudeAIOAuthTokens?.accessToken}`,
      `  oauthScopes=${claudeAIOAuthTokens?.scopes?.join(",") ?? "none"}`,
      `  hasClaudeAIInferenceScope=${hasClaudeAIInferenceScope()}`,
      `  isClaudeAISubscriber=${isSubscriberSafe()}`,
      `  hasProfileScope=${hasProfileScopeSafe()}`,
      `  oauthAccount.organizationUuid=${getOauthAccountInfo_2()?.organizationUuid ? "set" : "unset"}`,
      `  ANTHROPIC_API_KEY=${describeFlag(process.env.ANTHROPIC_API_KEY)}`,
      `  ANTHROPIC_AUTH_TOKEN=${describeFlag(process.env.ANTHROPIC_AUTH_TOKEN)}`,
      `  apiKeyHelper=${getConfiguredApiKeyHelper() ? "set" : "unset"}`,
      `  CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR=${describeFlag(process.env.CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR)}`,
      `  CLAUDE_CODE_OAUTH_TOKEN=${describeFlag(process.env.CLAUDE_CODE_OAUTH_TOKEN)}`,
      `  ANTHROPIC_UNIX_SOCKET=${describeFlag(process.env.ANTHROPIC_UNIX_SOCKET)}`,
      `  3P env=${filtered.length ? filtered.join(",") : "none"}`,
      ...describeGrowthBookStateForDiagnostic(),
    ].join(`
`);
  } catch (error) {
    return `
[debug] failed to collect auth state: ${error}`;
  }
}
//@ chunk-71c4j971.js:9928-10342 placement
/**
 * 生成 Remote Control 诊断用的 GrowthBook 状态行（是否启用、被谁关闭、DISABLE_GROWTHBOOK、特性缓存新鲜度等）。
 */
function describeGrowthBookStateForDiagnostic() {
  let describeFlag = (value) => (value ? "set" : "unset");
  let allGrowthBookFeatures = getAllGrowthBookFeatures();
  let cachedGrowthBookFeaturesAt = getCachedGrowthBookFeaturesAt();
  return [
    `  isGrowthBookEnabled=${isGrowthBookEnabled()}`,
    `  telemetryDisabledBy=${diagnoseBridgeDisabledByEnv() ?? "none"}`,
    `  DISABLE_GROWTHBOOK=${describeFlag(process.env.DISABLE_GROWTHBOOK)}`,
    `  hasFreshGrowthBookFeatures=${hasFreshGrowthBookFeatures()}`,
    `  growthBookFeaturesLoaded=${Object.keys(allGrowthBookFeatures).length}`,
    `  growthBookLastFetched=${cachedGrowthBookFeaturesAt ? `${formatDurationShort(Date.now() - cachedGrowthBookFeaturesAt)} ago` : "never"}`,
    `  tengu_ccr_bridge=${String(allGrowthBookFeatures.tengu_ccr_bridge ?? "unset")}`,
  ];
}
//@ chunk-71c4j971.js:10342-12317 placement
async function getBridgeDoctorInfo() {
  if (isRunningInRemoteEnvironment() && !isBridgeForceEnabledByBuild())
    return {
      disabledReason: null,
      inRemoteSession: true,
      checks: [],
    };
  refreshGrowthBookAfterAuthChange();
  await ensurePolicyLimitsLoadedForDiagnostic();
  let bridgeDisabledReason = await getBridgeDisabledReasonAsync();
  let telemetryBlockReason =
    diagnoseBridgeDisabledByEnv() ?? (env.DISABLE_GROWTHBOOK ? "DISABLE_GROWTHBOOK" : null);
  let isFirstParty = isBridgeFirstParty();
  let notPolicyDisabled = !isRemoteControlHardDisabled();
  let hasInferenceScope = hasClaudeAIInferenceScope();
  let isSubscriber = isSubscriberSafe();
  let hasEntitlementHint = isBridgeEntitlementHintAvailable();
  let hasProfileScope = hasEntitlementHint || hasProfileScopeSafe();
  let hasOrganization = hasEntitlementHint || !!getOauthAccountInfo_2()?.organizationUuid;
  let remoteControlPolicyVerdict = getRemoteControlPolicyVerdict();
  let policyLimitsLoaded = hasLoadedPolicyLimitsCache();
  let isTaintDenial = isAuthoritativeTaintDenial({
    policyVerdict: remoteControlPolicyVerdict,
    policyDenialIsAuthoritative: policyLimitsLoaded,
    currentTaints: getCurrentTaints(),
  });
  let growthBookEnabled = isGrowthBookEnabled();
  let planEligible = isBridgeSubscriptionEligible();
  let gateEnabled = planEligible || (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bridge"));
  let hasFreshFeatures = hasFreshGrowthBookFeatures();
  let checks = [
    {
      label: isFirstParty
        ? "Connected to the Anthropic API (api.anthropic.com)"
        : "Not connected to the Anthropic API (api.anthropic.com)",
      ok: isFirstParty,
    },
    {
      label: notPolicyDisabled
        ? "Not disabled by org policy (disableRemoteControl)"
        : "Disabled by org policy (disableRemoteControl)",
      ok: notPolicyDisabled,
    },
    {
      label: hasInferenceScope ? "Signed in to claude.ai" : "Not signed in to claude.ai",
      ok: hasInferenceScope,
    },
    {
      label: isSubscriber ? "claude.ai subscription active" : "claude.ai subscription auth not active",
      ok: isSubscriber,
    },
    {
      label: hasProfileScope
        ? "Sign-in includes the user:profile scope"
        : "Sign-in is missing the user:profile scope",
      ok: hasProfileScope,
    },
    {
      label: hasOrganization ? "Organization resolved" : "Organization not resolved",
      ok: hasOrganization,
    },
    {
      label:
        remoteControlPolicyVerdict === "allowed"
          ? "Org policy allows Remote Control (allow_remote_control)"
          : remoteControlPolicyVerdict === "unavailable"
            ? "Org policy could not be verified (allow_remote_control)"
            : !policyLimitsLoaded
              ? "Org policy not loaded, see the Organization policy line above (allow_remote_control)"
              : "Org policy does not allow Remote Control (allow_remote_control)",
      ok: remoteControlPolicyVerdict === "allowed",
      detail: isTaintDenial ? ORG_CONFIG_NOT_ADMIN_SETTING_DETAIL : undefined,
    },
    {
      label: growthBookEnabled ? "Feature-flag evaluation enabled" : "Feature-flag evaluation disabled",
      ok: growthBookEnabled || planEligible,
      detail: telemetryBlockReason
        ? planEligible
          ? `disabled by ${telemetryBlockReason}; Remote Control does not need it on a paid plan`
          : `disabled by ${telemetryBlockReason}`
        : undefined,
    },
    {
      label: gateEnabled
        ? "Remote Control enabled for this account"
        : hasFreshFeatures
          ? "Remote Control not enabled for this account"
          : "Remote Control availability could not be verified",
      ok: gateEnabled,
      detail: planEligible
        ? "decided from your plan, feature flags are off"
        : hasFreshFeatures
          ? undefined
          : "no server response this session",
    },
  ];
  return {
    disabledReason:
      bridgeDisabledReason !== null &&
      isFirstParty &&
      notPolicyDisabled &&
      hasInferenceScope &&
      isSubscriber &&
      hasProfileScope &&
      hasOrganization &&
      remoteControlPolicyVerdict === "denied" &&
      !policyLimitsLoaded
        ? "Remote Control needs your organization's policy, which isn't loaded \u2014 see the Organization policy line above."
        : bridgeDisabledReason,
    inRemoteSession: false,
    checks,
  };
}
//@ chunk-71c4j971.js:12317-12388 placement
function getCachedGrowthBookFeaturesAt() {
  try {
    return getGlobalConfig().cachedGrowthBookFeaturesAt;
  } catch {
    return;
  }
}
//@ chunk-71c4j971.js:12388-12571 placement
function formatDurationShort(durationMs) {
  let rounded = Math.round(durationMs / 1000);
  if (rounded < 120) return `${rounded}s`;
  let rounded_2 = Math.round(rounded / 60);
  if (rounded_2 < 120) return `${rounded_2}m`;
  let rounded_3 = Math.round(rounded_2 / 60);
  if (rounded_3 < 48) return `${rounded_3}h`;
  return `${Math.round(rounded_3 / 24)}d`;
}
//@ chunk-71c4j971.js:12571-13527 placement
function describeAuthPrecedenceBlocker({ prefix, suffix }) {
  try {
    let { source } = getAnthropicApiKeyWithSource({
      skipRetrievingKeyFromApiKeyHelper: true,
    });
    if (source === "ANTHROPIC_API_KEY")
      return `${prefix} ANTHROPIC_API_KEY is set, so this session is using API-key auth \u2014 unset it (or run in a shell without it) ${suffix}`;
    if (source === "apiKeyHelper")
      return `${prefix} apiKeyHelper is configured, so this session is using API-key auth \u2014 unset it ${suffix}`;
    if (process.env.ANTHROPIC_AUTH_TOKEN)
      return `${prefix} ANTHROPIC_AUTH_TOKEN is set, so this session is using API-key auth \u2014 unset it (or run in a shell without it) ${suffix}`;
    let { source: source_2 } = getAuthTokenSource();
    let disableHint = describeHowToDisableAuthTokenSource(source_2);
    if (source_2 !== "none" && disableHint)
      return `${prefix} This session is using ${source_2} auth \u2014 ${disableHint}`;
    if (process.env.ANTHROPIC_UNIX_SOCKET)
      return `${prefix} ANTHROPIC_UNIX_SOCKET is set without CLAUDE_CODE_OAUTH_TOKEN, so requests on the socket carry no claude.ai login (on a claude ssh remote: the local machine is API-key-authed).`;
  } catch {}
  return `${prefix} Unset ANTHROPIC_API_KEY / apiKeyHelper / ANTHROPIC_AUTH_TOKEN ${suffix}`;
}
//@ chunk-71c4j971.js:13527-13748 placement
var REMOTE_CONTROL_FIRST_PARTY_ONLY =
  "Remote Control is only available when using Claude via api.anthropic.com.";
var UNSET_IT_CLAUSE = "unset it (or run in a shell without it) to use Remote Control.";
var UNSET_THEM_CLAUSE = "unset them (or run in a shell without them) to use Remote Control.";
//@ chunk-71c4j971.js:13748-14591 placement
/**
 * 非第一方提供商（gateway/bedrock/mantle/vertex 等）时给出"不支持 Remote Control"的说明文字。
 */
function describeNonFirstPartyBridgeBlock() {
  let apiProvider = getAPIProvider();
  if (apiProvider !== "firstParty") {
    if (apiProvider === "gateway")
      return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} This session uses a ${THIRD_PARTY_PROVIDER_LABELS.gateway}, which does not support Remote Control.`;
    if (apiProvider === "bedrock" && getSecondaryProvider() === "mantle")
      return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} ${THIRD_PARTY_PROVIDER_ENV_VARS.bedrock} and ${THIRD_PARTY_PROVIDER_ENV_VARS.mantle} are set, so this session is using ${THIRD_PARTY_PROVIDER_LABELS.bedrock} + ${THIRD_PARTY_PROVIDER_LABELS.mantle} \u2014 ${UNSET_THEM_CLAUSE}`;
    return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} ${THIRD_PARTY_PROVIDER_ENV_VARS[apiProvider]} is set, so this session is using ${THIRD_PARTY_PROVIDER_LABELS[apiProvider]} \u2014 ${UNSET_IT_CLAUSE}`;
  }
  if (!isActualFirstPartyAnthropicBaseUrl()) {
    let assumeFlagNote = env._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL
      ? " (_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL does not apply to Remote Control.)"
      : "";
    return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} ANTHROPIC_BASE_URL is set and does not point at api.anthropic.com, so this session is using a custom endpoint \u2014 ${UNSET_IT_CLAUSE}${assumeFlagNote}`;
  }
  if (env.ANTHROPIC_UNIX_SOCKET)
    return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} ANTHROPIC_UNIX_SOCKET is set, so this session sends requests through a local socket rather than to api.anthropic.com \u2014 ${UNSET_IT_CLAUSE}`;
  return REMOTE_CONTROL_FIRST_PARTY_ONLY;
}
//@ chunk-71c4j971.js:14591-14667 placement
function hasClaudeAIInferenceScope() {
  try {
    return Boolean(getClaudeAIOAuthTokens()?.scopes?.includes(CLAUDE_AI_INFERENCE_SCOPE));
  } catch {
    return false;
  }
}
//@ chunk-71c4j971.js:14667-14712 placement
function isSubscriberSafe() {
  try {
    return isClaudeAISubscriber();
  } catch {
    return false;
  }
}
//@ chunk-71c4j971.js:14712-14757 placement
function hasProfileScopeSafe() {
  try {
    return hasProfileScope();
  } catch {
    return false;
  }
}
export {
  isSubscriberSafe,
  SUBSCRIPTION_PLAN_NAMES,
  hasProfileScopeSafe,
  connectedBridgePolicyRefusal,
  isBridgeEnabled,
  getBridgeDisabledDiagnosis,
  getRemoteControlPolicyLockReason,
  isRemoteControlHardDisabled,
  isRemoteControlDeploymentAvailable,
  getBridgeDoctorInfo,
  isBridgeOffByAnOptInAlone,
  DAY_MS,
  MAX_TIMER_MS,
  isBridgeEnabledBlocking,
  getBridgeBlockedCode,
  describeRemoteControlPolicyDenial,
  describeAuthPrecedenceBlocker,
  getBridgeEntitlementBlocker,
  getBridgeAuthDebugInfo,
  remoteControlPolicyDeniedReason,
};
