/**
 * components/Spinner/SpinnerColumn.tsx
 *
 * 2.1.316 新增：Spinner 列布局组件
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ryaak7m0.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "./spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { NoticeLine } from "../SlashCommandLink.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-ryaak7m0.js:375-385 placement
var SPINNER_COLUMN_TICK_MS = 150;
//@ chunk-ryaak7m0.js:385-781 placement
function SpinnerColumn(props) {
  let $ = useMemoCache(8);
  let { tone, text } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let reducedMotion = prefersReducedMotion || isScreenReaderEnabled;
  let [time, setTime] = useAnimationFrame(reducedMotion ? null : SPINNER_COLUMN_TICK_MS);
  const frame = Math.floor(setTime / SPINNER_COLUMN_TICK_MS);
  let children;
  if ($[0] !== reducedMotion || $[1] !== frame || $[2] !== text || $[3] !== tone) {
    children = jsxProd_default(NoticeLine, {
      state: "live",
      tone,
      text,
      linkify: false,
      frame,
      reducedMotion,
    });
    $[0] = reducedMotion;
    $[1] = frame;
    $[2] = text;
    $[3] = tone;
    $[4] = children;
  } else children = $[4];
  let boxElement;
  if ($[5] !== time || $[6] !== children) {
    boxElement = jsxProd_default(Box, {
      ref: time,
      flexDirection: "column",
      children,
    });
    $[5] = time;
    $[6] = children;
    $[7] = boxElement;
  } else boxElement = $[7];
  return boxElement;
}
//@ chunk-ryaak7m0.js:781-791 placement
/**
 * 导出值：SPINNER_COLUMN_MIN_WIDTH（0）。
 */
var SPINNER_COLUMN_MIN_WIDTH = 0;
export { SpinnerColumn, SPINNER_COLUMN_MIN_WIDTH };
