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
async function exitForOrgConfig(e, print) {
  let { exitRefusingManagedConfig } = await import("./chunk-jpd29r7p.js");
  return exitRefusingManagedConfig({
    message:
      e.message ??
      "Claude Code couldn't load your organization's settings, which it requires before a session can start.",
    reason: gateBlockReasonCode(e.decision),
    print,
    beforeExit: settlePendingGateWork,
  });
}
//@ chunk-r2x77faw.js:735-1045 placement
/**
 * 组织配置闸门选项
 */
function orgConfigGateOptions(e, t) {
  return {
    surface: e ? "startup" : "noninteractive",
    authRecoveryCommand: false,
    ...(t.afterSignIn === true && {
      afterSignIn: true,
    }),
    ...(t.fetchFlag !== undefined && {
      fetchFlag: t.fetchFlag,
    }),
    ...(t.isFlagFetchHeld !== undefined && {
      isFlagFetchHeld: t.isFlagFetchHeld,
    }),
    ...(t.isFlagCacheEmpty !== undefined && {
      isFlagCacheEmpty: t.isFlagCacheEmpty,
    }),
  };
}
//@ chunk-r2x77faw.js:1045-1469 placement
/**
 * 启动早期执行组织配置闸门，不满足时拒绝启动。
 */
async function refuseOrgConfigEarlyAtStartup(e = {}) {
  let t = e.interactive ?? !getIsNonInteractiveSession();
  let r = orgConfigGateOptions(t, e);
  let peek = e.peek ?? orgConfigGateQuick;
  let n = peek(r);
  profileCheckpoint("org_config_gate_phase_one");
  if (n.decision.verdict !== "refused") return;
  if (n.flagSource === "disk" || n.flagSource === "fallback") {
    let isFlagFetchHeld_2 = e.isFlagFetchHeld ?? isFlagFetchHeld;
    if (isFlagFetchHeld_2()) return;
    if (isFlagSourceUntrusted(n.flagSource, isFlagFetchHeld_2, e.isFlagCacheEmpty)) {
      await initGrowthBookWithDeadline(n.flag.budgetMs, e.fetchFlag);
      n = peek(r);
      if (n.decision.verdict !== "refused") return;
    }
  }
  await logOrgConfigGate(n, n.outcomes);
  return enforceOrgConfigGate(n, r, t, e);
}
//@ chunk-r2x77faw.js:1469-1634 placement
async function enforceOrgConfigGateAtStartup(e = {}) {
  let t = e.interactive ?? !getIsNonInteractiveSession();
  let r = orgConfigGateOptions(t, e);
  let a = await (e.evaluate ?? awaitOrgConfigGate)(r);
  profileCheckpoint("org_config_gate_phase_two");
  if (!isGateBlocking(a.decision)) return;
  return enforceOrgConfigGate(a, r, t, e);
}
//@ chunk-r2x77faw.js:1634-1938 placement
async function enforceOrgConfigGateHeadless(e, t = {}) {
  let r = orgConfigGateOptions(false, t);
  let { armed } = await readOrgConfigDecision(r, t);
  profileCheckpoint("org_config_gate_headless");
  if (!armed) return;
  let n = t.readPolicySlot ?? (() => getSettingsForSource("policySettings"));
  let i = n();
  let o = await e();
  if (!o.valid) return o;
  await enforceOrgConfigGateAtStartup({
    ...t,
    interactive: false,
  });
  return (t.settingsInHand ?? (() => currentSettingsOutcome().reason === "ok"))() && n() === i
    ? o
    : undefined;
}
//@ chunk-r2x77faw.js:1938-2269 placement
async function enforceOrgConfigGateOnLaunchLane(e = {}) {
  let t = orgConfigGateOptions(true, e);
  let orgConfigDecision = await readOrgConfigDecision(t, e);
  profileCheckpoint("org_config_gate_launch_lane");
  if (!orgConfigDecision.armed) return;
  if (!isGateBlocking(orgConfigDecision.decision)) {
    logOrgConfigGate(orgConfigDecision, orgConfigDecision.outcomes);
    return;
  }
  if (!(e.attended ?? !isUnattendedInteractiveSession()) || e.showBlockedScreen === undefined) {
    await (e.retryFetches ?? reevaluateSettingsGate)();
    return enforceOrgConfigGateAtStartup({
      ...e,
      interactive: true,
    });
  }
  await logOrgConfigGate(orgConfigDecision, orgConfigDecision.outcomes);
  return enforceOrgConfigGate(orgConfigDecision, t, true, {
    ...e,
    retryFirst: true,
  });
}
//@ chunk-r2x77faw.js:2269-2440 placement
/**
 * 读组织配置闸门判定
 */
async function readOrgConfigDecision(e, t) {
  let peek = t.peek ?? orgConfigGateQuick;
  let a = peek(e);
  if (isUnarmedFallback(a, t.isFlagFetchHeld, t.isFlagCacheEmpty)) {
    await growthBookReady(t.fetchFlag);
    a = peek(e);
  }
  return retryGateAfterOutcomes(a, () => peek(e), t.primeSettingsCacheAge);
}
//@ chunk-r2x77faw.js:2440-3227 placement
/**
 * 执行组织配置闸门
 */
async function enforceOrgConfigGate(e, t, r, a) {
  let n = a.exit ?? ((s) => exitForOrgConfig(s, a.printMessage));
  let reportFinal = a.reportFinal ?? logOrgConfigGate;
  if (!r || !(a.attended ?? !isUnattendedInteractiveSession())) {
    let s = e;
    if (!r) {
      let f = await retryAfterCredentialRefresh(e, t, a);
      if (f !== undefined) {
        if (!isGateBlocking(f.decision)) {
          await reportFinal(f, undefined, {
            outcome: "passed",
            recoveredAfterMs: f.decision.blockedMs,
          });
          return;
        }
        s = f;
      }
    }
    await reportFinal(s, undefined, {
      outcome: "exit",
    });
    return n(s);
  }
  let o = await a.showBlockedScreen?.();
  if (o === undefined) {
    await reportFinal(e, undefined, {
      outcome: "exit",
    });
    return n(e);
  }
  let g = a.now ?? (() => performance.now());
  let u = g() - e.decision.blockedMs;
  let c = e;
  let O = 0;
  let m = await o(
    e,
    async () => {
      await (a.retryFetches ?? reevaluateSettingsGate)();
      O += 1;
      c = (a.reevaluate ?? orgConfigGateSync)(t, Math.max(0, Math.round(g() - u)), O);
      return c;
    },
    {
      retryNow: a.retryFirst === true,
    },
  );
  if (m === "passed") {
    await reportFinal(c, undefined, {
      outcome: "passed",
      recoveredAfterMs: Math.max(0, Math.round(g() - u)),
    });
    return;
  }
  await reportFinal(c, undefined, {
    outcome: m,
  });
  return n(c);
}
//@ chunk-r2x77faw.js:3227-3571 placement
/**
 * 凭据刷新导致不可用时重试
 */
async function retryAfterCredentialRefresh(e, t, r) {
  let { decision, flag } = e;
  if (decision.verdict !== "blocked" || decision.reason !== "unavailable_credential_refresh") return;
  let i = flag.budgetMs - decision.blockedMs;
  if (i <= 0) return;
  let o = r.now ?? (() => performance.now());
  let g = o();
  await withDeadline(
    (r.retryFetches ?? reevaluateSettingsGate)().catch(() => {}),
    i,
  );
  let max = Math.max(0, Math.round(o() - g));
  return (r.reevaluate ?? orgConfigGateSync)(t, decision.blockedMs + max, 1);
}
export { refuseOrgConfigEarlyAtStartup, enforceOrgConfigGateHeadless, enforceOrgConfigGateAtStartup };
