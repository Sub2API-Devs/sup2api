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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";

//@ chunk-chhhkvva.js:301-447 placement
/**
 * 显示"Learn more: <链接>"的暗色文字。
 */
function LearnMoreLink(props) {
  let l = w(2);
  let { url } = props;
  let t;
  if (l[0] !== url) {
    t = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Learn more: ",
        jsxProd_default(Link, {
          url,
        }),
      ],
    });
    l[0] = url;
    l[1] = t;
  } else t = l[1];
  return t;
}
export { LearnMoreLink };
