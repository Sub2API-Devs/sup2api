/**
 * utils/hooks/hookConcurrency.ts
 *
 * 2.1.316 新增：钩子并发控制
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import {
  AsyncLocalStorage,
  AsyncLocalStorage as AsyncLocalStorage_2,
  AsyncLocalStorage as AsyncLocalStorage_3,
  AsyncLocalStorage as AsyncLocalStorage_4,
  AsyncLocalStorage as AsyncLocalStorage_5,
  AsyncLocalStorage as AsyncLocalStorage_6,
  AsyncLocalStorage as AsyncLocalStorage_7,
  AsyncLocalStorage as AsyncLocalStorage_8,
} from "async_hooks";
import { KeyedSemaphore, acquireSeat } from "../keyedSemaphore.js";
import { HostScoped } from "../hostScoped.js";
import { all } from "../generators.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import { ec } from "../timerDelayClamp.js";

//@ chunk-e6aww6q8.js:3383683-3383722 placement
var pnt = 12,
  mAn = 24,
  tMr = 12,
  nMr = 1,
  gAn = 1e4;
//@ chunk-e6aww6q8.js:3383722-3383761 placement
class _An {
  slots = new KeyedSemaphore();
  holder = new AsyncLocalStorage_6();
}
//@ chunk-e6aww6q8.js:3383761-3383832 placement
var SAn = new HostScoped(() => new _An()),
  fnt = "model hooks",
  oMr = "overdue model hooks";
//@ chunk-e6aww6q8.js:3383832-3383890 placement
function wU(e) {
  return e.type === "prompt" || e.type === "agent";
}
//@ chunk-e6aww6q8.js:3383890-3383955 placement
function aO(e, n) {
  return e.timeout ? Math.max(e.timeout, nMr) * 1000 : n;
}
/**
 * 限制并发地运行一组 hook，按完成顺序产出结果，支持中止。
 */
//@ chunk-e6aww6q8.js:3383955-3384375 placement
async function* runHooksWithConcurrencyLimit(e, n, r) {
  let abortController = new AbortController(),
    mapped = e.map((w, L) => n(L)),
    flattened = e.flatMap((w, L) => {
      let G = mapped[L];
      return G === void 0 ? [] : [{ run: w, limitMs: G }];
    }),
    resolved = Promise.resolve();
  try {
    yield* flattened.length <= 1
      ? all(
          e.map((w, L) => {
            let G = mapped[L];
            return G === void 0 ? w : wrapWithConcurrencySlot(w, G, r, abortController.signal);
          }),
        )
      : all([
          ...e.filter((w, L) => mapped[L] === void 0),
          all(
            flattened.map(async function* ({ run: run, limitMs: limitMs }) {
              ((resolved = resolved.then(yieldToEventLoop)),
                await resolved,
                yield* wrapWithConcurrencySlot(run, limitMs, r, abortController.signal));
            }),
            pnt,
          ),
        ]);
  } finally {
    abortController.abort();
  }
}
/**
 * 给 hook 迭代器包上并发槽：首次取值时获取槽位，已持有时直接继续。
 */
//@ chunk-e6aww6q8.js:3384375-3384987 placement
function wrapWithConcurrencySlot(iterator, n, { slots: slots, signal: signal, limitMs: limitMs }, signal_2) {
  let S = !1,
    w = {
      next: () => {
        if (S) return iterator.next();
        if (((S = !0), signal_2.aborted)) return iterator.return();
        if (slots.holder.getStore()?.isHeld === !0) return iterator.next();
        if (!slots.slots.wouldWait(fnt, mAn))
          return runHoldingSlot(iterator, slots, slots.slots.occupy(fnt), n);
        let { signal: signal_3, cleanup: cleanup } = createCombinedAbortSignal(signal, { signalB: signal_2 });
        return acquireSeat(slots.slots, fnt, mAn, signal_3, { waitLimitMs: limitMs })
          .then((q) => (q?.seated === !1 ? slots.slots.acquire(oMr, tMr, signal_3) : q?.release))
          .then((q) => {
            if ((cleanup(), signal_2.aborted)) return (q?.(), iterator.return());
            return runHoldingSlot(iterator, slots, q, n);
          });
      },
      return: (L) => iterator.return(L),
      throw: (L) => iterator.throw(L),
      [Symbol.asyncIterator]: () => w,
      [Symbol.asyncDispose]: () => iterator[Symbol.asyncDispose](),
    };
  return w;
}
//@ chunk-e6aww6q8.js:3384987-3385228 placement
function runHoldingSlot(e, n, r, s) {
  if (r === void 0) return e.next();
  let h = { isHeld: !0 },
    y = () => {
      if (h.isHeld) ((h.isHeld = !1), r());
    },
    S = setTimeout(y, Math.min(s, ec - gAn) + gAn);
  S.unref?.();
  let w = () => {
      (clearTimeout(S), y());
    },
    run = n.holder.run(h, () => e.next());
  return (run.then(w, w), run);
}

export { wU, aO, pnt, runHooksWithConcurrencyLimit, SAn };
