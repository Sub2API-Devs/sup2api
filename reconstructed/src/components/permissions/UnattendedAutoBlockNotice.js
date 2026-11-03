/**
 * components/permissions/UnattendedAutoBlockNotice.tsx
 *
 * 2.1.316 新增：无人值守时自动模式拦截与拒绝上限回退提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0e8j1zzj.js (10)
 * attribution: placement 10
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  BANNER_PADDING,
  promptModeBadgeText,
  PromptModeBadge,
  PromptBorderBanner,
  useTeammateBanner,
} from "../PromptInput/promptBorderColor.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../design-system/Divider.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { qt, Se, init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { showSwarmFooterGate } from "../PromptInput/footerGates.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useSessionBanner } from "../PromptInput/useSwarmBanner.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { cleanForDisplay, plural } from "../../utils/stringUtils.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { truncateToWidth } from "../../utils/format.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useInterval } from "../../ink/components/Input.js";
import { WARNING_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";

//@ chunk-0e8j1zzj.js:16079-17038 placement
/**
 * 无人值守时自动模式拦截的提示条，显示被阻止的会话与 tmux 提示。
 */
function UnattendedAutoBlockNotice(props) {
  let h = w(25);
  let { hideSessionTitle } = props;
  let hideSessionTitle_2 = hideSessionTitle === undefined ? false : hideSessionTitle;
  let { columns } = useTerminalSize();
  let unattendedNoticeLines = useUnattendedNoticeLines(hideSessionTitle_2);
  if (unattendedNoticeLines === null) {
    return null;
  }
  if (unattendedNoticeLines.drawsPromptCharacter) {
    let agent = unattendedNoticeLines.banner;
    let maxWidth = columns - BANNER_PADDING;
    let k;
    let f;
    let g;
    let M;
    let flexDirection;
    let width;
    let A;
    if (h[0] !== agent || h[1] !== maxWidth || h[2] !== columns) {
      let T = promptModeBadgeText({
        mode: "prompt",
        agent,
        maxWidth,
      });
      f = Box;
      flexDirection = "row";
      width = "100%";
      if (h[10] !== agent || h[11] !== maxWidth) {
        A = jsxProd_default(PromptModeBadge, {
          mode: "prompt",
          agent,
          maxWidth,
        });
        h[10] = agent;
        h[11] = maxWidth;
        h[12] = A;
      } else A = h[12];
      k = Divider;
      g = columns;
      M = bunStringWidth(T);
      h[0] = agent;
      h[1] = maxWidth;
      h[2] = columns;
      h[3] = k;
      h[4] = f;
      h[5] = g;
      h[6] = M;
      h[7] = flexDirection;
      h[8] = width;
      h[9] = A;
    } else {
      k = h[3];
      f = h[4];
      g = h[5];
      M = h[6];
      flexDirection = h[7];
      width = h[8];
      A = h[9];
    }
    const width_2 = g - M;
    let I;
    if (h[13] !== k || h[14] !== width_2) {
      I = jsxProd_default(k, {
        width: width_2,
      });
      h[13] = k;
      h[14] = width_2;
      h[15] = I;
    } else I = h[15];
    let L;
    if (h[16] !== f || h[17] !== flexDirection || h[18] !== width || h[19] !== A || h[20] !== I) {
      L = jsxProd_default_2(f, {
        flexDirection,
        width,
        children: [A, I],
      });
      h[16] = f;
      h[17] = flexDirection;
      h[18] = width;
      h[19] = A;
      h[20] = I;
      h[21] = L;
    } else L = h[21];
    return L;
  }
  let g;
  if (h[22] !== unattendedNoticeLines.banner || h[23] !== columns) {
    g = jsxProd_default(PromptBorderBanner, {
      banner: unattendedNoticeLines.banner,
      columns,
      fastModeTag: undefined,
    });
    h[22] = unattendedNoticeLines.banner;
    h[23] = columns;
    h[24] = g;
  } else g = h[24];
  return g;
}
//@ chunk-0e8j1zzj.js:17038-17078 placement
function unattendedNoticeRows(hideSessionTitle) {
  return useUnattendedNoticeLines(hideSessionTitle) === null ? 0 : 1;
}
//@ chunk-0e8j1zzj.js:17078-17092 placement
var UnattendedNoticeContext = qt(0);
//@ chunk-0e8j1zzj.js:17092-17122 placement
function useUnattendedNotice() {
  return Se(UnattendedNoticeContext);
}
//@ chunk-0e8j1zzj.js:17122-17761 placement
function useUnattendedNoticeLines(hideSessionTitle) {
  let i = w(16);
  let t = showSwarmFooterGate();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { columns } = useTerminalSize();
  let { agent, tmuxHint } = useTeammateBanner();
  let h;
  if (i[0] !== hideSessionTitle) {
    h = {
      hideSessionTitle,
    };
    i[0] = hideSessionTitle;
    i[1] = h;
  } else h = i[1];
  let sessionBanner = useSessionBanner(h);
  let f = t ? agent : (agent ?? tmuxHint ?? sessionBanner);
  if (!f) {
    return null;
  }
  let g;
  let text;
  let drawsPromptCharacter;
  let x;
  if (i[2] !== f || i[3] !== columns || i[4] !== t || i[5] !== isScreenReaderEnabled) {
    x = EARLY_RETURN_SENTINEL;
    T: {
      let A = cleanForDisplay(stripAnsi(f.text));
      if (!A) {
        x = null;
        break T;
      }
      drawsPromptCharacter = t;
      g = f;
      text = isScreenReaderEnabled ? truncateToWidth(A, Math.max(1, columns - 2)) : A;
    }
    i[2] = f;
    i[3] = columns;
    i[4] = t;
    i[5] = isScreenReaderEnabled;
    i[6] = g;
    i[7] = text;
    i[8] = drawsPromptCharacter;
    i[9] = x;
  } else {
    g = i[6];
    text = i[7];
    drawsPromptCharacter = i[8];
    x = i[9];
  }
  if (x !== EARLY_RETURN_SENTINEL) return x;
  let banner;
  if (i[10] !== g || i[11] !== text) {
    banner = {
      ...g,
      text,
    };
    i[10] = g;
    i[11] = text;
    i[12] = banner;
  } else banner = i[12];
  let I;
  if (i[13] !== drawsPromptCharacter || i[14] !== banner) {
    I = {
      drawsPromptCharacter,
      banner,
    };
    i[13] = drawsPromptCharacter;
    i[14] = banner;
    i[15] = I;
  } else I = i[15];
  return I;
}
//@ chunk-0e8j1zzj.js:17761-17765 placement
init_react_production();
//@ chunk-0e8j1zzj.js:17765-17769 placement
init_react_production();
//@ chunk-0e8j1zzj.js:17769-17773 placement
init_react_production();
//@ chunk-0e8j1zzj.js:17773-17799 placement
function incrementByOne(z) {
  return z + 1;
}
//@ chunk-0e8j1zzj.js:17799-19288 placement
function DenialLimitFallbackNotice(props) {
  let u = w(18);
  let { permissionResult } = props;
  let d =
    permissionResult?.behavior === "ask"
      ? (permissionResult.denialLimitFallback?.deadlineEpochMs ??
        permissionResult.autoDenyWindow?.deadlineEpochMs)
      : undefined;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let clock = useClock();
  let clockAt;
  if (u[0] !== clock) {
    clockAt = clock.now();
    u[0] = clock;
    u[1] = clockAt;
  } else clockAt = u[1];
  let epochAt;
  if (u[2] === MEMO_CACHE_SENTINEL) {
    epochAt = Date.now();
    u[2] = epochAt;
  } else epochAt = u[2];
  let k;
  if (u[3] !== clockAt) {
    k = {
      clockAt,
      epochAt,
    };
    u[3] = clockAt;
    u[4] = k;
  } else k = u[4];
  let f = k;
  let g;
  if (u[5] !== f.clockAt || u[6] !== f.epochAt || u[7] !== clock) {
    g = () => f.epochAt + (clock.now() - f.clockAt);
    u[5] = f.clockAt;
    u[6] = f.epochAt;
    u[7] = clock;
    u[8] = g;
  } else g = u[8];
  let M = g;
  let [, N] = y(0);
  let x;
  if (u[9] === MEMO_CACHE_SENTINEL) {
    x = () => N(incrementByOne);
    u[9] = x;
  } else x = u[9];
  useInterval(x, d !== undefined && !isScreenReaderEnabled ? 1000 : null);
  if (d === undefined) {
    return null;
  }
  if (isScreenReaderEnabled) {
    let max = Math.max(0, d - M());
    let T;
    if (u[10] !== max) {
      let rounded = Math.round(max / 60000);
      let max_2 = Math.max(1, Math.round(max / 1000));
      T =
        max >= 60000
          ? `about ${rounded} ${plural(rounded, "minute")}`
          : `about ${max_2} ${plural(max_2, "second")}`;
      u[10] = max;
      u[11] = T;
    } else T = u[11];
    let L = T;
    const children = `${WARNING_GLYPH} Claude Code will automatically block this request in ${L}, to avoid holding up an unattended session`;
    let E;
    if (u[12] !== children) {
      E = jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          color: "warning",
          children,
        }),
      });
      u[12] = children;
      u[13] = E;
    } else E = u[13];
    return E;
  }
  let max = Math.max(0, d - M());
  let floored = Math.floor(max / 60000);
  let floored_2 = Math.floor((max % 60000) / 1000);
  const T = String(floored_2);
  let b;
  if (u[14] !== T) {
    b = T.padStart(2, "0");
    u[14] = T;
    u[15] = b;
  } else b = u[15];
  let X = `${floored}:${b}`;
  const children = `${WARNING_GLYPH} Claude Code will automatically block this request in ${X}, to avoid holding up an unattended session`;
  let Y;
  if (u[16] !== children) {
    Y = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        color: "warning",
        children,
      }),
    });
    u[16] = children;
    u[17] = Y;
  } else Y = u[17];
  return Y;
}
export {
  useUnattendedNotice,
  DenialLimitFallbackNotice,
  UnattendedAutoBlockNotice,
  unattendedNoticeRows,
  UnattendedNoticeContext,
};
