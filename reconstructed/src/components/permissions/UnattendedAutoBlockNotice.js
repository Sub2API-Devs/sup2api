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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../design-system/Divider.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { qt, Se, j, y } from "../../../vendor/react/cjs/react.production.js";
import { Oy } from "../PromptInput/footerGates.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useSessionBanner } from "../PromptInput/useSwarmBanner.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ql, plural } from "../../utils/stringUtils.js";
import { Yn } from "../../utils/stripAnsi.js";
import { truncateToWidth } from "../../utils/format.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useInterval } from "../../ink/components/Input.js";
import { Gg } from "../../utils/permissions/autoModeRulesPrompt.js";

/**
 * 无人值守时自动模式拦截的提示条，显示被阻止的会话与 tmux 提示。
 */
//@ chunk-0e8j1zzj.js:16079-17038 placement
function UnattendedAutoBlockNotice(o) {
  let h = w(25),
    { hideSessionTitle: hideSessionTitle } = o,
    d = hideSessionTitle === void 0 ? !1 : hideSessionTitle,
    { columns: columns } = useTerminalSize(),
    m = useUnattendedNoticeLines(d);
  if (m === null) {
    return null;
  }
  if (m.drawsPromptCharacter) {
    let banner = m.banner;
    let i = columns - BANNER_PADDING;
    let k, f, g, M, N, x, A;
    if (h[0] !== banner || h[1] !== i || h[2] !== columns) {
      let T = promptModeBadgeText({ mode: "prompt", agent: banner, maxWidth: i });
      f = Box;
      N = "row";
      x = "100%";
      if (h[10] !== banner || h[11] !== i)
        ((A = e(PromptModeBadge, { mode: "prompt", agent: banner, maxWidth: i })),
          (h[10] = banner),
          (h[11] = i),
          (h[12] = A));
      else A = h[12];
      k = Divider;
      g = columns;
      M = bunStringWidth(T);
      ((h[0] = banner),
        (h[1] = i),
        (h[2] = columns),
        (h[3] = k),
        (h[4] = f),
        (h[5] = g),
        (h[6] = M),
        (h[7] = N),
        (h[8] = x),
        (h[9] = A));
    } else ((k = h[3]), (f = h[4]), (g = h[5]), (M = h[6]), (N = h[7]), (x = h[8]), (A = h[9]));
    const v = g - M;
    let I;
    if (h[13] !== k || h[14] !== v) ((I = e(k, { width: v })), (h[13] = k), (h[14] = v), (h[15] = I));
    else I = h[15];
    let L;
    if (h[16] !== f || h[17] !== N || h[18] !== x || h[19] !== A || h[20] !== I)
      ((L = r(f, { flexDirection: N, width: x, children: [A, I] })),
        (h[16] = f),
        (h[17] = N),
        (h[18] = x),
        (h[19] = A),
        (h[20] = I),
        (h[21] = L));
    else L = h[21];
    return L;
  }
  let g;
  if (h[22] !== m.banner || h[23] !== columns)
    ((g = e(PromptBorderBanner, { banner: m.banner, columns: columns, fastModeTag: void 0 })),
      (h[22] = m.banner),
      (h[23] = columns),
      (h[24] = g));
  else g = h[24];
  return g;
}
//@ chunk-0e8j1zzj.js:17038-17078 placement
function unattendedNoticeRows(o) {
  return useUnattendedNoticeLines(o) === null ? 0 : 1;
}
//@ chunk-0e8j1zzj.js:17078-17092 placement
var UnattendedNoticeContext = qt(0);
//@ chunk-0e8j1zzj.js:17092-17122 placement
function useUnattendedNotice() {
  return Se(UnattendedNoticeContext);
}
//@ chunk-0e8j1zzj.js:17122-17761 placement
function useUnattendedNoticeLines(o) {
  let i = w(16),
    t = Oy(),
    d = useIsScreenReaderEnabled(),
    { columns: columns } = useTerminalSize(),
    { agent: agent, tmuxHint: tmuxHint } = useTeammateBanner(),
    h;
  if (i[0] !== o) ((h = { hideSessionTitle: o }), (i[0] = o), (i[1] = h));
  else h = i[1];
  let k = useSessionBanner(h),
    f = t ? agent : (agent ?? tmuxHint ?? k);
  if (!f) {
    return null;
  }
  let g, M, N, x;
  if (i[2] !== f || i[3] !== columns || i[4] !== t || i[5] !== d) {
    x = EARLY_RETURN_SENTINEL;
    T: {
      let A = ql(Yn(f.text));
      if (!A) {
        x = null;
        break T;
      }
      N = t;
      g = f;
      M = d ? truncateToWidth(A, Math.max(1, columns - 2)) : A;
    }
    ((i[2] = f), (i[3] = columns), (i[4] = t), (i[5] = d), (i[6] = g), (i[7] = M), (i[8] = N), (i[9] = x));
  } else ((g = i[6]), (M = i[7]), (N = i[8]), (x = i[9]));
  if (x !== EARLY_RETURN_SENTINEL) return x;
  let v;
  if (i[10] !== g || i[11] !== M) ((v = { ...g, text: M }), (i[10] = g), (i[11] = M), (i[12] = v));
  else v = i[12];
  let I;
  if (i[13] !== N || i[14] !== v)
    ((I = { drawsPromptCharacter: N, banner: v }), (i[13] = N), (i[14] = v), (i[15] = I));
  else I = i[15];
  return I;
}
//@ chunk-0e8j1zzj.js:17761-17765 placement
j();
//@ chunk-0e8j1zzj.js:17765-17769 placement
j();
//@ chunk-0e8j1zzj.js:17769-17773 placement
j();
//@ chunk-0e8j1zzj.js:17773-17799 placement
function Ls(z) {
  return z + 1;
}
//@ chunk-0e8j1zzj.js:17799-19288 placement
function DenialLimitFallbackNotice(o) {
  let u = w(18),
    { permissionResult: permissionResult } = o,
    d =
      permissionResult?.behavior === "ask"
        ? (permissionResult.denialLimitFallback?.deadlineEpochMs ??
          permissionResult.autoDenyWindow?.deadlineEpochMs)
        : void 0,
    c = useIsScreenReaderEnabled(),
    m = useClock(),
    i;
  if (u[0] !== m) ((i = m.now()), (u[0] = m), (u[1] = i));
  else i = u[1];
  let h;
  if (u[2] === MEMO_CACHE_SENTINEL) ((h = Date.now()), (u[2] = h));
  else h = u[2];
  let k;
  if (u[3] !== i) ((k = { clockAt: i, epochAt: h }), (u[3] = i), (u[4] = k));
  else k = u[4];
  let f = k,
    g;
  if (u[5] !== f.clockAt || u[6] !== f.epochAt || u[7] !== m)
    ((g = () => f.epochAt + (m.now() - f.clockAt)),
      (u[5] = f.clockAt),
      (u[6] = f.epochAt),
      (u[7] = m),
      (u[8] = g));
  else g = u[8];
  let M = g,
    [, N] = y(0),
    x;
  if (u[9] === MEMO_CACHE_SENTINEL) ((x = () => N(Ls)), (u[9] = x));
  else x = u[9];
  if ((useInterval(x, d !== void 0 && !c ? 1000 : null), d === void 0)) {
    return null;
  }
  if (c) {
    let max = Math.max(0, d - M());
    let T;
    if (u[10] !== max) {
      let rounded = Math.round(max / 60000);
      let max_2 = Math.max(1, Math.round(max / 1000));
      T =
        max >= 60000
          ? `about ${rounded} ${plural(rounded, "minute")}`
          : `about ${max_2} ${plural(max_2, "second")}`;
      ((u[10] = max), (u[11] = T));
    } else T = u[11];
    let L = T;
    const b = `${Gg} Claude Code will automatically block this request in ${L}, to avoid holding up an unattended session`;
    let E;
    if (u[12] !== b)
      ((E = e(Box, { marginBottom: 1, children: e(Text, { color: "warning", children: b }) })),
        (u[12] = b),
        (u[13] = E));
    else E = u[13];
    return E;
  }
  let max = Math.max(0, d - M()),
    floored = Math.floor(max / 60000),
    floored_2 = Math.floor((max % 60000) / 1000);
  const T = String(floored_2);
  let b;
  if (u[14] !== T) ((b = T.padStart(2, "0")), (u[14] = T), (u[15] = b));
  else b = u[15];
  let X = `${floored}:${b}`;
  const E = `${Gg} Claude Code will automatically block this request in ${X}, to avoid holding up an unattended session`;
  let Y;
  if (u[16] !== E)
    ((Y = e(Box, { marginBottom: 1, children: e(Text, { color: "warning", children: E }) })),
      (u[16] = E),
      (u[17] = Y));
  else Y = u[17];
  return Y;
}

export {
  useUnattendedNotice,
  DenialLimitFallbackNotice,
  UnattendedAutoBlockNotice,
  unattendedNoticeRows,
  UnattendedNoticeContext,
};
