/**
 * ink/eventLoopLag.ts
 *
 * 2.1.316 新增：事件循环延迟监视器（引用计数开启、按 50 ms 定时器判定迟到），从 line-width-cache.ts 拆出。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2avr6cej.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { env } from "../utils/env.js";
import { ESC_FLUSH_TIMEOUT_MS } from "./stdinReader.js";
import { logEvent } from "../services/analytics/index.js";

//@ chunk-2avr6cej.js:174561-174670 placement
var REAL_CLOCK = {
  now: () => performance.now(),
  after: (ms, fn) => {
    let timer = setTimeout(fn, ms);
    timer.unref();
    return () => clearTimeout(timer);
  },
};
//@ chunk-2avr6cej.js:174670-175058 placement
/**
 * 监测事件循环延迟（引用计数式开启）。
 */
class EventLoopLagWatcher {
  #e;
  #r = 0;
  #t = null;
  #n = 0;
  #i = false;
  constructor(clock = REAL_CLOCK) {
    this.#e = clock;
  }
  watch() {
    this.#r++;
    if (this.#t === null) {
      this.#i = false;
      this.#o(this.#e.now());
    }
    let isActive = true;
    return () => {
      if (!isActive) return;
      isActive = false;
      if (--this.#r === 0) {
        this.#t?.();
        this.#t = null;
      }
    };
  }
  isLate(now) {
    return this.#t !== null && (this.#i || now - this.#n >= ESC_FLUSH_TIMEOUT_MS);
  }
  #o(base) {
    this.#n = base + ESC_FLUSH_TIMEOUT_MS;
    this.#t = this.#e.after(ESC_FLUSH_TIMEOUT_MS, this.#l);
  }
  #l = () => {
    let now = this.#e.now();
    this.#i = now - this.#n >= ESC_FLUSH_TIMEOUT_MS;
    this.#o(now);
  };
}
export { EventLoopLagWatcher };
