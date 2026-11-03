/**
 * components/wizard/WizardNavigationFooter.tsx
 *
 * 向导底部导航（enter 继续/esc 返回/关闭）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/wizard/WizardNavigationFooter.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useAppState, Cr } from "../../state/AppState.js";
import {
  selectFrameUrls,
  visibleArtifactFrames,
  BO,
  openArtifactRow,
  renderArtifactListItem,
} from "../artifacts/artifactFrames.js";
import { useNotifications } from "../../context/notifications.js";
import { P } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text } from "../../ink/components/Text.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-18hwfzwa.js:653476-654611 callgraph-fingerprint = WizardNavigationFooter (0.258)
function WizardNavigationFooter(h) {
  let $ = w(22),
    { onDone: onDone, cloudRowCheck: cloudRowCheck } = h;
  useRegisterOverlay("cloud-artifacts-list");
  let frameUrls = useAppState(selectFrameUrls),
    exitState = Cr(),
    ke = useNotifications(),
    Be;
  if ($[0] !== frameUrls) ((Be = visibleArtifactFrames(frameUrls)), ($[0] = frameUrls), ($[1] = Be));
  else Be = $[1];
  let He = Be,
    We = He.length === 0,
    ze,
    Xe;
  if ($[2] !== We || $[3] !== onDone)
    ((ze = () => {
      if (We) onDone();
    }),
      (Xe = [We, onDone]),
      ($[2] = We),
      ($[3] = onDone),
      ($[4] = ze),
      ($[5] = Xe));
  else ((ze = $[4]), (Xe = $[5]));
  P(ze, Xe);
  let rt;
  if (
    $[6] !== He ||
    $[7] !== cloudRowCheck ||
    $[8] !== frameUrls ||
    $[9] !== ke ||
    $[10] !== onDone ||
    $[11] !== exitState
  )
    ((rt = (kt) => {
      let At = BO(frameUrls, He[kt]?.slug);
      if (At !== void 0) openArtifactRow(At, exitState, ke, cloudRowCheck);
      onDone();
    }),
      ($[6] = He),
      ($[7] = cloudRowCheck),
      ($[8] = frameUrls),
      ($[9] = ke),
      ($[10] = onDone),
      ($[11] = exitState),
      ($[12] = rt));
  else rt = $[12];
  let It;
  if ($[13] !== He) ((It = He.map(renderArtifactListItem)), ($[13] = He), ($[14] = It));
  else It = $[14];
  let Ot;
  if ($[15] !== rt || $[16] !== It)
    ((Ot = e(OrderedListWithItem, { onSelect: rt, children: It })), ($[15] = rt), ($[16] = It), ($[17] = Ot));
  else Ot = $[17];
  let Et;
  if ($[18] === MEMO_CACHE_SENTINEL)
    ((Et = e(Text, {
      dimColor: !0,
      children: r(Byline, {
        children: [
          e(KeyboardShortcutHint, { chord: "enter", action: "open" }),
          e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "close",
          }),
        ],
      }),
    })),
      ($[18] = Et));
  else Et = $[18];
  let Dt;
  if ($[19] !== onDone || $[20] !== Ot)
    ((Dt = r(Dialog, {
      title: "Artifacts in this session",
      onCancel: onDone,
      hideInputGuide: !0,
      children: [Ot, Et],
    })),
      ($[19] = onDone),
      ($[20] = Ot),
      ($[21] = Dt));
  else Dt = $[21];
  return Dt;
}

export { WizardNavigationFooter };
