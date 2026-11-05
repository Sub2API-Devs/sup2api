/**
 * components/permissions/PermissionExplanation.tsx
 *
 * 权限请求的风险解释（ctrl+e 解释器）：异步生成说明、风险颜色、加载微光；混入 issue 关闭提示等无关代码。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionExplanation.tsx
 * pieces: chunk-1nx5c9rq.js (1), chunk-mx6cbnn0.js (1), chunk-xgksxb70.js (2)
 * attribution: fingerprint 2, callgraph-fingerprint 1, sole-consumer 1
 */
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { truncateToWidth } from "../../utils/format.js";
import { displayableScriptDescription } from "../../utils/codeMode/displayableScriptDescription.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useSettingsState } from "../../hooks/useSettings.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { SpinnerGlyph } from "../Spinner/SpinnerGlyph.js";
import { GlimmerMessage } from "../Spinner/GlimmerMessage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xgksxb70.js:700-728 sole-consumer
var SCRIPT_DESCRIPTION_TOOLS; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
var MAX_DESCRIPTION_WIDTH;
deferInit("chunk-xgksxb70.js:700", () => {
  SCRIPT_DESCRIPTION_TOOLS = [BASH_TOOL_NAME, POWERSHELL_TOOL_NAME, AGENT, TASK, MONITOR];
  MAX_DESCRIPTION_WIDTH = 80;
});
//@ chunk-xgksxb70.js:728-880 fingerprint (2.1.88 match: createExplanationPromise, 1)
function createExplanationPromise(props) {
  if (!SCRIPT_DESCRIPTION_TOOLS.includes(props.toolName)) return {};
  let description = isPlainObject(props.toolInput) ? props.toolInput.description : undefined;
  let truncatedDescription = truncateToWidth(
    displayableScriptDescription(description, MAX_DESCRIPTION_WIDTH),
    MAX_DESCRIPTION_WIDTH,
  );
  return truncatedDescription === ""
    ? {}
    : {
        description: truncatedDescription,
      };
}
//@ chunk-mx6cbnn0.js:12188-12718 callgraph-fingerprint (2.1.88 match: usePermissionExplainerUI, 0.189)
function usePermissionExplainerUI(props) {
  let $ = useMemoCache(9);
  let { message, detail, onCancel } = props;
  let keybindingOptions;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keybindingOptions = {
      context: "Confirmation",
    };
    $[0] = keybindingOptions;
  } else keybindingOptions = $[0];
  useKeybinding("confirm:no", onCancel, keybindingOptions);
  let textElement;
  if ($[1] !== message) {
    textElement = jsxProd_default_2(Text, {
      color: "error",
      children: ["Error: ", message],
    });
    $[1] = message;
    $[2] = textElement;
  } else textElement = $[2];
  let detailElement;
  if ($[3] !== detail) {
    detailElement =
      detail &&
      jsxProd_default(Text, {
        dimColor: true,
        children: detail,
      });
    $[3] = detail;
    $[4] = detailElement;
  } else detailElement = $[4];
  let t2;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Text, {
      dimColor: true,
      children: "Press Esc to go back",
    });
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== textElement || $[7] !== detailElement) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [textElement, detailElement, t2],
    });
    $[6] = textElement;
    $[7] = detailElement;
    $[8] = t3;
  } else t3 = $[8];
  return t3;
}
//@ chunk-1nx5c9rq.js:20388-21075 fingerprint (2.1.88 match: ShimmerLoadingText, 0.545)
function ShimmerLoadingText() {
  let $ = useMemoCache(12);
  let settingsState = useSettingsState();
  let reducedMotion;
  if ($[0] !== settingsState.prefersReducedMotion) {
    reducedMotion = isReducedMotion(settingsState.prefersReducedMotion);
    $[0] = settingsState.prefersReducedMotion;
    $[1] = reducedMotion;
  } else reducedMotion = $[1];
  let animationEnabled = reducedMotion;
  let [frame, time] = useAnimationFrame(animationEnabled ? null : 50);
  let glimmerIndex = animationEnabled ? -100 : 19 - (Math.floor(time / 200) % 29);
  let frame_2 = Math.floor(time / 120);
  let spinnerGlyphElement;
  if ($[2] !== frame_2 || $[3] !== animationEnabled || $[4] !== time) {
    spinnerGlyphElement = jsxProd_default(SpinnerGlyph, {
      frame: frame_2,
      messageColor: "inactive",
      reducedMotion: animationEnabled,
      time,
    });
    $[2] = frame_2;
    $[3] = animationEnabled;
    $[4] = time;
    $[5] = spinnerGlyphElement;
  } else spinnerGlyphElement = $[5];
  let glimmerMessageElement;
  if ($[6] !== glimmerIndex) {
    glimmerMessageElement = jsxProd_default(GlimmerMessage, {
      message: "Launching",
      mode: "responding",
      messageColor: "inactive",
      glimmerIndex,
      flashOpacity: 0,
      shimmerColor: "subtle",
    });
    $[6] = glimmerIndex;
    $[7] = glimmerMessageElement;
  } else glimmerMessageElement = $[7];
  let boxElement;
  if ($[8] !== frame || $[9] !== spinnerGlyphElement || $[10] !== glimmerMessageElement) {
    boxElement = jsxProd_default_2(Box, {
      ref: frame,
      flexDirection: "row",
      columnGap: 1,
      children: [spinnerGlyphElement, glimmerMessageElement],
    });
    $[8] = frame;
    $[9] = spinnerGlyphElement;
    $[10] = glimmerMessageElement;
    $[11] = boxElement;
  } else boxElement = $[11];
  return boxElement;
}
export { ShimmerLoadingText, usePermissionExplainerUI, createExplanationPromise };
