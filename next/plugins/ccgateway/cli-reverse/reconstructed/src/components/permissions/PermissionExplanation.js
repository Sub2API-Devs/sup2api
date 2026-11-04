/**
 * components/permissions/PermissionExplanation.tsx
 *
 * 权限请求的风险解释（ctrl+e 解释器）：异步生成说明、风险颜色、加载微光；混入 issue 关闭提示等无关代码。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionExplanation.tsx
 * pieces: chunk-0eepcc6r.js (1), chunk-18hwfzwa.js (2), chunk-g54kbxqw.js (1), chunk-s5p7fp0c.js (1)
 * attribution: fingerprint 3, affinity 1, callgraph-fingerprint 1
 */
import { REMOTE_TOOL_CALL_META, parseRemoteToolRequest } from "../../remote/tools/protocolSchemas.js";
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

//@ chunk-g54kbxqw.js:24571-24641 fingerprint = createExplanationPromise (0.742)
function createExplanationPromise(props) {
  let { [REMOTE_TOOL_CALL_META]: remoteMeta, ...rest } = props;
  return {
    request: parseRemoteToolRequest(remoteMeta),
    toolInput: rest,
  };
}
//@ chunk-s5p7fp0c.js:12107-12637 callgraph-fingerprint = usePermissionExplainerUI (0.189)
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
//@ chunk-18hwfzwa.js:781595-781672 affinity
var MAX_EXPLANATION_CHARS = 4000;
var EXPLANATION_NOTICE_TIMEOUT_MS = 1e4;
var ISSUE_URL_PREFIX = "https://github.com/anthropics/claude-code/issues/";
//@ chunk-18hwfzwa.js:781672-781742 fingerprint = getRiskColor (1)
function getRiskColor(riskLevel) {
  return {
    text: `#${riskLevel}`,
    color: "success",
    url: `${ISSUE_URL_PREFIX}${riskLevel}`,
  };
}
//@ chunk-0eepcc6r.js:19212-19899 fingerprint = ShimmerLoadingText (0.544)
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
export {
  ShimmerLoadingText,
  getRiskColor,
  EXPLANATION_NOTICE_TIMEOUT_MS,
  MAX_EXPLANATION_CHARS,
  createExplanationPromise,
  usePermissionExplainerUI,
};
