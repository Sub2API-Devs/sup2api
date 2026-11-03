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
import { j, R } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "./CustomSelect/selectTypeahead.js";
import { Dialog } from "./design-system/Dialog.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";

//@ chunk-3q9d50y1.js:13642-13646 placement
j();
/**
 * teleport 时无法确认 git 远端主机的确认对话框。
 */
//@ chunk-3q9d50y1.js:13646-15613 placement
function TeleportRemoteHostDialog(te) {
  let o = w(56),
    { sessionRepo: sessionRepo, rawRemoteUrl: rawRemoteUrl, onConfirm: onConfirm, onCancel: onCancel } = te,
    a = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    V;
  if (o[0] !== a || o[1] !== noteRefused || o[2] !== refusedWithin)
    ((V = function p() {
      if (a() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      (o[0] = a),
      (o[1] = noteRefused),
      (o[2] = refusedWithin),
      (o[3] = V));
  else V = o[3];
  let p = V,
    F = useMountTime(),
    K = settleKey(epoch),
    _ = R(!1),
    m,
    g,
    b,
    y,
    v,
    C,
    x,
    l,
    k,
    S,
    D,
    E,
    O,
    P,
    A,
    I;
  if (
    o[4] !== a ||
    o[5] !== K.remountKey ||
    o[6] !== noteRefused ||
    o[7] !== onCancel ||
    o[8] !== onConfirm ||
    o[9] !== rawRemoteUrl ||
    o[10] !== p ||
    o[11] !== refusedWithin ||
    o[12] !== sessionRepo ||
    o[13] !== F
  ) {
    let T = function T(ne) {
      return () => {
        if (a() || refusedWithin()) {
          noteRefused();
          return;
        }
        if (_.current) {
          return;
        }
        ((_.current = !0), ne());
      };
    };
    g = Dialog;
    y = "Teleport";
    v = T(onCancel);
    C = !0;
    x = "background";
    let t;
    if (o[30] !== rawRemoteUrl)
      ((t = r(Text, {
        children: [
          "Couldn't verify your git remote host (remote is",
          " ",
          e(Text, { bold: !0, children: rawRemoteUrl }),
          ").",
        ],
      })),
        (o[30] = rawRemoteUrl),
        (o[31] = t));
    else t = o[31];
    let i;
    if (o[32] !== sessionRepo)
      ((i = r(Text, { children: ["Proceed against ", e(Text, { bold: !0, children: sessionRepo }), "?"] })),
        (o[32] = sessionRepo),
        (o[33] = i));
    else i = o[33];
    if (o[34] !== t || o[35] !== i)
      ((l = r(Box, { flexDirection: "column", gap: 1, children: [t, i] })),
        (o[34] = t),
        (o[35] = i),
        (o[36] = l));
    else l = o[36];
    m = ConfirmSelect;
    k = K.remountKey;
    S = p;
    D = F;
    E = !0;
    O = !0;
    P = !0;
    A = "cancel";
    I = T(onConfirm);
    b = T(onCancel);
    ((o[4] = a),
      (o[5] = K.remountKey),
      (o[6] = noteRefused),
      (o[7] = onCancel),
      (o[8] = onConfirm),
      (o[9] = rawRemoteUrl),
      (o[10] = p),
      (o[11] = refusedWithin),
      (o[12] = sessionRepo),
      (o[13] = F),
      (o[14] = m),
      (o[15] = g),
      (o[16] = b),
      (o[17] = y),
      (o[18] = v),
      (o[19] = C),
      (o[20] = x),
      (o[21] = l),
      (o[22] = k),
      (o[23] = S),
      (o[24] = D),
      (o[25] = E),
      (o[26] = O),
      (o[27] = P),
      (o[28] = A),
      (o[29] = I));
  } else
    ((m = o[14]),
      (g = o[15]),
      (b = o[16]),
      (y = o[17]),
      (v = o[18]),
      (C = o[19]),
      (x = o[20]),
      (l = o[21]),
      (k = o[22]),
      (S = o[23]),
      (D = o[24]),
      (E = o[25]),
      (O = o[26]),
      (P = o[27]),
      (A = o[28]),
      (I = o[29]));
  let t;
  if (
    o[37] !== m ||
    o[38] !== b ||
    o[39] !== k ||
    o[40] !== S ||
    o[41] !== D ||
    o[42] !== E ||
    o[43] !== O ||
    o[44] !== P ||
    o[45] !== A ||
    o[46] !== I
  )
    ((t = e(
      m,
      {
        refuseInput: S,
        openedAt: D,
        hideIndexes: E,
        disablePrintableKeybindings: O,
        cancelFirst: P,
        focus: A,
        onConfirm: I,
        onCancel: b,
      },
      k,
    )),
      (o[37] = m),
      (o[38] = b),
      (o[39] = k),
      (o[40] = S),
      (o[41] = D),
      (o[42] = E),
      (o[43] = O),
      (o[44] = P),
      (o[45] = A),
      (o[46] = I),
      (o[47] = t));
  else t = o[47];
  let i;
  if (o[48] !== g || o[49] !== y || o[50] !== v || o[51] !== C || o[52] !== x || o[53] !== l || o[54] !== t)
    ((i = r(g, { title: y, onCancel: v, exitOnCtrlCD: C, color: x, children: [l, t] })),
      (o[48] = g),
      (o[49] = y),
      (o[50] = v),
      (o[51] = C),
      (o[52] = x),
      (o[53] = l),
      (o[54] = t),
      (o[55] = i));
  else i = o[55];
  return i;
}
