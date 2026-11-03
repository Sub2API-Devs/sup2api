/**
 * tasks/taskState.ts
 *
 * 任务前后台状态（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cgs3vg0v.js (4)
 * attribution: placement 4
 */
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";

//@ chunk-cgs3vg0v.js:262-506 placement
function emptySpawnStats() {
  return {
    spawned: 0,
    requested: { background: 0, foreground: 0, unset: 0 },
    started_in_background: 0,
    max_depth: 0,
    spawned_by_subagents: 0,
    completed: 0,
    failed: 0,
    killed: { parent: 0, user: 0, system: 0 },
    refused: { depth_limit: 0, concurrency_limit: 0, budget: 0 },
  };
}
/**
 * 记录一次子代理生成的结局（完成、失败、被杀），每次生成只记一次，完成后取消时改记为被杀。
 */
//@ chunk-cgs3vg0v.js:506-874 placement
class SpawnOutcomeRecorder {
  #e;
  #t;
  constructor(e) {
    this.#e = e;
  }
  completed() {
    if (this.#n("completed")) this.#e.completed += 1;
  }
  failed() {
    if (this.#n("failed")) this.#e.failed += 1;
  }
  killed(e) {
    if (this.#n("killed")) this.#e.killed[e ?? "user"] += 1;
  }
  cancelledAfterCompletion() {
    if (this.#t === "completed") ((this.#e.completed -= 1), (this.#t = void 0));
    this.killed("user");
  }
  #n(e) {
    if (this.#t !== void 0) return !1;
    return ((this.#t = e), !0);
  }
}
/**
 * 子代理生成统计：生成数、请求方式、后台启动、按类型计数、最大深度、拒绝数，可快照与重置。
 */
//@ chunk-cgs3vg0v.js:874-1476 placement
class SpawnStatsTracker {
  #e = emptySpawnStats();
  #t = new Map();
  recordSpawn(e) {
    let stats = this.#e;
    if (
      ((stats.spawned += 1),
      (stats.requested[
        e.runInBackground === void 0 ? "unset" : e.runInBackground ? "background" : "foreground"
      ] += 1),
      e.runsInBackground)
    )
      stats.started_in_background += 1;
    if (
      (this.#t.set(e.agentType, (this.#t.get(e.agentType) ?? 0) + 1),
      (stats.max_depth = Math.max(stats.max_depth, e.depth)),
      e.depth > 1)
    )
      stats.spawned_by_subagents += 1;
    return new SpawnOutcomeRecorder(stats);
  }
  recordRefused(e) {
    this.#e.refused[e] += 1;
  }
  snapshot() {
    let e = this.#e;
    return {
      ...e,
      requested: { ...e.requested },
      killed: { ...e.killed },
      refused: { ...e.refused },
      by_type: Object.fromEntries(this.#t),
    };
  }
  reset() {
    (Object.assign(this.#e, emptySpawnStats()), this.#t.clear());
  }
}
//@ chunk-cgs3vg0v.js:1476-1502 placement
var R7e = new SessionRootSlot(() => new SpawnStatsTracker());

export { R7e };
