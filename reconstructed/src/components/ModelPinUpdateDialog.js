/**
 * components/ModelPinUpdateDialog.tsx
 *
 * 2.1.316 新增：提示把设置里固定的模型更新为同档新版本的对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jxwr2fwk.js (1)
 * attribution: placement 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

/**
 * 提示"有更新的同档模型"，可把设置里固定的模型更新为最新版本（需重启）。
 */
//@ chunk-jxwr2fwk.js:13623-14918 placement
function ModelPinUpdateDialog(I) {
  let o = w(27),
    {
      tierLabel: tierLabel,
      fromName: fromName,
      toName: toName,
      toProviderId: toProviderId,
      onDone: onDone,
    } = I;
  const v = `Newer ${tierLabel} model available`;
  let a;
  if (o[0] !== onDone) ((a = () => onDone(!1)), (o[0] = onDone), (o[1] = a));
  else a = o[1];
  let l;
  if (o[2] !== fromName)
    ((l = r(Text, { children: ["Currently pinned: ", e(Text, { bold: !0, children: fromName })] })),
      (o[2] = fromName),
      (o[3] = l));
  else l = o[3];
  let m;
  if (o[4] !== toName) ((m = e(Text, { bold: !0, children: toName })), (o[4] = toName), (o[5] = m));
  else m = o[5];
  let d;
  if (o[6] !== toProviderId)
    ((d = r(Text, { dimColor: !0, children: ["(", toProviderId, ")"] })), (o[6] = toProviderId), (o[7] = d));
  else d = o[7];
  let p;
  if (o[8] !== m || o[9] !== d)
    ((p = r(Text, { children: ["Latest available: ", m, " ", d] })), (o[8] = m), (o[9] = d), (o[10] = p));
  else p = o[10];
  let f;
  if (o[11] !== l || o[12] !== p)
    ((f = r(Box, { flexDirection: "column", children: [l, p] })), (o[11] = l), (o[12] = p), (o[13] = f));
  else f = o[13];
  let x;
  if (o[14] === MEMO_CACHE_SENTINEL)
    ((x = e(Text, { dimColor: !0, children: "Claude Code will restart to apply." })), (o[14] = x));
  else x = o[14];
  let C;
  if (o[15] !== toName)
    ((C = r(Text, { children: ["Update settings to use ", toName, "?", " ", x] })),
      (o[15] = toName),
      (o[16] = C));
  else C = o[16];
  let c;
  if (o[17] !== onDone)
    ((c = e(ConfirmSelect, { onConfirm: () => onDone(!0), onCancel: () => onDone(!1) })),
      (o[17] = onDone),
      (o[18] = c));
  else c = o[18];
  let D;
  if (o[19] !== c || o[20] !== f || o[21] !== C)
    ((D = r(Box, { flexDirection: "column", gap: 1, children: [f, C, c] })),
      (o[19] = c),
      (o[20] = f),
      (o[21] = C),
      (o[22] = D));
  else D = o[22];
  let P;
  if (o[23] !== v || o[24] !== D || o[25] !== a)
    ((P = e(Dialog, { title: v, color: "permission", onCancel: a, exitOnCtrlCD: !0, children: D })),
      (o[23] = v),
      (o[24] = D),
      (o[25] = a),
      (o[26] = P));
  else P = o[26];
  return P;
}
