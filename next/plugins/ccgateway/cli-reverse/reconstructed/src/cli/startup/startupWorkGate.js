/**
 * cli/startup/startupWorkGate.ts
 *
 * 2.1.316 新增：启动工作闸门与 GrowthBook 等待
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (19)
 * attribution: placement 19
 */
import { fetchHoldForHost, pendingWithoutStart } from "../../utils/plugins/hooksModulesRollout.js";
import { initializeGrowthBook, hasFreshGrowthBookFeatures } from "../../services/analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, toError } from "../../utils/errors.js";
import { REPO_DIR_SETTING_SOURCE_LIST, isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { filterPolicyPredicateEnv } from "../../utils/managedEnvApply.js";
import { getSettingsForSource } from "../../utils/settings/settings.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { refreshAccountSkillsSyncFlag } from "../../utils/claudeAiSync/skillsSync.js";
import { startSkillSyncAndResync } from "../../services/skillsSync/skillsSync.js";
import { logError } from "../../utils/log.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hjswk319.js:8412-8586 placement
function releaseGrowthBookHold(host) {
  let holdForHost = fetchHoldForHost(host);
  let pending = pendingWithoutStart(holdForHost);
  holdForHost.hasHeld ||= pending;
  holdForHost.isOver = true;
  holdForHost.over.resolve();
  if (pending)
    initializeGrowthBook().catch((error) =>
      logForDebugging(`flag fetch after the hold did not begin (${errorMessage(error)})`, {
        level: "error",
      }),
    );
}
//@ chunk-hjswk319.js:8586-8613 placement
var hasHeldGrowthBook = (host) => fetchHoldForHost(host).hasHeld;
//@ chunk-hjswk319.js:8613-8694 placement
var GROWTHBOOK_HOLD_STAGES = {
  before: "before_held_growthbook_init",
  after: "after_held_growthbook_init",
};
//@ chunk-hjswk319.js:8694-8843 placement
function runPendingSettingsRule(rule, retry) {
  try {
    return rule(retry);
  } catch (error) {
    logForDebugging(
      `flag fetch held: the rule for pending settings environment threw (${errorMessage(error)})`,
      {
        level: "error",
      },
    );
    return true;
  }
}
//@ chunk-hjswk319.js:8843-8893 placement
var armPendingSettingsEnvRule = (rootSession, rule, tracker) => {
  fetchHoldForHost(rootSession.host).isPending ??= runPendingSettingsRule(rule, tracker);
};
//@ chunk-hjswk319.js:8893-8941 placement
var shouldHoldForOnboarding = (host, config) => !config.hasCompletedOnboarding && hasHeldGrowthBook(host);
//@ chunk-hjswk319.js:8941-9016 placement
var hasRepoSettingsEnv = (rootSession) =>
  rootSession ||
  REPO_DIR_SETTING_SOURCE_LIST.some(
    (name) =>
      isSettingSourceEnabled(name) &&
      Object.keys(filterPolicyPredicateEnv(getSettingsForSource(name)?.env, name)).length > 0,
  );
//@ chunk-hjswk319.js:9016-9058 placement
var canSkipGrowthBookHold = (rootSession, growthBook) =>
  !growthBook &&
  !getIsNonInteractiveSession() &&
  hasHeldGrowthBook(rootSession.host) &&
  hasFreshGrowthBookFeatures();
//@ chunk-hjswk319.js:9058-9108 placement
function maybeStartLazyLoad(rootSession, host, options) {
  return refreshAccountSkillsSyncFlag() ? startSkillSyncAndResync(rootSession, host, options) : undefined;
}
//@ chunk-hjswk319.js:9108-9125 placement
var STARTUP_GATE_TICK_MS = 1000;
var MAX_STARTUP_GATE_RESTARMS = 9;
//@ chunk-hjswk319.js:9125-9169 placement
function runTaskSafely(task, host) {
  try {
    task(host);
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-hjswk319.js:9169-11011 placement
/**
 * 启动期工作闸门：延迟执行非关键任务，直到首个轮次开始、宿主初始化、输入关闭或超时（[startupWorkGate]）。
 */
class StartupWorkGate {
  #r = false;
  #n = false;
  #c;
  #u = STARTUP_GATE_TICK_MS;
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
  arm(tickMs = STARTUP_GATE_TICK_MS) {
    if (this.#r || this.#n) return;
    this.#r = true;
    this.#c = performance.now();
    this.#u = tickMs;
    this.#i = registerCleanup(() => this.release("shutdown"));
  }
  expectHandshake() {
    if (!this.#r || this.#n || this.#t !== undefined) return;
    this.#d();
  }
  #d() {
    if (this.#t !== undefined) clearTimeout(this.#t);
    this.#t = setTimeout(() => {
      this.#t = undefined;
      if (this.#o.length > 0 && this.#s < MAX_STARTUP_GATE_RESTARMS && this.#l?.()) {
        this.#s++;
        this.#d();
        return;
      }
      this.release("fallback_timeout");
    }, this.#u);
    this.#t.unref?.();
  }
  hold(name, task) {
    if (!this.#r || this.#n) {
      task(this.#a ?? "not_armed");
      return;
    }
    this.#o.push({
      name,
      task,
    });
  }
  yieldToTurnWhen(predicate) {
    this.#l = predicate;
  }
  release(reason) {
    let noRemainder = reason === "shutdown" || reason === "input_closed" || reason === "not_applicable";
    let rest = this.#e ? this.#e.held.slice(this.#e.next) : [];
    let trustedReason = noRemainder || (reason === "turn_started" && this.#e?.reason === "host_initialized");
    if (this.#n && this.#o.length === 0 && !(trustedReason && rest.length > 0)) return;
    let wasOpen = !this.#n;
    if (wasOpen) {
      this.#n = true;
      this.#a = reason;
    }
    if (this.#t !== undefined) {
      clearTimeout(this.#t);
      this.#t = undefined;
    }
    let tasksToRun = [...rest, ...this.#o];
    this.#o = [];
    if (this.#e) {
      this.#e.next = this.#e.held.length;
      this.#e = undefined;
    }
    if (this.#r)
      logForDebugging(
        `[startupWorkGate] ${wasOpen ? "open" : "draining remainder"} (${reason}) after ${Math.round(performance.now() - (this.#c ?? 0))}ms; running ${tasksToRun.length} held task(s): ${tasksToRun.map((task) => task.name).join(", ")}`,
      );
    if (noRemainder) {
      for (let { task } of tasksToRun) runTaskSafely(task, reason);
      this.#p(reason);
      return;
    }
    let cursor = {
      reason,
      held: tasksToRun,
      next: 0,
    };
    this.#e = cursor;
    let runNext = () => {
      if (this.#e !== cursor) return;
      let task = cursor.held[cursor.next];
      if (task === undefined) {
        this.#e = undefined;
        this.#p(reason);
        return;
      }
      if (reason === "host_initialized" && this.#l?.()) {
        this.#o = [...cursor.held.slice(cursor.next), ...this.#o];
        this.#e = undefined;
        this.#s = 0;
        this.#d();
        logForDebugging(
          `[startupWorkGate] a turn started during the idle release; ${this.#o.length} task(s) wait for it`,
        );
        return;
      }
      cursor.next++;
      runTaskSafely(task.task, reason);
      setImmediate(runNext);
    };
    setImmediate(runNext);
  }
  #p(task) {
    if (task !== "shutdown") this.#i?.();
    this.#i = undefined;
  }
}
//@ chunk-hjswk319.js:11011-11036 placement
var STARTUP_WORK_GATE_SLOT; // deferred: uses StartupWorkGate of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hjswk319.js:11011", () => {
  STARTUP_WORK_GATE_SLOT = new HostScoped(() => new StartupWorkGate());
});
//@ chunk-hjswk319.js:11036-11119 placement
function armStartupWorkGate(host, options) {
  if (env.CLAUDE_CODE_DISABLE_STARTUP_WORK_GATE) return;
  STARTUP_WORK_GATE_SLOT.of(host).arm(options);
}
//@ chunk-hjswk319.js:11119-11158 placement
function holdForStartupWork(host, name, task) {
  STARTUP_WORK_GATE_SLOT.of(host).hold(name, task);
}
//@ chunk-hjswk319.js:11158-11211 placement
function waitForStartupWork(host, gateHost) {
  return new Promise((resolve) => holdForStartupWork(host, gateHost, resolve));
}
//@ chunk-hjswk319.js:11211-11254 placement
function expectStartupHandshake(host) {
  STARTUP_WORK_GATE_SLOT.of(host).expectHandshake();
}
//@ chunk-hjswk319.js:11254-11300 placement
function yieldStartupWorkToTurn(host, turnHost) {
  STARTUP_WORK_GATE_SLOT.of(host).yieldToTurnWhen(turnHost);
}
//@ chunk-hjswk319.js:11300-11338 placement
function releaseStartupWork(host, releaseHost) {
  STARTUP_WORK_GATE_SLOT.of(host).release(releaseHost);
}
export {
  releaseStartupWork,
  yieldStartupWorkToTurn,
  expectStartupHandshake,
  releaseGrowthBookHold,
  shouldHoldForOnboarding,
  waitForStartupWork,
  holdForStartupWork,
  hasRepoSettingsEnv,
  armPendingSettingsEnvRule,
  armStartupWorkGate,
  hasHeldGrowthBook,
  GROWTHBOOK_HOLD_STAGES,
  canSkipGrowthBookHold,
  maybeStartLazyLoad,
};
