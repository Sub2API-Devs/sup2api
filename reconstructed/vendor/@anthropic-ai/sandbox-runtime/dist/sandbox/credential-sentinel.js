/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/credential-sentinel.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (3)
 * attribution: esm-fingerprint 3
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
} from "crypto";

//@ chunk-fq0cr76a.js:705621-705686 esm-fingerprint
var FAKE_VALUE = "fake_value_",
  ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 = "abcdefghijklmnopqrstuvwxyz0123456789_-";
//@ chunk-fq0cr76a.js:705686-705819 esm-fingerprint
function WH(e) {
  let n = FAKE_VALUE + randomUUID(),
    r = Buffer.byteLength(e) - n.length;
  if (r <= 0) return n;
  let s = n;
  for (let h of randomBytes(r))
    s += ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789[h % ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.length];
  return s;
}
//@ chunk-fq0cr76a.js:705819-707338 esm-fingerprint
class RE {
  constructor() {
    ((this.byName = new Map()), (this.bySentinel = new Map()), (this.allSentinelsPrefixed = !0));
  }
  register(e, n, r) {
    return this.registerWithSentinel(e, WH(n), n, r);
  }
  registerWithSentinel(e, n, r, s) {
    let h = this.byName.get(e);
    if (h !== void 0) return ((h.realValue = r), (h.injectHosts = s), h.sentinel);
    if (!n.startsWith(FAKE_VALUE)) this.allSentinelsPrefixed = !1;
    let y = { name: e, sentinel: n, realValue: r, injectHosts: s };
    return (this.byName.set(e, y), this.bySentinel.set(n, y), n);
  }
  lookupReal(e) {
    return this.bySentinel.get(e)?.realValue;
  }
  namesInjectableAt(e, n) {
    let r = [];
    for (let s of this.byName.values())
      if (s.injectHosts.some((injectHost) => n(e, injectHost))) r.push(s.name);
    return r;
  }
  sentinelsForHost(e, n) {
    let r = [];
    for (let s of this.bySentinel.values()) {
      if (!s.injectHosts.some((injectHost) => n(e, injectHost))) continue;
      r.push({ sentinel: Buffer.from(s.sentinel), realValue: Buffer.from(s.realValue) });
    }
    return r;
  }
  *entries() {
    for (let e of this.bySentinel.values()) yield [e.sentinel, e.realValue];
  }
  get size() {
    return this.bySentinel.size;
  }
  clear() {
    (this.byName.clear(), this.bySentinel.clear(), (this.allSentinelsPrefixed = !0));
  }
  substituteInHeaders(e, n, r) {
    if (this.bySentinel.size === 0) return;
    for (let [s, h] of Object.entries(e)) {
      if (h === void 0) continue;
      if (Array.isArray(h)) for (let y = 0; y < h.length; y++) h[y] = this.substituteInString(h[y], n, r);
      else e[s] = this.substituteInString(h, n, r);
    }
  }
  substituteInString(e, n, r) {
    if (this.allSentinelsPrefixed && !e.includes(FAKE_VALUE)) return e;
    let s = e;
    for (let h of this.bySentinel.values()) {
      if (!s.includes(h.sentinel)) continue;
      if (!h.injectHosts.some((injectHost) => r(n, injectHost))) continue;
      s = s.split(h.sentinel).join(h.realValue);
    }
    return s;
  }
}

export { RE, FAKE_VALUE };
