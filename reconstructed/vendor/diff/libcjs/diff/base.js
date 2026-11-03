/**
 * diff/libcjs/diff/base.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: diff@9.0.0
 * pieces: chunk-7vb8p3zb.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-7vb8p3zb.js:191-3027 esm-fingerprint
class L {
  diff(n, e, t = {}) {
    let i;
    if (typeof t === "function") ((i = t), (t = {}));
    else if ("callback" in t) i = t.callback;
    let castInput = this.castInput(n, t),
      castInput_2 = this.castInput(e, t),
      removeEmpty = this.removeEmpty(this.tokenize(castInput, t)),
      removeEmpty_2 = this.removeEmpty(this.tokenize(castInput_2, t));
    return this.diffWithOptionsObj(removeEmpty, removeEmpty_2, t, i);
  }
  diffWithOptionsObj(n, e, t, i) {
    var l;
    let r = (d) => {
        if (((d = this.postProcess(d, t)), i)) {
          setTimeout(function () {
            i(d);
          }, 0);
          return;
        } else return d;
      },
      s = e.length,
      o = n.length,
      f = 1,
      u = s + o;
    if (t.maxEditLength != null) u = Math.min(u, t.maxEditLength);
    let h = (l = t.timeout) !== null && l !== void 0 ? l : 1 / 0,
      c = Date.now() + h,
      a = [{ oldPos: -1, lastComponent: void 0 }],
      extractCommon = this.extractCommon(a[0], e, n, 0, t);
    if (a[0].oldPos + 1 >= o && extractCommon + 1 >= s) return r(this.buildValues(a[0].lastComponent, e, n));
    let w = -1 / 0,
      P = 1 / 0,
      C = () => {
        for (let max = Math.max(w, -f); max <= Math.min(P, f); max += 2) {
          let p,
            m = a[max - 1],
            x = a[max + 1];
          if (m) a[max - 1] = void 0;
          let v = !1;
          if (x) {
            let D = x.oldPos - max;
            v = x && 0 <= D && D < s;
          }
          let S = m && m.oldPos + 1 < o;
          if (!v && !S) {
            a[max] = void 0;
            continue;
          }
          if (!S || (v && m.oldPos < x.oldPos)) p = this.addToPath(x, !0, !1, 0, t);
          else p = this.addToPath(m, !1, !0, 1, t);
          if (
            ((extractCommon = this.extractCommon(p, e, n, max, t)),
            p.oldPos + 1 >= o && extractCommon + 1 >= s)
          )
            return r(this.buildValues(p.lastComponent, e, n)) || !0;
          else {
            if (((a[max] = p), p.oldPos + 1 >= o)) P = Math.min(P, max - 1);
            if (extractCommon + 1 >= s) w = Math.max(w, max + 1);
          }
        }
        f++;
      };
    if (i)
      (function d() {
        setTimeout(function () {
          if (f > u || Date.now() > c) return i(void 0);
          if (!C()) d();
        }, 0);
      })();
    else
      while (f <= u && Date.now() <= c) {
        let d = C();
        if (d) return d;
      }
  }
  addToPath(n, e, t, i, l) {
    let lastComponent = n.lastComponent;
    if (lastComponent && !l.oneChangePerToken && lastComponent.added === e && lastComponent.removed === t)
      return {
        oldPos: n.oldPos + i,
        lastComponent: {
          count: lastComponent.count + 1,
          added: e,
          removed: t,
          previousComponent: lastComponent.previousComponent,
        },
      };
    else
      return {
        oldPos: n.oldPos + i,
        lastComponent: { count: 1, added: e, removed: t, previousComponent: lastComponent },
      };
  }
  extractCommon(n, e, t, i, l) {
    let r = e.length,
      s = t.length,
      oldPos = n.oldPos,
      f = oldPos - i,
      u = 0;
    while (f + 1 < r && oldPos + 1 < s && this.equals(t[oldPos + 1], e[f + 1], l))
      if ((f++, oldPos++, u++, l.oneChangePerToken))
        n.lastComponent = { count: 1, previousComponent: n.lastComponent, added: !1, removed: !1 };
    if (u && !l.oneChangePerToken)
      n.lastComponent = { count: u, previousComponent: n.lastComponent, added: !1, removed: !1 };
    return ((n.oldPos = oldPos), f);
  }
  equals(n, e, t) {
    if (t.comparator) return t.comparator(n, e);
    else return n === e || (!!t.ignoreCase && n.toLowerCase() === e.toLowerCase());
  }
  removeEmpty(n) {
    let e = [];
    for (let t = 0; t < n.length; t++) if (n[t]) e.push(n[t]);
    return e;
  }
  castInput(n, e) {
    return n;
  }
  tokenize(n, e) {
    return Array.from(n);
  }
  join(n) {
    return n.join("");
  }
  postProcess(n, e) {
    return n;
  }
  get useLongestToken() {
    return !1;
  }
  buildValues(n, e, t) {
    let i = [],
      l;
    while (n) (i.push(n), (l = n.previousComponent), delete n.previousComponent, (n = l));
    i.reverse();
    let r = i.length,
      s = 0,
      o = 0,
      f = 0;
    for (; s < r; s++) {
      let u = i[s];
      if (!u.removed) {
        if (!u.added && this.useLongestToken) {
          let sliced = e.slice(o, o + u.count);
          ((sliced = sliced.map(function (c, a) {
            let g = t[f + a];
            return g.length > c.length ? g : c;
          })),
            (u.value = this.join(sliced)));
        } else u.value = this.join(e.slice(o, o + u.count));
        if (((o += u.count), !u.added)) f += u.count;
      } else ((u.value = this.join(t.slice(f, f + u.count))), (f += u.count));
    }
    return i;
  }
}

export { L };
