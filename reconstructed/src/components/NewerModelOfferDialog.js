/**
 * components/NewerModelOfferDialog.tsx
 *
 * 2.1.316 新增。提议切换到更新模型的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { fillNewerModelCopy } from "../utils/newerModelOffer.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";
import { j } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1198448-1199258 placement
function NewerModelOfferDialog(h) {
  let $ = w(20),
    { offer: offer, onDone: onDone } = h,
    ee;
  if ($[0] !== offer) ((ee = fillNewerModelCopy(offer)), ($[0] = offer), ($[1] = ee));
  else ee = $[1];
  let ke = ee,
    Re;
  if ($[2] !== onDone) ((Re = () => onDone("dismiss")), ($[2] = onDone), ($[3] = Re));
  else Re = $[3];
  let Be;
  if ($[4] !== ke.decline) ((Be = { value: "keep", label: ke.decline }), ($[4] = ke.decline), ($[5] = Be));
  else Be = $[5];
  let He;
  if ($[6] !== ke.accept)
    ((He = { value: "resume_on_newer_model", label: ke.accept }), ($[6] = ke.accept), ($[7] = He));
  else He = $[7];
  let We;
  if ($[8] !== Be || $[9] !== He) ((We = [Be, He]), ($[8] = Be), ($[9] = He), ($[10] = We));
  else We = $[10];
  let ze;
  if ($[11] !== onDone) ((ze = (Xe) => onDone(Xe)), ($[11] = onDone), ($[12] = ze));
  else ze = $[12];
  let rt;
  if ($[13] !== We || $[14] !== ze)
    ((rt = e(ModelSelector, { options: We, onChange: ze })), ($[13] = We), ($[14] = ze), ($[15] = rt));
  else rt = $[15];
  let kt;
  if ($[16] !== Re || $[17] !== rt || $[18] !== ke.title)
    ((kt = e(Dialog, { title: ke.title, onCancel: Re, children: rt })),
      ($[16] = Re),
      ($[17] = rt),
      ($[18] = ke.title),
      ($[19] = kt));
  else kt = $[19];
  return kt;
}
//@ chunk-18hwfzwa.js:1199296-1199300 placement
j();

export { NewerModelOfferDialog };
