/**
 * p-map/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: p-map/index.js
 * pieces: chunk-rbe666af.js (2)
 * attribution: placement 2
 */

//@ chunk-rbe666af.js:376-1750 placement
/**
 * p-map 默认导出（第三方）：限制并发的异步 map
 */
async function pMap(
  e,
  t,
  { concurrency: n = Number.POSITIVE_INFINITY, stopOnError: r = true, signal: s } = {},
) {
  return new Promise((resolve, reject) => {
    if (e[Symbol.iterator] === undefined && e[Symbol.asyncIterator] === undefined)
      throw TypeError(
        `Expected \`input\` to be either an \`Iterable\` or \`AsyncIterable\`, got (${typeof e})`,
      );
    if (typeof t !== "function") throw TypeError("Mapper function is required");
    if (!((Number.isSafeInteger(n) && n >= 1) || n === Number.POSITIVE_INFINITY))
      throw TypeError(
        `Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${n}\` (${typeof n})`,
      );
    let a = [];
    let d = [];
    let c = new Map();
    let u = false;
    let y = false;
    let S = false;
    let g = 0;
    let l = 0;
    let R = e[Symbol.iterator] === undefined ? e[Symbol.asyncIterator]() : e[Symbol.iterator]();
    let h = () => {
      f(s.reason);
    };
    let p = () => {
      s?.removeEventListener("abort", h);
    };
    let _ = (m) => {
      resolve(m);
      p();
    };
    let f = (m) => {
      u = true;
      y = true;
      reject(m);
      p();
    };
    if (s) {
      if (s.aborted) f(s.reason);
      s.addEventListener("abort", h, {
        once: true,
      });
    }
    let w = async () => {
      if (y) return;
      let m = await R.next();
      let b = l;
      l++;
      if (m.done) {
        S = true;
        if (g === 0 && !y) {
          if (!r && d.length > 0) {
            f(AggregateError(d));
            return;
          }
          y = true;
          if (c.size === 0) {
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
      g++;
      (async () => {
        try {
          let C = await m.value;
          if (y) return;
          let E = await t(C, b);
          if (E === call) c.set(b, E);
          a[b] = E;
          g--;
          await w();
        } catch (error) {
          if (r) f(error);
          else {
            d.push(error);
            g--;
            try {
              await w();
            } catch (error) {
              f(error);
            }
          }
        }
      })();
    };
    (async () => {
      for (let idx = 0; idx < n; idx++) {
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
