/**
 * components/permissions/WorkerBadge.tsx
 *
 * 队友（swarm worker）徽章：显示请求来自哪个队友及颜色。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/WorkerBadge.tsx
 * pieces: chunk-znr63w8n.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Spinner } from "../Spinner.js";
import { Box, Text } from "../../ink/components/Text.js";

//@ chunk-znr63w8n.js:1479-1987 fingerprint = WorkerBadge (0.721)
/**
 * 队友徽章：显示发起请求的队友名与颜色（被 37 处使用）。
 */
function WorkerBadge(props) {
  let $ = useMemoCache(10);
  let { message, bold, dimColor, subtitle } = props;
  let bold_2 = bold === undefined ? false : bold;
  let dimColor_2 = dimColor === undefined ? false : dimColor;
  let spinnerElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    spinnerElement = jsxProd_default(Spinner, {});
    $[0] = spinnerElement;
  } else spinnerElement = $[0];
  let rowElement;
  if ($[1] !== bold_2 || $[2] !== dimColor_2 || $[3] !== message) {
    rowElement = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        spinnerElement,
        jsxProd_default_2(Text, {
          bold: bold_2,
          dimColor: dimColor_2,
          children: [" ", message],
        }),
      ],
    });
    $[1] = bold_2;
    $[2] = dimColor_2;
    $[3] = message;
    $[4] = rowElement;
  } else rowElement = $[4];
  let badgeSpinner;
  if ($[5] !== subtitle) {
    badgeSpinner =
      subtitle &&
      jsxProd_default(Text, {
        dimColor: true,
        children: subtitle,
      });
    $[5] = subtitle;
    $[6] = badgeSpinner;
  } else badgeSpinner = $[6];
  let labelElement;
  if ($[7] !== rowElement || $[8] !== badgeSpinner) {
    labelElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [rowElement, badgeSpinner],
    });
    $[7] = rowElement;
    $[8] = badgeSpinner;
    $[9] = labelElement;
  } else labelElement = $[9];
  return labelElement;
}
export { WorkerBadge };
