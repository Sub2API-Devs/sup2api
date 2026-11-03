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
import { init_react_production, y } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
init_react_production();
//@ chunk-e1ykjvh2.js:13932-14858 placement
function PowerupDiscoveryStep(props) {
  let t = w(9);
  let { onDone } = props;
  let [v, C] = y(false);
  if (v) {
    let i;
    if (t[0] !== onDone) {
      i = jsxProd_default(PowerupLessons, {
        onExit: onDone,
      });
      t[0] = onDone;
      t[1] = i;
    } else i = t[1];
    return i;
  }
  let i;
  if (t[2] !== onDone) {
    i = function m(d) {
      logEvent("tengu_powerup_discovery_shown", {
        arm: fromEnum("step"),
        action: fromEnum(d),
      });
      if (d === "launch") C(true);
      else onDone();
    };
    t[2] = onDone;
    t[3] = i;
  } else i = t[3];
  let m = i;
  let h;
  if (t[4] === MEMO_CACHE_SENTINEL) {
    h = jsxProd_default(WelcomeV2, {});
    t[4] = h;
  } else h = t[4];
  let u;
  if (t[5] === MEMO_CACHE_SENTINEL) {
    u = jsxProd_default_2(Box, {
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: POWERUP_DISCOVERY_COPY.heading,
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" 0/", POWERUP_LESSONS.length, " "],
        }),
        jsxProd_default(ProgressBar, {
          ratio: 0,
          width: 16,
          fillColor: "claude",
          emptyColor: "inactive",
        }),
      ],
    });
    t[5] = u;
  } else u = t[5];
  let g;
  if (t[6] === MEMO_CACHE_SENTINEL) {
    g = jsxProd_default(Box, {
      maxWidth: 70,
      children: jsxProd_default(Text, {
        children: POWERUP_DISCOVERY_COPY.body,
      }),
    });
    t[6] = g;
  } else g = t[6];
  let x;
  if (t[7] !== m) {
    x = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        h,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          paddingLeft: 1,
          marginTop: 1,
          children: [
            u,
            g,
            jsxProd_default(ConfirmSelect, {
              confirmLabel: "Take the tour",
              cancelLabel: "Skip for now",
              onConfirm: () => m("launch"),
              onCancel: () => m("skip"),
            }),
          ],
        }),
      ],
    });
    t[7] = m;
    t[8] = x;
  } else x = t[8];
  return x;
}
