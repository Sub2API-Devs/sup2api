/**
 * services/artifacts/htmlTokenizerBudget.ts
 *
 * 2.1.316 新增。带嵌套与属性预算的 HTML 扫描，用于检查 artifact 页面中的运行时块。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ktx79ksk.js (4)
 * attribution: placement 4
 */
import {
  W,
  F,
  w,
  G,
  U,
  RAWTEXT_MODES,
  H,
  B,
  Y,
  q,
  K,
  J,
  P,
  Z,
  Q,
  j,
  V,
} from "../../../vendor/@mixmark-io/domino/lib/HTMLParser.js";
import { Tokenizer } from "../../../vendor/parse5/dist/tokenizer/index.js";

//@ chunk-ktx79ksk.js:2221-2282 placement
function nestingBudgetExceeded(s) {
  return scanHtmlWithBudget(s, { depth: W, totalOpens: F }).exceeded;
}
//@ chunk-ktx79ksk.js:2282-2416 placement
function budgetedTokenizer(s, a) {
  let t = 0,
    u = !1,
    c = new BudgetedTokenizer(s, a, (T) => {
      if (((t += T), t > w)) return ((u = !0), c.pause(), !1);
      return !0;
    });
  return { tokenizer: c, overBudget: () => u };
}
/**
 * 在嵌套与属性预算内扫描 HTML
 */
//@ chunk-ktx79ksk.js:2416-6062 placement
function scanHtmlWithBudget(s, a) {
  let t = [],
    u = [],
    c = [],
    T = [],
    r = [],
    p = 0,
    x = 0,
    R = 0,
    C = 0,
    b = 0,
    _ = 0,
    h = 0,
    I = new Set(),
    O = 0,
    g = 0,
    y = 0,
    D = 0,
    A = !1,
    v = new Map(),
    k = !1;
  function l() {
    ((k = !0), N.pause());
  }
  let S = () => {};
  function X() {
    while (t.length > 0 && r.at(-1) === "f") {
      let o = t.pop();
      if ((c.pop(), u.pop() === !0 && _ > 0)) {
        if ((_--, r.at(-1) === "i")) r.pop();
      }
      if (o === "svg" || o === "math") {
        if ((b--, T.pop(), r.at(-1) === "f")) r.pop();
      } else if (o === "select" && p > 0) p--;
      else if (o === "frameset" && x > 0) x--;
    }
  }
  function L(o) {
    if (o === void 0) return !1;
    return o.some((e) => {
      let i = e !== null && typeof e === "object" ? e.name : void 0;
      if (typeof i !== "string") return !1;
      let lower = i.toLowerCase();
      return lower === "color" || lower === "face" || lower === "size";
    });
  }
  let N = new BudgetedTokenizer(
    {},
    {
      onStartTag(o) {
        if (k) return;
        if (((h += t.length + 1 + g), O++, a !== null && (h > w || O > G))) {
          l();
          return;
        }
        let tagName = o.tagName;
        if (r.at(-1) === "f" && U.has(tagName) && (tagName !== "font" || L(o.attrs))) X();
        let i = r.length === 0 || r.at(-1) === "i";
        if (i && (tagName === "html" || tagName === "body")) {
          let n = !(t.length <= 2 && t.every((f) => f === "html" || f === "head"));
          for (let f of o.attrs ?? []) I.add((tagName === "html" ? "h:" : "b:") + f.name);
          if (n) {
            if (((h += 8 * I.size), a !== null && h > w)) l();
            return;
          }
        }
        if (
          (b > 0 && (tagName === "mglyph" || tagName === "malignmark")) ||
          (!i && p > 0 && (tagName === "script" || tagName === "textarea")) ||
          (r.at(-1) === "f" && (tagName === "svg" || tagName === "math") && T.at(-1) !== tagName)
        ) {
          ((A = !0), l());
          return;
        }
        let m = i ? RAWTEXT_MODES.get(tagName) : void 0;
        if (m !== void 0 && (x > 0 || (p > 0 && tagName !== "script"))) {
          ((A = !0), l());
          return;
        }
        if (m !== void 0) ((N.state = m), (N.lastStartTagName = tagName));
        if (H.has(tagName) && i) return;
        if ((C++, (tagName === "svg" || tagName === "math") && o.selfClosing)) return;
        if (!(o.selfClosing && !i)) {
          if (B.has(tagName)) {
            if ((v.set(tagName, (v.get(tagName) ?? 0) + 1), g++, g > y)) y = g;
            if (a !== null && g > Y) {
              l();
              return;
            }
          }
          if ((t.push(tagName), t.length > R)) R = t.length;
          let n = !1,
            f = r.at(-1) === "f";
          if (tagName === "svg" || tagName === "math") (b++, T.push(tagName), r.push("f"));
          else if (tagName === "select") p++;
          else if (tagName === "frameset") x++;
          else if (f) {
            let at = T.at(-1);
            if (at === "svg") n = q.has(tagName);
            else if (at === "math")
              n =
                K.has(tagName) ||
                (tagName === "annotation-xml" &&
                  o.attrs?.some(
                    (E) =>
                      E.name.toLowerCase() === "encoding" &&
                      ["text/html", "application/xhtml+xml"].includes(E.value.toLowerCase()),
                  ) === !0);
            if (n) (_++, r.push("i"));
          }
          (u.push(n), c.push(tagName === "svg" || tagName === "math" || (f && !n)));
        }
        if (a !== null && (t.length > a.depth || C > a.totalOpens)) l();
      },
      onEndTag(o) {
        if (k) return;
        if (((h += t.length + 1 + g), O++, a !== null && (h > w || O > G))) {
          l();
          return;
        }
        let tagName = o.tagName;
        if (
          r.at(-1) === "i" &&
          tagName !== "p" &&
          tagName !== "br" &&
          !(t.at(-1) === tagName && u.at(-1) === !0)
        ) {
          for (let n = t.length - 1; n >= 0; n--)
            if ((c[n] || u[n] === !0) && t[n] === tagName) {
              ((A = !0), l());
              return;
            }
        }
        if (J.has(tagName)) {
          if (tagName === "html" && b > 0) {
            for (let n = t.length - 1; n >= 0; n--)
              if (c[n] && t[n] === "html") {
                ((A = !0), l());
                return;
              }
          }
          return;
        }
        if (p > 0 && r.at(-1) === "f" && (tagName === "p" || tagName === "br")) {
          ((A = !0), l());
          return;
        }
        if (
          p > 0 &&
          !(t.at(-1) === tagName && (c.at(-1) === !0 || u.at(-1) === !0)) &&
          tagName !== "select" &&
          tagName !== "option" &&
          tagName !== "optgroup" &&
          tagName !== "template" &&
          tagName !== "script"
        )
          return;
        if (r.at(-1) === "f" && (tagName === "p" || tagName === "br")) X();
        let i = P.has(tagName),
          m = Z.get(tagName),
          z = Q.has(tagName) ? Math.max(0, t.length - 1) : Math.max(0, t.length - j);
        for (let n = t.length - 1; n >= z; n--) {
          let f = t[n];
          if (f === tagName) {
            if (B.has(tagName)) {
              let d = v.get(tagName) ?? 0;
              if (d > 0) {
                if ((v.set(tagName, d - 1), g > 0)) g--;
              }
            }
            if (tagName === "form") {
              (t.splice(n, 1), u.splice(n, 1), c.splice(n, 1), D++);
              return;
            }
            for (let d = t.length - 1; d >= n; d--) {
              let E = t[d];
              if (u[d] === !0 && _ > 0) {
                if ((_--, r.at(-1) === "i")) r.pop();
              }
              if (E === "svg" || E === "math") {
                if (b > 0) b--;
                if ((T.pop(), r.at(-1) === "f")) r.pop();
              } else if (E === "select" && p > 0) p--;
              else if (E === "frameset" && x > 0) x--;
            }
            ((t.length = n), (u.length = n), (c.length = n));
            return;
          }
          if (V.has(f) || m?.has(f) === !0) return;
          if (!i && P.has(f)) return;
        }
      },
      onComment(o) {
        if (k || b === 0 || !o.data.startsWith("[CDATA[") || o.data.endsWith("]]")) return;
        let e = N.preprocessor.offset + 1,
          index = s.indexOf("]]>", e),
          m = index === -1 ? s.slice(e) : s.slice(e, index);
        if (/<[a-zA-Z!/?]/.test(m)) ((A = !0), l());
      },
      onDoctype: S,
      onCharacter: S,
      onNullCharacter: S,
      onWhitespaceCharacter: S,
      onEof: S,
      onParseError: S,
    },
    (o) => {
      if (((h += o), a !== null && h > w)) return (l(), !1);
      return !0;
    },
  );
  return (
    N.write(s, !0),
    { exceeded: k, maxDepth: R, totalOpens: C, maxFmtEstimate: y, formSplices: D, failClosed: A }
  );
}
/**
 * 计入属性预算的 HTML 分词器
 */
//@ chunk-ktx79ksk.js:6062-6283 placement
class BudgetedTokenizer extends Tokenizer {
  #e;
  constructor(s, a, t) {
    super(s, a);
    this.#e = t;
  }
  _leaveAttrName() {
    let currentToken = this.currentToken,
      a =
        currentToken !== null && "attrs" in currentToken
          ? currentToken.attrs.length * (1 + (this.currentAttr.name.length >> 6))
          : 0;
    if (this.#e(a)) super._leaveAttrName();
  }
}

export { budgetedTokenizer };
