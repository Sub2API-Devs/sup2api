/**
 * components/SlashCommandLink.tsx
 *
 * 2.1.316 新增：斜杠命令链接与提示行组件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9f7pg4vv.js (9)
 * attribution: placement 8, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  createContext,
  useContext,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getProcessedQueuedCommands } from "../utils/messageQueueManager.js";
import { useStrayClickGuard } from "./CustomSelect/strayClickGuard.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { LinkifiedText } from "./LinkifiedText.js";
import { SPINNER_DOTS, PROPORTION } from "../constants/figures.js";
import { useTranscriptMode } from "./messages/transcriptModeContext.js";
import { useQueuedMessageContext } from "../context/QueuedMessageContext.js";
import { currentToolPermissionContext } from "../utils/permissions/currentPermissionContext.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-9f7pg4vv.js:708-712 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9f7pg4vv.js:708", () => {
  init_react_production();
});
//@ chunk-9f7pg4vv.js:712-1509 placement
function SlashCommandLink(props) {
  let $ = useMemoCache(17);
  let { command, args, color } = props;
  let commandText = args === undefined ? command : `${command} ${args}`;
  let processedCommands;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    processedCommands = getProcessedQueuedCommands();
    $[0] = processedCommands;
  } else processedCommands = $[0];
  let processedCommandsValue = processedCommands;
  let [hovered, setHovered] = useState(false);
  let strayClickGuard = useStrayClickGuard();
  if (!processedCommandsValue) {
    let textElement;
    if ($[1] !== color || $[2] !== commandText) {
      textElement = jsxProd_default_2(Text, {
        underline: true,
        color,
        children: ["/", commandText],
      });
      $[1] = color;
      $[2] = commandText;
      $[3] = textElement;
    } else textElement = $[3];
    return textElement;
  }
  let onClick;
  if ($[4] !== command || $[5] !== commandText || $[6] !== strayClickGuard) {
    onClick = (event) => {
      if (strayClickGuard(event)) {
        return;
      }
      logEvent("tengu_slash_link_clicked", {
        command: fromEnum(command),
      });
      processedCommandsValue(commandText, {
        kind: "human",
      });
    };
    $[4] = command;
    $[5] = commandText;
    $[6] = strayClickGuard;
    $[7] = onClick;
  } else onClick = $[7];
  let onMouseEnter;
  let onMouseLeave;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => setHovered(true);
    onMouseLeave = () => setHovered(false);
    $[8] = onMouseEnter;
    $[9] = onMouseLeave;
  } else {
    onMouseEnter = $[8];
    onMouseLeave = $[9];
  }
  let children;
  if ($[10] !== color || $[11] !== hovered || $[12] !== commandText) {
    children = jsxProd_default_2(Text, {
      underline: true,
      bold: hovered,
      color,
      children: ["/", commandText],
    });
    $[10] = color;
    $[11] = hovered;
    $[12] = commandText;
    $[13] = children;
  } else children = $[13];
  let boxElement;
  if ($[14] !== onClick || $[15] !== children) {
    boxElement = jsxProd_default(Box, {
      onClick,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    $[14] = onClick;
    $[15] = children;
    $[16] = boxElement;
  } else boxElement = $[16];
  return boxElement;
}
//@ chunk-9f7pg4vv.js:1509-1513 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9f7pg4vv.js:1509", () => {
  init_react_production();
});
//@ chunk-9f7pg4vv.js:1513-1517 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9f7pg4vv.js:1513", () => {
  init_react_production();
});
//@ chunk-9f7pg4vv.js:1517-1543 placement
/**
 * 导出值：slashCommandLinkSignal（命令链接标记）。
 */
var SlashLinkContexts; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var slashCommandLinkSignal;
deferInit("chunk-9f7pg4vv.js:1517", () => {
  SlashLinkContexts = createContext(false);
  slashCommandLinkSignal = createContext(false);
});
//@ chunk-9f7pg4vv.js:1543-1558 layout
var slashCommandLinkContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9f7pg4vv.js:1543", () => {
  slashCommandLinkContext = createContext(false);
});
//@ chunk-9f7pg4vv.js:1558-2844 placement
function NoticeLine(props) {
  let $ = useMemoCache(26);
  let { tone, text, detail, subLines, linkify } = props;
  let TextComponent = linkify ? LinkifiedText : Text;
  let markerSpace = useContext(slashCommandLinkSignal)
    ? " "
    : props.state === "live" && !props.reducedMotion
      ? SPINNER_DOTS[props.frame % SPINNER_DOTS.length]
      : PROPORTION;
  let color = tone === "gold" ? "warning" : tone === "red" ? "error" : undefined;
  let isRed = tone === "red";
  const isDim = tone === "dim";
  const markerLabel = tone === "red" ? "error:" : tone === "gold" ? "warning:" : undefined;
  const dimColor = tone === "dim";
  let markerElement;
  if ($[0] !== markerSpace || $[1] !== color || $[2] !== isDim || $[3] !== markerLabel || $[4] !== dimColor) {
    markerElement = jsxProd_default_2(Text, {
      "aria-hidden": isDim,
      "aria-label": markerLabel,
      italic: true,
      color,
      dimColor,
      children: [markerSpace, " "],
    });
    $[0] = markerSpace;
    $[1] = color;
    $[2] = isDim;
    $[3] = markerLabel;
    $[4] = dimColor;
    $[5] = markerElement;
  } else markerElement = $[5];
  const color_2 = isRed ? "error" : undefined;
  const dimColor_2 = !isRed;
  let textComponentElement;
  if ($[6] !== TextComponent || $[7] !== text) {
    textComponentElement = jsxProd_default(TextComponent, {
      children: text,
    });
    $[6] = TextComponent;
    $[7] = text;
    $[8] = textComponentElement;
  } else textComponentElement = $[8];
  let detailElement;
  if ($[9] !== TextComponent || $[10] !== detail) {
    detailElement =
      detail !== undefined &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          " \xB7 ",
          jsxProd_default(TextComponent, {
            children: detail,
          }),
        ],
      });
    $[9] = TextComponent;
    $[10] = detail;
    $[11] = detailElement;
  } else detailElement = $[11];
  let mainElement;
  if (
    $[12] !== color_2 ||
    $[13] !== dimColor_2 ||
    $[14] !== textComponentElement ||
    $[15] !== detailElement
  ) {
    mainElement = jsxProd_default_2(Text, {
      italic: true,
      color: color_2,
      dimColor: dimColor_2,
      children: [textComponentElement, detailElement],
    });
    $[12] = color_2;
    $[13] = dimColor_2;
    $[14] = textComponentElement;
    $[15] = detailElement;
    $[16] = mainElement;
  } else mainElement = $[16];
  let subLineElements;
  if ($[17] !== TextComponent || $[18] !== subLines) {
    subLineElements = subLines?.map((children, index) =>
      jsxProd_default(
        Text,
        {
          dimColor: true,
          children: jsxProd_default(TextComponent, {
            children,
          }),
        },
        index,
      ),
    );
    $[17] = TextComponent;
    $[18] = subLines;
    $[19] = subLineElements;
  } else subLineElements = $[19];
  let columnElement;
  if ($[20] !== mainElement || $[21] !== subLineElements) {
    columnElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children: [mainElement, subLineElements],
    });
    $[20] = mainElement;
    $[21] = subLineElements;
    $[22] = columnElement;
  } else columnElement = $[22];
  let rowElement;
  if ($[23] !== columnElement || $[24] !== markerElement) {
    rowElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [markerElement, columnElement],
    });
    $[23] = columnElement;
    $[24] = markerElement;
    $[25] = rowElement;
  } else rowElement = $[25];
  return rowElement;
}
//@ chunk-9f7pg4vv.js:2844-2917 placement
function shouldShowNotice(verbose) {
  let transcriptMode = useTranscriptMode();
  let isQueued = useQueuedMessageContext()?.isQueued === true;
  return !verbose && !transcriptMode && !isQueued && currentToolPermissionContext();
}
//@ chunk-9f7pg4vv.js:2917-2999 placement
function noticeSystemLines(verbose) {
  let showNotice = shouldShowNotice(verbose);
  let queuedMessageContext = useQueuedMessageContext();
  return queuedMessageContext?.isQueued === true ? queuedMessageContext.noticeSystemLines : showNotice;
}
export {
  shouldShowNotice,
  slashCommandLinkContext,
  NoticeLine,
  slashCommandLinkSignal,
  SlashLinkContexts,
  SlashCommandLink,
  noticeSystemLines,
};
