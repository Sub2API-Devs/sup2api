/**
 * components/LearnMoreLink.tsx
 *
 * 2.1.316 新增："Learn more" 链接组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-chhhkvva.js (1)
 * attribution: placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";

/**
 * 显示"Learn more: <链接>"的暗色文字。
 */
//@ chunk-chhhkvva.js:301-447 placement
function LearnMoreLink(a) {
  let l = w(2),
    { url: url } = a,
    t;
  if (l[0] !== url)
    ((t = r(Text, { dimColor: !0, children: ["Learn more: ", e(Link, { url: url })] })),
      (l[0] = url),
      (l[1] = t));
  else t = l[1];
  return t;
}

export { LearnMoreLink };
