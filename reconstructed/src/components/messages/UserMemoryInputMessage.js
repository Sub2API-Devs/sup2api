/**
 * components/messages/UserMemoryInputMessage.tsx
 *
 * # 记忆输入回显（<user-memory-input>），附随机确认语 "Got it./Noted."。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserMemoryInputMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { extractTag } from "../../utils/messages.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { wz } from "../Spinner/spinnerStatus.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MessageResponse } from "../MessageResponse.js";

//@ chunk-ah34pb7m.js:112131-112874 fingerprint = UserMemoryInputMessage (0.684)
function UserMemoryInputMessage(t0) {
  let $ = w(10),
    { text: text, addMargin: addMargin } = t0,
    f;
  if ($[0] !== text) ((f = extractTag(text, "user-memory-input")), ($[0] = text), ($[1] = f));
  else f = $[1];
  let h = f,
    M;
  if ($[2] === MEMO_CACHE_SENTINEL) ((M = wz(["Got it.", "Good to know.", "Noted."])), ($[2] = M));
  else M = $[2];
  let T = M;
  if (!h) {
    return null;
  }
  const t3 = addMargin ? 1 : 0;
  let k;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((k = e(Text, { color: "remember", backgroundColor: "memoryBackgroundColor", children: "#" })),
      ($[3] = k));
  else k = $[3];
  let b;
  if ($[4] !== h)
    ((b = r(Box, {
      children: [
        k,
        r(Text, { backgroundColor: "memoryBackgroundColor", color: "text", children: [" ", h, " "] }),
      ],
    })),
      ($[4] = h),
      ($[5] = b));
  else b = $[5];
  let E;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((E = e(MessageResponse, { height: 1, children: e(Text, { dimColor: !0, children: T }) })), ($[6] = E));
  else E = $[6];
  let B;
  if ($[7] !== t3 || $[8] !== b)
    ((B = r(Box, { flexDirection: "column", marginTop: t3, width: "100%", children: [b, E] })),
      ($[7] = t3),
      ($[8] = b),
      ($[9] = B));
  else B = $[9];
  return B;
}

export { UserMemoryInputMessage };
