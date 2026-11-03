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
  isFlagFetchHeld,
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

/**
 * 因组织配置拒绝退出
 */
//@ chunk-r2x77faw.js:463-735 placement
async function exitForOrgConfig(e, t) {
  let { exitRefusingManagedConfig: exitRefusingManagedConfig } = await import("./chunk-jpd29r7p.js");
  return exitRefusingManagedConfig({
    message:
      e.message ??
      "Claude Code couldn't load your organization's settings, which it requires before a session can start.",
    reason: gateBlockReasonCode(e.decision),
    print: t,
    beforeExit: settlePendingGateWork,
  });
}
/**
 * 组织配置闸门选项
 */
//@ chunk-r2x77faw.js:735-1045 placement
function orgConfigGateOptions(e, t) {
  return {
    surface: e ? "startup" : "noninteractive",
    authRecoveryCommand: !1,
    ...(t.afterSignIn === !0 && { afterSignIn: !0 }),
    ...(t.fetchFlag !== void 0 && { fetchFlag: t.fetchFlag }),
    ...(t.isFlagFetchHeld !== void 0 && { isFlagFetchHeld: t.isFlagFetchHeld }),
    ...(t.isFlagCacheEmpty !== void 0 && { isFlagCacheEmpty: t.isFlagCacheEmpty }),
  };
}
/**
 * 启动早期执行组织配置闸门，不满足时拒绝启动。
 */
//@ chunk-r2x77faw.js:1045-1469 placement
async function refuseOrgConfigEarlyAtStartup(e = {}) {
  let t = e.interactive ?? !getIsNonInteractiveSession(),
    r = orgConfigGateOptions(t, e),
    a = e.peek ?? orgConfigGateQuick,
    n = a(r);
  if ((profileCheckpoint("org_config_gate_phase_one"), n.decision.verdict !== "refused")) return;
  if (n.flagSource === "disk" || n.flagSource === "fallback") {
    let i = e.isFlagFetchHeld ?? isFlagFetchHeld;
    if (i()) return;
    if (isFlagSourceUntrusted(n.flagSource, i, e.isFlagCacheEmpty)) {
      if (
        (await initGrowthBookWithDeadline(n.flag.budgetMs, e.fetchFlag),
        (n = a(r)),
        n.decision.verdict !== "refused")
      )
        return;
    }
  }
  return (await logOrgConfigGate(n, n.outcomes), enforceOrgConfigGate(n, r, t, e));
}
//@ chunk-r2x77faw.js:1469-1634 placement
async function enforceOrgConfigGateAtStartup(e = {}) {
  let t = e.interactive ?? !getIsNonInteractiveSession(),
    r = orgConfigGateOptions(t, e),
    a = await (e.evaluate ?? awaitOrgConfigGate)(r);
  if ((profileCheckpoint("org_config_gate_phase_two"), !isGateBlocking(a.decision))) return;
  return enforceOrgConfigGate(a, r, t, e);
}
//@ chunk-r2x77faw.js:1634-1938 placement
async function enforceOrgConfigGateHeadless(e, t = {}) {
  let r = orgConfigGateOptions(!1, t),
    { armed: armed } = await readOrgConfigDecision(r, t);
  if ((profileCheckpoint("org_config_gate_headless"), !armed)) return;
  let n = t.readPolicySlot ?? (() => getSettingsForSource("policySettings")),
    i = n(),
    o = await e();
  if (!o.valid) return o;
  return (
    await enforceOrgConfigGateAtStartup({ ...t, interactive: !1 }),
    (t.settingsInHand ?? (() => currentSettingsOutcome().reason === "ok"))() && n() === i ? o : void 0
  );
}
//@ chunk-r2x77faw.js:1938-2269 placement
async function enforceOrgConfigGateOnLaunchLane(e = {}) {
  let t = orgConfigGateOptions(!0, e),
    r = await readOrgConfigDecision(t, e);
  if ((profileCheckpoint("org_config_gate_launch_lane"), !r.armed)) return;
  if (!isGateBlocking(r.decision)) {
    logOrgConfigGate(r, r.outcomes);
    return;
  }
  if (!(e.attended ?? !isUnattendedInteractiveSession()) || e.showBlockedScreen === void 0)
    return (
      await (e.retryFetches ?? reevaluateSettingsGate)(),
      enforceOrgConfigGateAtStartup({ ...e, interactive: !0 })
    );
  return (await logOrgConfigGate(r, r.outcomes), enforceOrgConfigGate(r, t, !0, { ...e, retryFirst: !0 }));
}
/**
 * 读组织配置闸门判定
 */
//@ chunk-r2x77faw.js:2269-2440 placement
async function readOrgConfigDecision(e, t) {
  let r = t.peek ?? orgConfigGateQuick,
    a = r(e);
  if (isUnarmedFallback(a, t.isFlagFetchHeld, t.isFlagCacheEmpty))
    (await growthBookReady(t.fetchFlag), (a = r(e)));
  return retryGateAfterOutcomes(a, () => r(e), t.primeSettingsCacheAge);
}
/**
 * 执行组织配置闸门
 */
//@ chunk-r2x77faw.js:2440-3227 placement
async function enforceOrgConfigGate(e, t, r, a) {
  let n = a.exit ?? ((s) => exitForOrgConfig(s, a.printMessage)),
    i = a.reportFinal ?? logOrgConfigGate;
  if (!r || !(a.attended ?? !isUnattendedInteractiveSession())) {
    let s = e;
    if (!r) {
      let f = await retryAfterCredentialRefresh(e, t, a);
      if (f !== void 0) {
        if (!isGateBlocking(f.decision)) {
          await i(f, void 0, { outcome: "passed", recoveredAfterMs: f.decision.blockedMs });
          return;
        }
        s = f;
      }
    }
    return (await i(s, void 0, { outcome: "exit" }), n(s));
  }
  let o = await a.showBlockedScreen?.();
  if (o === void 0) return (await i(e, void 0, { outcome: "exit" }), n(e));
  let g = a.now ?? (() => performance.now()),
    u = g() - e.decision.blockedMs,
    c = e,
    O = 0,
    m = await o(
      e,
      async () => (
        await (a.retryFetches ?? reevaluateSettingsGate)(),
        (O += 1),
        (c = (a.reevaluate ?? orgConfigGateSync)(t, Math.max(0, Math.round(g() - u)), O)),
        c
      ),
      { retryNow: a.retryFirst === !0 },
    );
  if (m === "passed") {
    await i(c, void 0, { outcome: "passed", recoveredAfterMs: Math.max(0, Math.round(g() - u)) });
    return;
  }
  return (await i(c, void 0, { outcome: m }), n(c));
}
/**
 * 凭据刷新导致不可用时重试
 */
//@ chunk-r2x77faw.js:3227-3571 placement
async function retryAfterCredentialRefresh(e, t, r) {
  let { decision: decision, flag: flag } = e;
  if (decision.verdict !== "blocked" || decision.reason !== "unavailable_credential_refresh") return;
  let i = flag.budgetMs - decision.blockedMs;
  if (i <= 0) return;
  let o = r.now ?? (() => performance.now()),
    g = o();
  await withDeadline(
    (r.retryFetches ?? reevaluateSettingsGate)().catch(() => {}),
    i,
  );
  let max = Math.max(0, Math.round(o() - g));
  return (r.reevaluate ?? orgConfigGateSync)(t, decision.blockedMs + max, 1);
}

export { refuseOrgConfigEarlyAtStartup, enforceOrgConfigGateHeadless, enforceOrgConfigGateAtStartup };
