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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-18hwfzwa.js:1196896-1198240 fingerprint = IdleReturnDialog (0.463)
function IdleReturnDialog(props) {
  let $ = w(22);
  let {
    sessionAgeMinutes: idleMinutes,
    estimatedTokens: totalInputTokens,
    hasPrecomputedSummary,
    onDone,
  } = props;
  let t1;
  if ($[0] !== idleMinutes) {
    t1 = formatIdleDuration(idleMinutes);
    $[0] = idleMinutes;
    $[1] = t1;
  } else t1 = $[1];
  let formattedIdle = t1;
  let t2;
  if ($[2] !== totalInputTokens) {
    t2 = formatTokens(totalInputTokens);
    $[2] = totalInputTokens;
    $[3] = t2;
  } else t2 = $[3];
  const title = `This session is ${formattedIdle} old and ${t2} tokens.`;
  let onCancel;
  if ($[4] !== onDone) {
    onCancel = () => onDone("dismiss");
    $[4] = onDone;
    $[5] = onCancel;
  } else onCancel = $[5];
  let t5;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    t5 = jsxProd_default(Box, {
      flexDirection: "column",
      children: jsxProd_default(Text, {
        children:
          "Resuming the full session will consume a substantial portion of your usage limits. We recommend resuming from a summary.",
      }),
    });
    $[6] = t5;
  } else t5 = $[6];
  const label = hasPrecomputedSummary
    ? "Resume from summary (instant, recommended)"
    : "Resume from summary (recommended)";
  let At;
  if ($[7] !== label) {
    At = {
      value: "compact",
      label,
    };
    $[7] = label;
    $[8] = At;
  } else At = $[8];
  let It;
  let Ot;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    It = {
      value: "continue",
      label: "Resume full session as-is",
    };
    Ot = {
      value: "never",
      label: "Don't ask me again",
    };
    $[9] = It;
    $[10] = Ot;
  } else {
    It = $[9];
    Ot = $[10];
  }
  let options;
  if ($[11] !== At) {
    options = [At, It, Ot];
    $[11] = At;
    $[12] = options;
  } else options = $[12];
  let onChange;
  if ($[13] !== onDone) {
    onChange = (value) => onDone(value);
    $[13] = onDone;
    $[14] = onChange;
  } else onChange = $[14];
  let oo;
  if ($[15] !== options || $[16] !== onChange) {
    oo = jsxProd_default(ModelSelector, {
      options,
      onChange,
    });
    $[15] = options;
    $[16] = onChange;
    $[17] = oo;
  } else oo = $[17];
  let t10;
  if ($[18] !== oo || $[19] !== title || $[20] !== onCancel) {
    t10 = jsxProd_default_2(Dialog, {
      title,
      onCancel,
      children: [t5, oo],
    });
    $[18] = oo;
    $[19] = title;
    $[20] = onCancel;
    $[21] = t10;
  } else t10 = $[21];
  return t10;
}
//@ chunk-18hwfzwa.js:1198240-1198448 file-local
function formatIdleDuration(minutes) {
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  let hours = Math.floor(minutes / 60);
  if (hours < 24) {
    let remainingMinutes = Math.floor(minutes % 60);
    return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
  }
  let floored = Math.floor(hours / 24);
  let L = hours % 24;
  return L === 0 ? `${floored}d` : `${floored}d ${L}h`;
}
export { IdleReturnDialog };
