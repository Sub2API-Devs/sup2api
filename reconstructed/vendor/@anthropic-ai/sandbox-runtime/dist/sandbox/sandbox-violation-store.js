/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-violation-store.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (8)
 * attribution: esm-fingerprint 6, esm-layout 2
 */
import { QSe, w8o } from "./sandbox-utils.js";

//@ chunk-fq0cr76a.js:653509-654298 esm-fingerprint
class _m {
  constructor() {
    ((this.violations = []), (this.totalCount = 0), (this.maxSize = 100), (this.listeners = new Set()));
  }
  addViolation(e) {
    if (
      (this.violations.push({ ...e, line: fE(e.line) }),
      this.totalCount++,
      this.violations.length > this.maxSize)
    )
      this.violations = this.violations.slice(-this.maxSize);
    this.notifyListeners();
  }
  getViolations(e) {
    if (e === void 0) return [...this.violations];
    return this.violations.slice(-e);
  }
  getCount() {
    return this.violations.length;
  }
  getTotalCount() {
    return this.totalCount;
  }
  getViolationsForCommand(e) {
    let n = QSe(e);
    return this.violations.filter((violation) => violation.encodedCommand === n);
  }
  clear() {
    ((this.violations = []), this.notifyListeners());
  }
  subscribe(e) {
    return (
      this.listeners.add(e),
      e(this.getViolations()),
      () => {
        this.listeners.delete(e);
      }
    );
  }
  notifyListeners() {
    let violations = this.getViolations();
    this.listeners.forEach((listener) => listener(violations));
  }
}
//@ chunk-fq0cr76a.js:654298-654510 esm-fingerprint
function Eu(e, n, r) {
  if (!r) return !1;
  if ((r["*"] ?? []).some((h) => e.includes(h))) return !0;
  if (n === void 0) return !1;
  for (let [h, y] of Object.entries(r))
    if (h !== "*" && n.includes(h) && y.some((b) => e.includes(b))) return !0;
  return !1;
}
//@ chunk-fq0cr76a.js:654510-654644 esm-fingerprint
var p5 =
  /[\x00-\x1f\x7f-\x9f\u00ad\u061c\u200b-\u200f\u2028\u2029\u202a-\u202e\u2060-\u2064\u2066-\u2069\ufeff\u{e0000}-\u{e007f}]+/gu;
//@ chunk-fq0cr76a.js:654644-654711 esm-fingerprint
function fE(e) {
  return e.replace(p5, " ").replace(/[<>]/g, "").trim();
}
//@ chunk-fq0cr76a.js:654711-654747 esm-layout
function DC(e) {
  return OC(fE(e), w8o);
}
//@ chunk-fq0cr76a.js:654747-654758 esm-layout
var h5 = 500;
//@ chunk-fq0cr76a.js:654758-654803 esm-fingerprint
function vm(e) {
  return OC(fE(e), h5).trimEnd();
}
//@ chunk-fq0cr76a.js:654803-654888 esm-fingerprint
function OC(e, n) {
  let sliced = e.slice(0, n);
  return /[\uD800-\uDBFF]$/.test(sliced) ? sliced.slice(0, -1) : sliced;
}

export { vm, _m, DC, Eu };
