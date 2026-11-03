/**
 * cli/print/inputReader.ts
 *
 * 2.1.316 新增：可暂停的输入读取器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (1)
 * attribution: placement 1
 */
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";

//@ chunk-tyg7f3ek.js:81434-83041 placement
/**
 * stdin/SDK 输入读取器：支持把消息临时放回、在请求发出时暂停读取，供 print 主循环拉取。
 */
class HeldInputReader {
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
    let e = this.pull ?? this.source.next();
    this.pull = undefined;
    e.then(
      (n) => {
        this.ended ||= n.done === true;
      },
      () => {},
    );
    return e;
  }
  return() {
    this.ended = true;
    this.setAside.length = 0;
    let e = this.source.return?.();
    if (this.pull === undefined && e !== undefined) return e;
    e?.catch((error) =>
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
  async readWhile(e, { onSetAside: n = () => {}, onEnded: r = () => {} } = {}) {
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_breezy_haven", true)) return e();
    let s = () => {};
    let h = false;
    let y = this.onRequestOut(() => {
      h = true;
      s();
    });
    let S;
    try {
      S = e();
    } catch (error) {
      y();
      throw error;
    }
    let R = false;
    let w = S.then(
      () => {
        R = true;
      },
      () => {
        R = true;
      },
    );
    let startTime = performance.now();
    let L = false;
    let q = 0;
    try {
      for (let x of this.setAside) n(x);
      if (this.ended) r();
      while (!R) {
        if (this.ended || !h || !this.isRequestOut()) {
          await Promise.race([
            w,
            new Promise((resolve) => {
              s = resolve;
            }),
          ]);
          continue;
        }
        L = true;
        this.pull ??= this.source.next();
        let pull = this.pull;
        if (
          !(await Promise.race([
            w.then(() => false),
            pull.then(
              () => true,
              () => true,
            ),
          ]))
        )
          break;
        this.pull = undefined;
        let Z = await pull;
        if (Z.done === true) {
          this.ended = true;
          r();
          continue;
        }
        q++;
        this.setAside.push(Z.value);
        n(Z.value);
      }
    } finally {
      y();
      if (L)
        logForDiagnosticsNoPII("info", "cli_loop_read_while_held", {
          held_ms: Math.round(performance.now() - startTime),
          frames_set_aside: q,
          input_ended: this.ended,
        });
    }
    return S;
  }
}
export { HeldInputReader };
