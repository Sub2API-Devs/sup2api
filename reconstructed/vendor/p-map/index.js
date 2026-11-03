/**
 * p-map/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: p-map/index.js
 * pieces: chunk-rbe666af.js (2)
 * attribution: placement 2
 */

/**
 * p-map 默认导出（第三方）：限制并发的异步 map
 */
//@ chunk-rbe666af.js:376-1750 placement
async function pMap(
  e,
  t,
  { concurrency: n = Number.POSITIVE_INFINITY, stopOnError: r = !0, signal: s } = {},
) {
  return new Promise((i, o) => {
    if (e[Symbol.iterator] === void 0 && e[Symbol.asyncIterator] === void 0)
      throw TypeError(
        `Expected \`input\` to be either an \`Iterable\` or \`AsyncIterable\`, got (${typeof e})`,
      );
    if (typeof t !== "function") throw TypeError("Mapper function is required");
    if (!((Number.isSafeInteger(n) && n >= 1) || n === Number.POSITIVE_INFINITY))
      throw TypeError(
        `Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${n}\` (${typeof n})`,
      );
    let a = [],
      d = [],
      c = new Map(),
      u = !1,
      y = !1,
      S = !1,
      g = 0,
      l = 0,
      R = e[Symbol.iterator] === void 0 ? e[Symbol.asyncIterator]() : e[Symbol.iterator](),
      h = () => {
        f(s.reason);
      },
      p = () => {
        s?.removeEventListener("abort", h);
      },
      _ = (m) => {
        (i(m), p());
      },
      f = (m) => {
        ((u = !0), (y = !0), o(m), p());
      };
    if (s) {
      if (s.aborted) f(s.reason);
      s.addEventListener("abort", h, { once: !0 });
    }
    let w = async () => {
      if (y) return;
      let m = await R.next(),
        b = l;
      if ((l++, m.done)) {
        if (((S = !0), g === 0 && !y)) {
          if (!r && d.length > 0) {
            f(AggregateError(d));
            return;
          }
          if (((y = !0), c.size === 0)) {
            _(a);
            return;
          }
          let C = [];
          for (let [E, U] of a.entries()) {
            if (c.get(E) === call) continue;
            C.push(U);
          }
          _(C);
        }
        return;
      }
      (g++,
        (async () => {
          try {
            let C = await m.value;
            if (y) return;
            let E = await t(C, b);
            if (E === call) c.set(b, E);
            ((a[b] = E), g--, await w());
          } catch (error) {
            if (r) f(error);
            else {
              (d.push(error), g--);
              try {
                await w();
              } catch (error) {
                f(error);
              }
            }
          }
        })());
    };
    (async () => {
      for (let m = 0; m < n; m++) {
        try {
          await w();
        } catch (error) {
          f(error);
          break;
        }
        if (S || u) break;
      }
    })();
  });
}
//@ chunk-rbe666af.js:1750-1771 placement = call (0.709)
var call = Symbol("skip");

export { pMap };
