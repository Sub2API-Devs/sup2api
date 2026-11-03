/**
 * @typespec/ts-http-runtime/dist/esm/httpHeaders.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */

//@ chunk-mrx6y2r5.js:30140-30178 esm-layout
function Fo(e) {
  return e.toLowerCase();
}
//@ chunk-mrx6y2r5.js:30178-30239 esm-fingerprint
function* Im(e) {
  for (let t of e.values()) yield [t.name, t.value];
}
//@ chunk-mrx6y2r5.js:30239-30845 esm-fingerprint
class ll {
  constructor(e) {
    if (((this._headersMap = new Map()), e)) for (let t of Object.keys(e)) this.set(t, e[t]);
  }
  set(e, t) {
    this._headersMap.set(Fo(e), { name: e, value: String(t).trim() });
  }
  get(e) {
    var t;
    return (t = this._headersMap.get(Fo(e))) === null || t === void 0 ? void 0 : t.value;
  }
  has(e) {
    return this._headersMap.has(Fo(e));
  }
  delete(e) {
    this._headersMap.delete(Fo(e));
  }
  toJSON(e = {}) {
    let t = {};
    if (e.preserveCase) for (let r of this._headersMap.values()) t[r.name] = r.value;
    else for (let [r, n] of this._headersMap) t[r] = n.value;
    return t;
  }
  toString() {
    return JSON.stringify(this.toJSON({ preserveCase: !0 }));
  }
  [Symbol.iterator]() {
    return Im(this._headersMap);
  }
}

export { ll };
