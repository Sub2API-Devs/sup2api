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
var AWAY_RECHECK_DELAYS_MS = [30000, 120000, 300000],
  Un = 0.2;
//@ chunk-qmsrnapp.js:55451-57051 placement
class AwayRecheck {
  #e = void 0;
  #t = new Map();
  #n = new AbortController();
  #o = [];
  start(e) {
    if (this.#e !== void 0) return;
    ((this.#e = e),
      (this.#n = new AbortController()),
      (this.#o = [
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
      ]));
  }
  checking(e) {
    return this.#t.has(e) || (this.#e?.registry.awayEpisode(e)?.toldModel === !1 && this.#e.isEnabled());
  }
  dispose() {
    for (let e of this.#o) e();
    for (let e of [...this.#t.keys()]) this.#r(e);
    (this.#n.abort(), (this.#o = []), (this.#e = void 0));
  }
  #r(e) {
    (this.#t.get(e)?.cancelTimer(), this.#t.delete(e));
  }
  #s(e, n) {
    let awayEpisode = e.registry.awayEpisode(n);
    if (awayEpisode === void 0 || !e.isEnabled() || this.#t.has(n)) return;
    let mapped = AWAY_RECHECK_DELAYS_MS.map(
        (u) =>
          awayEpisode.awaySince +
          backoffDelayMs({
            attempt: 1,
            baseMs: u,
            jitter: { kind: "symmetric", ratio: Un },
            random: e.random,
          }),
      ),
      now = e.registry.now(),
      i = count(mapped, (u) => u <= now);
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
        ?.transport.probeLive?.({ signal: this.#n.signal });
      if (s === !0) logFeatureOk("rtc_away_recheck");
      if (this.#t.get(n) !== o) return;
      let now = e.registry.now(),
        index = o.dueAts.findIndex((dueAt, p) => p > r && dueAt > now);
      if (s === !0 || index === -1) {
        if ((this.#t.delete(n), s !== !0))
          logFeatureSad("rtc_away_recheck", s === !1 ? "exhausted" : "inconclusive");
        return;
      }
      this.#i(e, n, o.dueAts, index);
    } catch (error) {
      if ((logError(error), logFeatureBad("rtc_away_recheck", "probe_threw"), this.#t.get(n) === o))
        this.#t.delete(n);
    }
  }
}

export { AwayRecheck };
