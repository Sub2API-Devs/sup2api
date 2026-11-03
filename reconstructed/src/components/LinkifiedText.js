/**
 * components/LinkifiedText.tsx
 *
 * 2.1.316 新增：自动识别链接的文本组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-f1cesmvz.js (1)
 * attribution: placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { URL_IN_TEXT_RE, trimTrailingPunctuation } from "../services/oauth/oauthErrors.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text } from "../ink/components/Text.js";

//@ chunk-f1cesmvz.js:340-881 placement
function LinkifiedText(props) {
  let y = w(10);
  let { children, color, bold, linkHref } = props;
  let o;
  if (y[0] !== children || y[1] !== linkHref) {
    o = [];
    let l = 0;
    for (const i of children.matchAll(URL_IN_TEXT_RE)) {
      let x = trimTrailingPunctuation(i[0]);
      let k = linkHref === undefined ? x : linkHref(x);
      if (k === undefined) {
        continue;
      }
      if (i.index > l) o.push(children.slice(l, i.index));
      o.push(
        jsxProd_default(
          Link,
          {
            url: k,
            children: k,
          },
          i.index,
        ),
      );
      l = i.index + x.length;
    }
    let s;
    if (y[3] !== children || y[4] !== l) {
      s = children.slice(l);
      y[3] = children;
      y[4] = l;
      y[5] = s;
    } else s = y[5];
    o.push(s);
    y[0] = children;
    y[1] = linkHref;
    y[2] = o;
  } else o = y[2];
  let s;
  if (y[6] !== bold || y[7] !== color || y[8] !== o) {
    s = jsxProd_default(Text, {
      color,
      bold,
      children: o,
    });
    y[6] = bold;
    y[7] = color;
    y[8] = o;
    y[9] = s;
  } else s = y[9];
  return s;
}
export { LinkifiedText };
