/**
 * components/messages/UserImageMessage.tsx
 *
 * 用户图片回显 "[Image #N]"（可点击）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserImageMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { toSafeFileUrl } from "../../services/mcp/xaa.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";

//@ chunk-ah34pb7m.js:87716-88531 fingerprint = UserImageMessage (0.769)
function UserImageMessage(props) {
  let $ = w(15);
  let { imageId, addMargin, startsUserTurn } = props;
  let h =
    useAppStateSlice((f) => (imageId !== undefined ? (f.storedImagePaths.get(imageId) ?? null) : null)) ??
    null;
  let T =
    useAppStateSlice((M) => (imageId !== undefined ? (M.imageDescriptions.get(imageId) ?? null) : null)) ??
    null;
  let children = imageId ? `[Image #${imageId}]` : "[Image]";
  let b;
  if ($[0] !== h) {
    b = h && supportsHyperlinks() ? toSafeFileUrl(h) : null;
    $[0] = h;
    $[1] = b;
  } else b = $[1];
  let E = b;
  let B;
  if ($[2] !== E || $[3] !== children) {
    B = E
      ? jsxProd_default(Link, {
          url: E,
          children: jsxProd_default(Text, {
            children,
          }),
        })
      : jsxProd_default(Text, {
          children,
        });
    $[2] = E;
    $[3] = children;
    $[4] = B;
  } else B = $[4];
  let L = B;
  let N;
  if ($[5] !== T) {
    N = T
      ? jsxProd_default_2(Text, {
          dimColor: true,
          children: [" ", T],
        })
      : null;
    $[5] = T;
    $[6] = N;
  } else N = $[6];
  let W;
  if ($[7] !== L || $[8] !== N) {
    W = jsxProd_default_2(Text, {
      children: [L, N],
    });
    $[7] = L;
    $[8] = N;
    $[9] = W;
  } else W = $[9];
  let children_2 = W;
  if (startsUserTurn ?? addMargin) {
    const marginTop = addMargin ? 1 : 0;
    let V;
    if ($[10] !== children_2 || $[11] !== marginTop) {
      V = jsxProd_default(Box, {
        marginTop,
        children: children_2,
      });
      $[10] = children_2;
      $[11] = marginTop;
      $[12] = V;
    } else V = $[12];
    return V;
  }
  let K;
  if ($[13] !== children_2) {
    K = jsxProd_default(MessageResponse, {
      children: children_2,
    });
    $[13] = children_2;
    $[14] = K;
  } else K = $[14];
  return K;
}
export { UserImageMessage };
