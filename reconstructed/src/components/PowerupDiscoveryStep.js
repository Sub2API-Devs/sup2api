/**
 * components/PowerupDiscoveryStep.tsx
 *
 * 2.1.316 新增：Powerup 发现步骤。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e1ykjvh2.js (2)
 * attribution: placement 2
 */
import { j, y } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PowerupLessons, POWERUP_LESSONS } from "./onboarding/PowerupLessons.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { WelcomeV2 } from "./LogoV2/WelcomeV2.js";
import { Box, Text } from "../ink/components/Text.js";
import { POWERUP_DISCOVERY_COPY } from "../commands/powerup/discoveryCopy.js";
import { ProgressBar } from "./design-system/ProgressBar.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";

//@ chunk-e1ykjvh2.js:13928-13932 placement
j();
//@ chunk-e1ykjvh2.js:13932-14858 placement
function PowerupDiscoveryStep(b) {
  let t = w(9),
    { onDone: onDone } = b,
    [v, C] = y(!1);
  if (v) {
    let i;
    if (t[0] !== onDone) ((i = e(PowerupLessons, { onExit: onDone })), (t[0] = onDone), (t[1] = i));
    else i = t[1];
    return i;
  }
  let i;
  if (t[2] !== onDone)
    ((i = function m(d) {
      if (
        (logEvent("tengu_powerup_discovery_shown", { arm: fromEnum("step"), action: fromEnum(d) }),
        d === "launch")
      )
        C(!0);
      else onDone();
    }),
      (t[2] = onDone),
      (t[3] = i));
  else i = t[3];
  let m = i,
    h;
  if (t[4] === MEMO_CACHE_SENTINEL) ((h = e(WelcomeV2, {})), (t[4] = h));
  else h = t[4];
  let u;
  if (t[5] === MEMO_CACHE_SENTINEL)
    ((u = r(Box, {
      children: [
        e(Text, { bold: !0, children: POWERUP_DISCOVERY_COPY.heading }),
        r(Text, { dimColor: !0, children: [" 0/", POWERUP_LESSONS.length, " "] }),
        e(ProgressBar, { ratio: 0, width: 16, fillColor: "claude", emptyColor: "inactive" }),
      ],
    })),
      (t[5] = u));
  else u = t[5];
  let g;
  if (t[6] === MEMO_CACHE_SENTINEL)
    ((g = e(Box, { maxWidth: 70, children: e(Text, { children: POWERUP_DISCOVERY_COPY.body }) })),
      (t[6] = g));
  else g = t[6];
  let x;
  if (t[7] !== m)
    ((x = r(Box, {
      flexDirection: "column",
      children: [
        h,
        r(Box, {
          flexDirection: "column",
          gap: 1,
          paddingLeft: 1,
          marginTop: 1,
          children: [
            u,
            g,
            e(ConfirmSelect, {
              confirmLabel: "Take the tour",
              cancelLabel: "Skip for now",
              onConfirm: () => m("launch"),
              onCancel: () => m("skip"),
            }),
          ],
        }),
      ],
    })),
      (t[7] = m),
      (t[8] = x));
  else x = t[8];
  return x;
}
