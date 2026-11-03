/**
 * components/PromptInput/PromptInputHelpMenu.tsx
 *
 * "?" 帮助菜单：列出输入模式前缀（! @ / # 等）与快捷键（按当前 keybinding 显示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputHelpMenu.tsx
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: fingerprint 2, layout 1, placement 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { cycleModeActionName } from "./PromptInputFooterLeftSide.js";
import { useAppStateSlice } from "../../state/AppState.js";
import { isViewingTeammate } from "../ProactivityMenu.js";
import { shouldShowEffortHint } from "../../utils/effort.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getNewlineInstructions } from "./utils.js";
import { isSuspendAllowed } from "../../ink/terminalProbe.js";
import { isFastModeEnabled, isFastModeAvailable } from "../../utils/fastMode.js";
import { isKeybindingCustomizationEnabled } from "../../keybindings/loadUserBindings.js";
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:846384-846430 fingerprint = formatShortcut (1)
function formatShortcut(shortcut) {
  return shortcut.replaceAll("+", " + ");
}
//@ chunk-18hwfzwa.js:846430-846468 layout
var SHORTCUT_FORMAT = {
  keyCase: "lower",
  modSep: " + ",
};
//@ chunk-18hwfzwa.js:846468-851347 fingerprint = PromptInputHelpMenu (0.665)
/**
 * "?" 帮助菜单：三列列出 ! bash 模式、/ 命令、@ 文件、& 后台、双击 esc 回退、shift+tab 模式切换、ctrl+o transcript、ctrl+t 任务、ctrl+_ 撤销等，按当前 keybinding 显示。
 */
function PromptInputHelpMenu(props) {
  let $ = w(93);
  let { dimColor, fixedWidth, gap, paddingX } = props;
  const t0 = useShortcutDisplay_2("app:toggleTranscript", "Global", "ctrl+o");
  let t1;
  if ($[0] !== t0) {
    t1 = formatShortcut(t0);
    $[0] = t0;
    $[1] = t1;
  } else t1 = $[1];
  let transcriptShortcut = t1;
  let chord = useShortcutDisplay("app:toggleTodos", "Global", "ctrl+t");
  let chord_2 = useShortcutDisplay("chat:undo", "Chat", "ctrl+_");
  let chord_3 = useShortcutDisplay("chat:stash", "Chat", "ctrl+s");
  let chord_4 = useShortcutDisplay(cycleModeActionName(), "Chat", "shift+tab");
  let chord_5 = useShortcutDisplay("chat:modelPicker", "Chat", "alt+p");
  let chord_6 = useShortcutDisplay("chat:fastMode", "Chat", "alt+o");
  let chord_7 = useShortcutDisplay("chat:externalEditor", "Chat", "ctrl+g");
  formatShortcut(useShortcutDisplay_2("app:toggleTerminal", "Global", "meta+j"));
  let chord_8 = useShortcutDisplay("chat:imagePaste", "Chat", "ctrl+v");
  useAppStateSlice(isViewingTeammate) ?? false;
  let Et;
  if ($[2] !== dimColor) {
    Et = shouldShowEffortHint(getMainLoopModel())
      ? jsxProd_default(EffortKeysHelp, {
          dimColor,
        })
      : null;
    $[2] = dimColor;
    $[3] = Et;
  } else Et = $[3];
  let Dt = Et;
  const width = fixedWidth ? 24 : undefined;
  let t22;
  if ($[4] !== dimColor) {
    t22 = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: "! for shell mode",
      }),
    });
    $[4] = dimColor;
    $[5] = t22;
  } else t22 = $[5];
  let t23;
  if ($[6] !== dimColor) {
    t23 = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: "/ for commands",
      }),
    });
    $[6] = dimColor;
    $[7] = t23;
  } else t23 = $[7];
  let t24;
  if ($[8] !== dimColor) {
    t24 = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: "@ for file paths",
      }),
    });
    $[8] = dimColor;
    $[9] = t24;
  } else t24 = $[9];
  let so;
  if ($[10] !== dimColor) {
    so = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: "/btw for side question",
      }),
    });
    $[10] = dimColor;
    $[11] = so;
  } else so = $[11];
  let po;
  if ($[12] !== width || $[13] !== t22 || $[14] !== t23 || $[15] !== t24 || $[16] !== so) {
    po = jsxProd_default_2(Box, {
      flexDirection: "column",
      width,
      children: [t22, t23, t24, so],
    });
    $[12] = width;
    $[13] = t22;
    $[14] = t23;
    $[15] = t24;
    $[16] = so;
    $[17] = po;
  } else po = $[17];
  const width_2 = fixedWidth ? 35 : undefined;
  let co;
  if ($[18] !== dimColor) {
    co = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: "double tap esc to clear input",
      }),
    });
    $[18] = dimColor;
    $[19] = co;
  } else co = $[19];
  let children;
  if ($[20] !== chord_4) {
    children = jsxProd_default(KeyboardShortcutHint, {
      chord: chord_4,
      action: "auto-accept edits",
      format: SHORTCUT_FORMAT,
    });
    $[20] = chord_4;
    $[21] = children;
  } else children = $[21];
  let t30;
  if ($[22] !== dimColor || $[23] !== children) {
    t30 = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children,
      }),
    });
    $[22] = dimColor;
    $[23] = children;
    $[24] = t30;
  } else t30 = $[24];
  let Bo;
  if ($[25] !== dimColor || $[26] !== transcriptShortcut) {
    Bo = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        dimColor,
        children: [transcriptShortcut, " for verbose output"],
      }),
    });
    $[25] = dimColor;
    $[26] = transcriptShortcut;
    $[27] = Bo;
  } else Bo = $[27];
  let children_2;
  if ($[28] !== chord) {
    children_2 = jsxProd_default(KeyboardShortcutHint, {
      chord,
      action: "toggle tasks",
      format: SHORTCUT_FORMAT,
    });
    $[28] = chord;
    $[29] = children_2;
  } else children_2 = $[29];
  let Ho;
  if ($[30] !== dimColor || $[31] !== children_2) {
    Ho = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: children_2,
      }),
    });
    $[30] = dimColor;
    $[31] = children_2;
    $[32] = Ho;
  } else Ho = $[32];
  let children_3;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    children_3 = getNewlineInstructions();
    $[33] = children_3;
  } else children_3 = $[33];
  let t34;
  if ($[34] !== dimColor) {
    t34 = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: children_3,
      }),
    });
    $[34] = dimColor;
    $[35] = t34;
  } else t34 = $[35];
  let mn;
  if (
    $[36] !== Dt ||
    $[37] !== co ||
    $[38] !== t30 ||
    $[39] !== Bo ||
    $[40] !== Ho ||
    $[41] !== t34 ||
    $[42] !== width_2
  ) {
    mn = jsxProd_default_2(Box, {
      flexDirection: "column",
      width: width_2,
      children: [co, t30, Dt, Bo, Ho, null, null, t34],
    });
    $[36] = Dt;
    $[37] = co;
    $[38] = t30;
    $[39] = Bo;
    $[40] = Ho;
    $[41] = t34;
    $[42] = width_2;
    $[43] = mn;
  } else mn = $[43];
  let children_4;
  if ($[44] !== chord_2) {
    children_4 = jsxProd_default(KeyboardShortcutHint, {
      chord: chord_2,
      action: "undo",
      format: SHORTCUT_FORMAT,
    });
    $[44] = chord_2;
    $[45] = children_4;
  } else children_4 = $[45];
  let t36;
  if ($[46] !== dimColor || $[47] !== children_4) {
    t36 = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: children_4,
      }),
    });
    $[46] = dimColor;
    $[47] = children_4;
    $[48] = t36;
  } else t36 = $[48];
  let vo;
  if ($[49] !== dimColor) {
    vo =
      isSuspendAllowed() &&
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          dimColor,
          children: jsxProd_default(KeyboardShortcutHint, {
            chord: "ctrl+z",
            action: "suspend",
            format: SHORTCUT_FORMAT,
          }),
        }),
      });
    $[49] = dimColor;
    $[50] = vo;
  } else vo = $[50];
  let children_5;
  if ($[51] !== chord_8) {
    children_5 = jsxProd_default(KeyboardShortcutHint, {
      chord: chord_8,
      action: "paste images",
      format: SHORTCUT_FORMAT,
    });
    $[51] = chord_8;
    $[52] = children_5;
  } else children_5 = $[52];
  let kn;
  if ($[53] !== dimColor || $[54] !== children_5) {
    kn = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: children_5,
      }),
    });
    $[53] = dimColor;
    $[54] = children_5;
    $[55] = kn;
  } else kn = $[55];
  let children_6;
  if ($[56] !== chord_5) {
    children_6 = jsxProd_default(KeyboardShortcutHint, {
      chord: chord_5,
      action: "switch model",
      format: SHORTCUT_FORMAT,
    });
    $[56] = chord_5;
    $[57] = children_6;
  } else children_6 = $[57];
  let t39;
  if ($[58] !== dimColor || $[59] !== children_6) {
    t39 = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: children_6,
      }),
    });
    $[58] = dimColor;
    $[59] = children_6;
    $[60] = t39;
  } else t39 = $[60];
  let Go;
  if ($[61] !== dimColor || $[62] !== chord_6) {
    Go =
      isFastModeEnabled() &&
      isFastModeAvailable() &&
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          dimColor,
          children: jsxProd_default(KeyboardShortcutHint, {
            chord: chord_6,
            action: "toggle fast mode",
            format: SHORTCUT_FORMAT,
          }),
        }),
      });
    $[61] = dimColor;
    $[62] = chord_6;
    $[63] = Go;
  } else Go = $[63];
  let children_7;
  if ($[64] !== chord_3) {
    children_7 = jsxProd_default(KeyboardShortcutHint, {
      chord: chord_3,
      action: "stash prompt",
      format: SHORTCUT_FORMAT,
    });
    $[64] = chord_3;
    $[65] = children_7;
  } else children_7 = $[65];
  let Mn;
  if ($[66] !== dimColor || $[67] !== children_7) {
    Mn = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children: children_7,
      }),
    });
    $[66] = dimColor;
    $[67] = children_7;
    $[68] = Mn;
  } else Mn = $[68];
  let children_8;
  if ($[69] !== chord_7) {
    children_8 = jsxProd_default(KeyboardShortcutHint, {
      chord: chord_7,
      action: "edit in $EDITOR",
      format: SHORTCUT_FORMAT,
    });
    $[69] = chord_7;
    $[70] = children_8;
  } else children_8 = $[70];
  let t42;
  if ($[71] !== dimColor || $[72] !== children_8) {
    t42 = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default(Text, {
        dimColor,
        children: children_8,
      }),
    });
    $[71] = dimColor;
    $[72] = children_8;
    $[73] = t42;
  } else t42 = $[73];
  let t43;
  if ($[74] !== dimColor) {
    t43 =
      isKeybindingCustomizationEnabled() &&
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          dimColor,
          children: "/keybindings to customize",
        }),
      });
    $[74] = dimColor;
    $[75] = t43;
  } else t43 = $[75];
  let on;
  if (
    $[76] !== t36 ||
    $[77] !== vo ||
    $[78] !== kn ||
    $[79] !== t39 ||
    $[80] !== Go ||
    $[81] !== Mn ||
    $[82] !== t42 ||
    $[83] !== t43
  ) {
    on = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t36, vo, kn, t39, Go, Mn, t42, t43],
    });
    $[76] = t36;
    $[77] = vo;
    $[78] = kn;
    $[79] = t39;
    $[80] = Go;
    $[81] = Mn;
    $[82] = t42;
    $[83] = t43;
    $[84] = on;
  } else on = $[84];
  let _o;
  if ($[85] !== gap || $[86] !== mn || $[87] !== on || $[88] !== po) {
    _o = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap,
      children: [po, mn, on],
    });
    $[85] = gap;
    $[86] = mn;
    $[87] = on;
    $[88] = po;
    $[89] = _o;
  } else _o = $[89];
  let cn;
  if ($[90] !== paddingX || $[91] !== _o) {
    cn = jsxProd_default_2(Box, {
      paddingX,
      flexDirection: "column",
      children: [_o, null],
    });
    $[90] = paddingX;
    $[91] = _o;
    $[92] = cn;
  } else cn = $[92];
  return cn;
}
//@ chunk-18hwfzwa.js:851347-851811 placement
function EffortKeysHelp(props) {
  let $ = w(8);
  let { dimColor } = props;
  const shortcutDisplay = useShortcutDisplay("chat:increaseEffort", "Chat", "shift+up");
  const shortcutDisplay_2 = useShortcutDisplay("chat:decreaseEffort", "Chat", "shift+down");
  let ke;
  if ($[0] !== shortcutDisplay || $[1] !== shortcutDisplay_2) {
    ke = [shortcutDisplay, shortcutDisplay_2];
    $[0] = shortcutDisplay;
    $[1] = shortcutDisplay_2;
    $[2] = ke;
  } else ke = $[2];
  let chord = ke;
  let children;
  if ($[3] !== chord) {
    children = jsxProd_default(KeyboardShortcutHint, {
      chord,
      action: "change effort",
      format: SHORTCUT_FORMAT,
    });
    $[3] = chord;
    $[4] = children;
  } else children = $[4];
  let He;
  if ($[5] !== dimColor || $[6] !== children) {
    He = jsxProd_default(Box, {
      children: jsxProd_default(Text, {
        dimColor,
        children,
      }),
    });
    $[5] = dimColor;
    $[6] = children;
    $[7] = He;
  } else He = $[7];
  return He;
}
//@ chunk-18hwfzwa.js:851811-851815 placement
init_react_production();
export { PromptInputHelpMenu };
