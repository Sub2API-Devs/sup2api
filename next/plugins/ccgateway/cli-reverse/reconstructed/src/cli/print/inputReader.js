/**
 * cli/print/inputReader.ts
 *
 * 2.1.316 新增：可暂停的输入读取器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:104839-106450 placement
/**
 * stdin/SDK 输入读取器：支持把消息临时放回、在请求发出时暂停读取，供 print 主循环拉取。
 */
let HeldInputReader; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:104839", () => {
  HeldInputReader = class HeldInputReader {
    setAside = [];
    pull;
    ended = false;
    source;
    isRequestOut;
    onRequestOut;
    constructor({ source, isRequestOut, onRequestOut }) {
      this.source = source;
      this.isRequestOut = isRequestOut;
      this.onRequestOut = onRequestOut;
    }
    [Symbol.asyncIterator]() {
      return this;
    }
    next() {
      if (this.setAside.length > 0)
        return Promise.resolve({
          done: false,
          value: this.setAside.shift(),
        });
      if (this.ended)
        return Promise.resolve({
          done: true,
          value: undefined,
        });
      let pulled = this.pull ?? this.source.next();
      this.pull = undefined;
      pulled.then(
        (item) => {
          this.ended ||= item.done === true;
        },
        () => {},
      );
      return pulled;
    }
    return() {
      this.ended = true;
      this.setAside.length = 0;
      let closePromise = this.source.return?.();
      if (this.pull === undefined && closePromise !== undefined) return closePromise;
      closePromise?.catch((error) =>
        logForDebugging(`the input's reader failed to close: ${errorMessage(error)}`, {
          level: "error",
        }),
      );
      return Promise.resolve({
        done: true,
        value: undefined,
      });
    }
    hasEnded() {
      return this.ended;
    }
    hasSetAside() {
      return this.setAside.length > 0;
    }
    async readWhile(fn, { onSetAside = () => {}, onEnded = () => {} } = {}) {
      if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_breezy_haven", true)) return fn();
      let wake = () => {};
      let requested = false;
      let unsubscribe = this.onRequestOut(() => {
        requested = true;
        wake();
      });
      let result;
      try {
        result = fn();
      } catch (error) {
        unsubscribe();
        throw error;
      }
      let done = false;
      let donePromise = result.then(
        () => {
          done = true;
        },
        () => {
          done = true;
        },
      );
      let startTime = performance.now();
      let didPull = false;
      let frameCount = 0;
      try {
        for (let value of this.setAside) onSetAside(value);
        if (this.ended) onEnded();
        while (!done) {
          if (this.ended || !requested || !this.isRequestOut()) {
            await Promise.race([
              donePromise,
              new Promise((resolve) => {
                wake = resolve;
              }),
            ]);
            continue;
          }
          didPull = true;
          this.pull ??= this.source.next();
          let pull = this.pull;
          if (
            !(await Promise.race([
              donePromise.then(() => false),
              pull.then(
                () => true,
                () => true,
              ),
            ]))
          )
            break;
          this.pull = undefined;
          let item = await pull;
          if (item.done === true) {
            this.ended = true;
            onEnded();
            continue;
          }
          frameCount++;
          this.setAside.push(item.value);
          onSetAside(item.value);
        }
      } finally {
        unsubscribe();
        if (didPull)
          logForDiagnosticsNoPII("info", "cli_loop_read_while_held", {
            held_ms: Math.round(performance.now() - startTime),
            frames_set_aside: frameCount,
            input_ended: this.ended,
          });
      }
      return result;
    }
  };
});
export { HeldInputReader };
