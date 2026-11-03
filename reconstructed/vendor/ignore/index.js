/**
 * ignore/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ignore@7.0.5
 * pieces: chunk-82kqcve8.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-82kqcve8.js:4002-8454 cjs-fingerprint
var Vpe = x(function (_h, Sr) {
  function as(e) {
    return Array.isArray(e) ? e : [e];
  }
  var xd = void 0,
    po = "",
    os = " ",
    fo = "\\",
    Od = /^\s+$/,
    Dd = /(?:[^\\]|^)\\$/,
    Td = /^\\!/,
    Id = /^\\#/,
    Fd = /\r?\n/g,
    $d = /^\.{0,2}\/|^\.{1,2}$/,
    Ld = /\/$/,
    Zt = "/",
    ls = "node-ignore";
  if (typeof Symbol < "u") ls = Symbol.for("node-ignore");
  var cs = ls,
    Qt = (e, n, r) => (Object.defineProperty(e, n, { value: r }), r),
    Nd = /([0-z])-([0-z])/g,
    ds = () => !1,
    Wd = (e) => e.replace(Nd, (n, r, s) => (r.charCodeAt(0) <= s.charCodeAt(0) ? n : po)),
    Bd = (e) => {
      let { length: n } = e;
      return e.slice(0, n - (n % 2));
    },
    jd = [
      [/^\uFEFF/, () => po],
      [/((?:\\\\)*?)(\\?\s+)$/, (e, n, r) => n + (r.indexOf("\\") === 0 ? os : po)],
      [
        /(\\+?)\s/g,
        (e, n) => {
          let { length: r } = n;
          return n.slice(0, r - (r % 2)) + os;
        },
      ],
      [/[\\$.|*+(){^]/g, (e) => `\\${e}`],
      [/(?!\\)\?/g, () => "[^/]"],
      [/^\//, () => "^"],
      [/\//g, () => "\\/"],
      [/^\^*\\\*\\\*\\\//, () => "^(?:.*\\/)?"],
      [
        /^(?=[^^])/,
        function () {
          return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
        },
      ],
      [/\\\/\\\*\\\*(?=\\\/|$)/g, (e, n, r) => (n + 6 < r.length ? "(?:\\/[^\\/]+)*" : "\\/.+")],
      [
        /(^|[^\\]+)(\\\*)+(?=.+)/g,
        (e, n, r) => {
          let replaced = r.replace(/\\\*/g, "[^\\/]*");
          return n + replaced;
        },
      ],
      [/\\\\\\(?=[$.|*+(){^])/g, () => fo],
      [/\\\\/g, () => fo],
      [
        /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
        (e, n, r, s, h) =>
          n === fo
            ? `\\[${r}${Bd(s)}${h}`
            : h === "]"
              ? s.length % 2 === 0
                ? `[${Wd(r)}${s}]`
                : "[]"
              : "[]",
      ],
      [/(?:[^*])$/, (e) => (/\/$/.test(e) ? `${e}$` : `${e}(?=$|\\/$)`)],
    ],
    Ud = /(^|\\\/)?\\\*$/,
    An = "regex",
    wr = "checkRegex",
    ss = "_",
    Gd = {
      [An](e, n) {
        return `${n ? `${n}[^/]+` : "[^/]*"}(?=$|\\/$)`;
      },
      [wr](e, n) {
        return `${n ? `${n}[^/]*` : "[^/]*"}(?=$|\\/$)`;
      },
    },
    Yd = (e) => jd.reduce((n, [r, s]) => n.replace(r, s.bind(e)), e),
    br = (e) => typeof e === "string",
    Vd = (e) => e && br(e) && !Od.test(e) && !Dd.test(e) && e.indexOf("#") !== 0,
    Kd = (e) => e.split(Fd).filter(Boolean);
  class us {
    constructor(e, n, r, s, h, y) {
      ((this.pattern = e),
        (this.mark = n),
        (this.negative = h),
        Qt(this, "body", r),
        Qt(this, "ignoreCase", s),
        Qt(this, "regexPrefix", y));
    }
    get regex() {
      let e = ss + An;
      if (this[e]) return this[e];
      return this._make(An, e);
    }
    get checkRegex() {
      let e = ss + wr;
      if (this[e]) return this[e];
      return this._make(wr, e);
    }
    _make(e, n) {
      let replaced = this.regexPrefix.replace(Ud, Gd[e]),
        s = this.ignoreCase ? new RegExp(replaced, "i") : new RegExp(replaced);
      return Qt(this, n, s);
    }
  }
  var qd = ({ pattern: pattern, mark: mark }, r) => {
    let s = !1,
      h = pattern;
    if (h.indexOf("!") === 0) ((s = !0), (h = h.substr(1)));
    h = h.replace(Td, "!").replace(Id, "#");
    let y = Yd(h);
    return new us(pattern, mark, h, r, s, y);
  };
  class ms {
    constructor(e) {
      ((this._ignoreCase = e), (this._rules = []));
    }
    _add(e) {
      if (e && e[cs]) {
        ((this._rules = this._rules.concat(e._rules._rules)), (this._added = !0));
        return;
      }
      if (br(e)) e = { pattern: e };
      if (Vd(e.pattern)) {
        let n = qd(e, this._ignoreCase);
        ((this._added = !0), this._rules.push(n));
      }
    }
    add(e) {
      return ((this._added = !1), as(br(e) ? Kd(e) : e).forEach(this._add, this), this._added);
    }
    test(e, n, r) {
      let s = !1,
        h = !1,
        y;
      this._rules.forEach((_rule) => {
        let { negative: negative } = _rule;
        if ((h === negative && s !== h) || (negative && !s && !h && !n)) return;
        if (!_rule[r].test(e)) return;
        ((s = !negative), (h = negative), (y = negative ? xd : _rule));
      });
      let w = { ignored: s, unignored: h };
      if (y) w.rule = y;
      return w;
    }
  }
  var Xd = (e, n) => {
      throw new n(e);
    },
    lt = (e, n, r) => {
      if (!br(e)) return r(`path must be a string, but got \`${n}\``, TypeError);
      if (!e) return r("path must not be empty", TypeError);
      if (lt.isNotRelative(e))
        return r(`path should be a \`path.relative()\`d string, but got "${n}"`, RangeError);
      return !0;
    },
    fs = (e) => $d.test(e);
  lt.isNotRelative = fs;
  lt.convert = (e) => e;
  class gs {
    constructor({ ignorecase: e = !0, ignoreCase: n = e, allowRelativePaths: r = !1 } = {}) {
      (Qt(this, cs, !0), (this._rules = new ms(n)), (this._strictPathCheck = !r), this._initCache());
    }
    _initCache() {
      ((this._ignoreCache = Object.create(null)), (this._testCache = Object.create(null)));
    }
    add(e) {
      if (this._rules.add(e)) this._initCache();
      return this;
    }
    addPattern(e) {
      return this.add(e);
    }
    _test(e, n, r, s) {
      let h = e && lt.convert(e);
      return (lt(h, e, this._strictPathCheck ? Xd : ds), this._t(h, n, r, s));
    }
    checkIgnore(e) {
      if (!Ld.test(e)) return this.test(e);
      let filtered = e.split(Zt).filter(Boolean);
      if ((filtered.pop(), filtered.length)) {
        let _t = this._t(filtered.join(Zt) + Zt, this._testCache, !0, filtered);
        if (_t.ignored) return _t;
      }
      return this._rules.test(e, !1, wr);
    }
    _t(e, n, r, s) {
      if (e in n) return n[e];
      if (!s) s = e.split(Zt).filter(Boolean);
      if ((s.pop(), !s.length)) return (n[e] = this._rules.test(e, r, An));
      let _t = this._t(s.join(Zt) + Zt, n, r, s);
      return (n[e] = _t.ignored ? _t : this._rules.test(e, r, An));
    }
    ignores(e) {
      return this._test(e, this._ignoreCache, !1).ignored;
    }
    createFilter() {
      return (e) => !this.ignores(e);
    }
    filter(e) {
      return as(e).filter(this.createFilter());
    }
    test(e) {
      return this._test(e, this._testCache, !0);
    }
  }
  var ho = (e) => new gs(e),
    Zd = (e) => lt(e && lt.convert(e), e, ds),
    Jd = () => {
      let e = (r) => (/^\\\\\?\\/.test(r) || /["<>|\u0000-\u001F]+/u.test(r) ? r : r.replace(/\\/g, "/"));
      lt.convert = e;
      let n = /^[a-z]:\//i;
      lt.isNotRelative = (r) => n.test(r) || fs(r);
    };
  Sr.exports = ho;
  ho.default = ho;
  Sr.exports.isPathValid = Zd;
  Qt(Sr.exports, Symbol.for("setupWindows"), Jd);
});

export { Vpe };
