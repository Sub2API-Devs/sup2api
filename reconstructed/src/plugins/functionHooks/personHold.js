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
import { ge } from "../../utils/identity.js";
import { createSignal } from "../../utils/signal.js";

//@ chunk-e6aww6q8.js:779592-779772 placement
function createTurnBindings() {
  let e = new Map();
  return {
    bind: (n, r, s) => {
      e.set(n, { turnId: r, started: s });
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
var Az = ge(createTurnBindings(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:779806-779822 placement
var ZNi = Az.bind;
/**
 * 当前回合槽：bind 记录回合 id、开始 Promise、是否由人发起与取消函数，release 只释放同一回合。
 */
//@ chunk-e6aww6q8.js:779822-780079 placement
function createCurrentTurnSlot() {
  let e;
  return {
    bind: (n) => {
      let r = !1;
      e = {
        turnId: n.turnId,
        started: n.started ?? Promise.resolve(),
        isPersonStarted: n.startedBy === "person",
        cancelled: () => r,
        cancel: () => {
          if (r) return;
          ((r = !0), n.abort());
        },
      };
    },
    release: (n) => {
      if (e?.turnId === n) e = void 0;
    },
    current: () => e,
  };
}
//@ chunk-e6aww6q8.js:780079-780155 placement
var $0 = ge(createCurrentTurnSlot(), (e) => {
  let n = e.current();
  if (n !== void 0) e.release(n.turnId);
});
//@ chunk-e6aww6q8.js:780155-780189 placement
var vWe = ge(createSignal(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:780227-780246 placement
var release_2 = Az.release;
//@ chunk-e6aww6q8.js:780246-780257 placement
var n$i = !0;
//@ chunk-e6aww6q8.js:780257-780291 placement
var EWe = ge(createSignal(), (e) => {
  e.clear();
});
//@ chunk-e6aww6q8.js:780291-780371 placement
function W1o(e, n) {
  let r = $0.current()?.turnId === e;
  if (($0.release(e), r)) EWe.emit(n);
}
//@ chunk-e6aww6q8.js:780371-780390 placement
var G1o = Az.current;
//@ chunk-e6aww6q8.js:780390-780409 placement
var vbe = $0.current;

export { vbe, G1o, W1o, ZNi, release_2, n$i, $0, vWe, EWe };
