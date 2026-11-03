/**
 * components/TeammateViewHeader.tsx
 *
 * 查看队友会话时的顶部标题栏（"Viewing <agent>"，Esc 返回）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TeammateViewHeader.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: file-last-pair 1, fingerprint 1, placement 2
 */
import { getViewedTeammateTask_2 as getViewedTeammateTask_2_2 } from "../state/selectors.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { toInkColor } from "../utils/ink.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { FreezeWhenOffscreen } from "./FreezeWhenOffscreen.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1444271-1444303 file-last-pair
function selectViewedTeammateTask(s) {
  return getViewedTeammateTask_2_2(s);
}
//@ chunk-18hwfzwa.js:1444303-1445186 fingerprint = TeammateViewHeader (0.454)
function TeammateViewHeader() {
  let $ = w(14);
  let viewedTeammate = useAppState(selectViewedTeammateTask);
  if (!viewedTeammate) {
    return null;
  }
  let t0;
  if ($[0] !== viewedTeammate.identity.color) {
    t0 = toInkColor(viewedTeammate.identity.color);
    $[0] = viewedTeammate.identity.color;
    $[1] = t0;
  } else t0 = $[1];
  let nameColor = t0;
  let t1;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      children: "Viewing ",
    });
    $[2] = t1;
  } else t1 = $[2];
  let t2;
  if ($[3] !== nameColor || $[4] !== viewedTeammate.identity.agentName) {
    t2 = jsxProd_default_2(Text, {
      color: nameColor,
      bold: true,
      children: ["@", viewedTeammate.identity.agentName],
    });
    $[3] = nameColor;
    $[4] = viewedTeammate.identity.agentName;
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        " \xB7 ",
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "return",
          format: {
            keyCase: "lower",
          },
        }),
      ],
    });
    $[6] = t3;
  } else t3 = $[6];
  let t4;
  if ($[7] !== t2) {
    t4 = jsxProd_default_2(Box, {
      children: [t1, t2, t3],
    });
    $[7] = t2;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== viewedTeammate.prompt) {
    t5 = jsxProd_default(Text, {
      dimColor: true,
      children: viewedTeammate.prompt,
    });
    $[9] = viewedTeammate.prompt;
    $[10] = t5;
  } else t5 = $[10];
  let t6;
  if ($[11] !== t4 || $[12] !== t5) {
    t6 = jsxProd_default(FreezeWhenOffscreen, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: [t4, t5],
      }),
    });
    $[11] = t4;
    $[12] = t5;
    $[13] = t6;
  } else t6 = $[13];
  return t6;
}
//@ chunk-18hwfzwa.js:1445186-1445190 placement
init_react_production();
//@ chunk-18hwfzwa.js:1445190-1445194 placement
init_react_production();
export { TeammateViewHeader };
