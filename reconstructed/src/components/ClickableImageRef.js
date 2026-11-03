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
import { rs } from "../state/AppState.js";
import { supportsHyperlinks } from "../ink/supports-hyperlinks.js";
import { toSafeFileUrl } from "../services/mcp/xaa.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../ink/components/Text.js";

//@ chunk-ey2qag4x.js:23011-23710 fingerprint = ClickableImageRef (0.889)
function ClickableImageRef(t0) {
  let $ = w(15),
    { imageId: imageId, backgroundColor: backgroundColor, isSelected: t1 } = t0,
    isSelected = t1 === void 0 ? !1 : t1,
    d = rs((f) => f.storedImagePaths.get(imageId) ?? null) ?? null,
    displayText = `[Image #${imageId}]`,
    c;
  if ($[0] !== d) ((c = d && supportsHyperlinks() ? toSafeFileUrl(d) : null), ($[0] = d), ($[1] = c));
  else c = $[1];
  let b = c;
  if (b) {
    let V, x;
    if ($[2] !== backgroundColor || $[3] !== displayText || $[4] !== isSelected)
      ((V = e(Text, { backgroundColor: backgroundColor, inverse: isSelected, children: displayText })),
        (x = e(Text, {
          backgroundColor: backgroundColor,
          inverse: isSelected,
          bold: isSelected,
          children: displayText,
        })),
        ($[2] = backgroundColor),
        ($[3] = displayText),
        ($[4] = isSelected),
        ($[5] = V),
        ($[6] = x));
    else ((V = $[5]), (x = $[6]));
    let C;
    if ($[7] !== b || $[8] !== V || $[9] !== x)
      ((C = e(Link, { url: b, fallback: V, children: x })), ($[7] = b), ($[8] = V), ($[9] = x), ($[10] = C));
    else C = $[10];
    return C;
  }
  let V;
  if ($[11] !== backgroundColor || $[12] !== displayText || $[13] !== isSelected)
    ((V = e(Text, { backgroundColor: backgroundColor, inverse: isSelected, children: displayText })),
      ($[11] = backgroundColor),
      ($[12] = displayText),
      ($[13] = isSelected),
      ($[14] = V));
  else V = $[14];
  return V;
}

export { ClickableImageRef };
