/**
 * components/useCaseChoiceDialog.tsx
 *
 * Life Sciences 用例选择对话框与选项映射，带当前标记与生效说明（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-czq1j3j2.js:1140317-1140368 placement
/**
 * 把用例项映射成选择控件需要的 label/value。
 */
function toChoice(useCase) {
  return {
    label: useCase.name,
    value: useCase.id,
  };
}
//@ chunk-czq1j3j2.js:1140368-1140378 placement
/**
 * 用例选择器的空占位字符串。
 */
var NO_USE_CASE_VALUE = "";
//@ chunk-czq1j3j2.js:1141932-1142859 placement
/**
 * Life Sciences 用例选择对话框：列出可选用例，带“（当前）”标记，说明选了之后从下一次请求开始生效。
 */
function UseCaseDialog(props) {
  let $ = useMemoCache(16);
  let { choices, current, onChoose, onCancel } = props;
  const defaultFocusValue = current ?? undefined;
  let options;
  if ($[0] !== choices || $[1] !== current) {
    let toOption;
    if ($[3] !== current) {
      toOption = (useCase) => ({
        label: useCase.id === current ? `${useCase.name} (current)` : useCase.name,
        value: useCase.id,
      });
      $[3] = current;
      $[4] = toOption;
    } else toOption = $[4];
    const mapped = choices.map(toOption);
    let noUseCaseOption;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      noUseCaseOption = {
        label: "No use case",
        value: NO_USE_CASE_VALUE,
      };
      $[5] = noUseCaseOption;
    } else noUseCaseOption = $[5];
    options = [...mapped, noUseCaseOption];
    $[0] = choices;
    $[1] = current;
    $[2] = options;
  } else options = $[2];
  let onChange;
  if ($[6] !== onChoose) {
    onChange = (value) => onChoose(value === NO_USE_CASE_VALUE ? null : value);
    $[6] = onChoose;
    $[7] = onChange;
  } else onChange = $[7];
  let children;
  if ($[8] !== onCancel || $[9] !== defaultFocusValue || $[10] !== options || $[11] !== onChange) {
    children = jsxProd_default(ModelSelector, {
      defaultFocusValue,
      options,
      onChange,
      onCancel,
    });
    $[8] = onCancel;
    $[9] = defaultFocusValue;
    $[10] = options;
    $[11] = onChange;
    $[12] = children;
  } else children = $[12];
  let dialog;
  if ($[13] !== onCancel || $[14] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "Choose a use case",
      subtitle:
        "Your requests get the reduced restrictions of the use case you choose, from your next request on.",
      onCancel,
      children,
    });
    $[13] = onCancel;
    $[14] = children;
    $[15] = dialog;
  } else dialog = $[15];
  return dialog;
}
export { UseCaseDialog, toChoice };
