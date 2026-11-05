/**
 * utils/settings/policyHelper/policyHelper.ts
 *
 * policyHelper 运行器（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5fn9rb8r.js (24)
 * attribution: placement 24
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { looseObject, unknown, stringSchema } from "../../../../vendor/zod/v4/classic/schemas.js";
import { commandSyncNameState, invalidateCommandNames } from "../commandSyncNames.js";
import { isStorageV5Enabled } from "../../hoverRest.js";
import { createSignal } from "../../signal.js";
import { logError } from "../../log.js";
import {
  applyRemotePolicyMidSession,
  retryRemoteHelper,
  matchingRemoteHelperConfig,
  resetRemoteHelperState,
  retireOsAdminPass,
  retireReason,
  retireIfShadowedByRemote,
  selectPerOsHelper,
  runRemoteArmedHelper,
  RemoteHelperError,
} from "./helperRemote.js";
import { runPolicyHelperWithRetry } from "./helperExec.js";
import { logForDebugging } from "../../debug.js";
import {
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
} from "./helperPayload.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../../services/analytics/featureTelemetry.js";
import {
  isRemoteManagedSettingsVerified,
  getEligibilityMemo,
} from "../../../services/remoteManagedSettings/remoteSettingsState.js";
import { MAX_HELPER_MS, SUPPORTED_PLATFORMS } from "../types.js";
import { retainCacheKey } from "../../memoize.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { cleanForDisplay } from "../../stringUtils.js";
import { getRemoteManagedSettingsSyncFromCache } from "../../../services/remoteManagedSettings/remoteSettingsCache.js";
import { mdmResult } from "../mdm/mdmLoader.js";
import { platformSettingsChain } from "../marketplaceSettingsAliases.js";
import { parseHelperSetting, asciiOnly } from "../otelEndpointValidation.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5fn9rb8r.js:57874-58002 placement
var HELPER_TIMEOUT_MS; // deferred: uses DoctorLazy (../../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_HELPER_OUTPUT_BYTES;
var HELPER_OUTPUT_SCHEMA;
deferInit("chunk-5fn9rb8r.js:57874", () => {
  HELPER_TIMEOUT_MS = 1e4;
  MAX_HELPER_OUTPUT_BYTES = 1048576;
  HELPER_OUTPUT_SCHEMA = DoctorLazy(() =>
    looseObject({
      managedSettings: unknown().optional(),
      claudeMd: stringSchema().optional(),
      appendSystemPrompt: stringSchema().optional(),
    }),
  );
});
//@ chunk-5fn9rb8r.js:58002-58047 placement
function helperRefusal(message) {
  return {
    message,
    remote: null,
  };
}
//@ chunk-5fn9rb8r.js:58047-58072 placement
/**
 * POLICY_HELPER_TAG：policyHelper 的错误标签。
 */
var POLICY_HELPER_TAG = "<policyHelper>";
//@ chunk-5fn9rb8r.js:58072-58159 placement
/**
 * invalidatePolicyLayer：使策略层失效。
 */
function invalidatePolicyLayer() {
  let state = commandSyncNameState();
  if (isStorageV5Enabled() && state.primer !== undefined) state.invalidatePolicyLayer();
  else invalidateCommandNames();
}
//@ chunk-5fn9rb8r.js:58159-62920 placement
/**
 * policyHelper 运行器：按 OS 选择助手、刷新、失败时由静态设置载荷兜底
 */
class PolicyHelperRunner {
  state = null;
  selectionWarnings = [];
  initializeAttempted = false;
  structuralRefusalLogged = false;
  noEntrySadLogged = false;
  defaultFallback = null;
  payloadRefusalError = null;
  refreshTimer = null;
  refreshInFlight = false;
  midSessionArmingEnabled = false;
  osAdminArming = null;
  undeliveredRefusal = null;
  startsNoSession = false;
  decidedOrigin = null;
  pendingStats = new Map();
  remoteArmGeneration = 0;
  osAdminRetireGeneration = 0;
  stoppedAsking = false;
  remoteArmingConfig = null;
  remoteFailedConfig = null;
  lastFailure = null;
  selectedEntry = null;
  restartFrom = null;
  releaseLatchWhenTickSettles = false;
  readRemotePayload = null;
  armedFromUserWritableBase = false;
  retiredHelperPaths = new Set();
  remoteDecision = null;
  refreshed = createSignal();
  passesInFlight = 0;
  passSettled = createSignal();
  claimInitialize() {
    if (this.initializeAttempted) return false;
    this.initializeAttempted = true;
    return true;
  }
  apply(state) {
    this.state = state;
    this.remoteFailedConfig = null;
    this.lastFailure = null;
    invalidatePolicyLayer();
    if (state.config) this.startRefreshTimer(state.config, state.fromPerOs, state.armedFromRemote);
    else this.stopRefreshTimer();
  }
  retireState() {
    let path = this.state?.config?.path;
    if (path !== undefined) this.retiredHelperPaths.add(path);
    this.state = null;
    this.lastFailure = null;
    this.selectedEntry = null;
  }
  reset() {
    this.remoteArmGeneration++;
    this.remoteArmingConfig = null;
    this.armedFromUserWritableBase = false;
    this.remoteDecision = null;
    this.state = null;
    this.retiredHelperPaths.clear();
    this.selectionWarnings = [];
    this.initializeAttempted = false;
    this.structuralRefusalLogged = false;
    this.noEntrySadLogged = false;
    this.defaultFallback = null;
    this.payloadRefusalError = null;
    this.refreshInFlight = false;
    this.midSessionArmingEnabled = false;
    this.osAdminArming = null;
    this.undeliveredRefusal = null;
    this.restartFrom = null;
    this.stoppedAsking = false;
    this.decidedOrigin = null;
    this.remoteFailedConfig = null;
    this.lastFailure = null;
    this.selectedEntry = null;
    this.releaseLatchWhenTickSettles = false;
    this.readRemotePayload = null;
    this.stopRefreshTimer();
    invalidatePolicyLayer();
  }
  announceTierChange() {
    invalidatePolicyLayer();
    try {
      commandSyncNameState().changed.emit("policySettings");
      this.refreshed.emit();
    } catch (error) {
      logError(error);
    }
  }
  stopRefreshTimer() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
  holdRemoteFailure({ config, fromPerOs }, retry) {
    this.remoteFailedConfig = config;
    if (!retry) return;
    if (config.path !== undefined) this.retiredHelperPaths.add(config.path);
    this.startRefreshTimer(config, fromPerOs, true);
  }
  retireRemoteFailure() {
    if (this.remoteFailedConfig === null) return;
    this.remoteFailedConfig = null;
    this.lastFailure = null;
    this.selectedEntry = null;
    this.stopRefreshTimer();
    this.releaseLatch();
  }
  releaseLatch() {
    if (this.refreshInFlight) this.releaseLatchWhenTickSettles = true;
    else this.initializeAttempted = false;
  }
  settleRefreshExec() {
    this.refreshInFlight = false;
    if (this.releaseLatchWhenTickSettles) {
      this.releaseLatchWhenTickSettles = false;
      this.releaseLatchAfterTornDownExec();
    }
  }
  releaseLatchAfterTornDownExec() {
    this.initializeAttempted = false;
    if (this.readRemotePayload !== null) applyRemotePolicyMidSession(this.readRemotePayload);
  }
  startRefreshTimer(config, fromPerOs, armed) {
    this.stopRefreshTimer();
    let refreshIntervalMs = config.refreshIntervalMs ?? 0;
    if (refreshIntervalMs <= 0) return;
    this.refreshTimer = setInterval(
      (config, fromPerOs, armed) => {
        if (this.refreshInFlight) return;
        this.refreshInFlight = true;
        if (armed && this.state === null) {
          retryRemoteHelper(config, fromPerOs).finally(() => this.settleRefreshExec());
          return;
        }
        let state = this.state;
        runPolicyHelperWithRetry(config, fromPerOs, armed, () => this.state === state)
          .then((result) => {
            if (this.state === null || this.state !== state) return;
            let effectiveConfig = (armed && matchingRemoteHelperConfig(config)) || config;
            if ("error" in result) {
              if (this.defaultFallback) {
                let note = `the static ${this.defaultFallback.sourceField} settings payload governs`;
                if (this.state.serving === "default") {
                  logForDebugging(
                    `policyHelper refresh: helper still failing (${result.error}); the static default settings payload continues to govern`,
                    {
                      level: "debug",
                    },
                  );
                  warnPolicyHelperRefresh(result.error, note, fromPerOs);
                  if (this.lastFailure !== result.code) {
                    this.lastFailure = result.code;
                    this.announceTierChange();
                  }
                  return;
                }
                logForDebugging(
                  `policyHelper refresh failed (${result.error}); applying the static ${this.defaultFallback.sourceField} settings payload`,
                  {
                    level: "warn",
                  },
                );
                warnPolicyHelperRefresh(result.error, note, fromPerOs);
                logFeatureSad("settings_policy_helpers_per_os", "refresh_fell_back_to_default");
                this.state.serving = "default";
                this.lastFailure = result.code;
                this.state.mergesOutput = mergesOutputBehavior(effectiveConfig, this.defaultFallback);
                this.state.output = {
                  managedSettings: withholdUnverifiedCacheKeys(
                    this.defaultFallback.settings,
                    armed,
                    isRemoteManagedSettingsVerified(),
                  ),
                };
                this.state.warnings = this.defaultFallback.warnings;
                this.announceTierChange();
                return;
              }
              logForDebugging(`policyHelper refresh failed (retaining current policy): ${result.error}`, {
                level: "warn",
              });
              warnPolicyHelperRefresh(
                result.error,
                "the last successful helper output still governs",
                fromPerOs,
              );
              logFeatureSad("settings_policy_helper", "refresh_failed", {
                attempts: result.attempts,
              });
              if (this.lastFailure !== result.code) {
                this.lastFailure = result.code;
                this.announceTierChange();
              }
              return;
            }
            clearHelperRefreshWarning();
            if (this.state.serving === "default") {
              logForDebugging(
                "policyHelper refresh: helper recovered; its output replaces the static default settings payload",
                {
                  level: "info",
                },
              );
              logFeatureOk("settings_policy_helpers_per_os");
            }
            this.state.serving = "helper";
            this.lastFailure = null;
            this.state.mergesOutput = effectiveConfig.outputBehavior === "merge";
            this.state.output = result.output;
            this.state.warnings = result.warnings;
            this.announceTierChange();
          })
          .catch((error) => {
            logError(error);
          })
          .finally(() => this.settleRefreshExec());
      },
      Math.min(refreshIntervalMs, MAX_HELPER_MS),
      config,
      fromPerOs,
      armed,
    );
    this.refreshTimer.unref?.();
  }
}
//@ chunk-5fn9rb8r.js:62920-63003 placement
/**
 * policyHelperRunner：policyHelper 单例运行器；policyHelperRunnerAlias：运行器的应答缓存；FILE_POLICY_TIERS：文件类策略层级（同一声明共 3 个绑定）。
 */
var policyHelperRunner; // deferred: uses PolicyHelperRunner of its import cycle while loading; runs once the cycle is complete
var policyHelperRunnerAlias;
var refreshed;
var FILE_POLICY_TIERS;
deferInit("chunk-5fn9rb8r.js:62920", () => {
  policyHelperRunner = new PolicyHelperRunner();
  policyHelperRunnerAlias = retainCacheKey({
    clear: resetRemoteHelperState,
  });
  refreshed = policyHelperRunner.refreshed;
  FILE_POLICY_TIERS = new Set(["plist", "hklm", "file"]);
});
//@ chunk-5fn9rb8r.js:63003-63248 placement
/**
 * 运行一次 policyHelper pass：先交付尚未送达的拒绝；pass 拒绝时，远程来源且命令不启动会话则只告警放行，否则记遥测并返回拒绝信息。
 */
async function runPolicyHelperPass(settings, origin, errors) {
  let undeliveredRefusal = policyHelperRunner.undeliveredRefusal;
  if (undeliveredRefusal !== null) {
    policyHelperRunner.undeliveredRefusal = null;
    return undeliveredRefusal;
  }
  let decision = await runPassWithRestarts(settings, origin, errors);
  if (decision === null) return null;
  if (decision.remote) {
    if (policyHelperRunner.startsNoSession) {
      warnRefuseNotEnforced(decision.message, decision.remote);
      return null;
    }
    logRemoteRefusal(decision.remote);
  }
  return decision.message;
}
//@ chunk-5fn9rb8r.js:63248-63284 placement
/**
 * markStartsNoSession：标记本次不启动会话。
 */
function markStartsNoSession() {
  policyHelperRunner.startsNoSession = true;
}
//@ chunk-5fn9rb8r.js:63284-63665 placement
/**
 * 远程 policyHelper 要求拒绝但当前命令不启动会话时：记日志、给出状态提示并记遥测，命令继续执行。
 */
function warnRefuseNotEnforced(message, remote) {
  logForDebugging(
    `policyHelper: ${message} (reached in a command that starts no session; it proceeds without the helper)`,
    {
      level: "error",
    },
  );
  warnRemoteHelperSkipped(
    'onFailure is "refuse", but this command starts no Claude Code session, so it proceeds without the helper; sessions will not start until the helper succeeds',
    remote.tuple,
  );
  logFeatureSad("settings_policy_helpers_per_os", "remote_refuse_not_enforced_no_session");
}
//@ chunk-5fn9rb8r.js:63665-63810 placement
function logRemoteRefusal(remote) {
  logFeatureBad(
    "settings_policy_helpers_per_os",
    remote.code,
    remote.helperFailureReason === undefined
      ? undefined
      : {
          helper_failure_reason: fromEnum(remote.helperFailureReason),
        },
  );
}
//@ chunk-5fn9rb8r.js:63810-63939 placement
/**
 * 找出与 policyHelpers 相关的启动致命错误。
 */
function findFatalPolicyHelperError(errors) {
  return errors.find(
    (issue) =>
      issue.startupFatal &&
      (issue.path === "" || issue.path === "policyHelpers" || issue.path.startsWith("policyHelpers.")),
  );
}
//@ chunk-5fn9rb8r.js:63939-64126 placement
/**
 * 判断 policyHelper 导致的退出原因：helper 失败或策略无效。
 */
function policyHelperExitReason(errors) {
  let fatalPolicyHelperError = findFatalPolicyHelperError(errors);
  if (fatalPolicyHelperError)
    return SUPPORTED_PLATFORMS.some((platform) => fatalPolicyHelperError.path === `policyHelpers.${platform}`)
      ? "helper_failed"
      : "policy_invalid";
  return policyHelperRunner.payloadRefusalError !== null ? "policy_invalid" : "helper_failed";
}
//@ chunk-5fn9rb8r.js:64126-64471 placement
/**
 * 执行 policyHelper 入口解析，期间若有重启请求则退役当前 pass 并按新基础设置重跑；结束时清理残留重启请求、递减进行中计数并发出完成信号。
 */
async function runPassWithRestarts(settings, origin, errors) {
  policyHelperRunner.passesInFlight++;
  try {
    let policyHelperEntry = await resolvePolicyHelperEntry(settings, origin, errors);
    for (
      let restartFrom = policyHelperRunner.restartFrom;
      restartFrom !== null;
      restartFrom = policyHelperRunner.restartFrom
    ) {
      retireOsAdminPass(retireReason());
      policyHelperRunner.restartFrom = null;
      let base = restartFrom();
      retireIfShadowedByRemote(base.origin);
      policyHelperEntry = await resolvePolicyHelperEntry(base.settings, base.origin, base.loadErrors);
    }
    return policyHelperEntry;
  } finally {
    if (policyHelperRunner.restartFrom !== null)
      try {
        retireOsAdminPass(retireReason());
        policyHelperRunner.restartFrom = null;
      } catch (error) {
        logError(error);
      }
    policyHelperRunner.passesInFlight--;
    policyHelperRunner.passSettled.emit();
  }
}
//@ chunk-5fn9rb8r.js:64471-69013 placement
/**
 * 解析 policyHelpers 设置项（按 OS、结构校验、审批状态）
 */
async function resolvePolicyHelperEntry(settings, origin, errors) {
  let fatalPolicyHelperError = findFatalPolicyHelperError(errors);
  if (fatalPolicyHelperError) {
    if (!policyHelperRunner.structuralRefusalLogged) {
      policyHelperRunner.structuralRefusalLogged = true;
      let path = fatalPolicyHelperError.path;
      logFeatureBad(
        "settings_policy_helpers_per_os",
        path === ""
          ? "document_invalid"
          : path === "policyHelpers"
            ? "structural_invalid"
            : path === "policyHelpers.default" || path.endsWith(".defaultSettings")
              ? "default_payload_invalid"
              : "entry_invalid",
      );
    }
    return helperRefusal(
      `${fatalPolicyHelperError.file === undefined ? "managed settings" : cleanForDisplay(fatalPolicyHelperError.file)}: ${fatalPolicyHelperError.message}`,
    );
  }
  if (policyHelperRunner.payloadRefusalError !== null)
    return helperRefusal(policyHelperRunner.payloadRefusalError);
  if (!policyHelperRunner.claimInitialize()) return null;
  policyHelperRunner.decidedOrigin = origin;
  clearRemotePayloadWarnings();
  policyHelperRunner.remoteDecision = null;
  policyHelperRunner.selectedEntry = null;
  clearSelectionWarnings(NO_PLATFORM_ENTRY_TEXT);
  clearSelectionWarnings(SKIPPED_ENTRY_PREFIX);
  let policyHelpers = settings?.policyHelpers;
  let fromRemote = origin === "remote" && hasPolicyHelperConfig(settings);
  let snapshot = fromRemote ? remotePolicySnapshot(settings) : null;
  let tuple = snapshot?.tuple;
  let policyHelper = fromRemote ? undefined : settings?.policyHelper;
  if (!policyHelpers && !policyHelper) {
    if (getEligibilityMemo() === true && !getRemoteManagedSettingsSyncFromCache())
      logForDebugging(
        "policyHelper: no helper configuration present at helper-pass time (remote managed settings eligible, no payload in cache); a payload landing later arms one only through a fetch cycle after preAction",
        {
          level: "debug",
        },
      );
    policyHelperRunner.initializeAttempted = false;
    return null;
  }
  if (snapshot) {
    policyHelperRunner.remoteDecision = snapshot;
    if (!snapshot.verified && tuple !== undefined) {
      policyHelperRunner.initializeAttempted = false;
      warnRemoteHelperSkipped("remote settings not verified this session", tuple);
      return null;
    }
  } else if (origin === "remote" && policyHelpers) {
    logForDebugging("remote policyHelpers names no helper and carries no static payload for this platform", {
      level: "debug",
    });
    policyHelperRunner.initializeAttempted = false;
    return null;
  } else if (origin === null || !FILE_POLICY_TIERS.has(origin)) {
    logForDebugging(`policyHelper ignored: delivered via non-admin source '${origin ?? "unknown"}'`, {
      level: "warn",
    });
    if (origin === "remote") policyHelperRunner.initializeAttempted = false;
    return null;
  }
  policyHelperRunner.armedFromUserWritableBase = origin === "plist" && mdmResult().userWritable === true;
  let chainInfo = policyHelpers ? platformSettingsChain() : null;
  let message = null;
  if (snapshot) applyStaticPayloadChoice(snapshot);
  else message = applyDefaultPayloads(policyHelpers, chainInfo?.chain ?? []);
  if (message) {
    policyHelperRunner.payloadRefusalError = message;
    return helperRefusal(message);
  }
  let perOsHelper = selectPerOsHelper(policyHelpers, policyHelper, chainInfo, fromRemote);
  if (!perOsHelper) {
    policyHelperRunner.initializeAttempted = false;
    return null;
  }
  policyHelperRunner.selectedEntry =
    perOsHelper.kind === "helper"
      ? {
          key: perOsHelper.entryKey,
          config: perOsHelper.config,
        }
      : {
          key:
            SUPPORTED_PLATFORMS.find(
              (platform) => perOsHelper.fallback.sourceField === `policyHelpers.${platform}.defaultSettings`,
            ) ?? "default",
          config: null,
        };
  if (perOsHelper.kind === "default") {
    if (snapshot && !snapshot.payloadServable) {
      policyHelperRunner.initializeAttempted = false;
      warnRemoteHelperSkipped(
        snapshot.verified
          ? `${perOsHelper.fallback.sourceField} carries settings not yet approved in the managed-settings dialog; it is not applied until they are`
          : `${perOsHelper.fallback.sourceField} carries settings the managed-settings dialog lists and remote settings are not verified this session; it is not applied until they are`,
        undefined,
      );
      if (snapshot.verified) logFeatureSad("settings_policy_helpers_per_os", "remote_consent_missing");
      return null;
    }
    logFeatureSad("settings_policy_helpers_per_os", "fell_back_to_default");
    logForDebugging(
      `policyHelper: no policyHelpers helper entry for platform "${chainInfo?.platform ?? "unknown"}"; applying the static ${perOsHelper.fallback.sourceField} settings payload`,
      {
        level: "info",
      },
    );
    applyStaticPayload(null, perOsHelper.fallback.mergesOutput, fromRemote);
    return null;
  }
  let defaultFallback = policyHelperRunner.defaultFallback;
  let refuses = helperFailureBlocks(perOsHelper.fromPerOs ? perOsHelper.config : null, fromRemote);
  if (snapshot && !snapshot.helperMayExec) {
    if (defaultFallback && snapshot.payloadServable) {
      applyStaticPayload(null, mergesOutputBehavior(perOsHelper.config, defaultFallback), true);
      warnRemoteHelperSkipped(
        `not yet approved in the managed-settings dialog; the static ${defaultFallback.sourceField} settings payload governs until it is`,
        tuple,
      );
      logFeatureSad("settings_policy_helpers_per_os", "remote_consent_missing");
      return null;
    }
    policyHelperRunner.initializeAttempted = false;
    warnRemoteHelperSkipped(
      defaultFallback
        ? `not yet approved in the managed-settings dialog, and neither are settings the static ${defaultFallback.sourceField} payload carries; nothing from the entry applies until they are`
        : "not yet approved in the managed-settings dialog",
      tuple,
    );
    if (refuses)
      return {
        message: `Claude Code cannot start: your organization's remote managed settings require the policy helper ${helperSettingName(tuple)} to succeed (onFailure "refuse"), and it cannot run until those settings are approved in the managed-settings dialog. Contact your administrator.`,
        remote: {
          code: "remote_refused_on_failure",
          helperFailureReason: undefined,
          tuple,
        },
      };
    logFeatureSad("settings_policy_helpers_per_os", "remote_consent_missing");
    return null;
  }
  try {
    if (perOsHelper.fromPerOs) {
      if (
        (await runRemoteArmedHelper(perOsHelper, {
          armedFromRemote: fromRemote,
          suppressExecEvents: fromRemote || defaultFallback !== null,
        })) === "applied"
      )
        logFeatureOk("settings_policy_helpers_per_os");
    } else await runRemoteArmedHelper(perOsHelper);
  } catch (error) {
    let defaultFallback = policyHelperRunner.defaultFallback;
    let refusalBlocks = fromRemote
      ? (policyHelperRunner.remoteDecision?.helperRefusesOnFailure ?? refuses)
      : refuses;
    if (perOsHelper.fromPerOs && !defaultFallback)
      if (!(error instanceof RemoteHelperError)) logFeatureBad("settings_policy_helpers_per_os", "error");
      else if (fromRemote && refusalBlocks);
      else if (!fromRemote && !refuses)
        logFeatureBad("settings_policy_helpers_per_os", "continued_on_failure", {
          helper_failure_reason: fromEnum(error.code),
        });
      else logFeatureBad("settings_policy_helpers_per_os", error.code);
    if (error instanceof RemoteHelperError) {
      if (defaultFallback) {
        logForDebugging(
          `${error.message}; applying the static ${defaultFallback.sourceField} settings payload instead`,
          {
            level: "warn",
          },
        );
        logFeatureSad("settings_policy_helpers_per_os", "fell_back_to_default_on_failure");
        applyStaticPayload(
          error.code === "bad_path" ? null : perOsHelper,
          mergesOutputBehavior(perOsHelper.config, defaultFallback),
          fromRemote,
        );
        policyHelperRunner.lastFailure = error.code;
        return null;
      }
      policyHelperRunner.lastFailure = error.code;
      if (fromRemote) {
        warnRemoteHelperSkipped(error.message, tuple);
        policyHelperRunner.holdRemoteFailure(perOsHelper, error.code !== "bad_path");
        return refusalBlocks ? remoteRefusalResult(error, tuple) : null;
      }
      if (!refuses) {
        warningWithSkippedPrefix(error.message);
        return null;
      }
      return helperRefusal(error.message);
    }
    throw error;
  }
  return null;
}
//@ chunk-5fn9rb8r.js:69013-69082 placement
/**
 * helperFailureBlocks：按 onFailure 判断是否阻塞。
 */
function helperFailureBlocks(config, fromRemote) {
  let onFailure = config?.onFailure;
  return onFailure == null ? !fromRemote : onFailure !== "continue";
}
//@ chunk-5fn9rb8r.js:69082-69407 placement
/**
 * 构造远程托管设置要求 helper 成功（onFailure refuse）但 helper 失败时的启动拒绝信息与遥测字段。
 */
function remoteRefusalResult(error, tuple) {
  return {
    message: `Claude Code cannot start: your organization's remote managed settings require the policy helper ${helperSettingName(tuple)} to succeed (onFailure "refuse"), and it failed [${error.code}] \u2014 ${error.message}. Contact your administrator.`,
    remote: {
      code: "remote_refused_on_failure",
      helperFailureReason: error.code,
      tuple,
    },
  };
}
//@ chunk-5fn9rb8r.js:69407-69472 placement
function helperSettingName(tuple) {
  return (tuple === undefined ? undefined : parseHelperSetting(tuple)) ?? "it configures";
}
//@ chunk-5fn9rb8r.js:69472-69589 placement
var SKIPPED_ENTRY_PREFIX = 'policyHelpers entry skipped (onFailure "continue"): ';
var STARTED_WITHOUT_HELPER_SUFFIX = "; Claude Code started without the helper's output";
//@ chunk-5fn9rb8r.js:69589-69686 placement
function warningWithSkippedPrefix(message) {
  let detail = truncateWarning(
    asciiOnly(message.replace(/\s+/gu, " ")),
    MAX_WARNING_CHARS - SKIPPED_ENTRY_PREFIX.length - STARTED_WITHOUT_HELPER_SUFFIX.length,
  );
  addSelectionWarning(`${SKIPPED_ENTRY_PREFIX}${detail}${STARTED_WITHOUT_HELPER_SUFFIX}`);
}
//@ chunk-5fn9rb8r.js:69686-69803 placement
var REMOTE_ENTRY_NOT_RUN_PREFIX = "remote policyHelpers entry not run: ";
var REMOTE_PAYLOAD_NOT_APPLIED_PREFIX = "remote policyHelpers static settings payload not applied: ";
var MAX_WARNING_CHARS = 512;
//@ chunk-5fn9rb8r.js:69803-69869 placement
/**
 * truncateWarning：截断警告文本。
 */
function truncateWarning(text, maxLength = MAX_WARNING_CHARS) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}\u2026` : text;
}
//@ chunk-5fn9rb8r.js:69869-70010 placement
function warnRemoteHelperSkipped(message, tuple) {
  let detail = asciiOnly(message.replace(/\s+/gu, " "));
  let tupleText = tuple === undefined ? undefined : parseHelperSetting(tuple);
  let warning = truncateWarning(
    tuple === undefined
      ? `${REMOTE_PAYLOAD_NOT_APPLIED_PREFIX}${detail}`
      : `${REMOTE_ENTRY_NOT_RUN_PREFIX}${tupleText ? `${tupleText}: ` : ""}${detail}`,
  );
  addSelectionWarning(warning);
}
//@ chunk-5fn9rb8r.js:70010-70074 placement
/**
 * REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX：远程 helper 载荷被跳过的前缀。
 */
var REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX = "remote policyHelpers static settings payload skipped: ";
//@ chunk-5fn9rb8r.js:70074-70259 placement
function warnInvalidStaticPayload(field, error, verified) {
  addSelectionWarning(
    truncateWarning(
      `${REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX}${field} is not a valid static settings payload (${asciiOnly(error.replace(/\s+/gu, " "))})`,
    ),
  );
  if (verified) logFeatureSad("settings_policy_helpers_per_os", "remote_default_payload_invalid");
}
export {
  runPolicyHelperPass,
  policyHelperExitReason,
  markStartsNoSession,
  refreshed,
  HELPER_TIMEOUT_MS,
  policyHelperRunner,
  MAX_HELPER_OUTPUT_BYTES,
  HELPER_OUTPUT_SCHEMA,
  invalidatePolicyLayer,
  REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX,
  REMOTE_ENTRY_NOT_RUN_PREFIX,
  REMOTE_PAYLOAD_NOT_APPLIED_PREFIX,
  truncateWarning,
  MAX_WARNING_CHARS,
  warnInvalidStaticPayload,
  helperFailureBlocks,
  FILE_POLICY_TIERS,
  runPassWithRestarts,
  warnRefuseNotEnforced,
  logRemoteRefusal,
  warnRemoteHelperSkipped,
  POLICY_HELPER_TAG,
  findFatalPolicyHelperError,
};
