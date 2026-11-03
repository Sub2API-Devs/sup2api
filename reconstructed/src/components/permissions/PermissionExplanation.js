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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useSettingsState } from "../../hooks/useSettings.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SpinnerGlyph } from "../Spinner/SpinnerGlyph.js";
import { GlimmerMessage } from "../Spinner/GlimmerMessage.js";
import { Box, Text } from "../../ink/components/Text.js";
import { REMOTE_TOOL_CALL_META, parseRemoteToolRequest } from "../../remote/tools/protocolSchemas.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";

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
  let $ = w(12);
  let settingsState = useSettingsState();
  let v;
  if ($[0] !== settingsState.prefersReducedMotion) {
    v = isReducedMotion(settingsState.prefersReducedMotion);
    $[0] = settingsState.prefersReducedMotion;
    $[1] = v;
  } else v = $[1];
  let o = v;
  let [i, C] = useAnimationFrame(o ? null : 50);
  let glimmerIndex = o ? -100 : 19 - (Math.floor(C / 200) % 29);
  let frame = Math.floor(C / 120);
  let t;
  if ($[2] !== frame || $[3] !== o || $[4] !== C) {
    t = jsxProd_default(SpinnerGlyph, {
      frame,
      messageColor: "inactive",
      reducedMotion: o,
      time: C,
    });
    $[2] = frame;
    $[3] = o;
    $[4] = C;
    $[5] = t;
  } else t = $[5];
  let u;
  if ($[6] !== glimmerIndex) {
    u = jsxProd_default(GlimmerMessage, {
      message: "Launching",
      mode: "responding",
      messageColor: "inactive",
      glimmerIndex,
      flashOpacity: 0,
      shimmerColor: "subtle",
    });
    $[6] = glimmerIndex;
    $[7] = u;
  } else u = $[7];
  let k;
  if ($[8] !== i || $[9] !== t || $[10] !== u) {
    k = jsxProd_default_2(Box, {
      ref: i,
      flexDirection: "row",
      columnGap: 1,
      children: [t, u],
    });
    $[8] = i;
    $[9] = t;
    $[10] = u;
    $[11] = k;
  } else k = $[11];
  return k;
}
//@ chunk-g54kbxqw.js:24571-24641 fingerprint = createExplanationPromise (0.742)
function createExplanationPromise(props) {
  let { [REMOTE_TOOL_CALL_META]: n, ...s } = props;
  return {
    request: parseRemoteToolRequest(n),
    toolInput: s,
  };
}
//@ chunk-s5p7fp0c.js:12107-12637 callgraph-fingerprint = usePermissionExplainerUI (0.189)
function usePermissionExplainerUI(props) {
  let $ = w(9);
  let { message, detail, onCancel } = props;
  let W;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    W = {
      context: "Confirmation",
    };
    $[0] = W;
  } else W = $[0];
  useKeybinding("confirm:no", onCancel, W);
  let F;
  if ($[1] !== message) {
    F = jsxProd_default_2(Text, {
      color: "error",
      children: ["Error: ", message],
    });
    $[1] = message;
    $[2] = F;
  } else F = $[2];
  let U;
  if ($[3] !== detail) {
    U =
      detail &&
      jsxProd_default(Text, {
        dimColor: true,
        children: detail,
      });
    $[3] = detail;
    $[4] = U;
  } else U = $[4];
  let t2;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(Text, {
      dimColor: true,
      children: "Press Esc to go back",
    });
    $[5] = t2;
  } else t2 = $[5];
  let t3;
  if ($[6] !== F || $[7] !== U) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [F, U, t2],
    });
    $[6] = F;
    $[7] = U;
    $[8] = t3;
  } else t3 = $[8];
  return t3;
}
export {
  ShimmerLoadingText,
  getRiskColor,
  EXPLANATION_NOTICE_TIMEOUT_MS,
  MAX_EXPLANATION_CHARS,
  createExplanationPromise,
  usePermissionExplainerUI,
};
