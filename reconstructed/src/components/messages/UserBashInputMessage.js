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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { extractBashInput } from "../../utils/messages/apiNormalization.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:104523-105017 fingerprint = UserBashInputMessage (0.791)
function UserBashInputMessage(props) {
  let $ = useMemoCache(8);
  let { param, addMargin } = props;
  let { text } = param;
  let t2;
  if ($[0] !== text) {
    t2 = extractBashInput(text);
    $[0] = text;
    $[1] = t2;
  } else t2 = $[1];
  let input = t2;
  if (!input) {
    return null;
  }
  const marginTop = addMargin ? 1 : 0;
  let t4;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Text, {
      color: "bashBorder",
      children: "! ",
    });
    $[2] = t4;
  } else t4 = $[2];
  let t5;
  if ($[3] !== input) {
    t5 = jsxProd_default(Text, {
      color: "text",
      children: input,
    });
    $[3] = input;
    $[4] = t5;
  } else t5 = $[4];
  let t6;
  if ($[5] !== marginTop || $[6] !== t5) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop,
      backgroundColor: "bashMessageBackgroundColor",
      paddingRight: 1,
      children: [t4, t5],
    });
    $[5] = marginTop;
    $[6] = t5;
    $[7] = t6;
  } else t6 = $[7];
  return t6;
}
export { UserBashInputMessage };
