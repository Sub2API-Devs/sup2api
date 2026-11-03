/**
 * bridge/bridgeGates.ts
 *
 * 2.1.316 新增：诊断前异步加载 policy limits（动态 import 策略模块），只启动一次并记录到全局状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-71c4j971.js (51)
 * attribution: placement 51
 */
import {
  isPolicyEnforcedOrHintedByRefusedCache,
  isPolicyVerdictAbsent,
  getResponseFromCache,
  isPolicyAllowed,
  getPolicyDefault,
} from "../services/policyLimits/policyEvidence.js";
import { logForDebugging } from "../utils/debug.js";
import { ao } from "./bridgeHostState.js";
import { withTimeout } from "../utils/sleep.js";
import { isBridgeEnabled, DAY_MS, MAX_TIMER_MS } from "./bridgeEntitlement.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { getIsRemoteMode } from "../bootstrap/state.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getUserAttributes,
} from "../services/analytics/growthbook.js";
import { E } from "./bridgeConfig.js";
import { getExplicitRemoteControlAtStartup } from "../utils/config.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";

//@ chunk-71c4j971.js:14813-14891 placement
function le() {
  try {
    return isPolicyEnforcedOrHintedByRefusedCache("require_trusted_devices") || isPolicyVerdictAbsent();
  } catch {
    return !0;
  }
}
//@ chunk-71c4j971.js:14891-15057 placement
async function ensurePolicyLimitsLoadedForDiagnostic() {
  try {
    await kickPolicyLimitsLoadForDiagnostic();
  } catch (error) {
    logForDebugging(
      `[bridge] policy-limits hydrate for the Remote Control diagnostic failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
/**
 * 诊断前异步加载 policy limits（动态 import 策略模块），只启动一次并记录到全局状态。
 */
//@ chunk-71c4j971.js:15057-15464 placement
async function kickPolicyLimitsLoadForDiagnostic() {
  try {
    if (getResponseFromCache() !== null) return;
  } catch {}
  let e = await import("./chunk-qchbrsbw.js");
  e.initializePolicyLimitsLoadingPromise();
  let o = ao();
  if (o.diagnosticPolicyKick === void 0) {
    let policyLimits = e.loadPolicyLimits();
    (policyLimits
      .catch(() => {})
      .finally(() => {
        o.diagnosticPolicyKick = void 0;
      }),
      (o.diagnosticPolicyKick = withTimeout(
        policyLimits,
        e.POLICY_LIMITS_COLD_AWAIT_MS,
        "bridge_diagnostic_policy_limits",
      ).catch(() => {})));
  }
  await o.diagnosticPolicyKick;
}
//@ chunk-71c4j971.js:15464-15563 placement
function getRemoteControlPolicyVerdict() {
  try {
    return isPolicyAllowed("allow_remote_control") ? "allowed" : "denied";
  } catch {
    return "unavailable";
  }
}
//@ chunk-71c4j971.js:15563-15608 placement
function isRemoteControlOfferable() {
  return isBridgeEnabled() && getRemoteControlPolicyVerdict() === "allowed";
}
//@ chunk-71c4j971.js:15608-15670 placement
function isRunningInRemoteEnvironment() {
  return isEnvTruthy(process.env.CLAUDE_CODE_REMOTE) || getIsRemoteMode();
}
/**
 * GrowthBook 开关 tengu_bridge_repl_v2_cse_shim_enabled（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:15670-15738 placement = isCseShimEnabled (1)
function isCseShimEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_repl_v2_cse_shim_enabled", !0);
}
/**
 * GrowthBook 开关 tengu_luminous_seal（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:15738-15788 placement
function isBridgeStateFramesEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_luminous_seal", !0);
}
/**
 * GrowthBook 开关 tengu_bridge_partial_messages（默认关）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:15788-15848 placement
function isBridgePartialMessagesEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_partial_messages", !1);
}
/**
 * GrowthBook 开关 tengu_wobbly_pinwheel（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:15848-15900 placement
function isSdkBridgeStateAnnounceEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_wobbly_pinwheel", !0);
}
/**
 * GrowthBook 开关 tengu_copper_kestrel（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:15900-15951 placement
function isBridgeEffortSyncEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_kestrel", !0);
}
/**
 * GrowthBook 开关 tengu_bridge_auth_revive（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:15951-16006 placement
function isBridgeAuthReviveEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_auth_revive", !0);
}
/**
 * GrowthBook 开关 tengu_ethereal_mist（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16006-16056 placement
function isBridgeNonOrigin403RetryEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ethereal_mist", !0);
}
/**
 * GrowthBook 开关 tengu_wild_gosling（默认关）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16056-16105 placement
function isBridgeAttachEpochFenceEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_wild_gosling", !1);
}
/**
 * GrowthBook 开关 tengu_humble_petal（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16105-16154 placement
function isBridgeInboundReadReceiptsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humble_petal", !0);
}
/**
 * GrowthBook 开关 tengu_moonlit_lagoon（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16154-16205 placement
function isBridgeTurnKeepAwakeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_moonlit_lagoon", !0);
}
/**
 * GrowthBook 开关 tengu_bridge_resume_respects_local_owner（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16205-16276 placement
function isBridgeResumeRespectsLocalOwnerEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_resume_respects_local_owner", !0);
}
/**
 * GrowthBook 开关 tengu_sequential_puffin（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16276-16330 placement
function isBridgeRestoredMatchMintEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sequential_puffin", !0);
}
/**
 * GrowthBook 开关 tengu_bridge_owner_pinned_end（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16330-16390 placement
function isBridgeOwnerPinnedEndEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_owner_pinned_end", !0);
}
/**
 * GrowthBook 开关 tengu_bridge_owner_check_attribution（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16390-16457 placement
function isBridgeOwnerCheckAttributionEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_owner_check_attribution", !0);
}
/**
 * GrowthBook 开关 tengu_glimmering_glade（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16457-16510 placement
function isBridgeEnvReregisterEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_glimmering_glade", !0);
}
/**
 * GrowthBook 开关 tengu_lucky_quill（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16510-16558 placement
function isBridgeEnvReregisterOn401Enabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lucky_quill", !0);
}
/**
 * GrowthBook 开关 tengu_keen_lantern（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16558-16607 placement
function isBridgeEnvSecretProactiveRenewalEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_keen_lantern", !0);
}
/**
 * GrowthBook 开关 tengu_bridge_host_declined_end（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16607-16668 placement
function isBridgeHostDeclinedEndEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_host_declined_end", !0);
}
/**
 * GrowthBook 开关 tengu_bridge_signed_out_neutral（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16668-16730 placement
function isBridgeSignedOutNeutralEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_signed_out_neutral", !0);
}
/**
 * GrowthBook 开关 tengu_ccr_v2_send_events_cli（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16730-16789 placement
function isCcrV2SendEventsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_v2_send_events_cli", !0);
}
/**
 * GrowthBook 开关 tengu_ccr_v2_session_crud_cli（默认关）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16789-16848 placement
function isCcrV2SessionCrudEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_v2_session_crud_cli", !1);
}
//@ chunk-71c4j971.js:16848-16909 placement
function isCcrV2BridgeCreateEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_v2_bridge_create_cli", !1);
}
/**
 * GrowthBook 开关 tengu_composed_quail（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16909-16960 placement
function isBridgeRateLimitEventEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_composed_quail", !0);
}
/**
 * GrowthBook 开关 tengu_gravel_chorus（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
//@ chunk-71c4j971.js:16960-17010 placement
function isQuotaRejectedReemitEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_gravel_chorus", !0);
}
/**
 * 启动时是否自动开启 Remote Control（只取值）。
 */
//@ chunk-71c4j971.js:17010-17044 placement
function getCcrAutoConnectDefault() {
  return resolveCcrAutoConnectDefault().value;
}
/**
 * 启动时自动连接默认值及来源：远程环境 false；不可用时 false（org_policy/growthbook）；持久远程会话 true；组织策略 remote_control_at_startup；否则 tengu_cobalt_harbor。
 */
//@ chunk-71c4j971.js:17044-17380 placement = getCcrAutoConnectDefault (0.302)
function resolveCcrAutoConnectDefault() {
  if (isRunningInRemoteEnvironment()) return { value: !1, source: "remote_env" };
  let e = getPolicyDefault("remote_control_at_startup");
  if (E()) return { value: !1, source: e === !1 ? "org_policy" : "growthbook" };
  if (isPersistentRemoteSessionEnabled()) return { value: !0, source: "persistent_remote_session" };
  if (e !== void 0) return { value: e, source: "org_policy" };
  return { value: getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_harbor", !1), source: "growthbook" };
}
//@ chunk-71c4j971.js:17380-17433 placement
function getRemoteControlAtStartup() {
  let e = getExplicitRemoteControlAtStartup();
  return e !== void 0 ? e : getCcrAutoConnectDefault();
}
//@ chunk-71c4j971.js:17433-17457 placement
function isPersistentRemoteSessionEnabled() {
  return !1;
}
//@ chunk-71c4j971.js:17457-17481 placement
function isUdsEnableRemoteControlEnabled() {
  return !1;
}
//@ chunk-71c4j971.js:17481-17529 placement
function isRemoteControlInternalEventsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_relay", !1);
}
//@ chunk-71c4j971.js:17529-17559 placement
async function isWorkingCopySourceNamingEnabled() {
  return !1;
}
//@ chunk-71c4j971.js:17559-17594 placement
function readSessionLivePreviewFlag() {
  return "not_fetched";
}
//@ chunk-71c4j971.js:17594-17784 placement
function isBridgeServerSessionConfigEnabled() {
  {
    let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_bridge_apply_server_session_config",
      !0,
    );
    if (e !== !1) return !0;
    if (source === "override") return !1;
    return !(source === "payload" && getUserAttributes().organizationUUID);
  }
  return !1;
}
//@ chunk-71c4j971.js:17784-17843 placement
function isBridgeChildAutoModeDefaultEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_auto_mode", !0);
}
//@ chunk-71c4j971.js:17843-17911 placement
function isBridgeChildAutoOverSettingsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_auto_over_settings", !0);
}
//@ chunk-71c4j971.js:17911-17972 placement
function isBridgeRcChildArtifactEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_rc_child_artifact", !0);
}
//@ chunk-71c4j971.js:17972-18032 placement
function isBridgeProjectsHintEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_rc_projects_hint", !0);
}
//@ chunk-71c4j971.js:18032-18098 placement
function isBridgeChildMachineSettingsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_machine_settings", !0);
}
//@ chunk-71c4j971.js:18098-18163 placement
function isBridgeRcChildAutoCompactEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_rc_child_auto_compact", !0);
}
//@ chunk-71c4j971.js:18163-18220 placement
function isBridgeRcChildProjectsEntrypointEnabled() {
  return readFlagWithOverride("tengu_gentle_grove", { safe: !1 });
}
//@ chunk-71c4j971.js:18220-18271 placement
function isBridgeRcChildCliEntrypointEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_gentle_orchard", !0);
}
//@ chunk-71c4j971.js:18271-18425 placement
function getBridgeRcChildIdleExitMs() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_rc_child_idle_exit_ms", DAY_MS);
  if (typeof e !== "number" || !Number.isFinite(e) || e < 1) return 0;
  return Math.min(Math.floor(e), MAX_TIMER_MS);
}
//@ chunk-71c4j971.js:18425-18492 placement
function isBridgeRcChildRestartResumeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_rc_child_restart_resume", !0);
}
//@ chunk-71c4j971.js:18492-18607 placement
function getBridgeSubagentFrameGate() {
  return {
    enabled: getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_subagent_frames", !0),
    forwardText: getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_subagent_text", !1),
  };
}
//@ chunk-71c4j971.js:18607-18997 placement
function applyRemoteControlToAppState(e, o) {
  if (e.replBridgeOutboundOnly && !o)
    return e.replBridgeSessionGroupingId !== void 0 ? { ...e, replBridgeSessionGroupingId: void 0 } : e;
  if (e.replBridgeEnabled === o && !e.replBridgeOutboundOnly)
    return !o && e.replBridgeSessionGroupingId !== void 0 ? { ...e, replBridgeSessionGroupingId: void 0 } : e;
  return {
    ...e,
    replBridgeEnabled: o,
    replBridgeOutboundOnly: !1,
    ...(!o && { replBridgeSessionGroupingId: void 0 }),
  };
}

export {
  le,
  isBridgeChildAutoModeDefaultEnabled,
  isBridgeRcChildArtifactEnabled,
  isBridgeRcChildCliEntrypointEnabled,
  isBridgeRcChildAutoCompactEnabled,
  isBridgeRcChildProjectsEntrypointEnabled,
  isBridgeChildMachineSettingsEnabled,
  isBridgeChildAutoOverSettingsEnabled,
  isBridgeRcChildRestartResumeEnabled,
  isBridgeEnvReregisterEnabled,
  isBridgeEnvReregisterOn401Enabled,
  isBridgeEnvSecretProactiveRenewalEnabled,
  isBridgeServerSessionConfigEnabled,
  getBridgeRcChildIdleExitMs,
  isCcrV2SessionCrudEnabled,
  isBridgeProjectsHintEnabled,
  isBridgeRateLimitEventEnabled,
  resolveCcrAutoConnectDefault,
  getRemoteControlPolicyVerdict,
  isRemoteControlOfferable,
  isBridgeStateFramesEnabled,
  getBridgeSubagentFrameGate,
  isSdkBridgeStateAnnounceEnabled,
  ensurePolicyLimitsLoadedForDiagnostic,
  isPersistentRemoteSessionEnabled,
  isRemoteControlInternalEventsEnabled,
  isBridgeInboundReadReceiptsEnabled,
  isRunningInRemoteEnvironment,
  getCcrAutoConnectDefault,
  isCcrV2SendEventsEnabled,
  isBridgeAuthReviveEnabled,
  isBridgeNonOrigin403RetryEnabled,
  isBridgeAttachEpochFenceEnabled,
  isBridgeHostDeclinedEndEnabled,
  isBridgeOwnerPinnedEndEnabled,
  isBridgeSignedOutNeutralEnabled,
  getRemoteControlAtStartup,
  isBridgePartialMessagesEnabled,
  isBridgeEffortSyncEnabled,
  isBridgeOwnerCheckAttributionEnabled,
  isCseShimEnabled,
  isBridgeRestoredMatchMintEnabled,
  isBridgeResumeRespectsLocalOwnerEnabled,
  applyRemoteControlToAppState,
  isQuotaRejectedReemitEnabled,
  isBridgeTurnKeepAwakeEnabled,
};
