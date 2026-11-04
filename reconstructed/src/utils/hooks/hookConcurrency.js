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
import { AsyncLocalStorage } from "async_hooks";
import { KeyedSemaphore, acquireSeat } from "../keyedSemaphore.js";
import { HostScoped } from "../hostScoped.js";
import { all } from "../generators.js";
import { yieldToEventLoop } from "../../native-ts/file-index/index.js";
import { createCombinedAbortSignal } from "../combinedAbortSignal.js";
import { MAX_TIMER_DELAY_MS } from "../timerDelayClamp.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3383683-3383722 placement
/**
 * 钩子并发常量：并发槽、等待上限、过期槽、最小超时秒数与定时器余量。
 */
var MAX_CONCURRENT_HOOKS = 12;
var MAX_WAITING_HOOKS = 24;
var MAX_OVERDUE_SLOTS = 12;
var MIN_HOOK_TIMEOUT_S = 1;
var TIMER_SLACK_MS = 1e4;
//@ chunk-e6aww6q8.js:3383722-3383761 placement
class HookSlotState {
  slots = new KeyedSemaphore();
  holder = new AsyncLocalStorage();
}
//@ chunk-e6aww6q8.js:3383761-3383832 placement
/**
 * 宿主隔离的钩子并发槽状态注册表与两个槽键名。
 */
var hookSlotsRegistry; // deferred: uses HookSlotState of its import cycle while loading; runs once the cycle is complete
var WANTED_SLOT_KEY;
var OVERDUE_SLOT_KEY;
deferInit("chunk-e6aww6q8.js:3383761", () => {
  hookSlotsRegistry = new HostScoped(() => new HookSlotState());
  WANTED_SLOT_KEY = "model hooks";
  OVERDUE_SLOT_KEY = "overdue model hooks";
});
//@ chunk-e6aww6q8.js:3383832-3383890 placement
/**
 * 判断钩子是否为 consult 类型（prompt/agent）。
 */
function isConsultHook(hook) {
  return hook.type === "prompt" || hook.type === "agent";
}
//@ chunk-e6aww6q8.js:3383890-3383955 placement
/**
 * 计算钩子超时毫秒数（配置秒数，最小 1 秒）。
 */
function hookTimeoutMs(hook, defaultMs) {
  return hook.timeout ? Math.max(hook.timeout, MIN_HOOK_TIMEOUT_S) * 1000 : defaultMs;
}
//@ chunk-e6aww6q8.js:3383955-3384375 placement
/**
 * 限制并发地运行一组 hook，按完成顺序产出结果，支持中止。
 */
async function* runHooksWithConcurrencyLimit(runs, limitOf, options) {
  let abortController = new AbortController();
  let mapped = runs.map((run, runIndex) => limitOf(runIndex));
  let flattened = runs.flatMap((run, runIndex) => {
    let limitMs = mapped[runIndex];
    return limitMs === undefined
      ? []
      : [
          {
            run,
            limitMs,
          },
        ];
  });
  let resolved = Promise.resolve();
  try {
    yield* flattened.length <= 1
      ? all(
          runs.map((run, runIndex) => {
            let limitMs = mapped[runIndex];
            return limitMs === undefined
              ? run
              : wrapWithConcurrencySlot(run, limitMs, options, abortController.signal);
          }),
        )
      : all([
          ...runs.filter((run, runIndex) => mapped[runIndex] === undefined),
          all(
            flattened.map(async function* ({ run, limitMs }) {
              resolved = resolved.then(yieldToEventLoop);
              await resolved;
              yield* wrapWithConcurrencySlot(run, limitMs, options, abortController.signal);
            }),
            MAX_CONCURRENT_HOOKS,
          ),
        ]);
  } finally {
    abortController.abort();
  }
}
//@ chunk-e6aww6q8.js:3384375-3384987 placement
/**
 * 给 hook 迭代器包上并发槽：首次取值时获取槽位，已持有时直接继续。
 */
function wrapWithConcurrencySlot(iterator, limitMs, { slots, signal, limitMs: limitMs_2 }, signal_2) {
  let started = false;
  let wrapped = {
    next: () => {
      if (started) return iterator.next();
      started = true;
      if (signal_2.aborted) return iterator.return();
      if (slots.holder.getStore()?.isHeld === true) return iterator.next();
      if (!slots.slots.wouldWait(WANTED_SLOT_KEY, MAX_WAITING_HOOKS))
        return runHoldingSlot(iterator, slots, slots.slots.occupy(WANTED_SLOT_KEY), limitMs);
      let { signal: signal_3, cleanup } = createCombinedAbortSignal(signal, {
        signalB: signal_2,
      });
      return acquireSeat(slots.slots, WANTED_SLOT_KEY, MAX_WAITING_HOOKS, signal_3, {
        waitLimitMs: limitMs_2,
      })
        .then((seat) =>
          seat?.seated === false
            ? slots.slots.acquire(OVERDUE_SLOT_KEY, MAX_OVERDUE_SLOTS, signal_3)
            : seat?.release,
        )
        .then((release) => {
          cleanup();
          if (signal_2.aborted) {
            release?.();
            return iterator.return();
          }
          return runHoldingSlot(iterator, slots, release, limitMs);
        });
    },
    return: (value) => iterator.return(value),
    throw: (error) => iterator.throw(error),
    [Symbol.asyncIterator]: () => wrapped,
    [Symbol.asyncDispose]: () => iterator[Symbol.asyncDispose](),
  };
  return wrapped;
}
//@ chunk-e6aww6q8.js:3384987-3385228 placement
function runHoldingSlot(iterator, slots, release, limitMs) {
  if (release === undefined) return iterator.next();
  let held = {
    isHeld: true,
  };
  let releaseSlot = () => {
    if (held.isHeld) {
      held.isHeld = false;
      release();
    }
  };
  let timer = setTimeout(
    releaseSlot,
    Math.min(limitMs, MAX_TIMER_DELAY_MS - TIMER_SLACK_MS) + TIMER_SLACK_MS,
  );
  timer.unref?.();
  let releaseAll = () => {
    clearTimeout(timer);
    releaseSlot();
  };
  let next = slots.holder.run(held, () => iterator.next());
  next.then(releaseAll, releaseAll);
  return next;
}
export {
  isConsultHook,
  hookTimeoutMs,
  MAX_CONCURRENT_HOOKS,
  runHooksWithConcurrencyLimit,
  hookSlotsRegistry,
};
