/**
 * components/ChannelDowngradeDialog.tsx
 *
 * 切换到 stable 更新通道可能降级时的确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ChannelDowngradeDialog.tsx
 * pieces: chunk-9h8dr0qb.js (3)
 * attribution: placement 2, fingerprint 1
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-9h8dr0qb.js:6534-6538 placement
init_react_production();
//@ chunk-9h8dr0qb.js:6538-6542 placement
init_react_production();
//@ chunk-9h8dr0qb.js:6542-7565 fingerprint (2.1.88 match: ChannelDowngradeDialog, 0.849)
function ChannelDowngradeDialog(props) {
  let $ = useMemoCache(17);
  let { currentVersion, onChoice } = props;
  let t1;
  if ($[0] !== onChoice) {
    t1 = function handleSelect(value) {
      onChoice(value);
    };
    $[0] = onChoice;
    $[1] = t1;
  } else t1 = $[1];
  let handleSelect = t1;
  let t2;
  if ($[2] !== onChoice) {
    t2 = function handleCancel() {
      onChoice("cancel");
    };
    $[2] = onChoice;
    $[3] = t2;
  } else t2 = $[3];
  let handleCancel = t2;
  let t3;
  if ($[4] !== currentVersion) {
    t3 = jsxProd_default_2(Text, {
      children: [
        "The stable channel may have an older version than what you're currently running (",
        currentVersion,
        ").",
      ],
    });
    $[4] = currentVersion;
    $[5] = t3;
  } else t3 = $[5];
  let t4;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(Text, {
      dimColor: true,
      children: "How would you like to handle this?",
    });
    $[6] = t4;
  } else t4 = $[6];
  let t5;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    t5 = {
      label: "Allow possible downgrade to stable version",
      value: "downgrade",
    };
    $[7] = t5;
  } else t5 = $[7];
  const label = `Stay on current version (${currentVersion}) until stable catches up`;
  let options;
  if ($[8] !== label) {
    options = [
      t5,
      {
        label,
        value: "stay",
      },
    ];
    $[8] = label;
    $[9] = options;
  } else options = $[9];
  let t8;
  if ($[10] !== handleSelect || $[11] !== options) {
    t8 = jsxProd_default(ModelSelector, {
      options,
      onChange: handleSelect,
    });
    $[10] = handleSelect;
    $[11] = options;
    $[12] = t8;
  } else t8 = $[12];
  let t9;
  if ($[13] !== handleCancel || $[14] !== t3 || $[15] !== t8) {
    t9 = jsxProd_default_2(Dialog, {
      title: "Switch to Stable Channel",
      onCancel: handleCancel,
      color: "permission",
      hideBorder: true,
      hideInputGuide: true,
      children: [t3, t4, t8],
    });
    $[13] = handleCancel;
    $[14] = t3;
    $[15] = t8;
    $[16] = t9;
  } else t9 = $[16];
  return t9;
}
export { ChannelDowngradeDialog };
