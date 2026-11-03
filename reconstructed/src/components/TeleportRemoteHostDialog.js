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
import { init_react_production, R } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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
  let o = w(56);
  let { sessionRepo, rawRemoteUrl, onConfirm, onCancel } = props;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let V;
  if (o[0] !== inputRefusalWindow || o[1] !== noteRefused || o[2] !== refusedWithin) {
    V = function p() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    o[0] = inputRefusalWindow;
    o[1] = noteRefused;
    o[2] = refusedWithin;
    o[3] = V;
  } else V = o[3];
  let p = V;
  let mountTime = useMountTime();
  let K = settleKey(epoch);
  let _ = R(false);
  let m;
  let g;
  let onCancel_2;
  let title;
  let onCancel_3;
  let exitOnCtrlCD;
  let color;
  let l;
  let k;
  let refuseInput;
  let openedAt;
  let hideIndexes;
  let disablePrintableKeybindings;
  let cancelFirst;
  let focus;
  let onConfirm_2;
  if (
    o[4] !== inputRefusalWindow ||
    o[5] !== K.remountKey ||
    o[6] !== noteRefused ||
    o[7] !== onCancel ||
    o[8] !== onConfirm ||
    o[9] !== rawRemoteUrl ||
    o[10] !== p ||
    o[11] !== refusedWithin ||
    o[12] !== sessionRepo ||
    o[13] !== mountTime
  ) {
    let T = function T(ne) {
      return () => {
        if (inputRefusalWindow() || refusedWithin()) {
          noteRefused();
          return;
        }
        if (_.current) {
          return;
        }
        _.current = true;
        ne();
      };
    };
    g = Dialog;
    title = "Teleport";
    onCancel_3 = T(onCancel);
    exitOnCtrlCD = true;
    color = "background";
    let t;
    if (o[30] !== rawRemoteUrl) {
      t = jsxProd_default_2(Text, {
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
      o[30] = rawRemoteUrl;
      o[31] = t;
    } else t = o[31];
    let i;
    if (o[32] !== sessionRepo) {
      i = jsxProd_default_2(Text, {
        children: [
          "Proceed against ",
          jsxProd_default(Text, {
            bold: true,
            children: sessionRepo,
          }),
          "?",
        ],
      });
      o[32] = sessionRepo;
      o[33] = i;
    } else i = o[33];
    if (o[34] !== t || o[35] !== i) {
      l = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [t, i],
      });
      o[34] = t;
      o[35] = i;
      o[36] = l;
    } else l = o[36];
    m = ConfirmSelect;
    k = K.remountKey;
    refuseInput = p;
    openedAt = mountTime;
    hideIndexes = true;
    disablePrintableKeybindings = true;
    cancelFirst = true;
    focus = "cancel";
    onConfirm_2 = T(onConfirm);
    onCancel_2 = T(onCancel);
    o[4] = inputRefusalWindow;
    o[5] = K.remountKey;
    o[6] = noteRefused;
    o[7] = onCancel;
    o[8] = onConfirm;
    o[9] = rawRemoteUrl;
    o[10] = p;
    o[11] = refusedWithin;
    o[12] = sessionRepo;
    o[13] = mountTime;
    o[14] = m;
    o[15] = g;
    o[16] = onCancel_2;
    o[17] = title;
    o[18] = onCancel_3;
    o[19] = exitOnCtrlCD;
    o[20] = color;
    o[21] = l;
    o[22] = k;
    o[23] = refuseInput;
    o[24] = openedAt;
    o[25] = hideIndexes;
    o[26] = disablePrintableKeybindings;
    o[27] = cancelFirst;
    o[28] = focus;
    o[29] = onConfirm_2;
  } else {
    m = o[14];
    g = o[15];
    onCancel_2 = o[16];
    title = o[17];
    onCancel_3 = o[18];
    exitOnCtrlCD = o[19];
    color = o[20];
    l = o[21];
    k = o[22];
    refuseInput = o[23];
    openedAt = o[24];
    hideIndexes = o[25];
    disablePrintableKeybindings = o[26];
    cancelFirst = o[27];
    focus = o[28];
    onConfirm_2 = o[29];
  }
  let t;
  if (
    o[37] !== m ||
    o[38] !== onCancel_2 ||
    o[39] !== k ||
    o[40] !== refuseInput ||
    o[41] !== openedAt ||
    o[42] !== hideIndexes ||
    o[43] !== disablePrintableKeybindings ||
    o[44] !== cancelFirst ||
    o[45] !== focus ||
    o[46] !== onConfirm_2
  ) {
    t = jsxProd_default(
      m,
      {
        refuseInput,
        openedAt,
        hideIndexes,
        disablePrintableKeybindings,
        cancelFirst,
        focus,
        onConfirm: onConfirm_2,
        onCancel: onCancel_2,
      },
      k,
    );
    o[37] = m;
    o[38] = onCancel_2;
    o[39] = k;
    o[40] = refuseInput;
    o[41] = openedAt;
    o[42] = hideIndexes;
    o[43] = disablePrintableKeybindings;
    o[44] = cancelFirst;
    o[45] = focus;
    o[46] = onConfirm_2;
    o[47] = t;
  } else t = o[47];
  let i;
  if (
    o[48] !== g ||
    o[49] !== title ||
    o[50] !== onCancel_3 ||
    o[51] !== exitOnCtrlCD ||
    o[52] !== color ||
    o[53] !== l ||
    o[54] !== t
  ) {
    i = jsxProd_default_2(g, {
      title,
      onCancel: onCancel_3,
      exitOnCtrlCD,
      color,
      children: [l, t],
    });
    o[48] = g;
    o[49] = title;
    o[50] = onCancel_3;
    o[51] = exitOnCtrlCD;
    o[52] = color;
    o[53] = l;
    o[54] = t;
    o[55] = i;
  } else i = o[55];
  return i;
}
