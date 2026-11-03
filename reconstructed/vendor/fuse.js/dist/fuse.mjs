/**
 * fuse.js/dist/fuse.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fuse.js@7.0.0
 * pieces: chunk-dcmhvw5a.js (50)
 * attribution: affinity 3, esm-fingerprint 38, esm-layout 9
 */
import { Qe, ot, Ta, Gh, Bh, va } from "../../lodash-es/_inlinedHelpers.js";

//@ chunk-dcmhvw5a.js:27251-27294 affinity
function Me(e) {
  return e !== void 0 && e !== null;
}
//@ chunk-dcmhvw5a.js:27294-27332 affinity
function er(e) {
  return !e.trim().length;
}
//@ chunk-dcmhvw5a.js:27332-27444 esm-fingerprint
function Pa(e) {
  return e == null
    ? e === void 0
      ? "[object Undefined]"
      : "[object Null]"
    : Object.prototype.toString.call(e);
}
//@ chunk-dcmhvw5a.js:27444-27702 esm-fingerprint
var Vh = "Incorrect 'index' type",
  Yh = (e) => `Invalid value for key ${e}`,
  Jh = (e) => `Pattern length exceeds max of ${e}.`,
  Xh = (e) => `Missing ${e} property in key`,
  qh = (e) => `Property 'weight' in key '${e}' must be a positive integer`,
  hasOwnProperty_4 = Object.prototype.hasOwnProperty;
//@ chunk-dcmhvw5a.js:27702-27984 esm-fingerprint
class Da {
  constructor(e) {
    ((this._keys = []), (this._keyMap = {}));
    let n = 0;
    (e.forEach((r) => {
      let s = Ia(r);
      (this._keys.push(s), (this._keyMap[s.id] = s), (n += s.weight));
    }),
      this._keys.forEach((_key) => {
        _key.weight /= n;
      }));
  }
  get(e) {
    return this._keyMap[e];
  }
  keys() {
    return this._keys;
  }
  toJSON() {
    return JSON.stringify(this._keys);
  }
}
//@ chunk-dcmhvw5a.js:27984-28270 esm-fingerprint
function Ia(e) {
  let n = null,
    r = null,
    s = null,
    a = 1,
    c = null;
  if (Qe(e) || ot(e)) ((s = e), (n = Aa(e)), (r = tr(e)));
  else {
    if (!hasOwnProperty_4.call(e, "name")) throw Error(Xh("name"));
    let g = e.name;
    if (((s = g), hasOwnProperty_4.call(e, "weight"))) {
      if (((a = e.weight), a <= 0)) throw Error(qh(g));
    }
    ((n = Aa(g)), (r = tr(g)), (c = e.getFn));
  }
  return { path: n, id: r, weight: a, src: s, getFn: c };
}
//@ chunk-dcmhvw5a.js:28270-28313 esm-layout
function Aa(e) {
  return ot(e) ? e : e.split(".");
}
//@ chunk-dcmhvw5a.js:28313-28355 esm-layout
function tr(e) {
  return ot(e) ? e.join(".") : e;
}
//@ chunk-dcmhvw5a.js:28355-28669 esm-fingerprint
function Zh(e, n) {
  let r = [],
    s = !1,
    a = (c, g, m) => {
      if (!Me(c)) return;
      if (!g[m]) r.push(c);
      else {
        let f = g[m],
          h = c[f];
        if (!Me(h)) return;
        if (m === g.length - 1 && (Qe(h) || Ta(h) || Gh(h))) r.push(Bh(h));
        else if (ot(h)) {
          s = !0;
          for (let y = 0, b = h.length; y < b; y += 1) a(h[y], g, m + 1);
        } else if (g.length) a(h, g, m + 1);
      }
    };
  return (a(e, Qe(n) ? n.split(".") : n, 0), s ? r : r[0]);
}
//@ chunk-dcmhvw5a.js:28669-29041 esm-fingerprint
var Qh = { includeMatches: !1, findAllMatches: !1, minMatchCharLength: 1 },
  e_ = {
    isCaseSensitive: !1,
    includeScore: !1,
    keys: [],
    shouldSort: !0,
    sortFn: (e, n) => (e.score === n.score ? (e.idx < n.idx ? -1 : 1) : e.score < n.score ? -1 : 1),
  },
  n_ = { location: 0, threshold: 0.6, distance: 100 },
  o_ = { useExtendedSearch: !1, getFn: Zh, ignoreLocation: !1, ignoreFieldNorm: !1, fieldNormWeight: 1 },
  ue = { ...e_, ...Qh, ...n_, ...o_ },
  r_ = /[^ ]+/g;
//@ chunk-dcmhvw5a.js:29041-29259 esm-fingerprint
function s_(e = 1, n = 3) {
  let r = new Map(),
    pow = Math.pow(10, n);
  return {
    get(a) {
      let c = a.match(r_).length;
      if (r.has(c)) return r.get(c);
      let g = 1 / Math.pow(c, 0.5 * e),
        m = parseFloat(Math.round(g * pow) / pow);
      return (r.set(c, m), m);
    },
    clear() {
      r.clear();
    },
  };
}
//@ chunk-dcmhvw5a.js:29259-30662 esm-fingerprint
class Jn {
  constructor({ getFn: e = ue.getFn, fieldNormWeight: n = ue.fieldNormWeight } = {}) {
    ((this.norm = s_(n, 3)), (this.getFn = e), (this.isCreated = !1), this.setIndexRecords());
  }
  setSources(e = []) {
    this.docs = e;
  }
  setIndexRecords(e = []) {
    this.records = e;
  }
  setKeys(e = []) {
    ((this.keys = e),
      (this._keysMap = {}),
      e.forEach((n, r) => {
        this._keysMap[n.id] = r;
      }));
  }
  create() {
    if (this.isCreated || !this.docs.length) return;
    if (((this.isCreated = !0), Qe(this.docs[0])))
      this.docs.forEach((doc, n) => {
        this._addString(doc, n);
      });
    else
      this.docs.forEach((doc, n) => {
        this._addObject(doc, n);
      });
    this.norm.clear();
  }
  add(e) {
    let size = this.size();
    if (Qe(e)) this._addString(e, size);
    else this._addObject(e, size);
  }
  removeAt(e) {
    this.records.splice(e, 1);
    for (let n = e, size = this.size(); n < size; n += 1) this.records[n].i -= 1;
  }
  getValueForItemAtKeyId(e, n) {
    return e[this._keysMap[n]];
  }
  size() {
    return this.records.length;
  }
  _addString(e, n) {
    if (!Me(e) || er(e)) return;
    let r = { v: e, i: n, n: this.norm.get(e) };
    this.records.push(r);
  }
  _addObject(e, n) {
    let r = { i: n, $: {} };
    (this.keys.forEach((key, a) => {
      let c = key.getFn ? key.getFn(e) : this.getFn(e, key.path);
      if (!Me(c)) return;
      if (ot(c)) {
        let g = [],
          m = [{ nestedArrIndex: -1, value: c }];
        while (m.length) {
          let { nestedArrIndex: nestedArrIndex, value: h } = m.pop();
          if (!Me(h)) continue;
          if (Qe(h) && !er(h)) {
            let y = { v: h, i: nestedArrIndex, n: this.norm.get(h) };
            g.push(y);
          } else if (ot(h))
            h.forEach((y, b) => {
              m.push({ nestedArrIndex: b, value: y });
            });
        }
        r.$[a] = g;
      } else if (Qe(c) && !er(c)) {
        let g = { v: c, n: this.norm.get(c) };
        r.$[a] = g;
      }
    }),
      this.records.push(r));
  }
  toJSON() {
    return { keys: this.keys, records: this.records };
  }
}
//@ chunk-dcmhvw5a.js:30662-30837 esm-fingerprint
function xa(e, n, { getFn: r = ue.getFn, fieldNormWeight: s = ue.fieldNormWeight } = {}) {
  let a = new Jn({ getFn: r, fieldNormWeight: s });
  return (a.setKeys(e.map(Ia)), a.setSources(n), a.create(), a);
}
//@ chunk-dcmhvw5a.js:30837-31016 esm-fingerprint
function i_(e, { getFn: n = ue.getFn, fieldNormWeight: r = ue.fieldNormWeight } = {}) {
  let { keys: keys, records: records } = e,
    c = new Jn({ getFn: n, fieldNormWeight: r });
  return (c.setKeys(keys), c.setIndexRecords(records), c);
}
//@ chunk-dcmhvw5a.js:31016-31229 esm-fingerprint
function Vn(
  e,
  {
    errors: n = 0,
    currentLocation: r = 0,
    expectedLocation: s = 0,
    distance: a = ue.distance,
    ignoreLocation: c = ue.ignoreLocation,
  } = {},
) {
  let g = n / e.length;
  if (c) return g;
  let abs = Math.abs(s - r);
  if (!a) return abs ? 1 : g;
  return g + abs / a;
}
//@ chunk-dcmhvw5a.js:31229-31452 esm-fingerprint
function a_(e = [], n = ue.minMatchCharLength) {
  let r = [],
    s = -1,
    a = -1,
    c = 0;
  for (let g = e.length; c < g; c += 1) {
    let m = e[c];
    if (m && s === -1) s = c;
    else if (!m && s !== -1) {
      if (((a = c - 1), a - s + 1 >= n)) r.push([s, a]);
      s = -1;
    }
  }
  if (e[c - 1] && c - s >= n) r.push([s, c - 1]);
  return r;
}
//@ chunk-dcmhvw5a.js:31452-31462 esm-layout
var bt = 32;
//@ chunk-dcmhvw5a.js:31462-32815 esm-fingerprint
function l_(
  e,
  n,
  r,
  {
    location: s = ue.location,
    distance: a = ue.distance,
    threshold: c = ue.threshold,
    findAllMatches: g = ue.findAllMatches,
    minMatchCharLength: m = ue.minMatchCharLength,
    includeMatches: f = ue.includeMatches,
    ignoreLocation: h = ue.ignoreLocation,
  } = {},
) {
  if (n.length > bt) throw Error(Jh(bt));
  let y = n.length,
    b = e.length,
    max = Math.max(0, Math.min(s, b)),
    C = c,
    w = max,
    L = m > 1 || f,
    v = L ? Array(b) : [],
    j;
  while ((j = e.indexOf(n, w)) > -1) {
    let ae = Vn(n, { currentLocation: j, expectedLocation: max, distance: a, ignoreLocation: h });
    if (((C = Math.min(ae, C)), (w = j + y), L)) {
      let me = 0;
      while (me < y) ((v[j + me] = 1), (me += 1));
    }
  }
  w = -1;
  let x = [],
    K = 1,
    q = y + b,
    ee = 1 << (y - 1);
  for (let ae = 0; ae < y; ae += 1) {
    let me = 0,
      he = q;
    while (me < he) {
      if (
        Vn(n, {
          errors: ae,
          currentLocation: max + he,
          expectedLocation: max,
          distance: a,
          ignoreLocation: h,
        }) <= C
      )
        me = he;
      else q = he;
      he = Math.floor((q - me) / 2 + me);
    }
    q = he;
    let max_2 = Math.max(1, max - he + 1),
      P = g ? b : Math.min(max + he, b) + y,
      R = Array(P + 2);
    R[P + 1] = (1 << ae) - 1;
    for (let G = P; G >= max_2; G -= 1) {
      let Q = G - 1,
        se = r[e.charAt(Q)];
      if (L) v[Q] = +!!se;
      if (((R[G] = ((R[G + 1] << 1) | 1) & se), ae)) R[G] |= ((x[G + 1] | x[G]) << 1) | 1 | x[G + 1];
      if (R[G] & ee) {
        if (
          ((K = Vn(n, {
            errors: ae,
            currentLocation: Q,
            expectedLocation: max,
            distance: a,
            ignoreLocation: h,
          })),
          K <= C)
        ) {
          if (((C = K), (w = Q), w <= max)) break;
          max_2 = Math.max(1, 2 * max - w);
        }
      }
    }
    if (
      Vn(n, { errors: ae + 1, currentLocation: max, expectedLocation: max, distance: a, ignoreLocation: h }) >
      C
    )
      break;
    x = R;
  }
  let Z = { isMatch: w >= 0, score: Math.max(0.001, K) };
  if (L) {
    let ae = a_(v, m);
    if (!ae.length) Z.isMatch = !1;
    else if (f) Z.indices = ae;
  }
  return Z;
}
//@ chunk-dcmhvw5a.js:32815-32923 esm-fingerprint
function d_(e) {
  let n = {};
  for (let r = 0, s = e.length; r < s; r += 1) {
    let charAt = e.charAt(r);
    n[charAt] = (n[charAt] || 0) | (1 << (s - r - 1));
  }
  return n;
}
//@ chunk-dcmhvw5a.js:32923-34297 esm-fingerprint
class lr {
  constructor(
    e,
    {
      location: n = ue.location,
      threshold: r = ue.threshold,
      distance: s = ue.distance,
      includeMatches: a = ue.includeMatches,
      findAllMatches: c = ue.findAllMatches,
      minMatchCharLength: g = ue.minMatchCharLength,
      isCaseSensitive: m = ue.isCaseSensitive,
      ignoreLocation: f = ue.ignoreLocation,
    } = {},
  ) {
    if (
      ((this.options = {
        location: n,
        threshold: r,
        distance: s,
        includeMatches: a,
        findAllMatches: c,
        minMatchCharLength: g,
        isCaseSensitive: m,
        ignoreLocation: f,
      }),
      (this.pattern = m ? e : e.toLowerCase()),
      (this.chunks = []),
      !this.pattern.length)
    )
      return;
    let h = (b, S) => {
        this.chunks.push({ pattern: b, alphabet: d_(b), startIndex: S });
      },
      y = this.pattern.length;
    if (y > bt) {
      let b = 0,
        S = y % bt,
        C = y - S;
      while (b < C) (h(this.pattern.substr(b, bt), b), (b += bt));
      if (S) {
        let w = y - bt;
        h(this.pattern.substr(w), w);
      }
    } else h(this.pattern, 0);
  }
  searchIn(e) {
    let { isCaseSensitive: isCaseSensitive, includeMatches: includeMatches } = this.options;
    if (!isCaseSensitive) e = e.toLowerCase();
    if (this.pattern === e) {
      let C = { isMatch: !0, score: 0 };
      if (includeMatches) C.indices = [[0, e.length - 1]];
      return C;
    }
    let {
        location: location,
        distance: distance,
        threshold: threshold,
        findAllMatches: findAllMatches,
        minMatchCharLength: minMatchCharLength,
        ignoreLocation: ignoreLocation,
      } = this.options,
      h = [],
      y = 0,
      b = !1;
    this.chunks.forEach(({ pattern: pattern, alphabet: alphabet, startIndex: startIndex }) => {
      let {
        isMatch: isMatch,
        score: score,
        indices: indices,
      } = l_(e, pattern, alphabet, {
        location: location + startIndex,
        distance: distance,
        threshold: threshold,
        findAllMatches: findAllMatches,
        minMatchCharLength: minMatchCharLength,
        includeMatches: includeMatches,
        ignoreLocation: ignoreLocation,
      });
      if (isMatch) b = !0;
      if (((y += score), isMatch && indices)) h = [...h, ...indices];
    });
    let S = { isMatch: b, score: b ? y / this.chunks.length : 1 };
    if (b && includeMatches) S.indices = h;
    return S;
  }
}
//@ chunk-dcmhvw5a.js:34297-34453 esm-fingerprint
class it {
  constructor(e) {
    this.pattern = e;
  }
  static isMultiMatch(e) {
    return ka(e, this.multiRegex);
  }
  static isSingleMatch(e) {
    return ka(e, this.singleRegex);
  }
  search() {}
}
//@ chunk-dcmhvw5a.js:34453-34506 esm-layout
function ka(e, n) {
  let match = e.match(n);
  return match ? match[1] : null;
}
//@ chunk-dcmhvw5a.js:34506-34763 esm-fingerprint
class Ma extends it {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "exact";
  }
  static get multiRegex() {
    return /^="(.*)"$/;
  }
  static get singleRegex() {
    return /^=(.*)$/;
  }
  search(e) {
    let n = e === this.pattern;
    return { isMatch: n, score: n ? 0 : 1, indices: [0, this.pattern.length - 1] };
  }
}
//@ chunk-dcmhvw5a.js:34763-35029 esm-fingerprint
class La extends it {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "inverse-exact";
  }
  static get multiRegex() {
    return /^!"(.*)"$/;
  }
  static get singleRegex() {
    return /^!(.*)$/;
  }
  search(e) {
    let r = e.indexOf(this.pattern) === -1;
    return { isMatch: r, score: r ? 0 : 1, indices: [0, e.length - 1] };
  }
}
//@ chunk-dcmhvw5a.js:35029-35305 esm-fingerprint
class Na extends it {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "prefix-exact";
  }
  static get multiRegex() {
    return /^\^"(.*)"$/;
  }
  static get singleRegex() {
    return /^\^(.*)$/;
  }
  search(e) {
    let startsWith = e.startsWith(this.pattern);
    return { isMatch: startsWith, score: startsWith ? 0 : 1, indices: [0, this.pattern.length - 1] };
  }
}
//@ chunk-dcmhvw5a.js:35305-35581 esm-fingerprint
class Ua extends it {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "inverse-prefix-exact";
  }
  static get multiRegex() {
    return /^!\^"(.*)"$/;
  }
  static get singleRegex() {
    return /^!\^(.*)$/;
  }
  search(e) {
    let n = !e.startsWith(this.pattern);
    return { isMatch: n, score: n ? 0 : 1, indices: [0, e.length - 1] };
  }
}
//@ chunk-dcmhvw5a.js:35581-35871 esm-fingerprint
class Ha extends it {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "suffix-exact";
  }
  static get multiRegex() {
    return /^"(.*)"\$$/;
  }
  static get singleRegex() {
    return /^(.*)\$$/;
  }
  search(e) {
    let endsWith = e.endsWith(this.pattern);
    return {
      isMatch: endsWith,
      score: endsWith ? 0 : 1,
      indices: [e.length - this.pattern.length, e.length - 1],
    };
  }
}
//@ chunk-dcmhvw5a.js:35871-36145 esm-fingerprint
class za extends it {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "inverse-suffix-exact";
  }
  static get multiRegex() {
    return /^!"(.*)"\$$/;
  }
  static get singleRegex() {
    return /^!(.*)\$$/;
  }
  search(e) {
    let n = !e.endsWith(this.pattern);
    return { isMatch: n, score: n ? 0 : 1, indices: [0, e.length - 1] };
  }
}
//@ chunk-dcmhvw5a.js:36145-36765 esm-fingerprint
class dr extends it {
  constructor(
    e,
    {
      location: n = ue.location,
      threshold: r = ue.threshold,
      distance: s = ue.distance,
      includeMatches: a = ue.includeMatches,
      findAllMatches: c = ue.findAllMatches,
      minMatchCharLength: g = ue.minMatchCharLength,
      isCaseSensitive: m = ue.isCaseSensitive,
      ignoreLocation: f = ue.ignoreLocation,
    } = {},
  ) {
    super(e);
    this._bitapSearch = new lr(e, {
      location: n,
      threshold: r,
      distance: s,
      includeMatches: a,
      findAllMatches: c,
      minMatchCharLength: g,
      isCaseSensitive: m,
      ignoreLocation: f,
    });
  }
  static get type() {
    return "fuzzy";
  }
  static get multiRegex() {
    return /^"(.*)"$/;
  }
  static get singleRegex() {
    return /^(.*)$/;
  }
  search(e) {
    return this._bitapSearch.searchIn(e);
  }
}
//@ chunk-dcmhvw5a.js:36765-37092 esm-fingerprint
class cr extends it {
  constructor(e) {
    super(e);
  }
  static get type() {
    return "include";
  }
  static get multiRegex() {
    return /^'"(.*)"$/;
  }
  static get singleRegex() {
    return /^'(.*)$/;
  }
  search(e) {
    let n = 0,
      r,
      s = [],
      a = this.pattern.length;
    while ((r = e.indexOf(this.pattern, n)) > -1) ((n = r + a), s.push([r, n - 1]));
    let c = !!s.length;
    return { isMatch: c, score: c ? 0 : 1, indices: s };
  }
}
//@ chunk-dcmhvw5a.js:37092-37185 esm-layout
var nr = [Ma, cr, Na, Ua, za, Ha, La, dr],
  Oa = nr.length,
  c_ = / +(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/,
  u_ = "|";
//@ chunk-dcmhvw5a.js:37185-37534 esm-fingerprint
function p_(e, n = {}) {
  return e.split(u_).map((r) => {
    let filtered = r
        .trim()
        .split(c_)
        .filter((c) => c && !!c.trim()),
      a = [];
    for (let c = 0, g = filtered.length; c < g; c += 1) {
      let m = filtered[c],
        f = !1,
        h = -1;
      while (!f && ++h < Oa) {
        let y = nr[h],
          isMultiMatch = y.isMultiMatch(m);
        if (isMultiMatch) (a.push(new y(isMultiMatch, n)), (f = !0));
      }
      if (f) continue;
      h = -1;
      while (++h < Oa) {
        let y = nr[h],
          isSingleMatch = y.isSingleMatch(m);
        if (isSingleMatch) {
          a.push(new y(isSingleMatch, n));
          break;
        }
      }
    }
    return a;
  });
}
//@ chunk-dcmhvw5a.js:37534-37568 esm-layout
var g_ = new Set([dr.type, cr.type]);
//@ chunk-dcmhvw5a.js:37568-38641 esm-fingerprint
class Fa {
  constructor(
    e,
    {
      isCaseSensitive: n = ue.isCaseSensitive,
      includeMatches: r = ue.includeMatches,
      minMatchCharLength: s = ue.minMatchCharLength,
      ignoreLocation: a = ue.ignoreLocation,
      findAllMatches: c = ue.findAllMatches,
      location: g = ue.location,
      threshold: m = ue.threshold,
      distance: f = ue.distance,
    } = {},
  ) {
    ((this.query = null),
      (this.options = {
        isCaseSensitive: n,
        includeMatches: r,
        minMatchCharLength: s,
        findAllMatches: c,
        ignoreLocation: a,
        location: g,
        threshold: m,
        distance: f,
      }),
      (this.pattern = n ? e : e.toLowerCase()),
      (this.query = p_(this.pattern, this.options)));
  }
  static condition(e, n) {
    return n.useExtendedSearch;
  }
  searchIn(e) {
    let query = this.query;
    if (!query) return { isMatch: !1, score: 1 };
    let { includeMatches: includeMatches, isCaseSensitive: isCaseSensitive } = this.options;
    e = isCaseSensitive ? e : e.toLowerCase();
    let a = 0,
      c = [],
      g = 0;
    for (let m = 0, f = query.length; m < f; m += 1) {
      let h = query[m];
      ((c.length = 0), (a = 0));
      for (let y = 0, b = h.length; y < b; y += 1) {
        let S = h[y],
          { isMatch: isMatch, indices: indices, score: score } = S.search(e);
        if (isMatch) {
          if (((a += 1), (g += score), includeMatches)) {
            let v = S.constructor.type;
            if (g_.has(v)) c = [...c, ...indices];
            else c.push(indices);
          }
        } else {
          ((g = 0), (a = 0), (c.length = 0));
          break;
        }
      }
      if (a) {
        let y = { isMatch: !0, score: g / a };
        if (includeMatches) y.indices = c;
        return y;
      }
    }
    return { isMatch: !1, score: 1 };
  }
}
//@ chunk-dcmhvw5a.js:38641-38651 esm-layout
var rr = [];
//@ chunk-dcmhvw5a.js:38651-38683 esm-layout
function m_(...e) {
  rr.push(...e);
}
//@ chunk-dcmhvw5a.js:38683-38803 esm-fingerprint
function sr(e, n) {
  for (let r = 0, s = rr.length; r < s; r += 1) {
    let a = rr[r];
    if (a.condition(e, n)) return new a(e, n);
  }
  return new lr(e, n);
}
//@ chunk-dcmhvw5a.js:38803-39007 esm-fingerprint
var Yn = { AND: "$and", OR: "$or" },
  ir = { PATH: "$path", PATTERN: "$val" },
  ar = (e) => !!(e[Yn.AND] || e[Yn.OR]),
  f_ = (e) => !!e[ir.PATH],
  h_ = (e) => !ot(e) && va(e) && !ar(e),
  Ra = (e) => ({ [Yn.AND]: Object.keys(e).map((n) => ({ [n]: e[n] })) });
//@ chunk-dcmhvw5a.js:39007-39423 esm-fingerprint
function ja(e, n, { auto: r = !0 } = {}) {
  let s = (a) => {
    let keys = Object.keys(a),
      g = f_(a);
    if (!g && keys.length > 1 && !ar(a)) return s(Ra(a));
    if (h_(a)) {
      let f = g ? a[ir.PATH] : keys[0],
        h = g ? a[ir.PATTERN] : a[f];
      if (!Qe(h)) throw Error(Yh(f));
      let y = { keyId: tr(f), pattern: h };
      if (r) y.searcher = sr(h, n);
      return y;
    }
    let m = { children: [], operator: keys[0] };
    return (
      keys.forEach((f) => {
        let h = a[f];
        if (ot(h))
          h.forEach((y) => {
            m.children.push(s(y));
          });
      }),
      m
    );
  };
  if (!ar(e)) e = Ra(e);
  return s(e);
}
//@ chunk-dcmhvw5a.js:39423-39636 esm-fingerprint
function __(e, { ignoreFieldNorm: ignoreFieldNorm = ue.ignoreFieldNorm }) {
  e.forEach((r) => {
    let s = 1;
    (r.matches.forEach(({ key: key, norm: norm, score: score }) => {
      let m = key ? key.weight : null;
      s *= Math.pow(score === 0 && m ? Number.EPSILON : score, (m || 1) * (ignoreFieldNorm ? 1 : norm));
    }),
      (r.score = s));
  });
}
//@ chunk-dcmhvw5a.js:39636-39880 esm-fingerprint
function y_(e, n) {
  let matches = e.matches;
  if (((n.matches = []), !Me(matches))) return;
  matches.forEach((s) => {
    if (!Me(s.indices) || !s.indices.length) return;
    let { indices: indices, value: c } = s,
      g = { indices: indices, value: c };
    if (s.key) g.key = s.key.src;
    if (s.idx > -1) g.refIndex = s.idx;
    n.matches.push(g);
  });
}
//@ chunk-dcmhvw5a.js:39880-39913 esm-fingerprint
function S_(e, n) {
  n.score = e.score;
}
//@ chunk-dcmhvw5a.js:39913-40147 esm-fingerprint
function b_(e, n, { includeMatches: r = ue.includeMatches, includeScore: s = ue.includeScore } = {}) {
  let a = [];
  if (r) a.push(y_);
  if (s) a.push(S_);
  return e.map((c) => {
    let { idx: idx } = c,
      m = { item: n[idx], refIndex: idx };
    if (a.length)
      a.forEach((f) => {
        f(c, m);
      });
    return m;
  });
}
//@ chunk-dcmhvw5a.js:40147-42656 esm-fingerprint
class gve {
  constructor(e, n = {}, r) {
    ((this.options = { ...ue, ...n }),
      this.options.useExtendedSearch,
      (this._keyStore = new Da(this.options.keys)),
      this.setCollection(e, r));
  }
  setCollection(e, n) {
    if (((this._docs = e), n && !(n instanceof Jn))) throw Error(Vh);
    this._myIndex =
      n ||
      xa(this.options.keys, this._docs, {
        getFn: this.options.getFn,
        fieldNormWeight: this.options.fieldNormWeight,
      });
  }
  add(e) {
    if (!Me(e)) return;
    (this._docs.push(e), this._myIndex.add(e));
  }
  remove(e = () => !1) {
    let n = [];
    for (let r = 0, s = this._docs.length; r < s; r += 1) {
      let a = this._docs[r];
      if (e(a, r)) (this.removeAt(r), (r -= 1), (s -= 1), n.push(a));
    }
    return n;
  }
  removeAt(e) {
    (this._docs.splice(e, 1), this._myIndex.removeAt(e));
  }
  getIndex() {
    return this._myIndex;
  }
  search(e, { limit: n = -1 } = {}) {
    let {
        includeMatches: includeMatches,
        includeScore: includeScore,
        shouldSort: shouldSort,
        sortFn: sortFn,
        ignoreFieldNorm: ignoreFieldNorm,
      } = this.options,
      m = Qe(e)
        ? Qe(this._docs[0])
          ? this._searchStringList(e)
          : this._searchObjectList(e)
        : this._searchLogical(e);
    if ((__(m, { ignoreFieldNorm: ignoreFieldNorm }), shouldSort)) m.sort(sortFn);
    if (Ta(n) && n > -1) m = m.slice(0, n);
    return b_(m, this._docs, { includeMatches: includeMatches, includeScore: includeScore });
  }
  _searchStringList(e) {
    let n = sr(e, this.options),
      { records: records } = this._myIndex,
      s = [];
    return (
      records.forEach(({ v: a, i: c, n: g }) => {
        if (!Me(a)) return;
        let { isMatch: isMatch, score: score, indices: indices } = n.searchIn(a);
        if (isMatch)
          s.push({ item: a, idx: c, matches: [{ score: score, value: a, norm: g, indices: indices }] });
      }),
      s
    );
  }
  _searchLogical(e) {
    let n = ja(e, this.options),
      r = (g, m, f) => {
        if (!g.children) {
          let { keyId: keyId, searcher: searcher } = g,
            _findMatches = this._findMatches({
              key: this._keyStore.get(keyId),
              value: this._myIndex.getValueForItemAtKeyId(m, keyId),
              searcher: searcher,
            });
          if (_findMatches && _findMatches.length) return [{ idx: f, item: m, matches: _findMatches }];
          return [];
        }
        let h = [];
        for (let y = 0, b = g.children.length; y < b; y += 1) {
          let S = g.children[y],
            C = r(S, m, f);
          if (C.length) h.push(...C);
          else if (g.operator === Yn.AND) return [];
        }
        return h;
      },
      records = this._myIndex.records,
      a = {},
      c = [];
    return (
      records.forEach(({ $: g, i: m }) => {
        if (Me(g)) {
          let f = r(n, g, m);
          if (f.length) {
            if (!a[m]) ((a[m] = { idx: m, item: g, matches: [] }), c.push(a[m]));
            f.forEach(({ matches: matches }) => {
              a[m].matches.push(...matches);
            });
          }
        }
      }),
      c
    );
  }
  _searchObjectList(e) {
    let n = sr(e, this.options),
      { keys: keys, records: records } = this._myIndex,
      a = [];
    return (
      records.forEach(({ $: c, i: g }) => {
        if (!Me(c)) return;
        let m = [];
        if (
          (keys.forEach((f, h) => {
            m.push(...this._findMatches({ key: f, value: c[h], searcher: n }));
          }),
          m.length)
        )
          a.push({ idx: g, item: c, matches: m });
      }),
      a
    );
  }
  _findMatches({ key: e, value: n, searcher: r }) {
    if (!Me(n)) return [];
    let s = [];
    if (ot(n))
      n.forEach(({ v: a, i: c, n: g }) => {
        if (!Me(a)) return;
        let { isMatch: isMatch, score: score, indices: indices } = r.searchIn(a);
        if (isMatch) s.push({ score: score, key: e, value: a, idx: c, norm: g, indices: indices });
      });
    else {
      let { v: a, n: c } = n,
        { isMatch: isMatch, score: score, indices: indices } = r.searchIn(a);
      if (isMatch) s.push({ score: score, key: e, value: a, norm: c, indices: indices });
    }
    return s;
  }
}
//@ chunk-dcmhvw5a.js:42656-42676 esm-fingerprint
gve.version = "7.0.0";
//@ chunk-dcmhvw5a.js:42676-42695 esm-fingerprint
gve.createIndex = xa;
//@ chunk-dcmhvw5a.js:42695-42713 esm-fingerprint
gve.parseIndex = i_;
//@ chunk-dcmhvw5a.js:42713-42727 esm-layout
gve.config = ue;
//@ chunk-dcmhvw5a.js:42727-42745 esm-fingerprint
gve.parseQuery = ja;
//@ chunk-dcmhvw5a.js:42745-42752 affinity
m_(Fa);

export { gve, Pa };
