/**
 * components/messages/UserBashInputMessage.tsx
 *
 * 用户 ! bash 输入回显（<bash-input>，bashBorder 色）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserBashInputMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { extractBashInput } from "../../utils/messages/apiNormalization.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:104523-105017 fingerprint = UserBashInputMessage (0.791)
function UserBashInputMessage(t0) {
  let $ = w(8),
    { param: t1, addMargin: addMargin } = t0,
    { text: text } = t1,
    h;
  if ($[0] !== text) ((h = extractBashInput(text)), ($[0] = text), ($[1] = h));
  else h = $[1];
  let input = h;
  if (!input) {
    return null;
  }
  const t3 = addMargin ? 1 : 0;
  let x;
  if ($[2] === MEMO_CACHE_SENTINEL) ((x = e(Text, { color: "bashBorder", children: "! " })), ($[2] = x));
  else x = $[2];
  let k;
  if ($[3] !== input) ((k = e(Text, { color: "text", children: input })), ($[3] = input), ($[4] = k));
  else k = $[4];
  let b;
  if ($[5] !== t3 || $[6] !== k)
    ((b = r(Box, {
      flexDirection: "row",
      marginTop: t3,
      backgroundColor: "bashMessageBackgroundColor",
      paddingRight: 1,
      children: [x, k],
    })),
      ($[5] = t3),
      ($[6] = k),
      ($[7] = b));
  else b = $[7];
  return b;
}

export { UserBashInputMessage };
