/**
 * components/HelpV2/HelpV2.tsx
 *
 * /help 对话框：General/Commands/自定义命令等标签页，help:dismiss 关闭。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HelpV2/HelpV2.tsx
 * pieces: chunk-yxcx2jtr.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { showFooterHintGate } from "../PromptInput/footerGates.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../keybindings/useKeybinding.js";
import { useShortcutDisplay } from "../../keybindings/useShortcutDisplay.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Tab, Tabs } from "../design-system/Tabs.js";
import { General } from "./General.js";
import { CommandsTab } from "./CommandList.js";
import { Text, Link, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { Pane } from "../design-system/Pane.js";

//@ chunk-yxcx2jtr.js:16345-16429 sole-consumer
function isShownCommand(G) {
  return G.type !== "prompt" || G.source === "builtin" || G.source === "bundled";
}
//@ chunk-yxcx2jtr.js:16429-16445 affinity
var HELP_COLUMN_WIDTH = 44;
var HELP_LIST_ROWS = 21;
//@ chunk-yxcx2jtr.js:16445-19220 fingerprint = HelpV2 (0.573)
/**
 * /help 对话框：标签页切换（General、Commands、自定义命令），help:dismiss 或 Esc 关闭并发系统消息 "Help dialog dismissed"。
 */
function HelpV2(props) {
  let $ = w(44);
  let { onClose, commands } = props;
  let insideModal = useTerminalSize();
  let { rows } = useScrollViewportSize(insideModal);
  let maxHeight = rows;
  let l;
  if ($[0] !== insideModal.rows) {
    l = insideModal.rows >= HELP_COLUMN_WIDTH && isFeedbackAllowed();
    $[0] = insideModal.rows;
    $[1] = l;
  } else l = $[1];
  let u = l;
  let marginTop = showFooterHintGate() && rows < HELP_LIST_ROWS ? 0 : 1;
  let h;
  if ($[2] !== onClose) {
    h = () =>
      onClose("Help dialog dismissed", {
        display: "system",
      });
    $[2] = onClose;
    $[3] = h;
  } else h = $[3];
  let R = h;
  let [x, M] = y(false);
  const isActive = !x;
  let t2;
  if ($[4] !== isActive) {
    t2 = {
      context: "Help",
      isActive,
    };
    $[4] = isActive;
    $[5] = t2;
  } else t2 = $[5];
  useKeybinding("help:dismiss", R, t2);
  let exitState = useGlobalExitKeybindings(R);
  let dismissShortcut = useShortcutDisplay("help:dismiss", "Help", "esc");
  let color = false ? "permission" : "professionalBlue";
  let Se = isShownCommand;
  let be;
  if ($[6] !== commands) {
    let k;
    if ($[8] === MEMO_CACHE_SENTINEL) {
      k = (cmd) => Se(cmd) && !cmd.isHidden;
      $[8] = k;
    } else k = $[8];
    be = commands.filter(k);
    $[6] = commands;
    $[7] = be;
  } else be = $[7];
  let commands_2 = be;
  let k;
  if ($[9] !== commands) {
    let T;
    if ($[11] === MEMO_CACHE_SENTINEL) {
      T = (cmd) => !Se(cmd) && !cmd.isHidden;
      $[11] = T;
    } else T = $[11];
    k = commands.filter(T);
    $[9] = commands;
    $[10] = k;
  } else k = $[10];
  let commands_3 = k;
  let t4;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    t4 = jsxProd_default(
      Tab,
      {
        id: "general",
        title: "General",
        children: jsxProd_default(General, {}),
      },
      "general",
    );
    $[12] = t4;
  } else t4 = $[12];
  let E;
  if ($[13] !== commands_2 || $[14] !== commands_3 || $[15] !== maxHeight) {
    E = [t4];
    let O;
    if ($[17] !== commands_2 || $[18] !== maxHeight) {
      O = jsxProd_default(
        Tab,
        {
          id: "commands",
          title: "Commands",
          children: jsxProd_default(CommandsTab, {
            commands: commands_2,
            maxHeight,
            title: "Browse default commands",
            onOwnsEscChange: M,
          }),
        },
        "commands",
      );
      $[17] = commands_2;
      $[18] = maxHeight;
      $[19] = O;
    } else O = $[19];
    E.push(O);
    let f;
    if ($[20] !== commands_3 || $[21] !== maxHeight) {
      f = jsxProd_default(
        Tab,
        {
          id: "custom",
          title: "Custom commands",
          children: jsxProd_default(CommandsTab, {
            commands: commands_3,
            maxHeight,
            title: "Browse custom commands",
            emptyMessage: "No custom commands found",
            onOwnsEscChange: M,
          }),
        },
        "custom",
      );
      $[20] = commands_3;
      $[21] = maxHeight;
      $[22] = f;
    } else f = $[22];
    E.push(f);
    $[13] = commands_2;
    $[14] = commands_3;
    $[15] = maxHeight;
    $[16] = E;
  } else E = $[16];
  const navFromContent = !x;
  let f;
  if ($[23] !== navFromContent || $[24] !== E) {
    f = jsxProd_default(Tabs, {
      title: "Help",
      color,
      defaultTab: "general",
      navFromContent,
      children: E,
    });
    $[23] = navFromContent;
    $[24] = E;
    $[25] = f;
  } else f = $[25];
  let children;
  if ($[26] === MEMO_CACHE_SENTINEL) {
    children = jsxProd_default_2(Text, {
      dimColor: false,
      children: [
        "For more help:",
        " ",
        jsxProd_default(Link, {
          url: "https://code.claude.com/docs/en/overview",
        }),
      ],
    });
    $[26] = children;
  } else children = $[26];
  let v;
  if ($[27] !== marginTop) {
    v = jsxProd_default(Box, {
      marginTop,
      flexShrink: 0,
      children,
    });
    $[27] = marginTop;
    $[28] = v;
  } else v = $[28];
  let P;
  if ($[29] !== u) {
    P =
      u &&
      jsxProd_default(Box, {
        marginTop: 1,
        flexShrink: 0,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Something else? Use /feedback to report bugs or request features.",
        }),
      });
    $[29] = u;
    $[30] = P;
  } else P = $[30];
  let children_2;
  if (
    $[31] !== dismissShortcut ||
    $[32] !== exitState.keyName ||
    $[33] !== exitState.pending ||
    $[34] !== x
  ) {
    children_2 = jsxProd_default(Text, {
      dimColor: true,
      children: exitState.pending
        ? jsxProd_default_2(Fragment, {
            children: ["Press ", exitState.keyName, " again to exit"],
          })
        : false
          ? jsxProd_default(Text, {
              italic: true,
              children: x
                ? jsxProd_default(KeyboardShortcutHint, {
                    chord: "escape",
                    action: "clear",
                    ...stableEmptyObject(false),
                  })
                : jsxProd_default(ConfigurableShortcutHint, {
                    action: "help:dismiss",
                    context: "Help",
                    fallback: "Esc",
                    description: "cancel",
                    ...stableEmptyObject(false),
                  }),
            })
          : jsxProd_default_2(Text, {
              italic: true,
              children: [dismissShortcut, " to cancel"],
            }),
    });
    $[31] = dismissShortcut;
    $[32] = exitState.keyName;
    $[33] = exitState.pending;
    $[34] = x;
    $[35] = children_2;
  } else children_2 = $[35];
  let L;
  if ($[36] !== marginTop || $[37] !== children_2) {
    L = jsxProd_default(Box, {
      marginTop,
      flexShrink: 0,
      children: children_2,
    });
    $[36] = marginTop;
    $[37] = children_2;
    $[38] = L;
  } else L = $[38];
  let Re;
  if ($[39] !== v || $[40] !== P || $[41] !== L || $[42] !== f) {
    Re = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default_2(Pane, {
        color,
        children: [f, v, P, L],
      }),
    });
    $[39] = v;
    $[40] = P;
    $[41] = L;
    $[42] = f;
    $[43] = Re;
  } else Re = $[43];
  return Re;
}
export { HelpV2 };
