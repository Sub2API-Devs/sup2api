/**
 * services/remoteTools/AwayRecheck.ts
 *
 * 2.1.316 新增：机器离开后的重新检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmsrnapp.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "../../utils/debug.js";
import { backoffDelayMs } from "../../utils/sleep.js";
import { count } from "../../utils/collections.js";
import { logEvent } from "../analytics/index.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";
import { logError } from "../../utils/log.js";

//@ chunk-qmsrnapp.js:55415-55451 placement
/**
 * 机器离开后重新检查的延迟序列与抖动比例。
 */
var AWAY_RECHECK_DELAYS_MS = [30000, 120000, 300000];
var AWAY_RECHECK_JITTER_RATIO = 0.2;
//@ chunk-qmsrnapp.js:55451-57051 placement
class AwayRecheck {
  #e = undefined;
  #t = new Map();
  #n = new AbortController();
  #o = [];
  start(e) {
    if (this.#e !== undefined) return;
    this.#e = e;
    this.#n = new AbortController();
    this.#o = [
      e.registry.onModelToldAway((n) => {
        this.#s(e, n);
      }),
      e.registry.onHostStatusChange((n) => {
        switch (n.change) {
          case "back":
            this.#r(n.name);
            return;
          case "away":
            if (n.toldModel) this.#s(e, n.name);
        }
      }),
      e.registry.onAwayEpisodeDropped((n) => {
        this.#r(n);
      }),
    ];
  }
  checking(e) {
    return this.#t.has(e) || (this.#e?.registry.awayEpisode(e)?.toldModel === false && this.#e.isEnabled());
  }
  dispose() {
    for (let e of this.#o) e();
    for (let key of [...this.#t.keys()]) this.#r(key);
    this.#n.abort();
    this.#o = [];
    this.#e = undefined;
  }
  #r(e) {
    this.#t.get(e)?.cancelTimer();
    this.#t.delete(e);
  }
  #s(e, n) {
    let o = e.registry.awayEpisode(n);
    if (o === undefined || !e.isEnabled() || this.#t.has(n)) return;
    let mapped = AWAY_RECHECK_DELAYS_MS.map(
      (baseMs) =>
        o.awaySince +
        backoffDelayMs({
          attempt: 1,
          baseMs,
          jitter: {
            kind: "symmetric",
            ratio: AWAY_RECHECK_JITTER_RATIO,
          },
          random: e.random,
        }),
    );
    let s = e.registry.now();
    let i = count(mapped, (u) => u <= s);
    this.#i(e, n, mapped, Math.max(0, i - 1));
  }
  #i(e, n, o, r) {
    let s = {
      dueAts: o,
      cancelTimer: e.schedule(
        () => {
          this.#a(e, n, s, r);
        },
        Math.max(0, (o[r] ?? 0) - e.registry.now()),
      ),
    };
    this.#t.set(n, s);
  }
  async #a(e, n, o, r) {
    try {
      if (this.#t.get(n) !== o) return;
      if (!e.isEnabled()) {
        this.#t.delete(n);
        return;
      }
      let s = await e.registry
        .entries()
        .find((h) => h.name === n)
        ?.transport.probeLive?.({
          signal: this.#n.signal,
        });
      if (s === true) logFeatureOk("rtc_away_recheck");
      if (this.#t.get(n) !== o) return;
      let i = e.registry.now();
      let index = o.dueAts.findIndex((dueAt, p) => p > r && dueAt > i);
      if (s === true || index === -1) {
        this.#t.delete(n);
        if (s !== true) logFeatureSad("rtc_away_recheck", s === false ? "exhausted" : "inconclusive");
        return;
      }
      this.#i(e, n, o.dueAts, index);
    } catch (error) {
      logError(error);
      logFeatureBad("rtc_away_recheck", "probe_threw");
      if (this.#t.get(n) === o) this.#t.delete(n);
    }
  }
}
export { AwayRecheck };
