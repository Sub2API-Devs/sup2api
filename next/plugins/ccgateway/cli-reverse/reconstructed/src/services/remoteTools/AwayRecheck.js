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
  start(deps) {
    if (this.#e !== undefined) return;
    this.#e = deps;
    this.#n = new AbortController();
    this.#o = [
      deps.registry.onModelToldAway((machineName) => {
        this.#s(deps, machineName);
      }),
      deps.registry.onHostStatusChange((change) => {
        switch (change.change) {
          case "back":
            this.#r(change.name);
            return;
          case "away":
            if (change.toldModel) this.#s(deps, change.name);
        }
      }),
      deps.registry.onAwayEpisodeDropped((machineName) => {
        this.#r(machineName);
      }),
    ];
  }
  checking(machineName) {
    return (
      this.#t.has(machineName) ||
      (this.#e?.registry.awayEpisode(machineName)?.toldModel === false && this.#e.isEnabled())
    );
  }
  dispose() {
    for (let unsubscribe of this.#o) unsubscribe();
    for (let key of [...this.#t.keys()]) this.#r(key);
    this.#n.abort();
    this.#o = [];
    this.#e = undefined;
  }
  #r(machineName) {
    this.#t.get(machineName)?.cancelTimer();
    this.#t.delete(machineName);
  }
  #s(deps, machineName) {
    let episode = deps.registry.awayEpisode(machineName);
    if (episode === undefined || !deps.isEnabled() || this.#t.has(machineName)) return;
    let mapped = AWAY_RECHECK_DELAYS_MS.map(
      (baseMs) =>
        episode.awaySince +
        backoffDelayMs({
          attempt: 1,
          baseMs,
          jitter: {
            kind: "symmetric",
            ratio: AWAY_RECHECK_JITTER_RATIO,
          },
          random: deps.random,
        }),
    );
    let nowMs = deps.registry.now();
    let passedCount = count(mapped, (dueAt) => dueAt <= nowMs);
    this.#i(deps, machineName, mapped, Math.max(0, passedCount - 1));
  }
  #i(deps, machineName, dueAts, startIndex) {
    let entry = {
      dueAts,
      cancelTimer: deps.schedule(
        () => {
          this.#a(deps, machineName, entry, startIndex);
        },
        Math.max(0, (dueAts[startIndex] ?? 0) - deps.registry.now()),
      ),
    };
    this.#t.set(machineName, entry);
  }
  async #a(deps, machineName, entry, startIndex) {
    try {
      if (this.#t.get(machineName) !== entry) return;
      if (!deps.isEnabled()) {
        this.#t.delete(machineName);
        return;
      }
      let alive = await deps.registry
        .entries()
        .find((host) => host.name === machineName)
        ?.transport.probeLive?.({
          signal: this.#n.signal,
        });
      if (alive === true) logFeatureOk("rtc_away_recheck");
      if (this.#t.get(machineName) !== entry) return;
      let nowMs = deps.registry.now();
      let index = entry.dueAts.findIndex((dueAt, index) => index > startIndex && dueAt > nowMs);
      if (alive === true || index === -1) {
        this.#t.delete(machineName);
        if (alive !== true) logFeatureSad("rtc_away_recheck", alive === false ? "exhausted" : "inconclusive");
        return;
      }
      this.#i(deps, machineName, entry.dueAts, index);
    } catch (error) {
      logError(error);
      logFeatureBad("rtc_away_recheck", "probe_threw");
      if (this.#t.get(machineName) === entry) this.#t.delete(machineName);
    }
  }
}
export { AwayRecheck };
