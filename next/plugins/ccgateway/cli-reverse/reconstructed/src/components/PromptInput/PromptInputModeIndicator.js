/**
 * components/PromptInput/PromptInputModeIndicator.tsx
 *
 * 输入框左侧提示符（❯ 或 bash 模式 !），查看队友时显示队友名与颜色。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputModeIndicator.tsx
 * pieces: chunk-4b7tnq3g.js (3)
 * attribution: file-local 1, fingerprint 2
 */
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { getTeammateColor } from "../../utils/teammate.js";
import { AGENT_COLOR_NAMES, AGENT_COLOR_TO_THEME_COLOR } from "../../tools/AgentTool/agentColorManager.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  Fragment,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useForceRender } from "../../hooks/useForceRender.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-4b7tnq3g.js:798-889 file-local
function getTeammateThemeColor() {
  if (!isAgentSwarmsEnabled()) return;
  let colorName = getTeammateColor();
  if (!colorName) return;
  if (AGENT_COLOR_NAMES.includes(colorName)) return AGENT_COLOR_TO_THEME_COLOR[colorName];
  return;
}
//@ chunk-4b7tnq3g.js:889-1204 fingerprint (2.1.88 match: PromptChar, 0.67)
function PromptChar(props) {
  let $ = useMemoCache(6);
  let { isLoading, isScreenReader, themeColor } = props;
  let color = themeColor ?? undefined;
  let children;
  if ($[0] !== isScreenReader) {
    children = isScreenReader
      ? jsxProd_default(Fragment, {
          children: "$\xA0",
        })
      : jsxProd_default_2(Fragment, {
          children: [figures_default.pointer, "\xA0"],
        });
    $[0] = isScreenReader;
    $[1] = children;
  } else children = $[1];
  let promptProps;
  if ($[2] !== color || $[3] !== isLoading || $[4] !== children) {
    promptProps = jsxProd_default(Text, {
      color,
      dimColor: isLoading,
      children,
    });
    $[2] = color;
    $[3] = isLoading;
    $[4] = children;
    $[5] = promptProps;
  } else promptProps = $[5];
  return promptProps;
}
//@ chunk-4b7tnq3g.js:1204-1891 fingerprint (2.1.88 match: PromptInputModeIndicator, 0.824)
/**
 * 输入提示符：prompt 模式 ❯（读屏器下为 $），bash 模式 ! 并用 bashBorder 色；查看队友时用队友颜色并显示名字。
 */
function PromptInputModeIndicator(props) {
  let $ = useMemoCache(10);
  let { mode, isLoading, viewingAgentName, viewingAgentColor } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  useForceRender();
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = getTeammateThemeColor();
    $[0] = t1;
  } else t1 = $[0];
  let teammateColor = t1;
  let viewedTeammateThemeColor = viewingAgentColor
    ? AGENT_COLOR_TO_THEME_COLOR[viewingAgentColor]
    : undefined;
  const modeValue = !isScreenReaderEnabled || (!viewingAgentName && mode === "bash");
  let children;
  if (
    $[1] !== isLoading ||
    $[2] !== isScreenReaderEnabled ||
    $[3] !== mode ||
    $[4] !== viewedTeammateThemeColor ||
    $[5] !== viewingAgentName
  ) {
    children = viewingAgentName
      ? jsxProd_default(PromptChar, {
          isLoading,
          isScreenReader: isScreenReaderEnabled,
          themeColor: viewedTeammateThemeColor,
        })
      : mode === "bash"
        ? jsxProd_default(Text, {
            color: "bashBorder",
            dimColor: isLoading,
            children: "!\xA0",
          })
        : jsxProd_default(PromptChar, {
            isLoading,
            isScreenReader: isScreenReaderEnabled,
            themeColor: isAgentSwarmsEnabled() ? teammateColor : undefined,
          });
    $[1] = isLoading;
    $[2] = isScreenReaderEnabled;
    $[3] = mode;
    $[4] = viewedTeammateThemeColor;
    $[5] = viewingAgentName;
    $[6] = children;
  } else children = $[6];
  let boxElement;
  if ($[7] !== modeValue || $[8] !== children) {
    boxElement = jsxProd_default(Box, {
      "aria-hidden": modeValue,
      alignItems: "flex-start",
      alignSelf: "flex-start",
      flexWrap: "nowrap",
      justifyContent: "flex-start",
      children,
    });
    $[7] = modeValue;
    $[8] = children;
    $[9] = boxElement;
  } else boxElement = $[9];
  return boxElement;
}
export { PromptInputModeIndicator };
