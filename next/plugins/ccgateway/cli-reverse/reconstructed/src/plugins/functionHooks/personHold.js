/**
 * plugins/functionHooks/personHold.ts
 *
 * 2.1.316 新增：插件等待用户（person）响应时的暂停管理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { identity as identity_2 } from "../../utils/identity.js";
import { createSignal } from "../../utils/signal.js";

//@ chunk-5xgkngpb.js:790696-790876 placement
function createTurnBindings() {
  let bindingsById = new Map();
  return {
    bind: (id, turnId, started) => {
      bindingsById.set(id, {
        turnId,
        started,
      });
    },
    release: (id, turnId) => {
      if (bindingsById.get(id)?.turnId === turnId) bindingsById.delete(id);
    },
    current: (id) => bindingsById.get(id),
    clear: () => {
      bindingsById.clear();
    },
  };
}
//@ chunk-5xgkngpb.js:790876-790910 placement
/**
 * 回合绑定表
 */
var turnBindings = identity_2(createTurnBindings(), (bindings) => {
  bindings.clear();
});
//@ chunk-5xgkngpb.js:790910-790926 placement
/**
 * 绑定回合
 */
var bindTurn = turnBindings.bind;
//@ chunk-5xgkngpb.js:790926-791183 placement
/**
 * 当前回合槽：bind 记录回合 id、开始 Promise、是否由人发起与取消函数，release 只释放同一回合。
 */
function createCurrentTurnSlot() {
  let current;
  return {
    bind: (turn) => {
      let isCancelled = false;
      current = {
        turnId: turn.turnId,
        started: turn.started ?? Promise.resolve(),
        isPersonStarted: turn.startedBy === "person",
        cancelled: () => isCancelled,
        cancel: () => {
          if (isCancelled) return;
          isCancelled = true;
          turn.abort();
        },
      };
    },
    release: (turnId) => {
      if (current?.turnId === turnId) current = undefined;
    },
    current: () => current,
  };
}
//@ chunk-5xgkngpb.js:791183-791259 placement
/**
 * 当前回合槽
 */
var currentTurnSlot = identity_2(createCurrentTurnSlot(), (slot) => {
  let turn = slot.current();
  if (turn !== undefined) slot.release(turn.turnId);
});
//@ chunk-5xgkngpb.js:791259-791293 placement
/**
 * 回合释放信号
 */
var turnFinishedSignal = identity_2(createSignal(), (signal) => {
  signal.clear();
});
//@ chunk-5xgkngpb.js:791331-791350 placement
var release_2 = turnBindings.release;
//@ chunk-5xgkngpb.js:791350-791361 placement
/**
 * 回合因用户中止而释放时随释放信号发出的标志 true；正常结束发 false。
 */
var TURN_ABORTED_FLAG = true;
//@ chunk-5xgkngpb.js:791361-791395 placement
/**
 * 回合释放信号
 */
var turnEndedSignal = identity_2(createSignal(), (signal) => {
  signal.clear();
});
//@ chunk-5xgkngpb.js:791395-791475 placement
/**
 * 若是当前回合则释放并通知
 */
function releaseTurnIfCurrent(turnId, payload) {
  let isCurrent = currentTurnSlot.current()?.turnId === turnId;
  currentTurnSlot.release(turnId);
  if (isCurrent) turnEndedSignal.emit(payload);
}
//@ chunk-5xgkngpb.js:791475-791494 placement
/**
 * 当前回合绑定
 */
var currentTurnBinding = turnBindings.current;
//@ chunk-5xgkngpb.js:791494-791513 placement
/**
 * 当前回合
 */
var currentTurn = currentTurnSlot.current;
export {
  currentTurn,
  currentTurnSlot,
  turnFinishedSignal,
  turnEndedSignal,
  releaseTurnIfCurrent,
  TURN_ABORTED_FLAG,
  currentTurnBinding,
  bindTurn,
  release_2,
};
