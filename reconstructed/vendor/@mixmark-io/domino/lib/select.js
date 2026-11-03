/**
 * @mixmark-io/domino/lib/select.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:31379-42755 cjs-fingerprint
var ta = x(function (Ot, Ns) {
  var create = Object.create(null, {
      location: {
        get: function () {
          throw Error("window.location is not supported.");
        },
      },
    }),
    Rl = function (e, t) {
      return e.compareDocumentPosition(t);
    },
    Il = function (e, t) {
      return Rl(e, t) & 2 ? 1 : -1;
    },
    ea = function (e) {
      while ((e = e.nextSibling) && e.nodeType !== 1);
      return e;
    },
    It = function (e) {
      while ((e = e.previousSibling) && e.nodeType !== 1);
      return e;
    },
    Ol = function (e) {
      if ((e = e.firstChild)) while (e.nodeType !== 1 && (e = e.nextSibling));
      return e;
    },
    ql = function (e) {
      if ((e = e.lastChild)) while (e.nodeType !== 1 && (e = e.previousSibling));
      return e;
    },
    Rt = function (e) {
      if (!e.parentNode) return !1;
      var nodeType = e.parentNode.nodeType;
      return nodeType === 1 || nodeType === 9;
    },
    Es = function (e) {
      if (!e) return e;
      var t = e[0];
      if (t === '"' || t === "'") {
        if (e[e.length - 1] === t) e = e.slice(1, -1);
        else e = e.slice(1);
        return e.replace(C.str_escape, function (r) {
          var match = /^\\(?:([0-9A-Fa-f]+)|([\r\n\f]+))/.exec(r);
          if (!match) return r.slice(1);
          if (match[2]) return "";
          var s = parseInt(match[1], 16);
          return String.fromCodePoint ? String.fromCodePoint(s) : String.fromCharCode(s);
        });
      } else if (C.ident.test(e)) return lt(e);
      else return e;
    },
    lt = function (e) {
      return e.replace(C.escape, function (t) {
        var match = /^\\([0-9A-Fa-f]+)/.exec(t);
        if (!match) return t[1];
        var a = parseInt(match[1], 16);
        return String.fromCodePoint ? String.fromCodePoint(a) : String.fromCharCode(a);
      });
    },
    Hl = (function () {
      if (Array.prototype.indexOf) return Array.prototype.indexOf;
      return function (e, t) {
        var r = this.length;
        while (r--) if (this[r] === t) return r;
        return -1;
      };
    })(),
    vs = function (e, t) {
      var replaced = C.inside.source.replace(/</g, e).replace(/>/g, t);
      return new RegExp(replaced);
    },
    ve = function (e, t, r) {
      return ((e = e.source), (e = e.replace(t, r.source || r)), new RegExp(e));
    },
    _s = function (e, t) {
      return e
        .replace(/^(?:\w+:\/\/|\/+)/, "")
        .replace(/(?:\/+|\/*#.*?)$/, "")
        .split("/", t)
        .join("/");
    },
    Fl = function (e, t) {
      var replaced = e.replace(/\s+/g, ""),
        a;
      if (replaced === "even") replaced = "2n+0";
      else if (replaced === "odd") replaced = "2n+1";
      else if (replaced.indexOf("n") === -1) replaced = "0n" + replaced;
      return (
        (a = /^([+-])?(\d+)?n([+-])?(\d+)?$/.exec(replaced)),
        {
          group: a[1] === "-" ? -(a[2] || 1) : +(a[2] || 1),
          offset: a[4] ? (a[3] === "-" ? -a[4] : +a[4]) : 0,
        }
      );
    },
    fn = function (e, t, r) {
      var a = Fl(e),
        { group: group, offset: offset } = a,
        d = !r ? Ol : ql,
        g = !r ? ea : It;
      return function (m) {
        if (!Rt(m)) return;
        var v = d(m.parentNode),
          T = 0;
        while (v) {
          if (t(v, m)) T++;
          if (v === m) return ((T -= offset), group && T ? T % group === 0 && T < 0 === group < 0 : !T);
          v = g(v);
        }
      };
    },
    ce = {
      "*": (function () {
        return function () {
          return !0;
        };
      })(),
      type: function (e) {
        return (
          (e = e.toLowerCase()),
          function (t) {
            return t.nodeName.toLowerCase() === e;
          }
        );
      },
      attr: function (e, t, r, a) {
        return (
          (t = Ts[t]),
          function (s) {
            var c;
            switch (e) {
              case "for":
                c = s.htmlFor;
                break;
              case "class":
                if (((c = s.className), c === "" && s.getAttribute("class") == null)) c = null;
                break;
              case "href":
              case "src":
                c = s.getAttribute(e, 2);
                break;
              case "title":
                c = s.getAttribute("title") || null;
                break;
              case "id":
              case "lang":
              case "dir":
              case "accessKey":
              case "hidden":
              case "tabIndex":
              case "style":
                if (s.getAttribute) {
                  c = s.getAttribute(e);
                  break;
                }
              default:
                if (s.hasAttribute && !s.hasAttribute(e)) break;
                c = s[e] != null ? s[e] : s.getAttribute && s.getAttribute(e);
                break;
            }
            if (c == null) return;
            if (((c = c + ""), a)) ((c = c.toLowerCase()), (r = r.toLowerCase()));
            return t(c, r);
          }
        );
      },
      ":first-child": function (e) {
        return !It(e) && Rt(e);
      },
      ":last-child": function (e) {
        return !ea(e) && Rt(e);
      },
      ":only-child": function (e) {
        return !It(e) && !ea(e) && Rt(e);
      },
      ":nth-child": function (e, t) {
        return fn(
          e,
          function () {
            return !0;
          },
          t,
        );
      },
      ":nth-last-child": function (e) {
        return ce[":nth-child"](e, !0);
      },
      ":root": function (e) {
        return e.ownerDocument.documentElement === e;
      },
      ":empty": function (e) {
        return !e.firstChild;
      },
      ":not": function (e) {
        var t = hn(e);
        return function (r) {
          return !t(r);
        };
      },
      ":first-of-type": function (e) {
        if (!Rt(e)) return;
        var nodeName = e.nodeName;
        while ((e = It(e))) if (e.nodeName === nodeName) return;
        return !0;
      },
      ":last-of-type": function (e) {
        if (!Rt(e)) return;
        var nodeName = e.nodeName;
        while ((e = ea(e))) if (e.nodeName === nodeName) return;
        return !0;
      },
      ":only-of-type": function (e) {
        return ce[":first-of-type"](e) && ce[":last-of-type"](e);
      },
      ":nth-of-type": function (e, t) {
        return fn(
          e,
          function (r, a) {
            return r.nodeName === a.nodeName;
          },
          t,
        );
      },
      ":nth-last-of-type": function (e) {
        return ce[":nth-of-type"](e, !0);
      },
      ":checked": function (e) {
        return !!(e.checked || e.selected);
      },
      ":indeterminate": function (e) {
        return !ce[":checked"](e);
      },
      ":enabled": function (e) {
        return !e.disabled && e.type !== "hidden";
      },
      ":disabled": function (e) {
        return !!e.disabled;
      },
      ":target": function (e) {
        return e.id === create.location.hash.substring(1);
      },
      ":focus": function (e) {
        return e === e.ownerDocument.activeElement;
      },
      ":is": function (e) {
        return hn(e);
      },
      ":matches": function (e) {
        return ce[":is"](e);
      },
      ":nth-match": function (e, t) {
        var parts = e.split(/\s*,\s*/),
          a = parts.shift(),
          s = hn(parts.join(","));
        return fn(a, s, t);
      },
      ":nth-last-match": function (e) {
        return ce[":nth-match"](e, !0);
      },
      ":links-here": function (e) {
        return e + "" === create.location + "";
      },
      ":lang": function (e) {
        return function (t) {
          while (t) {
            if (t.lang) return t.lang.indexOf(e) === 0;
            t = t.parentNode;
          }
        };
      },
      ":dir": function (e) {
        return function (t) {
          while (t) {
            if (t.dir) return t.dir === e;
            t = t.parentNode;
          }
        };
      },
      ":scope": function (e, t) {
        var r = t || e.ownerDocument;
        if (r.nodeType === 9) return e === r.documentElement;
        return e === r;
      },
      ":any-link": function (e) {
        return typeof e.href === "string";
      },
      ":local-link": function (e) {
        if (e.nodeName) return e.href && e.host === create.location.host;
        var t = +e + 1;
        return function (r) {
          if (!r.href) return;
          var a = create.location + "",
            s = r + "";
          return _s(a, t) === _s(s, t);
        };
      },
      ":default": function (e) {
        return !!e.defaultSelected;
      },
      ":valid": function (e) {
        return e.willValidate || (e.validity && e.validity.valid);
      },
      ":invalid": function (e) {
        return !ce[":valid"](e);
      },
      ":in-range": function (e) {
        return e.value > e.min && e.value <= e.max;
      },
      ":out-of-range": function (e) {
        return !ce[":in-range"](e);
      },
      ":required": function (e) {
        return !!e.required;
      },
      ":optional": function (e) {
        return !e.required;
      },
      ":read-only": function (e) {
        if (e.readOnly) return !0;
        var attribute = e.getAttribute("contenteditable"),
          contentEditable = e.contentEditable,
          lower = e.nodeName.toLowerCase();
        return (
          (lower = lower !== "input" && lower !== "textarea"),
          (lower || e.disabled) && attribute == null && contentEditable !== "true"
        );
      },
      ":read-write": function (e) {
        return !ce[":read-only"](e);
      },
      ":hover": function () {
        throw Error(":hover is not supported.");
      },
      ":active": function () {
        throw Error(":active is not supported.");
      },
      ":link": function () {
        throw Error(":link is not supported.");
      },
      ":visited": function () {
        throw Error(":visited is not supported.");
      },
      ":column": function () {
        throw Error(":column is not supported.");
      },
      ":nth-column": function () {
        throw Error(":nth-column is not supported.");
      },
      ":nth-last-column": function () {
        throw Error(":nth-last-column is not supported.");
      },
      ":current": function () {
        throw Error(":current is not supported.");
      },
      ":past": function () {
        throw Error(":past is not supported.");
      },
      ":future": function () {
        throw Error(":future is not supported.");
      },
      ":contains": function (e) {
        return function (t) {
          var r = t.innerText || t.textContent || t.value || "";
          return r.indexOf(e) !== -1;
        };
      },
      ":has": function (e) {
        return function (t) {
          return ys(e, t).length > 0;
        };
      },
    },
    Ts = {
      "-": function () {
        return !0;
      },
      "=": function (e, t) {
        return e === t;
      },
      "*=": function (e, t) {
        return e.indexOf(t) !== -1;
      },
      "~=": function (e, t) {
        var r, a, s, c;
        for (a = 0; ; a = r + 1) {
          if (((r = e.indexOf(t, a)), r === -1)) return !1;
          if (((s = e[r - 1]), (c = e[r + t.length]), (!s || s === " ") && (!c || c === " "))) return !0;
        }
      },
      "|=": function (e, t) {
        var index = e.indexOf(t),
          a;
        if (index !== 0) return;
        return ((a = e[index + t.length]), a === "-" || !a);
      },
      "^=": function (e, t) {
        return e.indexOf(t) === 0;
      },
      "$=": function (e, t) {
        var index = e.lastIndexOf(t);
        return index !== -1 && index + t.length === e.length;
      },
      "!=": function (e, t) {
        return e !== t;
      },
    },
    cr = {
      " ": function (e) {
        return function (t) {
          while ((t = t.parentNode)) if (e(t)) return t;
        };
      },
      ">": function (e) {
        return function (t) {
          if ((t = t.parentNode)) return e(t) && t;
        };
      },
      "+": function (e) {
        return function (t) {
          if ((t = It(t))) return e(t) && t;
        };
      },
      "~": function (e) {
        return function (t) {
          while ((t = It(t))) if (e(t)) return t;
        };
      },
      noop: function (e) {
        return function (t) {
          return e(t) && t;
        };
      },
      ref: function (e, t) {
        var r;
        function a(s) {
          var ownerDocument = s.ownerDocument,
            elementsByTagName = ownerDocument.getElementsByTagName("*"),
            g = elementsByTagName.length;
          while (g--) if (((r = elementsByTagName[g]), a.test(s))) return ((r = null), !0);
          r = null;
        }
        return (
          (a.combinator = function (s) {
            if (!r || !r.getAttribute) return;
            var c = r.getAttribute(t) || "";
            if (c[0] === "#") c = c.substring(1);
            if (c === s.id && e(r)) return r;
          }),
          a
        );
      },
    },
    C = {
      escape: /\\(?:[^0-9A-Fa-f\r\n]|[0-9A-Fa-f]{1,6}[\r\n\t ]?)/g,
      str_escape: /(escape)|\\(\n|\r\n?|\f)/g,
      nonascii: /[\u00A0-\uFFFF]/,
      cssid: /(?:(?!-?[0-9])(?:escape|nonascii|[-_a-zA-Z0-9])+)/,
      qname: /^ *(cssid|\*)/,
      simple: /^(?:([.#]cssid)|pseudo|attr)/,
      ref: /^ *\/(cssid)\/ */,
      combinator: /^(?: +([^ \w*.#\\]) +|( )+|([^ \w*.#\\]))(?! *$)/,
      attr: /^\[(cssid)(?:([^\w]?=)(inside))?\]/,
      pseudo: /^(:cssid)(?:\((inside)\))?/,
      inside: /(?:"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|<[^"'>]*>|\\["'>]|[^"'>])*/,
      ident: /^(cssid)$/,
    };
  C.cssid = ve(C.cssid, "nonascii", C.nonascii);
  C.cssid = ve(C.cssid, "escape", C.escape);
  C.qname = ve(C.qname, "cssid", C.cssid);
  C.simple = ve(C.simple, "cssid", C.cssid);
  C.ref = ve(C.ref, "cssid", C.cssid);
  C.attr = ve(C.attr, "cssid", C.cssid);
  C.pseudo = ve(C.pseudo, "cssid", C.cssid);
  C.inside = ve(C.inside, `[^"'>]*`, C.inside);
  C.attr = ve(C.attr, "inside", vs("\\[", "\\]"));
  C.pseudo = ve(C.pseudo, "inside", vs("\\(", "\\)"));
  C.simple = ve(C.simple, "pseudo", C.pseudo);
  C.simple = ve(C.simple, "attr", C.attr);
  C.ident = ve(C.ident, "cssid", C.cssid);
  C.str_escape = ve(C.str_escape, "escape", C.escape);
  var or = function (e) {
      var replaced = e.replace(/^\s+|\s+$/g, ""),
        r,
        a = [],
        s = [],
        c,
        d,
        g,
        m,
        v;
      while (replaced) {
        if ((g = C.qname.exec(replaced)))
          ((replaced = replaced.substring(g[0].length)), (d = lt(g[1])), s.push(Jr(d, !0)));
        else if ((g = C.simple.exec(replaced)))
          ((replaced = replaced.substring(g[0].length)), (d = "*"), s.push(Jr(d, !0)), s.push(Jr(g)));
        else throw SyntaxError("Invalid selector.");
        while ((g = C.simple.exec(replaced))) ((replaced = replaced.substring(g[0].length)), s.push(Jr(g)));
        if (replaced[0] === "!")
          ((replaced = replaced.substring(1)), (c = Pl()), (c.qname = d), s.push(c.simple));
        if ((g = C.ref.exec(replaced))) {
          ((replaced = replaced.substring(g[0].length)),
            (v = cr.ref(dn(s), lt(g[1]))),
            a.push(v.combinator),
            (s = []));
          continue;
        }
        if ((g = C.combinator.exec(replaced))) {
          if (((replaced = replaced.substring(g[0].length)), (m = g[1] || g[2] || g[3]), m === ",")) {
            a.push(cr.noop(dn(s)));
            break;
          }
        } else m = "noop";
        if (!cr[m]) throw SyntaxError("Bad combinator.");
        (a.push(cr[m](dn(s))), (s = []));
      }
      if (((r = Bl(a)), (r.qname = d), (r.sel = replaced), c))
        ((c.lname = r.qname), (c.test = r), (c.qname = c.qname), (c.sel = r.sel), (r = c));
      if (v) ((v.test = r), (v.qname = r.qname), (v.sel = r.sel), (r = v));
      return r;
    },
    Jr = function (e, t) {
      if (t) return e === "*" ? ce["*"] : ce.type(e);
      if (e[1])
        return e[1][0] === "."
          ? ce.attr("class", "~=", lt(e[1].substring(1)), !1)
          : ce.attr("id", "=", lt(e[1].substring(1)), !1);
      if (e[2]) return e[3] ? ce[lt(e[2])](Es(e[3])) : ce[lt(e[2])];
      if (e[4]) {
        var r = e[6],
          matches = /["'\s]\s*I$/i.test(r);
        if (matches) r = r.replace(/\s*I$/i, "");
        return ce.attr(lt(e[4]), e[5] || "-", Es(r), matches);
      }
      throw SyntaxError("Unknown Selector.");
    },
    dn = function (e) {
      var t = e.length,
        r;
      if (t < 2) return e[0];
      return function (a) {
        if (!a) return;
        for (r = 0; r < t; r++) if (!e[r](a)) return;
        return !0;
      };
    },
    Bl = function (e) {
      if (e.length < 2)
        return function (t) {
          return !!e[0](t);
        };
      return function (t) {
        var r = e.length;
        while (r--) if (!(t = e[r](t))) return;
        return !0;
      };
    },
    Pl = function () {
      var e;
      function t(r) {
        var ownerDocument = r.ownerDocument,
          elementsByTagName = ownerDocument.getElementsByTagName(t.lname),
          c = elementsByTagName.length;
        while (c--) if (t.test(elementsByTagName[c]) && e === r) return ((e = null), !0);
        e = null;
      }
      return (
        (t.simple = function (r) {
          return ((e = r), !0);
        }),
        t
      );
    },
    hn = function (e) {
      var t = or(e),
        r = [t];
      while (t.sel) ((t = or(t.sel)), r.push(t));
      if (r.length < 2) return t;
      return function (a) {
        var s = r.length,
          c = 0;
        for (; c < s; c++) if (r[c](a)) return !0;
      };
    },
    ys = function (e, t) {
      var r = [],
        a = or(e),
        elementsByTagName = t.getElementsByTagName(a.qname),
        c = 0,
        d;
      while ((d = elementsByTagName[c++])) if (a(d)) r.push(d);
      if (a.sel) {
        while (a.sel) {
          ((a = or(a.sel)), (elementsByTagName = t.getElementsByTagName(a.qname)), (c = 0));
          while ((d = elementsByTagName[c++])) if (a(d) && Hl.call(r, d) === -1) r.push(d);
        }
        r.sort(Il);
      }
      return r;
    };
  Ns.exports = Ot = function (e, t) {
    var r, a;
    if (t.nodeType !== 11 && e.indexOf(" ") === -1) {
      if (e[0] === "#" && t.rooted && /^#[A-Z_][-A-Z0-9_]*$/i.test(e)) {
        if (t.doc._hasMultipleElementsWithId) {
          if (((r = e.substring(1)), !t.doc._hasMultipleElementsWithId(r)))
            return ((a = t.doc.getElementById(r)), a ? [a] : []);
        }
      }
      if (e[0] === "." && /^\.\w+$/.test(e)) return t.getElementsByClassName(e.substring(1));
      if (/^\w+$/.test(e)) return t.getElementsByTagName(e);
    }
    return ys(e, t);
  };
  Ot.selectors = ce;
  Ot.operators = Ts;
  Ot.combinators = cr;
  Ot.matches = function (e, t) {
    var r = { sel: t };
    do if (((r = or(r.sel)), r(e))) return !0;
    while (r.sel);
    return !1;
  };
});

export { ta };
