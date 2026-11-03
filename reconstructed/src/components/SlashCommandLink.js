/**
 * components/SlashCommandLink.tsx
 *
 * 2.1.316 新增：斜杠命令链接与提示行组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-07xmkrj2.js (8)
 * attribution: placement 8
 */
import { init_react_production, y, qt, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
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
import { SPINNER_DOTS, PROPORTION } from "../utils/permissions/autoModeRulesPrompt.js";
import { useTranscriptMode } from "./messages/transcriptModeContext.js";
import { useQueuedMessageContext } from "../context/QueuedMessageContext.js";
import { currentToolPermissionContext } from "../utils/permissions/currentPermissionContext.js";

//@ chunk-07xmkrj2.js:708-712 placement
init_react_production();
//@ chunk-07xmkrj2.js:712-1509 placement
function SlashCommandLink(props) {
  let C = w(17);
  let { command, args, color } = props;
  let t = args === undefined ? command : `${command} ${args}`;
  let i;
  if (C[0] === MEMO_CACHE_SENTINEL) {
    i = getProcessedQueuedCommands();
    C[0] = i;
  } else i = C[0];
  let U = i;
  let [x, h] = y(false);
  let strayClickGuard = useStrayClickGuard();
  if (!U) {
    let d;
    if (C[1] !== color || C[2] !== t) {
      d = jsxProd_default_2(Text, {
        underline: true,
        color,
        children: ["/", t],
      });
      C[1] = color;
      C[2] = t;
      C[3] = d;
    } else d = C[3];
    return d;
  }
  let onClick;
  if (C[4] !== command || C[5] !== t || C[6] !== strayClickGuard) {
    onClick = (v) => {
      if (strayClickGuard(v)) {
        return;
      }
      logEvent("tengu_slash_link_clicked", {
        command: fromEnum(command),
      });
      U(t, {
        kind: "human",
      });
    };
    C[4] = command;
    C[5] = t;
    C[6] = strayClickGuard;
    C[7] = onClick;
  } else onClick = C[7];
  let onMouseEnter;
  let onMouseLeave;
  if (C[8] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => h(true);
    onMouseLeave = () => h(false);
    C[8] = onMouseEnter;
    C[9] = onMouseLeave;
  } else {
    onMouseEnter = C[8];
    onMouseLeave = C[9];
  }
  let children;
  if (C[10] !== color || C[11] !== x || C[12] !== t) {
    children = jsxProd_default_2(Text, {
      underline: true,
      bold: x,
      color,
      children: ["/", t],
    });
    C[10] = color;
    C[11] = x;
    C[12] = t;
    C[13] = children;
  } else children = C[13];
  let T;
  if (C[14] !== onClick || C[15] !== children) {
    T = jsxProd_default(Box, {
      onClick,
      onMouseEnter,
      onMouseLeave,
      children,
    });
    C[14] = onClick;
    C[15] = children;
    C[16] = T;
  } else T = C[16];
  return T;
}
//@ chunk-07xmkrj2.js:1509-1513 placement
init_react_production();
//@ chunk-07xmkrj2.js:1513-1517 placement
init_react_production();
//@ chunk-07xmkrj2.js:1517-1543 placement
/**
 * 导出值：slashCommandLinkSignal（命令链接标记）。
 */
var SlashLinkContexts = qt(false);
var slashCommandLinkSignal = qt(false);
//@ chunk-07xmkrj2.js:1543-2829 placement
function NoticeLine(props) {
  let u = w(26);
  let { tone, text, detail, subLines, linkify } = props;
  let i = linkify ? LinkifiedText : Text;
  let x = Se(slashCommandLinkSignal)
    ? " "
    : props.state === "live" && !props.reducedMotion
      ? SPINNER_DOTS[props.frame % SPINNER_DOTS.length]
      : PROPORTION;
  let color = tone === "gold" ? "warning" : tone === "red" ? "error" : undefined;
  let b = tone === "red";
  const d = tone === "dim";
  const v = tone === "red" ? "error:" : tone === "gold" ? "warning:" : undefined;
  const dimColor = tone === "dim";
  let f;
  if (u[0] !== x || u[1] !== color || u[2] !== d || u[3] !== v || u[4] !== dimColor) {
    f = jsxProd_default_2(Text, {
      "aria-hidden": d,
      "aria-label": v,
      italic: true,
      color,
      dimColor,
      children: [x, " "],
    });
    u[0] = x;
    u[1] = color;
    u[2] = d;
    u[3] = v;
    u[4] = dimColor;
    u[5] = f;
  } else f = u[5];
  const color_2 = b ? "error" : undefined;
  const dimColor_2 = !b;
  let L;
  if (u[6] !== i || u[7] !== text) {
    L = jsxProd_default(i, {
      children: text,
    });
    u[6] = i;
    u[7] = text;
    u[8] = L;
  } else L = u[8];
  let R;
  if (u[9] !== i || u[10] !== detail) {
    R =
      detail !== undefined &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          " \xB7 ",
          jsxProd_default(i, {
            children: detail,
          }),
        ],
      });
    u[9] = i;
    u[10] = detail;
    u[11] = R;
  } else R = u[11];
  let H;
  if (u[12] !== color_2 || u[13] !== dimColor_2 || u[14] !== L || u[15] !== R) {
    H = jsxProd_default_2(Text, {
      italic: true,
      color: color_2,
      dimColor: dimColor_2,
      children: [L, R],
    });
    u[12] = color_2;
    u[13] = dimColor_2;
    u[14] = L;
    u[15] = R;
    u[16] = H;
  } else H = u[16];
  let M;
  if (u[17] !== i || u[18] !== subLines) {
    M = subLines?.map((children, re) =>
      jsxProd_default(
        Text,
        {
          dimColor: true,
          children: jsxProd_default(i, {
            children,
          }),
        },
        re,
      ),
    );
    u[17] = i;
    u[18] = subLines;
    u[19] = M;
  } else M = u[19];
  let P;
  if (u[20] !== H || u[21] !== M) {
    P = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children: [H, M],
    });
    u[20] = H;
    u[21] = M;
    u[22] = P;
  } else P = u[22];
  let z;
  if (u[23] !== P || u[24] !== f) {
    z = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [f, P],
    });
    u[23] = P;
    u[24] = f;
    u[25] = z;
  } else z = u[25];
  return z;
}
//@ chunk-07xmkrj2.js:2829-2902 placement
function shouldShowNotice(verbose) {
  let transcriptMode = useTranscriptMode();
  let l = useQueuedMessageContext()?.isQueued === true;
  return !verbose && !transcriptMode && !l && currentToolPermissionContext();
}
//@ chunk-07xmkrj2.js:2902-2984 placement
function noticeSystemLines(verbose) {
  let o = shouldShowNotice(verbose);
  let queuedMessageContext = useQueuedMessageContext();
  return queuedMessageContext?.isQueued === true ? queuedMessageContext.noticeSystemLines : o;
}
export {
  shouldShowNotice,
  NoticeLine,
  slashCommandLinkSignal,
  SlashCommandLink,
  SlashLinkContexts,
  noticeSystemLines,
};
