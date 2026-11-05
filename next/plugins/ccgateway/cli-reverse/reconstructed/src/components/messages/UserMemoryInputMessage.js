/**
 * components/messages/UserMemoryInputMessage.tsx
 *
 * # 记忆输入回显（<user-memory-input>），附随机确认语 "Got it./Noted."。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserMemoryInputMessage.tsx
 * pieces: chunk-wjygkcr4.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { extractTag } from "../../utils/messages.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { sampleAlias } from "../Spinner/spinnerStatus.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";

//@ chunk-wjygkcr4.js:113821-114564 fingerprint (2.1.88 match: UserMemoryInputMessage, 0.684)
function UserMemoryInputMessage(props) {
  let $ = useMemoCache(10);
  let { text, addMargin } = props;
  let t1;
  if ($[0] !== text) {
    t1 = extractTag(text, "user-memory-input");
    $[0] = text;
    $[1] = t1;
  } else t1 = $[1];
  let input = t1;
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = sampleAlias(["Got it.", "Good to know.", "Noted."]);
    $[2] = t2;
  } else t2 = $[2];
  let children = t2;
  if (!input) {
    return null;
  }
  const marginTop = addMargin ? 1 : 0;
  let t4;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Text, {
      color: "remember",
      backgroundColor: "memoryBackgroundColor",
      children: "#",
    });
    $[3] = t4;
  } else t4 = $[3];
  let t5;
  if ($[4] !== input) {
    t5 = jsxProd_default_2(Box, {
      children: [
        t4,
        jsxProd_default_2(Text, {
          backgroundColor: "memoryBackgroundColor",
          color: "text",
          children: [" ", input, " "],
        }),
      ],
    });
    $[4] = input;
    $[5] = t5;
  } else t5 = $[5];
  let t6;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t6 = jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children,
      }),
    });
    $[6] = t6;
  } else t6 = $[6];
  let t7;
  if ($[7] !== marginTop || $[8] !== t5) {
    t7 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop,
      width: "100%",
      children: [t5, t6],
    });
    $[7] = marginTop;
    $[8] = t5;
    $[9] = t7;
  } else t7 = $[9];
  return t7;
}
export { UserMemoryInputMessage };
