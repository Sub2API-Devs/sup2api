/**
 * utils/settings/policyHelper/helperPayload.ts
 *
 * policyHelper 静态设置载荷（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (23)
 * attribution: placement 23
 */
import {
  policyHelperRunner,
  invalidatePolicyLayer,
  REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX,
  REMOTE_ENTRY_NOT_RUN_PREFIX,
  REMOTE_PAYLOAD_NOT_APPLIED_PREFIX,
  truncateWarning,
  MAX_WARNING_CHARS,
  warnInvalidStaticPayload,
  helperFailureBlocks,
} from "./policyHelper.js";
import { logForDebugging } from "../../debug.js";
import { asciiOnly } from "../otelEndpointValidation.js";
import { validatePolicyHelperConfig } from "../validation.js";
import { SUPPORTED_PLATFORMS, STATIC_PAYLOAD_SCHEMA } from "../types.js";
import { logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import { serializeSettingsErrors } from "../../fileStateCache.js";
import {
  hasPayloadSlot,
  summarizeManagedSettingsRisk,
  hasDangerousManagedSettings,
  getPolicyHelperCommand,
} from "../../../components/ManagedSettingsSecurityDialog/utils.js";
import { platformSettingsChain } from "../marketplaceSettingsAliases.js";
import { remoteHelperCommand, selectPerOsConfig } from "./helperRemote.js";
import { withholdUnverifiedCacheKeys as withholdUnverifiedCacheKeys_2 } from "../../../services/remoteManagedSettings/remoteSettingsCache.js";
import {
  isRemoteManagedSettingsVerified,
  isRemoteManagedSettingsVerifiedAndApprovedForSession,
} from "../../../services/remoteManagedSettings/remoteSettingsState.js";
import { jsonStringify } from "../../slowOperations.js";
import { sortKeysDeep } from "../settingsSourceTrust.js";

//@ chunk-q8cqcff6.js:69996-70148 placement
function addSelectionWarning(e) {
  policyHelperRunner.selectionWarnings.push({
    file: "policyHelper",
    path: "policyHelpers",
    message: e,
    severity: "warning",
    statusOnly: true,
  });
  invalidatePolicyLayer();
  logForDebugging(e, {
    level: "warn",
  });
}
//@ chunk-q8cqcff6.js:70148-70174 placement
/**
 * clearRemotePayloadWarnings：清空远程载荷相关警告。
 */
function clearRemotePayloadWarnings() {
  clearAllRemoteWarnings();
  clearSelectionWarnings(REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX);
}
//@ chunk-q8cqcff6.js:70174-70226 placement
/**
 * clearAllRemoteWarnings：清空全部远程警告。
 */
function clearAllRemoteWarnings() {
  clearSelectionWarnings(REMOTE_ENTRY_NOT_RUN_PREFIX);
  clearSelectionWarnings(REMOTE_PAYLOAD_NOT_APPLIED_PREFIX);
  policyHelperRunner.retireRemoteFailure();
}
//@ chunk-q8cqcff6.js:70226-70266 placement
var HELPER_REFRESH_FAILING_PREFIX = "policyHelper refresh failing: ";
//@ chunk-q8cqcff6.js:70266-70675 placement
function warnPolicyHelperRefresh(error, n, r) {
  let s = `; ${n}`;
  let S = truncateWarning(
    asciiOnly(error.replace(/\s+/gu, " ")),
    MAX_WARNING_CHARS - HELPER_REFRESH_FAILING_PREFIX.length - s.length,
  );
  let E = `${HELPER_REFRESH_FAILING_PREFIX}${S}${s}`;
  if (policyHelperRunner.selectionWarnings.some((selectionWarning) => selectionWarning.message === E)) return;
  let filtered = policyHelperRunner.selectionWarnings.filter(
    (selectionWarning) => !selectionWarning.message.startsWith(HELPER_REFRESH_FAILING_PREFIX),
  );
  let y = filtered.length !== policyHelperRunner.selectionWarnings.length;
  policyHelperRunner.selectionWarnings = [
    ...filtered,
    {
      file: "policyHelper",
      path: r ? "policyHelpers" : "policyHelper",
      message: E,
      severity: "warning",
      statusOnly: true,
    },
  ];
  if (!y) invalidatePolicyLayer();
}
//@ chunk-q8cqcff6.js:70675-70696 placement
/**
 * clearHelperRefreshWarning：清空 helper 刷新失败警告。
 */
function clearHelperRefreshWarning() {
  clearSelectionWarnings(HELPER_REFRESH_FAILING_PREFIX);
}
//@ chunk-q8cqcff6.js:70696-70764 placement
/**
 * NO_PLATFORM_ENTRY_TEXT：没有当前平台条目的说明。
 */
var NO_PLATFORM_ENTRY_TEXT = "policyHelpers is configured but has no entry for platform ";
//@ chunk-q8cqcff6.js:70764-70918 placement
function clearSelectionWarnings(e) {
  let filtered = policyHelperRunner.selectionWarnings.filter(
    (selectionWarning) => !selectionWarning.message.startsWith(e),
  );
  if (filtered.length === policyHelperRunner.selectionWarnings.length) return;
  policyHelperRunner.selectionWarnings = filtered;
  invalidatePolicyLayer();
}
//@ chunk-q8cqcff6.js:70918-71131 placement
function validatePayloadAndLog(e, n) {
  let r = validatePolicyHelperConfig(e, n);
  for (let strippedKey of r.strippedKeys)
    logForDebugging(`${n}: stripped ${strippedKey} from the settings payload (no recursion)`, {
      level: "warn",
    });
  for (let warning of r.warnings)
    logForDebugging(`${n}: ${warning.message}`, {
      level: "warn",
    });
  return r;
}
//@ chunk-q8cqcff6.js:71131-71641 placement
function mergeDefaultSettingsPayload(e, n) {
  let r = [];
  for (let s of n) {
    let S = e[s];
    let defaultSettings = S?.defaultSettings;
    if (defaultSettings !== undefined && defaultSettings !== null)
      r.push({
        field: `policyHelpers.${s}.defaultSettings`,
        raw: defaultSettings,
        onChain: true,
        mergesOutput: S?.outputBehavior === "merge",
      });
  }
  for (let s of SUPPORTED_PLATFORMS) {
    let defaultSettings = e[s]?.defaultSettings;
    if (defaultSettings !== undefined && defaultSettings !== null && !n.includes(s))
      r.push({
        field: `policyHelpers.${s}.defaultSettings`,
        raw: defaultSettings,
        onChain: false,
        mergesOutput: false,
      });
  }
  if (e.default !== undefined && e.default !== null)
    r.push({
      field: "policyHelpers.default",
      raw: e.default,
      onChain: true,
      mergesOutput: false,
    });
  return r;
}
//@ chunk-q8cqcff6.js:71641-72078 placement
function validateStaticPayload(e, n) {
  if (e.raw !== null && typeof e.raw === "object" && !Array.isArray(e.raw)) {
    let { policyHelper, policyHelpers, ...E } = e.raw;
    let h = STATIC_PAYLOAD_SCHEMA().safeParse(E);
    if (!h.success)
      return {
        error: h.error.issues[0]?.message ?? "failed validation",
      };
  }
  let r = n ? validatePayloadAndLog(e.raw, e.field) : validatePolicyHelperConfig(e.raw, e.field);
  if ("error" in r)
    return {
      error: r.error,
    };
  return {
    settings: r.settings,
    warnings: r.warnings.map((warning) => ({
      ...warning,
      statusOnly: true,
    })),
    sourceField: e.field,
    mergesOutput: e.mergesOutput,
  };
}
//@ chunk-q8cqcff6.js:72078-72443 placement
/**
 * 校验 policyHelpers 默认设置载荷，记录链上第一个有效的作为默认回退；任何一个无效则返回阻止启动的错误。
 */
function applyDefaultPayloads(policyHelpers, n) {
  policyHelperRunner.defaultFallback = null;
  if (!policyHelpers) return null;
  let r = null;
  for (let s of mergeDefaultSettingsPayload(policyHelpers, n)) {
    let S = validateStaticPayload(s, s.onChain && !r);
    if ("error" in S) {
      logFeatureBad("settings_policy_helpers_per_os", "default_payload_invalid");
      return `${s.field} is not a valid static settings payload (${S.error}); Claude Code will not start until it is fixed`;
    }
    if (s.onChain && !r) r = S;
  }
  policyHelperRunner.defaultFallback = r;
  return null;
}
//@ chunk-q8cqcff6.js:72443-72630 placement
function pickStaticPayload(e) {
  let n = null;
  let r = [];
  for (let s of e) {
    let S = validateStaticPayload(s, false);
    if ("error" in S)
      r.push({
        field: s.field,
        error: S.error,
      });
    else if (!n)
      n = {
        ...S,
        warnings: serializeSettingsErrors(S.warnings),
      };
  }
  return {
    winner: n,
    skipped: r,
  };
}
//@ chunk-q8cqcff6.js:72630-72735 placement
function applyStaticPayloadChoice(e) {
  clearSelectionWarnings(REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX);
  policyHelperRunner.defaultFallback = e.winner;
  for (let { field, error } of e.skipped) warnInvalidStaticPayload(field, error, e.verified);
}
//@ chunk-q8cqcff6.js:72735-72805 placement
function hasRiskyManagedSettings(e, winner) {
  return (
    hasPayloadSlot(summarizeManagedSettingsRisk(e), winner.sourceField) ||
    hasDangerousManagedSettings(summarizeManagedSettingsRisk(winner.settings))
  );
}
//@ chunk-q8cqcff6.js:72805-72896 placement
function remoteSettingsPayload(e) {
  let policyHelpers = e?.policyHelpers;
  return policyHelpers
    ? mergeDefaultSettingsPayload(policyHelpers, platformSettingsChain().chain).filter((r) => r.onChain)
    : [];
}
//@ chunk-q8cqcff6.js:72896-72988 placement
/**
 * hasStaticPayload：是否有静态载荷。
 */
function hasStaticPayload(basePolicySettings) {
  if (remoteHelperCommand(basePolicySettings) !== undefined) return true;
  let { winner } = pickStaticPayload(remoteSettingsPayload(basePolicySettings));
  return winner !== null && hasRiskyManagedSettings(basePolicySettings, winner);
}
//@ chunk-q8cqcff6.js:72988-73029 placement
/**
 * withholdUnverifiedCacheKeys：未验证缓存时扣留键。
 */
function withholdUnverifiedCacheKeys(settings, n, verified) {
  return n && !verified ? withholdUnverifiedCacheKeys_2(settings) : settings;
}
//@ chunk-q8cqcff6.js:73029-73441 placement
/**
 * 汇总远程托管设置中 policyHelper 的关键状态：是否已验证、命令、能否执行、是否合并输出/失败拒绝、载荷键、选中的静态载荷与跳过项、载荷能否使用。
 */
function remotePolicySnapshot(e) {
  let n = isRemoteManagedSettingsVerified();
  let r = isRemoteManagedSettingsVerifiedAndApprovedForSession();
  let policyHelpers = e?.policyHelpers;
  let S = policyHelpers
    ? (selectPerOsConfig(policyHelpers, platformSettingsChain().chain, true)?.config ?? null)
    : null;
  let policyHelperCommand = getPolicyHelperCommand(S);
  let h = remoteSettingsPayload(e);
  let { winner, skipped } = pickStaticPayload(h);
  return {
    verified: n,
    tuple: policyHelperCommand,
    helperMayExec: policyHelperCommand !== undefined && r,
    helperMergesOutput: S?.outputBehavior === "merge",
    helperRefusesOnFailure: helperFailureBlocks(S, true),
    payloadKey: jsonStringify(sortKeysDeep(h.map((O) => [O.field, O.raw, O.mergesOutput]))),
    winner,
    skipped,
    payloadServable:
      winner !== null &&
      (r || (!hasRiskyManagedSettings(e, winner) && (n || policyHelperCommand === undefined))),
  };
}
//@ chunk-q8cqcff6.js:73441-73709 placement
function sameRemoteSnapshot(remoteDecision, n) {
  return (
    remoteDecision.verified === n.verified &&
    remoteDecision.tuple === n.tuple &&
    remoteDecision.helperMayExec === n.helperMayExec &&
    remoteDecision.helperMergesOutput === n.helperMergesOutput &&
    remoteDecision.helperRefusesOnFailure === n.helperRefusesOnFailure &&
    remoteDecision.payloadKey === n.payloadKey &&
    remoteDecision.payloadServable === n.payloadServable
  );
}
//@ chunk-q8cqcff6.js:73709-73782 placement
/**
 * mergesOutputBehavior：远程输出是否参与合并。
 */
function mergesOutputBehavior(config, defaultFallback) {
  return config.outputBehavior === "merge" || defaultFallback?.mergesOutput === true;
}
//@ chunk-q8cqcff6.js:73782-74229 placement
function applyStaticPayload(e, mergesOutput, r) {
  let defaultFallback = policyHelperRunner.defaultFallback;
  if (!defaultFallback) return;
  let S = isRemoteManagedSettingsVerified();
  policyHelperRunner.apply({
    config: e?.config ?? null,
    fromPerOs: e?.fromPerOs ?? false,
    serving: "default",
    armedFromRemote: r,
    mergesOutput,
    output: {
      managedSettings: withholdUnverifiedCacheKeys(defaultFallback.settings, r, S),
    },
    warnings: defaultFallback.warnings,
  });
  logForDebugging(
    `${defaultFallback.sourceField} static settings payload applied${r ? ` from remote managed settings${S ? "" : " (cached, not yet verified this session)"}` : ""} (keys: ${Object.keys(defaultFallback.settings).join(",")})`,
    {
      level: "debug",
    },
  );
}
//@ chunk-q8cqcff6.js:74229-74436 placement
/**
 * 判断设置中是否配置了适用于本平台的 policyHelper 或静态载荷。
 */
function hasPolicyHelperConfig(e) {
  let policyHelpers = e?.policyHelpers;
  if (!policyHelpers) return false;
  let chain = platformSettingsChain().chain;
  return (
    selectPerOsConfig(policyHelpers, chain, true) !== null ||
    (policyHelpers.default !== undefined && policyHelpers.default !== null) ||
    chain.some((s) => {
      let defaultSettings = policyHelpers[s]?.defaultSettings;
      return defaultSettings !== undefined && defaultSettings !== null;
    })
  );
}
export {
  hasPolicyHelperConfig,
  hasStaticPayload,
  validatePayloadAndLog,
  warnPolicyHelperRefresh,
  mergesOutputBehavior,
  withholdUnverifiedCacheKeys,
  clearHelperRefreshWarning,
  clearRemotePayloadWarnings,
  clearSelectionWarnings,
  NO_PLATFORM_ENTRY_TEXT,
  remotePolicySnapshot,
  applyStaticPayloadChoice,
  applyDefaultPayloads,
  applyStaticPayload,
  addSelectionWarning,
  clearAllRemoteWarnings,
  sameRemoteSnapshot,
};
