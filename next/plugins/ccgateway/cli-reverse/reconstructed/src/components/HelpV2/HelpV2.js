/**
 * components/HelpV2/HelpV2.tsx
 *
 * /help 对话框：General/Commands/自定义命令等标签页，help:dismiss 关闭。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/HelpV2/HelpV2.tsx
 * pieces: chunk-ahfwxte3.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useScrollViewportSize } from "../ScrollViewportContext.js";
import { isFeedbackAllowed } from "../../commands/feedback/feedbackPolicy.js";
import { showFooterHintGate } from "../PromptInput/footerGates.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-ahfwxte3.js:17523-17607 sole-consumer
function isShownCommand(command) {
  return command.type !== "prompt" || command.source === "builtin" || command.source === "bundled";
}
//@ chunk-ahfwxte3.js:17607-17623 affinity
var HELP_COLUMN_WIDTH = 44;
var HELP_LIST_ROWS = 21;
//@ chunk-ahfwxte3.js:17623-20399 fingerprint (2.1.88 match: HelpV2, 0.573)
/**
 * /help 对话框：标签页切换（General、Commands、自定义命令），help:dismiss 或 Esc 关闭并发系统消息 "Help dialog dismissed"。
 */
function HelpV2(props) {
  let $ = useMemoCache(44);
  let { onClose, commands } = props;
  let insideModal = useTerminalSize();
  let { rows } = useScrollViewportSize(insideModal);
  let maxHeight = rows;
  let showFeedback;
  if ($[0] !== insideModal.rows) {
    showFeedback = insideModal.rows >= HELP_COLUMN_WIDTH && isFeedbackAllowed();
    $[0] = insideModal.rows;
    $[1] = showFeedback;
  } else showFeedback = $[1];
  let showFeedback_2 = showFeedback;
  let marginTop = showFooterHintGate() && rows < HELP_LIST_ROWS ? 0 : 1;
  let dismiss;
  if ($[2] !== onClose) {
    dismiss = () =>
      onClose("Help dialog dismissed", {
        display: "system",
      });
    $[2] = onClose;
    $[3] = dismiss;
  } else dismiss = $[3];
  let dismiss_2 = dismiss;
  let [ownsEsc, setOwnsEsc] = useState(false);
  const isActive = !ownsEsc;
  let t2;
  if ($[4] !== isActive) {
    t2 = {
      context: "Help",
      isActive,
    };
    $[4] = isActive;
    $[5] = t2;
  } else t2 = $[5];
  useKeybinding("help:dismiss", dismiss_2, t2);
  let exitState = useGlobalExitKeybindings(dismiss_2);
  let dismissShortcut = useShortcutDisplay("help:dismiss", "Help", "esc");
  let color = false ? "permission" : "professionalBlue";
  let isShown = isShownCommand;
  let shownCommands;
  if ($[6] !== commands) {
    let visibleShown;
    if ($[8] === MEMO_CACHE_SENTINEL) {
      visibleShown = (cmd) => isShown(cmd) && !cmd.isHidden;
      $[8] = visibleShown;
    } else visibleShown = $[8];
    shownCommands = commands.filter(visibleShown);
    $[6] = commands;
    $[7] = shownCommands;
  } else shownCommands = $[7];
  let commands_2 = shownCommands;
  let otherCommands;
  if ($[9] !== commands) {
    let visibleOther;
    if ($[11] === MEMO_CACHE_SENTINEL) {
      visibleOther = (cmd) => !isShown(cmd) && !cmd.isHidden;
      $[11] = visibleOther;
    } else visibleOther = $[11];
    otherCommands = commands.filter(visibleOther);
    $[9] = commands;
    $[10] = otherCommands;
  } else otherCommands = $[10];
  let commands_3 = otherCommands;
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
  let tabs;
  if ($[13] !== commands_2 || $[14] !== commands_3 || $[15] !== maxHeight) {
    tabs = [t4];
    let commandsTab;
    if ($[17] !== commands_2 || $[18] !== maxHeight) {
      commandsTab = jsxProd_default(
        Tab,
        {
          id: "commands",
          title: "Commands",
          children: jsxProd_default(CommandsTab, {
            commands: commands_2,
            maxHeight,
            title: "Browse default commands",
            onOwnsEscChange: setOwnsEsc,
          }),
        },
        "commands",
      );
      $[17] = commands_2;
      $[18] = maxHeight;
      $[19] = commandsTab;
    } else commandsTab = $[19];
    tabs.push(commandsTab);
    let customTab;
    if ($[20] !== commands_3 || $[21] !== maxHeight) {
      customTab = jsxProd_default(
        Tab,
        {
          id: "custom",
          title: "Custom commands",
          children: jsxProd_default(CommandsTab, {
            commands: commands_3,
            maxHeight,
            title: "Browse custom commands",
            emptyMessage: "No custom commands found",
            onOwnsEscChange: setOwnsEsc,
          }),
        },
        "custom",
      );
      $[20] = commands_3;
      $[21] = maxHeight;
      $[22] = customTab;
    } else customTab = $[22];
    tabs.push(customTab);
    $[13] = commands_2;
    $[14] = commands_3;
    $[15] = maxHeight;
    $[16] = tabs;
  } else tabs = $[16];
  const navFromContent = !ownsEsc;
  let tabsBox;
  if ($[23] !== navFromContent || $[24] !== tabs) {
    tabsBox = jsxProd_default(Tabs, {
      title: "Help",
      color,
      defaultTab: "general",
      navFromContent,
      children: tabs,
    });
    $[23] = navFromContent;
    $[24] = tabs;
    $[25] = tabsBox;
  } else tabsBox = $[25];
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
  let helpBox;
  if ($[27] !== marginTop) {
    helpBox = jsxProd_default(Box, {
      marginTop,
      flexShrink: 0,
      children,
    });
    $[27] = marginTop;
    $[28] = helpBox;
  } else helpBox = $[28];
  let feedbackBox;
  if ($[29] !== showFeedback_2) {
    feedbackBox =
      showFeedback_2 &&
      jsxProd_default(Box, {
        marginTop: 1,
        flexShrink: 0,
        children: jsxProd_default(Text, {
          dimColor: true,
          children: "Something else? Use /feedback to report bugs or request features.",
        }),
      });
    $[29] = showFeedback_2;
    $[30] = feedbackBox;
  } else feedbackBox = $[30];
  let children_2;
  if (
    $[31] !== dismissShortcut ||
    $[32] !== exitState.keyName ||
    $[33] !== exitState.pending ||
    $[34] !== ownsEsc
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
              children: ownsEsc
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
    $[34] = ownsEsc;
    $[35] = children_2;
  } else children_2 = $[35];
  let cancelBox;
  if ($[36] !== marginTop || $[37] !== children_2) {
    cancelBox = jsxProd_default(Box, {
      marginTop,
      flexShrink: 0,
      children: children_2,
    });
    $[36] = marginTop;
    $[37] = children_2;
    $[38] = cancelBox;
  } else cancelBox = $[38];
  let pane;
  if ($[39] !== helpBox || $[40] !== feedbackBox || $[41] !== cancelBox || $[42] !== tabsBox) {
    pane = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default_2(Pane, {
        color,
        children: [tabsBox, helpBox, feedbackBox, cancelBox],
      }),
    });
    $[39] = helpBox;
    $[40] = feedbackBox;
    $[41] = cancelBox;
    $[42] = tabsBox;
    $[43] = pane;
  } else pane = $[43];
  return pane;
}
export { HelpV2 };
