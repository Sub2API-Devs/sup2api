/**
 * mimic-function/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: mimic-function@5.0.1
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-m4p5zn6n.js:8136-8992 esm-fingerprint
var wr = (e, n, r, o) => {
    if (r === "length" || r === "prototype") return;
    if (r === "arguments" || r === "caller") return;
    let ownPropertyDescriptor = Object.getOwnPropertyDescriptor(e, r),
      ownPropertyDescriptor_2 = Object.getOwnPropertyDescriptor(n, r);
    if (!Tr(ownPropertyDescriptor, ownPropertyDescriptor_2) && o) return;
    Object.defineProperty(e, r, ownPropertyDescriptor_2);
  },
  Tr = function (e, n) {
    return (
      e === void 0 ||
      e.configurable ||
      (e.writable === n.writable &&
        e.enumerable === n.enumerable &&
        e.configurable === n.configurable &&
        (e.writable || e.value === n.value))
    );
  },
  Pr = (e, n) => {
    let prototypeOf = Object.getPrototypeOf(n);
    if (prototypeOf === Object.getPrototypeOf(e)) return;
    Object.setPrototypeOf(e, prototypeOf);
  },
  Ir = (e, n) => `/* Wrapped ${e}*/
${n}`,
  ownPropertyDescriptor = Object.getOwnPropertyDescriptor(Function.prototype, "toString"),
  ownPropertyDescriptor_2 = Object.getOwnPropertyDescriptor(Function.prototype.toString, "name"),
  Ar = (e, n, r) => {
    let o = r === "" ? "" : `with ${r.trim()}() `,
      s = Ir.bind(null, o, n.toString());
    (Object.defineProperty(s, "name", ownPropertyDescriptor_2),
      Object.defineProperty(e, "toString", { ...ownPropertyDescriptor, value: s }));
  };
//@ chunk-m4p5zn6n.js:8992-9126 esm-fingerprint
function Ee(e, n, { ignoreNonConfigurable: r = !1 } = {}) {
  let { name: o } = e;
  for (let s of Reflect.ownKeys(n)) wr(e, n, s, r);
  return (Pr(e, n), Ar(e, n, o), e);
}

export { Ee };
