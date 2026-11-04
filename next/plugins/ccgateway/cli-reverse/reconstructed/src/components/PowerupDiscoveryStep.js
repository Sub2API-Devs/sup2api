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
import { init_react_production, useState } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
  let $ = useMemoCache(9);
  let { onDone } = props;
  let [isLessonsOpen, setIsLessonsOpen] = useState(false);
  if (isLessonsOpen) {
    let powerupLessonsElement;
    if ($[0] !== onDone) {
      powerupLessonsElement = jsxProd_default(PowerupLessons, {
        onExit: onDone,
      });
      $[0] = onDone;
      $[1] = powerupLessonsElement;
    } else powerupLessonsElement = $[1];
    return powerupLessonsElement;
  }
  let handleAction;
  if ($[2] !== onDone) {
    handleAction = function onChoice(action) {
      logEvent("tengu_powerup_discovery_shown", {
        arm: fromEnum("step"),
        action: fromEnum(action),
      });
      if (action === "launch") setIsLessonsOpen(true);
      else onDone();
    };
    $[2] = onDone;
    $[3] = handleAction;
  } else handleAction = $[3];
  let handleActionMemo = handleAction;
  let welcomeV2Element;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    welcomeV2Element = jsxProd_default(WelcomeV2, {});
    $[4] = welcomeV2Element;
  } else welcomeV2Element = $[4];
  let titleBox;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    titleBox = jsxProd_default_2(Box, {
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
    $[5] = titleBox;
  } else titleBox = $[5];
  let bodyBox;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    bodyBox = jsxProd_default(Box, {
      maxWidth: 70,
      children: jsxProd_default(Text, {
        children: POWERUP_DISCOVERY_COPY.body,
      }),
    });
    $[6] = bodyBox;
  } else bodyBox = $[6];
  let columnBox;
  if ($[7] !== handleActionMemo) {
    columnBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        welcomeV2Element,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          paddingLeft: 1,
          marginTop: 1,
          children: [
            titleBox,
            bodyBox,
            jsxProd_default(ConfirmSelect, {
              confirmLabel: "Take the tour",
              cancelLabel: "Skip for now",
              onConfirm: () => handleActionMemo("launch"),
              onCancel: () => handleActionMemo("skip"),
            }),
          ],
        }),
      ],
    });
    $[7] = handleActionMemo;
    $[8] = columnBox;
  } else columnBox = $[8];
  return columnBox;
}
export { PowerupDiscoveryStep };
