/**
 * plugins/functionHooks/personHold.ts
 *
 * 2.1.316 新增：插件等待用户（person）响应时的暂停管理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { identity as identity_2 } from "../../utils/identity.js";
import { createSignal } from "../../utils/signal.js";

//@ chunk-e6aww6q8.js:779592-779772 placement
function createTurnBindings() {
  let e = new Map();
  return {
    bind: (n, turnId, started) => {
      e.set(n, {
        turnId,
        started,
      });
    },
    release: (n, r) => {
      if (e.get(n)?.turnId === r) e.delete(n);
    },
    current: (n) => e.get(n),
    clear: () => {
      e.clear();
    },
  };
}
//@ chunk-e6aww6q8.js:779772-779806 placement
/**
 * 回合绑定表
 */
var turnBindings = identity_2(createTurnBindings(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:779806-779822 placement
/**
 * 绑定回合
 */
var bindTurn = turnBindings.bind;
//@ chunk-e6aww6q8.js:779822-780079 placement
/**
 * 当前回合槽：bind 记录回合 id、开始 Promise、是否由人发起与取消函数，release 只释放同一回合。
 */
function createCurrentTurnSlot() {
  let e;
  return {
    bind: (n) => {
      let r = false;
      e = {
        turnId: n.turnId,
        started: n.started ?? Promise.resolve(),
        isPersonStarted: n.startedBy === "person",
        cancelled: () => r,
        cancel: () => {
          if (r) return;
          r = true;
          n.abort();
        },
      };
    },
    release: (n) => {
      if (e?.turnId === n) e = undefined;
    },
    current: () => e,
  };
}
//@ chunk-e6aww6q8.js:780079-780155 placement
/**
 * 当前回合槽
 */
var currentTurnSlot = identity_2(createCurrentTurnSlot(), (e) => {
  let n = e.current();
  if (n !== undefined) e.release(n.turnId);
});
//@ chunk-e6aww6q8.js:780155-780189 placement
/**
 * 回合释放信号
 */
var turnFinishedSignal = identity_2(createSignal(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:780227-780246 placement
var release_2 = turnBindings.release;
//@ chunk-e6aww6q8.js:780246-780257 placement
/**
 * 回合因用户中止而释放时随释放信号发出的标志 true；正常结束发 false。
 */
var TURN_ABORTED_FLAG = true;
//@ chunk-e6aww6q8.js:780257-780291 placement
/**
 * 回合释放信号
 */
var turnEndedSignal = identity_2(createSignal(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:780291-780371 placement
/**
 * 若是当前回合则释放并通知
 */
function releaseTurnIfCurrent(e, n) {
  let r = currentTurnSlot.current()?.turnId === e;
  currentTurnSlot.release(e);
  if (r) turnEndedSignal.emit(n);
}
//@ chunk-e6aww6q8.js:780371-780390 placement
/**
 * 当前回合绑定
 */
var currentTurnBinding = turnBindings.current;
//@ chunk-e6aww6q8.js:780390-780409 placement
/**
 * 当前回合
 */
var currentTurn = currentTurnSlot.current;
export {
  currentTurn,
  currentTurnBinding,
  releaseTurnIfCurrent,
  bindTurn,
  release_2,
  TURN_ABORTED_FLAG,
  currentTurnSlot,
  turnFinishedSignal,
  turnEndedSignal,
};
