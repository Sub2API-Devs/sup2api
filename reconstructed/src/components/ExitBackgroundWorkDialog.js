/**
 * components/ExitBackgroundWorkDialog.tsx
 *
 * 2.1.316 新增。退出时仍有后台工作的确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { logEvent } from "../services/analytics/index.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useScrollViewportSize, useHasScrollViewport } from "./ScrollViewportContext.js";
import { isFullscreenActive } from "../utils/fullscreen.js";
import { Dialog } from "./design-system/Dialog.js";
import { OverflowHint } from "./CtrlOToExpand.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ModelSelector } from "./agents/ModelSelector.js";

//@ chunk-18hwfzwa.js:1690353-1690357 placement
init_react_production();
//@ chunk-18hwfzwa.js:1690357-1690522 placement
function renderBackgroundWorkItem(bn, Go) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: bn.label,
        }),
        bn.detail
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: [" \xB7 ", bn.detail],
            })
          : null,
      ],
    },
    Go,
  );
}
//@ chunk-18hwfzwa.js:1690522-1692920 placement
function ExitBackgroundWorkDialog(props) {
  let $ = w(52);
  let { items, onExit, onCancel, onBackground } = props;
  let Re;
  if ($[0] !== items.length) {
    Re = function He(Be) {
      logEvent("tengu_exit_background_work_prompt", {
        item_count: items.length,
        chose_exit: Be === "exit",
        chose_background: Be === "background",
      });
    };
    $[0] = items.length;
    $[1] = Re;
  } else Re = $[1];
  let He = Re;
  let We;
  if ($[2] !== He || $[3] !== onBackground || $[4] !== onCancel || $[5] !== onExit) {
    We = function Xe(ze) {
      switch ((He(ze), ze)) {
        case "exit": {
          return onExit();
        }
        case "background": {
          return onBackground?.();
        }
        case "stay": {
          return onCancel();
        }
      }
    };
    $[2] = He;
    $[3] = onBackground;
    $[4] = onCancel;
    $[5] = onExit;
    $[6] = We;
  } else We = $[6];
  let onChange = We;
  let rt;
  if ($[7] !== He || $[8] !== onCancel) {
    rt = function kt() {
      He("stay");
      onCancel();
    };
    $[7] = He;
    $[8] = onCancel;
    $[9] = rt;
  } else rt = $[9];
  let kt = rt;
  let terminalSize = useTerminalSize();
  let { rows } = useScrollViewportSize(terminalSize);
  let hasScrollViewport = useHasScrollViewport();
  let Et;
  if ($[10] !== hasScrollViewport || $[11] !== rows) {
    Et = !hasScrollViewport && isFullscreenActive() ? Math.floor(rows / 2) : rows;
    $[10] = hasScrollViewport;
    $[11] = rows;
    $[12] = Et;
  } else Et = $[12];
  let Dt = Et;
  let Lt = (onBackground ? 13 : 12) - 0;
  let max = Math.max(1, Dt - Lt);
  let Xt;
  let io;
  let subtitle;
  let onCancel_2;
  let exitOnCtrlCD;
  let flexDirection;
  let gap;
  let paddingLeft;
  let Bo;
  let title;
  if ($[13] !== kt || $[14] !== items || $[15] !== max) {
    let sliced = items.slice(0, max);
    io = Dialog;
    title = "Background work is running";
    subtitle = "The following will stop when you exit:";
    onCancel_2 = kt;
    exitOnCtrlCD = true;
    Xt = Box;
    flexDirection = "column";
    gap = 0;
    paddingLeft = 0;
    Bo = sliced.map(renderBackgroundWorkItem);
    $[13] = kt;
    $[14] = items;
    $[15] = max;
    $[16] = Xt;
    $[17] = io;
    $[18] = subtitle;
    $[19] = onCancel_2;
    $[20] = exitOnCtrlCD;
    $[21] = flexDirection;
    $[22] = gap;
    $[23] = paddingLeft;
    $[24] = Bo;
    $[25] = title;
  } else {
    Xt = $[16];
    io = $[17];
    subtitle = $[18];
    onCancel_2 = $[19];
    exitOnCtrlCD = $[20];
    flexDirection = $[21];
    gap = $[22];
    paddingLeft = $[23];
    Bo = $[24];
    title = $[25];
  }
  const count = items.length - max;
  let Wo;
  if ($[26] !== count) {
    Wo = jsxProd_default(OverflowHint, {
      count,
      unit: "item",
    });
    $[26] = count;
    $[27] = Wo;
  } else Wo = $[27];
  let mn;
  if (
    $[28] !== Xt ||
    $[29] !== Wo ||
    $[30] !== flexDirection ||
    $[31] !== gap ||
    $[32] !== paddingLeft ||
    $[33] !== Bo
  ) {
    mn = jsxProd_default_2(Xt, {
      flexDirection,
      gap,
      paddingLeft,
      children: [Bo, Wo],
    });
    $[28] = Xt;
    $[29] = Wo;
    $[30] = flexDirection;
    $[31] = gap;
    $[32] = paddingLeft;
    $[33] = Bo;
    $[34] = mn;
  } else mn = $[34];
  let Cn;
  if ($[35] === MEMO_CACHE_SENTINEL) {
    Cn = {
      label: "Exit and stop tasks",
      value: "exit",
    };
    $[35] = Cn;
  } else Cn = $[35];
  let No;
  if ($[36] !== onBackground) {
    No = onBackground
      ? [
          {
            label: "Move to background and exit",
            value: "background",
          },
        ]
      : [];
    $[36] = onBackground;
    $[37] = No;
  } else No = $[37];
  let vo;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    vo = {
      label: "Stay",
      value: "stay",
    };
    $[38] = vo;
  } else vo = $[38];
  let options;
  if ($[39] !== No) {
    options = [Cn, ...No, vo];
    $[39] = No;
    $[40] = options;
  } else options = $[40];
  let kn;
  if ($[41] !== onChange || $[42] !== options) {
    kn = jsxProd_default(ModelSelector, {
      options,
      onChange,
    });
    $[41] = onChange;
    $[42] = options;
    $[43] = kn;
  } else kn = $[43];
  let Fn;
  if (
    $[44] !== io ||
    $[45] !== subtitle ||
    $[46] !== onCancel_2 ||
    $[47] !== exitOnCtrlCD ||
    $[48] !== mn ||
    $[49] !== kn ||
    $[50] !== title
  ) {
    Fn = jsxProd_default_2(io, {
      title,
      subtitle,
      onCancel: onCancel_2,
      exitOnCtrlCD,
      children: [mn, kn],
    });
    $[44] = io;
    $[45] = subtitle;
    $[46] = onCancel_2;
    $[47] = exitOnCtrlCD;
    $[48] = mn;
    $[49] = kn;
    $[50] = title;
    $[51] = Fn;
  } else Fn = $[51];
  return Fn;
}
//@ chunk-18hwfzwa.js:1693038-1693042 placement
init_react_production();
export { ExitBackgroundWorkDialog };
