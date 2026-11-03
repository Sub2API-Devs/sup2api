/**
 * components/messages/CollapsedLines.tsx
 *
 * 2.1.316 新增：折叠行显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-j64mp9kq.js (3)
 * attribution: placement 3
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { formatKb } from "../../utils/format.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../design-system/Divider.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { dg } from "../../context/QueuedMessageContext.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ULTRATHINK_KEYWORD } from "../../utils/ultraplan/keyword.js";
import { isUltrathinkEffective } from "../../utils/effort.js";
import { Text, Box } from "../../ink/components/Text.js";
import { getRainbowColor } from "../../utils/thinking.js";
import { splitLongTextForCollapse } from "./UserMessageSite.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";

/**
 * 折叠提示分隔线："(N lines hidden)"、"(~X KB hidden)" 或两者。
 */
//@ chunk-j64mp9kq.js:4795-5195 placement
function CollapsedLinesDivider(i) {
  let c = w(7),
    { hiddenLines: hiddenLines, hiddenChars: hiddenChars, indent: indent } = i,
    a = `${hiddenLines} ${hiddenLines === 1 ? "line" : "lines"}`,
    f;
  if (c[0] !== hiddenChars || c[1] !== hiddenLines || c[2] !== a)
    ((f =
      hiddenChars === void 0
        ? `(${a} hidden)`
        : hiddenLines === 0
          ? `(~${formatKb(hiddenChars)} KB hidden)`
          : `(${a}, ~${formatKb(hiddenChars)} KB hidden)`),
      (c[0] = hiddenChars),
      (c[1] = hiddenLines),
      (c[2] = a),
      (c[3] = f));
  else f = c[3];
  let l = f,
    u;
  if (c[4] !== indent || c[5] !== l)
    ((u = e(Divider, { title: l, titleAlign: "start", color: "subtle", padding: indent })),
      (c[4] = indent),
      (c[5] = l),
      (c[6] = u));
  else u = c[6];
  return u;
}
/**
 * 渲染思考文本，ultrathink 关键字生效时把关键字逐字符彩虹着色。
 */
//@ chunk-j64mp9kq.js:5195-5838 placement
function UltrathinkHighlightedText(i) {
  let c = w(9),
    { text: text, color: color } = i,
    d = useMainLoopModel(),
    a = dg(),
    f,
    l;
  if (c[0] !== color || c[1] !== a || c[2] !== d || c[3] !== text) {
    l = EARLY_RETURN_SENTINEL;
    C: {
      let u = ULTRATHINK_KEYWORD(text);
      if (u.length === 0 || !isUltrathinkEffective(d, a)) {
        let p;
        if (c[6] !== color || c[7] !== text)
          ((p = e(Text, { color: color, children: text })), (c[6] = color), (c[7] = text), (c[8] = p));
        else p = c[8];
        l = p;
        break C;
      }
      let m = [];
      let g = 0;
      for (const x of u) {
        if (x.start > g) m.push(e(Text, { color: color, children: text.slice(g, x.start) }, `plain-${g}`));
        for (let start = x.start; start < x.end; start++)
          m.push(e(Text, { color: getRainbowColor(start - x.start), children: text[start] }, `rb-${start}`));
        g = x.end;
      }
      if (g < text.length) m.push(e(Text, { color: color, children: text.slice(g) }, `plain-${g}`));
      f = e(Text, { children: m });
    }
    ((c[0] = color), (c[1] = a), (c[2] = d), (c[3] = text), (c[4] = f), (c[5] = l));
  } else ((f = c[4]), (l = c[5]));
  if (l !== EARLY_RETURN_SENTINEL) return l;
  return f;
}
/**
 * 长文本折叠显示：能折叠时显示头部、折叠分隔线和尾部，否则整段显示（均经 sanitizeDisplayText）。
 */
//@ chunk-j64mp9kq.js:5838-6575 placement
function CollapsibleText(i) {
  let o = w(19),
    { text: text } = i,
    d,
    a,
    c,
    f,
    l,
    u,
    p,
    C;
  if (o[0] !== text) {
    C = EARLY_RETURN_SENTINEL;
    g: {
      let m = splitLongTextForCollapse(text);
      if (typeof m === "string") {
        C = e(Text, { wrap: "wrap", children: sanitizeDisplayText(m) });
        break g;
      }
      a = Box;
      l = "column";
      u = e(Text, { wrap: "wrap", children: sanitizeDisplayText(m.head) });
      p = e(CollapsedLinesDivider, { hiddenLines: m.hiddenLines, hiddenChars: m.hiddenChars, indent: 0 });
      d = Text;
      c = "wrap";
      f = sanitizeDisplayText(m.tail);
    }
    ((o[0] = text),
      (o[1] = d),
      (o[2] = a),
      (o[3] = c),
      (o[4] = f),
      (o[5] = l),
      (o[6] = u),
      (o[7] = p),
      (o[8] = C));
  } else ((d = o[1]), (a = o[2]), (c = o[3]), (f = o[4]), (l = o[5]), (u = o[6]), (p = o[7]), (C = o[8]));
  if (C !== EARLY_RETURN_SENTINEL) return C;
  let x;
  if (o[9] !== d || o[10] !== c || o[11] !== f)
    ((x = e(d, { wrap: c, children: f })), (o[9] = d), (o[10] = c), (o[11] = f), (o[12] = x));
  else x = o[12];
  let h;
  if (o[13] !== a || o[14] !== l || o[15] !== u || o[16] !== p || o[17] !== x)
    ((h = r(a, { flexDirection: l, children: [u, p, x] })),
      (o[13] = a),
      (o[14] = l),
      (o[15] = u),
      (o[16] = p),
      (o[17] = x),
      (o[18] = h));
  else h = o[18];
  return h;
}

export { CollapsibleText, CollapsedLinesDivider, UltrathinkHighlightedText };
