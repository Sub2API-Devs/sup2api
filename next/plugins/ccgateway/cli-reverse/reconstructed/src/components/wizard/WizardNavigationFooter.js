/**
 * components/wizard/WizardNavigationFooter.tsx
 *
 * 向导底部导航（enter 继续/esc 返回/关闭）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/wizard/WizardNavigationFooter.tsx
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: callgraph-witnessed 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useAppState, useAppStoreDirect } from "../../state/AppState.js";
import {
  selectFrameUrls,
  visibleArtifactFrames,
  liveFramesForSlug,
  openArtifactRow,
  renderArtifactListItem,
} from "../artifacts/artifactFrames.js";
import { useNotifications } from "../../context/notifications.js";
import { useEffect } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Text } from "../../ink/components/Text.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-czq1j3j2.js:674180-675315 callgraph-witnessed (2.1.88 match: WizardNavigationFooter, 0.257)
function WizardNavigationFooter(props) {
  let $ = useMemoCache(22);
  let { onDone, cloudRowCheck } = props;
  useRegisterOverlay("cloud-artifacts-list");
  let frameUrls = useAppState(selectFrameUrls);
  let exitState = useAppStoreDirect();
  let notifications = useNotifications();
  let frames;
  if ($[0] !== frameUrls) {
    frames = visibleArtifactFrames(frameUrls);
    $[0] = frameUrls;
    $[1] = frames;
  } else frames = $[1];
  let visibleFrames = frames;
  let hasNoFrames = visibleFrames.length === 0;
  let closeIfEmpty;
  let closeIfEmptyDeps;
  if ($[2] !== hasNoFrames || $[3] !== onDone) {
    closeIfEmpty = () => {
      if (hasNoFrames) onDone();
    };
    closeIfEmptyDeps = [hasNoFrames, onDone];
    $[2] = hasNoFrames;
    $[3] = onDone;
    $[4] = closeIfEmpty;
    $[5] = closeIfEmptyDeps;
  } else {
    closeIfEmpty = $[4];
    closeIfEmptyDeps = $[5];
  }
  useEffect(closeIfEmpty, closeIfEmptyDeps);
  let onSelect;
  if (
    $[6] !== visibleFrames ||
    $[7] !== cloudRowCheck ||
    $[8] !== frameUrls ||
    $[9] !== notifications ||
    $[10] !== onDone ||
    $[11] !== exitState
  ) {
    onSelect = (index) => {
      let liveFrame = liveFramesForSlug(frameUrls, visibleFrames[index]?.slug);
      if (liveFrame !== undefined) openArtifactRow(liveFrame, exitState, notifications, cloudRowCheck);
      onDone();
    };
    $[6] = visibleFrames;
    $[7] = cloudRowCheck;
    $[8] = frameUrls;
    $[9] = notifications;
    $[10] = onDone;
    $[11] = exitState;
    $[12] = onSelect;
  } else onSelect = $[12];
  let children;
  if ($[13] !== visibleFrames) {
    children = visibleFrames.map(renderArtifactListItem);
    $[13] = visibleFrames;
    $[14] = children;
  } else children = $[14];
  let listElement;
  if ($[15] !== onSelect || $[16] !== children) {
    listElement = jsxProd_default(OrderedListWithItem, {
      onSelect,
      children,
    });
    $[15] = onSelect;
    $[16] = children;
    $[17] = listElement;
  } else listElement = $[17];
  let hintElement;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    hintElement = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default_2(Byline, {
        children: [
          jsxProd_default(KeyboardShortcutHint, {
            chord: "enter",
            action: "open",
          }),
          jsxProd_default(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: "close",
          }),
        ],
      }),
    });
    $[18] = hintElement;
  } else hintElement = $[18];
  let dialogElement;
  if ($[19] !== onDone || $[20] !== listElement) {
    dialogElement = jsxProd_default_2(Dialog, {
      title: "Artifacts in this session",
      onCancel: onDone,
      hideInputGuide: true,
      children: [listElement, hintElement],
    });
    $[19] = onDone;
    $[20] = listElement;
    $[21] = dialogElement;
  } else dialogElement = $[21];
  return dialogElement;
}
export { WizardNavigationFooter };
