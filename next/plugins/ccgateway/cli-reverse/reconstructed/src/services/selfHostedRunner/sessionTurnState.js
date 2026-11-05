/**
 * services/selfHostedRunner/sessionTurnState.ts
 *
 * self-hosted runner 的会话轮次状态解析：把控制面的 SESSION_TURN_STATE_* 映射为 busy/waiting/rest/lost 并解析 worker_epoch（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-asf5gh8x.js (2)
 * attribution: placement 2
 */
//@ chunk-asf5gh8x.js:36641-36908 placement
var TURN_STATE_STATUS_TEXT = {
  busy: "activity",
  waiting: "awaiting-action",
  rest: "turn-end",
  lost: "turn-end-deferred",
};
var IDLE_BUSY_BEATS = 3;
var BUSY_IDLE_MS = 120000;
var TURN_STATE_NAMES = new Map([
  ["SESSION_TURN_STATE_BUSY", "busy"],
  ["SESSION_TURN_STATE_WAITING", "waiting"],
  ["SESSION_TURN_STATE_REST", "rest"],
  ["SESSION_TURN_STATE_LOST", "lost"],
]);
//@ chunk-asf5gh8x.js:36908-37153 placement
/**
 * 把控制面下发的轮次状态对象（state/worker_epoch/act）解析成内部结果；services/selfHostedRunner/selfHostedRunner 使用。
 */
function parseTurnSignal(turnSignal) {
  if (typeof turnSignal !== "object" || turnSignal === null) return;
  let { state, worker_epoch: workerEpoch, act } = turnSignal;
  let turnState = TURN_STATE_NAMES.get(state);
  if (turnState === undefined) return;
  let epochText =
    typeof workerEpoch === "string" || typeof workerEpoch === "number" ? String(workerEpoch) : "";
  return {
    state: turnState,
    workerEpoch: /^\d+$/.test(epochText) ? epochText : "0",
    act: act === true,
  };
}
export { parseTurnSignal, BUSY_IDLE_MS, IDLE_BUSY_BEATS, TURN_STATE_STATUS_TEXT };
