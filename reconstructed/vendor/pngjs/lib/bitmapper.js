/**
 * pngjs/lib/bitmapper.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { lt } from "./interlace.js";

//@ chunk-spjgqa4y.js:31843-34044 cjs-fingerprint
var gt = x(function (Do) {
  var Se = lt(),
    Oo = [
      function () {},
      function (t, e, r, n) {
        if (n === e.length) throw Error("Ran out of data");
        let i = e[n];
        ((t[r] = i), (t[r + 1] = i), (t[r + 2] = i), (t[r + 3] = 255));
      },
      function (t, e, r, n) {
        if (n + 1 >= e.length) throw Error("Ran out of data");
        let i = e[n];
        ((t[r] = i), (t[r + 1] = i), (t[r + 2] = i), (t[r + 3] = e[n + 1]));
      },
      function (t, e, r, n) {
        if (n + 2 >= e.length) throw Error("Ran out of data");
        ((t[r] = e[n]), (t[r + 1] = e[n + 1]), (t[r + 2] = e[n + 2]), (t[r + 3] = 255));
      },
      function (t, e, r, n) {
        if (n + 3 >= e.length) throw Error("Ran out of data");
        ((t[r] = e[n]), (t[r + 1] = e[n + 1]), (t[r + 2] = e[n + 2]), (t[r + 3] = e[n + 3]));
      },
    ],
    No = [
      function () {},
      function (t, e, r, n) {
        let i = e[0];
        ((t[r] = i), (t[r + 1] = i), (t[r + 2] = i), (t[r + 3] = n));
      },
      function (t, e, r) {
        let n = e[0];
        ((t[r] = n), (t[r + 1] = n), (t[r + 2] = n), (t[r + 3] = e[1]));
      },
      function (t, e, r, n) {
        ((t[r] = e[0]), (t[r + 1] = e[1]), (t[r + 2] = e[2]), (t[r + 3] = n));
      },
      function (t, e, r) {
        ((t[r] = e[0]), (t[r + 1] = e[1]), (t[r + 2] = e[2]), (t[r + 3] = e[3]));
      },
    ];
  function qo(t, e) {
    let r = [],
      n = 0;
    function i() {
      if (n === t.length) throw Error("Ran out of data");
      let o = t[n];
      n++;
      let s, l, u, f, a, h, c, p;
      switch (e) {
        default:
          throw Error("unrecognised depth");
        case 16:
          ((c = t[n]), n++, r.push((o << 8) + c));
          break;
        case 4:
          ((c = o & 15), (p = o >> 4), r.push(p, c));
          break;
        case 2:
          ((a = o & 3), (h = (o >> 2) & 3), (c = (o >> 4) & 3), (p = (o >> 6) & 3), r.push(p, c, h, a));
          break;
        case 1:
          ((s = o & 1),
            (l = (o >> 1) & 1),
            (u = (o >> 2) & 1),
            (f = (o >> 3) & 1),
            (a = (o >> 4) & 1),
            (h = (o >> 5) & 1),
            (c = (o >> 6) & 1),
            (p = (o >> 7) & 1),
            r.push(p, c, h, a, f, u, l, s));
          break;
      }
    }
    return {
      get: function (o) {
        while (r.length < o) i();
        let sliced = r.slice(0, o);
        return ((r = r.slice(o)), sliced);
      },
      resetAfterLine: function () {
        r.length = 0;
      },
      end: function () {
        if (n !== t.length) throw Error("extra data found");
      },
    };
  }
  function Uo(t, e, r, n, i, o) {
    let { width: width, height: height, index: index } = t;
    for (let f = 0; f < height; f++)
      for (let a = 0; a < width; a++) {
        let h = r(a, f, index);
        (Oo[n](e, i, h, o), (o += n));
      }
    return o;
  }
  function Fo(t, e, r, n, i, o) {
    let { width: width, height: height, index: index } = t;
    for (let f = 0; f < height; f++) {
      for (let a = 0; a < width; a++) {
        let h = i.get(n),
          c = r(a, f, index);
        No[n](e, h, c, o);
      }
      i.resetAfterLine();
    }
  }
  Do.dataToBitMap = function (t, e) {
    let { width: width, height: height, depth: depth, bpp: bpp, interlace: interlace } = e,
      l;
    if (depth !== 8) l = qo(t, depth);
    let u;
    if (depth <= 8) u = Buffer.alloc(width * height * 4);
    else u = new Uint16Array(width * height * 4);
    let f = Math.pow(2, depth) - 1,
      a = 0,
      h,
      c;
    if (interlace) ((h = Se.getImagePasses(width, height)), (c = Se.getInterlaceIterator(width, height)));
    else {
      let p = 0;
      ((c = function () {
        let _ = p;
        return ((p += 4), _);
      }),
        (h = [{ width: width, height: height }]));
    }
    for (let p = 0; p < h.length; p++)
      if (depth === 8) a = Uo(h[p], u, c, bpp, t, a);
      else Fo(h[p], u, c, bpp, l, f);
    if (depth === 8) {
      if (a !== t.length) throw Error("extra data found");
    } else l.end();
    return u;
  };
});

export { gt };
