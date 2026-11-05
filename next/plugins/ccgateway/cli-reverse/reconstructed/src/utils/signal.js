/**
 * utils/signal.ts
 *
 * 简单的订阅/发布信号（subscribe 返回退订函数）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/signal.ts
 * pieces: chunk-ndkzc8d3.js (1), chunk-r4yj9pae.js (1)
 * attribution: callgraph-witnessed 1, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { bindAsyncResource } from "./asyncResourceBind.js";

//@ chunk-ndkzc8d3.js:772-1033 callgraph-witnessed (2.1.88 match: createSignal, 0.346)
/**
 * 创建简单信号：subscribe 返回退订函数，emit 依次调用所有监听者，聚合监听者抛出的错误。
 */
function createSignal() {
  let listeners = new Set();
  return {
    subscribe(listener) {
      let boundListener = bindAsyncResource(listener);
      listeners.add(boundListener);
      return () => {
        listeners.delete(boundListener);
      };
    },
    emit(...args) {
      let errors;
      for (let listener of listeners)
        try {
          listener(...args);
        } catch (error) {
          (errors ??= []).push(error);
        }
      if (errors) throw errors.length === 1 ? errors[0] : AggregateError(errors, "Signal listener(s) threw");
    },
    clear() {
      listeners.clear();
    },
  };
}
//@ chunk-r4yj9pae.js:191-300 placement
/**
 * 创建惰性信号代理：subscribe/emit/clear 转发给按需获取的信号对象。
 */
function createLazySignal(getSignal) {
  return {
    subscribe(listener) {
      return getSignal().subscribe(listener);
    },
    emit(...args) {
      getSignal().emit(...args);
    },
    clear() {
      getSignal().clear();
    },
  };
}
export { createSignal, createLazySignal };
