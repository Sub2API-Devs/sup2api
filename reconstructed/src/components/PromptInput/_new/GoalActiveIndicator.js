/**
 * components/PromptInput/_new/GoalActiveIndicator.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: sole-consumer-new 3
 */
import { useAppState } from "../../../state/AppState.js";
import { y, R, P, Q, j } from "../../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../../ink/components/ClockContext.js";
import { useResolvedTheme } from "../../design-system/ThemeProvider.js";
import { sequential } from "../../../utils/sequential.js";
import { interpolateColor, roundToStep, toRGBColor, parseRGB } from "../../Spinner/utils.js";
import { isXtermJs } from "../../../ink/terminal.js";
import { useAnimationTimer } from "../../../ink/components/Input.js";
import { R5e, $J, m9t, p9t } from "../../LogoV2/AnimatedAsterisk.js";
import { formatDuration } from "../../../utils/format.js";
import { r, e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { BULLSEYE } from "../../../utils/permissions/autoModeRulesPrompt.js";

/**
 * 页脚"/goal active"指示：显示目标设定以来的耗时（1 分钟内每秒刷新，之后每分钟），真彩终端下按权限色做呼吸动画。
 */
//@ chunk-18hwfzwa.js:785728-786605 sole-consumer-new
function GoalActiveIndicator({ withSeparator: withSeparator }) {
  let goalSetAt = useAppState((At) => At.activeGoal?.setAt),
    hasGoal = goalSetAt !== void 0,
    [L, ee] = y(0),
    clock = useClock(),
    startRef = R(null);
  if (goalSetAt !== void 0 && startRef.current?.setAt !== goalSetAt)
    startRef.current = { setAt: goalSetAt, clockStart: clock.now() - (Date.now() - goalSetAt) };
  let Be = startRef.current;
  P(() => {
    if (goalSetAt === void 0 || startRef.current === null) return;
    let At = clock.now() - startRef.current.clockStart,
      It = At < 60000 ? 1000 : 60000,
      Ot = It - (At % It);
    return clock.setTimeout(() => ee((Et) => Et + 1), Ot);
  }, [goalSetAt, L, clock]);
  let theme = useResolvedTheme(),
    pulseColors = Q(() => {
      if (sequential.level < 3) return null;
      let At = interpolateColor(theme.permission);
      return At ? goalPulseColors(At, isXtermJs()) : null;
    }, [theme.permission, sequential.level]),
    ze = useAnimationTimer(hasGoal && pulseColors ? R5e : null),
    Xe = Math.floor(ze / R5e) % $J;
  if (!hasGoal || Be === null) return null;
  let elapsedMs = clock.now() - Be.clockStart,
    elapsedText = elapsedMs < 1000 ? "" : ` (${formatDuration(elapsedMs, { mostSignificantOnly: !0 })})`;
  return r(Box, {
    flexShrink: 0,
    children: [
      withSeparator ? e(Text, { dimColor: !0, children: " \xB7 " }) : null,
      r(Text, {
        color: pulseColors?.[Xe] ?? "permission",
        children: [r(Text, { "aria-hidden": !0, children: [BULLSEYE, " "] }), "/goal active", elapsedText],
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:786605-786748 sole-consumer-new
function goalPulseColors(h, x) {
  return Array.from({ length: $J }, (D, L) => {
    let ee = 0.5 - 0.5 * Math.cos((2 * Math.PI * L) / $J),
      ke = m9t * (x ? roundToStep(ee) : ee);
    return toRGBColor(parseRGB(h, p9t, ke));
  });
}
//@ chunk-18hwfzwa.js:786748-786752 sole-consumer-new
j();

export { GoalActiveIndicator };
