/**
 * @typespec/ts-http-runtime/dist/esm/logger/debug.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (10)
 * attribution: esm-layout 3, esm-fingerprint 7
 */
import * as processModule from "process";
import * as processModule_2 from "process";
import util from "util";
import { EOL } from "os";

//@ chunk-mrx6y2r5.js:24430-24495 esm-layout
function Jc(e, ...t) {
  processModule.stderr.write(`${util.format(e, ...t)}${EOL}`);
}
//@ chunk-mrx6y2r5.js:24495-24582 esm-fingerprint
var Xc = (typeof process < "u" && process.env && process.env.DEBUG) || void 0,
  Zc,
  Ns = [],
  xs = [],
  Mo = [];
//@ chunk-mrx6y2r5.js:24582-24595 esm-layout
if (Xc) Ms(Xc);
//@ chunk-mrx6y2r5.js:24595-24669 esm-fingerprint
var merged = Object.assign((e) => tl(e), { enable: Ms, enabled: Ds, disable: pm, log: Jc });
//@ chunk-mrx6y2r5.js:24669-24917 esm-fingerprint
function Ms(e) {
  ((Zc = e), (Ns = []), (xs = []));
  let t = /\*/g,
    mapped = e.split(",").map((n) => n.trim().replace(t, ".*?"));
  for (let n of mapped)
    if (n.startsWith("-")) xs.push(new RegExp(`^${n.substr(1)}$`));
    else Ns.push(new RegExp(`^${n}$`));
  for (let n of Mo) n.enabled = Ds(n.namespace);
}
//@ chunk-mrx6y2r5.js:24917-25045 esm-fingerprint
function Ds(e) {
  if (e.endsWith("*")) return !0;
  for (let t of xs) if (t.test(e)) return !1;
  for (let t of Ns) if (t.test(e)) return !0;
  return !1;
}
//@ chunk-mrx6y2r5.js:25045-25088 esm-layout
function pm() {
  let e = Zc || "";
  return (Ms(""), e);
}
//@ chunk-mrx6y2r5.js:25088-25290 esm-fingerprint
function tl(e) {
  let merged_2 = Object.assign(r, { enabled: Ds(e), destroy: gm, log: merged.log, namespace: e, extend: ym });
  function r(...n) {
    if (!merged_2.enabled) return;
    if (n.length > 0) n[0] = `${e} ${n[0]}`;
    merged_2.log(...n);
  }
  return (Mo.push(merged_2), merged_2);
}
//@ chunk-mrx6y2r5.js:25290-25369 esm-fingerprint
function gm() {
  let index = Mo.indexOf(this);
  if (index >= 0) return (Mo.splice(index, 1), !0);
  return !1;
}
//@ chunk-mrx6y2r5.js:25369-25443 esm-fingerprint
function ym(e) {
  let t = tl(`${this.namespace}:${e}`);
  return ((t.log = this.log), t);
}

export { merged };
