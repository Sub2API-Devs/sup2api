/**
 * components/PromptInput/PromptInputModeIndicator.tsx
 *
 * 输入框左侧提示符（❯ 或 bash 模式 !），查看队友时显示队友名与颜色。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputModeIndicator.tsx
 * pieces: chunk-h93cnm7e.js (3)
 * attribution: file-local 1, fingerprint 2
 */
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { getTeammateColor } from "../../utils/teammate.js";
import { AGENT_COLOR_NAMES, AGENT_COLOR_TO_THEME_COLOR } from "../../tools/AgentTool/agentColorManager.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, Fragment, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useForceRender } from "../../hooks/useForceRender.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-h93cnm7e.js:797-888 file-local
function getTeammateThemeColor() {
  if (!isAgentSwarmsEnabled()) return;
  let colorName = getTeammateColor();
  if (!colorName) return;
  if (AGENT_COLOR_NAMES.includes(colorName)) return AGENT_COLOR_TO_THEME_COLOR[colorName];
  return;
}
//@ chunk-h93cnm7e.js:888-1201 fingerprint = PromptChar (0.67)
function PromptChar(t0) {
  let $ = w(6),
    { isLoading: isLoading, isScreenReader: isScreenReader, themeColor: themeColor } = t0,
    color = themeColor ?? void 0,
    a;
  if ($[0] !== isScreenReader)
    ((a = isScreenReader
      ? e(Fragment, { children: "$\xA0" })
      : r(Fragment, { children: [re.pointer, "\xA0"] })),
      ($[0] = isScreenReader),
      ($[1] = a));
  else a = $[1];
  let l;
  if ($[2] !== color || $[3] !== isLoading || $[4] !== a)
    ((l = e(Text, { color: color, dimColor: isLoading, children: a })),
      ($[2] = color),
      ($[3] = isLoading),
      ($[4] = a),
      ($[5] = l));
  else l = $[5];
  return l;
}
/**
 * 输入提示符：prompt 模式 ❯（读屏器下为 $），bash 模式 ! 并用 bashBorder 色；查看队友时用队友颜色并显示名字。
 */
//@ chunk-h93cnm7e.js:1201-1888 fingerprint = PromptInputModeIndicator (0.824)
function PromptInputModeIndicator(t0) {
  let $ = w(10),
    {
      mode: mode,
      isLoading: isLoading,
      viewingAgentName: viewingAgentName,
      viewingAgentColor: viewingAgentColor,
    } = t0,
    i = useIsScreenReaderEnabled();
  useForceRender();
  let a;
  if ($[0] === MEMO_CACHE_SENTINEL) ((a = getTeammateThemeColor()), ($[0] = a));
  else a = $[0];
  let teammateColor = a,
    viewedTeammateThemeColor = viewingAgentColor ? AGENT_COLOR_TO_THEME_COLOR[viewingAgentColor] : void 0;
  const h = !i || (!viewingAgentName && mode === "bash");
  let d;
  if (
    $[1] !== isLoading ||
    $[2] !== i ||
    $[3] !== mode ||
    $[4] !== viewedTeammateThemeColor ||
    $[5] !== viewingAgentName
  )
    ((d = viewingAgentName
      ? e(PromptChar, { isLoading: isLoading, isScreenReader: i, themeColor: viewedTeammateThemeColor })
      : mode === "bash"
        ? e(Text, { color: "bashBorder", dimColor: isLoading, children: "!\xA0" })
        : e(PromptChar, {
            isLoading: isLoading,
            isScreenReader: i,
            themeColor: isAgentSwarmsEnabled() ? teammateColor : void 0,
          })),
      ($[1] = isLoading),
      ($[2] = i),
      ($[3] = mode),
      ($[4] = viewedTeammateThemeColor),
      ($[5] = viewingAgentName),
      ($[6] = d));
  else d = $[6];
  let A;
  if ($[7] !== h || $[8] !== d)
    ((A = e(Box, {
      "aria-hidden": h,
      alignItems: "flex-start",
      alignSelf: "flex-start",
      flexWrap: "nowrap",
      justifyContent: "flex-start",
      children: d,
    })),
      ($[7] = h),
      ($[8] = d),
      ($[9] = A));
  else A = $[9];
  return A;
}

export { PromptInputModeIndicator };
