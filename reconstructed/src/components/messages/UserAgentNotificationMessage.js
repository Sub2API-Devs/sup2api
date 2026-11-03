/**
 * components/messages/UserAgentNotificationMessage.tsx
 *
 * 后台 agent 完成/失败通知消息（带状态颜色）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserAgentNotificationMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { parseUpdates, renderResourceUpdateRow } from "./UserResourceUpdateMessage.js";
import { Box } from "../../ink/components/Text.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-ah34pb7m.js:118642-119088 fingerprint = UserAgentNotificationMessage (0.623)
function UserAgentNotificationMessage(t0) {
  let $ = w(12),
    { addMargin: addMargin, param: t1 } = t0,
    { text: text } = t1,
    h,
    M,
    T,
    x,
    k;
  if ($[0] !== addMargin || $[1] !== text) {
    k = EARLY_RETURN_SENTINEL;
    E: {
      let b = parseUpdates(text);
      if (b.length === 0) {
        k = null;
        break E;
      }
      h = Box;
      M = "column";
      T = addMargin ? 1 : 0;
      x = b.map(renderResourceUpdateRow);
    }
    (($[0] = addMargin), ($[1] = text), ($[2] = h), ($[3] = M), ($[4] = T), ($[5] = x), ($[6] = k));
  } else ((h = $[2]), (M = $[3]), (T = $[4]), (x = $[5]), (k = $[6]));
  if (k !== EARLY_RETURN_SENTINEL) return k;
  let B;
  if ($[7] !== h || $[8] !== M || $[9] !== T || $[10] !== x)
    ((B = e(h, { flexDirection: M, marginTop: T, children: x })),
      ($[7] = h),
      ($[8] = M),
      ($[9] = T),
      ($[10] = x),
      ($[11] = B));
  else B = $[11];
  return B;
}

export { UserAgentNotificationMessage };
