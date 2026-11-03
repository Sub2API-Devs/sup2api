/**
 * turndown/lib/turndown.cjs.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: turndown@7.2.0
 * pieces: chunk-vwj6ccer.js (60)
 * attribution: esm-layout 13, esm-fingerprint 47
 */
import { Bc } from "../../@mixmark-io/domino/lib/index.js";

//@ chunk-vwj6ccer.js:237838-237965 esm-layout
function kf(e) {
  for (var t = 1; t < arguments.length; t++) {
    var r = arguments[t];
    for (var key in r) if (r.hasOwnProperty(key)) e[key] = r[key];
  }
  return e;
}
//@ chunk-vwj6ccer.js:237965-238008 esm-layout
function ui(e, t) {
  return Array(t + 1).join(e);
}
//@ chunk-vwj6ccer.js:238008-238051 esm-fingerprint
function Lf(e) {
  return e.replace(/^\n*/, "");
}
//@ chunk-vwj6ccer.js:238051-238133 esm-fingerprint
function Mf(e) {
  var t = e.length;
  while (
    t > 0 &&
    e[t - 1] ===
      `
`
  )
    t--;
  return e.substring(0, t);
}
//@ chunk-vwj6ccer.js:238133-238506 esm-fingerprint
var Rf = [
  "ADDRESS",
  "ARTICLE",
  "ASIDE",
  "AUDIO",
  "BLOCKQUOTE",
  "BODY",
  "CANVAS",
  "CENTER",
  "DD",
  "DIR",
  "DIV",
  "DL",
  "DT",
  "FIELDSET",
  "FIGCAPTION",
  "FIGURE",
  "FOOTER",
  "FORM",
  "FRAMESET",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "HGROUP",
  "HR",
  "HTML",
  "ISINDEX",
  "LI",
  "MAIN",
  "MENU",
  "NAV",
  "NOFRAMES",
  "NOSCRIPT",
  "OL",
  "OUTPUT",
  "P",
  "PRE",
  "SECTION",
  "TABLE",
  "TBODY",
  "TD",
  "TFOOT",
  "TH",
  "THEAD",
  "TR",
  "UL",
];
//@ chunk-vwj6ccer.js:238506-238537 esm-layout
function li(e) {
  return xi(e, Rf);
}
//@ chunk-vwj6ccer.js:238537-238662 esm-fingerprint
var Vc = [
  "AREA",
  "BASE",
  "BR",
  "COL",
  "COMMAND",
  "EMBED",
  "HR",
  "IMG",
  "INPUT",
  "KEYGEN",
  "LINK",
  "META",
  "PARAM",
  "SOURCE",
  "TRACK",
  "WBR",
];
//@ chunk-vwj6ccer.js:238662-238693 esm-layout
function jc(e) {
  return xi(e, Vc);
}
//@ chunk-vwj6ccer.js:238693-238724 esm-layout
function If(e) {
  return zc(e, Vc);
}
//@ chunk-vwj6ccer.js:238724-238813 esm-fingerprint
var Gc = ["A", "TABLE", "THEAD", "TBODY", "TFOOT", "TH", "TD", "IFRAME", "SCRIPT", "AUDIO", "VIDEO"];
//@ chunk-vwj6ccer.js:238813-238844 esm-layout
function Of(e) {
  return xi(e, Gc);
}
//@ chunk-vwj6ccer.js:238844-238875 esm-layout
function qf(e) {
  return zc(e, Gc);
}
//@ chunk-vwj6ccer.js:238875-238924 esm-fingerprint
function xi(e, t) {
  return t.indexOf(e.nodeName) >= 0;
}
//@ chunk-vwj6ccer.js:238924-239033 esm-fingerprint
function zc(e, t) {
  return (
    e.getElementsByTagName &&
    t.some(function (r) {
      return e.getElementsByTagName(r).length;
    })
  );
}
/**
 * （第三方 turndown 的 commonmark 规则：段落、标题、列表、代码块、链接、图片等 HTML→Markdown 转换，切分错误）
 */
//@ chunk-vwj6ccer.js:239033-239043 esm-layout
var rules = {};
//@ chunk-vwj6ccer.js:239043-239112 esm-fingerprint
rules.paragraph = {
  filter: "p",
  replacement: function (e) {
    return (
      `

` +
      e +
      `

`
    );
  },
};
//@ chunk-vwj6ccer.js:239112-239184 esm-fingerprint
rules.lineBreak = {
  filter: "br",
  replacement: function (e, t, r) {
    return (
      r.br +
      `
`
    );
  },
};
//@ chunk-vwj6ccer.js:239184-239429 esm-fingerprint
rules.heading = {
  filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
  replacement: function (e, t, r) {
    var a = Number(t.nodeName.charAt(1));
    if (r.headingStyle === "setext" && a < 3) {
      var s = ui(a === 1 ? "=" : "-", e.length);
      return (
        `

` +
        e +
        `
` +
        s +
        `

`
      );
    } else
      return (
        `

` +
        ui("#", a) +
        " " +
        e +
        `

`
      );
  },
};
//@ chunk-vwj6ccer.js:239429-239562 esm-fingerprint
rules.blockquote = {
  filter: "blockquote",
  replacement: function (e) {
    return (
      (e = e.replace(/^\n+|\n+$/g, "")),
      (e = e.replace(/^/gm, "> ")),
      `

` +
        e +
        `

`
    );
  },
};
//@ chunk-vwj6ccer.js:239562-239717 esm-fingerprint
rules.list = {
  filter: ["ul", "ol"],
  replacement: function (e, t) {
    var parentNode = t.parentNode;
    if (parentNode.nodeName === "LI" && parentNode.lastElementChild === t)
      return (
        `
` + e
      );
    else
      return (
        `

` +
        e +
        `

`
      );
  },
};
//@ chunk-vwj6ccer.js:239717-240060 esm-fingerprint
rules.listItem = {
  filter: "li",
  replacement: function (e, t, r) {
    e = e
      .replace(/^\n+/, "")
      .replace(
        /\n+$/,
        `
`,
      )
      .replace(
        /\n/gm,
        `
    `,
      );
    var a = r.bulletListMarker + "   ",
      parentNode = t.parentNode;
    if (parentNode.nodeName === "OL") {
      var attribute = parentNode.getAttribute("start"),
        d = Array.prototype.indexOf.call(parentNode.children, t);
      a = (attribute ? Number(attribute) + d : d + 1) + ".  ";
    }
    return (
      a +
      e +
      (t.nextSibling && !/\n$/.test(e)
        ? `
`
        : "")
    );
  },
};
//@ chunk-vwj6ccer.js:240060-240305 esm-fingerprint
rules.indentedCodeBlock = {
  filter: function (e, t) {
    return (
      t.codeBlockStyle === "indented" &&
      e.nodeName === "PRE" &&
      e.firstChild &&
      e.firstChild.nodeName === "CODE"
    );
  },
  replacement: function (e, t, r) {
    return (
      `

    ` +
      t.firstChild.textContent.replace(
        /\n/g,
        `
    `,
      ) +
      `

`
    );
  },
};
//@ chunk-vwj6ccer.js:240305-240768 esm-fingerprint
rules.fencedCodeBlock = {
  filter: function (e, t) {
    return (
      t.codeBlockStyle === "fenced" &&
      e.nodeName === "PRE" &&
      e.firstChild &&
      e.firstChild.nodeName === "CODE"
    );
  },
  replacement: function (e, t, r) {
    var a = t.firstChild.getAttribute("class") || "",
      s = (a.match(/language-(\S+)/) || [null, ""])[1],
      textContent = t.firstChild.textContent,
      charAt = r.fence.charAt(0),
      g = 3,
      regExp = new RegExp("^" + charAt + "{3,}", "gm"),
      v;
    while ((v = regExp.exec(textContent))) if (v[0].length >= g) g = v[0].length + 1;
    var T = ui(charAt, g);
    return (
      `

` +
      T +
      s +
      `
` +
      textContent.replace(/\n$/, "") +
      `
` +
      T +
      `

`
    );
  },
};
//@ chunk-vwj6ccer.js:240768-240850 esm-fingerprint
rules.horizontalRule = {
  filter: "hr",
  replacement: function (e, t, r) {
    return (
      `

` +
      r.hr +
      `

`
    );
  },
};
//@ chunk-vwj6ccer.js:240850-241150 esm-fingerprint
rules.inlineLink = {
  filter: function (e, t) {
    return t.linkStyle === "inlined" && e.nodeName === "A" && e.getAttribute("href");
  },
  replacement: function (e, t) {
    var attribute = t.getAttribute("href");
    if (attribute) attribute = attribute.replace(/([()])/g, "\\$1");
    var a = cleanAttribute(t.getAttribute("title"));
    if (a) a = ' "' + a.replace(/"/g, '\\"') + '"';
    return "[" + e + "](" + attribute + a + ")";
  },
};
//@ chunk-vwj6ccer.js:241150-241759 esm-fingerprint
rules.referenceLink = {
  filter: function (e, t) {
    return t.linkStyle === "referenced" && e.nodeName === "A" && e.getAttribute("href");
  },
  replacement: function (e, t, r) {
    var attribute = t.getAttribute("href"),
      s = cleanAttribute(t.getAttribute("title"));
    if (s) s = ' "' + s + '"';
    var c, d;
    switch (r.linkReferenceStyle) {
      case "collapsed":
        ((c = "[" + e + "][]"), (d = "[" + e + "]: " + attribute + s));
        break;
      case "shortcut":
        ((c = "[" + e + "]"), (d = "[" + e + "]: " + attribute + s));
        break;
      default:
        var g = this.references.length + 1;
        ((c = "[" + e + "][" + g + "]"), (d = "[" + g + "]: " + attribute + s));
    }
    return (this.references.push(d), c);
  },
  references: [],
  append: function (e) {
    var t = "";
    if (this.references.length)
      ((t =
        `

` +
        this.references.join(`
`) +
        `

`),
        (this.references = []));
    return t;
  },
};
//@ chunk-vwj6ccer.js:241759-241879 esm-fingerprint
rules.emphasis = {
  filter: ["em", "i"],
  replacement: function (e, t, r) {
    if (!e.trim()) return "";
    return r.emDelimiter + e + r.emDelimiter;
  },
};
//@ chunk-vwj6ccer.js:241879-242009 esm-fingerprint
rules.strong = {
  filter: ["strong", "b"],
  replacement: function (e, t, r) {
    if (!e.trim()) return "";
    return r.strongDelimiter + e + r.strongDelimiter;
  },
};
//@ chunk-vwj6ccer.js:242009-242334 esm-fingerprint
rules.code = {
  filter: function (e) {
    var t = e.previousSibling || e.nextSibling,
      r = e.parentNode.nodeName === "PRE" && !t;
    return e.nodeName === "CODE" && !r;
  },
  replacement: function (e) {
    if (!e) return "";
    e = e.replace(/\r?\n|\r/g, " ");
    var t = /^`|^ .*?[^ ].* $|`$/.test(e) ? " " : "",
      r = "`",
      a = e.match(/`+/gm) || [];
    while (a.indexOf(r) !== -1) r = r + "`";
    return r + t + e + t + r;
  },
};
//@ chunk-vwj6ccer.js:242334-242525 esm-fingerprint
rules.image = {
  filter: "img",
  replacement: function (e, t) {
    var r = cleanAttribute(t.getAttribute("alt")),
      a = t.getAttribute("src") || "",
      s = cleanAttribute(t.getAttribute("title")),
      c = s ? ' "' + s + '"' : "";
    return a ? "![" + r + "](" + a + c + ")" : "";
  },
};
//@ chunk-vwj6ccer.js:242525-242580 esm-fingerprint
function cleanAttribute(e) {
  return e
    ? e.replace(
        /(\n+\s*)+/g,
        `
`,
      )
    : "";
}
//@ chunk-vwj6ccer.js:242580-242842 esm-fingerprint
function Wc(e) {
  ((this.options = e),
    (this._keep = []),
    (this._remove = []),
    (this.blankRule = { replacement: e.blankReplacement }),
    (this.keepReplacement = e.keepReplacement),
    (this.defaultRule = { replacement: e.defaultReplacement }),
    (this.array = []));
  for (var key in e.rules) this.array.push(e.rules[key]);
}
//@ chunk-vwj6ccer.js:242842-243362 esm-fingerprint
Wc.prototype = {
  add: function (e, t) {
    this.array.unshift(t);
  },
  keep: function (e) {
    this._keep.unshift({ filter: e, replacement: this.keepReplacement });
  },
  remove: function (e) {
    this._remove.unshift({
      filter: e,
      replacement: function () {
        return "";
      },
    });
  },
  forNode: function (e) {
    if (e.isBlank) return this.blankRule;
    var t;
    if ((t = si(this.array, e, this.options))) return t;
    if ((t = si(this._keep, e, this.options))) return t;
    if ((t = si(this._remove, e, this.options))) return t;
    return this.defaultRule;
  },
  forEach: function (e) {
    for (var t = 0; t < this.array.length; t++) e(this.array[t], t);
  },
};
//@ chunk-vwj6ccer.js:243362-243449 esm-layout
function si(e, t, r) {
  for (var a = 0; a < e.length; a++) {
    var s = e[a];
    if (Hf(s, t, r)) return s;
  }
  return;
}
//@ chunk-vwj6ccer.js:243449-243756 esm-fingerprint
function Hf(e, t, r) {
  var filter = e.filter;
  if (typeof filter === "string") {
    if (filter === t.nodeName.toLowerCase()) return !0;
  } else if (Array.isArray(filter)) {
    if (filter.indexOf(t.nodeName.toLowerCase()) > -1) return !0;
  } else if (typeof filter === "function") {
    if (filter.call(e, t, r)) return !0;
  } else throw TypeError("`filter` needs to be a string, array, or function");
}
//@ chunk-vwj6ccer.js:243756-244353 esm-fingerprint
function collapseWhitespace(e) {
  var { element: element, isBlock: isBlock, isVoid: isVoid } = e,
    s =
      e.isPre ||
      function (ne) {
        return ne.nodeName === "PRE";
      };
  if (!element.firstChild || s(element)) return;
  var c = null,
    d = !1,
    g = null,
    m = nextNode(g, element, s);
  while (m !== element) {
    if (m.nodeType === 3 || m.nodeType === 4) {
      var replaced = m.data.replace(/[ \r\n\t]+/g, " ");
      if ((!c || / $/.test(c.data)) && !d && replaced[0] === " ") replaced = replaced.substr(1);
      if (!replaced) {
        m = removeNode(m);
        continue;
      }
      ((m.data = replaced), (c = m));
    } else if (m.nodeType === 1) {
      if (isBlock(m) || m.nodeName === "BR") {
        if (c) c.data = c.data.replace(/ $/, "");
        ((c = null), (d = !1));
      } else if (isVoid(m) || s(m)) ((c = null), (d = !0));
      else if (c) d = !1;
    } else {
      m = removeNode(m);
      continue;
    }
    var T = nextNode(g, m, s);
    ((g = m), (m = T));
  }
  if (c) {
    if (((c.data = c.data.replace(/ $/, "")), !c.data)) removeNode(c);
  }
}
//@ chunk-vwj6ccer.js:244353-244439 esm-fingerprint
function removeNode(e) {
  var t = e.nextSibling || e.parentNode;
  return (e.parentNode.removeChild(e), t);
}
//@ chunk-vwj6ccer.js:244439-244571 esm-fingerprint
function nextNode(e, t, r) {
  if ((e && e.parentNode === t) || r(t)) return t.nextSibling || t.parentNode;
  return t.firstChild || t.nextSibling || t.parentNode;
}
//@ chunk-vwj6ccer.js:244571-244606 esm-layout
var Xc = typeof window < "u" ? window : {};
//@ chunk-vwj6ccer.js:244606-244715 esm-fingerprint
function Bf() {
  var DOMParser = Xc.DOMParser,
    t = !1;
  try {
    if (new DOMParser().parseFromString("", "text/html")) t = !0;
  } catch (error) {}
  return t;
}
//@ chunk-vwj6ccer.js:244715-244837 esm-fingerprint
function Pf() {
  var e = function () {};
  {
    var t = Bc();
    e.prototype.parseFromString = function (r) {
      return t.createDocument(r);
    };
  }
  return e;
}
//@ chunk-vwj6ccer.js:244837-244867 esm-fingerprint
var Uf = Bf() ? Xc.DOMParser : Pf();
//@ chunk-vwj6ccer.js:244867-245144 esm-fingerprint
function Vf(e, t) {
  var r;
  if (typeof e === "string") {
    var fromString = jf().parseFromString(
      '<x-turndown id="turndown-root">' + e + "</x-turndown>",
      "text/html",
    );
    r = fromString.getElementById("turndown-root");
  } else r = e.cloneNode(!0);
  return (
    collapseWhitespace({ element: r, isBlock: li, isVoid: jc, isPre: t.preformattedCode ? Gf : null }),
    r
  );
}
//@ chunk-vwj6ccer.js:245144-245151 esm-layout
var oi;
//@ chunk-vwj6ccer.js:245151-245189 esm-layout
function jf() {
  return ((oi = oi || new Uf()), oi);
}
//@ chunk-vwj6ccer.js:245189-245251 esm-fingerprint
function Gf(e) {
  return e.nodeName === "PRE" || e.nodeName === "CODE";
}
//@ chunk-vwj6ccer.js:245251-245388 esm-fingerprint
function zf(e, t) {
  return (
    (e.isBlock = li(e)),
    (e.isCode = e.nodeName === "CODE" || e.parentNode.isCode),
    (e.isBlank = Wf(e)),
    (e.flankingWhitespace = Xf(e, t)),
    e
  );
}
//@ chunk-vwj6ccer.js:245388-245470 esm-fingerprint
function Wf(e) {
  return !jc(e) && !Of(e) && /^\s*$/i.test(e.textContent) && !If(e) && !qf(e);
}
//@ chunk-vwj6ccer.js:245470-245759 esm-fingerprint
function Xf(e, t) {
  if (e.isBlock || (t.preformattedCode && e.isCode)) return { leading: "", trailing: "" };
  var r = Kf(e.textContent);
  if (r.leadingAscii && Uc("left", e, t)) r.leading = r.leadingNonAscii;
  if (r.trailingAscii && Uc("right", e, t)) r.trailing = r.trailingNonAscii;
  return { leading: r.leading, trailing: r.trailing };
}
//@ chunk-vwj6ccer.js:245759-245968 esm-fingerprint
function Kf(e) {
  var match = e.match(/^(([ \t\r\n]*)(\s*))(?:(?=\S)[\s\S]*\S)?((\s*?)([ \t\r\n]*))$/);
  return {
    leading: match[1],
    leadingAscii: match[2],
    leadingNonAscii: match[3],
    trailing: match[4],
    trailingNonAscii: match[5],
    trailingAscii: match[6],
  };
}
//@ chunk-vwj6ccer.js:245968-246229 esm-fingerprint
function Uc(e, t, r) {
  var a, s, c;
  if (e === "left") ((a = t.previousSibling), (s = / $/));
  else ((a = t.nextSibling), (s = /^ /));
  if (a) {
    if (a.nodeType === 3) c = s.test(a.nodeValue);
    else if (r.preformattedCode && a.nodeName === "CODE") c = !1;
    else if (a.nodeType === 1 && !li(a)) c = s.test(a.textContent);
  }
  return c;
}
//@ chunk-vwj6ccer.js:246229-246476 esm-fingerprint
var reduce = Array.prototype.reduce,
  Qf = [
    [/\\/g, "\\\\"],
    [/\*/g, "\\*"],
    [/^-/g, "\\-"],
    [/^\+ /g, "\\+ "],
    [/^(=+)/g, "\\$1"],
    [/^(#{1,6}) /g, "\\$1 "],
    [/`/g, "\\`"],
    [/^~~~/g, "\\~~~"],
    [/\[/g, "\\["],
    [/\]/g, "\\]"],
    [/^>/g, "\\>"],
    [/_/g, "\\_"],
    [/^(\d+)\. /g, "$1\\. "],
  ];
//@ chunk-vwj6ccer.js:246476-247013 esm-fingerprint
function wa(e) {
  if (!(this instanceof wa)) return new wa(e);
  var t = {
    rules: rules,
    headingStyle: "setext",
    hr: "* * *",
    bulletListMarker: "*",
    codeBlockStyle: "indented",
    fence: "```",
    emDelimiter: "_",
    strongDelimiter: "**",
    linkStyle: "inlined",
    linkReferenceStyle: "full",
    br: "  ",
    preformattedCode: !1,
    blankReplacement: function (r, a) {
      return a.isBlock
        ? `

`
        : "";
    },
    keepReplacement: function (r, a) {
      return a.isBlock
        ? `

` +
            a.outerHTML +
            `

`
        : a.outerHTML;
    },
    defaultReplacement: function (r, a) {
      return a.isBlock
        ? `

` +
            r +
            `

`
        : r;
    },
  };
  ((this.options = kf({}, t, e)), (this.rules = new Wc(this.options)));
}
//@ chunk-vwj6ccer.js:247013-247666 esm-fingerprint
wa.prototype = {
  turndown: function (e) {
    if (!Jf(e)) throw TypeError(e + " is not a string, or an element/document/fragment node.");
    if (e === "") return "";
    var t = Kc.call(this, new Vf(e, this.options));
    return $f.call(this, t);
  },
  use: function (e) {
    if (Array.isArray(e)) for (var t = 0; t < e.length; t++) this.use(e[t]);
    else if (typeof e === "function") e(this);
    else throw TypeError("plugin must be a Function or an Array of Functions");
    return this;
  },
  addRule: function (e, t) {
    return (this.rules.add(e, t), this);
  },
  keep: function (e) {
    return (this.rules.keep(e), this);
  },
  remove: function (e) {
    return (this.rules.remove(e), this);
  },
  escape: function (e) {
    return Qf.reduce(function (t, r) {
      return t.replace(r[0], r[1]);
    }, e);
  },
};
//@ chunk-vwj6ccer.js:247666-247886 esm-fingerprint
function Kc(e) {
  var t = this;
  return reduce.call(
    e.childNodes,
    function (r, a) {
      a = new zf(a, t.options);
      var s = "";
      if (a.nodeType === 3) s = a.isCode ? a.nodeValue : t.escape(a.nodeValue);
      else if (a.nodeType === 1) s = Zf.call(t, a);
      return Yc(r, s);
    },
    "",
  );
}
//@ chunk-vwj6ccer.js:247886-248066 esm-fingerprint
function $f(e) {
  var t = this;
  return (
    this.rules.forEach(function (rule) {
      if (typeof rule.append === "function") e = Yc(e, rule.append(t.options));
    }),
    e.replace(/^[\t\r\n]+/, "").replace(/[\t\r\n\s]+$/, "")
  );
}
//@ chunk-vwj6ccer.js:248066-248246 esm-fingerprint
function Zf(e) {
  var forNode = this.rules.forNode(e),
    r = Kc.call(this, e),
    flankingWhitespace = e.flankingWhitespace;
  if (flankingWhitespace.leading || flankingWhitespace.trailing) r = r.trim();
  return flankingWhitespace.leading + forNode.replacement(r, e, this.options) + flankingWhitespace.trailing;
}
//@ chunk-vwj6ccer.js:248246-248366 esm-fingerprint
function Yc(e, t) {
  var r = Mf(e),
    a = Lf(t),
    max = Math.max(e.length - r.length, t.length - a.length),
    substring = `

`.substring(0, max);
  return r + substring + a;
}
//@ chunk-vwj6ccer.js:248366-248482 esm-fingerprint
function Jf(e) {
  return (
    e != null &&
    (typeof e === "string" || (e.nodeType && (e.nodeType === 1 || e.nodeType === 9 || e.nodeType === 11)))
  );
}
//@ chunk-vwj6ccer.js:248482-248492 esm-layout
var ah = wa;
