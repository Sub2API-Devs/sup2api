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
import { kt, oe, o } from "../../../../vendor/zod/v4/classic/schemas.js";
import { is, or } from "../commandSyncNames.js";
import { isStorageV5Enabled } from "../../hoverRest.js";
import { createSignal } from "../../signal.js";
import { logError } from "../../log.js";
import {
  eio,
  retryRemoteHelper,
  matchingRemoteHelperConfig,
  Os,
  retireOsAdminPass,
  et,
  retireIfShadowedByRemote,
  selectPerOsHelper,
  runRemoteArmedHelper,
  qe,
} from "./helperRemote.js";
import { runPolicyHelperWithRetry } from "./helperExec.js";
import { logForDebugging } from "../../debug.js";
import {
  warnPolicyHelperRefresh,
  wt,
  Qe,
  Ht,
  hr,
  clearSelectionWarnings,
  Rr,
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
import { aV } from "../../memoize.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { ql } from "../../stringUtils.js";
import { getRemoteManagedSettingsSyncFromCache } from "../../../services/remoteManagedSettings/remoteSettingsCache.js";
import { One } from "../managedPluginTiers.js";
import { platformSettingsChain } from "../marketplaceSettingsAliases.js";
import { parseHelperSetting, asciiOnly } from "../otelEndpointValidation.js";

//@ chunk-q8cqcff6.js:57614-57742 placement
var HELPER_TIMEOUT_MS = 1e4,
  MAX_HELPER_OUTPUT_BYTES = 1048576,
  HELPER_OUTPUT_SCHEMA = DoctorLazy(() =>
    kt({ managedSettings: oe().optional(), claudeMd: o().optional(), appendSystemPrompt: o().optional() }),
  );
//@ chunk-q8cqcff6.js:57742-57787 placement
function Ye(e) {
  return { message: e, remote: null };
}
//@ chunk-q8cqcff6.js:57787-57812 placement
var Lus = "<policyHelper>";
//@ chunk-q8cqcff6.js:57812-57899 placement
function Ee() {
  let e = is();
  if (isStorageV5Enabled() && e.primer !== void 0) e.invalidatePolicyLayer();
  else or();
}
/**
 * policyHelper 运行器：按 OS 选择助手、刷新、失败时由静态设置载荷兜底
 */
//@ chunk-q8cqcff6.js:57899-62660 placement
class PolicyHelperRunner {
  state = null;
  selectionWarnings = [];
  initializeAttempted = !1;
  structuralRefusalLogged = !1;
  noEntrySadLogged = !1;
  defaultFallback = null;
  payloadRefusalError = null;
  refreshTimer = null;
  refreshInFlight = !1;
  midSessionArmingEnabled = !1;
  osAdminArming = null;
  undeliveredRefusal = null;
  startsNoSession = !1;
  decidedOrigin = null;
  pendingStats = new Map();
  remoteArmGeneration = 0;
  osAdminRetireGeneration = 0;
  stoppedAsking = !1;
  remoteArmingConfig = null;
  remoteFailedConfig = null;
  lastFailure = null;
  selectedEntry = null;
  restartFrom = null;
  releaseLatchWhenTickSettles = !1;
  readRemotePayload = null;
  armedFromUserWritableBase = !1;
  retiredHelperPaths = new Set();
  remoteDecision = null;
  refreshed = createSignal();
  passesInFlight = 0;
  passSettled = createSignal();
  claimInitialize() {
    if (this.initializeAttempted) return !1;
    return ((this.initializeAttempted = !0), !0);
  }
  apply(e) {
    if (((this.state = e), (this.remoteFailedConfig = null), (this.lastFailure = null), Ee(), e.config))
      this.startRefreshTimer(e.config, e.fromPerOs, e.armedFromRemote);
    else this.stopRefreshTimer();
  }
  retireState() {
    let e = this.state?.config?.path;
    if (e !== void 0) this.retiredHelperPaths.add(e);
    ((this.state = null), (this.lastFailure = null), (this.selectedEntry = null));
  }
  reset() {
    (this.remoteArmGeneration++,
      (this.remoteArmingConfig = null),
      (this.armedFromUserWritableBase = !1),
      (this.remoteDecision = null),
      (this.state = null),
      this.retiredHelperPaths.clear(),
      (this.selectionWarnings = []),
      (this.initializeAttempted = !1),
      (this.structuralRefusalLogged = !1),
      (this.noEntrySadLogged = !1),
      (this.defaultFallback = null),
      (this.payloadRefusalError = null),
      (this.refreshInFlight = !1),
      (this.midSessionArmingEnabled = !1),
      (this.osAdminArming = null),
      (this.undeliveredRefusal = null),
      (this.restartFrom = null),
      (this.stoppedAsking = !1),
      (this.decidedOrigin = null),
      (this.remoteFailedConfig = null),
      (this.lastFailure = null),
      (this.selectedEntry = null),
      (this.releaseLatchWhenTickSettles = !1),
      (this.readRemotePayload = null),
      this.stopRefreshTimer(),
      Ee());
  }
  announceTierChange() {
    Ee();
    try {
      (is().changed.emit("policySettings"), this.refreshed.emit());
    } catch (error) {
      logError(error);
    }
  }
  stopRefreshTimer() {
    if (this.refreshTimer) (clearInterval(this.refreshTimer), (this.refreshTimer = null));
  }
  holdRemoteFailure({ config: e, fromPerOs: n }, r) {
    if (((this.remoteFailedConfig = e), !r)) return;
    if (e.path !== void 0) this.retiredHelperPaths.add(e.path);
    this.startRefreshTimer(e, n, !0);
  }
  retireRemoteFailure() {
    if (this.remoteFailedConfig === null) return;
    ((this.remoteFailedConfig = null),
      (this.lastFailure = null),
      (this.selectedEntry = null),
      this.stopRefreshTimer(),
      this.releaseLatch());
  }
  releaseLatch() {
    if (this.refreshInFlight) this.releaseLatchWhenTickSettles = !0;
    else this.initializeAttempted = !1;
  }
  settleRefreshExec() {
    if (((this.refreshInFlight = !1), this.releaseLatchWhenTickSettles))
      ((this.releaseLatchWhenTickSettles = !1), this.releaseLatchAfterTornDownExec());
  }
  releaseLatchAfterTornDownExec() {
    if (((this.initializeAttempted = !1), this.readRemotePayload !== null)) eio(this.readRemotePayload);
  }
  startRefreshTimer(e, n, r) {
    this.stopRefreshTimer();
    let s = e.refreshIntervalMs ?? 0;
    if (s <= 0) return;
    ((this.refreshTimer = setInterval(
      (S, E, h) => {
        if (this.refreshInFlight) return;
        if (((this.refreshInFlight = !0), h && this.state === null)) {
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
                  if (
                    (logForDebugging(
                      `policyHelper refresh: helper still failing (${P.error}); the static default settings payload continues to govern`,
                      { level: "debug" },
                    ),
                    warnPolicyHelperRefresh(P.error, T, E),
                    this.lastFailure !== P.code)
                  )
                    ((this.lastFailure = P.code), this.announceTierChange());
                  return;
                }
                (logForDebugging(
                  `policyHelper refresh failed (${P.error}); applying the static ${this.defaultFallback.sourceField} settings payload`,
                  { level: "warn" },
                ),
                  warnPolicyHelperRefresh(P.error, T, E),
                  logFeatureSad("settings_policy_helpers_per_os", "refresh_fell_back_to_default"),
                  (this.state.serving = "default"),
                  (this.lastFailure = P.code),
                  (this.state.mergesOutput = wt(O, this.defaultFallback)),
                  (this.state.output = {
                    managedSettings: Qe(this.defaultFallback.settings, h, isRemoteManagedSettingsVerified()),
                  }),
                  (this.state.warnings = this.defaultFallback.warnings),
                  this.announceTierChange());
                return;
              }
              if (
                (logForDebugging(`policyHelper refresh failed (retaining current policy): ${P.error}`, {
                  level: "warn",
                }),
                warnPolicyHelperRefresh(P.error, "the last successful helper output still governs", E),
                logFeatureSad("settings_policy_helper", "refresh_failed", { attempts: P.attempts }),
                this.lastFailure !== P.code)
              )
                ((this.lastFailure = P.code), this.announceTierChange());
              return;
            }
            if ((Ht(), this.state.serving === "default"))
              (logForDebugging(
                "policyHelper refresh: helper recovered; its output replaces the static default settings payload",
                { level: "info" },
              ),
                logFeatureOk("settings_policy_helpers_per_os"));
            ((this.state.serving = "helper"),
              (this.lastFailure = null),
              (this.state.mergesOutput = O.outputBehavior === "merge"),
              (this.state.output = P.output),
              (this.state.warnings = P.warnings),
              this.announceTierChange());
          })
          .catch((P) => {
            logError(P);
          })
          .finally(() => this.settleRefreshExec());
      },
      Math.min(s, MAX_HELPER_MS),
      e,
      n,
      r,
    )),
      this.refreshTimer.unref?.());
  }
}
//@ chunk-q8cqcff6.js:62660-62743 placement
var R = new PolicyHelperRunner(),
  rd = aV({ clear: Os }),
  refreshed = R.refreshed,
  dr = new Set(["plist", "hklm", "file"]);
/**
 * 运行一次 policyHelper pass：先交付尚未送达的拒绝；pass 拒绝时，远程来源且命令不启动会话则只告警放行，否则记遥测并返回拒绝信息。
 */
//@ chunk-q8cqcff6.js:62743-62988 placement
async function runPolicyHelperPass(e, n, r) {
  let undeliveredRefusal = R.undeliveredRefusal;
  if (undeliveredRefusal !== null) return ((R.undeliveredRefusal = null), undeliveredRefusal);
  let S = await runPassWithRestarts(e, n, r);
  if (S === null) return null;
  if (S.remote) {
    if (R.startsNoSession) return (warnRefuseNotEnforced(S.message, S.remote), null);
    logRemoteRefusal(S.remote);
  }
  return S.message;
}
//@ chunk-q8cqcff6.js:62988-63024 placement
function BRi() {
  R.startsNoSession = !0;
}
/**
 * 远程 policyHelper 要求拒绝但当前命令不启动会话时：记日志、给出状态提示并记遥测，命令继续执行。
 */
//@ chunk-q8cqcff6.js:63024-63405 placement
function warnRefuseNotEnforced(e, n) {
  (logForDebugging(
    `policyHelper: ${e} (reached in a command that starts no session; it proceeds without the helper)`,
    { level: "error" },
  ),
    warnRemoteHelperSkipped(
      'onFailure is "refuse", but this command starts no Claude Code session, so it proceeds without the helper; sessions will not start until the helper succeeds',
      n.tuple,
    ),
    logFeatureSad("settings_policy_helpers_per_os", "remote_refuse_not_enforced_no_session"));
}
//@ chunk-q8cqcff6.js:63405-63550 placement
function logRemoteRefusal(e) {
  logFeatureBad(
    "settings_policy_helpers_per_os",
    e.code,
    e.helperFailureReason === void 0 ? void 0 : { helper_failure_reason: fromEnum(e.helperFailureReason) },
  );
}
/**
 * 找出与 policyHelpers 相关的启动致命错误。
 */
//@ chunk-q8cqcff6.js:63550-63679 placement
function findFatalPolicyHelperError(e) {
  return e.find(
    (n) =>
      n.startupFatal && (n.path === "" || n.path === "policyHelpers" || n.path.startsWith("policyHelpers.")),
  );
}
/**
 * 判断 policyHelper 导致的退出原因：helper 失败或策略无效。
 */
//@ chunk-q8cqcff6.js:63679-63866 placement
function policyHelperExitReason(e) {
  let n = findFatalPolicyHelperError(e);
  if (n)
    return SUPPORTED_PLATFORMS.some((r) => n.path === `policyHelpers.${r}`)
      ? "helper_failed"
      : "policy_invalid";
  return R.payloadRefusalError !== null ? "policy_invalid" : "helper_failed";
}
/**
 * 执行 policyHelper 入口解析，期间若有重启请求则退役当前 pass 并按新基础设置重跑；结束时清理残留重启请求、递减进行中计数并发出完成信号。
 */
//@ chunk-q8cqcff6.js:63866-64211 placement
async function runPassWithRestarts(e, n, r) {
  R.passesInFlight++;
  try {
    let s = await resolvePolicyHelperEntry(e, n, r);
    for (let restartFrom = R.restartFrom; restartFrom !== null; restartFrom = R.restartFrom) {
      (retireOsAdminPass(et()), (R.restartFrom = null));
      let E = restartFrom();
      (retireIfShadowedByRemote(E.origin),
        (s = await resolvePolicyHelperEntry(E.settings, E.origin, E.loadErrors)));
    }
    return s;
  } finally {
    if (R.restartFrom !== null)
      try {
        (retireOsAdminPass(et()), (R.restartFrom = null));
      } catch (error) {
        logError(error);
      }
    (R.passesInFlight--, R.passSettled.emit());
  }
}
/**
 * 解析 policyHelpers 设置项（按 OS、结构校验、审批状态）
 */
//@ chunk-q8cqcff6.js:64211-68750 placement
async function resolvePolicyHelperEntry(e, n, r) {
  let s = findFatalPolicyHelperError(r);
  if (s) {
    if (!R.structuralRefusalLogged) {
      R.structuralRefusalLogged = !0;
      let path = s.path;
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
    return Ye(`${s.file === void 0 ? "managed settings" : ql(s.file)}: ${s.message}`);
  }
  if (R.payloadRefusalError !== null) return Ye(R.payloadRefusalError);
  if (!R.claimInitialize()) return null;
  ((R.decidedOrigin = n),
    hr(),
    (R.remoteDecision = null),
    (R.selectedEntry = null),
    clearSelectionWarnings(Rr),
    clearSelectionWarnings(SKIPPED_ENTRY_PREFIX));
  let S = e?.policyHelpers,
    E = n === "remote" && hasPolicyHelperConfig(e),
    h = E ? remotePolicySnapshot(e) : null,
    y = h?.tuple,
    P = E ? void 0 : e?.policyHelper;
  if (!S && !P) {
    if (getEligibilityMemo() === !0 && !getRemoteManagedSettingsSyncFromCache())
      logForDebugging(
        "policyHelper: no helper configuration present at helper-pass time (remote managed settings eligible, no payload in cache); a payload landing later arms one only through a fetch cycle after preAction",
        { level: "debug" },
      );
    return ((R.initializeAttempted = !1), null);
  }
  if (h) {
    if (((R.remoteDecision = h), !h.verified && y !== void 0))
      return (
        (R.initializeAttempted = !1),
        warnRemoteHelperSkipped("remote settings not verified this session", y),
        null
      );
  } else if (n === "remote" && S)
    return (
      logForDebugging(
        "remote policyHelpers names no helper and carries no static payload for this platform",
        { level: "debug" },
      ),
      (R.initializeAttempted = !1),
      null
    );
  else if (n === null || !dr.has(n)) {
    if (
      (logForDebugging(`policyHelper ignored: delivered via non-admin source '${n ?? "unknown"}'`, {
        level: "warn",
      }),
      n === "remote")
    )
      R.initializeAttempted = !1;
    return null;
  }
  R.armedFromUserWritableBase = n === "plist" && One().userWritable === !0;
  let O = S ? platformSettingsChain() : null,
    T = null;
  if (h) applyStaticPayloadChoice(h);
  else T = applyDefaultPayloads(S, O?.chain ?? []);
  if (T) return ((R.payloadRefusalError = T), Ye(T));
  let v = selectPerOsHelper(S, P, O, E);
  if (!v) return ((R.initializeAttempted = !1), null);
  if (
    ((R.selectedEntry =
      v.kind === "helper"
        ? { key: v.entryKey, config: v.config }
        : {
            key:
              SUPPORTED_PLATFORMS.find(
                (L) => v.fallback.sourceField === `policyHelpers.${L}.defaultSettings`,
              ) ?? "default",
            config: null,
          }),
    v.kind === "default")
  ) {
    if (h && !h.payloadServable) {
      if (
        ((R.initializeAttempted = !1),
        warnRemoteHelperSkipped(
          h.verified
            ? `${v.fallback.sourceField} carries settings not yet approved in the managed-settings dialog; it is not applied until they are`
            : `${v.fallback.sourceField} carries settings the managed-settings dialog lists and remote settings are not verified this session; it is not applied until they are`,
          void 0,
        ),
        h.verified)
      )
        logFeatureSad("settings_policy_helpers_per_os", "remote_consent_missing");
      return null;
    }
    return (
      logFeatureSad("settings_policy_helpers_per_os", "fell_back_to_default"),
      logForDebugging(
        `policyHelper: no policyHelpers helper entry for platform "${O?.platform ?? "unknown"}"; applying the static ${v.fallback.sourceField} settings payload`,
        { level: "info" },
      ),
      applyStaticPayload(null, v.fallback.mergesOutput, E),
      null
    );
  }
  let defaultFallback = R.defaultFallback,
    x = _r(v.fromPerOs ? v.config : null, E);
  if (h && !h.helperMayExec) {
    if (defaultFallback && h.payloadServable)
      return (
        applyStaticPayload(null, wt(v.config, defaultFallback), !0),
        warnRemoteHelperSkipped(
          `not yet approved in the managed-settings dialog; the static ${defaultFallback.sourceField} settings payload governs until it is`,
          y,
        ),
        logFeatureSad("settings_policy_helpers_per_os", "remote_consent_missing"),
        null
      );
    if (
      ((R.initializeAttempted = !1),
      warnRemoteHelperSkipped(
        defaultFallback
          ? `not yet approved in the managed-settings dialog, and neither are settings the static ${defaultFallback.sourceField} payload carries; nothing from the entry applies until they are`
          : "not yet approved in the managed-settings dialog",
        y,
      ),
      x)
    )
      return {
        message: `Claude Code cannot start: your organization's remote managed settings require the policy helper ${mr(y)} to succeed (onFailure "refuse"), and it cannot run until those settings are approved in the managed-settings dialog. Contact your administrator.`,
        remote: { code: "remote_refused_on_failure", helperFailureReason: void 0, tuple: y },
      };
    return (logFeatureSad("settings_policy_helpers_per_os", "remote_consent_missing"), null);
  }
  try {
    if (v.fromPerOs) {
      if (
        (await runRemoteArmedHelper(v, {
          armedFromRemote: E,
          suppressExecEvents: E || defaultFallback !== null,
        })) === "applied"
      )
        logFeatureOk("settings_policy_helpers_per_os");
    } else await runRemoteArmedHelper(v);
  } catch (error) {
    let defaultFallback = R.defaultFallback,
      q = E ? (R.remoteDecision?.helperRefusesOnFailure ?? x) : x;
    if (v.fromPerOs && !defaultFallback)
      if (!(error instanceof qe)) logFeatureBad("settings_policy_helpers_per_os", "error");
      else if (E && q);
      else if (!E && !x)
        logFeatureBad("settings_policy_helpers_per_os", "continued_on_failure", {
          helper_failure_reason: fromEnum(error.code),
        });
      else logFeatureBad("settings_policy_helpers_per_os", error.code);
    if (error instanceof qe) {
      if (defaultFallback)
        return (
          logForDebugging(
            `${error.message}; applying the static ${defaultFallback.sourceField} settings payload instead`,
            { level: "warn" },
          ),
          logFeatureSad("settings_policy_helpers_per_os", "fell_back_to_default_on_failure"),
          applyStaticPayload(error.code === "bad_path" ? null : v, wt(v.config, defaultFallback), E),
          (R.lastFailure = error.code),
          null
        );
      if (((R.lastFailure = error.code), E))
        return (
          warnRemoteHelperSkipped(error.message, y),
          R.holdRemoteFailure(v, error.code !== "bad_path"),
          q ? remoteRefusalResult(error, y) : null
        );
      if (!x) return (ms(error.message), null);
      return Ye(error.message);
    }
    throw error;
  }
  return null;
}
//@ chunk-q8cqcff6.js:68750-68819 placement
function _r(e, n) {
  let r = e?.onFailure;
  return r == null ? !n : r !== "continue";
}
/**
 * 构造远程托管设置要求 helper 成功（onFailure refuse）但 helper 失败时的启动拒绝信息与遥测字段。
 */
//@ chunk-q8cqcff6.js:68819-69144 placement
function remoteRefusalResult(e, n) {
  return {
    message: `Claude Code cannot start: your organization's remote managed settings require the policy helper ${mr(n)} to succeed (onFailure "refuse"), and it failed [${e.code}] \u2014 ${e.message}. Contact your administrator.`,
    remote: { code: "remote_refused_on_failure", helperFailureReason: e.code, tuple: n },
  };
}
//@ chunk-q8cqcff6.js:69144-69209 placement
function mr(e) {
  return (e === void 0 ? void 0 : parseHelperSetting(e)) ?? "it configures";
}
//@ chunk-q8cqcff6.js:69209-69326 placement
var SKIPPED_ENTRY_PREFIX = 'policyHelpers entry skipped (onFailure "continue"): ',
  STARTED_WITHOUT_HELPER_SUFFIX = "; Claude Code started without the helper's output";
//@ chunk-q8cqcff6.js:69326-69423 placement
function ms(e) {
  let n = nt(
    asciiOnly(e.replace(/\s+/gu, " ")),
    MAX_WARNING_CHARS - SKIPPED_ENTRY_PREFIX.length - STARTED_WITHOUT_HELPER_SUFFIX.length,
  );
  addSelectionWarning(`${SKIPPED_ENTRY_PREFIX}${n}${STARTED_WITHOUT_HELPER_SUFFIX}`);
}
//@ chunk-q8cqcff6.js:69423-69540 placement
var REMOTE_ENTRY_NOT_RUN_PREFIX = "remote policyHelpers entry not run: ",
  REMOTE_PAYLOAD_NOT_APPLIED_PREFIX = "remote policyHelpers static settings payload not applied: ",
  MAX_WARNING_CHARS = 512;
//@ chunk-q8cqcff6.js:69540-69606 placement
function nt(e, n = MAX_WARNING_CHARS) {
  return e.length > n ? `${e.slice(0, n - 1)}\u2026` : e;
}
//@ chunk-q8cqcff6.js:69606-69747 placement
function warnRemoteHelperSkipped(e, n) {
  let r = asciiOnly(e.replace(/\s+/gu, " ")),
    s = n === void 0 ? void 0 : parseHelperSetting(n),
    S = nt(
      n === void 0
        ? `${REMOTE_PAYLOAD_NOT_APPLIED_PREFIX}${r}`
        : `${REMOTE_ENTRY_NOT_RUN_PREFIX}${s ? `${s}: ` : ""}${r}`,
    );
  addSelectionWarning(S);
}
//@ chunk-q8cqcff6.js:69747-69811 placement
var Ft = "remote policyHelpers static settings payload skipped: ";
//@ chunk-q8cqcff6.js:69811-69996 placement
function warnInvalidStaticPayload(e, n, r) {
  if (
    (addSelectionWarning(
      nt(`${Ft}${e} is not a valid static settings payload (${asciiOnly(n.replace(/\s+/gu, " "))})`),
    ),
    r)
  )
    logFeatureSad("settings_policy_helpers_per_os", "remote_default_payload_invalid");
}

export {
  runPolicyHelperPass,
  policyHelperExitReason,
  BRi,
  refreshed,
  Lus,
  findFatalPolicyHelperError,
  HELPER_TIMEOUT_MS,
  R,
  MAX_HELPER_OUTPUT_BYTES,
  HELPER_OUTPUT_SCHEMA,
  Ee,
  Ft,
  REMOTE_ENTRY_NOT_RUN_PREFIX,
  REMOTE_PAYLOAD_NOT_APPLIED_PREFIX,
  nt,
  MAX_WARNING_CHARS,
  warnInvalidStaticPayload,
  _r,
  dr,
  runPassWithRestarts,
  warnRefuseNotEnforced,
  logRemoteRefusal,
  warnRemoteHelperSkipped,
};
