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
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { FreezeWhenOffscreen } from "./FreezeWhenOffscreen.js";
import { j } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1444271-1444303 file-last-pair
function uWo(s) {
  return getViewedTeammateTask_2_2(s);
}
//@ chunk-18hwfzwa.js:1444303-1445186 fingerprint = TeammateViewHeader (0.454)
function TeammateViewHeader() {
  let $ = w(14),
    viewedTeammate = useAppState(uWo);
  if (!viewedTeammate) {
    return null;
  }
  let D;
  if ($[0] !== viewedTeammate.identity.color)
    ((D = toInkColor(viewedTeammate.identity.color)), ($[0] = viewedTeammate.identity.color), ($[1] = D));
  else D = $[1];
  let nameColor = D,
    ee;
  if ($[2] === MEMO_CACHE_SENTINEL) ((ee = e(Text, { children: "Viewing " })), ($[2] = ee));
  else ee = $[2];
  let ke;
  if ($[3] !== nameColor || $[4] !== viewedTeammate.identity.agentName)
    ((ke = r(Text, { color: nameColor, bold: !0, children: ["@", viewedTeammate.identity.agentName] })),
      ($[3] = nameColor),
      ($[4] = viewedTeammate.identity.agentName),
      ($[5] = ke));
  else ke = $[5];
  let Re;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((Re = r(Text, {
      dimColor: !0,
      children: [
        " \xB7 ",
        e(KeyboardShortcutHint, { chord: "escape", action: "return", format: { keyCase: "lower" } }),
      ],
    })),
      ($[6] = Re));
  else Re = $[6];
  let Be;
  if ($[7] !== ke) ((Be = r(Box, { children: [ee, ke, Re] })), ($[7] = ke), ($[8] = Be));
  else Be = $[8];
  let He;
  if ($[9] !== viewedTeammate.prompt)
    ((He = e(Text, { dimColor: !0, children: viewedTeammate.prompt })),
      ($[9] = viewedTeammate.prompt),
      ($[10] = He));
  else He = $[10];
  let We;
  if ($[11] !== Be || $[12] !== He)
    ((We = e(FreezeWhenOffscreen, {
      children: r(Box, { flexDirection: "column", marginBottom: 1, children: [Be, He] }),
    })),
      ($[11] = Be),
      ($[12] = He),
      ($[13] = We));
  else We = $[13];
  return We;
}
//@ chunk-18hwfzwa.js:1445186-1445190 placement
j();
//@ chunk-18hwfzwa.js:1445190-1445194 placement
j();

export { TeammateViewHeader };
