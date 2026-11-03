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

/**
 * stdin/SDK 输入读取器：支持把消息临时放回、在请求发出时暂停读取，供 print 主循环拉取。
 */
//@ chunk-tyg7f3ek.js:81434-83041 placement
class HeldInputReader {
  setAside = [];
  pull;
  ended = !1;
  source;
  isRequestOut;
  onRequestOut;
  constructor({ source: e, isRequestOut: n, onRequestOut: r }) {
    ((this.source = e), (this.isRequestOut = n), (this.onRequestOut = r));
  }
  [Symbol.asyncIterator]() {
    return this;
  }
  next() {
    if (this.setAside.length > 0) return Promise.resolve({ done: !1, value: this.setAside.shift() });
    if (this.ended) return Promise.resolve({ done: !0, value: void 0 });
    let e = this.pull ?? this.source.next();
    return (
      (this.pull = void 0),
      e.then(
        (n) => {
          this.ended ||= n.done === !0;
        },
        () => {},
      ),
      e
    );
  }
  return() {
    ((this.ended = !0), (this.setAside.length = 0));
    let e = this.source.return?.();
    if (this.pull === void 0 && e !== void 0) return e;
    return (
      e?.catch((n) =>
        logForDebugging(`the input's reader failed to close: ${errorMessage(n)}`, { level: "error" }),
      ),
      Promise.resolve({ done: !0, value: void 0 })
    );
  }
  hasEnded() {
    return this.ended;
  }
  hasSetAside() {
    return this.setAside.length > 0;
  }
  async readWhile(e, { onSetAside: n = () => {}, onEnded: r = () => {} } = {}) {
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_breezy_haven", !0)) return e();
    let s = () => {},
      h = !1,
      onRequestOut = this.onRequestOut(() => {
        ((h = !0), s());
      }),
      S;
    try {
      S = e();
    } catch (error) {
      throw (onRequestOut(), error);
    }
    let R = !1,
      w = S.then(
        () => {
          R = !0;
        },
        () => {
          R = !0;
        },
      ),
      startTime = performance.now(),
      L = !1,
      q = 0;
    try {
      for (let x of this.setAside) n(x);
      if (this.ended) r();
      while (!R) {
        if (this.ended || !h || !this.isRequestOut()) {
          await Promise.race([
            w,
            new Promise((re) => {
              s = re;
            }),
          ]);
          continue;
        }
        ((L = !0), (this.pull ??= this.source.next()));
        let pull = this.pull;
        if (
          !(await Promise.race([
            w.then(() => !1),
            pull.then(
              () => !0,
              () => !0,
            ),
          ]))
        )
          break;
        this.pull = void 0;
        let Z = await pull;
        if (Z.done === !0) {
          ((this.ended = !0), r());
          continue;
        }
        (q++, this.setAside.push(Z.value), n(Z.value));
      }
    } finally {
      if ((onRequestOut(), L))
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
