/**
 * services/policyLimits/orgConfigStartup.ts
 *
 * 2.1.316 新增。启动早期执行组织配置闸门，不满足时拒绝启动。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-r2x77faw.js (9)
 * attribution: placement 9
 */
import {
  gateBlockReasonCode,
  settlePendingGateWork,
  orgConfigGateQuick,
  isFlagFetchHeld_2 as isFlagFetchHeld,
  isFlagSourceUntrusted,
  initGrowthBookWithDeadline,
  logOrgConfigGate,
  awaitOrgConfigGate,
  isGateBlocking,
  reevaluateSettingsGate,
  isUnarmedFallback,
  growthBookReady,
  retryGateAfterOutcomes,
  orgConfigGateSync,
} from "./orgConfigGate.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { profileCheckpoint } from "../../utils/startupProfiler.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { currentSettingsOutcome } from "./orgConfigGateMessages.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { withDeadline } from "../../utils/sleep.js";

//@ chunk-r2x77faw.js:463-735 placement
/**
 * 因组织配置拒绝退出
 */
async function exitForOrgConfig(evaluation, print) {
  let { exitRefusingManagedConfig } = await import("../../cli/managedConfigRefusal.js");
  return exitRefusingManagedConfig({
    message:
      evaluation.message ??
      "Claude Code couldn't load your organization's settings, which it requires before a session can start.",
    reason: gateBlockReasonCode(evaluation.decision),
    print,
    beforeExit: settlePendingGateWork,
  });
}
//@ chunk-r2x77faw.js:735-1045 placement
/**
 * 组织配置闸门选项
 */
function orgConfigGateOptions(interactive, options) {
  return {
    surface: interactive ? "startup" : "noninteractive",
    authRecoveryCommand: false,
    ...(options.afterSignIn === true && {
      afterSignIn: true,
    }),
    ...(options.fetchFlag !== undefined && {
      fetchFlag: options.fetchFlag,
    }),
    ...(options.isFlagFetchHeld !== undefined && {
      isFlagFetchHeld: options.isFlagFetchHeld,
    }),
    ...(options.isFlagCacheEmpty !== undefined && {
      isFlagCacheEmpty: options.isFlagCacheEmpty,
    }),
  };
}
//@ chunk-r2x77faw.js:1045-1469 placement
/**
 * 启动早期执行组织配置闸门，不满足时拒绝启动。
 */
async function refuseOrgConfigEarlyAtStartup(options = {}) {
  let interactive = options.interactive ?? !getIsNonInteractiveSession();
  let gateOptions = orgConfigGateOptions(interactive, options);
  let peek = options.peek ?? orgConfigGateQuick;
  let evaluation = peek(gateOptions);
  profileCheckpoint("org_config_gate_phase_one");
  if (evaluation.decision.verdict !== "refused") return;
  if (evaluation.flagSource === "disk" || evaluation.flagSource === "fallback") {
    let isFlagFetchHeld_2 = options.isFlagFetchHeld ?? isFlagFetchHeld;
    if (isFlagFetchHeld_2()) return;
    if (isFlagSourceUntrusted(evaluation.flagSource, isFlagFetchHeld_2, options.isFlagCacheEmpty)) {
      await initGrowthBookWithDeadline(evaluation.flag.budgetMs, options.fetchFlag);
      evaluation = peek(gateOptions);
      if (evaluation.decision.verdict !== "refused") return;
    }
  }
  await logOrgConfigGate(evaluation, evaluation.outcomes);
  return enforceOrgConfigGate(evaluation, gateOptions, interactive, options);
}
//@ chunk-r2x77faw.js:1469-1634 placement
async function enforceOrgConfigGateAtStartup(options = {}) {
  let interactive = options.interactive ?? !getIsNonInteractiveSession();
  let gateOptions = orgConfigGateOptions(interactive, options);
  let evaluation = await (options.evaluate ?? awaitOrgConfigGate)(gateOptions);
  profileCheckpoint("org_config_gate_phase_two");
  if (!isGateBlocking(evaluation.decision)) return;
  return enforceOrgConfigGate(evaluation, gateOptions, interactive, options);
}
//@ chunk-r2x77faw.js:1634-1938 placement
async function enforceOrgConfigGateHeadless(work, options = {}) {
  let gateOptions = orgConfigGateOptions(false, options);
  let { armed } = await readOrgConfigDecision(gateOptions, options);
  profileCheckpoint("org_config_gate_headless");
  if (!armed) return;
  let readPolicySettings = options.readPolicySlot ?? (() => getSettingsForSource("policySettings"));
  let policySettingsBefore = readPolicySettings();
  let workResult = await work();
  if (!workResult.valid) return workResult;
  await enforceOrgConfigGateAtStartup({
    ...options,
    interactive: false,
  });
  return (options.settingsInHand ?? (() => currentSettingsOutcome().reason === "ok"))() &&
    readPolicySettings() === policySettingsBefore
    ? workResult
    : undefined;
}
//@ chunk-r2x77faw.js:1938-2269 placement
async function enforceOrgConfigGateOnLaunchLane(options = {}) {
  let gateOptions = orgConfigGateOptions(true, options);
  let evaluation = await readOrgConfigDecision(gateOptions, options);
  profileCheckpoint("org_config_gate_launch_lane");
  if (!evaluation.armed) return;
  if (!isGateBlocking(evaluation.decision)) {
    logOrgConfigGate(evaluation, evaluation.outcomes);
    return;
  }
  if (!(options.attended ?? !isUnattendedInteractiveSession()) || options.showBlockedScreen === undefined) {
    await (options.retryFetches ?? reevaluateSettingsGate)();
    return enforceOrgConfigGateAtStartup({
      ...options,
      interactive: true,
    });
  }
  await logOrgConfigGate(evaluation, evaluation.outcomes);
  return enforceOrgConfigGate(evaluation, gateOptions, true, {
    ...options,
    retryFirst: true,
  });
}
//@ chunk-r2x77faw.js:2269-2440 placement
/**
 * 读组织配置闸门判定
 */
async function readOrgConfigDecision(gateOptions, options) {
  let peek = options.peek ?? orgConfigGateQuick;
  let evaluation = peek(gateOptions);
  if (isUnarmedFallback(evaluation, options.isFlagFetchHeld, options.isFlagCacheEmpty)) {
    await growthBookReady(options.fetchFlag);
    evaluation = peek(gateOptions);
  }
  return retryGateAfterOutcomes(evaluation, () => peek(gateOptions), options.primeSettingsCacheAge);
}
//@ chunk-r2x77faw.js:2440-3227 placement
/**
 * 执行组织配置闸门
 */
async function enforceOrgConfigGate(evaluation, gateOptions, interactive, options) {
  let exit = options.exit ?? ((evaluation) => exitForOrgConfig(evaluation, options.printMessage));
  let reportFinal = options.reportFinal ?? logOrgConfigGate;
  if (!interactive || !(options.attended ?? !isUnattendedInteractiveSession())) {
    let finalEvaluation = evaluation;
    if (!interactive) {
      let retried = await retryAfterCredentialRefresh(evaluation, gateOptions, options);
      if (retried !== undefined) {
        if (!isGateBlocking(retried.decision)) {
          await reportFinal(retried, undefined, {
            outcome: "passed",
            recoveredAfterMs: retried.decision.blockedMs,
          });
          return;
        }
        finalEvaluation = retried;
      }
    }
    await reportFinal(finalEvaluation, undefined, {
      outcome: "exit",
    });
    return exit(finalEvaluation);
  }
  let blockedScreen = await options.showBlockedScreen?.();
  if (blockedScreen === undefined) {
    await reportFinal(evaluation, undefined, {
      outcome: "exit",
    });
    return exit(evaluation);
  }
  let now = options.now ?? (() => performance.now());
  let startedAt = now() - evaluation.decision.blockedMs;
  let latestEvaluation = evaluation;
  let attempt = 0;
  let outcome = await blockedScreen(
    evaluation,
    async () => {
      await (options.retryFetches ?? reevaluateSettingsGate)();
      attempt += 1;
      latestEvaluation = (options.reevaluate ?? orgConfigGateSync)(
        gateOptions,
        Math.max(0, Math.round(now() - startedAt)),
        attempt,
      );
      return latestEvaluation;
    },
    {
      retryNow: options.retryFirst === true,
    },
  );
  if (outcome === "passed") {
    await reportFinal(latestEvaluation, undefined, {
      outcome: "passed",
      recoveredAfterMs: Math.max(0, Math.round(now() - startedAt)),
    });
    return;
  }
  await reportFinal(latestEvaluation, undefined, {
    outcome,
  });
  return exit(latestEvaluation);
}
//@ chunk-r2x77faw.js:3227-3571 placement
/**
 * 凭据刷新导致不可用时重试
 */
async function retryAfterCredentialRefresh(evaluation, gateOptions, options) {
  let { decision, flag } = evaluation;
  if (decision.verdict !== "blocked" || decision.reason !== "unavailable_credential_refresh") return;
  let remainingMs = flag.budgetMs - decision.blockedMs;
  if (remainingMs <= 0) return;
  let now = options.now ?? (() => performance.now());
  let startedAt = now();
  await withDeadline(
    (options.retryFetches ?? reevaluateSettingsGate)().catch(() => {}),
    remainingMs,
  );
  let max = Math.max(0, Math.round(now() - startedAt));
  return (options.reevaluate ?? orgConfigGateSync)(gateOptions, decision.blockedMs + max, 1);
}
export {
  refuseOrgConfigEarlyAtStartup,
  enforceOrgConfigGateHeadless,
  enforceOrgConfigGateAtStartup,
  enforceOrgConfigGateOnLaunchLane,
};
