/**
 * @modelcontextprotocol/core/(bundler runtime of a pre-bundled dist file)
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/core@2.0.0
 * pieces: chunk-r1g76qsy.js (1)
 * attribution: embedded-runtime 1
 */
//@ chunk-r1g76qsy.js:516-1173 embedded-runtime
var { create, defineProperty, getOwnPropertyDescriptor, getOwnPropertyNames, getPrototypeOf } = Object;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var J = (e, t) => () => {
  if (!t)
    e(
      (t = {
        exports: {},
      }).exports,
      t,
    );
  return t.exports;
};
var qn = (e, t) => {
  let r = {};
  for (var key in e)
    defineProperty(r, key, {
      get: e[key],
      enumerable: true,
    });
  if (t)
    defineProperty(r, Symbol.toStringTag, {
      value: "Module",
    });
  return r;
};
var Ic = (e, t, r, s) => {
  if ((t && typeof t === "object") || typeof t === "function") {
    for (var ownPropertyNames = getOwnPropertyNames(t), n = 0, i = ownPropertyNames.length, l; n < i; n++) {
      l = ownPropertyNames[n];
      if (!hasOwnProperty.call(e, l) && l !== r)
        defineProperty(e, l, {
          get: ((c) => t[c]).bind(null, l),
          enumerable: !(s = getOwnPropertyDescriptor(t, l)) || s.enumerable,
        });
    }
  }
  return e;
};
var Eo = (e, t, r) => {
  r = e != null ? create(getPrototypeOf(e)) : {};
  return Ic(
    t || !e || !e.__esModule
      ? defineProperty(r, "default", {
          value: e,
          enumerable: true,
        })
      : r,
    e,
  );
};
export { qn, J, Eo };
