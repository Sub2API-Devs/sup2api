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
import { rs } from "../../state/AppState.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { toSafeFileUrl } from "../../services/mcp/xaa.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";

//@ chunk-ah34pb7m.js:87716-88531 fingerprint = UserImageMessage (0.769)
function UserImageMessage(t0) {
  let $ = w(15),
    { imageId: imageId, addMargin: addMargin, startsUserTurn: startsUserTurn } = t0,
    h = rs((f) => (imageId !== void 0 ? (f.storedImagePaths.get(imageId) ?? null) : null)) ?? null,
    T = rs((M) => (imageId !== void 0 ? (M.imageDescriptions.get(imageId) ?? null) : null)) ?? null,
    x = imageId ? `[Image #${imageId}]` : "[Image]",
    b;
  if ($[0] !== h) ((b = h && supportsHyperlinks() ? toSafeFileUrl(h) : null), ($[0] = h), ($[1] = b));
  else b = $[1];
  let E = b,
    B;
  if ($[2] !== E || $[3] !== x)
    ((B = E ? e(Link, { url: E, children: e(Text, { children: x }) }) : e(Text, { children: x })),
      ($[2] = E),
      ($[3] = x),
      ($[4] = B));
  else B = $[4];
  let L = B,
    N;
  if ($[5] !== T) ((N = T ? r(Text, { dimColor: !0, children: [" ", T] }) : null), ($[5] = T), ($[6] = N));
  else N = $[6];
  let W;
  if ($[7] !== L || $[8] !== N) ((W = r(Text, { children: [L, N] })), ($[7] = L), ($[8] = N), ($[9] = W));
  else W = $[9];
  let U = W;
  if (startsUserTurn ?? addMargin) {
    const K = addMargin ? 1 : 0;
    let V;
    if ($[10] !== U || $[11] !== K)
      ((V = e(Box, { marginTop: K, children: U })), ($[10] = U), ($[11] = K), ($[12] = V));
    else V = $[12];
    return V;
  }
  let K;
  if ($[13] !== U) ((K = e(MessageResponse, { children: U })), ($[13] = U), ($[14] = K));
  else K = $[14];
  return K;
}

export { UserImageMessage };
