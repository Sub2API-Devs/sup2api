/**
 * utils/settings/policyHelper/helperPayload.ts
 *
 * policyHelper 静态设置载荷（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5fn9rb8r.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-5fn9rb8r.js:70259-70411 placement
function addSelectionWarning(message) {
  policyHelperRunner.selectionWarnings.push({
    file: "policyHelper",
    path: "policyHelpers",
    message,
    severity: "warning",
    statusOnly: true,
  });
  invalidatePolicyLayer();
  logForDebugging(message, {
    level: "warn",
  });
}
//@ chunk-5fn9rb8r.js:70411-70437 placement
/**
 * clearRemotePayloadWarnings：清空远程载荷相关警告。
 */
function clearRemotePayloadWarnings() {
  clearAllRemoteWarnings();
  clearSelectionWarnings(REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX);
}
//@ chunk-5fn9rb8r.js:70437-70489 placement
/**
 * clearAllRemoteWarnings：清空全部远程警告。
 */
function clearAllRemoteWarnings() {
  clearSelectionWarnings(REMOTE_ENTRY_NOT_RUN_PREFIX);
  clearSelectionWarnings(REMOTE_PAYLOAD_NOT_APPLIED_PREFIX);
  policyHelperRunner.retireRemoteFailure();
}
//@ chunk-5fn9rb8r.js:70489-70529 placement
var HELPER_REFRESH_FAILING_PREFIX = "policyHelper refresh failing: ";
//@ chunk-5fn9rb8r.js:70529-70938 placement
function warnPolicyHelperRefresh(error, suffix, usesPl) {
  let suffixNote = `; ${suffix}`;
  let detail = truncateWarning(
    asciiOnly(error.replace(/\s+/gu, " ")),
    MAX_WARNING_CHARS - HELPER_REFRESH_FAILING_PREFIX.length - suffixNote.length,
  );
  let message = `${HELPER_REFRESH_FAILING_PREFIX}${detail}${suffixNote}`;
  if (policyHelperRunner.selectionWarnings.some((selectionWarning) => selectionWarning.message === message))
    return;
  let filtered = policyHelperRunner.selectionWarnings.filter(
    (selectionWarning) => !selectionWarning.message.startsWith(HELPER_REFRESH_FAILING_PREFIX),
  );
  let removed = filtered.length !== policyHelperRunner.selectionWarnings.length;
  policyHelperRunner.selectionWarnings = [
    ...filtered,
    {
      file: "policyHelper",
      path: usesPl ? "policyHelpers" : "policyHelper",
      message,
      severity: "warning",
      statusOnly: true,
    },
  ];
  if (!removed) invalidatePolicyLayer();
}
//@ chunk-5fn9rb8r.js:70938-70959 placement
/**
 * clearHelperRefreshWarning：清空 helper 刷新失败警告。
 */
function clearHelperRefreshWarning() {
  clearSelectionWarnings(HELPER_REFRESH_FAILING_PREFIX);
}
//@ chunk-5fn9rb8r.js:70959-71027 placement
/**
 * NO_PLATFORM_ENTRY_TEXT：没有当前平台条目的说明。
 */
var NO_PLATFORM_ENTRY_TEXT = "policyHelpers is configured but has no entry for platform ";
//@ chunk-5fn9rb8r.js:71027-71181 placement
function clearSelectionWarnings(prefix) {
  let filtered = policyHelperRunner.selectionWarnings.filter(
    (selectionWarning) => !selectionWarning.message.startsWith(prefix),
  );
  if (filtered.length === policyHelperRunner.selectionWarnings.length) return;
  policyHelperRunner.selectionWarnings = filtered;
  invalidatePolicyLayer();
}
//@ chunk-5fn9rb8r.js:71181-71394 placement
function validatePayloadAndLog(raw, field) {
  let result = validatePolicyHelperConfig(raw, field);
  for (let strippedKey of result.strippedKeys)
    logForDebugging(`${field}: stripped ${strippedKey} from the settings payload (no recursion)`, {
      level: "warn",
    });
  for (let warning of result.warnings)
    logForDebugging(`${field}: ${warning.message}`, {
      level: "warn",
    });
  return result;
}
//@ chunk-5fn9rb8r.js:71394-71904 placement
function mergeDefaultSettingsPayload(helpers, onChain) {
  let payloads = [];
  for (let key of onChain) {
    let entry = helpers[key];
    let defaultSettings = entry?.defaultSettings;
    if (defaultSettings !== undefined && defaultSettings !== null)
      payloads.push({
        field: `policyHelpers.${key}.defaultSettings`,
        raw: defaultSettings,
        onChain: true,
        mergesOutput: entry?.outputBehavior === "merge",
      });
  }
  for (let platform of SUPPORTED_PLATFORMS) {
    let defaultSettings = helpers[platform]?.defaultSettings;
    if (defaultSettings !== undefined && defaultSettings !== null && !onChain.includes(platform))
      payloads.push({
        field: `policyHelpers.${platform}.defaultSettings`,
        raw: defaultSettings,
        onChain: false,
        mergesOutput: false,
      });
  }
  if (helpers.default !== undefined && helpers.default !== null)
    payloads.push({
      field: "policyHelpers.default",
      raw: helpers.default,
      onChain: true,
      mergesOutput: false,
    });
  return payloads;
}
//@ chunk-5fn9rb8r.js:71904-72341 placement
function validateStaticPayload(payload, log) {
  if (payload.raw !== null && typeof payload.raw === "object" && !Array.isArray(payload.raw)) {
    let { policyHelper, policyHelpers, ...rest } = payload.raw;
    let parsed = STATIC_PAYLOAD_SCHEMA().safeParse(rest);
    if (!parsed.success)
      return {
        error: parsed.error.issues[0]?.message ?? "failed validation",
      };
  }
  let result = log
    ? validatePayloadAndLog(payload.raw, payload.field)
    : validatePolicyHelperConfig(payload.raw, payload.field);
  if ("error" in result)
    return {
      error: result.error,
    };
  return {
    settings: result.settings,
    warnings: result.warnings.map((warning) => ({
      ...warning,
      statusOnly: true,
    })),
    sourceField: payload.field,
    mergesOutput: payload.mergesOutput,
  };
}
//@ chunk-5fn9rb8r.js:72341-72706 placement
/**
 * 校验 policyHelpers 默认设置载荷，记录链上第一个有效的作为默认回退；任何一个无效则返回阻止启动的错误。
 */
function applyDefaultPayloads(helpers, onChain) {
  policyHelperRunner.defaultFallback = null;
  if (!helpers) return null;
  let fallback = null;
  for (let payload of mergeDefaultSettingsPayload(helpers, onChain)) {
    let validated = validateStaticPayload(payload, payload.onChain && !fallback);
    if ("error" in validated) {
      logFeatureBad("settings_policy_helpers_per_os", "default_payload_invalid");
      return `${payload.field} is not a valid static settings payload (${validated.error}); Claude Code will not start until it is fixed`;
    }
    if (payload.onChain && !fallback) fallback = validated;
  }
  policyHelperRunner.defaultFallback = fallback;
  return null;
}
//@ chunk-5fn9rb8r.js:72706-72893 placement
function pickStaticPayload(payloads) {
  let winner = null;
  let skipped = [];
  for (let payload of payloads) {
    let validated = validateStaticPayload(payload, false);
    if ("error" in validated)
      skipped.push({
        field: payload.field,
        error: validated.error,
      });
    else if (!winner)
      winner = {
        ...validated,
        warnings: serializeSettingsErrors(validated.warnings),
      };
  }
  return {
    winner,
    skipped,
  };
}
//@ chunk-5fn9rb8r.js:72893-72998 placement
function applyStaticPayloadChoice(choice) {
  clearSelectionWarnings(REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX);
  policyHelperRunner.defaultFallback = choice.winner;
  for (let { field, error } of choice.skipped) warnInvalidStaticPayload(field, error, choice.verified);
}
//@ chunk-5fn9rb8r.js:72998-73068 placement
function hasRiskyManagedSettings(settings, winner) {
  return (
    hasPayloadSlot(summarizeManagedSettingsRisk(settings), winner.sourceField) ||
    hasDangerousManagedSettings(summarizeManagedSettingsRisk(winner.settings))
  );
}
//@ chunk-5fn9rb8r.js:73068-73159 placement
function remoteSettingsPayload(settings) {
  let policyHelpers = settings?.policyHelpers;
  return policyHelpers
    ? mergeDefaultSettingsPayload(policyHelpers, platformSettingsChain().chain).filter(
        (payload) => payload.onChain,
      )
    : [];
}
//@ chunk-5fn9rb8r.js:73159-73251 placement
/**
 * hasStaticPayload：是否有静态载荷。
 */
function hasStaticPayload(settings) {
  if (remoteHelperCommand(settings) !== undefined) return true;
  let { winner } = pickStaticPayload(remoteSettingsPayload(settings));
  return winner !== null && hasRiskyManagedSettings(settings, winner);
}
//@ chunk-5fn9rb8r.js:73251-73292 placement
/**
 * withholdUnverifiedCacheKeys：未验证缓存时扣留键。
 */
function withholdUnverifiedCacheKeys(settings, candidates, verified) {
  return candidates && !verified ? withholdUnverifiedCacheKeys_2(settings) : settings;
}
//@ chunk-5fn9rb8r.js:73292-73704 placement
/**
 * 汇总远程托管设置中 policyHelper 的关键状态：是否已验证、命令、能否执行、是否合并输出/失败拒绝、载荷键、选中的静态载荷与跳过项、载荷能否使用。
 */
function remotePolicySnapshot(settings) {
  let verified = isRemoteManagedSettingsVerified();
  let approved = isRemoteManagedSettingsVerifiedAndApprovedForSession();
  let policyHelpers = settings?.policyHelpers;
  let config = policyHelpers
    ? (selectPerOsConfig(policyHelpers, platformSettingsChain().chain, true)?.config ?? null)
    : null;
  let policyHelperCommand = getPolicyHelperCommand(config);
  let payloads = remoteSettingsPayload(settings);
  let { winner, skipped } = pickStaticPayload(payloads);
  return {
    verified,
    tuple: policyHelperCommand,
    helperMayExec: policyHelperCommand !== undefined && approved,
    helperMergesOutput: config?.outputBehavior === "merge",
    helperRefusesOnFailure: helperFailureBlocks(config, true),
    payloadKey: jsonStringify(
      sortKeysDeep(payloads.map((payload) => [payload.field, payload.raw, payload.mergesOutput])),
    ),
    winner,
    skipped,
    payloadServable:
      winner !== null &&
      (approved ||
        (!hasRiskyManagedSettings(settings, winner) && (verified || policyHelperCommand === undefined))),
  };
}
//@ chunk-5fn9rb8r.js:73704-73972 placement
function sameRemoteSnapshot(remoteDecision, other) {
  return (
    remoteDecision.verified === other.verified &&
    remoteDecision.tuple === other.tuple &&
    remoteDecision.helperMayExec === other.helperMayExec &&
    remoteDecision.helperMergesOutput === other.helperMergesOutput &&
    remoteDecision.helperRefusesOnFailure === other.helperRefusesOnFailure &&
    remoteDecision.payloadKey === other.payloadKey &&
    remoteDecision.payloadServable === other.payloadServable
  );
}
//@ chunk-5fn9rb8r.js:73972-74045 placement
/**
 * mergesOutputBehavior：远程输出是否参与合并。
 */
function mergesOutputBehavior(config, defaultFallback) {
  return config.outputBehavior === "merge" || defaultFallback?.mergesOutput === true;
}
//@ chunk-5fn9rb8r.js:74045-74492 placement
function applyStaticPayload(choice, mergesOutput, fromRemote) {
  let defaultFallback = policyHelperRunner.defaultFallback;
  if (!defaultFallback) return;
  let verified = isRemoteManagedSettingsVerified();
  policyHelperRunner.apply({
    config: choice?.config ?? null,
    fromPerOs: choice?.fromPerOs ?? false,
    serving: "default",
    armedFromRemote: fromRemote,
    mergesOutput,
    output: {
      managedSettings: withholdUnverifiedCacheKeys(defaultFallback.settings, fromRemote, verified),
    },
    warnings: defaultFallback.warnings,
  });
  logForDebugging(
    `${defaultFallback.sourceField} static settings payload applied${fromRemote ? ` from remote managed settings${verified ? "" : " (cached, not yet verified this session)"}` : ""} (keys: ${Object.keys(defaultFallback.settings).join(",")})`,
    {
      level: "debug",
    },
  );
}
//@ chunk-5fn9rb8r.js:74492-74699 placement
/**
 * 判断设置中是否配置了适用于本平台的 policyHelper 或静态载荷。
 */
function hasPolicyHelperConfig(settings) {
  let policyHelpers = settings?.policyHelpers;
  if (!policyHelpers) return false;
  let chain = platformSettingsChain().chain;
  return (
    selectPerOsConfig(policyHelpers, chain, true) !== null ||
    (policyHelpers.default !== undefined && policyHelpers.default !== null) ||
    chain.some((platform) => {
      let defaultSettings = policyHelpers[platform]?.defaultSettings;
      return defaultSettings !== undefined && defaultSettings !== null;
    })
  );
}
export {
  validatePayloadAndLog,
  warnPolicyHelperRefresh,
  mergesOutputBehavior,
  withholdUnverifiedCacheKeys,
  clearHelperRefreshWarning,
  clearRemotePayloadWarnings,
  clearSelectionWarnings,
  NO_PLATFORM_ENTRY_TEXT,
  hasPolicyHelperConfig,
  remotePolicySnapshot,
  applyStaticPayloadChoice,
  applyDefaultPayloads,
  applyStaticPayload,
  addSelectionWarning,
  clearAllRemoteWarnings,
  sameRemoteSnapshot,
  hasStaticPayload,
};
