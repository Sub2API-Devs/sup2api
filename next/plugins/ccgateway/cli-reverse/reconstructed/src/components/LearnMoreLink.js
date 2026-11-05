/**
 * components/LearnMoreLink.tsx
 *
 * 2.1.316 新增："Learn more" 链接组件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-mp5z2z40.js (1)
 * attribution: placement 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";

//@ chunk-mp5z2z40.js:301-447 placement
/**
 * 显示"Learn more: <链接>"的暗色文字。
 */
function LearnMoreLink(props) {
  let $ = useMemoCache(2);
  let { url } = props;
  let content;
  if ($[0] !== url) {
    content = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Learn more: ",
        jsxProd_default(Link, {
          url,
        }),
      ],
    });
    $[0] = url;
    $[1] = content;
  } else content = $[1];
  return content;
}
export { LearnMoreLink };
