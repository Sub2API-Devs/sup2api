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
import { stringSchema, objectSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../analytics/index.js";
import { logError } from "../../utils/log.js";
import { rawSettingsKeyPresence } from "../../utils/settings/settings.js";
import { errorMessage } from "../../utils/errors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  isAutoContinueRemoteEnabled,
  resolveAutoContinueEnabled,
  isAutoContinueEligibleSession,
  isAutoContinueAutoArmEnabled,
} from "../autoContinueAtUsageLimit.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isClaudeAISubscriber, getOauthAccountInfo } from "../../utils/auth.js";
import { isUnattendedInteractiveSession } from "../../utils/concurrentSessions.js";
import { RATE_LIMIT_RESET_MAX_MS, isAutoResumableLimit } from "../api/errors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { resetsAtText } from "../../utils/usageLimitText.js";
import { plural } from "../../utils/stringUtils.js";
import { formatResetTimeWithLocale } from "../../utils/format.js";
import { readFlagWithOverride } from "../analytics/flagOverrides.js";
import { getAutoModeClassifierRole } from "../../utils/permissions/serverClassifier/arbiter.js";

//@ chunk-41w44bgm.js:33596-33618 placement
var DEFAULT_WARMUP_RELEASE_WAIT_MS = 5000;
var WARM_STATE_TTL_MS = 270000;
//@ chunk-41w44bgm.js:33618-34564 placement
/**
 * 按键（账号/模型）协调用量限额后的"预热"：第一个进入者负责预热，其余在上限时间内等待其就绪；预热结束后在一段时间内视为 warm。
 */
class UsageLimitWarmupGate {
  now;
  entries = new Map();
  constructor(clock = Date.now) {
    this.now = clock;
  }
  async enter(key, options) {
    let nowMs = this.now();
    for (let [entryKey, entry] of this.entries)
      if (entry.state === "warm" && entry.until <= nowMs) this.entries.delete(entryKey);
    let existing = this.entries.get(key);
    let newEntry;
    let waitedMs = 0;
    if (existing === undefined) {
      newEntry = warmingEntry();
      this.entries.set(key, newEntry);
    } else if (existing.state === "warming" && options.capMs > 0) {
      let waitStart = this.now();
      await waitWithCap(existing.ready, options.capMs, options.signal);
      waitedMs = Math.max(0, this.now() - waitStart);
    }
    let didRespond = false;
    return {
      leader: newEntry !== undefined,
      waitedMs,
      responded: () => {
        didRespond = true;
        this.markWarm(key);
      },
      done: () => {
        if (didRespond || newEntry === undefined) return;
        if (this.entries.get(key) === newEntry && newEntry.state === "warming") {
          this.entries.delete(key);
          newEntry.release();
        }
      },
    };
  }
  stateOf(key) {
    let entry = this.entries.get(key);
    if (entry === undefined) return "cold";
    if (entry.state === "warm") return entry.until > this.now() ? "warm" : "cold";
    return "warming";
  }
  clear() {
    for (let entry of this.entries.values()) if (entry.state === "warming") entry.release();
    this.entries.clear();
  }
  markWarm(key) {
    let previous = this.entries.get(key);
    this.entries.set(key, {
      state: "warm",
      until: this.now() + WARM_STATE_TTL_MS,
    });
    if (previous?.state === "warming") previous.release();
  }
}
//@ chunk-41w44bgm.js:34564-34648 placement
/**
 * 构造「预热中」条目：state 为 warming，并给出 ready promise 与 release。
 */
function warmingEntry() {
  let release;
  return {
    state: "warming",
    ready: new Promise((resolve) => {
      release = resolve;
    }),
    release,
  };
}
//@ chunk-41w44bgm.js:34648-34887 placement
function waitWithCap(ready, capMs, signal) {
  if (signal?.aborted) return Promise.resolve();
  let abortController = new AbortController();
  let onAbort = () => abortController.abort();
  signal?.addEventListener("abort", onAbort, {
    once: true,
  });
  return Promise.race([ready, sleep(capMs, abortController.signal)]).finally(() => {
    abortController.abort();
    signal?.removeEventListener("abort", onAbort);
  });
}
//@ chunk-41w44bgm.js:34887-34912 placement
/**
 * 按 host 保存的用量限额预热门。
 */
var warmupGateSlots = new HostScoped(() => new UsageLimitWarmupGate());
//@ chunk-41w44bgm.js:34912-34949 placement
/**
 * 取当前 host 的用量限额预热门。
 */
function currentWarmupGate() {
  return warmupGateSlots.of(getRootSession().host);
}
//@ chunk-41w44bgm.js:34949-34977 placement
/**
 * 预热等待时长的默认值兜底。
 */
function warmupWaitMs(override) {
  return override ?? DEFAULT_WARMUP_RELEASE_WAIT_MS;
}
//@ chunk-41w44bgm.js:34977-35070 placement
/**
 * 前缀缓存错峰毫秒数：关闭提示缓存时 0，否则取环境变量或默认值。
 */
function prefixStaggerMs() {
  return env.DISABLE_PROMPT_CACHING ? 0 : warmupWaitMs(env.CLAUDE_CODE_WORKFLOW_PREFIX_STAGGER_MS);
}
//@ chunk-41w44bgm.js:35070-35124 placement
var MAX_WAITED_RESETS = 2;
var MAX_RESETS_AFTER_RUN = 2;
var MAX_SINGLE_WAIT_MS = 30000;
var INITIAL_RETRY_COUNT = 2;
var RETRY_SLEEP_MS = 2000;
var RETRY_FLOOR_MS = 30000;
var RETRY_BASE_MS = 90000;
//@ chunk-41w44bgm.js:35124-38231 placement
class UsageLimitWaiter {
  #e;
  #o;
  #r;
  #t;
  #n;
  #i = 0;
  #a = 0;
  #l = false;
  #s = "unscanned";
  constructor({ signal, log, onChange, storageV5 }) {
    this.#e = signal;
    this.#o = log;
    this.#r = onChange;
    this.#u(storageV5, INITIAL_RETRY_COUNT);
  }
  async #u(storageV5, attemptsLeft) {
    try {
      this.#s = await rawSettingsKeyPresence("autoContinueAtUsageLimit", storageV5);
    } catch (error) {
      this.#s = "unknowable";
      logError(error);
    }
    if (this.#s === "unknowable" && attemptsLeft > 0 && !this.#e?.aborted) {
      await sleep(RETRY_SLEEP_MS, this.#e, {
        unref: true,
      });
      await this.#u(storageV5, attemptsLeft - 1);
    }
  }
  #d() {
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_linked_clover", true) || !isAutoContinueRemoteEnabled())
      return "killswitch";
    return resolveAutoContinueEnabled(this.#s) ? undefined : "setting_off";
  }
  #f() {
    return (
      isClaudeAISubscriber() &&
      getOauthAccountInfo()?.billingType !== "usage_based" &&
      this.#d() === undefined &&
      isAutoContinueEligibleSession() &&
      isAutoContinueAutoArmEnabled() &&
      !isUnattendedInteractiveSession()
    );
  }
  wouldWait(resetsAt) {
    try {
      let resetMs = (resetsAt ?? 0) * 1000;
      return (
        !this.#e?.aborted &&
        resetMs - Date.now() <= RATE_LIMIT_RESET_MAX_MS &&
        this.#i < MAX_WAITED_RESETS &&
        this.#a < MAX_RESETS_AFTER_RUN &&
        this.#f()
      );
    } catch (error) {
      logError(error);
      return false;
    }
  }
  async whenClear() {
    while (this.#n !== undefined) await this.#n;
  }
  join(limit) {
    try {
      return this.#p(limit);
    } catch (error) {
      logError(error);
      return {
        outcome: "declined",
        failureNote: undefined,
      };
    }
  }
  #p(limit) {
    if (this.#e?.aborted)
      return {
        outcome: "aborted",
      };
    if (limit === undefined || limit.resetsAt === undefined || !isAutoResumableLimit(limit) || !this.#f())
      return {
        outcome: "declined",
        failureNote: undefined,
      };
    let now = Date.now();
    let resetAtMs = limit.resetsAt * 1000;
    if (resetAtMs - now > RATE_LIMIT_RESET_MAX_MS)
      return this.#c(`usage limit; resets ${formatResetTime(limit.resetsAt)}, too far out to wait for`);
    let resumeAtMs =
      Math.max(resetAtMs, now) +
      fullJitterBackoffMs({
        baseMs: RETRY_BASE_MS,
        capMs: RETRY_BASE_MS,
        attempt: 0,
        floorMs: RETRY_FLOOR_MS,
      });
    if (this.#t !== undefined && this.#n !== undefined) {
      this.#t.status = {
        resetsAt: Math.max(this.#t.status.resetsAt, limit.resetsAt),
        resumeAtMs: Math.max(this.#t.status.resumeAtMs, resumeAtMs),
        waitingAgents: this.#t.status.waitingAgents + 1,
      };
      this.#r(this.#t.status);
      return {
        outcome: "waiting",
        ended: this.#n,
      };
    }
    let alreadyReset = resetAtMs <= now;
    if (alreadyReset ? this.#a >= MAX_RESETS_AFTER_RUN : this.#i >= MAX_WAITED_RESETS)
      return this.#c(
        `usage limit; resets ${formatResetTime(limit.resetsAt)}, and this run already waited for ${alreadyReset ? MAX_RESETS_AFTER_RUN : MAX_WAITED_RESETS} resets`,
      );
    if (alreadyReset) this.#a++;
    else this.#i++;
    let waitRecord = {
      status: {
        resetsAt: limit.resetsAt,
        resumeAtMs,
        waitingAgents: 1,
      },
      startedAtMs: now,
    };
    this.#t = waitRecord;
    this.#n = this.#m(waitRecord);
    let resetText = resetsAtText(limit.resetsAt, true);
    this.#o(
      `Usage limit reached${resetText === undefined ? "" : ` \xB7 ${resetText}`}. Workflow paused; waiting agents re-run shortly after the reset.`,
    );
    this.#r(waitRecord.status);
    return {
      outcome: "waiting",
      ended: this.#n,
    };
  }
  async #m(waitRecord) {
    let outcome = "failed";
    let revokedReason;
    try {
      let remainingMs = waitRecord.status.resumeAtMs - Date.now();
      do {
        await sleep(Math.max(0, Math.min(remainingMs, MAX_SINGLE_WAIT_MS)), this.#e);
        remainingMs = waitRecord.status.resumeAtMs - Date.now();
        revokedReason = this.#d();
      } while (!this.#e?.aborted && revokedReason === undefined && remainingMs > 0);
      outcome = this.#e?.aborted ? "aborted" : revokedReason === undefined ? "resumed" : "revoked";
    } catch (error) {
      logError(error);
    }
    this.#t = undefined;
    this.#n = undefined;
    try {
      this.#r(undefined);
      let fields = {
        wait_ms: Date.now() - waitRecord.startedAtMs,
        agents_waiting: waitRecord.status.waitingAgents,
      };
      switch (outcome) {
        case "resumed":
          this.#o(
            `Usage limit reset. Re-running ${waitRecord.status.waitingAgents} waiting ${plural(waitRecord.status.waitingAgents, "agent")}.`,
          );
          logFeatureOk("workflow_rate_limit_wait", fields);
          break;
        case "aborted":
          logFeatureSad("workflow_rate_limit_wait", "killed_while_waiting", fields);
          break;
        case "revoked":
          this.#o(
            `Waiting for usage limits to reset was turned off. ${waitRecord.status.waitingAgents} waiting ${plural(waitRecord.status.waitingAgents, "agent")} will not run again.`,
          );
          logFeatureSad(
            "workflow_rate_limit_wait",
            revokedReason === "setting_off" ? "setting_off_while_waiting" : "killswitch_while_waiting",
            fields,
          );
          break;
        case "failed":
          logFeatureBad("workflow_rate_limit_wait", "wait_error", fields);
          break;
      }
    } catch (error) {
      logError(error);
    }
    return outcome;
  }
  #c(failureNote) {
    if (!this.#l) {
      this.#l = true;
      logFeatureSad("workflow_rate_limit_wait", "gave_up", {
        wait_ms: 0,
        agents_waiting: 0,
      });
    }
    return {
      outcome: "declined",
      failureNote,
    };
  }
}
//@ chunk-41w44bgm.js:38231-38284 placement
function formatResetTime(resetsAt) {
  return formatResetTimeWithLocale(resetsAt, true) ?? "at an unknown time";
}
//@ chunk-41w44bgm.js:38284-38376 placement
/**
 * 判断是否启用序列化日出开关且当前代理为仲裁者。
 */
function isSerializedArbiter(mode) {
  return (
    readFlagWithOverride("tengu_serialized_sunrise", {
      safe: false,
    }) &&
    getAutoModeClassifierRole(mode, {
      peek: true,
    }) === "arbiter"
  );
}
export { UsageLimitWaiter, isSerializedArbiter, currentWarmupGate, prefixStaggerMs };
