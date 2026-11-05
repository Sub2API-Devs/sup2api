/**
 * tasks/taskState.ts
 *
 * 任务前后台状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-05hzzra9.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-05hzzra9.js:262-506 placement
function emptySpawnStats() {
  return {
    spawned: 0,
    requested: {
      background: 0,
      foreground: 0,
      unset: 0,
    },
    started_in_background: 0,
    max_depth: 0,
    spawned_by_subagents: 0,
    completed: 0,
    failed: 0,
    killed: {
      parent: 0,
      user: 0,
      system: 0,
    },
    refused: {
      depth_limit: 0,
      concurrency_limit: 0,
      budget: 0,
    },
  };
}
//@ chunk-05hzzra9.js:506-874 placement
/**
 * 记录一次子代理生成的结局（完成、失败、被杀），每次生成只记一次，完成后取消时改记为被杀。
 */
class SpawnOutcomeRecorder {
  #e;
  #t;
  constructor(stats) {
    this.#e = stats;
  }
  completed() {
    if (this.#n("completed")) this.#e.completed += 1;
  }
  failed() {
    if (this.#n("failed")) this.#e.failed += 1;
  }
  killed(killedBy) {
    if (this.#n("killed")) this.#e.killed[killedBy ?? "user"] += 1;
  }
  cancelledAfterCompletion() {
    if (this.#t === "completed") {
      this.#e.completed -= 1;
      this.#t = undefined;
    }
    this.killed("user");
  }
  #n(outcome) {
    if (this.#t !== undefined) return false;
    this.#t = outcome;
    return true;
  }
}
//@ chunk-05hzzra9.js:874-1476 placement
/**
 * 子代理生成统计：生成数、请求方式、后台启动、按类型计数、最大深度、拒绝数，可快照与重置。
 */
class SpawnStatsTracker {
  #e = emptySpawnStats();
  #t = new Map();
  recordSpawn(spawn) {
    let stats = this.#e;
    stats.spawned += 1;
    stats.requested[
      spawn.runInBackground === undefined ? "unset" : spawn.runInBackground ? "background" : "foreground"
    ] += 1;
    if (spawn.runsInBackground) stats.started_in_background += 1;
    this.#t.set(spawn.agentType, (this.#t.get(spawn.agentType) ?? 0) + 1);
    stats.max_depth = Math.max(stats.max_depth, spawn.depth);
    if (spawn.depth > 1) stats.spawned_by_subagents += 1;
    return new SpawnOutcomeRecorder(stats);
  }
  recordRefused(refusedReason) {
    this.#e.refused[refusedReason] += 1;
  }
  snapshot() {
    let stats = this.#e;
    return {
      ...stats,
      requested: {
        ...stats.requested,
      },
      killed: {
        ...stats.killed,
      },
      refused: {
        ...stats.refused,
      },
      by_type: Object.fromEntries(this.#t),
    };
  }
  reset() {
    Object.assign(this.#e, emptySpawnStats());
    this.#t.clear();
  }
}
//@ chunk-05hzzra9.js:1476-1502 placement
/**
 * 按会话保存的派生统计跟踪器。
 */
var spawnStatsSlots; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-05hzzra9.js:1476", () => {
  spawnStatsSlots = new SessionRootSlot(() => new SpawnStatsTracker());
});
export { spawnStatsSlots };
