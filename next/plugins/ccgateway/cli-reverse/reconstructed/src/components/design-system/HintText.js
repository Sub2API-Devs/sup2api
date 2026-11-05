/**
 * components/design-system/HintText.tsx
 *
 * 2.1.316 新增：暗色文本，可附带提示（hint）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rrqkbcdm.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-rrqkbcdm.js:300-709 placement
/**
 * 暗色文本，可附带提示（hint）。
 */
function HintText(props) {
  let $ = useMemoCache(9);
  let { children, hint } = props;
  if (!hint) {
    let childText;
    if ($[0] !== children) {
      childText = jsxProd_default(Text, {
        dimColor: true,
        children,
      });
      $[0] = children;
      $[1] = childText;
    } else childText = $[1];
    return childText;
  }
  let childText_;
  if ($[2] !== children) {
    childText_ = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[2] = children;
    $[3] = childText_;
  } else childText_ = $[3];
  let hintText;
  if ($[4] !== hint) {
    hintText = jsxProd_default(Text, {
      dimColor: true,
      children: hint,
    });
    $[4] = hint;
    $[5] = hintText;
  } else hintText = $[5];
  let column;
  if ($[6] !== childText_ || $[7] !== hintText) {
    column = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [childText_, hintText],
    });
    $[6] = childText_;
    $[7] = hintText;
    $[8] = column;
  } else column = $[8];
  return column;
}
export { HintText };
