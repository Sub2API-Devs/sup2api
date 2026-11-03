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
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1198448-1199258 placement
function NewerModelOfferDialog(props) {
  let $ = w(20);
  let { offer, onDone } = props;
  let ee;
  if ($[0] !== offer) {
    ee = fillNewerModelCopy(offer);
    $[0] = offer;
    $[1] = ee;
  } else ee = $[1];
  let ke = ee;
  let onCancel;
  if ($[2] !== onDone) {
    onCancel = () => onDone("dismiss");
    $[2] = onDone;
    $[3] = onCancel;
  } else onCancel = $[3];
  let Be;
  if ($[4] !== ke.decline) {
    Be = {
      value: "keep",
      label: ke.decline,
    };
    $[4] = ke.decline;
    $[5] = Be;
  } else Be = $[5];
  let He;
  if ($[6] !== ke.accept) {
    He = {
      value: "resume_on_newer_model",
      label: ke.accept,
    };
    $[6] = ke.accept;
    $[7] = He;
  } else He = $[7];
  let options;
  if ($[8] !== Be || $[9] !== He) {
    options = [Be, He];
    $[8] = Be;
    $[9] = He;
    $[10] = options;
  } else options = $[10];
  let onChange;
  if ($[11] !== onDone) {
    onChange = (Xe) => onDone(Xe);
    $[11] = onDone;
    $[12] = onChange;
  } else onChange = $[12];
  let children;
  if ($[13] !== options || $[14] !== onChange) {
    children = jsxProd_default(ModelSelector, {
      options,
      onChange,
    });
    $[13] = options;
    $[14] = onChange;
    $[15] = children;
  } else children = $[15];
  let kt;
  if ($[16] !== onCancel || $[17] !== children || $[18] !== ke.title) {
    kt = jsxProd_default(Dialog, {
      title: ke.title,
      onCancel,
      children,
    });
    $[16] = onCancel;
    $[17] = children;
    $[18] = ke.title;
    $[19] = kt;
  } else kt = $[19];
  return kt;
}
//@ chunk-18hwfzwa.js:1199296-1199300 placement
init_react_production();
export { NewerModelOfferDialog };
