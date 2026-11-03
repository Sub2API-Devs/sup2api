/**
 * utils/settings/policyHelper/helperRemote.ts
 *
 * 远程下发的 policyHelper（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8cqcff6.js (44)
 * attribution: placement 44
 */
import { getPolicyHelperCommand } from "../../../components/ManagedSettingsSecurityDialog/utils.js";
import { platformSettingsChain } from "../marketplaceSettingsAliases.js";
import {
  R,
  Ee,
  dr,
  runPolicyHelperPass,
  runPassWithRestarts,
  warnRefuseNotEnforced,
  logRemoteRefusal,
  warnRemoteHelperSkipped,
} from "./policyHelper.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import {
  Rr,
  Ht,
  hr,
  yr,
  hasPolicyHelperConfig,
  sameRemoteSnapshot,
  remotePolicySnapshot,
  applyStaticPayloadChoice,
  Qe,
} from "./helperPayload.js";
import { logForDebugging } from "../../debug.js";
import { runPolicyHelperWithRetry, xr, validateHelperConfig } from "./helperExec.js";
import {
  registerSyncCacheResetListener,
  isRemoteManagedSettingsVerifiedAndApprovedForSession,
  isRemoteManagedSettingsVerified,
} from "../../../services/remoteManagedSettings/remoteSettingsState.js";
import { logError } from "../../log.js";
import { getIsInteractive } from "../../../bootstrap/state.js";

//@ chunk-q8cqcff6.js:74436-74621 placement
function selectPerOsConfig(e, n, r) {
  for (let s of n) {
    let S = e[s];
    if (S == null) continue;
    if (r ? getPolicyHelperCommand(S) !== void 0 : S.path != null || S.script != null) {
      let { defaultSettings: defaultSettings, ...y } = S;
      return { osKey: s, config: y };
    }
  }
  return null;
}
//@ chunk-q8cqcff6.js:74621-74715 placement
function hs(e) {
  let n = e?.policyHelpers;
  return n
    ? getPolicyHelperCommand(selectPerOsConfig(n, platformSettingsChain().chain, !0)?.config ?? null)
    : void 0;
}
//@ chunk-q8cqcff6.js:74715-75507 placement
function selectPerOsHelper(e, n, r, s) {
  if (!e || !r) return n ? { kind: "helper", entryKey: "policyHelper", config: n, fromPerOs: !1 } : null;
  let { platform: platform, chain: chain } = r,
    h = selectPerOsConfig(e, chain, s);
  if (h) return { kind: "helper", entryKey: h.osKey, config: h.config, fromPerOs: !0 };
  let defaultFallback = R.defaultFallback;
  if (defaultFallback) return { kind: "default", fallback: defaultFallback };
  if (n)
    return (
      logFeatureSad("settings_policy_helpers_per_os", "fell_back_to_singular"),
      { kind: "helper", entryKey: "policyHelper", config: n, fromPerOs: !1 }
    );
  if (s) return null;
  let P = `${Rr}"${platform}", no default settings payload, and no policyHelper fallback; no policy helper will run`;
  if (
    (R.selectionWarnings.push({
      file: "policyHelper",
      path: "policyHelpers",
      message: P,
      severity: "warning",
      statusOnly: !0,
    }),
    Ee(),
    logForDebugging(P, { level: "warn" }),
    !R.noEntrySadLogged)
  )
    ((R.noEntrySadLogged = !0), logFeatureSad("settings_policy_helpers_per_os", "no_entry_for_platform"));
  return null;
}
//@ chunk-q8cqcff6.js:75507-75574 placement
class qe extends Error {
  code;
  constructor(e, n) {
    super(n);
    this.code = e;
  }
}
//@ chunk-q8cqcff6.js:75574-76946 placement
async function runRemoteArmedHelper({ config: config, fromPerOs: fromPerOs }, r) {
  let s = r?.armedFromRemote === !0,
    { remoteArmGeneration: remoteArmGeneration, osAdminRetireGeneration: osAdminRetireGeneration } = R;
  if (s) R.remoteArmingConfig = config;
  let h;
  try {
    h = await runPolicyHelperWithRetry(
      config,
      fromPerOs,
      s,
      () => !s || R.remoteArmGeneration === remoteArmGeneration,
    );
  } finally {
    if (R.remoteArmingConfig === config) R.remoteArmingConfig = null;
  }
  if (s && R.remoteArmGeneration !== remoteArmGeneration) {
    if (config.path !== void 0 && !("error" in h && h.code === "bad_path"))
      R.retiredHelperPaths.add(config.path);
    return (
      logForDebugging("policyHelper: remote arming revoked during exec; discarding output", {
        level: "warn",
      }),
      logFeatureSad("settings_policy_helpers_per_os", "deactivated_during_exec"),
      R.releaseLatchAfterTornDownExec(),
      "dropped"
    );
  }
  if (!s && R.osAdminRetireGeneration !== osAdminRetireGeneration) {
    if (config.path !== void 0 && !("error" in h && h.code === "bad_path"))
      R.retiredHelperPaths.add(config.path);
    return (
      logForDebugging("policyHelper: OS-admin pass retired during exec; discarding output", {
        level: "warn",
      }),
      logFeatureSad("settings_policy_helper", et().code),
      (R.initializeAttempted = !1),
      "dropped"
    );
  }
  if ("error" in h) {
    if (!r?.suppressExecEvents) logFeatureBad("settings_policy_helper", h.code, { attempts: h.attempts });
    throw new qe(h.code, `policyHelper failed: ${h.error}`);
  }
  if (
    (R.apply({
      config: config,
      fromPerOs: fromPerOs,
      serving: "helper",
      armedFromRemote: s,
      mergesOutput: config.outputBehavior === "merge",
      output: h.output,
      warnings: h.warnings,
    }),
    logForDebugging(`policyHelper applied (keys: ${Object.keys(h.output).join(",")})`, { level: "debug" }),
    !r?.suppressExecEvents)
  )
    logFeatureOk("settings_policy_helper", { attempts: h.attempts });
  return "applied";
}
//@ chunk-q8cqcff6.js:76946-77005 placement
function br() {
  return R.state?.output.managedSettings ?? null;
}
//@ chunk-q8cqcff6.js:77005-77078 placement
function vr() {
  let state = R.state;
  return state && !state.armedFromRemote ? state.output : void 0;
}
//@ chunk-q8cqcff6.js:77078-77121 placement
function zyr() {
  return vr()?.claudeMd ?? null;
}
//@ chunk-q8cqcff6.js:77121-77174 placement
function WRi() {
  return vr()?.appendSystemPrompt ?? null;
}
//@ chunk-q8cqcff6.js:77174-77211 placement
function Ole() {
  return R.state !== null;
}
//@ chunk-q8cqcff6.js:77211-77252 placement
function oOt() {
  return R.passesInFlight > 0;
}
//@ chunk-q8cqcff6.js:77252-77304 placement
function GRi() {
  return R.releaseLatchWhenTickSettles;
}
//@ chunk-q8cqcff6.js:77304-77354 placement
function zRi(e) {
  return R.passSettled.subscribe(e);
}
//@ chunk-q8cqcff6.js:77354-77398 placement
function KRi() {
  return R.initializeAttempted;
}
//@ chunk-q8cqcff6.js:77398-77449 placement
function wr() {
  return R.state?.armedFromRemote === !0;
}
//@ chunk-q8cqcff6.js:77449-77515 placement
function Kdt() {
  return R.state !== null && R.armedFromUserWritableBase;
}
//@ chunk-q8cqcff6.js:77515-77563 placement
function Lr() {
  return R.state?.mergesOutput === !0;
}
/**
 * 远程载荷遮蔽了 OS 管理员策略时，退役原有的 policyHelper pass。
 */
//@ chunk-q8cqcff6.js:77563-77780 placement
function retireIfShadowedByRemote(e) {
  if (e !== "remote" || !R.initializeAttempted || R.state?.armedFromRemote === !0) return;
  retireOsAdminPass({
    said: "the remote payload that landed shadows the MDM/file policy it was read from",
    code: "retired_shadowed_by_remote",
  });
}
//@ chunk-q8cqcff6.js:77780-77805 placement
function VRi(e) {
  onAskingOrganizationChange(e, !1);
}
//@ chunk-q8cqcff6.js:77805-77830 placement
function qRi(e) {
  onAskingOrganizationChange(e, !0);
}
/**
 * 会话开始或停止向组织请求设置时，重新处理 OS 管理员的 policyHelper：远程已接管时忽略；有进行中的 pass 时记下重启；否则退役当前 pass 并按新的基础设置重新武装。
 */
//@ chunk-q8cqcff6.js:77830-78276 placement
function onAskingOrganizationChange(e, n) {
  let { state: state } = R;
  if (state?.armedFromRemote === !0 || R.remoteArmingConfig !== null || R.remoteFailedConfig !== null) return;
  if (((R.stoppedAsking = n), R.osAdminRetireGeneration++, R.passesInFlight > 0)) {
    R.restartFrom = e;
    return;
  }
  if (state === null && !R.initializeAttempted) {
    if (n) ((R.decidedOrigin = null), armFromOsAdminIfNew("is read whole at the turn away from asking"));
    return;
  }
  (retireOsAdminPass(et()),
    armFromBase(
      { readBase: e, refuse: Dr },
      `was read again at the turn ${n ? "away from" : "to"} asking its organization`,
    ));
}
//@ chunk-q8cqcff6.js:78276-78358 placement
function Dr(e) {
  let osAdminArming = R.osAdminArming;
  if (osAdminArming) osAdminArming.refuse(e);
  else R.undeliveredRefusal = e;
}
//@ chunk-q8cqcff6.js:78358-78598 placement
var RETIRE_FOR_ASKING = {
    said: "the session asks its organization: a fresh pass runs from the base as now read",
    code: "retired_held_document",
  },
  RETIRE_FOR_STOPPED_ASKING = {
    said: "the session stopped asking its organization: the base is read whole again",
    code: "retired_stopped_asking",
  };
//@ chunk-q8cqcff6.js:78598-78641 placement
function et() {
  return R.stoppedAsking ? RETIRE_FOR_STOPPED_ASKING : RETIRE_FOR_ASKING;
}
/**
 * 退役 OS 管理员 policyHelper pass：停止刷新、清理状态与默认回退，必要时清除已决定来源；原本有状态时记日志、遥测并通知层级变化。
 */
//@ chunk-q8cqcff6.js:78641-79026 placement
function retireOsAdminPass({ said: said, code: code }) {
  (Ht(), R.stopRefreshTimer());
  let r = R.state !== null;
  if (
    (R.retireState(),
    (R.defaultFallback = null),
    (R.payloadRefusalError = null),
    (R.remoteFailedConfig = null),
    (R.initializeAttempted = !1),
    code !== "retired_shadowed_by_remote")
  )
    R.decidedOrigin = null;
  if (!r) return;
  (logForDebugging(`policyHelper: OS-admin helper pass retired; ${said}`, { level: "info" }),
    logFeatureSad("settings_policy_helper", code),
    R.announceTierChange());
}
/**
 * 停用远程武装的 policyHelper（或远程静态载荷）：清理远程决定；若当前由远程武装，则停止刷新、退役状态、释放闩并通知层级变化。
 */
//@ chunk-q8cqcff6.js:79026-79377 placement
function deactivateRemoteHelper() {
  if ((R.remoteArmGeneration++, hr(), R.remoteDecision !== null))
    ((R.defaultFallback = null), (R.remoteDecision = null), (R.selectedEntry = null));
  if (R.state?.armedFromRemote !== !0) return;
  (Ht(),
    R.stopRefreshTimer(),
    R.retireState(),
    R.releaseLatch(),
    logForDebugging("policyHelper: remote-armed helper (or remote static payload) deactivated", {
      level: "info",
    }),
    R.announceTierChange());
}
//@ chunk-q8cqcff6.js:79377-79385 placement
registerSyncCacheResetListener(deactivateRemoteHelper);
//@ chunk-q8cqcff6.js:79385-79567 placement
function matchingRemoteHelperConfig(e) {
  let readRemotePayload = R.readRemotePayload;
  if (readRemotePayload === null || !isRemoteManagedSettingsVerifiedAndApprovedForSession()) return null;
  let r = readRemotePayload()?.policyHelpers,
    s = r ? (selectPerOsConfig(r, platformSettingsChain().chain, !0)?.config ?? null) : null;
  return s !== null && getPolicyHelperCommand(s) === getPolicyHelperCommand(e) ? s : null;
}
//@ chunk-q8cqcff6.js:79567-80659 placement
async function retryRemoteHelper(e, n) {
  try {
    if (matchingRemoteHelperConfig(e) === null) {
      (logForDebugging(
        "policyHelper: remote retry stopped; the payload in force no longer authorizes the entry",
        { level: "info" },
      ),
        deactivateRemoteHelper());
      return;
    }
    let remoteArmGeneration = R.remoteArmGeneration;
    R.remoteArmingConfig = e;
    let s;
    try {
      s = await runPolicyHelperWithRetry(
        e,
        n,
        !0,
        () => R.remoteArmGeneration === remoteArmGeneration && matchingRemoteHelperConfig(e) !== null,
      );
    } finally {
      if (R.remoteArmingConfig === e) R.remoteArmingConfig = null;
    }
    let S = R.remoteArmGeneration !== remoteArmGeneration,
      E = S ? null : matchingRemoteHelperConfig(e);
    if (E === null) {
      if (!S) deactivateRemoteHelper();
      (logForDebugging("policyHelper: remote retry revoked during exec; discarding output", {
        level: "warn",
      }),
        logFeatureSad("settings_policy_helpers_per_os", "deactivated_during_exec"));
      return;
    }
    if ("error" in s) {
      (logForDebugging(`policyHelper retry failed (remote entry still not armed): ${s.error}`, {
        level: "warn",
      }),
        logFeatureSad("settings_policy_helper", "refresh_failed", { attempts: s.attempts }));
      return;
    }
    let h = { ...e, outputBehavior: E.outputBehavior };
    (R.apply({
      config: h,
      fromPerOs: n,
      serving: "helper",
      armedFromRemote: !0,
      mergesOutput: h.outputBehavior === "merge",
      output: s.output,
      warnings: s.warnings,
    }),
      yr(),
      logForDebugging("policyHelper: remote entry armed by a retry tick", { level: "info" }),
      logFeatureOk("settings_policy_helpers_per_os"),
      R.announceTierChange());
  } catch (error) {
    logError(error);
  }
}
/**
 * 启用会话中途的 policyHelper 武装，并交付尚未送达的拒绝。
 */
//@ chunk-q8cqcff6.js:80659-80808 placement
function enableMidSessionArming(e) {
  ((R.midSessionArmingEnabled = !0), (R.osAdminArming = e ?? null));
  let undeliveredRefusal = R.undeliveredRefusal;
  if (undeliveredRefusal !== null && e) (e.refuse(undeliveredRefusal), (R.undeliveredRefusal = null));
}
//@ chunk-q8cqcff6.js:80808-80864 placement
function eio(e) {
  (applyRemotePolicyMidSession(e), armFromOsAdminIfNew("became the base mid-session"));
}
//@ chunk-q8cqcff6.js:80864-81076 placement
function armFromOsAdminIfNew(e) {
  let osAdminArming = R.osAdminArming;
  if (
    osAdminArming === null ||
    !R.midSessionArmingEnabled ||
    R.initializeAttempted ||
    !osAdminArming.baseSettled()
  )
    return;
  let { origin: origin } = osAdminArming.readBase();
  if (origin === null || !dr.has(origin) || origin === R.decidedOrigin) return;
  armFromBase(osAdminArming, e);
}
/**
 * 按基础设置的来源武装 policyHelper：pass 拒绝时按启动时的方式退出并记下来源，成功则记日志并通知层级变化。
 */
//@ chunk-q8cqcff6.js:81076-81482 placement
function armFromBase(e, n) {
  let { settings: settings, origin: origin, loadErrors: loadErrors } = e.readBase();
  (retireIfShadowedByRemote(origin),
    runPolicyHelperPass(settings, origin, loadErrors)
      .then((E) => {
        if (E !== null) {
          (logForDebugging(
            `policyHelper: the ${origin} source ${n} and its pass refused; exiting as the launch would have: ${E}`,
            { level: "error" },
          ),
            e.refuse(E),
            (R.decidedOrigin = origin));
          return;
        }
        if (R.state === null) return;
        (logForDebugging(`policyHelper: armed from the ${origin} source, which ${n}`, { level: "info" }),
          R.announceTierChange());
      })
      .catch((E) => {
        logError(E);
      }));
}
//@ chunk-q8cqcff6.js:81482-83187 placement
function applyRemotePolicyMidSession(e) {
  if (
    ((R.readRemotePayload = e),
    !R.midSessionArmingEnabled || R.initializeAttempted || !isRemoteManagedSettingsVerified())
  )
    return;
  let n = e();
  if (!hasPolicyHelperConfig(n)) return;
  let remoteDecision = R.remoteDecision;
  if (remoteDecision !== null && sameRemoteSnapshot(remoteDecision, remotePolicySnapshot(n))) return;
  let size = R.retiredHelperPaths.size,
    { remoteFailedConfig: remoteFailedConfig, osAdminRetireGeneration: osAdminRetireGeneration } = R;
  runPassWithRestarts(n, "remote", [])
    .then((h) => {
      if (h === null) return;
      if (h.remote && R.startsNoSession) {
        warnRefuseNotEnforced(h.message, h.remote);
        return;
      }
      let osAdminArming = R.osAdminArming;
      if (osAdminArming !== null && (!getIsInteractive() || osAdminArming.isUnwatchedRepl())) {
        if (
          (logForDebugging(
            `policyHelper: ${h.message} (reached after this unwatched session started; ending it as the launch refusal would have)`,
            { level: "error" },
          ),
          h.remote)
        )
          logRemoteRefusal(h.remote);
        (osAdminArming.refuse(h.message), (R.midSessionArmingEnabled = !1));
        return;
      }
      if (h.remote === null && R.osAdminRetireGeneration !== osAdminRetireGeneration) {
        (logForDebugging(
          `policyHelper: ${h.message} (refused by the pass a turn of the ask ran in this one's place; handed to the launch's handler, or kept for it)`,
          { level: "error" },
        ),
          Dr(h.message),
          (R.midSessionArmingEnabled = !1));
        return;
      }
      if (
        (logForDebugging(
          `policyHelper: ${h.message} (reached after this interactive session started; it continues without the helper)`,
          { level: "error" },
        ),
        h.remote)
      )
        (warnRemoteHelperSkipped(
          'onFailure is "refuse", but this was reached after this interactive session started, so it continues on the remote managed settings without the helper; new sessions will not start (and non-interactive or unwatched ones are ended) until the helper succeeds',
          h.remote.tuple,
        ),
          logFeatureSad("settings_policy_helpers_per_os", "remote_refuse_unenforceable_midsession"));
    })
    .catch((h) => {
      logError(h);
    })
    .finally(() => {
      let h = R.state?.armedFromRemote === !0;
      if (h)
        logForDebugging(
          `policyHelper: remote ${R.state?.serving === "default" ? "static payload applied" : "entry armed"} mid-session`,
          { level: "info" },
        );
      if (h || R.retiredHelperPaths.size > size || R.remoteFailedConfig !== remoteFailedConfig)
        R.announceTierChange();
    });
}
//@ chunk-q8cqcff6.js:83187-84358 placement
function reserveRemoteStaticPayload(e) {
  let remoteDecision = R.remoteDecision;
  if (remoteDecision === null) return;
  let r = e(),
    s = remotePolicySnapshot(r);
  if (sameRemoteSnapshot(remoteDecision, s)) return;
  let state = R.state;
  if (state?.armedFromRemote === !0 && state.serving === "default") {
    let P = s.tuple === remoteDecision.tuple && s.helperMayExec === remoteDecision.helperMayExec,
      winner = s.winner;
    if (P && s.payloadServable && winner !== null) {
      (applyStaticPayloadChoice(s), (R.remoteDecision = s));
      let T = Qe(winner.settings, !0, s.verified);
      if (
        s.payloadKey === remoteDecision.payloadKey &&
        s.helperMergesOutput === remoteDecision.helperMergesOutput &&
        Qe(winner.settings, !0, remoteDecision.verified) === T
      ) {
        logForDebugging(
          `policyHelper: remote static payload from ${winner.sourceField} stands as served (document ${s.verified ? "verified" : "no longer verified"} this session)`,
          { level: "debug" },
        );
        return;
      }
      ((state.mergesOutput = s.helperMergesOutput || winner.mergesOutput),
        (state.output = { managedSettings: T }),
        (state.warnings = winner.warnings),
        logForDebugging(`policyHelper: remote static payload re-served in place from ${winner.sourceField}`, {
          level: "info",
        }),
        R.announceTierChange());
      return;
    }
    deactivateRemoteHelper();
    return;
  }
  let E = state?.armedFromRemote === !0 ? state.config : (R.remoteArmingConfig ?? R.remoteFailedConfig),
    h = E != null && s.helperMayExec && s.tuple === getPolicyHelperCommand(E),
    y = state !== null || R.remoteFailedConfig === null;
  if (h && y) {
    (applyStaticPayloadChoice(s),
      (R.remoteDecision = s),
      logForDebugging(
        "policyHelper: remote static payloads re-resolved under the armed entry; the arm stands",
        { level: "debug" },
      ));
    return;
  }
  deactivateRemoteHelper();
}
//@ chunk-q8cqcff6.js:84358-84408 placement
function JRi() {
  return R.state?.config?.path ?? null;
}
//@ chunk-q8cqcff6.js:84408-84455 placement
function QRi() {
  return [...R.retiredHelperPaths];
}
/**
 * 列出设置中所有有效的路径型 policyHelper（按平台链与单数键），用于沙箱配置。
 */
//@ chunk-q8cqcff6.js:84455-84778 placement
function policyHelperPaths(e) {
  let n = e?.policyHelpers,
    r = n
      ? platformSettingsChain()
          .chain.map((E) => n[E])
          .filter((E) => E != null)
          .map((E) => ({ config: E, fromPerOs: !0 }))
      : [];
  if (e?.policyHelper != null) r.push({ config: e.policyHelper, fromPerOs: !1 });
  let s = xr(),
    S = [];
  for (let { config: config, fromPerOs: fromPerOs } of r)
    if (typeof config.path === "string" && validateHelperConfig(config, s, fromPerOs, !1) === null)
      S.push(config.path);
  return S;
}
//@ chunk-q8cqcff6.js:84778-84829 placement
function exi() {
  return R.state?.serving === "default";
}
//@ chunk-q8cqcff6.js:84829-85531 placement
function policyHelperConsentState() {
  let {
      state: state,
      lastFailure: lastFailure,
      selectedEntry: selectedEntry,
      remoteFailedConfig: remoteFailedConfig,
    } = R,
    remoteDecision = R.remoteDecision,
    E = selectedEntry?.config ?? null,
    h = "none";
  if (
    remoteDecision?.helperRefusesOnFailure === !0 &&
    (remoteFailedConfig !== null ||
      (remoteDecision.verified && remoteDecision.tuple !== void 0 && !remoteDecision.helperMayExec))
  )
    h = "refuse_pending";
  else if (lastFailure !== null) h = lastFailure;
  else if (
    remoteDecision !== null &&
    !remoteDecision.verified &&
    (remoteDecision.tuple !== void 0 || !remoteDecision.payloadServable)
  )
    h = "unverified";
  else if (
    remoteDecision !== null &&
    ((E !== null && !remoteDecision.helperMayExec) ||
      (selectedEntry !== null && E === null && !remoteDecision.payloadServable))
  )
    h = "consent_missing";
  else if (E !== null && state?.serving === "helper") h = "ok";
  return {
    state: h,
    applied: state === null ? "none" : state.serving === "helper" ? "output" : "fallback",
    entry: selectedEntry && {
      key: selectedEntry.key,
      ...(E?.path !== void 0 && { path: E.path }),
      ...(E?.script !== void 0 && selectedEntry.key !== "policyHelper" && { script: E.script }),
    },
  };
}
//@ chunk-q8cqcff6.js:85531-85602 placement
function sOt() {
  return [...R.selectionWarnings, ...(R.state?.warnings ?? [])];
}
//@ chunk-q8cqcff6.js:85602-85647 placement
function Os() {
  (R.reset(), (R.startsNoSession = !1));
}
//@ chunk-q8cqcff6.js:85647-85659 placement
var Mr = null;
//@ chunk-q8cqcff6.js:85659-85680 placement
function txi(e) {
  Mr = e;
}

export {
  exi,
  Kdt,
  zyr,
  Ole,
  retireIfShadowedByRemote,
  enableMidSessionArming,
  policyHelperConsentState,
  zRi,
  oOt,
  GRi,
  sOt,
  WRi,
  reserveRemoteStaticPayload,
  eio,
  br,
  wr,
  Lr,
  KRi,
  JRi,
  policyHelperPaths,
  QRi,
  txi,
  Mr,
  retryRemoteHelper,
  matchingRemoteHelperConfig,
  Os,
  retireOsAdminPass,
  et,
  selectPerOsHelper,
  runRemoteArmedHelper,
  qe,
  hs,
  selectPerOsConfig,
  VRi,
  qRi,
};
