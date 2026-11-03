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
import { DU } from "../utils/settings/commandSyncNames.js";
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
import { getComplianceTaints, Cle, getCurrentTaints } from "../services/policyLimits/complianceTaints.js";
import { z9o, REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE, E8r } from "./remoteControlPolicy.js";
import {
  getPolicyLimitsIneligibleReason,
  PRINCIPALS_NEVER_SERVED,
  getPolicyCacheRevision,
} from "../services/policyLimits/policyState.js";
import { U } from "./bridgeConfig.js";
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
import { ao } from "./bridgeHostState.js";
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
var k = ["pro", "max", "team", "enterprise"];
//@ chunk-71c4j971.js:3950-4101 placement
function getBridgeEntitlementBlocker() {
  if (hasBridgeEntitlement()) return null;
  if (!p()) return "not_signed_in";
  if (!f()) return "api_key_auth";
  if (!hasProfileScopeSafe()) return "no_profile_scope";
  return "not_in_rollout";
}
//@ chunk-71c4j971.js:4101-4123 placement
function c() {
  return !1;
}
//@ chunk-71c4j971.js:4123-4185 placement
function isRemoteControlHardDisabled() {
  return DU()?.settings.disableRemoteControl === !0;
}
//@ chunk-71c4j971.js:4185-4226 placement
function isBridgeEnabled() {
  if (c()) return !0;
  return q();
}
//@ chunk-71c4j971.js:4226-4275 placement
function q() {
  if (isRemoteControlHardDisabled()) return !1;
  return !isRunningInRemoteEnvironment() && hasBridgeEntitlement();
}
//@ chunk-71c4j971.js:4275-4299 placement
function isBridgeOffByAnOptInAlone() {
  return !1;
}
//@ chunk-71c4j971.js:4299-4355 placement
function isRemoteControlDeploymentAvailable() {
  if (c()) return !0;
  return !isRemoteControlHardDisabled() && !isRunningInRemoteEnvironment() && isBridgeFirstParty();
}
//@ chunk-71c4j971.js:4355-4404 placement
async function isBridgeEnabledBlocking(e) {
  return (await getBridgeBlockedCode(e)) === null;
}
//@ chunk-71c4j971.js:4404-4735 placement
async function getBridgeBlockedCode(e) {
  if (c()) return null;
  if (isRemoteControlHardDisabled()) return "managed_disabled";
  if (!isBridgeFirstParty()) return "not_first_party";
  if (isRunningInRemoteEnvironment()) return "cloud_session";
  if (!f()) return p() ? "not_subscription_auth" : "not_signed_in";
  if (
    (await prefetchBridgePlanInfo(e),
    isBridgeSubscriptionEligible() || (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bridge")))
  )
    return null;
  if (!isGrowthBookEnabled()) return "flags_disabled";
  return hasFreshGrowthBookFeatures() ? "gate_off" : "flags_unreachable";
}
/**
 * 远程控制被组织策略禁用的提示文案，以及一天的毫秒数和定时器允许的最大延迟（2^31−1 毫秒）。
 */
//@ chunk-71c4j971.js:4735-4869 placement
var REMOTE_CONTROL_POLICY_DISABLED =
    "Remote Control is disabled by your organization's policy. Contact your organization admin for access.",
  DAY_MS = 86400000,
  MAX_TIMER_MS = 2147483647;
//@ chunk-71c4j971.js:4869-4895 placement
function G() {
  return isPolicyLimitsCacheLoaded();
}
//@ chunk-71c4j971.js:4895-4988 placement
function describeRemoteControlPolicyDenial() {
  let { featureLabel: featureLabel, verb: verb } = policyKeyLabel("allow_remote_control");
  return formatPolicyDisabledMessage(
    featureLabel,
    verb,
    getComplianceTaints(),
    REMOTE_CONTROL_POLICY_DISABLED,
  );
}
//@ chunk-71c4j971.js:4988-5613 placement
function connectedBridgePolicyRefusal(e) {
  let o = e ? ["allow_remote_control", "allow_remote_sessions"] : ["allow_remote_control"];
  try {
    for (let n of o) {
      let r = policyDenyKind(n);
      switch (r) {
        case null:
        case "cache_miss":
        case "route_missing":
          continue;
        case "latched": {
          if (!isSessionVerdictFromServerFetch() && !L()) continue;
          let { featureLabel: featureLabel, verb: verb } = policyKeyLabel(n);
          return { policy: n, kind: r, detail: policyBlockedMessage(featureLabel, verb) };
        }
        case "org_denied":
          if (
            getResponseFromCache()?.restrictions[n]?.allowed !== !1 &&
            !isSessionVerdictFromServerFetch() &&
            !L()
          )
            continue;
          return {
            policy: n,
            kind: r,
            detail:
              n === "allow_remote_control"
                ? z9o
                : "Session mirroring was turned off by your organization's policy (allow_remote_sessions).",
          };
        default:
          return { policy: n, kind: "org_denied", detail: z9o };
      }
    }
    return null;
  } catch {
    return null;
  }
}
//@ chunk-71c4j971.js:5613-5667 placement
function L() {
  let e = getPolicyLimitsIneligibleReason();
  return e !== void 0 && PRINCIPALS_NEVER_SERVED.has(e);
}
//@ chunk-71c4j971.js:5667-5719 placement
var s = (e, o) => ({ reason: o, code: e, orgPolicyDenied: !1 });
//@ chunk-71c4j971.js:5719-7973 placement
async function getBridgeDisabledDiagnosis() {
  if (c()) return null;
  if (!isBridgeFirstParty()) return s("not_first_party", describeNonFirstPartyBridgeBlock());
  if (isRunningInRemoteEnvironment())
    return s("cloud_session", "Remote Control is not available inside a cloud session.");
  if (isRemoteControlHardDisabled()) return s("managed_disabled", REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE);
  if (!p())
    return s(
      "not_signed_in",
      "Remote Control requires a claude.ai subscription. Run `claude auth login` to sign in with your claude.ai account.",
    );
  if (!f())
    return s(
      "not_subscription_auth",
      describeAuthPrecedenceBlocker({
        prefix: "Remote Control requires claude.ai subscription auth.",
        suffix: "to use Remote Control.",
      }),
    );
  await prefetchBridgePlanInfo(void 0);
  let e = U();
  if (!e && !hasProfileScopeSafe())
    return s(
      "token_scope_limited",
      nullStub3() ??
        "Remote Control requires a full-scope login token. Long-lived tokens (from `claude setup-token` or CLAUDE_CODE_OAUTH_TOKEN) are limited to inference-only for security reasons. Run `claude auth login` to use Remote Control.",
    );
  if (!e && !getOauthAccountInfo_2()?.organizationUuid)
    return s(
      "no_organization",
      "Unable to determine your organization for Remote Control eligibility. Run `claude auth login` to refresh your account information.",
    );
  await ensurePolicyLimitsLoadedForDiagnostic();
  let o = getRemoteControlPolicyVerdict();
  if (o === "unavailable") return s("policy_unverified", E8r);
  if (o === "denied")
    return { reason: remoteControlPolicyMessage(), code: "org_policy_denied", orgPolicyDenied: !0 };
  if (isBridgeSubscriptionEligible()) return null;
  if (!isGrowthBookEnabled()) {
    let n = diagnoseBridgeDisabledByEnv();
    if (n)
      return s(
        "flags_disabled",
        `Remote Control requires feature-flag evaluation, which is disabled because ${n} is set. Unset it (or run in a shell without it) to use Remote Control.`,
      );
    if (env.DISABLE_GROWTHBOOK)
      return s(
        "flags_disabled",
        "Remote Control requires feature-flag evaluation, which is disabled because DISABLE_GROWTHBOOK is set. Unset it (or run in a shell without it) to use Remote Control.",
      );
    return s(
      "flags_disabled",
      "Remote Control requires feature-flag evaluation, which is unavailable in this environment.",
    );
  }
  if (!(await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bridge"))) {
    if (!hasFreshGrowthBookFeatures()) {
      if ((refreshGrowthBookAfterAuthChange(), await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bridge")))
        return null;
      if (!hasFreshGrowthBookFeatures())
        return s(
          "flags_unreachable",
          "Couldn't verify Remote Control eligibility \u2014 the feature-flag service was unreachable (offline or blocked). Retry, or run with `--debug` / `claude doctor` for details.",
        );
    }
    return s(
      "gate_off",
      "Remote Control isn't enabled for this account. If you recently changed plans, run `claude auth logout` then `claude auth login` to refresh your entitlements, or `claude doctor` for details.",
    );
  }
  return null;
}
//@ chunk-71c4j971.js:7973-8026 placement
async function Q() {
  return (await getBridgeDisabledDiagnosis())?.reason ?? null;
}
//@ chunk-71c4j971.js:8026-8233 placement
function remoteControlPolicyMessage() {
  try {
    if (isPolicyRouteMissing()) return policy404Message("Remote Control");
    if (isDeniedOnlyByLatch("allow_remote_control")) return policyBlockedMessage("Remote Control", "is");
    if (!G()) return policyUnverifiedMessage("Remote Control");
    if (!hasNameableComplianceTaint()) return REMOTE_CONTROL_POLICY_DISABLED;
    return describeRemoteControlPolicyDenial();
  } catch {
    return E8r;
  }
}
//@ chunk-71c4j971.js:8233-8304 placement
var Z = "set by your organization's configuration, not an admin setting";
//@ chunk-71c4j971.js:8304-8490 placement
function isAuthoritativeTaintDenial({
  policyVerdict: policyVerdict,
  policyDenialIsAuthoritative: policyDenialIsAuthoritative,
  currentTaints: currentTaints,
}) {
  if (policyVerdict !== "denied" || !policyDenialIsAuthoritative) return !1;
  try {
    return (
      !isPolicyRouteMissing() && !isDeniedOnlyByLatch("allow_remote_control") && Cle(currentTaints).length > 0
    );
  } catch {
    return !1;
  }
}
//@ chunk-71c4j971.js:8490-8726 placement
function getRemoteControlPolicyLockReason() {
  if (c()) return null;
  if (isRemoteControlHardDisabled()) return REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE;
  let e = ao(),
    o = getPolicyCacheRevision(),
    remoteControlLockReason = e.remoteControlLockReason;
  if (remoteControlLockReason !== void 0 && remoteControlLockReason.policyCacheRevision === o)
    return remoteControlLockReason.reason;
  let r = te();
  return ((e.remoteControlLockReason = { policyCacheRevision: o, reason: r }), r);
}
//@ chunk-71c4j971.js:8726-8824 placement
function te() {
  let e = getRemoteControlPolicyVerdict();
  if (e === "allowed") return null;
  if (e === "unavailable") return E8r;
  return remoteControlPolicyMessage();
}
//@ chunk-71c4j971.js:8824-8955 placement = checkBridgePrerequisites (0.556)
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
  let e = (o) => (o ? "set" : "unset");
  try {
    let o = getClaudeAIOAuthTokens(),
      filtered = Object.values(THIRD_PARTY_PROVIDER_ENV_VARS).filter((r) => isEnvTruthy(process.env[r]));
    return [
      "",
      "[debug] Remote Control auth state:",
      `  isBareMode=${isBareMode()}`,
      `  hasOAuthAccessToken=${!!o?.accessToken}`,
      `  oauthScopes=${o?.scopes?.join(",") ?? "none"}`,
      `  hasClaudeAIInferenceScope=${p()}`,
      `  isClaudeAISubscriber=${f()}`,
      `  hasProfileScope=${hasProfileScopeSafe()}`,
      `  oauthAccount.organizationUuid=${getOauthAccountInfo_2()?.organizationUuid ? "set" : "unset"}`,
      `  ANTHROPIC_API_KEY=${e(process.env.ANTHROPIC_API_KEY)}`,
      `  ANTHROPIC_AUTH_TOKEN=${e(process.env.ANTHROPIC_AUTH_TOKEN)}`,
      `  apiKeyHelper=${getConfiguredApiKeyHelper() ? "set" : "unset"}`,
      `  CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR=${e(process.env.CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR)}`,
      `  CLAUDE_CODE_OAUTH_TOKEN=${e(process.env.CLAUDE_CODE_OAUTH_TOKEN)}`,
      `  ANTHROPIC_UNIX_SOCKET=${e(process.env.ANTHROPIC_UNIX_SOCKET)}`,
      `  3P env=${filtered.length ? filtered.join(",") : "none"}`,
      ...describeGrowthBookStateForDiagnostic(),
    ].join(`
`);
  } catch (error) {
    return `
[debug] failed to collect auth state: ${error}`;
  }
}
/**
 * 生成 Remote Control 诊断用的 GrowthBook 状态行（是否启用、被谁关闭、DISABLE_GROWTHBOOK、特性缓存新鲜度等）。
 */
//@ chunk-71c4j971.js:9928-10342 placement
function describeGrowthBookStateForDiagnostic() {
  let e = (r) => (r ? "set" : "unset"),
    o = getAllGrowthBookFeatures(),
    n = ne();
  return [
    `  isGrowthBookEnabled=${isGrowthBookEnabled()}`,
    `  telemetryDisabledBy=${diagnoseBridgeDisabledByEnv() ?? "none"}`,
    `  DISABLE_GROWTHBOOK=${e(process.env.DISABLE_GROWTHBOOK)}`,
    `  hasFreshGrowthBookFeatures=${hasFreshGrowthBookFeatures()}`,
    `  growthBookFeaturesLoaded=${Object.keys(o).length}`,
    `  growthBookLastFetched=${n ? `${formatDurationShort(Date.now() - n)} ago` : "never"}`,
    `  tengu_ccr_bridge=${String(o.tengu_ccr_bridge ?? "unset")}`,
  ];
}
//@ chunk-71c4j971.js:10342-12317 placement
async function getBridgeDoctorInfo() {
  if (isRunningInRemoteEnvironment() && !c())
    return { disabledReason: null, inRemoteSession: !0, checks: [] };
  (refreshGrowthBookAfterAuthChange(), await ensurePolicyLimitsLoadedForDiagnostic());
  let e = await Q(),
    o = diagnoseBridgeDisabledByEnv() ?? (env.DISABLE_GROWTHBOOK ? "DISABLE_GROWTHBOOK" : null),
    n = isBridgeFirstParty(),
    r = !isRemoteControlHardDisabled(),
    a = p(),
    _ = f(),
    D = U(),
    R = D || hasProfileScopeSafe(),
    A = D || !!getOauthAccountInfo_2()?.organizationUuid,
    g = getRemoteControlPolicyVerdict(),
    S = G(),
    V = isAuthoritativeTaintDenial({
      policyVerdict: g,
      policyDenialIsAuthoritative: S,
      currentTaints: getCurrentTaints(),
    }),
    B = isGrowthBookEnabled(),
    h = isBridgeSubscriptionEligible(),
    T = h || (await checkGate_CACHED_OR_BLOCKING("tengu_ccr_bridge")),
    I = hasFreshGrowthBookFeatures(),
    z = [
      {
        label: n
          ? "Connected to the Anthropic API (api.anthropic.com)"
          : "Not connected to the Anthropic API (api.anthropic.com)",
        ok: n,
      },
      {
        label: r
          ? "Not disabled by org policy (disableRemoteControl)"
          : "Disabled by org policy (disableRemoteControl)",
        ok: r,
      },
      { label: a ? "Signed in to claude.ai" : "Not signed in to claude.ai", ok: a },
      { label: _ ? "claude.ai subscription active" : "claude.ai subscription auth not active", ok: _ },
      {
        label: R ? "Sign-in includes the user:profile scope" : "Sign-in is missing the user:profile scope",
        ok: R,
      },
      { label: A ? "Organization resolved" : "Organization not resolved", ok: A },
      {
        label:
          g === "allowed"
            ? "Org policy allows Remote Control (allow_remote_control)"
            : g === "unavailable"
              ? "Org policy could not be verified (allow_remote_control)"
              : !S
                ? "Org policy not loaded, see the Organization policy line above (allow_remote_control)"
                : "Org policy does not allow Remote Control (allow_remote_control)",
        ok: g === "allowed",
        detail: V ? Z : void 0,
      },
      {
        label: B ? "Feature-flag evaluation enabled" : "Feature-flag evaluation disabled",
        ok: B || h,
        detail: o
          ? h
            ? `disabled by ${o}; Remote Control does not need it on a paid plan`
            : `disabled by ${o}`
          : void 0,
      },
      {
        label: T
          ? "Remote Control enabled for this account"
          : I
            ? "Remote Control not enabled for this account"
            : "Remote Control availability could not be verified",
        ok: T,
        detail: h
          ? "decided from your plan, feature flags are off"
          : I
            ? void 0
            : "no server response this session",
      },
    ];
  return {
    disabledReason:
      e !== null && n && r && a && _ && R && A && g === "denied" && !S
        ? "Remote Control needs your organization's policy, which isn't loaded \u2014 see the Organization policy line above."
        : e,
    inRemoteSession: !1,
    checks: z,
  };
}
//@ chunk-71c4j971.js:12317-12388 placement
function ne() {
  try {
    return getGlobalConfig().cachedGrowthBookFeaturesAt;
  } catch {
    return;
  }
}
//@ chunk-71c4j971.js:12388-12571 placement
function formatDurationShort(e) {
  let rounded = Math.round(e / 1000);
  if (rounded < 120) return `${rounded}s`;
  let rounded_2 = Math.round(rounded / 60);
  if (rounded_2 < 120) return `${rounded_2}m`;
  let rounded_3 = Math.round(rounded_2 / 60);
  if (rounded_3 < 48) return `${rounded_3}h`;
  return `${Math.round(rounded_3 / 24)}d`;
}
//@ chunk-71c4j971.js:12571-13527 placement
function describeAuthPrecedenceBlocker({ prefix: prefix, suffix: suffix }) {
  try {
    let { source: source } = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: !0 });
    if (source === "ANTHROPIC_API_KEY")
      return `${prefix} ANTHROPIC_API_KEY is set, so this session is using API-key auth \u2014 unset it (or run in a shell without it) ${suffix}`;
    if (source === "apiKeyHelper")
      return `${prefix} apiKeyHelper is configured, so this session is using API-key auth \u2014 unset it ${suffix}`;
    if (process.env.ANTHROPIC_AUTH_TOKEN)
      return `${prefix} ANTHROPIC_AUTH_TOKEN is set, so this session is using API-key auth \u2014 unset it (or run in a shell without it) ${suffix}`;
    let { source: source_2 } = getAuthTokenSource(),
      a = describeHowToDisableAuthTokenSource(source_2);
    if (source_2 !== "none" && a) return `${prefix} This session is using ${source_2} auth \u2014 ${a}`;
    if (process.env.ANTHROPIC_UNIX_SOCKET)
      return `${prefix} ANTHROPIC_UNIX_SOCKET is set without CLAUDE_CODE_OAUTH_TOKEN, so requests on the socket carry no claude.ai login (on a claude ssh remote: the local machine is API-key-authed).`;
  } catch {}
  return `${prefix} Unset ANTHROPIC_API_KEY / apiKeyHelper / ANTHROPIC_AUTH_TOKEN ${suffix}`;
}
//@ chunk-71c4j971.js:13527-13748 placement
var REMOTE_CONTROL_FIRST_PARTY_ONLY =
    "Remote Control is only available when using Claude via api.anthropic.com.",
  UNSET_IT_CLAUSE = "unset it (or run in a shell without it) to use Remote Control.",
  UNSET_THEM_CLAUSE = "unset them (or run in a shell without them) to use Remote Control.";
/**
 * 非第一方提供商（gateway/bedrock/mantle/vertex 等）时给出"不支持 Remote Control"的说明文字。
 */
//@ chunk-71c4j971.js:13748-14591 placement
function describeNonFirstPartyBridgeBlock() {
  let e = getAPIProvider();
  if (e !== "firstParty") {
    if (e === "gateway")
      return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} This session uses a ${THIRD_PARTY_PROVIDER_LABELS.gateway}, which does not support Remote Control.`;
    if (e === "bedrock" && getSecondaryProvider() === "mantle")
      return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} ${THIRD_PARTY_PROVIDER_ENV_VARS.bedrock} and ${THIRD_PARTY_PROVIDER_ENV_VARS.mantle} are set, so this session is using ${THIRD_PARTY_PROVIDER_LABELS.bedrock} + ${THIRD_PARTY_PROVIDER_LABELS.mantle} \u2014 ${UNSET_THEM_CLAUSE}`;
    return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} ${THIRD_PARTY_PROVIDER_ENV_VARS[e]} is set, so this session is using ${THIRD_PARTY_PROVIDER_LABELS[e]} \u2014 ${UNSET_IT_CLAUSE}`;
  }
  if (!isActualFirstPartyAnthropicBaseUrl()) {
    let o = env._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL
      ? " (_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL does not apply to Remote Control.)"
      : "";
    return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} ANTHROPIC_BASE_URL is set and does not point at api.anthropic.com, so this session is using a custom endpoint \u2014 ${UNSET_IT_CLAUSE}${o}`;
  }
  if (env.ANTHROPIC_UNIX_SOCKET)
    return `${REMOTE_CONTROL_FIRST_PARTY_ONLY} ANTHROPIC_UNIX_SOCKET is set, so this session sends requests through a local socket rather than to api.anthropic.com \u2014 ${UNSET_IT_CLAUSE}`;
  return REMOTE_CONTROL_FIRST_PARTY_ONLY;
}
//@ chunk-71c4j971.js:14591-14667 placement
function p() {
  try {
    return Boolean(getClaudeAIOAuthTokens()?.scopes?.includes(CLAUDE_AI_INFERENCE_SCOPE));
  } catch {
    return !1;
  }
}
//@ chunk-71c4j971.js:14667-14712 placement
function f() {
  try {
    return isClaudeAISubscriber();
  } catch {
    return !1;
  }
}
//@ chunk-71c4j971.js:14712-14757 placement
function hasProfileScopeSafe() {
  try {
    return hasProfileScope();
  } catch {
    return !1;
  }
}

export {
  f,
  k,
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
};
