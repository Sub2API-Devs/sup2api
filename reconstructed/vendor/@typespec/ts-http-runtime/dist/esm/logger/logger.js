/**
 * @typespec/ts-http-runtime/dist/esm/logger/logger.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (6)
 * attribution: esm-layout 3, esm-fingerprint 3
 */
import { merged } from "./debug.js";

//@ chunk-mrx6y2r5.js:25443-25453 esm-layout
var $r = merged;
//@ chunk-mrx6y2r5.js:25453-25545 esm-fingerprint
var Us = ["verbose", "info", "warning", "error"],
  rl = { verbose: 400, info: 300, warning: 200, error: 100 };
//@ chunk-mrx6y2r5.js:25545-25590 esm-layout
function nl(e, t) {
  t.log = (...r) => {
    e.log(...r);
  };
}
//@ chunk-mrx6y2r5.js:25590-25627 esm-layout
function ol(e) {
  return Us.includes(e);
}
//@ chunk-mrx6y2r5.js:25627-26536 esm-fingerprint
function Do(e) {
  let t = new Set(),
    r = (typeof process < "u" && process.env && process.env[e.logLevelEnvVarName]) || void 0,
    n,
    o = $r(e.namespace);
  o.log = (...d) => {
    $r.log(...d);
  };
  function i(d) {
    if (d && !ol(d)) throw Error(`Unknown log level '${d}'. Acceptable values: ${Us.join(",")}`);
    n = d;
    let u = [];
    for (let m of t) if (s(m)) u.push(m.namespace);
    $r.enable(u.join(","));
  }
  if (r)
    if (ol(r)) i(r);
    else
      console.error(
        `${e.logLevelEnvVarName} set to unknown log level '${r}'; logging is not enabled. Acceptable values: ${Us.join(", ")}.`,
      );
  function s(d) {
    return Boolean(n && rl[d.level] <= rl[n]);
  }
  function a(d, u) {
    let merged = Object.assign(d.extend(u), { level: u });
    if ((nl(d, merged), s(merged))) {
      let disable = $r.disable();
      $r.enable(disable + "," + merged.namespace);
    }
    return (t.add(merged), merged);
  }
  function c() {
    return n;
  }
  function l(d) {
    let extend = o.extend(d);
    return (
      nl(o, extend),
      {
        error: a(extend, "error"),
        warning: a(extend, "warning"),
        info: a(extend, "info"),
        verbose: a(extend, "verbose"),
      }
    );
  }
  return { setLogLevel: i, getLogLevel: c, createClientLogger: l, logger: o };
}
//@ chunk-mrx6y2r5.js:26536-26638 esm-fingerprint
var il = Do({ logLevelEnvVarName: "TYPESPEC_RUNTIME_LOG_LEVEL", namespace: "typeSpecRuntime" }),
  logger = il.logger;

export { il, Do };
