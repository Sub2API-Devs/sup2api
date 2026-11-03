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
  return scanHtmlWithBudget(s, {
    depth: W,
    totalOpens: F,
  }).exceeded;
}
//@ chunk-ktx79ksk.js:2282-2416 placement
function budgetedTokenizer(s, a) {
  let t = 0;
  let u = false;
  let c = new BudgetedTokenizer(s, a, (T) => {
    t += T;
    if (t > w) {
      u = true;
      c.pause();
      return false;
    }
    return true;
  });
  return {
    tokenizer: c,
    overBudget: () => u,
  };
}
//@ chunk-ktx79ksk.js:2416-6062 placement
/**
 * 在嵌套与属性预算内扫描 HTML
 */
function scanHtmlWithBudget(s, a) {
  let t = [];
  let u = [];
  let c = [];
  let T = [];
  let r = [];
  let p = 0;
  let x = 0;
  let R = 0;
  let C = 0;
  let b = 0;
  let _ = 0;
  let h = 0;
  let I = new Set();
  let O = 0;
  let g = 0;
  let y = 0;
  let D = 0;
  let A = false;
  let v = new Map();
  let k = false;
  function l() {
    k = true;
    N.pause();
  }
  let S = () => {};
  function X() {
    while (t.length > 0 && r.at(-1) === "f") {
      let o = t.pop();
      c.pop();
      if (u.pop() === true && _ > 0) {
        _--;
        if (r.at(-1) === "i") r.pop();
      }
      if (o === "svg" || o === "math") {
        b--;
        T.pop();
        if (r.at(-1) === "f") r.pop();
      } else if (o === "select" && p > 0) p--;
      else if (o === "frameset" && x > 0) x--;
    }
  }
  function L(attrs) {
    if (attrs === undefined) return false;
    return attrs.some((e) => {
      let i = e !== null && typeof e === "object" ? e.name : undefined;
      if (typeof i !== "string") return false;
      let lower = i.toLowerCase();
      return lower === "color" || lower === "face" || lower === "size";
    });
  }
  let N = new BudgetedTokenizer(
    {},
    {
      onStartTag(o) {
        if (k) return;
        h += t.length + 1 + g;
        O++;
        if (a !== null && (h > w || O > G)) {
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
            h += 8 * I.size;
            if (a !== null && h > w) l();
            return;
          }
        }
        if (
          (b > 0 && (tagName === "mglyph" || tagName === "malignmark")) ||
          (!i && p > 0 && (tagName === "script" || tagName === "textarea")) ||
          (r.at(-1) === "f" && (tagName === "svg" || tagName === "math") && T.at(-1) !== tagName)
        ) {
          A = true;
          l();
          return;
        }
        let m = i ? RAWTEXT_MODES.get(tagName) : undefined;
        if (m !== undefined && (x > 0 || (p > 0 && tagName !== "script"))) {
          A = true;
          l();
          return;
        }
        if (m !== undefined) {
          N.state = m;
          N.lastStartTagName = tagName;
        }
        if (H.has(tagName) && i) return;
        C++;
        if ((tagName === "svg" || tagName === "math") && o.selfClosing) return;
        if (!(o.selfClosing && !i)) {
          if (B.has(tagName)) {
            v.set(tagName, (v.get(tagName) ?? 0) + 1);
            g++;
            if (g > y) y = g;
            if (a !== null && g > Y) {
              l();
              return;
            }
          }
          t.push(tagName);
          if (t.length > R) R = t.length;
          let n = false;
          let f = r.at(-1) === "f";
          if (tagName === "svg" || tagName === "math") {
            b++;
            T.push(tagName);
            r.push("f");
          } else if (tagName === "select") p++;
          else if (tagName === "frameset") x++;
          else if (f) {
            let last = T.at(-1);
            if (last === "svg") n = q.has(tagName);
            else if (last === "math")
              n =
                K.has(tagName) ||
                (tagName === "annotation-xml" &&
                  o.attrs?.some(
                    (attr) =>
                      attr.name.toLowerCase() === "encoding" &&
                      ["text/html", "application/xhtml+xml"].includes(attr.value.toLowerCase()),
                  ) === true);
            if (n) {
              _++;
              r.push("i");
            }
          }
          u.push(n);
          c.push(tagName === "svg" || tagName === "math" || (f && !n));
        }
        if (a !== null && (t.length > a.depth || C > a.totalOpens)) l();
      },
      onEndTag(o) {
        if (k) return;
        h += t.length + 1 + g;
        O++;
        if (a !== null && (h > w || O > G)) {
          l();
          return;
        }
        let tagName = o.tagName;
        if (
          r.at(-1) === "i" &&
          tagName !== "p" &&
          tagName !== "br" &&
          !(t.at(-1) === tagName && u.at(-1) === true)
        ) {
          for (let idx = t.length - 1; idx >= 0; idx--)
            if ((c[idx] || u[idx] === true) && t[idx] === tagName) {
              A = true;
              l();
              return;
            }
        }
        if (J.has(tagName)) {
          if (tagName === "html" && b > 0) {
            for (let idx = t.length - 1; idx >= 0; idx--)
              if (c[idx] && t[idx] === "html") {
                A = true;
                l();
                return;
              }
          }
          return;
        }
        if (p > 0 && r.at(-1) === "f" && (tagName === "p" || tagName === "br")) {
          A = true;
          l();
          return;
        }
        if (
          p > 0 &&
          !(t.at(-1) === tagName && (c.at(-1) === true || u.at(-1) === true)) &&
          tagName !== "select" &&
          tagName !== "option" &&
          tagName !== "optgroup" &&
          tagName !== "template" &&
          tagName !== "script"
        )
          return;
        if (r.at(-1) === "f" && (tagName === "p" || tagName === "br")) X();
        let i = P.has(tagName);
        let m = Z.get(tagName);
        let z = Q.has(tagName) ? Math.max(0, t.length - 1) : Math.max(0, t.length - j);
        for (let idx = t.length - 1; idx >= z; idx--) {
          let f = t[idx];
          if (f === tagName) {
            if (B.has(tagName)) {
              let d = v.get(tagName) ?? 0;
              if (d > 0) {
                v.set(tagName, d - 1);
                if (g > 0) g--;
              }
            }
            if (tagName === "form") {
              t.splice(idx, 1);
              u.splice(idx, 1);
              c.splice(idx, 1);
              D++;
              return;
            }
            for (let idx_2 = t.length - 1; idx_2 >= idx; idx_2--) {
              let E = t[idx_2];
              if (u[idx_2] === true && _ > 0) {
                _--;
                if (r.at(-1) === "i") r.pop();
              }
              if (E === "svg" || E === "math") {
                if (b > 0) b--;
                T.pop();
                if (r.at(-1) === "f") r.pop();
              } else if (E === "select" && p > 0) p--;
              else if (E === "frameset" && x > 0) x--;
            }
            t.length = idx;
            u.length = idx;
            c.length = idx;
            return;
          }
          if (V.has(f) || m?.has(f) === true) return;
          if (!i && P.has(f)) return;
        }
      },
      onComment(o) {
        if (k || b === 0 || !o.data.startsWith("[CDATA[") || o.data.endsWith("]]")) return;
        let e = N.preprocessor.offset + 1;
        let index = s.indexOf("]]>", e);
        let m = index === -1 ? s.slice(e) : s.slice(e, index);
        if (/<[a-zA-Z!/?]/.test(m)) {
          A = true;
          l();
        }
      },
      onDoctype: S,
      onCharacter: S,
      onNullCharacter: S,
      onWhitespaceCharacter: S,
      onEof: S,
      onParseError: S,
    },
    (o) => {
      h += o;
      if (a !== null && h > w) {
        l();
        return false;
      }
      return true;
    },
  );
  N.write(s, true);
  return {
    exceeded: k,
    maxDepth: R,
    totalOpens: C,
    maxFmtEstimate: y,
    formSplices: D,
    failClosed: A,
  };
}
//@ chunk-ktx79ksk.js:6062-6283 placement
/**
 * 计入属性预算的 HTML 分词器
 */
class BudgetedTokenizer extends Tokenizer {
  #e;
  constructor(s, a, t) {
    super(s, a);
    this.#e = t;
  }
  _leaveAttrName() {
    let currentToken = this.currentToken;
    let a =
      currentToken !== null && "attrs" in currentToken
        ? currentToken.attrs.length * (1 + (this.currentAttr.name.length >> 6))
        : 0;
    if (this.#e(a)) super._leaveAttrName();
  }
}
export { budgetedTokenizer };
