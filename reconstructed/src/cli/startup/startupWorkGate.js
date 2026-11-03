/**
 * cli/startup/startupWorkGate.ts
 *
 * 2.1.316 新增：启动工作闸门与 GrowthBook 等待
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (19)
 * attribution: placement 19
 */
import { Xvt, crt } from "../../utils/plugins/hooksModulesRollout.js";
import { initializeGrowthBook, hasFreshGrowthBookFeatures } from "../../services/analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, toError } from "../../utils/errors.js";
import { REPO_DIR_SETTING_SOURCE_LIST, isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { filterPolicyPredicateEnv } from "../../utils/managedEnvApply.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { j1t } from "../../utils/claudeAiSync/skillsSync.js";
import { lLe } from "../../services/skillsSync/skillsSync.js";
import { logError } from "../../utils/log.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-3wek6r2k.js:7979-8153 placement
function releaseGrowthBookHold(e) {
  let o = Xvt(e),
    n = crt(o);
  if (((o.hasHeld ||= n), (o.isOver = !0), o.over.resolve(), n))
    initializeGrowthBook().catch((r) =>
      logForDebugging(`flag fetch after the hold did not begin (${errorMessage(r)})`, { level: "error" }),
    );
}
//@ chunk-3wek6r2k.js:8153-8180 placement
var hasHeldGrowthBook = (e) => Xvt(e).hasHeld;
//@ chunk-3wek6r2k.js:8180-8261 placement
var GROWTHBOOK_HOLD_STAGES = { before: "before_held_growthbook_init", after: "after_held_growthbook_init" };
//@ chunk-3wek6r2k.js:8261-8410 placement
function runPendingSettingsRule(e, o) {
  try {
    return e(o);
  } catch (error) {
    return (
      logForDebugging(
        `flag fetch held: the rule for pending settings environment threw (${errorMessage(error)})`,
        { level: "error" },
      ),
      !0
    );
  }
}
//@ chunk-3wek6r2k.js:8410-8460 placement
var armPendingSettingsEnvRule = (e, o, n) => {
  Xvt(e.host).isPending ??= runPendingSettingsRule(o, n);
};
//@ chunk-3wek6r2k.js:8460-8508 placement
var shouldHoldForOnboarding = (e, o) => !o.hasCompletedOnboarding && hasHeldGrowthBook(e);
//@ chunk-3wek6r2k.js:8508-8583 placement
var hasRepoSettingsEnv = (e) =>
  e ||
  REPO_DIR_SETTING_SOURCE_LIST.some(
    (o) =>
      isSettingSourceEnabled(o) &&
      Object.keys(filterPolicyPredicateEnv(getSettingsForSource(o)?.env, o)).length > 0,
  );
//@ chunk-3wek6r2k.js:8583-8625 placement
var canSkipGrowthBookHold = (e, o) =>
  !o && !getIsNonInteractiveSession() && hasHeldGrowthBook(e.host) && hasFreshGrowthBookFeatures();
//@ chunk-3wek6r2k.js:8625-8675 placement
function maybeStartLazyLoad(e, o, n) {
  return j1t() ? lLe(e, o, n) : void 0;
}
//@ chunk-3wek6r2k.js:8675-8692 placement
var vi = 1000,
  Jd = 9;
//@ chunk-3wek6r2k.js:8692-8736 placement
function Ci(e, o) {
  try {
    e(o);
  } catch (error) {
    logError(toError(error));
  }
}
/**
 * 启动期工作闸门：延迟执行非关键任务，直到首个轮次开始、宿主初始化、输入关闭或超时（[startupWorkGate]）。
 */
//@ chunk-3wek6r2k.js:8736-10578 placement
class StartupWorkGate {
  #r = !1;
  #n = !1;
  #c;
  #u = vi;
  #s = 0;
  #o = [];
  #t;
  #i;
  #a;
  #l;
  #e;
  get isArmed() {
    return this.#r;
  }
  get isOpen() {
    return this.#n;
  }
  get openReason() {
    return this.#a;
  }
  arm(e = vi) {
    if (this.#r || this.#n) return;
    ((this.#r = !0),
      (this.#c = performance.now()),
      (this.#u = e),
      (this.#i = registerCleanup(() => this.release("shutdown"))));
  }
  expectHandshake() {
    if (!this.#r || this.#n || this.#t !== void 0) return;
    this.#d();
  }
  #d() {
    if (this.#t !== void 0) clearTimeout(this.#t);
    ((this.#t = setTimeout(() => {
      if (((this.#t = void 0), this.#o.length > 0 && this.#s < Jd && this.#l?.())) {
        (this.#s++, this.#d());
        return;
      }
      this.release("fallback_timeout");
    }, this.#u)),
      this.#t.unref?.());
  }
  hold(e, o) {
    if (!this.#r || this.#n) {
      o(this.#a ?? "not_armed");
      return;
    }
    this.#o.push({ name: e, task: o });
  }
  yieldToTurnWhen(e) {
    this.#l = e;
  }
  release(e) {
    let o = e === "shutdown" || e === "input_closed" || e === "not_applicable",
      n = this.#e ? this.#e.held.slice(this.#e.next) : [],
      r = o || (e === "turn_started" && this.#e?.reason === "host_initialized");
    if (this.#n && this.#o.length === 0 && !(r && n.length > 0)) return;
    let u = !this.#n;
    if (u) ((this.#n = !0), (this.#a = e));
    if (this.#t !== void 0) (clearTimeout(this.#t), (this.#t = void 0));
    let p = [...n, ...this.#o];
    if (((this.#o = []), this.#e)) ((this.#e.next = this.#e.held.length), (this.#e = void 0));
    if (this.#r)
      logForDebugging(
        `[startupWorkGate] ${u ? "open" : "draining remainder"} (${e}) after ${Math.round(performance.now() - (this.#c ?? 0))}ms; running ${p.length} held task(s): ${p.map((y) => y.name).join(", ")}`,
      );
    if (o) {
      for (let { task: task } of p) Ci(task, e);
      this.#p(e);
      return;
    }
    let h = { reason: e, held: p, next: 0 };
    this.#e = h;
    let S = () => {
      if (this.#e !== h) return;
      let y = h.held[h.next];
      if (y === void 0) {
        ((this.#e = void 0), this.#p(e));
        return;
      }
      if (e === "host_initialized" && this.#l?.()) {
        ((this.#o = [...h.held.slice(h.next), ...this.#o]),
          (this.#e = void 0),
          (this.#s = 0),
          this.#d(),
          logForDebugging(
            `[startupWorkGate] a turn started during the idle release; ${this.#o.length} task(s) wait for it`,
          ));
        return;
      }
      (h.next++, Ci(y.task, e), setImmediate(S));
    };
    setImmediate(S);
  }
  #p(e) {
    if (e !== "shutdown") this.#i?.();
    this.#i = void 0;
  }
}
//@ chunk-3wek6r2k.js:10578-10603 placement
var wo = new HostScoped(() => new StartupWorkGate());
//@ chunk-3wek6r2k.js:10603-10686 placement
function armStartupWorkGate(e, o) {
  if (env.CLAUDE_CODE_DISABLE_STARTUP_WORK_GATE) return;
  wo.of(e).arm(o);
}
//@ chunk-3wek6r2k.js:10686-10725 placement
function holdForStartupWork(e, o, n) {
  wo.of(e).hold(o, n);
}
//@ chunk-3wek6r2k.js:10725-10778 placement
function waitForStartupWork(e, o) {
  return new Promise((n) => holdForStartupWork(e, o, n));
}
//@ chunk-3wek6r2k.js:10778-10821 placement
function expectStartupHandshake(e) {
  wo.of(e).expectHandshake();
}
//@ chunk-3wek6r2k.js:10821-10867 placement
function yieldStartupWorkToTurn(e, o) {
  wo.of(e).yieldToTurnWhen(o);
}
//@ chunk-3wek6r2k.js:10867-10905 placement
function releaseStartupWork(e, o) {
  wo.of(e).release(o);
}

export {
  releaseStartupWork,
  holdForStartupWork,
  waitForStartupWork,
  yieldStartupWorkToTurn,
  expectStartupHandshake,
  hasRepoSettingsEnv,
  armPendingSettingsEnvRule,
  releaseGrowthBookHold,
  armStartupWorkGate,
  hasHeldGrowthBook,
  GROWTHBOOK_HOLD_STAGES,
  canSkipGrowthBookHold,
  maybeStartLazyLoad,
  shouldHoldForOnboarding,
};
