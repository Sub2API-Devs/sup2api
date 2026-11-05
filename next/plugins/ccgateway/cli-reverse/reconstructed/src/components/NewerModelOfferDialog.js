/**
 * components/NewerModelOfferDialog.tsx
 *
 * 2.1.316 新增。提议切换到更新模型的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { fillNewerModelCopy } from "../utils/newerModelOffer.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1159031-1159035 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1159031", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1228611-1229421 placement
function NewerModelOfferDialog(props) {
  let $ = useMemoCache(20);
  let { offer, onDone } = props;
  let copy;
  if ($[0] !== offer) {
    copy = fillNewerModelCopy(offer);
    $[0] = offer;
    $[1] = copy;
  } else copy = $[1];
  let dialogCopy = copy;
  let onCancel;
  if ($[2] !== onDone) {
    onCancel = () => onDone("dismiss");
    $[2] = onDone;
    $[3] = onCancel;
  } else onCancel = $[3];
  let keepOption;
  if ($[4] !== dialogCopy.decline) {
    keepOption = {
      value: "keep",
      label: dialogCopy.decline,
    };
    $[4] = dialogCopy.decline;
    $[5] = keepOption;
  } else keepOption = $[5];
  let acceptOption;
  if ($[6] !== dialogCopy.accept) {
    acceptOption = {
      value: "resume_on_newer_model",
      label: dialogCopy.accept,
    };
    $[6] = dialogCopy.accept;
    $[7] = acceptOption;
  } else acceptOption = $[7];
  let options;
  if ($[8] !== keepOption || $[9] !== acceptOption) {
    options = [keepOption, acceptOption];
    $[8] = keepOption;
    $[9] = acceptOption;
    $[10] = options;
  } else options = $[10];
  let onChange;
  if ($[11] !== onDone) {
    onChange = (choice) => onDone(choice);
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
  let dialogElement;
  if ($[16] !== onCancel || $[17] !== children || $[18] !== dialogCopy.title) {
    dialogElement = jsxProd_default(Dialog, {
      title: dialogCopy.title,
      onCancel,
      children,
    });
    $[16] = onCancel;
    $[17] = children;
    $[18] = dialogCopy.title;
    $[19] = dialogElement;
  } else dialogElement = $[19];
  return dialogElement;
}
export { NewerModelOfferDialog };
