/**
 * execa/lib/promise.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-layout 1
 */

//@ chunk-m4p5zn6n.js:25888-26318 esm-layout
var Po = (async () => {})().constructor.prototype,
  mapped = ["then", "catch", "finally"].map((e) => [e, Reflect.getOwnPropertyDescriptor(Po, e)]),
  De = (e, n) => {
    for (let [r, o] of mapped) {
      let s = typeof n === "function" ? (...u) => Reflect.apply(o.value, n(), u) : o.value.bind(n);
      Reflect.defineProperty(e, r, { ...o, value: s });
    }
  },
  Tn = (e) =>
    new Promise((n, r) => {
      if (
        (e.on("exit", (o, s) => {
          n({ exitCode: o, signal: s });
        }),
        e.on("error", (o) => {
          r(o);
        }),
        e.stdin)
      )
        e.stdin.on("error", (o) => {
          r(o);
        });
    });

export { De, Tn };
