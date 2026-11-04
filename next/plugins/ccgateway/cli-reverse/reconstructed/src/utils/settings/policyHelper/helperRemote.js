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
  policyHelperRunner,
  invalidatePolicyLayer,
  FILE_POLICY_TIERS,
  runPolicyHelperPass,
  runPassWithRestarts,
  warnRefuseNotEnforced,
  logRemoteRefusal,
  warnRemoteHelperSkipped,
} from "./policyHelper.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../../../services/analytics/featureTelemetry.js";
import {
  NO_PLATFORM_ENTRY_TEXT,
  clearHelperRefreshWarning,
  clearRemotePayloadWarnings,
  clearAllRemoteWarnings,
  hasPolicyHelperConfig,
  sameRemoteSnapshot,
  remotePolicySnapshot,
  applyStaticPayloadChoice,
  withholdUnverifiedCacheKeys,
} from "./helperPayload.js";
import { logForDebugging } from "../../debug.js";
import { runPolicyHelperWithRetry, helperPlatformFamily, validateHelperConfig } from "./helperExec.js";
import {
  registerSyncCacheResetListener,
  isRemoteManagedSettingsVerifiedAndApprovedForSession,
  isRemoteManagedSettingsVerified,
} from "../../../services/remoteManagedSettings/remoteSettingsState.js";
import { logError } from "../../log.js";
import { getIsInteractive } from "../../../bootstrap/state.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-q8cqcff6.js:74436-74621 placement
function selectPerOsConfig(policyHelpers, chain, requireCommand) {
  for (let osKey of chain) {
    let entry = policyHelpers[osKey];
    if (entry == null) continue;
    if (
      requireCommand
        ? getPolicyHelperCommand(entry) !== undefined
        : entry.path != null || entry.script != null
    ) {
      let { defaultSettings, ...config } = entry;
      return {
        osKey,
        config,
      };
    }
  }
  return null;
}
//@ chunk-q8cqcff6.js:74621-74715 placement
/**
 * remoteHelperCommand：按平台选出的远程 policy helper 命令。
 */
function remoteHelperCommand(settings) {
  let policyHelpers = settings?.policyHelpers;
  return policyHelpers
    ? getPolicyHelperCommand(
        selectPerOsConfig(policyHelpers, platformSettingsChain().chain, true)?.config ?? null,
      )
    : undefined;
}
//@ chunk-q8cqcff6.js:74715-75507 placement
function selectPerOsHelper(policyHelpers, policyHelper, chainInfo, requireCommand) {
  if (!policyHelpers || !chainInfo)
    return policyHelper
      ? {
          kind: "helper",
          entryKey: "policyHelper",
          config: policyHelper,
          fromPerOs: false,
        }
      : null;
  let { platform, chain } = chainInfo;
  let perOsConfig = selectPerOsConfig(policyHelpers, chain, requireCommand);
  if (perOsConfig)
    return {
      kind: "helper",
      entryKey: perOsConfig.osKey,
      config: perOsConfig.config,
      fromPerOs: true,
    };
  let defaultFallback = policyHelperRunner.defaultFallback;
  if (defaultFallback)
    return {
      kind: "default",
      fallback: defaultFallback,
    };
  if (policyHelper) {
    logFeatureSad("settings_policy_helpers_per_os", "fell_back_to_singular");
    return {
      kind: "helper",
      entryKey: "policyHelper",
      config: policyHelper,
      fromPerOs: false,
    };
  }
  if (requireCommand) return null;
  let message = `${NO_PLATFORM_ENTRY_TEXT}"${platform}", no default settings payload, and no policyHelper fallback; no policy helper will run`;
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
  if (!policyHelperRunner.noEntrySadLogged) {
    policyHelperRunner.noEntrySadLogged = true;
    logFeatureSad("settings_policy_helpers_per_os", "no_entry_for_platform");
  }
  return null;
}
//@ chunk-q8cqcff6.js:75507-75574 placement
/**
 * RemoteHelperError：远程 helper 错误类。
 */
class RemoteHelperError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}
//@ chunk-q8cqcff6.js:75574-76946 placement
async function runRemoteArmedHelper({ config, fromPerOs }, options) {
  let armed = options?.armedFromRemote === true;
  let { remoteArmGeneration, osAdminRetireGeneration } = policyHelperRunner;
  if (armed) policyHelperRunner.remoteArmingConfig = config;
  let result;
  try {
    result = await runPolicyHelperWithRetry(
      config,
      fromPerOs,
      armed,
      () => !armed || policyHelperRunner.remoteArmGeneration === remoteArmGeneration,
    );
  } finally {
    if (policyHelperRunner.remoteArmingConfig === config) policyHelperRunner.remoteArmingConfig = null;
  }
  if (armed && policyHelperRunner.remoteArmGeneration !== remoteArmGeneration) {
    if (config.path !== undefined && !("error" in result && result.code === "bad_path"))
      policyHelperRunner.retiredHelperPaths.add(config.path);
    logForDebugging("policyHelper: remote arming revoked during exec; discarding output", {
      level: "warn",
    });
    logFeatureSad("settings_policy_helpers_per_os", "deactivated_during_exec");
    policyHelperRunner.releaseLatchAfterTornDownExec();
    return "dropped";
  }
  if (!armed && policyHelperRunner.osAdminRetireGeneration !== osAdminRetireGeneration) {
    if (config.path !== undefined && !("error" in result && result.code === "bad_path"))
      policyHelperRunner.retiredHelperPaths.add(config.path);
    logForDebugging("policyHelper: OS-admin pass retired during exec; discarding output", {
      level: "warn",
    });
    logFeatureSad("settings_policy_helper", retireReason().code);
    policyHelperRunner.initializeAttempted = false;
    return "dropped";
  }
  if ("error" in result) {
    if (!options?.suppressExecEvents)
      logFeatureBad("settings_policy_helper", result.code, {
        attempts: result.attempts,
      });
    throw new RemoteHelperError(result.code, `policyHelper failed: ${result.error}`);
  }
  policyHelperRunner.apply({
    config,
    fromPerOs,
    serving: "helper",
    armedFromRemote: armed,
    mergesOutput: config.outputBehavior === "merge",
    output: result.output,
    warnings: result.warnings,
  });
  logForDebugging(`policyHelper applied (keys: ${Object.keys(result.output).join(",")})`, {
    level: "debug",
  });
  if (!options?.suppressExecEvents)
    logFeatureOk("settings_policy_helper", {
      attempts: result.attempts,
    });
  return "applied";
}
//@ chunk-q8cqcff6.js:76946-77005 placement
/**
 * managedSettingsFromRemote：远程下发的托管设置。
 */
function managedSettingsFromRemote() {
  return policyHelperRunner.state?.output.managedSettings ?? null;
}
//@ chunk-q8cqcff6.js:77005-77078 placement
function remotePolicyState() {
  let state = policyHelperRunner.state;
  return state && !state.armedFromRemote ? state.output : undefined;
}
//@ chunk-q8cqcff6.js:77078-77121 placement
/**
 * remoteClaudeMd：远程下发的 CLAUDE.md。
 */
function remoteClaudeMd() {
  return remotePolicyState()?.claudeMd ?? null;
}
//@ chunk-q8cqcff6.js:77121-77174 placement
/**
 * remoteAppendSystemPrompt：远程下发的追加系统提示。
 */
function remoteAppendSystemPrompt() {
  return remotePolicyState()?.appendSystemPrompt ?? null;
}
//@ chunk-q8cqcff6.js:77174-77211 placement
/**
 * hasRemoteHelperState：是否已有远程 helper 状态。
 */
function hasRemoteHelperState() {
  return policyHelperRunner.state !== null;
}
//@ chunk-q8cqcff6.js:77211-77252 placement
/**
 * hasHelperPassInFlight：是否有 helper 轮次进行中。
 */
function hasHelperPassInFlight() {
  return policyHelperRunner.passesInFlight > 0;
}
//@ chunk-q8cqcff6.js:77252-77304 placement
/**
 * releaseLatchWhenTickSettles：是否在 tick 结算后释放锁存。
 */
function releaseLatchWhenTickSettles() {
  return policyHelperRunner.releaseLatchWhenTickSettles;
}
//@ chunk-q8cqcff6.js:77304-77354 placement
/**
 * subscribeHelperPassSettled：订阅 helper 轮次结算。
 */
function subscribeHelperPassSettled(listener) {
  return policyHelperRunner.passSettled.subscribe(listener);
}
//@ chunk-q8cqcff6.js:77354-77398 placement
/**
 * helperInitAttempted：是否尝试过初始化 helper。
 */
function helperInitAttempted() {
  return policyHelperRunner.initializeAttempted;
}
//@ chunk-q8cqcff6.js:77398-77449 placement
/**
 * armedFromRemote：是否由远程武装。
 */
function armedFromRemote() {
  return policyHelperRunner.state?.armedFromRemote === true;
}
//@ chunk-q8cqcff6.js:77449-77515 placement
/**
 * armedFromUserWritableBase：由用户可写基座武装。
 */
function armedFromUserWritableBase() {
  return policyHelperRunner.state !== null && policyHelperRunner.armedFromUserWritableBase;
}
//@ chunk-q8cqcff6.js:77515-77563 placement
/**
 * mergesRemoteOutput：远程输出参与合并。
 */
function mergesRemoteOutput() {
  return policyHelperRunner.state?.mergesOutput === true;
}
//@ chunk-q8cqcff6.js:77563-77780 placement
/**
 * 远程载荷遮蔽了 OS 管理员策略时，退役原有的 policyHelper pass。
 */
function retireIfShadowedByRemote(origin) {
  if (
    origin !== "remote" ||
    !policyHelperRunner.initializeAttempted ||
    policyHelperRunner.state?.armedFromRemote === true
  )
    return;
  retireOsAdminPass({
    said: "the remote payload that landed shadows the MDM/file policy it was read from",
    code: "retired_shadowed_by_remote",
  });
}
//@ chunk-q8cqcff6.js:77780-77805 placement
/**
 * notifyOrganizationAsking：通知组织询问状态（不作答）。
 */
function notifyOrganizationAsking(readBase) {
  onAskingOrganizationChange(readBase, false);
}
//@ chunk-q8cqcff6.js:77805-77830 placement
/**
 * notifyOrganizationAskingForced：通知组织询问状态（强制）。
 */
function notifyOrganizationAskingForced(readBase) {
  onAskingOrganizationChange(readBase, true);
}
//@ chunk-q8cqcff6.js:77830-78276 placement
/**
 * 会话开始或停止向组织请求设置时，重新处理 OS 管理员的 policyHelper：远程已接管时忽略；有进行中的 pass 时记下重启；否则退役当前 pass 并按新的基础设置重新武装。
 */
function onAskingOrganizationChange(readBase, forced) {
  let { state } = policyHelperRunner;
  if (
    state?.armedFromRemote === true ||
    policyHelperRunner.remoteArmingConfig !== null ||
    policyHelperRunner.remoteFailedConfig !== null
  )
    return;
  policyHelperRunner.stoppedAsking = forced;
  policyHelperRunner.osAdminRetireGeneration++;
  if (policyHelperRunner.passesInFlight > 0) {
    policyHelperRunner.restartFrom = readBase;
    return;
  }
  if (state === null && !policyHelperRunner.initializeAttempted) {
    if (forced) {
      policyHelperRunner.decidedOrigin = null;
      armFromOsAdminIfNew("is read whole at the turn away from asking");
    }
    return;
  }
  retireOsAdminPass(retireReason());
  armFromBase(
    {
      readBase,
      refuse: refuseFromRemoteArming,
    },
    `was read again at the turn ${forced ? "away from" : "to"} asking its organization`,
  );
}
//@ chunk-q8cqcff6.js:78276-78358 placement
function refuseFromRemoteArming(message) {
  let osAdminArming = policyHelperRunner.osAdminArming;
  if (osAdminArming) osAdminArming.refuse(message);
  else policyHelperRunner.undeliveredRefusal = message;
}
//@ chunk-q8cqcff6.js:78358-78598 placement
var RETIRE_FOR_ASKING = {
  said: "the session asks its organization: a fresh pass runs from the base as now read",
  code: "retired_held_document",
};
var RETIRE_FOR_STOPPED_ASKING = {
  said: "the session stopped asking its organization: the base is read whole again",
  code: "retired_stopped_asking",
};
//@ chunk-q8cqcff6.js:78598-78641 placement
/**
 * retireReason：退役原因（停止询问或仍在询问）。
 */
function retireReason() {
  return policyHelperRunner.stoppedAsking ? RETIRE_FOR_STOPPED_ASKING : RETIRE_FOR_ASKING;
}
//@ chunk-q8cqcff6.js:78641-79026 placement
/**
 * 退役 OS 管理员 policyHelper pass：停止刷新、清理状态与默认回退，必要时清除已决定来源；原本有状态时记日志、遥测并通知层级变化。
 */
function retireOsAdminPass({ said, code }) {
  clearHelperRefreshWarning();
  policyHelperRunner.stopRefreshTimer();
  let hadState = policyHelperRunner.state !== null;
  policyHelperRunner.retireState();
  policyHelperRunner.defaultFallback = null;
  policyHelperRunner.payloadRefusalError = null;
  policyHelperRunner.remoteFailedConfig = null;
  policyHelperRunner.initializeAttempted = false;
  if (code !== "retired_shadowed_by_remote") policyHelperRunner.decidedOrigin = null;
  if (!hadState) return;
  logForDebugging(`policyHelper: OS-admin helper pass retired; ${said}`, {
    level: "info",
  });
  logFeatureSad("settings_policy_helper", code);
  policyHelperRunner.announceTierChange();
}
//@ chunk-q8cqcff6.js:79026-79377 placement
/**
 * 停用远程武装的 policyHelper（或远程静态载荷）：清理远程决定；若当前由远程武装，则停止刷新、退役状态、释放闩并通知层级变化。
 */
function deactivateRemoteHelper() {
  policyHelperRunner.remoteArmGeneration++;
  clearRemotePayloadWarnings();
  if (policyHelperRunner.remoteDecision !== null) {
    policyHelperRunner.defaultFallback = null;
    policyHelperRunner.remoteDecision = null;
    policyHelperRunner.selectedEntry = null;
  }
  if (policyHelperRunner.state?.armedFromRemote !== true) return;
  clearHelperRefreshWarning();
  policyHelperRunner.stopRefreshTimer();
  policyHelperRunner.retireState();
  policyHelperRunner.releaseLatch();
  logForDebugging("policyHelper: remote-armed helper (or remote static payload) deactivated", {
    level: "info",
  });
  policyHelperRunner.announceTierChange();
}
//@ chunk-q8cqcff6.js:79377-79385 placement
// deferred: uses registerSyncCacheResetListener (../../../services/remoteManagedSettings/remoteSettingsState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q8cqcff6.js:79377", () => {
  registerSyncCacheResetListener(deactivateRemoteHelper);
});
//@ chunk-q8cqcff6.js:79385-79567 placement
function matchingRemoteHelperConfig(config) {
  let readRemotePayload = policyHelperRunner.readRemotePayload;
  if (readRemotePayload === null || !isRemoteManagedSettingsVerifiedAndApprovedForSession()) return null;
  let policyHelpers = readRemotePayload()?.policyHelpers;
  let remoteConfig = policyHelpers
    ? (selectPerOsConfig(policyHelpers, platformSettingsChain().chain, true)?.config ?? null)
    : null;
  return remoteConfig !== null && getPolicyHelperCommand(remoteConfig) === getPolicyHelperCommand(config)
    ? remoteConfig
    : null;
}
//@ chunk-q8cqcff6.js:79567-80659 placement
async function retryRemoteHelper(config, fromPerOs) {
  try {
    if (matchingRemoteHelperConfig(config) === null) {
      logForDebugging(
        "policyHelper: remote retry stopped; the payload in force no longer authorizes the entry",
        {
          level: "info",
        },
      );
      deactivateRemoteHelper();
      return;
    }
    let remoteArmGeneration = policyHelperRunner.remoteArmGeneration;
    policyHelperRunner.remoteArmingConfig = config;
    let result;
    try {
      result = await runPolicyHelperWithRetry(
        config,
        fromPerOs,
        true,
        () =>
          policyHelperRunner.remoteArmGeneration === remoteArmGeneration &&
          matchingRemoteHelperConfig(config) !== null,
      );
    } finally {
      if (policyHelperRunner.remoteArmingConfig === config) policyHelperRunner.remoteArmingConfig = null;
    }
    let revoked = policyHelperRunner.remoteArmGeneration !== remoteArmGeneration;
    let currentConfig = revoked ? null : matchingRemoteHelperConfig(config);
    if (currentConfig === null) {
      if (!revoked) deactivateRemoteHelper();
      logForDebugging("policyHelper: remote retry revoked during exec; discarding output", {
        level: "warn",
      });
      logFeatureSad("settings_policy_helpers_per_os", "deactivated_during_exec");
      return;
    }
    if ("error" in result) {
      logForDebugging(`policyHelper retry failed (remote entry still not armed): ${result.error}`, {
        level: "warn",
      });
      logFeatureSad("settings_policy_helper", "refresh_failed", {
        attempts: result.attempts,
      });
      return;
    }
    let nextConfig = {
      ...config,
      outputBehavior: currentConfig.outputBehavior,
    };
    policyHelperRunner.apply({
      config: nextConfig,
      fromPerOs,
      serving: "helper",
      armedFromRemote: true,
      mergesOutput: nextConfig.outputBehavior === "merge",
      output: result.output,
      warnings: result.warnings,
    });
    clearAllRemoteWarnings();
    logForDebugging("policyHelper: remote entry armed by a retry tick", {
      level: "info",
    });
    logFeatureOk("settings_policy_helpers_per_os");
    policyHelperRunner.announceTierChange();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-q8cqcff6.js:80659-80808 placement
/**
 * 启用会话中途的 policyHelper 武装，并交付尚未送达的拒绝。
 */
function enableMidSessionArming(arming) {
  policyHelperRunner.midSessionArmingEnabled = true;
  policyHelperRunner.osAdminArming = arming ?? null;
  let undeliveredRefusal = policyHelperRunner.undeliveredRefusal;
  if (undeliveredRefusal !== null && arming) {
    arming.refuse(undeliveredRefusal);
    policyHelperRunner.undeliveredRefusal = null;
  }
}
//@ chunk-q8cqcff6.js:80808-80864 placement
/**
 * applyRemotePolicyMidSession：会话中应用远程策略。
 */
function applyRemotePolicyMidSession(reader) {
  applyRemotePolicyMidSession_2(reader);
  armFromOsAdminIfNew("became the base mid-session");
}
//@ chunk-q8cqcff6.js:80864-81076 placement
function armFromOsAdminIfNew(reason) {
  let osAdminArming = policyHelperRunner.osAdminArming;
  if (
    osAdminArming === null ||
    !policyHelperRunner.midSessionArmingEnabled ||
    policyHelperRunner.initializeAttempted ||
    !osAdminArming.baseSettled()
  )
    return;
  let { origin } = osAdminArming.readBase();
  if (origin === null || !FILE_POLICY_TIERS.has(origin) || origin === policyHelperRunner.decidedOrigin)
    return;
  armFromBase(osAdminArming, reason);
}
//@ chunk-q8cqcff6.js:81076-81482 placement
/**
 * 按基础设置的来源武装 policyHelper：pass 拒绝时按启动时的方式退出并记下来源，成功则记日志并通知层级变化。
 */
function armFromBase(osAdminArming, reason) {
  let { settings, origin, loadErrors } = osAdminArming.readBase();
  retireIfShadowedByRemote(origin);
  runPolicyHelperPass(settings, origin, loadErrors)
    .then((message) => {
      if (message !== null) {
        logForDebugging(
          `policyHelper: the ${origin} source ${reason} and its pass refused; exiting as the launch would have: ${message}`,
          {
            level: "error",
          },
        );
        osAdminArming.refuse(message);
        policyHelperRunner.decidedOrigin = origin;
        return;
      }
      if (policyHelperRunner.state === null) return;
      logForDebugging(`policyHelper: armed from the ${origin} source, which ${reason}`, {
        level: "info",
      });
      policyHelperRunner.announceTierChange();
    })
    .catch((error) => {
      logError(error);
    });
}
//@ chunk-q8cqcff6.js:81482-83187 placement
function applyRemotePolicyMidSession_2(reader) {
  policyHelperRunner.readRemotePayload = reader;
  if (
    !policyHelperRunner.midSessionArmingEnabled ||
    policyHelperRunner.initializeAttempted ||
    !isRemoteManagedSettingsVerified()
  )
    return;
  let settings = reader();
  if (!hasPolicyHelperConfig(settings)) return;
  let remoteDecision = policyHelperRunner.remoteDecision;
  if (remoteDecision !== null && sameRemoteSnapshot(remoteDecision, remotePolicySnapshot(settings))) return;
  let size = policyHelperRunner.retiredHelperPaths.size;
  let { remoteFailedConfig, osAdminRetireGeneration } = policyHelperRunner;
  runPassWithRestarts(settings, "remote", [])
    .then((refusal) => {
      if (refusal === null) return;
      if (refusal.remote && policyHelperRunner.startsNoSession) {
        warnRefuseNotEnforced(refusal.message, refusal.remote);
        return;
      }
      let osAdminArming = policyHelperRunner.osAdminArming;
      if (osAdminArming !== null && (!getIsInteractive() || osAdminArming.isUnwatchedRepl())) {
        logForDebugging(
          `policyHelper: ${refusal.message} (reached after this unwatched session started; ending it as the launch refusal would have)`,
          {
            level: "error",
          },
        );
        if (refusal.remote) logRemoteRefusal(refusal.remote);
        osAdminArming.refuse(refusal.message);
        policyHelperRunner.midSessionArmingEnabled = false;
        return;
      }
      if (refusal.remote === null && policyHelperRunner.osAdminRetireGeneration !== osAdminRetireGeneration) {
        logForDebugging(
          `policyHelper: ${refusal.message} (refused by the pass a turn of the ask ran in this one's place; handed to the launch's handler, or kept for it)`,
          {
            level: "error",
          },
        );
        refuseFromRemoteArming(refusal.message);
        policyHelperRunner.midSessionArmingEnabled = false;
        return;
      }
      logForDebugging(
        `policyHelper: ${refusal.message} (reached after this interactive session started; it continues without the helper)`,
        {
          level: "error",
        },
      );
      if (refusal.remote) {
        warnRemoteHelperSkipped(
          'onFailure is "refuse", but this was reached after this interactive session started, so it continues on the remote managed settings without the helper; new sessions will not start (and non-interactive or unwatched ones are ended) until the helper succeeds',
          refusal.remote.tuple,
        );
        logFeatureSad("settings_policy_helpers_per_os", "remote_refuse_unenforceable_midsession");
      }
    })
    .catch((error) => {
      logError(error);
    })
    .finally(() => {
      let armed = policyHelperRunner.state?.armedFromRemote === true;
      if (armed)
        logForDebugging(
          `policyHelper: remote ${policyHelperRunner.state?.serving === "default" ? "static payload applied" : "entry armed"} mid-session`,
          {
            level: "info",
          },
        );
      if (
        armed ||
        policyHelperRunner.retiredHelperPaths.size > size ||
        policyHelperRunner.remoteFailedConfig !== remoteFailedConfig
      )
        policyHelperRunner.announceTierChange();
    });
}
//@ chunk-q8cqcff6.js:83187-84358 placement
function reserveRemoteStaticPayload(reader) {
  let remoteDecision = policyHelperRunner.remoteDecision;
  if (remoteDecision === null) return;
  let settings = reader();
  let snapshot = remotePolicySnapshot(settings);
  if (sameRemoteSnapshot(remoteDecision, snapshot)) return;
  let state = policyHelperRunner.state;
  if (state?.armedFromRemote === true && state.serving === "default") {
    let sameHelper =
      snapshot.tuple === remoteDecision.tuple && snapshot.helperMayExec === remoteDecision.helperMayExec;
    let winner = snapshot.winner;
    if (sameHelper && snapshot.payloadServable && winner !== null) {
      applyStaticPayloadChoice(snapshot);
      policyHelperRunner.remoteDecision = snapshot;
      let withheld = withholdUnverifiedCacheKeys(winner.settings, true, snapshot.verified);
      if (
        snapshot.payloadKey === remoteDecision.payloadKey &&
        snapshot.helperMergesOutput === remoteDecision.helperMergesOutput &&
        withholdUnverifiedCacheKeys(winner.settings, true, remoteDecision.verified) === withheld
      ) {
        logForDebugging(
          `policyHelper: remote static payload from ${winner.sourceField} stands as served (document ${snapshot.verified ? "verified" : "no longer verified"} this session)`,
          {
            level: "debug",
          },
        );
        return;
      }
      state.mergesOutput = snapshot.helperMergesOutput || winner.mergesOutput;
      state.output = {
        managedSettings: withheld,
      };
      state.warnings = winner.warnings;
      logForDebugging(`policyHelper: remote static payload re-served in place from ${winner.sourceField}`, {
        level: "info",
      });
      policyHelperRunner.announceTierChange();
      return;
    }
    deactivateRemoteHelper();
    return;
  }
  let armedConfig =
    state?.armedFromRemote === true
      ? state.config
      : (policyHelperRunner.remoteArmingConfig ?? policyHelperRunner.remoteFailedConfig);
  let armStands =
    armedConfig != null && snapshot.helperMayExec && snapshot.tuple === getPolicyHelperCommand(armedConfig);
  let nothingPending = state !== null || policyHelperRunner.remoteFailedConfig === null;
  if (armStands && nothingPending) {
    applyStaticPayloadChoice(snapshot);
    policyHelperRunner.remoteDecision = snapshot;
    logForDebugging(
      "policyHelper: remote static payloads re-resolved under the armed entry; the arm stands",
      {
        level: "debug",
      },
    );
    return;
  }
  deactivateRemoteHelper();
}
//@ chunk-q8cqcff6.js:84358-84408 placement
/**
 * helperConfigPath：helper 配置文件路径。
 */
function helperConfigPath() {
  return policyHelperRunner.state?.config?.path ?? null;
}
//@ chunk-q8cqcff6.js:84408-84455 placement
/**
 * retiredHelperPaths：已退役的 helper 路径。
 */
function retiredHelperPaths() {
  return [...policyHelperRunner.retiredHelperPaths];
}
//@ chunk-q8cqcff6.js:84455-84778 placement
/**
 * 列出设置中所有有效的路径型 policyHelper（按平台链与单数键），用于沙箱配置。
 */
function policyHelperPaths(basePolicySettings) {
  let policyHelpers = basePolicySettings?.policyHelpers;
  let configs = policyHelpers
    ? platformSettingsChain()
        .chain.map((osKey) => policyHelpers[osKey])
        .filter((entry) => entry != null)
        .map((config) => ({
          config,
          fromPerOs: true,
        }))
    : [];
  if (basePolicySettings?.policyHelper != null)
    configs.push({
      config: basePolicySettings.policyHelper,
      fromPerOs: false,
    });
  let family = helperPlatformFamily();
  let paths = [];
  for (let { config, fromPerOs } of configs)
    if (typeof config.path === "string" && validateHelperConfig(config, family, fromPerOs, false) === null)
      paths.push(config.path);
  return paths;
}
//@ chunk-q8cqcff6.js:84778-84829 placement
/**
 * isServingDefault：正在服务 “default” helper。
 */
function isServingDefault() {
  return policyHelperRunner.state?.serving === "default";
}
//@ chunk-q8cqcff6.js:84829-85531 placement
function policyHelperConsentState() {
  let { state, lastFailure, selectedEntry, remoteFailedConfig } = policyHelperRunner;
  let remoteDecision = policyHelperRunner.remoteDecision;
  let config = selectedEntry?.config ?? null;
  let consentState = "none";
  if (
    remoteDecision?.helperRefusesOnFailure === true &&
    (remoteFailedConfig !== null ||
      (remoteDecision.verified && remoteDecision.tuple !== undefined && !remoteDecision.helperMayExec))
  )
    consentState = "refuse_pending";
  else if (lastFailure !== null) consentState = lastFailure;
  else if (
    remoteDecision !== null &&
    !remoteDecision.verified &&
    (remoteDecision.tuple !== undefined || !remoteDecision.payloadServable)
  )
    consentState = "unverified";
  else if (
    remoteDecision !== null &&
    ((config !== null && !remoteDecision.helperMayExec) ||
      (selectedEntry !== null && config === null && !remoteDecision.payloadServable))
  )
    consentState = "consent_missing";
  else if (config !== null && state?.serving === "helper") consentState = "ok";
  return {
    state: consentState,
    applied: state === null ? "none" : state.serving === "helper" ? "output" : "fallback",
    entry: selectedEntry && {
      key: selectedEntry.key,
      ...(config?.path !== undefined && {
        path: config.path,
      }),
      ...(config?.script !== undefined &&
        selectedEntry.key !== "policyHelper" && {
          script: config.script,
        }),
    },
  };
}
//@ chunk-q8cqcff6.js:85531-85602 placement
/**
 * helperSelectionWarnings：合并选择与状态的警告。
 */
function helperSelectionWarnings() {
  return [...policyHelperRunner.selectionWarnings, ...(policyHelperRunner.state?.warnings ?? [])];
}
//@ chunk-q8cqcff6.js:85602-85647 placement
/**
 * resetRemoteHelperState：重置远程 helper 状态。
 */
function resetRemoteHelperState() {
  policyHelperRunner.reset();
  policyHelperRunner.startsNoSession = false;
}
//@ chunk-q8cqcff6.js:85647-85659 placement
/**
 * helperOutputOverride：helper 输出覆盖值。
 */
var helperOutputOverride = null;
//@ chunk-q8cqcff6.js:85659-85680 placement
/**
 * setHelperOutputOverride：设置 helper 输出覆盖值。
 */
function setHelperOutputOverride(getPreSettingsEnvSnapshot) {
  helperOutputOverride = getPreSettingsEnvSnapshot;
}
export {
  isServingDefault,
  armedFromUserWritableBase,
  remoteClaudeMd,
  hasRemoteHelperState,
  retireIfShadowedByRemote,
  enableMidSessionArming,
  policyHelperConsentState,
  subscribeHelperPassSettled,
  hasHelperPassInFlight,
  releaseLatchWhenTickSettles,
  helperSelectionWarnings,
  remoteAppendSystemPrompt,
  reserveRemoteStaticPayload,
  applyRemotePolicyMidSession,
  managedSettingsFromRemote,
  armedFromRemote,
  mergesRemoteOutput,
  notifyOrganizationAsking,
  notifyOrganizationAskingForced,
  helperInitAttempted,
  helperConfigPath,
  policyHelperPaths,
  retiredHelperPaths,
  setHelperOutputOverride,
  helperOutputOverride,
  retryRemoteHelper,
  matchingRemoteHelperConfig,
  resetRemoteHelperState,
  retireOsAdminPass,
  retireReason,
  selectPerOsHelper,
  runRemoteArmedHelper,
  RemoteHelperError,
  remoteHelperCommand,
  selectPerOsConfig,
};
