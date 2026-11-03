/**
 * components/IdleReturnDialog.tsx
 *
 * 久离返回对话框：会话很旧且 token 很多时提示继续/清空/新会话，并格式化闲置时长。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/IdleReturnDialog.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: fingerprint 1, file-local 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { formatTokens } from "../utils/format.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-18hwfzwa.js:1196896-1198240 fingerprint = IdleReturnDialog (0.463)
function IdleReturnDialog(t0) {
  let $ = w(22),
    {
      sessionAgeMinutes: sessionAgeMinutes,
      estimatedTokens: estimatedTokens,
      hasPrecomputedSummary: hasPrecomputedSummary,
      onDone: onDone,
    } = t0,
    Re;
  if ($[0] !== sessionAgeMinutes)
    ((Re = formatIdleDuration(sessionAgeMinutes)), ($[0] = sessionAgeMinutes), ($[1] = Re));
  else Re = $[1];
  let Be = Re,
    He;
  if ($[2] !== estimatedTokens) ((He = formatTokens(estimatedTokens)), ($[2] = estimatedTokens), ($[3] = He));
  else He = $[3];
  const t3 = `This session is ${Be} old and ${He} tokens.`;
  let Xe;
  if ($[4] !== onDone) ((Xe = () => onDone("dismiss")), ($[4] = onDone), ($[5] = Xe));
  else Xe = $[5];
  let rt;
  if ($[6] === MEMO_CACHE_SENTINEL)
    ((rt = e(Box, {
      flexDirection: "column",
      children: e(Text, {
        children:
          "Resuming the full session will consume a substantial portion of your usage limits. We recommend resuming from a summary.",
      }),
    })),
      ($[6] = rt));
  else rt = $[6];
  const kt = hasPrecomputedSummary
    ? "Resume from summary (instant, recommended)"
    : "Resume from summary (recommended)";
  let At;
  if ($[7] !== kt) ((At = { value: "compact", label: kt }), ($[7] = kt), ($[8] = At));
  else At = $[8];
  let It, Ot;
  if ($[9] === MEMO_CACHE_SENTINEL)
    ((It = { value: "continue", label: "Resume full session as-is" }),
      (Ot = { value: "never", label: "Don't ask me again" }),
      ($[9] = It),
      ($[10] = Ot));
  else ((It = $[9]), (Ot = $[10]));
  let Et;
  if ($[11] !== At) ((Et = [At, It, Ot]), ($[11] = At), ($[12] = Et));
  else Et = $[12];
  let Dt;
  if ($[13] !== onDone) ((Dt = (value) => onDone(value)), ($[13] = onDone), ($[14] = Dt));
  else Dt = $[14];
  let oo;
  if ($[15] !== Et || $[16] !== Dt)
    ((oo = e(ModelSelector, { options: Et, onChange: Dt })), ($[15] = Et), ($[16] = Dt), ($[17] = oo));
  else oo = $[17];
  let Xt;
  if ($[18] !== oo || $[19] !== t3 || $[20] !== Xe)
    ((Xt = r(Dialog, { title: t3, onCancel: Xe, children: [rt, oo] })),
      ($[18] = oo),
      ($[19] = t3),
      ($[20] = Xe),
      ($[21] = Xt));
  else Xt = $[21];
  return Xt;
}
//@ chunk-18hwfzwa.js:1198240-1198448 file-local
function formatIdleDuration(minutes) {
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  let hours = Math.floor(minutes / 60);
  if (hours < 24) {
    let remainingMinutes = Math.floor(minutes % 60);
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
  }
  let floored = Math.floor(hours / 24),
    L = hours % 24;
  return L === 0 ? `${floored}d` : `${floored}d ${L}h`;
}

export { IdleReturnDialog };
