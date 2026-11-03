/**
 * components/ClickableImageRef.tsx
 *
 * 可点击的 [Image #N] 引用（终端超链接打开图片）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ClickableImageRef.tsx
 * pieces: chunk-ey2qag4x.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppStateSlice } from "../state/AppState.js";
import { supportsHyperlinks } from "../ink/supports-hyperlinks.js";
import { toSafeFileUrl } from "../services/mcp/xaa.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";

//@ chunk-ey2qag4x.js:23011-23710 fingerprint = ClickableImageRef (0.889)
function ClickableImageRef(props) {
  let $ = w(15);
  let { imageId, backgroundColor, isSelected } = props;
  let isSelected_2 = isSelected === undefined ? false : isSelected;
  let d = useAppStateSlice((f) => f.storedImagePaths.get(imageId) ?? null) ?? null;
  let displayText = `[Image #${imageId}]`;
  let c;
  if ($[0] !== d) {
    c = d && supportsHyperlinks() ? toSafeFileUrl(d) : null;
    $[0] = d;
    $[1] = c;
  } else c = $[1];
  let fileUrl = c;
  if (fileUrl) {
    let fallback;
    let children;
    if ($[2] !== backgroundColor || $[3] !== displayText || $[4] !== isSelected_2) {
      fallback = jsxProd_default(Text, {
        backgroundColor,
        inverse: isSelected_2,
        children: displayText,
      });
      children = jsxProd_default(Text, {
        backgroundColor,
        inverse: isSelected_2,
        bold: isSelected_2,
        children: displayText,
      });
      $[2] = backgroundColor;
      $[3] = displayText;
      $[4] = isSelected_2;
      $[5] = fallback;
      $[6] = children;
    } else {
      fallback = $[5];
      children = $[6];
    }
    let t4;
    if ($[7] !== fileUrl || $[8] !== fallback || $[9] !== children) {
      t4 = jsxProd_default(Link, {
        url: fileUrl,
        fallback,
        children,
      });
      $[7] = fileUrl;
      $[8] = fallback;
      $[9] = children;
      $[10] = t4;
    } else t4 = $[10];
    return t4;
  }
  let t2;
  if ($[11] !== backgroundColor || $[12] !== displayText || $[13] !== isSelected_2) {
    t2 = jsxProd_default(Text, {
      backgroundColor,
      inverse: isSelected_2,
      children: displayText,
    });
    $[11] = backgroundColor;
    $[12] = displayText;
    $[13] = isSelected_2;
    $[14] = t2;
  } else t2 = $[14];
  return t2;
}
export { ClickableImageRef };
