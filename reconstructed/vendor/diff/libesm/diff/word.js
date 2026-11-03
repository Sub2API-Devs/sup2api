/**
 * diff/libesm/diff/word.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (5)
 * attribution: esm-fingerprint 4, esm-layout 1
 */
import { L } from "../../libcjs/diff/base.js";
import { j, k, H, T, W, b, I, y, E, O, A } from "../../libcjs/util/string.js";

//@ chunk-7vb8p3zb.js:4740-4907 esm-fingerprint
var F =
    "a-zA-Z0-9_\\u{AD}\\u{C0}-\\u{D6}\\u{D8}-\\u{F6}\\u{F8}-\\u{2C6}\\u{2C8}-\\u{2D7}\\u{2DE}-\\u{2FF}\\u{1E00}-\\u{1EFF}",
  regExp = new RegExp(`[${F}]+|\\s+|[^${F}]`, "ug");
//@ chunk-7vb8p3zb.js:4907-5764 esm-fingerprint
class R extends L {
  equals(n, e, t) {
    if (t.ignoreCase) ((n = n.toLowerCase()), (e = e.toLowerCase()));
    return n.trim() === e.trim();
  }
  tokenize(n, e = {}) {
    let t;
    if (e.intlSegmenter) {
      let intlSegmenter = e.intlSegmenter;
      if (intlSegmenter.resolvedOptions().granularity != "word")
        throw Error('The segmenter passed must have a granularity of "word"');
      t = j(n, intlSegmenter);
    } else t = n.match(regExp) || [];
    let i = [],
      l = null;
    return (
      t.forEach((r) => {
        if (/\s/.test(r))
          if (l == null) i.push(r);
          else i.push(i.pop() + r);
        else if (l != null && /\s/.test(l))
          if (i[i.length - 1] == l) i.push(i.pop() + r);
          else i.push(l + r);
        else i.push(r);
        l = r;
      }),
      i
    );
  }
  join(n) {
    return n
      .map((e, t) => {
        if (t == 0) return e;
        else return e.replace(/^\s+/, "");
      })
      .join("");
  }
  postProcess(n, e) {
    if (!n || e.oneChangePerToken) return n;
    let t = null,
      i = null,
      l = null;
    if (
      (n.forEach((r) => {
        if (r.added) i = r;
        else if (r.removed) l = r;
        else {
          if (i || l) N(t, l, i, r, e.intlSegmenter);
          ((t = r), (i = null), (l = null));
        }
      }),
      i || l)
    )
      N(t, l, i, null, e.intlSegmenter);
    return n;
  }
}
//@ chunk-7vb8p3zb.js:5764-5776 esm-layout
var B = new R();
//@ chunk-7vb8p3zb.js:5776-6496 esm-fingerprint
function N(n, e, t, i, l) {
  if (e && t) {
    let [r, s] = k(e.value, l),
      [o, f] = k(t.value, l);
    if (n) {
      let u = H(r, o);
      ((n.value = T(n.value, o, u)), (e.value = W(e.value, u)), (t.value = W(t.value, u)));
    }
    if (i) {
      let u = b(s, f);
      ((i.value = I(i.value, f, u)), (e.value = y(e.value, u)), (t.value = y(t.value, u)));
    }
  } else if (t) {
    if (n) {
      let r = E(t.value, l);
      t.value = t.value.substring(r.length);
    }
    if (i) {
      let r = E(i.value, l);
      i.value = i.value.substring(r.length);
    }
  } else if (n && i) {
    let r = E(i.value, l),
      [s, o] = k(e.value, l),
      f = H(r, s);
    e.value = W(e.value, f);
    let u = b(W(r, f), o);
    ((e.value = y(e.value, u)),
      (i.value = I(i.value, r, u)),
      (n.value = T(n.value, r, r.slice(0, r.length - u.length))));
  } else if (i) {
    let r = E(i.value, l),
      s = O(e.value, l),
      o = A(s, r);
    e.value = y(e.value, o);
  } else if (n) {
    let r = O(n.value, l),
      s = E(e.value, l),
      o = A(r, s);
    e.value = W(e.value, o);
  }
}
//@ chunk-7vb8p3zb.js:6496-6614 esm-fingerprint
class z extends L {
  tokenize(n) {
    let regExp = new RegExp(`(\\r?\\n)|[${F}]+|[^\\S\\n\\r]+|[^${F}]`, "ug");
    return n.match(regExp) || [];
  }
}

export { z };
