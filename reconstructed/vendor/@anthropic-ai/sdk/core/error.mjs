/**
 * @anthropic-ai/sdk/core/error.mjs
 *
 * @anthropic-ai/sdk 的 API 错误类（第三方）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-2g090z7k.js (14)
 * attribution: esm-layout 1, esm-fingerprint 5, layout 1, placement 7
 */
import { V7t } from "../internal/errors.mjs";

//@ chunk-2g090z7k.js:792-841 esm-layout
var pr = (() => {
  class n extends Error {}
  return n;
})();
//@ chunk-2g090z7k.js:841-1727 esm-fingerprint
class Ot extends pr {
  constructor(n, e, t, r, o) {
    super(`${Ot.makeMessage(n, e, t)}`);
    ((this.status = n),
      (this.headers = r),
      (this.requestID = r?.get("request-id")),
      (this.workspaceID = r?.get("anthropic-workspace-id")),
      (this.error = e),
      (this.type = o ?? null));
  }
  static makeMessage(n, e, t) {
    let r = e?.message
      ? typeof e.message === "string"
        ? e.message
        : JSON.stringify(e.message)
      : e
        ? JSON.stringify(e)
        : t;
    if (n && r) return `${n} ${r}`;
    if (n) return `${n} status code (no body)`;
    if (r) return r;
    return "(no status code or body)";
  }
  static generate(n, e, t, r) {
    if (!n || !r) return new ef({ message: t, cause: V7t(e) });
    let o = e,
      i = o?.error?.type;
    if (n === 400) return new q7t(n, o, t, r, i);
    if (n === 401) return new K9e(n, o, t, r, i);
    if (n === 403) return new Y7t(n, o, t, r, i);
    if (n === 404) return new V9e(n, o, t, r, i);
    if (n === 409) return new X7t(n, o, t, r, i);
    if (n === 422) return new J7t(n, o, t, r, i);
    if (n === 429) return new Q7t(n, o, t, r, i);
    if (n >= 500) return new Z7t(n, o, t, r, i);
    return new Ot(n, o, t, r, i);
  }
}
//@ chunk-2g090z7k.js:1727-1830 esm-fingerprint
class Lf extends Ot {
  constructor({ message: n } = {}) {
    super(void 0, void 0, n || "Request was aborted.", void 0);
  }
}
//@ chunk-2g090z7k.js:1830-1953 esm-fingerprint
class ef extends Ot {
  constructor({ message: n, cause: e }) {
    super(void 0, void 0, n || "Connection error.", void 0);
    if (e) this.cause = e;
  }
}
//@ chunk-2g090z7k.js:1953-2043 esm-fingerprint
class fT extends ef {
  constructor({ message: n } = {}) {
    super({ message: n ?? "Request timed out." });
  }
}
//@ chunk-2g090z7k.js:2043-2149 esm-fingerprint
class AHn extends pr {
  constructor(n, { cause: e } = {}) {
    super(n ?? "Retryable error.");
    if (e !== void 0) this.cause = e;
  }
}
//@ chunk-2g090z7k.js:2149-2171 layout
class q7t extends Ot {}
//@ chunk-2g090z7k.js:2171-2193 placement
class K9e extends Ot {}
//@ chunk-2g090z7k.js:2193-2215 placement
class Y7t extends Ot {}
//@ chunk-2g090z7k.js:2215-2237 placement
class V9e extends Ot {}
//@ chunk-2g090z7k.js:2237-2259 placement
class X7t extends Ot {}
//@ chunk-2g090z7k.js:2259-2281 placement
class J7t extends Ot {}
//@ chunk-2g090z7k.js:2281-2303 placement
class Q7t extends Ot {}
//@ chunk-2g090z7k.js:2303-2325 placement
class Z7t extends Ot {}

export { Lf, Ot, fT, ef, pr, V9e, K9e, q7t, Y7t, X7t, J7t, Q7t, Z7t, AHn };
