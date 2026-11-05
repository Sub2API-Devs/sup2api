/**
 * bridge/bridgeGates.ts
 *
 * 2.1.316 新增：诊断前异步加载 policy limits（动态 import 策略模块），只启动一次并记录到全局状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h3xdf7nq.js (51)
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
import { bridgeHostState } from "./bridgeHostState.js";
import { withTimeout } from "../utils/sleep.js";
import { isBridgeEnabled, DAY_MS, MAX_TIMER_MS } from "./bridgeEntitlement.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { getIsRemoteMode } from "../bootstrap/state.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getUserAttributes_3 as getUserAttributes,
} from "../services/analytics/growthbook.js";
import { isGrowthBookUnavailableOnNoTelemetry } from "./bridgeConfig.js";
import { getExplicitRemoteControlAtStartup } from "../utils/config.js";
import { readFlagWithOverride } from "../services/analytics/flagOverrides.js";

//@ chunk-h3xdf7nq.js:15102-15180 placement
function isTrustedDevicesRequiredOrAbsent() {
  try {
    return isPolicyEnforcedOrHintedByRefusedCache("require_trusted_devices") || isPolicyVerdictAbsent();
  } catch {
    return true;
  }
}
//@ chunk-h3xdf7nq.js:15180-15345 placement
async function ensurePolicyLimitsLoadedForDiagnostic() {
  try {
    await kickPolicyLimitsLoadForDiagnostic();
  } catch (error) {
    logForDebugging(
      `[bridge] policy-limits hydrate for the Remote Control diagnostic failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
//@ chunk-h3xdf7nq.js:15345-15752 placement
/**
 * 诊断前异步加载 policy limits（动态 import 策略模块），只启动一次并记录到全局状态。
 */
async function kickPolicyLimitsLoadForDiagnostic() {
  try {
    if (getResponseFromCache() !== null) return;
  } catch {}
  let policyModule = await import("../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js");
  policyModule.initializePolicyLimitsLoadingPromise();
  let hostState = bridgeHostState();
  if (hostState.diagnosticPolicyKick === undefined) {
    let policyLimits = policyModule.loadPolicyLimits();
    policyLimits
      .catch(() => {})
      .finally(() => {
        hostState.diagnosticPolicyKick = undefined;
      });
    hostState.diagnosticPolicyKick = withTimeout(
      policyLimits,
      policyModule.POLICY_LIMITS_COLD_AWAIT_MS,
      "bridge_diagnostic_policy_limits",
    ).catch(() => {});
  }
  await hostState.diagnosticPolicyKick;
}
//@ chunk-h3xdf7nq.js:15752-15851 placement
function getRemoteControlPolicyVerdict() {
  try {
    return isPolicyAllowed("allow_remote_control") ? "allowed" : "denied";
  } catch {
    return "unavailable";
  }
}
//@ chunk-h3xdf7nq.js:15851-15896 placement
function isRemoteControlOfferable() {
  return isBridgeEnabled() && getRemoteControlPolicyVerdict() === "allowed";
}
//@ chunk-h3xdf7nq.js:15896-15958 placement
function isRunningInRemoteEnvironment() {
  return isEnvTruthy(process.env.CLAUDE_CODE_REMOTE) || getIsRemoteMode();
}
//@ chunk-h3xdf7nq.js:15958-16026 placement (2.1.88 match: isCseShimEnabled, 1)
/**
 * GrowthBook 开关 tengu_bridge_repl_v2_cse_shim_enabled（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isCseShimEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_repl_v2_cse_shim_enabled", true);
}
//@ chunk-h3xdf7nq.js:16026-16076 placement
/**
 * GrowthBook 开关 tengu_luminous_seal（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeStateFramesEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_luminous_seal", true);
}
//@ chunk-h3xdf7nq.js:16076-16136 placement
/**
 * GrowthBook 开关 tengu_bridge_partial_messages（默认关）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgePartialMessagesEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_partial_messages", false);
}
//@ chunk-h3xdf7nq.js:16136-16188 placement
/**
 * GrowthBook 开关 tengu_wobbly_pinwheel（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isSdkBridgeStateAnnounceEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_wobbly_pinwheel", true);
}
//@ chunk-h3xdf7nq.js:16188-16239 placement
/**
 * GrowthBook 开关 tengu_copper_kestrel（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeEffortSyncEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_copper_kestrel", true);
}
//@ chunk-h3xdf7nq.js:16239-16294 placement
/**
 * GrowthBook 开关 tengu_bridge_auth_revive（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeAuthReviveEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_auth_revive", true);
}
//@ chunk-h3xdf7nq.js:16294-16344 placement
/**
 * GrowthBook 开关 tengu_ethereal_mist（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeNonOrigin403RetryEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ethereal_mist", true);
}
//@ chunk-h3xdf7nq.js:16344-16393 placement
/**
 * GrowthBook 开关 tengu_wild_gosling（默认关）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeAttachEpochFenceEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_wild_gosling", false);
}
//@ chunk-h3xdf7nq.js:16393-16442 placement
/**
 * GrowthBook 开关 tengu_humble_petal（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeInboundReadReceiptsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_humble_petal", true);
}
//@ chunk-h3xdf7nq.js:16442-16493 placement
/**
 * GrowthBook 开关 tengu_moonlit_lagoon（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeTurnKeepAwakeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_moonlit_lagoon", true);
}
//@ chunk-h3xdf7nq.js:16493-16564 placement
/**
 * GrowthBook 开关 tengu_bridge_resume_respects_local_owner（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeResumeRespectsLocalOwnerEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_resume_respects_local_owner", true);
}
//@ chunk-h3xdf7nq.js:16564-16618 placement
/**
 * GrowthBook 开关 tengu_sequential_puffin（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeRestoredMatchMintEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sequential_puffin", true);
}
//@ chunk-h3xdf7nq.js:16618-16678 placement
/**
 * GrowthBook 开关 tengu_bridge_owner_pinned_end（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeOwnerPinnedEndEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_owner_pinned_end", true);
}
//@ chunk-h3xdf7nq.js:16678-16745 placement
/**
 * GrowthBook 开关 tengu_bridge_owner_check_attribution（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeOwnerCheckAttributionEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_owner_check_attribution", true);
}
//@ chunk-h3xdf7nq.js:16745-16798 placement
/**
 * GrowthBook 开关 tengu_glimmering_glade（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeEnvReregisterEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_glimmering_glade", true);
}
//@ chunk-h3xdf7nq.js:16798-16846 placement
/**
 * GrowthBook 开关 tengu_lucky_quill（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeEnvReregisterOn401Enabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lucky_quill", true);
}
//@ chunk-h3xdf7nq.js:16846-16895 placement
/**
 * GrowthBook 开关 tengu_keen_lantern（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeEnvSecretProactiveRenewalEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_keen_lantern", true);
}
//@ chunk-h3xdf7nq.js:16895-16956 placement
/**
 * GrowthBook 开关 tengu_bridge_host_declined_end（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeHostDeclinedEndEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_host_declined_end", true);
}
//@ chunk-h3xdf7nq.js:16956-17018 placement
/**
 * GrowthBook 开关 tengu_bridge_signed_out_neutral（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeSignedOutNeutralEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_signed_out_neutral", true);
}
//@ chunk-h3xdf7nq.js:17018-17077 placement
/**
 * GrowthBook 开关 tengu_ccr_v2_send_events_cli（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isCcrV2SendEventsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_v2_send_events_cli", true);
}
//@ chunk-h3xdf7nq.js:17077-17136 placement
/**
 * GrowthBook 开关 tengu_ccr_v2_session_crud_cli（默认关）的读取函数；用途见手册 Remote Control 开关表。
 */
function isCcrV2SessionCrudEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_v2_session_crud_cli", false);
}
//@ chunk-h3xdf7nq.js:17136-17197 placement
function isCcrV2BridgeCreateEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_v2_bridge_create_cli", false);
}
//@ chunk-h3xdf7nq.js:17197-17248 placement
/**
 * GrowthBook 开关 tengu_composed_quail（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isBridgeRateLimitEventEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_composed_quail", true);
}
//@ chunk-h3xdf7nq.js:17248-17298 placement
/**
 * GrowthBook 开关 tengu_gravel_chorus（默认开）的读取函数；用途见手册 Remote Control 开关表。
 */
function isQuotaRejectedReemitEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_gravel_chorus", true);
}
//@ chunk-h3xdf7nq.js:17298-17332 placement
/**
 * 启动时是否自动开启 Remote Control（只取值）。
 */
function getCcrAutoConnectDefault() {
  return resolveCcrAutoConnectDefault().value;
}
//@ chunk-h3xdf7nq.js:17332-17668 placement (2.1.88 match: getCcrAutoConnectDefault, 0.302)
/**
 * 启动时自动连接默认值及来源：远程环境 false；不可用时 false（org_policy/growthbook）；持久远程会话 true；组织策略 remote_control_at_startup；否则 tengu_cobalt_harbor。
 */
function resolveCcrAutoConnectDefault() {
  if (isRunningInRemoteEnvironment())
    return {
      value: false,
      source: "remote_env",
    };
  let policyDefault = getPolicyDefault("remote_control_at_startup");
  if (isGrowthBookUnavailableOnNoTelemetry())
    return {
      value: false,
      source: policyDefault === false ? "org_policy" : "growthbook",
    };
  if (isPersistentRemoteSessionEnabled())
    return {
      value: true,
      source: "persistent_remote_session",
    };
  if (policyDefault !== undefined)
    return {
      value: policyDefault,
      source: "org_policy",
    };
  return {
    value: getFeatureValue_CACHED_MAY_BE_STALE("tengu_cobalt_harbor", false),
    source: "growthbook",
  };
}
//@ chunk-h3xdf7nq.js:17668-17720 placement
function getRemoteControlAtStartup() {
  let explicitRemoteControlAtStartup = getExplicitRemoteControlAtStartup();
  return explicitRemoteControlAtStartup !== undefined
    ? explicitRemoteControlAtStartup
    : getCcrAutoConnectDefault();
}
//@ chunk-h3xdf7nq.js:17720-17744 placement
function isPersistentRemoteSessionEnabled() {
  return false;
}
//@ chunk-h3xdf7nq.js:17744-17768 placement
function isUdsEnableRemoteControlEnabled() {
  return false;
}
//@ chunk-h3xdf7nq.js:17768-17816 placement
function isRemoteControlInternalEventsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_relay", false);
}
//@ chunk-h3xdf7nq.js:17816-17846 placement
async function isWorkingCopySourceNamingEnabled() {
  return false;
}
//@ chunk-h3xdf7nq.js:17846-17881 placement
function readSessionLivePreviewFlag() {
  return "not_fetched";
}
//@ chunk-h3xdf7nq.js:17881-18071 placement
function isBridgeServerSessionConfigEnabled() {
  {
    let { value: featureValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_bridge_apply_server_session_config",
      true,
    );
    if (featureValue !== false) return true;
    if (source === "override") return false;
    return !(source === "payload" && getUserAttributes().organizationUUID);
  }
  return false;
}
//@ chunk-h3xdf7nq.js:18071-18130 placement
function isBridgeChildAutoModeDefaultEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_auto_mode", true);
}
//@ chunk-h3xdf7nq.js:18130-18198 placement
function isBridgeChildAutoOverSettingsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_auto_over_settings", true);
}
//@ chunk-h3xdf7nq.js:18198-18259 placement
function isBridgeRcChildArtifactEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_rc_child_artifact", true);
}
//@ chunk-h3xdf7nq.js:18259-18319 placement
function isBridgeProjectsHintEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_rc_projects_hint", true);
}
//@ chunk-h3xdf7nq.js:18319-18385 placement
function isBridgeChildMachineSettingsEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_child_machine_settings", true);
}
//@ chunk-h3xdf7nq.js:18385-18450 placement
function isBridgeRcChildAutoCompactEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_rc_child_auto_compact", true);
}
//@ chunk-h3xdf7nq.js:18450-18507 placement
function isBridgeRcChildProjectsEntrypointEnabled() {
  return readFlagWithOverride("tengu_gentle_grove", {
    safe: false,
  });
}
//@ chunk-h3xdf7nq.js:18507-18558 placement
function isBridgeRcChildCliEntrypointEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_gentle_orchard", true);
}
//@ chunk-h3xdf7nq.js:18558-18712 placement
function getBridgeRcChildIdleExitMs() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_bridge_rc_child_idle_exit_ms",
    DAY_MS,
  );
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "number" ||
    !Number.isFinite(featureValue_CACHED_MAY_BE_STALE) ||
    featureValue_CACHED_MAY_BE_STALE < 1
  )
    return 0;
  return Math.min(Math.floor(featureValue_CACHED_MAY_BE_STALE), MAX_TIMER_MS);
}
//@ chunk-h3xdf7nq.js:18712-18779 placement
function isBridgeRcChildRestartResumeEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_rc_child_restart_resume", true);
}
//@ chunk-h3xdf7nq.js:18779-18894 placement
function getBridgeSubagentFrameGate() {
  return {
    enabled: getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_subagent_frames", true),
    forwardText: getFeatureValue_CACHED_MAY_BE_STALE("tengu_bridge_subagent_text", false),
  };
}
//@ chunk-h3xdf7nq.js:18894-19284 placement
function applyRemoteControlToAppState(appState, remoteControlAtStartup) {
  if (appState.replBridgeOutboundOnly && !remoteControlAtStartup)
    return appState.replBridgeSessionGroupingId !== undefined
      ? {
          ...appState,
          replBridgeSessionGroupingId: undefined,
        }
      : appState;
  if (appState.replBridgeEnabled === remoteControlAtStartup && !appState.replBridgeOutboundOnly)
    return !remoteControlAtStartup && appState.replBridgeSessionGroupingId !== undefined
      ? {
          ...appState,
          replBridgeSessionGroupingId: undefined,
        }
      : appState;
  return {
    ...appState,
    replBridgeEnabled: remoteControlAtStartup,
    replBridgeOutboundOnly: false,
    ...(!remoteControlAtStartup && {
      replBridgeSessionGroupingId: undefined,
    }),
  };
}
export {
  isBridgeStateFramesEnabled,
  getBridgeSubagentFrameGate,
  isSdkBridgeStateAnnounceEnabled,
  isCcrV2SessionCrudEnabled,
  ensurePolicyLimitsLoadedForDiagnostic,
  isPersistentRemoteSessionEnabled,
  isRemoteControlInternalEventsEnabled,
  isBridgeInboundReadReceiptsEnabled,
  isRunningInRemoteEnvironment,
  getCcrAutoConnectDefault,
  isQuotaRejectedReemitEnabled,
  isBridgeRcChildCliEntrypointEnabled,
  isBridgeTurnKeepAwakeEnabled,
  resolveCcrAutoConnectDefault,
  isBridgeRcChildRestartResumeEnabled,
  isBridgeEnvReregisterEnabled,
  isBridgeEnvReregisterOn401Enabled,
  isBridgeEnvSecretProactiveRenewalEnabled,
  isBridgeServerSessionConfigEnabled,
  getBridgeRcChildIdleExitMs,
  isBridgeProjectsHintEnabled,
  isBridgePartialMessagesEnabled,
  isBridgeNonOrigin403RetryEnabled,
  isBridgeAttachEpochFenceEnabled,
  isBridgeHostDeclinedEndEnabled,
  isBridgeOwnerPinnedEndEnabled,
  isBridgeSignedOutNeutralEnabled,
  isBridgeAuthReviveEnabled,
  isRemoteControlOfferable,
  getRemoteControlAtStartup,
  isCcrV2SendEventsEnabled,
  isBridgeOwnerCheckAttributionEnabled,
  isCseShimEnabled,
  isBridgeRestoredMatchMintEnabled,
  isBridgeResumeRespectsLocalOwnerEnabled,
  isBridgeEffortSyncEnabled,
  isTrustedDevicesRequiredOrAbsent,
  isBridgeChildAutoModeDefaultEnabled,
  isBridgeRcChildArtifactEnabled,
  isBridgeRcChildAutoCompactEnabled,
  isBridgeRcChildProjectsEntrypointEnabled,
  isBridgeChildMachineSettingsEnabled,
  isBridgeChildAutoOverSettingsEnabled,
  getRemoteControlPolicyVerdict,
  isBridgeRateLimitEventEnabled,
  applyRemoteControlToAppState,
  isCcrV2BridgeCreateEnabled,
  isUdsEnableRemoteControlEnabled,
  isWorkingCopySourceNamingEnabled,
  readSessionLivePreviewFlag,
};
