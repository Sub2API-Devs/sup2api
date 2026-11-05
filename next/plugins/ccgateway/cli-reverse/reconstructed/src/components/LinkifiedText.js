/**
 * components/LinkifiedText.tsx
 *
 * 2.1.316 新增：自动识别链接的文本组件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6gzd5qs6.js (1)
 * attribution: placement 1
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { URL_IN_TEXT_RE, trimTrailingPunctuation } from "../services/oauth/oauthErrors.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text } from "../ink/components/Text.js";

//@ chunk-6gzd5qs6.js:340-881 placement
function LinkifiedText(props) {
  let $ = useMemoCache(10);
  let { children, color, bold, linkHref } = props;
  let parts;
  if ($[0] !== children || $[1] !== linkHref) {
    parts = [];
    let lastEnd = 0;
    for (const match of children.matchAll(URL_IN_TEXT_RE)) {
      let url = trimTrailingPunctuation(match[0]);
      let href = linkHref === undefined ? url : linkHref(url);
      if (href === undefined) {
        continue;
      }
      if (match.index > lastEnd) parts.push(children.slice(lastEnd, match.index));
      parts.push(
        jsxProd_default(
          Link,
          {
            url: href,
            children: href,
          },
          match.index,
        ),
      );
      lastEnd = match.index + url.length;
    }
    let tail;
    if ($[3] !== children || $[4] !== lastEnd) {
      tail = children.slice(lastEnd);
      $[3] = children;
      $[4] = lastEnd;
      $[5] = tail;
    } else tail = $[5];
    parts.push(tail);
    $[0] = children;
    $[1] = linkHref;
    $[2] = parts;
  } else parts = $[2];
  let text;
  if ($[6] !== bold || $[7] !== color || $[8] !== parts) {
    text = jsxProd_default(Text, {
      color,
      bold,
      children: parts,
    });
    $[6] = bold;
    $[7] = color;
    $[8] = parts;
    $[9] = text;
  } else text = $[9];
  return text;
}
export { LinkifiedText };
