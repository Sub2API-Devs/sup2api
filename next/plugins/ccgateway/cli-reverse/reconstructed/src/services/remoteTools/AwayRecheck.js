/**
 * services/remoteTools/AwayRecheck.ts
 *
 * 2.1.316 新增：机器离开后的重新检查。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5vfqv7sk.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../../utils/debug.js";
import { backoffDelayMs } from "../../utils/sleep.js";
import { countWhere } from "../../utils/collections.js";
import { logError } from "../../utils/log.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-5vfqv7sk.js:33544-33580 placement
/**
 * 机器离开后重新检查的延迟序列与抖动比例。
 */
var AWAY_RECHECK_DELAYS_MS = [30000, 120000, 300000];
var AWAY_RECHECK_JITTER_RATIO = 0.2;
//@ chunk-5vfqv7sk.js:33580-35180 placement
class AwayRecheck {
  #e = undefined;
  #n = new Map();
  #t = new AbortController();
  #o = [];
  start(deps) {
    if (this.#e !== undefined) return;
    this.#e = deps;
    this.#t = new AbortController();
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
      this.#n.has(machineName) ||
      (this.#e?.registry.awayEpisode(machineName)?.toldModel === false && this.#e.isEnabled())
    );
  }
  dispose() {
    for (let unsubscribe of this.#o) unsubscribe();
    for (let key of [...this.#n.keys()]) this.#r(key);
    this.#t.abort();
    this.#o = [];
    this.#e = undefined;
  }
  #r(machineName) {
    this.#n.get(machineName)?.cancelTimer();
    this.#n.delete(machineName);
  }
  #s(deps, machineName) {
    let episode = deps.registry.awayEpisode(machineName);
    if (episode === undefined || !deps.isEnabled() || this.#n.has(machineName)) return;
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
    let passedCount = countWhere(mapped, (dueAt) => dueAt <= nowMs);
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
    this.#n.set(machineName, entry);
  }
  async #a(deps, machineName, entry, startIndex) {
    try {
      if (this.#n.get(machineName) !== entry) return;
      if (!deps.isEnabled()) {
        this.#n.delete(machineName);
        return;
      }
      let alive = await deps.registry
        .entries()
        .find((host) => host.name === machineName)
        ?.transport.probeLive?.({
          signal: this.#t.signal,
        });
      if (alive === true) logFeatureOk("rtc_away_recheck");
      if (this.#n.get(machineName) !== entry) return;
      let nowMs = deps.registry.now();
      let index = entry.dueAts.findIndex((dueAt, index) => index > startIndex && dueAt > nowMs);
      if (alive === true || index === -1) {
        this.#n.delete(machineName);
        if (alive !== true) logFeatureSad("rtc_away_recheck", alive === false ? "exhausted" : "inconclusive");
        return;
      }
      this.#i(deps, machineName, entry.dueAts, index);
    } catch (error) {
      logError(error);
      logFeatureBad("rtc_away_recheck", "probe_threw");
      if (this.#n.get(machineName) === entry) this.#n.delete(machineName);
    }
  }
}
export { AwayRecheck };
