/**
 * query/replTurnLedger.ts
 *
 * REPL 的轮次台账：按 tool_use_id 记所属轮次，按 signal 遗忘，结束时把轮次与 loop 记为已结束（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2tregda9.js (1)
 * attribution: placement 1
 */

//@ chunk-2tregda9.js:191-491 placement
/**
 * REPL 轮次台账：记录 tool_use_id 属于哪个轮次，按 signal 遗忘，结束时把轮次与 loop 标为已结束。
 */
class TurnRegistry {
  turnOf = new Map();
  endedTurns = new WeakSet();
  endedLoops = new Set();
  add(toolUseId, turn) {
    this.turnOf.set(toolUseId, turn);
  }
  forget(signal) {
    for (let [rest, turn] of this.turnOf) if (turn.signal === signal) this.turnOf.delete(rest);
  }
  end(toolUseId, loopId) {
    let turn = toolUseId === undefined ? undefined : this.turnOf.get(toolUseId);
    if (turn !== undefined) this.endedTurns.add(turn.signal);
    this.endedLoops.add(loopId);
    return turn;
  }
}
export { TurnRegistry };
