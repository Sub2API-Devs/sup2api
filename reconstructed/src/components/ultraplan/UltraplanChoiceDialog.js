/**
 * components/ultraplan/UltraplanChoiceDialog.tsx
 *
 * 2.1.316 新增。ultraplan 选择对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { wrapText } from "../../ink/wrap-text.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-18hwfzwa.js:1252276-1252280 placement
init_react_production();
//@ chunk-18hwfzwa.js:1252280-1252296 placement
function noopUltraplanCancel() {}
//@ chunk-18hwfzwa.js:1252296-1252314 placement
var MAX_PLAN_ROWS = 24;
var PLAN_ROWS_RESERVED = 11;
//@ chunk-18hwfzwa.js:1252314-1254970 placement
function UltraplanChoiceDialog(props) {
  let $ = w(40);
  let { plan, onDone } = props;
  useRegisterOverlay("ultraplan-choice");
  let { answer, refused, attempts } = useRefusableAnswer(onDone);
  let { rows, columns } = useTerminalSize();
  let min = Math.min(MAX_PLAN_ROWS, Math.max(1, Math.floor(rows / 2) - PLAN_ROWS_RESERVED));
  let ze;
  if ($[0] !== columns || $[1] !== plan) {
    ze = wrapText(stripNonPrintable(plan), Math.max(1, columns - 4), "wrap").split(`
`);
    $[0] = columns;
    $[1] = plan;
    $[2] = ze;
  } else ze = $[2];
  let Xe = ze;
  let max = Math.max(0, Xe.length - min);
  let [kt, At] = y(0);
  let It;
  let Ot;
  if ($[3] !== max) {
    It = () => At((Et) => Math.min(Et, max));
    Ot = [max];
    $[3] = max;
    $[4] = It;
    $[5] = Ot;
  } else {
    It = $[4];
    Ot = $[5];
  }
  P(It, Ot);
  let Dt = Xe.length > min;
  let Lt;
  if ($[6] !== max || $[7] !== Dt) {
    Lt = function io(oo) {
      if (!Dt) {
        return;
      }
      At((Xt) => Math.max(0, Math.min(Xt + oo, max)));
    };
    $[6] = max;
    $[7] = Dt;
    $[8] = Lt;
  } else Lt = $[8];
  let io = Lt;
  let so;
  if ($[9] !== min || $[10] !== io) {
    so = function co(event) {
      if (!event.ctrl || event.meta) {
        return;
      }
      let max = Math.max(1, Math.floor(min / 2));
      if (event.key === "d") {
        event.preventDefault();
        io(max);
      } else if (event.key === "u") {
        event.preventDefault();
        io(-max);
      }
    };
    $[9] = min;
    $[10] = io;
    $[11] = so;
  } else so = $[11];
  let onKeyDown = so;
  let bo;
  if ($[12] !== io) {
    bo = function Bo(event) {
      event.preventDefault();
      io(event.deltaY > 0 ? 3 : -3);
    };
    $[12] = io;
    $[13] = bo;
  } else bo = $[13];
  let onWheel = bo;
  let Ro;
  if ($[14] !== Xe || $[15] !== min || $[16] !== kt) {
    Ro = Xe.slice(kt, kt + min).join(`
`);
    $[14] = Xe;
    $[15] = min;
    $[16] = kt;
    $[17] = Ro;
  } else Ro = $[17];
  let children = Ro;
  let Io = kt > 0;
  let Wo = kt < max;
  let mn;
  if ($[18] !== children) {
    mn = jsxProd_default(Text, {
      children,
    });
    $[18] = children;
    $[19] = mn;
  } else mn = $[19];
  let Cn;
  if ($[20] !== Wo || $[21] !== Io || $[22] !== Xe.length || $[23] !== min || $[24] !== kt || $[25] !== Dt) {
    Cn =
      Dt &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          Io ? figures_default.arrowUp : " ",
          Wo ? figures_default.arrowDown : " ",
          " ",
          kt + 1,
          "\u2013",
          Math.min(kt + min, Xe.length),
          " of",
          " ",
          Xe.length,
          " \xB7 ctrl+u/ctrl+d to scroll",
        ],
      });
    $[20] = Wo;
    $[21] = Io;
    $[22] = Xe.length;
    $[23] = min;
    $[24] = kt;
    $[25] = Dt;
    $[26] = Cn;
  } else Cn = $[26];
  let No;
  if ($[27] !== mn || $[28] !== Cn) {
    No = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [mn, Cn],
    });
    $[27] = mn;
    $[28] = Cn;
    $[29] = No;
  } else No = $[29];
  const defaultFocusValue = refused ?? undefined;
  let options;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Implement here",
        value: "here",
        description: "Inject plan into the current conversation",
      },
      {
        label: "Start new session",
        value: "fresh",
        description: "Clear conversation and start with only the plan",
      },
      {
        label: "Cancel",
        value: "cancel",
        description: "Don't implement \u2014 save plan and return",
      },
    ];
    $[30] = options;
  } else options = $[30];
  let kn;
  if ($[31] !== attempts || $[32] !== answer || $[33] !== defaultFocusValue) {
    kn = jsxProd_default(
      ModelSelector,
      {
        defaultFocusValue,
        options,
        onChange: answer,
      },
      attempts,
    );
    $[31] = attempts;
    $[32] = answer;
    $[33] = defaultFocusValue;
    $[34] = kn;
  } else kn = $[34];
  let Fn;
  if ($[35] !== onKeyDown || $[36] !== onWheel || $[37] !== No || $[38] !== kn) {
    Fn = jsxProd_default(Dialog, {
      title: "Ultraplan approved",
      subtitle: "How should the plan be implemented?",
      onCancel: noopUltraplanCancel,
      isCancelActive: false,
      hideInputGuide: true,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        onKeyDown,
        onWheel,
        children: [No, kn],
      }),
    });
    $[35] = onKeyDown;
    $[36] = onWheel;
    $[37] = No;
    $[38] = kn;
    $[39] = Fn;
  } else Fn = $[39];
  return Fn;
}
//@ chunk-18hwfzwa.js:1254970-1254974 placement
init_react_production();
export { UltraplanChoiceDialog };
