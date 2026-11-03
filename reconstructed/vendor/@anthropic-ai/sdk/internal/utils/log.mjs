/**
 * @anthropic-ai/sdk/internal/utils/log.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (10)
 * attribution: esm-fingerprint 6, esm-layout 4
 */
import { zl } from "./values.mjs";
import { cS } from "./env.mjs";

//@ chunk-hwmsct5x.js:26197-26414 esm-fingerprint
var WARN = "warn",
  Yo = { off: 0, error: 200, warn: 300, info: 400, debug: 500 },
  jo = (e, n, r) => {
    if (!e) return;
    if (zl(Yo, e)) return e;
    r.warn(`${n} was set to ${JSON.stringify(e)}, expected one of ${JSON.stringify(Object.keys(Yo))}`);
    return;
  };
//@ chunk-hwmsct5x.js:26414-26429 esm-layout
function vn() {}
//@ chunk-hwmsct5x.js:26429-26502 esm-layout
function zo(e, n, r) {
  if (!n || Yo[e] > Yo[r]) return vn;
  else return n[e].bind(n);
}
//@ chunk-hwmsct5x.js:26502-26560 esm-fingerprint
var Dh = { error: vn, warn: vn, info: vn, debug: vn },
  weakMap = new WeakMap();
//@ chunk-hwmsct5x.js:26560-26737 esm-fingerprint
function Ki(e, n) {
  let r = weakMap.get(e);
  if (r && r[0] === n) return r[1];
  let s = {
    error: zo("error", e, n),
    warn: zo("warn", e, n),
    info: zo("info", e, n),
    debug: zo("debug", e, n),
  };
  return (weakMap.set(e, [n, s]), s);
}
//@ chunk-hwmsct5x.js:26737-26818 esm-fingerprint
function Tb(e) {
  let logger = e.logger,
    r = e.logLevel ?? "off";
  if (!logger) return Dh;
  return Ki(logger, r);
}
//@ chunk-hwmsct5x.js:26818-26828 esm-layout
var pu, ji;
//@ chunk-hwmsct5x.js:26828-26969 esm-fingerprint
function hu() {
  let e = cS("ANTHROPIC_LOG");
  if (!ji || e !== pu)
    ((pu = e), (ji = Ki(console, jo(e, "process.env['ANTHROPIC_LOG']", Ki(console, WARN)) ?? WARN)));
  return ji;
}
//@ chunk-hwmsct5x.js:26969-27028 esm-layout
function wt(e, n, r) {
  if (e.debug === vn) return;
  e.debug(n, Uh(r));
}
//@ chunk-hwmsct5x.js:27028-27525 esm-fingerprint
var Uh = (e) => {
  if (e.options) ((e.options = { ...e.options }), delete e.options.headers);
  if (e.headers)
    e.headers = Object.fromEntries(
      (e.headers instanceof Headers ? [...e.headers] : Object.entries(e.headers)).map(([n, r]) => [
        n,
        n.toLowerCase() === "authorization" ||
        n.toLowerCase() === "api-key" ||
        n.toLowerCase() === "x-api-key" ||
        n.toLowerCase() === "cookie" ||
        n.toLowerCase() === "set-cookie"
          ? "***"
          : r,
      ]),
    );
  if ("retryOfRequestLogID" in e) {
    if (e.retryOfRequestLogID) e.retryOf = e.retryOfRequestLogID;
    delete e.retryOfRequestLogID;
  }
  return e;
};

export { Tb, wt, hu, WARN, jo };
