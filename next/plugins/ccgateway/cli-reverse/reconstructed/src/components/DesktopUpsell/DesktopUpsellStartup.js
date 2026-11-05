/**
 * components/DesktopUpsell/DesktopUpsellStartup.tsx
 *
 * 启动时的桌面版/插件推荐提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/DesktopUpsell/DesktopUpsellStartup.tsx
 * pieces: chunk-czq1j3j2.js (1), chunk-z0x4zh5m.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 2
 */
import { getDynamicConfig_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useMountTime, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { toChoice } from "../useCaseChoiceDialog.js";
import { PermissionDialog_2 } from "../permissions/PermissionDialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";

//@ chunk-z0x4zh5m.js:14945-15002 fingerprint (2.1.88 match: DESKTOP_UPSELL_DEFAULT, 0.667)
var DESKTOP_UPSELL_DEFAULT = {
  enable_shortcut_tip: false,
  enable_contextual_tip: false,
};
//@ chunk-z0x4zh5m.js:15002-15052 fingerprint (2.1.88 match: getDesktopUpsellConfig, 1)
function getDesktopUpsellConfig() {
  return getDynamicConfig_CACHED_MAY_BE_STALE("tengu_desktop_upsell", DESKTOP_UPSELL_DEFAULT);
}
//@ chunk-czq1j3j2.js:1140378-1141932 callgraph-fingerprint (2.1.88 match: DesktopUpsellStartup, 0.257)
function DesktopUpsellStartup(props) {
  let $ = useMemoCache(23);
  let { choices, onDone, onDismiss } = props;
  useGlobalExitKeybindings();
  let finish;
  if ($[0] !== onDone) {
    finish = (value) => onDone(value);
    $[0] = onDone;
    $[1] = finish;
  } else finish = $[1];
  let refusableAnswer = useRefusableAnswer(finish);
  let inputClock = useInputClock();
  let mountTime = useMountTime();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let refuseInput;
  if ($[2] !== inputClock || $[3] !== noteRefused || $[4] !== mountTime || $[5] !== refusedWithin) {
    refuseInput = () => {
      if (isWithinRecentInput(inputClock, mountTime()) || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[2] = inputClock;
    $[3] = noteRefused;
    $[4] = mountTime;
    $[5] = refusedWithin;
    $[6] = refuseInput;
  } else refuseInput = $[6];
  let shouldRefuse = refuseInput;
  let onChange;
  if ($[7] !== shouldRefuse || $[8] !== refusableAnswer) {
    onChange = function onChange(value) {
      if (shouldRefuse()) {
        refusableAnswer.refuse(value);
        return;
      }
      refusableAnswer.answer(value);
    };
    $[7] = shouldRefuse;
    $[8] = refusableAnswer;
    $[9] = onChange;
  } else onChange = $[9];
  let onChange_2 = onChange;
  let introRow;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    introRow = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        children:
          "You have more than one Life Sciences use case. Choose the one your work is for: your requests get its reduced restrictions, in this and later sessions. If you leave without choosing, no use case applies for now, and you'll be asked again next session. To choose or change it later, run /use-case.",
      }),
    });
    $[10] = introRow;
  } else introRow = $[10];
  const attempts = refusableAnswer.attempts;
  const defaultFocusValue = refusableAnswer.refused ?? undefined;
  let options;
  if ($[11] !== choices) {
    options = choices.map(toChoice);
    $[11] = choices;
    $[12] = options;
  } else options = $[12];
  let onCancel;
  if ($[13] !== onDismiss || $[14] !== shouldRefuse) {
    onCancel = () => {
      if (!shouldRefuse()) onDismiss();
    };
    $[13] = onDismiss;
    $[14] = shouldRefuse;
    $[15] = onCancel;
  } else onCancel = $[15];
  let dialog;
  if (
    $[16] !== onChange_2 ||
    $[17] !== shouldRefuse ||
    $[18] !== refusableAnswer.attempts ||
    $[19] !== defaultFocusValue ||
    $[20] !== options ||
    $[21] !== onCancel
  ) {
    dialog = jsxProd_default(PermissionDialog_2, {
      title: "Choose your Life Sciences use case",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: 2,
        paddingY: 1,
        children: [
          introRow,
          jsxProd_default(
            ModelSelector,
            {
              defaultFocusValue,
              hideIndexes: true,
              refuseInput: shouldRefuse,
              options,
              onChange: onChange_2,
              onCancel,
            },
            attempts,
          ),
        ],
      }),
    });
    $[16] = onChange_2;
    $[17] = shouldRefuse;
    $[18] = refusableAnswer.attempts;
    $[19] = defaultFocusValue;
    $[20] = options;
    $[21] = onCancel;
    $[22] = dialog;
  } else dialog = $[22];
  return dialog;
}
export { getDesktopUpsellConfig, DesktopUpsellStartup };
