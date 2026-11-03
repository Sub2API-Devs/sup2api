/**
 * utils/signal.ts
 *
 * 简单的订阅/发布信号（subscribe 返回退订函数）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/signal.ts
 * pieces: chunk-0777tkjc.js (1), chunk-ndmse9kj.js (1)
 * attribution: callgraph-witnessed 1, placement 1
 */
import { bindAsyncResource } from "./asyncResourceBind.js";

//@ chunk-0777tkjc.js:771-1031 callgraph-witnessed = createSignal (0.347)
/**
 * 创建简单信号：subscribe 返回退订函数，emit 依次调用所有监听者，聚合监听者抛出的错误。
 */
function createSignal() {
  let listeners = new Set();
  return {
    subscribe(n) {
      let r = bindAsyncResource(n);
      listeners.add(r);
      return () => {
        listeners.delete(r);
      };
    },
    emit(...args) {
      let r;
      for (let listener of listeners)
        try {
          listener(...args);
        } catch (error) {
          (r ??= []).push(error);
        }
      if (r) throw r.length === 1 ? r[0] : AggregateError(r, "Signal listener(s) threw");
    },
    clear() {
      listeners.clear();
    },
  };
}
//@ chunk-ndmse9kj.js:508-617 placement
/**
 * 创建惰性信号代理：subscribe/emit/clear 转发给按需获取的信号对象。
 */
function createLazySignal(e) {
  return {
    subscribe(n) {
      return e().subscribe(n);
    },
    emit(...n) {
      e().emit(...n);
    },
    clear() {
      e().clear();
    },
  };
}
export { createSignal, createLazySignal };
