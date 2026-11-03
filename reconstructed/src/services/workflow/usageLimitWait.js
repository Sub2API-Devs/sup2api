/**
 * services/workflow/usageLimitWait.ts
 *
 * 2.1.316 新增：用量限额等待
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-41w44bgm.js (12)
 * attribution: placement 12
 */
import { sleep, fullJitterBackoffMs } from "../../utils/sleep.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { env } from "../../utils/env.js";
import { o, u } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { logError } from "../../utils/log.js";
import { rawSettingsKeyPresence } from "../../utils/settings/settings.js";
import { errorMessage } from "../../utils/errors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { pze, QKn, cln, ZKn } from "../autoContinueAtUsageLimit.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isClaudeAISubscriber, getOauthAccountInfo } from "../../utils/auth.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { rWt, isAutoResumableLimit } from "../api/errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { resetsAtText } from "../../utils/usageLimitText.js";
import { plural } from "../../utils/stringUtils.js";
import { xk } from "../../utils/format.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { getAutoModeClassifierRole } from "../../utils/permissions/serverClassifier/arbiter.js";

//@ chunk-41w44bgm.js:33596-33618 placement
var si = 5000,
  ii = 270000;
/**
 * 按键（账号/模型）协调用量限额后的"预热"：第一个进入者负责预热，其余在上限时间内等待其就绪；预热结束后在一段时间内视为 warm。
 */
//@ chunk-41w44bgm.js:33618-34564 placement
class UsageLimitWarmupGate {
  now;
  entries = new Map();
  constructor(clock = Date.now) {
    this.now = clock;
  }
  async enter(e, n) {
    let now = this.now();
    for (let [L, j] of this.entries) if (j.state === "warm" && j.until <= now) this.entries.delete(L);
    let h = this.entries.get(e),
      T,
      y = 0;
    if (h === void 0) ((T = ai()), this.entries.set(e, T));
    else if (h.state === "warming" && n.capMs > 0) {
      let now = this.now();
      (await waitWithCap(h.ready, n.capMs, n.signal), (y = Math.max(0, this.now() - now)));
    }
    let A = !1;
    return {
      leader: T !== void 0,
      waitedMs: y,
      responded: () => {
        ((A = !0), this.markWarm(e));
      },
      done: () => {
        if (A || T === void 0) return;
        if (this.entries.get(e) === T && T.state === "warming") (this.entries.delete(e), T.release());
      },
    };
  }
  stateOf(e) {
    let n = this.entries.get(e);
    if (n === void 0) return "cold";
    if (n.state === "warm") return n.until > this.now() ? "warm" : "cold";
    return "warming";
  }
  clear() {
    for (let e of this.entries.values()) if (e.state === "warming") e.release();
    this.entries.clear();
  }
  markWarm(e) {
    let n = this.entries.get(e);
    if ((this.entries.set(e, { state: "warm", until: this.now() + ii }), n?.state === "warming")) n.release();
  }
}
//@ chunk-41w44bgm.js:34564-34648 placement
function ai() {
  let e;
  return {
    state: "warming",
    ready: new Promise((r) => {
      e = r;
    }),
    release: e,
  };
}
//@ chunk-41w44bgm.js:34648-34887 placement
function waitWithCap(e, n, r) {
  if (r?.aborted) return Promise.resolve();
  let abortController = new AbortController(),
    T = () => abortController.abort();
  return (
    r?.addEventListener("abort", T, { once: !0 }),
    Promise.race([e, sleep(n, abortController.signal)]).finally(() => {
      (abortController.abort(), r?.removeEventListener("abort", T));
    })
  );
}
//@ chunk-41w44bgm.js:34887-34912 placement
var ui = new HostScoped(() => new UsageLimitWarmupGate());
//@ chunk-41w44bgm.js:34912-34949 placement
function Vr() {
  return ui.of(getRootSession().host);
}
//@ chunk-41w44bgm.js:34949-34977 placement
function di(e) {
  return e ?? si;
}
//@ chunk-41w44bgm.js:34977-35070 placement
function Hr() {
  return env.DISABLE_PROMPT_CACHING ? 0 : di(env.CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS);
}
//@ chunk-41w44bgm.js:35070-35124 placement
var Uo = 2,
  jo = 2,
  fi = 30000,
  ci = 2,
  pi = 2000,
  mi = 30000,
  Jr = 90000;
//@ chunk-41w44bgm.js:35124-38231 placement
class UsageLimitWaiter {
  #e;
  #o;
  #r;
  #t;
  #n;
  #i = 0;
  #a = 0;
  #l = !1;
  #s = "unscanned";
  constructor({ signal: e, log: n, onChange: r, storageV5: h }) {
    ((this.#e = e), (this.#o = n), (this.#r = r), this.#u(h, ci));
  }
  async #u(e, n) {
    try {
      this.#s = await rawSettingsKeyPresence("autoContinueAtUsageLimit", e);
    } catch (error) {
      ((this.#s = "unknowable"), logError(error));
    }
    if (this.#s === "unknowable" && n > 0 && !this.#e?.aborted)
      (await sleep(pi, this.#e, { unref: !0 }), await this.#u(e, n - 1));
  }
  #d() {
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_linked_clover", !0) || !pze()) return "killswitch";
    return QKn(this.#s) ? void 0 : "setting_off";
  }
  #f() {
    return (
      isClaudeAISubscriber() &&
      getOauthAccountInfo()?.billingType !== "usage_based" &&
      this.#d() === void 0 &&
      cln() &&
      ZKn() &&
      !isUnattendedInteractiveSession()
    );
  }
  wouldWait(e) {
    try {
      let n = (e ?? 0) * 1000;
      return !this.#e?.aborted && n - Date.now() <= rWt && this.#i < Uo && this.#a < jo && this.#f();
    } catch (error) {
      return (logError(error), !1);
    }
  }
  async whenClear() {
    while (this.#n !== void 0) await this.#n;
  }
  join(e) {
    try {
      return this.#p(e);
    } catch (error) {
      return (logError(error), { outcome: "declined", failureNote: void 0 });
    }
  }
  #p(e) {
    if (this.#e?.aborted) return { outcome: "aborted" };
    if (e === void 0 || e.resetsAt === void 0 || !isAutoResumableLimit(e) || !this.#f())
      return { outcome: "declined", failureNote: void 0 };
    let now = Date.now(),
      r = e.resetsAt * 1000;
    if (r - now > rWt) return this.#c(`usage limit; resets ${zr(e.resetsAt)}, too far out to wait for`);
    let h = Math.max(r, now) + fullJitterBackoffMs({ baseMs: Jr, capMs: Jr, attempt: 0, floorMs: mi });
    if (this.#t !== void 0 && this.#n !== void 0)
      return (
        (this.#t.status = {
          resetsAt: Math.max(this.#t.status.resetsAt, e.resetsAt),
          resumeAtMs: Math.max(this.#t.status.resumeAtMs, h),
          waitingAgents: this.#t.status.waitingAgents + 1,
        }),
        this.#r(this.#t.status),
        { outcome: "waiting", ended: this.#n }
      );
    let T = r <= now;
    if (T ? this.#a >= jo : this.#i >= Uo)
      return this.#c(
        `usage limit; resets ${zr(e.resetsAt)}, and this run already waited for ${T ? jo : Uo} resets`,
      );
    if (T) this.#a++;
    else this.#i++;
    let y = { status: { resetsAt: e.resetsAt, resumeAtMs: h, waitingAgents: 1 }, startedAtMs: now };
    ((this.#t = y), (this.#n = this.#m(y)));
    let A = resetsAtText(e.resetsAt, !0);
    return (
      this.#o(
        `Usage limit reached${A === void 0 ? "" : ` \xB7 ${A}`}. Workflow paused; waiting agents re-run shortly after the reset.`,
      ),
      this.#r(y.status),
      { outcome: "waiting", ended: this.#n }
    );
  }
  async #m(e) {
    let n = "failed",
      r;
    try {
      let h = e.status.resumeAtMs - Date.now();
      do
        (await sleep(Math.max(0, Math.min(h, fi)), this.#e),
          (h = e.status.resumeAtMs - Date.now()),
          (r = this.#d()));
      while (!this.#e?.aborted && r === void 0 && h > 0);
      n = this.#e?.aborted ? "aborted" : r === void 0 ? "resumed" : "revoked";
    } catch (error) {
      logError(error);
    }
    ((this.#t = void 0), (this.#n = void 0));
    try {
      this.#r(void 0);
      let h = { wait_ms: Date.now() - e.startedAtMs, agents_waiting: e.status.waitingAgents };
      switch (n) {
        case "resumed":
          (this.#o(
            `Usage limit reset. Re-running ${e.status.waitingAgents} waiting ${plural(e.status.waitingAgents, "agent")}.`,
          ),
            logFeatureOk("workflow_rate_limit_wait", h));
          break;
        case "aborted":
          logFeatureSad("workflow_rate_limit_wait", "killed_while_waiting", h);
          break;
        case "revoked":
          (this.#o(
            `Waiting for usage limits to reset was turned off. ${e.status.waitingAgents} waiting ${plural(e.status.waitingAgents, "agent")} will not run again.`,
          ),
            logFeatureSad(
              "workflow_rate_limit_wait",
              r === "setting_off" ? "setting_off_while_waiting" : "killswitch_while_waiting",
              h,
            ));
          break;
        case "failed":
          logFeatureBad("workflow_rate_limit_wait", "wait_error", h);
          break;
      }
    } catch (error) {
      logError(error);
    }
    return n;
  }
  #c(e) {
    if (!this.#l)
      ((this.#l = !0),
        logFeatureSad("workflow_rate_limit_wait", "gave_up", { wait_ms: 0, agents_waiting: 0 }));
    return { outcome: "declined", failureNote: e };
  }
}
//@ chunk-41w44bgm.js:38231-38284 placement
function zr(e) {
  return xk(e, !0) ?? "at an unknown time";
}
//@ chunk-41w44bgm.js:38284-38376 placement
function Kr(e) {
  return (
    readFlagWithOverride("tengu_serialized_sunrise", { safe: !1 }) &&
    getAutoModeClassifierRole(e, { peek: !0 }) === "arbiter"
  );
}

export { UsageLimitWaiter, Kr, Vr, Hr };
