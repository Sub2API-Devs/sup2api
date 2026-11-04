/**
 * components/TeleportRemoteHostDialog.tsx
 *
 * 2.1.316 新增：teleport 时无法确认 git 远端主机的确认对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3q9d50y1.js (2)
 * attribution: placement 2
 */
import { init_react_production, useRef } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "./CustomSelect/selectTypeahead.js";
import { Dialog } from "./design-system/Dialog.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";

//@ chunk-3q9d50y1.js:13642-13646 placement
init_react_production();
//@ chunk-3q9d50y1.js:13646-15613 placement
/**
 * teleport 时无法确认 git 远端主机的确认对话框。
 */
function TeleportRemoteHostDialog(props) {
  let $ = useMemoCache(56);
  let { sessionRepo, rawRemoteUrl, onConfirm, onCancel } = props;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let isInputRefused;
  if ($[0] !== inputRefusalWindow || $[1] !== noteRefused || $[2] !== refusedWithin) {
    isInputRefused = function isInputRefused_() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = inputRefusalWindow;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = isInputRefused;
  } else isInputRefused = $[3];
  let refuseInput = isInputRefused;
  let mountTime = useMountTime();
  let remount = settleKey(epoch);
  let hasAnsweredRef = useRef(false);
  let ConfirmSelectComponent;
  let DialogComponent;
  let onCancel_2;
  let title;
  let onCancel_3;
  let exitOnCtrlCD;
  let color;
  let bodyElement;
  let remountKey;
  let refuseInput_2;
  let openedAt;
  let hideIndexes;
  let disablePrintableKeybindings;
  let cancelFirst;
  let focus;
  let onConfirm_2;
  if (
    $[4] !== inputRefusalWindow ||
    $[5] !== remount.remountKey ||
    $[6] !== noteRefused ||
    $[7] !== onCancel ||
    $[8] !== onConfirm ||
    $[9] !== rawRemoteUrl ||
    $[10] !== refuseInput ||
    $[11] !== refusedWithin ||
    $[12] !== sessionRepo ||
    $[13] !== mountTime
  ) {
    let answerOnce = function answerOnce_(callback) {
      return () => {
        if (inputRefusalWindow() || refusedWithin()) {
          noteRefused();
          return;
        }
        if (hasAnsweredRef.current) {
          return;
        }
        hasAnsweredRef.current = true;
        callback();
      };
    };
    DialogComponent = Dialog;
    title = "Teleport";
    onCancel_3 = answerOnce(onCancel);
    exitOnCtrlCD = true;
    color = "background";
    let remoteUrlElement;
    if ($[30] !== rawRemoteUrl) {
      remoteUrlElement = jsxProd_default_2(Text, {
        children: [
          "Couldn't verify your git remote host (remote is",
          " ",
          jsxProd_default(Text, {
            bold: true,
            children: rawRemoteUrl,
          }),
          ").",
        ],
      });
      $[30] = rawRemoteUrl;
      $[31] = remoteUrlElement;
    } else remoteUrlElement = $[31];
    let repoElement;
    if ($[32] !== sessionRepo) {
      repoElement = jsxProd_default_2(Text, {
        children: [
          "Proceed against ",
          jsxProd_default(Text, {
            bold: true,
            children: sessionRepo,
          }),
          "?",
        ],
      });
      $[32] = sessionRepo;
      $[33] = repoElement;
    } else repoElement = $[33];
    if ($[34] !== remoteUrlElement || $[35] !== repoElement) {
      bodyElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [remoteUrlElement, repoElement],
      });
      $[34] = remoteUrlElement;
      $[35] = repoElement;
      $[36] = bodyElement;
    } else bodyElement = $[36];
    ConfirmSelectComponent = ConfirmSelect;
    remountKey = remount.remountKey;
    refuseInput_2 = refuseInput;
    openedAt = mountTime;
    hideIndexes = true;
    disablePrintableKeybindings = true;
    cancelFirst = true;
    focus = "cancel";
    onConfirm_2 = answerOnce(onConfirm);
    onCancel_2 = answerOnce(onCancel);
    $[4] = inputRefusalWindow;
    $[5] = remount.remountKey;
    $[6] = noteRefused;
    $[7] = onCancel;
    $[8] = onConfirm;
    $[9] = rawRemoteUrl;
    $[10] = refuseInput;
    $[11] = refusedWithin;
    $[12] = sessionRepo;
    $[13] = mountTime;
    $[14] = ConfirmSelectComponent;
    $[15] = DialogComponent;
    $[16] = onCancel_2;
    $[17] = title;
    $[18] = onCancel_3;
    $[19] = exitOnCtrlCD;
    $[20] = color;
    $[21] = bodyElement;
    $[22] = remountKey;
    $[23] = refuseInput_2;
    $[24] = openedAt;
    $[25] = hideIndexes;
    $[26] = disablePrintableKeybindings;
    $[27] = cancelFirst;
    $[28] = focus;
    $[29] = onConfirm_2;
  } else {
    ConfirmSelectComponent = $[14];
    DialogComponent = $[15];
    onCancel_2 = $[16];
    title = $[17];
    onCancel_3 = $[18];
    exitOnCtrlCD = $[19];
    color = $[20];
    bodyElement = $[21];
    remountKey = $[22];
    refuseInput_2 = $[23];
    openedAt = $[24];
    hideIndexes = $[25];
    disablePrintableKeybindings = $[26];
    cancelFirst = $[27];
    focus = $[28];
    onConfirm_2 = $[29];
  }
  let selectElement;
  if (
    $[37] !== ConfirmSelectComponent ||
    $[38] !== onCancel_2 ||
    $[39] !== remountKey ||
    $[40] !== refuseInput_2 ||
    $[41] !== openedAt ||
    $[42] !== hideIndexes ||
    $[43] !== disablePrintableKeybindings ||
    $[44] !== cancelFirst ||
    $[45] !== focus ||
    $[46] !== onConfirm_2
  ) {
    selectElement = jsxProd_default(
      ConfirmSelectComponent,
      {
        refuseInput: refuseInput_2,
        openedAt,
        hideIndexes,
        disablePrintableKeybindings,
        cancelFirst,
        focus,
        onConfirm: onConfirm_2,
        onCancel: onCancel_2,
      },
      remountKey,
    );
    $[37] = ConfirmSelectComponent;
    $[38] = onCancel_2;
    $[39] = remountKey;
    $[40] = refuseInput_2;
    $[41] = openedAt;
    $[42] = hideIndexes;
    $[43] = disablePrintableKeybindings;
    $[44] = cancelFirst;
    $[45] = focus;
    $[46] = onConfirm_2;
    $[47] = selectElement;
  } else selectElement = $[47];
  let dialogElement;
  if (
    $[48] !== DialogComponent ||
    $[49] !== title ||
    $[50] !== onCancel_3 ||
    $[51] !== exitOnCtrlCD ||
    $[52] !== color ||
    $[53] !== bodyElement ||
    $[54] !== selectElement
  ) {
    dialogElement = jsxProd_default_2(DialogComponent, {
      title,
      onCancel: onCancel_3,
      exitOnCtrlCD,
      color,
      children: [bodyElement, selectElement],
    });
    $[48] = DialogComponent;
    $[49] = title;
    $[50] = onCancel_3;
    $[51] = exitOnCtrlCD;
    $[52] = color;
    $[53] = bodyElement;
    $[54] = selectElement;
    $[55] = dialogElement;
  } else dialogElement = $[55];
  return dialogElement;
}
export { TeleportRemoteHostDialog };
