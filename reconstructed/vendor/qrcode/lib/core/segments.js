/**
 * qrcode/lib/core/segments.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { q } from "./mode.js";
import { fr } from "./numeric-data.js";
import { cr } from "./alphanumeric-data.js";
import { gr } from "./byte-data.js";
import { wr } from "./kanji-data.js";
import { Ge } from "./regex.js";
import { N } from "./utils.js";
import { Er } from "../../../dijkstrajs/dijkstra.js";

//@ chunk-spjgqa4y.js:14833-17575 cjs-fingerprint
var Br = x(function (ao) {
  var d = q(),
    $e = fr(),
    Xe = cr(),
    et = gr(),
    tt = wr(),
    k = Ge(),
    F = N(),
    br = Er();
  function Tr(t) {
    return unescape(encodeURIComponent(t)).length;
  }
  function me(t, e, r) {
    let n = [],
      i;
    while ((i = t.exec(r)) !== null) n.push({ data: i[0], index: i.index, mode: e, length: i[0].length });
    return n;
  }
  function xr(t) {
    let e = me(k.NUMERIC, d.NUMERIC, t),
      r = me(k.ALPHANUMERIC, d.ALPHANUMERIC, t),
      n,
      i;
    if (F.isKanjiModeEnabled()) ((n = me(k.BYTE, d.BYTE, t)), (i = me(k.KANJI, d.KANJI, t)));
    else ((n = me(k.BYTE_KANJI, d.BYTE, t)), (i = []));
    return e
      .concat(r, n, i)
      .sort(function (s, l) {
        return s.index - l.index;
      })
      .map(function (s) {
        return { data: s.data, mode: s.mode, length: s.length };
      });
  }
  function Ze(t, e) {
    switch (e) {
      case d.NUMERIC:
        return $e.getBitsLength(t);
      case d.ALPHANUMERIC:
        return Xe.getBitsLength(t);
      case d.KANJI:
        return tt.getBitsLength(t);
      case d.BYTE:
        return et.getBitsLength(t);
    }
  }
  function lo(t) {
    return t.reduce(function (e, r) {
      let n = e.length - 1 >= 0 ? e[e.length - 1] : null;
      if (n && n.mode === r.mode) return ((e[e.length - 1].data += r.data), e);
      return (e.push(r), e);
    }, []);
  }
  function uo(t) {
    let e = [];
    for (let r = 0; r < t.length; r++) {
      let n = t[r];
      switch (n.mode) {
        case d.NUMERIC:
          e.push([
            n,
            { data: n.data, mode: d.ALPHANUMERIC, length: n.length },
            { data: n.data, mode: d.BYTE, length: n.length },
          ]);
          break;
        case d.ALPHANUMERIC:
          e.push([n, { data: n.data, mode: d.BYTE, length: n.length }]);
          break;
        case d.KANJI:
          e.push([n, { data: n.data, mode: d.BYTE, length: Tr(n.data) }]);
          break;
        case d.BYTE:
          e.push([{ data: n.data, mode: d.BYTE, length: Tr(n.data) }]);
      }
    }
    return e;
  }
  function fo(t, e) {
    let r = {},
      n = { start: {} },
      i = ["start"];
    for (let o = 0; o < t.length; o++) {
      let s = t[o],
        l = [];
      for (let u = 0; u < s.length; u++) {
        let f = s[u],
          a = "" + o + u;
        (l.push(a), (r[a] = { node: f, lastCount: 0 }), (n[a] = {}));
        for (let h = 0; h < i.length; h++) {
          let c = i[h];
          if (r[c] && r[c].node.mode === f.mode)
            ((n[c][a] = Ze(r[c].lastCount + f.length, f.mode) - Ze(r[c].lastCount, f.mode)),
              (r[c].lastCount += f.length));
          else {
            if (r[c]) r[c].lastCount = f.length;
            n[c][a] = Ze(f.length, f.mode) + 4 + d.getCharCountIndicator(f.mode, e);
          }
        }
      }
      i = l;
    }
    for (let o = 0; o < i.length; o++) n[i[o]].end = 0;
    return { map: n, table: r };
  }
  function Cr(t, e) {
    let r,
      bestModeForData = d.getBestModeForData(t);
    if (((r = d.from(e, bestModeForData)), r !== d.BYTE && r.bit < bestModeForData.bit))
      throw Error(
        '"' +
          t +
          '" cannot be encoded with mode ' +
          d.toString(r) +
          `.
 Suggested mode is: ` +
          d.toString(bestModeForData),
      );
    if (r === d.KANJI && !F.isKanjiModeEnabled()) r = d.BYTE;
    switch (r) {
      case d.NUMERIC:
        return new $e(t);
      case d.ALPHANUMERIC:
        return new Xe(t);
      case d.KANJI:
        return new tt(t);
      case d.BYTE:
        return new et(t);
    }
  }
  ao.fromArray = function (e) {
    return e.reduce(function (r, n) {
      if (typeof n === "string") r.push(Cr(n, null));
      else if (n.data) r.push(Cr(n.data, n.mode));
      return r;
    }, []);
  };
  ao.fromString = function (e, r) {
    let n = xr(e, F.isKanjiModeEnabled()),
      i = uo(n),
      o = fo(i, r),
      find_path = br.find_path(o.map, "start", "end"),
      l = [];
    for (let u = 1; u < find_path.length - 1; u++) l.push(o.table[find_path[u]].node);
    return ao.fromArray(lo(l));
  };
  ao.rawSplit = function (e) {
    return ao.fromArray(xr(e, F.isKanjiModeEnabled()));
  };
});

export { Br };
