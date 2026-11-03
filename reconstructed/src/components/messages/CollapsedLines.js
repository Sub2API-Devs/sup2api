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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../design-system/Divider.js";
import { useMainLoopModel } from "../../hooks/useMainLoopModel.js";
import { useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ULTRATHINK_KEYWORD } from "../../utils/ultraplan/keyword.js";
import { isUltrathinkEffective } from "../../utils/effort.js";
import { Text, Box } from "../../ink/components/Text.js";
import { getRainbowColor } from "../../utils/thinking.js";
import { splitLongTextForCollapse } from "./UserMessageSite.js";
import { sanitizeDisplayText } from "../../utils/sanitizeDisplayText.js";

//@ chunk-j64mp9kq.js:4795-5195 placement
/**
 * 折叠提示分隔线："(N lines hidden)"、"(~X KB hidden)" 或两者。
 */
function CollapsedLinesDivider(props) {
  let c = w(7);
  let { hiddenLines, hiddenChars, indent } = props;
  let a = `${hiddenLines} ${hiddenLines === 1 ? "line" : "lines"}`;
  let f;
  if (c[0] !== hiddenChars || c[1] !== hiddenLines || c[2] !== a) {
    f =
      hiddenChars === undefined
        ? `(${a} hidden)`
        : hiddenLines === 0
          ? `(~${formatKb(hiddenChars)} KB hidden)`
          : `(${a}, ~${formatKb(hiddenChars)} KB hidden)`;
    c[0] = hiddenChars;
    c[1] = hiddenLines;
    c[2] = a;
    c[3] = f;
  } else f = c[3];
  let title = f;
  let u;
  if (c[4] !== indent || c[5] !== title) {
    u = jsxProd_default(Divider, {
      title,
      titleAlign: "start",
      color: "subtle",
      padding: indent,
    });
    c[4] = indent;
    c[5] = title;
    c[6] = u;
  } else u = c[6];
  return u;
}
//@ chunk-j64mp9kq.js:5195-5838 placement
/**
 * 渲染思考文本，ultrathink 关键字生效时把关键字逐字符彩虹着色。
 */
function UltrathinkHighlightedText(props) {
  let c = w(9);
  let { text, color } = props;
  let mainLoopModel = useMainLoopModel();
  let queuedMessageText = useQueuedMessageText();
  let f;
  let l;
  if (c[0] !== color || c[1] !== queuedMessageText || c[2] !== mainLoopModel || c[3] !== text) {
    l = EARLY_RETURN_SENTINEL;
    C: {
      let u = ULTRATHINK_KEYWORD(text);
      if (u.length === 0 || !isUltrathinkEffective(mainLoopModel, queuedMessageText)) {
        let p;
        if (c[6] !== color || c[7] !== text) {
          p = jsxProd_default(Text, {
            color,
            children: text,
          });
          c[6] = color;
          c[7] = text;
          c[8] = p;
        } else p = c[8];
        l = p;
        break C;
      }
      let m = [];
      let g = 0;
      for (const x of u) {
        if (x.start > g)
          m.push(
            jsxProd_default(
              Text,
              {
                color,
                children: text.slice(g, x.start),
              },
              `plain-${g}`,
            ),
          );
        for (let start = x.start; start < x.end; start++)
          m.push(
            jsxProd_default(
              Text,
              {
                color: getRainbowColor(start - x.start),
                children: text[start],
              },
              `rb-${start}`,
            ),
          );
        g = x.end;
      }
      if (g < text.length)
        m.push(
          jsxProd_default(
            Text,
            {
              color,
              children: text.slice(g),
            },
            `plain-${g}`,
          ),
        );
      f = jsxProd_default(Text, {
        children: m,
      });
    }
    c[0] = color;
    c[1] = queuedMessageText;
    c[2] = mainLoopModel;
    c[3] = text;
    c[4] = f;
    c[5] = l;
  } else {
    f = c[4];
    l = c[5];
  }
  if (l !== EARLY_RETURN_SENTINEL) return l;
  return f;
}
//@ chunk-j64mp9kq.js:5838-6575 placement
/**
 * 长文本折叠显示：能折叠时显示头部、折叠分隔线和尾部，否则整段显示（均经 sanitizeDisplayText）。
 */
function CollapsibleText(props) {
  let o = w(19);
  let { text } = props;
  let d;
  let a;
  let wrap;
  let children;
  let flexDirection;
  let u;
  let p;
  let C;
  if (o[0] !== text) {
    C = EARLY_RETURN_SENTINEL;
    g: {
      let m = splitLongTextForCollapse(text);
      if (typeof m === "string") {
        C = jsxProd_default(Text, {
          wrap: "wrap",
          children: sanitizeDisplayText(m),
        });
        break g;
      }
      a = Box;
      flexDirection = "column";
      u = jsxProd_default(Text, {
        wrap: "wrap",
        children: sanitizeDisplayText(m.head),
      });
      p = jsxProd_default(CollapsedLinesDivider, {
        hiddenLines: m.hiddenLines,
        hiddenChars: m.hiddenChars,
        indent: 0,
      });
      d = Text;
      wrap = "wrap";
      children = sanitizeDisplayText(m.tail);
    }
    o[0] = text;
    o[1] = d;
    o[2] = a;
    o[3] = wrap;
    o[4] = children;
    o[5] = flexDirection;
    o[6] = u;
    o[7] = p;
    o[8] = C;
  } else {
    d = o[1];
    a = o[2];
    wrap = o[3];
    children = o[4];
    flexDirection = o[5];
    u = o[6];
    p = o[7];
    C = o[8];
  }
  if (C !== EARLY_RETURN_SENTINEL) return C;
  let x;
  if (o[9] !== d || o[10] !== wrap || o[11] !== children) {
    x = jsxProd_default(d, {
      wrap,
      children,
    });
    o[9] = d;
    o[10] = wrap;
    o[11] = children;
    o[12] = x;
  } else x = o[12];
  let h;
  if (o[13] !== a || o[14] !== flexDirection || o[15] !== u || o[16] !== p || o[17] !== x) {
    h = jsxProd_default_2(a, {
      flexDirection,
      children: [u, p, x],
    });
    o[13] = a;
    o[14] = flexDirection;
    o[15] = u;
    o[16] = p;
    o[17] = x;
    o[18] = h;
  } else h = o[18];
  return h;
}
export { CollapsibleText, CollapsedLinesDivider, UltrathinkHighlightedText };
