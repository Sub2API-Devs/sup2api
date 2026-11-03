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
import { UJt, trimTrailingPunctuation } from "../services/oauth/oauthErrors.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text } from "../ink/components/Text.js";

//@ chunk-f1cesmvz.js:340-881 placement
function LinkifiedText(H) {
  let y = w(10),
    { children: children, color: color, bold: bold, linkHref: linkHref } = H,
    o;
  if (y[0] !== children || y[1] !== linkHref) {
    o = [];
    let l = 0;
    for (const i of children.matchAll(UJt)) {
      let x = trimTrailingPunctuation(i[0]);
      let k = linkHref === void 0 ? x : linkHref(x);
      if (k === void 0) {
        continue;
      }
      if (i.index > l) o.push(children.slice(l, i.index));
      (o.push(e(Link, { url: k, children: k }, i.index)), (l = i.index + x.length));
    }
    let s;
    if (y[3] !== children || y[4] !== l) ((s = children.slice(l)), (y[3] = children), (y[4] = l), (y[5] = s));
    else s = y[5];
    o.push(s);
    ((y[0] = children), (y[1] = linkHref), (y[2] = o));
  } else o = y[2];
  let s;
  if (y[6] !== bold || y[7] !== color || y[8] !== o)
    ((s = e(Text, { color: color, bold: bold, children: o })),
      (y[6] = bold),
      (y[7] = color),
      (y[8] = o),
      (y[9] = s));
  else s = y[9];
  return s;
}

export { LinkifiedText };
