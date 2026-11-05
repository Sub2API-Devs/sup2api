/**
 * components/ClickableImageRef.tsx
 *
 * 可点击的 [Image #N] 引用（终端超链接打开图片）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ClickableImageRef.tsx
 * pieces: chunk-p1yqn9ds.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useAppStateSlice } from "../state/AppState.js";
import { supportsHyperlinks } from "../ink/supports-hyperlinks.js";
import { toSafeFileUrl } from "../services/mcp/xaa.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";

//@ chunk-p1yqn9ds.js:22950-23539 fingerprint (2.1.88 match: ClickableImageRef, 0.829)
function ClickableImageRef(props) {
  let $ = useMemoCache(13);
  let { imageId, isSelected } = props;
  let isSelected_2 = isSelected === undefined ? false : isSelected;
  let imagePath = useAppStateSlice((state) => state.storedImagePaths.get(imageId) ?? null) ?? null;
  let displayText = `[Image #${imageId}]`;
  let fileUrl;
  if ($[0] !== imagePath) {
    fileUrl = imagePath && supportsHyperlinks() ? toSafeFileUrl(imagePath) : null;
    $[0] = imagePath;
    $[1] = fileUrl;
  } else fileUrl = $[1];
  let fileUrl_2 = fileUrl;
  if (fileUrl_2) {
    let fallback;
    let children;
    if ($[2] !== displayText || $[3] !== isSelected_2) {
      fallback = jsxProd_default(Text, {
        inverse: isSelected_2,
        children: displayText,
      });
      children = jsxProd_default(Text, {
        inverse: isSelected_2,
        bold: isSelected_2,
        children: displayText,
      });
      $[2] = displayText;
      $[3] = isSelected_2;
      $[4] = fallback;
      $[5] = children;
    } else {
      fallback = $[4];
      children = $[5];
    }
    let t4;
    if ($[6] !== fileUrl_2 || $[7] !== fallback || $[8] !== children) {
      t4 = jsxProd_default(Link, {
        url: fileUrl_2,
        fallback,
        children,
      });
      $[6] = fileUrl_2;
      $[7] = fallback;
      $[8] = children;
      $[9] = t4;
    } else t4 = $[9];
    return t4;
  }
  let t2;
  if ($[10] !== displayText || $[11] !== isSelected_2) {
    t2 = jsxProd_default(Text, {
      inverse: isSelected_2,
      children: displayText,
    });
    $[10] = displayText;
    $[11] = isSelected_2;
    $[12] = t2;
  } else t2 = $[12];
  return t2;
}
export { ClickableImageRef };
