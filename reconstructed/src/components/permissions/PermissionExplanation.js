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
import { qd } from "../../hooks/useSettings.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SpinnerGlyph } from "../Spinner/SpinnerGlyph.js";
import { GlimmerMessage } from "../Spinner/GlimmerMessage.js";
import { Box, Text } from "../../ink/components/Text.js";
import { REMOTE_TOOL_CALL_META, parseRemoteToolRequest } from "../../remote/tools/protocolSchemas.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";

//@ chunk-18hwfzwa.js:781595-781672 affinity
var a5e = 4000,
  l5e = 1e4,
  U8t = "https://github.com/anthropics/claude-code/issues/";
//@ chunk-18hwfzwa.js:781672-781742 fingerprint = getRiskColor (1)
function getRiskColor(riskLevel) {
  return { text: `#${riskLevel}`, color: "success", url: `${U8t}${riskLevel}` };
}
//@ chunk-0eepcc6r.js:19212-19899 fingerprint = ShimmerLoadingText (0.544)
function ShimmerLoadingText() {
  let $ = w(12),
    P = qd(),
    v;
  if ($[0] !== P.prefersReducedMotion)
    ((v = isReducedMotion(P.prefersReducedMotion)), ($[0] = P.prefersReducedMotion), ($[1] = v));
  else v = $[1];
  let o = v,
    [i, C] = useAnimationFrame(o ? null : 50),
    h = o ? -100 : 19 - (Math.floor(C / 200) % 29),
    floored = Math.floor(C / 120),
    t;
  if ($[2] !== floored || $[3] !== o || $[4] !== C)
    ((t = e(SpinnerGlyph, { frame: floored, messageColor: "inactive", reducedMotion: o, time: C })),
      ($[2] = floored),
      ($[3] = o),
      ($[4] = C),
      ($[5] = t));
  else t = $[5];
  let u;
  if ($[6] !== h)
    ((u = e(GlimmerMessage, {
      message: "Launching",
      mode: "responding",
      messageColor: "inactive",
      glimmerIndex: h,
      flashOpacity: 0,
      shimmerColor: "subtle",
    })),
      ($[6] = h),
      ($[7] = u));
  else u = $[7];
  let k;
  if ($[8] !== i || $[9] !== t || $[10] !== u)
    ((k = r(Box, { ref: i, flexDirection: "row", columnGap: 1, children: [t, u] })),
      ($[8] = i),
      ($[9] = t),
      ($[10] = u),
      ($[11] = k));
  else k = $[11];
  return k;
}
//@ chunk-g54kbxqw.js:24571-24641 fingerprint = createExplanationPromise (0.742)
function createExplanationPromise(props) {
  let { [REMOTE_TOOL_CALL_META]: n, ...s } = props;
  return { request: parseRemoteToolRequest(n), toolInput: s };
}
//@ chunk-s5p7fp0c.js:12107-12637 callgraph-fingerprint = usePermissionExplainerUI (0.189)
function usePermissionExplainerUI(props) {
  let $ = w(9),
    { message: message, detail: detail, onCancel: onCancel } = props,
    W;
  if ($[0] === MEMO_CACHE_SENTINEL) ((W = { context: "Confirmation" }), ($[0] = W));
  else W = $[0];
  useKeybinding("confirm:no", onCancel, W);
  let F;
  if ($[1] !== message)
    ((F = r(Text, { color: "error", children: ["Error: ", message] })), ($[1] = message), ($[2] = F));
  else F = $[2];
  let U;
  if ($[3] !== detail)
    ((U = detail && e(Text, { dimColor: !0, children: detail })), ($[3] = detail), ($[4] = U));
  else U = $[4];
  let i;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((i = e(Text, { dimColor: !0, children: "Press Esc to go back" })), ($[5] = i));
  else i = $[5];
  let ae;
  if ($[6] !== F || $[7] !== U)
    ((ae = r(Box, { flexDirection: "column", gap: 1, children: [F, U, i] })),
      ($[6] = F),
      ($[7] = U),
      ($[8] = ae));
  else ae = $[8];
  return ae;
}

export { ShimmerLoadingText, getRiskColor, l5e, a5e, createExplanationPromise, usePermissionExplainerUI };
