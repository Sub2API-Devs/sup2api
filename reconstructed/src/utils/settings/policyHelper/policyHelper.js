/**
 * utils/settings/policyHelper/policyHelper.ts
 *
 * policyHelper 运行器（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (24)
 * attribution: placement 24
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { looseObject, unknown, string } from "../../../../vendor/zod/v4/classic/schemas.js";
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
import { mdmResult } from "../managedPluginTiers.js";
import { platformSettingsChain } from "../marketplaceSettingsAliases.js";
import { parseHelperSetting, asciiOnly } from "../otelEndpointValidation.js";

//@ chunk-q8cqcff6.js:57614-57742 placement
var HELPER_TIMEOUT_MS = 1e4;
var MAX_HELPER_OUTPUT_BYTES = 1048576;
var HELPER_OUTPUT_SCHEMA = DoctorLazy(() =>
  looseObject({
    managedSettings: unknown().optional(),
    claudeMd: string().optional(),
    appendSystemPrompt: string().optional(),
  }),
);
//@ chunk-q8cqcff6.js:57742-57787 placement
function helperRefusal(message) {
  return {
    message,
    remote: null,
  };
}
//@ chunk-q8cqcff6.js:57787-57812 placement
/**
 * POLICY_HELPER_TAG：policyHelper 的错误标签。
 */
var POLICY_HELPER_TAG = "<policyHelper>";
//@ chunk-q8cqcff6.js:57812-57899 placement
/**
 * invalidatePolicyLayer：使策略层失效。
 */
function invalidatePolicyLayer() {
  let e = commandSyncNameState();
  if (isStorageV5Enabled() && e.primer !== undefined) e.invalidatePolicyLayer();
  else invalidateCommandNames();
}
//@ chunk-q8cqcff6.js:57899-62660 placement
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
  apply(e) {
    this.state = e;
    this.remoteFailedConfig = null;
    this.lastFailure = null;
    invalidatePolicyLayer();
    if (e.config) this.startRefreshTimer(e.config, e.fromPerOs, e.armedFromRemote);
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
  holdRemoteFailure({ config, fromPerOs }, r) {
    this.remoteFailedConfig = config;
    if (!r) return;
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
  startRefreshTimer(e, n, r) {
    this.stopRefreshTimer();
    let refreshIntervalMs = e.refreshIntervalMs ?? 0;
    if (refreshIntervalMs <= 0) return;
    this.refreshTimer = setInterval(
      (S, E, h) => {
        if (this.refreshInFlight) return;
        this.refreshInFlight = true;
        if (h && this.state === null) {
          retryRemoteHelper(S, E).finally(() => this.settleRefreshExec());
          return;
        }
        let state = this.state;
        runPolicyHelperWithRetry(S, E, h, () => this.state === state)
          .then((P) => {
            if (this.state === null || this.state !== state) return;
            let O = (h && matchingRemoteHelperConfig(S)) || S;
            if ("error" in P) {
              if (this.defaultFallback) {
                let T = `the static ${this.defaultFallback.sourceField} settings payload governs`;
                if (this.state.serving === "default") {
                  logForDebugging(
                    `policyHelper refresh: helper still failing (${P.error}); the static default settings payload continues to govern`,
                    {
                      level: "debug",
                    },
                  );
                  warnPolicyHelperRefresh(P.error, T, E);
                  if (this.lastFailure !== P.code) {
                    this.lastFailure = P.code;
                    this.announceTierChange();
                  }
                  return;
                }
                logForDebugging(
                  `policyHelper refresh failed (${P.error}); applying the static ${this.defaultFallback.sourceField} settings payload`,
                  {
                    level: "warn",
                  },
                );
                warnPolicyHelperRefresh(P.error, T, E);
                logFeatureSad("settings_policy_helpers_per_os", "refresh_fell_back_to_default");
                this.state.serving = "default";
                this.lastFailure = P.code;
                this.state.mergesOutput = mergesOutputBehavior(O, this.defaultFallback);
                this.state.output = {
                  managedSettings: withholdUnverifiedCacheKeys(
                    this.defaultFallback.settings,
                    h,
                    isRemoteManagedSettingsVerified(),
                  ),
                };
                this.state.warnings = this.defaultFallback.warnings;
                this.announceTierChange();
                return;
              }
              logForDebugging(`policyHelper refresh failed (retaining current policy): ${P.error}`, {
                level: "warn",
              });
              warnPolicyHelperRefresh(P.error, "the last successful helper output still governs", E);
              logFeatureSad("settings_policy_helper", "refresh_failed", {
                attempts: P.attempts,
              });
              if (this.lastFailure !== P.code) {
                this.lastFailure = P.code;
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
            this.state.mergesOutput = O.outputBehavior === "merge";
            this.state.output = P.output;
            this.state.warnings = P.warnings;
            this.announceTierChange();
          })
          .catch((error) => {
            logError(error);
          })
          .finally(() => this.settleRefreshExec());
      },
      Math.min(refreshIntervalMs, MAX_HELPER_MS),
      e,
      n,
      r,
    );
    this.refreshTimer.unref?.();
  }
}
//@ chunk-q8cqcff6.js:62660-62743 placement
/**
 * policyHelperRunner：policyHelper 单例运行器；policyHelperRunnerAlias：运行器的应答缓存；FILE_POLICY_TIERS：文件类策略层级（同一声明共 3 个绑定）。
 */
var policyHelperRunner = new PolicyHelperRunner();
var policyHelperRunnerAlias = retainCacheKey({
  clear: resetRemoteHelperState,
});
var refreshed = policyHelperRunner.refreshed;
var FILE_POLICY_TIERS = new Set(["plist", "hklm", "file"]);
//@ chunk-q8cqcff6.js:62743-62988 placement
/**
 * 运行一次 policyHelper pass：先交付尚未送达的拒绝；pass 拒绝时，远程来源且命令不启动会话则只告警放行，否则记遥测并返回拒绝信息。
 */
async function runPolicyHelperPass(basePolicySettings, n, policyHelperSourceLoadErrors) {
  let undeliveredRefusal = policyHelperRunner.undeliveredRefusal;
  if (undeliveredRefusal !== null) {
    policyHelperRunner.undeliveredRefusal = null;
    return undeliveredRefusal;
  }
  let S = await runPassWithRestarts(basePolicySettings, n, policyHelperSourceLoadErrors);
  if (S === null) return null;
  if (S.remote) {
    if (policyHelperRunner.startsNoSession) {
      warnRefuseNotEnforced(S.message, S.remote);
      return null;
    }
    logRemoteRefusal(S.remote);
  }
  return S.message;
}
//@ chunk-q8cqcff6.js:62988-63024 placement
/**
 * markStartsNoSession：标记本次不启动会话。
 */
function markStartsNoSession() {
  policyHelperRunner.startsNoSession = true;
}
//@ chunk-q8cqcff6.js:63024-63405 placement
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
//@ chunk-q8cqcff6.js:63405-63550 placement
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
//@ chunk-q8cqcff6.js:63550-63679 placement
/**
 * 找出与 policyHelpers 相关的启动致命错误。
 */
function findFatalPolicyHelperError(e) {
  return e.find(
    (n) =>
      n.startupFatal && (n.path === "" || n.path === "policyHelpers" || n.path.startsWith("policyHelpers.")),
  );
}
//@ chunk-q8cqcff6.js:63679-63866 placement
/**
 * 判断 policyHelper 导致的退出原因：helper 失败或策略无效。
 */
function policyHelperExitReason(policyHelperSourceLoadErrors) {
  let fatalPolicyHelperError = findFatalPolicyHelperError(policyHelperSourceLoadErrors);
  if (fatalPolicyHelperError)
    return SUPPORTED_PLATFORMS.some((r) => fatalPolicyHelperError.path === `policyHelpers.${r}`)
      ? "helper_failed"
      : "policy_invalid";
  return policyHelperRunner.payloadRefusalError !== null ? "policy_invalid" : "helper_failed";
}
//@ chunk-q8cqcff6.js:63866-64211 placement
/**
 * 执行 policyHelper 入口解析，期间若有重启请求则退役当前 pass 并按新基础设置重跑；结束时清理残留重启请求、递减进行中计数并发出完成信号。
 */
async function runPassWithRestarts(e, n, r) {
  policyHelperRunner.passesInFlight++;
  try {
    let policyHelperEntry = await resolvePolicyHelperEntry(e, n, r);
    for (
      let restartFrom = policyHelperRunner.restartFrom;
      restartFrom !== null;
      restartFrom = policyHelperRunner.restartFrom
    ) {
      retireOsAdminPass(retireReason());
      policyHelperRunner.restartFrom = null;
      let E = restartFrom();
      retireIfShadowedByRemote(E.origin);
      policyHelperEntry = await resolvePolicyHelperEntry(E.settings, E.origin, E.loadErrors);
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
//@ chunk-q8cqcff6.js:64211-68750 placement
/**
 * 解析 policyHelpers 设置项（按 OS、结构校验、审批状态）
 */
async function resolvePolicyHelperEntry(e, n, r) {
  let fatalPolicyHelperError = findFatalPolicyHelperError(r);
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
  policyHelperRunner.decidedOrigin = n;
  clearRemotePayloadWarnings();
  policyHelperRunner.remoteDecision = null;
  policyHelperRunner.selectedEntry = null;
  clearSelectionWarnings(NO_PLATFORM_ENTRY_TEXT);
  clearSelectionWarnings(SKIPPED_ENTRY_PREFIX);
  let policyHelpers = e?.policyHelpers;
  let E = n === "remote" && hasPolicyHelperConfig(e);
  let h = E ? remotePolicySnapshot(e) : null;
  let tuple = h?.tuple;
  let policyHelper = E ? undefined : e?.policyHelper;
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
  if (h) {
    policyHelperRunner.remoteDecision = h;
    if (!h.verified && tuple !== undefined) {
      policyHelperRunner.initializeAttempted = false;
      warnRemoteHelperSkipped("remote settings not verified this session", tuple);
      return null;
    }
  } else if (n === "remote" && policyHelpers) {
    logForDebugging("remote policyHelpers names no helper and carries no static payload for this platform", {
      level: "debug",
    });
    policyHelperRunner.initializeAttempted = false;
    return null;
  } else if (n === null || !FILE_POLICY_TIERS.has(n)) {
    logForDebugging(`policyHelper ignored: delivered via non-admin source '${n ?? "unknown"}'`, {
      level: "warn",
    });
    if (n === "remote") policyHelperRunner.initializeAttempted = false;
    return null;
  }
  policyHelperRunner.armedFromUserWritableBase = n === "plist" && mdmResult().userWritable === true;
  let O = policyHelpers ? platformSettingsChain() : null;
  let message = null;
  if (h) applyStaticPayloadChoice(h);
  else message = applyDefaultPayloads(policyHelpers, O?.chain ?? []);
  if (message) {
    policyHelperRunner.payloadRefusalError = message;
    return helperRefusal(message);
  }
  let perOsHelper = selectPerOsHelper(policyHelpers, policyHelper, O, E);
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
              (L) => perOsHelper.fallback.sourceField === `policyHelpers.${L}.defaultSettings`,
            ) ?? "default",
          config: null,
        };
  if (perOsHelper.kind === "default") {
    if (h && !h.payloadServable) {
      policyHelperRunner.initializeAttempted = false;
      warnRemoteHelperSkipped(
        h.verified
          ? `${perOsHelper.fallback.sourceField} carries settings not yet approved in the managed-settings dialog; it is not applied until they are`
          : `${perOsHelper.fallback.sourceField} carries settings the managed-settings dialog lists and remote settings are not verified this session; it is not applied until they are`,
        undefined,
      );
      if (h.verified) logFeatureSad("settings_policy_helpers_per_os", "remote_consent_missing");
      return null;
    }
    logFeatureSad("settings_policy_helpers_per_os", "fell_back_to_default");
    logForDebugging(
      `policyHelper: no policyHelpers helper entry for platform "${O?.platform ?? "unknown"}"; applying the static ${perOsHelper.fallback.sourceField} settings payload`,
      {
        level: "info",
      },
    );
    applyStaticPayload(null, perOsHelper.fallback.mergesOutput, E);
    return null;
  }
  let defaultFallback = policyHelperRunner.defaultFallback;
  let x = helperFailureBlocks(perOsHelper.fromPerOs ? perOsHelper.config : null, E);
  if (h && !h.helperMayExec) {
    if (defaultFallback && h.payloadServable) {
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
    if (x)
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
          armedFromRemote: E,
          suppressExecEvents: E || defaultFallback !== null,
        })) === "applied"
      )
        logFeatureOk("settings_policy_helpers_per_os");
    } else await runRemoteArmedHelper(perOsHelper);
  } catch (error) {
    let defaultFallback = policyHelperRunner.defaultFallback;
    let q = E ? (policyHelperRunner.remoteDecision?.helperRefusesOnFailure ?? x) : x;
    if (perOsHelper.fromPerOs && !defaultFallback)
      if (!(error instanceof RemoteHelperError)) logFeatureBad("settings_policy_helpers_per_os", "error");
      else if (E && q);
      else if (!E && !x)
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
          E,
        );
        policyHelperRunner.lastFailure = error.code;
        return null;
      }
      policyHelperRunner.lastFailure = error.code;
      if (E) {
        warnRemoteHelperSkipped(error.message, tuple);
        policyHelperRunner.holdRemoteFailure(perOsHelper, error.code !== "bad_path");
        return q ? remoteRefusalResult(error, tuple) : null;
      }
      if (!x) {
        warningWithSkippedPrefix(error.message);
        return null;
      }
      return helperRefusal(error.message);
    }
    throw error;
  }
  return null;
}
//@ chunk-q8cqcff6.js:68750-68819 placement
/**
 * helperFailureBlocks：按 onFailure 判断是否阻塞。
 */
function helperFailureBlocks(e, n) {
  let onFailure = e?.onFailure;
  return onFailure == null ? !n : onFailure !== "continue";
}
//@ chunk-q8cqcff6.js:68819-69144 placement
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
//@ chunk-q8cqcff6.js:69144-69209 placement
function helperSettingName(e) {
  return (e === undefined ? undefined : parseHelperSetting(e)) ?? "it configures";
}
//@ chunk-q8cqcff6.js:69209-69326 placement
var SKIPPED_ENTRY_PREFIX = 'policyHelpers entry skipped (onFailure "continue"): ';
var STARTED_WITHOUT_HELPER_SUFFIX = "; Claude Code started without the helper's output";
//@ chunk-q8cqcff6.js:69326-69423 placement
function warningWithSkippedPrefix(message) {
  let n = truncateWarning(
    asciiOnly(message.replace(/\s+/gu, " ")),
    MAX_WARNING_CHARS - SKIPPED_ENTRY_PREFIX.length - STARTED_WITHOUT_HELPER_SUFFIX.length,
  );
  addSelectionWarning(`${SKIPPED_ENTRY_PREFIX}${n}${STARTED_WITHOUT_HELPER_SUFFIX}`);
}
//@ chunk-q8cqcff6.js:69423-69540 placement
var REMOTE_ENTRY_NOT_RUN_PREFIX = "remote policyHelpers entry not run: ";
var REMOTE_PAYLOAD_NOT_APPLIED_PREFIX = "remote policyHelpers static settings payload not applied: ";
var MAX_WARNING_CHARS = 512;
//@ chunk-q8cqcff6.js:69540-69606 placement
/**
 * truncateWarning：截断警告文本。
 */
function truncateWarning(e, n = MAX_WARNING_CHARS) {
  return e.length > n ? `${e.slice(0, n - 1)}\u2026` : e;
}
//@ chunk-q8cqcff6.js:69606-69747 placement
function warnRemoteHelperSkipped(e, tuple) {
  let r = asciiOnly(e.replace(/\s+/gu, " "));
  let s = tuple === undefined ? undefined : parseHelperSetting(tuple);
  let S = truncateWarning(
    tuple === undefined
      ? `${REMOTE_PAYLOAD_NOT_APPLIED_PREFIX}${r}`
      : `${REMOTE_ENTRY_NOT_RUN_PREFIX}${s ? `${s}: ` : ""}${r}`,
  );
  addSelectionWarning(S);
}
//@ chunk-q8cqcff6.js:69747-69811 placement
/**
 * REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX：远程 helper 载荷被跳过的前缀。
 */
var REMOTE_HELPER_PAYLOAD_SKIPPED_PREFIX = "remote policyHelpers static settings payload skipped: ";
//@ chunk-q8cqcff6.js:69811-69996 placement
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
  POLICY_HELPER_TAG,
  findFatalPolicyHelperError,
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
};
