/**
 * highlight.js/lib/core.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: highlight.js@11.11.1
 * pieces: chunk-egr0twnb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-egr0twnb.js:565279-586332 cjs-fingerprint
var Gc = x(function (Db, Bc) {
  function Rc(e) {
    if (e instanceof Map)
      e.clear =
        e.delete =
        e.set =
          function () {
            throw Error("map is read-only");
          };
    else if (e instanceof Set)
      e.add =
        e.clear =
        e.delete =
          function () {
            throw Error("set is read-only");
          };
    return (
      Object.freeze(e),
      Object.getOwnPropertyNames(e).forEach((t) => {
        let n = e[t],
          a = typeof n;
        if ((a === "object" || a === "function") && !Object.isFrozen(n)) Rc(n);
      }),
      e
    );
  }
  class Ve {
    constructor(e) {
      if (e.data === void 0) e.data = {};
      ((this.data = e.data), (this.isMatchIgnored = !1));
    }
    ignoreMatch() {
      this.isMatchIgnored = !0;
    }
  }
  function Oc(e) {
    return e
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }
  function se(e, ...t) {
    let create = Object.create(null);
    for (let key in e) create[key] = e[key];
    return (
      t.forEach(function (a) {
        for (let key in a) create[key] = a[key];
      }),
      create
    );
  }
  var b_ = "</span>",
    bc = (e) => !!e.scope,
    f_ = (e, { prefix: prefix }) => {
      if (e.startsWith("language:")) return e.replace("language:", "language-");
      if (e.includes(".")) {
        let parts = e.split(".");
        return [`${prefix}${parts.shift()}`, ...parts.map((a, s) => `${a}${"_".repeat(s + 1)}`)].join(" ");
      }
      return `${prefix}${e}`;
    };
  class vc {
    constructor(e, t) {
      ((this.buffer = ""), (this.classPrefix = t.classPrefix), e.walk(this));
    }
    addText(e) {
      this.buffer += Oc(e);
    }
    openNode(e) {
      if (!bc(e)) return;
      let t = f_(e.scope, { prefix: this.classPrefix });
      this.span(t);
    }
    closeNode(e) {
      if (!bc(e)) return;
      this.buffer += b_;
    }
    value() {
      return this.buffer;
    }
    span(e) {
      this.buffer += `<span class="${e}">`;
    }
  }
  var fc = (e = {}) => {
    let t = { children: [] };
    return (Object.assign(t, e), t);
  };
  class We {
    constructor() {
      ((this.rootNode = fc()), (this.stack = [this.rootNode]));
    }
    get top() {
      return this.stack[this.stack.length - 1];
    }
    get root() {
      return this.rootNode;
    }
    add(e) {
      this.top.children.push(e);
    }
    openNode(e) {
      let t = fc({ scope: e });
      (this.add(t), this.stack.push(t));
    }
    closeNode() {
      if (this.stack.length > 1) return this.stack.pop();
      return;
    }
    closeAllNodes() {
      while (this.closeNode());
    }
    toJSON() {
      return JSON.stringify(this.rootNode, null, 4);
    }
    walk(e) {
      return this.constructor._walk(e, this.rootNode);
    }
    static _walk(e, t) {
      if (typeof t === "string") e.addText(t);
      else if (t.children) (e.openNode(t), t.children.forEach((n) => this._walk(e, n)), e.closeNode(t));
      return e;
    }
    static _collapse(e) {
      if (typeof e === "string") return;
      if (!e.children) return;
      if (e.children.every((t) => typeof t === "string")) e.children = [e.children.join("")];
      else
        e.children.forEach((t) => {
          We._collapse(t);
        });
    }
  }
  class Ic extends We {
    constructor(e) {
      super();
      this.options = e;
    }
    addText(e) {
      if (e === "") return;
      this.add(e);
    }
    startScope(e) {
      this.openNode(e);
    }
    endScope() {
      this.closeNode();
    }
    __addSublanguage(e, t) {
      let root = e.root;
      if (t) root.scope = `language:${t}`;
      this.add(root);
    }
    toHTML() {
      return new vc(this, this.options).value();
    }
    finalize() {
      return (this.closeAllNodes(), !0);
    }
  }
  function Ne(e) {
    if (!e) return null;
    if (typeof e === "string") return e;
    return e.source;
  }
  function Cc(e) {
    return de("(?=", e, ")");
  }
  function T_(e) {
    return de("(?:", e, ")*");
  }
  function N_(e) {
    return de("(?:", e, ")?");
  }
  function de(...e) {
    return e.map((n) => Ne(n)).join("");
  }
  function S_(e) {
    let t = e[e.length - 1];
    if (typeof t === "object" && t.constructor === Object) return (e.splice(e.length - 1, 1), t);
    else return {};
  }
  function Ye(...e) {
    return "(" + (S_(e).capture ? "" : "?:") + e.map((a) => Ne(a)).join("|") + ")";
  }
  function yc(e) {
    return new RegExp(e.toString() + "|").exec("").length - 1;
  }
  function A_(e, t) {
    let n = e && e.exec(t);
    return n && n.index === 0;
  }
  var R_ = /\[(?:[^\\\]]|\\.)*\]|\(\??|\\([1-9][0-9]*)|\\./;
  function Xe(e, { joinWith: joinWith }) {
    let n = 0;
    return e
      .map((a) => {
        n += 1;
        let s = n,
          o = Ne(a),
          r = "";
        while (o.length > 0) {
          let match = R_.exec(o);
          if (!match) {
            r += o;
            break;
          }
          if (
            ((r += o.substring(0, match.index)),
            (o = o.substring(match.index + match[0].length)),
            match[0][0] === "\\" && match[1])
          )
            r += "\\" + String(Number(match[1]) + s);
          else if (((r += match[0]), match[0] === "(")) n++;
        }
        return r;
      })
      .map((a) => `(${a})`)
      .join(joinWith);
  }
  var O_ = /\b\B/,
    hc = "[a-zA-Z]\\w*",
    Ze = "[a-zA-Z_]\\w*",
    Mc = "\\b\\d+(\\.\\d+)?",
    Dc = "(-?)(\\b0[xX][a-fA-F0-9]+|(\\b\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)",
    Lc = "\\b(0b[01]+)",
    v_ =
      "!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~",
    I_ = (e = {}) => {
      let t = /^#![ ]*\//;
      if (e.binary) e.begin = de(t, /.*\b/, e.binary, /\b.*/);
      return se(
        {
          scope: "meta",
          begin: t,
          end: /$/,
          relevance: 0,
          "on:begin": (n, a) => {
            if (n.index !== 0) a.ignoreMatch();
          },
        },
        e,
      );
    },
    Se = { begin: "\\\\[\\s\\S]", relevance: 0 },
    C_ = { scope: "string", begin: "'", end: "'", illegal: "\\n", contains: [Se] },
    y_ = { scope: "string", begin: '"', end: '"', illegal: "\\n", contains: [Se] },
    h_ = {
      begin:
        /\b(a|an|the|are|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such|will|you|your|they|like|more)\b/,
    },
    xe = function (e, t, n = {}) {
      let a = se({ scope: "comment", begin: e, end: t, contains: [] }, n);
      a.contains.push({
        scope: "doctag",
        begin: "[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)",
        end: /(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):/,
        excludeBegin: !0,
        relevance: 0,
      });
      let s = Ye(
        "I",
        "a",
        "is",
        "so",
        "us",
        "to",
        "at",
        "if",
        "in",
        "it",
        "on",
        /[A-Za-z]+['](d|ve|re|ll|t|s|n)/,
        /[A-Za-z]+[-][a-z]+/,
        /[A-Za-z][a-z]{2,}/,
      );
      return (a.contains.push({ begin: de(/[ ]+/, "(", s, /[.]?[:]?([.][ ]|[ ])/, "){3}") }), a);
    },
    M_ = xe("//", "$"),
    D_ = xe("/\\*", "\\*/"),
    L_ = xe("#", "$"),
    w_ = { scope: "number", begin: Mc, relevance: 0 },
    x_ = { scope: "number", begin: Dc, relevance: 0 },
    k_ = { scope: "number", begin: Lc, relevance: 0 },
    P_ = {
      scope: "regexp",
      begin: /\/(?=[^/\n]*\/)/,
      end: /\/[gimuy]*/,
      contains: [Se, { begin: /\[/, end: /\]/, relevance: 0, contains: [Se] }],
    },
    U_ = { scope: "title", begin: hc, relevance: 0 },
    B_ = { scope: "title", begin: Ze, relevance: 0 },
    G_ = { begin: "\\.\\s*" + Ze, relevance: 0 },
    F_ = function (e) {
      return Object.assign(e, {
        "on:begin": (t, n) => {
          n.data._beginMatch = t[1];
        },
        "on:end": (t, n) => {
          if (n.data._beginMatch !== t[1]) n.ignoreMatch();
        },
      });
    },
    freeze = Object.freeze({
      __proto__: null,
      APOS_STRING_MODE: C_,
      BACKSLASH_ESCAPE: Se,
      BINARY_NUMBER_MODE: k_,
      BINARY_NUMBER_RE: Lc,
      COMMENT: xe,
      C_BLOCK_COMMENT_MODE: D_,
      C_LINE_COMMENT_MODE: M_,
      C_NUMBER_MODE: x_,
      C_NUMBER_RE: Dc,
      END_SAME_AS_BEGIN: F_,
      HASH_COMMENT_MODE: L_,
      IDENT_RE: hc,
      MATCH_NOTHING_RE: O_,
      METHOD_GUARD: G_,
      NUMBER_MODE: w_,
      NUMBER_RE: Mc,
      PHRASAL_WORDS_MODE: h_,
      QUOTE_STRING_MODE: y_,
      REGEXP_MODE: P_,
      RE_STARTERS_RE: v_,
      SHEBANG: I_,
      TITLE_MODE: U_,
      UNDERSCORE_IDENT_RE: Ze,
      UNDERSCORE_TITLE_MODE: B_,
    });
  function q_(e, t) {
    if (e.input[e.index - 1] === ".") t.ignoreMatch();
  }
  function H_(e, t) {
    if (e.className !== void 0) ((e.scope = e.className), delete e.className);
  }
  function $_(e, t) {
    if (!t) return;
    if (!e.beginKeywords) return;
    if (
      ((e.begin = "\\b(" + e.beginKeywords.split(" ").join("|") + ")(?!\\.)(?=\\b|\\s)"),
      (e.__beforeBegin = q_),
      (e.keywords = e.keywords || e.beginKeywords),
      delete e.beginKeywords,
      e.relevance === void 0)
    )
      e.relevance = 0;
  }
  function z_(e, t) {
    if (!Array.isArray(e.illegal)) return;
    e.illegal = Ye(...e.illegal);
  }
  function K_(e, t) {
    if (!e.match) return;
    if (e.begin || e.end) throw Error("begin & end are not supported with match");
    ((e.begin = e.match), delete e.match);
  }
  function V_(e, t) {
    if (e.relevance === void 0) e.relevance = 1;
  }
  var W_ = (e, t) => {
      if (!e.beforeMatch) return;
      if (e.starts) throw Error("beforeMatch cannot be used with starts");
      let merged = Object.assign({}, e);
      (Object.keys(e).forEach((a) => {
        delete e[a];
      }),
        (e.keywords = merged.keywords),
        (e.begin = de(merged.beforeMatch, Cc(merged.begin))),
        (e.starts = { relevance: 0, contains: [Object.assign(merged, { endsParent: !0 })] }),
        (e.relevance = 0),
        delete merged.beforeMatch);
    },
    Y_ = ["of", "and", "for", "in", "not", "or", "if", "then", "parent", "list", "value"],
    X_ = "keyword";
  function wc(e, t, n = X_) {
    let create = Object.create(null);
    if (typeof e === "string") s(n, e.split(" "));
    else if (Array.isArray(e)) s(n, e);
    else
      Object.keys(e).forEach(function (o) {
        Object.assign(create, wc(e[o], t, o));
      });
    return create;
    function s(o, r) {
      if (t) r = r.map((i) => i.toLowerCase());
      r.forEach(function (i) {
        let parts = i.split("|");
        create[parts[0]] = [o, Z_(parts[0], parts[1])];
      });
    }
  }
  function Z_(e, t) {
    if (t) return Number(t);
    return Q_(e) ? 0 : 1;
  }
  function Q_(e) {
    return Y_.includes(e.toLowerCase());
  }
  var Tc = {},
    le = (e) => {
      console.error(e);
    },
    Nc = (e, ...t) => {
      console.log(`WARN: ${e}`, ...t);
    },
    Ee = (e, t) => {
      if (Tc[`${e}/${t}`]) return;
      (console.log(`Deprecated as of ${e}. ${t}`), (Tc[`${e}/${t}`] = !0));
    },
    we = Error();
  function xc(e, t, { key: key }) {
    let a = 0,
      s = e[key],
      o = {},
      r = {};
    for (let i = 1; i <= t.length; i++) ((r[i + a] = s[i]), (o[i + a] = !0), (a += yc(t[i - 1])));
    ((e[key] = r), (e[key]._emit = o), (e[key]._multi = !0));
  }
  function J_(e) {
    if (!Array.isArray(e.begin)) return;
    if (e.skip || e.excludeBegin || e.returnBegin)
      throw (le("skip, excludeBegin, returnBegin not compatible with beginScope: {}"), we);
    if (typeof e.beginScope !== "object" || e.beginScope === null)
      throw (le("beginScope must be object"), we);
    (xc(e, e.begin, { key: "beginScope" }), (e.begin = Xe(e.begin, { joinWith: "" })));
  }
  function j_(e) {
    if (!Array.isArray(e.end)) return;
    if (e.skip || e.excludeEnd || e.returnEnd)
      throw (le("skip, excludeEnd, returnEnd not compatible with endScope: {}"), we);
    if (typeof e.endScope !== "object" || e.endScope === null) throw (le("endScope must be object"), we);
    (xc(e, e.end, { key: "endScope" }), (e.end = Xe(e.end, { joinWith: "" })));
  }
  function eu(e) {
    if (e.scope && typeof e.scope === "object" && e.scope !== null)
      ((e.beginScope = e.scope), delete e.scope);
  }
  function tu(e) {
    if ((eu(e), typeof e.beginScope === "string")) e.beginScope = { _wrap: e.beginScope };
    if (typeof e.endScope === "string") e.endScope = { _wrap: e.endScope };
    (J_(e), j_(e));
  }
  function nu(e) {
    function t(r, i) {
      return new RegExp(
        Ne(r),
        "m" + (e.case_insensitive ? "i" : "") + (e.unicodeRegex ? "u" : "") + (i ? "g" : ""),
      );
    }
    class n {
      constructor() {
        ((this.matchIndexes = {}), (this.regexes = []), (this.matchAt = 1), (this.position = 0));
      }
      addRule(r, i) {
        ((i.position = this.position++),
          (this.matchIndexes[this.matchAt] = i),
          this.regexes.push([i, r]),
          (this.matchAt += yc(r) + 1));
      }
      compile() {
        if (this.regexes.length === 0) this.exec = () => null;
        let mapped = this.regexes.map((regexe) => regexe[1]);
        ((this.matcherRe = t(Xe(mapped, { joinWith: "|" }), !0)), (this.lastIndex = 0));
      }
      exec(r) {
        this.matcherRe.lastIndex = this.lastIndex;
        let match = this.matcherRe.exec(r);
        if (!match) return null;
        let index = match.findIndex((d, m) => m > 0 && d !== void 0),
          l = this.matchIndexes[index];
        return (match.splice(0, index), Object.assign(match, l));
      }
    }
    class a {
      constructor() {
        ((this.rules = []),
          (this.multiRegexes = []),
          (this.count = 0),
          (this.lastIndex = 0),
          (this.regexIndex = 0));
      }
      getMatcher(r) {
        if (this.multiRegexes[r]) return this.multiRegexes[r];
        let i = new n();
        return (
          this.rules.slice(r).forEach(([c, l]) => i.addRule(c, l)),
          i.compile(),
          (this.multiRegexes[r] = i),
          i
        );
      }
      resumingScanAtSamePosition() {
        return this.regexIndex !== 0;
      }
      considerAll() {
        this.regexIndex = 0;
      }
      addRule(r, i) {
        if ((this.rules.push([r, i]), i.type === "begin")) this.count++;
      }
      exec(r) {
        let matcher = this.getMatcher(this.regexIndex);
        matcher.lastIndex = this.lastIndex;
        let match = matcher.exec(r);
        if (this.resumingScanAtSamePosition())
          if (match && match.index === this.lastIndex);
          else {
            let matcher = this.getMatcher(0);
            ((matcher.lastIndex = this.lastIndex + 1), (match = matcher.exec(r)));
          }
        if (match) {
          if (((this.regexIndex += match.position + 1), this.regexIndex === this.count)) this.considerAll();
        }
        return match;
      }
    }
    function s(r) {
      let i = new a();
      if (
        (r.contains.forEach((contain) => i.addRule(contain.begin, { rule: contain, type: "begin" })),
        r.terminatorEnd)
      )
        i.addRule(r.terminatorEnd, { type: "end" });
      if (r.illegal) i.addRule(r.illegal, { type: "illegal" });
      return i;
    }
    function o(r, i) {
      let c = r;
      if (r.isCompiled) return c;
      ([H_, K_, tu, W_].forEach((d) => d(r, i)),
        e.compilerExtensions.forEach((compilerExtension) => compilerExtension(r, i)),
        (r.__beforeBegin = null),
        [$_, z_, V_].forEach((d) => d(r, i)),
        (r.isCompiled = !0));
      let l = null;
      if (typeof r.keywords === "object" && r.keywords.$pattern)
        ((r.keywords = Object.assign({}, r.keywords)), (l = r.keywords.$pattern), delete r.keywords.$pattern);
      if (((l = l || /\w+/), r.keywords)) r.keywords = wc(r.keywords, e.case_insensitive);
      if (((c.keywordPatternRe = t(l, !0)), i)) {
        if (!r.begin) r.begin = /\B|\b/;
        if (((c.beginRe = t(c.begin)), !r.end && !r.endsWithParent)) r.end = /\B|\b/;
        if (r.end) c.endRe = t(c.end);
        if (((c.terminatorEnd = Ne(c.end) || ""), r.endsWithParent && i.terminatorEnd))
          c.terminatorEnd += (r.end ? "|" : "") + i.terminatorEnd;
      }
      if (r.illegal) c.illegalRe = t(r.illegal);
      if (!r.contains) r.contains = [];
      if (
        ((r.contains = [].concat(
          ...r.contains.map(function (contain) {
            return au(contain === "self" ? r : contain);
          }),
        )),
        r.contains.forEach(function (contain) {
          o(contain, c);
        }),
        r.starts)
      )
        o(r.starts, i);
      return ((c.matcher = s(c)), c);
    }
    if (!e.compilerExtensions) e.compilerExtensions = [];
    if (e.contains && e.contains.includes("self"))
      throw Error(
        "ERR: contains `self` is not supported at the top-level of a language.  See documentation.",
      );
    return ((e.classNameAliases = se(e.classNameAliases || {})), o(e));
  }
  function kc(e) {
    if (!e) return !1;
    return e.endsWithParent || kc(e.starts);
  }
  function au(e) {
    if (e.variants && !e.cachedVariants)
      e.cachedVariants = e.variants.map(function (variant) {
        return se(e, { variants: null }, variant);
      });
    if (e.cachedVariants) return e.cachedVariants;
    if (kc(e)) return se(e, { starts: e.starts ? se(e.starts) : null });
    if (Object.isFrozen(e)) return se(e);
    return e;
  }
  var ru = "11.11.1";
  class HTMLInjectionError extends Error {
    constructor(e, t) {
      super(e);
      ((this.name = "HTMLInjectionError"), (this.html = t));
    }
  }
  var Ke = Oc,
    Sc = se,
    Ac = Symbol("nomatch"),
    iu = 7,
    Uc = function (e) {
      let create = Object.create(null),
        create_2 = Object.create(null),
        a = [],
        s = !0,
        o = "Could not find the language '{}', did you forget to load/include a language module?",
        r = { disableAutodetect: !0, name: "Plain text", contains: [] },
        i = {
          ignoreUnescapedHTML: !1,
          throwUnescapedHTML: !1,
          noHighlightRe: /^(no-?highlight)$/i,
          languageDetectRe: /\blang(?:uage)?-([\w-]+)\b/i,
          classPrefix: "hljs-",
          cssSelector: "pre code",
          languages: null,
          __emitter: Ic,
        };
      function c(g) {
        return i.noHighlightRe.test(g);
      }
      function l(g) {
        let v = g.className + " ";
        v += g.parentNode ? g.parentNode.className : "";
        let match = i.languageDetectRe.exec(v);
        if (match) {
          let h = M(match[1]);
          if (!h) (Nc(o.replace("{}", match[1])), Nc("Falling back to no-highlight mode for this block.", g));
          return h ? match[1] : "no-highlight";
        }
        return v.split(/\s+/).find((h) => c(h) || M(h));
      }
      function d(g, v, R) {
        let h = "",
          w = "";
        if (typeof v === "object") ((h = g), (R = v.ignoreIllegals), (w = v.language));
        else
          (Ee("10.7.0", "highlight(lang, code, ...args) has been deprecated."),
            Ee(
              "10.7.0",
              `Please use highlight(code, options) instead.
https://github.com/highlightjs/highlight.js/issues/2277`,
            ),
            (w = g),
            (h = v));
        if (R === void 0) R = !0;
        let U = { code: h, language: w };
        z("before:highlight", U);
        let G = U.result ? U.result : m(U.language, U.code, R);
        return ((G.code = U.code), z("after:highlight", G), G);
      }
      function m(g, v, R, h) {
        let create_2 = Object.create(null);
        function U(T, I) {
          return T.keywords[I];
        }
        function G() {
          if (!y.keywords) {
            X.addText(H);
            return;
          }
          let T = 0;
          y.keywordPatternRe.lastIndex = 0;
          let match = y.keywordPatternRe.exec(H),
            L = "";
          while (match) {
            L += H.substring(T, match.index);
            let B = te.case_insensitive ? match[0].toLowerCase() : match[0],
              Z = U(y, B);
            if (Z) {
              let [re, Fc] = Z;
              if ((X.addText(L), (L = ""), (create_2[B] = (create_2[B] || 0) + 1), create_2[B] <= iu))
                ve += Fc;
              if (re.startsWith("_")) L += match[0];
              else {
                let qc = te.classNameAliases[re] || re;
                ee(match[0], qc);
              }
            } else L += match[0];
            ((T = y.keywordPatternRe.lastIndex), (match = y.keywordPatternRe.exec(H)));
          }
          ((L += H.substring(T)), X.addText(L));
        }
        function j() {
          if (H === "") return;
          let T = null;
          if (typeof y.subLanguage === "string") {
            if (!create[y.subLanguage]) {
              X.addText(H);
              return;
            }
            ((T = m(y.subLanguage, H, !0, Oe[y.subLanguage])), (Oe[y.subLanguage] = T._top));
          } else T = _(H, y.subLanguage.length ? y.subLanguage : null);
          if (y.relevance > 0) ve += T.relevance;
          X.__addSublanguage(T._emitter, T.language);
        }
        function Y() {
          if (y.subLanguage != null) j();
          else G();
          H = "";
        }
        function ee(T, I) {
          if (T === "") return;
          (X.startScope(I), X.addText(T), X.endScope());
        }
        function pe(T, I) {
          let L = 1,
            B = I.length - 1;
          while (L <= B) {
            if (!T._emit[L]) {
              L++;
              continue;
            }
            let Z = te.classNameAliases[T[L]] || T[L],
              re = I[L];
            if (Z) ee(re, Z);
            else ((H = re), G(), (H = ""));
            L++;
          }
        }
        function Ae(T, I) {
          if (T.scope && typeof T.scope === "string") X.openNode(te.classNameAliases[T.scope] || T.scope);
          if (T.beginScope) {
            if (T.beginScope._wrap)
              (ee(H, te.classNameAliases[T.beginScope._wrap] || T.beginScope._wrap), (H = ""));
            else if (T.beginScope._multi) (pe(T.beginScope, I), (H = ""));
          }
          return ((y = Object.create(T, { parent: { value: y } })), y);
        }
        function be(T, I, L) {
          let B = A_(T.endRe, L);
          if (B) {
            if (T["on:end"]) {
              let Z = new Ve(T);
              if ((T["on:end"](I, Z), Z.isMatchIgnored)) B = !1;
            }
            if (B) {
              while (T.endsParent && T.parent) T = T.parent;
              return T;
            }
          }
          if (T.endsWithParent) return be(T.parent, I, L);
        }
        function ke(T) {
          if (y.matcher.regexIndex === 0) return ((H += T[0]), 1);
          else return ((Fe = !0), 0);
        }
        function Pe(T) {
          let I = T[0],
            rule = T.rule,
            B = new Ve(rule),
            Z = [rule.__beforeBegin, rule["on:begin"]];
          for (let re of Z) {
            if (!re) continue;
            if ((re(T, B), B.isMatchIgnored)) return ke(I);
          }
          if (rule.skip) H += I;
          else {
            if (rule.excludeBegin) H += I;
            if ((Y(), !rule.returnBegin && !rule.excludeBegin)) H = I;
          }
          return (Ae(rule, T), rule.returnBegin ? 0 : I.length);
        }
        function Ue(T) {
          let I = T[0],
            substring = v.substring(T.index),
            B = be(y, T, substring);
          if (!B) return Ac;
          let Z = y;
          if (y.endScope && y.endScope._wrap) (Y(), ee(I, y.endScope._wrap));
          else if (y.endScope && y.endScope._multi) (Y(), pe(y.endScope, T));
          else if (Z.skip) H += I;
          else {
            if (!(Z.returnEnd || Z.excludeEnd)) H += I;
            if ((Y(), Z.excludeEnd)) H = I;
          }
          do {
            if (y.scope) X.closeNode();
            if (!y.skip && !y.subLanguage) ve += y.relevance;
            y = y.parent;
          } while (y !== B.parent);
          if (B.starts) Ae(B.starts, T);
          return Z.returnEnd ? 0 : I.length;
        }
        function Be() {
          let T = [];
          for (let I = y; I !== te; I = I.parent) if (I.scope) T.unshift(I.scope);
          T.forEach((I) => X.openNode(I));
        }
        let me = {};
        function Re(T, I) {
          let L = I && I[0];
          if (((H += T), L == null)) return (Y(), 0);
          if (me.type === "begin" && I.type === "end" && me.index === I.index && L === "") {
            if (((H += v.slice(I.index, I.index + 1)), !s)) {
              let B = Error(`0 width match regex (${g})`);
              throw ((B.languageName = g), (B.badRule = me.rule), B);
            }
            return 1;
          }
          if (((me = I), I.type === "begin")) return Pe(I);
          else if (I.type === "illegal" && !R) {
            let B = Error('Illegal lexeme "' + L + '" for mode "' + (y.scope || "<unnamed>") + '"');
            throw ((B.mode = y), B);
          } else if (I.type === "end") {
            let B = Ue(I);
            if (B !== Ac) return B;
          }
          if (I.type === "illegal" && L === "")
            return (
              (H += `
`),
              1
            );
          if (Ge > 1e5 && Ge > I.index * 3)
            throw Error("potential infinite loop, way more iterations than matches");
          return ((H += L), L.length);
        }
        let te = M(g);
        if (!te) throw (le(o.replace("{}", g)), Error('Unknown language: "' + g + '"'));
        let F = nu(te),
          ie = "",
          y = h || F,
          Oe = {},
          X = new i.__emitter(i);
        Be();
        let H = "",
          ve = 0,
          oe = 0,
          Ge = 0,
          Fe = !1;
        try {
          if (!te.__emitTokens) {
            y.matcher.considerAll();
            for (;;) {
              if ((Ge++, Fe)) Fe = !1;
              else y.matcher.considerAll();
              y.matcher.lastIndex = oe;
              let match = y.matcher.exec(v);
              if (!match) break;
              let substring = v.substring(oe, match.index),
                L = Re(substring, match);
              oe = match.index + L;
            }
            Re(v.substring(oe));
          } else te.__emitTokens(v, X);
          return (
            X.finalize(),
            (ie = X.toHTML()),
            { language: g, value: ie, relevance: ve, illegal: !1, _emitter: X, _top: y }
          );
        } catch (error) {
          if (error.message && error.message.includes("Illegal"))
            return {
              language: g,
              value: Ke(v),
              illegal: !0,
              relevance: 0,
              _illegalBy: {
                message: error.message,
                index: oe,
                context: v.slice(oe - 100, oe + 100),
                mode: error.mode,
                resultSoFar: ie,
              },
              _emitter: X,
            };
          else if (s)
            return {
              language: g,
              value: Ke(v),
              illegal: !1,
              relevance: 0,
              errorRaised: error,
              _emitter: X,
              _top: y,
            };
          else throw error;
        }
      }
      function p(g) {
        let v = { value: Ke(g), illegal: !1, relevance: 0, _top: r, _emitter: new i.__emitter(i) };
        return (v._emitter.addText(g), v);
      }
      function _(g, v) {
        v = v || i.languages || Object.keys(create);
        let R = p(g),
          mapped = v
            .filter(M)
            .filter(D)
            .map((Y) => m(Y, g, !1));
        mapped.unshift(R);
        let sorted = mapped.sort((Y, ee) => {
            if (Y.relevance !== ee.relevance) return ee.relevance - Y.relevance;
            if (Y.language && ee.language) {
              if (M(Y.language).supersetOf === ee.language) return 1;
              else if (M(ee.language).supersetOf === Y.language) return -1;
            }
            return 0;
          }),
          [U, G] = sorted,
          j = U;
        return ((j.secondBest = G), j);
      }
      function E(g, v, R) {
        let h = (v && create_2[v]) || R;
        (g.classList.add("hljs"), g.classList.add(`language-${h}`));
      }
      function u(g) {
        let v = null,
          R = l(g);
        if (c(R)) return;
        if ((z("before:highlightElement", { el: g, language: R }), g.dataset.highlighted)) {
          console.log(
            "Element previously highlighted. To highlight again, first unset `dataset.highlighted`.",
            g,
          );
          return;
        }
        if (g.children.length > 0) {
          if (!i.ignoreUnescapedHTML)
            (console.warn(
              "One of your code blocks includes unescaped HTML. This is a potentially serious security risk.",
            ),
              console.warn("https://github.com/highlightjs/highlight.js/wiki/security"),
              console.warn("The element with unescaped HTML:"),
              console.warn(g));
          if (i.throwUnescapedHTML)
            throw new HTMLInjectionError("One of your code blocks includes unescaped HTML.", g.innerHTML);
        }
        v = g;
        let textContent = v.textContent,
          w = R ? d(textContent, { language: R, ignoreIllegals: !0 }) : _(textContent);
        if (
          ((g.innerHTML = w.value),
          (g.dataset.highlighted = "yes"),
          E(g, R, w.language),
          (g.result = { language: w.language, re: w.relevance, relevance: w.relevance }),
          w.secondBest)
        )
          g.secondBest = { language: w.secondBest.language, relevance: w.secondBest.relevance };
        z("after:highlightElement", { el: g, result: w, text: textContent });
      }
      function b(g) {
        i = Sc(i, g);
      }
      let f = () => {
        (N(), Ee("10.6.0", "initHighlighting() deprecated.  Use highlightAll() now."));
      };
      function O() {
        (N(), Ee("10.6.0", "initHighlightingOnLoad() deprecated.  Use highlightAll() now."));
      }
      let S = !1;
      function N() {
        function g() {
          N();
        }
        if (document.readyState === "loading") {
          if (!S) window.addEventListener("DOMContentLoaded", g, !1);
          S = !0;
          return;
        }
        document.querySelectorAll(i.cssSelector).forEach(u);
      }
      function A(g, v) {
        let R = null;
        try {
          R = v(e);
        } catch (error) {
          if ((le("Language definition for '{}' could not be registered.".replace("{}", g)), !s)) throw error;
          else le(error);
          R = r;
        }
        if (!R.name) R.name = g;
        if (((create[g] = R), (R.rawDefinition = v.bind(null, e)), R.aliases))
          P(R.aliases, { languageName: g });
      }
      function C(g) {
        delete create[g];
        for (let v of Object.keys(create_2)) if (create_2[v] === g) delete create_2[v];
      }
      function k() {
        return Object.keys(create);
      }
      function M(g) {
        return ((g = (g || "").toLowerCase()), create[g] || create[create_2[g]]);
      }
      function P(g, { languageName: languageName }) {
        if (typeof g === "string") g = [g];
        g.forEach((R) => {
          create_2[R.toLowerCase()] = languageName;
        });
      }
      function D(g) {
        let v = M(g);
        return v && !v.disableAutodetect;
      }
      function K(g) {
        if (g["before:highlightBlock"] && !g["before:highlightElement"])
          g["before:highlightElement"] = (v) => {
            g["before:highlightBlock"](Object.assign({ block: v.el }, v));
          };
        if (g["after:highlightBlock"] && !g["after:highlightElement"])
          g["after:highlightElement"] = (v) => {
            g["after:highlightBlock"](Object.assign({ block: v.el }, v));
          };
      }
      function W(g) {
        (K(g), a.push(g));
      }
      function J(g) {
        let index = a.indexOf(g);
        if (index !== -1) a.splice(index, 1);
      }
      function z(g, v) {
        let R = g;
        a.forEach(function (h) {
          if (h[R]) h[R](v);
        });
      }
      function V(g) {
        return (
          Ee("10.7.0", "highlightBlock will be removed entirely in v12.0"),
          Ee("10.7.0", "Please use highlightElement now."),
          u(g)
        );
      }
      (Object.assign(e, {
        highlight: d,
        highlightAuto: _,
        highlightAll: N,
        highlightElement: u,
        highlightBlock: V,
        configure: b,
        initHighlighting: f,
        initHighlightingOnLoad: O,
        registerLanguage: A,
        unregisterLanguage: C,
        listLanguages: k,
        getLanguage: M,
        registerAliases: P,
        autoDetection: D,
        inherit: Sc,
        addPlugin: W,
        removePlugin: J,
      }),
        (e.debugMode = function () {
          s = !1;
        }),
        (e.safeMode = function () {
          s = !0;
        }),
        (e.versionString = ru),
        (e.regex = { concat: de, lookahead: Cc, either: Ye, optional: N_, anyNumberOfTimes: T_ }));
      for (let key in freeze) if (typeof freeze[key] === "object") Rc(freeze[key]);
      return (Object.assign(e, freeze), e);
    },
    ge = Uc({});
  ge.newInstance = () => Uc({});
  Bc.exports = ge;
  ge.HighlightJS = ge;
  ge.default = ge;
});

export { Gc };
