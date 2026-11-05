/**
 * utils/bunEngineProbe.ts
 *
 * 探测当前 Bun 引擎是否支持 pinned 属性、thenable await 与禁用 eval 等语义，产出 not_bun/passed/both/threw_* 结果供 Code 模式决定是否可用（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2canq4nz.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import * as vmModule from "vm";
import { isStandaloneExecutable, alwaysTrue } from "./slowOperations.js";
import { importMetaRequire } from "../../runtime/bun-runtime.js";
import { SubAgentContext } from "../components/CtrlOToExpand.js";

//@ chunk-2canq4nz.js:323-1351 placement
/**
 * 在 vm 里探测 pinned 属性重定义、派生类字段与 thenable 接收者是否按预期抛 TypeError 的脚本源码。探测 await 之后 thenable 的 resolve 是否仍是 Function.prototype 的脚本源码。引擎探测结果的内存缓存。
 */
var GLOBAL_DESCRIPTOR_SNIPPET = `(() => {
  'use strict'
  Object.defineProperty(globalThis, 'pinned', { value: 0 })
  const isOwn = e => Object.getPrototypeOf(e) === TypeError.prototype
  let first = false
  let second = false
  let third = true
  try {
    Object.defineProperty(globalThis, 'pinned', { value: 1 })
  } catch (e) {
    first = isOwn(e)
  }
  try {
    class Base { constructor() { return globalThis } }
    class Derived extends Base { pinned = 1 }
    new Derived()
  } catch (e) {
    second = isOwn(e)
  }
  try {
    let receiver
    Object.defineProperty(globalThis, 'getter', { get() { receiver = this } })
    void globalThis.getter
    Object.preventExtensions(receiver)
    Object.defineProperty(globalThis, 'fresh', { value: 1 })
  } catch (e) {
    third = isOwn(e)
  }
  return first && second && third
})()`;
var THENABLE_AFTER_AWAIT_SNIPPET = `(pending, report) => {
  void (async () => {
    await pending
    await {
      then(resolve) {
        report(Object.getPrototypeOf(resolve) === Function.prototype)
        resolve()
      },
    }
  })()
}`;
var cachedCheckResult;
//@ chunk-2canq4nz.js:1351-1383 placement
/**
 * 取（并缓存）引擎探测结果；Code 模式是否可用的判定依赖它必须为 passed。
 */
function engineCheckResult() {
  cachedCheckResult ??= runEngineChecks();
  return cachedCheckResult;
}
//@ chunk-2canq4nz.js:1383-1426 placement
/**
 * 判定探测结论不是 passed；非独立可执行文件时恒为真。
 */
function doesEngineResultHold(checkResult) {
  return checkResult !== "passed" && !isStandaloneExecutable();
}
//@ chunk-2canq4nz.js:1426-1459 placement
/**
 * 判定引擎探测是否已经有结论。
 */
function isEngineCheckDone() {
  return cachedCheckResult !== undefined;
}
//@ chunk-2canq4nz.js:1459-2121 placement
/**
 * 实际执行引擎探测，返回 not_bun/passed/both/thenable_after_await/rejected_definitions/threw_* 等结论。
 */
function runEngineChecks() {
  if (!alwaysTrue()) return "not_bun";
  try {
    let { drainMicrotasks } = importMetaRequire("bun:jsc");
    let context = SubAgentContext(
      {
        __proto__: null,
      },
      {
        codeGeneration: {
          strings: false,
          wasm: false,
        },
      },
    );
    let descriptorsHold = vmModule.runInContext(GLOBAL_DESCRIPTOR_SNIPPET, context) === true;
    let thenableResult;
    let { promise, resolve } = Promise.withResolvers();
    vmModule.runInContext(THENABLE_AFTER_AWAIT_SNIPPET, context)(promise, (result) => {
      thenableResult = result;
    });
    queueMicrotask(resolve);
    drainMicrotasks();
    let thenableHolds = thenableResult === true;
    if (descriptorsHold && thenableHolds) return "passed";
    if (!descriptorsHold && !thenableHolds) return "both";
    return descriptorsHold ? "thenable_after_await" : "rejected_definitions";
  } catch (error) {
    switch (typeof error === "object" && error !== null && "name" in error && error.name) {
      case "TypeError":
        return "threw_type_error";
      case "ReferenceError":
        return "threw_reference_error";
      case "SyntaxError":
        return "threw_syntax_error";
      case "RangeError":
        return "threw_range_error";
      default:
        return "threw_other";
    }
  }
}
export { isEngineCheckDone, engineCheckResult, doesEngineResultHold };
