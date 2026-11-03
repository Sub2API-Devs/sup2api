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
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-jxwr2fwk.js:13623-14918 placement
/**
 * 提示"有更新的同档模型"，可把设置里固定的模型更新为最新版本（需重启）。
 */
function ModelPinUpdateDialog(props) {
  let o = w(27);
  let { tierLabel, fromName, toName, toProviderId, onDone } = props;
  const title = `Newer ${tierLabel} model available`;
  let onCancel;
  if (o[0] !== onDone) {
    onCancel = () => onDone(false);
    o[0] = onDone;
    o[1] = onCancel;
  } else onCancel = o[1];
  let l;
  if (o[2] !== fromName) {
    l = jsxProd_default_2(Text, {
      children: [
        "Currently pinned: ",
        jsxProd_default(Text, {
          bold: true,
          children: fromName,
        }),
      ],
    });
    o[2] = fromName;
    o[3] = l;
  } else l = o[3];
  let m;
  if (o[4] !== toName) {
    m = jsxProd_default(Text, {
      bold: true,
      children: toName,
    });
    o[4] = toName;
    o[5] = m;
  } else m = o[5];
  let d;
  if (o[6] !== toProviderId) {
    d = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["(", toProviderId, ")"],
    });
    o[6] = toProviderId;
    o[7] = d;
  } else d = o[7];
  let p;
  if (o[8] !== m || o[9] !== d) {
    p = jsxProd_default_2(Text, {
      children: ["Latest available: ", m, " ", d],
    });
    o[8] = m;
    o[9] = d;
    o[10] = p;
  } else p = o[10];
  let f;
  if (o[11] !== l || o[12] !== p) {
    f = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [l, p],
    });
    o[11] = l;
    o[12] = p;
    o[13] = f;
  } else f = o[13];
  let x;
  if (o[14] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default(Text, {
      dimColor: true,
      children: "Claude Code will restart to apply.",
    });
    o[14] = x;
  } else x = o[14];
  let C;
  if (o[15] !== toName) {
    C = jsxProd_default_2(Text, {
      children: ["Update settings to use ", toName, "?", " ", x],
    });
    o[15] = toName;
    o[16] = C;
  } else C = o[16];
  let c;
  if (o[17] !== onDone) {
    c = jsxProd_default(ConfirmSelect, {
      onConfirm: () => onDone(true),
      onCancel: () => onDone(false),
    });
    o[17] = onDone;
    o[18] = c;
  } else c = o[18];
  let children;
  if (o[19] !== c || o[20] !== f || o[21] !== C) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [f, C, c],
    });
    o[19] = c;
    o[20] = f;
    o[21] = C;
    o[22] = children;
  } else children = o[22];
  let P;
  if (o[23] !== title || o[24] !== children || o[25] !== onCancel) {
    P = jsxProd_default(Dialog, {
      title,
      color: "permission",
      onCancel,
      exitOnCtrlCD: true,
      children,
    });
    o[23] = title;
    o[24] = children;
    o[25] = onCancel;
    o[26] = P;
  } else P = o[26];
  return P;
}
