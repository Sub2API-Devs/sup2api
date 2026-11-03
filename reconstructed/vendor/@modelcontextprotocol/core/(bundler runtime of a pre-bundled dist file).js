/**
 * @modelcontextprotocol/core/(bundler runtime of a pre-bundled dist file)
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/core@2.0.0
 * pieces: chunk-r1g76qsy.js (1)
 * attribution: embedded-runtime 1
 */

//@ chunk-r1g76qsy.js:516-1173 embedded-runtime
var {
    create: create,
    defineProperty: defineProperty,
    getOwnPropertyDescriptor: getOwnPropertyDescriptor,
    getOwnPropertyNames: getOwnPropertyNames,
    getPrototypeOf: getPrototypeOf,
  } = Object,
  hasOwnProperty = Object.prototype.hasOwnProperty,
  J = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports),
  qn = (e, t) => {
    let r = {};
    for (var key in e) defineProperty(r, key, { get: e[key], enumerable: !0 });
    if (t) defineProperty(r, Symbol.toStringTag, { value: "Module" });
    return r;
  },
  Ic = (e, t, r, s) => {
    if ((t && typeof t === "object") || typeof t === "function") {
      for (var a = getOwnPropertyNames(t), n = 0, i = a.length, l; n < i; n++)
        if (((l = a[n]), !hasOwnProperty.call(e, l) && l !== r))
          defineProperty(e, l, {
            get: ((c) => t[c]).bind(null, l),
            enumerable: !(s = getOwnPropertyDescriptor(t, l)) || s.enumerable,
          });
    }
    return e;
  },
  Eo = (e, t, r) => (
    (r = e != null ? create(getPrototypeOf(e)) : {}),
    Ic(t || !e || !e.__esModule ? defineProperty(r, "default", { value: e, enumerable: !0 }) : r, e)
  );

export { qn, J, Eo };
